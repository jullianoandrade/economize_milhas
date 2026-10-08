import aeroportosJson from "@/data/aeroportos.json";
import cartoesJson from "@/data/cartoes.json";
import clubesJson from "@/data/clubes.json";
import cpmJson from "@/data/cpm-referencia.json";
import glossarioJson from "@/data/glossario.json";
import heuristicasJson from "@/data/heuristicas-tempo.json";
import precosJson from "@/data/precos-referencia.json";
import programasJson from "@/data/programas.json";
import tabelasJson from "@/data/tabelas-resgate.json";
import transferenciasJson from "@/data/calendario-transferencias.json";

import {
  EsquemaAeroportos,
  EsquemaCartoes,
  EsquemaClubes,
  EsquemaCpm,
  EsquemaGlossario,
  EsquemaHeuristicasTempo,
  EsquemaPrecosReferencia,
  EsquemaProgramas,
  EsquemaTabelasResgate,
  EsquemaTransferencias,
} from "./esquemas";

/**
 * Ponto unico de leitura da base curada.
 *
 * A validacao roda no carregamento do modulo (uma vez por processo), de
 * modo que um dado mal formado explode cedo, com mensagem clara, em vez
 * de virar NaN no meio de um calculo de economia.
 *
 * ATENCAO: este modulo NUNCA deve importar data/parceiros-comercial.json.
 * Ele e lido por lib/milhas e lib/tempo, e dados comerciais ali dentro
 * contaminariam o ranking. Quem le o arquivo comercial e, exclusivamente,
 * lib/monetizacao/parceiros.ts. Ver tests/arquitetura.test.ts.
 */

export const aeroportos = EsquemaAeroportos.parse(aeroportosJson);
export const precosReferencia = EsquemaPrecosReferencia.parse(precosJson);
export const programas = EsquemaProgramas.parse(programasJson);
export const tabelasResgate = EsquemaTabelasResgate.parse(tabelasJson);
export const cpmReferencia = EsquemaCpm.parse(cpmJson);
export const clubes = EsquemaClubes.parse(clubesJson);
export const cartoes = EsquemaCartoes.parse(cartoesJson);
export const transferencias = EsquemaTransferencias.parse(transferenciasJson);
export const heuristicasTempo = EsquemaHeuristicasTempo.parse(heuristicasJson);
export const glossario = EsquemaGlossario.parse(glossarioJson);

export type Programa = (typeof programas.programas)[number];
export type Clube = (typeof clubes.clubes)[number];
export type PlanoDeClube = Clube["planos"][number];
export type Cartao = (typeof cartoes.cartoes)[number];
export type Regiao = (typeof tabelasResgate.regioes)[number];
export type Aeroporto = (typeof aeroportos.aeroportos)[number];
export type Paridade = (typeof transferencias.paridades)[number];

export const idsDeProgramas = programas.programas.map((p) => p.id);
export const idsDeRegioes = tabelasResgate.regioes.map((r) => r.id);

export function programaPorId(id: string): Programa | undefined {
  return programas.programas.find((p) => p.id === id);
}

export type { Confianca } from "./esquemas";
