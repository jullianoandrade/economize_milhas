import type { Metadata } from "next";
import { catalogoDaCarteira, FONTE_DO_VALOR } from "@/lib/carteira/catalogo";
import { Carteira } from "./_componentes/Carteira";

export const metadata: Metadata = {
  title: "Carteira",
  description:
    "Seus programas de pontos e milhas num lugar só: saldo, valor estimado e o que está para vencer. Fica só no seu aparelho.",
};

export default function PaginaCarteira() {
  return <Carteira catalogo={catalogoDaCarteira()} fonteDoValor={FONTE_DO_VALOR} />;
}
