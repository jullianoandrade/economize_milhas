/**
 * Normaliza uma busca de voo antes de qualquer formato de link tocar
 * nela. Puro, sem env e sem rede -- so validacao de forma.
 *
 * Existe para que o modulo de formato (lib/monetizacao/formatos/
 * aviasales.ts) receba sempre dado ja limpo e nunca precise decidir
 * sozinho se um IATA ou uma data fazem sentido.
 */

export type BuscaDeVoo = {
  origemIata: string;
  destinoIata: string;
  /** YYYY-MM-DD, ou null quando a pessoa ainda nao escolheu uma data. */
  data: string | null;
};

const IATA = /^[A-Z]{3}$/;

export function normalizarBusca(entrada: {
  origemIata: string;
  destinoIata: string;
  data?: string | null;
}): BuscaDeVoo | null {
  const origemIata = entrada.origemIata.trim().toUpperCase();
  const destinoIata = entrada.destinoIata.trim().toUpperCase();

  if (!IATA.test(origemIata) || !IATA.test(destinoIata)) return null;
  if (origemIata === destinoIata) return null;

  return { origemIata, destinoIata, data: normalizarData(entrada.data) };
}

function normalizarData(data: string | null | undefined): string | null {
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;

  const alvo = new Date(`${data}T12:00:00`);
  if (Number.isNaN(alvo.getTime())) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  // Data no passado nao e busca invalida -- so deixa de carregar o
  // caminho completo. A degradacao acontece em lib/monetizacao/links.ts.
  if (alvo < hoje) return null;

  return data;
}
