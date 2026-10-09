"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usarPerfil } from "@/store/perfil";

/**
 * Manda quem nunca entrou para a tela de boas-vindas.
 *
 * A decisao roda depois da hidratacao, nunca durante a renderizacao: o
 * servidor nao tem como saber o que esta no localStorage do aparelho, e
 * usar esse valor no render daria divergencia de hidratacao.
 *
 * Quem ja visitou -- o caso normal, de toda visita depois da primeira --
 * nao ve nada acontecer. A home continua pre-renderizada para todo mundo.
 */
export function PrimeiraVisita() {
  const router = useRouter();

  useEffect(() => {
    const decidir = () => {
      if (!usarPerfil.getState().visitou) router.replace("/boas-vindas");
    };

    if (usarPerfil.persist.hasHydrated()) {
      decidir();
      return;
    }
    return usarPerfil.persist.onFinishHydration(decidir);
  }, [router]);

  return null;
}
