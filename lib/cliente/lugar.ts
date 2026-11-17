"use client";

import { useEffect, useState } from "react";

/**
 * Cidade e coordenadas de um aeroporto, pelo codigo IATA.
 *
 * A base de aeroportos nao vai ao navegador; quando uma tela precisa do
 * nome da cidade guardada no perfil (a origem) ou das coordenadas para
 * o globo tracar um arco, pergunta a /api/lugares. Uma requisicao por
 * codigo por sessao: o resultado fica num cache de modulo.
 */

export type PontoDoMapa = { iata: string; cidade: string; lat: number; lon: number };

const cache = new Map<string, Promise<PontoDoMapa | null>>();

export function buscarLugar(iata: string): Promise<PontoDoMapa | null> {
  const chave = iata.toUpperCase();
  let pendente = cache.get(chave);
  if (!pendente) {
    pendente = fetch(`/api/lugares?q=${encodeURIComponent(chave)}`)
      .then((r) => (r.ok ? r.json() : { lugares: [] }))
      .then((corpo: { lugares: Array<PontoDoMapa & { servidaPor?: unknown }> }) => {
        // So o aeroporto em si, nao uma cidade servida por ele.
        const achado = corpo.lugares.find((l) => l.iata === chave && !l.servidaPor);
        return achado
          ? { iata: achado.iata, cidade: achado.cidade, lat: achado.lat, lon: achado.lon }
          : null;
      })
      .catch(() => {
        cache.delete(chave);
        return null;
      });
    cache.set(chave, pendente);
  }
  return pendente;
}

export function useLugar(iata: string | null): PontoDoMapa | null {
  const [lugar, setLugar] = useState<PontoDoMapa | null>(null);

  useEffect(() => {
    if (!iata) return;
    let vivo = true;
    buscarLugar(iata).then((l) => {
      if (vivo) setLugar(l);
    });
    return () => {
      vivo = false;
    };
  }, [iata]);

  return iata && lugar?.iata === iata.toUpperCase() ? lugar : null;
}
