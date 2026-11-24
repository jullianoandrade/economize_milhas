"use client";

import { useEffect, useRef } from "react";
import { grandeCirculo, suavizar, type LatLon } from "@/lib/globo/projecao";
import {
  deEixoAngulo,
  girar,
  multiplicar,
  normalizar,
  orientacaoCentradaEm,
  projetarLivre as projetar,
  rotacaoDoArraste,
  slerp,
  vetorDe,
  type VistaLivre as Vista,
} from "@/lib/globo/rotacao";

/**
 * O globo da tela Explorar, feito dos aeroportos da VoeMilo.
 *
 * Cada ponto e um aeroporto real da base (public/globo/aeroportos.json,
 * gerado por scripts/gerar-pontos-do-globo.mjs). Os continentes
 * aparecem porque e onde ha aeroporto: o fundo bonito e dado, nao
 * ilustracao.
 *
 * Desenhado em <canvas>, e nao em SVG: sao 3.683 pontos redesenhados a
 * cada quadro enquanto o globo gira, e no DOM isso seria 3.683 nos.
 *
 * MOVIMENTO, na regra do projeto: o globo gira devagar enquanto espera;
 * quando a pessoa escolhe um destino, ele vira para a rota, aproxima e
 * traca o arco -- um momento so, e em resposta a uma acao. Com
 * "reduzir movimento" ligado, tudo vai direto ao estado final.
 *
 * GIRO LIVRE (lib/globo/rotacao.ts): a orientacao e um quaternio, entao
 * o globo gira na direcao exata do arraste, sem eixo preso -- da para
 * tombar o polo. Solto, segue com a velocidade da mao e desacelera
 * devagar; o giro de espera volta acelerando aos poucos, sem tranco.
 *
 * As cores sao fixas: o globo e sempre noturno, nos dois temas.
 */

/**
 * "inteiro": o globo cabe todo na caixa, como no topo do Inicio.
 * "rota": aproxima ate o arco ocupar ~60% da largura -- num voo de 500 km
 * o globo inteiro deixaria o arco com 8 px; aqui ele vira o assunto.
 */
export type Enquadramento = "centro" | "direita" | "acima" | "esquerda" | "inteiro" | "rota";

const CENTRO_DO_BRASIL: LatLon = [-14, -51];
const GRAU = Math.PI / 180;

let pontosPendentes: Promise<Float32Array> | null = null; // uma carga por sessao
function carregarPontos(): Promise<Float32Array> {
  pontosPendentes ??= fetch("/globo/aeroportos.json")
    .then((r) => (r.ok ? r.json() : []))
    .then((lista: number[]) => Float32Array.from(lista))
    .catch(() => {
      pontosPendentes = null;
      return new Float32Array();
    });
  return pontosPendentes;
}

/** O ponto 20 graus ao lado do meio da rota, na perpendicular, do lado sul. */
function vistaDeLado(origem: LatLon, destino: LatLon, meio: LatLon): LatLon {
  const a = vetorDe(origem);
  const b = vetorDe(destino);
  const m = vetorDe(meio);
  let n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const tam = Math.hypot(n[0], n[1], n[2]);
  if (tam < 1e-9) return meio;
  n = n.map((x) => x / tam);
  if (n[2] > 0) n = n.map((x) => -x); // o lado sul
  const d = 20 * GRAU;
  const c = m.map((x, i) => x * Math.cos(d) + n[i] * Math.sin(d));
  return [Math.asin(c[2]) / GRAU, Math.atan2(c[1], c[0]) / GRAU];
}

function vistaAlvo(
  w: number,
  h: number,
  enq: Enquadramento,
  centro: LatLon,
  /** Angulo da rota no centro da Terra, em radianos (0 sem rota). */
  angulo = 0,
): Vista {
  const q = orientacaoCentradaEm(centro);
  switch (enq) {
    case "centro":
      return { q, R: Math.min(w * 0.44, h * 0.3), cx: w / 2, cy: h * 0.46 };
    case "direita":
      return { q, R: Math.min(w * 0.3, h * 0.4), cx: w * 0.62, cy: h * 0.52 };
    case "acima":
      return { q, R: Math.min(w * 0.38, h * 0.2), cx: w / 2, cy: h * 0.3 };
    case "esquerda":
      return { q, R: Math.min(w * 0.26, h * 0.36), cx: w * 0.32, cy: h * 0.54 };
    case "inteiro":
      return { q, R: Math.min(w, h) * 0.42, cx: w / 2, cy: h / 2 };
    case "rota": {
      const inteiro = Math.min(w, h) * 0.42;
      const corda = 2 * Math.sin(Math.max(angulo, 0.005) / 2);
      // o arco sobe acima da corda: desce o centro para ele caber
      // teto de aproximacao: rota curta fica com arco menor, mas com
      // aeroportos em volta suficientes para dizer onde no mapa ela esta
      return { q, R: Math.min(Math.max(inteiro, (w * 0.6) / corda), w * 4), cx: w / 2, cy: h * 0.62 };
    }
  }
}

export function Globo({
  rota,
  enquadramento,
  arrastavel = false,
}: {
  /** Origem e destino; null = globo em espera, girando sobre o Brasil. */
  rota: { origem: LatLon; destino: LatLon; rotulos: [string, string] } | null;
  enquadramento: Enquadramento;
  /**
   * A pessoa pode girar o globo arrastando. Com o mouse, em qualquer
   * direcao; no toque, so o componente horizontal do arraste -- o
   * vertical continua rolando a pagina (touch-action: pan-y), para o
   * globo nunca prender a tela.
   */
  arrastavel?: boolean;
}) {
  const telaRef = useRef<HTMLCanvasElement>(null);
  const pedido = useRef({ rota, enquadramento, versao: 0 });

  // A prop muda; o laco de animacao le daqui no proximo quadro.
  useEffect(() => {
    pedido.current = {
      rota,
      enquadramento,
      versao: pedido.current.versao + 1,
    };
  }, [rota, enquadramento]);

  const arrastavelRef = useRef(arrastavel);
  useEffect(() => {
    arrastavelRef.current = arrastavel;
  }, [arrastavel]);

  useEffect(() => {
    const tela = telaRef.current;
    const ctx = tela?.getContext("2d");
    if (!tela || !ctx) return;

    const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    let pontos: Float32Array = new Float32Array();
    let visto = -1;
    let vista: Vista | null = null;
    let tween: { de: Vista; para: Vista; inicio: number; ms: number } | null = null;
    let arco = 0;
    let arcoInicio = 0;
    let arcoAlvo = 0;
    let caminho: ((t: number) => LatLon) | null = null;
    let angulo = 0; // da rota, no centro da Terra
    let quadro = 0;
    const fonte = getComputedStyle(document.body).fontFamily;

    carregarPontos().then((p) => (pontos = p));

    // ---- Arraste -------------------------------------------------------
    // O ponto sob a mao acompanha a mao (1 radiano por raio arrastado).
    // A velocidade angular e um vetor no referencial da tela (eixo vezes
    // rad/ms), alisado entre eventos para a inercia nao herdar o tremor
    // do ultimo movimento.
    let arrastando: { id: number; x: number; y: number; t: number } | null = null;
    let giro: [number, number, number] = [0, 0, 0];
    let ultimoToque = -Infinity;
    let espera = 0; // 0..1: o giro de espera volta acelerando

    const dentroDoDisco = (x: number, y: number) =>
      vista !== null && Math.hypot(x - vista.cx, y - vista.cy) <= vista.R * 1.05;

    const local = (e: PointerEvent) => {
      const caixa = tela.getBoundingClientRect();
      return { x: e.clientX - caixa.left, y: e.clientY - caixa.top };
    };

    const aoApertar = (e: PointerEvent) => {
      if (!arrastavelRef.current || !vista) return;
      const { x, y } = local(e);
      if (!dentroDoDisco(x, y)) return;
      arrastando = { id: e.pointerId, x, y, t: performance.now() };
      tween = null; // a mao da pessoa manda; a animacao em curso para
      giro = [0, 0, 0];
      espera = 0;
      tela.setPointerCapture(e.pointerId);
      tela.style.cursor = "grabbing";
    };

    const aoMover = (e: PointerEvent) => {
      if (!arrastavelRef.current || !vista) return;
      const { x, y } = local(e);
      if (!arrastando || arrastando.id !== e.pointerId) {
        tela.style.cursor = dentroDoDisco(x, y) ? "grab" : "";
        return;
      }
      const dx = x - arrastando.x;
      // no toque, a vertical e da rolagem da pagina
      const dy = e.pointerType === "mouse" ? y - arrastando.y : 0;
      vista.q = normalizar(multiplicar(rotacaoDoArraste(dx, dy, vista.R), vista.q));

      const agora = performance.now();
      const dt = Math.max(4, agora - arrastando.t);
      const novo = [0, dy / vista.R / dt, dx / vista.R / dt];
      giro = [
        giro[0] * 0.4 + novo[0] * 0.6,
        giro[1] * 0.4 + novo[1] * 0.6,
        giro[2] * 0.4 + novo[2] * 0.6,
      ];
      arrastando = { id: e.pointerId, x, y, t: agora };
    };

    const aoSoltar = (e: PointerEvent) => {
      if (!arrastando || arrastando.id !== e.pointerId) return;
      const agora = performance.now();
      // parou a mao antes de soltar: o globo para junto
      if (calmo || agora - arrastando.t > 90) giro = [0, 0, 0];
      arrastando = null;
      ultimoToque = agora;
      tela.style.cursor = arrastavelRef.current ? "grab" : "";
    };

    tela.addEventListener("pointerdown", aoApertar);
    tela.addEventListener("pointermove", aoMover);
    tela.addEventListener("pointerup", aoSoltar);
    tela.addEventListener("pointercancel", aoSoltar);

    const medir = () => {
      const caixa = tela.getBoundingClientRect();
      w = caixa.width;
      h = caixa.height;
      tela.width = Math.round(w * dpr);
      tela.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      visto = -1; // reenquadra no proximo quadro
    };
    const observador = new ResizeObserver(medir);
    observador.observe(tela);
    medir();

    const reenquadrar = (agora: number) => {
      const { rota: r, enquadramento: enq } = pedido.current;
      let centro = CENTRO_DO_BRASIL;
      angulo = 0;
      if (r) {
        caminho = grandeCirculo(r.origem, r.destino);
        const meio = caminho(0.5);
        // Fora do enquadramento "rota", o globo olha a rota de LADO: o
        // centro da vista sai 20 graus do meio dela, na perpendicular.
        // Grande circulo que passa pelo centro da vista projeta como reta;
        // visto de lado, vira a curva de um voo -- em qualquer direcao,
        // inclusive norte-sul. O lado escolhido e o mais ao sul, para o
        // arco subir na tela.
        centro = enq === "rota" ? meio : vistaDeLado(r.origem, r.destino, meio);
        const a = vetorDe(r.origem);
        const b = vetorDe(r.destino);
        angulo = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
      } else {
        caminho = null;
      }
      const para = vistaAlvo(w, h, enq, centro, angulo);
      if (enq !== "rota" && r) {
        // A vista de lado empurra a rota para fora do centro do quadro;
        // o disco anda de volta 70% disso, para o arco ficar onde o
        // enquadramento pediu (e nao embaixo da busca, no celular).
        const pm = projetar(para, caminho!(0.5));
        para.cx -= (pm.x - para.cx) * 0.7;
        para.cy -= (pm.y - para.cy) * 0.7;
      }
      if (enq === "rota" && r) {
        // Deita a rota: gira em torno da linha de visao ate a origem
        // ficar a esquerda e o destino a direita. Sem eixo preso, o
        // norte nao precisa ficar para cima -- a rota e o assunto.
        const o = girar(para.q, vetorDe(r.origem));
        const d = girar(para.q, vetorDe(r.destino));
        const inclinacao = Math.atan2(d[2] - o[2], d[1] - o[1]);
        para.q = normalizar(multiplicar(deEixoAngulo([1, 0, 0], -inclinacao), para.q));
      }
      giro = [0, 0, 0];
      if (!vista) {
        vista = para;
      } else {
        // o slerp gira pelo caminho mais curto e endireita o norte
        tween = { de: { ...vista }, para, inicio: agora, ms: calmo ? 0 : 1100 };
      }
      arco = 0;
      arcoAlvo = r ? 1 : 0;
      arcoInicio = agora + (calmo ? 0 : 1000);
    };

    const desenhar = (v: Vista) => {
      ctx.clearRect(0, 0, w, h);
      const halo = ctx.createRadialGradient(v.cx, v.cy, v.R * 0.7, v.cx, v.cy, v.R * 1.28);
      halo.addColorStop(0, "rgba(127,160,255,0.14)");
      halo.addColorStop(1, "rgba(127,160,255,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(v.cx, v.cy, v.R * 1.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(20,35,61,0.92)";
      ctx.beginPath();
      ctx.arc(v.cx, v.cy, v.R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(127,160,255,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const tam = v.R > w ? 2.2 : v.R > 120 ? 1.7 : 1.4;
      for (let i = 0; i < pontos.length; i += 2) {
        const p = projetar(v, [pontos[i], pontos[i + 1]]);
        if (p.frente <= 0) continue;
        ctx.fillStyle = `rgba(127,160,255,${(0.18 + 0.7 * p.frente).toFixed(2)})`;
        ctx.fillRect(p.x - tam / 2, p.y - tam / 2, tam, tam);
      }

      const r = pedido.current.rota;
      if (!caminho || !r || arco <= 0) return;
      const N = 90;
      const ate = Math.floor(N * arco);
      // No enquadramento "rota" o meio da rota fica no centro do disco, e
      // grande circulo pelo centro projeta como RETA. O arco e tracado na
      // tela: uma curva entre as duas pontas, subindo 30% da distancia.
      const naTela = pedido.current.enquadramento === "rota";
      const a = projetar(v, r.origem);
      const b = projetar(v, r.destino);
      const ctl = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 0.3 * Math.hypot(b.x - a.x, b.y - a.y) };
      const pontoDaCurva = (t: number) => {
        if (!naTela) return projetar(v, caminho!(t), 1 + Math.min(0.16, 0.35 * angulo) * Math.sin(Math.PI * t));
        const u = 1 - t;
        return { x: u * u * a.x + 2 * u * t * ctl.x + t * t * b.x, y: u * u * a.y + 2 * u * t * ctl.y + t * t * b.y, frente: 1 };
      };
      ctx.save();
      ctx.strokeStyle = "#ffb020";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(255,176,32,0.55)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      let cabeca = projetar(v, r.origem);
      for (let i = 0; i <= ate; i++) {
        const t = i / N;
        cabeca = pontoDaCurva(t);
        if (i === 0) ctx.moveTo(cabeca.x, cabeca.y);
        else ctx.lineTo(cabeca.x, cabeca.y);
      }
      ctx.stroke();
      ctx.restore();

      const marcar = (c: LatLon, nome: string, lado: -1 | 1) => {
        const p = projetar(v, c);
        if (p.frente <= 0) return;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `600 13px ${fonte}`;
        ctx.textAlign = lado < 0 ? "right" : "left";
        ctx.fillText(nome, p.x + lado * 10, p.y + 4);
      };
      // cada rotulo do lado de fora do arco, para nunca cruzar o traco
      const origemAEsquerda = projetar(v, r.origem).x <= projetar(v, r.destino).x;
      marcar(r.origem, r.rotulos[0], origemAEsquerda ? -1 : 1);
      if (arco >= 1) marcar(r.destino, r.rotulos[1], origemAEsquerda ? 1 : -1);
      else {
        ctx.fillStyle = "#ffb020";
        ctx.beginPath();
        ctx.arc(cabeca.x, cabeca.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let anterior = performance.now();
    const laco = (agora: number) => {
      // aba em segundo plano nao vira salto quando volta
      const dt = Math.min(50, Math.max(0, agora - anterior));
      anterior = agora;
      if (pedido.current.versao !== visto && w > 0) {
        visto = pedido.current.versao;
        reenquadrar(agora);
      }
      if (vista) {
        const velocidade = Math.hypot(giro[0], giro[1], giro[2]);
        if (tween) {
          const t = tween.ms === 0 ? 1 : Math.min(1, (agora - tween.inicio) / tween.ms);
          const e = suavizar(t);
          const de = tween.de;
          const para = tween.para;
          vista = {
            q: slerp(de.q, para.q, e),
            R: de.R + (para.R - de.R) * e,
            cx: de.cx + (para.cx - de.cx) * e,
            cy: de.cy + (para.cy - de.cy) * e,
          };
          if (t >= 1) tween = null;
        } else if (!arrastando && velocidade > 2e-6) {
          // inercia: segue na direcao do arraste e perde ~63% a cada 650 ms
          vista.q = normalizar(multiplicar(deEixoAngulo(giro, velocidade * dt), vista.q));
          const atrito = Math.exp(-dt / 650);
          giro = [giro[0] * atrito, giro[1] * atrito, giro[2] * atrito];
        } else if (
          !arrastando &&
          !pedido.current.rota &&
          !calmo &&
          agora - ultimoToque > 2500
        ) {
          // espera: gira em torno do eixo da propria Terra, ~1,8 grau/s,
          // e chega a essa velocidade em ~1,5 s
          espera = Math.min(1, espera + dt / 1500);
          const ang = ((1.8 * GRAU) / 1000) * dt * suavizar(espera);
          vista.q = normalizar(multiplicar(vista.q, deEixoAngulo([0, 0, 1], ang)));
        }
        if (arcoAlvo > 0 && agora >= arcoInicio) {
          arco = calmo ? 1 : Math.min(1, suavizar(Math.min(1, (agora - arcoInicio) / 1400)));
        }
        desenhar(vista);
      }
      quadro = requestAnimationFrame(laco);
    };
    quadro = requestAnimationFrame(laco);

    return () => {
      cancelAnimationFrame(quadro);
      observador.disconnect();
      tela.removeEventListener("pointerdown", aoApertar);
      tela.removeEventListener("pointermove", aoMover);
      tela.removeEventListener("pointerup", aoSoltar);
      tela.removeEventListener("pointercancel", aoSoltar);
    };
  }, []);

  return (
    <canvas
      ref={telaRef}
      aria-hidden="true"
      className={`block size-full ${arrastavel ? "pointer-events-auto touch-pan-y" : "pointer-events-none"}`}
    />
  );
}
