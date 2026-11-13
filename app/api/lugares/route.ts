import { NextResponse } from "next/server";
import { procurarLugares } from "@/lib/busca/lugares";

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
  const q = new URL(requisicao.url).searchParams.get("q") ?? "";
  return NextResponse.json({ lugares: procurarLugares(q) });
}
