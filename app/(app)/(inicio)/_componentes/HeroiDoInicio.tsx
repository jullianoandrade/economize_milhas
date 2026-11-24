"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Globo } from "@/components/dominio/Globo";
import { Milo } from "@/components/ui/Milo";
import { useLugar } from "@/lib/cliente/lugar";
import { milhas as fmt } from "@/lib/format";
import { calcularProgresso } from "@/lib/metas/progresso";
import { useCarteiraHidratada, usarCarteira } from "@/store/carteira";
import { usarPerfil, usePerfilHidratado } from "@/store/perfil";

/**
 * O topo do Inicio: a viagem que a pessoa quer fazer, girando no globo.
 *
 * E o que muda sozinho entre uma visita e outra -- e por isso o que traz
 * a pessoa de volta. Tres estados, decididos so depois de ler o aparelho:
 *
 *   tem objetivo   -> o arco da viagem no globo, quanto ja andou e quanto falta
 *   sem objetivo   -> "Para onde voce vai?", com a porta para o Explorar
 *   primeira vez   -> alem disso, o convite para entender o app em um minuto
 *                     (so para quem ainda nao tem objetivo nem carteira:
 *                     quem ja tem um dos dois claramente ja usa o app)
 *
 * O Milo aparece como rosto, ao lado da saudacao: e por ali que se abre
 * a explicacao do app. Ele nao fica perto de numero de decisao.
 */

function saudacaoPorHora(hora: number): string {
  if (hora < 5) return "Boa noite";
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

const nada = () => () => {};

function useSaudacao(): string {
  // A hora so existe no aparelho; no pre-render do servidor, "Olá".
  return useSyncExternalStore(
    nada,
    () => saudacaoPorHora(new Date().getHours()),
    () => "Olá",
  );
}

export function HeroiDoInicio() {
  const hidratado = usePerfilHidratado();
  const metas = usarPerfil((p) => p.metas);
  const visitou = usarPerfil((p) => p.visitou);
  const marcarVisita = usarPerfil((p) => p.marcarVisita);
  const saudacao = useSaudacao();
  const carteiraHidratada = useCarteiraHidratada();
  const temCarteira = usarCarteira((s) => Object.keys(s.saldos).length > 0);
  const convidar = hidratado && carteiraHidratada && !visitou && metas.length === 0 && !temCarteira;

  const meta = hidratado ? (metas[0] ?? null) : null;
  const origem = useLugar(meta?.origemIata ?? null);
  const destino = useLugar(meta?.destinoIata ?? null);
  const rota =
    meta && origem && destino
      ? {
          origem: [origem.lat, origem.lon] as const,
          destino: [destino.lat, destino.lon] as const,
          rotulos: [origem.iata, destino.iata] as [string, string],
        }
      : null;
  const progresso = meta ? calcularProgresso(meta, new Date()) : null;

  return (
    <section
      aria-label={meta ? "Seu objetivo" : "Para onde você vai"}
      className="painel relative -mx-4 -mt-5 min-h-[340px] overflow-hidden rounded-b-[34px] px-6 pb-7 pt-5 md:mx-0 md:mt-0 md:min-h-[320px] md:rounded-[32px] md:px-9 md:pt-7"
    >
      <div className="pointer-events-none absolute -right-14 top-12 size-[270px] md:right-8 md:top-1/2 md:size-[300px] md:-translate-y-1/2">
        <Globo rota={rota} enquadramento="inteiro" arrastavel />
      </div>

      <div className="relative flex items-center justify-between gap-3">
        <p className="text-[17px] text-painel-tinta-fraca">{saudacao}</p>
        <Link
          href="/boas-vindas"
          aria-label="Como o app funciona"
          className="size-11 overflow-hidden rounded-full border border-painel-tinta/20 bg-painel-realce md:hidden"
        >
          <Milo pose="rosto" className="size-11" />
        </Link>
      </div>

      {convidar ? (
        <div className="relative mt-3 inline-flex max-w-full items-center gap-1 rounded-full bg-painel-realce py-1 pl-4 pr-1 text-sm text-painel-tinta">
          <Link href="/boas-vindas" className="py-1.5 underline-offset-2 hover:underline">
            Primeira vez? Entenda o app em um minuto
          </Link>
          <button
            type="button"
            onClick={marcarVisita}
            aria-label="Dispensar a apresentação"
            className="flex size-9 items-center justify-center rounded-full text-painel-tinta-fraca hover:text-painel-tinta"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      ) : null}

      <div className="relative mt-24 max-w-[13.5rem] md:mt-14 md:max-w-sm">
        {!hidratado ? (
          <div className="h-[132px]" aria-busy="true" />
        ) : meta && progresso ? (
          <Link href="/objetivos" className="block">
            <p className="text-[15px] text-painel-tinta-fraca">Seu objetivo</p>
            <p className="display mt-1 text-[28px] leading-[1.08] text-painel-tinta md:text-[34px]">
              {meta.destinoCidade}
            </p>
            <div
              role="img"
              aria-label={`${progresso.percentual}% do objetivo`}
              className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-painel-tinta/20"
            >
              <div className="h-full rounded-full bg-[#ffb020]" style={{ width: `${progresso.percentual}%` }} />
            </div>
            <p className="tabular mt-2 text-[15px] text-painel-tinta">
              {progresso.milhasFaltando === 0
                ? "Milhas suficientes: hora de resgatar"
                : `Faltam ${fmt(progresso.milhasFaltando)} milhas ${meta.programaNome}`}
            </p>
            {progresso.milhasFaltando > 0 && progresso.mesesRestantes !== null ? (
              <p className="mt-0.5 text-sm text-painel-tinta-fraca">
                No seu ritmo, cerca de {progresso.mesesRestantes}{" "}
                {progresso.mesesRestantes === 1 ? "mês" : "meses"}
              </p>
            ) : null}
          </Link>
        ) : (
          <>
            <h1 className="display text-[32px] leading-[1.06] text-painel-tinta md:text-[40px]">
              Para onde você vai?
            </h1>
            <div className="mt-5 flex flex-col items-start gap-1.5">
              <Link
                href="/explorar"
                className="flex min-h-12 items-center rounded-2xl bg-marca px-5 text-[15px] font-semibold text-marca-contraste"
              >
                Explorar destinos
              </Link>
              <Link href="/objetivos" className="min-h-11 py-2.5 text-sm text-painel-tinta-fraca underline underline-offset-2">
                ou defina um objetivo de viagem
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
