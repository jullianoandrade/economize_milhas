import { DesenhoDoMascote } from "@/components/ui/Mascote";

/**
 * A distância sentida, não o mapa-múndi.
 *
 * Os dois pontos são posicionados pela latitude/longitude normalizada
 * ENTRE ELES -- não num mapa do mundo. Com só dois pontos, um mapa real
 * deixaria a maioria das rotas domésticas como dois pixels colados no
 * canto; normalizando pelo próprio par, toda rota usa a largura inteira,
 * do voo de 40 minutos ao voo de 11 horas. "7.934 km" continua sendo o
 * número exato; o arco é a sensação de distância, não a medida.
 */

const LARGURA = 320;
const ALTURA = 112;
const MARGEM_X = 34;
const BANDA_Y_MIN = 46;
const BANDA_Y_MAX = 74;
const ALTURA_DO_ARCO = 30;

type Ponto = { iata: string; cidade: string; lat: number; lon: number };

/**
 * Onde o aviao fica no arco, de 0 (origem) a 1 (destino).
 *
 * Um pouco depois do meio: no meio exato ele cobre o ponto mais alto da
 * curva, que e justamente a parte do traçado que da a sensacao de
 * distancia.
 */
const POSICAO_NO_ARCO = 0.58;

/** O tamanho do desenho do mascote, no sistema de coordenadas do SVG. */
const MASCOTE_LARGURA = 72;
const MASCOTE_ALTURA = 44;
const ESCALA_DO_MASCOTE = 0.6;

/** Ponto da curva quadratica de Bezier em t. */
function pontoEm(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/**
 * O angulo do aviao: a TANGENTE da curva naquele ponto, nao um valor
 * fixo. E isso que faz ele subir na ida e nivelar na chegada, em vez de
 * parecer colado torto por cima do traçado.
 */
function anguloEm(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
) {
  const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function normalizar(valor: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (valor - min) / (max - min);
}

export function ArcoDaRota({
  origem,
  destino,
}: {
  origem: Ponto;
  destino: Ponto;
}) {
  const lons = [origem.lon, destino.lon];
  const lats = [origem.lat, destino.lat];
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const x = (lon: number) =>
    MARGEM_X + normalizar(lon, minLon, maxLon) * (LARGURA - MARGEM_X * 2);
  // Latitude maior = mais ao norte = mais para cima na tela (y menor).
  const y = (lat: number) =>
    BANDA_Y_MIN +
    (1 - normalizar(lat, minLat, maxLat)) * (BANDA_Y_MAX - BANDA_Y_MIN);

  const x1 = x(origem.lon);
  const y1 = y(origem.lat);
  const x2 = x(destino.lon);
  const y2 = y(destino.lat);
  const mx = (x1 + x2) / 2;
  const my = Math.min(y1, y2) - ALTURA_DO_ARCO;

  const p0 = { x: x1, y: y1 };
  const p1 = { x: mx, y: my };
  const p2 = { x: x2, y: y2 };
  const aviao = pontoEm(POSICAO_NO_ARCO, p0, p1, p2);
  const inclinacao = anguloEm(POSICAO_NO_ARCO, p0, p1, p2);

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      className="w-full"
      role="img"
      aria-label={`Rota de ${origem.cidade} a ${destino.cidade}`}
    >
      <path
        d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
        fill="none"
        stroke="var(--painel-tinta-fraca)"
        strokeWidth="2"
        strokeDasharray="5 7"
        strokeLinecap="round"
        opacity="0.85"
      />

      <circle cx={x1} cy={y1} r="4" fill="var(--painel-tinta)" />
      <circle cx={x2} cy={y2} r="4" fill="var(--painel-tinta)" />

      {/* O mascote voando a rota. Vive DENTRO deste SVG, e nao numa
          camada por cima: assim ele usa as mesmas coordenadas do
          traçado e acompanha qualquer largura de tela sem recalculo em
          JavaScript. O rotulo acessivel ja e o do <svg> inteiro. */}
      <g
        transform={`translate(${aviao.x} ${aviao.y}) rotate(${inclinacao}) scale(${ESCALA_DO_MASCOTE}) translate(${-MASCOTE_LARGURA / 2} ${-MASCOTE_ALTURA / 2})`}
      >
        <DesenhoDoMascote humor="feliz" />
      </g>

      <text
        x={x1}
        y={y1 + 18}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="var(--painel-tinta)"
      >
        {origem.iata}
      </text>
      <text
        x={x2}
        y={y2 + 18}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="var(--painel-tinta)"
      >
        {destino.iata}
      </text>
    </svg>
  );
}
