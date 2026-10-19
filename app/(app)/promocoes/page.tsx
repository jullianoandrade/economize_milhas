"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cabecalho } from "@/components/casca/Cabecalho";
import { usarPerfil } from "@/store/perfil";
import { milhas, reais, reaisExatos } from "@/lib/format";
import {
  COR_DO_ROTULO,
  TEXTO_CURTO,
  type RotuloDeVeredito,
} from "@/lib/milhas/rotulos";

/**
 * Oportunidades saindo da cidade da pessoa.
 *
 * Componente de cliente porque a origem mora no localStorage -- nao ha
 * nada a pre-renderizar numa lista que e diferente para cada usuario. O
 * calculo pesado fica no servidor, em /api/promocoes.
 */

type Oportunidade = {
  destino: { iata: string; cidade: string; pais: string };
  precoBRL: number;
  precoTipicoBRL: number;
  descontoPct: number;
  rotulo: string;
  veredito: RotuloDeVeredito;
  ressalva: string | null;
  economiaBRL: number;
  programa: string;
  milhas: number;
  valorExtraidoPorMilheiroBRL: number;
};

type Resposta = {
  origem: { iata: string; cidade: string };
  fonte: string;
  observacao: string;
  oportunidades: Oportunidade[];
  bonusVigentes: Array<{
    destino: string;
    bonusMedianoPct: number;
    observacao: string;
  }>;
};

const NOME_DO_PROGRAMA: Record<string, string> = {
  smiles: "Smiles",
  latampass: "LATAM Pass",
  tudoazul: "Azul Fidelidade",
};

export default function Promocoes() {
  const origemIata = usarPerfil((p) => p.origemIata);
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState(false);

  // Carregando nao e estado proprio: e a ausencia de resposta e de erro.
  // Guardar os tres separados abre espaco para eles se contradizerem.
  const carregando = dados === null && !erro;

  useEffect(() => {
    const controlador = new AbortController();

    fetch(`/api/promocoes?origem=${origemIata}`, { signal: controlador.signal })
      .then((r) => r.json())
      .then((corpo: Resposta) => {
        setDados(corpo);
        setErro(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setErro(true);
      });

    return () => controlador.abort();
  }, [origemIata]);

  return (
    <>
      <Cabecalho
        titulo="Promoções do momento"
        subtitulo={
          dados
            ? `Saindo de ${dados.origem.cidade}. Só entram passagens abaixo do preço típico da rota, em trecho de ida.`
            : "Carregando as melhores oportunidades perto de você."
        }
      />

      {/* O espaco da faixa de bonus e reservado durante o carregamento.
          Sem isso ela surge depois do fetch e empurra a lista inteira
          para baixo, o que o Lighthouse mede como deslocamento de
          layout -- e o usuario sente como a tela pulando na mao. */}
      {carregando ? (
        <div className="mb-5 h-[9.5rem] animate-pulse rounded-2xl bg-superficie-2" />
      ) : null}

      {dados && dados.bonusVigentes.length > 0 ? (
        <section className="mb-5 rounded-2xl border border-milhas-borda bg-milhas-fundo p-4">
          <h2 className="mb-2 text-sm font-semibold text-tinta">
            Bônus de transferência: o que esperar
          </h2>
          <ul className="space-y-1.5 text-sm text-tinta-media">
            {dados.bonusVigentes.map((b) => (
              <li key={b.destino} className="flex justify-between gap-3">
                <span>{NOME_DO_PROGRAMA[b.destino] ?? b.destino}</span>
                <span className="tabular shrink-0 font-semibold text-milhas">
                  ~{b.bonusMedianoPct}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-tinta-media">
            Percentual mediano histórico de cada programa. Transferir só quando
            há bônus é o que derruba o custo da sua milha pela metade.
          </p>
        </section>
      ) : null}

      {dados && dados.oportunidades.length > 0 ? (
        <p className="mb-3 text-xs leading-relaxed text-tinta-fraca">
          Toda passagem desta lista está barata. O que muda é se vale gastar
          milhas nela:{" "}
          <strong className={`font-semibold ${COR_DO_ROTULO.resgatar}`}>
            {TEXTO_CURTO.resgatar}
          </strong>{" "}
          quando a economia é grande,{" "}
          <strong className="font-semibold text-tinta-media">
            {TEXTO_CURTO.guardar}
          </strong>{" "}
          quando compensa mas as mesmas milhas valeriam muito mais numa viagem
          cara, e{" "}
          <strong className={`font-semibold ${COR_DO_ROTULO.pagar}`}>
            {TEXTO_CURTO.pagar}
          </strong>{" "}
          quando resgatar não compensa.
        </p>
      ) : null}

      {carregando ? <Esqueleto /> : null}

      {erro ? (
        <p className="rounded-2xl border border-borda bg-superficie p-5 text-sm text-tinta-media">
          Não consegui carregar as oportunidades agora. Tente de novo em
          instantes.
        </p>
      ) : null}

      {dados && !carregando && dados.oportunidades.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-borda bg-superficie-2 p-5 text-sm leading-relaxed text-tinta-media">
          Nenhuma oportunidade encontrada saindo de {dados.origem.cidade} agora.
          Isso costuma acontecer em aeroportos menores, onde há poucas buscas
          recentes. Tente trocar a origem na tela de busca.
        </p>
      ) : null}

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dados?.oportunidades.map((o) => (
          <li key={o.destino.iata}>
            <Link
              href={`/rota/${dados.origem.iata}/${o.destino.iata}`}
              className="block rounded-2xl border border-borda bg-superficie p-4 shadow-card transition-colors hover:border-marca"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-tinta">
                    {o.destino.cidade}
                  </h3>
                  <p className="text-xs text-tinta-fraca">{o.rotulo}</p>
                </div>
                <span className="shrink-0 rounded-full bg-dinheiro-fundo px-2 py-0.5 text-[11px] font-bold text-dinheiro">
                  {o.descontoPct}% abaixo do normal
                </span>
              </div>

              <dl className="tabular grid grid-cols-3 gap-2 border-t border-borda pt-2.5 text-center">
                <div>
                  <dt className="text-[11px] text-tinta-fraca">Em dinheiro</dt>
                  <dd className="text-sm font-semibold text-tinta">
                    {reais(o.precoBRL)}
                  </dd>
                  <dd className="text-[10px] text-tinta-fraca line-through">
                    {reais(o.precoTipicoBRL)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-tinta-fraca">
                    {o.programa}
                  </dt>
                  <dd className="text-sm font-semibold text-tinta">
                    {milhas(o.milhas)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-tinta-fraca">Por milheiro</dt>
                  <dd className="text-sm font-semibold text-dinheiro">
                    {reaisExatos(o.valorExtraidoPorMilheiroBRL)}
                  </dd>
                  <dd
                    className={`text-[10px] font-semibold ${COR_DO_ROTULO[o.veredito]}`}
                  >
                    {TEXTO_CURTO[o.veredito]}
                  </dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>

      {dados && dados.oportunidades.length > 0 ? (
        <p className="mt-4 text-xs leading-relaxed text-tinta-fraca">
          {dados.observacao}
        </p>
      ) : null}
    </>
  );
}

/** A altura imita a do card real, pelo mesmo motivo do bloco acima. */
function Esqueleto() {
  return (
    <div className="animate-pulse space-y-3" aria-label="Carregando">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-[8.75rem] rounded-2xl bg-superficie-2" />
      ))}
    </div>
  );
}
