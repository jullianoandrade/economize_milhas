import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Bug real (24/11/2026): na rota com data, os textos .sr-only (absolute)
 * dos dias escapavam da faixa rolavel e esticavam a pagina para 2358px
 * num celular de 412 -- a tela afastava e o toque em "Ver passagem"
 * caia no lugar errado. Container de rolagem precisa conter os absolutos.
 */
describe("faixa rolavel", () => {
  it("prende os filhos absolutos (position: relative)", () => {
    const css = readFileSync(path.resolve(import.meta.dirname, "..", "app", "globals.css"), "utf8");
    const regra = css.match(/\.faixa-rolante \{[^}]*\}/)?.[0] ?? "";
    expect(regra).toMatch(/position:\s*relative/);
  });
});
