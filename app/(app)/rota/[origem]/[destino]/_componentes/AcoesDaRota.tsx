import Link from "next/link";
import type { Veredito } from "@/lib/milhas/veredito";
import type { FaseDaJornada } from "@/lib/monetizacao/jornada";
import { LinkParaPassagem } from "@/components/dominio/LinkParaPassagem";
import { IrParaAPassagem } from "./IrParaAPassagem";
import type { PassagemVista } from "./passagem";

/**
 * O que fazer com a resposta: um botao primario, nunca dois do mesmo
 * peso, e os dois caminhos sempre a mao.
 *
 *   resgatar        -> primario "Resgatar no {programa}",
 *                      secundario "Ver passagem em dinheiro"
 *   guardar / pagar -> primario "Ver passagem de R$ X em {dia}",
 *                      secundario "Resgatar no {programa}"
 *
 * O secundario existe nos dois sentidos. Quando o veredito e milhas,
 * pode nao haver assento de resgate no dia; quando e dinheiro, quem ja
 * decidiu usar as milhas (estao vencendo, por exemplo) nao pode ficar
 * sem porta. O peso visual e que diz o que recomendamos.
 *
 * Os links de passagem sao sempre visiveis: monetizacao so decide o
 * marker e a nota de comissao (ver IrParaAPassagem). Todo clique que leva
 * a passagem vira viagem "em vista" (LinkParaPassagem).
 */
export function AcoesDaRota({
  veredito,
  origemIata,
  destinoIata,
  dataEscolhida,
  fase,
  passagem,
}: {
  veredito: Veredito;
  origemIata: string;
  destinoIata: string;
  dataEscolhida: string | null;
  fase: FaseDaJornada;
  passagem: PassagemVista | null;
}) {
  // A viagem ja passou: nenhuma destas acoes faz sentido mais.
  if (fase === "passou") return null;

  const melhor = !veredito.foraDoModelo ? veredito.melhor : null;
  const precoReferenciaBRL = passagem?.precoBRL ?? veredito.precoDinheiroBRL;

  const resgatar = melhor ? (
    <LinkParaPassagem
      href={melhor.programa.site}
      tipo="utilidade"
      variante={veredito.rotulo === "resgatar" ? "primario" : "secundario"}
      saida={{
        origemIata,
        destinoIata,
        ida: passagem?.ida ?? dataEscolhida,
        precoVistoBRL: precoReferenciaBRL > 0 ? precoReferenciaBRL : null,
        forma: "milhas",
        programaId: melhor.programa.id,
      }}
    >
      Resgatar no {melhor.programa.nome}
    </LinkParaPassagem>
  ) : null;

  const dinheiro = (variante: "primario" | "secundario") => (
    <IrParaAPassagem
      origemIata={origemIata}
      destinoIata={destinoIata}
      passagem={passagem}
      dataEscolhida={dataEscolhida}
      precoReferenciaBRL={precoReferenciaBRL}
      variante={variante}
    />
  );

  // "Guardar" (compensa, mas rende pouco) segue o caminho do dinheiro:
  // a placa manda pagar e guardar, e o botao primario nao pode dizer
  // "Resgatar" logo abaixo.
  if (veredito.rotulo === "resgatar" && resgatar) {
    return (
      <div className="mt-4 space-y-3">
        {resgatar}
        {dinheiro("secundario")}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {dinheiro("primario")}
      {resgatar ? <div className="text-center">{resgatar}</div> : null}
      {melhor ? (
        <div className="text-center">
          <Link
            href="/oportunidades"
            className="text-sm font-semibold text-tinta-media underline underline-offset-4"
          >
            Suas milhas rendem mais em outro trecho
          </Link>
        </div>
      ) : null}
    </div>
  );
}
