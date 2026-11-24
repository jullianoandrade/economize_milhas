import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { enderecoDoSite } from "@/lib/site";
import "./globals.css";
import { MARCA } from "@/lib/marca";

/**
 * Uma familia so: Bricolage Grotesque, escolhida na direcao "Globo e
 * Carteira" (17/11/2026). Grotesca com personalidade, sem cair no
 * genérico de fintech -- e com eixo de tamanho optico (opsz), que
 * desenha o numero grande do veredito diferente do texto de 13 px em
 * vez de so aumenta-lo. A hierarquia vem de peso, tamanho e opsz.
 */
const voemilo = Bricolage_Grotesque({
  variable: "--font-voemilo",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

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
  themeColor: "#f4f6f9",
};

/**
 * Aplica o tema ANTES da primeira pintura.
 *
 * Precisa ser script sincrono no inicio do body: se a decisao ficasse
 * para depois da hidratacao, quem prefere escuro veria a tela clara
 * piscar a cada carregamento.
 *
 * Sem preferencia salva, o tema e o CLARO (decisao de 24/11/2026): o
 * escuro so entra quando a pessoa escolhe no botao. O atributo, e nao a
 * media query, evita manter duas copias da paleta escura no CSS.
 */
const APLICAR_TEMA = `try{var t=localStorage.getItem("milhas-tema");if(t!=="claro"&&t!=="escuro")t="claro";document.documentElement.setAttribute("data-tema",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="escuro"?"#0b1526":"#f4f6f9")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: o script APLICAR_TEMA poe data-tema no
    // <html> antes de o React hidratar (para nao piscar o tema errado).
    // Vale so para os atributos deste elemento, nao para os filhos.
    <html
      lang="pt-BR"
      className={`${voemilo.variable} h-full antialiased`}
      suppressHydrationWarning
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
