import type { ReactNode } from "react";
import { termoPorId, type IdDeTermo } from "@/lib/glossario/termos";

/**
 * Explicacao sob demanda, sem JavaScript proprio.
 *
 * Usa a Popover API nativa (popoverTarget + popover): foco, Escape e
 * "light dismiss" vem de graca do navegador. Por isso o componente roda
 * em Server Component -- nenhuma das telas de calculo precisa virar
 * cliente so para mostrar uma explicacao.
 *
 * Estilizado como folha inferior, nao balao ancorado: dispensa CSS
 * anchor positioning (sem suporte no Firefox) e em mobile e o padrao
 * melhor de qualquer forma.
 */
export function Termo({
  id,
  chave,
  children,
}: {
  id: IdDeTermo;
  /**
   * Desambigua quando o MESMO termo aparece mais de uma vez na pagina --
   * um "cpm" por card de programa, por exemplo. Sem isto, dois
   * `popoverTarget` apontando para o mesmo id abririam o popover errado.
   */
  chave?: string;
  children: ReactNode;
}) {
  const termo = termoPorId(id);
  const alvo = chave ? `termo-${id}-${chave}` : `termo-${id}`;

  return (
    <>
      <button
        type="button"
        popoverTarget={alvo}
        className="underline decoration-dotted decoration-1 underline-offset-2"
      >
        {children}
      </button>

      <div
        popover="auto"
        id={alvo}
        /* Folha inferior no celular; no desktop, cartao centrado. Uma
           folha de ponta a ponta num monitor de 27" para explicar uma
           palavra seria desproporcional ao que ela diz. */
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[70vh] w-full overflow-y-auto rounded-t-[24px] border-x-0 border-b-0 border-t border-borda bg-superficie p-5 text-left shadow-card md:inset-0 md:m-auto md:h-fit md:max-w-lg md:rounded-[24px] md:border md:shadow-flutuante"
      >
        <h3 className="display mb-1 text-lg text-tinta">{termo.termo}</h3>
        <p className="mb-2 text-sm font-medium text-tinta-media">
          {termo.resumo}
        </p>
        <p className="text-sm leading-relaxed text-tinta-media">
          {termo.explicacao}
        </p>
        {termo.exemplo ? (
          <p className="mt-3 rounded-xl bg-superficie-2 p-3 text-sm leading-relaxed text-tinta-media">
            <span className="font-medium text-tinta">Exemplo: </span>
            {termo.exemplo}
          </p>
        ) : null}
      </div>
    </>
  );
}
