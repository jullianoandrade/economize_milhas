import type {
  AlternativaDeOrigem,
  DataMaisBarata,
} from "@/lib/tempo/flexibilidade";
import { porcentagem, reais } from "@/lib/format";

/**
 * Quanto custa a sua rigidez.
 *
 * Duas alavancas que mexem no preco mais do que qualquer outra coisa sob
 * controle do viajante: a data e o aeroporto de saida. O card so aparece
 * quando ha algo concreto a dizer -- sem dado suficiente, nao inventa
 * economia.
 */
export function CardFlexibilidade({
  datas,
  referenciaBRL,
  alternativas,
}: {
  datas: DataMaisBarata[];
  referenciaBRL: number;
  alternativas: AlternativaDeOrigem[];
}) {
  if (datas.length === 0 && alternativas.length === 0) return null;

  const formatarDia = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <section className="rounded-2xl border border-borda bg-superficie p-4 shadow-card">
      <h2 className="mb-1 text-lg font-semibold tracking-tight text-tinta">
        Flexibilidade
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-tinta-media">
        O que você economiza aceitando mudar a data ou o aeroporto de saída.
      </p>

      {datas.length > 0 ? (
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tinta-fraca">
            Dias mais baratos para partir
          </h3>
          <ul className="space-y-2">
            {datas.map((d) => (
              <li
                key={d.partidaEm}
                className="flex items-baseline justify-between gap-3 border-t border-borda pt-2 first:border-0 first:pt-0"
              >
                <span className="text-sm text-tinta">
                  {formatarDia(d.partidaEm)}
                </span>
                <span className="tabular shrink-0 text-right">
                  <span className="block text-sm font-semibold text-tinta">
                    {reais(d.precoBRL)}
                  </span>
                  <span className="block text-[11px] text-dinheiro">
                    −{reais(d.economiaBRL)} ({porcentagem(d.economiaPct)})
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-tinta-fraca">
            Comparado com {reais(referenciaBRL)}, o preço mediano desta rota no
            nosso histórico.
          </p>
        </div>
      ) : null}

      {alternativas.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tinta-fraca">
            Saindo de outro aeroporto
          </h3>
          <ul className="space-y-2">
            {alternativas.map((a) => (
              <li
                key={a.aeroporto.iata}
                className="flex items-baseline justify-between gap-3 border-t border-borda pt-2 first:border-0 first:pt-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-tinta">
                    {a.aeroporto.cidade} ({a.aeroporto.iata})
                  </span>
                  <span className="tabular block text-[11px] text-tinta-fraca">
                    a {a.distanciaKm} km daqui
                  </span>
                </span>
                <span className="tabular shrink-0 text-right">
                  <span className="block text-sm font-semibold text-tinta">
                    {reais(a.precoBRL)}
                  </span>
                  <span className="block text-[11px] text-dinheiro">
                    −{reais(a.economiaBRL)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
