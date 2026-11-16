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
  // Sem ponta brasileira nao ha tabela que precifique o trecho: nenhum
  // programa da base cobre o voo, e inventar faixa produziria numero
  // falso com cara de certo. Ver lib/milhas/regioes.ts e
  // docs/fronteira-do-motor.md.
  if (rota.faixa === null) return [];

  // Em constante local porque o estreitamento de `rota.faixa` nao
  // atravessa a fronteira do callback abaixo: para o compilador, a
  // propriedade poderia ter mudado ate a chamada.
  const faixaDaRota = rota.faixa;

  const taxa = tabelasResgate.taxasEmbarqueBRL[faixaDaRota];
  const taxasBRL = typeof taxa === "number" ? taxa : 0;

  return programas.programas.flatMap((programa) => {
    const tabela = tabelasResgate.tabelas[programa.id];
    if (!tabela) return [];

    const faixa = tabela.economica[faixaDaRota];
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
 * Uma promocao de transferencia que esta valendo HOJE.
 *
 * Vem da tabela bonus_transferencia, curada a mao -- nao existe fonte
 * automatizavel confiavel. O proprio data/calendario-transferencias.json
 * ja previa isto desde outubro: "os bonus VIGENTES ficam no Supabase,
 * porque mudam toda semana".
 */
export type BonusVigente = {
  /** 100 significa "1.000 pontos viram 2.000 milhas". */
  percentual: number;
  /** De onde se transfere: livelo, esfera. */
  origem: string;
  /** yyyy-mm-dd. A pressa faz parte da informacao. */
  terminaEm: string;
};

/** Bonus vigentes por programa de destino. */
export type BonusPorPrograma = Record<string, BonusVigente | undefined>;

function nomeDaOrigem(id: string): string {
  return transferencias.origens.find((o) => o.id === id)?.nome ?? "Livelo";
}

/**
 * "2026-11-28" vira "28/11". Data por extenso nao cabe no rotulo, e o
 * que importa aqui e quanto tempo falta, nao o ano.
 *
 * Fatiado da string, sem new Date(): o construtor interpreta
 * "2026-11-28" como UTC e, em fuso negativo como o nosso, devolveria o
 * dia anterior -- uma promocao pareceria terminar um dia antes.
 */
function formatarDia(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return mes && dia ? `${dia}/${mes}` : iso;
}

/**
 * A paridade Livelo -> programa de destino.
 *
 * Livelo e o hub que o resto do app ja assume como base (e o preco de
 * compra de pontos Livelo que vira "o custo de quem compra" em
 * PerguntaDoCartao e em SeuCusto). O numero que importa aqui nao e a
 * razao -- quase sempre 1:1 -- e o MINIMO por transferencia: a Esfera
 * exige 30.000 pontos de uma vez para qualquer destino, e a Livelo varia
 * de 0 a 12.000 dependendo do programa. E o bloqueio pratico que pega o
 * iniciante de surpresa, e nenhuma tela do app mencionava isso ate aqui.
 */
export function paridadeDeTransferencia(programaId: string) {
  return (
    transferencias.paridades.find(
      (p) => p.origem === "livelo" && p.destino === programaId,
    ) ?? null
  );
}

/**
 * Todos os caminhos de aquisicao de um programa, do mais barato ao mais
 * caro. A ordem e por CPM: so o que e melhor para o usuario, nada mais.
 */
export function caminhosDeAquisicao(
  programaId: string,
  perfil: PerfilDeAcumulo = {},
  /**
   * A promocao que esta valendo agora, quando houver. Entra por
   * parametro, e nao por leitura de banco aqui dentro, porque este
   * modulo e funcao pura -- sem rede e sem relogio. Quem le o banco e
   * lib/transferencias.ts; aqui so se faz a conta.
   */
  bonusVigente?: BonusVigente,
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
  //
  // Quando ha promocao valendo, e ELA que vale: o mediano historico
  // existe para nao deixar a tela muda nas semanas sem promocao, nao
  // para competir com o numero real. E a confianca sobe junto --
  // "pesquisado" em vez de "interpolado" -- porque deixou de ser
  // estimativa.
  //
  // A ordem aqui importa: `?? ` nao serve, porque percentual 0 nao e
  // nulo e o zero venceria o mediano -- o caminho de transferencia
  // sumiria da lista em vez de cair no historico. Promocao de 0% nao e
  // promocao.
  const vigente = bonusVigente != null && bonusVigente.percentual > 0;
  const bonus = vigente
    ? bonusVigente.percentual
    : bonusMedianoDeTransferencia(programaId);

  if (bonus > 0) {
    const viaCartao = cpmDoCartaoDoUsuario != null;
    const base = cpmDoCartaoDoUsuario ?? cpmReferencia.coalizao.livelo.alvoBRL;
    const origem = vigente ? nomeDaOrigem(bonusVigente.origem) : "Livelo";

    caminhos.push({
      id: "transferencia",
      rotulo: viaCartao
        ? `Transferir os pontos do cartão com ${bonus}% de bônus`
        : `Comprar pontos ${origem} e transferir com ${bonus}% de bônus`,
      cpmBRL: base / (1 + bonus / 100),
      confianca: vigente ? "pesquisado" : "interpolado",
      explicacao: vigente
        ? `Promoção de ${bonus}% da ${origem} valendo agora, até ${formatarDia(bonusVigente.terminaEm)}.` +
          (viaCartao
            ? " Vale para os pontos que o seu cartão já gera."
            : " Sobre o preço de compra de pontos em promoção.")
        : viaCartao
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
