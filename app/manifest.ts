import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Milhas — viagem em milhas ou em dinheiro",
    short_name: "Milhas",
    description:
      "Compare o custo da sua viagem em dinheiro e em milhas, descubra o melhor mês para ir, a melhor hora de comprar e como acumular o que falta.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7fb",
    theme_color: "#4338ca",
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
