import { describe, expect, it } from "vitest";
import { aeroportos } from "@/lib/dados";
import { classificarRota } from "@/lib/milhas/regioes";
import { estimarMilhas } from "@/lib/milhas/motor";
import { calcularVeredito } from "@/lib/milhas/veredito";
import { calcularSazonalidade } from "@/lib/tempo/sazonalidade";

/**
 * A fronteira do motor: so damos veredito de milhas em voo que toca o
 * Brasil.
 *
 * Isto nao e preferencia de escopo, e correcao. As sete faixas de
 * tabelas-resgate.json significam todas "saindo do Brasil" -- a tabela
 * nao tem eixo de origem. Antes desta trava, qualquer par estrangeiro
 * caia na regiao da ORIGEM por acidente e a tela afirmava, com toda a
 * confianca, numeros destes:
 *
 *   LIS-MAD  (R$ 122, 1h15)   -> 42.000 milhas Smiles
 *   LHR-NRT  (Londres-Toquio) -> 42.000 Smiles, "vale resgatar"
 *   JFK-LAX  (domestico EUA)  -> 24.000 TudoAzul, "vale resgatar"
 *   JFK-LHR  (transatlantico) -> faixa "America do Norte", pela origem
 *
 * No pior caso o motor chegou a rankear Londres-Toquio (CPM R$ 52,64)
 * como resgate MELHOR que GRU-LIS (R$ 37,69) -- o ranking invertido.
 *
 * A decisao, o porque e o caminho de expansao (alianca exige matriz
 * origem x destino, nao mais dado) estao em docs/fronteira-do-motor.md.
 */

const rota = (o: string, d: string) => classificarRota(o, d);

/** Os casos reais que estavam errados em producao, por nome. */
const FORA_DO_MODELO: Array<[string, string, string]> = [
  ["LIS", "MAD", "Lisboa-Madri, voo de 1h15"],
  ["CDG", "FCO", "Paris-Roma"],
  ["LHR", "NRT", "Londres-Toquio"],
  ["JFK", "LAX", "domestico americano"],
  ["JFK", "LHR", "transatlantico sem ponta brasileira"],
  ["EZE", "SCL", "Buenos Aires-Santiago"],
];

/** Os tres casos que o motor TEM o direito de responder. */
const DENTRO_DO_MODELO: Array<[string, string, string]> = [
  ["GRU", "SDU", "domestico brasileiro"],
  ["GRU", "LIS", "Brasil para o exterior"],
  ["LIS", "GRU", "exterior para o Brasil"],
  ["REC", "MIA", "origem brasileira fora de Sao Paulo"],
  ["EZE", "GRU", "vizinho para o Brasil"],
];

describe("fronteira do motor", () => {
  it.each(FORA_DO_MODELO)(
    "%s-%s (%s) nao recebe faixa de resgate",
    (origem, destino) => {
      const r = rota(origem, destino);
      expect(r.faixa).toBeNull();
      expect(r.tocaOBrasil).toBe(false);
    },
  );

  it.each(DENTRO_DO_MODELO)(
    "%s-%s (%s) recebe faixa de resgate",
    (origem, destino) => {
      const r = rota(origem, destino);
      expect(r.faixa).not.toBeNull();
      expect(r.tocaOBrasil).toBe(true);
    },
  );

  it("a fronteira vale para TODO aeroporto da base, nos dois papeis", () => {
    // Cada aeroporto e testado como origem E como destino. Isso cobre a
    // base inteira sem percorrer o produto cartesiano: a faixa depende
    // so de `regiao === "brasil"` de cada ponta, entao sondar cada
    // aeroporto contra uma ponta brasileira e contra algumas
    // estrangeiras esgota os casos que existem.
    //
    // A versao anterior varria todos os pares. Funcionava com 268
    // aeroportos (71 mil pares); com ~3.700 viraram 13,5 milhoes e o
    // teste estourou o tempo -- ele proprio avisou que a base tinha
    // crescido, que era o combinado.
    const todos = aeroportos.aeroportos;

    const brasileiro = todos.find((a) => a.regiao === "brasil");
    const estrangeiros = ["LIS", "JFK", "NRT", "JNB"]
      .map((iata) => todos.find((a) => a.iata === iata))
      .filter((a) => a !== undefined);

    expect(brasileiro).toBeDefined();
    expect(estrangeiros).toHaveLength(4);

    let comFaixa = 0;
    let semFaixa = 0;

    for (const a of todos) {
      // Contra uma ponta brasileira SEMPRE ha faixa, nos dois sentidos.
      expect(classificarRota(a.iata, brasileiro!.iata).faixa).not.toBeNull();
      expect(classificarRota(brasileiro!.iata, a.iata).faixa).not.toBeNull();
      comFaixa += 2;

      if (a.regiao === "brasil") continue;

      // Estrangeiro contra estrangeiro nunca recebe faixa.
      for (const e of estrangeiros) {
        if (e.iata === a.iata) continue;
        expect(classificarRota(a.iata, e.iata).faixa).toBeNull();
        expect(classificarRota(e.iata, a.iata).faixa).toBeNull();
        semFaixa += 2;
      }
    }

    // Guarda contra o teste passar por vacuidade: se a base um dia
    // perder os internacionais, os lacos acima nao testariam nada.
    expect(comFaixa).toBeGreaterThan(2000);
    expect(semFaixa).toBeGreaterThan(2000);
  });

  it("amostra determinista de pares cruzados respeita a fronteira", () => {
    // Complementa o teste acima com pares que nenhuma sonda fixa
    // cobriria. O passo e primo em relacao ao tamanho da base para
    // varrer combinacoes bem distribuidas, e e DETERMINISTA de
    // proposito -- teste intermitente e pior que teste nenhum.
    const todos = aeroportos.aeroportos;
    const n = todos.length;
    let conferidos = 0;

    for (let i = 0; i < n; i++) {
      const origem = todos[i];
      const destino = todos[(i * 7919 + 13) % n];
      if (origem.iata === destino.iata) continue;

      const r = classificarRota(origem.iata, destino.iata);
      const deveriaTerFaixa =
        origem.regiao === "brasil" || destino.regiao === "brasil";

      expect(r.tocaOBrasil).toBe(deveriaTerFaixa);
      expect(r.faixa === null).toBe(!deveriaTerFaixa);
      conferidos++;
    }

    expect(conferidos).toBeGreaterThan(1000);
  });
});

describe("nenhum numero de milhas escapa fora da fronteira", () => {
  it.each(FORA_DO_MODELO)(
    "%s-%s (%s) nao estima milhas em nenhum programa",
    (origem, destino) => {
      expect(estimarMilhas(rota(origem, destino))).toEqual([]);
    },
  );

  it.each(FORA_DO_MODELO)(
    "%s-%s (%s) nao recomenda resgate nem elege programa",
    (origem, destino) => {
      // O preco real daquele trecho, medido na fonte em 10/11/2026: e
      // justamente com preco em maos que o motor errava com confianca.
      const v = calcularVeredito(rota(origem, destino), 2561);

      expect(v.foraDoModelo).toBe(true);
      expect(v.melhor).toBeNull();
      expect(v.opcoes).toEqual([]);
      expect(v.recomendacao).toBe("dinheiro");
      expect(v.economiaBRL).toBe(0);
      expect(v.ressalva).toBeNull();
    },
  );

  it.each(FORA_DO_MODELO)(
    "%s-%s (%s) explica a ausencia em vez de fingir veredito",
    (origem, destino) => {
      const explicacao = calcularVeredito(rota(origem, destino), 2561)
        .explicacao;

      expect(explicacao).toMatch(/n[aã]o passa pelo Brasil/i);
      // "Use milhas" e a afirmacao que nunca pode sair daqui.
      expect(explicacao).not.toMatch(/use milhas/i);
    },
  );

  it.each(FORA_DO_MODELO)(
    "%s-%s (%s) nao monta curva de rendimento de milhas",
    (origem, destino) => {
      const meses = Array.from({ length: 12 }, (_, i) => ({
        mes: i + 1,
        precoBRL: 2000,
      }));
      expect(calcularSazonalidade(rota(origem, destino), meses, "smiles")).toBeNull();
    },
  );
});

describe("a fronteira nao estreitou o que ja funcionava", () => {
  it("o veredito dentro do modelo continua elegendo programa", () => {
    const v = calcularVeredito(rota("GRU", "LIS"), 6500);
    expect(v.foraDoModelo).toBe(false);
    expect(v.melhor).not.toBeNull();
    expect(v.opcoes.length).toBeGreaterThan(0);
  });

  it("a simetria Brasil-exterior sobreviveu", () => {
    expect(rota("LIS", "GRU").faixa).toBe(rota("GRU", "LIS").faixa);
    expect(rota("MIA", "REC").faixa).toBe(rota("REC", "MIA").faixa);
  });

  it("domestico brasileiro continua separado por distancia", () => {
    expect(rota("GRU", "SDU").faixa).toBe("domestico-curto");
    expect(rota("GRU", "REC").faixa).toMatch(/^domestico-/);
  });
});
