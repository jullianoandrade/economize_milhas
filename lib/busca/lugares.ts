import {
  aeroportos,
  cidadesSemAeroporto,
  type Aeroporto,
  type CidadeSemAeroporto,
} from "@/lib/dados";

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

type CidadeIndexada = {
  cidade: CidadeSemAeroporto;
  nome: string;
  aliases: string[];
};

/**
 * Cidades que nao tem aeroporto, apontando para quem as serve.
 *
 * Quem digita o nome da propria cidade raramente mora num lugar com
 * aeroporto. "Gravatai" nao devolvia nada -- e o aeroporto que a serve,
 * Porto Alegre, fica a 24 km.
 */
const indiceDeCidades: CidadeIndexada[] = cidadesSemAeroporto.cidades.map(
  (cidade) => ({
    cidade,
    nome: normalizar(cidade.cidade),
    aliases: cidade.aliases.map(normalizar),
  }),
);

/** O aeroporto que a cidade aponta, para montar o resultado. */
const aeroportoPorIata = new Map(
  aeroportos.aeroportos.map((a) => [a.iata, a]),
);

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
  if (item.cidade.startsWith(busca)) return 5;
  if (item.aliases.some((a) => a.startsWith(busca))) return 6;
  if (
    item.pais.startsWith(busca) ||
    item.apelidosDePais.some((a) => a.startsWith(busca))
  ) {
    return 8;
  }
  if (item.nome.startsWith(busca)) return 9;
  if (item.cidade.includes(busca)) return 10;
  if (item.nome.includes(busca)) return 11;
  return null;
}

/**
 * Pontua uma cidade SEM aeroporto.
 *
 * Usa a mesma escala de `pontuar`, intercalada de proposito: cidade sem
 * aeroporto exata (4) perde para aeroporto exato (1) e para alias
 * exato (2), mas ganha de "comeca com" (5) e de qualquer trecho solto.
 *
 * A ordem nao e arbitraria. Um resultado destes e um PONTEIRO -- a
 * pessoa nao embarca em Gravatai -- entao nunca pode passar na frente
 * de um aeroporto que casa igualmente bem. Mas quem digitou o nome
 * exato da cidade onde mora merece resposta antes de um aeroporto que
 * so tem aquelas letras no meio do nome.
 */
function pontuarCidade(item: CidadeIndexada, busca: string): number | null {
  if (item.nome === busca) return 4;
  if (item.aliases.some((a) => a === busca)) return 4;
  if (item.nome.startsWith(busca)) return 7;
  if (item.aliases.some((a) => a.startsWith(busca))) return 7;
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
  /**
   * Preenchido quando o resultado veio de uma cidade SEM aeroporto.
   * `cidade` entao e a cidade buscada, nao a do aeroporto -- e a tela
   * precisa dizer de onde a pessoa realmente voa.
   */
  servidaPor?: { cidade: string; km: number };
  /** Do aeroporto -- e o que o globo usa para tracar um arco. */
  lat: number;
  lon: number;
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
 *
 * As cidades sem aeroporto entram na mesma lista, com a mesma escala de
 * pontos (ver `pontuarCidade`), e nao numa secao separada: quem digita
 * "Gravatai" quer uma resposta, nao uma aula sobre a diferenca entre
 * cidade e aeroporto. A tela diz de onde ele realmente voa.
 */
export function procurarLugares(
  texto: string,
  limite = LIMITE_PADRAO,
): LugarEncontrado[] {
  const busca = normalizar(texto);
  if (busca.length < MINIMO_DE_LETRAS) return [];

  type Candidato = {
    pontos: number;
    relevancia: number;
    conexoes: number;
    ordem: string;
    lugar: LugarEncontrado;
  };

  const candidatos: Candidato[] = [];

  for (const item of indice) {
    const pontos = pontuar(item, busca);
    if (pontos === null) continue;

    candidatos.push({
      pontos,
      relevancia: item.aeroporto.relevancia,
      conexoes: item.aeroporto.conexoes,
      ordem: item.cidade,
      lugar: {
        iata: item.aeroporto.iata,
        cidade: item.aeroporto.cidade,
        pais: item.aeroporto.pais,
        paisNome: nomeDoPais(item.aeroporto.pais),
        nome: item.aeroporto.nome,
        lat: item.aeroporto.lat,
        lon: item.aeroporto.lon,
      },
    });
  }

  for (const item of indiceDeCidades) {
    const pontos = pontuarCidade(item, busca);
    if (pontos === null) continue;

    const aeroporto = aeroportoPorIata.get(item.cidade.iata);
    if (!aeroporto) continue;

    candidatos.push({
      pontos,
      relevancia: aeroporto.relevancia,
      // Entre duas cidades que casam igual, a mais perto do aeroporto
      // vem primeiro: a distancia e o custo real de escolher aquela.
      conexoes: aeroporto.conexoes - item.cidade.km,
      ordem: item.nome,
      lugar: {
        iata: aeroporto.iata,
        // A cidade BUSCADA, nao a do aeroporto -- foi ela que a pessoa
        // digitou, e e ela que faz o resultado parecer certo.
        cidade: item.cidade.cidade,
        pais: item.cidade.pais,
        paisNome: nomeDoPais(item.cidade.pais),
        nome: aeroporto.nome,
        lat: aeroporto.lat,
        lon: aeroporto.lon,
        servidaPor: { cidade: aeroporto.cidade, km: item.cidade.km },
      },
    });
  }

  return candidatos
    .sort(
      (a, b) =>
        a.pontos - b.pontos ||
        b.relevancia - a.relevancia ||
        b.conexoes - a.conexoes ||
        a.ordem.localeCompare(b.ordem),
    )
    .slice(0, limite)
    .map((c) => c.lugar);
}
