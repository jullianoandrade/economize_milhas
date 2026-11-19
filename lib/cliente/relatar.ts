/**
 * Relata um erro do navegador para /api/erros.
 *
 * Usado pelo instrumentation-client.ts (erros soltos e promessas
 * rejeitadas) e pelas fronteiras de erro (error.tsx, global-error.tsx).
 *
 * Marca o aparelho -- "celular" ou "desktop" -- porque um erro que so
 * acontece numa largura de tela e o tipo mais comum de defeito de
 * layout, e sem essa marca nao da para reproduzir.
 *
 * Teto de 5 relatos por carregamento de pagina e um relato por mensagem:
 * um erro dentro de um laco de animacao nao pode virar centenas de
 * requisicoes. sendBeacon quando existe, porque sobrevive a pessoa
 * fechar a aba logo depois do erro.
 */

export type OrigemDoErro = "janela" | "promessa" | "fronteira" | "fronteira-global";

const TETO_POR_PAGINA = 5;
const ja = new Set<string>();

export function dispositivoAtual(): "celular" | "desktop" {
  const estreito = window.matchMedia?.("(max-width: 767px)").matches ?? window.innerWidth < 768;
  const toque = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  return estreito || (toque && window.innerWidth < 1024) ? "celular" : "desktop";
}

export function relatarErro(origem: OrigemDoErro, erro: unknown, digest?: string): void {
  if (typeof window === "undefined") return;
  // Em desenvolvimento o proprio Next mostra o erro na tela.
  if (process.env.NODE_ENV === "development") return;

  const mensagem = (erro instanceof Error ? erro.message : String(erro ?? "erro desconhecido")).slice(0, 500);
  if (ja.has(mensagem) || ja.size >= TETO_POR_PAGINA) return;
  ja.add(mensagem);

  const corpo = JSON.stringify({
    origem,
    mensagem,
    pagina: window.location.pathname.slice(0, 200),
    dispositivo: dispositivoAtual(),
    largura: Math.round(window.innerWidth),
    ...(digest ? { digest: digest.slice(0, 64) } : {}),
    ...(erro instanceof Error && erro.stack ? { pilha: erro.stack.slice(0, 1500) } : {}),
  });

  try {
    const blob = new Blob([corpo], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/erros", blob)) return;
  } catch {
    // segue para o fetch
  }
  fetch("/api/erros", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: corpo,
    keepalive: true,
  }).catch(() => {});
}
