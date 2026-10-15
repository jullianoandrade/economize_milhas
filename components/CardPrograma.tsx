import type { OpcaoDeResgate, Qualidade } from "@/lib/milhas/veredito";
import { milhas, reais, reaisExatos } from "@/lib/format";
import { FaixaDeMilhas } from "./FaixaDeMilhas";
import { ReguaDoResgate } from "./ReguaDoResgate";
import { SeloDeConfianca } from "./SeloDeFonte";

/**
 * Como fica o resgate em um programa especifico.
 *
 * As duas linhas que importam estao juntas de proposito: quanto a milha
 * VALEU aqui e quanto ela CUSTA para voce. E a comparacao entre as duas
 * que diz se o resgate presta, e ver uma sem a outra nao ensina nada.
 */

const ESTILO_QUALIDADE: Record<Qualidade, { rotulo: string; classe: string }> = {
  excelente: {
    rotulo: "resgate excelente",
    classe: "bg-dinheiro-fundo text-dinheiro",
  },
  bom: { rotulo: "resgate bom", classe: "bg-dinheiro-fundo text-dinheiro" },
  regular: { rotulo: "resgate regular", classe: "bg-superficie-2 text-tinta-media" },
  ruim: { rotulo: "não compensa", classe: "bg-alerta-fundo text-alerta" },
};

export function CardPrograma({
  opcao,
  destaque = false,
}: {
  opcao: OpcaoDeResgate;
  destaque?: boolean;
}) {
  const qualidade = ESTILO_QUALIDADE[opcao.qualidade];

  return (
    <article
      className={`rounded-2xl border bg-superficie p-4 shadow-card ${
        destaque ? "border-marca" : "border-borda"
      }`}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-tinta">
          {opcao.programa.nome}
          <span className="ml-1.5 text-xs font-normal text-tinta-fraca">
            {opcao.programa.companhia}
          </span>
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${qualidade.classe}`}
        >
          {qualidade.rotulo}
        </span>
      </header>

      <p className="tabular text-lg font-semibold text-tinta">
        {milhas(opcao.milhas)}{" "}
        <span className="text-sm font-normal text-tinta-media">
          {opcao.programa.unidade} + {reais(opcao.taxasBRL)} de taxas
        </span>
      </p>

      <div className="mb-3 mt-1.5">
        <FaixaDeMilhas
          min={opcao.milhasFaixa.min}
          max={opcao.milhasFaixa.max}
          atual={opcao.milhas}
          unidade={opcao.programa.unidade}
        />
      </div>

      <dl className="space-y-1.5 border-t border-borda pt-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-tinta-media">Custo real do resgate</dt>
          <dd className="tabular font-semibold text-tinta">
            {reais(opcao.custoRealBRL)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-tinta-media">Você extrai por milheiro</dt>
          <dd className="tabular font-semibold text-dinheiro">
            {reaisExatos(opcao.valorExtraidoPorMilheiroBRL)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-tinta-media">Sua milha custa</dt>
          <dd className="tabular font-semibold text-tinta">
            {reaisExatos(opcao.caminho.cpmBRL)}
          </dd>
        </div>
      </dl>

      <div className="mt-3">
        <ReguaDoResgate
          razao={opcao.razao}
          qualidade={opcao.qualidade}
          cpmBRL={opcao.caminho.cpmBRL}
          valorExtraidoPorMilheiroBRL={opcao.valorExtraidoPorMilheiroBRL}
        />
      </div>

      <footer className="mt-3 border-t border-borda pt-3">
        <p className="text-xs leading-relaxed text-tinta-media">
          <span className="font-medium text-tinta">
            {opcao.caminho.rotulo}.
          </span>{" "}
          {opcao.caminho.explicacao}
        </p>
        {opcao.caminho.detalhe ? (
          <p className="tabular mt-1 text-xs text-tinta-fraca">
            {opcao.caminho.detalhe}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <SeloDeConfianca confianca={opcao.confianca} />
        </div>
      </footer>
    </article>
  );
}
