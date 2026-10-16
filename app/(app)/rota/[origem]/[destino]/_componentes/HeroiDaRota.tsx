import type { Veredito } from "@/lib/milhas/veredito";
import type { Fonte } from "@/lib/providers/travelpayouts";
import type { FaseDaJornada } from "@/lib/monetizacao/jornada";
import { CardVeredito } from "./CardVeredito";
import { ReguaDoResgate } from "@/components/dominio/ReguaDoResgate";
import { FaixaDeMilhas } from "./FaixaDeMilhas";
import { AcoesDaRota } from "./AcoesDaRota";

/**
 * "A resposta": o veredito, a régua e a faixa do programa vencedor, e o
 * que fazer a respeito -- a parte do herói que depende do CPM de quem
 * calcula.
 *
 * Extraído para o mesmo JSX nascer uma vez e rodar nos dois lugares: no
 * servidor, com o CPM de mercado; dentro de IlhaDoVeredito, no cliente,
 * quando o CPM da própria pessoa chega depois da hidratação.
 */
export function HeroiDaRota({
  veredito,
  fonte,
  observacaoDaFonte,
  origemIata,
  destinoIata,
  dataEscolhida,
  fase,
}: {
  veredito: Veredito;
  fonte: Fonte;
  observacaoDaFonte: string;
  origemIata: string;
  destinoIata: string;
  dataEscolhida: string | null;
  fase: FaseDaJornada;
}) {
  return (
    <>
      <CardVeredito
        veredito={veredito}
        fonte={fonte}
        observacaoDaFonte={observacaoDaFonte}
      />

      {veredito.melhor ? (
        <div className="mt-4">
          <ReguaDoResgate
            razao={veredito.melhor.razao}
            qualidade={veredito.melhor.qualidade}
            cpmBRL={veredito.melhor.caminho.cpmBRL}
            valorExtraidoPorMilheiroBRL={
              veredito.melhor.valorExtraidoPorMilheiroBRL
            }
          />
          <div className="mt-3">
            <FaixaDeMilhas
              min={veredito.melhor.milhasFaixa.min}
              max={veredito.melhor.milhasFaixa.max}
              atual={veredito.melhor.milhas}
              unidade={veredito.melhor.programa.unidade}
            />
          </div>
        </div>
      ) : null}

      <AcoesDaRota
        veredito={veredito}
        origemIata={origemIata}
        destinoIata={destinoIata}
        dataEscolhida={dataEscolhida}
        fase={fase}
      />
    </>
  );
}
