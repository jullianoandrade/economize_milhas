import { describe, expect, it } from "vitest";
import {
  agruparPorData,
  datasMaisBaratas,
  datasMaisBaratasDeAgregado,
  type ObservacaoDatada,
} from "@/lib/tempo/flexibilidade";
import {
  montarCalendario,
  montarCalendarioDeAgregado,
} from "@/lib/tempo/calendario";

/**
 * O agrupamento por data saiu do JavaScript e foi para o banco.
 *
 * Estes testes guardam a unica coisa que NAO podia mudar nessa mudanca:
 * a resposta. Mover a conta de lugar e refactor; mover a conta e o
 * resultado junto e bug com cara de refactor, e e esse que passa
 * despercebido -- nada falha, a tela so passa a dizer outra coisa.
 *
 * A regra de produto (corte de duas amostras por data, comparar com a
 * mediana da rota, mediana e nao menor preco do dia) continua coberta
 * por tests/flexibilidade.test.ts e tests/calendario.test.ts, que nao
 * precisaram mudar uma linha.
 */

const DE = new Date("2026-05-01T12:00:00");

/** Um historico com varias observacoes por dia, como o banco de fato tem. */
function historico(): ObservacaoDatada[] {
  const obs: ObservacaoDatada[] = [];
  const precoBase: Record<string, number> = {
    "2026-05-01": 1200,
    "2026-05-02": 900,
    "2026-05-03": 1500,
    "2026-05-04": 700,
    "2026-05-05": 1100,
    "2026-05-08": 2000,
  };
  for (const [dia, base] of Object.entries(precoBase)) {
    // Tres observacoes por dia, espalhadas em torno do valor do dia.
    for (const delta of [-50, 0, 50]) {
      obs.push({ partidaEm: dia, precoBRL: base + delta });
    }
  }
  return obs;
}

describe("agrupar por data", () => {
  it("devolve mediana e contagem por dia, em ordem", () => {
    const r = agruparPorData([
      { partidaEm: "2026-05-02", precoBRL: 400 },
      { partidaEm: "2026-05-01", precoBRL: 900 },
      { partidaEm: "2026-05-02", precoBRL: 1000 },
      { partidaEm: "2026-05-02", precoBRL: 800 },
    ]);

    expect(r).toEqual([
      { partidaEm: "2026-05-01", precoMedianoBRL: 900, amostras: 1 },
      { partidaEm: "2026-05-02", precoMedianoBRL: 800, amostras: 3 },
    ]);
  });

  it("descarta preco invalido sem derrubar o dia inteiro", () => {
    const r = agruparPorData([
      { partidaEm: "2026-05-02", precoBRL: 0 },
      { partidaEm: "2026-05-02", precoBRL: -10 },
      { partidaEm: "2026-05-02", precoBRL: 800 },
    ]);

    expect(r).toEqual([
      { partidaEm: "2026-05-02", precoMedianoBRL: 800, amostras: 1 },
    ]);
  });

  it("sem observacao, devolve lista vazia", () => {
    expect(agruparPorData([])).toEqual([]);
  });
});

describe("agregado e cru dao a mesma resposta", () => {
  it("datas mais baratas", () => {
    const obs = historico();
    const pelasCruas = datasMaisBaratas(obs);

    // O caminho do banco: agrupado, mais a mediana de TODAS as
    // observacoes -- nao a mediana das medianas diarias.
    const todas = obs.map((o) => o.precoBRL).sort((a, b) => a - b);
    const medianaDaRota = todas[Math.floor(todas.length / 2)];
    const peloAgregado = datasMaisBaratasDeAgregado(
      agruparPorData(obs),
      medianaDaRota,
    );

    expect(peloAgregado).toEqual(pelasCruas);
  });

  it("calendario", () => {
    const obs = historico();
    expect(montarCalendarioDeAgregado(agruparPorData(obs), DE, 14)).toEqual(
      montarCalendario(obs, DE, 14),
    );
  });

  it.each([7, 30, 45])("calendario com janela de %i dias", (janela) => {
    const obs = historico();
    expect(montarCalendarioDeAgregado(agruparPorData(obs), DE, janela)).toEqual(
      montarCalendario(obs, DE, janela),
    );
  });
});

describe("datas mais baratas a partir do agregado", () => {
  it("exige duas amostras na data: uma oferta nao e preco", () => {
    const r = datasMaisBaratasDeAgregado(
      [
        { partidaEm: "2027-02-03", precoMedianoBRL: 100, amostras: 1 },
        { partidaEm: "2027-02-04", precoMedianoBRL: 200, amostras: 2 },
      ],
      5000,
    );

    expect(r.datas.map((d) => d.partidaEm)).toEqual(["2027-02-04"]);
  });

  it("nao lista data mais cara que a referencia", () => {
    const r = datasMaisBaratasDeAgregado(
      [
        { partidaEm: "2027-03-01", precoMedianoBRL: 500, amostras: 4 },
        { partidaEm: "2027-03-02", precoMedianoBRL: 9000, amostras: 4 },
      ],
      1000,
    );

    expect(r.datas).toHaveLength(1);
    expect(r.datas[0].partidaEm).toBe("2027-03-01");
    expect(r.datas[0].economiaBRL).toBe(500);
    expect(r.datas[0].economiaPct).toBeCloseTo(50, 1);
  });

  it("sem referencia valida, nao inventa economia", () => {
    // Rota sem historico: a mediana vem zero, e dividir por ela daria
    // Infinity em "voce economiza X%".
    const r = datasMaisBaratasDeAgregado(
      [{ partidaEm: "2027-03-01", precoMedianoBRL: 500, amostras: 4 }],
      0,
    );

    expect(r).toEqual({ referenciaBRL: 0, datas: [] });
  });

  it("respeita o limite, do mais economico para o menos", () => {
    const dados = Array.from({ length: 10 }, (_, i) => ({
      partidaEm: `2027-05-${String(i + 1).padStart(2, "0")}`,
      precoMedianoBRL: 900 - i * 50,
      amostras: 3,
    }));

    const r = datasMaisBaratasDeAgregado(dados, 1000, 3);

    expect(r.datas).toHaveLength(3);
    expect(r.datas.map((d) => d.precoBRL)).toEqual([450, 500, 550]);
  });
});
