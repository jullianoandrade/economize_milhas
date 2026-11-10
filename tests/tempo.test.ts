import { describe, expect, it } from "vitest";
import { classificarRota } from "@/lib/milhas/regioes";
import {
  calcularSazonalidade,
  curvaEstimada,
} from "@/lib/tempo/sazonalidade";
import {
  curvaDeAntecedencia,
  janelaDeCompra,
  janelaDeCompraDaCurva,
  type Observacao,
} from "@/lib/tempo/antecedencia";

const rota = (o: string, d: string) => classificarRota(o, d);

describe("sazonalidade", () => {
  it("a curva estimada cobre os 12 meses", () => {
    const curva = curvaEstimada(3000);
    expect(curva).toHaveLength(12);
    expect(curva.every((m) => m.precoBRL > 0)).toBe(true);
  });

  it("o índice brasileiro encarece janeiro, julho e dezembro", () => {
    const curva = curvaEstimada(1000);
    const preco = (mes: number) => curva.find((m) => m.mes === mes)!.precoBRL;

    for (const alta of [1, 7, 12]) {
      for (const baixa of [3, 4, 5, 9]) {
        expect(preco(alta), `mês ${alta} vs ${baixa}`).toBeGreaterThan(
          preco(baixa),
        );
      }
    }
  });

  it("aponta o mês mais barato em dinheiro", () => {
    const s = calcularSazonalidade(
      rota("GRU", "LIS"),
      curvaEstimada(3000),
      "smiles",
    )!;
    const maisBarato = s.meses.reduce((a, b) =>
      b.precoBRL < a.precoBRL ? b : a,
    );
    expect(s.mesMaisBaratoEmDinheiro.mes).toBe(maisBarato.mes);
  });

  it("a inversão existe: o melhor mês para milhas não é o mais barato", () => {
    // O coração educativo do app. A tabela de milhas tem piso e teto, então
    // na baixa temporada você paga o mínimo por uma passagem barata, e na
    // alta cada milha compra muito mais. Se isso deixar de valer, o texto
    // que o app ensina precisa ser reescrito junto.
    const s = calcularSazonalidade(
      rota("GRU", "LIS"),
      curvaEstimada(3000),
      "smiles",
    )!;

    expect(s.mesesCoincidem).toBe(false);
    expect(s.mesComMelhorResgate.precoBRL).toBeGreaterThan(
      s.mesMaisBaratoEmDinheiro.precoBRL,
    );
    expect(s.explicacao).toContain("milhas");
  });

  it("o mês de melhor resgate é mesmo o de maior valor extraído", () => {
    const s = calcularSazonalidade(
      rota("GRU", "LIS"),
      curvaEstimada(3000),
      "smiles",
    )!;
    const maior = Math.max(
      ...s.meses.map((m) => m.valorExtraidoPorMilheiroBRL),
    );
    expect(s.mesComMelhorResgate.valorExtraidoPorMilheiroBRL).toBe(maior);
  });

  it("devolve nulo para programa que não atende a rota", () => {
    expect(
      calcularSazonalidade(rota("GRU", "SDU"), curvaEstimada(400), "tapmilesgo"),
    ).toBeNull();
  });

  it("devolve nulo com menos de dois meses: não dá para formar curva", () => {
    expect(
      calcularSazonalidade(rota("GRU", "LIS"), [{ mes: 5, precoBRL: 3000 }], "smiles"),
    ).toBeNull();
  });
});

describe("curva de antecedência", () => {
  it("agrupa em faixas e usa a mediana", () => {
    const obs: Observacao[] = [
      { antecedenciaDias: 1, precoBRL: 100 },
      { antecedenciaDias: 2, precoBRL: 200 },
      { antecedenciaDias: 3, precoBRL: 9000 }, // outlier
      { antecedenciaDias: 40, precoBRL: 500 },
    ];
    const curva = curvaDeAntecedencia(obs, 15);

    const primeira = curva.find((f) => f.dias === 0)!;
    expect(primeira.amostras).toBe(3);
    // Mediana de [100, 200, 9000] e 200: o outlier nao sequestra a faixa.
    expect(primeira.precoMedianoBRL).toBe(200);
  });

  it("descarta observação com preço ou antecedência inválidos", () => {
    const curva = curvaDeAntecedencia([
      { antecedenciaDias: -5, precoBRL: 100 },
      { antecedenciaDias: 10, precoBRL: 0 },
      { antecedenciaDias: 10, precoBRL: 300 },
    ]);
    expect(curva).toHaveLength(1);
    expect(curva[0].amostras).toBe(1);
  });
});

describe("janela de compra", () => {
  it("sem histórico, usa a heurística de mercado", () => {
    const j = janelaDeCompra(true, null, []);
    expect(j.fonte).toBe("heuristica");
    expect(j.diasMin).toBe(60);
    expect(j.diasMax).toBe(120);
  });

  it("doméstico e internacional têm janelas diferentes", () => {
    expect(janelaDeCompra(false, null, []).diasMin).toBeLessThan(
      janelaDeCompra(true, null, []).diasMin,
    );
  });

  it("manda esperar quando falta muito para o voo", () => {
    const j = janelaDeCompra(true, 300, []);
    expect(j.veredito).toBe("esperar");
    expect(j.esperarDias).toBe(300 - j.diasMax);
    expect(j.explicacao).toContain("cedo");
  });

  it("manda comprar quando está dentro da janela", () => {
    const j = janelaDeCompra(true, 90, []);
    expect(j.veredito).toBe("comprar-agora");
  });

  it("avisa quando a janela já passou", () => {
    const j = janelaDeCompra(true, 5, []);
    expect(j.veredito).toBe("janela-passou");
    expect(j.explicacao).toContain("já passou");
  });

  it("ignora histórico ralo: três observações não formam curva", () => {
    const j = janelaDeCompra(true, null, [
      { antecedenciaDias: 10, precoBRL: 100 },
      { antecedenciaDias: 50, precoBRL: 200 },
      { antecedenciaDias: 90, precoBRL: 300 },
    ]);
    expect(j.fonte).toBe("heuristica");
  });

  it("com histórico suficiente, troca a heurística pela curva própria", () => {
    // Curva artificial em que 60 dias e o fundo do poco.
    const obs: Observacao[] = [];
    const precoPorFaixa: Record<number, number> = {
      0: 3000, 15: 2500, 30: 2000, 45: 1600, 60: 1200, 75: 1500, 90: 1900,
    };
    for (const [dias, preco] of Object.entries(precoPorFaixa)) {
      for (let i = 0; i < 10; i++) {
        obs.push({ antecedenciaDias: Number(dias) + i % 15, precoBRL: preco });
      }
    }

    const j = janelaDeCompra(true, null, obs);
    expect(j.fonte).toBe("curva-propria");
    expect(j.diasOtimo).toBe(60);
    // Economia entre o pior momento (3000) e o melhor (1200) = 60%.
    expect(j.economiaEstimadaPct).toBeCloseTo(60, 0);
    expect(j.explicacao).toContain("observações");
  });
});

/**
 * A curva passou a ser agrupada no banco (ver a migration de agregados
 * e lib/historico.ts). O agrupamento mudou de lugar; a regra de produto
 * -- amostras minimas, faixas minimas, onde fica o fundo do poco -- nao
 * podia mudar junto.
 */
describe("janela de compra a partir de curva ja agrupada", () => {
  const PRECO_POR_FAIXA: Record<number, number> = {
    0: 3000, 15: 2500, 30: 2000, 45: 1600, 60: 1200, 75: 1500, 90: 1900,
  };

  const brutas: Observacao[] = Object.entries(PRECO_POR_FAIXA).flatMap(
    ([dias, preco]) =>
      Array.from({ length: 10 }, (_, i) => ({
        antecedenciaDias: Number(dias) + (i % 15),
        precoBRL: preco,
      })),
  );

  it("dá o mesmo resultado que agrupar em JavaScript", () => {
    const pelaCurva = janelaDeCompraDaCurva(
      true,
      null,
      curvaDeAntecedencia(brutas),
      brutas.length,
    );
    const pelasObservacoes = janelaDeCompra(true, null, brutas);

    expect(pelaCurva).toEqual(pelasObservacoes);
  });

  it("conta as observações que a curva representa, não as faixas", () => {
    // O numero vai para a tela ("Baseado em N observações desta rota").
    // Somar faixas em vez de amostras diria "7 observações" para um
    // historico de 70 -- e procedencia e exatamente o que nao pode
    // sair errado.
    const curva = curvaDeAntecedencia(brutas);
    const j = janelaDeCompraDaCurva(true, null, curva, brutas.length);

    expect(curva.length).toBe(7);
    expect(j.observacoes).toBe(70);
  });

  it("curva vazia cai na heurística de mercado", () => {
    const j = janelaDeCompraDaCurva(true, null, [], 0);
    expect(j.fonte).toBe("heuristica");
  });

  it("faixa com amostra rala não conta para o mínimo de faixas", () => {
    // Quatro faixas, mas tres delas com uma amostra so: abaixo do corte
    // de oito, sobra uma faixa valida e a curva nao se forma.
    const j = janelaDeCompraDaCurva(
      true,
      null,
      [
        { dias: 0, precoMedianoBRL: 3000, amostras: 1 },
        { dias: 15, precoMedianoBRL: 2000, amostras: 1 },
        { dias: 30, precoMedianoBRL: 1000, amostras: 1 },
        { dias: 45, precoMedianoBRL: 1500, amostras: 40 },
      ],
      43,
    );
    expect(j.fonte).toBe("heuristica");
  });
});
