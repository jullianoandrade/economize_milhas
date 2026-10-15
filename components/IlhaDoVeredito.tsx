"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Veredito } from "@/lib/milhas/veredito";
import type { Fonte } from "@/lib/providers/travelpayouts";
import type { FaseDaJornada } from "@/lib/monetizacao/jornada";
import { usarPerfil, usePerfilHidratado } from "@/store/perfil";
import { BlocoDeVeredito } from "./BlocoDeVeredito";

/**
 * Troca o veredito de mercado pelo da pessoa, depois da hidratacao.
 *
 * `children` e o mesmo BlocoDeVeredito ja renderizado no servidor com o
 * CPM de quem compra milhas -- aparece primeiro, sem atraso, e continua
 * sendo o que builder sem JavaScript ou sem perfil respondido ve.
 *
 * Se a pessoa ja respondeu a pergunta do cartao, buscamos o veredito de
 * novo com o perfil dela e substituimos. Nunca por cookie: isso tornaria
 * a rota inteira dinamica e mataria a pre-renderizacao parcial.
 */
export function IlhaDoVeredito({
  origem,
  destino,
  dataEscolhida,
  fase,
  children,
}: {
  origem: string;
  destino: string;
  dataEscolhida: string | null;
  fase: FaseDaJornada;
  children: ReactNode;
}) {
  const hidratado = usePerfilHidratado();
  const gasto = usarPerfil((p) => p.gastoMensalCartaoBRL);
  const cartaoId = usarPerfil((p) => p.cartaoId);

  const [pessoal, setPessoal] = useState<{
    veredito: Veredito;
    preco: { valorBRL: number; fonte: Fonte; observacao: string };
  } | null>(null);

  useEffect(() => {
    if (!hidratado || gasto === null) return;

    const controlador = new AbortController();
    const parametros = new URLSearchParams({
      origem,
      destino,
      gasto: String(gasto),
    });
    if (cartaoId) parametros.set("cartaoId", cartaoId);

    fetch(`/api/veredito?${parametros}`, { signal: controlador.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("falhou"))))
      .then(setPessoal)
      .catch((e) => {
        if (e.name !== "AbortError") setPessoal(null);
      });

    return () => controlador.abort();
  }, [hidratado, gasto, cartaoId, origem, destino]);

  if (!pessoal) return <>{children}</>;

  return (
    <BlocoDeVeredito
      veredito={pessoal.veredito}
      fonte={pessoal.preco.fonte}
      observacaoDaFonte={pessoal.preco.observacao}
      origemIata={origem}
      destinoIata={destino}
      dataEscolhida={dataEscolhida}
      fase={fase}
    />
  );
}
