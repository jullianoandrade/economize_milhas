import type { Metadata } from "next";
import { Conta } from "./_componentes/Conta";

export const metadata: Metadata = {
  title: "Sua conta",
  description:
    "Suas viagens, buscas recentes, programas, objetivos e preferências. Tudo fica no seu aparelho.",
};

export default function PaginaDaConta() {
  return <Conta />;
}
