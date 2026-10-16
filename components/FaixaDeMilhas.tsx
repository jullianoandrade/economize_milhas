import { milhas as fmtMilhas } from "@/lib/format";
import { Termo } from "./Termo";

/**
 * O piso, o teto, e onde esta data cai entre os dois.
 *
 * E a essencia da precificacao dinamica, que o motor calculava e a tela
 * descartava. Um numero unico mente por omissao: esconde que a mesma
 * rota custa quase metade em promocao e quase o dobro na alta. E e
 * justamente essa distancia entre piso e teto que cria a oportunidade --
 * sem ela, o bloco "quando ir" nao teria razao de existir.
 *
 * So aparece quando ha faixa de verdade. Se piso e teto coincidem, a
 * tabela daquele trecho nao e dinamica e desenhar uma banda de largura
 * zero seria inventar variacao.
 */

/** Abaixo disto a faixa e estreita demais para dizer alguma coisa. */
const AMPLITUDE_MINIMA = 0.08;

export function FaixaDeMilhas({
  min,
  max,
  atual,
  unidade,
  chave,
}: {
  min: number;
  max: number;
  atual: number;
  unidade: string;
  /** Desambigua o popover quando ha mais de uma faixa na mesma pagina. */
  chave?: string;
}) {
  if (!(max > min) || (max - min) / max < AMPLITUDE_MINIMA) return null;

  // 0 a 1. O marcador tem 0,875rem e e centralizado; posicionar em
  // porcentagem crua deixaria metade dele fora da barra nos extremos, e
  // o extremo esquerdo e comum: tarifa baixa encosta no piso da tabela.
  const posicao = Math.max(0, Math.min(1, (atual - min) / (max - min)));

  return (
    <div>
      {/* div, nao p: o painel do Termo e um bloco, e um <p> fecharia
          sozinho ao encontra-lo, descasando a hidratacao. */}
      <div className="mb-1 text-[11px] font-medium text-tinta-fraca">
        <Termo id="precificacao-dinamica" chave={chave}>
          Faixa de preço desta tabela
        </Termo>
      </div>
      <div
        role="img"
        aria-label={`Nesta data, ${fmtMilhas(atual)} ${unidade}. Ao longo do ano esta rota varia de ${fmtMilhas(min)} a ${fmtMilhas(max)}.`}
        className="relative h-6"
      >
        <div className="absolute inset-x-0 top-2.5 h-1.5 rounded-full bg-gradient-to-r from-dinheiro-fundo via-superficie-2 to-milhas-fundo" />
        <span
          aria-hidden="true"
          className="entrada-do-marcador absolute top-1.5 size-3.5 -translate-x-1/2 rounded-full border-2 border-superficie bg-marca"
          style={{
            left: `calc(0.4375rem + ${posicao} * (100% - 0.875rem))`,
          }}
        />
      </div>

      <div className="tabular flex justify-between text-[10px] leading-none text-tinta-fraca">
        <span>{fmtMilhas(min)} em promoção</span>
        <span>{fmtMilhas(max)} na alta</span>
      </div>
    </div>
  );
}
