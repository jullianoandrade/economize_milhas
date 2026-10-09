import "server-only";

import type { Aeroporto } from "@/lib/dados";
import { precoMaisBarato, temToken } from "@/lib/providers/travelpayouts";
import { aeroportosAlternativos } from "@/lib/tempo/flexibilidade";

/**
 * Busca o preco de ida a partir dos aeroportos vizinhos da origem.
 *
 * Limitado a poucas alternativas de proposito: cada uma e uma chamada
 * externa, e a pagina nao pode ficar refem do numero de aeroportos perto
 * de quem mora numa capital grande. As respostas ficam em cache por seis
 * horas no proprio provider.
 */

const MAXIMO_DE_ALTERNATIVAS = 3;

export async function precosDasAlternativas(
  origem: Aeroporto,
  destinoIata: string,
): Promise<Array<{ aeroporto: Aeroporto; precoBRL: number | null }>> {
  if (!temToken()) return [];

  const candidatos = aeroportosAlternativos(origem)
    .filter((a) => a.iata !== destinoIata)
    .slice(0, MAXIMO_DE_ALTERNATIVAS);

  return Promise.all(
    candidatos.map(async (aeroporto) => {
      const preco = await precoMaisBarato(aeroporto.iata, destinoIata);
      return { aeroporto, precoBRL: preco?.precoBRL ?? null };
    }),
  );
}
