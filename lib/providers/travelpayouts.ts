import "server-only";

/**
 * Cliente da Travelpayouts Data API.
 *
 * Esta e a unica fonte gratuita de preco real que nao exige 50 mil
 * usuarios por mes (a Amadeus encerrou o self-service em jul/2026 e a
 * Kiwi exige volume). Os precos vem de um cache das buscas dos ultimos
 * dias, entao servem para dizer "esta rota anda custando X" e para
 * comparar meses entre si -- nao sao cotacao em tempo real, e a interface
 * precisa deixar isso claro.
 *
 * O token NUNCA pode ter prefixo NEXT_PUBLIC_: ele vive so aqui, do lado
 * do servidor, e e por isso que o navegador fala com /api/* em vez de
 * falar direto com a Travelpayouts.
 */

const BASE = "https://api.travelpayouts.com";

/** Cache de 6h: o dado de origem ja e agregado, nao adianta insistir. */
const REVALIDAR_SEGUNDOS = 60 * 60 * 6;

export type Fonte = "travelpayouts" | "estimativa";

/**
 * Todo retorno diz de onde veio. A interface mostra isso ao usuario,
 * porque um numero estimado e um numero observado merecem confiancas
 * diferentes -- e esconder a diferenca seria mentir por omissao.
 */
export type ComFonte<T> = {
  dados: T;
  fonte: Fonte;
  observacao: string;
};

export function temToken(): boolean {
  return Boolean(process.env.TRAVELPAYOUTS_TOKEN?.trim());
}

async function buscar<T>(
  caminho: string,
  parametros: Record<string, string | number | undefined>,
): Promise<T | null> {
  const token = process.env.TRAVELPAYOUTS_TOKEN?.trim();
  if (!token) return null;

  const url = new URL(caminho, BASE);
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined) url.searchParams.set(chave, String(valor));
  }
  url.searchParams.set("token", token);
  url.searchParams.set("currency", "brl");

  try {
    const resposta = await fetch(url, {
      next: { revalidate: REVALIDAR_SEGUNDOS },
      headers: { "X-Access-Token": token },
    });
    if (!resposta.ok) return null;

    const corpo = (await resposta.json()) as { success?: boolean; data?: T };
    if (corpo?.success === false) return null;

    return (corpo?.data ?? null) as T | null;
  } catch {
    // Rede fora, timeout, resposta malformada: cai no fallback curado.
    // Nunca derruba a pagina por causa de um provedor externo.
    return null;
  }
}

/* ------------------------------------------------------------------ */

export type PrecoDeRota = {
  precoBRL: number;
  paradas: number;
  partidaEm: string | null;
};

type RespostaPorDatas = Array<{
  price: number;
  departure_at?: string;
  transfers?: number;
  return_transfers?: number;
}>;

/**
 * Passagem de IDA mais barata encontrada recentemente.
 *
 * O one_way nao e detalhe: /v1/prices/cheap e /v1/city-directions
 * devolvem ida e volta, e usar aquele numero contra milhas de um unico
 * trecho dobrava o valor aparente da milha. Como a tabela de resgate e
 * por trecho, o app inteiro trabalha com so ida.
 */
export async function precoMaisBarato(
  origem: string,
  destino: string,
): Promise<PrecoDeRota | null> {
  const dados = await buscar<RespostaPorDatas>(
    "/aviasales/v3/prices_for_dates",
    {
      origin: origem,
      destination: destino,
      one_way: "true",
      sorting: "price",
      limit: 30,
    },
  );

  try {
    const ofertas = (dados ?? []).filter((o) => o?.price > 0);
    if (ofertas.length === 0) return null;

    const maisBarata = ofertas.reduce((a, b) => (b.price < a.price ? b : a));

    return {
      precoBRL: maisBarata.price,
      paradas: maisBarata.transfers ?? 0,
      partidaEm: maisBarata.departure_at ?? null,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */

export type PrecoObservado = {
  precoBRL: number;
  partidaEm: string;
  encontradoEm: string;
  /** Dias entre a descoberta do preco e a data do voo. */
  antecedenciaDias: number;
  paradas: number;
};

type RespostaLatest = Array<{
  value: number;
  depart_date: string;
  found_at: string;
  number_of_changes?: number;
  origin: string;
  destination: string;
}>;

/**
 * Precos observados nos ultimos dias, COM a data em que cada um foi
 * encontrado.
 *
 * E o endpoint mais valioso do projeto. A diferenca entre found_at e
 * depart_date da a antecedencia de cada observacao, e acumular isso dia
 * apos dia constroi a curva real de "preco x dias antes do voo" por rota
 * -- o unico dado proprietario que este app vai ter.
 */
export async function precosObservados(
  origem: string,
  destino?: string,
  limite = 200,
): Promise<PrecoObservado[] | null> {
  const dados = await buscar<RespostaLatest>("/v2/prices/latest", {
    origin: origem,
    destination: destino,
    period_type: "year",
    one_way: "true",
    limit: limite,
    sorting: "price",
  });
  if (!dados) return null;

  const diaEmMs = 24 * 60 * 60 * 1000;

  return dados.flatMap((item) => {
    const partida = new Date(item.depart_date);
    const encontrado = new Date(item.found_at);
    if (Number.isNaN(partida.valueOf()) || Number.isNaN(encontrado.valueOf())) {
      return [];
    }

    const antecedenciaDias = Math.round(
      (partida.valueOf() - encontrado.valueOf()) / diaEmMs,
    );
    // Preco encontrado depois do voo nao existe: e sujeira do cache.
    if (antecedenciaDias < 0) return [];

    return [
      {
        precoBRL: item.value,
        partidaEm: item.depart_date,
        encontradoEm: item.found_at,
        antecedenciaDias,
        paradas: item.number_of_changes ?? 0,
      },
    ];
  });
}

/* ------------------------------------------------------------------ */

export type PrecoDeMes = { mes: number; precoBRL: number };

/**
 * Menor preco de IDA por mes de embarque, para a curva de sazonalidade.
 *
 * Derivado das mesmas observacoes de so ida: o endpoint de calendario
 * devolve ida e volta e cobre apenas uns 48 dias, o que nao forma curva
 * anual nem bate com o resto do app.
 */
export async function precosPorMes(
  origem: string,
  destino: string,
): Promise<PrecoDeMes[] | null> {
  const observacoes = await precosObservados(origem, destino, 1000);
  if (!observacoes || observacoes.length === 0) return null;

  const menorPorMes = new Map<number, number>();
  for (const o of observacoes) {
    const mes = Number(o.partidaEm.slice(5, 7));
    if (!mes) continue;
    const atual = menorPorMes.get(mes);
    if (atual === undefined || o.precoBRL < atual) menorPorMes.set(mes, o.precoBRL);
  }

  if (menorPorMes.size === 0) return null;

  return [...menorPorMes.entries()]
    .map(([mes, precoBRL]) => ({ mes, precoBRL }))
    .sort((a, b) => a.mes - b.mes);
}

/* ------------------------------------------------------------------ */

export type DestinoPopular = {
  destinoIata: string;
  precoBRL: number;
  partidaEm: string | null;
};

/**
 * Destinos mais buscados a partir de uma cidade, com preco de IDA.
 *
 * Nao usa /v1/city-directions: aquele endpoint devolve ida e volta, e
 * misturar isso com milhas de um trecho inflava o valor das milhas em
 * cerca de duas vezes. O endpoint de observacoes recentes aceita
 * one_way e, sem destino informado, cobre centenas de cidades de uma vez.
 */
export async function destinosPopulares(
  origem: string,
): Promise<DestinoPopular[] | null> {
  const observacoes = await buscar<
    Array<{ destination: string; value: number; depart_date: string }>
  >("/v2/prices/latest", {
    origin: origem,
    period_type: "year",
    one_way: "true",
    limit: 500,
    sorting: "price",
  });

  try {
    const maisBaratoPorDestino = new Map<string, DestinoPopular>();

    for (const item of observacoes ?? []) {
      if (!item?.destination || !(item.value > 0)) continue;

      const atual = maisBaratoPorDestino.get(item.destination);
      if (atual && atual.precoBRL <= item.value) continue;

      maisBaratoPorDestino.set(item.destination, {
        destinoIata: item.destination,
        precoBRL: item.value,
        partidaEm: item.depart_date ?? null,
      });
    }

    const lista = [...maisBaratoPorDestino.values()];
    return lista.length > 0 ? lista.sort((a, b) => a.precoBRL - b.precoBRL) : null;
  } catch {
    return null;
  }
}
