import type { Veredito } from "@/lib/milhas/veredito";
import type { Fonte } from "@/lib/providers/travelpayouts";
import { CardVeredito } from "./CardVeredito";
import { CardPrograma } from "./CardPrograma";

/**
 * O veredito e o detalhamento por programa, juntos.
 *
 * Extraido para ter um unico JSX renderizado duas vezes: uma no servidor,
 * com o CPM de mercado; outra dentro de IlhaDoVeredito, no cliente, quando
 * o CPM da propria pessoa chega depois da hidratacao.
 */
export function BlocoDeVeredito({
  veredito,
  fonte,
  observacaoDaFonte,
}: {
  veredito: Veredito;
  fonte: Fonte;
  observacaoDaFonte: string;
}) {
  return (
    <>
      <CardVeredito
        veredito={veredito}
        fonte={fonte}
        observacaoDaFonte={observacaoDaFonte}
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
