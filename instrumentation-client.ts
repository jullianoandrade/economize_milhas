import { relatarErro } from "@/lib/cliente/relatar";

/**
 * Roda no navegador antes de o app ficar interativo.
 *
 * Captura o que escapa das fronteiras de erro do React: excecao solta
 * (handler de evento, timer, o laco de animacao do globo) e promessa
 * rejeitada sem catch. Ver lib/cliente/relatar.ts.
 */
window.addEventListener("error", (evento) => {
  relatarErro("janela", evento.error ?? evento.message);
});

window.addEventListener("unhandledrejection", (evento) => {
  relatarErro("promessa", evento.reason);
});
