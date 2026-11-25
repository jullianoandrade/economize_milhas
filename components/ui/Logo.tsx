import { MARCA } from "@/lib/marca";
import partes from "./logo-partes.json";

/**
 * A logo da VoeMilo, em curvas (nao depende de fonte instalada).
 *
 * Desenhada a partir da arte aprovada em 25/11/2026: "voemilo" em
 * Bricolage Grotesque 800 e o traco ambar de um voo que nasce fino sob o
 * "v", passa NA FRENTE do "e", POR TRAS do "m" e termina num canhoto de
 * bilhete, com picote e entalhe. As curvas vem de scripts/marca/ (ver o
 * cabecalho de scripts/marca/gerar-marca.mjs para regenerar).
 *
 * No "e" o traco passa na frente, com uma folga na COR DO FUNDO -- por
 * isso `fundo` precisa ser a cor real atras da logo. No "m" ele passa por
 * tras, sem folga: o m e desenhado inteiro por cima. As
 * letras usam currentColor: a logo herda a tinta do lugar onde esta.
 */
export function Logo({
  className = "",
  fundo = "var(--superficie)",
  ambar = "#ffb020",
}: {
  className?: string;
  fundo?: string;
  ambar?: string;
}) {
  const folga = partes.corte * 2;
  const voo = (props: React.SVGProps<SVGPathElement>) => (
    <>
      <path d={partes.traco} {...props} />
      <path d={partes.canhoto} transform={partes.canhotoTransform} {...props} />
    </>
  );

  return (
    <svg
      viewBox={partes.viewBox}
      className={className}
      role="img"
      aria-label={MARCA.nome}
      focusable="false"
    >
      {/* 1. letras, menos o m */}
      <path d={partes.letras} fill="currentColor" />
      {/* 2. o traco, com folga: passa na FRENTE do "e" */}
      {voo({ fill: fundo, stroke: fundo, strokeWidth: folga, strokeLinejoin: "round" })}
      {voo({ fill: ambar })}
      <path
        d={partes.picote}
        transform={partes.canhotoTransform}
        stroke={fundo}
        strokeWidth={12}
        strokeDasharray="22 18"
        fill="none"
      />
      {/* 3. o m inteiro por cima, sem folga: o traco passa POR TRAS dele */}
      <path d={partes.m} fill="currentColor" />
    </svg>
  );
}
