import type { StateStorage } from "zustand/middleware";

/**
 * localStorage que nao lanca erro, para os stores persistidos.
 *
 * JSON quebrado no aparelho fazia o persist rejeitar a hidratacao, e a
 * tela ficava em aria-busy para sempre -- tela em branco sem saida.
 * Conteudo ilegivel vira "nada guardado"; o proximo salvamento
 * sobrescreve. Sem localStorage (pre-render no servidor), a referencia
 * abaixo lanca dentro do createJSONStorage, que entao nao hidrata.
 */
export function armazenamentoSeguro(): StateStorage {
  const ls = localStorage;
  return {
    getItem: (nome) => {
      try {
        const bruto = ls.getItem(nome);
        if (bruto === null) return null;
        JSON.parse(bruto);
        return bruto;
      } catch {
        return null;
      }
    },
    setItem: (nome, valor) => {
      try {
        ls.setItem(nome, valor);
      } catch {
        // Cota cheia ou modo privado: a sessao continua, so nao persiste.
      }
    },
    removeItem: (nome) => {
      try {
        ls.removeItem(nome);
      } catch {
        // idem
      }
    },
  };
}

export function novoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
