import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
import { NavegacaoInferior } from "@/components/casca/NavegacaoInferior";
import { Rodape } from "@/components/casca/Rodape";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * A serifa dos titulos.
 *
 * Carregada so com os pesos que a interface usa: uma variavel completa
 * traria sete eixos de desenho que nenhuma tela pede, e peso de fonte e
 * o tipo de gordura que aparece direto na metrica de carregamento.
 */
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Milhas — vale mais em milhas ou em dinheiro?",
    template: "%s · Milhas",
  },
  description:
    "Descubra quanto custa sua viagem em dinheiro e em milhas, em que mês ir, quando comprar e como acumular as milhas que faltam.",
  applicationName: "Milhas",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Milhas",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Sem variante escura enquanto a paleta clara nao estiver decidida.
  // O seletor de paleta reescreve esta meta tag ao trocar.
  themeColor: "#f8f5ec",
};

/**
 * Aplica o tema ANTES da primeira pintura.
 *
 * Precisa ser script sincrono no inicio do body: se a decisao ficasse
 * para depois da hidratacao, quem prefere escuro veria a tela clara
 * piscar a cada carregamento.
 *
 * Sem preferencia salva, segue o sistema -- e esse mesmo caminho serve
 * ao botao manual, o que evita manter duas copias da paleta escura no
 * CSS, uma para a media query e outra para o atributo.
 */
const APLICAR_TEMA = `try{var t=localStorage.getItem("milhas-tema");if(t!=="claro"&&t!=="escuro")t=matchMedia("(prefers-color-scheme: dark)").matches?"escuro":"claro";document.documentElement.setAttribute("data-tema",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="escuro"?"#0e1a2e":"#f8f5ec")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: APLICAR_TEMA }} />

        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-marca focus:px-4 focus:py-2 focus:text-marca-contraste"
        >
          Pular para o conteúdo
        </a>

        <main id="conteudo" className="mx-auto max-w-lg px-4 pb-4 pt-5">
          {children}
        </main>

        {/* usePathname e dado dinamico: sem esta fronteira, o rodape e
            a nav impediriam qualquer pagina do app de ser
            pre-renderizada. pb-28 no rodape reserva o espaco da nav
            flutuante. */}
        <Suspense fallback={null}>
          <Rodape />
        </Suspense>

        <Suspense fallback={null}>
          <NavegacaoInferior />
        </Suspense>
      </body>
    </html>
  );
}
