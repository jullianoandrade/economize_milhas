import "server-only";

import { leitor } from "@/lib/supabase";
import type { Observacao } from "@/lib/tempo/antecedencia";

/**
 * Leitura do historico proprio de precos.
 *
 * Isolado de lib/tempo de proposito: aquele modulo e feito de funcoes
 * puras e precisa rodar nos testes sem banco nenhum. Aqui fica o unico
 * ponto que toca o Supabase, e ele devolve lista vazia em qualquer
 * problema -- sem banco, o motor cai nas heuristicas de mercado e a tela
 * avisa que a fonte mudou.
 */

/** Teto por consulta: o suficiente para a curva, sem pesar a pagina. */
const LIMITE = 2000;

export async function observacoesDaRota(
  origem: string,
  destino: string,
): Promise<Observacao[]> {
  const banco = leitor();
  if (!banco) return [];

  const { data, error } = await banco
    .from("precos_snapshot")
    .select("antecedencia_dias, valor_brl")
    .eq("origem", origem)
    .eq("destino", destino)
    .limit(LIMITE);

  if (error || !data) return [];

  return data.map((linha) => ({
    antecedenciaDias: Number(linha.antecedencia_dias),
    precoBRL: Number(linha.valor_brl),
  }));
}

/**
 * Menor preco observado por mes de embarque, a partir do historico
 * proprio. Complementa a API: o cache da Travelpayouts cobre poucos
 * meses, enquanto o nosso historico cresce para o ano inteiro.
 */
export async function precosMensaisDaRota(
  origem: string,
  destino: string,
): Promise<Array<{ mes: number; precoBRL: number }>> {
  const banco = leitor();
  if (!banco) return [];

  const { data, error } = await banco
    .from("precos_snapshot")
    .select("partida_em, valor_brl")
    .eq("origem", origem)
    .eq("destino", destino)
    .limit(LIMITE);

  if (error || !data) return [];

  const menorPorMes = new Map<number, number>();
  for (const linha of data) {
    const mes = Number(String(linha.partida_em).slice(5, 7));
    const valor = Number(linha.valor_brl);
    if (!mes || !Number.isFinite(valor)) continue;

    const atual = menorPorMes.get(mes);
    if (atual === undefined || valor < atual) menorPorMes.set(mes, valor);
  }

  return [...menorPorMes.entries()]
    .map(([mes, precoBRL]) => ({ mes, precoBRL }))
    .sort((a, b) => a.mes - b.mes);
}
