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
