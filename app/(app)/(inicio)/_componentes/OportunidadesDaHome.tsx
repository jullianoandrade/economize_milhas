"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usarPerfil } from "@/store/perfil";
import { reais } from "@/lib/format";
import {
  COR_DO_ROTULO,
  TEXTO_CURTO,
  type RotuloDeVeredito,
} from "@/lib/milhas/rotulos";

/**
 * As melhores saidas da cidade da pessoa, em faixa rolante.
 *
 * Quatro, nao dez. A home nao e a tela de promocoes -- ela mostra o
 * suficiente para dar vontade de abrir a lista inteira, e manda para la.
 *
 * So entram passagens realmente abaixo do preco tipico da rota: o
 * calculo vive em /api/promocoes e o criterio e desconto sobre a
 * referencia regional, nao "preco baixo em valor absoluto", que so
 * devolveria trechos curtos.
 */

type Oportunidade = {
  destino: { iata: string; cidade: string; pais: string };
  precoBRL: number;
  descontoPct: number;
  veredito: RotuloDeVeredito;
};

type Resposta = {
  origem: { iata: string; cidade: string };
  oportunidades: Oportunidade[];
};

const QUANTAS = 4;

export function OportunidadesDaHome() {
  const origemIata = usarPerfil((p) => p.origemIata);
  const gasto = usarPerfil((p) => p.gastoMensalCartaoBRL);
  const cartaoId = usarPerfil((p) => p.cartaoId);
  const [dados, setDados] = useState<Resposta | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    const controlador = new AbortController();

    const parametros = new URLSearchParams({ origem: origemIata });
    if (gasto !== null) parametros.set("gasto", String(gasto));
    if (cartaoId) parametros.set("cartaoId", cartaoId);

    // O estado so muda na resposta, nunca no corpo do efeito: um
    // setState sincrono aqui dispararia um render a mais em toda troca
    // de origem, de graca.
    fetch(`/api/promocoes?${parametros}`, { signal: controlador.signal })
      .then((r) => r.json())
      .then((corpo: Resposta) => {
        setDados(corpo);
        setFalhou(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setFalhou(true);
      });

    return () => controlador.abort();
  }, [origemIata, gasto, cartaoId]);

  // Sem oportunidade de verdade, a secao inteira some. Preencher a faixa
  // com rota qualquer so para ela nao ficar vazia seria inventar oferta.
  if (falhou) return null;

  const lista = dados?.oportunidades.slice(0, QUANTAS) ?? [];
  if (dados && lista.length === 0) return null;

  return (
    <section className="mb-7">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="display text-xl text-tinta">
          {dados ? `Saindo de ${dados.origem.cidade}` : "Oportunidades agora"}
        </h2>
        <Link
          href="/promocoes"
          className="shrink-0 text-sm font-semibold text-marca underline underline-offset-4"
        >
          ver todas
        </Link>
      </div>

      {/* No celular, faixa que sangra ate a borda (o -mx-4 px-4) e rola
          com o dedo. A partir de `sm` os cards cabem lado a lado, entao
          a faixa vira grade: rolagem horizontal onde nao precisa rolar
          so esconde conteudo. */}
      <div className="faixa-ate-sm -mx-4 gap-3 px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
        {dados
          ? lista.map((o) => (
              <Link
                key={o.destino.iata}
                href={`/rota/${dados.origem.iata}/${o.destino.iata}`}
                className="flex h-[9.5rem] w-40 shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-borda bg-superficie p-3.5 shadow-card transition-colors hover:border-marca sm:w-auto"
              >
                <span>
                  <span className="tabular inline-block rounded-full bg-dinheiro-fundo px-2 py-0.5 text-[11px] font-bold text-dinheiro">
                    −{Math.round(o.descontoPct)}%
                  </span>
                  <span className="mt-2 block truncate font-semibold leading-tight text-tinta">
                    {o.destino.cidade}
                  </span>
                  <span className="block truncate text-xs text-tinta-fraca">
                    {o.destino.pais}
                  </span>
                </span>

                <span>
                  <span className="tabular block text-lg font-bold text-tinta">
                    {reais(o.precoBRL)}
                  </span>
                  <span
                    className={`block text-[11px] font-semibold ${COR_DO_ROTULO[o.veredito]}`}
                  >
                    {TEXTO_CURTO[o.veredito]}
                  </span>
                </span>
              </Link>
            ))
          : Array.from({ length: QUANTAS }, (_, i) => (
              <div
                key={i}
                className="h-[9.5rem] w-40 shrink-0 animate-pulse rounded-3xl bg-superficie-2 sm:w-auto"
              />
            ))}
      </div>
    </section>
  );
}
