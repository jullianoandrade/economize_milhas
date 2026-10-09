import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { monetizacaoAtiva } from "@/lib/monetizacao/links";
import { parceiros } from "@/lib/monetizacao/parceiros";

export const metadata: Metadata = { title: "Como nos sustentamos" };

const ROTULO_DO_TIPO: Record<string, string> = {
  voo: "Passagens",
  hotel: "Hospedagem",
  cartao: "Cartões de crédito",
  seguro: "Seguro viagem",
  esim: "Chip internacional",
  cambio: "Câmbio e conta global",
};

export default function ComoNosSustentamos() {
  const ativa = monetizacaoAtiva();

  return (
    <>
      <Cabecalho
        titulo="Como nos sustentamos"
        subtitulo="Nosso ranking nunca considera quanto ganhamos."
      />

      <section className="mb-5 rounded-2xl border border-borda bg-superficie p-5 shadow-card">
        <h2 className="mb-2 font-semibold text-tinta">
          A regra, e como ela é garantida
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-tinta-media">
          Os dados de produto — quantos pontos cada cartão dá, quanto custa cada
          clube, quantas milhas um trecho custa — ficam em arquivos separados
          dos dados comerciais. O motor que calcula os vereditos e ordena as
          recomendações lê apenas os primeiros.
        </p>
        <p className="text-sm leading-relaxed text-tinta-media">
          Isso não é uma promessa de boa conduta: é uma restrição no código. Um
          teste automático quebra a publicação do app se qualquer parte do motor
          passar a enxergar valores de comissão, inclusive por caminho
          indireto. Ou seja, nem nós conseguimos distorcer o ranking sem o
          sistema recusar.
        </p>
      </section>

      <section className="mb-5 rounded-2xl border border-borda bg-superficie p-5 shadow-card">
        <h2 className="mb-2 font-semibold text-tinta">
          O que isso significa na prática
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-tinta-media">
          <li>
            Quando o app diz para <strong className="text-tinta">pagar em
            dinheiro</strong>, ele está recusando a recomendação que daria
            comissão.
          </li>
          <li>
            Um cartão sem anuidade aparece na frente de um cartão caro mesmo
            quando o caro pagaria mais. Se não sabemos a anuidade de um cartão,
            dizemos isso em vez de tratá-la como zero.
          </li>
          <li>
            Clube de milhas quase sempre sai caro, e o app diz isso — mesmo
            sendo um produto de assinatura recorrente.
          </li>
        </ul>
      </section>

      <section className="mb-5 rounded-2xl border border-borda bg-superficie p-5 shadow-card">
        <h2 className="mb-1 font-semibold text-tinta">
          {ativa ? "Onde ganhamos comissão" : "Onde ganharíamos comissão"}
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-tinta-media">
          {ativa
            ? "Se você contratar por um destes caminhos, parte do valor vem para nós. O preço para você é o mesmo."
            : "A monetização está desligada neste momento: nenhum link do app leva comissão. Esta lista mostra o que existiria se fosse ligada."}
        </p>
        <ul className="divide-y divide-borda text-sm">
          {parceiros.map((p) => (
            <li key={p.id} className="flex justify-between gap-3 py-2">
              <span className="text-tinta">{ROTULO_DO_TIPO[p.tipo] ?? p.tipo}</span>
              <span className="tabular shrink-0 text-tinta-media">
                {p.comissao.max === 0
                  ? "a definir"
                  : p.comissao.modelo === "cpa"
                    ? `R$ ${p.comissao.min}–${p.comissao.max} por contratação`
                    : `${p.comissao.min}–${p.comissao.max}% do valor`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-borda bg-superficie-2 p-5">
        <h2 className="mb-2 font-semibold text-tinta">Por que contamos isso</h2>
        <p className="text-sm leading-relaxed text-tinta-media">
          Porque o nicho de milhas no Brasil está cheio de site que ordena
          cartão por comissão sem avisar, e o público já desconfia — com razão.
          Preferimos que você saiba exatamente de onde vem o nosso dinheiro e
          possa conferir que ele não influencia o que recomendamos.
        </p>
      </section>
    </>
  );
}
