import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { MARCA } from "@/lib/marca";

const raiz = path.resolve(import.meta.dirname, "..");

/**
 * O nome do produto e provisorio e vai mudar. Para a troca continuar
 * sendo uma linha em lib/marca.ts, nenhum outro arquivo de interface
 * pode escrever o nome a mao.
 *
 * O dificil e que "Milhas" tambem e uma palavra comum do produto ("Milhas
 * rendem mais em maio", cabecalho de tabela). Entao o teste nao procura
 * a palavra, procura os FORMATOS em que ela aparece como marca: string
 * isolada ("Milhas"), sufixo de titulo (" · Milhas"), titulo com chamada
 * ("Milhas — "), e uma linha de JSX que contem so o nome.
 */

function arquivosDeInterface(dir: string): string[] {
  let entradas;
  try {
    entradas = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entradas.flatMap((entrada) => {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return arquivosDeInterface(completo);
    return /\.(tsx?|svg)$/.test(entrada.name) ? [completo] : [];
  });
}

function formatosDeMarca(nome: string): RegExp[] {
  const n = nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    new RegExp(`["'\`]${n}["'\`]`),
    new RegExp(`· ${n}\\b`),
    new RegExp(`\\b${n} — `),
    new RegExp(`^\\s*${n}\\s*$`, "m"),
    new RegExp(`aria-label="${n}"`),
  ];
}

describe("o nome do produto mora so em lib/marca.ts", () => {
  const arquivos = ["app", "components", "lib", "public"]
    .flatMap((d) => arquivosDeInterface(path.join(raiz, d)))
    .filter((f) => !f.endsWith(path.join("lib", "marca.ts")));

  it("encontra arquivos para varrer", () => {
    expect(arquivos.length).toBeGreaterThan(20);
  });

  it(`nenhum arquivo escreve "${MARCA.nome}" como marca`, () => {
    const padroes = formatosDeMarca(MARCA.nome);
    const infratores = arquivos.filter((f) => {
      const codigo = readFileSync(f, "utf8");
      return padroes.some((p) => p.test(codigo));
    });
    expect(infratores.map((f) => path.relative(raiz, f))).toEqual([]);
  });
});
