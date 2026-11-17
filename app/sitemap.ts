import type { MetadataRoute } from "next";
import { rotasMonitoradas } from "@/lib/rotas-monitoradas";
import { urlDoSite } from "@/lib/site";

/**
 * O mapa do site.
 *
 * Precisava existir ha tempo: data/rotas-destaque.json diz, por escrito,
 * que aquelas rotas foram pre-renderizadas porque "tem valor de busca
 * organica" -- e nenhuma delas tinha caminho de descoberta. O trabalho
 * de SEO estava feito e nao estava publicado.
 *
 * O QUE ENTRA, e por que nao mais do que isso: so as rotas que o
 * projeto acompanha. Com ~3.700 aeroportos daria para despejar milhoes
 * de URLs aqui, e seria pior do que nao ter sitemap -- pagina sem dado
 * proprio e conteudo raso, buscador trata como tal, e o orcamento de
 * varredura some nelas em vez de ir para as que tem substancia. A
 * promessa do sitemap e "estas paginas valem a pena"; listar o que nao
 * vale queima a promessa.
 *
 * A lista vem do banco, nao do arquivo: e assim que uma rota promovida
 * por demanda (ver interesse_em_rota) aparece para o buscador sem
 * precisar de deploy. O ciclo fecha -- alguem procura, a rota entra na
 * coleta, ganha dado proprio, e entao e anunciada.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const agora = new Date();

  const estaticas: MetadataRoute.Sitemap = [
    { url: urlDoSite("/"), lastModified: agora, changeFrequency: "daily", priority: 1 },
    { url: urlDoSite("/explorar"), lastModified: agora, changeFrequency: "weekly", priority: 0.9 },
    { url: urlDoSite("/oportunidades"), lastModified: agora, changeFrequency: "daily", priority: 0.8 },
    { url: urlDoSite("/carteira"), lastModified: agora, changeFrequency: "monthly", priority: 0.6 },
    { url: urlDoSite("/aprender"), lastModified: agora, changeFrequency: "monthly", priority: 0.6 },
    { url: urlDoSite("/objetivos"), lastModified: agora, changeFrequency: "monthly", priority: 0.5 },
    { url: urlDoSite("/boas-vindas"), lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
    {
      url: urlDoSite("/como-nos-sustentamos"),
      lastModified: agora,
      changeFrequency: "monthly",
      // Baixa no ranking, alta em importancia: e a pagina que sustenta a
      // promessa de ranking cego a comissao. Precisa ser achavel.
      priority: 0.4,
    },
  ];

  const rotas = await rotasMonitoradas();

  return [
    ...estaticas,
    ...rotas.map((r) => ({
      url: urlDoSite(`/rota/${r.origem}/${r.destino}`),
      lastModified: agora,
      // O preco muda todo dia, e e o preco que faz a pagina valer.
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
  ];
}
