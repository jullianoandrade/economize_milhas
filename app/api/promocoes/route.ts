import { NextResponse } from "next/server";
import { aeroportoPorIata, classificarRota } from "@/lib/milhas/regioes";
import { calcularVeredito } from "@/lib/milhas/veredito";
import { rotuloDoVeredito } from "@/lib/milhas/rotulos";
import { destinosPopulares, temToken } from "@/lib/providers/travelpayouts";
import { precoEstimadoPorRegiao } from "@/lib/precos";
import { transferencias } from "@/lib/dados";
import { bonusVigentes } from "@/lib/transferencias";
import { limitar } from "@/lib/seguranca/requisicao";
import { REGRAS } from "@/lib/seguranca/limite";
import { consultaDasPromocoes, parametrosDe } from "@/lib/seguranca/esquemas";
import { hojeEmSaoPaulo } from "@/lib/viagens/modelo";

/**
 * Oportunidades a partir da cidade da pessoa.
 *
 * Duas regras, e a ordem entre elas importa:
 *
 * 1. So entra quem esta ABAIXO do preco tipico da regiao. Promocao e
 *    preco abaixo do normal; sem esse filtro a lista enche de tarifa cara
 *    de ultima hora para cidade pequena, que pontua altissimo em valor
 *    por milheiro justamente por ser absurda.
 *
 * 2. Entre as ofertas que sao mesmo oferta, ordena por quanto a milha
 *    rende -- e nao por preco. Uma passagem de R$ 400 para um destino
 *    vizinho e barata, mas nao e oportunidade de resgate.
 */

const MAXIMO_DE_DESTINOS = 14;

/** Desconto minimo sobre o preco tipico da regiao para contar como oferta. */
const DESCONTO_MINIMO = 0.1;

/**
 * A data de partida so segue para a tela se for um dia de verdade, de
 * hoje em diante. E ela que transforma o cartao em caminho: o toque leva
 * a /rota/{O}/{D}?data=..., e de la ao bilhete daquele dia. Data passada
 * ou malformada vira null, e o cartao leva a rota sem data, como antes.
 */
function partidaFutura(bruta: string | null, hoje: string): string | null {
  if (!bruta) return null;
  const dia = bruta.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;
  const d = new Date(`${dia}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== dia) return null;
  return dia >= hoje ? dia : null;
}

/** found_at vem sem fuso ("2026-11-20T10:48:36"); so aceita o que e instante. */
function instante(bruto: string | null): string | null {
  return bruto && !Number.isNaN(Date.parse(bruto)) ? bruto : null;
}

export async function GET(requisicao: Request) {
  const bloqueio = limitar(requisicao, "promocoes", REGRAS.consultaExterna);
  if (bloqueio) return bloqueio;

  const consulta = consultaDasPromocoes.safeParse(
    parametrosDe(requisicao.url, ["origem", "gasto", "cartaoId"]),
  );
  const origem = consulta.success ? consulta.data.origem : "";
  const gastoMensalCartaoBRL = consulta.success ? consulta.data.gasto : 0;
  const cartaoId = consulta.success ? consulta.data.cartaoId : undefined;

  const aeroporto = consulta.success ? aeroportoPorIata(origem) : undefined;
  if (!aeroporto) {
    return NextResponse.json(
      { erro: "Informe uma origem válida." },
      { status: 400 },
    );
  }

  const [bruto, bonus] = await Promise.all([
    temToken() ? destinosPopulares(origem) : Promise.resolve(null),
    bonusVigentes(),
  ]);

  /**
   * O que a tela mostra sobre bonus, em ordem de qualidade do dado:
   * promocao valendo agora, com data de fim; na falta dela, o mediano
   * historico, que e expectativa e nao fato. Os dois nunca aparecem
   * como se fossem a mesma coisa.
   */
  const promocoes = Object.entries(bonus)
    .filter(([, b]) => b !== undefined)
    .map(([destino, b]) => ({
      destino,
      percentual: b!.percentual,
      origem: b!.origem,
      terminaEm: b!.terminaEm,
    }))
    .sort((a, b) => b.percentual - a.percentual);

  if (!bruto || bruto.length === 0) {
    return NextResponse.json({
      origem: { iata: aeroporto.iata, cidade: aeroporto.cidade },
      fonte: "estimativa",
      observacao: temToken()
        ? "Não encontramos buscas recentes partindo desta cidade."
        : "Token da Travelpayouts não configurado.",
      oportunidades: [],
      promocoesDeTransferencia: promocoes,
      bonusVigentes: [],
    });
  }

  const hoje = hojeEmSaoPaulo(new Date());

  const oportunidades = bruto
    .flatMap((oferta) => {
      // Rotas fora da nossa base de aeroportos sao puladas em silencio:
      // sem coordenada nao da para classificar a regiao nem estimar milhas.
      const destino = aeroportoPorIata(oferta.destinoIata);
      if (!destino || destino.iata === aeroporto.iata) return [];

      try {
        const rota = classificarRota(origem, destino.iata);
        if (!(oferta.precoBRL > 0)) return [];

        // Sem referencia a rota esta fora do modelo (nenhuma ponta
        // brasileira): nao da para dizer que o preco esta abaixo do
        // tipico, porque nao sabemos qual e o tipico. Fica de fora da
        // lista de oportunidades em vez de entrar com desconto fingido.
        const referencia = precoEstimadoPorRegiao(rota);
        if (referencia === null || referencia <= 0) return [];

        const desconto = 1 - oferta.precoBRL / referencia;
        if (desconto < DESCONTO_MINIMO) return [];

        const veredito = calcularVeredito(rota, oferta.precoBRL, {
          perfil: { gastoMensalCartaoBRL, cartaoId },
          bonusVigentes: bonus,
        });
        if (!veredito.melhor) return [];

        return [
          {
            descontoPct: Math.round(desconto * 100),
            precoTipicoBRL: referencia,
            destino: {
              iata: destino.iata,
              cidade: destino.cidade,
              pais: destino.pais,
            },
            precoBRL: Math.round(oferta.precoBRL),
            // O dia em que esta tarifa sai e quando ela foi vista. Sem
            // isso o cartao so informa; com isso ele leva a passagem.
            partidaEm: partidaFutura(oferta.partidaEm, hoje),
            encontradoEm: instante(oferta.encontradoEm),
            rotulo: rota.rotulo,
            recomendacao: veredito.recomendacao,
            // O motor ja sabia que alguns destes rendem pouco; a tela e
            // que descartava a informacao e anunciava "vale resgatar".
            veredito: rotuloDoVeredito(
              veredito.recomendacao,
              veredito.ressalva !== null,
            ),
            ressalva: veredito.ressalva,
            economiaBRL: Math.round(veredito.economiaBRL),
            programa: veredito.melhor.programa.nome,
            milhas: veredito.melhor.milhas,
            qualidade: veredito.melhor.qualidade,
            valorExtraidoPorMilheiroBRL: Number(
              veredito.melhor.valorExtraidoPorMilheiroBRL.toFixed(2),
            ),
            razao: Number(veredito.melhor.razao.toFixed(2)),
          },
        ];
      } catch {
        return [];
      }
    })
    // Ordenado pela profundidade do desconto, com o rendimento da milha
    // como desempate.
    //
    // A ordem natural seria pelo valor por milheiro, mas na pratica ele
    // quase nao varia entre destinos: com precificacao dinamica as milhas
    // sobem junto com a tarifa, e so os limites de piso e teto da tabela
    // criam diferenca. Ordenar por um numero quase constante daria uma
    // lista aleatoria. O desconto e o que de fato distingue uma oferta.
    .sort((a, b) => b.descontoPct - a.descontoPct || b.razao - a.razao)
    .slice(0, MAXIMO_DE_DESTINOS);

  return NextResponse.json({
    origem: { iata: aeroporto.iata, cidade: aeroporto.cidade },
    fonte: "travelpayouts",
    observacao:
      "Preços de buscas recentes. Não são cotação em tempo real: confirme antes de comprar.",
    oportunidades,
    promocoesDeTransferencia: promocoes,
    bonusVigentes: transferencias.padraoHistorico.map((p) => ({
      destino: p.destino,
      bonusMedianoPct: p.bonusMedianoPct,
      observacao: p.observacao,
    })),
  });
}
