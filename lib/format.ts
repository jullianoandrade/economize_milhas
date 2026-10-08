/** Formatacao em pt-BR, centralizada para a interface ficar consistente. */

export const reais = (valor: number, casas = 0) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

/** Valores por milheiro merecem centavos: a diferenca entre R$ 16 e R$ 16,67 importa. */
export const reaisExatos = (valor: number) => reais(valor, 2);

export const milhas = (valor: number) => valor.toLocaleString("pt-BR");

export const porcentagem = (valor: number) =>
  `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;

export const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
] as const;

export const mesCurto = (mes: number) => MESES_CURTOS[mes - 1] ?? "";
