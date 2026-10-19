"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ABAS, estaAtiva } from "./abas";

/**
 * Nav flutuante, só no celular.
 *
 * Pílula solta sobre o conteúdo em vez de barra colada no rodapé: o
 * polegar alcança melhor, e a sombra separa a navegação do conteúdo sem
 * precisar de uma linha divisória atravessando a tela.
 *
 * A aba ativa ganha fundo sólido, não só cor de texto. Numa pílula desse
 * tamanho, só a cor é fraca demais para dizer onde você está -- e seria
 * invisível para quem não distingue violeta de cinza.
 *
 * `md:hidden` porque a partir dali quem navega é a BarraSuperior. Antes
 * esta nav também precisava se esconder sozinha na tela de boas-vindas,
 * com um `if` no pathname; hoje ela simplesmente não existe naquele
 * layout -- a porta de entrada é outro route group.
 */
export function NavegacaoInferior() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="safe-bottom fixed inset-x-0 bottom-0 z-50 px-4 pb-3 md:hidden"
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
