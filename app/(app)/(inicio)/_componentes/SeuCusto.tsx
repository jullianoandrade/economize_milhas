"use client";

import Link from "next/link";
import { useState } from "react";
import { PerguntaDoCartao } from "@/components/dominio/PerguntaDoCartao";
import { usarPerfil, usePerfilHidratado } from "@/store/perfil";
import { calcularMeuCusto, useCatalogo } from "@/lib/cliente/catalogo";
import { milhas as fmtMilhas, reaisExatos } from "@/lib/format";

/**
 * Quanto as SUAS milhas custam.
 *
 * Substituiu o cartao que explicava custo por milheiro em abstrato. O
 * conceito e o mesmo; a diferenca e que agora ele tem o numero da
 * pessoa dentro, e conceito com numero proprio e a unica forma de
 * ensinar isto a quem nunca ouviu falar de milhas.
 *
 * Tambem e o gancho honesto para a pergunta: enquanto ela nao for
 * respondida, o app calcula com o custo de quem COMPRA milhas, e dizer
 * isso em voz alta vale mais do que esconder a suposicao.
 */

/**
 * A reserva maior a partir de `md` acompanha a de ObjetivoEmAndamento:
 * ali os dois dividem uma linha de grade, e a linha assume a altura do
 * mais alto. Os dois numeros precisam andar juntos -- ver o comentario
 * em ObjetivoEmAndamento.tsx, onde a medicao esta registrada.
 */
const ALTURA = "min-h-[8.5rem] md:min-h-[10.5rem]";

export function SeuCusto() {
  const hidratado = usePerfilHidratado();
  const gasto = usarPerfil((p) => p.gastoMensalCartaoBRL);
  const cartaoId = usarPerfil((p) => p.cartaoId);
  const catalogo = useCatalogo();

  const [aberto, setAberto] = useState(false);

  if (!hidratado) {
    return (
      <div className={`${ALTURA} mb-6`}>
        <div className="size-full animate-pulse rounded-[24px] bg-superficie-2" />
      </div>
    );
  }

  const respondeu = gasto !== null;
  const custo =
    catalogo && gasto !== null
      ? calcularMeuCusto(catalogo, gasto, cartaoId ?? "")
      : null;

  return (
    <section
      className={`${aberto ? "" : ALTURA} mb-6 rounded-[24px] border border-marca-fraca bg-marca-fraca p-4`}
    >
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-marca">
        {respondeu ? "Suas milhas" : "Entenda em um minuto"}
      </p>

      {aberto ? (
        <>
          <h2 className="display mb-3 text-xl text-tinta">
            Como você acumula
          </h2>
          <PerguntaDoCartao comBotao={false} />
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="mt-4 w-full text-center text-sm font-semibold text-marca underline underline-offset-4"
          >
            Pronto
          </button>
        </>
      ) : respondeu ? (
        <>
          <h2 className="display text-xl leading-tight text-tinta">
            {custo === null ? (
              "Suas milhas"
            ) : custo.cpmBRL === 0 ? (
              "Suas milhas saem de graça"
            ) : (
              <>
                Sua milha custa{" "}
                <span className="tabular">{reaisExatos(custo.cpmBRL)}</span>
              </>
            )}
          </h2>
          <p className="tabular mt-1 text-sm leading-relaxed text-tinta-media">
            {custo
              ? `Cerca de ${fmtMilhas(custo.milhasAno)} milhas por ano${
                  custo.viagem ? ` — dá para ${custo.viagem}` : ""
                }.`
              : "Ajuste como você acumula para o cálculo ficar seu."}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <button
              type="button"
              onClick={() => setAberto(true)}
              className="font-semibold text-marca underline underline-offset-4"
            >
              ajustar
            </button>
            <Link
              href="/aprender"
              className="text-tinta-media underline underline-offset-4"
            >
              o que é isso?
            </Link>
          </div>
        </>
      ) : (
        <>
          <h2 className="display text-xl leading-tight text-tinta">
            Você provavelmente já acumula milhas
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-tinta-media">
            Sem saber como, o app calcula com o custo de quem{" "}
            <strong className="font-semibold text-tinta">compra</strong>{" "}
            milhas — e quase nunca é o seu caso.
          </p>
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="mt-2 text-sm font-semibold text-marca underline underline-offset-4"
          >
            Descobrir quanto as minhas custam
          </button>
        </>
      )}
    </section>
  );
}
