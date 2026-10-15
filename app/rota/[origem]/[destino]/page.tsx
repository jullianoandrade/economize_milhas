import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { CardPrograma } from "@/components/CardPrograma";
import { CalendarioDePrecos } from "@/components/CalendarioDePrecos";
import { CardFlexibilidade } from "@/components/CardFlexibilidade";
import { FaixaDaJornada } from "@/components/FaixaDaJornada";
import { SeletorDeData } from "@/components/SeletorDeData";
import { CardQuandoComprar } from "@/components/CardQuandoComprar";
import { CardVeredito } from "@/components/CardVeredito";
import { CurvaDeMeses } from "@/components/CurvaDeMeses";
import { curvaMensal, precoDoTrecho } from "@/lib/precos";
import {
  observacoesDaRota,
  observacoesDatadasDaRota,
  precosMensaisDaRota,
} from "@/lib/historico";
import { precosDasAlternativas } from "@/lib/alternativas";
import { heuristicasTempo } from "@/lib/dados";
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

  return (
    <>
      <header className="mb-5">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1 text-sm text-tinta-media transition-colors hover:text-marca"
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

        <h1 className="text-2xl font-semibold tracking-tight text-tinta">
          {rota.origem.cidade} → {rota.destino.cidade}
        </h1>
        <p className="tabular mt-1 text-sm text-tinta-media">
          {rota.origem.iata} · {rota.destino.iata} ·{" "}
          {rota.distanciaKm.toLocaleString("pt-BR")} km · {rota.rotulo}
        </p>
        <p className="mt-1 text-xs text-tinta-fraca">
          Valores por trecho, só ida, em classe econômica.
        </p>
      </header>

      <div className="mb-4">
        <SeletorDeData valor={dataEscolhida} />
      </div>

      {diasAteAViagem !== null ? (
        <div className="mb-4">
          <FaixaDaJornada
            fase={faseDaJornada(diasAteAViagem)}
            diasAteAViagem={diasAteAViagem}
          />
        </div>
      ) : null}

      <CardVeredito
        veredito={veredito}
        fonte={preco.fonte}
        observacaoDaFonte={preco.observacao}
      />

      <div className="mt-4">
        <CalendarioDePrecos
          calendario={calendario}
          rotaHref={`/rota/${rota.origem.iata}/${rota.destino.iata}`}
          dataEscolhida={dataEscolhida}
        />
      </div>

      {sazonalidade ? (
        <div className="mt-4">
          <CurvaDeMeses
            sazonalidade={sazonalidade}
            fonte={usaProprio ? "travelpayouts" : curvaDaApi.fonte}
            observacaoDaFonte={
              usaProprio
                ? "Montada a partir do nosso histórico próprio de preços desta rota."
                : curvaDaApi.observacao
            }
          />
        </div>
      ) : null}

      <div className="mt-4">
        <CardQuandoComprar janela={janela} />
      </div>

      <div className="mt-4">
        <CardFlexibilidade
          datas={datas}
          referenciaBRL={referenciaBRL}
          alternativas={outrasOrigens}
        />
      </div>

      {veredito.opcoes.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-1 text-lg font-semibold tracking-tight text-tinta">
            Por programa
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-tinta-media">
            Quantidades estimadas: os programas usam precificação dinâmica e
            não publicam tabela fixa. Confirme no site antes de resgatar.
          </p>

          <div className="space-y-3">
            {veredito.opcoes.map((opcao, indice) => (
              <CardPrograma
                key={opcao.programa.id}
                opcao={opcao}
                destaque={indice === 0}
              />
            ))}
          </div>
        </section>
      ) : null}

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
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-superficie-2" />
        <div className="h-8 w-2/3 rounded-lg bg-superficie-2" />
        <div className="h-4 w-1/2 rounded bg-superficie-2" />
      </div>
      <div className="h-64 rounded-2xl bg-superficie-2" />
      <div className="h-96 rounded-2xl bg-superficie-2" />
      <div className="h-80 rounded-2xl bg-superficie-2" />
    </div>
  );
}
