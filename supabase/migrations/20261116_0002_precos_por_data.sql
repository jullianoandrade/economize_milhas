-- ============================================================
--  Preco por data de partida, agregado no banco
--
--  Completa o que a migration 20261110_0001 comecou. Ela tirou a curva
--  de antecedencia e a curva mensal da leitura de linha crua, mas duas
--  telas ficaram para tras e continuavam lendo a fatia truncada:
--
--    - o calendario de precos (CalendarioDePrecos)
--    - as datas mais baratas (datasMaisBaratas)
--
--  O defeito e o mesmo de la: lib/historico.ts pedia 2.000 linhas sem
--  ORDER BY, o PostgREST cortava em 1.000 e quais 1.000 era arbitrario.
--  Nas 20 rotas monitoradas isso significa ver entre 18% e 76% das
--  observacoes -- e nao se sabe quais. Um dia barato de verdade pode
--  simplesmente nao estar na fatia.
--
--  POR QUE A MEDIANA DA ROTA VEM JUNTO, repetida em toda linha:
--  datasMaisBaratas compara cada data com a mediana de TODAS as
--  observacoes da rota, nao com a mediana das medianas diarias. Sao
--  numeros diferentes -- o primeiro pesa cada observacao, o segundo
--  pesa cada dia. Trazer o valor exato numa coluna custa uma subconsulta
--  que roda uma vez e preserva a semantica que os testes ja fixaram, em
--  vez de mudar o significado do numero em silencio.
--
--  percentile_disc e nao percentile_cont, como nas outras: devolve um
--  valor que existe na amostra em vez de interpolar, igual ao que o
--  JavaScript sempre fez.
-- ============================================================

create or replace function precos_por_data(
  p_origem   char(3),
  p_destino  char(3)
)
returns table (
  partida_em     date,
  preco_mediano  numeric,
  amostras       bigint,
  mediana_rota   numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with observacoes as (
    select partida_em, valor_brl
      from precos_snapshot
     where origem = p_origem
       and destino = p_destino
       and valor_brl > 0
  ),
  geral as (
    select percentile_disc(0.5) within group (order by valor_brl) as mediana
      from observacoes
  )
  select
    o.partida_em,
    percentile_disc(0.5) within group (order by o.valor_brl) as preco_mediano,
    count(*) as amostras,
    (select mediana from geral) as mediana_rota
  from observacoes o
  group by o.partida_em
  order by o.partida_em;
$$;

comment on function precos_por_data is
  'Mediana e contagem de observacoes por data de partida, mais a mediana da rota inteira. Alimenta o calendario de precos e as datas mais baratas.';

grant execute on function precos_por_data(char(3), char(3))
  to anon, authenticated;
