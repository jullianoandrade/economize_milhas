import { afterEach, describe, expect, it, vi } from "vitest";
import {
  diasAte,
  faseDaJornada,
  tiposUteisNaFase,
} from "@/lib/monetizacao/jornada";
import { monetizacaoAtiva, montarLink } from "@/lib/monetizacao/links";
import { parceiroPorTipo, parceiros } from "@/lib/monetizacao/parceiros";
import { ofertasRelevantes } from "@/lib/monetizacao/ofertas";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("fase da jornada", () => {
  it("sem data marcada, a pessoa está acumulando", () => {
    expect(faseDaJornada(null)).toBe("acumulo");
  });

  it("separa as três fases pelas fronteiras certas", () => {
    expect(faseDaJornada(300)).toBe("acumulo");
    expect(faseDaJornada(121)).toBe("acumulo");
    expect(faseDaJornada(120)).toBe("decisao");
    expect(faseDaJornada(31)).toBe("decisao");
    expect(faseDaJornada(30)).toBe("preparacao");
    expect(faseDaJornada(0)).toBe("preparacao");
    expect(faseDaJornada(-1)).toBe("passou");
  });

  it("conta dias entre datas ignorando a hora", () => {
    const hoje = new Date("2026-10-09T23:50:00");
    const daquiAUmaSemana = new Date("2026-10-16T00:10:00");
    expect(diasAte(daquiAUmaSemana, hoje)).toBe(7);
  });
});

describe("o que é útil em cada fase", () => {
  const internacional = { internacional: true };
  const domestico = { internacional: false };

  it("cartão aparece no acúmulo e some perto do embarque", () => {
    expect(tiposUteisNaFase("acumulo", internacional)).toContain("cartao");
    expect(tiposUteisNaFase("preparacao", internacional)).not.toContain("cartao");
  });

  it("eSIM aparece só na reta final", () => {
    expect(tiposUteisNaFase("acumulo", internacional)).not.toContain("esim");
    expect(tiposUteisNaFase("preparacao", internacional)).toContain("esim");
  });

  it("não oferece chip, seguro nem câmbio em viagem doméstica", () => {
    const tipos = tiposUteisNaFase("preparacao", domestico);
    for (const inutil of ["esim", "seguro", "cambio"]) {
      expect(tipos).not.toContain(inutil);
    }
  });

  it("depois que a data passa, não há nada a oferecer", () => {
    expect(tiposUteisNaFase("passou", internacional)).toEqual([]);
  });
});

describe("links de parceiro", () => {
  const voo = parceiroPorTipo("voo")!;

  it("a flag nasce desligada", () => {
    expect(monetizacaoAtiva()).toBe(false);
  });

  it("com a flag desligada, o link sai limpo", () => {
    vi.stubEnv("NEXT_PUBLIC_MONETIZACAO_ATIVA", "false");
    vi.stubEnv("NEXT_PUBLIC_TRAVELPAYOUTS_MARKER", "123456");

    const url = montarLink(voo)!;
    expect(url).not.toContain("marker");
    expect(url).not.toContain("123456");
  });

  it("com a flag ligada, o marker entra", () => {
    vi.stubEnv("NEXT_PUBLIC_MONETIZACAO_ATIVA", "true");
    vi.stubEnv("NEXT_PUBLIC_TRAVELPAYOUTS_MARKER", "123456");

    expect(montarLink(voo)).toContain("marker=123456");
  });

  it("sem marker configurado, não inventa um", () => {
    vi.stubEnv("NEXT_PUBLIC_MONETIZACAO_ATIVA", "true");
    vi.stubEnv("NEXT_PUBLIC_TRAVELPAYOUTS_MARKER", "");

    expect(montarLink(voo)).not.toContain("marker=");
  });

  it("parceiro sem URL configurada não gera link", () => {
    const cartao = parceiroPorTipo("cartao")!;
    expect(cartao.url).toBe("");
    expect(montarLink(cartao)).toBeNull();
  });

  it("repassa parâmetros de contexto para a URL", () => {
    const url = montarLink(voo, { origin_iata: "GRU" })!;
    expect(url).toContain("origin_iata=GRU");
  });
});

describe("ofertas", () => {
  const contexto = {
    diasAteAViagem: 15,
    internacional: true,
    origemIata: "GRU",
    destinoIata: "LIS",
  };

  it("com a monetização desligada, não oferece nada", () => {
    vi.stubEnv("NEXT_PUBLIC_MONETIZACAO_ATIVA", "false");
    const r = ofertasRelevantes(contexto);
    expect(r.ofertas).toEqual([]);
    // Mas a fase continua sendo informacao util por si so.
    expect(r.fase).toBe("preparacao");
  });

  it("com a flag ligada, oferece o que serve para a fase", () => {
    vi.stubEnv("NEXT_PUBLIC_MONETIZACAO_ATIVA", "true");
    const tipos = ofertasRelevantes(contexto).ofertas.map((o) => o.tipo);
    expect(tipos).toContain("seguro");
    expect(tipos).not.toContain("cartao");
  });

  it("marca como indisponível quem ainda não tem parceiro fechado", () => {
    vi.stubEnv("NEXT_PUBLIC_MONETIZACAO_ATIVA", "true");
    const ofertas = ofertasRelevantes({ ...contexto, diasAteAViagem: 15 }).ofertas;
    const seguro = ofertas.find((o) => o.tipo === "seguro")!;
    expect(seguro.disponivel).toBe(false);
    expect(seguro.url).toBeNull();
  });
});

describe("catálogo comercial", () => {
  it("todo parceiro declara modelo e faixa de comissão", () => {
    for (const p of parceiros) {
      expect(["percentual", "cpa"]).toContain(p.comissao.modelo);
      expect(p.comissao.min).toBeLessThanOrEqual(p.comissao.max);
      expect(p.cookieDias).toBeGreaterThan(0);
    }
  });

  it("hospedagem paga mais que passagem", () => {
    // A premissa que moldou a arquitetura: voo e isca, hospedagem paga.
    const voo = parceiroPorTipo("voo")!;
    const hotel = parceiroPorTipo("hotel")!;
    expect(hotel.comissao.max).toBeGreaterThan(voo.comissao.max);
  });
});
