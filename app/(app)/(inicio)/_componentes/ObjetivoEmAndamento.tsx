"use client";

import Link from "next/link";
import { MarcoDoObjetivo } from "@/components/dominio/MarcoDoObjetivo";
import { usarPerfil, usePerfilHidratado } from "@/store/perfil";
import { calcularProgresso } from "@/lib/metas/progresso";
import { milhas as fmtMilhas } from "@/lib/format";

/**
 * O objetivo mais recente, resumido na home.
 *
 * E o unico elemento da home que muda sozinho entre uma visita e outra
 * -- e por isso o que traz a pessoa de volta. Preco de passagem ela
 * consulta quando precisa; "faltam 18 mil milhas" ela quer ver de novo.
 *
 * Na verdade a vaga responde sempre a mesma pergunta -- "o que eu faco
 * agora?" -- e a resposta muda com quem esta olhando: quem nunca viu o
 * app precisa entende-lo, quem entendeu precisa marcar um objetivo, quem
 * marcou quer ver o quanto andou.
 *
 * Os tres estados tem a MESMA altura, e e por isso que o convite de
 * boas-vindas mora aqui em vez de virar um cartao a mais: cartao novo
 * depois da hidratacao empurraria o resto da tela para baixo. Pela mesma
 * razao ha um esqueleto antes dela -- o conteudo so pode ser decidido
 * quando o localStorage chega.
 */

/**
 * A vaga reserva a altura do estado mais alto.
 *
 * No celular a coluna de texto deste cartao tem cerca de 188px -- o
 * icone e o botao de dispensar comem o resto. Frase de duas linhas na
 * tela larga vira seis aqui, e foi assim que o convite estourou a
 * reserva e empurrou a pagina: deslocamento de 0,25. Por isso os textos
 * abaixo sao curtos, e nao por economia de palavras.
 *
 * A reserva maior a partir de `md` existe porque ali este cartao divide
 * uma linha de grade com SeuCusto: a linha toda assume a altura do mais
 * alto, entao quem cresce ao hidratar empurra as oportunidades abaixo.
 * 10,5rem foi medido, nao estimado -- levou o deslocamento da home em
 * desktop de 0,134 para 0,042. Aumentar mais nao melhora (12rem deu
 * 0,049): o que resta vem da troca do esqueleto pelo conteudo, nao de
 * falta de espaco.
 */
const ALTURA = "min-h-[8rem] md:min-h-[10.5rem]";

/**
 * A casca da vaga, sempre o mesmo elemento.
 *
 * Os estados antes eram elementos diferentes -- o esqueleto um <div>, o
 * objetivo um <a> --, entao o React desmontava um e montava o outro em
 * vez de reaproveitar o no. O navegador registrava isso como
 * deslocamento mesmo com as alturas iguais. Mantendo a casca fixa, a
 * troca acontece so no miolo.
 */
function Vaga({ children }: { children: React.ReactNode }) {
  return <div className={`${ALTURA} mb-6`}>{children}</div>;
}

export function ObjetivoEmAndamento() {
  const metas = usarPerfil((p) => p.metas);
  const visitou = usarPerfil((p) => p.visitou);
  const marcarVisita = usarPerfil((p) => p.marcarVisita);
  const hidratado = usePerfilHidratado();

  if (!hidratado) {
    return (
      <Vaga>
        <div className="size-full animate-pulse rounded-[24px] bg-superficie-2" />
      </Vaga>
    );
  }

  // Quem nunca passou pelos passos ve o convite no lugar do cartao de
  // objetivo -- que, para quem acabou de chegar, estaria vazio mesmo.
  if (!visitou) {
    return (
      <Vaga>
        <div className="flex size-full items-center gap-4 rounded-[24px] border border-marca-fraca bg-marca-fraca p-4">
          <Link
            href="/boas-vindas"
            className="flex min-w-0 flex-1 items-center gap-4"
          >
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-marca text-marca-contraste"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-tinta">
                Primeira vez aqui?
              </span>
              <span className="mt-0.5 block text-sm leading-relaxed text-tinta-media">
                Entenda o app em um minuto.
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={marcarVisita}
            aria-label="Dispensar a apresentação"
            className="-mr-1 shrink-0 self-start rounded-full p-1.5 text-tinta-fraca transition-colors hover:text-marca"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </Vaga>
    );
  }

  const meta = metas[0];

  if (!meta) {
    return (
      <Vaga>
        <Link
          href="/objetivos"
          className="flex size-full items-center gap-4 rounded-[24px] border border-dashed border-borda bg-superficie p-4 transition-colors hover:border-marca"
        >
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-marca-fraca text-marca"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 21V4.2a.5.5 0 0 1 .7-.45c2.2 1 4.4 1 6.6 0 2.2-1 4.4-1 6.6 0a.5.5 0 0 1 .3.45v8.1a.5.5 0 0 1-.7.45c-2.2-1-4.4-1-6.6 0-2.2 1-4.4 1-6.6 0" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-tinta">
              Defina um objetivo
            </span>
            <span className="mt-0.5 block text-sm leading-relaxed text-tinta-media">
              Acompanhe quanto falta para a viagem.
            </span>
          </span>
        </Link>
      </Vaga>
    );
  }

  const progresso = calcularProgresso(meta, new Date());

  return (
    <Vaga>
      <Link
        href="/objetivos"
        className="flex size-full items-center gap-4 rounded-[24px] border border-borda bg-superficie p-4 shadow-card transition-colors hover:border-marca"
      >
        <MarcoDoObjetivo
          metaId={meta.id}
          percentual={progresso.percentual}
          marcosCelebrados={meta.marcosCelebrados}
          rotulo="pronto"
        />

        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-widest text-marca">
            Seu objetivo
          </span>
          <span className="display mt-0.5 block truncate text-lg text-tinta">
            {meta.destinoCidade}
          </span>
          <span className="tabular mt-1 block text-sm text-tinta-media">
            {progresso.milhasFaltando === 0
              ? "Milhas suficientes — hora de resgatar"
              : `Faltam ${fmtMilhas(progresso.milhasFaltando)} ${
                  progresso.mesesRestantes === null
                    ? "milhas"
                    : `· ~${progresso.mesesRestantes} ${
                        progresso.mesesRestantes === 1 ? "mês" : "meses"
                      }`
                }`}
          </span>
        </span>

        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-4 shrink-0 text-tinta-fraca"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </Vaga>
  );
}
