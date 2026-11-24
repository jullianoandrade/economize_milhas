import type { JanelaDeCompra } from "@/lib/tempo/antecedencia";
import { porcentagem } from "@/lib/format";
import { Termo } from "@/components/dominio/Termo";
import { SeloDeOrigem } from "@/components/ui/SeloDeOrigem";
import { LembreteDeCompra } from "./LembreteDeCompra";

/**
 * Compro agora ou espero?
 *
 * O card mostra a janela como uma barra, com a posicao de hoje marcada
 * quando a pessoa informou a data do voo. A explicacao termina dizendo
 * de onde veio o numero: curva propria desta rota ou estimativa de
 * mercado. Essa distincao importa tanto quanto o numero -- e e a unica coisa que
 * melhora sozinha com o tempo, conforme o historico acumula.
 */

const APARENCIA = {
  "comprar-agora": {
    rotulo: "Boa hora de comprar",
    classe: "bg-dinheiro-fundo text-dinheiro",
  },
  esperar: {
    rotulo: "Ainda é cedo",
    classe: "bg-milhas-fundo text-milhas",
  },
  "janela-passou": {
    rotulo: "A janela já passou",
    classe: "bg-superficie-2 text-atencao",
  },
} as const;

export function CardQuandoComprar({
  janela,
  rotaId,
}: {
  janela: JanelaDeCompra;
  rotaId: string;
}) {
  const aparencia = APARENCIA[janela.veredito];
  const temData = janela.diasAteOVoo !== null;

  // Escala da regua: cobre a janela inteira com folga, e o "hoje" quando
  // ele cai fora dela.
  const limite = Math.max(
    janela.diasMax * 1.2,
    (janela.diasAteOVoo ?? 0) * 1.1,
    30,
  );
  // A regua corre da esquerda (muitos dias antes) para a direita (dia do
  // voo), entao mais antecedencia significa mais a esquerda.
  const posicao = (dias: number) => `${100 - (dias / limite) * 100}%`;
  const daDireita = (dias: number) => `${(dias / limite) * 100}%`;

  return (
    // Sem cartao nem titulo proprios: mora dentro do item "Com quanta
    // antecedencia" do BlocoDeQuando, que ja e o cartao e ja diz o
    // assunto. Repetir "Quando comprar" ali dentro era ruido.
    <div>
      {temData ? (
        <p
          className={`mb-3 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${aparencia.classe}`}
        >
          {aparencia.rotulo}
        </p>
      ) : null}

      {/* Regua da antecedencia: o voo fica na direita, o passado na esquerda. */}
      <div className="relative mb-2 h-9">
        <div className="absolute inset-x-0 top-3 h-2 rounded-full bg-superficie-2" />
        <div
          className="absolute top-3 h-2 rounded-full bg-dinheiro/35"
          style={{
            left: posicao(janela.diasMax),
            right: daDireita(janela.diasMin),
          }}
        />
        <div
          className="absolute top-2.5 w-0.5 rounded-full bg-dinheiro"
          style={{ left: posicao(janela.diasOtimo), height: "0.75rem" }}
          aria-hidden="true"
        />
        {temData ? (
          <div
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: posicao(janela.diasAteOVoo!) }}
          >
            <span className="text-[10px] font-semibold text-tinta">hoje</span>
            <span className="h-4 w-0.5 rounded-full bg-tinta" />
          </div>
        ) : null}
      </div>

      <div className="tabular mb-3 flex justify-between text-[11px] text-tinta-fraca">
        <span>{Math.round(limite)} dias antes</span>
        <span>dia do voo</span>
      </div>

      <dl className="tabular mb-3 grid grid-cols-3 gap-2 border-y border-borda py-3 text-center">
        <div>
          <dt className="text-[11px] text-tinta-fraca">
            <Termo id="antecedencia">Janela</Termo>
          </dt>
          <dd className="text-sm font-semibold text-tinta">
            {janela.diasMin}–{janela.diasMax}d
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-tinta-fraca">Melhor ponto</dt>
          <dd className="text-sm font-semibold text-tinta">
            {janela.diasOtimo}d
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-tinta-fraca">Economia</dt>
          <dd className="text-sm font-semibold text-dinheiro">
            {porcentagem(janela.economiaEstimadaPct)}
          </dd>
        </div>
      </dl>

      <p className="text-sm leading-relaxed text-tinta-media">
        {janela.explicacao}
      </p>

      {/* A procedencia por extenso ja vem no fim de janela.explicacao.
          Aqui fica so o selo de origem; a contagem de observacoes mora
          no detalhe dele, e nao numa segunda frase igual a primeira. */}
      <div className="mt-2">
        {janela.fonte === "curva-propria" ? (
          <SeloDeOrigem
            origem="real"
            detalhe={`Curva própria desta rota, de ${janela.observacoes.toLocaleString("pt-BR")} observações de preço.`}
          >
            dados reais desta rota
          </SeloDeOrigem>
        ) : (
          <SeloDeOrigem
            origem="estimado"
            detalhe="Estimativa de mercado. Melhora sozinha conforme coletamos preços desta rota todos os dias."
          >
            estimativa
          </SeloDeOrigem>
        )}
      </div>

      <LembreteDeCompra rotaId={rotaId} esperarDias={janela.esperarDias} />
    </div>
  );
}
