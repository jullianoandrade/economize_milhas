"use client";

import type { ReactNode } from "react";
import { LinkExterno, type TipoDeLink } from "@/components/dominio/LinkExterno";
import type { SaidaParaPassagem } from "@/lib/viagens/modelo";
import { usarViagens } from "@/store/viagens";

/**
 * Todo link que leva a pessoa ate a passagem -- a busca em dinheiro ou o
 * site do programa para resgatar -- passa por aqui.
 *
 * Alem de abrir a aba (LinkExterno cuida de rel, nova aba e do aviso
 * para leitor de tela), registra a saida em Minhas viagens: a viagem
 * vira "em vista" com rota, data, preco visto e forma de pagamento. E o
 * fio que deixa o app perguntar depois "reservou?" em vez de esquecer.
 *
 * O registro acontece no clique, antes de a aba nova abrir, e nunca
 * impede a navegacao: armazenamento bloqueado so perde o registro.
 */
export function LinkParaPassagem({
  href,
  tipo,
  variante = "primario",
  className,
  saida,
  children,
}: {
  href: string;
  tipo: TipoDeLink;
  variante?: "primario" | "secundario";
  className?: string;
  saida: SaidaParaPassagem;
  children: ReactNode;
}) {
  return (
    <LinkExterno
      href={href}
      tipo={tipo}
      variante={variante}
      className={className}
      onClick={() => {
        try {
          usarViagens.getState().registrarSaida(saida);
        } catch {
          // Sem armazenamento, a pessoa ainda chega a passagem.
        }
      }}
    >
      {children}
    </LinkExterno>
  );
}
