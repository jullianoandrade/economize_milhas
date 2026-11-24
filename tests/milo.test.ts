import { describe, expect, it } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import poses from "@/lib/milo/poses.json";

/**
 * A arte final do Milo entra por scripts/preparar-milo.mjs. Este teste
 * garante que o registro e os arquivos andam juntos: pose registrada sem
 * arquivo vira imagem quebrada; arquivo sem registro e peso morto.
 */
const raiz = path.resolve(import.meta.dirname, "..");
const pasta = path.join(raiz, "public", "milo");
const POSES = ["apontando", "rosto", "comemorando", "esperando", "pensando"];
const registradas = poses as Record<string, { arquivo: string; largura: number; altura: number }>;

describe("as poses do Milo", () => {
  it("so poses conhecidas, cada uma com o arquivo no lugar", () => {
    for (const [pose, arte] of Object.entries(registradas)) {
      expect(POSES).toContain(pose);
      expect(arte.arquivo.startsWith(`${pose}-`)).toBe(true);
      expect(existsSync(path.join(pasta, arte.arquivo)), arte.arquivo).toBe(true);
      expect(arte.largura).toBeGreaterThan(0);
      expect(arte.altura).toBeGreaterThan(0);
    }
  });

  it("nenhum arquivo de pose sobrando sem registro", () => {
    const usados = new Set(Object.values(registradas).map((a) => a.arquivo));
    const soltos = readdirSync(pasta).filter((f) => f.endsWith(".webp") && !usados.has(f));
    expect(soltos).toEqual([]);
  });
});
