import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { EmBreve } from "@/components/EmBreve";

export const metadata: Metadata = { title: "Como nos sustentamos" };

export default function ComoNosSustentamos() {
  return (
    <>
      <Cabecalho
        titulo="Como nos sustentamos"
        subtitulo="Nosso ranking nunca considera quanto ganhamos."
      />
      <EmBreve fase="Fase 8">
        Esta página explica as parcerias comerciais quando a monetização estiver
        ligada. Hoje ela está desligada: nenhum link do app leva comissão.
      </EmBreve>
    </>
  );
}
