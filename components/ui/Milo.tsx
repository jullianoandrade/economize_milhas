/**
 * Milo, a capivara da VoeMilo.
 *
 * Versao provisoria (17/11/2026), desenhada em SVG a partir das
 * referencias aprovadas: contorno marrom-escuro, pelagem marrom natural,
 * focinho mais claro, cachecol ambar e mochila marinho. A arte final
 * ainda vai ser refinada; quando chegar, muda so este arquivo.
 *
 * AS CORES SAO FIXAS, e nao tokens de tema, de proposito: o Milo e um
 * personagem, e personagem nao troca de pelagem a noite. O contorno
 * escuro e o que o recorta tanto do fundo claro quanto do marinho.
 *
 * ONDE ELE APARECE e regra de produto, nao de estilo: boas-vindas,
 * dicas, telas vazias, conquistas e avisos. NUNCA na tela de decisao
 * (a resposta da rota) -- ali quem fala e o numero, e personagem ao
 * lado de conselho financeiro enfraquece a parte que precisa ser
 * levada a serio.
 */

const CONTORNO = "#3b2618";

export type VarianteDoMilo = "inteiro" | "rosto";

export function Milo({
  variante = "inteiro",
  className = "",
  rotulo,
}: {
  /** "inteiro" para ilustracao; "rosto" para avatar e selo pequeno. */
  variante?: VarianteDoMilo;
  className?: string;
  /** Quando informado, o desenho deixa de ser decorativo. */
  rotulo?: string;
}) {
  const decorativo = rotulo === undefined;

  return (
    <svg
      viewBox={variante === "rosto" ? "22 8 132 132" : "0 0 200 220"}
      className={className}
      aria-hidden={decorativo ? true : undefined}
      role={decorativo ? undefined : "img"}
      aria-label={rotulo}
      focusable="false"
    >
      <g stroke={CONTORNO} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
        {/* mochila, atras do corpo */}
        <path d="M140 92 C 160 88, 176 98, 176 118 L 176 150 C 176 162, 166 168, 154 166 L 142 164 Z" fill="#1d2d4d" />
        {/* orelhas pequenas e encaixadas: orelha grande puxa para urso */}
        <ellipse cx="118" cy="26" rx="9" ry="10" fill="#9a5f34" />
        <ellipse cx="138" cy="33" rx="8" ry="9" fill="#9a5f34" />
        <ellipse cx="82" cy="200" rx="17" ry="8" fill="#7a4a28" />
        <ellipse cx="130" cy="199" rx="17" ry="8" fill="#7a4a28" />
        <path d="M146 118 C 158 132, 158 152, 150 162 C 146 166, 140 163, 141 157 C 144 146, 142 132, 136 124 Z" fill="#b97a47" />
        {/* corpo e cabeca numa massa so, com o focinho longo -- e o
            focinho que faz ler capivara */}
        <path
          d="M62 38 C 74 20, 124 16, 142 32 C 154 44, 154 68, 148 84 C 160 108, 164 156, 150 180 C 138 200, 80 202, 66 186 C 52 170, 54 132, 62 112 C 52 106, 38 102, 32 92 C 24 78, 28 58, 40 48 C 46 42, 55 40, 62 38 Z"
          fill="#c68a56"
        />
        <path d="M74 132 C 82 118, 112 116, 120 132 C 128 150, 124 178, 98 182 C 76 182, 68 158, 74 132 Z" fill="#e8c79c" stroke="none" />
      </g>
      <path d="M40 50 C 50 43, 66 46, 72 56 C 78 68, 74 86, 62 92 C 50 97, 36 92, 32 82 C 28 70, 31 56, 40 50 Z" fill="#e2b98a" />
      <ellipse cx="39" cy="62" rx="4.5" ry="3.4" fill={CONTORNO} />
      <path d="M44 82 q7 5 14 1" fill="none" stroke={CONTORNO} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M86 54 q8 -8 16 0" fill="none" stroke={CONTORNO} strokeWidth="4" strokeLinecap="round" />
      <g stroke={CONTORNO} strokeWidth="4" strokeLinejoin="round">
        <path d="M60 96 C 86 110, 128 108, 150 90 L 154 104 C 130 122, 86 124, 58 110 Z" fill="#ffb020" />
        <path d="M94 112 C 98 128, 96 140, 91 155 L 113 157 C 115 140, 115 126, 112 112 Z" fill="#ffb020" />
      </g>
      <path d="M93 148 l20 1.5" stroke="#c98f1c" strokeWidth="3" />
      <path d="M148 98 C 140 116, 136 136, 140 156" fill="none" stroke="#1d2d4d" strokeWidth="7" strokeLinecap="round" />
      {/* o braco que aponta: o Milo sempre indica o proximo passo */}
      <g stroke={CONTORNO} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M92 116 C 74 108, 56 106, 42 108 C 33 109, 32 126, 42 127 C 58 129, 74 133, 90 138 Z" fill="#b97a47" />
        <path d="M30 109 L 14 107 C 8 107, 8 115, 14 115 L 28 117 Z" fill="#9a5f34" />
        <circle cx="36" cy="118" r="10" fill="#9a5f34" />
      </g>
    </svg>
  );
}
