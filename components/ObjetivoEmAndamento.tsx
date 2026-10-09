"use client";

import Link from "next/link";
import { AnelDeProgresso } from "./AnelDeProgresso";
import { usarPerfil, usePerfilHidratado } from "@/store/perfil";
import { calcularProgresso } from "@/lib/metas/progresso";
import { milhas as fmtMilhas } from "@/lib/format";

/**
 * O objetivo mais recente, resumido na home.
 *
 * E o unico elemento da home que muda sozinho entre uma visita e outra
 * -- e por isso o que traz a pessoa de volta. Preco de passagem ela
 * consulta quando precisa; "faltam 18 mil milhas" ela quer ver de novo.
 *
 * O cartao tem altura fixa nos dois estados, com e sem objetivo, porque
 * o conteudo so pode ser decidido depois da hidratacao: alturas
 * diferentes fariam a tela pular na mao a cada carregamento.
 */

const ALTURA = "min-h-[7.5rem]";

export function ObjetivoEmAndamento() {
  const metas = usarPerfil((p) => p.metas);
  const hidratado = usePerfilHidratado();

  if (!hidratado) {
    return (
      <div
        className={`${ALTURA} mb-6 animate-pulse rounded-[24px] bg-superficie-2`}
      />
    );
  }

  const meta = metas[0];

  if (!meta) {
    return (
      <Link
        href="/objetivos"
        className={`${ALTURA} mb-6 flex items-center gap-4 rounded-[24px] border border-dashed border-borda bg-superficie p-4 transition-colors hover:border-marca`}
      >
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-marca-fraca text-marca"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 21V4.2a.5.5 0 0 1 .7-.45c2.2 1 4.4 1 6.6 0 2.2-1 4.4-1 6.6 0a.5.5 0 0 1 .3.45v8.1a.5.5 0 0 1-.7.45c-2.2-1-4.4-1-6.6 0-2.2 1-4.4 1-6.6 0" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-tinta">
            Defina um objetivo
          </span>
          <span className="mt-0.5 block text-sm leading-relaxed text-tinta-media">
            Escolha um destino e o app passa a acompanhar quanto falta — e se
            no seu ritmo dá tempo.
          </span>
        </span>
      </Link>
    );
  }

  const progresso = calcularProgresso(meta, new Date());

  return (
    <Link
      href="/objetivos"
      className={`${ALTURA} mb-6 flex items-center gap-4 rounded-[24px] border border-borda bg-superficie p-4 shadow-card transition-colors hover:border-marca`}
    >
      <AnelDeProgresso percentual={progresso.percentual} rotulo="pronto" />

      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase tracking-widest text-marca">
          Seu objetivo
        </span>
        <span className="display mt-0.5 block truncate text-lg text-tinta">
          {meta.destinoCidade}
        </span>
        <span className="tabular mt-1 block text-sm text-tinta-media">
          {progresso.milhasFaltando === 0
            ? "Milhas suficientes — hora de resgatar"
            : `Faltam ${fmtMilhas(progresso.milhasFaltando)} ${
                progresso.mesesRestantes === null
                  ? "milhas"
                  : `· ~${progresso.mesesRestantes} ${
                      progresso.mesesRestantes === 1 ? "mês" : "meses"
                    }`
              }`}
        </span>
      </span>

      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-4 shrink-0 text-tinta-fraca"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
