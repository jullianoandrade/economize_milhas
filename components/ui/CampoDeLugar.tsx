"use client";

import { useEffect, useId, useRef, useState } from "react";

export type Lugar = {
  iata: string;
  cidade: string;
  pais: string;
  /** Pais por extenso. Ver a linha secundaria da sugestao abaixo. */
  paisNome?: string;
  nome: string;
  /**
   * Quando a cidade buscada nao tem aeroporto proprio: de onde a pessoa
   * realmente voa, e a que distancia.
   */
  servidaPor?: { cidade: string; km: number };
  lat?: number;
  lon?: number;
};

/**
 * Campo de busca de cidade ou aeroporto com sugestoes.
 *
 * Consulta /api/lugares, que le a base local -- por isso a resposta e
 * instantanea e o debounce pode ser curto. Teclado e mouse funcionam
 * igual: setas navegam, Enter escolhe, Esc fecha a lista sem apagar o
 * que foi digitado.
 *
 * Segue o padrao combobox da ARIA: o foco fica sempre no campo, e a
 * opcao destacada e anunciada por aria-activedescendant. Por isso as
 * opcoes sao os proprios <li role="option"> -- botao dentro de option
 * seria controle interativo aninhado, que leitor de tela anuncia mal.
 */
export function CampoDeLugar({
  rotulo,
  valorInicial = "",
  autoFocus = false,
  // "claro" e para quando o campo esta sobre o painel escuro da home:
  // so o rotulo muda de cor, o campo em si continua branco para o
  // contraste do texto digitado nao depender do fundo da tela.
  tom = "padrao",
  aoSelecionar,
}: {
  rotulo: string;
  valorInicial?: string;
  autoFocus?: boolean;
  tom?: "padrao" | "claro";
  aoSelecionar: (lugar: Lugar) => void;
}) {
  const id = useId();
  const idDaLista = `${id}-lista`;
  const idDoAviso = `${id}-aviso`;
  const [texto, setTexto] = useState(valorInicial);
  // Valor inicial preenchido (destino vindo da URL, por exemplo) nao e
  // pergunta da pessoa: a lista so abre depois que ela digita.
  const [digitou, setDigitou] = useState(false);
  const [resultado, setResultado] = useState<{
    busca: string;
    lugares: Lugar[];
  } | null>(null);
  const [aberto, setAberto] = useState(false);
  const [destacado, setDestacado] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Texto curto demais nao tem sugestao: isso e consequencia do que foi
  // digitado, nao estado proprio. Derivar em vez de limpar a lista dentro
  // do efeito poupa um render a cada tecla apagada.
  const curtoDemais = texto.trim().length < 2;
  const buscando = digitou && !curtoDemais;
  const visiveis = buscando && resultado ? resultado.lugares : [];
  // "Nada encontrado" so aparece quando a resposta e do texto atual:
  // durante o debounce de uma busca nova a mensagem antiga nao pisca.
  const semResultado =
    buscando && resultado?.busca === texto && resultado.lugares.length === 0;
  const listaAberta = aberto && visiveis.length > 0;
  const avisoAberto = aberto && semResultado;

  useEffect(() => {
    if (!buscando) return;

    // AbortController evita que uma resposta lenta de uma busca antiga
    // sobrescreva o resultado de uma busca mais recente.
    const controlador = new AbortController();
    const temporizador = setTimeout(async () => {
      try {
        const resposta = await fetch(
          `/api/lugares?q=${encodeURIComponent(texto)}`,
          { signal: controlador.signal },
        );
        const corpo = (await resposta.json()) as { lugares: Lugar[] };
        setResultado({ busca: texto, lugares: corpo.lugares });
        setDestacado(0);
        setAberto(true);
      } catch {
        // Busca cancelada ou rede fora: mantem o que ja estava na tela.
      }
    }, 150);

    return () => {
      controlador.abort();
      clearTimeout(temporizador);
    };
  }, [texto, buscando]);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (!containerRef.current?.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function escolher(lugar: Lugar) {
    // O texto escolhido tambem nao e busca: sem isto, "Recife (REC)"
    // dispararia uma consulta e reabriria a lista logo apos a escolha.
    setDigitou(false);
    setTexto(`${lugar.cidade} (${lugar.iata})`);
    setAberto(false);
    aoSelecionar(lugar);
  }

  function aoTeclar(evento: React.KeyboardEvent) {
    // Esc num type="search" tambem apaga o campo, por padrao do
    // navegador. Aqui Esc so fecha a lista: o texto e da pessoa.
    if (evento.key === "Escape") {
      evento.preventDefault();
      setAberto(false);
      return;
    }

    if (evento.key === "ArrowDown" && !aberto && visiveis.length > 0) {
      evento.preventDefault();
      setAberto(true);
      return;
    }

    if (!listaAberta) return;

    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setDestacado((i) => (i + 1) % visiveis.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setDestacado((i) => (i - 1 + visiveis.length) % visiveis.length);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      escolher(visiveis[destacado]);
    }
  }

  const idDaOpcao = (indice: number) => `${id}-opcao-${indice}`;

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={id}
        className={`mb-1.5 block text-sm font-semibold ${
          tom === "claro" ? "text-painel-tinta-fraca" : "text-tinta-media"
        }`}
      >
        {rotulo}
      </label>

      <input
        id={id}
        type="search"
        autoComplete="off"
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={listaAberta}
        aria-controls={idDaLista}
        aria-autocomplete="list"
        aria-activedescendant={listaAberta ? idDaOpcao(destacado) : undefined}
        aria-describedby={avisoAberto ? idDoAviso : undefined}
        value={texto}
        onChange={(e) => {
          setDigitou(true);
          setTexto(e.target.value);
        }}
        onFocus={() => (visiveis.length > 0 || semResultado) && setAberto(true)}
        onKeyDown={aoTeclar}
        placeholder="Lisboa, Buenos Aires, Recife…"
        // Anel de foco com folga, e nao so a borda mudando de cor: borda
        // de 1px trocando de tom nao passa como indicador visivel. Sobre o
        // painel o anel e claro com folga marinha; no resto, marca sobre
        // a superficie.
        className={`w-full rounded-2xl border border-borda bg-superficie px-4 py-3.5 text-base text-tinta shadow-card outline-none placeholder:text-tinta-fraca focus-visible:border-marca focus-visible:ring-2 focus-visible:ring-offset-2 ${
          tom === "claro"
            ? "focus-visible:ring-painel-tinta focus-visible:ring-offset-painel"
            : "focus-visible:ring-marca focus-visible:ring-offset-superficie"
        }`}
      />

      {/* A lista existe sempre, escondida quando fechada: aria-controls
          precisa apontar para um id que esta no documento. */}
      <ul
        id={idDaLista}
        role="listbox"
        aria-label={rotulo}
        hidden={!listaAberta}
        className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-borda bg-superficie shadow-card"
      >
        {visiveis.map((lugar, indice) => (
          <li
            key={`${lugar.iata}-${lugar.cidade}`}
            id={idDaOpcao(indice)}
            role="option"
            aria-selected={indice === destacado}
            onMouseEnter={() => setDestacado(indice)}
            // mousedown, e nao click: o foco nao sai do campo, e o clique
            // fora nao fecha a lista antes da escolha acontecer.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => escolher(lugar)}
            className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors ${
              indice === destacado ? "bg-marca-fraca" : ""
            }`}
          >
            {/* Largura fixa: o codigo tem sempre 3 letras, mas "WWW" e
                "III" tem larguras diferentes e desalinhavam os nomes. */}
            <span className="tabular w-12 shrink-0 rounded-lg bg-superficie-2 py-1 text-center text-xs font-bold text-tinta-media">
              {lugar.iata}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-tinta">
                {lugar.cidade}
              </span>
              {/* A linha secundaria explica o resultado. Quando a
                  cidade buscada nao tem aeroporto, a explicacao e de
                  ONDE a pessoa voa -- sem isso, digitar "Gravatai" e
                  receber um resultado com codigo POA parece erro.
                  Nos outros casos quem explica e o pais, que e o que
                  faz "Ucrania" devolver "Kiev" fazer sentido. */}
              {lugar.servidaPor ? (
                <span className="block truncate text-xs font-medium text-tinta-media">
                  Aeroporto de {lugar.servidaPor.cidade} ·{" "}
                  {lugar.servidaPor.km} km
                </span>
              ) : (
                <span className="block truncate text-xs text-tinta-fraca">
                  {lugar.paisNome ? `${lugar.paisNome} · ` : ""}
                  {lugar.nome}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {avisoAberto ? (
        <p
          id={idDoAviso}
          role="status"
          className="absolute inset-x-0 top-full z-20 mt-1.5 rounded-2xl border border-borda bg-superficie px-4 py-3 text-sm text-tinta-media shadow-card"
        >
          Nenhum lugar encontrado para “{texto.trim()}”. Tente o nome da
          cidade, do país ou o código do aeroporto.
        </p>
      ) : null}
    </div>
  );
}
