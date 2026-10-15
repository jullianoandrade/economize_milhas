import { describe, expect, it } from "vitest";
import { calcularMeuCusto, type Catalogo } from "@/lib/cliente/catalogo";
import {
  milhasPorAno,
  rendimentoDoCartao,
} from "@/lib/milhas/calculo-cartao";

/**
 * O numero que a pessoa ve na primeira pergunta do app.
 *
 * Ele existe para corrigir o defeito de fundo: sem saber como alguem
 * acumula, o motor cotava o custo de quem COMPRA milhas. Como este
 * numero e o primeiro contato de um iniciante com o conceito, ele nao
 * pode ser conveniente -- um exagero aqui contamina a confianca em tudo
 * o que vem depois.
 */

const CATALOGO: Catalogo = {
  cartoes: [
    {
      id: "fraco",
      nome: "Fraco",
      emissor: "X",
      pontosPorDolarNacional: 1.4,
      anuidadeBRL: null,
      isencaoGastoMensalBRL: null,
    },
    {
      id: "forte-pago",
      nome: "Forte pago",
      emissor: "Y",
      pontosPorDolarNacional: 6.5,
      anuidadeBRL: 1200,
      isencaoGastoMensalBRL: null,
    },
    {
      id: "isentavel",
      nome: "Isentável",
      emissor: "Z",
      pontosPorDolarNacional: 5,
      anuidadeBRL: 1680,
      isencaoGastoMensalBRL: 10000,
    },
  ],
  cotacaoDolarReferenciaBRL: 5,
  bonusMedianoPct: 80,
  custoDeQuemCompraBRL: 30,
  escadaDeResgates: [
    { milhas: 6200, rotulo: "São Paulo → Recife" },
    { milhas: 20000, rotulo: "São Paulo → Buenos Aires" },
    { milhas: 60000, rotulo: "São Paulo → Lisboa" },
  ],
};

describe("calcularMeuCusto", () => {
  it("sem cartao escolhido devolve FAIXA, nunca media", () => {
    // A diferenca entre o pior e o melhor cartao e de quase cinco vezes.
    // Mostrar a media como se fosse o caso da pessoa seria o tipo de
    // numero conveniente que este app existe para nao dar.
    const r = calcularMeuCusto(CATALOGO, 3000, "")!;

    expect(r.intervalo).not.toBeNull();
    expect(r.intervalo!.min).toBeLessThan(r.intervalo!.max);
    expect(r.intervalo!.max / r.intervalo!.min).toBeCloseTo(6.5 / 1.4, 1);
  });

  it("cartao sem anuidade leva o custo da milha a zero", () => {
    // E o caso mais comum de quem usa cartao isento -- e a razao de o
    // veredito mudar de lado quando o perfil chega.
    const r = calcularMeuCusto(CATALOGO, 3000, "fraco")!;
    expect(r.cpmBRL).toBe(0);
    expect(r.intervalo).toBeNull();
  });

  it("isencao por gasto zera a anuidade so acima do limite", () => {
    const abaixo = calcularMeuCusto(CATALOGO, 5000, "isentavel")!;
    const acima = calcularMeuCusto(CATALOGO, 12000, "isentavel")!;

    expect(abaixo.cpmBRL).toBeGreaterThan(0);
    expect(acima.cpmBRL).toBe(0);
  });

  it("o bonus de transferencia entra nas milhas do ano", () => {
    const r = calcularMeuCusto(CATALOGO, 5000, "forte-pago")!;

    const semBonus = rendimentoDoCartao({
      gastoMensalBRL: 5000,
      pontosPorDolarNacional: 6.5,
      cotacaoDolarBRL: 5,
      anuidadeBRL: 1200,
      isencaoGastoMensalBRL: null,
    })!;

    expect(r.milhasAno).toBe(milhasPorAno(semBonus.pontosPorAno, 80));
    expect(r.milhasAno).toBeGreaterThan(semBonus.pontosPorAno);
  });

  it("o custo de quem compra desconta o bonus, nao o preco da milha pronta", () => {
    // O bonus multiplica os pontos da ORIGEM. Usar o preco da milha de
    // destino como base foi um erro real deste projeto, que inventava
    // milhas baratissimas.
    const r = calcularMeuCusto(CATALOGO, 3000, "fraco")!;
    expect(r.custoDeQuemCompraBRL).toBeCloseTo(30 / 1.8, 2);
  });

  it("aponta a maior viagem que cabe, nao a primeira", () => {
    const pouco = calcularMeuCusto(CATALOGO, 1000, "fraco")!;
    const muito = calcularMeuCusto(CATALOGO, 20000, "forte-pago")!;

    expect(muito.milhasAno).toBeGreaterThan(60000);
    expect(muito.viagem).toBe("São Paulo → Lisboa");
    expect(pouco.milhasAno).toBeLessThan(6200);
    expect(pouco.viagem).toBeNull();
    expect(pouco.anosParaViagem).toBeGreaterThan(1);
  });

  it("gasto zero nao inventa resposta", () => {
    expect(calcularMeuCusto(CATALOGO, 0, "fraco")).toBeNull();
  });
});
