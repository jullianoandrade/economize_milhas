import { z } from "zod";

/**
 * Formatos do que entra pelas rotas de API.
 *
 * Validam FORMATO, nao existencia: se "GRU" e um aeroporto que
 * conhecemos continua sendo decisao do motor (classificarRota), que tem
 * a base e o teste. O que estes schemas garantem e que nada chega ao
 * motor fora do tamanho e do alfabeto esperados.
 */

/** Codigo IATA: tres letras. Normaliza caixa e espacos. */
export const iata = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/)
  .transform((s) => s.toUpperCase());

/** Identificadores de data/*.json (cartao, programa): kebab-case curto. */
export const idDeCatalogo = z.string().regex(/^[a-z0-9-]{1,64}$/);

/** Valor monetario ou saldo: nao negativo, com teto que nenhuma pessoa atinge. */
const quantia = z.number().finite().min(0).max(1_000_000_000);

export const corpoDoInteresse = z.object({
  origem: iata,
  destino: iata,
});

export const corpoDoPlano = z.object({
  origem: iata,
  destino: iata,
  programa: idDeCatalogo.nullish(),
  saldoMilhas: quantia.nullish(),
  saldoPontosCoalizao: quantia.nullish(),
  gastoMensalCartaoBRL: quantia.nullish(),
  cartaoId: idDeCatalogo.nullish(),
  aceitaClube: z.boolean().optional(),
});

/**
 * Parametros de consulta chegam como texto. Os opcionais aceitam
 * ausencia e string vazia, e numero invalido vira 0 -- e o que as rotas
 * ja faziam, e quebrar isso derrubaria a tela de quem tem um perfil
 * antigo salvo no navegador.
 */
const gastoNaConsulta = z
  .string()
  .nullish()
  .transform((v) => {
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n >= 0 && n <= 1_000_000_000 ? n : 0;
  });

const cartaoNaConsulta = z
  .string()
  .nullish()
  .transform((v) => (v && idDeCatalogo.safeParse(v).success ? v : undefined));

export const consultaDoVeredito = z.object({
  origem: iata,
  destino: iata,
  gasto: gastoNaConsulta,
  cartaoId: cartaoNaConsulta,
});

export const consultaDasPromocoes = z.object({
  origem: iata,
  gasto: gastoNaConsulta,
  cartaoId: cartaoNaConsulta,
});

/** Le os parametros de uma URL como objeto simples (ausente = null). */
export function parametrosDe(url: string, nomes: readonly string[]) {
  const p = new URL(url).searchParams;
  return Object.fromEntries(nomes.map((n) => [n, p.get(n)]));
}

/**
 * Relato de erro vindo do navegador (/api/erros). Tudo com teto: e uma
 * porta aberta a qualquer um, entao nada aqui pode virar log gigante.
 * `pagina` e so o caminho -- a query pode carregar dado da pessoa.
 */
export const corpoDoErroDoCliente = z.object({
  origem: z.enum(["janela", "promessa", "fronteira", "fronteira-global"]),
  mensagem: z.string().max(500),
  pagina: z.string().max(200).regex(/^\/[^?#]*$/),
  dispositivo: z.enum(["celular", "desktop"]),
  largura: z.number().int().min(0).max(10_000),
  digest: z.string().max(64).optional(),
  pilha: z.string().max(1500).optional(),
});
