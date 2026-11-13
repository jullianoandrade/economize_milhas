import { NextResponse } from "next/server";
import { leitor } from "@/lib/supabase";
import { avaliarInteresse } from "@/lib/interesse";

/**
 * Registra que alguem olhou uma rota.
 *
 * E o sensor de demanda que transforma uso em cobertura: o cron promove
 * as mais procuradas para rotas_monitoradas e passa a coletar preco
 * delas. Sem isto, a lista de 20 rotas escolhidas a mao em outubro
 * jamais mudaria -- e agora sao 13,5 milhoes de pares pesquisaveis.
 *
 * POST, e nao GET, porque muda estado. Pre-busca de navegador e
 * rastreador seguem GET; mantendo a escrita fora do verbo seguro, nada
 * disso infla o contador por acidente.
 *
 * NAO guarda nada pessoal -- nem IP, nem sessao, nem horario
 * individual. Sobe um contador por par de aeroportos. Ver a migration
 * 20261113_0001_interesse_em_rota.sql.
 *
 * Quem decide o que entra e lib/interesse.ts, que e puro e testado;
 * aqui fica so a casca HTTP.
 */

export async function POST(requisicao: Request) {
  let corpo: { origem?: unknown; destino?: unknown };
  try {
    corpo = (await requisicao.json()) as typeof corpo;
  } catch {
    return NextResponse.json({ erro: "corpo invalido" }, { status: 400 });
  }

  const decisao = avaliarInteresse(
    String(corpo.origem ?? ""),
    String(corpo.destino ?? ""),
  );

  if (!decisao.registrar) {
    // 400 so para rota que nao existe -- isso e erro de quem chamou.
    // "Fora do modelo" e decisao nossa, nao problema do visitante, e
    // responder erro faria a tela achar que algo quebrou.
    const status = decisao.motivo === "rota-desconhecida" ? 400 : 200;
    return NextResponse.json(
      { registrado: false, motivo: decisao.motivo },
      { status },
    );
  }

  const banco = leitor();
  if (!banco) return NextResponse.json({ registrado: false });

  const { error } = await banco.rpc("registrar_interesse", {
    p_origem: decisao.origem,
    p_destino: decisao.destino,
  });

  // Falha aqui nao e problema do visitante: ele veio ver uma rota, nao
  // alimentar nosso sensor. Banco sem a migration aplicada responde 404
  // e a pagina nem fica sabendo.
  return NextResponse.json({ registrado: !error });
}
