"use client";

import { useState } from "react";
import { MARCA } from "@/lib/marca";
import { usarCarteira } from "@/store/carteira";
import { usarPerfil } from "@/store/perfil";
import { usarViagens } from "@/store/viagens";

/**
 * Seus dados: o que o app guarda, e as duas portas de saida.
 *
 * Sem conta, tudo mora no localStorage. "Baixar" junta todas as chaves
 * do app num arquivo JSON -- o mesmo formato que a sincronizacao vai
 * importar quando a conta chegar. "Apagar" limpa o aparelho e recomeca
 * do zero, com confirmacao: nao ha copia em servidor para recuperar.
 */

/** Todo store do app usa um destes prefixos (store/*, AlternadorDeTema). */
const PREFIXOS = ["milhas-", "voemilo-"];

function chavesDoApp(): string[] {
  const chaves: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (chave && PREFIXOS.some((p) => chave.startsWith(p))) chaves.push(chave);
    }
  } catch {
    // Armazenamento bloqueado: nao ha o que baixar nem apagar.
  }
  return chaves.sort();
}

function baixarDados() {
  const dados: Record<string, unknown> = {};
  for (const chave of chavesDoApp()) {
    const bruto = localStorage.getItem(chave);
    if (bruto === null) continue;
    try {
      dados[chave] = JSON.parse(bruto);
    } catch {
      // O tema e guardado como texto puro ("claro"/"escuro").
      dados[chave] = bruto;
    }
  }
  const arquivo = {
    app: MARCA.nome,
    formato: 1,
    exportadoEm: new Date().toISOString(),
    dados,
  };
  const blob = new Blob([JSON.stringify(arquivo, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `voemilo-meus-dados-${arquivo.exportadoEm.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function apagarTudo() {
  // Primeiro os stores, para nenhum deles regravar o que esta em memoria.
  usarViagens.persist.clearStorage();
  usarCarteira.persist.clearStorage();
  usarPerfil.persist.clearStorage();
  for (const chave of chavesDoApp()) {
    try {
      localStorage.removeItem(chave);
    } catch {
      // idem
    }
  }
  // Recarga inteira de proposito, e nao router.push: so ela zera a
  // memoria dos stores. O app recomeca como na primeira visita.
  window.location.replace(`${window.location.origin}/`);
}

export function SeusDados() {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <section aria-labelledby="conta-dados">
      <h2 id="conta-dados" className="text-lg font-semibold text-tinta">
        Seus dados
      </h2>

      <div className="mt-3 rounded-2xl bg-superficie-2 p-5">
        <p className="flex items-start gap-2.5 text-[15px] leading-relaxed text-tinta">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-tinta-media" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <span>
            <strong className="font-semibold">Tudo fica neste aparelho.</strong> Sem cadastro e sem senha: suas
            viagens, saldos e objetivos não ficam guardados em servidor nenhum.
          </span>
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={baixarDados}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-marca px-5 text-sm font-semibold text-marca-contraste hover:bg-marca-forte"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v11m-5-5 5 5 5-5M5 20h14" />
            </svg>
            Baixar meus dados
          </button>
          {confirmando ? null : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-borda bg-superficie px-5 text-sm font-semibold text-alerta hover:border-alerta"
            >
              Apagar tudo deste aparelho
            </button>
          )}
        </div>

        {confirmando ? (
          <div role="alertdialog" aria-labelledby="conta-apagar" className="mt-4 rounded-2xl border border-alerta/40 bg-alerta-fundo p-4">
            <p id="conta-apagar" className="text-[15px] leading-relaxed text-tinta">
              Isto apaga viagens, buscas, carteira, objetivos e preferências deste aparelho. Baixe seus dados antes
              se quiser guardar uma cópia.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={apagarTudo}
                className="min-h-11 rounded-full bg-alerta px-5 text-sm font-semibold text-superficie"
              >
                Apagar tudo
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmando(false)}
                className="min-h-11 rounded-full px-4 text-sm font-semibold text-tinta-media hover:text-tinta"
              >
                Manter meus dados
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
