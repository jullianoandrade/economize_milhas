import { beforeEach, describe, expect, it } from "vitest";
import { SALDO_MAXIMO, saldoValido, usarPerfil } from "@/store/perfil";
import { calcularProgresso, type Meta } from "@/lib/metas/progresso";

/**
 * O ponto de partida de um objetivo e o unico dado insubstituivel do app
 * (store/perfil.ts). Este teste existe porque registrar o saldo no mesmo
 * dia em que o objetivo nasceu o apagava -- achado pelo teste de jornada.
 */
const meta = (): Meta => ({
  id: "m1",
  origemIata: "GRU",
  destinoIata: "LIS",
  destinoCidade: "Lisboa",
  programaId: "smiles",
  programaNome: "Smiles",
  milhasNecessarias: 42000,
  precoDaPassagemBRL: 1845,
  criadaEm: "2026-11-19",
  dataAlvo: null,
  ritmoMensalEstimado: 0,
  registros: [{ em: "2026-11-19", saldo: 20000 }],
  marcosCelebrados: [],
});

beforeEach(() => {
  usarPerfil.setState({ metas: [meta()] });
});

describe("registrar saldo", () => {
  it("no mesmo dia da criacao, o ponto de partida fica", () => {
    usarPerfil.getState().registrarSaldo("m1", { em: "2026-11-19", saldo: 21000 });
    const m = usarPerfil.getState().metas[0];
    expect(m.registros).toEqual([
      { em: "2026-11-19", saldo: 20000 },
      { em: "2026-11-19", saldo: 21000 },
    ]);
    const p = calcularProgresso(m, new Date("2026-11-19T12:00:00"));
    expect(p.pontoDePartida).toBe(20000);
    expect(p.saldoAtual).toBe(21000);
    expect(p.ganhoDesdeOInicio).toBe(1000);
  });

  it("dois registros num mesmo dia depois da partida viram um: o ultimo vale", () => {
    const { registrarSaldo } = usarPerfil.getState();
    registrarSaldo("m1", { em: "2026-12-01", saldo: 23000 });
    registrarSaldo("m1", { em: "2026-12-01", saldo: 24000 });
    expect(usarPerfil.getState().metas[0].registros).toEqual([
      { em: "2026-11-19", saldo: 20000 },
      { em: "2026-12-01", saldo: 24000 },
    ]);
  });
});

/**
 * A tela valida o campo, mas o store e a ultima porta antes do
 * localStorage: -3000 ja virou "-3.000 de 42.000" e 99999999999 ficou
 * gravado como historico do objetivo.
 */
describe("saldo invalido nao entra", () => {
  it.each([-3000, 99_999_999_999, 1500.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "registrarSaldo ignora %s",
    (saldo) => {
      const antes = usarPerfil.getState().metas;
      usarPerfil.getState().registrarSaldo("m1", { em: "2026-12-01", saldo });
      expect(usarPerfil.getState().metas).toBe(antes);
    },
  );

  it("os extremos validos entram", () => {
    const { registrarSaldo } = usarPerfil.getState();
    registrarSaldo("m1", { em: "2026-12-01", saldo: 0 });
    registrarSaldo("m1", { em: "2026-12-02", saldo: SALDO_MAXIMO });
    expect(usarPerfil.getState().metas[0].registros.map((r) => r.saldo)).toEqual([
      20000, 0, SALDO_MAXIMO,
    ]);
  });

  it("salvarMeta recusa ponto de partida negativo", () => {
    const antes = usarPerfil.getState().metas;
    usarPerfil.getState().salvarMeta({
      ...meta(),
      id: "m2",
      destinoIata: "EZE",
      registros: [{ em: "2026-11-19", saldo: -1 }],
    });
    expect(usarPerfil.getState().metas).toBe(antes);
  });

  it("saldoValido: inteiro de zero ao teto", () => {
    expect(saldoValido(0)).toBe(true);
    expect(saldoValido(SALDO_MAXIMO)).toBe(true);
    expect(saldoValido(SALDO_MAXIMO + 1)).toBe(false);
    expect(saldoValido("100")).toBe(false);
  });
});
