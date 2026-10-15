"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ilustracao, type Cena } from "./Ilustracao";
import { PerguntaDoCartao } from "./PerguntaDoCartao";
import { usarPerfil } from "@/store/perfil";

/**
 * A entrada do app, em tres passos.
 *
 * Os tres passos existem na pagina o tempo todo, so que os inativos
 * ficam com o atributo `hidden`. Isso resolve duas coisas de uma vez: o
 * texto inteiro continua no HTML servido -- a pagina e indexavel, e quem
 * chega do buscador cai numa explicacao completa do produto -- e o
 * leitor de tela pula corretamente o que nao esta a vista, que e o que
 * `hidden` significa.
 *
 * Ao trocar de passo o foco vai para o titulo novo. Sem isso, quem
 * navega por teclado ou leitor de tela aperta "Proximo" e continua
 * ouvindo o passo anterior.
 */

type Passo = {
  cena: Cena;
  sobrelinha: string;
  titulo: string;
  texto: string;
  itens?: Array<{ titulo: string; texto: string }>;
  conteudo?: React.ReactNode;
  rodape?: React.ReactNode;
};

const PASSOS: Passo[] = [
  {
    cena: "viagem",
    sobrelinha: "O que é isto",
    titulo: "Viajar não precisa ser caro. Precisa ser calculado.",
    texto:
      "Você diz para onde quer ir. A gente mostra quanto a viagem custa em dinheiro, quanto custa em milhas e qual das duas vale mais — com o número na mão, não no achismo. Sem cadastro e sem custo.",
    itens: [
      {
        titulo: "Vale mais em milhas ou em dinheiro?",
        texto:
          "Comparamos o preço da passagem com o que suas milhas valeriam nela. Às vezes a resposta é guardar as milhas e pagar — e o app diz isso.",
      },
      {
        titulo: "Quando ir, e quando comprar",
        texto:
          "O mês mais barato do ano, o preço de cada dia de partida e a janela de antecedência que costuma sair melhor.",
      },
      {
        titulo: "Quanto falta para a viagem que você quer",
        texto:
          "Você marca um objetivo, o app guarda seu ponto de partida e acompanha o quanto você andou — e se nesse passo dá tempo.",
      },
    ],
  },
  {
    cena: "meta",
    sobrelinha: "Comece por você",
    titulo: "Você provavelmente já acumula milhas.",
    texto:
      "E talvez não saiba quantas. Sem isto, o app calcula com o custo de quem COMPRA milhas — um número que quase nunca é o seu, e que joga contra as milhas.",
    conteudo: <PerguntaDoCartao comBotao={false} />,
    rodape: (
      <span className="text-tinta-fraca">
        Fica só no seu aparelho. Não há cadastro, e você pode mudar depois.
      </span>
    ),
  },
  {
    cena: "transparencia",
    sobrelinha: "Nossa transparência",
    titulo: "Por que você pode conferir o que dizemos",
    texto:
      "Neste mercado o ativo escasso não é tecnologia nem dado — é confiança. Então aqui vão três regras, e como conferir cada uma.",
    itens: [
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
          "Clube quase sempre sai caro. Trecho doméstico barato quase nunca vale resgate. São as duas frases que mais nos custariam dinheiro, e estão no app.",
      },
    ],
    rodape: (
      <>
        <Link
          href="/como-nos-sustentamos"
          className="font-semibold text-marca underline underline-offset-4"
        >
          Ver de onde vem o nosso dinheiro
        </Link>
        <span className="mt-2 block text-tinta-fraca">
          Nada do que você preencher sai do seu aparelho: saldo, objetivos e
          cidade de origem ficam no navegador. Não há cadastro.
        </span>
      </>
    ),
  },
];

export function PassosDeBoasVindas() {
  const router = useRouter();
  const marcarVisita = usarPerfil((p) => p.marcarVisita);

  const [passo, setPasso] = useState(0);
  const titulos = useRef<Array<HTMLHeadingElement | null>>([]);

  const ultimo = passo === PASSOS.length - 1;

  function ir(destino: number) {
    setPasso(destino);
    // Em quadro, para o titulo ja estar visivel quando receber o foco.
    requestAnimationFrame(() => titulos.current[destino]?.focus());
  }

  function entrar() {
    marcarVisita();
    router.push("/");
  }

  return (
    <div className="flex min-h-[calc(100svh-6rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        {passo > 0 ? (
          <button
            type="button"
            onClick={() => ir(passo - 1)}
            className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-tinta-media hover:text-marca"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
            Voltar
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={entrar}
          className="rounded-full px-2 py-1 text-sm text-tinta-fraca hover:text-marca"
        >
          Pular
        </button>
      </div>

      {PASSOS.map((p, i) => (
        <section
          key={p.titulo}
          hidden={i !== passo}
          aria-label={`Passo ${i + 1} de ${PASSOS.length}`}
          className="flex-1"
        >
          <div className="mb-5 overflow-hidden painel rounded-[28px] px-6 py-5">
            <Ilustracao cena={p.cena} tom="claro" className="w-full" />
          </div>

          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-marca">
            {p.sobrelinha}
          </p>

          <h1
            ref={(el) => {
              titulos.current[i] = el;
            }}
            tabIndex={-1}
            className="display text-[26px] leading-[1.15] text-tinta outline-none"
          >
            {p.titulo}
          </h1>

          <p className="mt-2.5 text-[15px] leading-relaxed text-tinta-media">
            {p.texto}
          </p>

          {p.itens ? (
            <ul className="mt-4 space-y-3.5">
              {p.itens.map((item) => (
                <li
                  key={item.titulo}
                  className="border-t border-borda pt-3.5 first:border-0 first:pt-0"
                >
                  <h2 className="mb-1 flex items-start gap-2 font-semibold text-tinta">
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
                  </h2>
                  <p className="pl-7 text-sm leading-relaxed text-tinta-media">
                    {item.texto}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}

          {p.conteudo ? <div className="mt-5">{p.conteudo}</div> : null}

          {p.rodape ? (
            <p className="mt-5 text-sm leading-relaxed">{p.rodape}</p>
          ) : null}
        </section>
      ))}

      {/* Controles fixos no pe: a posicao do botao nao muda de um passo
          para o outro, entao o polegar nao precisa procurar. */}
      <div className="sticky bottom-0 mt-6 bg-fundo pb-4 pt-3">
        <div className="mb-4 flex items-center justify-center gap-2">
          {PASSOS.map((p, i) => (
            <button
              key={p.titulo}
              type="button"
              onClick={() => ir(i)}
              aria-label={`Ir para o passo ${i + 1} de ${PASSOS.length}`}
              aria-current={i === passo ? "step" : undefined}
              className="p-1.5"
            >
              <span
                className={`block h-2 rounded-full transition-all ${
                  i === passo ? "w-6 bg-marca" : "w-2 bg-borda"
                }`}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => (ultimo ? entrar() : ir(passo + 1))}
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-marca px-6 text-base font-semibold text-marca-contraste shadow-flutuante transition-colors hover:bg-marca-forte"
        >
          {ultimo ? "Começar" : "Próximo"}
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h13" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
