"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Milo } from "@/components/ui/Milo";
import { SeloDeOrigem } from "@/components/ui/SeloDeOrigem";
import { reais } from "@/lib/format";
import { TEXTO_CURTO, type RotuloDeVeredito } from "@/lib/milhas/rotulos";
import { usarPerfil } from "@/store/perfil";

/**
 * Oportunidades: o que vale a pena AGORA, em duas perguntas.
 *
 *   1. Tem bonus de transferencia valendo?  -- o que mais derruba o custo
 *      da milha. Promocao ativa e fato com data de fim; sem ela, a tela
 *      diz que nao ha e mostra o historico, com a data da pesquisa. Os
 *      dois nunca aparecem juntos: a mediana ao lado do fato pareceria
 *      tao firme quanto ele.
 *   2. Que passagem saindo da minha cidade esta abaixo do normal?
 *
 * Era /promocoes. O nome mudou porque "promocao" sugeria so passagem, e
 * bonus de transferencia e a outra metade -- a que fala de pontos.
 */

type Oportunidade = {
  destino: { iata: string; cidade: string; pais: string };
  precoBRL: number;
  precoTipicoBRL: number;
  descontoPct: number;
  veredito: RotuloDeVeredito;
};

type Resposta = {
  origem: { iata: string; cidade: string };
  observacao: string;
  oportunidades: Oportunidade[];
  promocoesDeTransferencia: Array<{
    destino: string;
    percentual: number;
    origem: string;
    terminaEm: string;
  }>;
};

export type BonusHistorico = {
  programa: string;
  tipicoPct: number;
  maximoPct: number;
  observacao: string;
};

const NOME: Record<string, string> = {
  livelo: "Livelo",
  esfera: "Esfera",
  smiles: "Smiles",
  latampass: "LATAM Pass",
  tudoazul: "Azul Fidelidade",
};

/** "2026-11-28" vira "28/11", sem new Date(). */
function dia(iso: string): string {
  const [, mes, d] = iso.split("-");
  return mes && d ? `${d}/${mes}` : iso;
}

export function Oportunidades({
  historico,
  historicoDe,
}: {
  historico: BonusHistorico[];
  historicoDe: string;
}) {
  const origemIata = usarPerfil((p) => p.origemIata);
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState(false);
  const carregando = dados === null && !erro;

  useEffect(() => {
    const controlador = new AbortController();
    fetch(`/api/promocoes?origem=${origemIata}`, { signal: controlador.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("falha"))))
      .then((corpo: Resposta) => {
        setDados(corpo);
        setErro(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setErro(true);
      });
    return () => controlador.abort();
  }, [origemIata]);

  const ativas = dados?.promocoesDeTransferencia ?? [];
  const escala = Math.max(...historico.map((h) => h.maximoPct), 100) * 1.05;

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <h1 className="display text-[28px] text-tinta">Oportunidades</h1>
      <p className="mt-1 text-base text-tinta-media">
        {dados ? `Saindo de ${dados.origem.cidade}.` : "O que vale a pena agora."}
      </p>

      <section aria-labelledby="t-bonus" className="mt-6">
        <h2 id="t-bonus" className="text-lg font-semibold text-tinta">
          Bônus de transferência
        </h2>

        {carregando ? (
          <div className="mt-3 h-[13rem] animate-pulse rounded-[24px] bg-superficie-2" />
        ) : ativas.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2.5">
            {ativas.map((p) => (
              <li
                key={`${p.origem}-${p.destino}`}
                className="flex items-center justify-between gap-4 rounded-[20px] bg-painel px-5 py-4 text-painel-tinta"
              >
                <span>
                  <span className="block text-[17px] font-semibold">
                    {NOME[p.origem] ?? p.origem} para {NOME[p.destino] ?? p.destino}
                  </span>
                  <span className="mt-0.5 block text-sm text-painel-tinta-fraca">
                    até {dia(p.terminaEm)}
                  </span>
                </span>
                <span className="tabular text-[28px] font-bold tracking-tight text-[#f2b33d]">
                  +{p.percentual}%
                </span>
              </li>
            ))}
            <li>
              <SeloDeOrigem origem="real" detalhe="Promoção publicada pelo programa, com data de fim.">
                promoção ativa
              </SeloDeOrigem>
            </li>
          </ul>
        ) : (
          <div className="relative mt-3 overflow-hidden rounded-[24px] bg-superficie-2 px-5 pb-6 pt-5">
            <p className="max-w-[15rem] text-[21px] font-bold leading-tight tracking-tight text-tinta">
              Nenhuma promoção de transferência ativa agora.
            </p>
            <p className="mt-2 max-w-[14rem] text-[15px] leading-relaxed text-tinta-media">
              Se puder, espere uma antes de transferir. O bônus muda o custo
              da sua milha.
            </p>
            <Milo className="pointer-events-none absolute -bottom-3 right-1 w-[128px]" />
          </div>
        )}

        {/* O historico so aparece sem promocao ativa: ver o comentario
            do topo. */}
        {!carregando && ativas.length === 0 ? (
          <div className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-tinta">O que costuma acontecer</h3>
              <SeloDeOrigem origem="estimado" detalhe="Mediana e máximo das promoções observadas. É expectativa, não garantia.">
                histórico de {historicoDe}
              </SeloDeOrigem>
            </div>
            <ul className="mt-2">
              {historico.map((h) => (
                <li key={h.programa} className="border-b border-borda py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-base font-semibold text-tinta">{h.programa}</span>
                    <span className="text-[15px] text-tinta-media">
                      <strong className="tabular text-lg font-bold text-tinta">{h.tipicoPct}%</strong> típico
                    </span>
                  </div>
                  <div
                    role="img"
                    aria-label={`Bônus típico ${h.tipicoPct}%, máximo já visto ${h.maximoPct}%`}
                    className="relative mt-2.5 h-2.5 rounded-full bg-borda"
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-[#8098c4]"
                      style={{ width: `${(h.maximoPct / escala) * 100}%` }}
                    />
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-tinta"
                      style={{ width: `${(h.tipicoPct / escala) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-tinta-media">
                    Já chegou a {h.maximoPct}%. {h.observacao}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="t-passagens" className="mt-10">
        <h2 id="t-passagens" className="text-lg font-semibold text-tinta">
          Passagens abaixo do normal
        </h2>
        <p className="mt-1 text-[15px] leading-relaxed text-tinta-media">
          Só ida, mais baratas que o preço típico da rota. Ao lado, se vale
          gastar milhas nelas.
        </p>

        {carregando ? (
          <div className="mt-3 space-y-2" aria-label="Carregando">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-superficie-2" />
            ))}
          </div>
        ) : erro ? (
          <p className="mt-3 rounded-2xl bg-superficie-2 p-5 text-[15px] text-tinta-media">
            Não consegui carregar as passagens agora. Costuma ser falha de rede
            e passa sozinha: tente de novo em instantes.
          </p>
        ) : dados && dados.oportunidades.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-superficie-2 p-5 text-[15px] leading-relaxed text-tinta-media">
            Nenhuma passagem abaixo do normal saindo de {dados.origem.cidade}{" "}
            agora. Em aeroportos menores há menos buscas recentes; trocar a
            origem no Explorar pode ajudar.
          </p>
        ) : (
          <ul className="mt-2">
            {dados?.oportunidades.map((o) => (
              <li key={o.destino.iata}>
                <Link
                  href={`/rota/${dados.origem.iata}/${o.destino.iata}`}
                  className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 border-b border-borda px-1 py-3.5 transition-colors hover:bg-superficie"
                >
                  <span className="truncate text-base font-semibold text-tinta">{o.destino.cidade}</span>
                  <span className="tabular text-right text-base font-bold text-tinta">{reais(o.precoBRL)}</span>
                  <span className="text-sm text-tinta-media">
                    {o.descontoPct}% abaixo do normal ({reais(o.precoTipicoBRL)})
                  </span>
                  <span className="text-right text-sm font-semibold text-tinta-media">
                    {TEXTO_CURTO[o.veredito]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {dados && dados.oportunidades.length > 0 ? (
          <div className="mt-3">
            <SeloDeOrigem origem="real" detalhe={dados.observacao}>
              preços de buscas reais recentes
            </SeloDeOrigem>
          </div>
        ) : null}
      </section>
    </div>
  );
}
