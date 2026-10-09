import Link from "next/link";
import type { Metadata } from "next";
import { BotaoComecar } from "@/components/BotaoComecar";
import { Ilustracao } from "@/components/Ilustracao";

export const metadata: Metadata = {
  title: "O que este app faz",
  description:
    "Um direcionador de estratégia de viagem: quanto custa em dinheiro, quanto custa em milhas, qual das duas vale mais e em quanto tempo você junta o que falta.",
};

/**
 * A porta de entrada.
 *
 * Duas funcoes numa tela so. Para quem chega pela primeira vez, explica
 * o que o app faz e por que ele pode ser levado a serio -- e o segundo
 * ponto importa mais do que o primeiro num mercado onde o maior nome
 * quebrou devendo a 800 mil pessoas.
 *
 * Para quem chega pelo buscador, e uma pagina estatica, indexavel e
 * completa sobre o produto. Nada aqui depende de dado de runtime.
 */

const O_QUE_FAZ = [
  {
    titulo: "Vale mais em milhas ou em dinheiro?",
    texto:
      "Comparamos o preço da passagem com o que suas milhas valeriam nela. Às vezes a resposta é guardar as milhas e pagar — e o app diz isso.",
  },
  {
    titulo: "Quando ir, e quando comprar",
    texto:
      "O mês mais barato do ano e a janela de antecedência com melhor preço, a partir do histórico que coletamos todo dia.",
  },
  {
    titulo: "Quanto falta para a viagem que você quer",
    texto:
      "Você marca um objetivo, o app guarda seu ponto de partida e acompanha o quanto você andou — e se nesse passo dá tempo.",
  },
];

const TRANSPARENCIA = [
  {
    titulo: "O ranking não enxerga comissão",
    texto:
      "Não é promessa: o motor de cálculo é proibido por teste automático de ler qualquer dado comercial. Se alguém tentar, a publicação do app quebra.",
  },
  {
    titulo: "Todo número diz de onde veio",
    texto:
      "Preço de busca real, interpolado ou estimativa da nossa base — sempre com o selo ao lado. Estimativa disfarçada de cotação é mentira por omissão.",
  },
  {
    titulo: "Dizemos quando milhas são má ideia",
    texto:
      "Clube quase sempre sai caro. Trecho doméstico barato quase nunca vale resgate. São as duas frases que mais nos custariam dinheiro, e elas estão no app.",
  },
];

export default function BoasVindas() {
  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-[28px] bg-marca-forte px-6 pb-7 pt-6 text-white">
        <Ilustracao cena="viagem" tom="claro" className="mb-5 w-full" />

        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/70">
          Milhas
        </p>
        <h1 className="display text-[30px] leading-[1.12]">
          Viajar não precisa ser caro.
          <br />
          Precisa ser calculado.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/85">
          Você diz para onde quer ir. A gente mostra quanto custa das duas
          formas, qual delas vale mais e quanto tempo levaria para juntar as
          milhas que faltam.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="display mb-3 text-xl text-tinta">
          O que o app responde
        </h2>
        <ul className="space-y-3">
          {O_QUE_FAZ.map((item, i) => (
            <li
              key={item.titulo}
              className="rounded-2xl border border-borda bg-superficie p-4 shadow-card"
            >
              <div className="mb-1.5 flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-marca-fraca text-sm font-bold text-marca"
                >
                  {i + 1}
                </span>
                <h3 className="font-semibold text-tinta">{item.titulo}</h3>
              </div>
              <p className="text-sm leading-relaxed text-tinta-media">
                {item.texto}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-7 rounded-[28px] border border-borda bg-superficie p-5 shadow-card">
        <Ilustracao cena="transparencia" className="mb-3 w-full" />

        <h2 className="display mb-1 text-xl text-tinta">
          Nossa transparência com você
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-tinta-media">
          Neste mercado o ativo escasso não é tecnologia nem dado — é
          confiança. Então aqui vão as três regras que nos obrigamos a
          cumprir, e como você pode conferir cada uma.
        </p>

        <ul className="space-y-4">
          {TRANSPARENCIA.map((item) => (
            <li
              key={item.titulo}
              className="border-t border-borda pt-4 first:border-0 first:pt-0"
            >
              <h3 className="mb-1 flex items-start gap-2 font-semibold text-tinta">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-marca"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {item.titulo}
              </h3>
              <p className="pl-7 text-sm leading-relaxed text-tinta-media">
                {item.texto}
              </p>
            </li>
          ))}
        </ul>

        <Link
          href="/como-nos-sustentamos"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-marca underline underline-offset-4"
        >
          Ver de onde vem o nosso dinheiro
        </Link>
      </section>

      <div className="mb-4">
        <BotaoComecar rotulo="Começar" />
      </div>

      <p className="text-center text-xs leading-relaxed text-tinta-fraca">
        Nada do que você preencher sai do seu aparelho: saldo, objetivos e
        cidade de origem ficam no navegador. Não há cadastro.
      </p>
    </>
  );
}
