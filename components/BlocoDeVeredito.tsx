import type { Veredito } from "@/lib/milhas/veredito";
import type { Fonte } from "@/lib/providers/travelpayouts";
import type { FaseDaJornada } from "@/lib/monetizacao/jornada";
import { CardVeredito } from "./CardVeredito";
import { CardPrograma } from "./CardPrograma";
import { AcoesDaRota } from "./AcoesDaRota";

/**
 * O veredito, o detalhamento por programa e o que fazer a respeito,
 * juntos.
 *
 * Extraido para ter um unico JSX renderizado duas vezes: uma no servidor,
 * com o CPM de mercado; outra dentro de IlhaDoVeredito, no cliente, quando
 * o CPM da propria pessoa chega depois da hidratacao. AcoesDaRota precisa
 * estar aqui dentro, e nao solta na pagina, para que o botao de resgate
 * sempre aponte para o programa do veredito que esta de fato na tela --
 * se ficasse fora, continuaria mostrando o programa de mercado mesmo
 * depois da ilha trocar para o veredito pessoal.
 */
export function BlocoDeVeredito({
  veredito,
  fonte,
  observacaoDaFonte,
  origemIata,
  destinoIata,
  dataEscolhida,
  fase,
}: {
  veredito: Veredito;
  fonte: Fonte;
  observacaoDaFonte: string;
  origemIata: string;
  destinoIata: string;
  dataEscolhida: string | null;
  fase: FaseDaJornada;
}) {
  return (
    <>
      <CardVeredito
        veredito={veredito}
        fonte={fonte}
        observacaoDaFonte={observacaoDaFonte}
      />

      <AcoesDaRota
        veredito={veredito}
        origemIata={origemIata}
        destinoIata={destinoIata}
        dataEscolhida={dataEscolhida}
        fase={fase}
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
    </>
  );
}
