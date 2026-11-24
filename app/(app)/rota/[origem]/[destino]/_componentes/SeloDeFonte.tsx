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
      busca real recente
    </SeloDeOrigem>
  ) : (
    <SeloDeOrigem origem="estimado" detalhe={observacao}>
      estimativa
    </SeloDeOrigem>
  );
}

/**
 * O grau de confianca da tabela nao vira um segundo selo: a tela so usa
 * os quatro termos de origem (real, estimativa, informado,
 * desatualizado). "Interpolado", "parcial" e afins sao detalhe de COMO a
 * estimativa foi feita, e moram na explicacao do selo.
 */
const NOTA_CONFIANCA: Record<Confianca, string | null> = {
  pesquisado: null, // o caso normal nao precisa de aviso
  interpolado:
    "Este trecho não tem valor pesquisado: o número foi interpolado entre trechos vizinhos da tabela.",
  parcial: "A tabela deste programa para este trecho só foi pesquisada em parte.",
  restrito: "O programa restringe o acesso à tabela; o número é menos firme.",
  indisponivel: "O programa não atende esta rota.",
};

const BASE_DAS_MILHAS =
  "Os programas usam precificação dinâmica e não publicam tabela fixa. Confirme no site antes de resgatar.";

/** O selo das milhas: sempre estimativa, com o grau de confianca no detalhe. */
export function SeloDeMilhas({
  confianca,
  rotulo = "estimativa, confirme antes",
}: {
  confianca: Confianca;
  rotulo?: string;
}) {
  const nota = NOTA_CONFIANCA[confianca];
  return (
    <SeloDeOrigem
      origem="estimado"
      detalhe={nota ? `${BASE_DAS_MILHAS} ${nota}` : BASE_DAS_MILHAS}
    >
      {rotulo}
    </SeloDeOrigem>
  );
}
