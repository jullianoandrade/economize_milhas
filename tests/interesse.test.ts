import { describe, expect, it } from "vitest";
import { avaliarInteresse } from "@/lib/interesse";

/**
 * O portao do sensor de demanda.
 *
 * Cada rota aceita aqui vira, mais tarde, consulta diaria a
 * Travelpayouts e linhas no banco. Aceitar o que nao se deve nao quebra
 * nada visivel -- so gasta orcamento de API e suja o dado, em silencio.
 * Silencio e exatamente o que teste existe para romper.
 */

describe("quem entra na fila de coleta", () => {
  it.each([
    ["GRU", "LIS", "Brasil para o exterior"],
    ["LIS", "GRU", "exterior para o Brasil"],
    ["GRU", "SDU", "domestico brasileiro"],
    ["REC", "FAO", "origem brasileira e destino novo da base ampliada"],
  ])("aceita %s-%s (%s)", (origem, destino) => {
    expect(avaliarInteresse(origem, destino)).toEqual({
      registrar: true,
      origem,
      destino,
    });
  });

  it.each([
    ["LIS", "MAD"],
    ["JFK", "LAX"],
    ["LHR", "NRT"],
  ])("recusa %s-%s: sem ponta brasileira, nao ha veredito a servir", (o, d) => {
    expect(avaliarInteresse(o, d)).toEqual({
      registrar: false,
      motivo: "fora-do-modelo",
    });
  });

  it.each([
    ["GRU", "XXX"],
    ["ZZZ", "LIS"],
    ["", ""],
    ["GRU", ""],
  ])("recusa %s-%s: aeroporto desconhecido", (o, d) => {
    expect(avaliarInteresse(o, d)).toEqual({
      registrar: false,
      motivo: "rota-desconhecida",
    });
  });

  it("normaliza antes de devolver", () => {
    // A tabela tem chave primaria composta: "gru" e "GRU" nao podem
    // virar duas linhas para a mesma rota.
    expect(avaliarInteresse(" gru ", "lis")).toEqual({
      registrar: true,
      origem: "GRU",
      destino: "LIS",
    });
  });

  it("a recusa de trecho estrangeiro acompanha a fronteira do motor", () => {
    // Se a fronteira mudar, este teste muda junto -- de proposito. O
    // que ele impede e os dois criterios divergirem em silencio: o
    // motor calar sobre uma rota enquanto o cron gasta cota coletando
    // preco dela.
    const fora = avaliarInteresse("CDG", "FCO");
    expect(fora.registrar).toBe(false);

    const dentro = avaliarInteresse("GRU", "CDG");
    expect(dentro.registrar).toBe(true);
  });
});
