import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { termoPorId, type IdDeTermo } from "@/lib/glossario/termos";
import glossarioJson from "@/data/glossario.json";

const raiz = path.resolve(import.meta.dirname, "..");

/**
 * Duas garantias, nas duas direcoes:
 *
 *   1. todo <Termo id="x"> no codigo aponta para um termo que existe --
 *      sem isto, apagar uma entrada do JSON deixaria uma folha vazia em
 *      producao, silenciosamente.
 *   2. todo termo do JSON e referenciado por pelo menos um <Termo id> --
 *      sem isto, o glossario cresce e a tela fica para tras, do jeito
 *      que dez capacidades do motor ja tinham ficado antes (tests/superficie.test.ts).
 */

function todosOsTsx(dir: string): string[] {
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
    if (entrada.isDirectory()) return todosOsTsx(completo);
    return entrada.name.endsWith(".tsx") ? [completo] : [];
  });
}

const CODIGO_POR_ARQUIVO = todosOsTsx(raiz).map((f) => ({
  caminho: path.relative(raiz, f).split(path.sep).join("/"),
  codigo: readFileSync(f, "utf8"),
}));

function idsReferenciados(): Set<string> {
  const ids = new Set<string>();
  for (const { codigo } of CODIGO_POR_ARQUIVO) {
    for (const m of codigo.matchAll(/<Termo\s[^>]*\bid="([^"]+)"/g)) {
      ids.add(m[1]);
    }
  }
  return ids;
}

/** Termos que o roteiro adia para fases futuras, com o motivo. */
const AINDA_NAO_REFERENCIADOS: Record<string, string> = {
  paridade:
    "entra junto do minimo de transferencia no plano de acumulo -- Fase 6.",
};

describe("glossario", () => {
  const referenciados = idsReferenciados();
  const idsDoJson = new Set(glossarioJson.termos.map((t) => t.id));

  it("todo <Termo id> usado no codigo existe no JSON", () => {
    // Prova a falha: remover "taxa-embarque" do array acima e trocar
    // temporariamente um id real por "taxa-inexistente" em CardPrograma
    // faz este teste quebrar -- e foi assim que ele foi verificado.
    const inexistentes = [...referenciados].filter((id) => !idsDoJson.has(id));
    expect(inexistentes).toEqual([]);
  });

  it.each(glossarioJson.termos.map((t) => t.id))(
    "%s e referenciado por algum <Termo id> ou tem motivo documentado",
    (id) => {
      expect(referenciados.has(id) || Boolean(AINDA_NAO_REFERENCIADOS[id])).toBe(
        true,
      );
    },
  );

  it("todo id documentado como adiado existe de fato no JSON", () => {
    const desconhecidos = Object.keys(AINDA_NAO_REFERENCIADOS).filter(
      (id) => !idsDoJson.has(id),
    );
    expect(desconhecidos).toEqual([]);
  });

  it("termoPorId devolve os dez termos do glossario", () => {
    const ids: IdDeTermo[] = [
      "cpm",
      "valor-extraido",
      "transferencia-bonificada",
      "clube",
      "taxa-embarque",
      "coalizao",
      "paridade",
      "precificacao-dinamica",
      "alta-temporada",
      "antecedencia",
    ];
    for (const id of ids) {
      expect(termoPorId(id).id).toBe(id);
      expect(termoPorId(id).termo.length).toBeGreaterThan(0);
    }
  });
});

describe("lib/glossario/termos.ts nao arrasta a base de aeroportos", () => {
  it("nao importa o barril lib/dados", () => {
    const codigo = readFileSync(
      path.join(raiz, "lib/glossario/termos.ts"),
      "utf8",
    );
    expect(codigo).not.toMatch(/from ["']@\/lib\/dados["']/);
  });
});
