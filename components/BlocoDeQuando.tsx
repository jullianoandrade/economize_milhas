import type { ReactNode } from "react";
import type { Sazonalidade } from "@/lib/tempo/sazonalidade";
import type {
  CalendarioDePrecos as Calendario,
} from "@/lib/tempo/calendario";
import { DIAS_MINIMOS_PARA_MOSTRAR } from "@/lib/tempo/calendario";
import type { DataMaisBarata } from "@/lib/tempo/flexibilidade";
import type { JanelaDeCompra } from "@/lib/tempo/antecedencia";
import type { Fonte } from "@/lib/providers/travelpayouts";
import { CurvaDeMeses } from "./CurvaDeMeses";
import { CalendarioDePrecos } from "./CalendarioDePrecos";
import { CardQuandoComprar } from "./CardQuandoComprar";

/**
 * Três granularidades da mesma pergunta -- "quando ir?" -- num acordeão
 * exclusivo nativo.
 *
 * <details name="quando"> faz o navegador fechar os outros ao abrir um,
 * sem uma linha de JavaScript e sem quebrar o shell de PPR: tudo aqui
 * continua Server Component. Resolve também a duplicação que existia
 * antes -- mês, dia e antecedência respondiam a mesma pergunta em três
 * lugares separados da página, em vez de juntos.
 */
export function BlocoDeQuando({
  sazonalidade,
  fonteDaCurva,
  observacaoDaCurva,
  calendario,
  rotaHref,
  dataEscolhida,
  melhoresDatas,
  medianaHistoricaBRL,
  janela,
}: {
  sazonalidade: Sazonalidade | null;
  fonteDaCurva: Fonte;
  observacaoDaCurva: string;
  calendario: Calendario;
  rotaHref: string;
  dataEscolhida: string | null;
  melhoresDatas: DataMaisBarata[];
  medianaHistoricaBRL: number;
  janela: JanelaDeCompra;
}) {
  // O primeiro item com dado de verdade abre por padrao. Sem isto, uma
  // rota sem sazonalidade calculada abriria com os tres fechados.
  const calendarioTemDado = calendario.diasComDado >= DIAS_MINIMOS_PARA_MOSTRAR;
  const abrirMes = sazonalidade !== null;
  const abrirDia = !abrirMes && calendarioTemDado;

  return (
    <section className="mt-4">
      <h2 className="display mb-2 text-xl text-tinta">Quando ir</h2>

      {sazonalidade ? (
        <ItemDoAcordeao
          titulo="Em que mês ir"
          subtitulo="A curva de preço e de rendimento de milhas ao longo do ano"
          aberto={abrirMes}
        >
          <CurvaDeMeses
            sazonalidade={sazonalidade}
            fonte={fonteDaCurva}
            observacaoDaFonte={observacaoDaCurva}
          />
        </ItemDoAcordeao>
      ) : null}

      <ItemDoAcordeao
        titulo="Em que dia partir"
        subtitulo="Preço por data de partida, e os melhores dias já vistos"
        aberto={abrirDia}
      >
        <CalendarioDePrecos
          calendario={calendario}
          rotaHref={rotaHref}
          dataEscolhida={dataEscolhida}
          melhoresDatas={melhoresDatas}
          medianaHistoricaBRL={medianaHistoricaBRL}
        />
      </ItemDoAcordeao>

      <ItemDoAcordeao
        titulo="Com quanta antecedência"
        subtitulo="A janela em que a passagem costuma ficar mais barata"
        aberto={!abrirMes && !abrirDia}
      >
        <CardQuandoComprar janela={janela} />
      </ItemDoAcordeao>
    </section>
  );
}

function ItemDoAcordeao({
  titulo,
  subtitulo,
  aberto,
  children,
}: {
  titulo: string;
  subtitulo: string;
  aberto: boolean;
  children: ReactNode;
}) {
  return (
    <details name="quando" open={aberto} className="group mb-3 last:mb-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-borda bg-superficie px-4 py-3 shadow-card [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block font-semibold text-tinta">{titulo}</span>
          <span className="block truncate text-xs text-tinta-media">
            {subtitulo}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-4 shrink-0 text-tinta-fraca transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
