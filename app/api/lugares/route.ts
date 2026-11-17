import { NextResponse } from "next/server";
import { procurarLugares } from "@/lib/busca/lugares";
import { limitar } from "@/lib/seguranca/requisicao";
import { REGRAS } from "@/lib/seguranca/limite";

/**
 * Autocomplete de cidades e aeroportos.
 *
 * Casca HTTP de lib/busca/lugares.ts, e so isso: le o parametro,
 * devolve JSON. A ordenacao e a pontuacao vivem no motor, onde tem
 * teste -- a ordem dos resultados e fácil demais de quebrar em silencio
 * para ficar dentro de uma rota.
 *
 * Esta rota existe para a base NAO ir ao navegador: ela tem ~3.700
 * aeroportos e nada disso precisa atravessar a rede para o cliente.
 * Nenhum token envolvido.
 */
export async function GET(requisicao: Request) {
  const bloqueio = limitar(requisicao, "lugares", REGRAS.autocomplete);
  if (bloqueio) return bloqueio;

  // Nenhum nome de cidade ou aeroporto passa de 80 caracteres; texto
  // maior que isso so serve para gastar CPU do ranqueamento.
  const q = (new URL(requisicao.url).searchParams.get("q") ?? "").slice(0, 80);
  return NextResponse.json({ lugares: procurarLugares(q) });
}
