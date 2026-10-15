"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usarPerfil } from "@/store/perfil";

/**
 * Abre os passos de boas-vindas na primeira vez -- mas so no app
 * instalado.
 *
 * O redirecionamento valia para todo mundo e tinha um custo que so
 * apareceu quando o Lighthouse pediu "/" e terminou em "/boas-vindas":
 * um visitante sem nada no localStorage e mandado embora da home, e isso
 * inclui o rastreador do Google, que executa JavaScript. Na pratica a
 * URL mais importante do projeto deixava de ser indexada pelo proprio
 * conteudo.
 *
 * A condicao de display-mode resolve sem abrir mao do fluxo: quem
 * instalou o app na tela de inicio -- aquele para quem "assim que entra
 * no app" e literal -- continua caindo nos passos. Quem chega pelo
 * navegador ve a home, e recebe o convite no lugar do cartao de
 * objetivo, que para ele estaria vazio de qualquer jeito.
 *
 * Nao e disfarce para rastreador: a condicao e uma capacidade do
 * aparelho, igual para qualquer visitante, e nao uma checagem de quem
 * esta pedindo a pagina.
 */
export function PrimeiraVisita() {
  const router = useRouter();

  useEffect(() => {
    const instalado =
      window.matchMedia?.("(display-mode: standalone)").matches === true ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (!instalado) return;

    const decidir = () => {
      if (!usarPerfil.getState().visitou) router.replace("/boas-vindas");
    };

    if (usarPerfil.persist.hasHydrated()) {
      decidir();
      return;
    }
    return usarPerfil.persist.onFinishHydration(decidir);
  }, [router]);

  return null;
}
