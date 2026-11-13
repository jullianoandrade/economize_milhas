import {
  AeroportoDesconhecidoError,
  classificarRota,
} from "@/lib/milhas/regioes";

/**
 * Esta rota merece entrar na fila de coleta?
 *
 * Funcao pura, fora da rota de API, porque e aqui que mora a unica
 * decisao com consequencia de dinheiro em todo o caminho do interesse:
 * cada rota aceita vira, mais tarde, consultas diarias a Travelpayouts
 * e linhas no banco. Aceitar o que nao se deve nao quebra nada de forma
 * visivel -- so gasta orcamento e suja o dado, em silencio. Por isso
 * tem teste proprio.
 */

export type DecisaoDeInteresse =
  | { registrar: true; origem: string; destino: string }
  | { registrar: false; motivo: "rota-desconhecida" | "fora-do-modelo" };

export function avaliarInteresse(
  origemBruta: string,
  destinoBruto: string,
): DecisaoDeInteresse {
  let rota;
  try {
    rota = classificarRota(origemBruta, destinoBruto);
  } catch (erro) {
    if (erro instanceof AeroportoDesconhecidoError) {
      return { registrar: false, motivo: "rota-desconhecida" };
    }
    throw erro;
  }

  // Trecho sem ponta brasileira nao recebe veredito de milhas (ver
  // docs/fronteira-do-motor.md). Coletar preco dele seria alimentar
  // uma tela que o produto nao serve, gastando a mesma cota de API que
  // falta para as rotas que ele serve.
  if (!rota.tocaOBrasil) {
    return { registrar: false, motivo: "fora-do-modelo" };
  }

  // Normalizados: a tabela tem chave primaria composta e "gru" e "GRU"
  // nao podem virar duas linhas.
  return {
    registrar: true,
    origem: rota.origem.iata,
    destino: rota.destino.iata,
  };
}
