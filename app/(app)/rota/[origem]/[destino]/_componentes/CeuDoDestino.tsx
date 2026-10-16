/**
 * Um céu determinístico, não um desenho à mão.
 *
 * A latitude do destino define a altura do horizonte; a longitude semeia
 * as posições das estrelas. Lisboa e Manaus geram céus diferentes e
 * estáveis -- o mesmo destino sempre produz o mesmo céu -- sem precisar
 * desenhar 268 ilustrações. É literalmente a coordenada desenhada, nunca
 * uma foto: não promete um lugar que o app não vende (ver Ilustracao.tsx).
 */

const LARGURA = 320;
const ALTURA = 112;
const QUANTAS_ESTRELAS = 40;

/** Gerador congruente linear: pequeno, determinístico, sem dependência. */
function pseudoAleatorioDeSemente(semente: number) {
  let estado = semente % 2147483647;
  if (estado <= 0) estado += 2147483646;
  return () => {
    estado = (estado * 16807) % 2147483647;
    return (estado - 1) / 2147483646;
  };
}

type Destino = { lat: number; lon: number };

export function CeuDoDestino({ destino }: { destino: Destino }) {
  // Quanto mais perto do equador, menor a faixa de céu visível aqui --
  // a variação é estética, não meteorológica: o que importa é que o
  // MESMO destino sempre caia na mesma altura.
  const horizonte =
    ALTURA - 10 - (Math.abs(destino.lat) / 90) * (ALTURA * 0.4);

  const semente = Math.round((destino.lon + 180) * 1000) + 1;
  const aleatorio = pseudoAleatorioDeSemente(semente);

  const estrelas = Array.from({ length: QUANTAS_ESTRELAS }, () => ({
    x: aleatorio() * LARGURA,
    y: aleatorio() * horizonte,
    raio: 0.5 + aleatorio() * 1.1,
    opacidade: 0.3 + aleatorio() * 0.5,
  }));

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      className="w-full"
      aria-hidden="true"
      focusable="false"
    >
      {estrelas.map((e, i) => (
        <circle
          key={i}
          cx={e.x}
          cy={e.y}
          r={e.raio}
          fill="var(--painel-tinta)"
          opacity={e.opacidade}
        />
      ))}
    </svg>
  );
}
