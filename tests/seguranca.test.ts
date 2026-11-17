import { describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { criarLimitador, REGRAS } from "@/lib/seguranca/limite";
import {
  consultaDoVeredito,
  corpoDoInteresse,
  corpoDoPlano,
} from "@/lib/seguranca/esquemas";
import {
  cabecalhosDeSeguranca,
  politicaDeConteudo,
} from "@/lib/seguranca/cabecalhos";

vi.mock("server-only", () => ({}));
const { lerCorpo } = await import("@/lib/seguranca/requisicao");

const raiz = path.resolve(import.meta.dirname, "..");

describe("limitador", () => {
  it("deixa passar ate o maximo e bloqueia o seguinte", () => {
    const t = 0;
    const verificar = criarLimitador(() => t);
    const regra = { maximo: 3, janelaMs: 1000 };
    expect(verificar("a", regra).permitido).toBe(true);
    expect(verificar("a", regra).permitido).toBe(true);
    expect(verificar("a", regra).permitido).toBe(true);
    const quarto = verificar("a", regra);
    expect(quarto.permitido).toBe(false);
    if (!quarto.permitido) expect(quarto.tenteEmSegundos).toBe(1);
  });

  it("chaves diferentes nao dividem a cota", () => {
    const verificar = criarLimitador(() => 0);
    const regra = { maximo: 1, janelaMs: 1000 };
    expect(verificar("a", regra).permitido).toBe(true);
    expect(verificar("b", regra).permitido).toBe(true);
    expect(verificar("a", regra).permitido).toBe(false);
  });

  it("a janela vence e a cota volta", () => {
    let t = 0;
    const verificar = criarLimitador(() => t);
    const regra = { maximo: 1, janelaMs: 1000 };
    verificar("a", regra);
    expect(verificar("a", regra).permitido).toBe(false);
    t = 1000;
    expect(verificar("a", regra).permitido).toBe(true);
  });

  it("o mesmo par so conta uma vez por IP dentro de 6 horas", () => {
    let t = 0;
    const verificar = criarLimitador(() => t);
    expect(verificar("ip:GRU-LIS", REGRAS.interessePorPar).permitido).toBe(true);
    t = 5 * 60 * 60 * 1000;
    expect(verificar("ip:GRU-LIS", REGRAS.interessePorPar).permitido).toBe(false);
    t = 6 * 60 * 60 * 1000;
    expect(verificar("ip:GRU-LIS", REGRAS.interessePorPar).permitido).toBe(true);
  });

  it("nao cresce sem limite com chaves novas (o proprio limitador nao vira vetor)", () => {
    const verificar = criarLimitador(() => 0);
    const regra = { maximo: 1, janelaMs: 1000 };
    for (let i = 0; i < 25_000; i++) verificar(`ip-${i}`, regra);
    // As primeiras foram descartadas: voltam a ter cota.
    expect(verificar("ip-0", regra).permitido).toBe(true);
    // As recentes continuam lembradas.
    expect(verificar("ip-24999", regra).permitido).toBe(false);
  });
});

describe("schemas de entrada", () => {
  it("IATA normaliza caixa e rejeita o que nao e tres letras", () => {
    expect(corpoDoInteresse.parse({ origem: " gru", destino: "lis" })).toEqual({
      origem: "GRU",
      destino: "LIS",
    });
    for (const ruim of ["GR", "GRUX", "G1U", "", 123, null]) {
      expect(corpoDoInteresse.safeParse({ origem: ruim, destino: "LIS" }).success).toBe(false);
    }
  });

  it("plano aceita o corpo que a tela de objetivos manda", () => {
    const corpo = {
      origem: "GRU",
      destino: "LIS",
      saldoMilhas: 12000,
      saldoPontosCoalizao: 0,
      gastoMensalCartaoBRL: 3500,
      cartaoId: null,
      aceitaClube: false,
    };
    expect(corpoDoPlano.safeParse(corpo).success).toBe(true);
  });

  it("plano recusa id com caractere fora do catalogo e numero absurdo", () => {
    const base = { origem: "GRU", destino: "LIS" };
    expect(corpoDoPlano.safeParse({ ...base, cartaoId: "../../etc" }).success).toBe(false);
    expect(corpoDoPlano.safeParse({ ...base, saldoMilhas: -1 }).success).toBe(false);
    expect(corpoDoPlano.safeParse({ ...base, saldoMilhas: 1e12 }).success).toBe(false);
  });

  it("consulta do veredito trata gasto e cartao invalidos como ausentes, sem 400", () => {
    const r = consultaDoVeredito.parse({
      origem: "gru",
      destino: "rec",
      gasto: "abc",
      cartaoId: "<script>",
    });
    expect(r).toEqual({ origem: "GRU", destino: "REC", gasto: 0, cartaoId: undefined });
  });
});

describe("leitura do corpo", () => {
  const post = (corpo: string, headers: Record<string, string> = {}) =>
    new Request("http://x/api", { method: "POST", body: corpo, headers });

  it("le e valida um corpo normal", async () => {
    const r = await lerCorpo(post('{"origem":"gru","destino":"lis"}'), corpoDoInteresse);
    expect(r.ok && r.dados).toEqual({ origem: "GRU", destino: "LIS" });
  });

  it("recusa corpo acima do teto mesmo sem content-length honesto", async () => {
    const grande = JSON.stringify({ origem: "GRU", destino: "LIS", x: "a".repeat(10_000) });
    const r = await lerCorpo(post(grande), corpoDoInteresse);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.resposta.status).toBe(413);
  });

  it("recusa JSON quebrado e formato errado com 400, sem vazar o schema", async () => {
    for (const corpo of ["{", '{"origem":"QQQQ"}']) {
      const r = await lerCorpo(post(corpo), corpoDoInteresse);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.resposta.status).toBe(400);
        expect(await r.resposta.json()).toEqual({ erro: "corpo invalido" });
      }
    }
  });
});

describe("cabecalhos de seguranca", () => {
  const nomes = cabecalhosDeSeguranca(false).map((c) => c.key);

  it("estao todos presentes", () => {
    expect(nomes).toEqual(
      expect.arrayContaining([
        "Content-Security-Policy",
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "Strict-Transport-Security",
      ]),
    );
  });

  it("producao nao tem eval nem websocket liberado; ninguem embute o app", () => {
    const csp = politicaDeConteudo(false);
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("ws:");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("nenhuma origem externa e liberada -- quem adicionar uma tem de vir aqui", () => {
    expect(politicaDeConteudo(false)).not.toMatch(/https?:\/\//);
  });

  it("next.config aplica os cabecalhos", () => {
    const config = readFileSync(path.join(raiz, "next.config.ts"), "utf8");
    expect(config).toContain("cabecalhosDeSeguranca(");
  });
});

describe("toda rota de API publica passa pela protecao", () => {
  const rotas = (function listar(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return listar(p);
      return e.name === "route.ts" ? [p] : [];
    });
  })(path.join(raiz, "app", "api"));

  // O cron e protegido por segredo (CRON_SECRET), nao por limite de IP:
  // quem chama e a propria Vercel.
  const publicas = rotas.filter((r) => !r.includes(`${path.sep}cron${path.sep}`));

  it("encontra as rotas", () => {
    expect(publicas.length).toBeGreaterThanOrEqual(5);
  });

  it("toda rota publica limita por IP", () => {
    const sem = publicas.filter((r) => !/\blimitar\(/.test(readFileSync(r, "utf8")));
    expect(sem.map((r) => path.relative(raiz, r))).toEqual([]);
  });

  it("nenhuma rota le o corpo sem teto e sem schema", () => {
    const cruas = rotas.filter((r) => /requisicao\.json\(\)|request\.json\(\)/.test(readFileSync(r, "utf8")));
    expect(cruas.map((r) => path.relative(raiz, r))).toEqual([]);
  });

  it("o interesse escreve pela service role, nunca pela chave publica", () => {
    const interesse = readFileSync(path.join(raiz, "app", "api", "interesse", "route.ts"), "utf8");
    expect(interesse).toContain("escritor()");
    expect(interesse).not.toMatch(/\bleitor\(\)/);
  });
});
