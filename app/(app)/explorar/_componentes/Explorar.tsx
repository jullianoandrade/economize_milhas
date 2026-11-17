"use client";

import Link from "next/link";
import { useCallback, useState, useSyncExternalStore } from "react";
import { CampoDeLugar } from "@/components/ui/CampoDeLugar";
import { Globo, type Enquadramento } from "@/components/dominio/Globo";
import { LinkExterno } from "@/components/dominio/LinkExterno";
import { Milo } from "@/components/ui/Milo";
import { SeloDeOrigem } from "@/components/ui/SeloDeOrigem";
import { buscarVeredito, type VerediteDaPessoa } from "@/lib/cliente/veredito";
import { milhas as fmtMilhas, reais } from "@/lib/format";
import { usarPerfil, usePerfilHidratado } from "@/store/perfil";
import { useLugar } from "@/lib/cliente/lugar";

/**
 * Explorar: o globo e a pergunta "para onde?".
 *
 * A resposta aqui e o RESUMO -- o que fazer e quanto se economiza. O
 * detalhe (mes, dia, antecedencia, todos os programas) continua na tela
 * de rota, a um toque. E a regra do produto: a informacao certa, no
 * momento certo, e nao tudo de uma vez.
 *
 * O Milo aparece so na espera, apontando para os destinos. Quando a
 * resposta chega, ele sai: ali quem fala e o numero.
 */

type Estado =
  | { fase: "espera" }
  | { fase: "carregando"; destino: { iata: string; cidade: string } }
  | { fase: "pronto"; dados: VerediteDaPessoa }
  | { fase: "erro"; destino: { iata: string; cidade: string } };

function useTelaLarga(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const m = matchMedia("(min-width: 768px)");
      m.addEventListener("change", avisar);
      return () => m.removeEventListener("change", avisar);
    },
    () => matchMedia("(min-width: 768px)").matches,
    () => false,
  );
}

export function Explorar({
  atalhos,
}: {
  atalhos: { iata: string; cidade: string }[];
}) {
  const hidratado = usePerfilHidratado();
  const origemIata = usarPerfil((s) => s.origemIata);
  const gasto = usarPerfil((s) => s.gastoMensalCartaoBRL);
  const cartaoId = usarPerfil((s) => s.cartaoId);
  const definirOrigem = usarPerfil((s) => s.definirOrigem);
  const [trocandoOrigem, setTrocandoOrigem] = useState(false);
  const larga = useTelaLarga();
  const [estado, setEstado] = useState<Estado>({ fase: "espera" });
  // A chave do campo: trocar a chave limpa o texto digitado ao fechar.
  const [chaveDoCampo, setChaveDoCampo] = useState(0);

  const origem = hidratado ? origemIata : "GRU";
  const lugarDeOrigem = useLugar(origem);
  const nomeDaOrigem = lugarDeOrigem?.cidade ?? origem;

  const escolher = useCallback(
    (destino: { iata: string; cidade: string }) => {
      if (destino.iata === origem) return;
      setEstado({ fase: "carregando", destino });
      buscarVeredito(origem, destino.iata, gasto ?? 0, cartaoId)
        .then((dados) => setEstado({ fase: "pronto", dados }))
        .catch(() => setEstado({ fase: "erro", destino }));
    },
    [origem, gasto, cartaoId],
  );

  const fechar = () => {
    setEstado({ fase: "espera" });
    setChaveDoCampo((c) => c + 1);
  };

  const dados = estado.fase === "pronto" ? estado.dados : null;
  const rotaDoGlobo = dados
    ? {
        origem: [dados.rota.origem.lat, dados.rota.origem.lon] as const,
        destino: [dados.rota.destino.lat, dados.rota.destino.lon] as const,
        rotulos: [dados.rota.origem.iata, dados.rota.destino.iata] as [string, string],
      }
    : null;
  const enquadramento: Enquadramento = rotaDoGlobo
    ? larga
      ? "esquerda"
      : "acima"
    : larga
      ? "direita"
      : "centro";

  return (
    <section
      aria-label="Explorar destinos"
      className="painel relative -mx-4 -mt-5 h-[calc(100dvh-1rem)] min-h-[640px] md:mx-0 md:mt-0 md:h-[calc(100dvh-9rem)] md:min-h-[600px] md:rounded-[32px]"
    >
      {/* O recorte arredondado fica nesta camada, e nao na <section>:
          com overflow-hidden na secao, a lista de sugestoes do campo de
          busca seria cortada. Ver tests/arquitetura.test.ts. */}
      <div className="absolute inset-0 overflow-hidden md:rounded-[32px]">
        <Globo rota={rotaDoGlobo} enquadramento={enquadramento} />
      </div>

      <div className="vidro absolute inset-x-3 top-3 z-20 rounded-[26px] p-4 md:left-6 md:right-auto md:top-6 md:w-[380px]">
        {trocandoOrigem ? (
          <CampoDeLugar
            key="origem"
            rotulo="De onde você sai?"
            tom="claro"
            autoFocus
            aoSelecionar={(lugar) => {
              definirOrigem(lugar.iata);
              setTrocandoOrigem(false);
              setEstado({ fase: "espera" });
            }}
          />
        ) : (
          <CampoDeLugar
            key={chaveDoCampo}
            rotulo="Para onde você vai?"
            tom="claro"
            aoSelecionar={(lugar) => escolher({ iata: lugar.iata, cidade: lugar.cidade })}
          />
        )}
        {/* A origem fica guardada no aparelho porque quase nunca muda:
            quem mora em Recife nao quer redigitar Recife toda vez. */}
        <button
          type="button"
          onClick={() => setTrocandoOrigem((t) => !t)}
          className="mt-2.5 min-h-9 text-sm text-painel-tinta-fraca"
        >
          {trocandoOrigem ? (
            "Cancelar"
          ) : (
            <>
              Saindo de <strong className="font-semibold text-painel-tinta">{nomeDaOrigem}</strong>{" "}
              <span className="underline underline-offset-2">trocar</span>
            </>
          )}
        </button>
      </div>

      {estado.fase === "espera" ? (
        <div className="vidro absolute inset-x-3 bottom-24 z-10 rounded-[28px] p-5 md:bottom-6 md:left-6 md:right-auto md:w-[380px]">
          <Milo className="pointer-events-none absolute -top-[88px] right-3 w-[100px]" />
          <p className="max-w-[16rem] text-[17px] leading-snug text-painel-tinta">
            Escolha um destino e eu comparo milhas com dinheiro.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {atalhos.map((a, i) => (
              <button
                key={a.iata}
                type="button"
                onClick={() => escolher(a)}
                className={`min-h-11 rounded-full px-4 text-[15px] font-semibold transition-colors ${
                  i === 0
                    ? "bg-painel-tinta text-painel"
                    : "border border-painel-tinta/30 text-painel-tinta hover:bg-painel-realce"
                }`}
              >
                {a.cidade}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <PainelDeResposta estado={estado} origem={origem} aoFechar={fechar} aoTentar={escolher} />
      )}
    </section>
  );
}

function PainelDeResposta({
  estado,
  origem,
  aoFechar,
  aoTentar,
}: {
  estado: Exclude<Estado, { fase: "espera" }>;
  origem: string;
  aoFechar: () => void;
  aoTentar: (destino: { iata: string; cidade: string }) => void;
}) {
  const titulo =
    estado.fase === "pronto"
      ? `${estado.dados.rota.origem.cidade} para ${estado.dados.rota.destino.cidade}, só ida`
      : `${origem} para ${estado.destino.cidade}`;

  return (
    <div
      role="region"
      aria-label="Resposta"
      aria-live="polite"
      className="vidro absolute inset-x-0 bottom-0 z-10 max-h-[64%] overflow-y-auto rounded-t-[30px] px-5 pb-28 pt-5 md:inset-y-6 md:left-auto md:right-6 md:max-h-none md:w-[400px] md:rounded-[28px] md:pb-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-painel-tinta">{titulo}</h2>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar resposta"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-painel-realce text-painel-tinta"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      {estado.fase === "carregando" ? (
        <p className="mt-6 text-[15px] text-painel-tinta-fraca">
          Comparando milhas e dinheiro para {estado.destino.cidade}…
        </p>
      ) : estado.fase === "erro" ? (
        <div className="mt-5">
          <p className="text-[15px] leading-relaxed text-painel-tinta">
            Não consegui buscar o preço desta rota agora. Costuma ser falha de
            rede e passa sozinha.
          </p>
          <button
            type="button"
            onClick={() => aoTentar(estado.destino)}
            className="mt-4 min-h-12 rounded-2xl bg-marca px-5 text-[15px] font-semibold text-marca-contraste"
          >
            Tentar de novo
          </button>
        </div>
      ) : (
        <Resposta dados={estado.dados} />
      )}
    </div>
  );
}

function Resposta({ dados }: { dados: VerediteDaPessoa }) {
  const { veredito, fonte, observacaoDaFonte, rota } = dados;
  const melhor = veredito.melhor;
  const usaMilhas = !veredito.foraDoModelo && veredito.recomendacao === "milhas" && melhor;
  const detalhes = `/rota/${rota.origem.iata}/${rota.destino.iata}`;

  return (
    <>
      {/* A placa: opaca, nunca vidro. Numero que decide nao fica sobre
          superficie translucida. */}
      <div className="mt-4 rounded-[22px] bg-painel-tinta px-5 pb-5 pt-4 text-painel">
        {veredito.foraDoModelo ? (
          <>
            <p className="text-[17px] font-semibold">Pague em dinheiro</p>
            <p className="mt-2 text-[15px] leading-relaxed">
              Este trecho não passa pelo Brasil, e ainda não calculamos milhas
              para ele.
            </p>
          </>
        ) : usaMilhas ? (
          <>
            <p className="text-[17px] font-semibold">Vá de milhas e pague</p>
            <p className="tabular mt-0.5 text-[64px] font-bold leading-none tracking-[-0.045em] [font-variation-settings:'opsz'_96]">
              {reais(veredito.economiaBRL)}
            </p>
            <p className="mt-1.5 text-[15px]">a menos do que comprando em dinheiro.</p>
          </>
        ) : (
          <>
            <p className="text-[17px] font-semibold">Pague em dinheiro</p>
            <p className="tabular mt-0.5 text-[56px] font-bold leading-none tracking-[-0.045em] [font-variation-settings:'opsz'_96]">
              {reais(veredito.precoDinheiroBRL)}
            </p>
            <p className="mt-1.5 text-[15px]">Usar milhas aqui não compensa.</p>
          </>
        )}
      </div>

      <ul className="mt-2">
        <li className="border-b border-painel-tinta/15 py-3.5">
          <div className="flex items-baseline justify-between gap-3 text-painel-tinta">
            <span className="text-[15px]">Em dinheiro</span>
            <strong className="tabular text-[17px] font-semibold">
              {reais(veredito.precoDinheiroBRL)}
            </strong>
          </div>
          <div className="mt-2">
            {fonte === "travelpayouts" ? (
              <SeloDeOrigem origem="real" detalhe={observacaoDaFonte}>busca real de hoje</SeloDeOrigem>
            ) : (
              <SeloDeOrigem origem="estimado" detalhe={observacaoDaFonte}>preço estimado</SeloDeOrigem>
            )}
          </div>
        </li>
        {melhor ? (
          <li className="border-b border-painel-tinta/15 py-3.5">
            <div className="flex items-baseline justify-between gap-3 text-painel-tinta">
              <span className="text-[15px]">Com milhas {melhor.programa.nome}</span>
              <strong className="tabular text-[17px] font-semibold">
                {fmtMilhas(melhor.milhas)} + {reais(melhor.taxasBRL)}
              </strong>
            </div>
            <div className="mt-2">
              <SeloDeOrigem origem="estimado" detalhe="Os programas não publicam tabela fixa. Confirme no site antes de resgatar.">
                estimativa, confirme antes
              </SeloDeOrigem>
            </div>
          </li>
        ) : null}
      </ul>

      {veredito.ressalva ? (
        <p className="mt-3 text-sm leading-relaxed text-painel-tinta-fraca">{veredito.ressalva}</p>
      ) : null}

      <div className="mt-5 flex flex-col gap-2.5">
        <Link
          href={detalhes}
          className="flex min-h-12 items-center justify-center rounded-2xl bg-marca px-5 text-[15px] font-semibold text-marca-contraste"
        >
          Ver mês, dia e todos os programas
        </Link>
        {usaMilhas && melhor ? (
          <LinkExterno href={melhor.programa.site} tipo="utilidade" variante="secundario">
            Resgatar no {melhor.programa.nome}
          </LinkExterno>
        ) : null}
      </div>
    </>
  );
}
