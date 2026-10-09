import { NextResponse } from "next/server";
import { montarPlano } from "@/lib/milhas/acumulo";
import { AeroportoDesconhecidoError, classificarRota } from "@/lib/milhas/regioes";
import { calcularVeredito } from "@/lib/milhas/veredito";
import { precoDoTrecho } from "@/lib/precos";
import { cartoes, programas } from "@/lib/dados";

/**
 * Monta o plano de acumulo para um destino.
 *
 * Roda no servidor por um motivo pratico: o motor depende da base de
 * aeroportos e das tabelas de resgate, que somam mais de 60 KB. Mandar
 * isso para o navegador so para preencher um formulario seria desperdicio
 * -- a pagina do plano fica leve e pede a conta pronta.
 */

type Corpo = {
  origem?: string;
  destino?: string;
  programa?: string;
  saldoMilhas?: number;
  saldoPontosCoalizao?: number;
  gastoMensalCartaoBRL?: number;
  cartaoId?: string | null;
  aceitaClube?: boolean;
};

const numero = (v: unknown, padrao = 0) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : padrao;

export async function POST(requisicao: Request) {
  let corpo: Corpo;
  try {
    corpo = (await requisicao.json()) as Corpo;
  } catch {
    return NextResponse.json({ erro: "corpo invalido" }, { status: 400 });
  }

  const origem = (corpo.origem ?? "").trim().toUpperCase();
  const destino = (corpo.destino ?? "").trim().toUpperCase();

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
  const veredito = calcularVeredito(rota, preco.dados);

  // Sem programa escolhido, usa o que sai melhor nesta rota.
  const programaId = corpo.programa ?? veredito.melhor?.programa.id;
  const opcao =
    veredito.opcoes.find((o) => o.programa.id === programaId) ??
    veredito.melhor;

  if (!opcao) {
    return NextResponse.json(
      { erro: "nenhum programa da nossa base atende esta rota" },
      { status: 422 },
    );
  }

  const situacao = {
    saldoMilhas: numero(corpo.saldoMilhas),
    saldoPontosCoalizao: numero(corpo.saldoPontosCoalizao),
    gastoMensalCartaoBRL: numero(corpo.gastoMensalCartaoBRL),
    cartaoId: corpo.cartaoId ?? null,
    aceitaClube: corpo.aceitaClube === true,
  };

  const plano = montarPlano(
    opcao.programa.id,
    opcao.milhas,
    preco.dados,
    situacao,
  );

  return NextResponse.json({
    rota: {
      origem: { iata: rota.origem.iata, cidade: rota.origem.cidade },
      destino: { iata: rota.destino.iata, cidade: rota.destino.cidade },
      rotulo: rota.rotulo,
    },
    preco: { valorBRL: preco.dados, fonte: preco.fonte },
    programa: { id: opcao.programa.id, nome: opcao.programa.nome },
    plano,
  });
}

/** Catalogo para montar os seletores do formulario sem embutir data/ no bundle. */
export async function GET() {
  return NextResponse.json({
    programas: programas.programas.map((p) => ({
      id: p.id,
      nome: p.nome,
      companhia: p.companhia,
    })),
    cartoes: cartoes.cartoes.map((c) => ({
      id: c.id,
      nome: c.nome,
      emissor: c.emissor,
      pontosPorDolarNacional: c.pontosPorDolarNacional,
      anuidadeBRL: c.anuidadeBRL,
    })),
  });
}
