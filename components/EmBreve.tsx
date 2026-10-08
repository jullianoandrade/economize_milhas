/**
 * Marcador honesto de tela ainda nao implementada.
 * Some conforme cada fase do plano e concluida.
 */
export function EmBreve({ fase, children }: { fase: string; children: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-borda bg-superficie-2 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-tinta-fraca">
        {fase}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-tinta-media">{children}</p>
    </div>
  );
}
