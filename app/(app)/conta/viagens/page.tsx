import type { Metadata } from "next";
import programas from "@/data/programas.json";
import { MinhasViagens } from "./_componentes/MinhasViagens";

export const metadata: Metadata = {
  title: "Minhas viagens",
  description:
    "As viagens que você reservou, as que foi ver e as que já fez, com hospedagem nas datas certas. Fica só no seu aparelho.",
};

export default function PaginaMinhasViagens() {
  // So o nome de cada programa vai ao navegador, nao data/ inteiro.
  const nomesDosProgramas = Object.fromEntries(
    programas.programas.map((p) => [p.id, p.nome]),
  );
  return <MinhasViagens nomesDosProgramas={nomesDosProgramas} />;
}
