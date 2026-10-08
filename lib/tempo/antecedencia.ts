import { heuristicasTempo } from "@/lib/dados";

/**
 * Compro agora ou espero?
 *
 * Comeca pelas heuristicas de mercado (domestico 28-90 dias, otimo perto
 * de 39; internacional 60-120). Conforme a tabela precos_snapshot do
 * Supabase acumula observacoes DAQUELA rota, a resposta passa a vir da
 * curva real -- e a tela diz qual das duas esta sendo usada, porque a
 * confianca do numero importa tanto quanto o numero.
 *
 * Funcoes puras: as observacoes chegam de fora (lib/historico.ts), o que
 * mantem este modulo testavel sem banco.
 */

export type Observacao = {
  antecedenciaDias: number;
  precoBRL: number;
};

export type Veredito = "comprar-agora" | "esperar" | "janela-passou";

export type JanelaDeCompra = {
  diasMin: number;
  diasOtimo: number;
  diasMax: number;
  /** Quantos dias faltam para o voo, se a pessoa informou a data. */
  diasAteOVoo: number | null;
  veredito: Veredito;
  /** Quantos dias esperar antes de comprar. Zero quando ja e hora. */
  esperarDias: number;
  economiaEstimadaPct: number;
  fonte: "curva-propria" | "heuristica";
  observacoes: number;
  explicacao: string;
};

/** Agrupa as observacoes em faixas de antecedencia e tira a mediana de cada uma. */
export function curvaDeAntecedencia(
  observacoes: Observacao[],
  larguraDaFaixaEmDias = 15,
): Array<{ dias: number; precoMedianoBRL: number; amostras: number }> {
  const faixas = new Map<number, number[]>();

  for (const o of observacoes) {
    if (o.antecedenciaDias < 0 || o.precoBRL <= 0) continue;
    const faixa =
      Math.floor(o.antecedenciaDias / larguraDaFaixaEmDias) *
      larguraDaFaixaEmDias;
    const lista = faixas.get(faixa) ?? [];
    lista.push(o.precoBRL);
    faixas.set(faixa, lista);
  }

  return [...faixas.entries()]
    .map(([dias, precos]) => {
      const ordenados = [...precos].sort((a, b) => a - b);
      return {
        dias,
        // Mediana, nao media: uma unica tarifa de ultima hora muito cara
        // distorceria a media e empurraria a janela para o lugar errado.
        precoMedianoBRL: ordenados[Math.floor(ordenados.length / 2)],
        amostras: precos.length,
      };
    })
    .sort((a, b) => a.dias - b.dias);
}

/**
 * Amostras minimas por faixa para confiar na curva propria.
 *
 * Abaixo disso a mediana e ruido: tres observacoes de uma rota podem vir
 * todas da mesma busca de uma mesma pessoa.
 */
const AMOSTRAS_MINIMAS = 8;
/** Faixas uteis minimas: sem variacao de antecedencia nao ha curva. */
const FAIXAS_MINIMAS = 4;

export function janelaDeCompra(
  internacional: boolean,
  diasAteOVoo: number | null,
  observacoes: Observacao[] = [],
): JanelaDeCompra {
  const tipo = internacional ? "internacional" : "domestico";
  const heuristica =
    heuristicasTempo.janelaDeCompra.find((j) => j.tipo === tipo) ??
    heuristicasTempo.janelaDeCompra[0];

  const curva = curvaDeAntecedencia(observacoes).filter(
    (f) => f.amostras >= AMOSTRAS_MINIMAS,
  );
  const temCurvaPropria = curva.length >= FAIXAS_MINIMAS;

  let diasMin = heuristica.diasMin;
  let diasOtimo = heuristica.diasOtimo;
  let diasMax = heuristica.diasMax;
  let economiaEstimadaPct = heuristica.economiaTipicaPct;

  if (temCurvaPropria) {
    const maisBarata = curva.reduce((a, b) =>
      b.precoMedianoBRL < a.precoMedianoBRL ? b : a,
    );
    const maisCara = curva.reduce((a, b) =>
      b.precoMedianoBRL > a.precoMedianoBRL ? b : a,
    );

    diasOtimo = maisBarata.dias;
    diasMin = Math.max(0, maisBarata.dias - 15);
    diasMax = maisBarata.dias + 30;
    economiaEstimadaPct =
      maisCara.precoMedianoBRL > 0
        ? (1 - maisBarata.precoMedianoBRL / maisCara.precoMedianoBRL) * 100
        : 0;
  }

  let veredito: Veredito = "comprar-agora";
  let esperarDias = 0;

  if (diasAteOVoo !== null) {
    if (diasAteOVoo > diasMax) {
      veredito = "esperar";
      esperarDias = diasAteOVoo - diasMax;
    } else if (diasAteOVoo < diasMin) {
      veredito = "janela-passou";
    }
  }

  const amostras = observacoes.length;

  return {
    diasMin,
    diasOtimo,
    diasMax,
    diasAteOVoo,
    veredito,
    esperarDias,
    economiaEstimadaPct,
    fonte: temCurvaPropria ? "curva-propria" : "heuristica",
    observacoes: amostras,
    explicacao: explicar({
      veredito,
      esperarDias,
      diasMin,
      diasMax,
      diasOtimo,
      diasAteOVoo,
      economiaEstimadaPct,
      temCurvaPropria,
      amostras,
    }),
  };
}

function explicar(d: {
  veredito: Veredito;
  esperarDias: number;
  diasMin: number;
  diasMax: number;
  diasOtimo: number;
  diasAteOVoo: number | null;
  economiaEstimadaPct: number;
  temCurvaPropria: boolean;
  amostras: number;
}): string {
  const procedencia = d.temCurvaPropria
    ? `Baseado em ${d.amostras.toLocaleString("pt-BR")} observações de preço desta rota.`
    : "Estimativa de mercado: ainda não temos observações suficientes desta rota para traçar a curva própria.";

  const janela = `A janela costuma ser de ${d.diasMin} a ${d.diasMax} dias antes do voo, com o melhor ponto perto de ${d.diasOtimo} dias.`;

  if (d.diasAteOVoo === null) {
    return `${janela} ${procedencia}`;
  }

  if (d.veredito === "esperar") {
    return (
      `Ainda é cedo: faltam ${d.diasAteOVoo} dias para o voo e a janela boa começa ` +
      `daqui a ${d.esperarDias} dias. Comprar com muita antecedência raramente ajuda, ` +
      `porque as companhias ainda não abriram as tarifas promocionais. ${procedencia}`
    );
  }

  if (d.veredito === "janela-passou") {
    return (
      `Faltam só ${d.diasAteOVoo} dias e a janela boa já passou — daqui para frente ` +
      `o preço tende a subir. Se a data for flexível, vale olhar outro período; ` +
      `se não for, compre logo. ${procedencia}`
    );
  }

  return (
    `É uma boa hora de comprar: faltam ${d.diasAteOVoo} dias, dentro da janela. ` +
    `Quem acerta essa janela economiza cerca de ${Math.round(d.economiaEstimadaPct)}% ` +
    `em relação a quem compra fora dela. ${procedencia}`
  );
}
