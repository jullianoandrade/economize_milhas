import { EsquemaGlossario } from "@/lib/dados/esquemas";
import glossarioJson from "@/data/glossario.json";

/**
 * O vocabulario de milhas, para ser lido de dentro da tela de calculo.
 *
 * Importa so data/glossario.json (7,4 KB) e o schema de validacao --
 * nunca o barril lib/dados/index.ts, que arrasta a base de aeroportos
 * (mais de 60 KB) para o navegador so para explicar tres palavras.
 * Mesmo precedente de lib/milhas/rotulos.ts.
 */

const glossario = EsquemaGlossario.parse(glossarioJson);

/**
 * Uniao literal, e nao `string`.
 *
 * Com uniao literal, `<Termo id="termo-que-nao-existe">` quebra o build
 * em vez de virar uma folha vazia em producao. A checagem abaixo garante
 * que esta lista nunca saia de sincronia com o JSON, em nenhuma direcao.
 */
export type IdDeTermo =
  | "cpm"
  | "valor-extraido"
  | "transferencia-bonificada"
  | "clube"
  | "taxa-embarque"
  | "coalizao"
  | "paridade"
  | "precificacao-dinamica"
  | "alta-temporada"
  | "antecedencia";

const IDS_CONHECIDOS: readonly IdDeTermo[] = [
  "cpm",
  "valor-extraido",
  "transferencia-bonificada",
  "clube",
  "taxa-embarque",
  "coalizao",
  "paridade",
  "precificacao-dinamica",
  "alta-temporada",
  "antecedencia",
];

export type TermoDoGlossario = {
  id: IdDeTermo;
  termo: string;
  resumo: string;
  explicacao: string;
  exemplo?: string;
};

const porId = new Map<IdDeTermo, TermoDoGlossario>(
  glossario.termos.map((t) => [t.id as IdDeTermo, t as TermoDoGlossario]),
);

// Roda no carregamento do modulo: um termo removido ou renomeado no JSON
// sem atualizar IDS_CONHECIDOS explode aqui, nao num componente qualquer
// em producao.
if (
  porId.size !== IDS_CONHECIDOS.length ||
  IDS_CONHECIDOS.some((id) => !porId.has(id))
) {
  throw new Error(
    "lib/glossario/termos.ts: IdDeTermo saiu de sincronia com data/glossario.json",
  );
}

export function termoPorId(id: IdDeTermo): TermoDoGlossario {
  // A checagem acima garante que todo id literal tem entrada correspondente.
  return porId.get(id)!;
}
