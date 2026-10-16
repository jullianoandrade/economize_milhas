import Link from "next/link";
import type { CalendarioDePrecos as Calendario } from "@/lib/tempo/calendario";
import { DIAS_MINIMOS_PARA_MOSTRAR } from "@/lib/tempo/calendario";
import type { DataMaisBarata } from "@/lib/tempo/flexibilidade";
import { porcentagem, reais } from "@/lib/format";

/**
 * Preco por dia de partida, em faixa rolante.
 *
 * O formato responde antes de ser lido: quando a barra do sabado e o
 * dobro da barra da terca, a pessoa ja entendeu que a data importa mais
 * do que qualquer cupom.
 *
 * A altura da barra e a codificacao principal, e o preco vai escrito
 * embaixo de cada uma -- a cor so reforca. E o que mantem o grafico
 * legivel para quem nao distingue verde de cinza, e o que permite usar
 * uma unica cor de destaque em vez de um semaforo.
 */

const LARGURA_DA_COLUNA = "w-12";
const ALTURA_MAXIMA = 72;
const ALTURA_MINIMA = 6;

const DIAS_DA_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function emData(iso: string) {
  return new Date(`${iso}T12:00:00`);
}

function diaCurto(iso: string) {
  const d = emData(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function porExtenso(iso: string) {
  return emData(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function CalendarioDePrecos({
  calendario,
  rotaHref,
  dataEscolhida,
  melhoresDatas = [],
  medianaHistoricaBRL = 0,
}: {
  calendario: Calendario;
  /** Caminho da rota, para cada dia virar um link que marca a data. */
  rotaHref: string;
  dataEscolhida: string | null;
  /** Melhores dias do histórico INTEIRO, não só da janela de 45 dias acima. */
  melhoresDatas?: DataMaisBarata[];
  medianaHistoricaBRL?: number;
}) {
  // Poucos dias com preco nao formam curva. Melhor nao desenhar do que
  // desenhar quatro barras soltas e deixar a pessoa concluir qualquer
  // coisa a partir delas.
  if (calendario.diasComDado < DIAS_MINIMOS_PARA_MOSTRAR) return null;

  const teto = Math.max(calendario.maiorPrecoBRL, 1);
  const comDado = calendario.dias.filter((d) => d.precoBRL !== null);

  return (
    <section className="rounded-[24px] border border-borda bg-superficie p-4 shadow-card">
      <h2 className="display mb-1 text-xl text-tinta">Preço dia a dia</h2>
      <p className="mb-3 text-sm leading-relaxed text-tinta-media">
        O que já observamos para cada data de partida. Toque num dia para o
        app calcular a viagem com ele.
      </p>

      {calendario.maisBarato?.precoBRL != null ? (
        <p className="mb-3 rounded-xl bg-dinheiro-fundo px-3 py-2 text-sm leading-relaxed text-tinta">
          <strong className="font-semibold text-dinheiro">
            {porExtenso(calendario.maisBarato.dia)}
          </strong>{" "}
          é o dia mais barato da janela:{" "}
          <span className="tabular font-semibold">
            {reais(calendario.maisBarato.precoBRL)}
          </span>
          {calendario.maisBarato.diferencaBRL != null &&
          calendario.maisBarato.diferencaBRL < 0 ? (
            <>
              , {reais(Math.abs(calendario.maisBarato.diferencaBRL))} abaixo da
              mediana da rota
            </>
          ) : null}
          .
        </p>
      ) : null}

      <div className="faixa-rolante -mx-4 gap-1 px-4 pb-2">
        {comDado.map((d) => {
          const altura = Math.max(
            ALTURA_MINIMA,
            ((d.precoBRL ?? 0) / teto) * ALTURA_MAXIMA,
          );
          const escolhido = d.dia === dataEscolhida;
          const melhor = d.dia === calendario.maisBarato?.dia;

          return (
            <Link
              key={d.dia}
              href={`${rotaHref}?data=${d.dia}`}
              scroll={false}
              className={`${LARGURA_DA_COLUNA} flex shrink-0 flex-col items-center gap-1 rounded-2xl border px-1 py-2 transition-colors ${
                escolhido
                  ? "border-marca bg-marca-fraca"
                  : "border-transparent hover:bg-superficie-2"
              }`}
            >
              <span className="text-[10px] leading-none text-tinta-fraca">
                {DIAS_DA_SEMANA[emData(d.dia).getDay()]}
              </span>

              <span
                aria-hidden="true"
                className="flex items-end"
                style={{ height: ALTURA_MAXIMA }}
              >
                <span
                  className="block w-5 rounded-t-md"
                  style={{
                    height: altura,
                    background: melhor
                      ? "var(--color-grafico-dinheiro)"
                      : d.nivel === "barato"
                        ? "var(--color-marca)"
                        : "var(--color-grafico-neutro)",
                  }}
                />
              </span>

              <span className="tabular text-[11px] font-semibold leading-none text-tinta">
                {diaCurto(d.dia)}
              </span>
              {/* Sem aria-label: o nome acessivel e o proprio texto da
                  coluna mais este complemento, entao ele contem o que
                  esta escrito, na ordem em que esta escrito. Um
                  aria-label que reordenasse as partes quebraria o
                  comando de voz -- quem fala o que ve nao acharia o
                  alvo. */}
              <span className="tabular text-[10px] leading-none text-tinta-media">
                {(d.precoBRL ?? 0).toLocaleString("pt-BR", {
                  maximumFractionDigits: 0,
                })}
                <span className="sr-only"> reais</span>
              </span>
            </Link>
          );
        })}
      </div>

      <p className="mt-1 text-xs leading-relaxed text-tinta-fraca">
        Valores em reais, trecho de ida, do nosso histórico próprio de buscas.
        Mediana da janela: {reais(calendario.medianaBRL)}. Dias sem observação
        não aparecem.
      </p>

      {melhoresDatas.length > 0 ? (
        <div className="mt-4 border-t border-borda pt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tinta-fraca">
            Os dias mais baratos do nosso histórico
          </h3>
          <ul className="space-y-2">
            {melhoresDatas.map((d) => (
              <li
                key={d.partidaEm}
                className="flex items-baseline justify-between gap-3 border-t border-borda pt-2 first:border-0 first:pt-0"
              >
                <span className="text-sm text-tinta">
                  {porExtenso(d.partidaEm)}
                </span>
                <span className="tabular shrink-0 text-right">
                  <span className="block text-sm font-semibold text-tinta">
                    {reais(d.precoBRL)}
                  </span>
                  <span className="block text-[11px] text-dinheiro">
                    −{reais(d.economiaBRL)} ({porcentagem(d.economiaPct)})
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-tinta-fraca">
            Comparado com {reais(medianaHistoricaBRL)}, o preço mediano desta
            rota no nosso histórico inteiro -- a janela acima cobre só os
            próximos 45 dias.
          </p>
        </div>
      ) : null}
    </section>
  );
}
