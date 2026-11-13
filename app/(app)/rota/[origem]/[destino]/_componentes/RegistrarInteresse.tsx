"use client";

import { useEffect } from "react";

/**
 * Avisa o servidor que esta rota foi olhada.
 *
 * Nao desenha nada. Existe para que o uso real decida quais rotas
 * entram na coleta diaria -- antes disto, a lista de 20 rotas escolhida
 * a mao em outubro nunca mudaria, por mais que as pessoas procurassem
 * outra coisa.
 *
 * E componente de cliente de proposito, e nao escrita durante o render:
 *
 *   - a pagina usa pre-renderizacao parcial, entao escrever no render
 *     atrasaria o primeiro byte de todo mundo por um efeito que nao
 *     interessa a quem esta lendo;
 *   - rastreador e pre-busca de navegador nao executam este efeito,
 *     entao o contador mede gente, nao robo.
 *
 * Uma vez por rota por sessao: quem recarrega a mesma tela vinte vezes
 * nao vale vinte votos. sessionStorage e por aba e some ao fechar, que
 * e a granularidade certa para "uma visita".
 */
export function RegistrarInteresse({
  origem,
  destino,
}: {
  origem: string;
  destino: string;
}) {
  useEffect(() => {
    const chave = `milhas-interesse:${origem}-${destino}`;

    try {
      if (sessionStorage.getItem(chave)) return;
      // Marca ANTES de pedir. Em modo estrito o efeito roda duas vezes,
      // e e esta linha que impede a segunda de contar de novo.
      sessionStorage.setItem(chave, "1");
    } catch {
      // Aba anonima ou armazenamento bloqueado: segue sem deduplicar.
      // Contar demais e melhor do que nao contar.
    }

    // keepalive para a requisicao sobreviver se a pessoa sair da pagina
    // logo em seguida. Falha nao tem tratamento porque nao tem
    // consequencia: quem abriu a tela veio ver uma rota, nao alimentar
    // o nosso sensor.
    void fetch("/api/interesse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origem, destino }),
      keepalive: true,
    }).catch(() => {});
  }, [origem, destino]);

  return null;
}
