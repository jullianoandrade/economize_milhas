/**
 * Ilustracoes da interface.
 *
 * SVG desenhado a mao, e nao foto de banco de imagem, por tres razoes
 * que se reforcam: foto de viagem custa licenca, pesa centenas de
 * quilobytes na metrica de carregamento e -- a mais importante --
 * promete um lugar que o app nao vende. Aqui se fala de preco e de
 * decisao; a ilustracao ambienta, nao vende destino.
 *
 * Tudo em tom de marca via variavel CSS, entao o modo escuro acompanha
 * sem uma segunda versao de cada desenho.
 */

export type Cena = "viagem" | "meta" | "transparencia";

/**
 * "claro" redefine os tokens de cor so dentro do desenho, para ele
 * aparecer sobre o painel violeta escuro das telas de abertura. E uma
 * sobrescrita local de variavel CSS, nao uma segunda copia do SVG.
 */
const TOM_CLARO = {
  "--marca": "#ffffff",
  "--marca-suave": "#ffffff",
  "--superficie": "#e6ecf6",
} as React.CSSProperties;

export function Ilustracao({
  cena,
  tom = "marca",
  className = "",
}: {
  cena: Cena;
  tom?: "marca" | "claro";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 320 180"
      className={className}
      style={tom === "claro" ? TOM_CLARO : undefined}
      aria-hidden="true"
      focusable="false"
    >
      {cena === "viagem" ? <Viagem /> : null}
      {cena === "meta" ? <Meta /> : null}
      {cena === "transparencia" ? <Transparencia /> : null}
    </svg>
  );
}

const SUAVE = "var(--marca-suave)";
const MARCA = "var(--marca)";

/** Montanhas e a rota de um voo cruzando o ceu. */
function Viagem() {
  return (
    <g>
      <circle cx="248" cy="48" r="22" fill={SUAVE} opacity="0.5" />

      {/* Tres camadas de montanha: a mais distante e a mais apagada,
          que e o unico jeito de dar profundidade sem sombra. */}
      <path
        d="M0 180 L72 72 L128 140 L176 92 L240 180 Z"
        fill={MARCA}
        opacity="0.22"
      />
      <path d="M44 180 L128 62 L212 180 Z" fill={MARCA} opacity="0.45" />
      <path d="M150 180 L228 88 L320 180 Z" fill={MARCA} opacity="0.7" />

      {/* Neve: o mesmo triangulo cortado mais acima. */}
      <path d="M128 62 L152 96 L104 96 Z" fill="var(--superficie)" opacity="0.85" />

      <path
        d="M16 118 C 88 46, 196 150, 300 36"
        fill="none"
        stroke={MARCA}
        strokeWidth="2"
        strokeDasharray="5 7"
        strokeLinecap="round"
        opacity="0.8"
      />
      <g transform="translate(292 30) rotate(-38)">
        <path
          d="M0 -9 L4 3 L13 7 L4 7 L0 14 L-4 7 L-13 7 L-4 3 Z"
          fill={MARCA}
        />
      </g>
    </g>
  );
}

/** Uma escada subindo ate a bandeira: progresso, nao chegada. */
function Meta() {
  const degraus = [
    { x: 24, h: 38 },
    { x: 86, h: 66 },
    { x: 148, h: 96 },
    { x: 210, h: 130 },
  ];

  return (
    <g>
      <circle cx="268" cy="40" r="20" fill={SUAVE} opacity="0.45" />

      {degraus.map((d, i) => (
        <rect
          key={d.x}
          x={d.x}
          y={168 - d.h}
          width="52"
          height={d.h}
          rx="10"
          fill={MARCA}
          opacity={0.25 + i * 0.2}
        />
      ))}

      {/* Mastro e bandeira no topo do ultimo degrau. */}
      <path d="M236 38 V 24" stroke={MARCA} strokeWidth="3" strokeLinecap="round" />
      <path d="M238 25 L 272 33 L 238 43 Z" fill={MARCA} />

      <line
        x1="0"
        y1="176"
        x2="320"
        y2="176"
        stroke={MARCA}
        strokeWidth="2"
        opacity="0.3"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Lente sobre um grafico: o numero conferivel, nao o numero bonito. */
function Transparencia() {
  const barras = [
    { x: 56, h: 36 },
    { x: 92, h: 62 },
    { x: 128, h: 48 },
    { x: 164, h: 84 },
    { x: 200, h: 58 },
  ];

  return (
    <g>
      <rect x="28" y="22" width="216" height="136" rx="18" fill={SUAVE} opacity="0.3" />

      {barras.map((b, i) => (
        <rect
          key={b.x}
          x={b.x}
          y={134 - b.h}
          width="20"
          height={b.h}
          rx="6"
          fill={MARCA}
          opacity={i === 3 ? 0.9 : 0.4}
        />
      ))}

      <line
        x1="48"
        y1="138"
        x2="228"
        y2="138"
        stroke={MARCA}
        strokeWidth="2"
        opacity="0.5"
        strokeLinecap="round"
      />

      <circle
        cx="214"
        cy="62"
        r="34"
        fill="var(--superficie)"
        opacity="0.6"
        stroke={MARCA}
        strokeWidth="4"
      />
      <path
        d="M238 86 L 268 116"
        stroke={MARCA}
        strokeWidth="7"
        strokeLinecap="round"
      />
    </g>
  );
}
