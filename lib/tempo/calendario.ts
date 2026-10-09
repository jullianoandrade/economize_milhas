import type { ObservacaoDatada } from "./flexibilidade";

/**
 * Preco dia a dia, para a pessoa ver a forma do mes inteiro.
 *
 * O card de flexibilidade ja diz quais sao os quatro dias mais baratos.
 * Isso responde "qual e o melhor dia", mas nao responde a pergunta que
 * vem antes dela: "vale a pena mexer na data?". Uma faixa com todos os
 * dias responde as duas de uma vez -- quando a barra do fim de semana e
 * o dobro da barra da terca, a conclusao se tira sozinha.
 *
 * Funcoes puras: a data inicial entra por parametro, nada aqui le o
 * relogio nem a rede.
 */

export type NivelDePreco = "barato" | "medio" | "caro" | "sem-dado";

export type DiaDePreco = {
  /** yyyy-mm-dd */
  dia: string;
  precoBRL: number | null;
  nivel: NivelDePreco;
  /** Diferenca para a mediana da janela, em reais. */
  diferencaBRL: number | null;
};

export type CalendarioDePrecos = {
  dias: DiaDePreco[];
  medianaBRL: number;
  diasComDado: number;
  maisBarato: DiaDePreco | null;
  maiorPrecoBRL: number;
};

/**
 * Abaixo disto a faixa vira enfeite: quatro barras soltas em quarenta e
 * cinco colunas vazias nao mostram forma nenhuma, e sugerir que mostram
 * e pior do que nao desenhar o grafico.
 */
export const DIAS_MINIMOS_PARA_MOSTRAR = 6;

/** Quanto um dia precisa fugir da mediana para merecer um rotulo proprio. */
const BARATO_ABAIXO = 0.92;
const CARO_ACIMA = 1.08;

const DIA_EM_MS = 24 * 60 * 60 * 1000;

function iso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.floor(ordenados.length / 2)];
}

export function montarCalendario(
  observacoes: ObservacaoDatada[],
  de: Date,
  janelaDias = 45,
): CalendarioDePrecos {
  const porDia = new Map<string, number[]>();

  for (const o of observacoes) {
    if (!o?.partidaEm || !(o.precoBRL > 0)) continue;
    const dia = o.partidaEm.slice(0, 10);
    const lista = porDia.get(dia);
    if (lista) lista.push(o.precoBRL);
    else porDia.set(dia, [o.precoBRL]);
  }

  // Um dia com varias observacoes vira a mediana delas, e nao a mais
  // barata: a menor tarifa de um dia costuma ser um assento unico que
  // some antes de alguem comprar.
  const precoPorDia = new Map<string, number>();
  for (const [dia, precos] of porDia) {
    precoPorDia.set(dia, mediana(precos));
  }

  const inicio = new Date(de);
  inicio.setHours(12, 0, 0, 0);

  const dias: DiaDePreco[] = [];
  const observados: number[] = [];

  for (let i = 0; i < janelaDias; i++) {
    const dia = iso(new Date(inicio.valueOf() + i * DIA_EM_MS));
    const preco = precoPorDia.get(dia) ?? null;
    if (preco !== null) observados.push(preco);
    dias.push({ dia, precoBRL: preco, nivel: "sem-dado", diferencaBRL: null });
  }

  const medianaBRL = mediana(observados);

  for (const d of dias) {
    if (d.precoBRL === null || medianaBRL <= 0) continue;
    d.diferencaBRL = Math.round(d.precoBRL - medianaBRL);
    d.nivel =
      d.precoBRL <= medianaBRL * BARATO_ABAIXO
        ? "barato"
        : d.precoBRL >= medianaBRL * CARO_ACIMA
          ? "caro"
          : "medio";
  }

  const comDado = dias.filter((d) => d.precoBRL !== null);
  const maisBarato =
    comDado.length > 0
      ? comDado.reduce((a, b) => (b.precoBRL! < a.precoBRL! ? b : a))
      : null;

  return {
    dias,
    medianaBRL,
    diasComDado: comDado.length,
    maisBarato,
    maiorPrecoBRL: observados.length > 0 ? Math.max(...observados) : 0,
  };
}
