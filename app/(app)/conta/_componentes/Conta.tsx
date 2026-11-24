"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AlternadorDeTema } from "@/components/casca/AlternadorDeTema";
import { ProximaViagem } from "@/components/dominio/ProximaViagem";
import { CampoDeLugar } from "@/components/ui/CampoDeLugar";
import { Milo } from "@/components/ui/Milo";
import { useLugar } from "@/lib/cliente/lugar";
import { separarViagens, type BuscaRecente } from "@/lib/viagens/modelo";
import { usarCarteira, useCarteiraHidratada } from "@/store/carteira";
import { usarPerfil, usePerfilHidratado } from "@/store/perfil";
import { usarViagens, useViagensHidratadas } from "@/store/viagens";
import { SeusDados } from "./SeusDados";

/**
 * Sua conta: o que o app guarda sobre a pessoa, num lugar so.
 *
 * Ainda nao ha login. Tudo aqui vive no aparelho (viagens, carteira,
 * objetivos, preferencias), e a tela diz isso como o que e: uma
 * vantagem. Quando houver conta, este e o ponto em que a sincronizacao
 * entra -- a organizacao da tela ja e a de uma conta.
 *
 * Duas colunas a partir de `md`: o que a pessoa FAZ (viagens, buscas,
 * programas) a esquerda, o que ela AJUSTA (preferencias, dados) a direita.
 */
export function Conta() {
  const viagensProntas = useViagensHidratadas();
  const carteiraPronta = useCarteiraHidratada();
  const perfilPronto = usePerfilHidratado();

  if (!viagensProntas || !carteiraPronta || !perfilPronto) {
    return <div className="mx-auto min-h-[60vh] max-w-5xl" aria-busy="true" />;
  }

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <header className="flex items-center gap-3">
        <Milo pose="rosto" className="size-12 shrink-0 rounded-full bg-superficie-2" />
        <div>
          <h1 className="display text-[28px] leading-tight text-tinta">Sua conta</h1>
          <p className="text-sm text-tinta-media">Viagens, programas e preferências, guardados neste aparelho.</p>
        </div>
      </header>

      <div className="mt-7 grid gap-x-10 gap-y-9 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-9">
          <SuasViagens />
          <BuscasRecentes />
          <ProgramasEObjetivos />
        </div>
        <div className="flex flex-col gap-9">
          <Preferencias />
          <SeusDados />
        </div>
      </div>
    </div>
  );
}

function Secao({ titulo, id, children }: { titulo: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-lg font-semibold text-tinta">
        {titulo}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Seta() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0 text-tinta-fraca" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/** Linha de lista que leva a outra tela. */
function LinhaDeLink({ href, titulo, detalhe }: { href: string; titulo: string; detalhe: string }) {
  return (
    <Link href={href} className="flex min-h-16 items-center justify-between gap-3 px-5 py-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-superficie-2">
      <span className="min-w-0">
        <span className="block text-base font-semibold text-tinta">{titulo}</span>
        <span className="mt-0.5 block text-sm text-tinta-media">{detalhe}</span>
      </span>
      <Seta />
    </Link>
  );
}

/** Sem overflow-hidden: a lista de sugestoes do CampoDeLugar desce para fora do grupo. */
const GRUPO = "rounded-2xl border border-borda bg-superficie shadow-card";

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

function SuasViagens() {
  const viagens = usarViagens((s) => s.viagens);
  const { proximas, emVista, feitas } = separarViagens(viagens, new Date());

  const partes = [
    proximas.length > 0 ? plural(proximas.length, "reservada", "reservadas") : null,
    emVista.length > 0 ? plural(emVista.length, "para confirmar", "para confirmar") : null,
    feitas.length > 0 ? plural(feitas.length, "feita", "feitas") : null,
  ].filter(Boolean);
  const detalhe =
    partes.length > 0
      ? partes.join(", ")
      : "Quando você abre uma passagem pelo app, ela aparece aqui.";

  return (
    <Secao titulo="Minhas viagens" id="conta-viagens">
      {proximas.length > 0 ? <ProximaViagem className="mb-3" /> : null}
      <div className={GRUPO}>
        <LinhaDeLink href="/conta/viagens" titulo="Ver todas as viagens" detalhe={detalhe} />
      </div>
    </Secao>
  );
}

function BuscasRecentes() {
  const buscas = usarViagens((s) => s.buscas);
  return (
    <Secao titulo="Buscas recentes" id="conta-buscas">
      {buscas.length === 0 ? (
        <p className="rounded-2xl bg-superficie-2 px-5 py-4 text-[15px] leading-relaxed text-tinta-media">
          As rotas que você abre ficam aqui, para voltar a elas com um toque.{" "}
          <Link href="/explorar" className="font-semibold text-marca underline underline-offset-4">
            Explorar destinos
          </Link>
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {buscas.slice(0, 8).map((b) => (
            <li key={`${b.origemIata}-${b.destinoIata}`}>
              <ChipDeBusca busca={b} />
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}

function ChipDeBusca({ busca }: { busca: BuscaRecente }) {
  const origem = useLugar(busca.origemIata)?.cidade ?? busca.origemIata;
  const destino = useLugar(busca.destinoIata)?.cidade ?? busca.destinoIata;
  return (
    <Link
      href={`/rota/${busca.origemIata}/${busca.destinoIata}`}
      aria-label={`${origem} para ${destino}`}
      className="flex min-h-11 items-center gap-2 rounded-full border border-borda bg-superficie px-4 text-[15px] text-tinta transition-colors hover:border-marca"
    >
      <span>{origem}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 text-tinta-fraca" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14m-5-5 5 5-5 5" />
      </svg>
      <span className="font-semibold">{destino}</span>
    </Link>
  );
}

function ProgramasEObjetivos() {
  const saldos = usarCarteira((s) => s.saldos);
  const metas = usarPerfil((p) => p.metas);
  const programas = Object.keys(saldos).length;
  return (
    <Secao titulo="Programas e objetivos" id="conta-programas">
      <div className={`${GRUPO} divide-y divide-borda`}>
        <LinhaDeLink
          href="/carteira"
          titulo="Seus programas"
          detalhe={
            programas === 0
              ? "Junte seus pontos e milhas num lugar só."
              : `${plural(programas, "programa", "programas")} na carteira`
          }
        />
        <LinhaDeLink
          href="/objetivos"
          titulo="Objetivos"
          detalhe={
            metas.length === 0
              ? "Escolha um destino e acompanhe quanto falta."
              : `${plural(metas.length, "objetivo", "objetivos")} em andamento`
          }
        />
      </div>
    </Secao>
  );
}

function Preferencias() {
  const origemIata = usarPerfil((p) => p.origemIata);
  const definirOrigem = usarPerfil((p) => p.definirOrigem);
  const cidade = useLugar(origemIata)?.cidade;
  const [trocando, setTrocando] = useState(false);

  return (
    <Secao titulo="Preferências" id="conta-preferencias">
      <div className={`${GRUPO} divide-y divide-borda`}>
        <div className="px-5 py-4">
          {trocando ? (
            <>
              <CampoDeLugar
                rotulo="De onde você costuma sair?"
                autoFocus
                aoSelecionar={(lugar) => {
                  definirOrigem(lugar.iata);
                  setTrocando(false);
                }}
              />
              <button
                type="button"
                onClick={() => setTrocando(false)}
                className="mt-2 min-h-10 text-sm font-semibold text-tinta-media hover:text-tinta"
              >
                Manter {cidade ?? origemIata}
              </button>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-tinta-media">Cidade de partida</p>
                <p className="mt-0.5 truncate text-base font-semibold text-tinta">
                  {cidade ?? origemIata} <span className="tabular font-normal text-tinta-media">({origemIata})</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTrocando(true)}
                className="min-h-10 shrink-0 rounded-full border border-borda px-4 text-sm font-semibold text-tinta transition-colors hover:border-marca"
              >
                Trocar
              </button>
            </div>
          )}
          <p className="mt-2 text-sm leading-relaxed text-tinta-media">
            É daqui que partem Explorar e as promoções.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <p className="text-base font-semibold text-tinta">Aparência</p>
          <AlternadorDeTema />
        </div>
      </div>
    </Secao>
  );
}
