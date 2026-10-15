"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlternadorDeTema } from "./AlternadorDeTema";

/**
 * Rodape do app.
 *
 * Some na tela de boas-vindas pelo mesmo motivo que a nav some: aquele
 * fluxo tem um caminho so, e um rodape com dois links -- um deles para a
 * propria pagina -- convida a sair justamente de onde a pessoa deveria
 * seguir em frente.
 */
export function Rodape() {
  const pathname = usePathname();
  if (pathname === "/boas-vindas") return null;

  return (
    <footer className="mx-auto max-w-lg px-4 pb-28 pt-6">
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

      <div className="mt-4 flex justify-center">
        <AlternadorDeTema />
      </div>
    </footer>
  );
}
