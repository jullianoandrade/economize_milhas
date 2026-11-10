import "server-only";

import { leitor } from "@/lib/supabase";
import {
  curvaDeAntecedencia,
  type FaixaDaCurva,
  type Observacao,
} from "@/lib/tempo/antecedencia";

/**
 * Leitura do historico proprio de precos.
 *
 * Isolado de lib/tempo de proposito: aquele modulo e feito de funcoes
 * puras e precisa rodar nos testes sem banco nenhum. Aqui fica o unico
 * ponto que toca o Supabase, e ele devolve lista vazia em qualquer
 * problema -- sem banco, o motor cai nas heuristicas de mercado e a tela
 * avisa que a fonte mudou.
 */

/**
 * Teto por consulta nas leituras de linha crua.
 *
 * ATENCAO: este numero e menos efetivo do que parece. O PostgREST corta
 * a resposta em 1.000 linhas independentemente do que se peca aqui, e
 * sem ORDER BY quais 1.000 chegam e arbitrario. Foi o que manteve 15 das
 * 20 rotas monitoradas na heuristica de mercado mesmo com 74.778
 * observacoes no banco.
 *
 * Por isso a leitura boa e por agregado (curvaDeAntecedenciaDaRota e
 * precosMensaisDaRota, abaixo). O caminho de linha crua permanece como
 * degradacao: banco sem a migration de agregados aplicada responde 404
 * no RPC, e o app continua funcionando como antes em vez de ficar sem
 * historico nenhum.
 */
const LIMITE = 2000;

/** Largura da faixa de antecedencia, em dias. Casa com o default do SQL. */
const LARGURA_DA_FAIXA_DIAS = 15;

export type CurvaDaRota = {
  curva: FaixaDaCurva[];
  /** Soma das amostras de todas as faixas -- o historico inteiro. */
  observacoes: number;
};

/**
 * A curva de antecedencia agregada NO BANCO.
 *
 * Devolve ~25 linhas por rota em vez das 5.500 que a tabela guarda, e
 * sem o vies da fatia arbitraria: a mediana de cada faixa e calculada
 * sobre todas as observacoes daquela faixa, nao sobre as que couberam
 * na resposta.
 *
 * A degradacao fica AQUI DENTRO, e nao no chamador, por um motivo
 * pratico: so se paga a leitura de linha crua quando o agregado falhou.
 * Encapsulado, o caminho feliz custa uma consulta; exposto, custaria
 * duas em toda renderizacao.
 *
 * Banco sem a migration de agregados responde 404 no RPC -- e a pagina
 * continua funcionando exatamente como antes, nunca vazia.
 */
export async function curvaDeAntecedenciaDaRota(
  origem: string,
  destino: string,
): Promise<CurvaDaRota> {
  const vazia: CurvaDaRota = { curva: [], observacoes: 0 };

  const banco = leitor();
  if (!banco) return vazia;

  const { data, error } = await banco.rpc("curva_antecedencia", {
    p_origem: origem,
    p_destino: destino,
    p_largura_dias: LARGURA_DA_FAIXA_DIAS,
  });

  if (!error && Array.isArray(data) && data.length > 0) {
    const curva: FaixaDaCurva[] = data
      .map((linha) => ({
        dias: Number(linha.dias),
        precoMedianoBRL: Number(linha.preco_mediano),
        amostras: Number(linha.amostras),
      }))
      .filter(
        (f) =>
          Number.isFinite(f.dias) &&
          Number.isFinite(f.precoMedianoBRL) &&
          f.precoMedianoBRL > 0,
      );

    if (curva.length > 0) {
      return {
        curva,
        observacoes: curva.reduce((soma, faixa) => soma + faixa.amostras, 0),
      };
    }
  }

  const brutas = await observacoesDaRota(origem, destino);
  return {
    curva: curvaDeAntecedencia(brutas, LARGURA_DA_FAIXA_DIAS),
    observacoes: brutas.length,
  };
}

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

/** Observacoes com a data de partida, para a analise de flexibilidade. */
export async function observacoesDatadasDaRota(
  origem: string,
  destino: string,
): Promise<Array<{ partidaEm: string; precoBRL: number }>> {
  const banco = leitor();
  if (!banco) return [];

  const { data, error } = await banco
    .from("precos_snapshot")
    .select("partida_em, valor_brl")
    .eq("origem", origem)
    .eq("destino", destino)
    .limit(LIMITE);

  if (error || !data) return [];

  return data.map((linha) => ({
    partidaEm: String(linha.partida_em),
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

  // Caminho bom: o minimo por mes sai pronto do banco, sobre o historico
  // inteiro. O reduce abaixo faz a mesma conta, mas so sobre as linhas
  // que couberam na resposta -- o que subestima o minimo justamente nas
  // rotas com mais dado.
  const agregado = await banco.rpc("precos_min_por_mes", {
    p_origem: origem,
    p_destino: destino,
  });

  if (!agregado.error && Array.isArray(agregado.data) && agregado.data.length > 0) {
    return agregado.data
      .map((linha) => ({
        mes: Number(linha.mes),
        precoBRL: Number(linha.preco_min),
      }))
      .filter((m) => m.mes >= 1 && m.mes <= 12 && Number.isFinite(m.precoBRL))
      .sort((a, b) => a.mes - b.mes);
  }

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
