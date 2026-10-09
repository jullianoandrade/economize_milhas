"use client";

import { useSyncExternalStore } from "react";

/**
 * Troca de paleta, enquanto a paleta nao esta decidida.
 *
 * Isto e ferramenta de decisao, nao funcionalidade: a ideia e abrir
 * /visual no aparelho, alternar, e navegar o app de verdade com cada
 * uma. Comparar paleta em amostra de cor na tela do computador nao
 * decide nada -- o que decide e ver o veredito, o grafico e a nav no
 * tamanho real, na luz em que o app vai ser usado.
 *
 * A escolha vive num atributo no <html> e no localStorage, fora do
 * estado do React, porque ela precisa valer antes da primeira pintura.
 * Por isso a leitura passa por useSyncExternalStore: o servidor nao tem
 * como saber o que esta guardado, e e esse hook que deixa o React lidar
 * com instantaneo de servidor diferente do de cliente sem acusar
 * divergencia de hidratacao.
 */

export const CHAVE = "milhas-paleta";

export type Paleta = "ardosia" | "vangogh";

export const PALETAS: Array<{
  id: Paleta;
  nome: string;
  descricao: string;
  amostras: string[];
}> = [
  {
    id: "ardosia",
    nome: "Grafite + azul-ardósia",
    descricao:
      "Interface quase neutra, acento azul profundo. O verde e o âmbar do veredito são as únicas cores vivas da tela.",
    amostras: ["#f7f8fa", "#e2e6ee", "#5a6878", "#2a4d8f", "#14181f"],
  },
  {
    id: "vangogh",
    nome: "Van Gogh",
    descricao:
      "Superfície de tela crua e azul-ultramar da Noite Estrelada. Mesma estrutura do quadro: campo azul profundo, ocre como a única coisa que brilha.",
    amostras: ["#f8f5ec", "#e5decb", "#5e677f", "#20406f", "#15233f"],
  },
];

function aplicar(paleta: Paleta) {
  const raiz = document.documentElement;
  if (paleta === "ardosia") raiz.removeAttribute("data-paleta");
  else raiz.setAttribute("data-paleta", paleta);

  try {
    localStorage.setItem(CHAVE, paleta);
  } catch {
    // Navegacao privada ou armazenamento bloqueado: a paleta vale
    // enquanto a aba estiver aberta, e so.
  }

  // A barra de status do aparelho le a meta tag, nao o CSS. Sem isto o
  // topo do iPhone fica da cor da paleta anterior -- justamente o que
  // mais salta aos olhos no app instalado.
  const cor = getComputedStyle(raiz).getPropertyValue("--barra-do-sistema");
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute("content", cor.trim());
  }
}

function assinar(aoMudar: () => void) {
  const observador = new MutationObserver(aoMudar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-paleta"],
  });
  return () => observador.disconnect();
}

function atual(): Paleta {
  return document.documentElement.getAttribute("data-paleta") === "vangogh"
    ? "vangogh"
    : "ardosia";
}

export function SeletorDePaleta() {
  const escolhida = useSyncExternalStore(assinar, atual, () => "ardosia");

  return (
    <ul className="space-y-3">
      {PALETAS.map((p) => {
        const ativa = p.id === escolhida;
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => aplicar(p.id)}
              aria-pressed={ativa}
              className={`w-full rounded-[24px] border p-4 text-left transition-colors ${
                ativa
                  ? "border-marca bg-marca-fraca"
                  : "border-borda bg-superficie hover:border-marca"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-semibold text-tinta">{p.nome}</span>
                {ativa ? (
                  <span className="shrink-0 rounded-full bg-marca px-2.5 py-0.5 text-[11px] font-bold text-marca-contraste">
                    em uso
                  </span>
                ) : null}
              </div>

              <div
                aria-hidden="true"
                className="mb-2.5 flex overflow-hidden rounded-xl border border-borda"
              >
                {p.amostras.map((cor) => (
                  <span
                    key={cor}
                    className="h-9 flex-1"
                    style={{ background: cor }}
                  />
                ))}
              </div>

              <p className="text-sm leading-relaxed text-tinta-media">
                {p.descricao}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
