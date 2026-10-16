"use client";

import type { ReactNode } from "react";
import { usarPerfil, usePerfilHidratado } from "@/store/perfil";
import { useVereditoPersonalizado } from "@/lib/cliente/veredito";
import { ComoPagar } from "./ComoPagar";

/**
 * A irmã de IlhaDoVeredito, para a seção "Como pagar".
 *
 * As duas pedem o MESMO veredito pessoal, mas não ficam adjacentes no
 * documento -- o bloco "quando ir" fica entre elas -- e por isso não dá
 * para ser uma ilha só. O hook por trás (lib/cliente/veredito.ts) tem
 * cache por chave: as duas chamadas, com os mesmos origem/destino/perfil,
 * dividem a MESMA requisição a /api/veredito.
 */
export function IlhaDeComoPagar({
  origem,
  destino,
  children,
}: {
  origem: string;
  destino: string;
  children: ReactNode;
}) {
  const hidratado = usePerfilHidratado();
  const gasto = usarPerfil((p) => p.gastoMensalCartaoBRL);
  const cartaoId = usarPerfil((p) => p.cartaoId);

  const pessoal = useVereditoPersonalizado(
    hidratado,
    gasto,
    cartaoId,
    origem,
    destino,
  );

  if (!pessoal) return <>{children}</>;
  return <ComoPagar veredito={pessoal.veredito} />;
}
