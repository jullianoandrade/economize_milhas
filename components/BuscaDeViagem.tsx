"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CampoDeLugar, type Lugar } from "./CampoDeLugar";
import { Ilustracao } from "./Ilustracao";
import { usarPerfil } from "@/store/perfil";

/**
 * O painel de busca da home: de onde a pessoa sai e para onde quer ir.
 *
 * E a unica coisa colorida da tela de proposito. Tudo o que vem depois
 * -- objetivo, oportunidades, explicacao -- e cartao branco; assim a
 * acao principal nao disputa atencao com nada.
 *
 * A origem fica guardada no aparelho porque quase nunca muda: quem mora
 * em Recife nao quer redigitar Recife toda vez. Trocar exige um toque.
 */
export function BuscaDeViagem() {
  const router = useRouter();
  const origemIata = usarPerfil((p) => p.origemIata);
  const definirOrigem = usarPerfil((p) => p.definirOrigem);

  const [trocandoOrigem, setTrocandoOrigem] = useState(false);
  const [nomeDaOrigem, setNomeDaOrigem] = useState(origemIata);

  // O estado do zustand so chega depois da hidratacao; ate la, o servidor
  // renderizou "GRU" e o cliente precisa alcancar o valor guardado.
  useEffect(() => {
    let cancelado = false;
    fetch(`/api/lugares?q=${origemIata}`)
      .then((r) => r.json())
      .then((corpo: { lugares: Lugar[] }) => {
        const achado = corpo.lugares.find((l) => l.iata === origemIata);
        if (!cancelado && achado) setNomeDaOrigem(achado.cidade);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [origemIata]);

  function irParaRota(destino: Lugar) {
    router.push(`/rota/${origemIata}/${destino.iata}`);
  }

  return (
    <section className="relative mb-6 overflow-hidden rounded-[28px] bg-marca-forte px-5 pb-5 pt-5 text-white">
      {/* Decoracao, nao conteudo: fica no canto, cortada, e some do
          leitor de tela. */}
      <Ilustracao
        cena="viagem"
        tom="claro"
        className="pointer-events-none absolute -right-10 -top-6 w-56 opacity-20"
      />

      <div className="relative">
        {trocandoOrigem ? (
          <div className="mb-4">
            <CampoDeLugar
              rotulo="De onde você sai?"
              tom="claro"
              autoFocus
              aoSelecionar={(lugar) => {
                definirOrigem(lugar.iata);
                setNomeDaOrigem(lugar.cidade);
                setTrocandoOrigem(false);
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setTrocandoOrigem(true)}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/25"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            Saindo de <strong className="font-semibold">{nomeDaOrigem}</strong>
            <span className="text-white/70">· trocar</span>
          </button>
        )}

        <h1 className="display mb-4 text-[28px] leading-[1.12]">
          Para onde
          <br />
          você quer ir?
        </h1>

        <CampoDeLugar
          rotulo="Destino"
          tom="claro"
          aoSelecionar={irParaRota}
        />
      </div>
    </section>
  );
}
