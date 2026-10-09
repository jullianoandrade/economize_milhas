import { Suspense } from "react";
import type { Metadata } from "next";
import { TelaDeObjetivos } from "@/components/TelaDeObjetivos";

export const metadata: Metadata = {
  title: "Objetivos",
  description:
    "Marque uma viagem como objetivo e acompanhe quanto falta de milhas, quanto você já acumulou e se no seu ritmo dá tempo.",
};

/**
 * A tela inteira depende do localStorage e do parametro ?destino, que
 * sao dado de requisicao. A fronteira de Suspense aqui e o que permite
 * ao Next servir a casca da pagina de imediato e deixar so o miolo
 * esperar -- sem ela, com Cache Components ligado, a rota toda deixaria
 * de ser pre-renderizavel.
 */
export default function Objetivos() {
  return (
    <Suspense fallback={<Esqueleto />}>
      <TelaDeObjetivos />
    </Suspense>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-4" aria-label="Carregando seus objetivos">
      <div className="h-24 animate-pulse rounded-2xl bg-superficie-2" />
      <div className="h-64 animate-pulse rounded-[28px] bg-superficie-2" />
    </div>
  );
}
