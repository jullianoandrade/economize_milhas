import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { armazenamentoSeguro, novoId } from "@/lib/cliente/armazenamento";
import {
  mudarSituacao,
  registrarBusca,
  registrarSaida,
  sanearViagens,
  type BuscaRecente,
  type SaidaParaPassagem,
  type SituacaoDaViagem,
  type Viagem,
} from "@/lib/viagens/modelo";

/**
 * Minhas viagens, guardadas so neste aparelho. Regras em
 * lib/viagens/modelo.ts; aqui so a persistencia, no mesmo molde robusto
 * da Carteira (store/carteira.ts).
 *
 * QUEM GRAVA:
 * - registrarSaida: todo link que leva a pessoa para a passagem (busca em
 *   dinheiro ou site do programa para resgatar). Chamar no clique, antes
 *   de a aba nova abrir.
 * - registrarBusca: a rota aberta no app (pagina /rota).
 * - mudarSituacao: a pessoa conta que reservou ou desistiu.
 */

type EstadoDasViagens = {
  viagens: Viagem[];
  buscas: BuscaRecente[];
  registrarSaida: (saida: SaidaParaPassagem) => void;
  registrarBusca: (origemIata: string, destinoIata: string) => void;
  mudarSituacao: (id: string, situacao: SituacaoDaViagem, ida?: string | null) => void;
  remover: (id: string) => void;
  apagarTudo: () => void;
};

let hidratacaoFalhou = false;
const aoFalhar = new Set<() => void>();

export const usarViagens = create<EstadoDasViagens>()(
  persist(
    (set) => ({
      viagens: [],
      buscas: [],
      registrarSaida: (saida) =>
        set((s) => ({ viagens: registrarSaida(s.viagens, saida, new Date(), novoId) })),
      registrarBusca: (origemIata, destinoIata) =>
        set((s) => ({ buscas: registrarBusca(s.buscas, origemIata, destinoIata, new Date()) })),
      mudarSituacao: (id, situacao, ida) =>
        set((s) => ({ viagens: mudarSituacao(s.viagens, id, situacao, new Date(), ida) })),
      remover: (id) => set((s) => ({ viagens: s.viagens.filter((v) => v.id !== id) })),
      apagarTudo: () => set({ viagens: [], buscas: [] }),
    }),
    {
      name: "voemilo-viagens",
      version: 1,
      storage: createJSONStorage(armazenamentoSeguro),
      partialize: (s) => ({ viagens: s.viagens, buscas: s.buscas }),
      migrate: (guardado) => sanearViagens(guardado) as unknown as EstadoDasViagens,
      merge: (guardado, atual) => ({ ...atual, ...sanearViagens(guardado) }),
      onRehydrateStorage: () => (_estado, erro) => {
        if (erro) {
          hidratacaoFalhou = true;
          aoFalhar.forEach((avisar) => avisar());
        }
      },
    },
  ),
);

/** Ver useCarteiraHidratada: o mesmo motivo, a mesma forma. */
export function useViagensHidratadas(): boolean {
  return useSyncExternalStore(
    (aoMudar) => {
      const sair = usarViagens.persist.onFinishHydration(aoMudar);
      aoFalhar.add(aoMudar);
      return () => {
        sair();
        aoFalhar.delete(aoMudar);
      };
    },
    () => usarViagens.persist.hasHydrated() || hidratacaoFalhou,
    () => false,
  );
}
