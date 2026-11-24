import { ImageResponse } from "next/og";
import {
  AeroportoDesconhecidoError,
  aeroportoPorIata,
  classificarRota,
  MesmoAeroportoError,
} from "@/lib/milhas/regioes";

/**
 * A imagem que aparece quando alguem manda a rota no WhatsApp.
 *
 * O produto inteiro converge para um veredito sobre uma rota -- a coisa
 * mais compartilhavel que ele tem. Sem isto o link chegava cinza, sem
 * titulo visual, no canal que mais importa no Brasil.
 *
 * O QUE NAO ENTRA AQUI, e e a decisao que importa: o veredito. Seria
 * tentador estampar "vale resgatar" na imagem, e seria errado. Esta
 * imagem e gerada uma vez e cacheada; o preco muda todo dia. Uma imagem
 * cacheada afirmando "vale resgatar" vira mentira na primeira virada de
 * tarifa, e mentira que viaja sozinha em conversa de WhatsApp, longe da
 * pagina que poderia corrigi-la.
 *
 * Entao a imagem diz o que NAO muda: que rota e, quantos quilometros,
 * e de quem e a pagina. O veredito fica onde pode ser recalculado.
 */

export const alt = "Vale mais em milhas ou em dinheiro?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* As mesmas cores do painel escuro do heroi, em valor literal: o
   gerador de imagem nao le o CSS do site. */
const TINTA = "#ffffff";
const TINTA_MEDIA = "#b4bfd4";
const MILHAS = "#ffb020";

export default async function Imagem({
  params,
}: {
  params: Promise<{ origem: string; destino: string }>;
}) {
  const { origem, destino } = await params;

  const o = aeroportoPorIata(origem);
  const d = aeroportoPorIata(destino);

  // Rota desconhecida ainda rende uma imagem: o codigo cru no lugar do
  // nome da cidade. Quebrar aqui deixaria o link sem imagem nenhuma,
  // que e pior do que uma imagem com menos informacao.
  const cidadeOrigem = o?.cidade ?? origem.toUpperCase();
  const cidadeDestino = d?.cidade ?? destino.toUpperCase();
  const iataOrigem = (o?.iata ?? origem).toUpperCase();
  const iataDestino = (d?.iata ?? destino).toUpperCase();

  // Distancia e faixa sao fatos que nao mudam com a tarifa -- podem
  // ficar numa imagem cacheada sem virar mentira amanha, ao contrario
  // do veredito. Trecho fora do modelo nao tem faixa (faixa: null), e
  // ai so a distancia entra.
  let detalhe: string | null = null;
  let tocaOBrasil = true;
  try {
    const rota = classificarRota(origem, destino);
    const km = `${rota.distanciaKm.toLocaleString("pt-BR")} km`;
    detalhe = rota.faixa ? `${km} · ${rota.rotulo}` : km;
    tocaOBrasil = rota.tocaOBrasil;
  } catch (erro) {
    if (
      !(erro instanceof AeroportoDesconhecidoError) &&
      !(erro instanceof MesmoAeroportoError)
    ) {
      throw erro;
    }
  }

  // A chamada acompanha a fronteira do motor. Prometer "vale mais em
  // milhas ou em dinheiro?" num trecho que a pagina se recusa a avaliar
  // seria a imagem vendendo o que o produto diz, com todas as letras,
  // que nao faz -- e ela viaja sozinha, longe da pagina que explica.
  const chamada = tocaOBrasil
    ? "Vale mais em milhas ou em dinheiro?"
    : "Preço, melhor dia e quando comprar";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundImage:
            "linear-gradient(140deg, #0b1526 0%, #14233d 55%, #1d2d4d 100%)",
          color: TINTA,
          fontSize: 32,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 18,
              height: 18,
              borderRadius: 9,
              background: MILHAS,
            }}
          />
          <div style={{ display: "flex", letterSpacing: 2, color: TINTA_MEDIA }}>
            MILHAS
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 86,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -2,
            }}
          >
            {cidadeOrigem}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              fontSize: 86,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -2,
            }}
          >
            <div style={{ display: "flex", color: MILHAS }}>→</div>
            <div style={{ display: "flex" }}>{cidadeDestino}</div>
          </div>

          {/* Uma string so, e nao varios filhos com gap: o gap do flex
              e o separador escrito dentro do texto nao batem, e a linha
              sai com espacamento irregular entre os pontos. */}
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 34,
              color: TINTA_MEDIA,
            }}
          >
            {[iataOrigem, iataDestino, detalhe]
              .filter((p) => p !== null)
              .join("  ·  ")}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 36,
            color: TINTA,
          }}
        >
          {chamada}
        </div>
      </div>
    ),
    size,
  );
}
