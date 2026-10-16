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
