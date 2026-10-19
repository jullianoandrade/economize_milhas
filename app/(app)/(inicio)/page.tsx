import { BuscaDeViagem } from "./_componentes/BuscaDeViagem";
import { ObjetivoEmAndamento } from "./_componentes/ObjetivoEmAndamento";
import { OportunidadesDaHome } from "./_componentes/OportunidadesDaHome";
import { PrimeiraVisita } from "./_componentes/PrimeiraVisita";
import { SeuCusto } from "./_componentes/SeuCusto";

/**
 * A home.
 *
 * A ordem da tela e uma ordem de prioridade, e cada bloco responde a uma
 * pergunta diferente de quem abre o app:
 *
 *   1. busca        -- "quanto custa ir para X?"       (quem chega com destino)
 *   2. objetivo     -- "como esta a minha meta?"       (quem volta)
 *   3. seu custo    -- "eu tenho alguma coisa aqui?"   (quem nunca usou milhas)
 *   4. oportunidade -- "tem alguma coisa boa agora?"   (quem nao tem destino)
 *
 * O custo proprio vem ANTES das oportunidades porque e ele que decide se
 * cada oportunidade vale: a mesma passagem e um bom resgate para quem
 * tem cartao isento e um mau negocio para quem compra milhas.
 *
 * A lista estatica de "rotas para experimentar" que ficava aqui saiu: ela
 * ocupava o lugar nobre com rota fixa enquanto as oportunidades reais,
 * calculadas a partir da cidade da pessoa, respondem a mesma pergunta
 * com dado de verdade.
 *
 * Em telas grandes a ordem nao muda -- so o arranjo. A busca continua no
 * topo, em destaque, e os dois blocos de "como voce esta" (objetivo em
 * andamento e custo das suas milhas) passam a dividir uma linha, em vez
 * de empurrarem as oportunidades para fora da primeira tela.
 *
 * Os dois ficam lado a lado por reposicionamento, nunca por duplicacao:
 * renderizar o mesmo componente duas vezes com `hidden` em cada um
 * criaria dois estados independentes -- ajustar o gasto num nao mexeria
 * no outro -- alem de dobrar efeitos e montagens.
 */

export default function Home() {
  return (
    <>
      <PrimeiraVisita />

      <BuscaDeViagem />

      <div className="md:grid md:grid-cols-2 md:gap-4">
        <ObjetivoEmAndamento />
        <SeuCusto />
      </div>

      <OportunidadesDaHome />

      <p className="text-xs leading-relaxed text-tinta-fraca">
        Os valores em milhas são estimativas: nenhum programa brasileiro
        publica tabela fixa nem expõe API. Sempre confirme no site do programa
        antes de resgatar.
      </p>
    </>
  );
}
