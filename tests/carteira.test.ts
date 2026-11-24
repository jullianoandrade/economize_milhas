import { afterEach, describe, expect, it, vi } from "vitest";
import {
  diasEntre,
  estaDesatualizado,
  haQuanto,
  MAXIMO_DE_SALDO,
  montarCarteira,
  sanearSaldos,
  quandoVence,
  totalEstimado,
  valorEstimado,
  vencimentosProximos,
  type ProgramaDaCarteira,
  type Saldos,
} from "@/lib/carteira/modelo";
import { catalogoDaCarteira } from "@/lib/carteira/catalogo";

const smiles: ProgramaDaCarteira = { id: "smiles", nome: "Smiles", unidade: "milhas", milheiroBRL: 16 };
const livelo: ProgramaDaCarteira = { id: "livelo", nome: "Livelo", unidade: "pontos", milheiroBRL: 30 };
const HOJE = "2026-11-17";

describe("valor estimado", () => {
  it("e quantidade em milheiros vezes o preco de referencia", () => {
    expect(valorEstimado(32_000, smiles)).toBe(512);
    expect(valorEstimado(28_100, livelo)).toBe(843);
    expect(valorEstimado(0, smiles)).toBe(0);
  });
});

describe("montar a carteira", () => {
  const saldos: Saldos = {
    smiles: { quantidade: 32_000, atualizadoEm: "2026-11-14", vencimentos: [] },
    livelo: {
      quantidade: 28_100,
      atualizadoEm: "2026-10-01",
      vencimentos: [
        { id: "a", quantidade: 2_300, data: "2026-11-29" },
        { id: "b", quantidade: 500, data: "2026-11-10" },
        { id: "c", quantidade: 900, data: "2027-06-01" },
      ],
    },
    programaQueSumiu: { quantidade: 9_999, atualizadoEm: HOJE, vencimentos: [] },
  };
  const linhas = montarCarteira(saldos, [smiles, livelo], HOJE);

  it("ordena do programa que mais vale para o que menos vale", () => {
    expect(linhas.map((l) => l.programa.id)).toEqual(["livelo", "smiles"]);
  });

  it("ignora saldo de programa que saiu do catalogo", () => {
    expect(linhas).toHaveLength(2);
  });

  it("soma o total", () => {
    expect(totalEstimado(linhas)).toBe(843 + 512);
  });

  it("marca como desatualizado o saldo com mais de 30 dias", () => {
    expect(linhas.find((l) => l.programa.id === "livelo")?.desatualizado).toBe(true);
    expect(linhas.find((l) => l.programa.id === "smiles")?.desatualizado).toBe(false);
  });

  it("avisa so o que vence nos proximos 60 dias, e nao o que ja venceu", () => {
    const avisos = vencimentosProximos(linhas, HOJE);
    expect(avisos).toEqual([
      { programa: livelo, quantidade: 2_300, data: "2026-11-29", emDias: 12 },
    ]);
  });
});

describe("datas em linguagem de gente", () => {
  it("conta dias sem errar a virada de mes", () => {
    expect(diasEntre("2026-10-31", "2026-11-01")).toBe(1);
    expect(diasEntre("2026-11-17", "2026-11-17")).toBe(0);
  });

  it("diz quando vence e ha quanto foi atualizado", () => {
    expect(quandoVence(0)).toBe("hoje");
    expect(quandoVence(1)).toBe("amanhã");
    expect(quandoVence(12)).toBe("em 12 dias");
    expect(haQuanto("2026-11-17", HOJE)).toBe("hoje");
    expect(haQuanto("2026-11-16", HOJE)).toBe("ontem");
    expect(haQuanto("2026-10-28", HOJE)).toBe("há 20 dias");
  });

  it("30 dias ainda vale; 31 pede conferencia", () => {
    expect(estaDesatualizado({ quantidade: 1, atualizadoEm: "2026-10-18", vencimentos: [] }, HOJE)).toBe(false);
    expect(estaDesatualizado({ quantidade: 1, atualizadoEm: "2026-10-17", vencimentos: [] }, HOJE)).toBe(true);
  });
});

describe("catalogo da carteira", () => {
  const catalogo = catalogoDaCarteira();

  it("tem os programas de pontos e os aereos", () => {
    const ids = catalogo.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(["livelo", "esfera", "smiles", "latampass", "tudoazul"]));
  });

  it("todo programa tem preco de referencia: nenhum valor e inventado", () => {
    for (const p of catalogo) expect(p.milheiroBRL).toBeGreaterThan(0);
  });
});

describe("sanear o que veio do aparelho", () => {
  it("saldo sem vencimentos ganha lista vazia (era o 'reading map')", () => {
    expect(sanearSaldos({ smiles: { quantidade: 84_000, atualizadoEm: "2026-11-20" } })).toEqual({
      smiles: { quantidade: 84_000, atualizadoEm: "2026-11-20", vencimentos: [] },
    });
  });

  it("descarta entradas sem numero ou sem data, e o que nem objeto e", () => {
    expect(
      sanearSaldos({
        a: { quantidade: "muito", atualizadoEm: "2026-11-20" },
        b: { quantidade: 10, atualizadoEm: "ontem" },
        c: null,
        d: 42,
        e: { quantidade: 10, atualizadoEm: "2026-11-20", vencimentos: [] },
      }),
    ).toEqual({ e: { quantidade: 10, atualizadoEm: "2026-11-20", vencimentos: [] } });
    expect(sanearSaldos(null)).toEqual({});
    expect(sanearSaldos("lixo")).toEqual({});
    expect(sanearSaldos([1, 2])).toEqual({});
  });

  it("prende a quantidade entre 0 e o maximo, inteira", () => {
    const s = sanearSaldos({
      neg: { quantidade: -500, atualizadoEm: "2026-11-20" },
      grande: { quantidade: 1e12, atualizadoEm: "2026-11-20" },
      quebrado: { quantidade: 10.6, atualizadoEm: "2026-11-20" },
      infinito: { quantidade: Infinity, atualizadoEm: "2026-11-20" },
    });
    expect(s.neg.quantidade).toBe(0);
    expect(s.grande.quantidade).toBe(MAXIMO_DE_SALDO);
    expect(s.quebrado.quantidade).toBe(11);
    expect(s.infinito).toBeUndefined();
  });

  it("filtra vencimentos invalidos e da id a quem nao tem", () => {
    const s = sanearSaldos({
      smiles: {
        quantidade: 1_000,
        atualizadoEm: "2026-11-20",
        vencimentos: [
          { id: "ok", quantidade: 300, data: "2027-01-10" },
          { quantidade: 200, data: "2027-02-10" },
          { id: "zero", quantidade: 0, data: "2027-03-10" },
          { id: "semdata", quantidade: 100 },
          "lixo",
        ],
      },
    });
    expect(s.smiles.vencimentos).toEqual([
      { id: "ok", quantidade: 300, data: "2027-01-10" },
      { id: "2027-02-10-1", quantidade: 200, data: "2027-02-10" },
    ]);
  });
});

/**
 * O store de verdade, com um localStorage de mentira: o persist hidrata
 * ao criar o store, entao cada caso importa o modulo do zero.
 */
describe("store da carteira le o aparelho sem quebrar", () => {
  function aparelhoCom(valor: string | null) {
    const mapa = new Map<string, string>();
    if (valor !== null) mapa.set("voemilo-carteira", valor);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => mapa.get(k) ?? null,
      setItem: (k: string, v: string) => void mapa.set(k, v),
      removeItem: (k: string) => void mapa.delete(k),
    });
    return mapa;
  }

  async function abrirStore() {
    vi.resetModules();
    const { usarCarteira } = await import("@/store/carteira");
    return usarCarteira;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saldo antigo sem vencimentos hidrata com lista vazia", async () => {
    aparelhoCom(JSON.stringify({ state: { saldos: { smiles: { quantidade: 84_000, atualizadoEm: "2026-11-20" } } }, version: 1 }));
    const store = await abrirStore();
    expect(store.persist.hasHydrated()).toBe(true);
    expect(store.getState().saldos.smiles.vencimentos).toEqual([]);
  });

  it("JSON quebrado termina a hidratacao com a carteira vazia", async () => {
    aparelhoCom("{isto nao e json");
    const store = await abrirStore();
    expect(store.persist.hasHydrated()).toBe(true);
    expect(store.getState().saldos).toEqual({});
  });

  it("versao diferente aproveita os saldos em vez de descartar", async () => {
    const mapa = aparelhoCom(
      JSON.stringify({ state: { saldos: { livelo: { quantidade: 5_000, atualizadoEm: "2026-11-01", vencimentos: [] } } }, version: 0 }),
    );
    const store = await abrirStore();
    expect(store.getState().saldos.livelo.quantidade).toBe(5_000);
    // E regrava ja na versao atual.
    expect(JSON.parse(mapa.get("voemilo-carteira") ?? "{}").version).toBe(1);
  });
});
