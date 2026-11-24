/**
 * Rotacao livre do globo, com quaternios.
 *
 * Ate 24/11/2026 o globo girava por longitude e latitude, como um globo
 * de mesa preso num eixo: arrastar na diagonal travava, e o polo nunca
 * saia do alto. Com quaternio a orientacao e uma rotacao 3D qualquer --
 * o globo vai para onde a mao leva, em qualquer direcao, e interpolar
 * entre duas orientacoes (slerp) sempre segue o caminho mais curto.
 *
 * Referencial da tela: x aponta para quem olha, y para a direita, z para
 * cima. Um ponto da esfera e visivel quando, depois de girado, x > 0.
 *
 * Puro, para ter teste: tests/globo.test.ts confere que esta projecao e
 * identica a antiga (lib/globo/projecao.ts) quando nao ha giro em torno
 * da linha de visao.
 */

import type { LatLon, PontoNaTela } from "./projecao";

export type Quat = readonly [w: number, x: number, y: number, z: number];
type Vec = readonly [number, number, number];

const RAD = Math.PI / 180;

export const IDENTIDADE: Quat = [1, 0, 0, 0];

export function multiplicar(a: Quat, b: Quat): Quat {
  const [aw, ax, ay, az] = a;
  const [bw, bx, by, bz] = b;
  return [
    aw * bw - ax * bx - ay * by - az * bz,
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
  ];
}

export function normalizar(q: Quat): Quat {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

/** Rotacao de `angulo` radianos em torno de `eixo` (nao precisa ser unitario). */
export function deEixoAngulo(eixo: Vec, angulo: number): Quat {
  const n = Math.hypot(eixo[0], eixo[1], eixo[2]);
  if (n < 1e-12 || angulo === 0) return IDENTIDADE;
  const s = Math.sin(angulo / 2) / n;
  return [Math.cos(angulo / 2), eixo[0] * s, eixo[1] * s, eixo[2] * s];
}

export function girar(q: Quat, v: Vec): [number, number, number] {
  // v' = q * v * q^-1, na forma expandida (sem montar quaternios)
  const [w, x, y, z] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

/** Interpolacao esferica: sempre pelo caminho mais curto. */
export function slerp(a: Quat, b: Quat, t: number): Quat {
  let cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb: Quat = b;
  if (cos < 0) {
    cos = -cos;
    bb = [-b[0], -b[1], -b[2], -b[3]];
  }
  if (cos > 0.9995) {
    return normalizar([
      a[0] + (bb[0] - a[0]) * t,
      a[1] + (bb[1] - a[1]) * t,
      a[2] + (bb[2] - a[2]) * t,
      a[3] + (bb[3] - a[3]) * t,
    ]);
  }
  const ang = Math.acos(cos);
  const s = Math.sin(ang);
  const p = Math.sin((1 - t) * ang) / s;
  const q = Math.sin(t * ang) / s;
  return [
    a[0] * p + bb[0] * q,
    a[1] * p + bb[1] * q,
    a[2] * p + bb[2] * q,
    a[3] * p + bb[3] * q,
  ];
}

export function vetorDe([lat, lon]: LatLon): [number, number, number] {
  const f = lat * RAD;
  const l = lon * RAD;
  return [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)];
}

/**
 * A orientacao que poe (lat, lon) no centro do disco, com o norte para
 * cima: gira -lon em torno do eixo da Terra e depois +lat em torno do
 * eixo horizontal da tela.
 */
export function orientacaoCentradaEm([lat, lon]: LatLon): Quat {
  const emLongitude = deEixoAngulo([0, 0, 1], -lon * RAD);
  const emLatitude = deEixoAngulo([0, 1, 0], lat * RAD);
  return normalizar(multiplicar(emLatitude, emLongitude));
}

export type VistaLivre = { q: Quat; R: number; cx: number; cy: number };

export function projetarLivre(
  v: VistaLivre,
  ponto: LatLon,
  altitude = 1,
): PontoNaTela {
  const [x, y, z] = girar(v.q, vetorDe(ponto));
  const k = v.R * altitude;
  return { x: v.cx + k * y, y: v.cy - k * z, frente: x };
}

/**
 * Converte um arraste na tela (em px) numa rotacao do globo: o ponto sob
 * o dedo acompanha o dedo. Arrastar para a direita gira em torno do eixo
 * vertical da tela; para baixo, em torno do horizontal; na diagonal, em
 * torno do eixo perpendicular ao movimento -- sem eixo preferido.
 */
export function rotacaoDoArraste(dx: number, dy: number, R: number): Quat {
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || R <= 0) return IDENTIDADE;
  return deEixoAngulo([0, dy, dx], dist / R);
}
