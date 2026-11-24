import { describe, expect, it } from "vitest";
import {
  hojeEmSaoPaulo,
  mudarSituacao,
  registrarBusca,
  registrarSaida,
  sanearViagens,
  separarViagens,
  type Viagem,
} from "@/lib/viagens/modelo";

let n = 0;
const id = () => `v${++n}`;
const agora = new Date("2026-11-24T15:00:00Z");
const saida = {
  origemIata: "GRU",
  destinoIata: "FLN",
  ida: "2027-03-10",
  precoVistoBRL: 150,
  forma: "dinheiro" as const,
};

describe("minhas viagens", () => {
  it("a saida para a passagem vira uma viagem em vista", () => {
    const v = registrarSaida([], saida, agora, id);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ origemIata: "GRU", destinoIata: "FLN", situacao: "em-vista", precoVistoBRL: 150 });
  });

  it("clicar de novo na mesma passagem atualiza, nao duplica", () => {
    const um = registrarSaida([], saida, agora, id);
    const dois = registrarSaida(um, { ...saida, precoVistoBRL: 139 }, new Date("2026-11-25T10:00:00Z"), id);
    expect(dois).toHaveLength(1);
    expect(dois[0].precoVistoBRL).toBe(139);
  });

  it("forma diferente ou data diferente e outra viagem", () => {
    let v = registrarSaida([], saida, agora, id);
    v = registrarSaida(v, { ...saida, forma: "milhas" }, agora, id);
    v = registrarSaida(v, { ...saida, ida: "2027-03-11" }, agora, id);
    expect(v).toHaveLength(3);
  });

  it("recusa rota invalida ou com origem igual ao destino", () => {
    expect(registrarSaida([], { ...saida, destinoIata: "GRU" }, agora, id)).toEqual([]);
    expect(registrarSaida([], { ...saida, origemIata: "XX" }, agora, id)).toEqual([]);
  });

  it("data impossivel vira sem data", () => {
    const v = registrarSaida([], { ...saida, ida: "2027-02-31" }, agora, id);
    expect(v[0].ida).toBeNull();
  });

  it("reservada com ida no passado vai para o historico; no futuro, para proximas", () => {
    let v = registrarSaida([], saida, agora, id);
    v = registrarSaida(v, { ...saida, destinoIata: "LIS", ida: "2026-10-01" }, agora, id);
    v = mudarSituacao(v, v[0].id, "reservada", agora);
    v = mudarSituacao(v, v[1].id, "reservada", agora);
    const s = separarViagens(v, agora);
    expect(s.proximas.map((x) => x.destinoIata)).toEqual(["FLN"]);
    expect(s.feitas.map((x) => x.destinoIata)).toEqual(["LIS"]);
    expect(s.emVista).toEqual([]);
  });

  it("buscas recentes sem repeticao, a ultima primeiro", () => {
    let b = registrarBusca([], "GRU", "LIS", agora);
    b = registrarBusca(b, "GRU", "FLN", agora);
    b = registrarBusca(b, "gru", "lis", agora);
    expect(b.map((x) => x.destinoIata)).toEqual(["LIS", "FLN"]);
  });

  it("dados guardados estragados nao quebram nada", () => {
    expect(sanearViagens("lixo")).toEqual({ viagens: [], buscas: [] });
    const ok: Viagem = registrarSaida([], saida, agora, id)[0];
    const r = sanearViagens({ viagens: [ok, { id: "x" }, null], buscas: [{ origemIata: "GRU" }] });
    expect(r.viagens).toEqual([ok]);
    expect(r.buscas).toEqual([]);
  });

  it("hoje e o dia de Sao Paulo, nao o UTC", () => {
    expect(hojeEmSaoPaulo(new Date("2026-11-25T01:30:00Z"))).toBe("2026-11-24");
  });
});
