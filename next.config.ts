import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
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
