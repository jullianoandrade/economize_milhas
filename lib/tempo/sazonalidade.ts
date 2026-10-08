import { heuristicasTempo, tabelasResgate } from "@/lib/dados";
import type { RotaClassificada } from "@/lib/milhas/regioes";
import { reaisExatos } from "@/lib/format";

/**
 * Em que mes ir -- e em que mes a milha rende mais.
 *
 * A crenca popular diz que milhas valem mais na alta temporada porque "a
 * tabela e fixa". Nao e bem assim: os programas brasileiros usam
 * precificacao dinamica, entao as milhas sobem junto com a tarifa e o
 * valor extraido por milheiro ficaria constante.
 *
 * A inversao existe, mas por outro motivo: a tabela tem PISO e TETO. Na
 * baixa temporada a tarifa cai abaixo do piso de milhas, entao voce paga
 * o minimo por uma passagem barata -- resgate ruim. Na alta, a tarifa
 * encosta no teto, e cada milha compra mais.
 *
 * O app calcula o efeito real em vez de repetir o ditado.
 */

export type MesDaCurva = {
  mes: number;
  precoBRL: number;
  milhas: number;
  valorExtraidoPorMilheiroBRL: number;
};

export type Sazonalidade = {
  meses: MesDaCurva[];
  /** Menor tarifa do ano. */
  mesMaisBaratoEmDinheiro: MesDaCurva;
  /** Mes em que cada milha compra mais passagem. */
  mesComMelhorResgate: MesDaCurva;
  mesesCoincidem: boolean;
  diferencaDeExtracaoPct: number;
  explicacao: string;
};

/**
 * Monta a curva do ano. Recebe os precos por mes de fora (reais da API ou
 * estimados pelo indice de sazonalidade) e devolve, para cada mes, quanto
 * aquela passagem renderia em milhas.
 */
export function calcularSazonalidade(
  rota: RotaClassificada,
  precosPorMes: Array<{ mes: number; precoBRL: number }>,
  programaId: string,
): Sazonalidade | null {
  const tabela = tabelasResgate.tabelas[programaId];
  const faixa = tabela?.economica[rota.faixa];
  if (!tabela || !faixa || faixa.confianca === "indisponivel") return null;

  const taxa = tabelasResgate.taxasEmbarqueBRL[rota.faixa];
  const taxasBRL = typeof taxa === "number" ? taxa : 0;

  const meses: MesDaCurva[] = precosPorMes
    .filter((m) => m.precoBRL > 0)
    .map(({ mes, precoBRL }) => {
      // O piso e o teto da faixa sao justamente o que cria a inversao.
      const milhas = Math.min(
        faixa.max,
        Math.max(faixa.min, precoBRL * tabela.milhasPorReal),
      );
      const liquido = Math.max(0, precoBRL - taxasBRL);

      return {
        mes,
        precoBRL: Math.round(precoBRL),
        milhas: Math.round(milhas / 100) * 100,
        valorExtraidoPorMilheiroBRL: milhas > 0 ? (liquido / milhas) * 1000 : 0,
      };
    })
    .sort((a, b) => a.mes - b.mes);

  if (meses.length < 2) return null;

  const mesMaisBaratoEmDinheiro = meses.reduce((a, b) =>
    b.precoBRL < a.precoBRL ? b : a,
  );
  const mesComMelhorResgate = meses.reduce((a, b) =>
    b.valorExtraidoPorMilheiroBRL > a.valorExtraidoPorMilheiroBRL ? b : a,
  );

  const pior = meses.reduce((a, b) =>
    b.valorExtraidoPorMilheiroBRL < a.valorExtraidoPorMilheiroBRL ? b : a,
  );
  const diferencaDeExtracaoPct =
    pior.valorExtraidoPorMilheiroBRL > 0
      ? (mesComMelhorResgate.valorExtraidoPorMilheiroBRL /
          pior.valorExtraidoPorMilheiroBRL -
          1) *
        100
      : 0;

  return {
    meses,
    mesMaisBaratoEmDinheiro,
    mesComMelhorResgate,
    mesesCoincidem: mesMaisBaratoEmDinheiro.mes === mesComMelhorResgate.mes,
    diferencaDeExtracaoPct,
    explicacao: explicarInversao(
      mesMaisBaratoEmDinheiro,
      mesComMelhorResgate,
      diferencaDeExtracaoPct,
    ),
  };
}

const NOMES_DOS_MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export const nomeDoMes = (mes: number) => NOMES_DOS_MESES[mes - 1] ?? "";

function explicarInversao(
  barato: MesDaCurva,
  melhorResgate: MesDaCurva,
  diferencaPct: number,
): string {
  if (barato.mes === melhorResgate.mes) {
    return (
      `Nesta rota, ${nomeDoMes(barato.mes)} é o melhor mês dos dois jeitos: ` +
      `a passagem mais barata do ano e também onde cada milheiro rende mais ` +
      `(${reaisExatos(melhorResgate.valorExtraidoPorMilheiroBRL)}). Não há dilema aqui.`
    );
  }

  return (
    `Os dois melhores meses não são o mesmo, e é isso que quase ninguém conta. ` +
    `Para pagar em dinheiro, vá em ${nomeDoMes(barato.mes)}: a passagem sai por ` +
    `R$ ${barato.precoBRL.toLocaleString("pt-BR")}. Para usar milhas, ` +
    `${nomeDoMes(melhorResgate.mes)} é melhor — cada milheiro compra ` +
    `${reaisExatos(melhorResgate.valorExtraidoPorMilheiroBRL)} de passagem, ` +
    `${Math.round(diferencaPct)}% a mais que no pior mês do ano. ` +
    `A tabela de milhas tem piso e teto, então na baixa temporada você paga o ` +
    `mínimo por uma passagem barata, e na alta cada milha compra muito mais.`
  );
}

/** Curva estimada pelo índice sazonal brasileiro, quando não há dado real. */
export function curvaEstimada(precoBaseBRL: number) {
  const indice = heuristicasTempo.sazonalidadeBrasil.indicePorMes;
  return Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    precoBRL: Math.round(precoBaseBRL * (indice[String(i + 1)] ?? 1)),
  }));
}
