import type { Metadata } from "next";
import { aeroportoPorIata } from "@/lib/milhas/regioes";
import rotasDestaque from "@/data/rotas-destaque.json";
import { Explorar } from "./_componentes/Explorar";

export const metadata: Metadata = {
  title: "Explorar",
  description:
    "Escolha um destino no globo e veja na hora se vale mais usar milhas ou pagar em dinheiro.",
};

/**
 * Os atalhos sao destinos que a coleta diaria acompanha: para eles ha
 * historico de preco proprio, entao a resposta e a mais firme que o app
 * consegue dar. Montados aqui, no servidor, para a base de aeroportos
 * nao ir ao navegador so para escrever cinco nomes de cidade.
 */
const ATALHOS = ["LIS", "EZE", "MCO", "REC", "SCL"];

export default function PaginaExplorar() {
  const monitorados = new Set(rotasDestaque.rotas.map(([, destino]) => destino));
  const atalhos = ATALHOS.filter((iata) => monitorados.has(iata)).flatMap((iata) => {
    const a = aeroportoPorIata(iata);
    return a ? [{ iata, cidade: a.cidade }] : [];
  });

  return <Explorar atalhos={atalhos} />;
}
