import "server-only";

import { leitor } from "@/lib/supabase";
import rotasDestaque from "@/data/rotas-destaque.json";

/**
 * As rotas que o projeto acompanha de verdade.
 *
 * Duas fontes, e a diferenca entre elas e proposital:
 *
 *   data/rotas-destaque.json  semente, versionada, lida em tempo de
 *                             BUILD por generateStaticParams
 *   rotas_monitoradas (banco) a lista viva, que cresce sozinha quando
 *                             uma rota procurada passa do limiar
 *
 * O build nao pode depender do banco -- o README promete que o app sobe
 * com .env.local em branco -- entao a pre-renderizacao continua saindo
 * do arquivo. Ja o sitemap e servido em tempo de execucao e pode ler a
 * lista viva: e isso que faz uma rota promovida por demanda aparecer
 * para o buscador sem precisar de deploy.
 */

export type RotaMonitorada = { origem: string; destino: string };

const SEMENTE: RotaMonitorada[] = rotasDestaque.rotas.map(
  ([origem, destino]) => ({ origem, destino }),
);

export function rotasSemente(): RotaMonitorada[] {
  return SEMENTE;
}

export async function rotasMonitoradas(): Promise<RotaMonitorada[]> {
  const banco = leitor();
  if (!banco) return SEMENTE;

  const { data, error } = await banco
    .from("rotas_monitoradas")
    .select("origem, destino")
    .eq("ativa", true)
    .order("prioridade", { ascending: true });

  if (error || !Array.isArray(data) || data.length === 0) return SEMENTE;

  return data
    .map((r) => ({
      origem: String(r.origem).trim().toUpperCase(),
      destino: String(r.destino).trim().toUpperCase(),
    }))
    .filter((r) => r.origem.length === 3 && r.destino.length === 3);
}
