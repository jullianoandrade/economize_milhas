import { aeroportos, type Aeroporto } from "@/lib/dados";

/**
 * A busca de cidade e aeroporto.
 *
 * Vive em lib/ e nao na rota de API pelo motivo de sempre neste projeto:
 * o motor nao sabe o que e tela. Aqui dentro nao ha Request, Response
 * nem rede -- entra texto, sai lista -- e por isso a ordem dos
 * resultados pode ser travada por teste. Ver tests/busca.test.ts.
 *
 * A varredura e linear sobre a base inteira. Medido com os ~3.700
 * aeroportos: pior caso 7,6 ms, e a maioria das consultas abaixo de
 * 1 ms. Indice invertido seria complexidade sem problema a resolver.
 */

/** "Sao Paulo" e "São Paulo" tem que casar com a mesma busca. */
export function normalizar(texto: string): string {
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

export type LugarEncontrado = {
  iata: string;
  cidade: string;
  pais: string;
  nome: string;
};

/** Texto curto demais devolve lista vazia em vez de meia base. */
export const MINIMO_DE_LETRAS = 2;

export const LIMITE_PADRAO = 8;

/**
 * Procura cidades e aeroportos.
 *
 * A ordem tem DOIS criterios, e nessa ordem importa qual vem primeiro:
 *
 *   1. qualidade do casamento com o texto digitado (`pontuar`)
 *   2. relevancia do aeroporto (Brasil > destino procurado > resto)
 *
 * O segundo so desempata DENTRO do primeiro. Quem casa melhor sempre
 * vence quem e mais procurado -- do contrario a busca deixaria de
 * obedecer ao que a pessoa escreveu, que e pior do que ordenar mal.
 *
 * A relevancia entrou quando a base passou de 268 para ~3.700
 * aeroportos: sem ela, "londres" devolvia London City antes de
 * Heathrow e "paris" devolvia Beauvais antes do Charles de Gaulle.
 */
export function procurarLugares(
  texto: string,
  limite = LIMITE_PADRAO,
): LugarEncontrado[] {
  const busca = normalizar(texto);
  if (busca.length < MINIMO_DE_LETRAS) return [];

  return indice
    .flatMap((item) => {
      const pontos = pontuar(item, busca);
      return pontos === null ? [] : [{ item, pontos }];
    })
    .sort(
      (a, b) =>
        a.pontos - b.pontos ||
        b.item.aeroporto.relevancia - a.item.aeroporto.relevancia ||
        a.item.cidade.localeCompare(b.item.cidade),
    )
    .slice(0, limite)
    .map(({ item }) => ({
      iata: item.aeroporto.iata,
      cidade: item.aeroporto.cidade,
      pais: item.aeroporto.pais,
      nome: item.aeroporto.nome,
    }));
}
