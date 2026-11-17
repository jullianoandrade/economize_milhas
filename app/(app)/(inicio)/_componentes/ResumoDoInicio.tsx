"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { milhas as fmt, reais } from "@/lib/format";
import {
  hojeISO,
  montarCarteira,
  quandoVence,
  totalEstimado,
  vencimentosProximos,
  type ProgramaDaCarteira,
} from "@/lib/carteira/modelo";
import { TEXTO_CURTO, type RotuloDeVeredito } from "@/lib/milhas/rotulos";
import { useCarteiraHidratada, usarCarteira } from "@/store/carteira";
import { usarPerfil } from "@/store/perfil";

/**
 * Abaixo do topo, so o que pede acao hoje -- e nesta ordem:
 *
 *   1. a carteira (quanto seus pontos valem), com a porta para ela
 *   2. o que esta para vencer, se houver: e o unico aviso que custa
 *      dinheiro se for ignorado
 *   3. tres passagens abaixo do normal saindo da cidade da pessoa
 *
 * O resto mora nas abas. "A informacao certa, no momento certo."
 */

type Oportunidade = {
  destino: { iata: string; cidade: string };
  precoBRL: number;
  descontoPct: number;
  veredito: RotuloDeVeredito;
};

export function ResumoDoInicio({ catalogo }: { catalogo: ProgramaDaCarteira[] }) {
  return (
    <div className="flex flex-col gap-3">
      <CarteiraEAvisos catalogo={catalogo} />
      <ValeAPenaAgora />
    </div>
  );
}

function CarteiraEAvisos({ catalogo }: { catalogo: ProgramaDaCarteira[] }) {
  const hidratada = useCarteiraHidratada();
  const saldos = usarCarteira((s) => s.saldos);

  if (!hidratada) {
    return <div className="h-[76px] animate-pulse rounded-[20px] bg-superficie-2" />;
  }

  const hoje = hojeISO();
  const linhas = montarCarteira(saldos, catalogo, hoje);
  const aviso = vencimentosProximos(linhas, hoje)[0];

  return (
    <>
      <Link
        href="/carteira"
        className="flex items-center gap-4 rounded-[20px] bg-superficie px-4 py-3.5 text-tinta shadow-card"
      >
        <span aria-hidden="true" className="relative h-10 w-12 shrink-0">
          <span className="absolute inset-x-0 top-0 h-[26px] rounded-md bg-[#0e1a2e] shadow-sm" />
          <span className="absolute inset-x-0 top-[7px] h-[26px] rounded-md bg-[#f2ede0] shadow-sm" />
          <span className="absolute inset-x-0 top-[14px] h-[26px] rounded-md bg-[#8098c4] shadow-sm" />
        </span>
        <span className="min-w-0 flex-1">
          {linhas.length > 0 ? (
            <>
              <span className="block text-[15px] text-tinta-media">Sua carteira vale cerca de</span>
              <span className="tabular block text-[22px] font-bold tracking-tight">{reais(totalEstimado(linhas))}</span>
            </>
          ) : (
            <>
              <span className="block text-base font-semibold">Junte seus programas</span>
              <span className="block text-[15px] text-tinta-media">Veja quanto seus pontos valem</span>
            </>
          )}
        </span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>

      {aviso ? (
        <Link
          href="/carteira"
          className="flex items-center gap-3 rounded-[20px] bg-superficie-2 px-4 py-3.5 text-[15px] leading-snug text-tinta"
        >
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-[#f2b33d] shadow-[0_0_0_4px_rgb(242_179_61/0.25)]" />
          <span>
            <strong className="font-semibold">
              {fmt(aviso.quantidade)} {aviso.programa.unidade} {aviso.programa.nome}
            </strong>{" "}
            vencem {quandoVence(aviso.emDias)}. Use ou transfira antes.
          </span>
        </Link>
      ) : null}
    </>
  );
}

function ValeAPenaAgora() {
  const origemIata = usarPerfil((p) => p.origemIata);
  const [dados, setDados] = useState<{ origem: { iata: string }; oportunidades: Oportunidade[] } | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    const controlador = new AbortController();
    fetch(`/api/promocoes?origem=${origemIata}`, { signal: controlador.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("falha"))))
      .then((corpo) => {
        setDados(corpo);
        setFalhou(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setFalhou(true);
      });
    return () => controlador.abort();
  }, [origemIata]);

  // Sem oportunidade ou com falha de rede, o bloco simplesmente nao
  // aparece: aqui ele e bonus, nao a resposta principal da tela.
  if (falhou || (dados && dados.oportunidades.length === 0)) return null;

  return (
    <section aria-labelledby="t-agora" className="mt-4">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="t-agora" className="text-base font-semibold text-tinta">
          Vale a pena agora
        </h2>
        <Link href="/oportunidades" className="min-h-11 py-2.5 text-sm font-semibold text-tinta underline underline-offset-4">
          ver todas
        </Link>
      </div>
      {!dados ? (
        <div className="space-y-2" aria-label="Carregando">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[60px] animate-pulse rounded-2xl bg-superficie-2" />
          ))}
        </div>
      ) : (
        <ul>
          {dados.oportunidades.slice(0, 3).map((o) => (
            <li key={o.destino.iata}>
              <Link
                href={`/rota/${dados.origem.iata}/${o.destino.iata}`}
                className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 border-b border-borda px-1 py-3"
              >
                <span className="truncate text-base font-semibold text-tinta">{o.destino.cidade}</span>
                <span className="tabular text-right text-base font-bold text-tinta">{reais(o.precoBRL)}</span>
                <span className="text-sm text-tinta-media">{o.descontoPct}% abaixo do normal</span>
                <span className="text-right text-sm text-tinta-media">{TEXTO_CURTO[o.veredito]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
