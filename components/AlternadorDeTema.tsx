"use client";

import { useSyncExternalStore } from "react";

/**
 * Dia e noite.
 *
 * O tema vive num atributo no <html> e no localStorage, fora do estado
 * do React, porque ele precisa valer ANTES da primeira pintura -- quem
 * prefere escuro nao pode ver a tela clara piscar a cada carregamento.
 * Quem aplica na largada e o script sincrono no inicio do body; este
 * componente so troca depois.
 *
 * Por isso a leitura passa por useSyncExternalStore: o servidor nao tem
 * como saber o que esta guardado no aparelho, e e esse hook que deixa o
 * React lidar com instantaneo de servidor diferente do de cliente sem
 * acusar divergencia de hidratacao.
 *
 * Enquanto ninguem tocar no botao, nao ha preferencia salva e o app
 * segue o sistema.
 */

export const CHAVE_DO_TEMA = "milhas-tema";

type Tema = "claro" | "escuro";

function aplicar(tema: Tema) {
  const raiz = document.documentElement;
  if (tema === "escuro") raiz.setAttribute("data-tema", "escuro");
  else raiz.setAttribute("data-tema", "claro");

  try {
    localStorage.setItem(CHAVE_DO_TEMA, tema);
  } catch {
    // Navegacao privada ou armazenamento bloqueado: vale enquanto a aba
    // estiver aberta, e so.
  }

  // A barra de status do aparelho le a meta tag, nao o CSS. Sem isto o
  // topo do iPhone fica da cor do tema anterior -- justamente o que mais
  // salta aos olhos no app instalado na tela de inicio.
  const cor = getComputedStyle(raiz)
    .getPropertyValue("--barra-do-sistema")
    .trim();
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute("content", cor);
  }
}

function assinar(aoMudar: () => void) {
  const observador = new MutationObserver(aoMudar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-tema"],
  });
  return () => observador.disconnect();
}

function atual(): Tema {
  return document.documentElement.getAttribute("data-tema") === "escuro"
    ? "escuro"
    : "claro";
}

export function AlternadorDeTema() {
  const tema = useSyncExternalStore(assinar, atual, () => "claro" as Tema);
  const escuro = tema === "escuro";

  return (
    <button
      type="button"
      onClick={() => aplicar(escuro ? "claro" : "escuro")}
      aria-pressed={escuro}
      className="inline-flex items-center gap-1.5 rounded-full border border-borda px-3 py-1.5 text-xs text-tinta-fraca transition-colors hover:border-marca hover:text-marca"
    >
      {escuro ? (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10L5.6 18.4" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        </svg>
      )}
      {escuro ? "Modo claro" : "Modo escuro"}
    </button>
  );
}
