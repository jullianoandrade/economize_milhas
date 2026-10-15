import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  COR_DO_ROTULO,
  TEXTO_CURTO,
  TEXTO_LONGO,
  rotuloDoVeredito,
  type RotuloDeVeredito,
} from "@/lib/milhas/rotulos";

const raiz = path.resolve(import.meta.dirname, "..");

/**
 * O defeito que originou este modulo: a tela de promocoes calculava o
 * veredito, descartava a ressalva e anunciava "vale resgatar" num trecho
 * que o motor classificava como pouco rendoso. Duas telas, duas respostas
 * opostas para o mesmo caso.
 *
 * Os testes abaixo protegem as duas metades da correcao: a regra dos tres
 * estados, e o fato de nenhuma tela poder escrever essas palavras por
 * conta propria de novo.
 */

describe("rotuloDoVeredito", () => {
  it("dinheiro sempre vira pagar, com ou sem ressalva", () => {
    expect(rotuloDoVeredito("dinheiro", false)).toBe("pagar");
    expect(rotuloDoVeredito("dinheiro", true)).toBe("pagar");
  });

  it("milhas sem ressalva vira resgatar", () => {
    expect(rotuloDoVeredito("milhas", false)).toBe("resgatar");
  });

  it("milhas COM ressalva nao pode virar resgatar", () => {
    // Este e o caso do defeito: Curitiba a R$ 173 aparecia como
    // "vale resgatar" enquanto o motor dizia para guardar as milhas.
    expect(rotuloDoVeredito("milhas", true)).toBe("guardar");
  });

  it("todo estado tem texto curto, texto longo e cor", () => {
    const estados: RotuloDeVeredito[] = ["resgatar", "guardar", "pagar"];
    for (const e of estados) {
      expect(TEXTO_CURTO[e]).toBeTruthy();
      expect(TEXTO_LONGO[e]).toBeTruthy();
      expect(COR_DO_ROTULO[e]).toBeTruthy();
    }
  });

  it("os tres estados usam palavras distintas", () => {
    const textos = Object.values(TEXTO_CURTO);
    expect(new Set(textos).size).toBe(textos.length);
  });
});

/**
 * O modulo nao pode importar nada.
 *
 * Ele e lido por componentes de cliente. Bastaria um import de
 * lib/dados para a base de aeroportos inteira ser empacotada para o
 * navegador -- foi justamente para evitar isso que o calculo pesado
 * vive em /api.
 */
describe("lib/milhas/rotulos.ts nao arrasta nada para o cliente", () => {
  it("nao tem nenhum import", () => {
    const codigo = readFileSync(
      path.join(raiz, "lib/milhas/rotulos.ts"),
      "utf8",
    );
    const imports = [...codigo.matchAll(/^\s*import\s/gm)];
    expect(imports).toHaveLength(0);
  });
});

/**
 * Fonte unica das palavras.
 *
 * Sem esta trava, a correcao dura ate a proxima tela que precise de um
 * selo e escreva "vale resgatar" na mao -- que e exatamente como o
 * defeito nasceu.
 */
describe("nenhuma tela escreve o veredito por conta propria", () => {
  const AUTORIZADO = "lib/milhas/rotulos.ts";

  function fontes(dir: string): string[] {
    let entradas;
    try {
      entradas = readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    return entradas.flatMap((entrada) => {
      if (["node_modules", ".next", ".git", "tests"].includes(entrada.name)) {
        return [];
      }
      const completo = path.join(dir, entrada.name);
      if (entrada.isDirectory()) return fontes(completo);
      return /[.](ts|tsx)$/.test(entrada.name) ? [completo] : [];
    });
  }

  /**
   * Comentario que EXPLICA a regra nao a viola. O que a trava procura e
   * string renderizada escrita na mao, entao a prosa sai antes da busca.
   * A linha de comentario so conta quando comeca a linha, para nao
   * engolir o "//" de uma URL.
   */
  function semComentarios(codigo: string): string {
    return codigo
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
  }

  it.each(Object.values(TEXTO_CURTO))(
    "so %s vem de lib/milhas/rotulos.ts",
    (frase) => {
      const culpados = fontes(raiz)
        .filter((arquivo) =>
          semComentarios(readFileSync(arquivo, "utf8")).includes(frase),
        )
        .map((a) => path.relative(raiz, a).split(path.sep).join("/"));

      expect(culpados).toEqual([AUTORIZADO]);
    },
  );
});
