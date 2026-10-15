/**
 * Quanto o seu cartao rende, e quanto as milhas dele custam.
 *
 * O modulo nao importa NADA, de proposito -- mesmo motivo de
 * lib/milhas/rotulos.ts: a pergunta do cartao e respondida ao vivo
 * enquanto o dedo arrasta o controle, e isso tem de acontecer no
 * aparelho. Um import de lib/dados levaria a base de 268 aeroportos
 * para o navegador so para dividir anuidade por pontos.
 *
 * Os dados do cartao entram por parametro. Quem tem a base (o servidor)
 * passa de lib/dados; quem nao tem (a interface) recebe pelo catalogo
 * de /api/plano. Formula igual nos dois lados porque e a mesma funcao.
 */

export type EntradaDeCartao = {
  gastoMensalBRL: number;
  pontosPorDolarNacional: number;
  cotacaoDolarBRL: number;
  /** null = a anuidade nao esta na nossa base. Nao e o mesmo que zero. */
  anuidadeBRL: number | null;
  /** Gasto mensal a partir do qual o emissor isenta a anuidade. */
  isencaoGastoMensalBRL: number | null;
};

export type RendimentoDoCartao = {
  pontosPorMes: number;
  pontosPorAno: number;
  /** Anuidade diluida nos pontos do ano, por mil pontos. */
  cpmBRL: number;
  isento: boolean;
  /**
   * A anuidade nao esta na base.
   *
   * Importa porque anuidade ausente nao e anuidade zero: tratar as duas
   * como a mesma coisa faria a tela afirmar "de graca" sobre um custo
   * que ninguem verificou.
   */
  anuidadeDesconhecida: boolean;
};

export function rendimentoDoCartao(
  e: EntradaDeCartao,
): RendimentoDoCartao | null {
  if (!(e.gastoMensalBRL > 0) || !(e.cotacaoDolarBRL > 0)) return null;

  const dolares = e.gastoMensalBRL / e.cotacaoDolarBRL;
  const pontosPorMes = dolares * e.pontosPorDolarNacional;
  const pontosPorAno = pontosPorMes * 12;
  if (!(pontosPorAno > 0)) return null;

  const isento =
    e.isencaoGastoMensalBRL != null &&
    e.gastoMensalBRL >= e.isencaoGastoMensalBRL;

  const anuidade = isento ? 0 : (e.anuidadeBRL ?? 0);

  return {
    pontosPorMes,
    pontosPorAno,
    cpmBRL: (anuidade / pontosPorAno) * 1000,
    isento,
    anuidadeDesconhecida: e.anuidadeBRL == null && !isento,
  };
}

/**
 * Quantas milhas os pontos de um ano viram depois de uma transferencia
 * com bonus. O bonus multiplica os pontos da ORIGEM -- e por isso que
 * ele e a alavanca mais forte do acumulo por cartao.
 */
export function milhasPorAno(pontosPorAno: number, bonusPct: number): number {
  return Math.round(pontosPorAno * (1 + Math.max(0, bonusPct) / 100));
}
