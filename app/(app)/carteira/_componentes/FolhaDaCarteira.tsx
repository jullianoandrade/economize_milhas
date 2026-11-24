"use client";

import { useEffect, useId, useRef, useState } from "react";
import { milhas as fmt } from "@/lib/format";
import type { ProgramaDaCarteira, Saldos } from "@/lib/carteira/modelo";
import { usarCarteira } from "@/store/carteira";

/**
 * A folha que sobe para guardar um saldo ou um vencimento.
 *
 * Uma folha so para os tres pedidos, porque o gesto e o mesmo -- digitar
 * um numero do app do programa -- e a pessoa aprende um lugar so.
 * No celular sobe de baixo; no desktop vira um cartao centralizado.
 */

export type PedidoDeFolha =
  | { modo: "novo"; programaId?: string }
  | { modo: "saldo"; programaId: string }
  | { modo: "vencimento"; programaId: string };

const MAXIMO = 100_000_000;

/** "milhas" e feminino, "pontos" e masculino. */
function quantos(p: ProgramaDaCarteira): string {
  return p.unidade === "milhas" ? "Quantas milhas" : "Quantos pontos";
}

function lerNumero(texto: string): number {
  const n = parseInt(texto.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? Math.min(n, MAXIMO) : 0;
}

export function FolhaDaCarteira({
  pedido,
  catalogo,
  saldos,
  hoje,
  aoFechar,
}: {
  pedido: PedidoDeFolha;
  catalogo: ProgramaDaCarteira[];
  saldos: Saldos;
  hoje: string;
  /** Recebe o programa salvo, para a pilha abrir nele; nada se cancelou. */
  aoFechar: (programaId?: string) => void;
}) {
  const id = useId();
  const guardarSaldo = usarCarteira((s) => s.guardarSaldo);
  const adicionarVencimento = usarCarteira((s) => s.adicionarVencimento);
  const campoRef = useRef<HTMLInputElement>(null);

  const disponiveis = catalogo.filter((p) => !saldos[p.id]);
  const [programaId, setProgramaId] = useState<string | undefined>(pedido.programaId);
  const programa = catalogo.find((p) => p.id === programaId);
  const [quantidade, setQuantidade] = useState(
    pedido.modo === "saldo" && programaId ? fmt(saldos[programaId]?.quantidade ?? 0) : "",
  );
  const [data, setData] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  // O pai recria aoFechar a cada render; guardado numa ref, o efeito
  // abaixo nao roda de novo no meio da digitacao (o que roubaria o foco).
  const fecharRef = useRef(aoFechar);
  useEffect(() => {
    fecharRef.current = aoFechar;
  });

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fecharRef.current();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      anterior?.focus?.({ preventScroll: true });
    };
  }, []);

  // Escolhido o programa, o foco vai para o numero.
  useEffect(() => {
    campoRef.current?.focus({ preventScroll: true });
  }, [programaId]);

  const titulo =
    pedido.modo === "vencimento"
      ? `Vencimento ${programa?.nome ?? ""}`
      : pedido.modo === "saldo"
        ? `Saldo ${programa?.nome ?? ""}`
        : programa
          ? programa.nome
          : "Qual programa?";

  function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!programa) return;
    const n = lerNumero(quantidade);
    if (n <= 0) {
      setErro(`Informe ${quantos(programa).toLowerCase()} você tem.`);
      return;
    }
    if (pedido.modo === "vencimento") {
      if (!data || data < hoje) {
        setErro("Escolha uma data de hoje em diante.");
        return;
      }
      adicionarVencimento(programa.id, { quantidade: n, data });
    } else {
      guardarSaldo(programa.id, n, hoje);
    }
    aoFechar(programa.id);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => aoFechar()}
        className="absolute inset-0 bg-[#0b1526]/40"
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        onSubmit={salvar}
        className="safe-bottom relative w-full max-w-md rounded-t-[28px] bg-superficie px-5 pb-6 pt-5 shadow-flutuante md:rounded-[28px]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={`${id}-titulo`} className="display text-xl text-tinta">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={() => aoFechar()}
            aria-label="Cancelar"
            className="flex size-11 items-center justify-center rounded-full bg-superficie-2 text-tinta"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {!programa ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {disponiveis.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProgramaId(p.id)}
                className="min-h-11 rounded-full border border-borda bg-superficie-2 px-4 text-[15px] font-semibold text-tinta"
              >
                {p.nome}
              </button>
            ))}
            {disponiveis.length === 0 ? (
              <p className="text-[15px] text-tinta-media">Todos os programas já estão na sua carteira.</p>
            ) : null}
          </div>
        ) : (
          <>
            <label htmlFor={`${id}-qtd`} className="mt-4 block text-[15px] text-tinta-media">
              {pedido.modo === "vencimento"
                ? `${quantos(programa)} vencem?`
                : `${quantos(programa)} você tem hoje?`}
            </label>
            <input
              ref={campoRef}
              id={`${id}-qtd`}
              inputMode="numeric"
              autoComplete="off"
              value={quantidade}
              onChange={(e) => {
                setErro(null);
                const n = lerNumero(e.target.value);
                setQuantidade(n > 0 ? fmt(n) : "");
              }}
              placeholder="0"
              className="tabular mt-2 h-14 w-full rounded-2xl border border-borda bg-superficie px-4 text-[22px] font-bold text-tinta outline-none focus:border-marca"
            />

            {pedido.modo === "vencimento" ? (
              <>
                <label htmlFor={`${id}-data`} className="mt-4 block text-[15px] text-tinta-media">
                  Em que data?
                </label>
                <input
                  id={`${id}-data`}
                  type="date"
                  min={hoje}
                  value={data}
                  onChange={(e) => {
                    setErro(null);
                    setData(e.target.value);
                  }}
                  className="mt-2 h-14 w-full rounded-2xl border border-borda bg-superficie px-4 text-[17px] text-tinta outline-none focus:border-marca"
                />
              </>
            ) : (
              <p className="mt-2 text-sm text-tinta-media">Confira no app do {programa.nome}. Você pode mudar quando quiser.</p>
            )}

            {erro ? (
              <p role="alert" className="mt-3 text-sm font-semibold text-alerta">
                {erro}
              </p>
            ) : null}

            <button type="submit" className="mt-5 min-h-14 w-full rounded-2xl bg-marca px-5 text-base font-semibold text-marca-contraste">
              {pedido.modo === "vencimento" ? "Guardar vencimento" : "Guardar na carteira"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
