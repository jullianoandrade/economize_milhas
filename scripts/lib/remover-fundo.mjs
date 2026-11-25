/**
 * Tira o fundo claro de uma ilustracao de contorno fechado.
 *
 * O ChatGPT entrega PNG/JPG com fundo branco -- e as vezes com o
 * "xadrez" de transparencia DESENHADO na imagem. As artes do Milo tem
 * contorno escuro fechado, entao o fundo e tudo o que da para alcancar a
 * partir das bordas passando so por pixel claro e sem cor:
 *
 * 1. Preenchimento a partir das bordas, por pixels claros e acinzentados
 *    (branco, cinza do xadrez falso, borrao de JPG). Para no contorno.
 * 2. Opcional (vaosInternos): buracos internos quase brancos tambem saem,
 *    como o vao fechado entre a alca e a mochila. Desligado por padrao:
 *    branco fechado tambem e dente e brilho de olho, e o algoritmo nao
 *    sabe a diferenca -- quem liga e quem olhou a imagem.
 * 3. Na franja de 2px junto ao fundo, "cor para alfa" contra o branco:
 *    o pixel meio-contorno meio-branco vira contorno semitransparente, e
 *    o desenho nao ganha aura branca sobre o marinho.
 *
 * Recebe e devolve RGBA cru: { data: Buffer, width, height }.
 */

const CLARO_MIN = 185; // menor canal de um pixel de fundo
const SATURACAO_MAX = 28; // max - min dos canais
const BURACO_MIN_PX = 250;
const BURACO_CLARO_MIN = 240; // a etiqueta da mochila (azulada) fica abaixo

function ehFundo(d, i) {
  const r = d[i];
  const g = d[i + 1];
  const b = d[i + 2];
  const min = Math.min(r, g, b);
  return min >= CLARO_MIN && Math.max(r, g, b) - min <= SATURACAO_MAX;
}

export function removerFundo({ data, width, height }, { vaosInternos = false } = {}) {
  const d = Buffer.from(data);
  const total = width * height;
  const fundo = new Uint8Array(total);
  const fila = new Int32Array(total);

  // 1. preenchimento a partir das bordas
  let ini = 0;
  let fim = 0;
  const semear = (p) => {
    if (!fundo[p] && ehFundo(d, p * 4)) {
      fundo[p] = 1;
      fila[fim++] = p;
    }
  };
  for (let x = 0; x < width; x++) {
    semear(x);
    semear((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    semear(y * width);
    semear(y * width + width - 1);
  }
  while (ini < fim) {
    const p = fila[ini++];
    const x = p % width;
    if (x > 0) semear(p - 1);
    if (x < width - 1) semear(p + 1);
    if (p >= width) semear(p - width);
    if (p < total - width) semear(p + width);
  }

  // 2. buracos internos grandes e quase brancos
  const visto = new Uint8Array(total);
  for (let p0 = 0; vaosInternos && p0 < total; p0++) {
    if (fundo[p0] || visto[p0]) continue;
    const i0 = p0 * 4;
    if (Math.min(d[i0], d[i0 + 1], d[i0 + 2]) < BURACO_CLARO_MIN || !ehFundo(d, i0)) continue;
    const regiao = [];
    visto[p0] = 1;
    regiao.push(p0);
    for (let k = 0; k < regiao.length; k++) {
      const p = regiao[k];
      const x = p % width;
      for (const q of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width]) {
        if (q < 0 || q >= total || visto[q] || fundo[q]) continue;
        const iq = q * 4;
        if (Math.min(d[iq], d[iq + 1], d[iq + 2]) >= BURACO_CLARO_MIN && ehFundo(d, iq)) {
          visto[q] = 1;
          regiao.push(q);
        }
      }
    }
    if (regiao.length >= BURACO_MIN_PX) for (const p of regiao) fundo[p] = 1;
  }

  // 3. fundo transparente; franja de 2px com cor-para-alfa contra o branco
  let franja = new Uint8Array(total);
  for (let anel = 0; anel < 2; anel++) {
    const proxima = new Uint8Array(total);
    for (let p = 0; p < total; p++) {
      if (fundo[p] || franja[p]) continue;
      const x = p % width;
      const vizinhos = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width];
      if (vizinhos.some((q) => q >= 0 && q < total && (fundo[q] || (anel > 0 && franja[q])))) proxima[p] = 1;
    }
    for (let p = 0; p < total; p++) if (proxima[p]) franja[p] = 1;
  }

  for (let p = 0; p < total; p++) {
    const i = p * 4;
    if (fundo[p]) {
      d[i + 3] = 0;
      continue;
    }
    if (!franja[p]) continue;
    const a = Math.max(255 - d[i], 255 - d[i + 1], 255 - d[i + 2]) / 255;
    if (a <= 0.02) {
      d[i + 3] = 0;
      continue;
    }
    for (let c = 0; c < 3; c++) d[i + c] = Math.max(0, Math.min(255, Math.round(255 - (255 - d[i + c]) / a)));
    d[i + 3] = Math.round(Math.min(1, a) * d[i + 3]);
  }

  return { data: d, width, height };
}
