-- ============================================================
--  Dados de mercado
--
--  Este banco guarda SOMENTE dados de mercado: preco de passagem,
--  bonus de transferencia vigentes e cotacao do milheiro. Nada
--  pessoal. Saldo de milhas, gasto de cartao e metas de viagem
--  ficam no localStorage do aparelho, o que elimina a necessidade
--  de login no MVP e tira do projeto a responsabilidade de guardar
--  dado sensivel de ninguem.
--
--  Politica de acesso: todo mundo le, so o servidor escreve.
-- ============================================================


-- ------------------------------------------------------------
--  Rotas que o cron coleta todo dia
-- ------------------------------------------------------------
create table if not exists rotas_monitoradas (
  id          bigint generated always as identity primary key,
  origem      char(3) not null,
  destino     char(3) not null,
  prioridade  smallint not null default 5,
  ativa       boolean not null default true,
  criada_em   timestamptz not null default now(),

  constraint rotas_monitoradas_unica unique (origem, destino),
  constraint rotas_monitoradas_prioridade check (prioridade between 1 and 10)
);

comment on table rotas_monitoradas is
  'Rotas coletadas diariamente pelo cron. Prioridade 1 e a mais alta: serve para caber dentro do limite de requisicoes quando a lista crescer.';


-- ------------------------------------------------------------
--  Observacoes de preco: o ativo proprietario do projeto
-- ------------------------------------------------------------
create table if not exists precos_snapshot (
  id                bigint generated always as identity primary key,
  origem            char(3) not null,
  destino           char(3) not null,

  -- data do voo
  partida_em        date not null,
  -- quando a Travelpayouts encontrou este preco
  encontrado_em     timestamptz not null,

  valor_brl         numeric(10, 2) not null,
  paradas           smallint not null default 0,
  classe            text not null default 'economica',
  coletado_em       timestamptz not null default now(),

  -- A coluna que justifica a tabela existir: quantos dias antes do voo
  -- aquele preco foi visto. Acumulando isso dia apos dia, forma-se a
  -- curva real de "preco x dias antes do voo" por rota -- dado que
  -- nenhuma API vende pronto.
  --
  -- Calculada na aplicacao, e nao como coluna gerada: o Postgres exige
  -- expressao imutavel em generated column, e converter timestamptz
  -- para date depende do fuso da sessao, o que e apenas estavel. O
  -- check abaixo garante que o valor gravado bate com as datas.
  antecedencia_dias integer not null,

  constraint precos_snapshot_valor_positivo check (valor_brl > 0),
  constraint precos_snapshot_antecedencia_nao_negativa
    check (antecedencia_dias >= 0),

  -- O cache da Travelpayouts repete ofertas entre execucoes. Sem esta
  -- restricao, rodar o cron duas vezes no mesmo dia dobraria o peso
  -- daquelas observacoes e enviesaria a curva.
  constraint precos_snapshot_sem_duplicata
    unique (origem, destino, partida_em, encontrado_em, valor_brl, paradas)
);

comment on table precos_snapshot is
  'Observacoes de preco com a data em que foram encontradas. Base da curva de antecedencia e da sazonalidade por rota.';

-- Consulta mais frequente: a curva de uma rota especifica.
create index if not exists precos_snapshot_rota_idx
  on precos_snapshot (origem, destino, partida_em);

-- Consulta da janela ideal de compra.
create index if not exists precos_snapshot_antecedencia_idx
  on precos_snapshot (origem, destino, antecedencia_dias);


-- ------------------------------------------------------------
--  Bonus de transferencia vigentes
-- ------------------------------------------------------------
create table if not exists bonus_transferencia (
  id            bigint generated always as identity primary key,
  origem        text not null,          -- livelo, esfera
  destino       text not null,          -- smiles, latampass, tudoazul
  percentual    numeric(5, 1) not null,
  comeca_em     date not null,
  termina_em    date not null,
  fonte         text not null,
  registrado_em timestamptz not null default now(),

  constraint bonus_transferencia_percentual check (percentual >= 0),
  constraint bonus_transferencia_periodo check (termina_em >= comeca_em)
);

comment on table bonus_transferencia is
  'Promocoes de transferencia vigentes, curadas a mao: nao existe fonte automatizavel confiavel. Fica no banco, e nao em data/, justamente para poder ser atualizado sem deploy.';

create index if not exists bonus_transferencia_vigentes_idx
  on bonus_transferencia (destino, termina_em desc);


-- ------------------------------------------------------------
--  Cotacao do milheiro ao longo do tempo
-- ------------------------------------------------------------
create table if not exists cotacao_milheiro (
  id             bigint generated always as identity primary key,
  programa       text not null,
  alvo_brl       numeric(8, 2) not null,
  mercado_min_brl numeric(8, 2),
  mercado_max_brl numeric(8, 2),
  medida_em      date not null default current_date,
  fonte          text,

  constraint cotacao_milheiro_unica unique (programa, medida_em),
  constraint cotacao_milheiro_alvo_positivo check (alvo_brl > 0)
);

comment on table cotacao_milheiro is
  'Historico do custo por milheiro. data/cpm-referencia.json e a semente; esta tabela acompanha a variacao sem exigir deploy.';


-- ============================================================
--  Seguranca
--
--  Tudo aqui e dado publico de mercado, entao a leitura e aberta.
--  A escrita nao tem politica nenhuma: sem politica de insert, o
--  papel anon simplesmente nao consegue gravar. Quem grava e o cron,
--  com a service role, que ignora RLS por natureza.
-- ============================================================

alter table rotas_monitoradas   enable row level security;
alter table precos_snapshot     enable row level security;
alter table bonus_transferencia enable row level security;
alter table cotacao_milheiro    enable row level security;

create policy "leitura publica" on rotas_monitoradas
  for select to anon, authenticated using (true);

create policy "leitura publica" on precos_snapshot
  for select to anon, authenticated using (true);

create policy "leitura publica" on bonus_transferencia
  for select to anon, authenticated using (true);

create policy "leitura publica" on cotacao_milheiro
  for select to anon, authenticated using (true);


-- ============================================================
--  Rotas iniciais para o cron
--
--  Comeca pequeno de proposito: 20 rotas sao suficientes para a
--  curva de antecedencia comecar a tomar forma sem estourar o limite
--  de requisicoes da Travelpayouts. A lista cresce depois, conforme
--  o uso real mostrar quais rotas as pessoas buscam.
-- ============================================================

insert into rotas_monitoradas (origem, destino, prioridade) values
  -- Internacionais de maior valor: e onde milhas realmente compensam
  ('GRU', 'LIS', 1), ('GRU', 'MAD', 2), ('GRU', 'CDG', 2),
  ('GRU', 'LHR', 3), ('GRU', 'FCO', 3), ('GRU', 'MIA', 1),
  ('GRU', 'JFK', 1), ('GRU', 'MCO', 2), ('GRU', 'LAX', 3),
  ('GRU', 'EZE', 2), ('GRU', 'SCL', 3), ('GRU', 'MEX', 3),
  -- Domesticas de maior volume: validam o veredito inverso
  ('GRU', 'SDU', 1), ('GRU', 'REC', 2), ('GRU', 'SSA', 2),
  ('GRU', 'FOR', 3), ('GRU', 'BSB', 3), ('GRU', 'POA', 4),
  ('GIG', 'LIS', 3), ('REC', 'LIS', 4)
on conflict (origem, destino) do nothing;
