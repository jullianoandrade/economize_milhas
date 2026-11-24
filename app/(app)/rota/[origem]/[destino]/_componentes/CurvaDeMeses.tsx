import type { Sazonalidade } from "@/lib/tempo/sazonalidade";
import { nomeDoMes } from "@/lib/tempo/sazonalidade";
import { mesCurto, reais, reaisExatos } from "@/lib/format";
import { SeloDeFonte } from "./SeloDeFonte";
import { Termo } from "@/components/dominio/Termo";
import type { Fonte } from "@/lib/providers/travelpayouts";

/**
 * Curva de preco por mes, em barras de HTML.
 *
 * Barras, e nao linha: meses sao categorias discretas que a pessoa
 * compara entre si ("em qual eu vou?"), nao uma serie continua onde
 * interpolar faz sentido.
 *
 * A separacao entre o verde e o ambar fica na faixa 6-8 de delta E para
 * protanopia -- legivel para a maioria, mas nao para todo mundo. Por isso
 * os dois meses marcados aparecem NOMEADOS em texto logo abaixo do
 * grafico, e o rotulo do mes destacado fica em negrito. Nenhuma
 * informacao daqui depende apenas da cor.
 *
 * HTML, e nao SVG com viewBox: o SVG escalava com a largura, e na
 * coluna larga do desktop as barras passavam de 200px de altura e os
 * rotulos dos meses de 18px. Aqui a altura e fixa e o texto fica no
 * tamanho do resto da pagina, em qualquer largura.
 */

/** Altura da area das barras, em px. */
const ALTURA_DAS_BARRAS = 120;

export function CurvaDeMeses({
  sazonalidade,
  fonte,
  observacaoDaFonte,
}: {
  sazonalidade: Sazonalidade;
  fonte: Fonte;
  observacaoDaFonte: string;
}) {
  const { meses, mesMaisBaratoEmDinheiro, mesComMelhorResgate, mesesCoincidem } =
    sazonalidade;

  // O insight mais contraintuitivo do app -- o mes mais barato em
  // dinheiro NAO ser o mes em que a milha rende mais -- estava enterrado
  // no ultimo paragrafo. O booleano ja existia no motor; so faltava
  // deixar ele mandar no titulo, que e a unica linha que todo mundo le.
  const titulo = mesesCoincidem
    ? `${nomeDoMes(mesMaisBaratoEmDinheiro.mes)} é o melhor mês dos dois jeitos`
    : "Os dois melhores meses não são o mesmo";

  const subtitulo = mesesCoincidem
    ? "Passagem mais barata e milha rendendo mais caem no mesmo mês — é raro, e é a melhor hora de ir."
    : "A passagem fica mais barata num mês; a milha rende mais em outro. Qual vale depende de como você vai pagar.";

  const maior = Math.max(...meses.map((m) => m.precoBRL));

  function corDoMes(mes: number) {
    if (mes === mesComMelhorResgate.mes) return "var(--color-grafico-milhas)";
    if (mes === mesMaisBaratoEmDinheiro.mes) return "var(--color-grafico-dinheiro)";
    return "var(--color-grafico-neutro)";
  }

  return (
    // Sem cartao proprio: mora dentro do item "Em que mes ir" do
    // BlocoDeQuando, que ja e o cartao.
    <div>
      <header className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold leading-tight tracking-tight text-tinta">{titulo}</h3>
        <SeloDeFonte fonte={fonte} observacao={observacaoDaFonte} />
      </header>
      {/* div, nao p: ver o mesmo comentario em CardPrograma.tsx. */}
      <div className="mb-4 text-sm leading-relaxed text-tinta-media">
        {subtitulo} <Termo id="alta-temporada">Por quê?</Termo>
      </div>

      <div
        role="img"
        aria-label={`Preço por mês. Mais barato em ${nomeDoMes(
          mesMaisBaratoEmDinheiro.mes,
        )}. Milhas rendem mais em ${nomeDoMes(mesComMelhorResgate.mes)}.`}
        className="max-w-2xl"
      >
        {/* Linha de base discreta: o eixo nao disputa atencao com o dado. */}
        <div
          className="flex items-end gap-1 border-b border-borda"
          style={{ height: ALTURA_DAS_BARRAS }}
        >
          {meses.map((m) => (
            <div key={m.mes} className="flex h-full flex-1 items-end justify-center">
              <span
                className="block w-full max-w-7 rounded-t-[4px]"
                style={{
                  height: `${Math.max(3, (m.precoBRL / maior) * 100)}%`,
                  background: corDoMes(m.mes),
                }}
                title={`${nomeDoMes(m.mes)}: ${reais(m.precoBRL)} · ${reaisExatos(
                  m.valorExtraidoPorMilheiroBRL,
                )} por milheiro`}
              />
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="mt-1.5 flex gap-1">
          {meses.map((m) => {
            const destacado =
              m.mes === mesComMelhorResgate.mes ||
              m.mes === mesMaisBaratoEmDinheiro.mes;
            return (
              <span
                key={m.mes}
                className={`flex-1 text-center text-[11px] leading-none ${
                  destacado ? "font-bold text-tinta" : "text-tinta-fraca"
                }`}
              >
                {mesCurto(m.mes)}
              </span>
            );
          })}
        </div>
      </div>

      {/* Identidade em TEXTO, nao em cor: e o que torna o grafico legivel
          para quem nao distingue verde de ambar.

          A estrutura importa: <dl> so aceita dt, dd ou div como filho
          direto, e o div precisa conter o par diretamente. Aninhar dois
          niveis quebrava a leitura em leitores de tela. */}
      <dl className="mt-2 space-y-2 border-t border-borda pt-3 text-sm">
        <div>
          <dt className="flex items-center gap-2 font-medium text-tinta">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-sm bg-grafico-dinheiro"
            />
            Mais barato em dinheiro: {nomeDoMes(mesMaisBaratoEmDinheiro.mes)}
          </dt>
          <dd className="tabular pl-5 text-tinta-media">
            {reais(mesMaisBaratoEmDinheiro.precoBRL)} a passagem
          </dd>
        </div>

        <div>
          <dt className="flex items-center gap-2 font-medium text-tinta">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-sm bg-grafico-milhas"
            />
            Milhas rendem mais: {nomeDoMes(mesComMelhorResgate.mes)}
          </dt>
          <dd className="tabular pl-5 text-tinta-media">
            {reaisExatos(mesComMelhorResgate.valorExtraidoPorMilheiroBRL)} por
            milheiro
            {mesesCoincidem || sazonalidade.diferencaDeExtracaoPct < 1
              ? ""
              : `, ${Math.round(sazonalidade.diferencaDeExtracaoPct)}% a mais que no pior mês`}
          </dd>
        </div>
      </dl>

      {/* O paragrafo de sazonalidade.explicacao repetia, em oito linhas,
          o titulo e a legenda acima. O unico dado novo dele -- quanto a
          milha rende a mais que no pior mes -- foi para a legenda. */}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-tinta-fraca">
          Ver os números
        </summary>
        <table className="tabular mt-2 w-full text-xs">
          <thead>
            <tr className="text-left text-tinta-fraca">
              <th scope="col" className="py-1 font-medium">Mês</th>
              <th scope="col" className="py-1 text-right font-medium">Passagem</th>
              <th scope="col" className="py-1 text-right font-medium">Milhas</th>
              <th scope="col" className="py-1 text-right font-medium">Por milheiro</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.mes} className="border-t border-borda text-tinta-media">
                <th scope="row" className="py-1 text-left font-normal">
                  {mesCurto(m.mes)}
                </th>
                <td className="py-1 text-right">{reais(m.precoBRL)}</td>
                <td className="py-1 text-right">
                  {m.milhas.toLocaleString("pt-BR")}
                </td>
                <td className="py-1 text-right">
                  {reaisExatos(m.valorExtraidoPorMilheiroBRL)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
