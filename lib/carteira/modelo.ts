/**
 * A Carteira: saldos que a pessoa informa, e o que da para dizer deles.
 *
 * Tudo aqui e INFORMADO pela pessoa -- nenhum programa brasileiro tem
 * API publica de saldo, e buscar saldo pedindo a senha do programa e
 * um risco de seguranca que a VoeMilo nao corre. Por isso o modelo
 * guarda a data de cada atualizacao: e ela que permite avisar quando o
 * numero envelheceu, em vez de exibi-lo como se fosse de hoje.
 *
 * Puro, sem React e sem armazenamento, para ter teste.
 */

export type ProgramaDaCarteira = {
  id: string;
  nome: string;
  unidade: "milhas" | "pontos";
  /**
   * Preco de referencia do milheiro, em reais: quanto custa adquirir
   * 1.000 unidades num bom momento. E a base do "valor estimado" -- uma
   * estimativa, nao o que alguem pagaria por elas.
   */
  milheiroBRL: number;
  /** Observacao de validade do proprio programa, quando houver. */
  validade?: string;
};

export type Vencimento = {
  id: string;
  quantidade: number;
  /** AAAA-MM-DD */
  data: string;
};

export type SaldoInformado = {
  quantidade: number;
  /** AAAA-MM-DD, quando a pessoa informou ou atualizou. */
  atualizadoEm: string;
  vencimentos: Vencimento[];
};

export type Saldos = Record<string, SaldoInformado>;

/** Depois disso, o saldo pede conferencia. */
export const DIAS_ATE_DESATUALIZAR = 30;
/** Vencimentos dentro desta janela viram aviso. */
export const DIAS_DE_AVISO = 60;

const DIA_MS = 24 * 60 * 60 * 1000;

/** Dias inteiros de `de` ate `ate` (AAAA-MM-DD), em UTC. */
export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / DIA_MS);
}

export function hojeISO(agora: Date = new Date()): string {
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function valorEstimado(quantidade: number, programa: ProgramaDaCarteira): number {
  return Math.round((quantidade / 1000) * programa.milheiroBRL);
}

export function estaDesatualizado(saldo: SaldoInformado, hoje: string): boolean {
  return diasEntre(saldo.atualizadoEm, hoje) > DIAS_ATE_DESATUALIZAR;
}

export type LinhaDaCarteira = {
  programa: ProgramaDaCarteira;
  saldo: SaldoInformado;
  valorBRL: number;
  desatualizado: boolean;
};

/**
 * As linhas da carteira, do programa que mais vale para o que menos
 * vale -- e a ordem em que a pilha de cartoes aparece. Saldo de
 * programa que saiu do catalogo e ignorado, nao quebra a tela.
 */
export function montarCarteira(
  saldos: Saldos,
  catalogo: ProgramaDaCarteira[],
  hoje: string,
): LinhaDaCarteira[] {
  return catalogo
    .filter((p) => saldos[p.id])
    .map((programa) => {
      const saldo = saldos[programa.id];
      return {
        programa,
        saldo,
        valorBRL: valorEstimado(saldo.quantidade, programa),
        desatualizado: estaDesatualizado(saldo, hoje),
      };
    })
    .sort((a, b) => b.valorBRL - a.valorBRL);
}

export function totalEstimado(linhas: LinhaDaCarteira[]): number {
  return linhas.reduce((soma, l) => soma + l.valorBRL, 0);
}

export type AvisoDeVencimento = {
  programa: ProgramaDaCarteira;
  quantidade: number;
  data: string;
  /** 0 = vence hoje. */
  emDias: number;
};

/**
 * O que vence nos proximos DIAS_DE_AVISO dias, do mais proximo para o
 * mais distante. Vencimento que ja passou sai do aviso: nao ha mais o
 * que fazer com ele, e insistir so assusta.
 */
export function vencimentosProximos(
  linhas: LinhaDaCarteira[],
  hoje: string,
): AvisoDeVencimento[] {
  return linhas
    .flatMap((l) =>
      l.saldo.vencimentos.map((v) => ({
        programa: l.programa,
        quantidade: v.quantidade,
        data: v.data,
        emDias: diasEntre(hoje, v.data),
      })),
    )
    .filter((a) => a.emDias >= 0 && a.emDias <= DIAS_DE_AVISO)
    .sort((a, b) => a.emDias - b.emDias);
}

/** "hoje", "amanhã", "em 12 dias" */
export function quandoVence(emDias: number): string {
  if (emDias === 0) return "hoje";
  if (emDias === 1) return "amanhã";
  return `em ${emDias} dias`;
}

/** "hoje", "ontem", "há 20 dias" */
export function haQuanto(data: string, hoje: string): string {
  const d = diasEntre(data, hoje);
  if (d <= 0) return "hoje";
  if (d === 1) return "ontem";
  return `há ${d} dias`;
}
