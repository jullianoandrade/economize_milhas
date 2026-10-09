"use client";

import { useEffect, useState } from "react";
import { Cabecalho } from "@/components/Cabecalho";
import { CampoDeLugar, type Lugar } from "@/components/CampoDeLugar";
import { usarPerfil } from "@/store/perfil";
import { milhas as fmtMilhas, reais, reaisExatos } from "@/lib/format";

/**
 * Plano de acumulo.
 *
 * A pessoa diz para onde quer ir e como anda a vida financeira dela; o
 * app responde quanto falta, em quanto tempo chega e se o plano se paga.
 * O calculo roda em /api/plano para nao arrastar a base de aeroportos e
 * as tabelas de resgate para dentro do bundle.
 *
 * O formulario guarda o estado no componente. Com Cache Components
 * ligado, o Next mantem a rota montada ao navegar para outra aba, entao
 * o que foi preenchido continua la na volta.
 */

type Catalogo = {
  cartoes: Array<{
    id: string;
    nome: string;
    emissor: string;
    pontosPorDolarNacional: number;
    anuidadeBRL: number | null;
  }>;
};

type Resposta = {
  rota: {
    origem: { iata: string; cidade: string };
    destino: { iata: string; cidade: string };
    rotulo: string;
  };
  preco: { valorBRL: number; fonte: string };
  programa: { id: string; nome: string };
  plano: {
    milhasNecessarias: number;
    milhasFaltando: number;
    milhasPorMes: number;
    mesesNecessarios: number | null;
    custoTotalBRL: number;
    precoDaPassagemBRL: number;
    economiaBRL: number;
    explicacao: string;
    alerta: string | null;
    fontes: Array<{
      id: string;
      rotulo: string;
      milhasPorMes: number;
      custoMensalBRL: number;
      explicacao: string;
    }>;
    cartoesSugeridos: Array<{
      cartao: { id: string; nome: string; emissor: string };
      milhasPorMes: number;
      custoAnualBRL: number;
      cpmBRL: number;
      mesesParaMeta: number;
      isento: boolean;
      anuidadeDesconhecida: boolean;
    }>;
  };
};

export default function Plano() {
  const origemIata = usarPerfil((p) => p.origemIata);

  const [destino, setDestino] = useState<Lugar | null>(null);
  const [saldoMilhas, setSaldoMilhas] = useState(0);
  const [saldoPontos, setSaldoPontos] = useState(0);
  const [gasto, setGasto] = useState(3000);
  const [cartaoId, setCartaoId] = useState<string>("");
  const [aceitaClube, setAceitaClube] = useState(false);

  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/plano")
      .then((r) => r.json())
      .then(setCatalogo)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!destino) return;

    const controlador = new AbortController();
    setCalculando(true);
    setErro(null);

    fetch("/api/plano", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origem: origemIata,
        destino: destino.iata,
        saldoMilhas,
        saldoPontosCoalizao: saldoPontos,
        gastoMensalCartaoBRL: gasto,
        cartaoId: cartaoId || null,
        aceitaClube,
      }),
      signal: controlador.signal,
    })
      .then(async (r) => {
        const corpo = await r.json();
        if (!r.ok) throw new Error(corpo.erro ?? "falha no cálculo");
        setResposta(corpo as Resposta);
        setCalculando(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setErro(e.message);
        setCalculando(false);
      });

    return () => controlador.abort();
  }, [origemIata, destino, saldoMilhas, saldoPontos, gasto, cartaoId, aceitaClube]);

  const plano = resposta?.plano;

  return (
    <>
      <Cabecalho
        titulo="Seu plano de acúmulo"
        subtitulo="Quanto falta, de onde tirar e em quanto tempo você chega na viagem que quer."
      />

      <div className="mb-5">
        <CampoDeLugar rotulo="Para onde você quer ir?" aoSelecionar={setDestino} />
      </div>

      <section className="mb-5 space-y-5 rounded-2xl border border-borda bg-superficie p-4 shadow-card">
        <Deslizante
          rotulo="Quanto você passa no cartão por mês"
          valor={gasto}
          minimo={0}
          maximo={30000}
          passo={500}
          formatar={reais}
          aoMudar={setGasto}
        />

        <div>
          <label
            htmlFor="cartao"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-tinta-fraca"
          >
            Seu cartão
          </label>
          <select
            id="cartao"
            value={cartaoId}
            onChange={(e) => setCartaoId(e.target.value)}
            className="w-full rounded-xl border border-borda bg-superficie px-3 py-3 text-base text-tinta outline-none focus:border-marca"
          >
            <option value="">Não tenho / não sei</option>
            {catalogo?.cartoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} · {c.pontosPorDolarNacional} pts/US$
              </option>
            ))}
          </select>
        </div>

        <Deslizante
          rotulo="Milhas que você já tem"
          valor={saldoMilhas}
          minimo={0}
          maximo={200000}
          passo={1000}
          formatar={fmtMilhas}
          aoMudar={setSaldoMilhas}
        />

        <Deslizante
          rotulo="Pontos parados na Livelo ou Esfera"
          valor={saldoPontos}
          minimo={0}
          maximo={200000}
          passo={1000}
          formatar={fmtMilhas}
          aoMudar={setSaldoPontos}
        />

        <label className="flex items-center gap-3 text-sm text-tinta">
          <input
            type="checkbox"
            checked={aceitaClube}
            onChange={(e) => setAceitaClube(e.target.checked)}
            className="size-5 rounded border-borda accent-[var(--marca)]"
          />
          Toparia assinar um clube de milhas
        </label>
      </section>

      {!destino ? (
        <p className="rounded-2xl border border-dashed border-borda bg-superficie-2 p-5 text-sm leading-relaxed text-tinta-media">
          Escolha um destino acima para o app montar o plano.
        </p>
      ) : null}

      {erro ? (
        <p className="rounded-2xl border border-borda bg-alerta-fundo p-4 text-sm text-alerta">
          {erro}
        </p>
      ) : null}

      {calculando && !plano ? (
        <div className="h-48 animate-pulse rounded-2xl bg-superficie-2" />
      ) : null}

      {plano && resposta ? (
        <>
          <section className="rounded-2xl border border-marca bg-superficie p-5 shadow-card">
            <h2 className="mb-1 text-lg font-semibold tracking-tight text-tinta">
              {resposta.rota.destino.cidade} pelo {resposta.programa.nome}
            </h2>
            <p className="tabular mb-4 text-sm text-tinta-media">
              {fmtMilhas(plano.milhasNecessarias)} milhas · passagem a{" "}
              {reais(plano.precoDaPassagemBRL)}
            </p>

            <dl className="tabular mb-4 grid grid-cols-3 gap-2 border-y border-borda py-3 text-center">
              <div>
                <dt className="text-[11px] text-tinta-fraca">Falta</dt>
                <dd className="text-sm font-semibold text-tinta">
                  {fmtMilhas(plano.milhasFaltando)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-tinta-fraca">Por mês</dt>
                <dd className="text-sm font-semibold text-tinta">
                  {fmtMilhas(plano.milhasPorMes)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-tinta-fraca">Prazo</dt>
                <dd className="text-sm font-semibold text-marca">
                  {plano.mesesNecessarios === null
                    ? "—"
                    : plano.mesesNecessarios === 0
                      ? "pronto"
                      : `${plano.mesesNecessarios} ${plano.mesesNecessarios === 1 ? "mês" : "meses"}`}
                </dd>
              </div>
            </dl>

            <p className="text-sm leading-relaxed text-tinta-media">
              {plano.explicacao}
            </p>

            {plano.alerta ? (
              <p className="mt-3 rounded-xl bg-alerta-fundo p-3 text-sm leading-relaxed text-alerta">
                {plano.alerta}
              </p>
            ) : null}
          </section>

          {plano.fontes.length > 0 ? (
            <section className="mt-4 rounded-2xl border border-borda bg-superficie p-4 shadow-card">
              <h2 className="mb-3 font-semibold text-tinta">De onde vêm</h2>
              <ul className="space-y-3">
                {plano.fontes.map((f) => (
                  <li key={f.id} className="border-t border-borda pt-3 first:border-0 first:pt-0">
                    <div className="mb-0.5 flex items-baseline justify-between gap-3">
                      <span className="font-medium text-tinta">{f.rotulo}</span>
                      {f.milhasPorMes > 0 ? (
                        <span className="tabular shrink-0 text-sm text-tinta-media">
                          +{fmtMilhas(f.milhasPorMes)}/mês
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs leading-relaxed text-tinta-media">
                      {f.explicacao}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {plano.cartoesSugeridos.length > 0 ? (
            <section className="mt-4 rounded-2xl border border-borda bg-superficie p-4 shadow-card">
              <h2 className="mb-1 font-semibold text-tinta">
                Cartões que fechariam a conta mais rápido
              </h2>
              <p className="mb-3 text-xs leading-relaxed text-tinta-media">
                Ordenado pelo que cada mil milhas custaria de anuidade no seu
                nível de gasto. Nosso ranking nunca considera quanto ganhamos.
              </p>
              <ul className="space-y-2.5">
                {plano.cartoesSugeridos.slice(0, 4).map((c) => (
                  <li
                    key={c.cartao.id}
                    className="flex items-baseline justify-between gap-3 border-t border-borda pt-2.5 first:border-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-tinta">
                        {c.cartao.nome}
                      </p>
                      <p className="tabular text-xs text-tinta-fraca">
                        {fmtMilhas(c.milhasPorMes)}/mês ·{" "}
                        {c.anuidadeDesconhecida
                          ? "anuidade não informada"
                          : c.isento
                            ? "anuidade isenta no seu gasto"
                            : c.custoAnualBRL === 0
                              ? "sem anuidade"
                              : `${reais(c.custoAnualBRL)}/ano`}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-right">
                      <span className="block text-sm font-semibold text-tinta">
                        {c.mesesParaMeta} {c.mesesParaMeta === 1 ? "mês" : "meses"}
                      </span>
                      <span className="block text-[11px] text-tinta-fraca">
                        {reaisExatos(c.cpmBRL)}/milheiro
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}

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
