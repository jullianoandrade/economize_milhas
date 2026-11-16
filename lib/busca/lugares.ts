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

/**
 * O nome do pais em portugues, sem curadoria nossa.
 *
 * Intl.DisplayNames ja carrega isso no runtime -- manter uma tabela de
 * ~250 paises a mao seria trabalho repetido e desatualizavel.
 */
const nomesDePais = new Intl.DisplayNames(["pt-BR"], { type: "region" });

function nomeDoPais(iso: string): string {
  try {
    return nomesDePais.of(iso) ?? iso;
  } catch {
    // Codigo que a tabela do runtime nao conhece: cai no proprio ISO,
    // que pelo menos nao quebra a busca.
    return iso;
  }
}

/**
 * Como o brasileiro chama, quando difere do nome oficial.
 *
 * Intl devolve a forma formal -- "Paises Baixos", "Tchequia", "Reino
 * Unido" -- e quase ninguem digita assim. Os dois valem.
 */
const APELIDOS_DE_PAIS: Record<string, string[]> = {
  NL: ["Holanda"],
  GB: ["Inglaterra", "Gra-Bretanha"],
  CZ: ["Republica Tcheca"],
  US: ["EUA", "Estados Unidos da America"],
  AE: ["Dubai", "Emirados Arabes"],
  KR: ["Coreia"],
  CI: ["Costa do Marfim"],
  TL: ["Timor Leste"],
  CV: ["Cabo Verde"],
};

type Indexado = {
  aeroporto: Aeroporto;
  cidade: string;
  nome: string;
  /** Nome em ingles, para quem digitar "Lisbon" em vez de "Lisboa". */
  aliases: string[];
  /** Pais em portugues: quem digita "Ucrania" quer os aeroportos de la. */
  pais: string;
  apelidosDePais: string[];
};

const indice: Indexado[] = aeroportos.aeroportos.map((aeroporto) => ({
  aeroporto,
  cidade: normalizar(aeroporto.cidade),
  nome: normalizar(aeroporto.nome),
  aliases: aeroporto.aliases.map(normalizar),
  pais: normalizar(nomeDoPais(aeroporto.pais)),
  apelidosDePais: (APELIDOS_DE_PAIS[aeroporto.pais] ?? []).map(normalizar),
}));

/**
 * Menor pontuacao vence: casamento mais forte aparece primeiro.
 *
 * O pais entra entre os casamentos fortes e os fracos, e so por nome
 * exato ou prefixo -- nunca por trecho. "Chile" dentro de "Chilecito"
 * encheria a busca de resultados que a pessoa nao pediu.
 *
 * Cidade sempre vence pais quando as duas batem: quem digita
 * "Singapura" ou "Mexico" normalmente quer a cidade, nao o pais
 * inteiro -- e por isso cidade exata (1) vem antes de pais exato (3).
 */
function pontuar(item: Indexado, busca: string): number | null {
  const iata = item.aeroporto.iata.toLowerCase();

  if (iata === busca) return 0;
  if (item.cidade === busca) return 1;
  if (item.aliases.some((a) => a === busca)) return 2;
  if (item.pais === busca || item.apelidosDePais.some((a) => a === busca)) {
    return 3;
  }
  if (item.cidade.startsWith(busca)) return 4;
  if (item.aliases.some((a) => a.startsWith(busca))) return 5;
  if (
    item.pais.startsWith(busca) ||
    item.apelidosDePais.some((a) => a.startsWith(busca))
  ) {
    return 6;
  }
  if (item.nome.startsWith(busca)) return 7;
  if (item.cidade.includes(busca)) return 8;
  if (item.nome.includes(busca)) return 9;
  return null;
}

export type LugarEncontrado = {
  iata: string;
  cidade: string;
  /** Codigo ISO, como sempre foi. */
  pais: string;
  /** Pais por extenso, em portugues: a tela mostra por que casou. */
  paisNome: string;
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
 *   3. conexoes: quantas rotas aereas servem o aeroporto
 *
 * Cada criterio so desempata DENTRO do anterior. Quem casa melhor
 * sempre vence quem e mais procurado -- do contrario a busca deixaria
 * de obedecer ao que a pessoa escreveu, que e pior do que ordenar mal.
 *
 * A relevancia entrou quando a base passou de 268 para ~3.700
 * aeroportos: sem ela, "londres" devolvia London City antes de
 * Heathrow e "paris" devolvia Beauvais antes do Charles de Gaulle.
 *
 * As conexoes entraram com a busca por pais, que expos o limite da
 * relevancia: num pais sem nenhum hub da nossa lista, todo mundo
 * empatava em zero e o alfabeto decidia -- "Ucrania" devolvia
 * Chernivtsi (4 rotas) antes de Kiev (330).
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
        b.item.aeroporto.conexoes - a.item.aeroporto.conexoes ||
        a.item.cidade.localeCompare(b.item.cidade),
    )
    .slice(0, limite)
    .map(({ item }) => ({
      iata: item.aeroporto.iata,
      cidade: item.aeroporto.cidade,
      pais: item.aeroporto.pais,
      paisNome: nomeDoPais(item.aeroporto.pais),
      nome: item.aeroporto.nome,
    }));
}
