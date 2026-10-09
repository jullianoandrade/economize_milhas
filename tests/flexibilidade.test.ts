import { describe, expect, it } from "vitest";
import {
  aeroportosAlternativos,
  compararOrigens,
  datasMaisBaratas,
  type ObservacaoDatada,
} from "@/lib/tempo/flexibilidade";
import { aeroportoPorIata } from "@/lib/milhas/regioes";

const gru = aeroportoPorIata("GRU")!;

describe("datas mais baratas", () => {
  it("sem observações, não inventa nada", () => {
    expect(datasMaisBaratas([])).toEqual({ referenciaBRL: 0, datas: [] });
  });

  it("encontra os dias abaixo da mediana da rota", () => {
    const obs: ObservacaoDatada[] = [
      { partidaEm: "2027-01-10", precoBRL: 3000 },
      { partidaEm: "2027-01-10", precoBRL: 3000 },
      { partidaEm: "2027-01-15", precoBRL: 1000 },
      { partidaEm: "2027-01-15", precoBRL: 1000 },
      { partidaEm: "2027-01-20", precoBRL: 2000 },
      { partidaEm: "2027-01-20", precoBRL: 2000 },
    ];
    const r = datasMaisBaratas(obs);

    expect(r.referenciaBRL).toBe(2000);
    expect(r.datas[0].partidaEm).toBe("2027-01-15");
    expect(r.datas[0].economiaBRL).toBe(1000);
    expect(r.datas[0].economiaPct).toBeCloseTo(50, 1);
  });

  it("ignora data com uma única observação: uma amostra não é preço", () => {
    const obs: ObservacaoDatada[] = [
      { partidaEm: "2027-02-01", precoBRL: 5000 },
      { partidaEm: "2027-02-02", precoBRL: 5000 },
      { partidaEm: "2027-02-03", precoBRL: 100 },
    ];
    expect(datasMaisBaratas(obs).datas).toEqual([]);
  });

  it("não lista dias mais caros que a referência", () => {
    const obs: ObservacaoDatada[] = [
      { partidaEm: "2027-03-01", precoBRL: 1000 },
      { partidaEm: "2027-03-01", precoBRL: 1000 },
      { partidaEm: "2027-03-02", precoBRL: 9000 },
      { partidaEm: "2027-03-02", precoBRL: 9000 },
    ];
    const r = datasMaisBaratas(obs);
    expect(r.datas.every((d) => d.economiaBRL > 0)).toBe(true);
  });

  it("usa a mediana, então um outlier caro não desloca a referência", () => {
    const obs: ObservacaoDatada[] = [
      ...Array.from({ length: 10 }, () => ({
        partidaEm: "2027-04-01",
        precoBRL: 1000,
      })),
      { partidaEm: "2027-04-02", precoBRL: 500000 },
      { partidaEm: "2027-04-02", precoBRL: 500000 },
    ];
    expect(datasMaisBaratas(obs).referenciaBRL).toBe(1000);
  });

  it("respeita o limite de resultados", () => {
    const obs: ObservacaoDatada[] = [];
    for (let d = 1; d <= 20; d++) {
      const dia = String(d).padStart(2, "0");
      obs.push({ partidaEm: `2027-05-${dia}`, precoBRL: 3000 - d * 50 });
      obs.push({ partidaEm: `2027-05-${dia}`, precoBRL: 3000 - d * 50 });
    }
    expect(datasMaisBaratas(obs, 3).datas).toHaveLength(3);
  });
});

describe("aeroportos alternativos", () => {
  const alternativos = aeroportosAlternativos(gru);
  const codigos = alternativos.map((a) => a.iata);

  it("inclui os outros aeroportos da mesma cidade", () => {
    // Guarulhos, Congonhas e Viracopos servem Sao Paulo.
    expect(codigos).toContain("CGH");
    expect(codigos).toContain("VCP");
  });

  it("não inclui o próprio aeroporto", () => {
    expect(codigos).not.toContain("GRU");
  });

  it("não puxa aeroporto de outra região", () => {
    expect(codigos).not.toContain("GIG");
    expect(codigos).not.toContain("LIS");
  });

  it("vem ordenado do mais perto para o mais longe", () => {
    expect(alternativos.length).toBeGreaterThan(1);
  });
});

describe("comparação de origens", () => {
  const cgh = aeroportoPorIata("CGH")!;
  const vcp = aeroportoPorIata("VCP")!;

  it("só lista alternativa que economiza", () => {
    const r = compararOrigens(gru, 2000, [
      { aeroporto: vcp, precoBRL: 1500 },
      { aeroporto: cgh, precoBRL: 2500 },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].aeroporto.iata).toBe("VCP");
    expect(r[0].economiaBRL).toBe(500);
  });

  it("ignora alternativa sem preço conhecido", () => {
    expect(compararOrigens(gru, 2000, [{ aeroporto: vcp, precoBRL: null }])).toEqual(
      [],
    );
  });

  it("ordena pela maior economia", () => {
    const r = compararOrigens(gru, 3000, [
      { aeroporto: cgh, precoBRL: 2800 },
      { aeroporto: vcp, precoBRL: 2000 },
    ]);
    expect(r.map((a) => a.aeroporto.iata)).toEqual(["VCP", "CGH"]);
  });

  it("informa a distância até a alternativa", () => {
    const r = compararOrigens(gru, 2000, [{ aeroporto: vcp, precoBRL: 1500 }]);
    // Guarulhos a Viracopos sao cerca de 90 km em linha reta.
    expect(r[0].distanciaKm).toBeGreaterThan(50);
    expect(r[0].distanciaKm).toBeLessThan(150);
  });
});
