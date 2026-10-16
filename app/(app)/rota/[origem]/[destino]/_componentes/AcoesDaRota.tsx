import Link from "next/link";
import type { Veredito } from "@/lib/milhas/veredito";
import type { FaseDaJornada } from "@/lib/monetizacao/jornada";
import { linkDeBuscaDeVoo, monetizacaoAtiva } from "@/lib/monetizacao/links";
import { LinkExterno } from "@/components/dominio/LinkExterno";
import { NotaDeTransparencia } from "./NotaDeTransparencia";

/**
 * Um botao primario, nunca dois do mesmo peso.
 *
 * "Resgatar no {programa}" e risco zero: usa data/programas.json, que ja
 * existe, nao depende da flag de monetizacao e nao precisa de
 * divulgacao -- por isso NotaDeTransparencia so aparece junto do link
 * patrocinado (a busca de preco em dinheiro via Aviasales), nunca junto
 * do botao de resgate.
 *
 * Quando o veredito recomenda milhas, o secundario oferece ver o preco
 * em dinheiro mesmo assim: pode nao haver assento de resgate na data
 * escolhida, e sem essa saida a pessoa ficaria numa porta que pode estar
 * fechada. O contrario nao vale -- linkar o programa depois de dizer
 * "pague em dinheiro" seria incoerente com o proprio conselho.
 */
export function AcoesDaRota({
  veredito,
  origemIata,
  destinoIata,
  dataEscolhida,
  fase,
}: {
  veredito: Veredito;
  origemIata: string;
  destinoIata: string;
  dataEscolhida: string | null;
  fase: FaseDaJornada;
}) {
  // A viagem ja passou: nenhuma destas acoes faz sentido mais.
  if (fase === "passou") return null;

  const busca = monetizacaoAtiva()
    ? linkDeBuscaDeVoo({ origemIata, destinoIata, data: dataEscolhida })
    : null;

  if (veredito.recomendacao === "milhas" && veredito.melhor) {
    return (
      <div className="mt-4 space-y-3">
        <LinkExterno
          href={veredito.melhor.programa.site}
          tipo="utilidade"
          variante="primario"
        >
          Resgatar no {veredito.melhor.programa.nome}
        </LinkExterno>

        {busca ? (
          <div className="text-center">
            <LinkExterno href={busca.url} tipo="patrocinado" variante="secundario">
              Ver preços em dinheiro
            </LinkExterno>
          </div>
        ) : null}

        {busca ? <NotaDeTransparencia /> : null}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {busca ? (
        <>
          <LinkExterno href={busca.url} tipo="patrocinado" variante="primario">
            Ver preços atuais
          </LinkExterno>
          <NotaDeTransparencia />
        </>
      ) : null}

      <div className="text-center">
        <Link
          href="/promocoes"
          className="text-sm font-semibold text-tinta-media underline underline-offset-4"
        >
          Suas milhas rendem mais em outro trecho
        </Link>
      </div>
    </div>
  );
}
