/**
 * Cabecalho de tela.
 *
 * O titulo usa a serifa de display; a sobrelinha, quando existe, da o
 * contexto que o titulo nao precisa carregar ("Promoções do momento"
 * vira "Saindo de Recife" + "Promoções do momento").
 */
export function Cabecalho({
  sobrelinha,
  titulo,
  subtitulo,
}: {
  sobrelinha?: string;
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <header className="mb-5">
      {sobrelinha ? (
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-marca">
          {sobrelinha}
        </p>
      ) : null}
      <h1 className="display text-[26px] leading-[1.15] text-tinta">{titulo}</h1>
      {subtitulo ? (
        <p className="mt-2 text-sm leading-relaxed text-tinta-media">
          {subtitulo}
        </p>
      ) : null}
    </header>
  );
}
