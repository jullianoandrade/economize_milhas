import Link from "next/link";
import { Milo } from "@/components/ui/Milo";

/**
 * A tela de endereco que nao existe.
 *
 * Ate aqui, qualquer URL fora do mapa caia na tela padrao do Next: em
 * ingles, sem estilo, fora da marca -- num app inteiro em portugues.
 *
 * Renderiza dentro do layout raiz, que carrega globals.css e as fontes,
 * mas NAO tem navegacao: a barra e a pilula vivem no grupo (app), e um
 * endereco desconhecido nao esta em grupo nenhum. Por isso a saida
 * precisa estar aqui dentro, explicita.
 *
 * Nao existe `global-not-found` aqui de proposito: ele e experimental,
 * exige flag e ignora layout e estilos, e so compensa quando nao da
 * para montar o 404 a partir do layout -- varios layouts raiz, ou raiz
 * com segmento dinamico. Este app tem um layout raiz so.
 */
export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10">
      {/* Pagina vazia e um dos lugares do Milo: ele aponta a saida. */}
      <Milo className="mb-6 w-32" />

      <h1 className="display text-3xl text-tinta">
        Esta página não existe
      </h1>

      <p className="mt-3 text-base leading-relaxed text-tinta-media">
        O endereço que você abriu não está no mapa do app. Pode ter sido um
        link antigo, ou um erro de digitação.
      </p>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-marca px-6 text-sm font-semibold text-marca-contraste transition-opacity hover:opacity-90"
        >
          Buscar uma viagem
        </Link>
        <Link
          href="/aprender"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-borda px-6 text-sm font-semibold text-tinta transition-colors hover:border-marca"
        >
          Entender como funciona
        </Link>
      </div>

      <p className="mt-8 text-sm leading-relaxed text-tinta-fraca">
        Procurando uma rota? O formato é{" "}
        <code className="rounded bg-superficie-2 px-1.5 py-0.5 text-tinta-media">
          /rota/GRU/LIS
        </code>{" "}
        — os códigos de três letras dos aeroportos.
      </p>
    </main>
  );
}
