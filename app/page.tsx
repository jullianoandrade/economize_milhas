import Link from "next/link";
import { BuscaDeViagem } from "@/components/BuscaDeViagem";
import { Cabecalho } from "@/components/Cabecalho";

/** Destinos que mostram bem o que o app faz: um caro, um médio, um barato. */
const EXEMPLOS = [
  { origem: "GRU", destino: "LIS", rotulo: "São Paulo → Lisboa" },
  { origem: "GRU", destino: "EZE", rotulo: "São Paulo → Buenos Aires" },
  { origem: "GRU", destino: "REC", rotulo: "São Paulo → Recife" },
];

export default function Home() {
  return (
    <>
      <Cabecalho
        titulo="Vale mais em milhas ou em dinheiro?"
        subtitulo="Digite um destino e descubra quanto a viagem custa das duas formas, quanto você economiza e como juntar as milhas que faltam."
      />

      <BuscaDeViagem />

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tinta-fraca">
          Para experimentar
        </h2>
        <ul className="space-y-2">
          {EXEMPLOS.map((exemplo) => (
            <li key={exemplo.destino}>
              <Link
                href={`/rota/${exemplo.origem}/${exemplo.destino}`}
                className="flex items-center justify-between rounded-2xl border border-borda bg-superficie px-4 py-3.5 text-sm shadow-card transition-colors hover:border-marca"
              >
                <span className="font-medium text-tinta">{exemplo.rotulo}</span>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="size-4 shrink-0 text-tinta-fraca"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-tinta-fraca">
        Os valores em milhas são estimativas: nenhum programa brasileiro
        publica tabela fixa nem expõe API. Sempre confirme no site do programa
        antes de resgatar.
      </p>
    </>
  );
}
