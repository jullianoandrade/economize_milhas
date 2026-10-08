import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { EmBreve } from "@/components/EmBreve";

export const metadata: Metadata = { title: "Promoções do momento" };

export default function Promocoes() {
  return (
    <>
      <Cabecalho
        titulo="Promoções do momento"
        subtitulo="As melhores oportunidades saindo da sua cidade — não só preço baixo, mas resgate que vale a pena."
      />
      <EmBreve fase="Fase 7">
        Vai listar os destinos populares a partir do seu aeroporto, cada um já
        passado pelo motor de milhas, com os bônus de transferência vigentes no
        topo.
      </EmBreve>
    </>
  );
}
