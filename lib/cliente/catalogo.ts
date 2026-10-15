"use client";

import { useEffect, useState } from "react";
import {
  milhasPorAno,
  rendimentoDoCartao,
  type EntradaDeCartao,
} from "@/lib/milhas/calculo-cartao";

/**
 * O catalogo que a interface precisa para responder sem ir ao servidor.
 *
 * Buscado UMA vez por carregamento de pagina, nao uma vez por
 * componente: a home mostra o custo da pessoa e, ao expandir, a
 * pergunta do cartao -- os dois precisam dos mesmos dados, e duas
 * requisicoes identicas na mesma tela seriam desperdicio visivel numa
 * rede ruim.
 *
 * O cache e uma promessa em escopo de modulo. Vive enquanto a aba
 * viver, some em qualquer recarga, e por isso nao corre risco de
 * envelhecer: o catalogo e dado curado, nao preco.
 */

export type Catalogo = {
  cartoes: Array<{
    id: string;
    nome: string;
    emissor: string;
    pontosPorDolarNacional: number;
    anuidadeBRL: number | null;
    isencaoGastoMensalBRL: number | null;
  }>;
  cotacaoDolarReferenciaBRL: number;
  bonusMedianoPct: number;
  custoDeQuemCompraBRL: number;
  escadaDeResgates: Array<{ milhas: number; rotulo: string }>;
};

let pendente: Promise<Catalogo> | null = null;

function buscar(): Promise<Catalogo> {
  pendente ??= fetch("/api/plano")
    .then((r) => {
      if (!r.ok) throw new Error("catálogo indisponível");
      return r.json() as Promise<Catalogo>;
    })
    .catch((erro) => {
      // Sem isto, uma falha de rede deixaria a promessa rejeitada
      // guardada para sempre e nenhuma tentativa posterior aconteceria.
      pendente = null;
      throw erro;
    });

  return pendente;
}

export function useCatalogo(): Catalogo | null {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);

  useEffect(() => {
    let vivo = true;
    buscar()
      .then((c) => {
        if (vivo) setCatalogo(c);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  return catalogo;
}

/* ------------------------------------------------------------------ */

export type MeuCusto = {
  milhasAno: number;
  cpmBRL: number;
  anuidadeDesconhecida: boolean;
  custoDeQuemCompraBRL: number;
  viagem: string | null;
  anosParaViagem: number | null;
  intervalo: { min: number; max: number } | null;
};

/**
 * Sem cartao escolhido a resposta vira FAIXA, nao media.
 *
 * A diferenca entre o pior e o melhor cartao da base e de quase cinco
 * vezes. Apresentar a media como se fosse o caso dela seria o tipo de
 * numero conveniente que este app existe para nao dar.
 */
export function calcularMeuCusto(
  catalogo: Catalogo,
  gasto: number,
  cartaoId: string,
): MeuCusto | null {
  if (gasto <= 0) return null;

  const entrada = (c: Catalogo["cartoes"][number]): EntradaDeCartao => ({
    gastoMensalBRL: gasto,
    pontosPorDolarNacional: c.pontosPorDolarNacional,
    cotacaoDolarBRL: catalogo.cotacaoDolarReferenciaBRL,
    anuidadeBRL: c.anuidadeBRL,
    isencaoGastoMensalBRL: c.isencaoGastoMensalBRL,
  });

  const escolhido = catalogo.cartoes.find((c) => c.id === cartaoId);

  if (!escolhido) {
    const todos = catalogo.cartoes
      .map((c) => rendimentoDoCartao(entrada(c)))
      .filter((r) => r !== null)
      .map((r) => milhasPorAno(r.pontosPorAno, catalogo.bonusMedianoPct));

    if (todos.length === 0) return null;

    const min = Math.min(...todos);
    const max = Math.max(...todos);
    const viagem = melhorViagem(catalogo.escadaDeResgates, max);

    return {
      milhasAno: max,
      cpmBRL: 0,
      anuidadeDesconhecida: false,
      custoDeQuemCompraBRL: custoDeQuemCompra(catalogo),
      viagem: viagem?.rotulo ?? null,
      anosParaViagem: viagem ? null : anosAte(catalogo, max),
      intervalo: { min, max },
    };
  }

  const r = rendimentoDoCartao(entrada(escolhido));
  if (!r) return null;

  const milhasAno = milhasPorAno(r.pontosPorAno, catalogo.bonusMedianoPct);
  const viagem = melhorViagem(catalogo.escadaDeResgates, milhasAno);

  return {
    milhasAno,
    cpmBRL: r.cpmBRL,
    anuidadeDesconhecida: r.anuidadeDesconhecida,
    custoDeQuemCompraBRL: custoDeQuemCompra(catalogo),
    viagem: viagem?.rotulo ?? null,
    anosParaViagem: viagem ? null : anosAte(catalogo, milhasAno),
    intervalo: null,
  };
}

/**
 * O bonus multiplica os pontos da ORIGEM, entao o custo de quem compra
 * e o preco do ponto Livelo dividido pelo bonus -- nao o preco da milha
 * pronta. E a mesma conta do motor.
 */
function custoDeQuemCompra(c: Catalogo): number {
  return c.custoDeQuemCompraBRL / (1 + c.bonusMedianoPct / 100);
}

function melhorViagem(
  escada: Catalogo["escadaDeResgates"],
  milhas: number,
): { milhas: number; rotulo: string } | null {
  const cabem = escada.filter((e) => e.milhas <= milhas);
  return cabem.length > 0 ? cabem[cabem.length - 1] : null;
}

function anosAte(catalogo: Catalogo, milhasAno: number): number | null {
  const primeira = catalogo.escadaDeResgates[0];
  if (!primeira || milhasAno <= 0) return null;
  return Math.ceil(primeira.milhas / milhasAno);
}
