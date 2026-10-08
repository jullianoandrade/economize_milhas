export function Cabecalho({
  titulo,
  subtitulo,
}: {
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <header className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight text-tinta">
        {titulo}
      </h1>
      {subtitulo ? (
        <p className="mt-1.5 text-sm leading-relaxed text-tinta-media">
          {subtitulo}
        </p>
      ) : null}
    </header>
  );
}
