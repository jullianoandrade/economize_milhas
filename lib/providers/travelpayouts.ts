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
  encontradoEm: string | null;
};

type RespostaCheap = Record<
  string,
  Record<
    string,
    {
      price: number;
      airline?: string;
      departure_at?: string;
      return_at?: string;
      expires_at?: string;
    }
  >
>;

/** Passagem mais barata encontrada recentemente para a rota. */
export async function precoMaisBarato(
  origem: string,
  destino: string,
): Promise<PrecoDeRota | null> {
  const dados = await buscar<RespostaCheap>("/v1/prices/cheap", {
    origin: origem,
    destination: destino,
  });
  if (!dados) return null;

  const ofertas = Object.values(dados[destino] ?? {});
  if (ofertas.length === 0) return null;

  const maisBarata = ofertas.reduce((a, b) => (b.price < a.price ? b : a));

  return {
    precoBRL: maisBarata.price,
    paradas: 0,
    partidaEm: maisBarata.departure_at ?? null,
    encontradoEm: null,
  };
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

type RespostaCalendario = Array<{
  value: number;
  depart_date: string;
  number_of_changes?: number;
}>;

/**
 * Menor preco encontrado para cada mes do ano, usado na curva de
 * sazonalidade. Uma chamada por mes seria caro; aqui se pede o periodo
 * inteiro de uma vez e se agrupa por mes de embarque.
 */
export async function precosPorMes(
  origem: string,
  destino: string,
): Promise<PrecoDeMes[] | null> {
  const dados = await buscar<RespostaCalendario>("/v1/prices/calendar", {
    origin: origem,
    destination: destino,
    calendar_type: "departure_date",
    depart_date: new Date().toISOString().slice(0, 7),
  });
  if (!dados) return null;

  const menorPorMes = new Map<number, number>();
  for (const item of dados) {
    const mes = new Date(item.depart_date).getUTCMonth() + 1;
    if (Number.isNaN(mes)) continue;
    const atual = menorPorMes.get(mes);
    if (atual === undefined || item.value < atual) {
      menorPorMes.set(mes, item.value);
    }
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

type RespostaDirecoes = Record<
  string,
  { price: number; departure_at?: string; destination: string }
>;

/** Destinos mais buscados a partir de uma cidade. Base da aba Promocoes. */
export async function destinosPopulares(
  origem: string,
): Promise<DestinoPopular[] | null> {
  const dados = await buscar<RespostaDirecoes>("/v1/city-directions", {
    origin: origem,
  });
  if (!dados) return null;

  const lista = Object.entries(dados).map(([iata, oferta]) => ({
    destinoIata: oferta.destination ?? iata,
    precoBRL: oferta.price,
    partidaEm: oferta.departure_at ?? null,
  }));

  return lista.length > 0 ? lista.sort((a, b) => a.precoBRL - b.precoBRL) : null;
}
