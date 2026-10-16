"use client";

import { usarPerfil, usePerfilHidratado } from "@/store/perfil";

/**
 * "Me lembre em N dias", vindo de JanelaDeCompra.esperarDias.
 *
 * Guarda so a DATA no perfil -- ainda nao existe notificacao de
 * verdade. Por isso a confirmacao nunca promete um aviso automatico
 * ("vamos te lembrar"): isso seria dizer uma coisa que o app ainda nao
 * faz. O proximo passo natural, quando houver service worker, e a Push
 * API; o app ja e instalavel (PrimeiraVisita.tsx detecta standalone).
 */

function somarDias(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

function formatarData(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });
}

export function LembreteDeCompra({
  rotaId,
  esperarDias,
}: {
  rotaId: string;
  esperarDias: number;
}) {
  const hidratado = usePerfilHidratado();
  const lembrarEm = usarPerfil((p) => p.lembretesDeCompra[rotaId]);
  const definirLembrete = usarPerfil((p) => p.definirLembrete);

  if (!hidratado || esperarDias <= 0) return null;

  if (lembrarEm) {
    return (
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-superficie-2 p-3 text-xs leading-relaxed text-tinta-media">
        <span>
          Guardado. Volte aqui perto de{" "}
          <strong className="font-semibold text-tinta">
            {formatarData(lembrarEm)}
          </strong>{" "}
          para conferir o preço de novo.
        </span>
        <button
          type="button"
          onClick={() => definirLembrete(rotaId, null)}
          className="shrink-0 font-semibold text-marca underline underline-offset-4"
        >
          cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => definirLembrete(rotaId, somarDias(esperarDias))}
      className="mt-3 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-borda px-4 text-xs font-semibold text-tinta transition-colors hover:border-marca"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 8v4l3 2" />
        <circle cx="12" cy="13" r="8" />
        <path d="M9 2h6M5 5l1.5 1.5M19 5l-1.5 1.5" />
      </svg>
      Me lembre em {esperarDias} {esperarDias === 1 ? "dia" : "dias"}
    </button>
  );
}
