/**
 * O que o Milo diz quando a pessoa toca nele, no Inicio.
 *
 * O Milo e guia, nao enfeite: cada dica sai dos dados DELA (carteira,
 * viagens, passagens em baixa da cidade dela) e termina numa acao. A
 * ordem e de urgencia -- o que custa dinheiro se for ignorado vem antes
 * do que e so oportunidade. Sem dado, ele nao inventa: cai na dica de
 * explorar.
 *
 * Voz: primeira pessoa, calma, de adulto para adulto. Uma frase, no
 * maximo duas. Nada de "bora", nada de exclamacao em serie.
 *
 * Puro, para ter teste: tests/dicas-do-milo.test.ts.
 */

import type { RotuloDeVeredito } from "@/lib/milhas/rotulos";

export type Dica = {
  id: string;
  texto: string;
  /** Trecho do texto em destaque (um numero ou um lugar). */
  destaque?: string;
  acao: { rotulo: string; href: string };
};

export type ContextoDasDicas = {
  /** Aviso de milhas vencendo, o mais urgente. */
  vencimento?: { quantidade: string; unidade: string; programa: string; quando: string } | null;
  /** Viagem reservada mais proxima. */
  proximaViagem?: { cidade: string; emDias: number; id: string } | null;
  /** Passagens em baixa saindo da cidade da pessoa, ja com href e nome. */
  ofertas?: Array<{ lugar: string; preco: string; descontoPct: number; veredito: RotuloDeVeredito; href: string }>;
  /** Carteira: null = vazia. */
  carteira?: { valor: string } | null;
};

function emQuantosDias(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `em ${dias} dias`;
}

export function dicasDoMilo(c: ContextoDasDicas): Dica[] {
  const dicas: Dica[] = [];

  if (c.vencimento) {
    const v = c.vencimento;
    dicas.push({
      id: "vencimento",
      texto: `${v.quantidade} ${v.unidade} ${v.programa} vencem ${v.quando}. Dá tempo de usar ou transferir.`,
      destaque: `${v.quantidade} ${v.unidade} ${v.programa}`,
      acao: { rotulo: "Ver na carteira", href: "/carteira" },
    });
  }

  if (c.proximaViagem) {
    const p = c.proximaViagem;
    dicas.push({
      id: "viagem",
      texto: `${p.cidade} ${emQuantosDias(p.emDias)}. Já tem onde ficar?`,
      destaque: p.cidade,
      acao: { rotulo: "Preparar a viagem", href: `/conta/viagens#viagem-${p.id}` },
    });
  }

  const ofertas = c.ofertas ?? [];
  const resgate = ofertas.find((o) => o.veredito === "resgatar");
  if (resgate) {
    dicas.push({
      id: `resgate-${resgate.href}`,
      texto: `${resgate.lugar} está ${resgate.descontoPct}% abaixo do normal, e lá suas milhas rendem bem.`,
      destaque: resgate.lugar,
      acao: { rotulo: "Ver a passagem", href: resgate.href },
    });
  }
  const barata = ofertas.find((o) => o !== resgate);
  if (barata) {
    dicas.push({
      id: `barata-${barata.href}`,
      texto: `Tem passagem para ${barata.lugar} por ${barata.preco}, ${barata.descontoPct}% abaixo do normal.`,
      destaque: barata.preco,
      acao: { rotulo: "Ver a passagem", href: barata.href },
    });
  }

  if (c.carteira === null) {
    dicas.push({
      id: "carteira-vazia",
      texto: "Pontos do cartão valem dinheiro. Me conta quais programas você tem e eu calculo quanto.",
      acao: { rotulo: "Juntar meus programas", href: "/carteira" },
    });
  } else if (c.carteira) {
    dicas.push({
      id: "carteira",
      texto: `Seus pontos valem cerca de ${c.carteira.valor}. Quer ver onde eles rendem mais?`,
      destaque: c.carteira.valor,
      acao: { rotulo: "Ver oportunidades", href: "/oportunidades" },
    });
  }

  dicas.push({
    id: "explorar",
    texto: "Me diz um destino e eu comparo, na hora, milhas com dinheiro.",
    acao: { rotulo: "Explorar destinos", href: "/explorar" },
  });

  return dicas;
}
