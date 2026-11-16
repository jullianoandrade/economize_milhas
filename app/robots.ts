import type { MetadataRoute } from "next";
import { urlDoSite } from "@/lib/site";

/**
 * O que buscador pode varrer.
 *
 * /api/ fica de fora por dois motivos: nada ali e pagina (sao respostas
 * JSON que nao servem a ninguem no resultado de busca) e o orcamento de
 * varredura gasto ali e orcamento que nao sobra para as paginas de
 * rota, que sao o que de fato queremos indexado.
 *
 * O resto e aberto. Nao ha area privada neste app -- nao existe login,
 * e o dado pessoal da pessoa mora no aparelho dela.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: urlDoSite("/sitemap.xml"),
  };
}
