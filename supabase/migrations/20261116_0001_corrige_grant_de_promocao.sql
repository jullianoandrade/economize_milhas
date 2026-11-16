-- ============================================================
--  Correcao: promover_rotas_procuradas continuava chamavel por anon
--
--  A migration 20261113_0001 revogou EXECUTE de PUBLIC, com o
--  raciocinio de que o Postgres concede EXECUTE a PUBLIC por padrao em
--  toda funcao nova e de que anon herdaria dali. O raciocinio estava
--  certo e incompleto: alem do grant a PUBLIC, o Supabase mantem
--
--    alter default privileges in schema public
--      grant all on functions to anon, authenticated, service_role;
--
--  ou seja, anon recebe um grant DIRETO, que revogar de PUBLIC nao
--  alcanca. Medido depois de aplicar aquela migration: anon chamando
--  promover_rotas_procuradas recebia HTTP 200.
--
--  SEVERIDADE DO QUE ACONTECEU: baixa, e por um motivo que vale
--  registrar. A funcao e SECURITY INVOKER, entao rodou com os
--  privilegios do proprio anon, e a RLS de rotas_monitoradas barrou a
--  escrita com 42501 -- nenhuma rota chegou a ser promovida por um
--  chamador anonimo. A segunda camada segurou o que a primeira deixou
--  passar, que e o ponto de existirem duas.
--
--  Ainda assim o grant some. Nao por causa do risco de hoje, mas do de
--  amanha: no dia em que alguem trocar a funcao para SECURITY DEFINER
--  -- mudanca plausivel, de uma linha -- a RLS deixa de proteger e o
--  buraco vira real. Privilegio que ninguem usa nao deve existir.
--
--  A funcao continua SECURITY INVOKER de proposito. Era ela que estava
--  certa.
-- ============================================================

revoke execute on function promover_rotas_procuradas(integer, integer)
  from public;

-- O que faltava: os grants diretos que as default privileges do
-- Supabase criam a cada funcao nova.
revoke execute on function promover_rotas_procuradas(integer, integer)
  from anon, authenticated;

-- service_role continua podendo chamar -- e quem o cron usa.
grant execute on function promover_rotas_procuradas(integer, integer)
  to service_role;
