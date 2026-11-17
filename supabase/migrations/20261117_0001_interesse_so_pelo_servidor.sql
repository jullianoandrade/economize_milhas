-- ============================================================
--  Interesse por rota: a escrita passa a ser so do servidor
--
--  O PROBLEMA (medido em 16/11/2026)
--
--  registrar_interesse() e SECURITY DEFINER e tinha EXECUTE para anon.
--  A chave anon esta no navegador por definicao, entao qualquer pessoa
--  chamava a funcao direto pelo PostgREST:
--
--    POST /rest/v1/rpc/registrar_interesse
--    { "p_origem": "QQQ", "p_destino": "WWW" }
--
--  e pulava toda a validacao de app/api/interesse -- aeroporto que
--  existe, rota que toca o Brasil, limite por IP. O teste com QQQ-WWW
--  (par que nao existe) chegou a 6 buscas e foi apagado em seguida.
--
--  O dano possivel era limitado -- a promocao para a coleta continua
--  sendo do cron, e so de pares que passaram do limiar -- mas um par
--  inventado inflado ate o limiar entraria na fila e gastaria cota de
--  API todo dia. A defesa dependia de ninguem descobrir a porta.
--
--  A CORRECAO
--
--  O anon e o authenticated perdem o EXECUTE. A rota da aplicacao passa
--  a chamar com a service role (lib/supabase.ts, escritor()), DEPOIS
--  de validar e limitar. O codigo novo funciona antes e depois desta
--  migration: a service role ja podia chamar.
--
--  Mesmo cuidado da 20261116_0001: o Supabase da grant DIRETO a anon e
--  authenticated em toda funcao nova, entao revogar de PUBLIC nao basta.
-- ============================================================

revoke execute on function registrar_interesse(char(3), char(3))
  from public;

revoke execute on function registrar_interesse(char(3), char(3))
  from anon, authenticated;

grant execute on function registrar_interesse(char(3), char(3))
  to service_role;

comment on function registrar_interesse is
  'Incrementa o contador de interesse de um par. Chamada so pela service role, a partir de app/api/interesse, depois da validacao e do limite por IP.';

-- Limpeza: qualquer par que nao seja tres letras maiusculas nunca
-- deveria ter entrado. A funcao ja barrava isso, entao o esperado e
-- apagar zero linhas -- fica como garantia, nao como conserto.
delete from interesse_em_rota
 where origem !~ '^[A-Z]{3}$' or destino !~ '^[A-Z]{3}$';
