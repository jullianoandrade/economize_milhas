"use client";

import { useEffect, useState } from "react";
import { AnelDeProgresso } from "./AnelDeProgresso";
import { usarPerfil } from "@/store/perfil";

/**
 * O anel de progresso, com o pulso de marco.
 *
 * Em 25/50/75/100%, o arco pulsa uma vez para a cor de milhas e volta --
 * disparo único via `marcosCelebrados` na própria meta (store/perfil.ts),
 * nunca de novo na mesma marca. Sem confete: este é um app sobre não
 * perder dinheiro, e a celebração certa é a informação que a pessoa
 * queria, com ênfase, não uma animação gratuita.
 *
 * São os primeiros `@keyframes` do projeto -- o bloco
 * `prefers-reduced-motion` em globals.css, que até aqui não protegia
 * nada, finalmente tem o que desligar.
 */

const MARCOS = [25, 50, 75, 100] as const;

/** Duração do keyframe brilho-do-marco em globals.css. */
const DURACAO_DO_PULSO_MS = 900;

export function MarcoDoObjetivo({
  metaId,
  percentual,
  marcosCelebrados,
  rotulo,
  tom,
}: {
  metaId: string;
  percentual: number;
  marcosCelebrados: number[];
  rotulo?: string;
  tom?: "marca" | "claro";
}) {
  const celebrarMarco = usarPerfil((p) => p.celebrarMarco);
  const [brilhando, setBrilhando] = useState(false);

  useEffect(() => {
    const marcoNovo = MARCOS.find(
      (m) => percentual >= m && !marcosCelebrados.includes(m),
    );
    if (marcoNovo === undefined) return;

    celebrarMarco(metaId, marcoNovo);

    // setState sincrono dentro do corpo do effect dispara um render em
    // cascata e o lint do projeto rejeita isso -- por isso as duas
    // chamadas vao num timer, mesmo a de "ligar" sendo essencialmente
    // imediata (0ms).
    const ligar = setTimeout(() => setBrilhando(true), 0);
    const desligar = setTimeout(() => setBrilhando(false), DURACAO_DO_PULSO_MS);
    return () => {
      clearTimeout(ligar);
      clearTimeout(desligar);
    };
  }, [percentual, marcosCelebrados, metaId, celebrarMarco]);

  return (
    <AnelDeProgresso
      percentual={percentual}
      rotulo={rotulo}
      tom={tom}
      brilhando={brilhando}
    />
  );
}
