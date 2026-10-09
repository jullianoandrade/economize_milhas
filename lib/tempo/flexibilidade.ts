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

/** Amostras minimas por data para a mediana nao ser ruido. */
const AMOSTRAS_MINIMAS_POR_DATA = 2;

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
  const porData = new Map<string, number[]>();

  for (const o of observacoes) {
    if (!(o.precoBRL > 0) || !o.partidaEm) continue;
    const dia = o.partidaEm.slice(0, 10);
    const lista = porData.get(dia) ?? [];
    lista.push(o.precoBRL);
    porData.set(dia, lista);
  }

  const todos = observacoes
    .map((o) => o.precoBRL)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  if (todos.length === 0) return { referenciaBRL: 0, datas: [] };

  const referenciaBRL = todos[Math.floor(todos.length / 2)];

  const datas = [...porData.entries()]
    .filter(([, precos]) => precos.length >= AMOSTRAS_MINIMAS_POR_DATA)
    .map(([partidaEm, precos]) => {
      const ordenados = [...precos].sort((a, b) => a - b);
      const precoBRL = ordenados[Math.floor(ordenados.length / 2)];
      return {
        partidaEm,
        precoBRL,
        economiaBRL: referenciaBRL - precoBRL,
        economiaPct:
          referenciaBRL > 0 ? ((referenciaBRL - precoBRL) / referenciaBRL) * 100 : 0,
      };
    })
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
