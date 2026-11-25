import { describe, expect, it } from "vitest";
import { dicasDoMilo } from "@/lib/milo/dicas";

describe("as dicas do Milo", () => {
  it("sem dado nenhum, ele nao inventa: sugere explorar", () => {
    const d = dicasDoMilo({});
    expect(d.map((x) => x.id)).toEqual(["explorar"]);
  });

  it("o que custa dinheiro vem primeiro: vencimento, depois a viagem", () => {
    const d = dicasDoMilo({
      vencimento: { quantidade: "12.000", unidade: "pontos", programa: "Livelo", quando: "em 20 dias" },
      proximaViagem: { cidade: "Lisboa", emDias: 12, id: "v1" },
      carteira: { valor: "R$ 3.268" },
    });
    expect(d.map((x) => x.id)).toEqual(["vencimento", "viagem", "carteira", "explorar"]);
    expect(d[1].texto).toBe("Lisboa em 12 dias. Já tem onde ficar?");
    expect(d[1].acao.href).toBe("/conta/viagens#viagem-v1");
  });

  it("toda dica termina numa acao", () => {
    const d = dicasDoMilo({
      ofertas: [
        { lugar: "Florianópolis", preco: "R$ 150", descontoPct: 65, veredito: "guardar", href: "/rota/GRU/FLN?data=2027-03-31" },
        { lugar: "Praia, Cabo Verde", preco: "R$ 1.796", descontoPct: 49, veredito: "resgatar", href: "/rota/GRU/RAI" },
      ],
      carteira: null,
    });
    for (const x of d) {
      expect(x.acao.rotulo).toBeTruthy();
      expect(x.acao.href.startsWith("/")).toBe(true);
    }
    // a de resgate vem antes da mais barata, e nao se repetem
    expect(d[0].texto).toContain("Praia, Cabo Verde");
    expect(d[1].texto).toContain("Florianópolis");
    expect(d[2].id).toBe("carteira-vazia");
  });
});
