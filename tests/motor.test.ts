import { describe, expect, it } from "vitest";
import {
  AeroportoDesconhecidoError,
  classificarRota,
  distanciaKm,
} from "@/lib/milhas/regioes";
import {
  bonusMedianoDeTransferencia,
  caminhosDeAquisicao,
  cpmDoCartao,
  estimarMilhas,
  melhorPlanoDeClube,
} from "@/lib/milhas/motor";
import {
  avaliarResgate,
  calcularVeredito,
  classificarQualidade,
} from "@/lib/milhas/veredito";
import { cartoes, cpmReferencia } from "@/lib/dados";

const rota = (o: string, d: string) => classificarRota(o, d);

describe("classificacao de rota", () => {
  it("mede distancias conhecidas com erro pequeno", () => {
    // Sao Paulo - Lisboa tem cerca de 7.900 km em linha reta.
    expect(rota("GRU", "LIS").distanciaKm).toBeGreaterThan(7500);
    expect(rota("GRU", "LIS").distanciaKm).toBeLessThan(8300);
  });

  it("a distancia e simetrica", () => {
    expect(rota("GRU", "LIS").distanciaKm).toBe(rota("LIS", "GRU").distanciaKm);
  });

  it("distancia de um ponto a ele mesmo e zero", () => {
    const gru = { lat: -23.4257, lon: -46.4819 };
    expect(distanciaKm(gru, gru)).toBe(0);
  });

  it("separa as faixas domesticas por distancia", () => {
    expect(rota("GRU", "SDU").faixa).toBe("domestico-curto");
    expect(rota("GRU", "REC").faixa).toMatch(/^domestico-/);
    expect(rota("GRU", "SDU").internacional).toBe(false);
  });

  it("usa a geografia, e nao a distancia, no internacional", () => {
    // Miami e Lisboa ficam a distancias parecidas de Sao Paulo, mas caem
    // em faixas de resgate diferentes. Se isso quebrar, o motor voltou a
    // classificar por quilometragem.
    expect(rota("GRU", "MIA").faixa).toBe("america-norte-central");
    expect(rota("GRU", "LIS").faixa).toBe("europa");
    expect(rota("GRU", "EZE").faixa).toBe("america-sul");
    expect(rota("GRU", "NRT").faixa).toBe("resto-mundo");
  });

  it("classifica igual nos dois sentidos", () => {
    expect(rota("LIS", "GRU").faixa).toBe(rota("GRU", "LIS").faixa);
  });

  it("aceita codigo em minuscula e com espaco", () => {
    expect(rota(" gru ", "lis").faixa).toBe("europa");
  });

  it("falha de forma explicita em aeroporto desconhecido", () => {
    expect(() => rota("GRU", "XXX")).toThrow(AeroportoDesconhecidoError);
  });
});

describe("estimativa de milhas", () => {
  it("devolve uma estimativa por programa que atende a rota", () => {
    const estimativas = estimarMilhas(rota("GRU", "REC"));
    const disponiveis = estimativas.filter((e) => e.disponivel);

    expect(disponiveis.length).toBeGreaterThanOrEqual(3);
    for (const e of disponiveis) {
      expect(e.milhas.min).toBeLessThanOrEqual(e.milhas.tipico);
      expect(e.milhas.tipico).toBeLessThanOrEqual(e.milhas.max);
      expect(e.taxasBRL).toBeGreaterThan(0);
    }
  });

  it("marca como indisponivel quem nao atende a rota", () => {
    // TAP e Iberia nao resgatam trecho domestico brasileiro.
    const domestico = estimarMilhas(rota("GRU", "SDU"));
    const tap = domestico.find((e) => e.programa.id === "tapmilesgo");
    expect(tap?.disponivel).toBe(false);
  });

  it("executiva custa mais milhas que economica", () => {
    const eco = estimarMilhas(rota("GRU", "LIS"), "economica");
    const exe = estimarMilhas(rota("GRU", "LIS"), "executiva");
    const smilesEco = eco.find((e) => e.programa.id === "smiles")!;
    const smilesExe = exe.find((e) => e.programa.id === "smiles")!;

    expect(smilesExe.milhas.tipico).toBeGreaterThan(smilesEco.milhas.tipico);
  });

  it("internacional cobra taxa de embarque maior que domestico", () => {
    const [domestico] = estimarMilhas(rota("GRU", "SDU"));
    const [europa] = estimarMilhas(rota("GRU", "LIS"));
    expect(europa.taxasBRL).toBeGreaterThan(domestico.taxasBRL);
  });
});

describe("caminhos de aquisicao", () => {
  it("vem ordenado do mais barato para o mais caro", () => {
    const caminhos = caminhosDeAquisicao("smiles");
    const cpms = caminhos.map((c) => c.cpmBRL);
    expect([...cpms].sort((a, b) => a - b)).toEqual(cpms);
  });

  it("compra direta na companhia e sempre o caminho mais caro", () => {
    const caminhos = caminhosDeAquisicao("smiles");
    expect(caminhos.at(-1)?.id).toBe("compra-direta");
  });

  it("a transferencia parte do preco do ponto de ORIGEM, nao do destino", () => {
    // Regressao de um bug real: usar o CPM do destino como base inventava
    // milhas baratissimas e fazia o motor recomendar resgate em qualquer
    // passagem. A base correta e o preco do ponto Livelo.
    const caminhos = caminhosDeAquisicao("tudoazul");
    const transferencia = caminhos.find((c) => c.id === "transferencia")!;
    const bonus = bonusMedianoDeTransferencia("tudoazul");

    expect(transferencia.cpmBRL).toBeCloseTo(
      cpmReferencia.coalizao.livelo.alvoBRL / (1 + bonus / 100),
      6,
    );
  });

  it("comprar ponto Livelo para transferir nao bate comprar a milha pronta", () => {
    // Achado que o app precisa ensinar: o bonus de transferencia so e
    // vantagem de verdade quando os pontos vieram de graca do cartao.
    const caminhos = caminhosDeAquisicao("tudoazul");
    const transferencia = caminhos.find((c) => c.id === "transferencia")!;
    const mercado = caminhos.find((c) => c.id === "mercado")!;
    expect(transferencia.cpmBRL).toBeGreaterThan(mercado.cpmBRL);
  });

  it("com pontos do cartao, a transferencia vira o caminho mais barato", () => {
    const caminhos = caminhosDeAquisicao("tudoazul", {
      cartaoId: "brb-dux",
      gastoMensalCartaoBRL: 12000,
    });
    expect(caminhos[0].id).toMatch(/cartao|transferencia/);
  });

  it("o cartao entra na lista quando ha perfil de gasto", () => {
    const semPerfil = caminhosDeAquisicao("smiles");
    const comPerfil = caminhosDeAquisicao("smiles", {
      cartaoId: "brb-dux",
      gastoMensalCartaoBRL: 8000,
    });

    expect(semPerfil.some((c) => c.id === "cartao")).toBe(false);
    expect(comPerfil.some((c) => c.id === "cartao")).toBe(true);
  });

  it("clube de milhas custa mais caro que o preco de mercado", () => {
    // Este e o achado que o glossario explica: clube so compensa em
    // resgate caro. Se um dia inverter, o texto educativo precisa ser
    // reescrito junto.
    const caminhos = caminhosDeAquisicao("smiles");
    const clube = caminhos.find((c) => c.id === "clube")!;
    const mercado = caminhos.find((c) => c.id === "mercado")!;
    expect(clube.cpmBRL).toBeGreaterThan(mercado.cpmBRL);
  });

  it("o melhor plano de clube e o de menor custo por milheiro", () => {
    const melhor = melhorPlanoDeClube("smiles")!;
    const todos = melhor.clube.planos.map(
      (p) => (p.mensalidadeBRL / p.milhasMes) * 1000,
    );
    expect(melhor.cpmBRL).toBe(Math.min(...todos));
  });
});

describe("custo por milheiro do cartao", () => {
  const cartao = cartoes.cartoes.find((c) => c.id === "brb-dux")!;

  it("dilui a anuidade nos pontos do ano", () => {
    const gasto = 10000;
    const r = cpmDoCartao(cartao, gasto)!;
    const pontosAno =
      (gasto / cartoes.cotacaoDolarReferenciaBRL) *
      cartao.pontosPorDolarNacional *
      12;

    expect(r.cpmBRL).toBeCloseTo((cartao.anuidadeBRL! / pontosAno) * 1000, 6);
  });

  it("zera o custo quando o gasto isenta a anuidade", () => {
    const r = cpmDoCartao(cartao, cartao.isencaoGastoMensalBRL!)!;
    expect(r.cpmBRL).toBe(0);
  });

  it("quanto maior o gasto, menor o custo por milheiro", () => {
    expect(cpmDoCartao(cartao, 20000)!.cpmBRL).toBeLessThan(
      cpmDoCartao(cartao, 5000)!.cpmBRL,
    );
  });

  it("nao calcula nada sem gasto informado", () => {
    expect(cpmDoCartao(cartao, 0)).toBeNull();
  });
});

describe("avaliacao de um resgate", () => {
  it("desconta as taxas antes de medir o valor extraido", () => {
    // Passagem de R$ 1.000 com R$ 200 de taxa: as milhas compraram R$ 800.
    const r = avaliarResgate(1000, 10000, 200, 20);
    expect(r.valorExtraidoPorMilheiroBRL).toBe(80);
  });

  it("soma as taxas ao custo real do resgate", () => {
    // 10.000 milhas a R$ 20 o milheiro = R$ 200, mais R$ 50 de taxa.
    const r = avaliarResgate(1000, 10000, 50, 20);
    expect(r.custoRealBRL).toBe(250);
    expect(r.economiaBRL).toBe(750);
  });

  it("razao abaixo de 1 significa que o resgate destroi valor", () => {
    // Extrai R$ 10 por milheiro numa milha que custou R$ 40.
    const r = avaliarResgate(100, 10000, 0, 40);
    expect(r.razao).toBeCloseTo(0.25, 6);
    expect(r.qualidade).toBe("ruim");
    expect(r.economiaBRL).toBeLessThan(0);
  });

  it("classifica a qualidade pelas faixas de razao", () => {
    expect(classificarQualidade(3)).toBe("excelente");
    expect(classificarQualidade(2)).toBe("excelente");
    expect(classificarQualidade(1.5)).toBe("bom");
    expect(classificarQualidade(1.0)).toBe("regular");
    expect(classificarQualidade(0.99)).toBe("ruim");
  });

  it("nao gera valor negativo quando a taxa supera a passagem", () => {
    const r = avaliarResgate(100, 10000, 300, 20);
    expect(r.valorExtraidoPorMilheiroBRL).toBe(0);
  });
});

describe("veredito", () => {
  it("avisa do custo de oportunidade num trecho domestico barato", () => {
    // O teste mais importante da suite, e o que me fez corrigir o motor.
    //
    // A regra popular diz "nao use milhas em trecho domestico barato".
    // Fazendo a conta, porem, o resgate de fato compensa: o que nao
    // compensa e o custo de oportunidade, porque as mesmas milhas valem
    // muito mais numa internacional. O app precisa dizer as duas coisas,
    // e nao fingir que o resgate da prejuizo quando nao da.
    const v = calcularVeredito(rota("GRU", "SDU"), 350);
    expect(v.ressalva).not.toBeNull();
    expect(v.ressalva).toContain("guarde");
  });

  it("manda pagar em dinheiro quando as taxas comem o resgate", () => {
    // Passagem baratissima: a taxa de embarque sozinha quase cobre a
    // tarifa, entao nao sobra valor nenhum para as milhas comprarem.
    const v = calcularVeredito(rota("GRU", "SDU"), 60);
    expect(v.recomendacao).toBe("dinheiro");
    expect(v.explicacao).toContain("Pague em dinheiro");
  });

  it("nao poe ressalva quando a economia e grande", () => {
    const v = calcularVeredito(rota("GRU", "LIS"), 6500);
    expect(v.ressalva).toBeNull();
  });

  it("segue a precificacao dinamica: passagem mais cara, resgate mais caro", () => {
    // Programas brasileiros nao tem tabela fixa. Se as milhas nao subirem
    // junto com a tarifa, o motor voltou a usar valor fixo.
    const barata = calcularVeredito(rota("GRU", "LIS"), 3000);
    const cara = calcularVeredito(rota("GRU", "LIS"), 7000);
    expect(cara.melhor!.milhas).toBeGreaterThan(barata.melhor!.milhas);
  });

  it("respeita o teto da faixa mesmo com tarifa absurda", () => {
    const absurda = calcularVeredito(rota("GRU", "LIS"), 90000);
    const smiles = absurda.opcoes.find((o) => o.programa.id === "smiles")!;
    // Teto da faixa europa da Smiles em economica.
    expect(smiles.milhas).toBeLessThanOrEqual(95000);
  });

  it("manda usar milhas numa internacional cara", () => {
    const v = calcularVeredito(rota("GRU", "LIS"), 6500);
    expect(v.recomendacao).toBe("milhas");
    expect(v.economiaBRL).toBeGreaterThan(0);
    expect(v.melhor?.qualidade).toMatch(/excelente|bom/);
  });

  it("ordena as opcoes da maior para a menor economia", () => {
    const v = calcularVeredito(rota("GRU", "LIS"), 6500);
    const economias = v.opcoes.map((o) => o.economiaBRL);
    expect([...economias].sort((a, b) => b - a)).toEqual(economias);
    expect(v.melhor).toBe(v.opcoes[0]);
  });

  it("quanto mais cara a passagem, melhor o resgate fica", () => {
    const barata = calcularVeredito(rota("GRU", "LIS"), 3000);
    const cara = calcularVeredito(rota("GRU", "LIS"), 9000);
    expect(cara.melhor!.razao).toBeGreaterThan(barata.melhor!.razao);
  });

  it("so considera programas que atendem a rota", () => {
    const v = calcularVeredito(rota("GRU", "SDU"), 350);
    expect(v.opcoes.every((o) => o.disponivel)).toBe(true);
    expect(v.opcoes.some((o) => o.programa.id === "tapmilesgo")).toBe(false);
  });

  it("a explicacao sempre cita as duas pontas da conta", () => {
    const v = calcularVeredito(rota("GRU", "LIS"), 6500);
    expect(v.explicacao).toContain("por milheiro");
    expect(v.explicacao.length).toBeGreaterThan(80);
  });
});
