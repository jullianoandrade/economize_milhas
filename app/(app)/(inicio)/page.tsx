import { catalogoDaCarteira } from "@/lib/carteira/catalogo";
import { HeroiDoInicio } from "./_componentes/HeroiDoInicio";
import { PrimeiraVisita } from "./_componentes/PrimeiraVisita";
import { ResumoDoInicio } from "./_componentes/ResumoDoInicio";
import { SeuCusto } from "./_componentes/SeuCusto";

/**
 * O Inicio, na navegacao VoeMilo (17/11/2026).
 *
 * Cada bloco responde a uma pergunta de quem abre o app, em ordem:
 *
 *   1. o topo        -- "como esta a minha viagem?" (ou: "para onde?")
 *   2. a carteira    -- "quanto valem os meus pontos? algo vencendo?"
 *   3. oportunidades -- "tem alguma coisa boa agora?"
 *   4. seu custo     -- "eu ja acumulo milhas sem saber?"
 *
 * Buscar destino saiu daqui e foi para o Explorar, que faz isso melhor
 * (o globo, a resposta na hora). O topo leva ate la.
 *
 * Em telas grandes, os blocos de baixo dividem duas colunas: o que e da
 * pessoa (carteira, custo) a esquerda, o que e do mercado a direita.
 */
export default function Inicio() {
  return (
    <>
      <PrimeiraVisita />
      <HeroiDoInicio />

      <div className="mt-5 grid gap-6 md:mt-6 md:grid-cols-2 md:gap-8">
        <div>
          <ResumoDoInicio catalogo={catalogoDaCarteira()} />
        </div>
        <div>
          <SeuCusto />
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-tinta-fraca">
        Os valores em milhas são estimativas: nenhum programa brasileiro
        publica tabela fixa nem expõe API. Sempre confirme no site do programa
        antes de resgatar.
      </p>
    </>
  );
}
