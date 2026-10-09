import { z } from "zod";
import comercialJson from "@/data/parceiros-comercial.json";

/**
 * O UNICO leitor de data/parceiros-comercial.json no projeto inteiro.
 *
 * Nao e convencao: tests/arquitetura.test.ts falha o build se qualquer
 * outro arquivo importar aquele JSON. A regra existe para que o motor de
 * milhas e o motor temporal sejam FISICAMENTE incapazes de enxergar
 * quanto se ganha com cada recomendacao -- a promessa feita em
 * /como-nos-sustentamos vira algo que uma maquina verifica, e nao algo em
 * que o usuario precisa acreditar.
 */

export const TipoDeParceiro = z.enum([
  "voo",
  "hotel",
  "cartao",
  "seguro",
  "esim",
  "cambio",
]);
export type TipoDeParceiro = z.infer<typeof TipoDeParceiro>;

const EsquemaComercial = z.object({
  atualizadoEm: z.string(),
  aviso: z.string(),
  explicacao: z.string(),
  parceiros: z.array(
    z.object({
      id: z.string(),
      nome: z.string(),
      tipo: TipoDeParceiro,
      rede: z.string(),
      url: z.string(),
      parametroDeMarker: z.string(),
      comissao: z.object({
        modelo: z.enum(["percentual", "cpa"]),
        min: z.number().nonnegative(),
        max: z.number().nonnegative(),
      }),
      cookieDias: z.number().int().positive(),
      observacao: z.string(),
    }),
  ),
});

const comercial = EsquemaComercial.parse(comercialJson);

export type Parceiro = (typeof comercial.parceiros)[number];

export const parceiros = comercial.parceiros;

export function parceiroPorTipo(tipo: TipoDeParceiro): Parceiro | undefined {
  return parceiros.find((p) => p.tipo === tipo);
}

/** Parceiros ja prontos para uso: tem URL e marker configurados. */
export function parceirosAtivos(): Parceiro[] {
  return parceiros.filter((p) => p.url !== "" && p.parametroDeMarker !== "");
}
