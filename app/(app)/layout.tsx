import { Suspense } from "react";
import { BarraSuperior } from "@/components/casca/BarraSuperior";
import { NavegacaoInferior } from "@/components/casca/NavegacaoInferior";
import { Rodape } from "@/components/casca/Rodape";

/**
 * A casca das telas do produto.
 *
 * Duas navegações para a mesma lista de abas: barra no topo a partir de
 * `md`, pílula flutuante abaixo disso. Nenhuma das duas sabe da outra --
 * quem decide é o CSS, então não há salto de layout nem JavaScript de
 * medição de tela no caminho.
 *
 * `max-w-6xl` é o teto do conteúdo, não a largura de cada tela: uma
 * coluna de texto com 1152px de largura é ilegível. Cada página decide
 * como usar o espaço dentro deste limite -- a de rota abre em duas
 * colunas, as de leitura seguem numa coluna estreita e centralizada.
 *
 * O Suspense existe porque as duas navegações leem `usePathname` para
 * marcar a aba ativa, e pathname é dado dinâmico: sem a fronteira,
 * nenhuma tela do app poderia ser pré-renderizada.
 */
export default function LayoutDoApp({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col">
      <Suspense fallback={<div className="hidden h-16 md:block" />}>
        <BarraSuperior />
      </Suspense>

      <main
        id="conteudo"
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-4 pt-5 md:px-6 md:pt-8 lg:px-8"
      >
        {children}
      </main>

      <Rodape />

      <Suspense fallback={null}>
        <NavegacaoInferior />
      </Suspense>
    </div>
  );
}
