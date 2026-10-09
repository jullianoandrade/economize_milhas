import type { Parceiro } from "./parceiros";

/**
 * Geracao de links de parceiro, atras de uma flag.
 *
 * Com NEXT_PUBLIC_MONETIZACAO_ATIVA diferente de "true", nada daqui
 * anexa marker nenhum: os links saem iguais aos que a pessoa digitaria no
 * navegador. A mesma flag controla o selo de divulgacao -- desligada, nao
 * ha comissao, logo nao ha o que declarar e nada e renderizado.
 *
 * Nota de custo, para quando a flag for ligada: o plano Hobby da Vercel e
 * apenas para uso nao comercial.
 */

export function monetizacaoAtiva(): boolean {
  return process.env.NEXT_PUBLIC_MONETIZACAO_ATIVA === "true";
}

export function montarLink(
  parceiro: Parceiro,
  parametros: Record<string, string> = {},
): string | null {
  if (!parceiro.url) return null;

  let url: URL;
  try {
    url = new URL(parceiro.url);
  } catch {
    return null;
  }

  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor) url.searchParams.set(chave, valor);
  }

  const marker = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER?.trim();
  if (monetizacaoAtiva() && parceiro.parametroDeMarker && marker) {
    url.searchParams.set(parceiro.parametroDeMarker, marker);
  }

  return url.toString();
}
