import { NextResponse } from "next/server";
import { registrar } from "@/lib/log";
import { lerCorpo, limitar } from "@/lib/seguranca/requisicao";
import { REGRAS } from "@/lib/seguranca/limite";
import { corpoDoErroDoCliente } from "@/lib/seguranca/esquemas";

/**
 * Recebe erros que aconteceram no navegador e os registra no log do
 * servidor, marcando se foi no celular ou no desktop.
 *
 * Sem isto, erro de JavaScript no aparelho de alguem era invisivel: a
 * pessoa via a tela quebrar e ninguem do lado de ca sabia. Quem envia e
 * lib/cliente/relatar.ts.
 *
 * Porta aberta a qualquer um, entao: limite por IP, corpo com teto e
 * schema, e nada pessoal guardado -- so o caminho da pagina (sem
 * query), o tipo de aparelho e a largura da tela. Responde 204 sempre
 * que aceita: quem relata nao tem o que fazer com a resposta.
 */
export async function POST(requisicao: Request) {
  const bloqueio = limitar(requisicao, "erros", REGRAS.errosDoCliente);
  if (bloqueio) return bloqueio;

  const leitura = await lerCorpo(requisicao, corpoDoErroDoCliente);
  if (!leitura.ok) return leitura.resposta;

  registrar("erro", "cliente.erro", leitura.dados);
  return new NextResponse(null, { status: 204 });
}
