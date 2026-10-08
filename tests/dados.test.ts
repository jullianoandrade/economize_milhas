import { describe, expect, it } from "vitest";
import {
  cartoes,
  clubes,
  cpmReferencia,
  glossario,
  heuristicasTempo,
  idsDeProgramas,
  idsDeRegioes,
  programas,
  tabelasResgate,
  transferencias,
} from "@/lib/dados";

/**
 * O import de @/lib/dados ja roda todos os esquemas Zod: se algum arquivo
 * de data/ estiver mal formado, a suite falha aqui com a mensagem do Zod.
 *
 * Os testes abaixo cobrem o que o Zod sozinho nao pega: a coerencia ENTRE
 * os arquivos. Um id de programa escrito errado em um arquivo e invisivel
 * para o esquema, mas quebraria o calculo silenciosamente.
 */

describe("integridade da base curada", () => {
  it("carrega todos os arquivos", () => {
    expect(programas.programas.length).toBeGreaterThan(0);
    expect(glossario.termos.length).toBeGreaterThan(0);
    expect(glossario.quandoNaoUsarMilhas.length).toBeGreaterThan(0);
  });

  it("toda tabela de resgate pertence a um programa conhecido", () => {
    for (const id of Object.keys(tabelasResgate.tabelas)) {
      expect(idsDeProgramas).toContain(id);
    }
  });

  it("toda regiao citada nas tabelas existe na lista de regioes", () => {
    for (const [programa, tabela] of Object.entries(tabelasResgate.tabelas)) {
      const regioes = Object.keys(tabela.economica).sort();
      expect(regioes, `programa ${programa}`).toEqual([...idsDeRegioes].sort());
    }
  });

  it("toda regiao tem taxa de embarque definida", () => {
    for (const regiao of idsDeRegioes) {
      expect(typeof tabelasResgate.taxasEmbarqueBRL[regiao]).toBe("number");
    }
  });

  it("as faixas de milhas sao coerentes: min <= tipico <= max", () => {
    for (const [programa, tabela] of Object.entries(tabelasResgate.tabelas)) {
      for (const [regiao, faixa] of Object.entries(tabela.economica)) {
        const onde = `${programa}/${regiao}`;
        expect(faixa.min, onde).toBeLessThanOrEqual(faixa.tipico);
        expect(faixa.tipico, onde).toBeLessThanOrEqual(faixa.max);
      }
    }
  });

  it("rota indisponivel e marcada como tal, e nao com milhas zeradas por engano", () => {
    for (const tabela of Object.values(tabelasResgate.tabelas)) {
      for (const faixa of Object.values(tabela.economica)) {
        if (faixa.confianca === "indisponivel") expect(faixa.max).toBe(0);
        else expect(faixa.min).toBeGreaterThan(0);
      }
    }
  });

  it("todo programa com tabela tem CPM de referencia", () => {
    for (const id of Object.keys(tabelasResgate.tabelas)) {
      expect(cpmReferencia.programas[id], `faltou CPM de ${id}`).toBeDefined();
    }
  });

  it("o CPM alvo fica dentro da faixa de mercado", () => {
    for (const [id, cpm] of Object.entries(cpmReferencia.programas)) {
      expect(cpm.mercadoMinBRL, id).toBeLessThanOrEqual(cpm.mercadoMaxBRL);
      expect(cpm.alvoBRL, id).toBeLessThanOrEqual(cpm.mercadoMaxBRL);
    }
  });

  it("todo clube aponta para um programa existente", () => {
    for (const clube of clubes.clubes) {
      expect(idsDeProgramas, clube.id).toContain(clube.programa);
    }
  });

  it("toda paridade liga origens e destinos conhecidos", () => {
    const origens = transferencias.origens.map((o) => o.id);
    for (const p of transferencias.paridades) {
      expect(origens).toContain(p.origem);
      expect(idsDeProgramas).toContain(p.destino);
    }
  });

  it("o padrao historico de bonus cobre so programas conhecidos", () => {
    for (const p of transferencias.padraoHistorico) {
      expect(idsDeProgramas).toContain(p.destino);
      expect(p.bonusMedianoPct).toBeLessThanOrEqual(p.bonusMaximoObservadoPct);
    }
  });

  it("a sazonalidade cobre os 12 meses", () => {
    const meses = Object.keys(heuristicasTempo.sazonalidadeBrasil.indicePorMes);
    expect(meses.sort((a, b) => Number(a) - Number(b))).toEqual(
      Array.from({ length: 12 }, (_, i) => String(i + 1)),
    );
  });

  it("alta e baixa temporada nao se sobrepoem", () => {
    const { altaTemporada, baixaTemporada } = heuristicasTempo.sazonalidadeBrasil;
    expect(altaTemporada.filter((m) => baixaTemporada.includes(m))).toEqual([]);
  });

  it("a janela de compra e crescente: min <= otimo <= max", () => {
    for (const j of heuristicasTempo.janelaDeCompra) {
      expect(j.diasMin, j.tipo).toBeLessThanOrEqual(j.diasOtimo);
      expect(j.diasOtimo, j.tipo).toBeLessThanOrEqual(j.diasMax);
    }
  });

  it("todo cartao acumula algo e tem observacao explicando a fonte", () => {
    for (const c of cartoes.cartoes) {
      expect(c.pontosPorDolarNacional, c.id).toBeGreaterThan(0);
      expect(c.observacao.length, c.id).toBeGreaterThan(10);
    }
  });

  it("os ids sao unicos dentro de cada arquivo", () => {
    const unico = (ids: string[]) => expect(new Set(ids).size).toBe(ids.length);
    unico(programas.programas.map((p) => p.id));
    unico(clubes.clubes.map((c) => c.id));
    unico(cartoes.cartoes.map((c) => c.id));
    unico(glossario.termos.map((t) => t.id));
    unico(clubes.clubes.flatMap((c) => c.planos.map((p) => p.id)));
  });
});
