import type { Veredito } from "@/lib/milhas/veredito";
import { CardPrograma } from "./CardPrograma";

/**
 * O programa que o app escolheu, expandido; os outros, atrás de um
 * <details>.
 *
 * O app já ordenou por economiaBRL -- três cartões densos lado a lado
 * seriam ruído para quem não sabe escolher. Quem quer comparar continua
 * podendo, só não é o que a tela empurra primeiro.
 */
export function ComoPagar({ veredito }: { veredito: Veredito }) {
  if (veredito.opcoes.length === 0) return null;

  const [vencedor, ...outros] = veredito.opcoes;

  return (
    <section className="mt-4">
      <h2 className="display mb-1 text-xl text-tinta">Como pagar</h2>
      <p className="mb-3 text-sm leading-relaxed text-tinta-media">
        Quantidades estimadas: os programas usam precificação dinâmica e não
        publicam tabela fixa. Confirme no site antes de resgatar.
      </p>

      <CardPrograma opcao={vencedor} destaque />

      {outros.length > 0 ? (
        <details className="group mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-marca underline underline-offset-4 [&::-webkit-details-marker]:hidden">
            Ver outros {outros.length}{" "}
            {outros.length === 1 ? "programa" : "programas"}
          </summary>
          <div className="mt-3 space-y-3">
            {outros.map((opcao) => (
              <CardPrograma key={opcao.programa.id} opcao={opcao} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
