import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { enderecoDoSite } from "@/lib/site";
import "./globals.css";
import { MARCA } from "@/lib/marca";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * Uma familia so. A serifa dos titulos (Fraunces) saiu na identidade
 * VoeMilo: a direcao e de fintech -- precisao, nao editorial -- e a
 * hierarquia passa a vir de peso, tamanho e espacamento, nao de troca
 * de familia. De quebra, uma fonte a menos no carregamento.
 */

export const metadata: Metadata = {
  /**
   * Sem isto, toda URL absoluta da metadata (og:image, canonical) sai
   * com a origem que o Next conseguir adivinhar: localhost no servidor
   * local e, na Vercel, o endereco DAQUELE deploy -- o hash do preview,
   * nao o dominio. O WhatsApp buscaria a imagem de compartilhamento num
   * host que muda a cada publicacao.
   */
  metadataBase: new URL(enderecoDoSite()),
  title: {
    default: `${MARCA.nome} — ${MARCA.chamada}`,
    template: `%s · ${MARCA.nome}`,
  },
  description:
    "Descubra quanto custa sua viagem em dinheiro e em milhas, em que mês ir, quando comprar e como acumular as milhas que faltam.",
  applicationName: MARCA.nome,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: MARCA.nome,
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
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: APLICAR_TEMA }} />

        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-marca focus:px-4 focus:py-2 focus:text-marca-contraste"
        >
          Pular para o conteúdo
        </a>

        {/* A casca (barra, nav, rodape, largura) e de cada route group:
            as telas do app tem navegacao, a porta de entrada nao. Aqui
            fica so o que e verdade em toda a arvore -- idioma, fontes e
            o tema aplicado antes da primeira pintura. */}
        {children}
      </body>
    </html>
  );
}
