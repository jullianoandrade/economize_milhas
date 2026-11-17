/**
 * A matematica do globo da tela Explorar, sem nada de tela.
 *
 * Projecao ortografica: o globo visto de longe, como uma foto da Terra.
 * E a projecao certa para este uso porque mostra a curvatura -- o arco
 * de Sao Paulo a Lisboa sai curvo porque E curvo, nao por enfeite.
 *
 * Puro de proposito, para ter teste: um sinal trocado aqui desenha o
 * Brasil no Pacifico e nada quebra, so fica errado.
 */

export type LatLon = readonly [lat: number, lon: number];

/** Para onde o globo olha e onde ele fica na tela. */
export type Vista = {
  /** Longitude no centro do disco. */
  lam: number;
  /** Latitude no centro do disco. */
  phi: number;
  /** Raio do disco, em px. */
  R: number;
  cx: number;
  cy: number;
};

const RAD = Math.PI / 180;

export type PontoNaTela = {
  x: number;
  y: number;
  /** Cosseno da distancia ao centro: > 0 na face visivel, 1 no centro. */
  frente: number;
};

/**
 * `altitude` > 1 levanta o ponto acima da superficie -- e assim que o
 * arco da rota "voa" em vez de colar no chao.
 */
export function projetar(
  v: Vista,
  [lat, lon]: LatLon,
  altitude = 1,
): PontoNaTela {
  const f = lat * RAD;
  const l = (lon - v.lam) * RAD;
  const f0 = v.phi * RAD;
  const frente =
    Math.sin(f0) * Math.sin(f) + Math.cos(f0) * Math.cos(f) * Math.cos(l);
  const k = v.R * altitude;
  return {
    x: v.cx + k * Math.cos(f) * Math.sin(l),
    y:
      v.cy -
      k * (Math.cos(f0) * Math.sin(f) - Math.sin(f0) * Math.cos(f) * Math.cos(l)),
    frente,
  };
}

function vetor([lat, lon]: LatLon): [number, number, number] {
  const f = lat * RAD;
  const l = lon * RAD;
  return [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)];
}

function latLon([x, y, z]: readonly number[]): LatLon {
  return [Math.asin(Math.max(-1, Math.min(1, z))) / RAD, Math.atan2(y, x) / RAD];
}

/**
 * O caminho mais curto entre dois pontos da esfera (grande circulo),
 * como funcao de t em [0, 1]. E a rota que o aviao de fato faz.
 */
export function grandeCirculo(a: LatLon, b: LatLon): (t: number) => LatLon {
  const A = vetor(a);
  const B = vetor(b);
  const cos = Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
  const omega = Math.acos(cos);
  if (omega < 1e-6) return () => a;
  const s = Math.sin(omega);
  return (t) => {
    const p = Math.sin((1 - t) * omega) / s;
    const q = Math.sin(t * omega) / s;
    return latLon([p * A[0] + q * B[0], p * A[1] + q * B[1], p * A[2] + q * B[2]]);
  };
}

/** Diferenca de longitude pelo lado mais curto, em (-180, 180]. */
export function deltaDeLongitude(de: number, para: number): number {
  let d = (para - de) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** Aceleracao e freada suaves; e a curva de toda animacao do globo. */
export function suavizar(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
