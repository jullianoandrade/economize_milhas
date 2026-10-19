import { Suspense } from "react";
import type { Metadata } from "next";
import {
  ALTURA_RESERVADA,
  TelaDeObjetivos,
} from "./_componentes/TelaDeObjetivos";

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
    /* Coluna contida: esta tela e uma sequencia de formulario e leitura
       (registrar saldo, ler o progresso, ajustar o acumulo), e nada nela
       melhora esticando ate 1152px. O arranjo interno em desktop fica
       para quando TelaDeObjetivos.tsx for quebrada em partes -- hoje sao
       926 linhas num arquivo so, e mexer no layout dela junto com a
       virada para web misturaria dois riscos diferentes. */
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<Esqueleto />}>
        <TelaDeObjetivos />
      </Suspense>
    </div>
  );
}

function Esqueleto() {
  return (
    <div
      className={`${ALTURA_RESERVADA} space-y-4`}
      aria-label="Carregando seus objetivos"
    >
      <div className="h-28 animate-pulse rounded-2xl bg-superficie-2" />
      <div className="h-80 animate-pulse rounded-[28px] bg-superficie-2" />
      <div className="h-56 animate-pulse rounded-[28px] bg-superficie-2" />
    </div>
  );
}
