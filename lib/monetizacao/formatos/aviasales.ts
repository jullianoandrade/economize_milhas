/**
 * O UNICO modulo do projeto que conhece o formato de busca compacta da
 * Aviasales.
 *
 * NAO e contrato publico: as paginas de suporte da Travelpayouts
 * devolvem 403 para fetch automatizado, e a propria rede instrui gerar
 * o link no painel e copiar, em vez de documentar o formato. Por isso
 * nenhum outro arquivo deste projeto pode depender dele -- se a
 * Aviasales mudar o formato amanha, so este arquivo precisa mudar, e o
 * pior caso de ele falhar e a busca cair para a versao parcial (sem
 * data), nunca travar o botao inteiro. Ver linkDeBuscaDeVoo em
 * lib/monetizacao/links.ts.
 *
 * tests/arquitetura.test.ts garante que nenhum outro arquivo, fora
 * daqui, mencione "/search/" ou "aviasales.com".
 */

export const FORMATO = "aviasales-compacto-v1";

/**
 * Casos canonicos para o verificador manual (ver
 * docs/verificacao-de-links.md): abrir cada URL no celular e confirmar
 * que o formulario chega preenchido com estes mesmos valores. E o unico
 * teste de correcao que existe para um formato sem contrato.
 */
export const EXEMPLOS_CANONICOS = [
  {
    entrada: { origemIata: "GRU", destinoIata: "LIS", data: "2026-12-10" },
    caminho: "/search/GRU1012LIS1",
  },
  {
    entrada: { origemIata: "GRU", destinoIata: "REC", data: "2027-03-05" },
    caminho: "/search/GRU0503REC1",
  },
] as const;

/**
 * `/search/{ORIGEM}{DD}{MM}{DESTINO}{adultos}`. Um adulto, sem volta --
 * o app so compara trecho de ida (ver AGENTS do app / regra de produto:
 * "valores por trecho, so ida, em classe economica").
 */
export function caminhoDeBusca(busca: {
  origemIata: string;
  destinoIata: string;
  /** YYYY-MM-DD, ja validada por lib/monetizacao/busca.ts. */
  data: string;
}): string | null {
  const partida = busca.data.split("-");
  if (partida.length !== 3) return null;

  const [, mes, dia] = partida;
  if (!mes || !dia) return null;

  return `/search/${busca.origemIata}${dia}${mes}${busca.destinoIata}1`;
}
