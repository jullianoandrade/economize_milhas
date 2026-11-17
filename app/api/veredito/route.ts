import { NextResponse } from "next/server";
import {
  AeroportoDesconhecidoError,
  classificarRota,
} from "@/lib/milhas/regioes";
import { calcularVeredito } from "@/lib/milhas/veredito";
import { precoDoTrecho } from "@/lib/precos";
import { bonusVigentes } from "@/lib/transferencias";
import { limitar } from "@/lib/seguranca/requisicao";
import { REGRAS } from "@/lib/seguranca/limite";
import { consultaDoVeredito, parametrosDe } from "@/lib/seguranca/esquemas";

/**
 * O mesmo veredito da tela de rota, com o CPM da pessoa.
 *
 * A pagina de rota e Server Component sob PPR: o primeiro render usa o
 * CPM de quem compra milhas porque o perfil mora so no navegador. Esta
 * rota existe para a ilha cliente pedir de novo, depois da hidratacao,
 * com `gasto`/`cartaoId` que ja estao no localStorage da pessoa.
 */

export async function GET(requisicao: Request) {
  const bloqueio = limitar(requisicao, "veredito", REGRAS.consultaExterna);
  if (bloqueio) return bloqueio;

  const consulta = consultaDoVeredito.safeParse(
    parametrosDe(requisicao.url, ["origem", "destino", "gasto", "cartaoId"]),
  );
  if (!consulta.success) {
    return NextResponse.json({ erro: "rota invalida" }, { status: 400 });
  }
  const { origem, destino, gasto: gastoMensalCartaoBRL, cartaoId } =
    consulta.data;

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

  const [preco, bonus] = await Promise.all([
    precoDoTrecho(rota),
    bonusVigentes(),
  ]);
  const veredito = calcularVeredito(rota, preco.dados, {
    perfil: { gastoMensalCartaoBRL, cartaoId },
    bonusVigentes: bonus,
  });

  return NextResponse.json({
    veredito,
    // O minimo da rota que o globo da tela Explorar precisa para tracar
    // o arco e escrever o nome das cidades. A base de aeroportos inteira
    // continua no servidor.
    rota: {
      origem: pontoDaRota(rota.origem),
      destino: pontoDaRota(rota.destino),
      distanciaKm: rota.distanciaKm,
    },
    preco: {
      valorBRL: preco.dados,
      fonte: preco.fonte,
      observacao: preco.observacao,
    },
  });
}

function pontoDaRota(a: { iata: string; cidade: string; lat: number; lon: number }) {
  return { iata: a.iata, cidade: a.cidade, lat: a.lat, lon: a.lon };
}
