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
 */

export default function Home() {
  return (
    <>
      <PrimeiraVisita />

      <BuscaDeViagem />

      <ObjetivoEmAndamento />

      <SeuCusto />

      <OportunidadesDaHome />

      <p className="text-xs leading-relaxed text-tinta-fraca">
        Os valores em milhas são estimativas: nenhum programa brasileiro
        publica tabela fixa nem expõe API. Sempre confirme no site do programa
        antes de resgatar.
      </p>
    </>
  );
}
