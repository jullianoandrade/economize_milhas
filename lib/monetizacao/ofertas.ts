import { faseDaJornada, tiposUteisNaFase, type FaseDaJornada } from "./jornada";
import { montarLink, monetizacaoAtiva } from "./links";
import { parceiros, type Parceiro, type TipoDeParceiro } from "./parceiros";

/**
 * O que oferecer, e quando.
 *
 * A lista sai da fase da viagem, nunca do valor da comissao: a ordem dos
 * tipos dentro de cada fase e a ordem em que a pessoa precisa deles.
 * Cartao de credito nao aparece a quinze dias do embarque, por mais que
 * seja o item de maior ticket -- naquele momento ele e inutil, e oferecer
 * o inutil custa a confianca que faz o resto funcionar.
 */

export type Oferta = {
  tipo: TipoDeParceiro;
  nome: string;
  url: string | null;
  /** Nao configurado ainda: a interface pode mostrar como "em breve". */
  disponivel: boolean;
};

export type ContextoDaOferta = {
  diasAteAViagem: number | null;
  internacional: boolean;
  destinoIata?: string;
  origemIata?: string;
};

export function ofertasRelevantes(contexto: ContextoDaOferta): {
  fase: FaseDaJornada;
  ofertas: Oferta[];
} {
  const fase = faseDaJornada(contexto.diasAteAViagem);

  // Com a flag desligada nao ha o que oferecer, mas a fase continua sendo
  // informacao util por si so: ela diz a pessoa o que fazer agora.
  if (!monetizacaoAtiva()) return { fase, ofertas: [] };

  const tipos = tiposUteisNaFase(fase, {
    internacional: contexto.internacional,
  });

  const ofertas = tipos.flatMap((tipo) => {
    const parceiro = parceiros.find((p) => p.tipo === tipo);
    if (!parceiro) return [];

    return [
      {
        tipo,
        nome: parceiro.nome,
        url: montarLink(parceiro, parametrosDe(parceiro, contexto)),
        disponivel: parceiro.url !== "",
      },
    ];
  });

  return { fase, ofertas };
}

function parametrosDe(
  parceiro: Parceiro,
  contexto: ContextoDaOferta,
): Record<string, string> {
  if (parceiro.tipo === "voo" && contexto.origemIata && contexto.destinoIata) {
    return { origin_iata: contexto.origemIata, destination_iata: contexto.destinoIata };
  }
  if (parceiro.tipo === "hotel" && contexto.destinoIata) {
    return { destination: contexto.destinoIata };
  }
  return {};
}
