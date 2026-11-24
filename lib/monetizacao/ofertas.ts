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
  /** Nome da cidade de destino: a busca de hospedagem procura por ele. */
  destinoCidade?: string;
  /** Datas da estadia, AAAA-MM-DD. Check-in costuma ser a data de ida. */
  checkin?: string;
  checkout?: string;
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
  if (parceiro.tipo === "hotel" && (contexto.destinoCidade || contexto.destinoIata)) {
    return parametrosDeHospedagem({
      cidade: contexto.destinoCidade ?? contexto.destinoIata ?? "",
      checkin: contexto.checkin,
      checkout: contexto.checkout,
    });
  }
  return {};
}

/**
 * Busca de hospedagem do Booking.com: cidade, datas e ocupacao na URL.
 * Formato conferido num navegador de verdade (ver a observacao do
 * parceiro em data/parceiros-comercial.json).
 */
function parametrosDeHospedagem(estadia: {
  cidade: string;
  checkin?: string;
  checkout?: string;
  adultos?: number;
}): Record<string, string> {
  const datas: Record<string, string> =
    estadia.checkin && estadia.checkout && DIA.test(estadia.checkin) && DIA.test(estadia.checkout)
      ? { checkin: estadia.checkin, checkout: estadia.checkout }
      : {};
  return {
    ss: estadia.cidade,
    ...datas,
    group_adults: String(estadia.adultos ?? 2),
    no_rooms: "1",
    group_children: "0",
  };
}

const DIA = /^\d{4}-\d{2}-\d{2}$/;

export type LinkDeHospedagem = {
  url: string;
  /** Quem abre a busca, para o texto do botao. */
  parceiro: string;
  /**
   * Se o link carrega marcacao de afiliado. So isto depende da flag de
   * monetizacao: o link em si sai sempre, ligada ou desligada -- a
   * direcao que o app da nao pode depender de quanto ele ganha.
   */
  comissionado: boolean;
};

/**
 * Hospedagem na cidade de destino, nas datas da viagem.
 *
 * Diferente de ofertasRelevantes, nao some com a monetizacao
 * desligada: quem reservou a passagem precisa de onde ficar, ganhe o app
 * alguma coisa com isso ou nao.
 */
export function linkDeHospedagem(estadia: {
  cidade: string;
  checkin?: string;
  checkout?: string;
  adultos?: number;
}): LinkDeHospedagem | null {
  const cidade = estadia.cidade.trim();
  if (!cidade) return null;
  const parceiro = parceiros.find((p) => p.tipo === "hotel");
  if (!parceiro) return null;
  const url = montarLink(parceiro, parametrosDeHospedagem({ ...estadia, cidade }));
  if (!url) return null;
  const marker = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER?.trim();
  return {
    url,
    parceiro: parceiro.nome,
    comissionado: monetizacaoAtiva() && parceiro.parametroDeMarker !== "" && Boolean(marker),
  };
}
