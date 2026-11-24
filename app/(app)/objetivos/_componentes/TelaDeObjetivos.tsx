"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MarcoDoObjetivo } from "@/components/dominio/MarcoDoObjetivo";
import { Globo } from "@/components/dominio/Globo";
import { CampoDeLugar, type Lugar } from "@/components/ui/CampoDeLugar";
import { Milo } from "@/components/ui/Milo";
import { SeloDeOrigem } from "@/components/ui/SeloDeOrigem";
import { useLugar } from "@/lib/cliente/lugar";
import { LinhaDoObjetivo } from "./LinhaDoObjetivo";
import { Termo } from "@/components/dominio/Termo";
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

/**
 * A situacao aparece sobre o painel marinho. Selo escuro com um PONTO de
 * cor, e nao fundo colorido: a cor nunca e a unica pista (o texto diz a
 * situacao) e o texto claro passa contraste em qualquer tema. A versao
 * anterior usava bg-marca-fraca/text-marca, que dentro do painel virava
 * claro sobre claro.
 */
const APARENCIA_DA_SITUACAO: Record<Situacao, { rotulo: string; ponto: string }> = {
  concluida: { rotulo: "Meta batida", ponto: "#4ade9f" },
  adiantada: { rotulo: "Adiantado", ponto: "#4ade9f" },
  "no-ritmo": { rotulo: "No ritmo", ponto: "#ffb020" },
  atrasada: { rotulo: "Atrasado", ponto: "#f87171" },
  parada: { rotulo: "Sem acúmulo", ponto: "#f87171" },
  "sem-prazo": { rotulo: "Sem data", ponto: "#a9b8d6" },
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
    <div className={`${ALTURA_RESERVADA} mx-auto max-w-2xl pb-16`}>
      <Link
        href="/carteira"
        className="-ml-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-tinta-media hover:text-tinta"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Carteira
      </Link>
      <h1 className="display text-[28px] text-tinta">
        {emCriacao ? "Novo objetivo" : "Objetivos de viagem"}
      </h1>
      <p className="mt-1 text-base leading-relaxed text-tinta-media">
        {emCriacao
          ? "Escolha o destino e diga quantas milhas você tem hoje. Esse número vira o ponto de partida: é com ele que o app mede o quanto você andou."
          : "O app guarda o seu ponto de partida e acompanha a distância até a viagem."}
      </p>

      {metas.length > 1 && !emCriacao ? (
        <div className="faixa-rolante -mx-4 mt-4 gap-2 px-4 pb-1">
          {metas.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setIdAtivo(m.id)}
              aria-pressed={m.id === metaAtiva?.id}
              className={`min-h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold transition-colors ${
                m.id === metaAtiva?.id
                  ? "bg-marca text-marca-contraste"
                  : "border border-borda bg-superficie text-tinta"
              }`}
            >
              {m.destinoCidade}
            </button>
          ))}
        </div>
      ) : null}

      {emCriacao ? (
        <section className="mt-5 flex flex-col gap-5 rounded-[24px] bg-superficie p-5 shadow-card">
          <CampoDeLugar
            rotulo="Para onde você quer ir?"
            valorInicial={destinoDaUrl ?? ""}
            aoSelecionar={setDestinoNovo}
          />

          <div>
            <label htmlFor="partida" className="mb-2 block text-[15px] font-semibold text-tinta">
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
              className="tabular h-14 w-full rounded-2xl border border-borda bg-superficie px-4 text-[17px] text-tinta outline-none focus:border-marca"
            />
            <p className="mt-2 text-sm leading-relaxed text-tinta-media">
              Pode ser zero. O valor fica guardado como marco inicial e não muda
              depois: é o que permite dizer quanto você acumulou.
            </p>
          </div>

          <div>
            <label htmlFor="alvo" className="mb-2 block text-[15px] font-semibold text-tinta">
              Quando quer viajar <span className="font-normal text-tinta-media">(opcional)</span>
            </label>
            <input
              id="alvo"
              type="date"
              min={paraIso(new Date())}
              value={dataAlvoDigitada}
              onChange={(e) => setDataAlvoDigitada(e.target.value)}
              className="h-14 w-full rounded-2xl border border-borda bg-superficie px-4 text-[17px] text-tinta outline-none focus:border-marca"
            />
          </div>
        </section>
      ) : null}

      {!destinoAlvo ? (
        <section className="relative mt-5 rounded-[24px] bg-superficie-2 px-5 pb-6 pt-5">
          <p className="max-w-[15rem] text-[19px] font-semibold leading-snug text-tinta">
            Escolha um destino acima.
          </p>
          <p className="mt-2 max-w-[14rem] text-[15px] leading-relaxed text-tinta-media">
            O app calcula quantas milhas a viagem custa e monta o objetivo.
          </p>
          {/* O recorte fica numa camada propria, e nao na <section>: ver
              tests/arquitetura.test.ts (lista de sugestoes cortada). */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
            <Milo pose="pensando" className="absolute -bottom-3 right-1 w-[118px]" />
          </div>
        </section>
      ) : null}

      {erro ? (
        <p role="alert" className="mt-4 rounded-2xl bg-alerta-fundo p-4 text-[15px] text-alerta">
          {erro}
        </p>
      ) : null}

      {destinoAlvo && !resposta && !erro ? (
        <div className="mt-5 h-64 animate-pulse rounded-[24px] bg-superficie-2" />
      ) : null}

      {/* ---------------- Criacao: previa antes de confirmar ------------- */}

      {emCriacao && resposta ? (
        <section className="painel mt-5 rounded-[24px] p-5">
          <p className="text-[15px] text-painel-tinta-fraca">{resposta.programa.nome}</p>
          <h2 className="display mt-0.5 text-[28px] leading-tight">{resposta.rota.destino.cidade}</h2>
          <p className="tabular mt-2 text-[15px]">
            {fmtMilhas(resposta.plano.milhasNecessarias)} milhas por trecho, passagem a{" "}
            {reais(resposta.plano.precoDaPassagemBRL)}
          </p>
          <div className="mt-2.5">
            <SeloDeOrigem origem="estimado" detalhe="Os programas usam precificação dinâmica; a quantidade de milhas é estimativa.">
              estimativa do trecho
            </SeloDeOrigem>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-painel-tinta-fraca">
            {resposta.plano.explicacao}
          </p>

          <button
            type="button"
            onClick={criarObjetivo}
            className="mt-5 min-h-12 w-full rounded-2xl bg-marca px-5 text-[15px] font-semibold text-marca-contraste"
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
              className="mt-1 min-h-11 w-full text-center text-sm text-painel-tinta-fraca underline underline-offset-4"
            >
              Cancelar
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
        />
      ) : null}

      {/* ---------------- Como acelerar: o plano de acumulo --------------
          Fechado no acompanhamento (e detalhe para quem quer acelerar),
          aberto na criacao (ali ele responde "de onde viriam as milhas",
          que faz parte de decidir criar o objetivo). */}

      {resposta ? (
        <details className="group mt-4 rounded-[24px] bg-superficie shadow-card" open={emCriacao}>
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block text-[17px] font-semibold text-tinta">
                {emCriacao ? "De onde viriam as milhas" : "Como chegar mais rápido"}
              </span>
              <span className="mt-0.5 block text-sm text-tinta-media">
                Ajuste a sua situação e veja o prazo mudar.
              </span>
            </span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0 text-tinta-media transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>

          <div className="px-5 pb-5">
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
              <label htmlFor="cartao" className="mb-2 block text-[15px] font-semibold text-tinta">
                Seu cartão
              </label>
              <select
                id="cartao"
                value={cartaoId}
                onChange={(e) => {
                  setCartaoId(e.target.value);
                  gravarAcumulo({ cartao: e.target.value });
                }}
                className="h-14 w-full rounded-2xl border border-borda bg-superficie px-4 text-[17px] text-tinta outline-none focus:border-marca"
              >
                <option value="">Não tenho / não sei</option>
                {catalogo?.cartoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}, {c.pontosPorDolarNacional} pts por dólar
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

            <label className="flex min-h-11 items-center gap-3 text-[15px] text-tinta">
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
          </div>
        </details>
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
          className="mt-6 min-h-12 w-full rounded-2xl border border-borda bg-superficie px-5 text-[15px] font-semibold text-tinta"
        >
          Novo objetivo
        </button>
      ) : null}

      {/* A acao destrutiva por ultimo, e com confirmacao na propria tela. */}
      {!emCriacao && metaAtiva ? (
        <ApagarObjetivo
          key={metaAtiva.id}
          cidade={metaAtiva.destinoCidade}
          aoApagar={() => {
            removerMeta(metaAtiva.id);
            setIdAtivo(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ApagarObjetivo({ cidade, aoApagar }: { cidade: string; aoApagar: () => void }) {
  const [confirmando, setConfirmando] = useState(false);
  return (
    <div className="mt-3">
      {confirmando ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-superficie-2 px-4 py-2">
          <span className="text-sm text-tinta">Apagar o objetivo {cidade}?</span>
          <span className="flex gap-1">
            <button type="button" onClick={() => setConfirmando(false)} className="min-h-11 px-3 text-sm font-semibold text-tinta-media">
              Manter
            </button>
            <button type="button" onClick={aoApagar} className="min-h-11 px-3 text-sm font-semibold text-alerta">
              Apagar
            </button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="min-h-11 w-full text-center text-sm text-tinta-media underline underline-offset-2 hover:text-alerta"
        >
          Apagar este objetivo
        </button>
      )}
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
}: {
  meta: Meta;
  resposta: Resposta | null;
  aoRegistrar: (saldo: number) => void;
  aoDefinirData: (data: string | null) => void;
  aoAtualizarEstimativa: (milhas: number, preco: number) => void;
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

  const origem = useLugar(meta.origemIata);
  const destino = useLugar(meta.destinoIata);
  const rota =
    origem && destino
      ? {
          origem: [origem.lat, origem.lon] as const,
          destino: [destino.lat, destino.lon] as const,
          rotulos: [origem.iata, destino.iata] as [string, string],
        }
      : null;
  const batida = progresso.situacao === "concluida";

  return (
    <>
      <section className="painel relative mt-5 rounded-[28px] p-5 md:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute -right-6 -top-4 size-[230px] md:right-6 md:top-1/2 md:size-[260px] md:-translate-y-1/2">
            <Globo rota={rota} enquadramento="inteiro" />
          </div>
        </div>

        <div className="relative max-w-[13rem] md:max-w-sm">
          <MarcoDoObjetivo
            metaId={meta.id}
            percentual={progresso.percentual}
            marcosCelebrados={meta.marcosCelebrados}
            tom="claro"
            rotulo="pronto"
          />
          <p className="mt-3 text-[15px] text-painel-tinta-fraca">{meta.programaNome}</p>
          <h2 className="display text-[30px] leading-tight">{meta.destinoCidade}</h2>
          <p className="tabular mt-1 text-[15px]">
            {fmtMilhas(progresso.saldoAtual)} de {fmtMilhas(meta.milhasNecessarias)} milhas
          </p>
          <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-painel-realce px-3 py-1.5 text-sm font-semibold text-painel-tinta">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: aparencia.ponto }} />
            {aparencia.rotulo}
          </span>
        </div>

        <p className="relative mt-4 text-[15px] leading-relaxed text-painel-tinta-fraca md:max-w-md">
          {progresso.resumo}
        </p>

        {progresso.chegadaPrevistaEm ? (
          <p className="tabular relative mt-3 flex items-baseline gap-2 border-t border-painel-tinta/15 pt-3 text-[15px] md:max-w-md">
            <span className="text-painel-tinta-fraca">Chegada prevista</span>
            <span className="font-semibold text-painel-tinta">{mesAno(progresso.chegadaPrevistaEm)}</span>
          </p>
        ) : null}

        {/* Meta batida e conquista: um dos lugares do Milo. */}
        {batida ? (
          <div className="relative mt-4 flex items-center gap-3 rounded-2xl bg-painel-realce p-3 md:max-w-md">
            <Milo pose="comemorando" className="w-14 shrink-0" />
            <p className="text-[15px] text-painel-tinta">
              Você chegou lá.{" "}
              <Link
                href={`/rota/${meta.origemIata}/${meta.destinoIata}`}
                className="font-semibold underline underline-offset-4"
              >
                Ver a hora certa de resgatar
              </Link>
            </p>
          </div>
        ) : null}
      </section>

      {estimativaMudou && estimativaAtual && resposta ? (
        <section className="mt-4 rounded-[20px] bg-superficie-2 p-5">
          <h3 className="text-[15px] font-semibold text-tinta">A estimativa desta rota mudou</h3>
          <p className="tabular mt-1 text-[15px] leading-relaxed text-tinta-media">
            Quando você criou o objetivo, o trecho custava{" "}
            {fmtMilhas(meta.milhasNecessarias)} milhas. Hoje a nossa estimativa é
            de {fmtMilhas(estimativaAtual)}: os programas usam precificação
            dinâmica e a conta muda com o preço da passagem.
          </p>
          <button
            type="button"
            onClick={() => aoAtualizarEstimativa(estimativaAtual, resposta.plano.precoDaPassagemBRL)}
            className="mt-3 min-h-11 rounded-2xl bg-marca px-4 text-sm font-semibold text-marca-contraste"
          >
            Atualizar a meta para {fmtMilhas(estimativaAtual)}
          </button>
        </section>
      ) : null}

      {/* A acao mais frequente da tela, logo abaixo do objetivo. */}
      <section className="mt-4 rounded-[24px] bg-superficie p-5 shadow-card">
        <label htmlFor="novo-saldo" className="block text-[17px] font-semibold text-tinta">
          Atualizar o saldo de hoje
        </label>
        <div className="mt-3 flex gap-2">
          <input
            id="novo-saldo"
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            value={novoSaldo}
            onChange={(e) => setNovoSaldo(e.target.value)}
            placeholder={String(progresso.saldoAtual)}
            className="tabular h-14 min-w-0 flex-1 rounded-2xl border border-borda bg-superficie px-4 text-[17px] text-tinta outline-none focus:border-marca"
          />
          <button
            type="button"
            disabled={novoSaldo === ""}
            onClick={() => {
              aoRegistrar(Number(novoSaldo));
              setNovoSaldo("");
            }}
            className="h-14 shrink-0 rounded-2xl bg-marca px-5 text-[15px] font-semibold text-marca-contraste disabled:opacity-40"
          >
            Registrar
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-tinta-media">
          Confira no app do {meta.programaNome}. Cada registro melhora a medida
          do seu ritmo.
        </p>
      </section>

      <details className="group mt-4 rounded-[24px] bg-superficie shadow-card">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-[17px] font-semibold text-tinta">Como você andou</span>
            <span className="tabular mt-0.5 block text-sm text-tinta-media">
              +{fmtMilhas(progresso.ganhoDesdeOInicio)} milhas desde o início
            </span>
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0 text-tinta-media transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>

        <div className="px-5 pb-5">
          <LinhaDoObjetivo meta={meta} hoje={hoje} />

          <dl className="tabular mt-4 grid grid-cols-3 gap-2 border-t border-borda pt-3 text-center">
            <div>
              <dt className="text-xs text-tinta-media">Ponto de partida</dt>
              <dd className="text-[15px] font-semibold text-tinta">{fmtMilhas(progresso.pontoDePartida)}</dd>
            </div>
            <div>
              <dt className="text-xs text-tinta-media">Acumulado</dt>
              <dd className="text-[15px] font-semibold text-dinheiro">+{fmtMilhas(progresso.ganhoDesdeOInicio)}</dd>
            </div>
            <div>
              <dt className="text-xs text-tinta-media">
                {progresso.ritmoRealMensal === null ? "Ritmo previsto" : "Ritmo real"}
              </dt>
              <dd className="text-[15px] font-semibold text-tinta">{fmtMilhas(progresso.ritmoConsiderado)}/mês</dd>
            </div>
          </dl>

          {progresso.ritmoRealMensal === null ? (
            <div className="mt-3">
              <SeloDeOrigem origem="estimado" detalhe="São necessários pelo menos dois registros com três semanas entre eles.">
                ritmo projetado, ainda não medido
              </SeloDeOrigem>
              <p className="mt-2 text-sm leading-relaxed text-tinta-media">
                Para medir o seu ritmo real são precisos pelo menos dois registros
                com três semanas entre eles. Até lá, o prazo vem da projeção do
                plano de acúmulo.
              </p>
            </div>
          ) : null}

          <div className="mt-5 border-t border-borda pt-4">
            <label htmlFor="data-alvo" className="mb-2 block text-[15px] font-semibold text-tinta">
              Data pretendida da viagem
            </label>
            <input
              id="data-alvo"
              type="date"
              min={paraIso(hoje)}
              value={meta.dataAlvo ?? ""}
              onChange={(e) => aoDefinirData(e.target.value || null)}
              className="h-14 w-full rounded-2xl border border-borda bg-superficie px-4 text-[17px] text-tinta outline-none focus:border-marca"
            />
            {progresso.ritmoNecessarioMensal && progresso.situacao === "atrasada" ? (
              <p className="tabular mt-2 text-sm leading-relaxed text-alerta">
                Para chegar nessa data seriam {fmtMilhas(progresso.ritmoNecessarioMensal)} milhas por mês.
              </p>
            ) : null}
          </div>
        </div>
      </details>

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
        <label className="text-[15px] font-semibold text-tinta">
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
