import type { Origem } from "@/components/ui/SeloDeOrigem";
import { MESES_CURTOS } from "@/lib/format";

/**
 * A passagem concreta que a tela aponta: um preco, um dia de ida e
 * quando esse preco foi visto. E o que transforma "a rota anda custando
 * X" em "esta passagem, neste dia, custa X -- va ver".
 *
 * Serializavel de proposito: atravessa a fronteira servidor -> cliente
 * (IlhaDoVeredito) como dado.
 */
export type PassagemVista = {
  precoBRL: number;
  /** AAAA-MM-DD, de hoje em diante. */
  ida: string;
  /**
   * true: a data veio da pessoa (?data=) e o preco e o daquele dia.
   * false: nenhuma data escolhida; e o dia da passagem mais barata da rota.
   */
  daDataEscolhida: boolean;
  /** Dias desde que o preco foi visto; null quando a fonte nao diz. */
  vistoHaDias: number | null;
};

/** "2027-03-31" -> "31/mar", sem new Date (nada de fuso no meio). */
export function diaEMes(iso: string): string {
  const [, mes, dia] = iso.split("-");
  const m = MESES_CURTOS[Number(mes) - 1];
  return m && dia ? `${Number(dia)}/${m}` : iso;
}

/**
 * Quao fresco e o preco, no vocabulario dos selos de origem.
 *
 * O preco vem do cache de buscas recentes, nao de cotacao ao vivo -- a
 * tela nunca pode sugerir que esta garantido. Ate uma semana e "real",
 * com a idade dita; depois disso, "desatualizado".
 */
export function frescorDoPreco(vistoHaDias: number | null): {
  origem: Origem;
  texto: string;
} {
  if (vistoHaDias === null) {
    return { origem: "real", texto: "preço visto recentemente" };
  }
  const texto =
    vistoHaDias <= 0
      ? "preço visto hoje"
      : vistoHaDias === 1
        ? "preço visto ontem"
        : `preço visto há ${vistoHaDias} dias`;
  return { origem: vistoHaDias > 7 ? "desatualizado" : "real", texto };
}
