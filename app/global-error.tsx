"use client";

import { MARCA as PRODUTO } from "@/lib/marca";

/**
 * O ultimo anteparo: quando o proprio layout raiz quebra.
 *
 * Esta tela SUBSTITUI o layout raiz, entao precisa do seu <html> e
 * <body> e nao recebe globals.css nem as fontes do app -- por isso
 * tudo aqui e estilo embutido. Nao e preciosismo: usar classe do
 * Tailwind neste arquivo daria uma pagina sem estilo nenhum
 * exatamente no momento em que a pessoa mais precisa entender o que
 * aconteceu.
 *
 * Pelo mesmo motivo o tema nao chega aqui: o script que le a
 * preferencia vive no layout que acabou de falhar. As cores abaixo sao
 * as da paleta clara, em valor literal.
 *
 * Nao exporta metadata -- fronteira de erro e Client Component, e o
 * Next nao aceita metadata nelas. O titulo vai pelo <title> do React.
 */

const FUNDO = "#f8f5ec";
const SUPERFICIE = "#fffdf7";
const TINTA = "#15233f";
const TINTA_MEDIA = "#4a5876";
const MARCA = "#20406f";
const BORDA = "#e5decb";

export default function ErroGlobal({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const digest =
    error instanceof Error && "digest" in error
      ? String((error as Error & { digest?: unknown }).digest ?? "")
      : "";

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: FUNDO,
          color: TINTA,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <title>{`Algo quebrou · ${PRODUTO.nome}`}</title>

        <main
          style={{
            width: "100%",
            maxWidth: "32rem",
            background: SUPERFICIE,
            border: `1px solid ${BORDA}`,
            borderRadius: 24,
            padding: 28,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 26, letterSpacing: -0.5 }}>
            Algo quebrou
          </h1>

          <p
            style={{
              marginTop: 12,
              marginBottom: 0,
              fontSize: 16,
              lineHeight: 1.6,
              color: TINTA_MEDIA,
            }}
          >
            A falha foi nossa, não sua. Tentar de novo costuma resolver; se
            insistir, volte daqui a pouco.
          </p>

          <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                minHeight: 48,
                padding: "0 24px",
                borderRadius: 999,
                border: "none",
                background: MARCA,
                color: SUPERFICIE,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Tentar de novo
            </button>
            {/* <a> de proposito, e nao <Link>: aqui o layout raiz
                caiu, e navegacao suave reconstruiria a arvore sobre o
                mesmo estado quebrado. O que se quer e um carregamento
                limpo, do zero. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                minHeight: 48,
                display: "inline-flex",
                alignItems: "center",
                padding: "0 24px",
                borderRadius: 999,
                border: `1px solid ${BORDA}`,
                color: TINTA,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Voltar para a busca
            </a>
          </div>

          {digest ? (
            <p
              style={{
                marginTop: 24,
                marginBottom: 0,
                fontSize: 12,
                color: TINTA_MEDIA,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Código da falha: {digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
