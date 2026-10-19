import Link from "next/link";
import { AlternadorDeTema } from "./AlternadorDeTema";

/**
 * Rodapé do app.
 *
 * Deixou de ser client component: antes precisava de `usePathname` só
 * para se esconder na tela de boas-vindas. Hoje aquela tela vive em
 * outro route group, com outro layout, e o rodapé simplesmente não está
 * lá -- o que também o tirou de um Suspense no layout raiz.
 *
 * `pb-28` reserva a altura da nav flutuante, que só existe no celular;
 * a partir de `md` o respiro volta ao normal. O alternador de tema some
 * aqui em telas grandes porque a barra superior já o tem.
 */
export function Rodape() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-6 md:pb-10 lg:px-8">
      <p className="border-t border-borda pt-4 text-center text-xs leading-relaxed text-tinta-fraca">
        Valores em milhas são estimativas.{" "}
        <Link
          href="/boas-vindas"
          className="underline underline-offset-2 hover:text-marca"
        >
          Como o app funciona
        </Link>{" "}
        ·{" "}
        <Link
          href="/como-nos-sustentamos"
          className="underline underline-offset-2 hover:text-marca"
        >
          Como nos sustentamos
        </Link>
      </p>

      <div className="mt-4 flex justify-center md:hidden">
        <AlternadorDeTema />
      </div>
    </footer>
  );
}
