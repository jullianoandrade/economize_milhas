import { NextResponse } from "next/server";
import {
  AeroportoDesconhecidoError,
  classificarRota,
} from "@/lib/milhas/regioes";
import { calcularVeredito } from "@/lib/milhas/veredito";
import { precoDoTrecho } from "@/lib/precos";

/**
 * O mesmo veredito da tela de rota, com o CPM da pessoa.
 *
 * A pagina de rota e Server Component sob PPR: o primeiro render usa o
 * CPM de quem compra milhas porque o perfil mora so no navegador. Esta
 * rota existe para a ilha cliente pedir de novo, depois da hidratacao,
 * com `gasto`/`cartaoId` que ja estao no localStorage da pessoa.
 */

const numero = (v: string | null) => {
  const n = v !== null ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export async function GET(requisicao: Request) {
  const parametros = new URL(requisicao.url).searchParams;
  const origem = (parametros.get("origem") ?? "").trim().toUpperCase();
  const destino = (parametros.get("destino") ?? "").trim().toUpperCase();
  const gastoMensalCartaoBRL = numero(parametros.get("gasto"));
  const cartaoId = parametros.get("cartaoId") ?? undefined;

  let rota;
  try {
    rota = classificarRota(origem, destino);
  } catch (erro) {
    if (erro instanceof AeroportoDesconhecidoError) {
      return NextResponse.json(
        { erro: `nao conheco o aeroporto ${erro.iata}` },
        { status: 400 },
      );
    }
    throw erro;
  }

  const preco = await precoDoTrecho(rota);
  const veredito = calcularVeredito(rota, preco.dados, {
    perfil: { gastoMensalCartaoBRL, cartaoId },
  });

  return NextResponse.json({
    veredito,
    preco: {
      valorBRL: preco.dados,
      fonte: preco.fonte,
      observacao: preco.observacao,
    },
  });
}
