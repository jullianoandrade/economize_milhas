/**
 * Coloca uma pose do Milo no app.
 *
 *   node scripts/preparar-milo.mjs <pose> <arquivo.png> [--espelhar]
 *
 * Poses: apontando, rosto, comemorando, esperando, pensando.
 *
 * O PNG precisa ter fundo transparente (o do ChatGPT, pedido assim, tem).
 * O script recorta a sobra transparente, reduz para o tamanho que o app
 * usa (com folga para tela de 3x), converte para WebP e registra a pose
 * em lib/milo/poses.json. O nome do arquivo leva um hash do conteudo:
 * trocar a arte nunca serve a versao velha do cache.
 *
 * --espelhar: o app espera o Milo APONTANDO PARA A ESQUERDA (ele fica a
 * direita do conteudo que mostra). Se a arte aponta para a direita, use
 * esta opcao e o app espelha na hora de desenhar.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const POSES = ["apontando", "rosto", "comemorando", "esperando", "pensando"];
const raiz = path.resolve(import.meta.dirname, "..");
const pasta = path.join(raiz, "public", "milo");
const registro = path.join(raiz, "lib", "milo", "poses.json");

const [pose, entrada, ...opcoes] = process.argv.slice(2);
if (!POSES.includes(pose) || !entrada) {
  console.error(`uso: node scripts/preparar-milo.mjs <${POSES.join("|")}> <arquivo.png> [--espelhar]`);
  process.exit(1);
}

const original = sharp(entrada);
const info = await original.metadata();
if (!info.hasAlpha) {
  console.error(
    "Esta imagem nao tem fundo transparente. Peca de novo ao ChatGPT com " +
      '"fundo transparente (PNG)" -- recortar fundo branco a mao deixa borda suja.',
  );
  process.exit(1);
}

// O rosto vira avatar de ate ~56px; o corpo inteiro aparece com ate ~130px
// de largura. Os lados abaixo cobrem isso em tela de 3x.
const lado = pose === "rosto" ? 320 : 600;
const recortada = await sharp(entrada).trim({ threshold: 1 }).toBuffer();
const webp = await sharp(recortada)
  .resize({ width: lado, height: lado, fit: "inside", withoutEnlargement: true })
  .webp({ quality: 88, alphaQuality: 100, effort: 6 })
  .toBuffer();
const { width, height } = await sharp(webp).metadata();

const hash = createHash("sha256").update(webp).digest("hex").slice(0, 8);
const arquivo = `${pose}-${hash}.webp`;
for (const velho of readdirSync(pasta).filter((f) => f.startsWith(`${pose}-`))) {
  rmSync(path.join(pasta, velho));
}
writeFileSync(path.join(pasta, arquivo), webp);

const poses = JSON.parse(readFileSync(registro, "utf8"));
poses[pose] = { arquivo, largura: width, altura: height, espelhar: opcoes.includes("--espelhar") };
writeFileSync(registro, JSON.stringify(poses, null, 2) + "\n");

console.log(`${pose}: public/milo/${arquivo} (${width}x${height}, ${(webp.length / 1024).toFixed(0)} KB)`);
