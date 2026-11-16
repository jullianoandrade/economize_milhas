import "server-only";

import { leitor } from "@/lib/supabase";
import type { BonusPorPrograma, BonusVigente } from "@/lib/milhas/motor";

/**
 * As promocoes de transferencia que estao valendo hoje.
 *
 * Esta e a informacao mais acionavel do nicho e a que faltava. Um bonus
 * de 100% faz 1.000 pontos virarem 2.000 milhas, ou seja, corta o custo
 * do milheiro pela metade -- mexe mais no veredito do que qualquer
 * variacao de tarifa. O app mostrava, no lugar dela, o percentual
 * MEDIANO HISTORICO de cada programa.
 *
 * A tabela bonus_transferencia existe desde a primeira migration, com
 * indice e comentario explicando que ficaria ali "para poder ser
 * atualizado sem deploy" -- e ficou vazia, sem um unico leitor no
 * codigo. data/calendario-transferencias.json ja dizia a mesma coisa:
 * "os bonus VIGENTES ficam no Supabase, porque mudam toda semana".
 *
 * Curada a mao de proposito: nao existe fonte automatizavel confiavel
 * para isto, e inventar uma promocao que nao existe seria pior do que
 * nao mostrar nenhuma.
 *
 * Sem banco, sem promocao cadastrada ou com qualquer falha, devolve
 * vazio -- e o motor volta ao bonus mediano, que e o comportamento de
 * sempre.
 */

/** Quando dois bonus valem para o mesmo programa, o maior ganha. */
function melhorPorPrograma(linhas: BonusLinha[]): BonusPorPrograma {
  const porPrograma: BonusPorPrograma = {};

  for (const linha of linhas) {
    const atual = porPrograma[linha.destino];
    if (atual && atual.percentual >= linha.percentual) continue;

    porPrograma[linha.destino] = {
      percentual: linha.percentual,
      origem: linha.origem,
      terminaEm: linha.termina_em,
    };
  }

  return porPrograma;
}

type BonusLinha = {
  origem: string;
  destino: string;
  percentual: number;
  termina_em: string;
};

export async function bonusVigentes(): Promise<BonusPorPrograma> {
  const banco = leitor();
  if (!banco) return {};

  // "Hoje" no fuso de quem usa o app, nao em UTC. O servidor roda em
  // UTC, entao toISOString() viraria o dia as 21h de Brasilia: uma
  // promocao que termina hoje sumiria da tela tres horas antes de
  // realmente acabar, justamente nas horas em que alguem correria para
  // aproveitar. en-CA formata como yyyy-mm-dd, que e o formato da
  // coluna.
  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const { data, error } = await banco
    .from("bonus_transferencia")
    .select("origem, destino, percentual, termina_em")
    .lte("comeca_em", hoje)
    .gte("termina_em", hoje)
    .order("percentual", { ascending: false });

  if (error || !Array.isArray(data) || data.length === 0) return {};

  const linhas: BonusLinha[] = data
    .map((l) => ({
      origem: String(l.origem),
      destino: String(l.destino),
      percentual: Number(l.percentual),
      termina_em: String(l.termina_em).slice(0, 10),
    }))
    .filter((l) => Number.isFinite(l.percentual) && l.percentual > 0);

  return melhorPorPrograma(linhas);
}

export type { BonusVigente };
