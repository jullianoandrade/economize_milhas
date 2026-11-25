"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Milo } from "@/components/ui/Milo";
import {
  montarCarteira,
  quandoVence,
  totalEstimado,
  vencimentosProximos,
  type ProgramaDaCarteira,
} from "@/lib/carteira/modelo";
import { hrefDaOferta, lugarDaOferta, usePromocoes } from "@/lib/cliente/promocoes";
import { useLugar } from "@/lib/cliente/lugar";
import { milhas as fmt, reais } from "@/lib/format";
import { ordenarPorVeredito } from "@/lib/milhas/rotulos";
import { dicasDoMilo, type Dica } from "@/lib/milo/dicas";
import { diasEntre } from "@/lib/viagens/preparar";
import { hojeEmSaoPaulo, separarViagens } from "@/lib/viagens/modelo";
import { useCarteiraHidratada, usarCarteira } from "@/store/carteira";
import { usarPerfil } from "@/store/perfil";
import { useViagensHidratadas, usarViagens } from "@/store/viagens";

/**
 * O Milo no Inicio: o guia que aponta o caminho.
 *
 * Ele fica de pe no canto do painel, apontando para "Explorar destinos".
 * Tocar nele faz o que um guia faz: ele da um pulinho e diz UMA coisa
 * util, tirada dos dados da pessoa (lib/milo/dicas.ts), sempre com uma
 * acao. Tocar de novo -- ou em "Outra dica" -- traz a proxima.
 *
 * Movimento so em resposta ao toque (regra do projeto): nada de mascote
 * pulando sozinho. O balaozinho "Uma dica?" e estatico, so diz que ele e
 * tocavel. Com "reduzir movimento", o pulo e a abertura sao instantaneos
 * (regra global em app/globals.css).
 *
 * Cores do balao fixas: ele sempre abre sobre o painel marinho.
 */
export function MiloGuia({ catalogo }: { catalogo: ProgramaDaCarteira[] }) {
  const dicas = useDicas(catalogo);
  const [aberto, setAberto] = useState(false);
  const [indice, setIndice] = useState(0);
  const [pulos, setPulos] = useState(0);
  const idDoBalao = useId();
  const raiz = useRef<HTMLDivElement>(null);

  const dica: Dica | undefined = dicas[indice % Math.max(1, dicas.length)];

  const tocar = () => {
    setPulos((n) => n + 1);
    if (!aberto) setAberto(true);
    else setIndice((i) => i + 1);
  };

  // Esc e toque fora fecham, como todo balao.
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    const fora = (e: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("keydown", tecla);
    document.addEventListener("pointerdown", fora);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("pointerdown", fora);
    };
  }, [aberto]);

  return (
    <div ref={raiz} className="absolute bottom-0 right-4 z-10 md:right-[21.5rem]">
      {aberto && dica ? (
        <div
          id={idDoBalao}
          role="status"
          aria-live="polite"
          className="balao-do-milo absolute bottom-[calc(100%-0.75rem)] right-2 w-[min(17.5rem,calc(100vw-3.5rem))] rounded-[20px] bg-white p-4 pr-3 text-[#0b1526] shadow-[0_12px_32px_-12px_rgb(0_0_0/0.55)]"
        >
          <div className="flex items-start gap-2">
            <p className="flex-1 text-[15px] leading-snug">
              <TextoComDestaque dica={dica} />
            </p>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar a dica"
              className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-[#576278] hover:bg-[#eef2f8]"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Link
              href={dica.acao.href}
              className="flex min-h-10 items-center rounded-xl bg-[#0b1526] px-3.5 text-sm font-semibold text-white"
            >
              {dica.acao.rotulo}
            </Link>
            {dicas.length > 1 ? (
              <button
                type="button"
                onClick={tocar}
                className="min-h-10 px-2 text-sm font-semibold text-[#3c475c] underline underline-offset-4"
              >
                Outra dica
              </button>
            ) : null}
          </div>
          {/* a ponta do balao, apontando para a cabeca do Milo */}
          <span aria-hidden="true" className="absolute -bottom-1.5 right-12 size-4 rotate-45 rounded-[3px] bg-white" />
        </div>
      ) : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[calc(100%-1.25rem)] right-16 whitespace-nowrap rounded-full rounded-br-sm bg-white px-3 py-1.5 text-[13px] font-semibold text-[#0b1526] shadow-[0_6px_16px_-8px_rgb(0_0_0/0.6)]"
        >
          Uma dica?
        </span>
      )}

      <button
        type="button"
        onClick={tocar}
        aria-label={aberto ? "Outra dica do Milo" : "Ouvir uma dica do Milo"}
        aria-expanded={aberto}
        aria-controls={aberto ? idDoBalao : undefined}
        className="relative block w-[92px] rounded-3xl outline-offset-4 md:w-[112px]"
      >
        {/* key: cada toque remonta e reinicia o pulo */}
        <span key={pulos} className={`block ${pulos > 0 ? "pulo-do-milo" : ""}`}>
          <Milo pose="apontando" className="w-full" />
        </span>
      </button>
    </div>
  );
}

function TextoComDestaque({ dica }: { dica: Dica }) {
  if (!dica.destaque || !dica.texto.includes(dica.destaque)) return <>{dica.texto}</>;
  const [antes, ...resto] = dica.texto.split(dica.destaque);
  return (
    <>
      {antes}
      <strong className="font-bold">{dica.destaque}</strong>
      {resto.join(dica.destaque)}
    </>
  );
}

/** Junta os dados da pessoa e devolve as dicas, da mais urgente para a menos. */
function useDicas(catalogo: ProgramaDaCarteira[]): Dica[] {
  const origemIata = usarPerfil((p) => p.origemIata);
  const promocoes = usePromocoes(origemIata);
  const carteiraPronta = useCarteiraHidratada();
  const saldos = usarCarteira((s) => s.saldos);
  const viagensProntas = useViagensHidratadas();
  const viagens = usarViagens((s) => s.viagens);

  // "Hoje" so no navegador: new Date() no pre-render do servidor quebra o
  // build com cacheComponents (mesmo motivo da saudacao no HeroiDoInicio).
  const hoje = useSyncExternalStore(semAssinatura, () => hojeEmSaoPaulo(new Date()), () => null);
  const proxima =
    viagensProntas && hoje ? (separarViagens(viagens, meioDia(hoje)).proximas[0] ?? null) : null;
  const lugarDaViagem = useLugar(proxima?.destinoIata ?? null);

  return useMemo(() => {
    if (!hoje) return dicasDoMilo({});
    const linhas = carteiraPronta ? montarCarteira(saldos, catalogo, hoje) : [];
    const aviso = carteiraPronta ? vencimentosProximos(linhas, hoje)[0] : undefined;
    const ofertas = promocoes
      ? ordenarPorVeredito(promocoes.oportunidades).map((o) => ({
          lugar: lugarDaOferta(o.destino),
          preco: reais(o.precoBRL),
          descontoPct: o.descontoPct,
          veredito: o.veredito,
          href: hrefDaOferta(promocoes.origem.iata, o),
        }))
      : [];

    return dicasDoMilo({
      vencimento: aviso
        ? {
            quantidade: fmt(aviso.quantidade),
            unidade: aviso.programa.unidade,
            programa: aviso.programa.nome,
            quando: quandoVence(aviso.emDias),
          }
        : null,
      proximaViagem:
        proxima && proxima.ida && lugarDaViagem
          ? { cidade: lugarDaViagem.cidade, emDias: diasEntre(hoje, proxima.ida), id: proxima.id }
          : null,
      ofertas,
      carteira: !carteiraPronta ? undefined : linhas.length > 0 ? { valor: reais(totalEstimado(linhas)) } : null,
    });
  }, [hoje, carteiraPronta, saldos, catalogo, promocoes, proxima, lugarDaViagem]);
}

const semAssinatura = () => () => {};
/** Meio-dia em Sao Paulo do dia dado: longe da virada, o dia nao escorrega. */
const meioDia = (dia: string) => new Date(`${dia}T12:00:00-03:00`);
