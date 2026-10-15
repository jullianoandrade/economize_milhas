import type { Qualidade } from "@/lib/milhas/veredito";
import { reaisExatos } from "@/lib/format";

/**
 * A tese do app em uma imagem.
 *
 * O cartao de programa mostra tres valores em reais e exige que a pessoa
 * faca uma divisao de cabeca para saber se o resgate presta. A regua faz
 * essa divisao virar POSICAO -- e, porque tem uma linha de corte
 * explicita no 1,0, ela tambem ensina: a esquerda voce gasta mais do que
 * recebe, a direita cada milha compra mais do que custou.
 *
 * Nenhuma informacao depende de cor. A posicao e a codificacao
 * principal, a razao vai escrita por extenso, e o rotulo de qualidade
 * continua em texto ao lado.
 */

/** Teto da escala. Acima disso o marcador para na ponta e o texto avisa. */
const TETO = 3;

/** As mesmas fronteiras de FAIXAS em lib/milhas/veredito.ts. */
const CORTES = [1, 1.4, 2] as const;

const COR_POR_QUALIDADE: Record<Qualidade, string> = {
  excelente: "var(--color-grafico-dinheiro)",
  bom: "var(--color-grafico-dinheiro)",
  regular: "var(--color-marca)",
  ruim: "var(--color-alerta)",
};

function posicaoPct(razao: number): number {
  return Math.max(0, Math.min(100, (razao / TETO) * 100));
}

/**
 * Posicao do marcador dentro da barra, e nao sobre a borda dela.
 *
 * O marcador tem 0,875rem e e centralizado; em 0% ou 100% metade dele
 * ficaria para fora. Os extremos sao comuns aqui -- resgate ruim encosta
 * no zero, milha de graca encosta no teto.
 */
function esquerdaDoMarcador(fracao: number): string {
  return `calc(0.4375rem + ${Math.max(0, Math.min(1, fracao))} * (100% - 0.875rem))`;
}

export function ReguaDoResgate({
  razao,
  qualidade,
  cpmBRL,
  valorExtraidoPorMilheiroBRL,
}: {
  razao: number;
  qualidade: Qualidade;
  cpmBRL: number;
  valorExtraidoPorMilheiroBRL: number;
}) {
  // Milha de graca existe de verdade: cartao sem anuidade leva o CPM a
  // zero, e dividir por zero da Infinity. Nao e borda rara -- e o caso
  // mais comum de quem usa cartao isento. Merece a propria frase, porque
  // "infinitas vezes melhor" nao e uma regua, e um erro de leitura.
  const milhaDeGraca = !Number.isFinite(razao);
  const acimaDoTeto = !milhaDeGraca && razao > TETO;

  const descricao = milhaDeGraca
    ? `Suas milhas não custam nada no seu nível de gasto, e este resgate extrai ${reaisExatos(valorExtraidoPorMilheiroBRL)} por milheiro.`
    : `Cada milha compra ${razao.toFixed(2).replace(".", ",")} vezes o que ela custou a você. Custo ${reaisExatos(cpmBRL)}, valor ${reaisExatos(valorExtraidoPorMilheiroBRL)} por milheiro.`;

  return (
    <div>
      <div
        role="img"
        aria-label={descricao}
        className="relative h-9 select-none"
      >
        {/* Trilho. As zonas sao sutis de proposito: quem decide e a
            posicao do marcador, nao o fundo. */}
        <div className="absolute inset-x-0 top-3 flex h-3 overflow-hidden rounded-full">
          <span
            className="h-full bg-alerta-fundo"
            style={{ width: `${posicaoPct(CORTES[0])}%` }}
          />
          <span
            className="h-full bg-superficie-2"
            style={{
              width: `${posicaoPct(CORTES[2]) - posicaoPct(CORTES[0])}%`,
            }}
          />
          <span className="h-full flex-1 bg-dinheiro-fundo" />
        </div>

        {/* O ponto de equilibrio. E a unica marca rotulada do trilho
            porque e a unica que muda a resposta: abaixo dela o resgate
            custa mais do que entrega. */}
        <span
          aria-hidden="true"
          className="absolute top-2 h-5 w-px bg-tinta-media"
          style={{ left: `${posicaoPct(CORTES[0])}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute top-0 -translate-x-1/2 text-[10px] font-semibold text-tinta-media"
          style={{ left: `${posicaoPct(CORTES[0])}%` }}
        >
          empata
        </span>

        <span
          aria-hidden="true"
          className="absolute top-[0.6875rem] size-[0.875rem] -translate-x-1/2 rounded-full border-2 border-superficie"
          style={{
            left: esquerdaDoMarcador(milhaDeGraca ? 1 : posicaoPct(razao) / 100),
            background: COR_POR_QUALIDADE[qualidade],
          }}
        />
      </div>

      <p className="tabular mt-1 text-xs leading-relaxed text-tinta-media">
        {milhaDeGraca ? (
          <>
            <strong className="font-semibold text-dinheiro">
              Suas milhas saem de graça
            </strong>{" "}
            no seu nível de gasto — qualquer resgate rende.
          </>
        ) : (
          <>
            <strong className="font-semibold text-tinta">
              {razao.toFixed(2).replace(".", ",")}×
            </strong>{" "}
            o que ela te custou
            {acimaDoTeto ? " (a régua para em 3×)" : ""}
          </>
        )}
      </p>
    </div>
  );
}
