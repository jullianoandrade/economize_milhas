import type { Veredito } from "@/lib/milhas/veredito";
import { milhas as fmtMilhas, porcentagem, reais } from "@/lib/format";
import { SeloDeFonte, SeloDeMilhas } from "./SeloDeFonte";
import type { Fonte } from "@/lib/providers/travelpayouts";
import { SeloDeOrigem } from "@/components/ui/SeloDeOrigem";
import { diaEMes, frescorDoPreco, type PassagemVista } from "./passagem";

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
  passagem = null,
  dataEscolhida = null,
}: {
  veredito: Veredito;
  fonte: Fonte;
  observacaoDaFonte: string;
  passagem?: PassagemVista | null;
  dataEscolhida?: string | null;
}) {
  const melhor = veredito.melhor;
  // Um veredito, dito uma vez: a placa le `rotulo` e mais nada. O caso
  // "compensa, mas rende pouco" e dito AQUI, e nao numa caixa abaixo que
  // contradizia a placa.
  const rotulo = veredito.foraDoModelo ? null : veredito.rotulo;
  // Preco zero significa "nao sabemos": rota fora do modelo e sem busca
  // recente. Mostrar "R$ 0" seria pior do que nao mostrar nada. Ver
  // SEM_REFERENCIA em lib/precos.ts.
  const precoDesconhecido = veredito.precoDinheiroBRL <= 0;

  return (
    <section aria-label="A resposta">
      <div className="rounded-[22px] bg-white px-5 pb-5 pt-4 text-[#0b1526]">
        {rotulo === null ? (
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
        ) : rotulo === "resgatar" && melhor ? (
          <>
            <p className="text-[17px] font-semibold">Com milhas você economiza</p>
            <p className="tabular mt-0.5 text-[60px] font-bold leading-none tracking-[-0.045em] [font-variation-settings:'opsz'_96]">
              {reais(veredito.economiaBRL)}
            </p>
            <p className="mt-1.5 text-[15px] leading-snug">
              em relação a pagar em dinheiro ({porcentagem(veredito.economiaPct)} da
              passagem).
            </p>
          </>
        ) : (
          <>
            <p className="text-[17px] font-semibold">
              {rotulo === "guardar" ? "Pague em dinheiro e guarde as milhas" : "Pague em dinheiro"}
            </p>
            {precoDesconhecido ? (
              <p className="mt-2 text-[15px] leading-relaxed">
                Sem busca recente de preço para este trecho.
              </p>
            ) : (
              <p className="tabular mt-0.5 text-[52px] font-bold leading-none tracking-[-0.045em] [font-variation-settings:'opsz'_96]">
                {reais(veredito.precoDinheiroBRL)}
              </p>
            )}
            <p className="mt-1.5 text-[15px] leading-snug">
              {rotulo === "guardar" && melhor
                ? `Com milhas você economizaria só ${reais(veredito.economiaBRL)}. Elas rendem bem mais numa viagem cara.`
                : melhor
                  ? "Usar milhas aqui não compensa."
                  : "Nenhum programa da nossa base atende este trecho."}
            </p>
          </>
        )}
      </div>

      <ul className="mt-1">
        <li className="border-b border-borda py-3.5">
          <div className="flex items-baseline justify-between gap-3 text-tinta">
            <span className="text-[15px]">
              Em dinheiro
              {passagem ? <>, ida em {diaEMes(passagem.ida)}</> : null}
            </span>
            <strong className="tabular text-[17px] font-semibold">
              {precoDesconhecido ? "sem preço recente" : reais(veredito.precoDinheiroBRL)}
            </strong>
          </div>
          <div className="mt-2">
            {passagem && fonte === "travelpayouts" ? (
              <SeloDeOrigem
                origem={frescorDoPreco(passagem.vistoHaDias).origem}
                detalhe={observacaoDaFonte}
              >
                {frescorDoPreco(passagem.vistoHaDias).texto}
              </SeloDeOrigem>
            ) : (
              <SeloDeFonte fonte={fonte} observacao={observacaoDaFonte} />
            )}
          </div>
          {/* Data escolhida sem preco visto para ela: o numero acima e o
              mais barato da rota em outro dia, e a tela diz isso em vez
              de deixar parecer que e o daquele dia. */}
          {dataEscolhida && !passagem?.daDataEscolhida && !precoDesconhecido ? (
            <p className="mt-2 text-[13px] leading-snug text-tinta-media">
              Ainda não vimos preço para {diaEMes(dataEscolhida)}; este é o
              menor da rota em outro dia.
            </p>
          ) : null}
        </li>
        {melhor ? (
          <li className="border-b border-borda py-3.5">
            <div className="flex items-baseline justify-between gap-3 text-tinta">
              <span className="text-[15px]">Com {melhor.programa.unidade} {melhor.programa.nome}</span>
              <strong className="tabular text-[17px] font-semibold">
                {fmtMilhas(melhor.milhas)} + {reais(melhor.taxasBRL)}
              </strong>
            </div>
            <div className="mt-2">
              <SeloDeMilhas confianca={melhor.confianca} />
            </div>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
