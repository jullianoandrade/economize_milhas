/**
 * Anel de progresso.
 *
 * O numero no meio e o que a pessoa le; o anel e o que ela sente. Os
 * dois saem do mesmo valor, entao nao ha como um dizer uma coisa e o
 * outro dizer outra.
 *
 * O SVG inteiro e decorativo: quem usa leitor de tela recebe o progresso
 * pelo texto do cartao, que ja traz "faltam X milhas" por extenso.
 */
export function AnelDeProgresso({
  percentual,
  tamanho = 88,
  espessura = 8,
  rotulo,
  tom = "marca",
}: {
  percentual: number;
  tamanho?: number;
  espessura?: number;
  rotulo?: string;
  tom?: "marca" | "claro";
}) {
  const limitado = Math.max(0, Math.min(100, percentual));
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = (limitado / 100) * circunferencia;

  const corTrilho = tom === "claro" ? "rgb(255 255 255 / 0.25)" : "var(--borda)";
  const corArco = tom === "claro" ? "#ffffff" : "var(--marca)";

  return (
    <div
      className="relative shrink-0"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg
        viewBox={`0 0 ${tamanho} ${tamanho}`}
        className="size-full -rotate-90"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke={corTrilho}
          strokeWidth={espessura}
        />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke={corArco}
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={`${preenchido} ${circunferencia}`}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`tabular text-lg font-bold leading-none ${
            tom === "claro" ? "text-white" : "text-tinta"
          }`}
        >
          {Math.round(limitado)}%
        </span>
        {rotulo ? (
          <span
            className={`mt-0.5 text-[10px] leading-none ${
              tom === "claro" ? "text-white/75" : "text-tinta-fraca"
            }`}
          >
            {rotulo}
          </span>
        ) : null}
      </div>
    </div>
  );
}
