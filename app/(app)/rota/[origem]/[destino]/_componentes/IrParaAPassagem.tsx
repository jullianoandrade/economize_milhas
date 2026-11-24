import { LinkParaPassagem } from "@/components/dominio/LinkParaPassagem";
import { linkDeBuscaDeVoo, monetizacaoAtiva } from "@/lib/monetizacao/links";
import { reais } from "@/lib/format";
import { NotaDeTransparencia } from "./NotaDeTransparencia";
import { diaEMes, frescorDoPreco, type PassagemVista } from "./passagem";

/**
 * O caminho do preco ate a passagem em dinheiro: o link para a busca ja
 * preenchida (origem, destino e, quando ha, o dia) e, logo abaixo, o
 * que a pessoa precisa saber antes de tocar.
 *
 * Sempre visivel. A direcao nao depende de monetizacao: com a flag
 * desligada o link sai limpo, sem marker, e sem a nota de comissao --
 * nao ha comissao a declarar. Ligada, o mesmo link leva o marker, vira
 * "patrocinado" no rel e a NotaDeTransparencia aparece junto.
 *
 * Um so lugar para o heroi (AcoesDaRota) e para o calendario: o botao
 * que a pessoa ve depois de escolher o dia e o mesmo do topo.
 */
export function IrParaAPassagem({
  origemIata,
  destinoIata,
  passagem,
  dataEscolhida,
  precoReferenciaBRL,
  variante = "primario",
}: {
  origemIata: string;
  destinoIata: string;
  passagem: PassagemVista | null;
  dataEscolhida: string | null;
  /** O preco em dinheiro que a tela mostra, para o registro da saida. */
  precoReferenciaBRL: number;
  variante?: "primario" | "secundario";
}) {
  const ida = passagem?.ida ?? dataEscolhida;
  const busca = linkDeBuscaDeVoo({ origemIata, destinoIata, data: ida });
  if (!busca) return null;

  // So conta como "o dia" se o formato completo deu certo: a busca
  // parcial abre sem data, e o texto nao pode prometer o que nao leva.
  const diaNaBusca = busca.precisao === "completo" ? ida : null;
  const patrocinado = monetizacaoAtiva();

  const texto =
    passagem && diaNaBusca
      ? `Ver passagem de ${reais(passagem.precoBRL)} em ${diaEMes(diaNaBusca)}`
      : diaNaBusca
        ? `Ver passagens em ${diaEMes(diaNaBusca)}`
        : "Ver passagem em dinheiro";

  const precoVisto = passagem?.precoBRL ?? precoReferenciaBRL;
  const frescor = passagem ? frescorDoPreco(passagem.vistoHaDias) : null;

  return (
    <div className={variante === "primario" ? "space-y-2" : "space-y-1 text-center"}>
      <LinkParaPassagem
        href={busca.url}
        tipo={patrocinado ? "patrocinado" : "utilidade"}
        variante={variante}
        saida={{
          origemIata,
          destinoIata,
          ida: diaNaBusca,
          precoVistoBRL: precoVisto > 0 ? precoVisto : null,
          forma: "dinheiro",
        }}
      >
        {texto}
      </LinkParaPassagem>

      {/* O que muda entre o app e a outra aba, dito antes do toque: o
          preco e de cache recente, e o Aviasales nao tem portugues nem
          real (verificado em 24/11/2026: so ingles e russo, e o real nao
          esta na lista de moedas). */}
      <p className="text-[13px] leading-snug text-tinta-media">
        {frescor ? `${capitalizar(frescor.texto)}; pode ter mudado. ` : null}
        Abre o Aviasales, em inglês e com valores em dólar.
      </p>

      {patrocinado ? <NotaDeTransparencia /> : null}
    </div>
  );
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
