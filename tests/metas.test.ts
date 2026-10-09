import { describe, expect, it } from "vitest";
import {
  calcularProgresso,
  paraIso,
  serieDoProgresso,
  type Meta,
} from "@/lib/metas/progresso";

/**
 * O que esta sendo protegido aqui nao e aritmetica -- e a honestidade do
 * numero. Um objetivo que inventa ritmo a partir de dois registros
 * colados, ou que chama projecao de medicao, e pior do que um objetivo
 * que admite nao saber.
 */

function metaBase(parcial: Partial<Meta> = {}): Meta {
  return {
    id: "m1",
    origemIata: "GRU",
    destinoIata: "LIS",
    destinoCidade: "Lisboa",
    programaId: "smiles",
    programaNome: "Smiles",
    milhasNecessarias: 60000,
    precoDaPassagemBRL: 2480,
    criadaEm: "2026-01-10",
    dataAlvo: null,
    ritmoMensalEstimado: 5000,
    registros: [{ em: "2026-01-10", saldo: 10000 }],
    ...parcial,
  };
}

const HOJE = new Date("2026-04-10T12:00:00");

describe("calcularProgresso", () => {
  it("usa o primeiro registro como ponto de partida, nao o saldo atual", () => {
    const meta = metaBase({
      registros: [
        { em: "2026-01-10", saldo: 10000 },
        { em: "2026-04-10", saldo: 34000 },
      ],
    });

    const p = calcularProgresso(meta, HOJE);

    expect(p.pontoDePartida).toBe(10000);
    expect(p.saldoAtual).toBe(34000);
    expect(p.ganhoDesdeOInicio).toBe(24000);
    expect(p.milhasFaltando).toBe(26000);
  });

  it("recusa medir ritmo quando os registros estao perto demais", () => {
    // Quem ganhou 3.000 milhas em dois dias nao acumula 45.000 por mes.
    const meta = metaBase({
      registros: [
        { em: "2026-04-08", saldo: 10000 },
        { em: "2026-04-10", saldo: 13000 },
      ],
    });

    const p = calcularProgresso(meta, HOJE);

    expect(p.ritmoRealMensal).toBeNull();
    // Sem medicao, cai na projecao do plano -- e a tela precisa poder
    // dizer qual dos dois esta mostrando.
    expect(p.ritmoConsiderado).toBe(5000);
    expect(p.resumo).toContain("projetado");
  });

  it("mede o ritmo real quando a janela e longa o bastante", () => {
    const meta = metaBase({
      registros: [
        { em: "2026-01-10", saldo: 10000 },
        { em: "2026-04-10", saldo: 34000 },
      ],
    });

    const p = calcularProgresso(meta, HOJE);

    // 24.000 milhas em 90 dias: por volta de 8.100 por mes.
    expect(p.ritmoRealMensal).toBeGreaterThan(7800);
    expect(p.ritmoRealMensal).toBeLessThan(8400);
    expect(p.resumo).toContain("real");
  });

  it("o ritmo medido prevalece sobre a projecao do plano", () => {
    const meta = metaBase({
      ritmoMensalEstimado: 20000,
      registros: [
        { em: "2026-01-10", saldo: 10000 },
        { em: "2026-04-10", saldo: 13000 },
      ],
    });

    const p = calcularProgresso(meta, HOJE);

    expect(p.ritmoRealMensal).not.toBeNull();
    expect(p.ritmoConsiderado).toBe(p.ritmoRealMensal);
    expect(p.ritmoConsiderado).toBeLessThan(20000);
  });

  it("marca como atrasada e diz o ritmo necessario", () => {
    const meta = metaBase({
      dataAlvo: "2026-07-10",
      ritmoMensalEstimado: 2000,
    });

    const p = calcularProgresso(meta, HOJE);

    expect(p.situacao).toBe("atrasada");
    expect(p.ritmoNecessarioMensal).not.toBeNull();
    expect(p.ritmoNecessarioMensal!).toBeGreaterThan(2000);
    expect(p.resumo).toContain("por mês");
  });

  it("marca como adiantada quando sobra folga sobre a data", () => {
    const meta = metaBase({
      dataAlvo: "2027-12-10",
      ritmoMensalEstimado: 10000,
    });

    expect(calcularProgresso(meta, HOJE).situacao).toBe("adiantada");
  });

  it("sem fonte de acumulo nenhuma, o objetivo nao ganha data", () => {
    const meta = metaBase({ ritmoMensalEstimado: 0 });
    const p = calcularProgresso(meta, HOJE);

    expect(p.situacao).toBe("parada");
    expect(p.mesesRestantes).toBeNull();
    expect(p.chegadaPrevistaEm).toBeNull();
  });

  it("saldo acima da meta nao passa de 100%", () => {
    const meta = metaBase({
      registros: [{ em: "2026-01-10", saldo: 90000 }],
    });
    const p = calcularProgresso(meta, HOJE);

    expect(p.percentual).toBe(100);
    expect(p.milhasFaltando).toBe(0);
    expect(p.situacao).toBe("concluida");
  });

  it("ordena os registros por data, nao pela ordem de insercao", () => {
    const meta = metaBase({
      registros: [
        { em: "2026-04-10", saldo: 34000 },
        { em: "2026-01-10", saldo: 10000 },
      ],
    });

    expect(calcularProgresso(meta, HOJE).pontoDePartida).toBe(10000);
  });
});

describe("serieDoProgresso", () => {
  it("separa o que foi registrado do que e projecao", () => {
    const meta = metaBase({
      registros: [
        { em: "2026-01-10", saldo: 10000 },
        { em: "2026-04-10", saldo: 34000 },
      ],
    });

    const { pontos } = serieDoProgresso(meta, HOJE);

    expect(pontos.filter((p) => !p.projetado)).toHaveLength(2);

    const projecao = pontos.filter((p) => p.projetado);
    expect(projecao).toHaveLength(1);
    expect(projecao[0].saldo).toBe(meta.milhasNecessarias);
  });

  it("objetivo concluido nao ganha ponto projetado", () => {
    const meta = metaBase({
      registros: [{ em: "2026-01-10", saldo: 60000 }],
    });

    const { pontos } = serieDoProgresso(meta, HOJE);
    expect(pontos.every((p) => !p.projetado)).toBe(true);
  });
});

describe("paraIso", () => {
  it("devolve a data local, sem escorregar de dia pelo fuso", () => {
    expect(paraIso(new Date("2026-04-10T12:00:00"))).toBe("2026-04-10");
  });
});
