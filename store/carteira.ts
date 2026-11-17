import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Saldos, Vencimento } from "@/lib/carteira/modelo";

/**
 * A Carteira, guardada so neste aparelho.
 *
 * Mesma decisao do perfil (store/perfil.ts): saldo de pontos e pessoal e
 * nao precisa sair do aparelho para o app funcionar. Sem conta, sem
 * servidor, sem senha de programa -- e a promessa que a tela faz em
 * voz alta. Quando houver conta, este e o ponto de partida da
 * sincronizacao, nao algo a jogar fora.
 *
 * Store separado do perfil de proposito: a Carteira vai crescer
 * (historico, objetivos ligados a saldo) e nao deve arrastar a migracao
 * do perfil junto.
 */

type Carteira = {
  saldos: Saldos;
  guardarSaldo: (programaId: string, quantidade: number, hoje: string) => void;
  removerPrograma: (programaId: string) => void;
  adicionarVencimento: (programaId: string, vencimento: Omit<Vencimento, "id">) => void;
  removerVencimento: (programaId: string, vencimentoId: string) => void;
};

function novoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const usarCarteira = create<Carteira>()(
  persist(
    (set) => ({
      saldos: {},

      guardarSaldo: (programaId, quantidade, hoje) =>
        set((s) => ({
          saldos: {
            ...s.saldos,
            [programaId]: {
              vencimentos: s.saldos[programaId]?.vencimentos ?? [],
              quantidade: Math.max(0, Math.round(quantidade)),
              atualizadoEm: hoje,
            },
          },
        })),

      removerPrograma: (programaId) =>
        set((s) => {
          const resto = { ...s.saldos };
          delete resto[programaId];
          return { saldos: resto };
        }),

      adicionarVencimento: (programaId, vencimento) =>
        set((s) => {
          const atual = s.saldos[programaId];
          if (!atual) return s;
          return {
            saldos: {
              ...s.saldos,
              [programaId]: {
                ...atual,
                vencimentos: [...atual.vencimentos, { ...vencimento, id: novoId() }],
              },
            },
          };
        }),

      removerVencimento: (programaId, vencimentoId) =>
        set((s) => {
          const atual = s.saldos[programaId];
          if (!atual) return s;
          return {
            saldos: {
              ...s.saldos,
              [programaId]: {
                ...atual,
                vencimentos: atual.vencimentos.filter((v) => v.id !== vencimentoId),
              },
            },
          };
        }),
    }),
    { name: "voemilo-carteira", version: 1 },
  ),
);

/** Ver usePerfilHidratado: o mesmo motivo, a mesma forma. */
export function useCarteiraHidratada(): boolean {
  return useSyncExternalStore(
    (aoMudar) => usarCarteira.persist.onFinishHydration(aoMudar),
    () => usarCarteira.persist.hasHydrated(),
    () => false,
  );
}
