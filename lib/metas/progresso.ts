/**
 * Progresso de um objetivo de viagem.
 *
 * A pergunta que este modulo responde nao e "quanto voce tem", e sim
 * "quanto voce ANDOU, e nesse passo da tempo?". Por isso tudo aqui parte
 * de um ponto de partida registrado na criacao do objetivo: sem ele,
 * 40.000 milhas na conta nao dizem se a pessoa esta indo bem ou parada ha
 * meio ano.
 *
 * Funcoes puras, sem rede e sem relogio implicito -- a data de hoje entra
 * por parametro. E o que torna o modulo testavel e o que impede a tela de
 * mudar de resposta conforme o fuso do aparelho.
 */

export type Registro = {
  /** Data do registro, em yyyy-mm-dd. */
  em: string;
  /** Saldo de milhas no programa do objetivo naquele dia. */
  saldo: number;
};

export type Meta = {
  id: string;
  origemIata: string;
  destinoIata: string;
  destinoCidade: string;
  programaId: string;
  programaNome: string;
  /** Milhas estimadas para o trecho, congeladas na criacao do objetivo. */
  milhasNecessarias: number;
  /** Quanto a passagem custava em dinheiro quando o objetivo nasceu. */
  precoDaPassagemBRL: number;
  criadaEm: string;
  /** Data pretendida da viagem. Opcional: da para ter meta sem prazo. */
  dataAlvo: string | null;
  /** Ritmo que o plano de acumulo projetou, em milhas por mes. */
  ritmoMensalEstimado: number;
  /** Historico de saldo. O primeiro item e o ponto de partida. */
  registros: Registro[];
};

export type Situacao =
  | "concluida"
  | "adiantada"
  | "no-ritmo"
  | "atrasada"
  | "parada"
  | "sem-prazo";

export type Progresso = {
  pontoDePartida: number;
  saldoAtual: number;
  milhasFaltando: number;
  /** De 0 a 100. */
  percentual: number;
  ganhoDesdeOInicio: number;
  diasDesdeOInicio: number;
  /**
   * Ritmo MEDIDO, em milhas por mes. Null quando ainda nao ha historico
   * suficiente para medir -- e nesse caso a tela precisa dizer que o
   * numero exibido e projecao, nao observacao.
   */
  ritmoRealMensal: number | null;
  ritmoConsiderado: number;
  mesesRestantes: number | null;
  chegadaPrevistaEm: string | null;
  diasAteOAlvo: number | null;
  situacao: Situacao;
  /** Quanto por mes seria preciso acumular para bater o prazo. */
  ritmoNecessarioMensal: number | null;
  resumo: string;
};

const DIA_EM_MS = 24 * 60 * 60 * 1000;
const DIAS_POR_MES = 30.44;

/**
 * Janela minima para medir ritmo.
 *
 * Abaixo disso, dois registros perto um do outro viram ritmo mensal
 * absurdo: quem ganhou 3.000 milhas em dois dias nao acumula 45.000 por
 * mes. Tres semanas e o menor intervalo em que um ciclo de fatura de
 * cartao ja apareceu pelo menos uma vez.
 */
const DIAS_MINIMOS_PARA_RITMO = 21;

/** Margem para considerar um objetivo adiantado, e nao apenas no prazo. */
const DIAS_DE_FOLGA_PARA_ADIANTADA = 30;

export function emData(iso: string): Date {
  // Meio-dia evita que um fuso negativo jogue a data para o dia anterior.
  return new Date(`${iso.slice(0, 10)}T12:00:00`);
}

export function paraIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function diasEntre(de: Date, ate: Date): number {
  return Math.round((ate.valueOf() - de.valueOf()) / DIA_EM_MS);
}

export function somarMeses(data: Date, meses: number): Date {
  const nova = new Date(data);
  nova.setMonth(nova.getMonth() + meses);
  return nova;
}

export function calcularProgresso(meta: Meta, hoje: Date): Progresso {
  const registros = [...meta.registros].sort((a, b) =>
    a.em.localeCompare(b.em),
  );

  const primeiro = registros[0];
  const ultimo = registros[registros.length - 1];

  const pontoDePartida = primeiro?.saldo ?? 0;
  const saldoAtual = ultimo?.saldo ?? 0;
  const ganhoDesdeOInicio = saldoAtual - pontoDePartida;

  const necessarias = Math.max(0, meta.milhasNecessarias);
  const milhasFaltando = Math.max(0, necessarias - saldoAtual);
  const percentual =
    necessarias > 0 ? Math.min(100, (saldoAtual / necessarias) * 100) : 100;

  const inicio = primeiro ? emData(primeiro.em) : emData(meta.criadaEm);
  const diasDesdeOInicio = Math.max(0, diasEntre(inicio, hoje));

  // Ritmo medido: so entre o primeiro e o ultimo registro, e so quando o
  // intervalo e longo o bastante para significar alguma coisa.
  const vaoEmDias =
    registros.length >= 2 ? diasEntre(inicio, emData(ultimo.em)) : 0;
  const ritmoRealMensal =
    registros.length >= 2 && vaoEmDias >= DIAS_MINIMOS_PARA_RITMO
      ? Math.round((ganhoDesdeOInicio / vaoEmDias) * DIAS_POR_MES)
      : null;

  const ritmoConsiderado = Math.max(
    0,
    ritmoRealMensal ?? Math.round(meta.ritmoMensalEstimado),
  );

  const mesesRestantes =
    milhasFaltando === 0
      ? 0
      : ritmoConsiderado > 0
        ? Math.ceil(milhasFaltando / ritmoConsiderado)
        : null;

  const chegadaPrevistaEm =
    mesesRestantes === null ? null : paraIso(somarMeses(hoje, mesesRestantes));

  const diasAteOAlvo = meta.dataAlvo
    ? diasEntre(hoje, emData(meta.dataAlvo))
    : null;

  const ritmoNecessarioMensal =
    meta.dataAlvo &&
    diasAteOAlvo !== null &&
    diasAteOAlvo > 0 &&
    milhasFaltando > 0
      ? Math.ceil(milhasFaltando / Math.max(1, diasAteOAlvo / DIAS_POR_MES))
      : null;

  const situacao = classificar({
    milhasFaltando,
    ritmoConsiderado,
    dataAlvo: meta.dataAlvo,
    chegadaPrevistaEm,
  });

  return {
    pontoDePartida,
    saldoAtual,
    milhasFaltando,
    percentual,
    ganhoDesdeOInicio,
    diasDesdeOInicio,
    ritmoRealMensal,
    ritmoConsiderado,
    mesesRestantes,
    chegadaPrevistaEm,
    diasAteOAlvo,
    situacao,
    ritmoNecessarioMensal,
    resumo: resumir({
      meta,
      milhasFaltando,
      ritmoConsiderado,
      ritmoRealMensal,
      chegadaPrevistaEm,
      ritmoNecessarioMensal,
      situacao,
    }),
  };
}

function classificar(d: {
  milhasFaltando: number;
  ritmoConsiderado: number;
  dataAlvo: string | null;
  chegadaPrevistaEm: string | null;
}): Situacao {
  if (d.milhasFaltando === 0) return "concluida";
  if (d.ritmoConsiderado <= 0) return "parada";
  if (!d.dataAlvo || !d.chegadaPrevistaEm) return "sem-prazo";

  const sobra = diasEntre(emData(d.chegadaPrevistaEm), emData(d.dataAlvo));
  if (sobra >= DIAS_DE_FOLGA_PARA_ADIANTADA) return "adiantada";
  if (sobra >= 0) return "no-ritmo";
  return "atrasada";
}

const mil = (n: number) => Math.round(n).toLocaleString("pt-BR");

function mesAno(iso: string): string {
  return emData(iso).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function resumir(d: {
  meta: Meta;
  milhasFaltando: number;
  ritmoConsiderado: number;
  ritmoRealMensal: number | null;
  chegadaPrevistaEm: string | null;
  ritmoNecessarioMensal: number | null;
  situacao: Situacao;
}): string {
  const destino = d.meta.destinoCidade;

  if (d.situacao === "concluida") {
    return `Você já tem as milhas para ${destino}. Confira a disponibilidade de assentos no site do ${d.meta.programaNome} e resgate — milha parada só perde valor.`;
  }

  if (d.situacao === "parada") {
    return `Faltam ${mil(d.milhasFaltando)} milhas e, do jeito que está, você não acumula nada por mês. Sem uma fonte de acúmulo, este objetivo não tem data.`;
  }

  // A diferenca entre ritmo medido e ritmo projetado precisa aparecer na
  // frase: sao graus de confianca diferentes, e tratar os dois com as
  // mesmas palavras seria vender estimativa como fato.
  const origemDoRitmo =
    d.ritmoRealMensal === null
      ? `no ritmo projetado de ${mil(d.ritmoConsiderado)} milhas por mês`
      : `no seu ritmo real de ${mil(d.ritmoConsiderado)} milhas por mês`;

  const chegada = d.chegadaPrevistaEm
    ? ` até ${mesAno(d.chegadaPrevistaEm)}`
    : "";

  if (d.situacao === "atrasada" && d.ritmoNecessarioMensal) {
    return `Faltam ${mil(d.milhasFaltando)} milhas. ${capitalizar(origemDoRitmo)} você chega${chegada} — depois da data que marcou. Para alcançar a tempo seriam ${mil(d.ritmoNecessarioMensal)} milhas por mês.`;
  }

  if (d.situacao === "adiantada") {
    return `Faltam ${mil(d.milhasFaltando)} milhas. ${capitalizar(origemDoRitmo)} você chega${chegada}, com folga sobre a data que marcou.`;
  }

  if (d.situacao === "no-ritmo") {
    return `Faltam ${mil(d.milhasFaltando)} milhas. ${capitalizar(origemDoRitmo)} você chega${chegada}, dentro do prazo que marcou.`;
  }

  return `Faltam ${mil(d.milhasFaltando)} milhas. ${capitalizar(origemDoRitmo)} você chega${chegada}. Marque uma data de viagem para o app avisar se o ritmo dá conta.`;
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/* ------------------------------------------------------------------ */

export type PontoDaSerie = {
  em: string;
  saldo: number;
  /** Ponto calculado, nao registrado pela pessoa. */
  projetado: boolean;
};

/**
 * A linha do tempo do objetivo: o que foi registrado, mais a projecao
 * ate a chegada.
 *
 * A projecao vem marcada para o grafico poder desenha-la tracejada. Um
 * grafico que mistura o que aconteceu com o que talvez aconteca, sem
 * distinguir os dois, e exatamente o tipo de numero bonito que este
 * projeto evita.
 */
export function serieDoProgresso(
  meta: Meta,
  hoje: Date,
): { pontos: PontoDaSerie[]; maximo: number } {
  const pontos: PontoDaSerie[] = [...meta.registros]
    .sort((a, b) => a.em.localeCompare(b.em))
    .map((r) => ({ em: r.em, saldo: r.saldo, projetado: false }));

  const progresso = calcularProgresso(meta, hoje);

  if (
    progresso.milhasFaltando > 0 &&
    progresso.chegadaPrevistaEm !== null &&
    progresso.ritmoConsiderado > 0
  ) {
    pontos.push({
      em: progresso.chegadaPrevistaEm,
      saldo: meta.milhasNecessarias,
      projetado: true,
    });
  }

  const maximo = Math.max(
    meta.milhasNecessarias,
    ...pontos.map((p) => p.saldo),
    1,
  );

  return { pontos, maximo };
}
