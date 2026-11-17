/**
 * O nome do produto, num lugar so.
 *
 * "Milhas" e provisorio: o nome definitivo ainda esta em decisao
 * (consulta de anterioridade no INPI). Toda tela, metadado e manifesto
 * le daqui, e um teste em tests/marca.test.ts impede que o nome volte a
 * ser escrito a mao em outro arquivo -- trocar a marca tem de continuar
 * sendo editar esta constante, nao cacar ocorrencias.
 *
 * Fica de fora, de proposito: o dominio (lib/site.ts, depende do
 * registro), o "name" do package.json (interno) e o texto do README.
 */

export const MARCA = {
  nome: "Milhas",
  /** Frase que acompanha o nome no titulo da pagina inicial. */
  chamada: "vale mais em milhas ou em dinheiro?",
  /** Versao curta para o manifesto do PWA. */
  chamadaDoApp: "viagem em milhas ou em dinheiro",
} as const;
