import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Contraste medido no arquivo de tokens, nao numa planilha a parte.
 *
 * Este teste existe por um erro concreto: validei um tom de superficie
 * fora do projeto, escrevi OUTRO no CSS, e o defeito so apareceu quando
 * o Lighthouse reclamou de 3,97:1 num rotulo. Validacao que mora longe
 * do valor validado nao protege nada.
 *
 * Os pares abaixo nao sao todos os possiveis: sao os que de fato
 * acontecem na interface -- texto sobre a superficie em que ele e
 * desenhado. Acrescentar combinacao nova de cor na tela pede
 * acrescentar o par aqui.
 */

const raiz = path.resolve(import.meta.dirname, "..");
const css = readFileSync(path.join(raiz, "app/globals.css"), "utf8");

/** Minimo da WCAG AA para texto normal. */
const MINIMO = 4.5;

function tokensDe(seletor: string): Record<string, string> {
  const inicio = css.indexOf(seletor);
  if (inicio < 0) throw new Error(`seletor ausente no CSS: ${seletor}`);
  const fim = css.indexOf("}", inicio);
  const bloco = css.slice(inicio, fim);

  return Object.fromEntries(
    [...bloco.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [
      m[1],
      m[2].toLowerCase(),
    ]),
  );
}

function canal(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex: string): number {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const claro = tokensDe(":root {");
// O bloco escuro so redefine parte dos tokens; o resto ele herda.
const escuro = { ...claro, ...tokensDe(':root[data-tema="escuro"]') };

/** [tinta, superficie em que ela e desenhada] */
const PARES: ReadonlyArray<readonly [string, string]> = [
  ["tinta", "fundo"],
  ["tinta", "superficie"],
  ["tinta", "superficie-2"],
  ["tinta-media", "fundo"],
  ["tinta-media", "superficie"],
  ["tinta-media", "superficie-2"],
  ["tinta-fraca", "fundo"],
  ["tinta-fraca", "superficie"],
  ["tinta-fraca", "superficie-2"],

  ["marca", "fundo"],
  ["marca", "superficie"],
  ["marca", "marca-fraca"],
  ["marca-contraste", "marca"],
  ["marca-contraste", "marca-forte"],

  ["tinta", "marca-fraca"],
  ["tinta-media", "marca-fraca"],
  ["tinta-fraca", "marca-fraca"],

  // O painel de destaque e suas superficies internas.
  ["painel-tinta", "painel"],
  ["painel-tinta-fraca", "painel"],
  ["painel-tinta", "painel-realce"],
  ["painel-tinta-fraca", "painel-realce"],
  ["painel-tinta", "painel-realce-forte"],
  ["painel-tinta-fraca", "painel-realce-forte"],
  // Botao claro sobre o painel: os papeis se invertem.
  ["painel", "painel-tinta"],

  // Veredito.
  ["milhas", "milhas-fundo"],
  ["milhas-contraste", "milhas"],
  ["dinheiro", "dinheiro-fundo"],
  ["alerta", "alerta-fundo"],
];

describe.each([
  ["claro", claro],
  ["escuro", escuro],
])("paleta %s", (_nome, tokens) => {
  it.each(PARES)("%s sobre %s atinge AA", (frente, atras) => {
    const corFrente = tokens[frente];
    const corAtras = tokens[atras];

    expect(corFrente, `token --${frente} ausente`).toBeTruthy();
    expect(corAtras, `token --${atras} ausente`).toBeTruthy();

    const razao = contraste(corFrente, corAtras);
    expect(
      Number(razao.toFixed(2)),
      `${corFrente} sobre ${corAtras}`,
    ).toBeGreaterThanOrEqual(MINIMO);
  });
});

/** Angulo de matiz em graus, para a regra de separacao abaixo. */
function matiz(hex: string): number {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;

  const h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;

  return (h * 60 + 360) % 360;
}

/** Menor distancia entre dois angulos, lembrando que 350 e 10 sao perto. */
function distanciaDeMatiz(a: string, b: string): number {
  const d = Math.abs(matiz(a) - matiz(b)) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * A marca nao pode invadir a faixa semantica.
 *
 * Marca esverdeada brigaria com "dinheiro", alaranjada com "milhas", e o
 * selo perderia a funcao de dizer alguma coisa. E uma regra de MATIZ,
 * nao de luminosidade: azul e ambar tem luminancia parecida e sao
 * opostos em cor, entao razao de contraste nao mede isto -- foi
 * exatamente o erro da primeira versao deste teste.
 *
 * 45 graus e o piso usual para matizes categoricos distinguiveis. Vale
 * saber onde estamos: o par mais apertado do sistema e ultramar contra
 * o verde de "dinheiro", em 53 graus. Passa, mas e o primeiro que
 * quebra se alguem puxar a marca para o lado do azul-petroleo.
 */
const SEPARACAO_MINIMA_EM_GRAUS = 45;

describe("a marca nao invade a faixa semantica", () => {
  it.each([
    ["claro", claro],
    ["escuro", escuro],
  ])("em %s, a marca esta longe de milhas e dinheiro no circulo", (_n, t) => {
    for (const semantica of ["milhas", "dinheiro"] as const) {
      expect(
        Math.round(distanciaDeMatiz(t.marca, t[semantica])),
        `--marca (${t.marca}) perto demais de --${semantica} (${t[semantica]}) no circulo cromatico`,
      ).toBeGreaterThanOrEqual(SEPARACAO_MINIMA_EM_GRAUS);
    }
  });
});
