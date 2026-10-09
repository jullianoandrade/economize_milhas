import { z } from "zod";

/**
 * Esquemas da base curada em data/.
 *
 * Todo dado de milhas no Brasil e estimativa: os programas nao publicam
 * tabela fixa nem expoem API. Por isso cada numero carrega o grau de
 * confianca da fonte, e a interface mostra isso ao usuario em vez de
 * fingir uma precisao que o dado nao tem.
 */

export const Confianca = z.enum([
  "pesquisado", // numero publicado por fonte identificada
  "interpolado", // derivado entre dois pontos conhecidos
  "parcial", // fonte conhecida, mas cobre so parte dos casos
  "restrito", // existe, mas com condicao que limita o acesso
  "indisponivel", // o programa nao atende essa rota
]);
export type Confianca = z.infer<typeof Confianca>;

const dataISO = z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "use AAAA-MM-DD");

export const EsquemaProgramas = z.object({
  atualizadoEm: dataISO,
  observacao: z.string().optional(),
  programas: z
    .array(
      z.object({
        id: z.string(),
        nome: z.string(),
        companhia: z.string(),
        unidade: z.string(),
        site: z.url(),
        validadeMeses: z.number().int().positive(),
        validadeObservacao: z.string(),
        pontoForte: z.string(),
        pontoFraco: z.string(),
      }),
    )
    .min(1),
});

const Faixa = z.object({
  min: z.number().nonnegative(),
  tipico: z.number().nonnegative(),
  max: z.number().nonnegative(),
  confianca: Confianca,
});

export const EsquemaTabelasResgate = z.object({
  atualizadoEm: dataISO,
  explicacao: z.string(),
  explicacaoPrecificacaoDinamica: z.string(),
  regioes: z
    .array(
      z.object({
        id: z.string(),
        rotulo: z.string(),
        ateKm: z.number().positive(),
      }),
    )
    .min(1),
  taxasEmbarqueBRL: z.record(z.string(), z.union([z.number(), z.string()])),
  tabelas: z.record(
    z.string(),
    z.object({
      multiplicadorExecutiva: z.number().positive(),
      milhasPorReal: z.number().positive(),
      economica: z.record(z.string(), Faixa),
    }),
  ),
});

export const EsquemaCpm = z.object({
  atualizadoEm: dataISO,
  explicacao: z.string(),
  fonte: z.string(),
  programas: z.record(
    z.string(),
    z.object({
      alvoBRL: z.number().positive(),
      mercadoMinBRL: z.number().positive(),
      mercadoMaxBRL: z.number().positive(),
    }),
  ),
  compraDiretaBRL: z.object({
    explicacao: z.string(),
    faixaMin: z.number().positive(),
    faixaMax: z.number().positive(),
  }),
  coalizao: z.object({
    explicacao: z.string(),
    fonte: z.string(),
    livelo: z.object({
      alvoBRL: z.number().positive(),
      baseBRL: z.number().positive(),
    }),
    esfera: z.object({
      alvoBRL: z.number().positive(),
      baseBRL: z.number().positive(),
    }),
  }),
});

export const EsquemaClubes = z.object({
  atualizadoEm: dataISO,
  explicacao: z.string(),
  clubes: z.array(
    z.object({
      id: z.string(),
      programa: z.string(),
      nome: z.string(),
      fonte: z.string(),
      confianca: Confianca,
      beneficios: z.array(z.string()),
      planos: z
        .array(
          z.object({
            id: z.string(),
            milhasMes: z.number().int().positive(),
            mensalidadeBRL: z.number().positive(),
          }),
        )
        .min(1),
    }),
  ),
});

export const EsquemaCartoes = z.object({
  atualizadoEm: dataISO,
  cotacaoDolarReferenciaBRL: z.number().positive(),
  explicacao: z.string(),
  cartoes: z.array(
    z.object({
      id: z.string(),
      nome: z.string(),
      emissor: z.string(),
      bandeira: z.string(),
      pontosPorDolarNacional: z.number().positive(),
      pontosPorDolarInternacional: z.number().positive(),
      anuidadeBRL: z.number().nonnegative().nullable(),
      isencaoGastoMensalBRL: z.number().positive().nullable(),
      programaDestino: z.string(),
      pontosExpiram: z.boolean(),
      confianca: Confianca,
      observacao: z.string(),
    }),
  ),
});

export const EsquemaTransferencias = z.object({
  atualizadoEm: dataISO,
  explicacao: z.string(),
  origens: z.array(
    z.object({
      id: z.string(),
      nome: z.string(),
      tipo: z.string(),
      observacao: z.string(),
    }),
  ),
  paridades: z.array(
    z.object({
      origem: z.string(),
      destino: z.string(),
      pontosOrigem: z.number().positive(),
      milhasDestino: z.number().positive(),
      minimoPontos: z.number().nonnegative(),
      confianca: Confianca,
      observacao: z.string().optional(),
    }),
  ),
  padraoHistorico: z.array(
    z.object({
      destino: z.string(),
      bonusMedianoPct: z.number().nonnegative(),
      bonusMaximoObservadoPct: z.number().nonnegative(),
      frequenciaPorAno: z.number().positive(),
      quinzenaTipica: z.union([z.literal(1), z.literal(2)]),
      observacao: z.string(),
    }),
  ),
  fontes: z.array(z.string()),
});

export const EsquemaHeuristicasTempo = z.object({
  atualizadoEm: dataISO,
  explicacao: z.string(),
  janelaDeCompra: z.array(
    z.object({
      tipo: z.enum(["domestico", "internacional"]),
      diasMin: z.number().int().positive(),
      diasOtimo: z.number().int().positive(),
      diasMax: z.number().int().positive(),
      economiaTipicaPct: z.number().positive(),
      fonte: z.string(),
    }),
  ),
  diaDaSemanaParaComprar: z.object({
    melhores: z.array(z.string()),
    economiaTipicaPct: z.number(),
    observacao: z.string(),
  }),
  sazonalidadeBrasil: z.object({
    explicacao: z.string(),
    indicePorMes: z.record(z.string(), z.number().positive()),
    altaTemporada: z.array(z.number().int().min(1).max(12)),
    baixaTemporada: z.array(z.number().int().min(1).max(12)),
    fonte: z.string(),
  }),
  inversaoMilhas: z.object({ explicacao: z.string() }),
});

export const EsquemaGlossario = z.object({
  atualizadoEm: dataISO,
  termos: z
    .array(
      z.object({
        id: z.string(),
        termo: z.string(),
        resumo: z.string(),
        explicacao: z.string(),
        exemplo: z.string().optional(),
      }),
    )
    .min(1),
  quandoNaoUsarMilhas: z
    .array(z.object({ titulo: z.string(), explicacao: z.string() }))
    .min(1),
});

export const EsquemaAeroportos = z.object({
  atualizadoEm: dataISO,
  fonte: z.string(),
  explicacao: z.string(),
  aeroportos: z
    .array(
      z.object({
        iata: z.string().length(3),
        cidade: z.string(),
        aliases: z.array(z.string()),
        cidadeIata: z.string(),
        pais: z.string().length(2),
        regiao: z.enum([
          "brasil",
          "america-sul",
          "america-norte-central",
          "europa",
          "resto-mundo",
        ]),
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
        nome: z.string(),
      }),
    )
    .min(1),
});

export type RegiaoGeografica = z.infer<
  typeof EsquemaAeroportos
>["aeroportos"][number]["regiao"];

export const EsquemaPrecosReferencia = z.object({
  atualizadoEm: dataISO,
  explicacao: z.string(),
  procedencia: z.string(),
  porRegiaoBRL: z.record(z.string(), z.number().positive()),
  observacaoPorRegiao: z.record(z.string(), z.string()).optional(),
});
