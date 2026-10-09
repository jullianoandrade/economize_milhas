import type { Metadata } from "next";
import { PassosDeBoasVindas } from "@/components/PassosDeBoasVindas";

export const metadata: Metadata = {
  title: "O que este app faz",
  description:
    "Um direcionador de estratégia de viagem: quanto custa em dinheiro, quanto custa em milhas, qual das duas vale mais e em quanto tempo você junta o que falta.",
};

/**
 * A porta de entrada, em tres passos.
 *
 * O conteudo dos tres vai inteiro no HTML -- os passos inativos ficam
 * com `hidden`, nao fora da arvore --, entao a pagina continua sendo uma
 * explicacao completa e indexavel do produto para quem chega do
 * buscador, e um fluxo guiado para quem abre o app pela primeira vez.
 */
export default function BoasVindas() {
  return <PassosDeBoasVindas />;
}
