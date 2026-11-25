"use client";

import { useEffect, useState } from "react";
import type { RotuloDeVeredito } from "@/lib/milhas/rotulos";

/**
 * As passagens em baixa saindo de uma cidade (/api/promocoes), com uma
 * busca so por origem e por visita: o Inicio tem dois leitores (a lista
 * "Passagens em baixa" e as dicas do Milo) e nao precisa pedir duas vezes.
 */

export type Oportunidade = {
  destino: { iata: string; cidade: string; pais?: string };
  precoBRL: number;
  descontoPct: number;
  veredito: RotuloDeVeredito;
  /** Dia de ida desta tarifa (AAAA-MM-DD), de hoje em diante; null se a API nao disse. */
  partidaEm: string | null;
};

export type Promocoes = { origem: { iata: string; cidade?: string }; oportunidades: Oportunidade[] };

const pedidos = new Map<string, Promise<Promocoes>>();

export function buscarPromocoes(origemIata: string): Promise<Promocoes> {
  let pedido = pedidos.get(origemIata);
  if (!pedido) {
    pedido = fetch(`/api/promocoes?origem=${encodeURIComponent(origemIata)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`promocoes ${r.status}`))))
      .catch((erro) => {
        pedidos.delete(origemIata); // falhou: a proxima visita tenta de novo
        throw erro;
      });
    pedidos.set(origemIata, pedido);
  }
  return pedido;
}

/** undefined = carregando; null = falhou. */
export function usePromocoes(origemIata: string): Promocoes | null | undefined {
  const [estado, setEstado] = useState<{ origem: string; dados: Promocoes | null } | null>(null);
  useEffect(() => {
    let vivo = true;
    buscarPromocoes(origemIata)
      .then((dados) => vivo && setEstado({ origem: origemIata, dados }))
      .catch(() => vivo && setEstado({ origem: origemIata, dados: null }));
    return () => {
      vivo = false;
    };
  }, [origemIata]);
  return estado && estado.origem === origemIata ? estado.dados : undefined;
}

/** A rota ja no dia da tarifa, quando a API disse qual e. */
export function hrefDaOferta(origemIata: string, o: Oportunidade): string {
  const base = `/rota/${origemIata}/${o.destino.iata}`;
  return o.partidaEm ? `${base}?data=${o.partidaEm}` : base;
}

/** "Praia" sozinho e ambiguo: fora do Brasil, a cidade leva o pais. */
export function lugarDaOferta(d: Oportunidade["destino"]): string {
  if (!d.pais || d.pais === "BR") return d.cidade;
  try {
    const pais = new Intl.DisplayNames(["pt-BR"], { type: "region" }).of(d.pais);
    return pais ? `${d.cidade}, ${pais}` : d.cidade;
  } catch {
    return d.cidade;
  }
}
