/**
 * Gera public/globo/aeroportos.json: so latitude e longitude de cada
 * aeroporto da base, numa lista plana [lat, lon, lat, lon, ...].
 *
 * O globo da tela Explorar e desenhado com estes pontos -- os
 * continentes aparecem porque e onde existem aeroportos. A base inteira
 * (nomes, apelidos, relevancia) NAO vai ao navegador; isto e so o
 * minimo para desenhar, com uma casa decimal (~11 km, invisivel no
 * tamanho em que o globo aparece).
 *
 * Rode de novo sempre que data/aeroportos.json mudar:
 *   node scripts/gerar-pontos-do-globo.mjs
 * tests/globo.test.ts acusa se os dois ficarem fora de sincronia.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const { aeroportos } = JSON.parse(
  readFileSync(path.join(raiz, "data", "aeroportos.json"), "utf8"),
);

const plano = [];
for (const a of aeroportos) {
  plano.push(Math.round(a.lat * 10) / 10, Math.round(a.lon * 10) / 10);
}

mkdirSync(path.join(raiz, "public", "globo"), { recursive: true });
writeFileSync(
  path.join(raiz, "public", "globo", "aeroportos.json"),
  JSON.stringify(plano),
);
console.log(`${aeroportos.length} aeroportos gravados.`);
