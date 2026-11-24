import type { Veredito } from "@/lib/milhas/veredito";
import { milhas as fmtMilhas, porcentagem, reais } from "@/lib/format";
import { SeloDeOrigem } from "@/components/ui/SeloDeOrigem";
import { SeloDeConfianca, SeloDeFonte } from "./SeloDeFonte";
import type { Fonte } from "@/lib/providers/travelpayouts";

/**
 * A resposta, em uma olhada: a placa e as duas linhas que a sustentam.
 *
 * A PLACA e opaca e branca, sempre -- nunca vidro, nunca translucida. E o
 * numero que decide, e contraste de numero que decide nao pode depender
 * do que passa atras. Mesma placa da resposta do Explorar, para a
 * pessoa reconhecer a resposta nas duas telas.
 *
 * Embaixo, dinheiro e milhas, cada um com o selo de onde veio: o preco e
 * busca real (ou estimativa, quando nao houve busca), as milhas sao
 * sempre estimativa. A explicacao longa nao mora aqui: fica em "Por que
 * essa resposta?", fechado, no HeroiDaRota.
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
  const melhor = veredito.melhor;
  const usaMilhas =
    !veredito.foraDoModelo && veredito.recomendacao === "milhas" && melhor !== null;
  // Preco zero significa "nao sabemos": rota fora do modelo e sem busca
  // recente. Mostrar "R$ 0" seria pior do que nao mostrar nada. Ver
  // SEM_REFERENCIA em lib/precos.ts.
  const precoDesconhecido = veredito.precoDinheiroBRL <= 0;

  return (
    <section aria-label="A resposta">
      <div className="rounded-[22px] bg-white px-5 pb-5 pt-4 text-[#0b1526]">
        {veredito.foraDoModelo ? (
          // Fora do modelo nao e veredito, e ausencia declarada de
          // veredito: nada de "pague em dinheiro" aqui. Ver
          // docs/fronteira-do-motor.md.
          <>
            <p className="text-[17px] font-semibold">Ainda não comparamos milhas neste trecho</p>
            <p className="mt-2 text-[15px] leading-relaxed">
              Ele não passa pelo Brasil, e os programas que a VoeMilo acompanha
              não têm tabela para ele.
            </p>
          </>
        ) : usaMilhas ? (
          <>
            <p className="text-[17px] font-semibold">Vá de milhas e pague</p>
            <p className="tabular mt-0.5 text-[60px] font-bold leading-none tracking-[-0.045em] [font-variation-settings:'opsz'_96]">
              {reais(veredito.economiaBRL)}
            </p>
            <p className="mt-1.5 text-[15px]">
              a menos do que em dinheiro ({porcentagem(veredito.economiaPct)} da
              passagem).
            </p>
          </>
        ) : (
          <>
            <p className="text-[17px] font-semibold">Pague em dinheiro</p>
            {precoDesconhecido ? (
              <p className="mt-2 text-[15px] leading-relaxed">
                Sem busca recente de preço para este trecho.
              </p>
            ) : (
              <p className="tabular mt-0.5 text-[52px] font-bold leading-none tracking-[-0.045em] [font-variation-settings:'opsz'_96]">
                {reais(veredito.precoDinheiroBRL)}
              </p>
            )}
            <p className="mt-1.5 text-[15px]">
              {melhor ? "Usar milhas aqui não compensa." : "Nenhum programa da nossa base atende este trecho."}
            </p>
          </>
        )}
      </div>

      <ul className="mt-1">
        <li className="border-b border-borda py-3.5">
          <div className="flex items-baseline justify-between gap-3 text-tinta">
            <span className="text-[15px]">Em dinheiro</span>
            <strong className="tabular text-[17px] font-semibold">
              {precoDesconhecido ? "sem preço recente" : reais(veredito.precoDinheiroBRL)}
            </strong>
          </div>
          <div className="mt-2">
            <SeloDeFonte fonte={fonte} observacao={observacaoDaFonte} />
          </div>
        </li>
        {melhor ? (
          <li className="border-b border-borda py-3.5">
            <div className="flex items-baseline justify-between gap-3 text-tinta">
              <span className="text-[15px]">Com {melhor.programa.unidade} {melhor.programa.nome}</span>
              <strong className="tabular text-[17px] font-semibold">
                {fmtMilhas(melhor.milhas)} + {reais(melhor.taxasBRL)}
              </strong>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <SeloDeOrigem
                origem="estimado"
                detalhe="Os programas usam precificação dinâmica e não publicam tabela fixa. Confirme no site antes de resgatar."
              >
                estimativa, confirme antes
              </SeloDeOrigem>
              <SeloDeConfianca confianca={melhor.confianca} />
            </div>
          </li>
        ) : null}
      </ul>

      {veredito.ressalva ? (
        <p className="mt-3 flex gap-2 rounded-xl bg-superficie-2 p-3 text-sm leading-relaxed text-tinta-media">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-atencao" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
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
