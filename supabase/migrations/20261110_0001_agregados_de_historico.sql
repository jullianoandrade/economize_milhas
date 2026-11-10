-- ============================================================
--  Agregados do historico de precos
--
--  POR QUE ESTA MIGRATION EXISTE
--
--  lib/historico.ts pedia 2.000 linhas cruas por rota, sem ORDER BY, e
--  reduzia tudo em JavaScript. Dois problemas, e o segundo e o grave:
--
--   1. O PostgREST corta a resposta em 1.000 linhas, independentemente
--      do limite pedido. Rotas com 5.500 observacoes recebiam 1.000.
--
--   2. Sem ORDER BY, QUAIS 1.000 e arbitrario -- e a fatia nao preserva
--      a distribuicao por faixa de antecedencia, que e justamente o que
--      a curva precisa.
--
--  Resultado medido em 10/11/2026, com 74.778 observacoes no banco:
--  apenas 5 das 20 rotas monitoradas alcancavam curva propria. Lendo o
--  historico COMPLETO, as mesmas rotas tinham de 12 a 21 faixas validas
--  -- contra o minimo de 4. O dado estava la; a leitura e que o jogava
--  fora. E piorava com o tempo: quanto mais o banco cresce, menor a
--  fracao que chega na pagina.
--
--  A correcao nao e aumentar o limite (ler 5.500 linhas a cada render
--  troca um erro por outro). E agregar aqui: ~25 linhas por rota em vez
--  de 5.500, com a conta feita onde o dado mora.
--
--  SEGURANCA: as duas funcoes sao STABLE e SECURITY INVOKER -- herdam
--  a RLS de precos_snapshot, que ja permite leitura publica. Nenhuma
--  delas escreve.
-- ============================================================


-- ------------------------------------------------------------
--  Curva de "preco x dias antes do voo"
--
--  Agrupa as observacoes em faixas de N dias e devolve a mediana de
--  cada uma, com o numero de amostras. A mediana (e nao a media) porque
--  uma unica tarifa de ultima hora muito cara deslocaria a curva e
--  empurraria a janela de compra para o lugar errado.
--
--  percentile_disc e nao percentile_cont: devolve um valor que existe
--  na amostra, em vez de interpolar entre dois -- casa com o que
--  lib/tempo/antecedencia.ts sempre fez em JavaScript.
--
--  O corte de amostras minimas e de faixas minimas continua em
--  lib/tempo/antecedencia.ts, de proposito: e regra de produto, tem
--  teste, e muda sem migration.
-- ------------------------------------------------------------
create or replace function curva_antecedencia(
  p_origem        char(3),
  p_destino       char(3),
  p_largura_dias  integer default 15
)
returns table (
  dias            integer,
  preco_mediano   numeric,
  amostras        bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (floor(antecedencia_dias::numeric / greatest(p_largura_dias, 1))
      * greatest(p_largura_dias, 1))::integer as dias,
    percentile_disc(0.5) within group (order by valor_brl) as preco_mediano,
    count(*) as amostras
  from precos_snapshot
  where origem = p_origem
    and destino = p_destino
    and antecedencia_dias >= 0
    and valor_brl > 0
  group by 1
  order by 1;
$$;

comment on function curva_antecedencia is
  'Mediana de preco por faixa de antecedencia, com contagem de amostras. Substitui a leitura de linhas cruas em lib/historico.ts.';


-- ------------------------------------------------------------
--  Menor preco por mes de embarque
--
--  Mesmo resultado que o reduce em JavaScript produzia -- quando ele
--  recebia o historico inteiro, o que deixou de acontecer quando a
--  tabela passou de 1.000 linhas por rota.
-- ------------------------------------------------------------
create or replace function precos_min_por_mes(
  p_origem   char(3),
  p_destino  char(3)
)
returns table (
  mes        integer,
  preco_min  numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    extract(month from partida_em)::integer as mes,
    min(valor_brl) as preco_min
  from precos_snapshot
  where origem = p_origem
    and destino = p_destino
    and valor_brl > 0
  group by 1
  order by 1;
$$;

comment on function precos_min_por_mes is
  'Menor preco observado por mes de partida. Alimenta a curva de sazonalidade a partir do historico proprio.';


-- ------------------------------------------------------------
--  Quem pode chamar
--
--  Leitura publica, igual a tabela. SECURITY INVOKER garante que a RLS
--  de precos_snapshot continua valendo dentro da funcao.
-- ------------------------------------------------------------
grant execute on function curva_antecedencia(char(3), char(3), integer)
  to anon, authenticated;
grant execute on function precos_min_por_mes(char(3), char(3))
  to anon, authenticated;
