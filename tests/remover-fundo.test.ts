import { describe, expect, it } from "vitest";
import { removerFundo } from "../scripts/lib/remover-fundo.mjs";

/** Quadro 40x40 branco com um "personagem": borda marrom e miolo claro. */
function quadro() {
  const w = 40;
  const h = 40;
  const data = Buffer.alloc(w * h * 4, 255);
  const pintar = (x: number, y: number, [r, g, b]: number[]) => {
    const i = (y * w + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  };
  for (let y = 10; y < 30; y++)
    for (let x = 10; x < 30; x++) {
      const borda = x === 10 || x === 29 || y === 10 || y === 29;
      pintar(x, y, borda ? [59, 38, 24] : [255, 255, 255]); // miolo branco = dente/brilho
    }
  return { data, width: w, height: h };
}

const alfa = (r: { data: Buffer; width: number }, x: number, y: number) => r.data[(y * r.width + x) * 4 + 3];

describe("remover o fundo das artes do Milo", () => {
  it("o fundo branco vindo das bordas some; o contorno fica", () => {
    const r = removerFundo(quadro());
    expect(alfa(r, 0, 0)).toBe(0);
    expect(alfa(r, 5, 20)).toBe(0);
    expect(alfa(r, 10, 20)).toBeGreaterThan(200);
  });

  it("branco FECHADO pelo contorno (dente, brilho do olho) fica, por padrao", () => {
    const r = removerFundo(quadro());
    expect(alfa(r, 20, 20)).toBe(255);
  });

  it("com vaosInternos, o vao fechado grande tambem sai", () => {
    const r = removerFundo(quadro(), { vaosInternos: true });
    expect(alfa(r, 20, 20)).toBe(0);
  });
});
