import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { limpar, registrar, semSegredos } from "@/lib/log";
import { corpoDoErroDoCliente } from "@/lib/seguranca/esquemas";

const raiz = path.resolve(import.meta.dirname, "..");

afterEach(() => vi.restoreAllMocks());

describe("registro de eventos", () => {
  it("escreve uma linha JSON com nivel, evento e hora", () => {
    const saida = vi.spyOn(console, "warn").mockImplementation(() => {});
    registrar("aviso", "provedor.falha", { provedor: "travelpayouts", status: 503 });
    const linha = JSON.parse(String(saida.mock.calls[0][0]));
    expect(linha).toMatchObject({ nivel: "aviso", evento: "provedor.falha", provedor: "travelpayouts", status: 503 });
    expect(Date.parse(linha.em)).not.toBeNaN();
  });

  it("erro vai para console.error e info para console.log", () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const info = vi.spyOn(console, "log").mockImplementation(() => {});
    registrar("erro", "x");
    registrar("info", "y");
    expect(erro).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledTimes(1);
  });
});

describe("nada sensivel chega ao log", () => {
  it("tira o token da URL da Travelpayouts", () => {
    const url = "https://api.travelpayouts.com/v2/prices?origin=GRU&token=abc123&currency=brl";
    expect(semSegredos(url)).not.toContain("abc123");
    expect(semSegredos(url)).toContain("origin=GRU");
  });

  it("omite campos com nome de segredo, em qualquer profundidade", () => {
    const limpo = limpar({ token: "x", dados: { senha: "y", apiKey: "z", ok: 1 } }) as Record<string, unknown>;
    expect(JSON.stringify(limpo)).not.toMatch(/"x"|"y"|"z"/);
    expect((limpo.dados as Record<string, unknown>).ok).toBe(1);
  });

  it("corta texto longo e transforma Error em nome e mensagem", () => {
    expect(String(limpar("a".repeat(2000))).length).toBeLessThan(510);
    expect(limpar(new TypeError("falhou"))).toEqual({ nome: "TypeError", mensagem: "falhou" });
  });
});

describe("relato de erro do navegador", () => {
  const base = {
    origem: "janela",
    mensagem: "x is undefined",
    pagina: "/rota/GRU/LIS",
    dispositivo: "celular",
    largura: 390,
  };

  it("aceita o relato e marca celular ou desktop", () => {
    expect(corpoDoErroDoCliente.safeParse(base).success).toBe(true);
    expect(corpoDoErroDoCliente.safeParse({ ...base, dispositivo: "desktop", largura: 1440 }).success).toBe(true);
    expect(corpoDoErroDoCliente.safeParse({ ...base, dispositivo: "tablet" }).success).toBe(false);
  });

  it("recusa pagina com query (pode carregar dado da pessoa) e mensagem gigante", () => {
    expect(corpoDoErroDoCliente.safeParse({ ...base, pagina: "/rota/GRU/LIS?data=2026-12-01" }).success).toBe(false);
    expect(corpoDoErroDoCliente.safeParse({ ...base, mensagem: "a".repeat(501) }).success).toBe(false);
  });
});

describe("nenhuma falha de provedor ou banco passa em silencio", () => {
  /*
   * A trava do motivo deste arquivo existir: estes modulos degradam sem
   * derrubar a tela -- e tem de continuar degradando --, mas cada
   * degradacao precisa deixar rastro.
   */
  it.each([
    ["lib/providers/travelpayouts.ts", "provedor.falha"],
    ["lib/historico.ts", "banco.falha"],
    ["lib/rotas-monitoradas.ts", "banco.falha"],
    ["lib/transferencias.ts", "banco.falha"],
    ["app/api/cron/snapshot/route.ts", "coleta.concluida"],
    ["app/api/interesse/route.ts", "banco.falha"],
    ["lib/seguranca/requisicao.ts", "limite.excedido"],
    ["instrumentation.ts", "servidor.erro"],
  ])("%s registra %s", (arquivo, evento) => {
    expect(readFileSync(path.join(raiz, arquivo), "utf8")).toContain(`"${evento}"`);
  });

  it("as duas telas de erro relatam o que aconteceu", () => {
    for (const arquivo of ["app/(app)/error.tsx", "app/global-error.tsx"]) {
      expect(readFileSync(path.join(raiz, arquivo), "utf8")).toContain("relatarErro(");
    }
  });
});
