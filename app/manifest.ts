import type { MetadataRoute } from "next";
import { MARCA } from "@/lib/marca";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${MARCA.nome} — ${MARCA.chamadaDoApp}`,
    short_name: MARCA.nome,
    description:
      "Compare o custo da sua viagem em dinheiro e em milhas, descubra o melhor mês para ir, a melhor hora de comprar e como acumular o que falta.",
    start_url: "/",
    display: "standalone",
    // Sem `orientation`. Estava travado em "portrait", de quando o app
    // era so de celular -- o que passou a contradizer o proprio
    // produto quando o desktop virou cidadao de primeira classe
    // (barra superior, telas em duas colunas). Sem a chave, quem decide
    // e o aparelho.
    //
    // As cores vem da paleta clara de globals.css, e nao de um indigo
    // que sobrou de uma versao anterior: background_color pinta a tela
    // de abertura e theme_color a barra do sistema, entao divergir do
    // app faz o PWA piscar de uma cor para outra ao abrir. O
    // theme_color aqui bate com o viewport.themeColor do layout raiz.
    background_color: "#f4f6f9",
    theme_color: "#f4f6f9",
    lang: "pt-BR",
    categories: ["travel", "finance"],
    icons: [
      {
        src: "/icone.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icone-mascara.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
