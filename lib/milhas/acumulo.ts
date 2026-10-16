import { cartoes, clubes, cpmReferencia, type Cartao } from "@/lib/dados";
import {
  bonusMedianoDeTransferencia,
  cpmDoCartao,
  melhorPlanoDeClube,
  paridadeDeTransferencia,
} from "./motor";
import { reais } from "@/lib/format";

/**
 * Em quanto tempo voce chega la, e por qual caminho.
 *
 * Este modulo nao enxerga comissao. Ele le data/cartoes.json, que tem
 * atributos de produto e nenhum dado comercial; o arquivo com comissoes
 * fica isolado e tests/arquitetura.test.ts quebra o build se algum modulo
 * daqui importar ele. O ranking de cartoes e por merito -- quanto antes
 * fecha a conta, quanto custa manter -- e so por merito.
 */

export type SituacaoAtual = {
  /** Milhas ja creditadas no programa de destino. */
  saldoMilhas: number;
  /** Pontos parados na Livelo ou Esfera, esperando transferencia. */
  saldoPontosCoalizao: number;
  gastoMensalCartaoBRL: number;
  cartaoId: string | null;
  aceitaClube: boolean;
};

export type FonteDeAcumulo = {
  id: "cartao" | "clube" | "transferencia" | "saldo";
  rotulo: string;
  milhasPorMes: number;
  custoMensalBRL: number;
  explicacao: string;
};

export type OpcaoDeCartao = {
  cartao: Cartao;
  milhasPorMes: number;
  custoAnualBRL: number;
  cpmBRL: number;
  mesesParaMeta: number;
  isento: boolean;
  /**
   * A anuidade deste cartao nao esta na nossa base.
   *
   * Importa porque anuidade ausente nao e anuidade zero: tratar as duas
   * como a mesma coisa colocaria um cartao de custo desconhecido na
   * frente de um comprovadamente gratuito, e faria a tela afirmar "sem
   * anuidade" sobre algo que ninguem verificou.
   */
  anuidadeDesconhecida: boolean;
};

export type PlanoDeAcumulo = {
  milhasNecessarias: number;
  milhasFaltando: number;
  fontes: FonteDeAcumulo[];
  milhasPorMes: number;
  mesesNecessarios: number | null;
  custoTotalBRL: number;
  /** Quanto custaria simplesmente comprar a passagem hoje. */
  precoDaPassagemBRL: number;
  economiaBRL: number;
  cartoesSugeridos: OpcaoDeCartao[];
  explicacao: string;
  alerta: string | null;
  /**
   * Minimo de pontos Livelo, de uma vez, para transferir a este
   * programa. Null quando a paridade nao exige minimo (ou nao e
   * conhecida) -- nesse caso nao ha nada a avisar.
   */
  minimoDeTransferencia: number | null;
};

/** Teto de meses que faz sentido planejar: alem disso, o plano e ficcao. */
const HORIZONTE_MAXIMO_EM_MESES = 60;

export function montarPlano(
  programaId: string,
  milhasNecessarias: number,
  precoDaPassagemBRL: number,
  situacao: SituacaoAtual,
): PlanoDeAcumulo {
  const bonus = bonusMedianoDeTransferencia(programaId);
  const multiplicador = 1 + bonus / 100;

  const fontes: FonteDeAcumulo[] = [];

  // 1. O que a pessoa ja tem, somando o que os pontos de coalizao viram
  //    depois de uma transferencia bonificada.
  const milhasDosPontos = Math.round(situacao.saldoPontosCoalizao * multiplicador);
  const saldoEfetivo = situacao.saldoMilhas + milhasDosPontos;

  if (saldoEfetivo > 0) {
    fontes.push({
      id: "saldo",
      rotulo: "O que você já tem",
      milhasPorMes: 0,
      custoMensalBRL: 0,
      explicacao:
        situacao.saldoPontosCoalizao > 0
          ? `${situacao.saldoMilhas.toLocaleString("pt-BR")} em milhas mais ${situacao.saldoPontosCoalizao.toLocaleString("pt-BR")} pontos, que viram ${milhasDosPontos.toLocaleString("pt-BR")} milhas com ${bonus}% de bônus.`
          : "Saldo atual no programa.",
    });
  }

  const milhasFaltando = Math.max(0, milhasNecessarias - saldoEfetivo);

  // 2. O cartao: o caminho mais barato, porque os pontos saem de um gasto
  //    que a pessoa ja faria de qualquer jeito.
  const cartao = situacao.cartaoId
    ? (cartoes.cartoes.find((c) => c.id === situacao.cartaoId) ?? null)
    : null;

  let milhasPorMes = 0;
  let custoMensalBRL = 0;

  if (cartao && situacao.gastoMensalCartaoBRL > 0) {
    const calculo = cpmDoCartao(cartao, situacao.gastoMensalCartaoBRL);
    if (calculo) {
      // Os pontos do cartao passam pela coalizao, entao pegam o bonus.
      const comBonus = Math.round(calculo.pontosPorMes * multiplicador);
      const isento =
        cartao.isencaoGastoMensalBRL != null &&
        situacao.gastoMensalCartaoBRL >= cartao.isencaoGastoMensalBRL;
      const mensalidade = isento ? 0 : (cartao.anuidadeBRL ?? 0) / 12;

      milhasPorMes += comBonus;
      custoMensalBRL += mensalidade;

      fontes.push({
        id: "cartao",
        rotulo: cartao.nome,
        milhasPorMes: comBonus,
        custoMensalBRL: mensalidade,
        explicacao: `${Math.round(calculo.pontosPorMes).toLocaleString("pt-BR")} pontos por mês com ${reais(situacao.gastoMensalCartaoBRL)} de gasto, que viram ${comBonus.toLocaleString("pt-BR")} milhas transferindo com ${bonus}% de bônus.`,
      });
    }
  }

  // 3. O clube, se a pessoa topar. Caro por milheiro, mas constante.
  if (situacao.aceitaClube) {
    const clube = melhorPlanoDeClube(programaId);
    if (clube) {
      milhasPorMes += clube.plano.milhasMes;
      custoMensalBRL += clube.plano.mensalidadeBRL;

      fontes.push({
        id: "clube",
        rotulo: clube.clube.nome,
        milhasPorMes: clube.plano.milhasMes,
        custoMensalBRL: clube.plano.mensalidadeBRL,
        explicacao: `${clube.plano.milhasMes.toLocaleString("pt-BR")} milhas por mês a ${reais(clube.plano.mensalidadeBRL)}, ou ${reais(clube.cpmBRL)} o milheiro.`,
      });
    }
  }

  const mesesNecessarios =
    milhasFaltando === 0
      ? 0
      : milhasPorMes > 0
        ? Math.ceil(milhasFaltando / milhasPorMes)
        : null;

  const custoTotalBRL =
    mesesNecessarios !== null ? custoMensalBRL * mesesNecessarios : 0;

  return {
    milhasNecessarias,
    milhasFaltando,
    fontes,
    milhasPorMes,
    mesesNecessarios,
    custoTotalBRL,
    precoDaPassagemBRL,
    economiaBRL: precoDaPassagemBRL - custoTotalBRL,
    cartoesSugeridos: sugerirCartoes(
      milhasFaltando,
      situacao.gastoMensalCartaoBRL,
      multiplicador,
    ),
    explicacao: explicar({
      milhasFaltando,
      mesesNecessarios,
      milhasPorMes,
      custoTotalBRL,
      precoDaPassagemBRL,
    }),
    alerta: alertar({ mesesNecessarios, custoTotalBRL, precoDaPassagemBRL }),
    minimoDeTransferencia: paridadeDeTransferencia(programaId)?.minimoPontos || null,
  };
}

/**
 * Cartoes que fechariam a conta, ordenados por MERITO.
 *
 * Merito aqui e o custo por milheiro: quanto de anuidade voce paga por
 * cada mil milhas que o seu gasto gera. Um cartao que acumula rapido mas
 * cobra R$ 4.000 por ano nao e melhor que um gratuito mais lento -- e a
 * ordenacao reflete isso. Comissao nao entra: este modulo nem consegue
 * ler o arquivo que a contem.
 */
export function sugerirCartoes(
  milhasFaltando: number,
  gastoMensalBRL: number,
  multiplicadorDeTransferencia = 1,
): OpcaoDeCartao[] {
  if (gastoMensalBRL <= 0) return [];

  return cartoes.cartoes
    .flatMap((cartao) => {
      const calculo = cpmDoCartao(cartao, gastoMensalBRL);
      if (!calculo) return [];

      const milhasPorMes = Math.round(
        calculo.pontosPorMes * multiplicadorDeTransferencia,
      );
      if (milhasPorMes <= 0) return [];

      const isento =
        cartao.isencaoGastoMensalBRL != null &&
        gastoMensalBRL >= cartao.isencaoGastoMensalBRL;
      const anuidadeDesconhecida = cartao.anuidadeBRL == null && !isento;

      return [
        {
          cartao,
          milhasPorMes,
          custoAnualBRL: isento ? 0 : (cartao.anuidadeBRL ?? 0),
          cpmBRL: calculo.cpmBRL,
          mesesParaMeta: Math.ceil(milhasFaltando / milhasPorMes),
          isento,
          anuidadeDesconhecida,
        },
      ];
    })
    // Empatados no custo, quem tem anuidade confirmada vem primeiro: uma
    // certeza vale mais que um desconhecido com a mesma aparencia.
    .sort(
      (a, b) =>
        a.cpmBRL - b.cpmBRL ||
        Number(a.anuidadeDesconhecida) - Number(b.anuidadeDesconhecida) ||
        b.milhasPorMes - a.milhasPorMes,
    );
}

function explicar(d: {
  milhasFaltando: number;
  mesesNecessarios: number | null;
  milhasPorMes: number;
  custoTotalBRL: number;
  precoDaPassagemBRL: number;
}): string {
  if (d.milhasFaltando === 0) {
    return "Você já tem milhas suficientes para esta viagem. Confira a disponibilidade de assentos no site do programa e resgate.";
  }

  if (d.mesesNecessarios === null) {
    return (
      `Faltam ${d.milhasFaltando.toLocaleString("pt-BR")} milhas, mas do jeito que está ` +
      `você não acumula nada por mês. Informe quanto passa no cartão, escolha um cartão ` +
      `ou considere um clube para o plano sair do papel.`
    );
  }

  const quando =
    d.mesesNecessarios <= 1
      ? "em menos de um mês"
      : `em ${d.mesesNecessarios} meses`;

  return (
    `Faltam ${d.milhasFaltando.toLocaleString("pt-BR")} milhas. ` +
    `No seu ritmo de ${d.milhasPorMes.toLocaleString("pt-BR")} por mês, você chega lá ${quando}, ` +
    `gastando ${reais(d.custoTotalBRL)} no caminho — contra ${reais(d.precoDaPassagemBRL)} ` +
    `para comprar a passagem hoje.`
  );
}

function alertar(d: {
  mesesNecessarios: number | null;
  custoTotalBRL: number;
  precoDaPassagemBRL: number;
}): string | null {
  if (d.mesesNecessarios === null) return null;

  if (d.mesesNecessarios > HORIZONTE_MAXIMO_EM_MESES) {
    return `Nesse ritmo são mais de ${Math.round(d.mesesNecessarios / 12)} anos. Vale rever a meta, aumentar o acúmulo ou simplesmente comprar a passagem.`;
  }

  if (d.custoTotalBRL > d.precoDaPassagemBRL) {
    return (
      `Atenção: acumular custaria ${reais(d.custoTotalBRL)}, mais do que os ` +
      `${reais(d.precoDaPassagemBRL)} da passagem. Nesse caso o plano não se paga — ` +
      `compre em dinheiro e guarde as milhas para um destino mais caro.`
    );
  }

  return null;
}

/** Lista de clubes disponíveis para um programa, para a interface. */
export function clubesDoPrograma(programaId: string) {
  return clubes.clubes.filter((c) => c.programa === programaId);
}

/** CPM alvo do programa, usado para comparar com o custo do plano. */
export function cpmAlvo(programaId: string): number | null {
  return cpmReferencia.programas[programaId]?.alvoBRL ?? null;
}
