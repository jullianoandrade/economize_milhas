import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return arquivos(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

/**
 * Regras de produto da identidade VoeMilo que sao faceis de quebrar sem
 * ninguem perceber -- nada "quebra" na tela, so a promessa.
 */
describe("o Milo fica fora da tela de decisao", () => {
  /*
   * A resposta da rota e conselho financeiro ("use milhas, economize
   * R$ 823"). Personagem ao lado desse numero enfraquece a parte que
   * precisa ser levada a serio. Ver components/ui/Milo.tsx.
   */
  it("nenhum arquivo da tela de rota importa o Milo", () => {
    const daRota = arquivos(path.join(raiz, "app", "(app)", "rota"));
    const comMilo = daRota.filter((f) =>
      /from "@\/components\/ui\/Milo"/.test(readFileSync(f, "utf8")),
    );
    expect(comMilo.map((f) => path.relative(raiz, f))).toEqual([]);
  });
});

describe("o selo de origem cobre os quatro casos", () => {
  const fonte = readFileSync(
    path.join(raiz, "components", "ui", "SeloDeOrigem.tsx"),
    "utf8",
  );

  it.each(["real", "estimado", "informado", "desatualizado"])(
    "%s tem icone proprio, e nao so cor",
    (origem) => {
      expect(fonte).toContain(`case "${origem}":`);
    },
  );
});

describe("o painel marinho continua marinho", () => {
  /*
   * Em 17/11/2026 uma edicao do CSS trocou o seletor errado e o vidro
   * passou a pintar o .painel: o bloco "Ainda nao tem as milhas?" ficou
   * com texto creme sobre fundo quase branco. Nenhum teste de contraste
   * pega isso, porque eles medem tokens, e o token --painel continuava
   * certo -- quem mudou foi a regra que o usa.
   */
  it("so a regra do proprio .painel define o fundo dele", () => {
    const css = readFileSync(path.join(raiz, "app", "globals.css"), "utf8");
    const regras = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map(([, seletor, corpo]) => ({ seletor: seletor.replace(/\/\*[\s\S]*?\*\//g, "").trim(), corpo }))
      .filter((r) => r.seletor.split(",").some((s) => s.trim() === ".painel"))
      .filter((r) => /(^|[\s;])background\s*:/.test(r.corpo));

    expect(regras.map((r) => r.corpo.match(/background\s*:\s*([^;]+)/)?.[1].trim())).toEqual([
      "var(--painel)",
    ]);
  });
});
