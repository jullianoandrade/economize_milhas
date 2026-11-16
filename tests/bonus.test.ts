import { describe, expect, it } from "vitest";
import {
  bonusMedianoDeTransferencia,
  caminhosDeAquisicao,
  type BonusVigente,
} from "@/lib/milhas/motor";
import { calcularVeredito } from "@/lib/milhas/veredito";
import { classificarRota } from "@/lib/milhas/regioes";

/**
 * O bonus de transferencia vigente.
 *
 * Nao e enfeite de tela: ele entra na conta do custo por milheiro, e o
 * custo por milheiro e metade do veredito. Com 100% de bonus, 1.000
 * pontos viram 2.000 milhas e o CPM cai pela metade -- mexe mais na
 * resposta do que qualquer variacao de tarifa.
 *
 * O que estes testes protegem, em ordem de importancia:
 *
 *   1. sem bonus informado, nada muda (o mediano historico continua)
 *   2. com bonus, o CPM cai na proporcao certa
 *   3. a procedencia acompanha: promocao real deixa de ser "interpolado"
 */

const rota = (o: string, d: string) => classificarRota(o, d);

const caminhoDeTransferencia = (
  programaId: string,
  bonus?: BonusVigente,
) =>
  caminhosDeAquisicao(programaId, {}, bonus).find(
    (c) => c.id === "transferencia",
  );

const promo = (percentual: number): BonusVigente => ({
  percentual,
  origem: "livelo",
  terminaEm: "2026-12-31",
});

describe("bonus vigente no custo da milha", () => {
  it("sem bonus informado, usa o mediano historico", () => {
    const c = caminhoDeTransferencia("smiles");
    const mediano = bonusMedianoDeTransferencia("smiles");

    expect(c).toBeDefined();
    expect(c!.rotulo).toContain(`${mediano}%`);
    // Mediano e expectativa, nao fato: a procedencia tem que dizer isso.
    expect(c!.confianca).toBe("interpolado");
  });

  it("com bonus vigente, o CPM cai na proporcao do bonus", () => {
    const sem = caminhoDeTransferencia("smiles")!;
    const com = caminhoDeTransferencia("smiles", promo(100))!;

    // A base e a mesma; so o divisor (1 + bonus/100) muda.
    const mediano = bonusMedianoDeTransferencia("smiles");
    const base = sem.cpmBRL * (1 + mediano / 100);

    expect(com.cpmBRL).toBeCloseTo(base / 2, 5);
    expect(com.cpmBRL).toBeLessThan(sem.cpmBRL);
  });

  it("promocao real deixa de ser estimativa", () => {
    const c = caminhoDeTransferencia("smiles", promo(80))!;

    expect(c.confianca).toBe("pesquisado");
    expect(c.rotulo).toContain("80%");
    expect(c.explicacao).toContain("31/12");
    expect(c.detalhe).toContain("1.800");
  });

  it("nomeia a origem da promocao, que nem sempre e a Livelo", () => {
    const c = caminhoDeTransferencia("smiles", {
      percentual: 90,
      origem: "esfera",
      terminaEm: "2026-11-20",
    })!;

    expect(c.rotulo).toContain("Esfera");
    expect(c.explicacao).toContain("20/11");
  });

  it("a data nao escorrega um dia por causa de fuso", () => {
    // new Date("2026-03-01") seria meia-noite UTC, que em Brasilia e
    // 28/02. A formatacao fatia a string justamente para evitar isso.
    const c = caminhoDeTransferencia("smiles", {
      percentual: 50,
      origem: "livelo",
      terminaEm: "2026-03-01",
    })!;

    expect(c.explicacao).toContain("01/03");
  });

  it("bonus zerado nao vira promocao", () => {
    const c = caminhoDeTransferencia("smiles", promo(0))!;

    // Cai no mediano historico em vez de anunciar "0% de bonus".
    expect(c.confianca).toBe("interpolado");
  });
});

describe("bonus vigente no veredito", () => {
  const trecho = rota("GRU", "LIS");

  it("sem bonus informado, o veredito e o de sempre", () => {
    const semOpcao = calcularVeredito(trecho, 3000);
    const comVazio = calcularVeredito(trecho, 3000, { bonusVigentes: {} });

    expect(comVazio).toEqual(semOpcao);
  });

  it("uma promocao barateia a milha e aumenta a economia", () => {
    const sem = calcularVeredito(trecho, 3000);
    const com = calcularVeredito(trecho, 3000, {
      bonusVigentes: { smiles: promo(100), latampass: promo(100) },
    });

    expect(com.economiaBRL).toBeGreaterThan(sem.economiaBRL);
    expect(com.melhor!.caminho.cpmBRL).toBeLessThan(
      sem.melhor!.caminho.cpmBRL,
    );
  });

  it("so afeta o programa que esta em promocao", () => {
    // Pelo caminho de transferencia de cada um, e nao por
    // veredito.melhor.caminho: aquele e o caminho MAIS BARATO, que
    // pode ser o mercado secundario e nao diria nada sobre o bonus.
    const comPromo = { tudoazul: promo(100) };

    expect(caminhoDeTransferencia("smiles")!.confianca).toBe("interpolado");
    expect(
      caminhoDeTransferencia("tudoazul", comPromo.tudoazul)!.confianca,
    ).toBe("pesquisado");

    // No veredito, o programa sem promocao nao muda em nada.
    const sem = calcularVeredito(trecho, 3000);
    const com = calcularVeredito(trecho, 3000, { bonusVigentes: comPromo });
    const cpmDe = (v: typeof sem, id: string) =>
      v.opcoes.find((o) => o.programa.id === id)?.caminho.cpmBRL;

    expect(cpmDe(com, "smiles")).toBe(cpmDe(sem, "smiles"));
  });

  it("o bonus so entra na conta se vencer os outros caminhos", () => {
    // Propriedade real do motor, e nao um detalhe: o TudoAzul tem
    // mercado secundario a R$ 13 o milheiro, e nem 100% de bonus leva a
    // transferencia abaixo disso. O motor continua escolhendo o caminho
    // mais barato -- anunciar a promocao como se ela mudasse o custo
    // seria vender vantagem que a pessoa nao teria.
    const semPromo = caminhoDeTransferencia("tudoazul")!;
    const comPromo = caminhoDeTransferencia("tudoazul", promo(100))!;
    expect(comPromo.cpmBRL).toBeLessThan(semPromo.cpmBRL);

    const sem = calcularVeredito(trecho, 3000);
    const com = calcularVeredito(trecho, 3000, {
      bonusVigentes: { tudoazul: promo(100) },
    });
    const escolhido = (v: typeof sem) =>
      v.opcoes.find((o) => o.programa.id === "tudoazul")!.caminho;

    expect(escolhido(sem).id).toBe("mercado");
    expect(escolhido(com).id).toBe("mercado");
    // E o custo nao piora por causa da promocao.
    expect(escolhido(com).cpmBRL).toBeLessThanOrEqual(escolhido(sem).cpmBRL);
  });

  it("promocao pode virar o veredito de dinheiro para milhas", () => {
    // Um preco em que resgatar nao compensa pelo custo normal da milha.
    // Se existe um preco assim, a promocao tem que ser capaz de virar a
    // resposta -- senao o bonus nao estaria realmente na conta.
    // Varredura, e nao uma lista chutada de precos: a virada acontece
    // numa janela estreita, e errar a janela faria o teste falhar sem
    // que nada estivesse errado.
    const precos = Array.from({ length: 120 }, (_, i) => 600 + i * 10);
    const viradas = precos.filter((p) => {
      const sem = calcularVeredito(trecho, p);
      const com = calcularVeredito(trecho, p, {
        bonusVigentes: {
          smiles: promo(100),
          latampass: promo(100),
          tudoazul: promo(100),
        },
      });
      return sem.recomendacao === "dinheiro" && com.recomendacao === "milhas";
    });

    expect(viradas.length).toBeGreaterThan(0);
  });
});
