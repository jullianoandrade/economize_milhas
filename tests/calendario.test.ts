import { describe, expect, it } from "vitest";
import {
  DIAS_MINIMOS_PARA_MOSTRAR,
  montarCalendario,
} from "@/lib/tempo/calendario";
import type { ObservacaoDatada } from "@/lib/tempo/flexibilidade";

const DE = new Date("2026-05-01T12:00:00");

function obs(partidaEm: string, precoBRL: number): ObservacaoDatada {
  return { partidaEm, precoBRL };
}

describe("montarCalendario", () => {
  it("cobre a janela inteira, inclusive os dias sem observacao", () => {
    const c = montarCalendario([obs("2026-05-03", 800)], DE, 10);

    expect(c.dias).toHaveLength(10);
    expect(c.dias[0].dia).toBe("2026-05-01");
    expect(c.dias[9].dia).toBe("2026-05-10");
    expect(c.dias[0].nivel).toBe("sem-dado");
    expect(c.dias[2].precoBRL).toBe(800);
  });

  it("ignora observacao fora da janela", () => {
    const c = montarCalendario(
      [obs("2026-04-20", 500), obs("2026-05-02", 900)],
      DE,
      5,
    );

    expect(c.diasComDado).toBe(1);
    expect(c.maisBarato?.precoBRL).toBe(900);
  });

  it("usa a mediana do dia, nao a menor tarifa dele", () => {
    // A menor tarifa de um dia costuma ser um assento unico que some
    // antes de alguem comprar -- usa-la faria o grafico prometer um
    // preco que nao existe mais.
    const c = montarCalendario(
      [
        obs("2026-05-02", 400),
        obs("2026-05-02", 900),
        obs("2026-05-02", 1000),
      ],
      DE,
      5,
    );

    expect(c.dias[1].precoBRL).toBe(900);
  });

  it("classifica em relacao a mediana da janela", () => {
    const observacoes = [
      obs("2026-05-01", 1000),
      obs("2026-05-02", 1000),
      obs("2026-05-03", 1000),
      obs("2026-05-04", 600),
      obs("2026-05-05", 1500),
    ];

    const c = montarCalendario(observacoes, DE, 7);

    expect(c.medianaBRL).toBe(1000);
    expect(c.dias[3].nivel).toBe("barato");
    expect(c.dias[4].nivel).toBe("caro");
    expect(c.dias[0].nivel).toBe("medio");
    expect(c.dias[3].diferencaBRL).toBe(-400);
  });

  it("aponta o dia mais barato da janela", () => {
    const c = montarCalendario(
      [obs("2026-05-02", 900), obs("2026-05-06", 450), obs("2026-05-09", 700)],
      DE,
      14,
    );

    expect(c.maisBarato?.dia).toBe("2026-05-06");
    expect(c.maisBarato?.precoBRL).toBe(450);
  });

  it("sem observacao nenhuma, nao inventa mediana nem destaque", () => {
    const c = montarCalendario([], DE, 10);

    expect(c.diasComDado).toBe(0);
    expect(c.medianaBRL).toBe(0);
    expect(c.maisBarato).toBeNull();
    expect(c.dias.every((d) => d.nivel === "sem-dado")).toBe(true);
    // E o componente precisa ter como saber que nao vale desenhar.
    expect(c.diasComDado).toBeLessThan(DIAS_MINIMOS_PARA_MOSTRAR);
  });

  it("descarta preco invalido em vez de deixar zero entrar na conta", () => {
    const c = montarCalendario(
      [obs("2026-05-02", 0), obs("2026-05-03", -10), obs("2026-05-04", 800)],
      DE,
      7,
    );

    expect(c.diasComDado).toBe(1);
    expect(c.medianaBRL).toBe(800);
  });
});
