import { describe, expect, it } from "vitest";
import { VERSAO_DO_PERFIL, migrarPerfil } from "@/store/perfil";
import type { Meta } from "@/lib/metas/progresso";

/**
 * A migracao e o unico codigo do app que pode destruir dado.
 *
 * Meta guarda um PONTO DE PARTIDA -- quantas milhas a pessoa tinha no
 * dia em que criou o objetivo. Esse numero nao existe em lugar nenhum
 * alem do aparelho dela, e nao da para recuperar depois: e o unico dado
 * insubstituivel do app. Um `migrate` errado so apareceria no aparelho
 * de quem ja usa, que e justamente onde nao da para descobrir.
 */

const META: Meta = {
  id: "m1",
  origemIata: "REC",
  destinoIata: "LIS",
  destinoCidade: "Lisboa",
  programaId: "smiles",
  programaNome: "Smiles",
  milhasNecessarias: 60000,
  precoDaPassagemBRL: 2480,
  criadaEm: "2026-01-10",
  dataAlvo: "2027-01-10",
  ritmoMensalEstimado: 5000,
  registros: [
    { em: "2026-01-10", saldo: 10000 },
    { em: "2026-06-10", saldo: 34000 },
  ],
};

describe("migrarPerfil", () => {
  it("preserva metas e origem vindo da v2", () => {
    const antes = { origemIata: "REC", visitou: true, metas: [META] };
    const depois = migrarPerfil(antes, 2);

    expect(depois.metas).toEqual([META]);
    expect(depois.metas[0].registros[0].saldo).toBe(10000);
    expect(depois.origemIata).toBe("REC");
    expect(depois.visitou).toBe(true);
  });

  it("preserva metas e origem vindo da v1, que nem tinha metas", () => {
    const depois = migrarPerfil({ origemIata: "CGH" }, 1);

    expect(depois.origemIata).toBe("CGH");
    expect(depois.metas).toEqual([]);
    // Quem ja usava o app nao pode cair numa tela de boas-vindas que
    // nunca pediu.
    expect(depois.visitou).toBe(true);
  });

  it("a situacao de acumulo nasce em null, nao em zero", () => {
    // A diferenca decide se a tela pergunta ou nao. Zero e uma resposta
    // ("nao passo nada no cartao"); null e a ausencia dela.
    const depois = migrarPerfil({ origemIata: "GRU", metas: [] }, 2);

    expect(depois.gastoMensalCartaoBRL).toBeNull();
    expect(depois.cartaoId).toBeNull();
    expect(depois.saldoPontosCoalizao).toBe(0);
    expect(depois.aceitaClube).toBe(false);
  });

  it("nao sobrescreve resposta que a pessoa ja deu", () => {
    const antes = {
      origemIata: "GRU",
      metas: [],
      gastoMensalCartaoBRL: 8000,
      cartaoId: "nubank-croma",
    };

    const depois = migrarPerfil(antes, 2);
    expect(depois.gastoMensalCartaoBRL).toBe(8000);
    expect(depois.cartaoId).toBe("nubank-croma");
  });

  it("aguenta estado vazio ou corrompido sem explodir", () => {
    for (const entrada of [undefined, null, {}]) {
      const depois = migrarPerfil(entrada, 1);
      expect(depois.metas).toEqual([]);
      expect(depois.gastoMensalCartaoBRL).toBeNull();
    }
  });

  it("migrar da versao corrente nao muda nada", () => {
    const atual = {
      origemIata: "GRU",
      visitou: true,
      metas: [META],
      gastoMensalCartaoBRL: 3000,
      cartaoId: null,
      saldoPontosCoalizao: 12000,
      aceitaClube: true,
    };

    expect(migrarPerfil(atual, VERSAO_DO_PERFIL)).toEqual(atual);
  });
});
