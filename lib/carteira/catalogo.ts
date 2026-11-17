import programas from "@/data/programas.json";
import cpm from "@/data/cpm-referencia.json";
import type { ProgramaDaCarteira } from "./modelo";

/**
 * Os programas que cabem na Carteira, com o preco de referencia que
 * estima o valor de cada um.
 *
 * Fica no servidor: a pagina monta a lista e entrega pronta ao
 * componente, sem levar data/ inteiro ao navegador.
 *
 * O preco de referencia vem de data/cpm-referencia.json (alvo de
 * compra, fonte e data registradas la). Programa sem preco de
 * referencia NAO entra: sem ele o valor estimado seria inventado.
 */

const PRECOS: Record<string, number | undefined> = {
  ...Object.fromEntries(
    Object.entries(cpm.programas).map(([id, p]) => [id, p.alvoBRL]),
  ),
  livelo: cpm.coalizao.livelo.alvoBRL,
  esfera: cpm.coalizao.esfera.alvoBRL,
};

export const FONTE_DO_VALOR = `Preço de referência do milheiro, ${cpm.atualizadoEm.split("-").reverse().join("/")}`;

export function catalogoDaCarteira(): ProgramaDaCarteira[] {
  const aereos = programas.programas.map((p) => ({
    id: p.id,
    nome: p.nome,
    unidade: p.unidade === "pontos" ? ("pontos" as const) : ("milhas" as const),
    milheiroBRL: PRECOS[p.id],
    validade: p.validadeObservacao,
  }));
  const coalizao = [
    { id: "livelo", nome: "Livelo", unidade: "pontos" as const, milheiroBRL: PRECOS.livelo, validade: undefined },
    { id: "esfera", nome: "Esfera", unidade: "pontos" as const, milheiroBRL: PRECOS.esfera, validade: undefined },
  ];

  return [...coalizao, ...aereos].flatMap((p) =>
    p.milheiroBRL === undefined
      ? []
      : [{ ...p, milheiroBRL: p.milheiroBRL, ...(p.validade ? { validade: p.validade } : {}) }],
  );
}
