"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ABAS, estaAtiva } from "./abas";
import { AlternadorDeTema } from "./AlternadorDeTema";

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

  return (
    <header className="sticky top-0 z-40 hidden border-b border-borda bg-superficie/85 backdrop-blur-md md:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6 lg:px-8">
        <Link
          href="/"
          className="display shrink-0 text-lg text-tinta transition-colors hover:text-marca"
        >
          Milhas
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

        <div className="ml-auto shrink-0">
          <AlternadorDeTema />
        </div>
      </div>
    </header>
  );
}
