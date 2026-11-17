import type { Confianca } from "@/lib/dados";
import type { Fonte } from "@/lib/providers/travelpayouts";
import { SeloDeOrigem } from "@/components/ui/SeloDeOrigem";

/**
 * Selos que dizem de onde o numero veio.
 *
 * Existe porque metade dos dados deste app e estimativa -- os programas
 * brasileiros nao publicam tabela nem expoem API. Mostrar a procedencia
 * do numero e o que separa uma ferramenta honesta de um chute com cara
 * de precisao.
 */

export function SeloDeFonte({
  fonte,
  observacao,
}: {
  fonte: Fonte;
  observacao: string;
}) {
  return fonte === "travelpayouts" ? (
    <SeloDeOrigem origem="real" detalhe={observacao}>
      busca real de hoje
    </SeloDeOrigem>
  ) : (
    <SeloDeOrigem origem="estimado" detalhe={observacao}>
      estimativa
    </SeloDeOrigem>
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

  return <SeloDeOrigem origem="estimado">{rotulo}</SeloDeOrigem>;
}
