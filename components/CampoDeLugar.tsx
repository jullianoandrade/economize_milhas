"use client";

import { useEffect, useId, useRef, useState } from "react";

export type Lugar = {
  iata: string;
  cidade: string;
  pais: string;
  nome: string;
};

/**
 * Campo de busca de cidade ou aeroporto com sugestoes.
 *
 * Consulta /api/lugares, que le a base local -- por isso a resposta e
 * instantanea e o debounce pode ser curto. Teclado e mouse funcionam
 * igual: setas navegam, Enter escolhe, Esc fecha.
 */
export function CampoDeLugar({
  rotulo,
  valorInicial = "",
  autoFocus = false,
  // "claro" e para quando o campo esta sobre o painel violeta da home:
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
  const [texto, setTexto] = useState(valorInicial);
  const [sugestoes, setSugestoes] = useState<Lugar[]>([]);
  const [aberto, setAberto] = useState(false);
  const [destacado, setDestacado] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Texto curto demais nao tem sugestao: isso e consequencia do que foi
  // digitado, nao estado proprio. Derivar em vez de limpar a lista dentro
  // do efeito poupa um render a cada tecla apagada.
  const curtoDemais = texto.trim().length < 2;
  const visiveis = curtoDemais ? [] : sugestoes;

  useEffect(() => {
    if (curtoDemais) return;

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
        setSugestoes(corpo.lugares);
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
  }, [texto, curtoDemais]);

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
    setTexto(`${lugar.cidade} (${lugar.iata})`);
    setAberto(false);
    aoSelecionar(lugar);
  }

  function aoTeclar(evento: React.KeyboardEvent) {
    if (!aberto || visiveis.length === 0) return;

    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setDestacado((i) => (i + 1) % visiveis.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setDestacado((i) => (i - 1 + visiveis.length) % visiveis.length);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      escolher(visiveis[destacado]);
    } else if (evento.key === "Escape") {
      setAberto(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={id}
        className={`mb-1.5 block text-xs font-semibold uppercase tracking-wide ${
          tom === "claro" ? "text-white/80" : "text-tinta-fraca"
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
        aria-expanded={aberto}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onFocus={() => visiveis.length > 0 && setAberto(true)}
        onKeyDown={aoTeclar}
        placeholder="Lisboa, Buenos Aires, Recife…"
        className="w-full rounded-2xl border border-borda bg-superficie px-4 py-3.5 text-base text-tinta shadow-card outline-none placeholder:text-tinta-fraca focus:border-marca"
      />

      {aberto && visiveis.length > 0 ? (
        <ul
          id={`${id}-lista`}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-borda bg-superficie shadow-card"
        >
          {visiveis.map((lugar, indice) => (
            <li key={lugar.iata} role="option" aria-selected={indice === destacado}>
              <button
                type="button"
                onMouseEnter={() => setDestacado(indice)}
                onClick={() => escolher(lugar)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  indice === destacado ? "bg-marca-fraca" : ""
                }`}
              >
                <span className="tabular shrink-0 rounded-lg bg-superficie-2 px-2 py-1 text-xs font-bold text-tinta-media">
                  {lugar.iata}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-tinta">
                    {lugar.cidade}
                  </span>
                  <span className="block truncate text-xs text-tinta-fraca">
                    {lugar.nome}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
