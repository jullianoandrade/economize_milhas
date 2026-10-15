import {
  cartoes,
  clubes,
  cpmReferencia,
  programas,
  tabelasResgate,
  transferencias,
  type Cartao,
  type Confianca,
  type Programa,
} from "@/lib/dados";
import { rendimentoDoCartao } from "./calculo-cartao";
import type { RotaClassificada } from "./regioes";

/**
 * Converte uma rota em quantas milhas ela custa, e quanto custa obter
 * essas milhas por cada caminho possivel.
 *
 * Nada aqui enxerga comissao: este modulo le data/ mas nunca
 * data/parceiros-comercial.json. Ver tests/arquitetura.test.ts.
 */

export type ClasseDeVoo = "economica" | "executiva";

export type EstimativaDeMilhas = {
  programa: Programa;
  disponivel: boolean;
  milhas: { min: number; tipico: number; max: number };
  taxasBRL: number;
  confianca: Confianca;
};

/**
 * Quantas milhas um trecho custa em cada programa.
 *
 * Os programas brasileiros nao tem mais tabela fixa: usam precificacao
 * dinamica, e a quantidade de milhas acompanha o preco em dinheiro. Por
 * isso, quando o preco e conhecido, a estimativa vem de
 * preco x milhasPorReal, limitada a faixa min-max da regiao. Sem preco,
 * cai no valor tipico.
 */
export function estimarMilhas(
  rota: RotaClassificada,
  classe: ClasseDeVoo = "economica",
  precoDinheiroBRL?: number,
): EstimativaDeMilhas[] {
  const taxa = tabelasResgate.taxasEmbarqueBRL[rota.faixa];
  const taxasBRL = typeof taxa === "number" ? taxa : 0;

  return programas.programas.flatMap((programa) => {
    const tabela = tabelasResgate.tabelas[programa.id];
    if (!tabela) return [];

    const faixa = tabela.economica[rota.faixa];
    if (!faixa) return [];

    const fator = classe === "executiva" ? tabela.multiplicadorExecutiva : 1;
    const arredonda = (n: number) => Math.round((n * fator) / 100) * 100;

    const estimadoPeloPreco =
      precoDinheiroBRL && precoDinheiroBRL > 0
        ? Math.min(
            faixa.max,
            Math.max(faixa.min, precoDinheiroBRL * tabela.milhasPorReal),
          )
        : faixa.tipico;

    return [
      {
        programa,
        disponivel: faixa.confianca !== "indisponivel" && faixa.tipico > 0,
        milhas: {
          min: arredonda(faixa.min),
          tipico: arredonda(estimadoPeloPreco),
          max: arredonda(faixa.max),
        },
        taxasBRL,
        confianca: faixa.confianca,
      },
    ];
  });
}

/* ------------------------------------------------------------------ */
/* Caminhos de aquisicao: quanto custa, para VOCE, cada milheiro       */
/* ------------------------------------------------------------------ */

export type IdDeCaminho =
  | "cartao"
  | "transferencia"
  | "mercado"
  | "clube"
  | "compra-direta";

export type CaminhoDeAquisicao = {
  id: IdDeCaminho;
  rotulo: string;
  cpmBRL: number;
  explicacao: string;
  confianca: Confianca;
  detalhe?: string;
};

export type PerfilDeAcumulo = {
  /** Quanto a pessoa passa no cartao por mes, em reais. */
  gastoMensalCartaoBRL?: number;
  /** Id de um cartao de data/cartoes.json. */
  cartaoId?: string;
};

/**
 * CPM de um cartao: a anuidade diluida nos pontos que o gasto anual gera.
 *
 * E o caminho mais barato que existe justamente porque os pontos saem de
 * um gasto que a pessoa ja faria de qualquer forma. Cartao sem anuidade
 * leva o CPM praticamente a zero, e por isso ele e tratado a parte na
 * interface: nao da para comparar de igual para igual com quem paga.
 */
export function cpmDoCartao(
  cartao: Cartao,
  gastoMensalBRL: number,
): { cpmBRL: number; pontosPorMes: number } | null {
  // A conta vive em ./calculo-cartao, que nao importa nada e por isso
  // tambem roda no navegador. Aqui so entramos com os dados da base.
  const r = rendimentoDoCartao({
    gastoMensalBRL,
    pontosPorDolarNacional: cartao.pontosPorDolarNacional,
    cotacaoDolarBRL: cartoes.cotacaoDolarReferenciaBRL,
    anuidadeBRL: cartao.anuidadeBRL,
    isencaoGastoMensalBRL: cartao.isencaoGastoMensalBRL,
  });

  return r ? { cpmBRL: r.cpmBRL, pontosPorMes: r.pontosPorMes } : null;
}

/** O melhor plano de clube de um programa, do ponto de vista de custo. */
export function melhorPlanoDeClube(programaId: string) {
  const clube = clubes.clubes.find((c) => c.programa === programaId);
  if (!clube) return null;

  const planos = clube.planos.map((plano) => ({
    clube,
    plano,
    cpmBRL: (plano.mensalidadeBRL / plano.milhasMes) * 1000,
  }));

  return planos.reduce((a, b) => (b.cpmBRL < a.cpmBRL ? b : a));
}

/** Bonus mediano historico de transferencia para um programa. */
export function bonusMedianoDeTransferencia(programaId: string): number {
  return (
    transferencias.padraoHistorico.find((p) => p.destino === programaId)
      ?.bonusMedianoPct ?? 0
  );
}

/**
 * Todos os caminhos de aquisicao de um programa, do mais barato ao mais
 * caro. A ordem e por CPM: so o que e melhor para o usuario, nada mais.
 */
export function caminhosDeAquisicao(
  programaId: string,
  perfil: PerfilDeAcumulo = {},
): CaminhoDeAquisicao[] {
  const caminhos: CaminhoDeAquisicao[] = [];
  const cpm = cpmReferencia.programas[programaId];

  // 1. Cartao de credito
  const cartao = perfil.cartaoId
    ? cartoes.cartoes.find((c) => c.id === perfil.cartaoId)
    : null;
  let cpmDoCartaoDoUsuario: number | null = null;
  if (cartao && perfil.gastoMensalCartaoBRL) {
    const calculo = cpmDoCartao(cartao, perfil.gastoMensalCartaoBRL);
    if (calculo) {
      cpmDoCartaoDoUsuario = calculo.cpmBRL;
      caminhos.push({
        id: "cartao",
        rotulo: `Acumular no ${cartao.nome}`,
        cpmBRL: calculo.cpmBRL,
        confianca: cartao.confianca,
        explicacao:
          calculo.cpmBRL === 0
            ? "Sem anuidade a pagar no seu nível de gasto: estas milhas saem de graça."
            : "A anuidade diluída nos pontos que o seu gasto anual gera.",
        detalhe: `${Math.round(calculo.pontosPorMes).toLocaleString("pt-BR")} pontos por mês`,
      });
    }
  }

  // 2. Transferencia bonificada.
  //
  // O bonus multiplica os pontos da ORIGEM, entao a base de calculo e o
  // preco do ponto Livelo, nunca o preco da milha de destino. Usar o
  // destino como base era um erro que inventava milhas baratissimas.
  //
  // Se a pessoa informou um cartao, a base e o CPM daquele cartao: os
  // pontos do cartao caem na coalizao sem custo extra, e e ai que o
  // bonus vira vantagem de verdade. Sem cartao, a base e o preco de
  // compra de pontos Livelo em promocao, e o resultado costuma ficar
  // parecido com simplesmente comprar a milha pronta.
  const bonus = bonusMedianoDeTransferencia(programaId);
  if (bonus > 0) {
    const viaCartao = cpmDoCartaoDoUsuario != null;
    const base = cpmDoCartaoDoUsuario ?? cpmReferencia.coalizao.livelo.alvoBRL;

    caminhos.push({
      id: "transferencia",
      rotulo: viaCartao
        ? `Transferir os pontos do cartão com ${bonus}% de bônus`
        : `Comprar pontos Livelo e transferir com ${bonus}% de bônus`,
      cpmBRL: base / (1 + bonus / 100),
      confianca: "interpolado",
      explicacao: viaCartao
        ? "Os pontos que o seu cartão já gera, multiplicados pelo bônus mediano histórico deste programa."
        : "Preço de compra de pontos Livelo em promoção, multiplicado pelo bônus mediano histórico. O bônus vigente hoje pode estar maior ou menor.",
      detalhe: `1.000 pontos viram ${Math.round(1000 * (1 + bonus / 100)).toLocaleString("pt-BR")} milhas`,
    });
  }

  // 3. Mercado secundario
  if (cpm) {
    caminhos.push({
      id: "mercado",
      rotulo: "Comprar no preço de mercado",
      cpmBRL: cpm.alvoBRL,
      confianca: "pesquisado",
      explicacao: "Valor-alvo de referência para 2026 deste programa.",
      detalhe: `faixa praticada: R$ ${cpm.mercadoMinBRL} a R$ ${cpm.mercadoMaxBRL}`,
    });
  }

  // 4. Clube de assinatura
  const clube = melhorPlanoDeClube(programaId);
  if (clube) {
    caminhos.push({
      id: "clube",
      rotulo: `${clube.clube.nome}, plano de ${clube.plano.milhasMes.toLocaleString("pt-BR")}`,
      cpmBRL: clube.cpmBRL,
      confianca: clube.clube.confianca,
      explicacao:
        "Mensalidade dividida pelas milhas do plano. Só compensa quando o resgate extrai mais que isso por milheiro.",
      detalhe: `R$ ${clube.plano.mensalidadeBRL.toLocaleString("pt-BR")} por mês`,
    });
  }

  // 5. Compra direta na companhia: o teto do mercado
  caminhos.push({
    id: "compra-direta",
    rotulo: "Comprar direto da companhia",
    cpmBRL: cpmReferencia.compraDiretaBRL.faixaMin,
    confianca: "pesquisado",
    explicacao:
      "Preço de tabela, sem promoção. Serve de teto: acima disso nenhum resgate compensa.",
    detalhe: `R$ ${cpmReferencia.compraDiretaBRL.faixaMin} a R$ ${cpmReferencia.compraDiretaBRL.faixaMax} o milheiro`,
  });

  return caminhos.sort((a, b) => a.cpmBRL - b.cpmBRL);
}
