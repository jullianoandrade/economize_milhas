import {
  DESCRICAO_DA_FASE,
  type FaseDaJornada,
} from "@/lib/monetizacao/jornada";

/**
 * Em que fase da viagem a pessoa esta, e o que isso significa agora.
 *
 * A fase vem do motor de jornada, que tambem decide o que oferecer quando
 * a monetizacao estiver ligada. Mas ela nao existe por causa da receita:
 * saber que ainda da tempo de acumular, ou que a janela de compra ja
 * chegou, e util por si so -- e e o que a faixa mostra hoje, com a
 * monetizacao desligada.
 */

const APARENCIA: Record<
  FaseDaJornada,
  { rotulo: string; classe: string; cor: string }
> = {
  acumulo: {
    rotulo: "Fase de acúmulo",
    classe: "border-milhas-borda bg-milhas-fundo",
    cor: "text-milhas",
  },
  decisao: {
    rotulo: "Hora de decidir",
    classe: "border-dinheiro-borda bg-dinheiro-fundo",
    cor: "text-dinheiro",
  },
  preparacao: {
    rotulo: "Reta final",
    classe: "border-marca bg-marca-fraca",
    cor: "text-marca",
  },
  passou: {
    rotulo: "Data no passado",
    classe: "border-borda bg-superficie-2",
    cor: "text-tinta-media",
  },
};

export function FaixaDaJornada({
  fase,
  diasAteAViagem,
}: {
  fase: FaseDaJornada;
  diasAteAViagem: number;
}) {
  const a = APARENCIA[fase];

  return (
    <section className={`rounded-2xl border p-4 ${a.classe}`}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span
          className={`text-xs font-bold uppercase tracking-widest ${a.cor}`}
        >
          {a.rotulo}
        </span>
        {diasAteAViagem >= 0 ? (
          <span className="tabular text-sm text-tinta-media">
            faltam {diasAteAViagem.toLocaleString("pt-BR")}{" "}
            {diasAteAViagem === 1 ? "dia" : "dias"}
          </span>
        ) : null}
      </div>
      <p className="text-sm leading-relaxed text-tinta-media">
        {DESCRICAO_DA_FASE[fase]}
      </p>
    </section>
  );
}
