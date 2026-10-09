"use client";

import { useRouter } from "next/navigation";
import { usarPerfil } from "@/store/perfil";

/**
 * Fecha a tela de boas-vindas e marca a visita.
 *
 * E o unico pedaco interativo daquela pagina -- o resto e texto, e fica
 * em componente de servidor para a pagina inteira ser pre-renderizada e
 * indexavel. Quem chega por busca cai numa explicacao do produto, nao
 * num formulario.
 */
export function BotaoComecar({ rotulo = "Começar" }: { rotulo?: string }) {
  const router = useRouter();
  const marcarVisita = usarPerfil((p) => p.marcarVisita);

  return (
    <button
      type="button"
      onClick={() => {
        marcarVisita();
        router.push("/");
      }}
      className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-marca px-6 text-base font-semibold text-marca-contraste shadow-flutuante transition-colors hover:bg-marca-forte"
    >
      {rotulo}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h13" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </button>
  );
}
