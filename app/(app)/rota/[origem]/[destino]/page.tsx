import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { FaixaDaJornada } from "./_componentes/FaixaDaJornada";
import { SeletorDeData } from "./_componentes/SeletorDeData";
import { ArcoDaRota } from "./_componentes/ArcoDaRota";
import { CeuDoDestino } from "./_componentes/CeuDoDestino";
import { HeroiDaRota } from "./_componentes/HeroiDaRota";
import { ComoPagar } from "./_componentes/ComoPagar";
import { IlhaDoVeredito } from "./_componentes/IlhaDoVeredito";
import { IlhaDeComoPagar } from "./_componentes/IlhaDeComoPagar";
import { BlocoDeQuando } from "./_componentes/BlocoDeQuando";
import { curvaMensal, precoDoTrecho } from "@/lib/precos";
import {
  observacoesDaRota,
  observacoesDatadasDaRota,
  precosMensaisDaRota,
} from "@/lib/historico";
import { precosDasAlternativas } from "@/lib/alternativas";
import { heuristicasTempo } from "@/lib/dados";
import { reais } from "@/lib/format";
import {
  AeroportoDesconhecidoError,
  aeroportoPorIata,
  classificarRota,
} from "@/lib/milhas/regioes";
import { calcularVeredito } from "@/lib/milhas/veredito";
import rotasDestaque from "@/data/rotas-destaque.json";
import { janelaDeCompra } from "@/lib/tempo/antecedencia";
import { calcularSazonalidade } from "@/lib/tempo/sazonalidade";
import { compararOrigens, datasMaisBaratas } from "@/lib/tempo/flexibilidade";
import { montarCalendario } from "@/lib/tempo/calendario";
import { diasAte, faseDaJornada } from "@/lib/monetizacao/jornada";

/**
 * Pre-renderiza as rotas de maior valor de busca.
 *
 * Nao e so performance: pagina gerada sob demanda tem a metadata chegando
 * por streaming, depois da casca, e buscador le o <head> inicial. So com
 * pre-renderizacao o titulo e a descricao entram no HTML servido.
 *
 * Qualquer outra rota continua funcionando normalmente, gerada na hora.
 */
export async function generateStaticParams() {
  return rotasDestaque.rotas.map(([origem, destino]) => ({ origem, destino }));
}

export async function generateMetadata({
  params,
}: PageProps<"/rota/[origem]/[destino]">): Promise<Metadata> {
  // Sem isto a metadata depende de dado de runtime e chega por streaming,
  // depois da casca -- entao a descricao nao esta no <head> inicial, que e
  // justamente o que buscadores leem. Com "use cache" ela entra no HTML
  // pre-renderizado. A rota em si e a chave do cache.
  "use cache";
  const { origem, destino } = await params;
  const o = aeroportoPorIata(origem);
  const d = aeroportoPorIata(destino);
  const trecho = o && d ? `${o.cidade} para ${d.cidade}` : `${origem.toUpperCase()} para ${destino.toUpperCase()}`;

  return {
    title: trecho,
    description: `Quanto custa ${trecho} em dinheiro e em milhas, em que mês ir, quando comprar e quanto você economiza.`,
  };
}

/**
 * O acabamento escuro do heroi, fixo -- independente do tema claro/escuro
 * que a pessoa escolheu no resto do site.
 *
 * O heroi e um painel de marca, sempre escuro. Os mesmos componentes que
 * o resto da pagina usa no modo claro (CardVeredito, ReguaDoResgate,
 * FaixaDeMilhas, SeloDeFonte, FaixaDaJornada, SeletorDeData) so precisam
 * ler, aqui dentro, os valores que o MODO ESCURO do site ja define para
 * estas variaveis -- mesmo precedente de TOM_CLARO em Ilustracao.tsx, so
 * que invertido.
 */
const TEMA_DO_HEROI = {
  "--tinta": "#f2ede0",
  "--tinta-media": "#b6bed0",
  "--tinta-fraca": "#8e99b0",
  "--superficie": "#152339",
  "--superficie-2": "#1d2e48",
  "--borda": "#2b405f",
  "--marca": "#8fb2e8",
  "--marca-contraste": "#0e1a2e",
  "--marca-fraca": "#1a2b45",
  "--milhas": "#f2b33d",
  "--milhas-fundo": "#2e2410",
  "--milhas-borda": "#56410f",
  "--dinheiro": "#4ade9f",
  "--dinheiro-fundo": "#0f2c22",
  "--dinheiro-borda": "#1f5c44",
  "--atencao": "#fbbf24",
  "--alerta": "#f87171",
  "--alerta-fundo": "#2d1414",
  "--grafico-dinheiro": "#1f9c6c",
} as CSSProperties;

export default function PaginaDaRota({
  params,
  searchParams,
}: PageProps<"/rota/[origem]/[destino]">) {
  // params NAO e aguardado aqui de proposito. Com Cache Components
  // ligado, tocar em dado dinamico fora de um <Suspense> impede o Next
  // de pre-renderizar a casca da pagina, e a pessoa fica olhando tela
  // branca ate o calculo terminar. Passando a promessa adiante, a casca
  // sai na hora e so o miolo espera.
  return (
    <Suspense fallback={<Esqueleto />}>
      <Conteudo params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Conteudo({
  params,
  searchParams,
}: {
  params: PageProps<"/rota/[origem]/[destino]">["params"];
  searchParams: PageProps<"/rota/[origem]/[destino]">["searchParams"];
}) {
  const { origem, destino } = await params;
  const consulta = await searchParams;
  const dataEscolhida =
    typeof consulta.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(consulta.data)
      ? consulta.data
      : null;

  let rota;
  try {
    rota = classificarRota(origem, destino);
  } catch (erro) {
    if (erro instanceof AeroportoDesconhecidoError) {
      return <RotaNaoEncontrada iata={erro.iata} />;
    }
    throw erro;
  }

  const preco = await precoDoTrecho(rota);
  const veredito = calcularVeredito(rota, preco.dados);

  // As tres consultas sao independentes: em serie, a pagina esperaria a
  // soma delas em vez do maior tempo entre elas.
  const [curvaDaApi, mensaisProprios, observacoes, datadas, alternativas] =
    await Promise.all([
      curvaMensal(rota, heuristicasTempo.sazonalidadeBrasil.indicePorMes),
      precosMensaisDaRota(rota.origem.iata, rota.destino.iata),
      observacoesDaRota(rota.origem.iata, rota.destino.iata),
      observacoesDatadasDaRota(rota.origem.iata, rota.destino.iata),
      precosDasAlternativas(rota.origem, rota.destino.iata),
    ]);

  // O historico proprio cobre o ano inteiro; o cache da Travelpayouts
  // cobre poucos meses. Quando o nosso tem mais meses, ele ganha.
  const usaProprio = mensaisProprios.length > curvaDaApi.dados.length;
  const precosPorMes = usaProprio ? mensaisProprios : curvaDaApi.dados;

  const sazonalidade = veredito.melhor
    ? calcularSazonalidade(rota, precosPorMes, veredito.melhor.programa.id)
    : null;

  // A data do relogio so pode ser lida depois que o trecho ja esta
  // marcado como dinamico; curvaMensal faz isso acima, via connection().
  const diasAteAViagem = dataEscolhida
    ? diasAte(new Date(`${dataEscolhida}T12:00:00`), new Date())
    : null;

  const janela = janelaDeCompra(
    rota.internacional,
    diasAteAViagem,
    observacoes,
  );

  const { referenciaBRL, datas } = datasMaisBaratas(datadas);
  const outrasOrigens = compararOrigens(rota.origem, preco.dados, alternativas);
  const calendario = montarCalendario(datadas, new Date());
  const fase = faseDaJornada(diasAteAViagem);
  const melhorOrigemAlternativa = outrasOrigens[0] ?? null;

  return (
    <>
      {/* 1. O heroi -- "a resposta". Um unico painel escuro: o veredito,
          a regua, a faixa de precificacao dinamica, o arco da rota, o
          ceu do destino e o que fazer a respeito. */}
      <section
        className="gradiente-marca relative overflow-hidden rounded-[28px] p-5"
        style={TEMA_DO_HEROI}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-90">
          <CeuDoDestino destino={rota.destino} />
        </div>

        <div className="relative">
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1 text-sm text-tinta-media transition-colors hover:text-tinta"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
            Nova busca
          </Link>

          <h1 className="display text-2xl text-tinta">
            {rota.origem.cidade} → {rota.destino.cidade}
          </h1>
          <p className="tabular mt-1 text-sm text-tinta-media">
            {rota.origem.iata} · {rota.destino.iata} ·{" "}
            {rota.distanciaKm.toLocaleString("pt-BR")} km · {rota.rotulo}
          </p>
          <p className="mt-1 text-sm text-tinta-media">
            Valores por trecho, só ida, em classe econômica.
          </p>

          <div className="my-4">
            <ArcoDaRota origem={rota.origem} destino={rota.destino} />
          </div>

          <div className="mb-4">
            <SeletorDeData valor={dataEscolhida} />
          </div>

          <IlhaDoVeredito
            origem={rota.origem.iata}
            destino={rota.destino.iata}
            dataEscolhida={dataEscolhida}
            fase={fase}
          >
            <HeroiDaRota
              veredito={veredito}
              fonte={preco.fonte}
              observacaoDaFonte={preco.observacao}
              origemIata={rota.origem.iata}
              destinoIata={rota.destino.iata}
              dataEscolhida={dataEscolhida}
              fase={fase}
            />
          </IlhaDoVeredito>

          {diasAteAViagem !== null ? (
            <div className="mt-4">
              <FaixaDaJornada fase={fase} diasAteAViagem={diasAteAViagem} />
            </div>
          ) : null}
        </div>
      </section>

      {melhorOrigemAlternativa ? (
        <p className="mt-3 text-sm leading-relaxed text-tinta-media">
          Saindo de{" "}
          <strong className="font-semibold text-tinta">
            {melhorOrigemAlternativa.aeroporto.cidade} (
            {melhorOrigemAlternativa.aeroporto.iata})
          </strong>{" "}
          em vez de {rota.origem.cidade}, a passagem sai por{" "}
          {reais(melhorOrigemAlternativa.precoBRL)} --{" "}
          {reais(melhorOrigemAlternativa.economiaBRL)} a menos.
        </p>
      ) : null}

      {/* 2. Quando ir, em que dia partir, com quanta antecedencia. */}
      <BlocoDeQuando
        sazonalidade={sazonalidade}
        fonteDaCurva={usaProprio ? "travelpayouts" : curvaDaApi.fonte}
        observacaoDaCurva={
          usaProprio
            ? "Montada a partir do nosso histórico próprio de preços desta rota."
            : curvaDaApi.observacao
        }
        calendario={calendario}
        rotaHref={`/rota/${rota.origem.iata}/${rota.destino.iata}`}
        rotaId={`${rota.origem.iata}-${rota.destino.iata}`}
        dataEscolhida={dataEscolhida}
        melhoresDatas={datas}
        medianaHistoricaBRL={referenciaBRL}
        janela={janela}
      />

      {/* 3. Como pagar: o vencedor expandido, os outros atras de details. */}
      <IlhaDeComoPagar origem={rota.origem.iata} destino={rota.destino.iata}>
        <ComoPagar veredito={veredito} />
      </IlhaDeComoPagar>

      {/* 4. CTA do objetivo. */}
      <section className="mt-6 painel rounded-[24px] p-5">
        <h2 className="display mb-1.5 text-xl">
          Ainda não tem as milhas para {rota.destino.cidade}?
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-painel-tinta-fraca">
          Transforme esta rota num objetivo. O app guarda o seu saldo de hoje
          como ponto de partida e passa a mostrar quanto você já andou, quanto
          falta e se no seu ritmo dá tempo.
        </p>
        <Link
          href={`/objetivos?destino=${rota.destino.iata}`}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-painel-tinta px-5 text-sm font-semibold text-painel"
        >
          Criar objetivo
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h13" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </section>
    </>
  );
}

function RotaNaoEncontrada({ iata }: { iata: string }) {
  return (
    <div className="rounded-2xl border border-borda bg-superficie p-5 shadow-card">
      <h1 className="text-lg font-semibold text-tinta">
        Não conheço o aeroporto {iata.toUpperCase()}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-tinta-media">
        Nossa base cobre todos os aeroportos do Brasil e os principais destinos
        internacionais. Tente buscar pelo nome da cidade.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-xl bg-marca px-4 py-2.5 text-sm font-medium text-marca-contraste"
      >
        Voltar para a busca
      </Link>
    </div>
  );
}

/**
 * As alturas aqui imitam as do conteudo final de proposito. Como a pagina
 * usa pre-renderizacao parcial, a casca aparece antes e o miolo chega em
 * seguida; um esqueleto de altura errada faz a tela pular na troca, o que
 * o Lighthouse mede como deslocamento de layout.
 */
function Esqueleto() {
  return (
    <div className="animate-pulse space-y-4" aria-label="Calculando">
      <div className="h-[30rem] rounded-[28px] bg-superficie-2" />
      <div className="h-48 rounded-2xl bg-superficie-2" />
      <div className="h-80 rounded-2xl bg-superficie-2" />
    </div>
  );
}
