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

  // Fora do modelo nao e veredito, e ausencia declarada de veredito --
  // por isso tema neutro, e nao o verde de "pague em dinheiro". Pintar
  // de verde faria a tela afirmar uma conclusao que o motor nao tem:
  // aqui ele nao comparou nada, so reconhece que a pergunta nao se
  // aplica. Ver docs/fronteira-do-motor.md.
  const tema = veredito.foraDoModelo
    ? "border-borda bg-superficie"
    : usaMilhas
      ? "border-milhas-borda bg-milhas-fundo"
      : "border-dinheiro-borda bg-dinheiro-fundo";
  const corDoTexto = veredito.foraDoModelo
    ? "text-tinta-media"
    : usaMilhas
      ? "text-milhas"
      : "text-dinheiro";

  const rotulo = veredito.foraDoModelo
    ? "Trecho fora dos programas brasileiros"
    : usaMilhas
      ? "Use milhas"
      : "Pague em dinheiro";

  // Preco zero significa "nao sabemos": rota fora do modelo e sem busca
  // recente na fonte. Mostrar "R$ 0" seria pior do que nao mostrar nada
  // -- o numero parece informacao. Ver SEM_REFERENCIA em lib/precos.ts.
  const precoDesconhecido = veredito.precoDinheiroBRL <= 0;
  const mostraEconomia = usaMilhas && veredito.economiaBRL > 0;

  return (
    <section className={`rounded-2xl border p-5 ${tema}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`text-xs font-bold uppercase tracking-widest ${corDoTexto}`}
        >
          {rotulo}
        </span>
        <SeloDeFonte fonte={fonte} observacao={observacaoDaFonte} />
      </div>

      {precoDesconhecido ? null : mostraEconomia ? (
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
