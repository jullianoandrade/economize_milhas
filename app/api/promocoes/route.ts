import { NextResponse } from "next/server";
import { aeroportoPorIata, classificarRota } from "@/lib/milhas/regioes";
import { calcularVeredito } from "@/lib/milhas/veredito";
import { rotuloDoVeredito } from "@/lib/milhas/rotulos";
import { destinosPopulares, temToken } from "@/lib/providers/travelpayouts";
import { precoEstimadoPorRegiao } from "@/lib/precos";
import { transferencias } from "@/lib/dados";

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

export async function GET(requisicao: Request) {
  const parametros = new URL(requisicao.url).searchParams;
  const origem = (parametros.get("origem") ?? "").trim().toUpperCase();

  const aeroporto = aeroportoPorIata(origem);
  if (!aeroporto) {
    return NextResponse.json(
      { erro: "informe uma origem valida" },
      { status: 400 },
    );
  }

  const bruto = temToken() ? await destinosPopulares(origem) : null;

  if (!bruto || bruto.length === 0) {
    return NextResponse.json({
      origem: { iata: aeroporto.iata, cidade: aeroporto.cidade },
      fonte: "estimativa",
      observacao: temToken()
        ? "Nao encontramos buscas recentes partindo desta cidade."
        : "Token da Travelpayouts nao configurado.",
      oportunidades: [],
      bonusVigentes: [],
    });
  }

  const oportunidades = bruto
    .flatMap((oferta) => {
      // Rotas fora da nossa base de aeroportos sao puladas em silencio:
      // sem coordenada nao da para classificar a regiao nem estimar milhas.
      const destino = aeroportoPorIata(oferta.destinoIata);
      if (!destino || destino.iata === aeroporto.iata) return [];

      try {
        const rota = classificarRota(origem, destino.iata);
        if (!(oferta.precoBRL > 0)) return [];

        const referencia = precoEstimadoPorRegiao(rota);
        const desconto = referencia > 0 ? 1 - oferta.precoBRL / referencia : 0;
        if (desconto < DESCONTO_MINIMO) return [];

        const veredito = calcularVeredito(rota, oferta.precoBRL);
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
      "Precos de buscas recentes. Nao sao cotacao em tempo real: confirme antes de comprar.",
    oportunidades,
    bonusVigentes: transferencias.padraoHistorico.map((p) => ({
      destino: p.destino,
      bonusMedianoPct: p.bonusMedianoPct,
      observacao: p.observacao,
    })),
  });
}
