import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Perfil do usuario.
 *
 * Mora no localStorage, nao no banco. O Supabase guarda so dados de
 * mercado, que sao compartilhados por todo mundo; saldo de milhas, gasto
 * de cartao e metas de viagem sao pessoais e nao precisam sair do
 * aparelho para o app funcionar. Isso tambem elimina a necessidade de
 * login no MVP.
 */

export type Perfil = {
  /** Aeroporto de partida padrao. */
  origemIata: string;
  definirOrigem: (iata: string) => void;
};

export const usarPerfil = create<Perfil>()(
  persist(
    (set) => ({
      origemIata: "GRU",
      definirOrigem: (iata) => set({ origemIata: iata.toUpperCase() }),
    }),
    {
      name: "milhas-perfil",
      version: 1,
    },
  ),
);
