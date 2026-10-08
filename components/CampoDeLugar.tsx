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
  aoSelecionar,
}: {
  rotulo: string;
  valorInicial?: string;
  autoFocus?: boolean;
  aoSelecionar: (lugar: Lugar) => void;
}) {
  const id = useId();
  const [texto, setTexto] = useState(valorInicial);
  const [sugestoes, setSugestoes] = useState<Lugar[]>([]);
  const [aberto, setAberto] = useState(false);
  const [destacado, setDestacado] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (texto.trim().length < 2) {
      setSugestoes([]);
      return;
    }

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
  }, [texto]);

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
    if (!aberto || sugestoes.length === 0) return;

    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setDestacado((i) => (i + 1) % sugestoes.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setDestacado((i) => (i - 1 + sugestoes.length) % sugestoes.length);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      escolher(sugestoes[destacado]);
    } else if (evento.key === "Escape") {
      setAberto(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-tinta-fraca"
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
        onFocus={() => sugestoes.length > 0 && setAberto(true)}
        onKeyDown={aoTeclar}
        placeholder="Lisboa, Buenos Aires, Recife…"
        className="w-full rounded-2xl border border-borda bg-superficie px-4 py-3.5 text-base text-tinta shadow-card outline-none placeholder:text-tinta-fraca focus:border-marca"
      />

      {aberto && sugestoes.length > 0 ? (
        <ul
          id={`${id}-lista`}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-borda bg-superficie shadow-card"
        >
          {sugestoes.map((lugar, indice) => (
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
