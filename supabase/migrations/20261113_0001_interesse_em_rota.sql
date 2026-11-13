-- ============================================================
--  Interesse por rota: uso vira cobertura
--
--  POR QUE ESTA MIGRATION EXISTE
--
--  rotas_monitoradas tinha UMA referencia em todo o codigo: a leitura
--  do cron. Ninguem escrevia. As 20 rotas foram escolhidas a mao em
--  outubro e nada jamais as mudaria -- mil pessoas podiam procurar
--  GRU-FAO e a rota nunca entraria na coleta.
--
--  Isso ficou critico quando a base de aeroportos passou de 268 para
--  ~3.700: sao 13,5 milhoes de pares pesquisaveis e 20 coletados. Sem
--  um sensor de demanda nao da para saber QUAIS dos novos merecem
--  historico proprio -- e historico proprio e o unico ativo do projeto
--  que ninguem vende pronto.
--
--  O DESENHO, em duas etapas de proposito:
--
--    1. registrar_interesse() -- alta frequencia, baixa confianca.
--       Qualquer visitante incrementa um contador.
--    2. promover_rotas_procuradas() -- baixa frequencia, controlada.
--       O cron promove o que passou do limiar.
--
--  Juntar as duas deixaria qualquer um escrevendo direto na lista que
--  decide o gasto de API. Separadas, o estrago possivel e um contador
--  inflado, e a promocao continua sendo uma decisao do servidor.
--
--  NADA PESSOAL, como no resto deste banco: guarda-se o PAR DE
--  AEROPORTOS e quantas vezes ele foi visto. Nao ha IP, sessao,
--  identificador de usuario nem horario individual -- so o primeiro e
--  o ultimo toque do par. "GRU-FAO foi visto 40 vezes" e dado de
--  mercado, da mesma natureza do preco que ja esta aqui.
-- ============================================================


create table if not exists interesse_em_rota (
  origem        char(3) not null,
  destino       char(3) not null,
  buscas        integer not null default 0,
  primeira_em   timestamptz not null default now(),
  ultima_em     timestamptz not null default now(),
  -- Quando virou rota monitorada. Nulo = ainda nao promovida.
  promovida_em  timestamptz,

  primary key (origem, destino),
  constraint interesse_em_rota_buscas_nao_negativo check (buscas >= 0),
  constraint interesse_em_rota_pontas_distintas check (origem <> destino)
);

comment on table interesse_em_rota is
  'Quantas vezes cada par de aeroportos foi consultado. Sensor de demanda que decide quais rotas entram na coleta diaria. Nao guarda nada pessoal: so o par e a contagem.';

-- A consulta da promocao: o que ainda nao foi promovido, mais procurado
-- primeiro.
create index if not exists interesse_em_rota_a_promover_idx
  on interesse_em_rota (buscas desc)
  where promovida_em is null;


-- ------------------------------------------------------------
--  Registrar interesse (chamada pelo visitante)
--
--  SECURITY DEFINER porque o papel anon nao escreve em lugar nenhum
--  deste banco, e nao e para passar a escrever: esta funcao e a unica
--  porta, ela so incrementa um contador e nao aceita nenhum outro
--  campo. O pior que um abuso consegue e inflar a contagem de um par
--  valido -- e ainda assim a promocao depende do cron.
--
--  A validacao de que o par EXISTE e de que a rota toca o Brasil fica
--  na aplicacao (app/api/interesse), onde a base de aeroportos mora.
--  Aqui so se garante o formato.
-- ------------------------------------------------------------
create or replace function registrar_interesse(
  p_origem   char(3),
  p_destino  char(3)
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_origem is null or p_destino is null then
    return;
  end if;

  if p_origem !~ '^[A-Z]{3}$' or p_destino !~ '^[A-Z]{3}$' then
    return;
  end if;

  if p_origem = p_destino then
    return;
  end if;

  insert into interesse_em_rota (origem, destino, buscas)
  values (p_origem, p_destino, 1)
  on conflict (origem, destino) do update
    set buscas    = interesse_em_rota.buscas + 1,
        ultima_em = now();
end;
$$;

comment on function registrar_interesse is
  'Incrementa o contador de interesse de um par. Unica escrita permitida ao visitante neste banco.';


-- ------------------------------------------------------------
--  Promover as mais procuradas (chamada pelo cron)
--
--  SECURITY INVOKER: quem chama e a service role, que ja ignora RLS.
--  Nao ha razao para esta funcao carregar privilegio proprio.
--
--  Prioridade 6 para tudo que entra por demanda: abaixo das rotas
--  semeadas a mao (1 a 4), que sao as de maior valor conhecido, e
--  acima de nada. Assim a promocao preenche o orcamento que sobra,
--  sem nunca desalojar o que ja se provou.
-- ------------------------------------------------------------
create or replace function promover_rotas_procuradas(
  p_limiar  integer default 5,
  p_maximo  integer default 10
)
returns table (
  origem   char(3),
  destino  char(3),
  buscas   integer
)
language sql
security invoker
set search_path = public
as $$
  with candidatas as (
    select i.origem, i.destino, i.buscas
      from interesse_em_rota i
      left join rotas_monitoradas r
        on r.origem = i.origem and r.destino = i.destino
     where i.promovida_em is null
       and r.id is null
       and i.buscas >= greatest(p_limiar, 1)
     order by i.buscas desc, i.ultima_em desc
     limit greatest(p_maximo, 0)
  ),
  inseridas as (
    insert into rotas_monitoradas (origem, destino, prioridade)
    select c.origem, c.destino, 6 from candidatas c
    on conflict (origem, destino) do nothing
    returning origem, destino
  ),
  marcadas as (
    update interesse_em_rota i
       set promovida_em = now()
      from inseridas ins
     where i.origem = ins.origem and i.destino = ins.destino
    returning i.origem, i.destino, i.buscas
  )
  select m.origem, m.destino, m.buscas from marcadas m;
$$;

comment on function promover_rotas_procuradas is
  'Move as rotas mais procuradas para rotas_monitoradas. Chamada pelo cron, com a service role.';


-- ============================================================
--  Seguranca
--
--  Leitura publica, como no resto do banco -- e dado de mercado.
--  Escrita, nenhuma: nao existe policy de insert ou update, entao o
--  papel anon so consegue escrever pela funcao acima.
-- ============================================================

alter table interesse_em_rota enable row level security;

create policy "leitura publica" on interesse_em_rota
  for select to anon, authenticated using (true);

grant execute on function registrar_interesse(char(3), char(3))
  to anon, authenticated;

-- promover_rotas_procuradas NAO recebe grant: so a service role chama.
--
-- O revoke e de PUBLIC, e nao de anon/authenticated: o Postgres concede
-- EXECUTE a PUBLIC por padrao em toda funcao nova, e os dois papeis
-- herdam dali. Revogar so deles deixaria a funcao aberta assim mesmo.
revoke execute on function promover_rotas_procuradas(integer, integer)
  from public;
