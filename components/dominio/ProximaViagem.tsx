"use client";

import Link from "next/link";
import { useLugar } from "@/lib/cliente/lugar";
import { dataCurta, proximaViagem, quandoE } from "@/lib/viagens/preparar";
import { hojeEmSaoPaulo } from "@/lib/viagens/modelo";
import { usarViagens, useViagensHidratadas } from "@/store/viagens";

/**
 * "Sua proxima viagem: Lisboa em 12 dias. Preparar."
 *
 * Cartao compacto para qualquer tela que queira lembrar a pessoa da
 * viagem que ela ja reservou -- o Inicio e a conta. Nao aparece nada
 * enquanto nao houver viagem reservada pela frente: sem viagem, nao ha o
 * que lembrar, e a tela que o hospeda segue igual.
 *
 * Material do cartao e o mesmo da Carteira (cartao-marinho): um objeto
 * fisico, com cor fixa nos dois temas, como um cartao de embarque.
 */
export function ProximaViagem({ className = "" }: { className?: string }) {
  const hidratadas = useViagensHidratadas();
  const viagens = usarViagens((s) => s.viagens);
  // Lido depois da hidratacao: no pre-render nao existe "hoje".
  const proxima = hidratadas ? proximaViagem(viagens, new Date()) : null;
  const destino = useLugar(proxima?.viagem.destinoIata ?? null);

  if (!proxima) return null;
  const { viagem, emDias } = proxima;
  const cidade = destino?.cidade ?? viagem.destinoIata;
  const quando =
    emDias === null
      ? "data a confirmar"
      : `${quandoE(emDias)}, ${dataCurta(viagem.ida!, hojeEmSaoPaulo(new Date()))}`;

  return (
    <Link
      href={`/conta/viagens#viagem-${viagem.id}`}
      aria-label={`Sua próxima viagem: ${cidade}, ${quando}. Preparar a viagem`}
      className={`cartao-programa cartao-marinho relative flex items-center gap-4 px-5 py-4 ${className}`}
    >
      <span className="relative min-w-0 flex-1">
        <span className="block text-[13px] text-[#a9b8d6]">Sua próxima viagem</span>
        <span className="display mt-0.5 block truncate text-[24px] leading-tight">{cidade}</span>
        <span className="tabular mt-0.5 block text-sm text-[#dfe6f5]">{quando}</span>
      </span>
      <span className="relative inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-[#ffb020] px-4 text-sm font-semibold text-[#0b1526]">
        Preparar
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}
