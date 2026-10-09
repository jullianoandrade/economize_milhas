import { describe, expect, it } from "vitest";
import {
  montarPlano,
  sugerirCartoes,
  type SituacaoAtual,
} from "@/lib/milhas/acumulo";
import { cartoes } from "@/lib/dados";

const zerado: SituacaoAtual = {
  saldoMilhas: 0,
  saldoPontosCoalizao: 0,
  gastoMensalCartaoBRL: 0,
  cartaoId: null,
  aceitaClube: false,
};

const plano = (situacao: Partial<SituacaoAtual> = {}, milhas = 60000, preco = 4000) =>
  montarPlano("smiles", milhas, preco, { ...zerado, ...situacao });

describe("plano de acúmulo", () => {
  it("sem nenhuma fonte, não inventa prazo", () => {
    const p = plano();
    expect(p.mesesNecessarios).toBeNull();
    expect(p.explicacao).toContain("não acumula nada");
  });

  it("conta o saldo que a pessoa já tem", () => {
    const p = plano({ saldoMilhas: 60000 });
    expect(p.milhasFaltando).toBe(0);
    expect(p.mesesNecessarios).toBe(0);
    expect(p.explicacao).toContain("já tem milhas suficientes");
  });

  it("aplica o bônus de transferência sobre os pontos de coalizão", () => {
    // 30.000 pontos Livelo com o bonus mediano da Smiles (80%) = 54.000.
    const p = plano({ saldoPontosCoalizao: 30000 });
    expect(p.milhasFaltando).toBe(60000 - 54000);
    expect(p.fontes[0].explicacao).toContain("54.000");
  });

  it("o cartão vira ritmo mensal, já com o bônus de transferência", () => {
    const p = plano({ cartaoId: "brb-dux", gastoMensalCartaoBRL: 10000 });
    expect(p.milhasPorMes).toBeGreaterThan(0);
    expect(p.mesesNecessarios).toBeGreaterThan(0);
    expect(p.fontes.some((f) => f.id === "cartao")).toBe(true);
  });

  it("quanto maior o gasto, menos meses até a meta", () => {
    const pouco = plano({ cartaoId: "brb-dux", gastoMensalCartaoBRL: 3000 });
    const muito = plano({ cartaoId: "brb-dux", gastoMensalCartaoBRL: 15000 });
    expect(muito.mesesNecessarios!).toBeLessThan(pouco.mesesNecessarios!);
  });

  it("o clube entra como fonte só quando a pessoa aceita", () => {
    expect(plano({ aceitaClube: false }).fontes.some((f) => f.id === "clube")).toBe(
      false,
    );
    expect(plano({ aceitaClube: true }).fontes.some((f) => f.id === "clube")).toBe(
      true,
    );
  });

  it("cartão e clube somam ritmo", () => {
    const soCartao = plano({ cartaoId: "brb-dux", gastoMensalCartaoBRL: 5000 });
    const comClube = plano({
      cartaoId: "brb-dux",
      gastoMensalCartaoBRL: 5000,
      aceitaClube: true,
    });
    expect(comClube.milhasPorMes).toBeGreaterThan(soCartao.milhasPorMes);
  });

  it("avisa quando acumular sai mais caro que comprar a passagem", () => {
    // So o clube, numa meta alta e numa passagem barata: o clube custa
    // de R$ 34 a R$ 46 o milheiro, entao a conta nao fecha.
    const p = plano({ aceitaClube: true }, 60000, 900);
    expect(p.custoTotalBRL).toBeGreaterThan(p.precoDaPassagemBRL);
    expect(p.alerta).toContain("não se paga");
  });

  it("não alerta quando o plano compensa", () => {
    const p = plano(
      { cartaoId: "brb-dux", gastoMensalCartaoBRL: 40000 },
      60000,
      6000,
    );
    expect(p.alerta).toBeNull();
  });

  it("avisa quando o prazo vira ficção", () => {
    const p = plano({ cartaoId: "nubank-croma", gastoMensalCartaoBRL: 300 }, 200000, 9000);
    expect(p.mesesNecessarios!).toBeGreaterThan(60);
    expect(p.alerta).toContain("anos");
  });
});

describe("sugestão de cartões", () => {
  it("não sugere nada sem gasto informado", () => {
    expect(sugerirCartoes(50000, 0)).toEqual([]);
  });

  it("ordena por custo por milheiro, não por velocidade de acúmulo", () => {
    // O criterio e merito para o usuario: um cartao que acumula rapido mas
    // cobra anuidade alta nao pode aparecer na frente de um gratuito.
    const lista = sugerirCartoes(60000, 5000);
    const cpms = lista.map((o) => o.cpmBRL);
    expect([...cpms].sort((a, b) => a - b)).toEqual(cpms);
  });

  it("cartão sem anuidade tem custo por milheiro zero e lidera", () => {
    const lista = sugerirCartoes(60000, 5000);
    expect(lista[0].cpmBRL).toBe(0);
    expect(lista[0].custoAnualBRL).toBe(0);
  });

  it("marca isenção quando o gasto zera a anuidade", () => {
    const brb = cartoes.cartoes.find((c) => c.id === "brb-dux")!;
    const lista = sugerirCartoes(60000, brb.isencaoGastoMensalBRL!);
    const opcao = lista.find((o) => o.cartao.id === "brb-dux")!;
    expect(opcao.isento).toBe(true);
    expect(opcao.custoAnualBRL).toBe(0);
  });

  it("calcula quantos meses cada cartão levaria", () => {
    const lista = sugerirCartoes(60000, 8000);
    for (const o of lista) {
      expect(o.mesesParaMeta).toBe(Math.ceil(60000 / o.milhasPorMes));
    }
  });

  it("anuidade ausente não é anuidade zero", () => {
    // Tratar as duas como a mesma coisa colocaria um cartao de custo
    // desconhecido na frente de um comprovadamente gratuito, e faria a
    // tela afirmar "sem anuidade" sobre algo que ninguem verificou.
    const lista = sugerirCartoes(60000, 5000);
    const semDado = lista.filter((o) => o.anuidadeDesconhecida);
    expect(semDado.length).toBeGreaterThan(0);

    for (const o of semDado) {
      expect(o.cartao.anuidadeBRL).toBeNull();
      expect(o.isento).toBe(false);
    }
  });

  it("empatados no custo, anuidade confirmada vem antes da desconhecida", () => {
    const lista = sugerirCartoes(60000, 5000);
    const empatadosEmZero = lista.filter((o) => o.cpmBRL === 0);
    const conhecidas = empatadosEmZero.map((o) => !o.anuidadeDesconhecida);
    // Nenhuma conhecida pode aparecer depois de uma desconhecida.
    expect(conhecidas.indexOf(true)).toBeLessThanOrEqual(
      conhecidas.lastIndexOf(true),
    );
    const primeiraDesconhecida = conhecidas.indexOf(false);
    if (primeiraDesconhecida !== -1) {
      expect(conhecidas.slice(primeiraDesconhecida).every((c) => !c)).toBe(true);
    }
  });

  it("isenção por gasto alto não é confundida com anuidade desconhecida", () => {
    const brb = cartoes.cartoes.find((c) => c.id === "brb-dux")!;
    const lista = sugerirCartoes(60000, brb.isencaoGastoMensalBRL!);
    const opcao = lista.find((o) => o.cartao.id === "brb-dux")!;
    expect(opcao.isento).toBe(true);
    expect(opcao.anuidadeDesconhecida).toBe(false);
  });

  it("a ordenação não muda se a meta mudar: mérito é do cartão, não da meta", () => {
    const a = sugerirCartoes(20000, 5000).map((o) => o.cartao.id);
    const b = sugerirCartoes(200000, 5000).map((o) => o.cartao.id);
    expect(a).toEqual(b);
  });
});
