import type { Confianca } from "@/lib/dados";
import type { Fonte } from "@/lib/providers/travelpayouts";

/**
 * Selos que dizem de onde o numero veio.
 *
 * Existe porque metade dos dados deste app e estimativa -- os programas
 * brasileiros nao publicam tabela nem expoem API. Mostrar a procedencia
 * do numero e o que separa uma ferramenta honesta de um chute com cara
 * de precisao.
 */

const ESTILO_BASE =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium";

export function SeloDeFonte({
  fonte,
  observacao,
}: {
  fonte: Fonte;
  observacao: string;
}) {
  const real = fonte === "travelpayouts";

  return (
    <span
      title={observacao}
      className={`${ESTILO_BASE} ${
        real
          ? "bg-dinheiro-fundo text-dinheiro"
          : "bg-superficie-2 text-tinta-media"
      }`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {real ? "preço de busca real" : "estimativa"}
    </span>
  );
}

const ROTULO_CONFIANCA: Record<Confianca, string | null> = {
  pesquisado: null, // o caso normal nao precisa de aviso
  interpolado: "valor interpolado",
  parcial: "dado parcial",
  restrito: "acesso restrito",
  indisponivel: "não atende esta rota",
};

export function SeloDeConfianca({ confianca }: { confianca: Confianca }) {
  const rotulo = ROTULO_CONFIANCA[confianca];
  if (!rotulo) return null;

  return (
    <span className={`${ESTILO_BASE} bg-superficie-2 text-tinta-fraca`}>
      {rotulo}
    </span>
  );
}
