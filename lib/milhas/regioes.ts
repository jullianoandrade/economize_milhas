import { aeroportos, tabelasResgate, type Aeroporto } from "@/lib/dados";

/**
 * Classificacao de rota: de onde para onde, quantos quilometros e em que
 * faixa da tabela de resgate isso cai.
 *
 * A distancia sozinha nao resolve. Sao Paulo fica a ~7.700 km de Nova York
 * e a ~7.900 km de Lisboa, mas as tabelas de resgate cobram valores bem
 * diferentes para America do Norte e Europa. Por isso a regiao vem da
 * geografia do destino, e a distancia so e usada para separar as faixas
 * domesticas (curto, medio e longo).
 */

export type FaixaDeRegiao = (typeof tabelasResgate.regioes)[number]["id"];

const porIata = new Map<string, Aeroporto>(
  aeroportos.aeroportos.map((a) => [a.iata, a]),
);

export function aeroportoPorIata(iata: string): Aeroporto | undefined {
  return porIata.get(iata.trim().toUpperCase());
}

const RAIO_DA_TERRA_KM = 6371;
const grausParaRadianos = (g: number) => (g * Math.PI) / 180;

/** Distancia em linha reta (great-circle) entre dois pontos, em km. */
export function distanciaKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dLat = grausParaRadianos(b.lat - a.lat);
  const dLon = grausParaRadianos(b.lon - a.lon);
  const lat1 = grausParaRadianos(a.lat);
  const lat2 = grausParaRadianos(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * RAIO_DA_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Faixas domesticas, em ordem crescente de distancia. */
const FAIXAS_DOMESTICAS = tabelasResgate.regioes
  .filter((r) => r.id.startsWith("domestico-"))
  .sort((a, b) => a.ateKm - b.ateKm);

function faixaDomesticaPorDistancia(km: number): FaixaDeRegiao {
  const faixa = FAIXAS_DOMESTICAS.find((r) => km <= r.ateKm);
  return (faixa ?? FAIXAS_DOMESTICAS[FAIXAS_DOMESTICAS.length - 1]).id;
}

export type RotaClassificada = {
  origem: Aeroporto;
  destino: Aeroporto;
  distanciaKm: number;
  faixa: FaixaDeRegiao;
  internacional: boolean;
  rotulo: string;
};

export class AeroportoDesconhecidoError extends Error {
  constructor(readonly iata: string) {
    super(`Aeroporto ${iata} nao esta na base. Veja data/aeroportos.json.`);
    this.name = "AeroportoDesconhecidoError";
  }
}

export function classificarRota(
  origemIata: string,
  destinoIata: string,
): RotaClassificada {
  const origem = aeroportoPorIata(origemIata);
  if (!origem) throw new AeroportoDesconhecidoError(origemIata);

  const destino = aeroportoPorIata(destinoIata);
  if (!destino) throw new AeroportoDesconhecidoError(destinoIata);

  const km = Math.round(distanciaKm(origem, destino));
  const internacional = origem.pais !== destino.pais;

  // Trecho domestico: a faixa vem da distancia.
  // Trecho internacional: vem da regiao do ponto que NAO e brasileiro,
  // porque e esse lado da rota que a tabela de resgate precifica. Vale
  // nos dois sentidos: LIS-GRU custa o mesmo que GRU-LIS.
  const estrangeiro = origem.regiao === "brasil" ? destino : origem;
  const faixa: FaixaDeRegiao =
    estrangeiro.regiao === "brasil"
      ? faixaDomesticaPorDistancia(km)
      : (estrangeiro.regiao as FaixaDeRegiao);

  const rotulo =
    tabelasResgate.regioes.find((r) => r.id === faixa)?.rotulo ?? faixa;

  return { origem, destino, distanciaKm: km, faixa, internacional, rotulo };
}
