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

/**
 * Como a pessoa acumula milhas hoje.
 *
 * Existe porque o app passou tempo demais cotando o custo de milhas de
 * um estranho: sem estes campos, o motor cai em "comprar pontos Livelo
 * e transferir", a R$ 16,67 o milheiro, e decide "milhas ou dinheiro"
 * com um numero que nao e de ninguem. Quem tem cartao sem anuidade tem
 * CPM perto de zero -- a resposta muda, as vezes de lado.
 */
export type SituacaoDeAcumulo = {
  /** null = a pessoa ainda nao respondeu. Zero e uma resposta. */
  gastoMensalCartaoBRL: number | null;
  cartaoId: string | null;
  saldoPontosCoalizao: number;
  aceitaClube: boolean;
};

export type Perfil = SituacaoDeAcumulo & {
  /** Aeroporto de partida padrao. */
  origemIata: string;
  /** Ja passou pela tela de boas-vindas alguma vez. */
  visitou: boolean;
  metas: Meta[];

  definirOrigem: (iata: string) => void;
  definirAcumulo: (dados: Partial<SituacaoDeAcumulo>) => void;
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

export const VERSAO_DO_PERFIL = 3;

/**
 * Migrar e ACRESCENTAR, nunca substituir.
 *
 * Ha gente com meta salva em producao, e meta guarda um ponto de
 * partida que nao da para recuperar depois -- e o unico dado
 * insubstituivel do app. Por isso cada passo espalha o estado anterior e
 * so completa o que falta.
 *
 * Exportada para ter teste proprio: um `migrate` errado so apareceria no
 * aparelho de quem ja usa o app, que e exatamente onde nao da para
 * descobrir.
 */
export function migrarPerfil(estado: unknown, versao: number): Perfil {
  let atual = (estado ?? {}) as Partial<Perfil>;

  // v1 so guardava a origem. Quem ja usava o app nao pode cair numa
  // tela de boas-vindas que nao pediu.
  if (versao < 2) {
    atual = { ...atual, visitou: true, metas: atual.metas ?? [] };
  }

  // v3 acrescenta a situacao de acumulo. Fica em null de proposito:
  // "ainda nao respondeu" precisa ser distinguivel de "respondeu zero",
  // senao a tela nunca sabe se deve perguntar.
  if (versao < 3) {
    atual = {
      ...atual,
      gastoMensalCartaoBRL: atual.gastoMensalCartaoBRL ?? null,
      cartaoId: atual.cartaoId ?? null,
      saldoPontosCoalizao: atual.saldoPontosCoalizao ?? 0,
      aceitaClube: atual.aceitaClube ?? false,
    };
  }

  return atual as Perfil;
}

export const usarPerfil = create<Perfil>()(
  persist(
    (set) => ({
      origemIata: "GRU",
      visitou: false,
      metas: [],

      gastoMensalCartaoBRL: null,
      cartaoId: null,
      saldoPontosCoalizao: 0,
      aceitaClube: false,

      definirOrigem: (iata) => set({ origemIata: iata.toUpperCase() }),

      definirAcumulo: (dados) => set(dados),

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
      version: VERSAO_DO_PERFIL,
      migrate: (estado, versao) => migrarPerfil(estado, versao),
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
