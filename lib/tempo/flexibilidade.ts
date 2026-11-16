import { aeroportos, type Aeroporto } from "@/lib/dados";
import { distanciaKm } from "@/lib/milhas/regioes";

/**
 * Quanto custa a sua rigidez.
 *
 * Duas perguntas que mudam o preco mais do que qualquer negociacao:
 * voce pode viajar outro dia? pode sair de outro aeroporto?
 *
 * Os dados saem do nosso proprio historico de precos de IDA, e nao do
 * endpoint de matriz da Travelpayouts: aquele devolve ida e volta e se
 * mostrou instavel, respondendo ora com um resultado ora com nenhum.
 */

export type ObservacaoDatada = {
  partidaEm: string;
  precoBRL: number;
};

export type DataMaisBarata = {
  partidaEm: string;
  precoBRL: number;
  economiaBRL: number;
  economiaPct: number;
};

/**
 * Uma data ja agrupada, venha de onde vier.
 *
 * O agrupamento passou a acontecer no banco (ver a migration
 * ..._precos_por_data e lib/historico.ts): sao ~365 linhas por rota em
 * vez das ate 5.500 que a tabela guarda, e sem o vies da fatia
 * arbitraria que o PostgREST devolvia.
 */
export type PrecoDeData = {
  partidaEm: string;
  precoMedianoBRL: number;
  amostras: number;
};

/** Amostras minimas por data para a mediana nao ser ruido. */
const AMOSTRAS_MINIMAS_POR_DATA = 2;

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.floor(ordenados.length / 2)];
}

/** Agrupa observacoes cruas por data de partida. O que o SQL faz hoje. */
export function agruparPorData(
  observacoes: ObservacaoDatada[],
): PrecoDeData[] {
  const porData = new Map<string, number[]>();

  for (const o of observacoes) {
    if (!(o.precoBRL > 0) || !o.partidaEm) continue;
    const dia = o.partidaEm.slice(0, 10);
    const lista = porData.get(dia);
    if (lista) lista.push(o.precoBRL);
    else porData.set(dia, [o.precoBRL]);
  }

  return [...porData.entries()]
    .map(([partidaEm, precos]) => ({
      partidaEm,
      precoMedianoBRL: mediana(precos),
      amostras: precos.length,
    }))
    .sort((a, b) => a.partidaEm.localeCompare(b.partidaEm));
}

/**
 * Dias de partida mais baratos, comparados com a mediana da rota.
 *
 * Usa mediana e nao media porque uma unica tarifa de ultima hora muito
 * cara deslocaria a referencia e faria quase toda data parecer barata.
 */
export function datasMaisBaratas(
  observacoes: ObservacaoDatada[],
  limite = 4,
): { referenciaBRL: number; datas: DataMaisBarata[] } {
  // A referencia e a mediana de TODAS as observacoes -- cada oferta
  // pesa uma vez. Nao e a mediana das medianas diarias, que pesaria
  // cada dia por igual e daria outro numero. O SQL devolve este mesmo
  // valor numa coluna justamente para a semantica nao mudar quando o
  // agrupamento saiu do JavaScript.
  const referenciaBRL = mediana(
    observacoes.map((o) => o.precoBRL).filter((p) => p > 0),
  );

  return datasMaisBaratasDeAgregado(
    agruparPorData(observacoes),
    referenciaBRL,
    limite,
  );
}

/**
 * As datas mais baratas a partir de dados JA AGRUPADOS.
 *
 * Mesma regra de produto da versao acima -- corte de amostras minimas,
 * so dias abaixo da referencia, ordenado pela economia. O que muda e de
 * onde vem o agrupamento: do banco, sobre o historico inteiro, em vez
 * de uma fatia de 1.000 linhas escolhida sem criterio.
 */
export function datasMaisBaratasDeAgregado(
  dados: PrecoDeData[],
  referenciaBRL: number,
  limite = 4,
): { referenciaBRL: number; datas: DataMaisBarata[] } {
  if (!(referenciaBRL > 0)) return { referenciaBRL: 0, datas: [] };

  const datas = dados
    .filter(
      (d) =>
        d.amostras >= AMOSTRAS_MINIMAS_POR_DATA && d.precoMedianoBRL > 0,
    )
    .map((d) => ({
      partidaEm: d.partidaEm,
      precoBRL: d.precoMedianoBRL,
      economiaBRL: referenciaBRL - d.precoMedianoBRL,
      economiaPct: ((referenciaBRL - d.precoMedianoBRL) / referenciaBRL) * 100,
    }))
    .filter((d) => d.economiaBRL > 0)
    .sort((a, b) => b.economiaBRL - a.economiaBRL)
    .slice(0, limite);

  return { referenciaBRL, datas };
}

/* ------------------------------------------------------------------ */

/** Raio em que trocar de aeroporto ainda e razoavel de carro ou onibus. */
const RAIO_ALTERNATIVO_KM = 150;

/**
 * Aeroportos que servem a mesma viagem.
 *
 * Inclui os que compartilham o codigo de cidade (Guarulhos, Congonhas e
 * Viracopos sao todos SAO) e os que estao perto o bastante para valer o
 * deslocamento por terra.
 */
export function aeroportosAlternativos(origem: Aeroporto): Aeroporto[] {
  return aeroportos.aeroportos
    .filter((a) => a.iata !== origem.iata)
    .map((a) => ({
      aeroporto: a,
      km: Math.round(distanciaKm(origem, a)),
      mesmaCidade: a.cidadeIata === origem.cidadeIata,
    }))
    .filter((c) => c.mesmaCidade || c.km <= RAIO_ALTERNATIVO_KM)
    .sort((a, b) => a.km - b.km)
    .map((c) => c.aeroporto);
}

export type AlternativaDeOrigem = {
  aeroporto: Aeroporto;
  distanciaKm: number;
  precoBRL: number;
  economiaBRL: number;
};

/** Compara cada alternativa com o preco da origem escolhida. */
export function compararOrigens(
  origem: Aeroporto,
  precoAtualBRL: number,
  candidatos: Array<{ aeroporto: Aeroporto; precoBRL: number | null }>,
): AlternativaDeOrigem[] {
  return candidatos
    .flatMap((c) => {
      if (c.precoBRL === null || !(c.precoBRL > 0)) return [];
      const economiaBRL = precoAtualBRL - c.precoBRL;
      if (economiaBRL <= 0) return [];

      return [
        {
          aeroporto: c.aeroporto,
          distanciaKm: Math.round(distanciaKm(origem, c.aeroporto)),
          precoBRL: c.precoBRL,
          economiaBRL,
        },
      ];
    })
    .sort((a, b) => b.economiaBRL - a.economiaBRL);
}
