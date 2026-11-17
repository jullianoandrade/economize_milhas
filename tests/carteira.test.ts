import { describe, expect, it } from "vitest";
import {
  diasEntre,
  estaDesatualizado,
  haQuanto,
  montarCarteira,
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
