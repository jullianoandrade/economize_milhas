"use client";

import { useState } from "react";
import { avaliarResgate } from "@/lib/milhas/veredito";
import { rotuloDoVeredito, TEXTO_LONGO, COR_DO_ROTULO } from "@/lib/milhas/rotulos";
import { ReguaDoResgate } from "@/components/dominio/ReguaDoResgate";
import { reais, reaisExatos, milhas as fmtMilhas } from "@/lib/format";

/**
 * A conta do app, com os SEUS números.
 *
 * Todo termo do glossário já tem porta própria nas telas de cálculo; a
 * calculadora é a porta de saída inversa -- em vez de explicar um número
 * que apareceu, deixa a pessoa inventar os números dela e ver a mesma
 * régua que o resto do app usa reagir ao vivo. Usa avaliarResgate() e
 * ReguaDoResgate direto do motor: a conta aqui é a MESMA conta de
 * qualquer rota, não uma reimplementação paralela que podia divergir.
 */

function Deslizante({
  rotulo,
  valor,
  minimo,
  maximo,
  passo,
  formatar,
  aoMudar,
}: {
  rotulo: string;
  valor: number;
  minimo: number;
  maximo: number;
  passo: number;
  formatar: (n: number) => string;
  aoMudar: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-tinta-fraca">
          {rotulo}
        </label>
        <output className="tabular text-sm font-semibold text-tinta">
          {formatar(valor)}
        </output>
      </div>
      <input
        type="range"
        min={minimo}
        max={maximo}
        step={passo}
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        className="h-6 w-full accent-[var(--marca)]"
        aria-label={rotulo}
      />
    </div>
  );
}

export function CalculadoraDeCpm() {
  const [pago, setPago] = useState(184);
  const [milhasRecebidas, setMilhasRecebidas] = useState(5000);
  const [precoDaPassagem, setPrecoDaPassagem] = useState(2200);
  const [taxas, setTaxas] = useState(250);
  const [milhasDoResgate, setMilhasDoResgate] = useState(42000);

  const cpmBRL = milhasRecebidas > 0 ? (pago / milhasRecebidas) * 1000 : 0;

  const avaliacao =
    milhasDoResgate > 0
      ? avaliarResgate(precoDaPassagem, milhasDoResgate, taxas, cpmBRL)
      : null;

  const recomendacao: "milhas" | "dinheiro" =
    avaliacao && avaliacao.economiaBRL > 0 ? "milhas" : "dinheiro";
  const rotuloDoResultado = rotuloDoVeredito(recomendacao, false);

  return (
    <section className="rounded-[24px] border border-borda bg-superficie p-4 shadow-card">
      <h2 className="display mb-1 text-xl text-tinta">
        Calcule com os seus números
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-tinta-media">
        Os mesmos dois passos que o app faz em cada rota: quanto a milha
        custou, e quanto ela valeu no resgate.
      </p>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tinta-fraca">
        1. Quanto a milha custou
      </p>
      <div className="mb-4 space-y-4 rounded-2xl bg-superficie-2 p-3">
        <Deslizante
          rotulo="Quanto você pagou"
          valor={pago}
          minimo={0}
          maximo={2000}
          passo={10}
          formatar={reais}
          aoMudar={setPago}
        />
        <Deslizante
          rotulo="Quantas milhas ou pontos recebeu"
          valor={milhasRecebidas}
          minimo={100}
          maximo={50000}
          passo={100}
          formatar={fmtMilhas}
          aoMudar={setMilhasRecebidas}
        />
        <p className="tabular text-sm text-tinta-media">
          Sua milha custou{" "}
          <strong className="font-semibold text-tinta">
            {reaisExatos(cpmBRL)}
          </strong>
          .
        </p>
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tinta-fraca">
        2. Quanto ela valeria num resgate
      </p>
      <div className="mb-4 space-y-4 rounded-2xl bg-superficie-2 p-3">
        <Deslizante
          rotulo="Preço da passagem em dinheiro"
          valor={precoDaPassagem}
          minimo={200}
          maximo={10000}
          passo={100}
          formatar={reais}
          aoMudar={setPrecoDaPassagem}
        />
        <Deslizante
          rotulo="Taxas de embarque"
          valor={taxas}
          minimo={0}
          maximo={1000}
          passo={10}
          formatar={reais}
          aoMudar={setTaxas}
        />
        <Deslizante
          rotulo="Milhas do resgate"
          valor={milhasDoResgate}
          minimo={1000}
          maximo={150000}
          passo={1000}
          formatar={fmtMilhas}
          aoMudar={setMilhasDoResgate}
        />
      </div>

      {avaliacao ? (
        <div className="border-t border-borda pt-4">
          <p
            className={`mb-3 text-sm font-semibold ${COR_DO_ROTULO[rotuloDoResultado]}`}
          >
            {TEXTO_LONGO[rotuloDoResultado]}
          </p>
          <ReguaDoResgate
            razao={avaliacao.razao}
            qualidade={avaliacao.qualidade}
            cpmBRL={cpmBRL}
            valorExtraidoPorMilheiroBRL={avaliacao.valorExtraidoPorMilheiroBRL}
          />
        </div>
      ) : null}
    </section>
  );
}
