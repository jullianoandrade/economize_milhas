import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { EmBreve } from "@/components/EmBreve";

export const metadata: Metadata = { title: "Meu plano de acúmulo" };

export default function Plano() {
  return (
    <>
      <Cabecalho
        titulo="Seu plano de acúmulo"
        subtitulo="Quanto falta, de onde tirar e em quanto tempo você chega na viagem que quer."
      />
      <EmBreve fase="Fase 7">
        Você informa saldo atual, gasto mensal no cartão e a meta; o app devolve
        o ritmo necessário, qual clube ou transferência compensa e o mês
        estimado de chegada.
      </EmBreve>
    </>
  );
}
