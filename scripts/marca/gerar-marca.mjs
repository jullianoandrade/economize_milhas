/**
 * Gera a marca da VoeMilo: arquivos da logo e icones do app.
 *
 *   node scripts/marca/gerar-marca.mjs <icone-original.jpg|png>
 *
 * LOGO. As curvas ficam em components/ui/logo-partes.json. Para
 * redesenhar (outro peso, outro traco), regenere esse arquivo:
 *   python scripts/marca/curvas.py <bricolage.woff2> -0.02 > curvas.json
 *   python scripts/marca/montar.py curvas.json -30 > components/ui/logo-partes.json
 * (precisa de `pip install --user fonttools brotli`; o woff2 da Bricolage
 * Grotesque sai do build, em .next/static/media -- o de faixa latina.)
 * Este script so le o JSON e escreve os arquivos de uso externo em
 * public/marca/ (SVG e PNG, fundo claro e escuro).
 *
 * ICONES. A arte do icone (Milo de frente num quadrado marinho, com o
 * canhoto do cachecol saindo pela borda) vem com fundo branco. O Milo e
 * recortado e vai para um quadrado marinho de ponta a ponta, da mesma cor
 * do quadrado da arte, encostado na base -- o canhoto nao e cortado e o
 * corpo continua para fora da borda. O sistema arredonda os
 * cantos. Versao "mascara" com mais respiro, para o recorte em circulo do
 * Android.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const raiz = path.resolve(import.meta.dirname, "..", "..");
const partes = JSON.parse(fs.readFileSync(path.join(raiz, "components/ui/logo-partes.json"), "utf8"));
const MARINHO = "#0b1526";
const AMBAR = "#ffb020";

// ---- logo --------------------------------------------------------------
function logoSvg(tinta, fundo, comFundo) {
  const w = partes.corte * 2;
  const voo = (a) =>
    `<path d="${partes.traco}" ${a}/><path d="${partes.canhoto}" transform="${partes.canhotoTransform}" ${a}/>`;
  const [x, y, lw, lh] = partes.viewBox.split(" ").map(Number);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${partes.viewBox}">
  ${comFundo ? `<rect x="${x}" y="${y}" width="${lw}" height="${lh}" fill="${fundo}"/>` : ""}
  <path d="${partes.letras}" fill="${tinta}"/>
  ${voo(`fill="${fundo}" stroke="${fundo}" stroke-width="${w}" stroke-linejoin="round"`)}
  ${voo(`fill="${AMBAR}"`)}
  <path d="${partes.picote}" transform="${partes.canhotoTransform}" stroke="${fundo}" stroke-width="12" stroke-dasharray="22 18" fill="none"/>
  <path d="${partes.m}" fill="${tinta}"/>
</svg>
`;
}

const saidaMarca = path.join(raiz, "public", "marca");
fs.mkdirSync(saidaMarca, { recursive: true });
for (const [nome, tinta, fundo] of [
  ["logo-sobre-claro", MARINHO, "#ffffff"],
  ["logo-sobre-marinho", "#ffffff", MARINHO],
]) {
  fs.writeFileSync(path.join(saidaMarca, `${nome}.svg`), logoSvg(tinta, fundo, false));
  await sharp(Buffer.from(logoSvg(tinta, fundo, true)), { density: 300 })
    .resize({ width: 2400 })
    .png()
    .toFile(path.join(saidaMarca, `${nome}.png`));
}
console.log("logo: public/marca/logo-sobre-claro.(svg|png), logo-sobre-marinho.(svg|png)");

// ---- icones ------------------------------------------------------------
const original = process.argv[2];
if (!original) {
  console.log("icones: sem arquivo de origem, mantidos como estao");
  process.exit(0);
}

const { data, info } = await sharp(original).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
// a cor do quadrado da arte, lida no proprio quadrado (canto interno)
const amostra = (() => {
  const i = (Math.round(H * 0.2) * W + Math.round(W * 0.2)) * 3;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
})();

// Fundo = tudo o que e FRIO e se alcanca pelas bordas: o branco, o
// marinho do quadrado e a borda entre os dois. O Milo e todo quente
// (pelo, cachecol, contorno marrom), entao o preenchimento para nele.
// Sem isso, o contorno do quadrado original ficava como uma linha fina.
const fundo = new Uint8Array(W * H);
const fila = new Int32Array(W * H);
let ini = 0;
let fim = 0;
const frio = (q) => data[q * 3] - data[q * 3 + 2] < 12;
const semear = (q) => {
  if (!fundo[q] && frio(q)) {
    fundo[q] = 1;
    fila[fim++] = q;
  }
};
for (let x = 0; x < W; x++) { semear(x); semear((H - 1) * W + x); }
for (let y = 0; y < H; y++) { semear(y * W); semear(y * W + W - 1); }
while (ini < fim) {
  const q = fila[ini++];
  const x = q % W;
  if (x > 0) semear(q - 1);
  if (x < W - 1) semear(q + 1);
  if (q >= W) semear(q - W);
  if (q < W * H - W) semear(q + W);
}
const rgba = Buffer.alloc(W * H * 4);
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let q = 0; q < W * H; q++) {
  if (fundo[q]) continue;
  rgba[q * 4] = data[q * 3];
  rgba[q * 4 + 1] = data[q * 3 + 1];
  rgba[q * 4 + 2] = data[q * 3 + 2];
  rgba[q * 4 + 3] = 255;
  const x = q % W;
  const y = (q - x) / W;
  if (x < x0) x0 = x;
  if (x > x1) x1 = x;
  if (y < y0) y0 = y;
  if (y > y1) y1 = y;
}
const desenho = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
  .png()
  .toBuffer();

// Retrato: o corpo da arte termina num corte reto, entao o desenho encosta
// na BASE do icone e o corpo continua para fora da borda.
async function icone(lado, respiro) {
  const interno = Math.round(lado * (1 - 2 * respiro));
  const arte = await sharp(desenho).resize({ width: interno, height: Math.round(lado * (1 - respiro)), fit: "inside" }).toBuffer();
  const m = await sharp(arte).metadata();
  return sharp({ create: { width: lado, height: lado, channels: 4, background: { ...amostra, alpha: 1 } } })
    .composite([{ input: arte, left: Math.round((lado - m.width) / 2), top: lado - m.height }])
    .png({ palette: true, quality: 90, effort: 10 });
}

const app = path.join(raiz, "app");
await (await icone(512, 0.07)).toFile(path.join(app, "icon.png"));
await (await icone(180, 0.07)).toFile(path.join(app, "apple-icon.png"));
await (await icone(192, 0.07)).toFile(path.join(raiz, "public", "icone-192.png"));
await (await icone(512, 0.07)).toFile(path.join(raiz, "public", "icone-512.png"));
// mascara: o Android recorta um circulo; o rosto fica dentro da zona segura
await (await icone(512, 0.11)).toFile(path.join(raiz, "public", "icone-mascara-512.png"));
console.log(
  `icones: app/icon.png, app/apple-icon.png, public/icone-192.png, public/icone-512.png, public/icone-mascara-512.png (fundo rgb(${amostra.r},${amostra.g},${amostra.b}))`,
);
