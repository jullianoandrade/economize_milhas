/**
 * Gera data/aeroportos.json a partir da base publica da Travelpayouts.
 *
 * Por que um subconjunto e nao o arquivo inteiro: a base original tem
 * 10.378 aeroportos e 2,4 MB. Carregar isso no bundle para calcular a
 * distancia de uma rota seria desperdicio. Aqui ficam todos os aeroportos
 * brasileiros (o usuario pode partir de qualquer canto do pais) mais os
 * destinos internacionais que um viajante brasileiro de fato considera.
 *
 * Rode com:  node scripts/gerar-aeroportos.mjs
 */

import { writeFileSync } from "node:fs";

const FONTE_AEROPORTOS = "https://api.travelpayouts.com/data/airports.json";
const FONTE_CIDADES = "https://api.travelpayouts.com/data/cities.json";

/** Destinos internacionais relevantes para quem parte do Brasil. */
const HUBS_INTERNACIONAIS = new Set([
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

/** country_code -> macro-regiao usada nas tabelas de resgate. */
const REGIAO_POR_PAIS = {
  BR: "brasil",
  AR:"america-sul", UY:"america-sul", PY:"america-sul", CL:"america-sul",
  BO:"america-sul", PE:"america-sul", EC:"america-sul", CO:"america-sul",
  VE:"america-sul", GY:"america-sul", SR:"america-sul", GF:"america-sul",
  US:"america-norte-central", CA:"america-norte-central", MX:"america-norte-central",
  PA:"america-norte-central", CR:"america-norte-central", GT:"america-norte-central",
  SV:"america-norte-central", HN:"america-norte-central", NI:"america-norte-central",
  BZ:"america-norte-central", CU:"america-norte-central", DO:"america-norte-central",
  JM:"america-norte-central", PR:"america-norte-central", BS:"america-norte-central",
  AW:"america-norte-central", CW:"america-norte-central", BB:"america-norte-central",
  PT:"europa", ES:"europa", GB:"europa", FR:"europa", IT:"europa", NL:"europa",
  DE:"europa", CH:"europa", BE:"europa", AT:"europa", IE:"europa", DK:"europa",
  SE:"europa", NO:"europa", FI:"europa", GR:"europa", TR:"europa", CZ:"europa",
  HU:"europa", PL:"europa", MA:"europa", EG:"europa",
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
      a.coordinates?.lon != null &&
      (a.country_code === "BR" || HUBS_INTERNACIONAIS.has(a.code)),
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
    "Subconjunto gerado por scripts/gerar-aeroportos.mjs: todos os aeroportos do Brasil mais os principais destinos internacionais. Regenere rodando o script.",
  aeroportos: selecionados,
};

writeFileSync("data/aeroportos.json", JSON.stringify(saida, null, 1) + "\n");

const porRegiao = selecionados.reduce((acc, a) => {
  acc[a.regiao] = (acc[a.regiao] || 0) + 1;
  return acc;
}, {});
console.log(`${selecionados.length} aeroportos gravados em data/aeroportos.json`);
console.log(porRegiao);
