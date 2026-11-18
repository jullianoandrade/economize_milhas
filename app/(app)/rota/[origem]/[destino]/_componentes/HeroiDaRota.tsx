import Link from "next/link";
import type { Veredito } from "@/lib/milhas/veredito";
import type { Fonte } from "@/lib/providers/travelpayouts";
import type { FaseDaJornada } from "@/lib/monetizacao/jornada";
import { CardVeredito } from "./CardVeredito";
import { ReguaDoResgate } from "@/components/dominio/ReguaDoResgate";
import { FaixaDeMilhas } from "./FaixaDeMilhas";
import { AcoesDaRota } from "./AcoesDaRota";

/**
 * "A resposta": a placa do veredito, o que fazer a respeito e, fechado
 * em "Por que essa resposta?", a explicacao, a regua e a faixa do
 * programa vencedor -- a parte do heroi que depende do CPM de quem
 * calcula.
 *
 * Extraído para o mesmo JSX nascer uma vez e rodar nos dois lugares: no
 * servidor, com o CPM de mercado; dentro de IlhaDoVeredito, no cliente,
 * quando o CPM da própria pessoa chega depois da hidratação.
 */
export function HeroiDaRota({
  veredito,
  fonte,
  observacaoDaFonte,
  origemIata,
  destinoIata,
  dataEscolhida,
  fase,
}: {
  veredito: Veredito;
  fonte: Fonte;
  observacaoDaFonte: string;
  origemIata: string;
  destinoIata: string;
  dataEscolhida: string | null;
  fase: FaseDaJornada;
}) {
  return (
    <>
      <CardVeredito
        veredito={veredito}
        fonte={fonte}
        observacaoDaFonte={observacaoDaFonte}
      />

      <AcoesDaRota
        veredito={veredito}
        origemIata={origemIata}
        destinoIata={destinoIata}
        dataEscolhida={dataEscolhida}
        fase={fase}
      />

      {/* Objetivo so onde existe meta de milhas a bater: num trecho fora
          do modelo o motor nao sabe quantas milhas a passagem custa. */}
      {!veredito.foraDoModelo && veredito.melhor && fase !== "passou" ? (
        <Link
          href={`/objetivos?destino=${destinoIata}`}
          className="mt-1 flex min-h-11 items-center justify-center text-sm font-semibold text-tinta underline underline-offset-4"
        >
          Ainda não tem as milhas? Guardar como objetivo
        </Link>
      ) : null}

      {/* A divulgacao progressiva: a explicacao, a regua e a faixa de
          precificacao existem para quem quer entender -- nao para quem
          so quer a resposta. Fechado por padrao. */}
      <details className="group mt-3 rounded-2xl border border-borda">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[15px] font-semibold text-tinta [&::-webkit-details-marker]:hidden">
          Por que essa resposta?
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div className="px-4 pb-4">
          <p className="text-sm leading-relaxed text-tinta-media">{veredito.explicacao}</p>
          {veredito.melhor ? (
            <div className="mt-4">
              <ReguaDoResgate
                razao={veredito.melhor.razao}
                qualidade={veredito.melhor.qualidade}
                cpmBRL={veredito.melhor.caminho.cpmBRL}
                valorExtraidoPorMilheiroBRL={veredito.melhor.valorExtraidoPorMilheiroBRL}
              />
              <div className="mt-3">
                <FaixaDeMilhas
                  min={veredito.melhor.milhasFaixa.min}
                  max={veredito.melhor.milhasFaixa.max}
                  atual={veredito.melhor.milhas}
                  unidade={veredito.melhor.programa.unidade}
                />
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </>
  );
}
