import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";
import { criarLimitador, type Regra } from "./limite";
import { registrar } from "@/lib/log";

/**
 * O que toda rota de API faz antes de chegar na regra de negocio:
 * identificar quem chama, limitar, e ler o corpo com teto de tamanho e
 * schema. Fica aqui para nenhuma rota esquecer um dos tres.
 */

const verificar = criarLimitador();

/**
 * IP de quem chama. Na Vercel, x-forwarded-for e reescrito pela
 * plataforma -- o primeiro valor e o cliente real, nao algo que o
 * cliente consegue forjar. Fora dela (dev local) cai em "local", o que
 * e aceitavel: so ha um cliente.
 */
export function ipDe(requisicao: Request): string {
  const encaminhado = requisicao.headers.get("x-forwarded-for");
  const primeiro = encaminhado?.split(",")[0]?.trim();
  return primeiro || requisicao.headers.get("x-real-ip") || "local";
}

/** null quando pode seguir; a resposta 429 pronta quando nao pode. */
export function limitar(
  requisicao: Request,
  porta: string,
  regra: Regra,
): NextResponse | null {
  const r = verificar(`${porta}:${ipDe(requisicao)}`, regra);
  if (r.permitido) return null;
  registrar("aviso", "limite.excedido", { porta });
  return NextResponse.json(
    { erro: "muitas requisicoes, tente de novo em instantes" },
    { status: 429, headers: { "Retry-After": String(r.tenteEmSegundos) } },
  );
}

/** Variante sem resposta, para quando exceder nao e erro (ver /interesse). */
export function dentroDoLimite(chave: string, regra: Regra): boolean {
  return verificar(chave, regra).permitido;
}

/**
 * Nenhum corpo legitimo deste app passa de algumas centenas de bytes.
 * Sem teto, `request.json()` le o que vier -- megabytes de JSON viram
 * memoria e CPU da funcao antes de qualquer validacao.
 */
const TETO_DO_CORPO = 4 * 1024;

export type Leitura<T> =
  | { ok: true; dados: T }
  | { ok: false; resposta: NextResponse };

export async function lerCorpo<T>(
  requisicao: Request,
  esquema: z.ZodType<T>,
): Promise<Leitura<T>> {
  const declarado = Number(requisicao.headers.get("content-length") ?? 0);
  if (declarado > TETO_DO_CORPO) return falha("corpo grande demais", 413);

  // content-length pode mentir ou faltar (chunked). Le em pedacos e
  // para no teto, em vez de confiar no cabecalho.
  const leitor = requisicao.body?.getReader();
  if (!leitor) return falha("corpo invalido", 400);
  const pedacos: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > TETO_DO_CORPO) {
      await leitor.cancel();
      return falha("corpo grande demais", 413);
    }
    pedacos.push(value);
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(new TextDecoder().decode(concatenar(pedacos, total)));
  } catch {
    return falha("corpo invalido", 400);
  }

  const validado = esquema.safeParse(bruto);
  // A mensagem do zod nao volta para o cliente: ela descreve o schema
  // interno, e quem chama de forma legitima nunca erra o formato.
  if (!validado.success) return falha("corpo invalido", 400);
  return { ok: true, dados: validado.data };
}

function concatenar(pedacos: Uint8Array[], total: number): Uint8Array {
  const saida = new Uint8Array(total);
  let pos = 0;
  for (const p of pedacos) {
    saida.set(p, pos);
    pos += p.byteLength;
  }
  return saida;
}

function falha(erro: string, status: number): Leitura<never> {
  return { ok: false, resposta: NextResponse.json({ erro }, { status }) };
}
