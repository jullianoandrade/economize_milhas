import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Clientes do Supabase.
 *
 * Dois niveis de acesso, de proposito:
 *
 *   leitor()   anon  - so le. E a chave que vai parar no navegador.
 *   escritor() service - ignora RLS. Vive apenas no servidor, usada
 *                        unicamente pelo cron de coleta.
 *
 * Os dois retornam null quando as variaveis nao estao configuradas, e
 * nenhuma tela do app pode depender disso para renderizar: sem banco, o
 * app continua funcionando com a base curada de data/.
 */

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

export function temBanco(): boolean {
  return Boolean(url() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
}

/** Cliente de leitura. Sujeito as politicas de RLS. */
export function leitor(): SupabaseClient | null {
  const endereco = url();
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!endereco || !chave) return null;

  return createClient(endereco, chave, {
    auth: { persistSession: false },
  });
}

/**
 * Cliente de escrita. Ignora TODAS as politicas de seguranca do banco.
 *
 * Nunca deve ser chamado fora de app/api/**. Se um componente de cliente
 * importar este modulo, o "server-only" no topo do arquivo quebra o
 * build -- e essa quebra e intencional.
 */
export function escritor(): SupabaseClient | null {
  const endereco = url();
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!endereco || !chave) return null;

  return createClient(endereco, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
