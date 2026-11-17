/**
 * Cabecalhos de seguranca de toda resposta.
 *
 * Fora de next.config.ts para ter teste: um cabecalho que some numa
 * refatoracao nao quebra nada visivel, so abre a porta de novo.
 *
 * SOBRE A CSP, e por que ela nao tem nonce: nonce exige render dinamico
 * em toda pagina, e o guia da propria versao do Next diz que e
 * incompativel com Partial Prerendering -- que e a base de performance
 * deste app. Sem nonce, script inline precisa de 'unsafe-inline' (o
 * script do tema em app/layout.tsx e os do proprio Next). O que a
 * politica ainda garante, e e o que importa aqui:
 *
 *   - nada de script, estilo, fonte, imagem ou conexao de outra origem.
 *     O app nao carrega NADA de fora no navegador (verificado em
 *     17/11/2026): a Travelpayouts e chamada so no servidor;
 *   - nenhum site pode embutir o app num iframe (clickjacking);
 *   - <base> e formularios nao podem apontar para outro dominio;
 *   - nada de <object>/<embed>.
 *
 * Se um dia entrar analytics, mapa ou fonte externa, a origem dele tem
 * de ser adicionada aqui -- e o teste de cabecalhos lembra disso.
 */

export type Cabecalho = { key: string; value: string };

export function politicaDeConteudo(desenvolvimento: boolean): string {
  const diretivas = [
    "default-src 'self'",
    // 'unsafe-eval' so em dev: o React usa eval para reconstruir pilha
    // de erro. Em producao nao ha eval nenhum.
    `script-src 'self' 'unsafe-inline'${desenvolvimento ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // ws: em dev para o recarregamento ao vivo.
    `connect-src 'self'${desenvolvimento ? " ws:" : ""}`,
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  // Em localhost (http) isso tentaria subir para https e quebraria.
  if (!desenvolvimento) diretivas.push("upgrade-insecure-requests");
  return diretivas.join("; ");
}

export function cabecalhosDeSeguranca(desenvolvimento: boolean): Cabecalho[] {
  return [
    { key: "Content-Security-Policy", value: politicaDeConteudo(desenvolvimento) },
    // Para navegador antigo que nao entende frame-ancestors.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // O destino de um link de afiliado ve que a visita veio daqui, mas
    // nao ve qual rota a pessoa estava olhando.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // O app nao usa nenhum destes. Desligar impede que um script
    // injetado peca acesso em nome do site.
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
  ];
}
