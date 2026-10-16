import type { Veredito } from "@/lib/milhas/veredito";
import { porcentagem, reais } from "@/lib/format";
import { SeloDeFonte } from "./SeloDeFonte";
import type { Fonte } from "@/lib/providers/travelpayouts";

/**
 * O card que responde a pergunta do app em uma olhada: milhas ou dinheiro,
 * e quanto isso vale em reais.
 *
 * A ressalva aparece quando o resgate compensa mas rende pouco. Mostrar
 * economia sem mostrar custo de oportunidade seria so metade da verdade.
 */
export function CardVeredito({
  veredito,
  fonte,
  observacaoDaFonte,
}: {
  veredito: Veredito;
  fonte: Fonte;
  observacaoDaFonte: string;
}) {
  const usaMilhas = veredito.recomendacao === "milhas";

  const tema = usaMilhas
    ? "border-milhas-borda bg-milhas-fundo"
    : "border-dinheiro-borda bg-dinheiro-fundo";
  const corDoTexto = usaMilhas ? "text-milhas" : "text-dinheiro";

  return (
    <section className={`rounded-2xl border p-5 ${tema}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`text-xs font-bold uppercase tracking-widest ${corDoTexto}`}
        >
          {usaMilhas ? "Use milhas" : "Pague em dinheiro"}
        </span>
        <SeloDeFonte fonte={fonte} observacao={observacaoDaFonte} />
      </div>

      {usaMilhas && veredito.economiaBRL > 0 ? (
        <p className="mb-3">
          <span className="block text-sm text-tinta-media">Você economiza</span>
          <span
            className={`tabular block text-4xl font-bold tracking-tight ${corDoTexto}`}
          >
            {reais(veredito.economiaBRL)}
          </span>
          <span className="block text-sm text-tinta-media">
            {porcentagem(veredito.economiaPct)} do valor da passagem, que sai
            por {reais(veredito.precoDinheiroBRL)}
          </span>
        </p>
      ) : (
        <p className="mb-3">
          <span className="block text-sm text-tinta-media">
            A passagem sai por
          </span>
          <span
            className={`tabular block text-4xl font-bold tracking-tight ${corDoTexto}`}
          >
            {reais(veredito.precoDinheiroBRL)}
          </span>
        </p>
      )}

      <p className="text-sm leading-relaxed text-tinta-media">
        {veredito.explicacao}
      </p>

      {veredito.ressalva ? (
        <p className="mt-3 flex gap-2 rounded-xl bg-superficie/70 p-3 text-sm leading-relaxed text-tinta-media">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-atencao"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5" />
            <path d="M12 16.5v.01" />
          </svg>
          <span>{veredito.ressalva}</span>
        </p>
      ) : null}
    </section>
  );
}
