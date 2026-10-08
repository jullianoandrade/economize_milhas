import { NextResponse } from "next/server";
import { aeroportos, type Aeroporto } from "@/lib/dados";

/**
 * Autocomplete de cidades e aeroportos.
 *
 * Roda inteiramente sobre data/aeroportos.json, sem chamar ninguem de
 * fora: a base e pequena (268 aeroportos) e a busca precisa responder a
 * cada tecla digitada. Nenhum token envolvido.
 */

const LIMITE = 8;

/** "Sao Paulo" e "São Paulo" tem que casar com a mesma busca. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

type Indexado = {
  aeroporto: Aeroporto;
  cidade: string;
  nome: string;
  /** Nome em ingles, para quem digitar "Lisbon" em vez de "Lisboa". */
  aliases: string[];
};

const indice: Indexado[] = aeroportos.aeroportos.map((aeroporto) => ({
  aeroporto,
  cidade: normalizar(aeroporto.cidade),
  nome: normalizar(aeroporto.nome),
  aliases: aeroporto.aliases.map(normalizar),
}));

/** Menor pontuacao vence: casamento mais forte aparece primeiro. */
function pontuar(item: Indexado, busca: string): number | null {
  const iata = item.aeroporto.iata.toLowerCase();

  if (iata === busca) return 0;
  if (item.cidade === busca) return 1;
  if (item.aliases.some((a) => a === busca)) return 2;
  if (item.cidade.startsWith(busca)) return 3;
  if (item.aliases.some((a) => a.startsWith(busca))) return 4;
  if (item.nome.startsWith(busca)) return 5;
  if (item.cidade.includes(busca)) return 6;
  if (item.nome.includes(busca)) return 7;
  return null;
}

export async function GET(requisicao: Request) {
  const busca = normalizar(
    new URL(requisicao.url).searchParams.get("q") ?? "",
  );

  if (busca.length < 2) return NextResponse.json({ lugares: [] });

  const lugares = indice
    .flatMap((item) => {
      const pontos = pontuar(item, busca);
      return pontos === null ? [] : [{ item, pontos }];
    })
    .sort((a, b) => a.pontos - b.pontos || a.item.cidade.localeCompare(b.item.cidade))
    .slice(0, LIMITE)
    .map(({ item }) => ({
      iata: item.aeroporto.iata,
      cidade: item.aeroporto.cidade,
      pais: item.aeroporto.pais,
      nome: item.aeroporto.nome,
    }));

  return NextResponse.json({ lugares });
}
