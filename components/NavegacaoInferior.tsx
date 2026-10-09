"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Nav flutuante.
 *
 * Pilula solta sobre o conteudo em vez de barra colada no rodape: o
 * polegar alcanca melhor, e a sombra separa a navegacao do conteudo sem
 * precisar de uma linha divisoria atravessando a tela.
 *
 * A aba ativa ganha fundo solido, nao so cor de texto. Numa pilula desse
 * tamanho, so a cor e fraca demais para dizer onde voce esta -- e seria
 * invisivel para quem nao distingue violeta de cinza.
 */

type Aba = {
  href: string;
  rotulo: string;
  icone: React.ReactNode;
};

const traco = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ABAS: Aba[] = [
  {
    href: "/",
    rotulo: "Buscar",
    icone: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]">
        <circle cx="11" cy="11" r="6.5" {...traco} />
        <path d="m16 16 4.5 4.5" {...traco} />
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
        <path d="M5 21V4.2a.5.5 0 0 1 .7-.45c2.2 1 4.4 1 6.6 0 2.2-1 4.4-1 6.6 0a.5.5 0 0 1 .3.45v8.1a.5.5 0 0 1-.7.45c-2.2-1-4.4-1-6.6 0-2.2 1-4.4 1-6.6 0" {...traco} />
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

function estaAtiva(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/rota");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavegacaoInferior() {
  const pathname = usePathname();

  // A tela de boas-vindas e uma porta de entrada, nao um lugar do app:
  // mostrar a nav ali convida a pular justamente o que ela explica.
  if (pathname === "/boas-vindas") return null;

  return (
    <nav
      aria-label="Navegação principal"
      className="safe-bottom fixed inset-x-0 bottom-0 z-50 px-4 pb-3"
    >
      <ul className="mx-auto flex max-w-sm items-center justify-between gap-1 rounded-full border border-borda bg-superficie/95 p-1.5 shadow-flutuante backdrop-blur-md">
        {ABAS.map((aba) => {
          const ativa = estaAtiva(pathname, aba.href);
          return (
            <li key={aba.href} className="min-w-0 flex-1">
              <Link
                href={aba.href}
                aria-current={ativa ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 text-[10px] font-semibold transition-colors ${
                  ativa
                    ? "bg-marca text-marca-contraste"
                    : "text-tinta-fraca hover:bg-superficie-2 hover:text-tinta-media"
                }`}
              >
                {aba.icone}
                <span className="truncate">{aba.rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
