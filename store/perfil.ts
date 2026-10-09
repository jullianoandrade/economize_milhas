import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Meta, Registro } from "@/lib/metas/progresso";

/**
 * Perfil do usuario.
 *
 * Mora no localStorage, nao no banco. O Supabase guarda so dados de
 * mercado, que sao compartilhados por todo mundo; saldo de milhas, gasto
 * de cartao e metas de viagem sao pessoais e nao precisam sair do
 * aparelho para o app funcionar. Isso tambem elimina a necessidade de
 * login no MVP -- e nos mantem praticamente fora do alcance da LGPD
 * enquanto nao houver conta.
 */

export type Perfil = {
  /** Aeroporto de partida padrao. */
  origemIata: string;
  /** Ja passou pela tela de boas-vindas alguma vez. */
  visitou: boolean;
  metas: Meta[];

  definirOrigem: (iata: string) => void;
  marcarVisita: () => void;
  salvarMeta: (meta: Meta) => void;
  registrarSaldo: (metaId: string, registro: Registro) => void;
  definirDataAlvo: (metaId: string, dataAlvo: string | null) => void;
  atualizarRitmo: (metaId: string, ritmoMensalEstimado: number) => void;
  atualizarEstimativa: (
    metaId: string,
    milhasNecessarias: number,
    precoDaPassagemBRL: number,
  ) => void;
  removerMeta: (metaId: string) => void;
};

export const usarPerfil = create<Perfil>()(
  persist(
    (set) => ({
      origemIata: "GRU",
      visitou: false,
      metas: [],

      definirOrigem: (iata) => set({ origemIata: iata.toUpperCase() }),

      marcarVisita: () => set({ visitou: true }),

      // Um objetivo por destino: criar o mesmo trecho duas vezes jogaria
      // fora o ponto de partida antigo, que e justamente o dado que nao
      // da para recuperar depois.
      salvarMeta: (meta) =>
        set((estado) => ({
          metas: [
            meta,
            ...estado.metas.filter(
              (m) =>
                !(
                  m.destinoIata === meta.destinoIata &&
                  m.origemIata === meta.origemIata
                ),
            ),
          ],
        })),

      registrarSaldo: (metaId, registro) =>
        set((estado) => ({
          metas: estado.metas.map((m) => {
            if (m.id !== metaId) return m;
            // Dois registros no mesmo dia viram um: o ultimo vale.
            const outros = m.registros.filter((r) => r.em !== registro.em);
            return {
              ...m,
              registros: [...outros, registro].sort((a, b) =>
                a.em.localeCompare(b.em),
              ),
            };
          }),
        })),

      definirDataAlvo: (metaId, dataAlvo) =>
        set((estado) => ({
          metas: estado.metas.map((m) =>
            m.id === metaId ? { ...m, dataAlvo } : m,
          ),
        })),

      // O ritmo nao e dado do usuario, e consequencia do plano de
      // acumulo: ele se atualiza sozinho sempre que o plano recalcula.
      atualizarRitmo: (metaId, ritmoMensalEstimado) =>
        set((estado) => ({
          metas: estado.metas.map((m) =>
            m.id === metaId && m.ritmoMensalEstimado !== ritmoMensalEstimado
              ? { ...m, ritmoMensalEstimado }
              : m,
          ),
        })),

      // A quantidade de milhas do trecho fica CONGELADA na criacao de
      // proposito -- uma meta que se move sozinha nao e meta. Mexer nela
      // e decisao explicita de quem esta acompanhando.
      atualizarEstimativa: (metaId, milhasNecessarias, precoDaPassagemBRL) =>
        set((estado) => ({
          metas: estado.metas.map((m) =>
            m.id === metaId
              ? { ...m, milhasNecessarias, precoDaPassagemBRL }
              : m,
          ),
        })),

      removerMeta: (metaId) =>
        set((estado) => ({
          metas: estado.metas.filter((m) => m.id !== metaId),
        })),
    }),
    {
      name: "milhas-perfil",
      version: 2,
      // A versao 1 so guardava a origem. Quem ja usava o app nao pode
      // perde-la nem cair numa tela de boas-vindas que nao pediu.
      migrate: (estado, versao) => {
        const anterior = estado as Partial<Perfil> | undefined;
        if (versao < 2) {
          return {
            ...(anterior ?? {}),
            visitou: true,
            metas: [],
          } as Perfil;
        }
        return estado as Perfil;
      },
    },
  ),
);

/**
 * Diz se o estado guardado no aparelho ja chegou.
 *
 * O servidor nao tem localStorage, entao ele sempre renderiza o perfil
 * vazio. Sem esta porteira, uma tela de objetivos renderizaria "nenhum
 * objetivo" para quem tem tres, e a correcao chegaria como divergencia
 * de hidratacao.
 *
 * O nome foge do portugues do resto do projeto porque o React exige
 * que todo hook comece com "use" -- e o verificador de regras de hooks
 * reprova o build se nao comecar.
 *
 * E useSyncExternalStore, e nao um useEffect com flag de montagem,
 * porque a hidratacao do zustand E uma fonte externa: o React sabe
 * lidar com instantaneo de servidor diferente do de cliente, desde que a
 * gente diga qual e qual.
 */
export function usePerfilHidratado(): boolean {
  return useSyncExternalStore(
    (aoMudar) => usarPerfil.persist.onFinishHydration(aoMudar),
    () => usarPerfil.persist.hasHydrated(),
    () => false,
  );
}
