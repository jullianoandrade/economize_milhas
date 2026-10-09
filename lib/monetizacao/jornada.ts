import type { TipoDeParceiro } from "./parceiros";

/**
 * Em que fase da viagem a pessoa esta.
 *
 * E o que separa este app de um buscador. Um buscador so tem o clique;
 * aqui sabemos a data do voo, entao sabemos o que e util AGORA. Cartao de
 * credito a dez meses da viagem e conselho; cartao a quinze dias e
 * propaganda. eSIM a dez meses nao serve para nada; a quinze dias e
 * exatamente o que falta.
 *
 * O arranjo tambem define a receita, mas a ordem de causa importa: as
 * fases foram desenhadas a partir do que a pessoa precisa, e so depois se
 * observou que coincidem com onde esta o dinheiro. Quando as duas coisas
 * divergirem, ganha a necessidade -- e e por isso que este modulo nao
 * consulta valor de comissao em lugar nenhum.
 */

export type FaseDaJornada = "acumulo" | "decisao" | "preparacao" | "passou";

/** Fronteiras em dias ate o embarque. */
const DECISAO_COMECA_EM = 120;
const PREPARACAO_COMECA_EM = 30;

export function faseDaJornada(diasAteAViagem: number | null): FaseDaJornada {
  // Sem data definida, a pessoa ainda esta sonhando com o destino --
  // que e, na pratica, o inicio do acumulo.
  if (diasAteAViagem === null) return "acumulo";
  if (diasAteAViagem < 0) return "passou";
  if (diasAteAViagem <= PREPARACAO_COMECA_EM) return "preparacao";
  if (diasAteAViagem <= DECISAO_COMECA_EM) return "decisao";
  return "acumulo";
}

export function diasAte(data: Date, hoje: Date): number {
  const diaEmMs = 24 * 60 * 60 * 1000;
  const sóData = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((sóData(data) - sóData(hoje)) / diaEmMs);
}

export const DESCRICAO_DA_FASE: Record<FaseDaJornada, string> = {
  acumulo:
    "Ainda dá tempo de juntar milhas. É agora que a escolha do cartão faz diferença.",
  decisao:
    "Hora de fechar: a janela boa de compra da passagem costuma cair por aqui.",
  preparacao:
    "A viagem está perto. O que falta agora é o que se resolve em dias.",
  passou: "Esta data já passou.",
};

/** O que é útil em cada fase, na ordem em que a pessoa precisa. */
const UTIL_POR_FASE: Record<FaseDaJornada, TipoDeParceiro[]> = {
  acumulo: ["cartao"],
  decisao: ["voo", "hotel"],
  preparacao: ["seguro", "esim", "cambio", "hotel"],
  passou: [],
};

export function tiposUteisNaFase(
  fase: FaseDaJornada,
  contexto: { internacional: boolean },
): TipoDeParceiro[] {
  const tipos = UTIL_POR_FASE[fase];

  // Seguro, chip e câmbio só fazem sentido saindo do país. Oferecer eSIM
  // para quem vai a Recife é ruído, e ruído custa confiança.
  if (contexto.internacional) return tipos;
  return tipos.filter((t) => !["seguro", "esim", "cambio"].includes(t));
}
