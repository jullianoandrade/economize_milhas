import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { FaixaDaJornada } from "./_componentes/FaixaDaJornada";
import { RegistrarInteresse } from "./_componentes/RegistrarInteresse";
import { SeletorDeData } from "./_componentes/SeletorDeData";
import { ArcoDaRota } from "./_componentes/ArcoDaRota";
import { HeroiDaRota } from "./_componentes/HeroiDaRota";
import { ComoPagar } from "./_componentes/ComoPagar";
import { IlhaDoVeredito } from "./_componentes/IlhaDoVeredito";
import { IlhaDeComoPagar } from "./_componentes/IlhaDeComoPagar";
import { BlocoDeQuando } from "./_componentes/BlocoDeQuando";
import { curvaMensal, precoDoTrecho } from "@/lib/precos";
import {
  curvaDeAntecedenciaDaRota,
  precosPorDataDaRota,
  precosMensaisDaRota,
} from "@/lib/historico";
import { precosDasAlternativas } from "@/lib/alternativas";
import { bonusVigentes } from "@/lib/transferencias";
import { heuristicasTempo } from "@/lib/dados";
import { reais } from "@/lib/format";
import {
  AeroportoDesconhecidoError,
  aeroportoPorIata,
  classificarRota,
} from "@/lib/milhas/regioes";
import { calcularVeredito } from "@/lib/milhas/veredito";
import rotasDestaque from "@/data/rotas-destaque.json";
import { janelaDeCompraDaCurva } from "@/lib/tempo/antecedencia";
import { calcularSazonalidade } from "@/lib/tempo/sazonalidade";
import {
  compararOrigens,
  datasMaisBaratasDeAgregado,
} from "@/lib/tempo/flexibilidade";
import { montarCalendarioDeAgregado } from "@/lib/tempo/calendario";
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
  const trecho =
    o && d
      ? `${o.cidade} para ${d.cidade}`
      : `${origem.toUpperCase()} para ${destino.toUpperCase()}`;

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
  "--tinta": "#eef2f9",
  "--tinta-media": "#b4bfd4",
  "--tinta-fraca": "#8f9bb5",
  "--superficie": "#111e35",
  "--superficie-2": "#17263f",
  "--borda": "#24365a",
  // A acao do heroi e branca, como a do painel e a do Explorar: o mesmo
  // botao para a mesma decisao nas duas telas.
  "--marca": "#ffffff",
  "--marca-forte": "#dfe6f5",
  "--marca-contraste": "#0b1526",
  "--marca-fraca": "#17263f",
  "--milhas": "#ffb020",
  "--milhas-fundo": "#2a2110",
  "--milhas-borda": "#5a4310",
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
    typeof consulta.data === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(consulta.data)
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

  // O bonus de transferencia vigente muda o custo da milha e, com ele,
  // o veredito: 100% de bonus corta o CPM pela metade. Buscado junto do
  // preco porque um sem o outro da resposta errada.
  const [preco, bonus] = await Promise.all([
    precoDoTrecho(rota),
    bonusVigentes(),
  ]);
  const veredito = calcularVeredito(rota, preco.dados, {
    bonusVigentes: bonus,
  });

  // As tres consultas sao independentes: em serie, a pagina esperaria a
  // soma delas em vez do maior tempo entre elas.
  const [curvaDaApi, mensaisProprios, curvaPropria, porData, alternativas] =
    await Promise.all([
      curvaMensal(rota, heuristicasTempo.sazonalidadeBrasil.indicePorMes),
      precosMensaisDaRota(rota.origem.iata, rota.destino.iata),
      curvaDeAntecedenciaDaRota(rota.origem.iata, rota.destino.iata),
      precosPorDataDaRota(rota.origem.iata, rota.destino.iata),
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

  // A curva agregada no banco cobre o historico INTEIRO da rota; a
  // leitura de linha crua cobre as 1.000 linhas que o PostgREST deixa
  // passar, numa fatia que nao preserva a distribuicao por faixa. Com
  // 74.778 observacoes acumuladas, a diferenca entre as duas decidia se
  // a pagina mostrava a nossa curva ou a heuristica de mercado -- em 15
  // das 20 rotas monitoradas, mostrava a heuristica.
  //
  // A degradacao para linha crua mora dentro de
  // curvaDeAntecedenciaDaRota: banco sem a migration de agregados
  // responde 404 no RPC e a pagina se comporta como antes.
  const janela = janelaDeCompraDaCurva(
    rota.internacional,
    diasAteAViagem,
    curvaPropria.curva,
    curvaPropria.observacoes,
  );

  // Agregado no banco sobre o historico inteiro. A leitura de linha
  // crua sobrevive dentro de precosPorDataDaRota, como degradacao.
  const { referenciaBRL, datas } = datasMaisBaratasDeAgregado(
    porData.dados,
    porData.medianaDaRotaBRL,
  );
  const outrasOrigens = compararOrigens(rota.origem, preco.dados, alternativas);
  const calendario = montarCalendarioDeAgregado(porData.dados, new Date());
  const fase = faseDaJornada(diasAteAViagem);
  const melhorOrigemAlternativa = outrasOrigens[0] ?? null;

  return (
    /* Em telas grandes a tela vira duas colunas: a RESPOSTA a esquerda,
       os detalhes a direita. O painel da resposta era grudado (sticky)
       com altura limitada a tela; saiu em 18/11/2026, quando a resposta
       ganhou "Guardar como objetivo" e "Por que essa resposta?" -- com a
       altura limitada, os dois ficavam escondidos numa rolagem interna
       que ninguem percebe. Abaixo de `lg` a ordem empilhada e a mesma. */
    <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
      {/* Nao desenha nada: avisa o servidor que esta rota foi olhada,
          para que o uso real decida o que entra na coleta diaria. */}
      <RegistrarInteresse
        origem={rota.origem.iata}
        destino={rota.destino.iata}
      />
      {/* 1. O heroi -- "a resposta". Um unico painel escuro: o veredito,
          a regua, a faixa de precificacao dinamica, o arco da rota, o
          ceu do destino e o que fazer a respeito. */}
      {/* O heroi e um painel marinho chapado. Ate 17/11/2026 era uma
          "janela de cabine" (moldura eliptica, reflexo de vidro, ceu com
          estrelas atras); saiu na identidade VoeMilo, que pede fintech
          e nao decoracao. Ficou o que carrega informacao: o arco da
          rota com o aviao, que mostra origem, destino e distancia. */}
      <section
        className="gradiente-marca relative overflow-hidden rounded-[28px] border border-painel-borda p-5"
        style={TEMA_DO_HEROI}
      >
        <div className="relative">
          <div className="relative">
          <Link
            href="/explorar"
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

          <h1 className="display text-[26px] leading-tight text-tinta">
            {rota.origem.cidade} → {rota.destino.cidade}
          </h1>
          <p className="tabular mt-1 text-sm text-tinta-media">
            {rota.distanciaKm.toLocaleString("pt-BR")} km, só ida, classe
            econômica. {rota.rotulo}.
          </p>

          <div className="mt-4">
            <ArcoDaRota origem={rota.origem} destino={rota.destino} />
          </div>
          </div>
        </div>

        <div className="relative mt-4">

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

      {/* A coluna que rola: tudo que detalha a resposta ao lado. */}
      <div className="min-w-0">
        {melhorOrigemAlternativa ? (
          <p className="mt-3 text-sm leading-relaxed text-tinta-media lg:mt-0">
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

        {/* O convite para virar objetivo foi para junto da resposta, no
            heroi (HeroiDaRota): e ali que a pessoa decide. */}
      </div>
    </div>
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
        href="/explorar"
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
