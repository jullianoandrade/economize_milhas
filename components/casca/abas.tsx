import type { ReactNode } from "react";

/**
 * As quatro abas do app, num lugar só.
 *
 * Duas cascas as desenham -- a barra superior no desktop e a pílula
 * flutuante no celular. Antes de existir a barra, esta lista morava
 * dentro da nav de baixo; duplicá-la seria garantir que um dia as duas
 * discordem sobre quantas abas o app tem.
 */

export type Aba = {
  href: string;
  rotulo: string;
  icone: ReactNode;
};

const traco = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const ABAS: Aba[] = [
  {
    // Provisorio ate a navegacao nova (Inicio, Explorar, Carteira,
    // Oportunidades): por ora o Explorar ocupa o lugar da antiga "Buscar",
    // e a home continua acessivel pela marca na barra.
    href: "/explorar",
    rotulo: "Explorar",
    icone: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]">
        <circle cx="12" cy="12" r="8.5" {...traco} />
        <path d="M3.5 12h17" {...traco} />
        <path d="M12 3.5c2.6 2.6 2.6 14.4 0 17c-2.6-2.6-2.6-14.4 0-17Z" {...traco} />
      </svg>
    ),
  },
  {
    href: "/carteira",
    rotulo: "Carteira",
    icone: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]">
        <rect x="3" y="6" width="18" height="13" rx="2.5" {...traco} />
        <path d="M3 10.5h18" {...traco} />
        <path d="M15.5 15h2" {...traco} />
      </svg>
    ),
  },
  {
    href: "/promocoes",
    rotulo: "Promoções",
    icone: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]">
        <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z" {...traco} />
      </svg>
    ),
  },
  {
    href: "/objetivos",
    rotulo: "Objetivos",
    icone: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]">
        <path
          d="M5 21V4.2a.5.5 0 0 1 .7-.45c2.2 1 4.4 1 6.6 0 2.2-1 4.4-1 6.6 0a.5.5 0 0 1 .3.45v8.1a.5.5 0 0 1-.7.45c-2.2-1-4.4-1-6.6 0-2.2 1-4.4 1-6.6 0"
          {...traco}
        />
      </svg>
    ),
  },
  {
    href: "/aprender",
    rotulo: "Aprender",
    icone: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]">
        <path d="M4 4.5h5.5A2.5 2.5 0 0 1 12 7v12a2 2 0 0 0-2-2H4v-12Z" {...traco} />
        <path d="M20 4.5h-5.5A2.5 2.5 0 0 0 12 7v12a2 2 0 0 1 2-2h6v-12Z" {...traco} />
      </svg>
    ),
  },
];

/** Explorar e a rota sao a mesma aba: /rota e o detalhe da resposta. */
export function estaAtiva(pathname: string, href: string): boolean {
  if (href === "/explorar") return pathname === "/explorar" || pathname.startsWith("/rota");
  return pathname === href || pathname.startsWith(`${href}/`);
}
