import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  deltaDeLongitude,
  grandeCirculo,
  projetar,
  type Vista,
} from "@/lib/globo/projecao";

const raiz = path.resolve(import.meta.dirname, "..");
const GRU = [-23.43, -46.48] as const;
const LIS = [38.77, -9.13] as const;

describe("projecao do globo", () => {
  const vista: Vista = { lam: -46.48, phi: -23.43, R: 100, cx: 200, cy: 300 };

  it("o ponto para onde o globo olha cai no centro do disco", () => {
    const p = projetar(vista, GRU);
    expect(p.x).toBeCloseTo(200, 6);
    expect(p.y).toBeCloseTo(300, 6);
    expect(p.frente).toBeCloseTo(1, 6);
  });

  it("norte fica para cima e leste para a direita", () => {
    const norte = projetar(vista, [GRU[0] + 10, GRU[1]]);
    const leste = projetar(vista, [GRU[0], GRU[1] + 10]);
    expect(norte.y).toBeLessThan(300);
    expect(leste.x).toBeGreaterThan(200);
  });

  it("o outro lado do planeta fica escondido", () => {
    expect(projetar(vista, [23.43, 133.52]).frente).toBeLessThan(0);
  });
});

describe("arco da rota", () => {
  const caminho = grandeCirculo(GRU, LIS);

  it("comeca na origem e termina no destino", () => {
    expect(caminho(0)[0]).toBeCloseTo(GRU[0], 6);
    expect(caminho(0)[1]).toBeCloseTo(GRU[1], 6);
    expect(caminho(1)[0]).toBeCloseTo(LIS[0], 6);
    expect(caminho(1)[1]).toBeCloseTo(LIS[1], 6);
  });

  it("o meio do caminho fica no Atlantico, entre os dois", () => {
    const [lat, lon] = caminho(0.5);
    expect(lat).toBeGreaterThan(GRU[0]);
    expect(lat).toBeLessThan(LIS[0]);
    expect(lon).toBeGreaterThan(GRU[1]);
    expect(lon).toBeLessThan(LIS[1]);
  });

  it("o globo gira pelo lado mais curto", () => {
    expect(deltaDeLongitude(170, -170)).toBe(20);
    expect(deltaDeLongitude(-170, 170)).toBe(-20);
    expect(deltaDeLongitude(-46, -9)).toBe(37);
  });
});

describe("os pontos do globo acompanham a base de aeroportos", () => {
  it("mesmo numero de aeroportos e mesmas coordenadas (1 casa)", () => {
    const { aeroportos } = JSON.parse(
      readFileSync(path.join(raiz, "data", "aeroportos.json"), "utf8"),
    ) as { aeroportos: { lat: number; lon: number }[] };
    const pontos = JSON.parse(
      readFileSync(path.join(raiz, "public", "globo", "aeroportos.json"), "utf8"),
    ) as number[];

    // Fora de sincronia: rode `node scripts/gerar-pontos-do-globo.mjs`.
    expect(pontos.length).toBe(aeroportos.length * 2);
    aeroportos.forEach((a, i) => {
      expect(pontos[i * 2]).toBe(Math.round(a.lat * 10) / 10);
      expect(pontos[i * 2 + 1]).toBe(Math.round(a.lon * 10) / 10);
    });
  });
});

describe("rotacao livre (quaternios)", async () => {
  const r = await import("@/lib/globo/rotacao");
  const { projetar: projetarAntigo } = await import("@/lib/globo/projecao");

  it("centrar em um ponto e o mesmo que a projecao antiga por lat/lon", () => {
    const centro = [-12, -38] as const;
    const livre = { q: r.orientacaoCentradaEm(centro), R: 150, cx: 200, cy: 300 };
    const antiga = { lam: centro[1], phi: centro[0], R: 150, cx: 200, cy: 300 };
    for (const ponto of [[-23.4, -46.5], [38.8, -9.1], [0, 0], [60, -100], [-50, 20]] as const) {
      const a = r.projetarLivre(livre, ponto);
      const b = projetarAntigo(antiga, ponto);
      expect(a.x).toBeCloseTo(b.x, 6);
      expect(a.y).toBeCloseTo(b.y, 6);
      expect(a.frente).toBeCloseTo(b.frente, 6);
    }
  });

  it("o ponto sob o dedo acompanha o dedo, em qualquer direcao", () => {
    const R = 100;
    for (const [dx, dy] of [[30, 0], [0, 30], [20, -20], [-25, 10]] as const) {
      const q = r.rotacaoDoArraste(dx, dy, R);
      // o centro do disco (o ponto de frente) se move na direcao do arraste
      const [, y, z] = r.girar(q, [1, 0, 0]);
      expect(Math.sign(y * R)).toBe(Math.sign(dx) || Math.sign(y * R));
      expect(Math.sign(-z * R)).toBe(Math.sign(dy) || Math.sign(-z * R));
    }
  });

  it("slerp vai pelo caminho mais curto e chega no destino", () => {
    const a = r.orientacaoCentradaEm([0, 170]);
    const b = r.orientacaoCentradaEm([0, -170]);
    const meio = r.slerp(a, b, 0.5);
    const frente = r.girar(meio, r.vetorDe([0, 180]));
    expect(frente[0]).toBeCloseTo(1, 5); // no meio do caminho curto, 180 graus fica de frente
    const fim = r.slerp(a, b, 1);
    expect(r.girar(fim, r.vetorDe([0, -170]))[0]).toBeCloseTo(1, 5);
  });
});
