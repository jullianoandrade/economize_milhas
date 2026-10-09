import Link from "next/link";
import { BuscaDeViagem } from "@/components/BuscaDeViagem";
import { ObjetivoEmAndamento } from "@/components/ObjetivoEmAndamento";
import { OportunidadesDaHome } from "@/components/OportunidadesDaHome";
import { PrimeiraVisita } from "@/components/PrimeiraVisita";
import { glossario } from "@/lib/dados";

/**
 * A home.
 *
 * A ordem da tela e uma ordem de prioridade, e cada bloco responde a uma
 * pergunta diferente de quem abre o app:
 *
 *   1. busca        -- "quanto custa ir para X?"       (quem chega com destino)
 *   2. objetivo     -- "como esta a minha meta?"       (quem volta)
 *   3. oportunidade -- "tem alguma coisa boa agora?"   (quem nao tem destino)
 *   4. conceito     -- "como isso funciona?"           (quem nunca usou milhas)
 *
 * A lista estatica de "rotas para experimentar" que ficava aqui saiu: ela
 * ocupava o lugar nobre com rota fixa enquanto as oportunidades reais,
 * calculadas a partir da cidade da pessoa, respondem a mesma pergunta
 * com dado de verdade.
 */

/** O conceito que o app inteiro gira em torno: sem ele nada aqui faz sentido. */
const CONCEITO = glossario.termos.find((t) => t.id === "cpm");

export default function Home() {
  return (
    <>
      <PrimeiraVisita />

      <BuscaDeViagem />

      <ObjetivoEmAndamento />

      <OportunidadesDaHome />

      {CONCEITO ? (
        <section className="mb-6 rounded-[24px] border border-marca-fraca bg-marca-fraca p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-marca">
            Entenda em um minuto
          </p>
          <h2 className="mb-1.5 font-semibold text-tinta">{CONCEITO.termo}</h2>
          <p className="text-sm leading-relaxed text-tinta-media">
            {CONCEITO.resumo} É o número que separa um bom resgate de um
            prejuízo disfarçado — e quase ninguém calcula.
          </p>
          <Link
            href="/aprender"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-marca underline underline-offset-4"
          >
            Aprender o básico de milhas
          </Link>
        </section>
      ) : null}

      <p className="text-xs leading-relaxed text-tinta-fraca">
        Os valores em milhas são estimativas: nenhum programa brasileiro
        publica tabela fixa nem expõe API. Sempre confirme no site do programa
        antes de resgatar.
      </p>
    </>
  );
}
