"use client";

import Link from "next/link";

/**
 * Quando uma tela do produto quebra.
 *
 * Fica no grupo (app), e nao na raiz, por um motivo de uso: aqui a
 * casca sobrevive. A barra, a navegacao e o rodape continuam na tela,
 * entao quem bateu no erro sai dele por conta propria em vez de ficar
 * numa pagina sem saida.
 *
 * O botao usa `retry`, que NAO e um reload: ele manda o React
 * re-renderizar a fronteira de erro. Como quase tudo que pode falhar
 * aqui e rede -- Travelpayouts fora do ar, Supabase lento -- tentar de
 * novo resolve com frequencia, e sem perder o que a pessoa ja tinha
 * digitado nas outras telas.
 */
export default function ErroDaTela({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  // Em producao o Next troca a mensagem de erro de Server Component por
  // uma generica e guarda um identificador em `digest`. E ele que casa
  // com a linha do log do servidor -- sem isso, um relato de usuario
  // vira agulha em palheiro. Vindo de Client Component, `error` pode
  // nao ser um Error: daí o estreitamento.
  const digest =
    error instanceof Error && "digest" in error
      ? String((error as Error & { digest?: unknown }).digest ?? "")
      : "";

  return (
    <section className="rounded-2xl border border-borda bg-superficie p-6 shadow-card">
      <h1 className="display text-2xl text-tinta">Algo quebrou aqui</h1>

      <p className="mt-3 text-sm leading-relaxed text-tinta-media">
        O erro é nosso, não seu. Boa parte das falhas desta tela é de rede e
        passa sozinha — vale tentar de novo antes de qualquer outra coisa.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-marca px-6 text-sm font-semibold text-marca-contraste transition-opacity hover:opacity-90"
        >
          Tentar de novo
        </button>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-borda px-6 text-sm font-semibold text-tinta transition-colors hover:border-marca"
        >
          Voltar para a busca
        </Link>
      </div>

      {digest ? (
        <p className="tabular mt-6 text-xs text-tinta-fraca">
          Código da falha: {digest}
        </p>
      ) : null}
    </section>
  );
}
