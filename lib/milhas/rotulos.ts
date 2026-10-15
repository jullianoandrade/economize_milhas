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
  resgatar: "boa hora de usar milhas",
  guardar: "compensa, mas rende pouco — guarde as milhas",
  pagar: "melhor pagar em dinheiro",
};

/** Classes de cor por estado, para os tres lugares concordarem. */
export const COR_DO_ROTULO: Record<RotuloDeVeredito, string> = {
  resgatar: "text-milhas",
  guardar: "text-tinta-fraca",
  pagar: "text-dinheiro",
};
