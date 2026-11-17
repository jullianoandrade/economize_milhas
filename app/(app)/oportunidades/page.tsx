import type { Metadata } from "next";
import calendario from "@/data/calendario-transferencias.json";
import { Oportunidades } from "./_componentes/Oportunidades";

export const metadata: Metadata = {
  title: "Oportunidades",
  description:
    "Bônus de transferência entre programas e passagens abaixo do preço normal saindo da sua cidade, com o que vale fazer em cada uma.",
};

const NOMES: Record<string, string> = {
  smiles: "Smiles",
  latampass: "LATAM Pass",
  tudoazul: "Azul Fidelidade",
};

/**
 * O historico de bonus vem daqui, no servidor, com a data da pesquisa:
 * e expectativa, nao fato, e a tela precisa poder dizer de quando ele e.
 */
export default function PaginaOportunidades() {
  const historico = calendario.padraoHistorico
    .map((p) => ({
      programa: NOMES[p.destino] ?? p.destino,
      tipicoPct: p.bonusMedianoPct,
      maximoPct: p.bonusMaximoObservadoPct,
      observacao: p.observacao,
    }))
    .sort((a, b) => b.tipicoPct - a.tipicoPct);

  const [ano, mes] = calendario.atualizadoEm.split("-");
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  return (
    <Oportunidades
      historico={historico}
      historicoDe={`${MESES[Number(mes) - 1]} de ${ano}`}
    />
  );
}
