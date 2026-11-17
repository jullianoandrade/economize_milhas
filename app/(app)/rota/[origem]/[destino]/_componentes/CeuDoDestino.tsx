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
    raio: 0.5 + aleatorio() * 1.0,
    // Fraca de proposito. O titulo e o subtitulo da rota ficam SOBRE
    // este ceu, e estrela com opacidade alta competia com a letra --
    // decoracao nunca pode chegar perto do contraste do texto.
    opacidade: 0.14 + aleatorio() * 0.26,
  }));

  // Semente propria para o brilho do horizonte, para ele nao cair
  // sempre no mesmo lugar que a primeira estrela.
  const brilhoX = LARGURA * (0.25 + aleatorio() * 0.5);

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* O ceu da janela da cabine: do alto da atmosfera ao
            horizonte. As paradas sao tokens, entao o modo escuro troca
            o ceu inteiro sem uma segunda copia deste desenho. */}
        <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ceu-alto)" />
          <stop offset="38%" stopColor="var(--ceu-medio)" />
          <stop offset="76%" stopColor="var(--ceu-baixo)" />
          <stop offset="100%" stopColor="var(--ceu-horizonte)" />
        </linearGradient>

        {/* O sol baixo, difuso. Sempre abaixo das estrelas, sempre
            perto do horizonte daquele destino. */}
        {/* A base do ceu se dissolve em vez de cortar reto. Mascara, e
            nao um degrade por cima: assim o painel que esta ATRAS
            aparece de verdade, qualquer que seja a cor dele -- um
            degrade por cima exigiria repetir aqui a cor do painel, e
            as duas sairiam do lugar na primeira troca de tema. */}
        <linearGradient id="dissolve" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="62%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="emenda">
          <rect width={LARGURA} height={ALTURA} fill="url(#dissolve)" />
        </mask>

        <radialGradient id="brilho">
          <stop offset="0%" stopColor="var(--ceu-horizonte)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--ceu-horizonte)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g mask="url(#emenda)">
      <rect width={LARGURA} height={ALTURA} fill="url(#ceu)" />

      <ellipse
        cx={brilhoX}
        cy={horizonte + 6}
        rx={LARGURA * 0.34}
        ry={ALTURA * 0.28}
        fill="url(#brilho)"
      />

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
      </g>
    </svg>
  );
}
