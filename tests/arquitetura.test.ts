import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");

/**
 * O motor de milhas e o motor temporal nunca podem enxergar quanto
 * ganhamos de comissao. Se um dia alguem importar o modulo comercial
 * dentro deles, o ranking deixa de ser cego e o build precisa quebrar.
 *
 * Isso existe para que a promessa feita ao usuario em
 * /como-nos-sustentamos seja verificavel, e nao apenas uma intencao.
 */

const PASTAS_DO_MOTOR = ["lib/milhas", "lib/tempo"];

const PROIBIDOS = [
  "lib/monetizacao",
  "@/lib/monetizacao",
  "parceiros-comercial",
];

function arquivosTs(dir: string): string[] {
  let alvo: string;
  try {
    alvo = statSync(dir).isDirectory() ? dir : "";
  } catch {
    return []; // pasta ainda nao existe (fases iniciais)
  }
  if (!alvo) return [];

  return readdirSync(alvo, { withFileTypes: true }).flatMap((entrada) => {
    const completo = path.join(alvo, entrada.name);
    if (entrada.isDirectory()) return arquivosTs(completo);
    return entrada.name.endsWith(".ts") ? [completo] : [];
  });
}

/** Captura o alvo de `import ... from "x"`, `require("x")` e `import("x")`. */
function alvosImportados(codigo: string): string[] {
  const padrao = /(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g;
  return [...codigo.matchAll(padrao)].map((m) => m[1]);
}

describe("ranking cego a comissao", () => {
  const arquivos = PASTAS_DO_MOTOR.flatMap((p) => arquivosTs(path.join(raiz, p)));

  it.each(PASTAS_DO_MOTOR)(
    "%s nao importa dados comerciais",
    (pasta) => {
      const doMotor = arquivos.filter((f) =>
        f.split(path.sep).join("/").includes(pasta),
      );

      const violacoes = doMotor.flatMap((arquivo) =>
        alvosImportados(readFileSync(arquivo, "utf8"))
          .filter((alvo) => PROIBIDOS.some((p) => alvo.includes(p)))
          .map((alvo) => `${path.relative(raiz, arquivo)} importa "${alvo}"`),
      );

      expect(violacoes).toEqual([]);
    },
  );
});

/**
 * Travar lib/milhas e lib/tempo nao basta. Se um modulo neutro e muito
 * importado (como lib/dados) passasse a ler o arquivo comercial, a
 * comissao entraria no motor pela porta dos fundos, sem violar a regra
 * acima. Por isso o arquivo comercial so pode ter UM leitor no projeto
 * inteiro.
 */
describe("dados comerciais tem um unico leitor", () => {
  const LEITOR_AUTORIZADO = "lib/monetizacao/parceiros.ts";

  function todosOsFontes(dir: string): string[] {
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
      if (entrada.isDirectory()) return todosOsFontes(completo);
      return /[.](ts|tsx)$/.test(entrada.name) ? [completo] : [];
    });
  }

  it(`so ${LEITOR_AUTORIZADO} importa parceiros-comercial.json`, () => {
    const leitores = todosOsFontes(raiz)
      .filter((arquivo) =>
        alvosImportados(readFileSync(arquivo, "utf8")).some((alvo) =>
          alvo.includes("parceiros-comercial"),
        ),
      )
      .map((arquivo) => path.relative(raiz, arquivo).split(path.sep).join("/"));

    expect(leitores.every((l) => l === LEITOR_AUTORIZADO)).toBe(true);
  });
});

/**
 * As tres regras da Fase 3 (saida para a viagem).
 *
 * O risco da monetizacao nao e so "ranking enxergar comissao" -- e tambem
 * um link de afiliado nascendo fora do unico lugar que sabe o rel certo,
 * ou o formato fragil da Aviasales vazando para um arquivo que nao devia
 * conhece-lo. As tres travas abaixo tornam esses riscos verificaveis.
 */

function todosOsFontesDoProjeto(dir: string): string[] {
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
    if (entrada.isDirectory()) return todosOsFontesDoProjeto(completo);
    return /[.](ts|tsx)$/.test(entrada.name) ? [completo] : [];
  });
}

const RELATIVO = (arquivo: string) =>
  path.relative(raiz, arquivo).split(path.sep).join("/");

describe("so LinkExterno emite ancora externa", () => {
  const EMISSOR_AUTORIZADO = "components/dominio/LinkExterno.tsx";

  it('nenhum outro arquivo usa target="_blank" ou rel com "sponsored"', () => {
    const culpados = todosOsFontesDoProjeto(raiz)
      .filter((arquivo) => RELATIVO(arquivo) !== EMISSOR_AUTORIZADO)
      .filter((arquivo) => {
        const codigo = readFileSync(arquivo, "utf8");
        return /target=["']_blank["']/.test(codigo) || /\bsponsored\b/.test(codigo);
      })
      .map(RELATIVO);

    expect(culpados).toEqual([]);
  });
});

describe("todo link de busca de voo vem acompanhado da divulgacao", () => {
  /**
   * So conta IMPORTAR a funcao, nao mencionar o nome dela em prosa --
   * o proprio modulo que a define e o comentario que explica a
   * degradacao em lib/monetizacao/formatos/aviasales.ts citam o nome
   * sem importa-lo de lugar nenhum.
   */
  function importaLinkDeBuscaDeVoo(codigo: string): boolean {
    return /import\s*\{[^}]*\blinkDeBuscaDeVoo\b[^}]*\}\s*from/.test(codigo);
  }

  it("quem importa linkDeBuscaDeVoo tambem importa NotaDeTransparencia", () => {
    const semDivulgacao = todosOsFontesDoProjeto(raiz)
      .filter((arquivo) => importaLinkDeBuscaDeVoo(readFileSync(arquivo, "utf8")))
      .filter(
        (arquivo) => !readFileSync(arquivo, "utf8").includes("NotaDeTransparencia"),
      )
      .map(RELATIVO);

    expect(semDivulgacao).toEqual([]);
  });
});

describe("o formato fragil da Aviasales fica num unico arquivo", () => {
  const PASTA_AUTORIZADA = "lib/monetizacao/formatos/";

  it('nenhum arquivo fora de lib/monetizacao/formatos/ menciona "/search/" ou "aviasales.com"', () => {
    const culpados = todosOsFontesDoProjeto(raiz)
      .filter((arquivo) => !RELATIVO(arquivo).startsWith(PASTA_AUTORIZADA))
      .filter((arquivo) => {
        const codigo = readFileSync(arquivo, "utf8");
        return codigo.includes("/search/") || codigo.includes("aviasales.com");
      })
      .map(RELATIVO);

    expect(culpados).toEqual([]);
  });
});
