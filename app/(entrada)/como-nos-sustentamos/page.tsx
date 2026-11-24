import type { Metadata } from "next";
import { Cabecalho } from "@/components/casca/Cabecalho";
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

/** 1.1 vira "1,1": a tela e em portugues, a virgula tambem. */
function porcentagem(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

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
          A separação está no próprio código: um teste automático impede a
          publicação do app se qualquer parte do motor enxergar valores de
          comissão, mesmo por caminho indireto. Por isso a primeira
          recomendação é sempre a melhor para o seu bolso.
        </p>
      </section>

      <section className="mb-5 rounded-2xl border border-borda bg-superficie p-5 shadow-card">
        <h2 className="mb-2 font-semibold text-tinta">
          O que isso significa na prática
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-tinta-media">
          <li>
            Quando <strong className="text-tinta">pagar em dinheiro</strong>{" "}
            sai melhor, o app diz isso, e suas milhas ficam guardadas para um
            resgate que valha a pena.
          </li>
          <li>
            Cartões aparecem na ordem do que rendem para o seu gasto. Se não
            sabemos a anuidade de um cartão, dizemos isso em vez de tratá-la
            como zero.
          </li>
          <li>
            Clube de milhas só aparece como boa ideia quando a conta fecha
            para você, e o app mostra a conta.
          </li>
        </ul>
      </section>

      <section className="mb-5 rounded-2xl border border-borda bg-superficie p-5 shadow-card">
        <h2 className="mb-1 font-semibold text-tinta">
          {ativa ? "Onde ganhamos comissão" : "Onde ganharíamos comissão"}
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-tinta-media">
          {ativa
            ? "Quando você contrata por um destes caminhos, o parceiro nos paga uma parte, e você paga o mesmo preço. É isso que mantém o app gratuito."
            : "Hoje nenhum link do app gera comissão. Esta lista mostra como o app vai se sustentar quando a monetização for ligada, sem mudar o preço para você."}
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
                    : `${porcentagem(p.comissao.min)}–${porcentagem(p.comissao.max)}% do valor`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-borda bg-superficie-2 p-5">
        <h2 className="mb-2 font-semibold text-tinta">Por que contamos isso</h2>
        <p className="text-sm leading-relaxed text-tinta-media">
          Porque recomendação boa é a que você pode conferir. Você vê de onde
          vem o nosso dinheiro, e o ranking continua sendo feito só com o que
          importa para você: preço, milhas e o valor de cada resgate.
        </p>
      </section>
    </>
  );
}
