import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { MAXIMO_DE_SALDO, sanearSaldos, type Saldos, type Vencimento } from "@/lib/carteira/modelo";

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

/**
 * localStorage que nao lanca erro.
 *
 * JSON quebrado no aparelho fazia o persist rejeitar a hidratacao, e a
 * Carteira ficava em aria-busy para sempre -- tela em branco sem saida.
 * Conteudo ilegivel vira "nada guardado"; o proximo salvamento
 * sobrescreve. Sem localStorage (pre-render no servidor), a referencia
 * abaixo lanca dentro do createJSONStorage, que entao nao hidrata --
 * o mesmo comportamento de antes.
 */
function armazenamentoSeguro(): StateStorage {
  const ls = localStorage;
  return {
    getItem: (nome) => {
      try {
        const bruto = ls.getItem(nome);
        if (bruto === null) return null;
        JSON.parse(bruto);
        return bruto;
      } catch {
        return null;
      }
    },
    setItem: (nome, valor) => {
      try {
        ls.setItem(nome, valor);
      } catch {
        // Cota cheia ou modo privado: a sessao continua, so nao persiste.
      }
    },
    removeItem: (nome) => {
      try {
        ls.removeItem(nome);
      } catch {
        // idem
      }
    },
  };
}

/** Estado guardado -> estado confiavel, venha de que versao vier. */
function lerGuardado(guardado: unknown): { saldos: Saldos } {
  const saldos =
    typeof guardado === "object" && guardado !== null && "saldos" in guardado
      ? (guardado as { saldos: unknown }).saldos
      : undefined;
  return { saldos: sanearSaldos(saldos) };
}

// Se a hidratacao falhar mesmo assim, a tela precisa sair do "carregando":
// carteira vazia e melhor que tela em branco. O persist nao marca
// hasHydrated em caso de erro, entao a marca e nossa.
let hidratacaoFalhou = false;
const aoFalhar = new Set<() => void>();

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
              quantidade: Math.min(MAXIMO_DE_SALDO, Math.max(0, Math.round(quantidade))),
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
    {
      name: "voemilo-carteira",
      version: 1,
      storage: createJSONStorage(armazenamentoSeguro),
      // Versao diferente nao e motivo para jogar saldos fora: o formato
      // e simples, entao o que for aproveitavel e aproveitado.
      migrate: (guardado) => lerGuardado(guardado) as Carteira,
      merge: (guardado, atual) => ({ ...atual, ...lerGuardado(guardado) }),
      onRehydrateStorage: () => (_estado, erro) => {
        if (erro) {
          hidratacaoFalhou = true;
          aoFalhar.forEach((avisar) => avisar());
        }
      },
    },
  ),
);

/** Ver usePerfilHidratado: o mesmo motivo, a mesma forma. */
export function useCarteiraHidratada(): boolean {
  return useSyncExternalStore(
    (aoMudar) => {
      const sair = usarCarteira.persist.onFinishHydration(aoMudar);
      aoFalhar.add(aoMudar);
      return () => {
        sair();
        aoFalhar.delete(aoMudar);
      };
    },
    () => usarCarteira.persist.hasHydrated() || hidratacaoFalhou,
    () => false,
  );
}
