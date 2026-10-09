import Link from "next/link";
import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { Ilustracao } from "@/components/Ilustracao";
import { SeletorDePaleta } from "@/components/SeletorDePaleta";

export const metadata: Metadata = {
  title: "Escolhendo as cores",
  // Pagina de trabalho, nao de produto: nao entra em buscador.
  robots: { index: false, follow: false },
};

/**
 * Bancada para escolher a paleta.
 *
 * Fica fora da navegacao de proposito -- e uma ferramenta temporaria,
 * nao uma tela do app. Some quando a cor estiver decidida.
 *
 * A amostra abaixo do seletor usa os mesmos tokens dos componentes de
 * verdade, entao o que aparece aqui e o que vai aparecer la. Mesmo
 * assim, o teste que decide e navegar o app inteiro depois de escolher.
 */

const TELAS = [
  { href: "/", rotulo: "Home" },
  { href: "/boas-vindas", rotulo: "Boas-vindas" },
  { href: "/rota/GRU/LIS", rotulo: "Uma rota" },
  { href: "/objetivos", rotulo: "Objetivos" },
  { href: "/promocoes", rotulo: "Promoções" },
];

export default function Visual() {
  return (
    <>
      <Cabecalho
        sobrelinha="Bancada"
        titulo="Escolhendo as cores"
        subtitulo="Toque numa paleta para aplicá-la no app inteiro. A escolha fica guardada neste aparelho — navegue as telas de verdade antes de decidir."
      />

      <div className="mb-6">
        <SeletorDePaleta />
      </div>

      <section className="mb-6">
        <h2 className="display mb-3 text-xl text-tinta">
          Como fica na prática
        </h2>

        <div className="space-y-3">
          <div className="overflow-hidden rounded-[28px] bg-marca-forte p-5 text-white">
            <Ilustracao cena="viagem" tom="claro" className="mb-3 w-full" />
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">
              Painel de destaque
            </p>
            <p className="display text-2xl">Para onde você quer ir?</p>
          </div>

          <div className="rounded-[24px] border border-borda bg-superficie p-4 shadow-card">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-milhas-fundo px-3 py-1 text-xs font-bold text-milhas">
                Use milhas
              </span>
              <span className="rounded-full bg-dinheiro-fundo px-3 py-1 text-xs font-bold text-dinheiro">
                Use dinheiro
              </span>
              <span className="rounded-full bg-alerta-fundo px-3 py-1 text-xs font-bold text-alerta">
                Atenção
              </span>
            </div>
            <p className="display text-2xl text-tinta">
              Você economiza R$ 613
            </p>
            <p className="tabular mt-1 text-sm text-tinta-media">
              37% do valor da passagem, que sai por R$ 1.635
            </p>
            <p className="mt-1 text-xs text-tinta-fraca">
              Texto secundário, do tamanho que aparece nas legendas.
            </p>

            {/* As tres cores de grafico lado a lado: e aqui que se vê se
                a marca esta competindo com o veredito. */}
            <div
              aria-hidden="true"
              className="mt-4 flex h-16 items-end gap-1.5"
            >
              {[40, 62, 48, 100, 55, 72, 38].map((h, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-t-md"
                  style={{
                    height: `${h}%`,
                    background:
                      i === 3
                        ? "var(--color-grafico-dinheiro)"
                        : i === 5
                          ? "var(--color-grafico-milhas)"
                          : "var(--color-grafico-neutro)",
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-marca px-5 text-sm font-semibold text-marca-contraste"
            >
              Botão principal
            </button>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="display mb-2 text-xl text-tinta">Veja nas telas</h2>
        <p className="mb-3 text-sm leading-relaxed text-tinta-media">
          A amostra acima engana um pouco — toda paleta fica bem num
          quadradinho. O que decide é a tela cheia.
        </p>
        <ul className="flex flex-wrap gap-2">
          {TELAS.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className="inline-block rounded-full border border-borda bg-superficie px-4 py-2 text-sm font-medium text-tinta-media transition-colors hover:border-marca hover:text-marca"
              >
                {t.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs leading-relaxed text-tinta-fraca">
        O modo escuro está desligado enquanto a paleta clara não estiver
        decidida: no escuro você veria cores que ninguém escolheu. Ele volta
        depois, derivado da paleta vencedora.
      </p>
    </>
  );
}
