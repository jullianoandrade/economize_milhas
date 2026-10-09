import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { glossario } from "@/lib/dados";

export const metadata: Metadata = {
  title: "Aprender",
  description:
    "O vocabulário de milhas sem enrolação: custo por milheiro, transferência bonificada, taxa de embarque — e quando NÃO usar milhas.",
};

/**
 * A aba educativa.
 *
 * A seção mais importante vem primeiro e é a que nenhum site de milhas
 * costuma destacar: quando NÃO usar milhas. É o conteúdo que contraria o
 * interesse comercial de quem vende milhas, e por isso mesmo é o que
 * torna o resto confiável.
 */
export default function Aprender() {
  return (
    <>
      <Cabecalho
        titulo="Aprender"
        subtitulo="O vocabulário de milhas sem enrolação — e os erros que fazem você perder dinheiro."
      />

      <section className="mb-7">
        <h2 className="mb-1 text-lg font-semibold tracking-tight text-tinta">
          Quando NÃO usar milhas
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-tinta-media">
          A parte que quase ninguém conta. Milha é um ativo: gastar ela abaixo
          do que custou é prejuízo, mesmo parecendo economia.
        </p>

        <ul className="space-y-3">
          {glossario.quandoNaoUsarMilhas.map((item) => (
            <li
              key={item.titulo}
              className="rounded-2xl border border-milhas-borda bg-milhas-fundo p-4"
            >
              <h3 className="mb-1 text-sm font-semibold text-tinta">
                {item.titulo}
              </h3>
              <p className="text-sm leading-relaxed text-tinta-media">
                {item.explicacao}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold tracking-tight text-tinta">
          Glossário
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-tinta-media">
          Toque em qualquer termo para abrir a explicação completa.
        </p>

        <ul className="space-y-2">
          {glossario.termos.map((termo) => (
            <li key={termo.id}>
              <details
                id={termo.id}
                className="group rounded-2xl border border-borda bg-superficie shadow-card"
              >
                <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-tinta">{termo.termo}</h3>
                      <p className="mt-0.5 text-sm text-tinta-media">
                        {termo.resumo}
                      </p>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="mt-1 size-4 shrink-0 text-tinta-fraca transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </summary>

                <div className="border-t border-borda px-4 pb-4 pt-3">
                  <p className="text-sm leading-relaxed text-tinta-media">
                    {termo.explicacao}
                  </p>
                  {termo.exemplo ? (
                    <p className="mt-2 rounded-xl bg-superficie-2 p-3 text-sm leading-relaxed text-tinta-media">
                      <span className="font-medium text-tinta">Exemplo: </span>
                      {termo.exemplo}
                    </p>
                  ) : null}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-tinta-fraca">
        Base curada e revisada em{" "}
        {new Date(glossario.atualizadoEm + "T12:00:00").toLocaleDateString(
          "pt-BR",
          { day: "2-digit", month: "long", year: "numeric" },
        )}
        .
      </p>
    </>
  );
}
