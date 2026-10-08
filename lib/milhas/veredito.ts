import type { Confianca, Programa } from "@/lib/dados";
import {
  caminhosDeAquisicao,
  estimarMilhas,
  type CaminhoDeAquisicao,
  type ClasseDeVoo,
  type PerfilDeAcumulo,
} from "./motor";
import type { RotaClassificada } from "./regioes";

/**
 * A conta que o app existe para fazer.
 *
 * Duas perguntas, e elas nao sao a mesma:
 *
 *   CPM de aquisicao      = quanto 1.000 milhas CUSTAM para voce
 *   Valor extraido        = quanto 1.000 milhas VALERAM naquele resgate
 *
 * Resgate bom e quando o segundo supera o primeiro. Quando nao supera, o
 * app manda pagar em dinheiro, com todas as letras: milha e um ativo, e
 * gastar ativo abaixo do custo e prejuizo, mesmo parecendo economia.
 */

export type Qualidade = "excelente" | "bom" | "regular" | "ruim";

export type OpcaoDeResgate = {
  programa: Programa;
  disponivel: boolean;
  milhas: number;
  taxasBRL: number;
  confianca: Confianca;
  /** O caminho de aquisicao mais barato disponivel para este programa. */
  caminho: CaminhoDeAquisicao;
  /** Milhas convertidas em reais pelo CPM do caminho, mais as taxas. */
  custoRealBRL: number;
  /** Quanto cada 1.000 milhas valeram neste resgate. */
  valorExtraidoPorMilheiroBRL: number;
  /** Valor extraido dividido pelo CPM. Acima de 1 o resgate compensa. */
  razao: number;
  qualidade: Qualidade;
  economiaBRL: number;
};

export type Veredito = {
  recomendacao: "milhas" | "dinheiro";
  precoDinheiroBRL: number;
  opcoes: OpcaoDeResgate[];
  melhor: OpcaoDeResgate | null;
  economiaBRL: number;
  economiaPct: number;
  explicacao: string;
  /**
   * Preenchida quando resgatar funciona, mas rende pouco. Nao e um erro
   * resgatar: e custo de oportunidade, e o app avisa em vez de so
   * comemorar a economia.
   */
  ressalva: string | null;
};

/**
 * Abaixo deste ganho, as mesmas milhas costumam render muito mais numa
 * internacional ou na alta temporada. O numero e um limiar de bom senso,
 * nao uma medida exata: serve para separar "vale muito" de "vale pouco".
 */
const GANHO_MODESTO_BRL = 500;

/** Faixas de qualidade, em razao entre valor extraido e custo. */
const FAIXAS: ReadonlyArray<[limite: number, qualidade: Qualidade]> = [
  [2.0, "excelente"],
  [1.4, "bom"],
  [1.0, "regular"],
];

export function classificarQualidade(razao: number): Qualidade {
  return FAIXAS.find(([limite]) => razao >= limite)?.[1] ?? "ruim";
}

export const reais = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

const milheiro = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function avaliarResgate(
  precoDinheiroBRL: number,
  milhas: number,
  taxasBRL: number,
  cpmBRL: number,
) {
  // O que as milhas compraram e o preco da passagem MENOS as taxas, porque
  // as taxas voce paga de qualquer jeito, inclusive no resgate.
  const valorEmDinheiroDasMilhas = Math.max(0, precoDinheiroBRL - taxasBRL);
  const valorExtraidoPorMilheiroBRL =
    milhas > 0 ? (valorEmDinheiroDasMilhas / milhas) * 1000 : 0;

  const custoRealBRL = (milhas * cpmBRL) / 1000 + taxasBRL;
  const razao = cpmBRL > 0 ? valorExtraidoPorMilheiroBRL / cpmBRL : Infinity;

  return {
    valorExtraidoPorMilheiroBRL,
    custoRealBRL,
    razao,
    qualidade: classificarQualidade(razao),
    economiaBRL: precoDinheiroBRL - custoRealBRL,
  };
}

export function calcularVeredito(
  rota: RotaClassificada,
  precoDinheiroBRL: number,
  opcoes: { classe?: ClasseDeVoo; perfil?: PerfilDeAcumulo } = {},
): Veredito {
  const { classe = "economica", perfil = {} } = opcoes;

  // O preco em dinheiro entra na estimativa porque os programas usam
  // precificacao dinamica: passagem mais cara, resgate mais caro.
  const avaliadas: OpcaoDeResgate[] = estimarMilhas(rota, classe, precoDinheiroBRL)
    .filter((e) => e.disponivel)
    .map((estimativa) => {
      const caminho = caminhosDeAquisicao(estimativa.programa.id, perfil)[0];
      const milhas = estimativa.milhas.tipico;
      const analise = avaliarResgate(
        precoDinheiroBRL,
        milhas,
        estimativa.taxasBRL,
        caminho.cpmBRL,
      );

      return {
        programa: estimativa.programa,
        disponivel: estimativa.disponivel,
        milhas,
        taxasBRL: estimativa.taxasBRL,
        confianca: estimativa.confianca,
        caminho,
        ...analise,
      };
    })
    .sort((a, b) => b.economiaBRL - a.economiaBRL);

  const melhor = avaliadas[0] ?? null;
  const economiaBRL = melhor ? melhor.economiaBRL : 0;
  const recomendacao = economiaBRL > 0 ? "milhas" : "dinheiro";

  return {
    recomendacao,
    precoDinheiroBRL,
    opcoes: avaliadas,
    melhor,
    economiaBRL,
    economiaPct:
      precoDinheiroBRL > 0 ? (economiaBRL / precoDinheiroBRL) * 100 : 0,
    explicacao: explicar(rota, precoDinheiroBRL, melhor, recomendacao),
    ressalva: ressalvar(rota, melhor, recomendacao, economiaBRL),
  };
}

function ressalvar(
  rota: RotaClassificada,
  melhor: OpcaoDeResgate | null,
  recomendacao: "milhas" | "dinheiro",
  economiaBRL: number,
): string | null {
  if (recomendacao !== "milhas" || !melhor) return null;
  if (economiaBRL >= GANHO_MODESTO_BRL) return null;

  const onde = rota.internacional ? "numa viagem mais longa" : "numa internacional";

  return (
    `O resgate compensa, mas economiza só ${reais(economiaBRL)}. ` +
    `Essas mesmas ${melhor.milhas.toLocaleString("pt-BR")} ${melhor.programa.unidade} ` +
    `rendem bem mais ${onde} ou na alta temporada, quando a passagem em dinheiro ` +
    `dispara e a tabela de milhas quase não muda. Se você não tem pressa, guarde.`
  );
}

function explicar(
  rota: RotaClassificada,
  precoDinheiroBRL: number,
  melhor: OpcaoDeResgate | null,
  recomendacao: "milhas" | "dinheiro",
): string {
  const trecho = `${rota.origem.cidade} para ${rota.destino.cidade}`;

  if (!melhor) {
    return `Nenhum dos programas da nossa base cobre ${trecho}. Compare direto no site das companhias.`;
  }

  const extraido = milheiro(melhor.valorExtraidoPorMilheiroBRL);
  const custo = milheiro(melhor.caminho.cpmBRL);
  const milhasFmt = melhor.milhas.toLocaleString("pt-BR");

  if (recomendacao === "dinheiro") {
    return (
      `Pague em dinheiro. ${trecho} por ${reais(precoDinheiroBRL)} significa extrair ` +
      `${extraido} por milheiro, e as suas milhas custam ${custo}. ` +
      `Resgatar aqui gastaria um ativo que vale mais do que esta passagem: ` +
      `guarde as milhas para um trecho caro ou para a alta temporada.`
    );
  }

  return (
    `Use milhas. ${milhasFmt} ${melhor.programa.unidade} no ${melhor.programa.nome} ` +
    `mais ${reais(melhor.taxasBRL)} de taxas cobrem uma passagem de ${reais(precoDinheiroBRL)}. ` +
    `Você extrai ${extraido} por milheiro numa milha que lhe custa ${custo} ` +
    `(${melhor.caminho.rotulo.toLowerCase()}), uma economia de ${reais(melhor.economiaBRL)}.`
  );
}
