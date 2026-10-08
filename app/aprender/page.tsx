import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { EmBreve } from "@/components/EmBreve";

export const metadata: Metadata = { title: "Aprender" };

export default function Aprender() {
  return (
    <>
      <Cabecalho
        titulo="Aprender"
        subtitulo="O vocabulário de milhas sem enrolação — e os erros que fazem você perder dinheiro."
      />
      <EmBreve fase="Fase 9">
        Glossário navegável (custo por milheiro, transferência bonificada, taxa
        de embarque) e a seção mais importante: quando NÃO usar milhas.
      </EmBreve>
    </>
  );
}
