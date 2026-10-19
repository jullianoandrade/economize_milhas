/**
 * A casca da porta de entrada: boas-vindas e como nos sustentamos.
 *
 * Sem navegação, de propósito. Os dois fluxos têm um caminho só, e uma
 * barra de abas ali em cima convida a pular justamente o que a tela
 * existe para explicar. Antes isso era um `if (pathname ===
 * "/boas-vindas")` dentro da nav e outro dentro do rodapé; agora é a
 * ausência deles neste layout -- a regra virou estrutura.
 *
 * Coluna estreita mesmo no desktop: é texto para ler em sequência, e
 * linha longa demais cansa. Nada aqui ganha com 1152px de largura.
 */
export default function LayoutDaEntrada({ children }: LayoutProps<"/">) {
  return (
    <main
      id="conteudo"
      className="mx-auto w-full max-w-2xl px-4 pb-10 pt-5 md:px-6 md:pt-10"
    >
      {children}
    </main>
  );
}
