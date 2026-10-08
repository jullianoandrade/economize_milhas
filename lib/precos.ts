import "server-only";

import { connection } from "next/server";
import { precosReferencia } from "@/lib/dados";
import type { RotaClassificada } from "@/lib/milhas/regioes";
import {
  precoMaisBarato,
  precosPorMes,
  temToken,
  type ComFonte,
  type PrecoDeMes,
} from "@/lib/providers/travelpayouts";

/**
 * Preco de passagem com degradacao honesta.
 *
 * A regra: tenta a Travelpayouts; se nao houver token, se a API cair ou
 * se ela nao conhecer a rota, cai na tabela curada de data/. O app nunca
 * mostra tela de erro por causa disso -- mas tambem nunca finge que um
 * numero estimado e cotacao. Quem decide o que dizer ao usuario e o campo
 * `fonte`, que acompanha todo retorno.
 */

const SEM_TOKEN =
  "Estimativa da nossa base, nao cotacao. Configure o token da Travelpayouts para ver preco de busca real.";
const SEM_RESPOSTA =
  "Estimativa da nossa base: nao encontramos busca recente para esta rota.";
const DA_API =
  "Menor preco encontrado em buscas recentes. Nao e cotacao em tempo real: confirme antes de comprar.";

/** Preco tipico de um trecho, pela faixa de regiao da rota. */
export function precoEstimadoPorRegiao(rota: RotaClassificada): number {
  return precosReferencia.porRegiaoBRL[rota.faixa] ?? 0;
}

export async function precoDoTrecho(
  rota: RotaClassificada,
): Promise<ComFonte<number>> {
  const estimado = precoEstimadoPorRegiao(rota);

  if (!temToken()) {
    return { dados: estimado, fonte: "estimativa", observacao: SEM_TOKEN };
  }

  const real = await precoMaisBarato(rota.origem.iata, rota.destino.iata);
  if (!real || real.precoBRL <= 0) {
    return { dados: estimado, fonte: "estimativa", observacao: SEM_RESPOSTA };
  }

  return { dados: real.precoBRL, fonte: "travelpayouts", observacao: DA_API };
}

/* ------------------------------------------------------------------ */

/**
 * Curva de preco por mes. Sem dado real, usa o indice de sazonalidade
 * brasileiro aplicado ao preco de referencia da regiao -- o formato da
 * curva ja e util mesmo quando os valores absolutos sao aproximados,
 * porque a pergunta que ela responde ("que mes e mais barato?") depende
 * das proporcoes, nao dos numeros exatos.
 */
export async function curvaMensal(
  rota: RotaClassificada,
  indicePorMes: Record<string, number>,
): Promise<ComFonte<PrecoDeMes[]>> {
  const base = precoEstimadoPorRegiao(rota);
  const estimada: PrecoDeMes[] = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    precoBRL: Math.round(base * (indicePorMes[String(i + 1)] ?? 1)),
  }));

  if (!temToken()) {
    return { dados: estimada, fonte: "estimativa", observacao: SEM_TOKEN };
  }

  // A consulta do calendario depende do mes corrente, e data do relogio e
  // valor instavel: sem declarar que isto roda no momento da requisicao, o
  // Next recusa pre-renderizar a rota. A curva de preco e dado vivo mesmo,
  // entao a fronteira esta no lugar certo -- a casca da pagina continua
  // estatica e so este trecho espera.
  await connection();

  const real = await precosPorMes(rota.origem.iata, rota.destino.iata);
  // Menos de 6 meses cobertos nao forma curva: metade do ano em branco
  // enganaria mais do que a estimativa completa.
  if (!real || real.length < 6) {
    return { dados: estimada, fonte: "estimativa", observacao: SEM_RESPOSTA };
  }

  return { dados: real, fonte: "travelpayouts", observacao: DA_API };
}
