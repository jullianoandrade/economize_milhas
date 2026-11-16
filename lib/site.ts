/**
 * O endereco canonico do site.
 *
 * Existe porque sitemap, robots e imagem de compartilhamento precisam
 * de URL absoluta -- caminho relativo nao serve para nenhum dos tres.
 *
 * A ordem importa. VERCEL_PROJECT_PRODUCTION_URL aponta sempre para o
 * dominio de producao; VERCEL_URL, que seria a escolha obvia, aponta
 * para CADA deploy (o hash do preview). Usar aquela faria cada preview
 * publicar um sitemap com URLs proprias e competir com a producao na
 * indexacao.
 */

const PADRAO = "https://economizemilhas.vercel.app";

export function enderecoDoSite(): string {
  const explicito = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicito) return explicito.replace(/\/$/, "");

  const producao = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (producao) return `https://${producao.replace(/\/$/, "")}`;

  return PADRAO;
}

/** URL absoluta a partir de um caminho que comeca com "/". */
export function urlDoSite(caminho: string): string {
  return `${enderecoDoSite()}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
}
