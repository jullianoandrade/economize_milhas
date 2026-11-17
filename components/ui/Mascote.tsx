/**
 * O aviãozinho.
 *
 * Desenho em tokens de cor, como o resto de `Ilustracao` -- o modo
 * escuro acompanha sem uma segunda cópia do SVG.
 *
 * ONDE ELE PODE APARECER, e isto é regra de produto, não de estilo:
 * em tela vazia, em carregamento, em boas-vindas, em objetivo batido e
 * voando no arco da rota. NUNCA ao lado do veredito.
 *
 * O motivo: um app que diz "pague em dinheiro, resgatar aqui é
 * prejuízo" está dando conselho financeiro. Personagem ao lado do
 * número enfraquece exatamente a parte que precisa ser levada a sério.
 * O mascote ambienta a viagem; quem decide é a conta.
 *
 * Não tem `role="img"` nem rótulo por padrão: na maioria dos lugares
 * ele é decoração e deve sumir do leitor de tela. Quem precisar de um
 * nome acessível passa `rotulo` -- e aí ele vira imagem com nome.
 */

export type HumorDoMascote = "neutro" | "feliz" | "pensando";

const VIEWBOX = { largura: 72, altura: 44 } as const;

export function Mascote({
  humor = "neutro",
  className = "",
  rotulo,
}: {
  humor?: HumorDoMascote;
  className?: string;
  /** Quando informado, o desenho deixa de ser decorativo. */
  rotulo?: string;
}) {
  const decorativo = rotulo === undefined;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.largura} ${VIEWBOX.altura}`}
      className={className}
      aria-hidden={decorativo ? true : undefined}
      role={decorativo ? undefined : "img"}
      aria-label={rotulo}
      focusable="false"
    >
      <DesenhoDoMascote humor={humor} />
    </svg>
  );
}

/**
 * O desenho sem o `<svg>` em volta.
 *
 * Existe separado para o avião poder ser colocado DENTRO de outro SVG
 * -- é assim que ele voa no arco da rota, dentro do mesmo sistema de
 * coordenadas do traçado, em vez de ser um segundo elemento posicionado
 * por cima com CSS e que sairia do lugar a cada largura de tela.
 */
export function DesenhoDoMascote({
  humor = "neutro",
}: {
  humor?: HumorDoMascote;
}) {
  return (
    <>
      {/* A ordem de desenho É a profundidade: asa distante, leme e
          fuselagem, depois a asa próxima por cima. Sem a asa de baixo
          a silhueta lia como peixe -- um avião visto de cima e de lado
          precisa das DUAS asas para o olho resolver o ângulo. */}

      {/* asa distante, atrás do corpo */}
      <path d="M33 21 L23 6 L40 19 Z" fill="var(--mascote-asa)" />
      {/* leme, na cauda */}
      <path d="M13 25 L8 10 L21 23 Z" fill="var(--mascote-sombra)" />
      {/* estabilizador */}
      <path d="M12 28 L4 30 L16 30 Z" fill="var(--mascote-sombra)" />
      {/* fuselagem */}
      <path
        d="M10 28 Q28 16 52 18 Q64 19 66 25 Q64 31 52 32 Q28 34 10 28 Z"
        fill="var(--mascote-corpo)"
      />
      {/* asa próxima, por cima do corpo */}
      <path d="M31 27 L21 41 L43 29 Z" fill="var(--mascote-asa)" />
      {/* olho */}
      <circle cx="56" cy="24" r="2.8" fill="var(--mascote-tinta)" />
      <circle cx="57" cy="23.1" r="1" fill="var(--mascote-corpo)" />
      {/* boca: o humor mora aqui, e só aqui */}
      {humor === "pensando" ? (
        <path
          d="M47 30 h9"
          stroke="var(--mascote-tinta)"
          strokeWidth="1.7"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <path
          d={humor === "feliz" ? "M46 29 q5 4 10 0" : "M47 29.5 q4.5 2.6 9 0"}
          stroke="var(--mascote-tinta)"
          strokeWidth="1.7"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </>
  );
}
