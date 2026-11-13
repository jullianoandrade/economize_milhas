import { NextResponse } from "next/server";
import { escritor } from "@/lib/supabase";
import { precosObservados, temToken } from "@/lib/providers/travelpayouts";

/**
 * Coleta diaria de precos.
 *
 * Roda uma vez por dia (limite do cron gratuito da Vercel) e grava cada
 * observacao de preco com a data em que foi encontrada. Em algumas
 * semanas isso vira a curva real de "preco x dias antes do voo" por
 * rota, que e o unico dado que este projeto tem e ninguem vende pronto.
 *
 * Efeito colateral util: o job diario tambem impede que o projeto
 * Supabase do plano gratuito seja pausado por inatividade apos 7 dias.
 */

// Sem "dynamic": a leitura do header de autorizacao ja torna a rota
// dinamica, e declarar isso explicitamente conflita com cacheComponents.
export const maxDuration = 60;

/**
 * Teto por execucao.
 *
 * Era 25, por receio do rate limit da Travelpayouts. Medido: a consulta
 * leva ~360 ms por rota, entao 25 rotas gastavam ~9 s de uma janela de
 * 60 s -- o orcamento estava limitado por um palpite, nao pelo limite.
 *
 * O que protege de verdade e o PRAZO abaixo, que mede o relogio em vez
 * de supor: se a fonte ficar lenta ou a lista crescer, a execucao para
 * sozinha e relata ate onde foi, em vez de ser morta no meio de uma
 * gravacao.
 */
const MAXIMO_DE_ROTAS = 60;

/**
 * Quando parar de coletar, em ms desde o inicio. Folga de 15 s sobre o
 * maxDuration para a ultima gravacao terminar e a resposta sair.
 */
const PRAZO_MS = 45_000;

/** Quantas visitas uma rota precisa somar para entrar na coleta. */
const LIMIAR_DE_PROMOCAO = 5;

/** Teto de rotas promovidas por execucao, para a lista crescer devagar. */
const PROMOCOES_POR_EXECUCAO = 10;

function autorizado(requisicao: Request): boolean {
  const segredo = process.env.CRON_SECRET?.trim();

  // Sem segredo configurado o endpoint fica fechado, nunca aberto: um
  // cron desprotegido pode ser disparado por qualquer um na internet,
  // queimando o limite da API e enchendo o banco de lixo.
  if (!segredo) return false;

  const cabecalho = requisicao.headers.get("authorization");
  return cabecalho === `Bearer ${segredo}`;
}

export async function GET(requisicao: Request) {
  if (!autorizado(requisicao)) {
    return NextResponse.json({ erro: "nao autorizado" }, { status: 401 });
  }

  const banco = escritor();
  if (!banco) {
    return NextResponse.json(
      { erro: "Supabase nao configurado" },
      { status: 503 },
    );
  }
  if (!temToken()) {
    return NextResponse.json(
      { erro: "token da Travelpayouts nao configurado" },
      { status: 503 },
    );
  }

  const comecou = Date.now();

  // Promover ANTES de ler a lista: uma rota que acabou de passar do
  // limiar ja e coletada nesta mesma execucao, em vez de esperar mais
  // um dia. Falha aqui nao interrompe a coleta -- promover e melhoria,
  // coletar e a obrigacao.
  const promocao = await banco.rpc("promover_rotas_procuradas", {
    p_limiar: LIMIAR_DE_PROMOCAO,
    p_maximo: PROMOCOES_POR_EXECUCAO,
  });

  const promovidas: string[] = Array.isArray(promocao.data)
    ? promocao.data.map(
        (r: { origem: string; destino: string }) => `${r.origem}-${r.destino}`,
      )
    : [];

  const { data: rotas, error: erroDeLeitura } = await banco
    .from("rotas_monitoradas")
    .select("origem, destino")
    .eq("ativa", true)
    .order("prioridade", { ascending: true })
    .limit(MAXIMO_DE_ROTAS);

  if (erroDeLeitura) {
    return NextResponse.json(
      { erro: `falha ao ler rotas: ${erroDeLeitura.message}` },
      { status: 500 },
    );
  }

  const relatorio = {
    rotas: rotas?.length ?? 0,
    promovidas,
    coletadas: 0,
    observacoes: 0,
    gravadas: 0,
    semDados: [] as string[],
    falhas: [] as string[],
    /** Rotas que ficaram de fora porque o prazo acabou. */
    adiadas: [] as string[],
    duracaoMs: 0,
  };

  if (promocao.error) {
    relatorio.falhas.push(`promocao: ${promocao.error.message}`);
  }

  for (const rota of rotas ?? []) {
    const trecho = `${rota.origem}-${rota.destino}`;

    // O prazo vale por rota, nao por execucao inteira: parar antes de
    // comecar a proxima deixa o relatorio honesto sobre o que faltou,
    // em vez de a funcao ser morta no meio de uma gravacao.
    if (Date.now() - comecou > PRAZO_MS) {
      relatorio.adiadas.push(trecho);
      continue;
    }

    relatorio.coletadas++;

    const observacoes = await precosObservados(rota.origem, rota.destino);
    if (!observacoes || observacoes.length === 0) {
      relatorio.semDados.push(trecho);
      continue;
    }

    relatorio.observacoes += observacoes.length;

    const linhas = observacoes.map((o) => ({
      origem: rota.origem,
      destino: rota.destino,
      partida_em: o.partidaEm.slice(0, 10),
      encontrado_em: o.encontradoEm,
      valor_brl: o.precoBRL,
      paradas: o.paradas,
      antecedencia_dias: o.antecedenciaDias,
    }));

    // ignoreDuplicates: o cache da Travelpayouts repete ofertas entre
    // execucoes. Sem isso, rodar duas vezes no mesmo dia dobraria o peso
    // daquelas observacoes e enviesaria a curva de antecedencia.
    const { error, count } = await banco
      .from("precos_snapshot")
      .upsert(linhas, {
        onConflict:
          "origem,destino,partida_em,encontrado_em,valor_brl,paradas",
        ignoreDuplicates: true,
        count: "exact",
      });

    if (error) relatorio.falhas.push(`${trecho}: ${error.message}`);
    else relatorio.gravadas += count ?? 0;
  }

  relatorio.duracaoMs = Date.now() - comecou;

  return NextResponse.json({
    ok: relatorio.falhas.length === 0,
    executadoEm: new Date().toISOString(),
    ...relatorio,
  });
}
