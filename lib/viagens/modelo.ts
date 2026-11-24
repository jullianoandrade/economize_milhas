/**
 * Minhas viagens: o fio que liga uma oportunidade a uma viagem feita.
 *
 * O app deixa de so INFORMAR e passa a DIRECIONAR: cada vez que a pessoa
 * sai para ver uma passagem (em dinheiro ou resgatando milhas), isso vira
 * uma viagem "em vista". Quando ela confirma que reservou, a viagem vira
 * "reservada" -- e e a partir dai que o app pode ajudar a preparar o
 * resto (hospedagem nas mesmas datas, lembretes) e, depois da data,
 * guardar no historico.
 *
 * Guardado so no aparelho, como a Carteira. Quando houver conta, este e
 * o ponto de partida da sincronizacao.
 *
 * Puro, para ter teste: tests/viagens.test.ts.
 */

export type FormaDePagamento = "dinheiro" | "milhas";

/**
 * em-vista: a pessoa saiu para ver a passagem; nao sabemos se comprou.
 * reservada: ela disse que reservou.
 * descartada: ela disse que desistiu (some das listas, fica fora do historico).
 */
export type SituacaoDaViagem = "em-vista" | "reservada" | "descartada";

export type Viagem = {
  id: string;
  origemIata: string;
  destinoIata: string;
  /** Data de ida, AAAA-MM-DD; null quando a busca saiu sem data. */
  ida: string | null;
  /** Preco por pessoa visto no app no momento da saida, em reais. */
  precoVistoBRL: number | null;
  forma: FormaDePagamento;
  /** Programa usado quando a forma e milhas. */
  programaId: string | null;
  situacao: SituacaoDaViagem;
  /** ISO completo. */
  criadaEm: string;
  atualizadaEm: string;
};

export type BuscaRecente = {
  origemIata: string;
  destinoIata: string;
  em: string;
};

export const MAXIMO_DE_VIAGENS = 60;
export const MAXIMO_DE_BUSCAS = 12;

/** Saida nova para a mesma viagem em ate 7 dias atualiza, nao duplica. */
const JANELA_DE_REPETICAO_MS = 7 * 24 * 60 * 60 * 1000;

const IATA = /^[A-Z]{3}$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function ehDiaValido(v: unknown): v is string {
  if (typeof v !== "string" || !DIA.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function ehInstante(v: unknown): v is string {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

export type SaidaParaPassagem = {
  origemIata: string;
  destinoIata: string;
  ida: string | null;
  precoVistoBRL: number | null;
  forma: FormaDePagamento;
  programaId?: string | null;
};

/**
 * Registra a saida para ver uma passagem. Mesma rota, mesma data e mesma
 * forma dentro de 7 dias atualizam a viagem existente (preco e horario)
 * em vez de criar outra -- quem clica duas vezes nao viaja duas vezes.
 * Viagem ja reservada nunca volta a "em vista".
 */
export function registrarSaida(
  viagens: Viagem[],
  saida: SaidaParaPassagem,
  agora: Date,
  novoId: () => string,
): Viagem[] {
  const origemIata = saida.origemIata.toUpperCase();
  const destinoIata = saida.destinoIata.toUpperCase();
  if (!IATA.test(origemIata) || !IATA.test(destinoIata) || origemIata === destinoIata) {
    return viagens;
  }
  const ida = ehDiaValido(saida.ida) ? saida.ida : null;
  const preco =
    typeof saida.precoVistoBRL === "number" && saida.precoVistoBRL > 0
      ? Math.round(saida.precoVistoBRL)
      : null;
  const instante = agora.toISOString();

  const repetida = viagens.find(
    (v) =>
      v.origemIata === origemIata &&
      v.destinoIata === destinoIata &&
      v.ida === ida &&
      v.forma === saida.forma &&
      v.situacao !== "descartada" &&
      agora.getTime() - Date.parse(v.atualizadaEm) < JANELA_DE_REPETICAO_MS,
  );
  if (repetida) {
    return viagens.map((v) =>
      v.id === repetida.id
        ? {
            ...v,
            precoVistoBRL: preco ?? v.precoVistoBRL,
            programaId: saida.programaId ?? v.programaId,
            atualizadaEm: instante,
          }
        : v,
    );
  }

  const nova: Viagem = {
    id: novoId(),
    origemIata,
    destinoIata,
    ida,
    precoVistoBRL: preco,
    forma: saida.forma,
    programaId: saida.programaId ?? null,
    situacao: "em-vista",
    criadaEm: instante,
    atualizadaEm: instante,
  };
  return [nova, ...viagens].slice(0, MAXIMO_DE_VIAGENS);
}

export function mudarSituacao(
  viagens: Viagem[],
  id: string,
  situacao: SituacaoDaViagem,
  agora: Date,
  /** Ao confirmar a reserva, a pessoa pode corrigir a data de ida. */
  ida?: string | null,
): Viagem[] {
  return viagens.map((v) =>
    v.id === id
      ? {
          ...v,
          situacao,
          ida: ida !== undefined ? (ehDiaValido(ida) ? ida : v.ida) : v.ida,
          atualizadaEm: agora.toISOString(),
        }
      : v,
  );
}

export function registrarBusca(
  buscas: BuscaRecente[],
  origemIata: string,
  destinoIata: string,
  agora: Date,
): BuscaRecente[] {
  const o = origemIata.toUpperCase();
  const d = destinoIata.toUpperCase();
  if (!IATA.test(o) || !IATA.test(d) || o === d) return buscas;
  const resto = buscas.filter((b) => !(b.origemIata === o && b.destinoIata === d));
  return [{ origemIata: o, destinoIata: d, em: agora.toISOString() }, ...resto].slice(
    0,
    MAXIMO_DE_BUSCAS,
  );
}

/** "Hoje" em Sao Paulo, AAAA-MM-DD: a data de ida e do calendario de quem viaja. */
export function hojeEmSaoPaulo(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export type ViagensSeparadas = {
  /** Reservadas com ida hoje ou no futuro (ou sem data), a mais proxima primeiro. */
  proximas: Viagem[];
  /** Em vista: a pessoa foi ver e ainda nao contou se reservou. */
  emVista: Viagem[];
  /** Reservadas com ida no passado: o historico de viagens. */
  feitas: Viagem[];
};

export function separarViagens(viagens: Viagem[], agora: Date): ViagensSeparadas {
  const hoje = hojeEmSaoPaulo(agora);
  const reservadas = viagens.filter((v) => v.situacao === "reservada");
  const proximas = reservadas
    .filter((v) => v.ida === null || v.ida >= hoje)
    .sort((a, b) => (a.ida ?? "9999").localeCompare(b.ida ?? "9999"));
  const feitas = reservadas
    .filter((v) => v.ida !== null && v.ida < hoje)
    .sort((a, b) => (b.ida ?? "").localeCompare(a.ida ?? ""));
  const emVista = viagens
    .filter((v) => v.situacao === "em-vista" && (v.ida === null || v.ida >= hoje))
    .sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm));
  return { proximas, emVista, feitas };
}

/** Estado guardado -> estado confiavel, venha de que versao vier. */
export function sanearViagens(bruto: unknown): { viagens: Viagem[]; buscas: BuscaRecente[] } {
  const viagens: Viagem[] = [];
  const buscas: BuscaRecente[] = [];
  if (!ehObjeto(bruto)) return { viagens, buscas };

  const listaV = Array.isArray(bruto.viagens) ? bruto.viagens : [];
  for (const v of listaV) {
    if (!ehObjeto(v)) continue;
    if (typeof v.id !== "string" || !v.id) continue;
    if (typeof v.origemIata !== "string" || !IATA.test(v.origemIata)) continue;
    if (typeof v.destinoIata !== "string" || !IATA.test(v.destinoIata)) continue;
    if (v.forma !== "dinheiro" && v.forma !== "milhas") continue;
    if (v.situacao !== "em-vista" && v.situacao !== "reservada" && v.situacao !== "descartada") continue;
    if (!ehInstante(v.criadaEm) || !ehInstante(v.atualizadaEm)) continue;
    viagens.push({
      id: v.id,
      origemIata: v.origemIata,
      destinoIata: v.destinoIata,
      ida: ehDiaValido(v.ida) ? v.ida : null,
      precoVistoBRL:
        typeof v.precoVistoBRL === "number" && v.precoVistoBRL > 0 ? Math.round(v.precoVistoBRL) : null,
      forma: v.forma,
      programaId: typeof v.programaId === "string" ? v.programaId : null,
      situacao: v.situacao,
      criadaEm: v.criadaEm,
      atualizadaEm: v.atualizadaEm,
    });
  }

  const listaB = Array.isArray(bruto.buscas) ? bruto.buscas : [];
  for (const b of listaB) {
    if (!ehObjeto(b)) continue;
    if (typeof b.origemIata !== "string" || !IATA.test(b.origemIata)) continue;
    if (typeof b.destinoIata !== "string" || !IATA.test(b.destinoIata)) continue;
    if (!ehInstante(b.em)) continue;
    buscas.push({ origemIata: b.origemIata, destinoIata: b.destinoIata, em: b.em });
  }

  return { viagens: viagens.slice(0, MAXIMO_DE_VIAGENS), buscas: buscas.slice(0, MAXIMO_DE_BUSCAS) };
}
