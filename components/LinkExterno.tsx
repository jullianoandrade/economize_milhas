import type { ReactNode } from "react";

/**
 * O UNICO emissor de ancora externa do projeto.
 *
 * tests/arquitetura.test.ts garante isso: nenhum outro arquivo pode usar
 * target="_blank" ou um rel com "sponsored". Centralizar aqui e o que
 * torna as regras de divulgacao e de seguranca (rel correto por tipo)
 * verificaveis por maquina, em vez de depender de todo componente novo
 * lembrar de repetir os tres atributos certos.
 *
 * `noreferrer` nunca entra no rel de link patrocinado: ele remove o
 * header Referer, e parte das redes de afiliados usa esse header na
 * atribuicao da comissao. `sponsored nofollow noopener` e o que o Google
 * pede para link pago sem jogar fora o rastreio da rede.
 */

type TipoDeLink = "patrocinado" | "utilidade";

const REL: Record<TipoDeLink, string> = {
  patrocinado: "sponsored nofollow noopener",
  utilidade: "noopener",
};

const ESTILO = {
  primario:
    "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-marca px-5 text-sm font-semibold text-marca-contraste transition-colors hover:bg-marca-forte",
  secundario:
    "inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-marca underline underline-offset-4",
} as const;

export function LinkExterno({
  href,
  tipo,
  variante = "primario",
  className = "",
  children,
}: {
  href: string;
  tipo: TipoDeLink;
  variante?: keyof typeof ESTILO;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel={REL[tipo]}
      className={`${ESTILO[variante]} ${className}`}
    >
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}
