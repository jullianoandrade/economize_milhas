"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ABAS, estaAtiva } from "./abas";
import { AlternadorDeTema } from "./AlternadorDeTema";
import { MARCA } from "@/lib/marca";

/**
 * A navegação do app em telas grandes.
 *
 * Barra no topo, e não coluna lateral: a tela de rota é a mais densa do
 * app e trabalha melhor com a largura inteira. Uma lateral fixa comeria
 * uns 240px em toda tela, inclusive nas que não precisam de navegação
 * nenhuma enquanto a pessoa lê.
 *
 * Só existe a partir de `md`. Abaixo disso quem navega é a pílula
 * flutuante de baixo, que o polegar alcança -- as duas leem a MESMA
 * lista de abas (./abas), então não há como uma ganhar um destino que a
 * outra não tem.
 */
export function BarraSuperior() {
  const pathname = usePathname();
  const contaAtiva = pathname === "/conta" || pathname.startsWith("/conta/");

  return (
    <header className="sticky top-0 z-40 hidden border-b border-borda bg-superficie/85 backdrop-blur-md md:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6 lg:px-8">
        <Link
          href="/"
          className="display shrink-0 text-lg text-tinta transition-colors hover:text-marca"
        >
          {MARCA.nome}
        </Link>

        <nav aria-label="Navegação principal">
          <ul className="flex items-center gap-1">
            {ABAS.map((aba) => {
              const ativa = estaAtiva(pathname, aba.href);
              return (
                <li key={aba.href}>
                  <Link
                    href={aba.href}
                    aria-current={ativa ? "page" : undefined}
                    className={`flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors ${
                      ativa
                        ? "bg-marca text-marca-contraste"
                        : "text-tinta-media hover:bg-superficie-2 hover:text-tinta"
                    }`}
                  >
                    <span aria-hidden="true" className="[&_svg]:size-[18px]">
                      {aba.icone}
                    </span>
                    {aba.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* A conta nao e aba: e o lugar do que e da pessoa, ao lado do
            tema, como em qualquer app. No celular quem leva ate ela e o
            avatar do Inicio. */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <AlternadorDeTema />
          <Link
            href="/conta"
            aria-current={contaAtiva ? "page" : undefined}
            className={`flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors ${
              contaAtiva
                ? "bg-marca text-marca-contraste"
                : "text-tinta-media hover:bg-superficie-2 hover:text-tinta"
            }`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8.5" r="3.75" />
              <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
            </svg>
            Sua conta
          </Link>
        </div>
      </div>
    </header>
  );
}
