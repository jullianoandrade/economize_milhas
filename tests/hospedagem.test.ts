import { afterEach, describe, expect, it, vi } from "vitest";
import { linkDeHospedagem, ofertasRelevantes } from "@/lib/monetizacao/ofertas";
import { parceiroPorTipo } from "@/lib/monetizacao/parceiros";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hospedagem na viagem reservada", () => {
  const estadia = { cidade: "Lisboa", checkin: "2027-03-10", checkout: "2027-03-13" };

  it("o parceiro de hospedagem nao e mais o Hotellook", () => {
    const hotel = parceiroPorTipo("hotel")!;
    expect(hotel.url).not.toContain("hotellook");
    expect(hotel.url).toMatch(/^https:\/\/www\.booking\.com\//);
  });

  it("leva cidade, check-in e check-out para a busca", () => {
    const r = linkDeHospedagem(estadia)!;
    const url = new URL(r.url);
    expect(url.searchParams.get("ss")).toBe("Lisboa");
    expect(url.searchParams.get("checkin")).toBe("2027-03-10");
    expect(url.searchParams.get("checkout")).toBe("2027-03-13");
    expect(url.searchParams.get("group_adults")).toBe("2");
    expect(r.parceiro).toBe("Booking.com");
  });

  it("sai sempre, com a monetizacao desligada", () => {
    vi.stubEnv("NEXT_PUBLIC_MONETIZACAO_ATIVA", "false");
    const r = linkDeHospedagem(estadia);
    expect(r).not.toBeNull();
    expect(r!.comissionado).toBe(false);
    expect(r!.url).not.toContain("marker");
  });

  it("com a flag ligada, nao finge comissao que o link nao rastreia", () => {
    vi.stubEnv("NEXT_PUBLIC_MONETIZACAO_ATIVA", "true");
    vi.stubEnv("NEXT_PUBLIC_TRAVELPAYOUTS_MARKER", "123456");
    const r = linkDeHospedagem(estadia)!;
    expect(r.url).not.toContain("123456");
    expect(r.comissionado).toBe(false);
  });

  it("data invalida some, a cidade fica", () => {
    const url = new URL(linkDeHospedagem({ cidade: "Recife", checkin: "amanha", checkout: "2027-01-01" })!.url);
    expect(url.searchParams.get("ss")).toBe("Recife");
    expect(url.searchParams.has("checkin")).toBe(false);
  });

  it("sem cidade nao ha busca", () => {
    expect(linkDeHospedagem({ cidade: "  " })).toBeNull();
  });

  it("a oferta de hotel da fase usa a mesma busca", () => {
    vi.stubEnv("NEXT_PUBLIC_MONETIZACAO_ATIVA", "true");
    const { ofertas } = ofertasRelevantes({
      diasAteAViagem: 15,
      internacional: true,
      destinoIata: "LIS",
      destinoCidade: "Lisboa",
      checkin: "2027-03-10",
      checkout: "2027-03-13",
    });
    const hotel = ofertas.find((o) => o.tipo === "hotel")!;
    expect(new URL(hotel.url!).searchParams.get("ss")).toBe("Lisboa");
  });
});
