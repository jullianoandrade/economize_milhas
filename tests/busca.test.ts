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

/**
 * Busca por pais.
 *
 * Veio de uso real: alguem digitou "Ucrania" e nao recebeu nada. Os 13
 * aeroportos ucranianos estavam na base o tempo todo -- o indice e que
 * so conhecia cidade, nome de aeroporto e codigo IATA. Quem nao sabe o
 * nome da cidade, ou cujo destino E o pais ("quero ir pra Portugal"),
 * batia num vazio que parecia falta de cobertura.
 */
describe("busca por pais", () => {
  it.each([
    ["ucrania", "UA"],
    ["Ucrânia", "UA"],
    ["portugal", "PT"],
    ["japao", "JP"],
    ["italia", "IT"],
    ["africa do sul", "ZA"],
  ])("'%s' encontra aeroportos de %s", (consulta, iso) => {
    const r = procurarLugares(consulta);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((l) => l.pais === iso)).toBe(true);
  });

  it("aceita o nome que o brasileiro usa, nao so o oficial", () => {
    // Intl devolve "Paises Baixos" e "Reino Unido"; quase ninguem
    // digita assim.
    expect(procurarLugares("holanda").every((l) => l.pais === "NL")).toBe(true);
    expect(procurarLugares("inglaterra").every((l) => l.pais === "GB")).toBe(
      true,
    );
  });

  it("prefixo de pais tambem casa", () => {
    expect(procurarLugares("ucra").some((l) => l.pais === "UA")).toBe(true);
  });

  it("cidade vence pais quando as duas batem", () => {
    // "Singapura" e cidade e pais. Quem digita quer o aeroporto.
    expect(procurarLugares("singapura")[0].iata).toBe("SIN");
  });

  it("nao casa pais por trecho solto no meio da palavra", () => {
    // "ran" esta dentro de "Franca" e de "Ira". Casar pais por trecho
    // encheria a busca de resultado que ninguem pediu.
    const r = procurarLugares("ran", 8);
    const porPais = r.filter((l) => l.pais === "FR" || l.pais === "IR");
    expect(porPais).toEqual([]);
  });

  it("devolve o pais por extenso, para a tela explicar o casamento", () => {
    const [kiev] = procurarLugares("ucrania", 1);
    expect(kiev.paisNome).toBe("Ucrânia");
  });
});

/**
 * Conexoes como desempate.
 *
 * A relevancia (Brasil > destino procurado > resto) resolve o empate
 * entre tiers, mas dentro de um tier ela nao distingue nada -- e num
 * pais sem hub nenhum da nossa lista, todo mundo empata em zero. Foi o
 * que a busca por pais expos: "Ucrania" devolvia Chernivtsi, de quatro
 * rotas, antes de Kiev, de trezentas e trinta.
 *
 * A contagem vem de routes.json da Travelpayouts: ~65 mil rotas aereas
 * reais, e nao palpite nosso sobre o que e importante.
 */
describe("conexoes desempatam dentro da relevancia", () => {
  const ordem = (q: string, n = 8) => procurarLugares(q, n).map((l) => l.iata);

  it("o aeroporto principal do pais vem primeiro", () => {
    expect(ordem("ucrania")[0]).toBe("KBP");
  });

  it.each([
    ["londres", "LHR", "LCY"],
    ["paris", "CDG", "BVA"],
    ["rio de janeiro", "GIG", "SDU"],
  ])("'%s': %s antes de %s", (consulta, maior, menor) => {
    const r = ordem(consulta);
    expect(r.indexOf(maior)).toBeGreaterThanOrEqual(0);
    expect(r.indexOf(maior)).toBeLessThan(r.indexOf(menor));
  });

  it("nao atropela a relevancia: Brasil continua na frente", () => {
    // SSA (Salvador, BR) tem menos rotas que varios estrangeiros que
    // casam com "salvador", e ainda assim vem primeiro -- quem usa o
    // app parte do Brasil.
    expect(ordem("salvador")[0]).toBe("SSA");
  });

  it("todo aeroporto tem contagem de conexoes valida", () => {
    const invalidos = aeroportos.aeroportos.filter(
      (a) => !Number.isInteger(a.conexoes) || a.conexoes < 0,
    );
    expect(invalidos).toEqual([]);

    // Guarda contra o campo virar zero para todo mundo -- se a fonte
    // mudar de formato, o desempate some sem nada falhar.
    const comRota = aeroportos.aeroportos.filter((a) => a.conexoes > 0);
    expect(comRota.length).toBeGreaterThan(2000);
  });
});
