"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MarcoDoObjetivo } from "./MarcoDoObjetivo";
import { Cabecalho } from "./Cabecalho";
import { CampoDeLugar, type Lugar } from "./CampoDeLugar";
import { Ilustracao } from "./Ilustracao";
import { LinhaDoObjetivo } from "./LinhaDoObjetivo";
import { Termo } from "./Termo";
import { usarPerfil, usePerfilHidratado } from "@/store/perfil";
import {
  calcularProgresso,
  mesAno,
  paraIso,
  type Meta,
  type Situacao,
} from "@/lib/metas/progresso";
import { milhas as fmtMilhas, reais, reaisExatos } from "@/lib/format";

/**
 * Objetivos de viagem.
 *
 * Esta tela substituiu o antigo "plano de acumulo". A diferenca nao e de
 * nome: o plano respondia "em quanto tempo eu chegaria", uma conta que a
 * pessoa refazia do zero a cada visita e que nunca sabia se ela tinha
 * andado. O objetivo guarda o ponto de partida, e so com ele existe a
 * pergunta que realmente prende alguem a um app de milhas -- "estou indo
 * bem?".
 *
 * O calculo continua em /api/plano, no servidor: o motor depende da base
 * de aeroportos e das tabelas de resgate, mais de 60 KB que nao fazem
 * sentido viajar ate o navegador so para preencher um formulario.
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
    minimoDeTransferencia: number | null;
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

const APARENCIA_DA_SITUACAO: Record<
  Situacao,
  { rotulo: string; classe: string }
> = {
  concluida: { rotulo: "Meta batida", classe: "bg-dinheiro-fundo text-dinheiro" },
  adiantada: { rotulo: "Adiantado", classe: "bg-dinheiro-fundo text-dinheiro" },
  "no-ritmo": { rotulo: "No ritmo", classe: "bg-marca-fraca text-marca" },
  atrasada: { rotulo: "Atrasado", classe: "bg-alerta-fundo text-alerta" },
  parada: { rotulo: "Sem acúmulo", classe: "bg-alerta-fundo text-alerta" },
  "sem-prazo": { rotulo: "Sem data", classe: "bg-superficie-2 text-tinta-media" },
};

/**
 * A altura da tela e reservada, nao estimada.
 *
 * Sem ela o esqueleto media 22rem, a tela real media quase o dobro, e o
 * rodape descia quando o conteudo chegava -- deslocamento de 0,159 no
 * Lighthouse, que na mao se sente como a tela pulando.
 */
export const ALTURA_RESERVADA = "min-h-[48rem]";

/** Acima disto, a estimativa do trecho mudou o bastante para avisar. */
const DESVIO_QUE_MERECE_AVISO = 0.1;

function novoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `meta-${Date.now()}`;
}

export function TelaDeObjetivos() {
  const parametros = useSearchParams();
  const destinoDaUrl = parametros.get("destino")?.toUpperCase() ?? null;

  const origemIata = usarPerfil((p) => p.origemIata);
  const metas = usarPerfil((p) => p.metas);
  const salvarMeta = usarPerfil((p) => p.salvarMeta);
  const registrarSaldo = usarPerfil((p) => p.registrarSaldo);
  const definirDataAlvo = usarPerfil((p) => p.definirDataAlvo);
  const atualizarRitmo = usarPerfil((p) => p.atualizarRitmo);
  const atualizarEstimativa = usarPerfil((p) => p.atualizarEstimativa);
  const removerMeta = usarPerfil((p) => p.removerMeta);
  const definirAcumulo = usarPerfil((p) => p.definirAcumulo);
  const perfilGasto = usarPerfil((p) => p.gastoMensalCartaoBRL);
  const perfilCartao = usarPerfil((p) => p.cartaoId);
  const perfilPontos = usarPerfil((p) => p.saldoPontosCoalizao);
  const perfilClube = usarPerfil((p) => p.aceitaClube);

  // Tudo aqui depende do localStorage, que so existe depois da
  // hidratacao. Renderizar antes disso mostraria "nenhum objetivo" para
  // quem tem tres.
  const hidratado = usePerfilHidratado();

  const [idAtivo, setIdAtivo] = useState<string | null>(null);
  /**
   * "auto" deixa a tela decidir sozinha entre criar e acompanhar; os
   * outros dois sao a escolha explicita de quem apertou "novo objetivo"
   * ou "cancelar". Guardar a decisao em vez de deduzi-la num efeito
   * evita um render a mais e, principalmente, evita que a tela volte ao
   * modo de criacao sozinha depois de a pessoa ter saido dele.
   */
  const [modo, setModo] = useState<"auto" | "criando" | "acompanhando">("auto");
  const [destinoNovo, setDestinoNovo] = useState<Lugar | null>(null);

  // Ponto de partida (na criacao) e saldo novo (no acompanhamento).
  const [saldoDigitado, setSaldoDigitado] = useState("");
  const [dataAlvoDigitada, setDataAlvoDigitada] = useState("");

  /**
   * Os quatro controles de acumulo nascem do PERFIL.
   *
   * Eram `useState` solto: a pessoa respondia aqui, recarregava a
   * pagina e perdia tudo -- e a tela de rota nunca ficava sabendo. Como
   * e exatamente esse dado que decide "milhas ou dinheiro", perde-lo
   * fazia o app voltar a cotar o custo de um estranho.
   *
   * O estado local continua existindo para o controle responder ao
   * arrasto; o perfil e gravado ao SOLTAR (ver `gravarAcumulo`).
   */
  const [saldoPontos, setSaldoPontos] = useState(perfilPontos);
  const [gasto, setGasto] = useState(perfilGasto ?? 3000);
  const [cartaoId, setCartaoId] = useState(perfilCartao ?? "");
  const [aceitaClube, setAceitaClube] = useState(perfilClube);

  function gravarAcumulo(dados: {
    gasto?: number;
    cartao?: string;
    pontos?: number;
    clube?: boolean;
  }) {
    definirAcumulo({
      gastoMensalCartaoBRL: dados.gasto ?? gasto,
      cartaoId: (dados.cartao ?? cartaoId) || null,
      saldoPontosCoalizao: dados.pontos ?? saldoPontos,
      aceitaClube: dados.clube ?? aceitaClube,
    });
  }

  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const metaAtiva: Meta | null = useMemo(() => {
    if (!hidratado) return null;
    const porUrl = destinoDaUrl
      ? metas.find((m) => m.destinoIata === destinoDaUrl)
      : undefined;
    return (
      metas.find((m) => m.id === idAtivo) ?? porUrl ?? metas[0] ?? null
    );
  }, [hidratado, metas, idAtivo, destinoDaUrl]);

  // Chegar com ?destino de uma rota que ainda nao e objetivo abre a tela
  // ja no modo de criacao, com o destino preenchido.
  const destinoDaUrlEhNovo =
    destinoDaUrl !== null && !metas.some((m) => m.destinoIata === destinoDaUrl);

  const emCriacao =
    modo === "criando"
      ? true
      : modo === "acompanhando"
        ? false
        : hidratado && (metas.length === 0 || destinoDaUrlEhNovo);

  useEffect(() => {
    fetch("/api/plano")
      .then((r) => r.json())
      .then(setCatalogo)
      .catch(() => {});
  }, []);

  const destinoAlvo = emCriacao
    ? (destinoNovo?.iata ?? destinoDaUrl)
    : (metaAtiva?.destinoIata ?? null);

  const saldoAtualDaMeta =
    metaAtiva?.registros[metaAtiva.registros.length - 1]?.saldo ?? 0;

  const saldoParaCalculo = emCriacao
    ? Number(saldoDigitado || 0)
    : saldoAtualDaMeta;

  const idParaRitmo = emCriacao ? null : (metaAtiva?.id ?? null);

  useEffect(() => {
    if (!destinoAlvo) return;

    const controlador = new AbortController();

    fetch("/api/plano", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origem: origemIata,
        destino: destinoAlvo,
        saldoMilhas: saldoParaCalculo,
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
        const dados = corpo as Resposta;
        setResposta(dados);
        setErro(null);
        // O ritmo do objetivo e consequencia do plano, entao acompanha
        // o plano sem a pessoa precisar apertar nada.
        if (idParaRitmo) atualizarRitmo(idParaRitmo, dados.plano.milhasPorMes);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setErro(e.message);
      });

    return () => controlador.abort();
  }, [
    origemIata,
    destinoAlvo,
    saldoParaCalculo,
    saldoPontos,
    gasto,
    cartaoId,
    aceitaClube,
    idParaRitmo,
    atualizarRitmo,
  ]);

  function criarObjetivo() {
    if (!resposta) return;
    const hoje = paraIso(new Date());
    const partida = Number(saldoDigitado || 0);

    const meta: Meta = {
      id: novoId(),
      origemIata,
      destinoIata: resposta.rota.destino.iata,
      destinoCidade: resposta.rota.destino.cidade,
      programaId: resposta.programa.id,
      programaNome: resposta.programa.nome,
      milhasNecessarias: resposta.plano.milhasNecessarias,
      precoDaPassagemBRL: resposta.plano.precoDaPassagemBRL,
      criadaEm: hoje,
      dataAlvo: dataAlvoDigitada || null,
      ritmoMensalEstimado: resposta.plano.milhasPorMes,
      registros: [{ em: hoje, saldo: partida }],
      marcosCelebrados: [],
    };

    salvarMeta(meta);
    setIdAtivo(meta.id);
    setModo("acompanhando");
    setDestinoNovo(null);
    setSaldoDigitado("");
    setDataAlvoDigitada("");
  }

  if (!hidratado) {
    return (
      <div
        className={`${ALTURA_RESERVADA} space-y-4`}
        aria-label="Carregando seus objetivos"
      >
        <div className="h-28 animate-pulse rounded-2xl bg-superficie-2" />
        <div className="h-80 animate-pulse rounded-[28px] bg-superficie-2" />
        <div className="h-56 animate-pulse rounded-[28px] bg-superficie-2" />
      </div>
    );
  }

  return (
    <div className={ALTURA_RESERVADA}>
      <Cabecalho
        sobrelinha={metas.length > 0 ? "Seus objetivos" : undefined}
        titulo={emCriacao ? "Um novo objetivo" : "Quanto falta"}
        subtitulo={
          emCriacao
            ? "Escolha o destino e diga quantas milhas você tem hoje. Esse número vira o seu ponto de partida — é com ele que o app mede o quanto você andou."
            : "O app guarda o seu ponto de partida e acompanha a distância até a viagem."
        }
      />

      {metas.length > 1 && !emCriacao ? (
        <div className="faixa-rolante -mx-4 mb-4 gap-2 px-4 pb-1">
          {metas.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setIdAtivo(m.id)}
              aria-pressed={m.id === metaAtiva?.id}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                m.id === metaAtiva?.id
                  ? "border-marca bg-marca text-marca-contraste"
                  : "border-borda bg-superficie text-tinta-media"
              }`}
            >
              {m.destinoCidade}
            </button>
          ))}
        </div>
      ) : null}

      {emCriacao ? (
        <section className="mb-5 rounded-[28px] border border-borda bg-superficie p-4 shadow-card">
          <div className="mb-4">
            <CampoDeLugar
              rotulo="Para onde você quer ir?"
              valorInicial={destinoDaUrl ?? ""}
              aoSelecionar={setDestinoNovo}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="partida"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-tinta-fraca"
            >
              Quantas milhas você tem hoje
            </label>
            <input
              id="partida"
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              value={saldoDigitado}
              onChange={(e) => setSaldoDigitado(e.target.value)}
              placeholder="0"
              className="tabular w-full rounded-xl border border-borda bg-superficie px-3 py-3 text-base text-tinta outline-none focus:border-marca"
            />
            <p className="mt-1.5 text-xs leading-relaxed text-tinta-fraca">
              Pode ser zero. O valor fica guardado como marco inicial e não é
              alterado depois — é o que permite dizer quanto você acumulou.
            </p>
          </div>

          <div>
            <label
              htmlFor="alvo"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-tinta-fraca"
            >
              Quando quer viajar (opcional)
            </label>
            <input
              id="alvo"
              type="date"
              min={paraIso(new Date())}
              value={dataAlvoDigitada}
              onChange={(e) => setDataAlvoDigitada(e.target.value)}
              className="w-full rounded-xl border border-borda bg-superficie px-3 py-3 text-base text-tinta outline-none focus:border-marca"
            />
          </div>
        </section>
      ) : null}

      {!destinoAlvo ? (
        <section className="rounded-[28px] border border-dashed border-borda bg-superficie-2 p-6 text-center">
          <Ilustracao cena="meta" className="mx-auto mb-3 w-48" />
          <p className="text-sm leading-relaxed text-tinta-media">
            Escolha um destino acima para o app calcular quantas milhas a
            viagem custa e montar o objetivo.
          </p>
        </section>
      ) : null}

      {erro ? (
        <p className="mb-4 rounded-2xl border border-borda bg-alerta-fundo p-4 text-sm text-alerta">
          {erro}
        </p>
      ) : null}

      {destinoAlvo && !resposta && !erro ? (
        <div className="h-64 animate-pulse rounded-[28px] bg-superficie-2" />
      ) : null}

      {/* ---------------- Criacao: previa antes de confirmar ------------- */}

      {emCriacao && resposta ? (
        <section className="mb-5 painel rounded-[28px] p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-painel-tinta-fraca">
            {resposta.programa.nome}
          </p>
          <h2 className="display mt-0.5 text-2xl">
            {resposta.rota.destino.cidade}
          </h2>
          <p className="tabular mt-2 text-sm text-painel-tinta-fraca">
            {fmtMilhas(resposta.plano.milhasNecessarias)} milhas por trecho ·
            passagem a {reais(resposta.plano.precoDaPassagemBRL)}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-painel-tinta-fraca">
            {resposta.plano.explicacao}
          </p>

          <button
            type="button"
            onClick={criarObjetivo}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-painel-tinta px-5 text-sm font-semibold text-painel"
          >
            Criar objetivo
          </button>

          {metas.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setModo("acompanhando");
                setDestinoNovo(null);
              }}
              className="mt-2 w-full text-center text-sm text-painel-tinta-fraca underline underline-offset-4"
            >
              cancelar
            </button>
          ) : null}
        </section>
      ) : null}

      {/* -------------- Acompanhamento de um objetivo existente ---------- */}

      {!emCriacao && metaAtiva ? (
        <ObjetivoAtivo
          meta={metaAtiva}
          resposta={resposta}
          aoRegistrar={(saldo) =>
            registrarSaldo(metaAtiva.id, { em: paraIso(new Date()), saldo })
          }
          aoDefinirData={(data) => definirDataAlvo(metaAtiva.id, data)}
          aoAtualizarEstimativa={(milhas, preco) =>
            atualizarEstimativa(metaAtiva.id, milhas, preco)
          }
          aoRemover={() => {
            removerMeta(metaAtiva.id);
            setIdAtivo(null);
          }}
        />
      ) : null}

      {/* ---------------- Como acelerar: o plano de acumulo -------------- */}

      {resposta ? (
        <section className="mt-5 rounded-[28px] border border-borda bg-superficie p-4 shadow-card">
          <h2 className="display mb-1 text-xl text-tinta">
            {emCriacao ? "De onde viriam as milhas" : "Como acelerar"}
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-tinta-media">
            Ajuste a sua situação e veja o prazo mudar.
          </p>

          <div className="mb-5 space-y-5">
            <Deslizante
              rotulo="Quanto você passa no cartão por mês"
              valor={gasto}
              minimo={0}
              maximo={30000}
              passo={500}
              formatar={reais}
              aoMudar={setGasto}
              aoSoltar={(v) => gravarAcumulo({ gasto: v })}
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
                onChange={(e) => {
                  setCartaoId(e.target.value);
                  gravarAcumulo({ cartao: e.target.value });
                }}
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

            <div>
              <Deslizante
                rotulo="Pontos parados na Livelo ou Esfera"
                valor={saldoPontos}
                minimo={0}
                maximo={200000}
                passo={1000}
                formatar={fmtMilhas}
                aoMudar={setSaldoPontos}
                aoSoltar={(v) => gravarAcumulo({ pontos: v })}
              />
              {resposta?.plano.minimoDeTransferencia ? (
                // div, nao p: o painel do Termo e um <div popover>, e um
                // <p> fecharia sozinho ao encontra-lo (ver CardPrograma.tsx).
                <div className="mt-1.5 text-xs leading-relaxed text-tinta-fraca">
                  A Livelo exige{" "}
                  <Termo id="paridade">
                    mínimo de{" "}
                    {fmtMilhas(resposta.plano.minimoDeTransferencia)} pontos
                  </Termo>{" "}
                  de uma vez para transferir ao {resposta.programa.nome}.
                </div>
              ) : null}
            </div>

            <label className="flex items-center gap-3 text-sm text-tinta">
              <input
                type="checkbox"
                checked={aceitaClube}
                onChange={(e) => {
                  setAceitaClube(e.target.checked);
                  gravarAcumulo({ clube: e.target.checked });
                }}
                className="size-5 rounded border-borda accent-[var(--marca)]"
              />
              Toparia assinar um clube de milhas
            </label>
          </div>

          {resposta.plano.alerta ? (
            <p className="mb-4 rounded-xl bg-alerta-fundo p-3 text-sm leading-relaxed text-alerta">
              {resposta.plano.alerta}
            </p>
          ) : null}

          {resposta.plano.fontes.length > 0 ? (
            <ul className="mb-4 space-y-3">
              {resposta.plano.fontes.map((f) => (
                <li
                  key={f.id}
                  className="border-t border-borda pt-3 first:border-0 first:pt-0"
                >
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
          ) : null}

          {resposta.plano.cartoesSugeridos.length > 0 ? (
            <div className="border-t border-borda pt-4">
              <h3 className="mb-1 font-semibold text-tinta">
                Cartões que fechariam a conta mais rápido
              </h3>
              <p className="mb-3 text-xs leading-relaxed text-tinta-media">
                Ordenado pelo que cada mil milhas custaria de anuidade no seu
                nível de gasto. Nosso ranking nunca considera quanto ganhamos.
              </p>
              <ul className="space-y-2.5">
                {resposta.plano.cartoesSugeridos.slice(0, 4).map((c) => (
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
                        {c.mesesParaMeta}{" "}
                        {c.mesesParaMeta === 1 ? "mês" : "meses"}
                      </span>
                      <span className="block text-[11px] text-tinta-fraca">
                        {reaisExatos(c.cpmBRL)}/milheiro
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {!emCriacao && metas.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            setModo("criando");
            setDestinoNovo(null);
            setSaldoDigitado("");
            setDataAlvoDigitada("");
          }}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-marca px-5 text-sm font-semibold text-marca"
        >
          Novo objetivo
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ObjetivoAtivo({
  meta,
  resposta,
  aoRegistrar,
  aoDefinirData,
  aoAtualizarEstimativa,
  aoRemover,
}: {
  meta: Meta;
  resposta: Resposta | null;
  aoRegistrar: (saldo: number) => void;
  aoDefinirData: (data: string | null) => void;
  aoAtualizarEstimativa: (milhas: number, preco: number) => void;
  aoRemover: () => void;
}) {
  const hoje = new Date();
  const progresso = calcularProgresso(meta, hoje);
  const aparencia = APARENCIA_DA_SITUACAO[progresso.situacao];

  const [novoSaldo, setNovoSaldo] = useState("");

  // A estimativa do trecho muda quando o preco da rota muda. Em vez de
  // mexer na meta por conta propria -- o que faria o objetivo se mover
  // sozinho debaixo da pessoa -- o app avisa e deixa ela decidir.
  const estimativaAtual = resposta?.plano.milhasNecessarias ?? null;
  const desvio =
    estimativaAtual && meta.milhasNecessarias > 0
      ? Math.abs(estimativaAtual - meta.milhasNecessarias) /
        meta.milhasNecessarias
      : 0;
  const estimativaMudou = desvio > DESVIO_QUE_MERECE_AVISO;

  return (
    <>
      <section className="mb-4 painel rounded-[28px] p-5">
        <div className="mb-4 flex items-center gap-4">
          <MarcoDoObjetivo
            metaId={meta.id}
            percentual={progresso.percentual}
            marcosCelebrados={meta.marcosCelebrados}
            tom="claro"
            rotulo="pronto"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-painel-tinta-fraca">
              {meta.programaNome}
            </p>
            <h2 className="display truncate text-2xl leading-tight">
              {meta.destinoCidade}
            </h2>
            <p className="tabular mt-1 text-sm text-painel-tinta-fraca">
              {fmtMilhas(progresso.saldoAtual)} de{" "}
              {fmtMilhas(meta.milhasNecessarias)} milhas
            </p>
          </div>
        </div>

        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${aparencia.classe}`}
        >
          {aparencia.rotulo}
        </span>

        <p className="mt-3 text-sm leading-relaxed text-painel-tinta-fraca">
          {progresso.resumo}
        </p>

        {progresso.chegadaPrevistaEm ? (
          <p className="tabular mt-3 flex items-baseline gap-2 border-t border-painel-realce pt-3 text-sm">
            <span className="text-painel-tinta-fraca">Chegada prevista</span>
            <span className="font-semibold text-painel-tinta">
              {mesAno(progresso.chegadaPrevistaEm)}
            </span>
          </p>
        ) : null}
      </section>

      <section className="mb-4 rounded-[28px] border border-borda bg-superficie p-4 shadow-card">
        <h3 className="display mb-3 text-lg text-tinta">Como você andou</h3>

        <LinhaDoObjetivo meta={meta} hoje={hoje} />

        <dl className="tabular mt-4 grid grid-cols-3 gap-2 border-t border-borda pt-3 text-center">
          <div>
            <dt className="text-[11px] text-tinta-fraca">Ponto de partida</dt>
            <dd className="text-sm font-semibold text-tinta">
              {fmtMilhas(progresso.pontoDePartida)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-tinta-fraca">Acumulado</dt>
            <dd className="text-sm font-semibold text-dinheiro">
              +{fmtMilhas(progresso.ganhoDesdeOInicio)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-tinta-fraca">
              {progresso.ritmoRealMensal === null ? "Ritmo previsto" : "Ritmo real"}
            </dt>
            <dd className="text-sm font-semibold text-tinta">
              {fmtMilhas(progresso.ritmoConsiderado)}/mês
            </dd>
          </div>
        </dl>

        {progresso.ritmoRealMensal === null ? (
          <p className="mt-2 text-xs leading-relaxed text-tinta-fraca">
            Ainda não dá para medir o seu ritmo real: são necessários pelo
            menos dois registros com três semanas entre eles. Até lá, o prazo
            vem da projeção do plano de acúmulo.
          </p>
        ) : null}

        <div className="mt-4 border-t border-borda pt-4">
          <label
            htmlFor="novo-saldo"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-tinta-fraca"
          >
            Atualizar saldo de hoje
          </label>
          <div className="flex gap-2">
            <input
              id="novo-saldo"
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              value={novoSaldo}
              onChange={(e) => setNovoSaldo(e.target.value)}
              placeholder={String(progresso.saldoAtual)}
              className="tabular min-w-0 flex-1 rounded-xl border border-borda bg-superficie px-3 py-3 text-base text-tinta outline-none focus:border-marca"
            />
            <button
              type="button"
              disabled={novoSaldo === ""}
              onClick={() => {
                aoRegistrar(Number(novoSaldo));
                setNovoSaldo("");
              }}
              className="shrink-0 rounded-xl bg-marca px-5 text-sm font-semibold text-marca-contraste disabled:opacity-40"
            >
              Registrar
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-tinta-fraca">
            Confira o saldo no app do {meta.programaNome} e registre aqui de
            vez em quando. Cada registro melhora a medida do seu ritmo.
          </p>
        </div>

        <div className="mt-4 border-t border-borda pt-4">
          <label
            htmlFor="data-alvo"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-tinta-fraca"
          >
            Data pretendida da viagem
          </label>
          <input
            id="data-alvo"
            type="date"
            min={paraIso(hoje)}
            value={meta.dataAlvo ?? ""}
            onChange={(e) => aoDefinirData(e.target.value || null)}
            className="w-full rounded-xl border border-borda bg-superficie px-3 py-3 text-base text-tinta outline-none focus:border-marca"
          />
          {progresso.ritmoNecessarioMensal &&
          progresso.situacao === "atrasada" ? (
            <p className="tabular mt-1.5 text-xs leading-relaxed text-alerta">
              Para chegar nessa data seriam{" "}
              {fmtMilhas(progresso.ritmoNecessarioMensal)} milhas por mês.
            </p>
          ) : null}
        </div>
      </section>

      {estimativaMudou && estimativaAtual && resposta ? (
        <section className="mb-4 rounded-2xl border border-milhas-borda bg-milhas-fundo p-4">
          <h3 className="mb-1 text-sm font-semibold text-tinta">
            A estimativa desta rota mudou
          </h3>
          <p className="tabular text-sm leading-relaxed text-tinta-media">
            Quando você criou o objetivo, o trecho custava{" "}
            {fmtMilhas(meta.milhasNecessarias)} milhas. Hoje a nossa estimativa
            é de {fmtMilhas(estimativaAtual)}. Programas usam precificação
            dinâmica — a conta muda com o preço da passagem.
          </p>
          <button
            type="button"
            onClick={() =>
              aoAtualizarEstimativa(
                estimativaAtual,
                resposta.plano.precoDaPassagemBRL,
              )
            }
            className="mt-3 rounded-full bg-milhas px-4 py-2 text-xs font-semibold text-milhas-contraste"
          >
            Atualizar a meta para {fmtMilhas(estimativaAtual)}
          </button>
        </section>
      ) : null}

      <button
        type="button"
        onClick={aoRemover}
        className="text-sm text-tinta-fraca underline underline-offset-2 hover:text-alerta"
      >
        Apagar este objetivo
      </button>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Deslizante({
  rotulo,
  valor,
  minimo,
  maximo,
  passo,
  formatar,
  aoMudar,
  aoSoltar,
}: {
  rotulo: string;
  valor: number;
  minimo: number;
  maximo: number;
  passo: number;
  formatar: (n: number) => string;
  aoMudar: (n: number) => void;
  /** Chamado uma vez por gesto, nao a cada passo do arrasto. */
  aoSoltar?: (n: number) => void;
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
        onPointerUp={() => aoSoltar?.(valor)}
        onKeyUp={() => aoSoltar?.(valor)}
        onBlur={() => aoSoltar?.(valor)}
        className="h-6 w-full accent-[var(--marca)]"
        aria-label={rotulo}
      />
    </div>
  );
}
