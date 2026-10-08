import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { CardPrograma } from "@/components/CardPrograma";
import { CardVeredito } from "@/components/CardVeredito";
import { precoDoTrecho } from "@/lib/precos";
import { AeroportoDesconhecidoError, classificarRota } from "@/lib/milhas/regioes";
import { calcularVeredito } from "@/lib/milhas/veredito";

export async function generateMetadata({
  params,
}: PageProps<"/rota/[origem]/[destino]">): Promise<Metadata> {
  const { origem, destino } = await params;
  return { title: `${origem.toUpperCase()} para ${destino.toUpperCase()}` };
}

export default function PaginaDaRota({
  params,
}: PageProps<"/rota/[origem]/[destino]">) {
  // params NAO e aguardado aqui de proposito. Com Cache Components
  // ligado, tocar em dado dinamico fora de um <Suspense> impede o Next
  // de pre-renderizar a casca da pagina, e a pessoa fica olhando tela
  // branca ate o calculo terminar. Passando a promessa adiante, a casca
  // sai na hora e so o miolo espera.
  return (
    <Suspense fallback={<Esqueleto />}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({
  params,
}: {
  params: PageProps<"/rota/[origem]/[destino]">["params"];
}) {
  const { origem, destino } = await params;

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

      <CardVeredito
        veredito={veredito}
        fonte={preco.fonte}
        observacaoDaFonte={preco.observacao}
      />

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

      <ProximasFases />
    </>
  );
}

function ProximasFases() {
  return (
    <section className="mt-6 rounded-2xl border border-dashed border-borda bg-superficie-2 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-tinta-fraca">
        Fase 6
      </p>
      <p className="mt-2 text-sm leading-relaxed text-tinta-media">
        Ainda vêm nesta tela: a curva de preço dos 12 meses com o mês em que a
        milha rende mais, a janela ideal de compra e o ganho por mudar a data
        ou o aeroporto de saída.
      </p>
    </section>
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

function Esqueleto() {
  return (
    <div className="animate-pulse space-y-4" aria-label="Calculando">
      <div className="h-6 w-2/3 rounded-lg bg-superficie-2" />
      <div className="h-44 rounded-2xl bg-superficie-2" />
      <div className="h-36 rounded-2xl bg-superficie-2" />
      <div className="h-36 rounded-2xl bg-superficie-2" />
    </div>
  );
}
