/**
 * Limite de requisicoes por chave, em janela fixa.
 *
 * POR QUE EXISTE: /veredito, /plano e /promocoes (a API) consultam a
 * Travelpayouts a cada chamada, e o cache e por URL -- variar o par de
 * aeroportos fura o cache. Sem limite, um unico script esgota a cota
 * diaria da API e derruba o produto para todo mundo. /interesse escreve
 * no banco e sem limite deixa inflar o sensor de demanda.
 *
 * O QUE ELE NAO E: protecao distribuida. O estado mora na memoria da
 * instancia. Na Vercel (Fluid Compute) uma instancia atende muitas
 * requisicoes, entao isto segura o abuso ingenuo -- o laco de um
 * script -- mas um ataque espalhado por varias instancias passa. A
 * camada que segura isso e uma regra de rate limit no Vercel Firewall
 * ou um contador em Redis, e esta decisao ainda esta aberta. Este
 * arquivo e a primeira camada, nao a unica.
 *
 * Puro de proposito (relogio injetavel, sem import de Next) para ter
 * teste proprio.
 */

export type Regra = {
  /** Quantas requisicoes cabem na janela. */
  maximo: number;
  /** Tamanho da janela, em milissegundos. */
  janelaMs: number;
};

export type Resultado =
  | { permitido: true; restantes: number }
  | { permitido: false; tenteEmSegundos: number };

type Contagem = { inicio: number; usadas: number };

/**
 * Teto de chaves guardadas. Sem ele, o proprio limitador vira vetor de
 * ataque: cada IP forjado ou par de aeroportos novo e uma entrada a
 * mais na memoria. Ao estourar, descarta as mais antigas -- o Map
 * itera em ordem de insercao.
 */
const MAXIMO_DE_CHAVES = 20_000;

export function criarLimitador(agora: () => number = Date.now) {
  const contagens = new Map<string, Contagem>();

  function descartarExcesso() {
    const excesso = contagens.size - MAXIMO_DE_CHAVES;
    if (excesso <= 0) return;
    let i = 0;
    for (const chave of contagens.keys()) {
      if (i++ >= excesso) break;
      contagens.delete(chave);
    }
  }

  return function verificar(chave: string, regra: Regra): Resultado {
    const t = agora();
    const atual = contagens.get(chave);

    if (!atual || t - atual.inicio >= regra.janelaMs) {
      // Reinsere para a chave ir para o fim da ordem de descarte.
      contagens.delete(chave);
      contagens.set(chave, { inicio: t, usadas: 1 });
      descartarExcesso();
      return { permitido: true, restantes: regra.maximo - 1 };
    }

    if (atual.usadas >= regra.maximo) {
      const faltaMs = regra.janelaMs - (t - atual.inicio);
      return {
        permitido: false,
        tenteEmSegundos: Math.max(1, Math.ceil(faltaMs / 1000)),
      };
    }

    atual.usadas += 1;
    return { permitido: true, restantes: regra.maximo - atual.usadas };
  };
}

const MINUTO = 60_000;

/**
 * As regras de cada porta. Os numeros partem de um uso humano generoso:
 * quem compara rotas abre, no maximo, algumas por minuto. 30 cobre isso
 * com folga e corta um laco automatizado em segundos.
 */
export const REGRAS = {
  /** Rotas que consultam a Travelpayouts. */
  consultaExterna: { maximo: 30, janelaMs: MINUTO },
  /** Autocomplete: dispara a cada tecla, entao o teto e maior. */
  autocomplete: { maximo: 120, janelaMs: MINUTO },
  /** Escrita no sensor de demanda, por IP. */
  interesse: { maximo: 20, janelaMs: MINUTO },
  /**
   * O mesmo IP conta o mesmo par uma vez a cada 6 horas. E isso que faz
   * o contador medir pessoas interessadas, e nao recarregamentos.
   */
  interessePorPar: { maximo: 1, janelaMs: 6 * 60 * MINUTO },
} as const satisfies Record<string, Regra>;
