import Link from "next/link";
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { NavegacaoInferior } from "@/components/NavegacaoInferior";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Milhas — vale mais em milhas ou em dinheiro?",
    template: "%s · Milhas",
  },
  description:
    "Descubra quanto custa sua viagem em dinheiro e em milhas, em que mês ir, quando comprar e como acumular as milhas que faltam.",
  applicationName: "Milhas",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Milhas",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e1c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-marca focus:px-4 focus:py-2 focus:text-marca-contraste"
        >
          Pular para o conteúdo
        </a>

        {/* pb-24 reserva o espaco da nav inferior fixa */}
        <main id="conteudo" className="mx-auto max-w-lg px-4 pb-4 pt-5">
          {children}
        </main>

        <footer className="mx-auto max-w-lg px-4 pb-24 pt-6">
          <p className="border-t border-borda pt-4 text-center text-xs text-tinta-fraca">
            Valores em milhas são estimativas.{" "}
            <Link
              href="/como-nos-sustentamos"
              className="underline underline-offset-2 hover:text-marca"
            >
              Como nos sustentamos
            </Link>
          </p>
        </footer>

        {/* usePathname e dado dinamico: sem esta fronteira, a nav
            impediria qualquer pagina do app de ser pre-renderizada. */}
        <Suspense fallback={null}>
          <NavegacaoInferior />
        </Suspense>
      </body>
    </html>
  );
}
