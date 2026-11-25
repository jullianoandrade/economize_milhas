"use client";

import Link from "next/link";
import { useCallback, useState, useSyncExternalStore, ViewTransition } from "react";
import { CampoDeLugar } from "@/components/ui/CampoDeLugar";
import { Globo, type Enquadramento } from "@/components/dominio/Globo";
import { LinkParaPassagem } from "@/components/dominio/LinkParaPassagem";
import { Milo } from "@/components/ui/Milo";
import { SeloDeOrigem } from "@/components/ui/SeloDeOrigem";
import { buscarVeredito, type VerediteDaPessoa } from "@/lib/cliente/veredito";
import { milhas as fmtMilhas, porcentagem, reais } from "@/lib/format";
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
 *
 * CHEGADA: o painel marinho do topo do Inicio cresce ate virar este, e o
 * mini globo cresce ate o globo daqui (view transition com o mesmo nome
 * dos dois lados; CSS no fim de app/globals.css). Para o globo crescer
 * no lugar certo, o nome fica numa ANCORA do tamanho do disco em espera
 * -- e nao no <canvas>, que ocupa o painel inteiro: com o canvas, o
 * disco pequeno viraria um retangulo esticado. As contas da ancora sao
 * as de `vistaAlvo` em Globo.tsx ("centro" no celular, "direita" a
 * partir de md), em unidades de container.
 */

type Estado =
  | { fase: "espera" }
  | { fase: "carregando"; destino: { iata: string; cidade: string } }
  | { fase: "pronto"; dados: VerediteDaPessoa }
  | { fase: "erro"; destino: { iata: string; cidade: string } };

/**
 * Mouse e teclado de verdade. So ai a busca ja chega com o cursor: no
 * celular o foco abriria o teclado por cima do globo, justo o que a
 * transicao acabou de mostrar -- la a pessoa toca no campo quando quiser.
 */
function usePonteiroFino(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const m = matchMedia("(hover: hover) and (pointer: fine)");
      m.addEventListener("change", avisar);
      return () => m.removeEventListener("change", avisar);
    },
    () => matchMedia("(hover: hover) and (pointer: fine)").matches,
    () => false,
  );
}

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
  const ponteiroFino = usePonteiroFino();
  const [estado, setEstado] = useState<Estado>({ fase: "espera" });
  // A chave do campo: trocar a chave limpa o texto digitado ao fechar.
  const [chaveDoCampo, setChaveDoCampo] = useState(0);
  // Aviso quando a pessoa escolhe como destino a propria origem. Antes
  // a escolha era ignorada em silencio e parecia que o app travou.
  const [aviso, setAviso] = useState<string | null>(null);

  const origem = hidratado ? origemIata : "GRU";
  const lugarDeOrigem = useLugar(origem);
  const nomeDaOrigem = lugarDeOrigem?.cidade ?? origem;

  const escolher = useCallback(
    (destino: { iata: string; cidade: string }) => {
      if (destino.iata === origem) {
        setAviso(
          `Você já está saindo de ${destino.cidade}. Escolha outro destino.`,
        );
        setChaveDoCampo((c) => c + 1);
        return;
      }
      setAviso(null);
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
    <ViewTransition name="painel-explorar" share="painel-explorar" default="none">
      <section
        aria-label="Explorar destinos"
        className="painel relative -mx-4 -mt-5 h-[calc(100dvh-1rem)] min-h-[640px] rounded-b-[34px] md:mx-0 md:mt-0 md:h-[calc(100dvh-9rem)] md:min-h-[600px] md:rounded-[32px]"
      >
        {/* Titulo para leitor de tela: a tela e visual (o globo), mas
            precisa dizer onde a pessoa esta. Achado pelo teste de saude. */}
        <h1 className="sr-only">Explorar destinos</h1>

        {/* O recorte arredondado fica nesta camada, e nao na <section>:
            com overflow-hidden na secao, a lista de sugestoes do campo de
            busca seria cortada. Ver tests/arquitetura.test.ts. */}
        {/* No celular o bloco marinho termina com os cantos de baixo
            arredondados, como o heroi do Inicio: sem isso ele acabava
            num corte reto contra o rodape claro. */}
        {/* container-type: a ancora do globo se mede em cqw/cqh, as mesmas
            proporcoes que o Globo usa para enquadrar o disco. */}
        <div className="absolute inset-0 overflow-hidden rounded-b-[34px] [container-type:size] md:rounded-[32px]">
          <ViewTransition name="globo-explorar" share="globo-explorar" default="none">
            <div
              className="absolute [--cx:50cqw] [--cy:46cqh] [--r:min(44cqw,30cqh)] md:[--cx:62cqw] md:[--cy:52cqh] md:[--r:min(30cqw,40cqh)]"
              style={{
                // a caixa do globo "inteiro" do Inicio: disco = 84% dela
                width: "calc(var(--r) / 0.42)",
                height: "calc(var(--r) / 0.42)",
                left: "calc(var(--cx) - var(--r) / 0.84)",
                top: "calc(var(--cy) - var(--r) / 0.84)",
              }}
            >
              <div
                className="absolute h-[100cqh] w-[100cqw]"
                style={{
                  left: "calc(var(--r) / 0.84 - var(--cx))",
                  top: "calc(var(--r) / 0.84 - var(--cy))",
                }}
              >
                <Globo rota={rotaDoGlobo} enquadramento={enquadramento} arrastavel continuar />
              </div>
            </div>
          </ViewTransition>
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
                setAviso(null);
                setEstado({ fase: "espera" });
              }}
            />
          ) : (
            <CampoDeLugar
              key={chaveDoCampo}
              rotulo="Para onde você vai?"
              tom="claro"
              autoFocus={ponteiroFino}
              aoSelecionar={(lugar) => escolher({ iata: lugar.iata, cidade: lugar.cidade })}
            />
          )}
          {aviso && !trocandoOrigem ? (
            <p role="status" className="mt-2.5 text-sm leading-snug text-painel-tinta">
              {aviso}
            </p>
          ) : null}
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
            <Milo pose="explorando" className="pointer-events-none absolute -top-[88px] right-3 w-[100px]" />
            <p className="max-w-[16rem] text-[17px] leading-snug text-painel-tinta">
              Escolha um destino e eu comparo milhas com dinheiro.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {/* Todos iguais: nenhum esta escolhido ainda, e o primeiro
                  preenchido parecia pre-selecionado. O atalho igual a
                  origem some -- "Recife saindo de Recife" nao e viagem. */}
              {atalhos
                .filter((a) => a.iata !== origem)
                .map((a) => (
                  <button
                    key={a.iata}
                    type="button"
                    onClick={() => escolher(a)}
                    className="min-h-11 rounded-full border border-painel-tinta/30 px-4 text-[15px] font-semibold text-painel-tinta transition-colors hover:bg-painel-realce"
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
    </ViewTransition>
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
      className="vidro absolute inset-x-0 bottom-0 z-10 max-h-[64%] overflow-y-auto rounded-t-[30px] rounded-b-[34px] px-5 pb-28 pt-5 md:bottom-auto md:left-auto md:right-6 md:top-6 md:max-h-[calc(100%-3rem)] md:w-[400px] md:rounded-[28px] md:pb-6"
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
  // O mesmo veredito unico da placa da tela de rota (CardVeredito):
  // "resgatar", "guardar" ou "pagar", dito uma vez.
  const rotulo = veredito.foraDoModelo ? null : veredito.rotulo;
  const resgatar = rotulo === "resgatar" && melhor;
  const detalhes = `/rota/${rota.origem.iata}/${rota.destino.iata}`;

  return (
    <>
      {/* A placa: opaca, nunca vidro. Numero que decide nao fica sobre
          superficie translucida. */}
      <div className="mt-4 rounded-[22px] bg-painel-tinta px-5 pb-5 pt-4 text-painel">
        {rotulo === null ? (
          <>
            <p className="text-[17px] font-semibold">Ainda não comparamos milhas neste trecho</p>
            <p className="mt-2 text-[15px] leading-relaxed">
              Ele não passa pelo Brasil, e os programas que a VoeMilo acompanha
              não têm tabela para ele.
            </p>
          </>
        ) : resgatar ? (
          <>
            <p className="text-[17px] font-semibold">Com milhas você economiza</p>
            <p className="tabular mt-0.5 text-[64px] font-bold leading-none tracking-[-0.045em] [font-variation-settings:'opsz'_96]">
              {reais(veredito.economiaBRL)}
            </p>
            <p className="mt-1.5 text-[15px] leading-snug">
              em relação a pagar em dinheiro ({porcentagem(veredito.economiaPct)} da
              passagem).
            </p>
          </>
        ) : (
          <>
            <p className="text-[17px] font-semibold">
              {rotulo === "guardar" ? "Pague em dinheiro e guarde as milhas" : "Pague em dinheiro"}
            </p>
            <p className="tabular mt-0.5 text-[56px] font-bold leading-none tracking-[-0.045em] [font-variation-settings:'opsz'_96]">
              {reais(veredito.precoDinheiroBRL)}
            </p>
            <p className="mt-1.5 text-[15px] leading-snug">
              {rotulo === "guardar" && melhor
                ? `Com milhas você economizaria só ${reais(veredito.economiaBRL)}. Elas rendem bem mais numa viagem cara.`
                : melhor
                  ? "Usar milhas aqui não compensa."
                  : "Nenhum programa da nossa base atende este trecho."}
            </p>
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
              <SeloDeOrigem origem="real" detalhe={observacaoDaFonte}>busca real recente</SeloDeOrigem>
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

      <div className="mt-5 flex flex-col gap-2.5">
        <Link
          href={detalhes}
          className="flex min-h-12 items-center justify-center rounded-2xl bg-marca px-5 text-[15px] font-semibold text-marca-contraste"
        >
          Ver mês, dia e todos os programas
        </Link>
        {resgatar && melhor ? (
          // Saida para o resgate: vira viagem "em vista" em Minhas viagens.
          <LinkParaPassagem
            href={melhor.programa.site}
            tipo="utilidade"
            variante="secundario"
            saida={{
              origemIata: rota.origem.iata,
              destinoIata: rota.destino.iata,
              ida: null,
              precoVistoBRL: veredito.precoDinheiroBRL,
              forma: "milhas",
              programaId: melhor.programa.id,
            }}
          >
            Resgatar no {melhor.programa.nome}
          </LinkParaPassagem>
        ) : null}
      </div>
    </>
  );
}
