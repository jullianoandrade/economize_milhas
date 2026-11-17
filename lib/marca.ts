/**
 * O nome do produto, num lugar so.
 *
 * VoeMilo, decidido em 17/11/2026. Na busca do INPI, "VoeMilo" e
 * "Voe Milo" nao tinham nenhum processo; o elemento "Milo" tem a Nestle
 * (classes de alimento) e um pedido de 2025 na classe 35 -- vale uma
 * busca de anterioridade profissional antes do deposito. Toda tela,
 * metadado e manifesto le daqui, e um teste em tests/marca.test.ts impede que o nome volte a
 * ser escrito a mao em outro arquivo -- trocar a marca tem de continuar
 * sendo editar esta constante, nao cacar ocorrencias.
 *
 * Fica de fora, de proposito: o dominio (lib/site.ts, depende do
 * registro) e o "name" do package.json (interno).
 */

export const MARCA = {
  nome: "VoeMilo",
  /** Frase que acompanha o nome no titulo da pagina inicial. */
  chamada: "vale mais em milhas ou em dinheiro?",
  /** Versao curta para o manifesto do PWA. */
  chamadaDoApp: "viagem em milhas ou em dinheiro",
} as const;
