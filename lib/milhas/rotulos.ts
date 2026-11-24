/**
 * As palavras do veredito, num lugar so.
 *
 * Existe por causa de um defeito real: a tela de promocoes calculava o
 * veredito, jogava fora a ressalva e escrevia "vale resgatar" em cima de
 * um trecho que o proprio motor classificava como pouco rendoso. Duas
 * telas diziam coisas opostas sobre o mesmo caso -- e num app cuja
 * unica promessa e a honestidade do numero, isso e pior do que um erro
 * de conta.
 *
 * O modulo nao importa NADA. E proposital: ele e lido tanto pelo motor,
 * no servidor, quanto pelos componentes de cliente. Se ele dependesse de
 * lib/dados, a base de aeroportos inteira (mais de 60 KB) viajaria ate o
 * navegador so para a interface decidir tres palavras.
 */

export type RotuloDeVeredito = "resgatar" | "guardar" | "pagar";

/**
 * Tres estados, e nao dois.
 *
 * O terceiro e o que faltava: resgatar compensa na conta, mas economiza
 * tao pouco que as mesmas milhas renderiam muito mais em outro lugar.
 * Chamar isso de "vale resgatar" e tecnicamente verdade e praticamente
 * um mau conselho.
 */
export function rotuloDoVeredito(
  recomendacao: "milhas" | "dinheiro",
  temRessalva: boolean,
): RotuloDeVeredito {
  if (recomendacao === "dinheiro") return "pagar";
  return temRessalva ? "guardar" : "resgatar";
}

/** Versao curta, para selo de cartao. */
export const TEXTO_CURTO: Record<RotuloDeVeredito, string> = {
  resgatar: "vale resgatar",
  guardar: "rende pouco",
  pagar: "vale pagar",
};

/** Versao de uma linha, para quando ha espaco para explicar. */
export const TEXTO_LONGO: Record<RotuloDeVeredito, string> = {
  resgatar: "Boa hora de usar milhas",
  guardar: "Compensa, mas rende pouco: guarde as milhas",
  pagar: "Melhor pagar em dinheiro",
};

/** Classes de cor por estado, para os tres lugares concordarem. */
export const COR_DO_ROTULO: Record<RotuloDeVeredito, string> = {
  resgatar: "text-milhas",
  guardar: "text-tinta-fraca",
  pagar: "text-dinheiro",
};

/**
 * Ordem de destaque numa lista de passagens: primeiro o que vale
 * resgatar, depois o que vale pagar, por ultimo o que rende pouco.
 *
 * Existe por causa de outro defeito real: o Inicio pegava as tres
 * primeiras por desconto, sob o titulo "Vale a pena agora", e as tres
 * diziam "rende pouco" -- o titulo prometia o contrario do conteudo.
 */
const PRIORIDADE: Record<RotuloDeVeredito, number> = {
  resgatar: 0,
  pagar: 1,
  guardar: 2,
};

/** Ordena pelo veredito sem desfazer a ordem original dentro de cada um. */
export function ordenarPorVeredito<T extends { veredito: RotuloDeVeredito }>(lista: T[]): T[] {
  return lista
    .map((item, i) => ({ item, i }))
    .sort((a, b) => PRIORIDADE[a.item.veredito] - PRIORIDADE[b.item.veredito] || a.i - b.i)
    .map(({ item }) => item);
}
