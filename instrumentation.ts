import type { Instrumentation } from "next";
import { registrar } from "@/lib/log";

/**
 * Todo erro que o servidor do Next captura -- ao renderizar uma tela,
 * numa rota de API ou numa server action -- vira uma linha no log.
 *
 * O `digest` e a ponte com a tela: em producao o navegador ve so uma
 * mensagem generica e esse identificador (a tela de erro o mostra), e e
 * por ele que se acha a linha aqui. O caminho vai sem query: ela pode
 * carregar dado da pessoa. Cabecalhos nao entram.
 */
export const onRequestError: Instrumentation.onRequestError = async (erro, requisicao, contexto) => {
  const digest =
    typeof erro === "object" && erro !== null && "digest" in erro
      ? String((erro as { digest: unknown }).digest)
      : undefined;

  registrar("erro", "servidor.erro", {
    erro,
    digest,
    caminho: requisicao.path.split("?")[0],
    metodo: requisicao.method,
    rota: contexto.routePath,
    tipo: contexto.routeType,
  });
};
