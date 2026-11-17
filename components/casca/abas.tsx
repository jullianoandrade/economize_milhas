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
    href: "/",
    rotulo: "Início",
    icone: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]">
        <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" {...traco} />
      </svg>
    ),
  },
  {
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
    href: "/oportunidades",
    rotulo: "Oportunidades",
    icone: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]">
        <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z" {...traco} />
      </svg>
    ),
  },
];

/**
 * Quatro abas, e as telas que moram dentro de cada uma:
 *   Explorar -> /rota/* (o detalhe da resposta)
 *   Carteira -> /objetivos (objetivo e saldo sao a mesma conversa)
 * Aprender nao e aba: aparece no rodape e no contexto, quando um termo
 * precisa de explicacao.
 */
const DENTRO_DE: Record<string, string[]> = {
  "/explorar": ["/rota"],
  "/carteira": ["/objetivos"],
};

export function estaAtiva(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  const prefixos = [href, ...(DENTRO_DE[href] ?? [])];
  return prefixos.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
