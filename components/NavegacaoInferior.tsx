"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
        <circle cx="11" cy="11" r="6.5" {...traco} />
        <path d="m16 16 4.5 4.5" {...traco} />
      </svg>
    ),
  },
  {
    href: "/promocoes",
    rotulo: "Promoções",
    icone: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
        <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z" {...traco} />
      </svg>
    ),
  },
  {
    href: "/plano",
    rotulo: "Plano",
    icone: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
        <circle cx="12" cy="12" r="8.5" {...traco} />
        <circle cx="12" cy="12" r="4.5" {...traco} />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/aprender",
    rotulo: "Aprender",
    icone: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
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

  return (
    <nav
      aria-label="Navegação principal"
      className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-borda bg-superficie/95 backdrop-blur-sm"
    >
      <ul className="mx-auto flex max-w-lg">
        {ABAS.map((aba) => {
          const ativa = estaAtiva(pathname, aba.href);
          return (
            <li key={aba.href} className="flex-1">
              <Link
                href={aba.href}
                aria-current={ativa ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  ativa ? "text-marca" : "text-tinta-fraca hover:text-tinta-media"
                }`}
              >
                {aba.icone}
                <span>{aba.rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
