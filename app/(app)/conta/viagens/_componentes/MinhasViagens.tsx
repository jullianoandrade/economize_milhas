"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { LinkExterno } from "@/components/dominio/LinkExterno";
import { Milo } from "@/components/ui/Milo";
import { SeloDeOrigem } from "@/components/ui/SeloDeOrigem";
import { useLugar } from "@/lib/cliente/lugar";
import { reais } from "@/lib/format";
import { linkDeHospedagem } from "@/lib/monetizacao/ofertas";
import { hojeEmSaoPaulo, separarViagens, type Viagem } from "@/lib/viagens/modelo";
import {
  NOITES_MAXIMAS,
  NOITES_MINIMAS,
  NOITES_PADRAO,
  caminhoDaRota,
  dataCurta,
  diasEntre,
  estadiaDaViagem,
  limitarNoites,
  quandoE,
} from "@/lib/viagens/preparar";
import { usarViagens, useViagensHidratadas } from "@/store/viagens";

/**
 * Minhas viagens: o que a pessoa reservou, o que foi ver e o que ja fez.
 *
 * As viagens nascem sozinhas: todo link que leva a uma passagem grava
 * uma viagem "em vista" (store/viagens). Esta tela e onde a pessoa conta
 * o resto -- "reservei" ou "nao vou mais" -- e e a reserva que destrava
 * a preparacao: hospedagem na cidade de destino, nas datas da viagem.
 *
 * A proxima viagem e um cartao de embarque, no material dos cartoes da
 * Carteira; o canhoto destacavel e onde mora o "Preparar".
 */

type Nomes = Record<string, string>;

function useCidade(iata: string): string {
  return useLugar(iata)?.cidade ?? iata;
}

export function MinhasViagens({ nomesDosProgramas }: { nomesDosProgramas: Nomes }) {
  const hidratadas = useViagensHidratadas();
  const viagens = usarViagens((s) => s.viagens);

  // O cartao da proxima viagem (Inicio, conta) aponta para #viagem-id;
  // a lista so existe depois de ler o aparelho, entao o navegador chega
  // antes do alvo. Rola quando ele aparece.
  useEffect(() => {
    if (!hidratadas || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [hidratadas]);

  if (!hidratadas) {
    return <div className="mx-auto min-h-[60vh] max-w-xl" aria-busy="true" />;
  }

  const agora = new Date();
  const hoje = hojeEmSaoPaulo(agora);
  const { proximas, emVista, feitas } = separarViagens(viagens, agora);
  const vazia = proximas.length + emVista.length + feitas.length === 0;

  return (
    <div className="mx-auto max-w-xl pb-16">
      <Link
        href="/conta"
        className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-tinta-media hover:text-tinta"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Sua conta
      </Link>
      <h1 className="display mt-1 text-[28px] leading-tight text-tinta">Minhas viagens</h1>

      {vazia ? <SemViagens /> : null}

      {proximas.length > 0 ? (
        <section aria-labelledby="titulo-proximas" className="mt-6">
          <h2 id="titulo-proximas" className="text-lg font-semibold text-tinta">
            Próximas viagens
          </h2>
          <ul className="mt-3 flex flex-col gap-6">
            {proximas.map((v) => (
              <li key={v.id} id={`viagem-${v.id}`} className="scroll-mt-24">
                <CartaoDeEmbarque viagem={v} hoje={hoje} nomes={nomesDosProgramas} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {emVista.length > 0 ? (
        <section aria-labelledby="titulo-em-vista" className="mt-9">
          <h2 id="titulo-em-vista" className="text-lg font-semibold text-tinta">
            Você foi ver
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-tinta-media">
            Passagens que você abriu pelo app. Conte se reservou e a viagem passa a ser preparada aqui.
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {emVista.map((v) => (
              <li key={v.id} id={`viagem-${v.id}`} className="scroll-mt-24">
                <ViagemEmVista viagem={v} hoje={hoje} nomes={nomesDosProgramas} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {feitas.length > 0 ? (
        <section aria-labelledby="titulo-feitas" className="mt-9">
          <h2 id="titulo-feitas" className="text-lg font-semibold text-tinta">
            Viagens feitas
          </h2>
          <Historico feitas={feitas} />
        </section>
      ) : null}

      <p className="mt-10 flex items-start gap-2 text-sm leading-relaxed text-tinta-media">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Suas viagens ficam só neste aparelho. Ninguém mais vê para onde você vai.
      </p>
    </div>
  );
}

function SemViagens() {
  return (
    <div className="relative mt-6 overflow-visible rounded-[20px] border-2 border-dashed border-tinta-fraca/50 px-5 pb-6 pt-24">
      <Milo pose="esperando" className="pointer-events-none absolute -top-6 right-3 w-[112px]" />
      <p className="display max-w-[16rem] text-[22px] leading-tight text-tinta">
        Suas viagens começam numa passagem.
      </p>
      <p className="mt-2 max-w-[22rem] text-base leading-relaxed text-tinta-media">
        Quando você abre uma passagem pelo app, ela aparece aqui. Depois é só contar que reservou: a gente
        ajuda a preparar o resto, como onde ficar.
      </p>
      <Link
        href="/explorar"
        className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-marca px-5 text-sm font-semibold text-marca-contraste hover:bg-marca-forte"
      >
        Explorar destinos
      </Link>
    </div>
  );
}

function comoPagou(v: Viagem, nomes: Nomes): string {
  if (v.forma === "dinheiro") return "Dinheiro";
  const programa = v.programaId ? nomes[v.programaId] : null;
  return programa ? `Milhas ${programa}` : "Milhas";
}

/* ------------------------------------------------------------------ */
/* Proxima viagem: o cartao de embarque, com o canhoto "Preparar".     */
/* ------------------------------------------------------------------ */

function CartaoDeEmbarque({ viagem, hoje, nomes }: { viagem: Viagem; hoje: string; nomes: Nomes }) {
  const origem = useCidade(viagem.origemIata);
  const destino = useCidade(viagem.destinoIata);
  const emDias = viagem.ida ? diasEntre(hoje, viagem.ida) : null;

  return (
    <article aria-label={`Viagem para ${destino}`} className="drop-shadow-[0_14px_22px_rgb(11_21_38/0.18)]">
      <div className="cartao-programa cartao-marinho relative rounded-b-none px-5 pb-6 pt-5">
        <div className="relative flex items-start justify-between gap-3">
          <p className="tabular text-sm font-semibold tracking-wide text-[#a9b8d6]">
            {viagem.origemIata}
            <svg viewBox="0 0 24 24" aria-hidden="true" className="mx-1.5 inline size-4 -translate-y-px text-[#7fa0ff]" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" transform="rotate(90 12 12)" />
            </svg>
            {viagem.destinoIata}
          </p>
          {emDias !== null ? (
            <p className="rounded-full bg-[#ffb020] px-3 py-1 text-sm font-semibold text-[#0b1526]">
              {quandoE(emDias)}
            </p>
          ) : null}
        </div>
        <p className="relative mt-1 text-sm text-[#a9b8d6]">de {origem} para</p>
        <h3 className="display relative text-[34px] leading-[1.05] tracking-[-0.02em]">{destino}</h3>

        <dl className="relative mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-[#a9b8d6]">Ida</dt>
            <dd className="tabular mt-0.5 font-semibold">{viagem.ida ? dataCurta(viagem.ida, hoje) : "A definir"}</dd>
          </div>
          <div>
            <dt className="text-[#a9b8d6]">Pagou com</dt>
            <dd className="mt-0.5 font-semibold">{comoPagou(viagem, nomes)}</dd>
          </div>
          <div>
            <dt className="text-[#a9b8d6]">Preço visto</dt>
            <dd className="tabular mt-0.5 font-semibold">
              {viagem.precoVistoBRL ? reais(viagem.precoVistoBRL) : "Sem preço"}
            </dd>
          </div>
        </dl>
        <Link
          href={caminhoDaRota(viagem)}
          className="relative mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-white underline underline-offset-4 hover:text-[#dfe6f5]"
        >
          Ver a rota no app
        </Link>
      </div>

      <Picote />

      <Preparar viagem={viagem} destino={destino} hoje={hoje} />
    </article>
  );
}

/** A linha de picote entre o cartao e o canhoto, com os recortes nas bordas. */
function Picote() {
  return (
    <div aria-hidden="true" className="relative h-0">
      <span className="absolute -left-2.5 -top-2.5 size-5 rounded-full bg-fundo" />
      <span className="absolute -right-2.5 -top-2.5 size-5 rounded-full bg-fundo" />
      <span className="absolute inset-x-4 top-0 border-t-2 border-dashed border-[#0b1526]/25" />
    </div>
  );
}

function Preparar({ viagem, destino, hoje }: { viagem: Viagem; destino: string; hoje: string }) {
  const [noites, setNoites] = useState(NOITES_PADRAO);
  const definirIda = usarViagens((s) => s.mudarSituacao);
  const idDoTitulo = useId();
  const estadia = estadiaDaViagem(viagem, noites);
  const link = linkDeHospedagem({
    cidade: destino,
    checkin: estadia?.checkin,
    checkout: estadia?.checkout,
  });

  return (
    <section
      aria-labelledby={idDoTitulo}
      className="rounded-b-[20px] border border-t-0 border-borda bg-superficie px-5 pb-5 pt-5"
    >
      <h4 id={idDoTitulo} className="font-semibold text-tinta">
        Preparar: onde ficar em {destino}
      </h4>

      {estadia ? (
        <>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-full border border-borda p-1">
              <BotaoDeNoite
                rotulo="Uma noite a menos"
                desabilitado={noites <= NOITES_MINIMAS}
                aoTocar={() => setNoites((n) => limitarNoites(n - 1))}
                sinal="menos"
              />
              <output aria-live="polite" className="tabular min-w-[5.5rem] text-center text-[15px] font-semibold text-tinta">
                {estadia.noites} {estadia.noites === 1 ? "noite" : "noites"}
              </output>
              <BotaoDeNoite
                rotulo="Uma noite a mais"
                desabilitado={noites >= NOITES_MAXIMAS}
                aoTocar={() => setNoites((n) => limitarNoites(n + 1))}
                sinal="mais"
              />
            </div>
            <p className="tabular text-sm text-tinta-media">
              Entrada {dataCurta(estadia.checkin, hoje)}, saída {dataCurta(estadia.checkout, hoje)}
            </p>
          </div>

          {link ? (
            <>
              <LinkExterno
                href={link.url}
                tipo={link.comissionado ? "patrocinado" : "utilidade"}
                className="mt-4"
              >
                Ver hospedagem no {link.parceiro}
              </LinkExterno>
              {link.comissionado ? (
                <p className="mt-3 text-sm leading-relaxed text-tinta-media">
                  <strong className="font-semibold text-tinta">Nossas recomendações nunca consideram quanto ganhamos.</strong>{" "}
                  Reservando pelo {link.parceiro}, recebemos parte da comissão, e o preço para você é o mesmo.
                </p>
              ) : (
                <p className="mt-3 text-sm text-tinta-media">
                  A busca já abre com {destino} e as suas datas.
                </p>
              )}
            </>
          ) : null}
        </>
      ) : (
        <SemDataDeIda hoje={hoje} aoGuardar={(ida) => definirIda(viagem.id, "reservada", ida)} />
      )}
    </section>
  );
}

function BotaoDeNoite({
  rotulo,
  desabilitado,
  aoTocar,
  sinal,
}: {
  rotulo: string;
  desabilitado: boolean;
  aoTocar: () => void;
  sinal: "mais" | "menos";
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={aoTocar}
      className="grid size-10 place-items-center rounded-full bg-superficie-2 text-tinta transition-colors hover:bg-marca-fraca disabled:opacity-40"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
        <path d={sinal === "mais" ? "M12 5v14M5 12h14" : "M5 12h14"} />
      </svg>
    </button>
  );
}

function SemDataDeIda({
  hoje,
  aoGuardar,
}: {
  hoje: string;
  aoGuardar: (ida: string) => void;
}) {
  const id = useId();
  const [ida, setIda] = useState("");
  return (
    <form
      className="mt-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (ida) aoGuardar(ida);
      }}
    >
      <label htmlFor={id} className="block text-[15px] text-tinta-media">
        Quando é a ida? Com a data, a hospedagem já abre nos dias certos.
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          type="date"
          min={hoje}
          value={ida}
          onChange={(e) => setIda(e.target.value)}
          className="h-12 min-w-0 flex-1 rounded-2xl border border-borda bg-superficie px-4 text-base text-tinta outline-none focus:border-marca"
        />
        <button
          type="submit"
          disabled={!ida}
          className="min-h-12 shrink-0 rounded-full bg-marca px-5 text-sm font-semibold text-marca-contraste disabled:opacity-50"
        >
          Guardar data
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Em vista: a pessoa foi ver; falta contar se reservou.               */
/* ------------------------------------------------------------------ */

function ViagemEmVista({ viagem, hoje, nomes }: { viagem: Viagem; hoje: string; nomes: Nomes }) {
  const origem = useCidade(viagem.origemIata);
  const destino = useCidade(viagem.destinoIata);
  const mudarSituacao = usarViagens((s) => s.mudarSituacao);
  const [confirmando, setConfirmando] = useState(false);
  const [ida, setIda] = useState(viagem.ida ?? "");
  const idDaData = useId();

  return (
    <article
      aria-label={`${origem} para ${destino}`}
      className="rounded-[20px] border border-borda bg-superficie p-4 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-tinta-media">de {origem} para</p>
          <h3 className="display truncate text-[22px] leading-tight text-tinta">{destino}</h3>
        </div>
        <Link
          href={caminhoDaRota(viagem)}
          className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-marca underline underline-offset-4"
        >
          Ver de novo
        </Link>
      </div>

      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <div className="flex gap-1.5">
          <dt className="text-tinta-media">Ida</dt>
          <dd className="tabular font-semibold text-tinta">{viagem.ida ? dataCurta(viagem.ida, hoje) : "sem data"}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-tinta-media">Por</dt>
          <dd className="font-semibold text-tinta">{comoPagou(viagem, nomes)}</dd>
        </div>
        {viagem.precoVistoBRL ? (
          <div className="flex gap-1.5">
            <dt className="text-tinta-media">Você viu</dt>
            <dd className="tabular font-semibold text-tinta">{reais(viagem.precoVistoBRL)}</dd>
          </div>
        ) : null}
      </dl>

      {viagem.precoVistoBRL ? (
        <div className="mt-2.5">
          <SeloDeOrigem origem="real" detalhe="O preço que o app mostrava quando você abriu a passagem.">
            preço de {dataCurta(viagem.atualizadaEm.slice(0, 10), hoje)}
          </SeloDeOrigem>
        </div>
      ) : null}

      {confirmando ? (
        <form
          className="mt-4 rounded-2xl bg-superficie-2 p-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            mudarSituacao(viagem.id, "reservada", ida || null);
          }}
        >
          <label htmlFor={idDaData} className="block text-[15px] text-tinta">
            Qual a data da ida?
          </label>
          <input
            id={idDaData}
            type="date"
            min={hoje}
            value={ida}
            onChange={(e) => setIda(e.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-borda bg-superficie px-4 text-base text-tinta outline-none focus:border-marca"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              className="min-h-11 rounded-full bg-marca px-5 text-sm font-semibold text-marca-contraste hover:bg-marca-forte"
            >
              Guardar reserva
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="min-h-11 rounded-full px-4 text-sm font-semibold text-tinta-media hover:text-tinta"
            >
              Voltar
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-borda pt-3">
          <p className="mr-auto text-[15px] font-semibold text-tinta">Reservou?</p>
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="min-h-11 rounded-full bg-marca px-5 text-sm font-semibold text-marca-contraste hover:bg-marca-forte"
          >
            Reservei
          </button>
          <button
            type="button"
            onClick={() => mudarSituacao(viagem.id, "descartada")}
            className="min-h-11 rounded-full border border-borda px-4 text-sm font-semibold text-tinta-media hover:text-tinta"
          >
            Não vou mais
          </button>
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Historico: uma linha do tempo, por ano.                             */
/* ------------------------------------------------------------------ */

function Historico({ feitas }: { feitas: Viagem[] }) {
  const porAno = new Map<string, Viagem[]>();
  for (const v of feitas) {
    const ano = v.ida!.slice(0, 4);
    porAno.set(ano, [...(porAno.get(ano) ?? []), v]);
  }
  return (
    <div className="mt-3 flex flex-col gap-5">
      {[...porAno.entries()].map(([ano, lista]) => (
        <div key={ano}>
          <h3 className="tabular text-sm font-semibold text-tinta-media">{ano}</h3>
          <ol className="mt-2 border-l-2 border-borda pl-4">
            {lista.map((v) => (
              <ViagemFeita key={v.id} viagem={v} />
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

function ViagemFeita({ viagem }: { viagem: Viagem }) {
  const origem = useCidade(viagem.origemIata);
  const destino = useCidade(viagem.destinoIata);
  return (
    <li id={`viagem-${viagem.id}`} className="relative py-2">
      <span aria-hidden="true" className="absolute -left-[23px] top-[18px] size-3 rounded-full border-2 border-superficie bg-marca-suave" />
      <Link href={caminhoDaRota(viagem)} className="group flex items-baseline justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold text-tinta group-hover:underline">{destino}</span>
          <span className="block text-sm text-tinta-media">saindo de {origem}</span>
        </span>
        <span className="tabular shrink-0 text-sm text-tinta-media">{dataCurta(viagem.ida!, viagem.ida!)}</span>
      </Link>
    </li>
  );
}
