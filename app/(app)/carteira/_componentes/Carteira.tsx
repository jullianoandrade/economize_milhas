"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { Milo } from "@/components/ui/Milo";
import { SeloDeOrigem } from "@/components/ui/SeloDeOrigem";
import { milhas as fmt, reais } from "@/lib/format";
import {
  haQuanto,
  hojeISO,
  montarCarteira,
  quandoVence,
  totalEstimado,
  vencimentosProximos,
  type LinhaDaCarteira,
  type ProgramaDaCarteira,
} from "@/lib/carteira/modelo";
import { useCarteiraHidratada, usarCarteira } from "@/store/carteira";
import { usarPerfil } from "@/store/perfil";
import { FolhaDaCarteira, type PedidoDeFolha } from "./FolhaDaCarteira";

/**
 * A Carteira: cada programa e um cartao, empilhado como numa carteira de
 * verdade. Tocar num cartao o levanta e mostra o detalhe; os outros
 * descem para o pe da pilha.
 *
 * Tudo aqui e informado pela pessoa e fica no aparelho (store/carteira).
 * A tela diz isso sempre, e cada numero carrega o selo de origem: o saldo
 * e "informado", o valor em reais e "estimado", e saldo velho vira
 * "desatualizado" em vez de passar por atual.
 */

const ALTURA_DO_CARTAO = 200;
const DEGRAU = 64;
const FRESTA = 14;
/**
 * Cinco materiais para os cinco programas do catalogo, com o ambar por
 * ultimo: ele aparece no maximo uma vez, e so quando a carteira esta
 * cheia. Ambar e a cor de "atencao" -- repetido, competia com o aviso
 * de vencimento logo acima da pilha.
 */
const MATERIAIS = ["cartao-marinho", "cartao-gelo", "cartao-azul", "cartao-branco", "cartao-ambar"] as const;

export function Carteira({
  catalogo,
  fonteDoValor,
}: {
  catalogo: ProgramaDaCarteira[];
  fonteDoValor: string;
}) {
  const hidratada = useCarteiraHidratada();
  const saldos = usarCarteira((s) => s.saldos);
  const metas = usarPerfil((p) => p.metas);
  const [foco, setFoco] = useState<string | null>(null);
  const [folha, setFolha] = useState<PedidoDeFolha | null>(null);

  if (!hidratada) {
    // Antes de ler o aparelho nao da para saber se a carteira esta
    // vazia; mostrar o estado vazio aqui faria a tela piscar. E e so
    // depois daqui que se le a data de hoje: no pre-render do servidor
    // "hoje" nao existe (a pagina e estatica).
    return <div className="mx-auto min-h-[60vh] max-w-md" aria-busy="true" />;
  }

  const hoje = hojeISO();
  const linhas = montarCarteira(saldos, catalogo, hoje);
  const total = totalEstimado(linhas);
  const avisos = vencimentosProximos(linhas, hoje);
  const focada = linhas.find((l) => l.programa.id === foco) ?? null;

  return (
    <div className="mx-auto max-w-md pb-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-[28px] text-tinta">Carteira</h1>
        {linhas.length > 0 ? (
          <button
            type="button"
            onClick={() => setFolha({ modo: "novo" })}
            className="flex min-h-11 items-center gap-1.5 rounded-xl border border-borda bg-superficie px-3.5 text-sm font-semibold text-tinta"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Programa
          </button>
        ) : null}
      </div>

      {linhas.length === 0 ? (
        <CarteiraVazia catalogo={catalogo} aoEscolher={(id) => setFolha({ modo: "novo", programaId: id })} />
      ) : (
        <>
          <section aria-label="Total" className="mt-4">
            <p className="text-base text-tinta-media">Seus pontos valem cerca de</p>
            <p className="tabular display mt-0.5 text-[52px] font-bold leading-none tracking-[-0.045em] text-tinta [font-variation-settings:'opsz'_96]">
              {reais(total)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SeloDeOrigem origem="informado">saldos informados por você</SeloDeOrigem>
              <SeloDeOrigem origem="estimado" detalhe={fonteDoValor}>
                valor estimado
              </SeloDeOrigem>
            </div>
          </section>

          {avisos.length > 0 ? (
            <ul className="mt-5 flex flex-col gap-2" aria-label="Pontos perto de vencer">
              {avisos.map((a) => (
                <li key={`${a.programa.id}-${a.data}`}>
                  <button
                    type="button"
                    onClick={() => setFoco(a.programa.id)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-superficie-2 px-4 py-3.5 text-left text-[15px] leading-snug text-tinta"
                  >
                    <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-[#ffb020] shadow-[0_0_0_4px_rgb(255_176_32/0.25)]" />
                    <span>
                      <strong className="font-semibold">
                        {fmt(a.quantidade)} {a.programa.unidade} {a.programa.nome}
                      </strong>{" "}
                      vencem {quandoVence(a.emDias)}.
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <Pilha
            linhas={linhas}
            foco={focada?.programa.id ?? null}
            aoTocar={(id) => setFoco((f) => (f === id ? null : id))}
            detalhe={
              focada ? (
                <Detalhe
                  linha={focada}
                  hoje={hoje}
                  fonteDoValor={fonteDoValor}
                  aoAtualizar={() => setFolha({ modo: "saldo", programaId: focada.programa.id })}
                  aoVencimento={() => setFolha({ modo: "vencimento", programaId: focada.programa.id })}
                  aoRemover={() => setFoco(null)}
                />
              ) : null
            }
          />
        </>
      )}

      <Link
        href="/objetivos"
        className="mt-8 flex items-center justify-between gap-3 rounded-2xl bg-superficie px-5 py-4 text-tinta shadow-card"
      >
        <span>
          <span className="block text-base font-semibold">Objetivos de viagem</span>
          <span className="mt-0.5 block text-sm text-tinta-media">
            {metas.length === 0
              ? "Escolha um destino e acompanhe quanto falta."
              : metas.length === 1
                ? "1 objetivo em andamento"
                : `${metas.length} objetivos em andamento`}
          </span>
        </span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>

      <p className="mt-6 flex items-start gap-2 text-sm leading-relaxed text-tinta-media">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Seus saldos ficam só neste aparelho. A VoeMilo nunca pede a senha dos programas.
      </p>

      {folha ? (
        <FolhaDaCarteira
          pedido={folha}
          catalogo={catalogo}
          saldos={saldos}
          hoje={hoje}
          aoFechar={(programaId) => {
            setFolha(null);
            if (programaId) setFoco(programaId);
          }}
        />
      ) : null}
    </div>
  );
}

function CarteiraVazia({
  catalogo,
  aoEscolher,
}: {
  catalogo: ProgramaDaCarteira[];
  aoEscolher: (programaId?: string) => void;
}) {
  return (
    <>
      <p className="display mt-4 max-w-[17rem] text-[26px] leading-tight text-tinta">
        Junte seus programas num lugar só.
      </p>
      <p className="mt-2 max-w-[15rem] text-base leading-relaxed text-tinta-media">
        Comece pelo programa em que você tem mais pontos.
      </p>

      <div className="relative mt-6" style={{ height: ALTURA_DO_CARTAO }}>
        <Milo pose="apontando" className="pointer-events-none absolute -top-[86px] right-0 z-10 w-[118px]" />
        <button
          type="button"
          onClick={() => aoEscolher()}
          className="absolute inset-0 flex flex-col items-start justify-end gap-1.5 rounded-[20px] border-2 border-dashed border-tinta-fraca/60 bg-superficie/60 p-5 text-left text-base font-semibold text-tinta-media"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Seu primeiro programa
        </button>
      </div>

      <p className="mt-5 text-[15px] text-tinta-media">Escolha um para começar</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {catalogo.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => aoEscolher(p.id)}
            className="min-h-11 rounded-full border border-borda bg-superficie px-4 text-[15px] font-semibold text-tinta"
          >
            {p.nome}
          </button>
        ))}
      </div>
    </>
  );
}

function Pilha({
  linhas,
  foco,
  aoTocar,
  detalhe,
}: {
  linhas: LinhaDaCarteira[];
  foco: string | null;
  aoTocar: (id: string) => void;
  detalhe: React.ReactNode;
}) {
  const detalheRef = useRef<HTMLDivElement>(null);
  const [alturaDoDetalhe, setAlturaDoDetalhe] = useState(0);

  // O detalhe tem altura variavel (vencimentos, avisos): os cartoes de
  // baixo precisam saber onde ele termina para nao cobri-lo.
  useLayoutEffect(() => {
    const el = detalheRef.current;
    if (!el) return;
    const medir = () => setAlturaDoDetalhe(el.offsetHeight);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [foco]);

  const inicioDosOutros = ALTURA_DO_CARTAO + 12 + alturaDoDetalhe + 16;
  const outros = linhas.filter((l) => l.programa.id !== foco);
  const altura =
    foco === null
      ? (linhas.length - 1) * DEGRAU + ALTURA_DO_CARTAO
      : outros.length > 0
        ? inicioDosOutros + (outros.length - 1) * FRESTA + ALTURA_DO_CARTAO
        : ALTURA_DO_CARTAO + 12 + alturaDoDetalhe;

  return (
    <div className="relative mt-6 transition-[height] duration-500" style={{ height: altura }}>
      {linhas.map((l, i) => {
        const focado = l.programa.id === foco;
        const ordem = outros.indexOf(l);
        const y = foco === null ? i * DEGRAU : focado ? 0 : inicioDosOutros + ordem * FRESTA;
        const escala = foco === null || focado ? 1 : 0.94 - ordem * 0.02;
        // Na pilha fechada so a aba fica a vista (o ultimo cartao e a
        // excecao): o saldo sobe para a aba, senao a pilha nao diz quanto
        // ha em cada programa. Aberta, o de cima mostra o saldo inteiro e
        // os de baixo sao frestas finas demais para texto.
        const soAba = foco === null && i < linhas.length - 1;
        return (
          <button
            key={l.programa.id}
            type="button"
            aria-expanded={focado}
            onClick={() => aoTocar(l.programa.id)}
            className={`cartao-programa ${MATERIAIS[i % MATERIAIS.length]} absolute inset-x-0 top-0 flex w-full flex-col justify-between p-5 text-left transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none`}
            style={{
              height: ALTURA_DO_CARTAO,
              transform: `translateY(${y}px) scale(${escala})`,
              zIndex: focado ? 20 : foco === null ? i + 1 : 10 - ordem,
            }}
          >
            <span className="relative flex items-baseline justify-between gap-3">
              <span className="truncate text-lg font-bold">{l.programa.nome}</span>
              {soAba ? (
                <span aria-hidden="true" className="tabular shrink-0 text-right text-lg font-bold">
                  {fmt(l.saldo.quantidade)} <span className="text-sm font-medium">{l.programa.unidade}</span>
                </span>
              ) : null}
            </span>
            <span className="relative">
              <span className="tabular block text-[38px] font-bold leading-none tracking-[-0.035em]">
                {fmt(l.saldo.quantidade)}
              </span>
              <span className="mt-1 flex items-center gap-2 text-sm font-medium">
                {l.programa.unidade}
                {l.desatualizado ? <SeloNoCartao /> : null}
              </span>
            </span>
            <Milo pose="rosto" className="pointer-events-none absolute bottom-2 right-3 size-14 opacity-25 mix-blend-luminosity grayscale" />
          </button>
        );
      })}

      <div
        ref={detalheRef}
        className={`absolute inset-x-0 transition-opacity duration-300 ${foco ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={{ top: ALTURA_DO_CARTAO + 12 }}
        aria-live="polite"
      >
        {detalhe}
      </div>
    </div>
  );
}

/**
 * O selo "desatualizado" no material do cartao. Mesma palavra, icone e
 * borda tracejada do SeloDeOrigem; as cores sao fixas porque o cartao
 * tambem e (o selo do tema sumiria no cartao marinho no modo claro).
 */
function SeloNoCartao() {
  return (
    <span className="inline-flex min-h-6 items-center gap-1.5 rounded-full border border-dashed border-[#0b1526]/60 bg-white px-2.5 text-xs font-semibold text-[#0b1526]">
      <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
      desatualizado
    </span>
  );
}

function Detalhe({
  linha,
  hoje,
  fonteDoValor,
  aoAtualizar,
  aoVencimento,
  aoRemover,
}: {
  linha: LinhaDaCarteira;
  hoje: string;
  fonteDoValor: string;
  aoAtualizar: () => void;
  aoVencimento: () => void;
  aoRemover: () => void;
}) {
  const { programa, saldo } = linha;
  const removerPrograma = usarCarteira((s) => s.removerPrograma);
  const removerVencimento = usarCarteira((s) => s.removerVencimento);
  const [confirmando, setConfirmando] = useState(false);
  const vencimentos = [...saldo.vencimentos].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <div className="rounded-[20px] bg-superficie px-5 pb-5 pt-2 shadow-card">
      <dl>
        <div className="flex items-center justify-between gap-3 border-b border-borda py-3.5">
          <dt className="text-[15px] text-tinta-media">Atualizado</dt>
          <dd className="text-right">
            {linha.desatualizado ? (
              <SeloDeOrigem origem="desatualizado" detalhe="Saldos mudam. Confira no app do programa e atualize aqui.">
                {haQuanto(saldo.atualizadoEm, hoje)}
              </SeloDeOrigem>
            ) : (
              <span className="text-[15px] font-semibold text-tinta">{haQuanto(saldo.atualizadoEm, hoje)}</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="py-3.5">
        <p className="text-[15px] text-tinta-media">Vencimentos</p>
        {vencimentos.length === 0 ? (
          <p className="mt-1 text-sm text-tinta-media">Nenhum informado.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {vencimentos.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 text-[15px] text-tinta">
                <span className="tabular">
                  <strong className="font-semibold">{fmt(v.quantidade)}</strong> em{" "}
                  {v.data.split("-").reverse().join("/")}
                </span>
                <button
                  type="button"
                  onClick={() => removerVencimento(programa.id, v.id)}
                  aria-label={`Remover vencimento de ${fmt(v.quantidade)} em ${v.data.split("-").reverse().join("/")}`}
                  className="flex size-11 items-center justify-center rounded-full text-tinta-media hover:bg-superficie-2"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={aoVencimento} className="mt-2 min-h-11 text-[15px] font-semibold text-tinta underline underline-offset-4">
          Adicionar vencimento
        </button>
      </div>

      {programa.validade ? (
        <p className="border-t border-borda pt-3.5 text-sm leading-relaxed text-tinta-media">{programa.validade}</p>
      ) : null}
      {/* O saldo ja esta no cartao, logo acima; o valor dele vem aqui,
          junto da conta que o produz, em vez de numa linha propria. */}
      <p className="mt-2 text-sm leading-relaxed text-tinta-media">
        Vale cerca de <strong className="tabular font-semibold text-tinta">{reais(linha.valorBRL)}</strong>.{" "}
        <span className="text-xs">{fonteDoValor}: R$ {programa.milheiroBRL} a cada 1.000.</span>
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <button type="button" onClick={aoAtualizar} className="min-h-12 rounded-2xl bg-marca px-5 text-[15px] font-semibold text-marca-contraste">
          Atualizar saldo
        </button>
        {confirmando ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-superficie-2 px-4 py-2">
            <span className="text-sm text-tinta">Tirar {programa.nome} da carteira?</span>
            <span className="flex gap-1">
              <button type="button" onClick={() => setConfirmando(false)} className="min-h-11 px-3 text-sm font-semibold text-tinta-media">
                Manter
              </button>
              <button
                type="button"
                onClick={() => {
                  removerPrograma(programa.id);
                  aoRemover();
                }}
                className="min-h-11 px-3 text-sm font-semibold text-alerta"
              >
                Tirar
              </button>
            </span>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmando(true)} className="min-h-11 text-sm font-semibold text-tinta-media">
            Tirar da carteira
          </button>
        )}
      </div>
    </div>
  );
}
