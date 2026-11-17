"use client";

import { useEffect, useRef } from "react";
import {
  deltaDeLongitude,
  grandeCirculo,
  projetar,
  suavizar,
  type LatLon,
  type Vista,
} from "@/lib/globo/projecao";

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
 * As cores sao fixas: o globo e sempre noturno, nos dois temas.
 */

export type Enquadramento = "centro" | "direita" | "acima" | "esquerda";

const CENTRO_DO_BRASIL: LatLon = [-14, -51];

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

function vistaAlvo(
  w: number,
  h: number,
  enq: Enquadramento,
  centro: LatLon,
): Vista {
  const [phi, lam] = centro;
  switch (enq) {
    case "centro":
      return { lam, phi, R: Math.min(w * 0.44, h * 0.3), cx: w / 2, cy: h * 0.46 };
    case "direita":
      return { lam, phi, R: Math.min(w * 0.3, h * 0.4), cx: w * 0.62, cy: h * 0.52 };
    case "acima":
      return { lam, phi, R: Math.min(w * 0.38, h * 0.2), cx: w / 2, cy: h * 0.3 };
    case "esquerda":
      return { lam, phi, R: Math.min(w * 0.26, h * 0.36), cx: w * 0.32, cy: h * 0.54 };
  }
}

export function Globo({
  rota,
  enquadramento,
}: {
  /** Origem e destino; null = globo em espera, girando sobre o Brasil. */
  rota: { origem: LatLon; destino: LatLon; rotulos: [string, string] } | null;
  enquadramento: Enquadramento;
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
    let quadro = 0;
    const fonte = getComputedStyle(document.body).fontFamily;

    carregarPontos().then((p) => (pontos = p));

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
      if (r) {
        caminho = grandeCirculo(r.origem, r.destino);
        centro = caminho(0.5);
      } else {
        caminho = null;
      }
      const para = vistaAlvo(w, h, enq, centro);
      if (!vista) {
        vista = para;
      } else {
        // gira pelo lado mais curto
        para.lam = vista.lam + deltaDeLongitude(vista.lam, para.lam);
        tween = { de: { ...vista }, para, inicio: agora, ms: calmo ? 0 : 1100 };
      }
      arco = 0;
      arcoAlvo = r ? 1 : 0;
      arcoInicio = agora + (calmo ? 0 : 1000);
    };

    const desenhar = (v: Vista) => {
      ctx.clearRect(0, 0, w, h);
      const halo = ctx.createRadialGradient(v.cx, v.cy, v.R * 0.7, v.cx, v.cy, v.R * 1.28);
      halo.addColorStop(0, "rgba(128,152,196,0.12)");
      halo.addColorStop(1, "rgba(128,152,196,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(v.cx, v.cy, v.R * 1.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(22,38,63,0.9)";
      ctx.beginPath();
      ctx.arc(v.cx, v.cy, v.R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(128,152,196,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const tam = v.R > 120 ? 1.7 : 1.4;
      for (let i = 0; i < pontos.length; i += 2) {
        const p = projetar(v, [pontos[i], pontos[i + 1]]);
        if (p.frente <= 0) continue;
        ctx.fillStyle = `rgba(160,180,218,${(0.18 + 0.7 * p.frente).toFixed(2)})`;
        ctx.fillRect(p.x - tam / 2, p.y - tam / 2, tam, tam);
      }

      const r = pedido.current.rota;
      if (!caminho || !r || arco <= 0) return;
      const N = 90;
      const ate = Math.floor(N * arco);
      ctx.save();
      ctx.strokeStyle = "#f2b33d";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(242,179,61,0.55)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      let cabeca = projetar(v, r.origem);
      for (let i = 0; i <= ate; i++) {
        const t = i / N;
        cabeca = projetar(v, caminho(t), 1 + 0.16 * Math.sin(Math.PI * t));
        if (i === 0) ctx.moveTo(cabeca.x, cabeca.y);
        else ctx.lineTo(cabeca.x, cabeca.y);
      }
      ctx.stroke();
      ctx.restore();

      const marcar = (c: LatLon, nome: string, lado: -1 | 1) => {
        const p = projetar(v, c);
        if (p.frente <= 0) return;
        ctx.fillStyle = "#f2ede0";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `600 13px ${fonte}`;
        ctx.textAlign = lado < 0 ? "right" : "left";
        ctx.fillText(nome, p.x + lado * 10, p.y + 4);
      };
      marcar(r.origem, r.rotulos[0], -1);
      if (arco >= 1) marcar(r.destino, r.rotulos[1], 1);
      else {
        ctx.fillStyle = "#f2b33d";
        ctx.beginPath();
        ctx.arc(cabeca.x, cabeca.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const laco = (agora: number) => {
      if (pedido.current.versao !== visto && w > 0) {
        visto = pedido.current.versao;
        reenquadrar(agora);
      }
      if (vista) {
        if (tween) {
          const t = tween.ms === 0 ? 1 : Math.min(1, (agora - tween.inicio) / tween.ms);
          const e = suavizar(t);
          const de = tween.de;
          const para = tween.para;
          vista = {
            lam: de.lam + (para.lam - de.lam) * e,
            phi: de.phi + (para.phi - de.phi) * e,
            R: de.R + (para.R - de.R) * e,
            cx: de.cx + (para.cx - de.cx) * e,
            cy: de.cy + (para.cy - de.cy) * e,
          };
          if (t >= 1) tween = null;
        } else if (!pedido.current.rota && !calmo) {
          vista.lam += 0.03;
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
    };
  }, []);

  return <canvas ref={telaRef} aria-hidden="true" className="block size-full" />;
}
