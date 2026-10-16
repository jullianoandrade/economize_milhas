"use client";

import { useEffect, useState } from "react";
import type { Veredito } from "@/lib/milhas/veredito";
import type { Fonte } from "@/lib/providers/travelpayouts";

/**
 * O veredito pessoal, buscado uma vez e compartilhado por duas ilhas.
 *
 * O heroi e "Como pagar" precisam do MESMO veredito, mas nao ficam
 * adjacentes no documento -- o bloco "quando ir" fica entre eles.
 * Contexto do React resolveria isso, mas obrigaria os dois a virar
 * client component e perder o primeiro render no servidor (o padrao
 * "children como server slot" que preserva a pre-renderizacao parcial).
 * Em vez disso, cada ilha chama este MESMO hook; o cache por chave
 * garante uma unica requisicao para as duas, do mesmo jeito que
 * lib/cliente/catalogo.ts faz para o catalogo.
 */

export type VerediteDaPessoa = {
  veredito: Veredito;
  fonte: Fonte;
  observacaoDaFonte: string;
};

const cache = new Map<string, Promise<VerediteDaPessoa>>();

function chave(
  origem: string,
  destino: string,
  gasto: number,
  cartaoId: string | null,
): string {
  return `${origem}|${destino}|${gasto}|${cartaoId ?? ""}`;
}

function buscar(
  origem: string,
  destino: string,
  gasto: number,
  cartaoId: string | null,
): Promise<VerediteDaPessoa> {
  const k = chave(origem, destino, gasto, cartaoId);
  let pendente = cache.get(k);

  if (!pendente) {
    const parametros = new URLSearchParams({
      origem,
      destino,
      gasto: String(gasto),
    });
    if (cartaoId) parametros.set("cartaoId", cartaoId);

    pendente = fetch(`/api/veredito?${parametros}`)
      .then((r) => {
        if (!r.ok) throw new Error("veredito indisponível");
        return r.json() as Promise<{
          veredito: Veredito;
          preco: { fonte: Fonte; observacao: string };
        }>;
      })
      .then((corpo) => ({
        veredito: corpo.veredito,
        fonte: corpo.preco.fonte,
        observacaoDaFonte: corpo.preco.observacao,
      }))
      .catch((erro) => {
        // Sem isto, uma falha de rede guardaria a promessa rejeitada para
        // sempre e nenhuma ilha tentaria de novo depois.
        cache.delete(k);
        throw erro;
      });

    cache.set(k, pendente);
  }

  return pendente;
}

export function useVereditoPersonalizado(
  hidratado: boolean,
  gasto: number | null,
  cartaoId: string | null,
  origem: string,
  destino: string,
): VerediteDaPessoa | null {
  const [resultado, setResultado] = useState<VerediteDaPessoa | null>(null);

  useEffect(() => {
    if (!hidratado || gasto === null) return;

    let vivo = true;
    buscar(origem, destino, gasto, cartaoId)
      .then((r) => {
        if (vivo) setResultado(r);
      })
      .catch(() => {});

    return () => {
      vivo = false;
    };
  }, [hidratado, gasto, cartaoId, origem, destino]);

  return resultado;
}
