import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");

/**
 * Guarda contra capacidade que o motor calcula e a tela esquece de
 * mostrar. Foi exatamente essa ausencia de guarda que deixou piso/teto,
 * razao e caminho.detalhe escondidos por meses -- a Fase 0 deste projeto
 * inteira foi "reexibir o que ja estava calculado".
 *
 * Para cada campo publico dos seis tipos abaixo, o teste exige UM dos
 * dois: o campo aparece em algum .tsx (acesso direto `variavel.campo` ou
 * desestruturado `{ campo } = variavel`), ou esta documentado na lista
 * GAPS do tipo, com o motivo pelo qual ainda nao tem tela. Os dois sao
 * aceitaveis; o que nao e aceitavel e o campo nao estar em nenhum lugar.
 */

function todosOsTsx(dir: string): string[] {
  let entradas;
  try {
    entradas = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entradas.flatMap((entrada) => {
    if (["node_modules", ".next", ".git", "tests"].includes(entrada.name)) {
      return [];
    }
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return todosOsTsx(completo);
    return entrada.name.endsWith(".tsx") ? [completo] : [];
  });
}

const CODIGOS_TSX = todosOsTsx(raiz).map((f) => readFileSync(f, "utf8"));

/**
 * `variavel` e o nome que o codigo realmente usa para a instancia do
 * tipo (confirmado lendo os componentes, nao adivinhado): `opcao` em
 * CardPrograma, `sazonalidade` em CurvaDeMeses, `janela` em
 * CardQuandoComprar, `progresso` em TelaDeObjetivos/ObjetivoEmAndamento,
 * `plano` em TelaDeObjetivos (via `resposta.plano`, por isso o acesso
 * direto sem `\b` antes de `variavel` tambem precisa casar com isso).
 */
function campoApareceEmAlgumArquivo(variavel: string, campo: string): boolean {
  const direto = new RegExp(`${variavel}\\.${campo}\\b`);
  const desestruturado = new RegExp(
    `\\{[^}]*\\b${campo}\\b[^}]*\\}\\s*=\\s*${variavel}\\b`,
  );
  return CODIGOS_TSX.some(
    (codigo) => direto.test(codigo) || desestruturado.test(codigo),
  );
}

type Verificacao = {
  tipo: string;
  variavel: string;
  campos: string[];
  gaps: Record<string, string>;
};

const VERIFICACOES: Verificacao[] = [
  {
    tipo: "OpcaoDeResgate",
    variavel: "opcao",
    campos: [
      "programa",
      "disponivel",
      "milhas",
      "taxasBRL",
      "confianca",
      "caminho",
      "custoRealBRL",
      "valorExtraidoPorMilheiroBRL",
      "razao",
      "milhasFaixa",
      "qualidade",
      "economiaBRL",
    ],
    gaps: {
      disponivel:
        "sempre true no array: calcularVeredito ja filtra com .filter((e) => e.disponivel) antes de montar OpcaoDeResgate. Nao sobra estado para mostrar.",
      economiaBRL:
        "a economia do VENCEDOR ja aparece em CardVeredito (Veredito.economiaBRL); por programa individual, CardPrograma ainda nao mostra quanto cada opcao economiza sozinha. Candidato a proxima fase.",
    },
  },
  {
    tipo: "Sazonalidade",
    variavel: "sazonalidade",
    campos: [
      "meses",
      "mesMaisBaratoEmDinheiro",
      "mesComMelhorResgate",
      "mesesCoincidem",
      "diferencaDeExtracaoPct",
      "explicacao",
    ],
    gaps: {
      diferencaDeExtracaoPct:
        "o motor ja calcula quanto o melhor mes de resgate rende a mais; CurvaDeMeses hoje so conta isso em prosa, atraves de mesesCoincidem. Daria um numero a mais no card.",
    },
  },
  {
    tipo: "JanelaDeCompra",
    variavel: "janela",
    campos: [
      "diasMin",
      "diasOtimo",
      "diasMax",
      "diasAteOVoo",
      "veredito",
      "esperarDias",
      "economiaEstimadaPct",
      "fonte",
      "observacoes",
      "explicacao",
    ],
    gaps: {},
  },
  {
    tipo: "Progresso",
    variavel: "progresso",
    campos: [
      "pontoDePartida",
      "saldoAtual",
      "milhasFaltando",
      "percentual",
      "ganhoDesdeOInicio",
      "diasDesdeOInicio",
      "ritmoRealMensal",
      "ritmoConsiderado",
      "mesesRestantes",
      "chegadaPrevistaEm",
      "diasAteOAlvo",
      "situacao",
      "ritmoNecessarioMensal",
      "resumo",
    ],
    gaps: {
      diasDesdeOInicio:
        "existe para instrumentar o calculo de ritmoRealMensal (milhas por mes); nao tem leitura propria que valha a pena mostrar sozinha.",
      diasAteOAlvo:
        "so e preenchido quando a meta tem prazo, e a tela de objetivos ainda nao coleta prazo da pessoa.",
      chegadaPrevistaEm:
        "hoje so dissolvido em prosa dentro de progresso.resumo. Vira objeto visual proprio (MarcoDoObjetivo) na Fase 5.",
    },
  },
  {
    tipo: "PlanoDeAcumulo",
    variavel: "plano",
    campos: [
      "milhasNecessarias",
      "milhasFaltando",
      "fontes",
      "milhasPorMes",
      "mesesNecessarios",
      "custoTotalBRL",
      "precoDaPassagemBRL",
      "economiaBRL",
      "cartoesSugeridos",
      "explicacao",
      "alerta",
      "minimoDeTransferencia",
    ],
    gaps: {
      milhasFaltando:
        "sobreposto por Progresso.milhasFaltando, ja mostrado no card do objetivo quando a meta existe.",
      mesesNecessarios:
        "a tela mostra o ritmo mensal e deixa a pessoa inferir o prazo; nao ha ainda um \"chega em X meses\" explicito vindo do plano.",
      custoTotalBRL:
        "so importa quando o plano usa um caminho pago (clube, mercado); a tela hoje foca no ritmo gratuito do cartao.",
      economiaBRL:
        "redundante com Veredito.economiaBRL, ja mostrado na tela de rota -- o plano de acumulo nao refaz essa comparacao.",
    },
  },
];

describe("nenhuma capacidade do motor sai de vista sem decisao", () => {
  for (const { tipo, variavel, campos, gaps } of VERIFICACOES) {
    describe(tipo, () => {
      it.each(campos)(
        "%s aparece numa tela ou tem motivo documentado",
        (campo) => {
          const exposto = campoApareceEmAlgumArquivo(variavel, campo);
          const motivo = gaps[campo];
          expect(exposto || Boolean(motivo)).toBe(true);
        },
      );

      it("todo campo documentado como gap existe de fato no tipo", () => {
        const desconhecidos = Object.keys(gaps).filter(
          (c) => !campos.includes(c),
        );
        expect(desconhecidos).toEqual([]);
      });
    });
  }
});

/**
 * EstimativaDeMilhas e o dado bruto do motor, antes de calcularVeredito
 * avaliar cada resgate. Nenhum .tsx deveria le-lo direto: os mesmos
 * campos (programa, disponivel, milhas min/tipico/max, taxasBRL,
 * confianca) reaparecem em OpcaoDeResgate -- min/max como milhasFaixa,
 * tipico como opcao.milhas -- e ja estao cobertos acima. Se um .tsx
 * comecasse a importar o tipo bruto, seria sinal de que motor.ts parou
 * de ser a unica porta de entrada do calculo.
 */
describe("EstimativaDeMilhas nunca e lido direto por um .tsx", () => {
  it("so OpcaoDeResgate, que o motor deriva dele, chega na tela", () => {
    const culpados = todosOsTsx(raiz)
      .filter((f) => /\bEstimativaDeMilhas\b/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(raiz, f).split(path.sep).join("/"));

    expect(culpados).toEqual([]);
  });
});
