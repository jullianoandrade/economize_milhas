"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CampoDeLugar, type Lugar } from "./CampoDeLugar";
import { usarPerfil } from "@/store/perfil";

/**
 * Bloco de busca da home: de onde a pessoa sai e para onde quer ir.
 *
 * A origem fica guardada no aparelho porque quase nunca muda -- quem mora
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
    <div className="mb-6">
      {trocandoOrigem ? (
        <div className="mb-4">
          <CampoDeLugar
            rotulo="De onde você sai?"
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
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-borda bg-superficie px-3 py-1.5 text-sm text-tinta-media transition-colors hover:border-marca hover:text-marca"
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
          <span className="text-tinta-fraca">· trocar</span>
        </button>
      )}

      <CampoDeLugar rotulo="Para onde você quer ir?" aoSelecionar={irParaRota} />
    </div>
  );
}
