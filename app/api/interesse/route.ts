import { NextResponse } from "next/server";
import { escritor } from "@/lib/supabase";
import { avaliarInteresse } from "@/lib/interesse";
import {
  dentroDoLimite,
  ipDe,
  lerCorpo,
  limitar,
} from "@/lib/seguranca/requisicao";
import { REGRAS } from "@/lib/seguranca/limite";
import { corpoDoInteresse } from "@/lib/seguranca/esquemas";
import { registrar } from "@/lib/log";

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
 *
 * ESTA ROTA E A UNICA PORTA. Ate 17/11/2026 a funcao do banco aceitava
 * chamada direta do papel anon, e qualquer pessoa com a chave publica
 * (que esta no navegador, por definicao) inflava o contador de qualquer
 * par sem passar pela validacao daqui -- medido: QQQ-WWW, par que nao
 * existe, chegou a 6 buscas. A migration 20261117_0001 tira o grant do
 * anon e a escrita passa a ser da service role, chamada so depois da
 * validacao e do limite por IP.
 */

export async function POST(requisicao: Request) {
  const bloqueio = limitar(requisicao, "interesse", REGRAS.interesse);
  if (bloqueio) return bloqueio;

  const leitura = await lerCorpo(requisicao, corpoDoInteresse);
  if (!leitura.ok) return leitura.resposta;

  const decisao = avaliarInteresse(leitura.dados.origem, leitura.dados.destino);

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

  // O mesmo IP conta o mesmo par uma vez por janela: o sensor mede
  // gente interessada, nao recarregamento. Nao e erro -- quem chama nao
  // tem o que corrigir -- entao responde 200.
  const par = `${decisao.origem}-${decisao.destino}`;
  if (!dentroDoLimite(`interesse-par:${ipDe(requisicao)}:${par}`, REGRAS.interessePorPar)) {
    return NextResponse.json({ registrado: false, motivo: "repetido" });
  }

  const banco = escritor();
  if (!banco) return NextResponse.json({ registrado: false });

  const { error } = await banco.rpc("registrar_interesse", {
    p_origem: decisao.origem,
    p_destino: decisao.destino,
  });

  // Falha aqui nao e problema do visitante: ele veio ver uma rota, nao
  // alimentar nosso sensor. Banco sem a migration aplicada responde 404
  // e a pagina nem fica sabendo.
  if (error) {
    registrar("aviso", "banco.falha", { onde: "registrar_interesse", codigo: error.code, mensagem: error.message });
  }
  return NextResponse.json({ registrado: !error });
}
