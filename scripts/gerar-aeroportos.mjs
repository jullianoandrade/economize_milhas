/**
 * Gera data/aeroportos.json a partir da base publica da Travelpayouts.
 *
 * CRITERIO: todo aeroporto que a fonte marca como operante (`flightable`),
 * do tipo `airport` e com coordenada. Sao ~3.700, contra os 10.378 brutos
 * -- o resto e estacao de trem, heliporto e codigo de cidade.
 *
 * Nao ha mais lista branca de hubs internacionais. A versao anterior
 * trazia 138 brasileiros mais 130 hubs escolhidos a mao, e a justificativa
 * escrita aqui era o peso no bundle. Essa justificativa nao se aplica mais
 * (talvez nunca tenha se aplicado): NENHUM componente de cliente importa
 * a base. Quem a le sao Server Components, rotas de API e modulos
 * server-only; o campo de busca conversa com /api/lugares exatamente para
 * isso. O arquivo cresce no servidor e nao manda um byte a mais para o
 * navegador.
 *
 * O custo da lista branca, por outro lado, era concreto: quem digitava
 * Faro, Sevilha, Malaga, Nice, Florenca, San Diego, Austin, Guadalajara
 * ou Ho Chi Minh batia em "nao conheco esse aeroporto".
 *
 * Rode com:  node scripts/gerar-aeroportos.mjs
 */

import { writeFileSync } from "node:fs";

const FONTE_AEROPORTOS = "https://api.travelpayouts.com/data/airports.json";
const FONTE_CIDADES = "https://api.travelpayouts.com/data/cities.json";

/**
 * Destinos internacionais que um viajante brasileiro de fato procura.
 *
 * Esta lista ja foi um FILTRO de inclusao, e nessa funcao estava errada:
 * quem digitava Faro ou San Diego batia em "nao conheco esse aeroporto".
 * Como SINAL DE RELEVANCIA ela esta certa, e resolve o efeito colateral
 * de abrir a base inteira -- medido antes de existir:
 *
 *   "londres" devolvia London City (LCY) antes de Heathrow
 *   "paris"   devolvia Beauvais (BVA) antes de Charles de Gaulle
 *   "bahia"   devolvia Bahia Blanca, na Argentina, antes de Ilheus
 *
 * Todos continuam buscaveis. O que muda e a ordem no empate: entre dois
 * resultados que casam igualmente bem com o texto digitado, o que o
 * brasileiro provavelmente quis vem primeiro.
 */
const DESTINOS_PROCURADOS = new Set([
  // Europa
  "LIS","OPO","MAD","BCN","LHR","LGW","CDG","ORY","FCO","MXP","AMS","FRA",
  "MUC","ZRH","BRU","VIE","DUB","CPH","ARN","OSL","HEL","ATH","IST","PRG",
  "BUD","WAW","EDI","VCE","NAP","LYS","GVA","BER",
  // America do Norte e Central
  "JFK","EWR","LGA","MIA","FLL","MCO","TPA","LAX","SFO","ORD","DFW","IAH",
  "ATL","BOS","SEA","LAS","DEN","PHL","IAD","DCA","YYZ","YUL","YVR","MEX",
  "CUN","PTY","SJO","GUA","SAL",
  // Caribe
  "PUJ","SDQ","HAV","SJU","MBJ","AUA","CUR","NAS","BGI",
  // America do Sul
  "EZE","AEP","SCL","MVD","PDP","ASU","LIM","CUZ","BOG","CTG","MDE","UIO",
  "GYE","GPS","CCS","LPB","VVI","GEO","PBM","CAY",
  // Africa e Oriente Medio
  "JNB","CPT","DUR","CAI","DXB","DOH","AUH","TLV","CMN","ADD","NBO","LAD",
  "MPM","RAK","SEZ","MRU",
  // Asia e Oceania
  "NRT","HND","KIX","ICN","PEK","PVG","CAN","HKG","TPE","BKK","HKT","SIN",
  "KUL","DPS","CGK","MNL","DEL","BOM","MLE","SYD","MEL","BNE","AKL","PPT",
]);

/**
 * country_code -> macro-regiao usada nas tabelas de resgate.
 *
 * As cinco regioes vem de data/tabelas-resgate.json e significam, todas,
 * "saindo do Brasil" -- por isso "europa" se chama "Europa e Africa do
 * Norte" e "resto-mundo" se chama "Asia, Oceania e Africa". Rota sem
 * ponta brasileira nao recebe faixa nenhuma: ver lib/milhas/regioes.ts e
 * docs/fronteira-do-motor.md.
 *
 * Pais que nao estiver aqui cai em "resto-mundo" pelo `??` la embaixo.
 * Isso e rede de seguranca, nao criterio: a faixa errada muda o preco
 * estimado E a quantidade de milhas, entao vale manter o mapa completo.
 *
 * CASOS TRANSCONTINENTAIS, decididos por geografia e marcados para
 * curadoria futura: TR, RU, GE, AM, AZ e CY entram em "europa" (a maior
 * parte dos aeroportos fica do lado europeu, e TR ja estava assim desde
 * a primeira versao). Israel e o resto do Oriente Medio ficam em
 * "resto-mundo", como ja estavam.
 */
const REGIAO_POR_PAIS = {
  BR: "brasil",

  // America do Sul
  AR:"america-sul", BO:"america-sul", CL:"america-sul", CO:"america-sul",
  EC:"america-sul", FK:"america-sul", GF:"america-sul", GY:"america-sul",
  PE:"america-sul", PY:"america-sul", SR:"america-sul", UY:"america-sul",
  VE:"america-sul",

  // America do Norte e Central, incluindo o Caribe
  US:"america-norte-central", CA:"america-norte-central",
  MX:"america-norte-central", GL:"america-norte-central",
  PM:"america-norte-central",
  BZ:"america-norte-central", CR:"america-norte-central",
  SV:"america-norte-central", GT:"america-norte-central",
  HN:"america-norte-central", NI:"america-norte-central",
  PA:"america-norte-central",
  AG:"america-norte-central", AI:"america-norte-central",
  AW:"america-norte-central", BB:"america-norte-central",
  BL:"america-norte-central", BM:"america-norte-central",
  BQ:"america-norte-central", BS:"america-norte-central",
  CU:"america-norte-central", CW:"america-norte-central",
  DM:"america-norte-central", DO:"america-norte-central",
  GD:"america-norte-central", GP:"america-norte-central",
  HT:"america-norte-central", JM:"america-norte-central",
  KN:"america-norte-central", KY:"america-norte-central",
  LC:"america-norte-central", MF:"america-norte-central",
  MQ:"america-norte-central", MS:"america-norte-central",
  PR:"america-norte-central", SX:"america-norte-central",
  TC:"america-norte-central", TT:"america-norte-central",
  VC:"america-norte-central", VG:"america-norte-central",
  VI:"america-norte-central",

  // Europa
  AD:"europa", AL:"europa", AM:"europa", AT:"europa", AX:"europa",
  AZ:"europa", BA:"europa", BE:"europa", BG:"europa", BY:"europa",
  CH:"europa", CY:"europa", CZ:"europa", DE:"europa", DK:"europa",
  EE:"europa", ES:"europa", FI:"europa", FO:"europa", FR:"europa",
  GB:"europa", GE:"europa", GG:"europa", GI:"europa", GR:"europa",
  HR:"europa", HU:"europa", IE:"europa", IM:"europa", IS:"europa",
  IT:"europa", JE:"europa", LI:"europa", LT:"europa", LU:"europa",
  LV:"europa", MC:"europa", MD:"europa", ME:"europa", MK:"europa",
  MT:"europa", NL:"europa", NO:"europa", PL:"europa", PT:"europa",
  RO:"europa", RS:"europa", RU:"europa", SE:"europa", SI:"europa",
  SJ:"europa", SK:"europa", SM:"europa", TR:"europa", UA:"europa",
  VA:"europa", XK:"europa",

  // Africa do Norte -- a faixa "europa" se chama "Europa e Africa do
  // Norte" justamente por causa destes.
  DZ:"europa", EG:"europa", EH:"europa", LY:"europa", MA:"europa",
  TN:"europa",
};

/**
 * Nomes em portugues.
 *
 * A base da Travelpayouts praticamente nao tem traducao para pt, entao um
 * brasileiro digitando "Lisboa" ou "Londres" nao achava nada -- o que
 * quebrava o fluxo principal do app. A cidade passa a ser gravada em
 * portugues, e o nome original vira alias para quem digitar em ingles.
 */
const NOME_EM_PORTUGUES = {
  // Brasil: a base de origem vem sem acento nenhum. Nao da para corrigir
  // as 138 cidades a mao, entao aqui ficam as mais buscadas; o resto
  // segue sem acento. A busca normaliza acentos, entao digitar com ou
  // sem funciona igual nos dois casos.
  "Sao Paulo": "São Paulo", Brasilia: "Brasília", Belem: "Belém",
  Goiania: "Goiânia", Vitoria: "Vitória", Florianopolis: "Florianópolis",
  Maceio: "Maceió", "Sao Luis": "São Luís", Macapa: "Macapá",
  Cuiaba: "Cuiabá", Ilheus: "Ilhéus", Uberlandia: "Uberlândia",
  "Ribeirao Preto": "Ribeirão Preto",
  "Sao Jose Do Rio Preto": "São José do Rio Preto",
  "Sao Jose Dos Campos": "São José dos Campos",
  "Caxias Do Sul": "Caxias do Sul", Chapeco: "Chapecó",
  Criciuma: "Criciúma", "Foz Do Iguacu": "Foz do Iguaçu",
  Mossoro: "Mossoró", Maraba: "Marabá", Santarem: "Santarém",
  Rondonopolis: "Rondonópolis", "Tres Lagoas": "Três Lagoas",
  "Vitoria Da Conquista": "Vitória da Conquista",
  "Juazeiro Do Norte": "Juazeiro do Norte", Lencois: "Lençóis",
  "Sao Gabriel": "São Gabriel", "Joao Pessoa": "João Pessoa",
  Guarulhos: "Guarulhos", Parnaiba: "Parnaíba", Araguaina: "Araguaína",
  Altamira: "Altamira", Bauru: "Bauru", Maringa: "Maringá",
  Cascavel: "Cascavel", "Passo Fundo": "Passo Fundo",

  // Europa
  Lisbon: "Lisboa", Madrid: "Madri", London: "Londres", Rome: "Roma",
  Milan: "Milão", Amsterdam: "Amsterdã", Munich: "Munique",
  Zurich: "Zurique", Brussels: "Bruxelas", Vienna: "Viena",
  Copenhagen: "Copenhague", Stockholm: "Estocolmo", Helsinki: "Helsinque",
  Athens: "Atenas", Istanbul: "Istambul", Prague: "Praga",
  Budapest: "Budapeste", Warsaw: "Varsóvia", Edinburgh: "Edimburgo",
  Venice: "Veneza", Naples: "Nápoles", Geneva: "Genebra",
  Berlin: "Berlim", Florence: "Florença",

  // Americas
  "New York": "Nova York", "Mexico City": "Cidade do México",
  Cancun: "Cancún", "Panama City": "Cidade do Panamá",
  Montevideo: "Montevidéu", Asuncion: "Assunção", Bogota: "Bogotá",
  "San Jose": "San José", "New Orleans": "Nova Orleans",

  // Africa e Oriente Medio
  Johannesburg: "Joanesburgo", "Cape Town": "Cidade do Cabo",
  Marrakesh: "Marraquexe",

  // Asia e Oceania
  Tokyo: "Tóquio", Seoul: "Seul", Beijing: "Pequim", Shanghai: "Xangai",
  Bangkok: "Banguecoque", Singapore: "Singapura",
  "New Delhi": "Nova Délhi", Delhi: "Nova Délhi", Sydney: "Sidney",
  Jakarta: "Jacarta", Taipei: "Taipé", Male: "Malé", Moscow: "Moscou",
  Canton: "Guangzhou",

  // Entraram quando a base deixou de ser so hubs. Sem isto, quem digita
  // "Sevilha", "Cracovia" ou "Marselha" nao acha nada -- a fonte so tem
  // a grafia inglesa. O nome original vira alias, entao as duas formas
  // continuam funcionando.
  Sevilla: "Sevilha", Genoa: "Gênova", Turin: "Turim",
  Marseille: "Marselha", Bordeaux: "Bordéus", Strasbourg: "Estrasburgo",
  Cologne: "Colônia", Hamburg: "Hamburgo", Hannover: "Hanôver",
  Nuremberg: "Nuremberga", Gothenburg: "Gotemburgo", Tallinn: "Talin",
  Krakow: "Cracóvia", Bucharest: "Bucareste", Belgrade: "Belgrado",
  Ljubljana: "Liubliana", Skopje: "Escópia", Sarajevo: "Saraievo",
  Kyiv: "Kiev", "Saint Petersburg": "São Petersburgo",
  Thessaloniki: "Salônica", Heraklion: "Heraclião", Rhodes: "Rodes",
  Antalya: "Antália", Ankara: "Ancara", Izmir: "Esmirna",
  "La Coruna": "Corunha",

  // Aqui o nome da base e o da cidade, mas o brasileiro procura pela
  // ilha. Mesmo mecanismo: o original continua valendo como alias.
  Thira: "Santorini", Arrecife: "Lanzarote", Palma: "Palma de Maiorca",
  Mikonos: "Mykonos",
};


async function baixar(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`${url} respondeu ${resposta.status}`);
  return resposta.json();
}

const [aeroportos, cidades] = await Promise.all([
  baixar(FONTE_AEROPORTOS),
  baixar(FONTE_CIDADES),
]);

const nomeDaCidade = new Map(
  cidades.map((c) => [c.code, c.name_translations?.pt || c.name]),
);

const selecionados = aeroportos
  .filter(
    (a) =>
      a.flightable &&
      a.iata_type === "airport" &&
      a.coordinates?.lat != null &&
      a.coordinates?.lon != null,
  )
  .map((a) => {
    const original = nomeDaCidade.get(a.city_code) || a.name;
    const traduzido = NOME_EM_PORTUGUES[original];
    return {
    iata: a.code,
    cidade: traduzido || original,
    aliases: traduzido ? [original] : [],
    cidadeIata: a.city_code,
    pais: a.country_code,
    regiao: REGIAO_POR_PAIS[a.country_code] ?? "resto-mundo",
    // Desempate da busca, nunca filtro. Ver DESTINOS_PROCURADOS acima e
    // a ordenacao em app/api/lugares/route.ts: 2 = esta no Brasil, de
    // onde a pessoa parte; 1 = destino internacional procurado; 0 = o
    // resto, que continua buscavel e so nao ganha empate.
    relevancia:
      a.country_code === "BR" ? 2 : DESTINOS_PROCURADOS.has(a.code) ? 1 : 0,
    lat: Number(a.coordinates.lat.toFixed(4)),
    lon: Number(a.coordinates.lon.toFixed(4)),
    nome: a.name_translations?.pt || a.name,
    };
  })
  .sort((a, b) => a.iata.localeCompare(b.iata));

const saida = {
  atualizadoEm: new Date().toISOString().slice(0, 10),
  fonte: FONTE_AEROPORTOS,
  explicacao:
    "Gerado por scripts/gerar-aeroportos.mjs: todo aeroporto operante (flightable), do tipo airport e com coordenada. A base vive so no servidor -- nenhum componente de cliente a importa, o campo de busca fala com /api/lugares. Regenere rodando o script.",
  aeroportos: selecionados,
};

writeFileSync("data/aeroportos.json", JSON.stringify(saida, null, 1) + "\n");

const porRegiao = selecionados.reduce((acc, a) => {
  acc[a.regiao] = (acc[a.regiao] || 0) + 1;
  return acc;
}, {});
console.log(`${selecionados.length} aeroportos gravados em data/aeroportos.json`);
console.log(porRegiao);
