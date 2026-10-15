"use client";

import { useState } from "react";
import { usarPerfil } from "@/store/perfil";
import {
  calcularMeuCusto,
  useCatalogo,
  type MeuCusto,
} from "@/lib/cliente/catalogo";
import { milhas as fmtMilhas, reais, reaisExatos } from "@/lib/format";

/**
 * A unica pergunta que o app faz.
 *
 * Nasce de um defeito: sem saber como a pessoa acumula, o motor cota o
 * custo de milhas de um estranho -- "comprar pontos Livelo e
 * transferir" -- e decide "milhas ou dinheiro" com esse numero. Quem
 * tem cartao sem anuidade tem custo perto de zero, e a resposta muda,
 * as vezes de lado.
 *
 * A pergunta do iniciante nao e "milhas ou dinheiro". E "eu tenho
 * alguma coisa aqui?". Por isso a resposta aparece enquanto o dedo
 * arrasta: o objetivo nao e ele entender o que e custo por milheiro, e
 * descobrir que ja tinha um ativo e nao sabia.
 *
 * A conta roda no aparelho, com lib/milhas/calculo-cartao (que nao
 * importa nada). Se dependesse de ida ao servidor, nao daria para
 * responder a cada arrasto -- e e o movimento do numero que ensina.
 */


const MINIMO = 0;
const MAXIMO = 25000;
const PASSO = 500;
const PADRAO = 3000;

export function PerguntaDoCartao({
  comBotao = true,
  aoResponder,
}: {
  /** Fora, quando o passo ja tem o proprio "Próximo". */
  comBotao?: boolean;
  aoResponder?: () => void;
}) {
  const gastoSalvo = usarPerfil((p) => p.gastoMensalCartaoBRL);
  const cartaoSalvo = usarPerfil((p) => p.cartaoId);
  const definirAcumulo = usarPerfil((p) => p.definirAcumulo);

  const catalogo = useCatalogo();
  const [gasto, setGasto] = useState(gastoSalvo ?? PADRAO);
  const [cartaoId, setCartaoId] = useState(cartaoSalvo ?? "");

  const resposta = catalogo
    ? calcularMeuCusto(catalogo, gasto, cartaoId)
    : null;

  /**
   * Persistir no SOLTAR, nao a cada tique.
   *
   * O controle dispara onChange a cada passo do arrasto; gravar ali
   * seriam dezenas de escritas sincronas no localStorage durante um
   * gesto so, e o travamento apareceria justamente no movimento que
   * deveria parecer fluido.
   */
  function gravar(dados: { gasto?: number; cartao?: string }) {
    definirAcumulo({
      gastoMensalCartaoBRL: dados.gasto ?? gasto,
      cartaoId: (dados.cartao ?? cartaoId) || null,
    });
  }

  function salvar() {
    gravar({});
    aoResponder?.();
  }

  return (
    <div>
      <div className="mb-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label
            htmlFor="gasto-mensal"
            className="text-xs font-semibold uppercase tracking-wide text-tinta-fraca"
          >
            Quanto você passa no cartão por mês
          </label>
          <output className="tabular text-sm font-semibold text-tinta">
            {reais(gasto)}
          </output>
        </div>
        <input
          id="gasto-mensal"
          type="range"
          min={MINIMO}
          max={MAXIMO}
          step={PASSO}
          value={gasto}
          onChange={(e) => setGasto(Number(e.target.value))}
          onPointerUp={() => gravar({})}
          onKeyUp={() => gravar({})}
          onBlur={() => gravar({})}
          className="h-6 w-full accent-[var(--marca)]"
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="cartao-perfil"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-tinta-fraca"
        >
          Seu cartão
        </label>
        <select
          id="cartao-perfil"
          value={cartaoId}
          onChange={(e) => {
            setCartaoId(e.target.value);
            gravar({ cartao: e.target.value });
          }}
          className="w-full rounded-xl border border-borda bg-superficie px-3 py-3 text-base text-tinta outline-none focus:border-marca"
        >
          <option value="">Não sei / não tenho</option>
          {catalogo?.cartoes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} · {c.pontosPorDolarNacional} pts/US$
            </option>
          ))}
        </select>
      </div>

      {/* Altura reservada: a resposta chega depois do catalogo, e sem
          reserva ela empurraria o botao para baixo embaixo do dedo. */}
      <div className="min-h-[7.5rem] rounded-2xl bg-superficie-2 p-4">
        {resposta ? <Resposta {...resposta} /> : null}
      </div>

      {comBotao ? (
        <button
          type="button"
          onClick={salvar}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-marca px-5 text-sm font-semibold text-marca-contraste"
        >
          Salvar
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Resposta(r: MeuCusto) {
  return (
    <div className="tabular text-sm leading-relaxed text-tinta-media">
      <p className="display mb-1 text-2xl leading-tight text-tinta">
        {r.intervalo
          ? `${fmtMilhas(r.intervalo.min)} a ${fmtMilhas(r.intervalo.max)}`
          : fmtMilhas(r.milhasAno)}{" "}
        <span className="font-sans text-sm font-normal text-tinta-media">
          milhas por ano
        </span>
      </p>

      {r.viagem ? (
        <p>
          Dá para{" "}
          <strong className="font-semibold text-tinta">{r.viagem}</strong>, em
          classe econômica.
        </p>
      ) : r.anosParaViagem ? (
        <p>
          Nesse ritmo, {r.anosParaViagem}{" "}
          {r.anosParaViagem === 1 ? "ano" : "anos"} até o primeiro trecho.
        </p>
      ) : null}

      {r.intervalo ? (
        <p className="mt-1 text-xs text-tinta-fraca">
          A faixa é grande porque o cartão muda tudo: o melhor da nossa base
          rende quase cinco vezes o pior. Escolha o seu acima para o número
          virar o seu.
        </p>
      ) : (
        <p className="mt-1">
          {r.anuidadeDesconhecida ? (
            <>Não temos a anuidade deste cartão confirmada.</>
          ) : r.cpmBRL === 0 ? (
            <>
              E elas{" "}
              <strong className="font-semibold text-dinheiro">
                não te custam nada
              </strong>{" "}
              — contra {reaisExatos(r.custoDeQuemCompraBRL)} o milheiro de quem
              compra.
            </>
          ) : (
            <>
              Custam {reaisExatos(r.cpmBRL)} o milheiro, contra{" "}
              {reaisExatos(r.custoDeQuemCompraBRL)} de quem compra.
            </>
          )}
        </p>
      )}
    </div>
  );
}
