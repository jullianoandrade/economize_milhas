import { normalizarBusca } from "./busca";
import { caminhoDeBusca } from "./formatos/aviasales";
import { parceiroPorTipo, type Parceiro } from "./parceiros";

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

function aplicarMarker(url: URL, parceiro: Parceiro): void {
  const marker = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER?.trim();
  if (monetizacaoAtiva() && parceiro.parametroDeMarker && marker) {
    url.searchParams.set(parceiro.parametroDeMarker, marker);
  }
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

  aplicarMarker(url, parceiro);
  return url.toString();
}

export type LinkDeSaida = {
  url: string;
  /** "completo": busca ja chega preenchida com a data. "parcial": so o trecho. */
  precisao: "completo" | "parcial";
};

/**
 * O deep link de busca de voo, com escada de degradacao.
 *
 * O formato completo (lib/monetizacao/formatos/aviasales) nao e contrato
 * publico e pode falhar ou mudar em silencio. O pior caso de uma falha
 * ali tem que ser o comportamento de HOJE -- a busca parcial por
 * ?origin_iata=&destination_iata=, que ja funciona -- nunca a ausencia
 * total do botao. Por isso o caminho completo fica num try/catch que so
 * rebaixa a precisao, nunca devolve null por causa do formato.
 */
export function linkDeBuscaDeVoo(entrada: {
  origemIata: string;
  destinoIata: string;
  data?: string | null;
}): LinkDeSaida | null {
  const busca = normalizarBusca(entrada);
  if (!busca) return null;

  const parceiro = parceiroPorTipo("voo");
  if (!parceiro || !parceiro.url) return null;

  if (busca.data) {
    try {
      const caminho = caminhoDeBusca({
        origemIata: busca.origemIata,
        destinoIata: busca.destinoIata,
        data: busca.data,
      });
      if (caminho) {
        const base = new URL(parceiro.url);
        const url = new URL(caminho, base.origin);
        aplicarMarker(url, parceiro);
        return { url: url.toString(), precisao: "completo" };
      }
    } catch {
      // Cai para a busca parcial abaixo -- nunca null por causa do formato.
    }
  }

  const parcial = montarLink(parceiro, {
    origin_iata: busca.origemIata,
    destination_iata: busca.destinoIata,
  });
  return parcial ? { url: parcial, precisao: "parcial" } : null;
}
