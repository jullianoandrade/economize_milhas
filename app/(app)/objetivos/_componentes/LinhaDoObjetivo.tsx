import type { Meta } from "@/lib/metas/progresso";
import { emData, serieDoProgresso } from "@/lib/metas/progresso";
import { milhas as fmtMilhas } from "@/lib/format";

/**
 * A linha do tempo do objetivo.
 *
 * Duas coisas sao desenhadas com tracos diferentes de proposito: o que
 * ja aconteceu e linha cheia, o que e projecao e tracejada. Misturar as
 * duas num traco so transformaria uma estimativa em historico, que e
 * exatamente o truque que este app nao usa.
 *
 * A meta aparece como uma linha horizontal: a distancia vertical ate ela
 * E a informacao, e ela se le sem numero nenhum.
 */

const LARGURA = 320;
const ALTURA = 132;
const TOPO = 14;
const BASE = 104;
const ESQUERDA = 4;
const DIREITA = 316;

function diaCurto(iso: string) {
  return emData(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function LinhaDoObjetivo({ meta, hoje }: { meta: Meta; hoje: Date }) {
  const { pontos, maximo } = serieDoProgresso(meta, hoje);
  if (pontos.length === 0) return null;

  const inicioEmMs = emData(pontos[0].em).valueOf();
  const fimEmMs = Math.max(
    emData(pontos[pontos.length - 1].em).valueOf(),
    meta.dataAlvo ? emData(meta.dataAlvo).valueOf() : 0,
    inicioEmMs + 1,
  );
  const vao = fimEmMs - inicioEmMs;

  const x = (iso: string) =>
    ESQUERDA +
    ((emData(iso).valueOf() - inicioEmMs) / vao) * (DIREITA - ESQUERDA);
  const y = (saldo: number) => BASE - (saldo / maximo) * (BASE - TOPO);

  const registrados = pontos.filter((p) => !p.projetado);
  const yDaMeta = y(meta.milhasNecessarias);

  const caminho = (lista: typeof pontos) =>
    lista.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.em)} ${y(p.saldo)}`).join(" ");

  // O trecho projetado comeca no ultimo ponto real, senao a linha
  // tracejada apareceria solta no meio do grafico.
  const projetado = pontos.find((p) => p.projetado);
  const ultimoReal = registrados[registrados.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        className="w-full"
        role="img"
        aria-label={`Saldo de ${fmtMilhas(meta.registros[meta.registros.length - 1]?.saldo ?? 0)} milhas de um objetivo de ${fmtMilhas(meta.milhasNecessarias)}.`}
      >
        {/* A meta. */}
        <line
          x1={ESQUERDA}
          y1={yDaMeta}
          x2={DIREITA}
          y2={yDaMeta}
          stroke="var(--color-grafico-dinheiro)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <text
          x={DIREITA}
          y={yDaMeta - 5}
          textAnchor="end"
          fontSize={10}
          fontWeight={700}
          fill="var(--color-grafico-dinheiro)"
        >
          meta: {fmtMilhas(meta.milhasNecessarias)}
        </text>

        {/* Base. */}
        <line
          x1={ESQUERDA}
          y1={BASE}
          x2={DIREITA}
          y2={BASE}
          stroke="var(--color-borda)"
          strokeWidth={1}
        />

        {projetado && ultimoReal ? (
          <path
            d={caminho([ultimoReal, projetado])}
            fill="none"
            stroke="var(--color-marca)"
            strokeWidth={2}
            strokeDasharray="5 5"
            strokeLinecap="round"
            opacity={0.65}
          />
        ) : null}

        {registrados.length > 1 ? (
          <path
            d={caminho(registrados)}
            fill="none"
            stroke="var(--color-marca)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {registrados.map((p) => (
          <circle
            key={p.em}
            cx={x(p.em)}
            cy={y(p.saldo)}
            r={3.5}
            fill="var(--color-marca)"
          >
            <title>{`${diaCurto(p.em)}: ${fmtMilhas(p.saldo)} milhas`}</title>
          </circle>
        ))}

        {projetado ? (
          <circle
            cx={x(projetado.em)}
            cy={y(projetado.saldo)}
            r={4}
            fill="none"
            stroke="var(--color-marca)"
            strokeWidth={2}
            opacity={0.65}
          />
        ) : null}

        <text
          x={ESQUERDA}
          y={BASE + 16}
          fontSize={10}
          fill="var(--color-tinta-fraca)"
        >
          {diaCurto(pontos[0].em)}
        </text>
        <text
          x={DIREITA}
          y={BASE + 16}
          textAnchor="end"
          fontSize={10}
          fill="var(--color-tinta-fraca)"
        >
          {diaCurto(pontos[pontos.length - 1].em)}
        </text>
      </svg>

      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tinta-fraca">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 rounded bg-marca" />
          o que você registrou
        </span>
        {projetado ? (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-0.5 w-4 rounded bg-marca opacity-60"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 6px)",
              }}
            />
            projeção no ritmo atual
          </span>
        ) : null}
      </p>
    </div>
  );
}
