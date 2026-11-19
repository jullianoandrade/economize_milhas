/**
 * Registro de eventos do servidor, uma linha JSON por evento.
 *
 * POR QUE EXISTE: ate 18/11/2026 o app nao registrava nada. Uma falha da
 * Travelpayouts virava "sem preco" e uma falha do banco virava "sem
 * historico", em silencio -- de proposito, para nunca derrubar a tela,
 * mas sem deixar rastro. Ninguem sabia quando a coleta parava. Agora a
 * tela continua degradando com elegancia, e o motivo fica registrado.
 *
 * ONDE VAI PARAR: na saida padrao do processo. Na Vercel isso e o painel
 * de Logs do projeto (e o que um log drain encaminharia). Uma linha JSON
 * por evento e o formato que o painel filtra por campo -- por exemplo,
 * `evento:provedor.falha`.
 *
 * O QUE NAO ENTRA, nunca: IP, conteudo de formulario, saldo, token.
 * `limpar` remove chaves com cara de segredo e o parametro `token` de
 * qualquer URL, e corta texto longo. Sem import de "server-only" para
 * poder ser usado por instrumentation.ts e testado.
 */

export type Nivel = "info" | "aviso" | "erro";

const CHAVES_SECRETAS = /token|senha|password|secret|apikey|api_key|authorization|cookie|chave/i;
const TETO_DE_TEXTO = 500;

/** Tira `token` (e parecidos) da query de uma URL; devolve o resto. */
export function semSegredos(url: string): string {
  try {
    const u = new URL(url);
    for (const nome of [...u.searchParams.keys()]) {
      if (CHAVES_SECRETAS.test(nome)) u.searchParams.set(nome, "[omitido]");
    }
    return u.toString();
  } catch {
    return url.replace(/(token|key|secret)=[^&\s]+/gi, "$1=[omitido]");
  }
}

export function limpar(valor: unknown, profundidade = 0): unknown {
  if (valor === null || valor === undefined) return valor;
  if (typeof valor === "string") {
    const sem = /^https?:\/\//.test(valor) ? semSegredos(valor) : valor;
    return sem.length > TETO_DE_TEXTO ? `${sem.slice(0, TETO_DE_TEXTO)}…` : sem;
  }
  if (typeof valor === "number" || typeof valor === "boolean") return valor;
  if (valor instanceof Error) {
    return { nome: valor.name, mensagem: limpar(valor.message, profundidade + 1) };
  }
  if (profundidade >= 3) return "[profundo demais]";
  if (Array.isArray(valor)) return valor.slice(0, 20).map((v) => limpar(v, profundidade + 1));
  if (typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(([k, v]) => [
        k,
        CHAVES_SECRETAS.test(k) ? "[omitido]" : limpar(v, profundidade + 1),
      ]),
    );
  }
  return String(valor);
}

export function registrar(
  nivel: Nivel,
  evento: string,
  campos: Record<string, unknown> = {},
): void {
  const linha = JSON.stringify({
    nivel,
    evento,
    em: new Date().toISOString(),
    ...(limpar(campos) as Record<string, unknown>),
  });
  if (nivel === "erro") console.error(linha);
  else if (nivel === "aviso") console.warn(linha);
  else console.log(linha);
}
