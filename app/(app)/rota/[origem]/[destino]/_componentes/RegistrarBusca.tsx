"use client";

import { useEffect } from "react";
import { usarViagens } from "@/store/viagens";

/**
 * Guarda a rota aberta nas buscas recentes de Minhas viagens.
 *
 * Nao desenha nada. Componente de cliente pelo mesmo motivo de
 * RegistrarInteresse: a pagina e pre-renderizada e o registro mora no
 * aparelho. Repetir a mesma rota so a traz para o topo (registrarBusca
 * deduplica), entao o efeito duplo do modo estrito nao suja a lista.
 */
export function RegistrarBusca({
  origem,
  destino,
}: {
  origem: string;
  destino: string;
}) {
  useEffect(() => {
    try {
      usarViagens.getState().registrarBusca(origem, destino);
    } catch {
      // Armazenamento bloqueado: segue sem registrar.
    }
  }, [origem, destino]);

  return null;
}
