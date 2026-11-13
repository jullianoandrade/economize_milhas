import { describe, expect, it } from "vitest";
import { aeroportos } from "@/lib/dados";
import { procurarLugares, normalizar } from "@/lib/busca/lugares";

/**
 * A ordem dos resultados da busca.
 *
 * Existe porque ordenacao quebra em silencio: nada falha, nada avisa, e
 * a pessoa so descobre que o produto piorou quando digita "londres" e
 * recebe London City antes de Heathrow. Foi exatamente o que aconteceu
 * quando a base passou de 268 para ~3.700 aeroportos -- medido antes e
 * depois, e corrigido com o campo `relevancia`.
 *
 * Os casos abaixo sao os que de fato regrediram naquela medicao, mais os
 * que a expansao destravou.
 */

const primeiro = (q: string) => procurarLugares(q)[0]?.iata;
const topo = (q: string, n = 3) => procurarLugares(q, n).map((l) => l.iata);

describe("busca de lugares", () => {
  it("codigo IATA exato ganha de tudo", () => {
    expect(primeiro("GRU")).toBe("GRU");
    expect(primeiro("lis")).toBe("LIS");
    // SAN e San Diego; "san" tambem casa com dezenas de "San ...".
    // O codigo exato tem que vencer mesmo assim.
    expect(primeiro("san")).toBe("SAN");
  });

  it("ignora acento e caixa", () => {
    expect(primeiro("sao paulo")).toBe(primeiro("SÃO PAULO"));
    expect(primeiro("brasilia")).toBe(primeiro("Brasília"));
    expect(normalizar("Florianópolis")).toBe("florianopolis");
  });

  it("texto curto demais nao devolve nada", () => {
    expect(procurarLugares("")).toEqual([]);
    expect(procurarLugares("l")).toEqual([]);
    expect(procurarLugares("  ")).toEqual([]);
  });

  describe("hub vence aeroporto secundario da mesma cidade", () => {
    // Estes quatro regrediram quando a base abriu, e sao o motivo de
    // `relevancia` existir.
    it("londres: Heathrow/Gatwick antes de London City", () => {
      const r = topo("londres", 5);
      expect(r.indexOf("LHR")).toBeLessThan(r.indexOf("LCY"));
      expect(r.indexOf("LGW")).toBeLessThan(r.indexOf("LCY"));
    });

    it("paris: Charles de Gaulle antes de Beauvais", () => {
      const r = topo("paris", 5);
      expect(r.indexOf("CDG")).toBeLessThan(r.indexOf("BVA"));
    });

    it("milao: Malpensa primeiro", () => {
      expect(primeiro("milao")).toBe("MXP");
    });

    it("roma: Fiumicino antes de Ciampino", () => {
      const r = topo("roma", 5);
      expect(r.indexOf("FCO")).toBeLessThan(r.indexOf("CIA"));
    });
  });

  describe("a expansao da base destravou destinos reais", () => {
    // Nenhum destes existia na base de 268 aeroportos.
    it.each([
      ["faro", "FAO"],
      ["sevilha", "SVQ"],
      ["nice", "NCE"],
      ["san diego", "SAN"],
      ["guadalajara", "GDL"],
    ])("'%s' encontra %s", (consulta, iata) => {
      expect(topo(consulta, 5)).toContain(iata);
    });
  });

  it("entre casamentos iguais, o Brasil vem antes", () => {
    // "salvador" casa com Salvador (BA) e San Salvador (SV); as duas
    // pelo mesmo criterio. A origem do usuario desempata.
    const r = topo("salvador", 4);
    expect(r[0]).toBe("SSA");
    expect(r.indexOf("SSA")).toBeLessThan(r.indexOf("SAL"));
  });

  it("relevancia NAO atropela a qualidade do casamento", () => {
    // A garantia que impede o desempate de virar o criterio: SID e a
    // ilha do Sal, nome de cidade exato, e nao tem relevancia nenhuma.
    // Ainda assim vence Salvador, que so comeca com "sal".
    const r = topo("sal", 5);
    expect(r.indexOf("SID")).toBeLessThan(r.indexOf("SSA"));
  });

  it("todo aeroporto da base tem relevancia valida", () => {
    const fora = aeroportos.aeroportos.filter(
      (a) => ![0, 1, 2].includes(a.relevancia),
    );
    expect(fora).toEqual([]);

    // Guarda contra o campo virar constante por acidente -- se todo
    // mundo tiver o mesmo valor, o desempate deixa de existir sem que
    // nenhum outro teste perceba.
    const brasileiros = aeroportos.aeroportos.filter((a) => a.relevancia === 2);
    const procurados = aeroportos.aeroportos.filter((a) => a.relevancia === 1);
    expect(brasileiros.length).toBeGreaterThan(100);
    expect(procurados.length).toBeGreaterThan(100);
    expect(brasileiros.every((a) => a.pais === "BR")).toBe(true);
  });

  it("devolve no maximo o limite pedido", () => {
    expect(procurarLugares("a", 5).length).toBeLessThanOrEqual(5);
    expect(procurarLugares("san", 3)).toHaveLength(3);
    expect(procurarLugares("santos dumont").length).toBeLessThanOrEqual(8);
  });
});
