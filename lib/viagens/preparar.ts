import { hojeEmSaoPaulo, separarViagens, type Viagem } from "./modelo";

/**
 * Preparar a viagem: o que vem depois de "reservei".
 *
 * Com a ida marcada, o app sabe onde a pessoa vai estar e quando. A
 * primeira coisa que isso destrava e a hospedagem nas mesmas datas: o
 * check-in e o dia da ida, e as noites a pessoa ajusta (3 de partida,
 * o tamanho mais comum de viagem curta).
 *
 * Puro, para ter teste: tests/viagens.test.ts.
 */

export const NOITES_PADRAO = 3;
export const NOITES_MINIMAS = 1;
/** Acima de 30 noites ja e temporada, nao viagem: o controle para ali. */
export const NOITES_MAXIMAS = 30;

export function limitarNoites(noites: number): number {
  if (!Number.isFinite(noites)) return NOITES_PADRAO;
  return Math.min(NOITES_MAXIMAS, Math.max(NOITES_MINIMAS, Math.round(noites)));
}

/** Soma dias a uma data AAAA-MM-DD, no calendario (sem fuso no caminho). */
export function somarDias(dia: string, dias: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Dias de calendario entre duas datas AAAA-MM-DD (positivo se `ate` vem depois). */
export function diasEntre(de: string, ate: string): number {
  return Math.round(
    (Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000,
  );
}

export type Estadia = { checkin: string; checkout: string; noites: number };

export function estadiaDaViagem(viagem: Viagem, noites: number): Estadia | null {
  if (!viagem.ida) return null;
  const n = limitarNoites(noites);
  return { checkin: viagem.ida, checkout: somarDias(viagem.ida, n), noites: n };
}

/** "hoje", "amanhã", "em 12 dias". */
export function quandoE(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `em ${dias} dias`;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "12 mar" ou, fora do ano corrente, "12 mar 2027". */
export function dataCurta(dia: string, hoje?: string): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  const base = `${d} ${MESES[mes - 1]}`;
  return hoje && hoje.slice(0, 4) === String(ano) ? base : `${base} ${ano}`;
}

export type ProximaViagem = { viagem: Viagem; emDias: number | null };

/** A proxima viagem reservada, com quantos dias faltam (null se sem data). */
export function proximaViagem(viagens: Viagem[], agora: Date): ProximaViagem | null {
  const [primeira] = separarViagens(viagens, agora).proximas;
  if (!primeira) return null;
  const hoje = hojeEmSaoPaulo(agora);
  return { viagem: primeira, emDias: primeira.ida ? diasEntre(hoje, primeira.ida) : null };
}

/** Link de volta para a rota no app, com a data quando houver. */
export function caminhoDaRota(v: Pick<Viagem, "origemIata" | "destinoIata" | "ida">): string {
  const base = `/rota/${v.origemIata}/${v.destinoIata}`;
  return v.ida ? `${base}?data=${v.ida}` : base;
}
