import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ABAS, estaAtiva } from "@/components/casca/abas";
import config from "../next.config";

const raiz = path.resolve(import.meta.dirname, "..");

/**
 * A navegacao da direcao VoeMilo (17/11/2026): quatro abas, e cada tela
 * do app pertence a exatamente uma delas.
 */
describe("as quatro abas", () => {
  it("sao Inicio, Explorar, Carteira e Oportunidades, nessa ordem", () => {
    expect(ABAS.map((a) => [a.rotulo, a.href])).toEqual([
      ["Início", "/"],
      ["Explorar", "/explorar"],
      ["Carteira", "/carteira"],
      ["Oportunidades", "/oportunidades"],
    ]);
  });

  it.each([
    ["/", "/"],
    ["/explorar", "/explorar"],
    ["/rota/GRU/LIS", "/explorar"],
    ["/carteira", "/carteira"],
    ["/objetivos", "/carteira"],
    ["/oportunidades", "/oportunidades"],
  ])("%s marca a aba %s, e so ela", (tela, aba) => {
    const ativas = ABAS.filter((a) => estaAtiva(tela, a.href)).map((a) => a.href);
    expect(ativas).toEqual([aba]);
  });

  it("Aprender sai das abas mas continua alcancavel pelo rodape", () => {
    const rodape = readFileSync(path.join(raiz, "components", "casca", "Rodape.tsx"), "utf8");
    expect(rodape).toContain('href="/aprender"');
  });
});

describe("enderecos antigos nao quebram", () => {
  it("/promocoes redireciona de forma permanente para /oportunidades", async () => {
    const regras = (await config.redirects?.()) ?? [];
    expect(regras).toContainEqual({
      source: "/promocoes",
      destination: "/oportunidades",
      permanent: true,
    });
  });

  it("o sitemap aponta para os enderecos novos, nao para os antigos", () => {
    // Lido como texto: executar o sitemap consultaria o banco.
    const fonte = readFileSync(path.join(raiz, "app", "sitemap.ts"), "utf8");
    for (const novo of ["/explorar", "/carteira", "/oportunidades"]) {
      expect(fonte).toContain(`urlDoSite("${novo}")`);
    }
    expect(fonte).not.toContain('urlDoSite("/promocoes")');
  });
});
