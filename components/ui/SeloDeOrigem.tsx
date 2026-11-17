/**
 * De onde veio este numero.
 *
 * E o componente que transforma a transparencia da VoeMilo em algo que
 * se ve: todo valor que sustenta uma decisao carrega um destes quatro
 * selos. Nada estimado pode aparecer como se fosse garantido.
 *
 *   real          veio de fonte externa (busca de preco, base publica)
 *   estimado      calculo nosso -- o texto diz sobre o que
 *   informado     a propria pessoa digitou (saldo, cartao, objetivo)
 *   desatualizado era real ou informado, mas envelheceu e pede conferencia
 *
 * Cada tipo tem um icone proprio, e nao so uma cor: a diferenca precisa
 * sobreviver a daltonismo e a impressao em preto e branco. A borda
 * tracejada do "desatualizado" faz o mesmo papel.
 */

export type Origem = "real" | "estimado" | "informado" | "desatualizado";

export function SeloDeOrigem({
  origem,
  children,
  detalhe,
}: {
  origem: Origem;
  /** O texto do selo, curto: "busca real de hoje", "estimativa". */
  children: React.ReactNode;
  /** Explicacao longa, mostrada ao passar o mouse ou focar. */
  detalhe?: string;
}) {
  return (
    <span
      title={detalhe}
      className={`inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-tinta-media ${
        origem === "desatualizado"
          ? "border border-dashed border-tinta-fraca bg-superficie"
          : "bg-superficie-2"
      }`}
    >
      <IconeDaOrigem origem={origem} />
      {children}
    </span>
  );
}

function IconeDaOrigem({ origem }: { origem: Origem }) {
  const comum = {
    width: 12,
    height: 12,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    focusable: "false" as const,
  };

  switch (origem) {
    case "real":
      return (
        <svg {...comum}>
          <circle cx="12" cy="12" r="8" fill="currentColor" />
        </svg>
      );
    case "estimado":
      return (
        <svg {...comum}>
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
        </svg>
      );
    case "informado":
      return (
        <svg {...comum} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16.5 3.5l4 4L8 20H4v-4z" />
        </svg>
      );
    case "desatualizado":
      return (
        <svg {...comum} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
  }
}
