import type { NextConfig } from "next";
import { cabecalhosDeSeguranca } from "./lib/seguranca/cabecalhos";

const nextConfig: NextConfig = {
  cacheComponents: true,
  /**
   * /promocoes virou /oportunidades na navegacao nova (17/11/2026).
   * Permanente (308) para buscador e link compartilhado seguirem o
   * endereco novo sem perder o que ja estava indexado.
   */
  async redirects() {
    return [{ source: "/promocoes", destination: "/oportunidades", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: cabecalhosDeSeguranca(process.env.NODE_ENV === "development"),
      },
    ];
  },
  partialPrefetching: true,
  experimental: {
    // Marca que a atualizacao de seguranca para 16.4.6 foi feita por
    // agente. E o proprio `next upgrade --agent=security` que pede, e
    // serve para o build nao reabrir o aviso que ja foi atendido.
    agentUpgrade: "security",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
