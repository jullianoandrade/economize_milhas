"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useSyncExternalStore } from "react";

/**
 * Data pretendida da viagem.
 *
 * Vai para a URL, e nao para o estado do componente, por tres razoes: o
 * link fica compartilhavel, o botao voltar funciona, e o calculo continua
 * no servidor -- que e onde estao as tabelas e o historico.
 *
 * E opcional de proposito. Boa parte das pessoas chega aqui sem data
 * definida, e a pagina precisa responder alguma coisa util mesmo assim.
 */
const nada = () => () => {};

/**
 * Hoje no fuso de Brasilia, como AAAA-MM-DD.
 *
 * toISOString() da a data em UTC: das 21h a meia-noite no Brasil ela ja
 * e "amanha", e o `min` do campo impedia escolher o proprio dia. O
 * locale en-CA formata exatamente como AAAA-MM-DD.
 */
function hojeEmBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function SeletorDeData({ valor }: { valor: string | null }) {
  const id = useId();
  const router = useRouter();
  const pathname = usePathname();
  const parametros = useSearchParams();

  function definir(data: string) {
    const novos = new URLSearchParams(parametros.toString());
    if (data) novos.set("data", data);
    else novos.delete("data");

    const consulta = novos.toString();
    // push, e nao replace: cada data escolhida vira uma entrada no
    // historico, e o botao voltar devolve a data anterior -- que e o
    // que o comentario do topo promete.
    router.push(consulta ? `${pathname}?${consulta}` : pathname, {
      scroll: false,
    });
  }

  // A data de hoje so existe no aparelho. Lida durante a renderizacao,
  // ela quebrava o pre-render ("unstable value new Date()"); assim o
  // servidor rende sem `min` e o navegador preenche ao hidratar.
  const hoje = useSyncExternalStore(
    nada,
    hojeEmBrasilia,
    () => undefined,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="text-sm text-tinta-media">
        Quando você quer viajar?
      </label>
      <input
        id={id}
        type="date"
        min={hoje}
        value={valor ?? ""}
        onChange={(e) => definir(e.target.value)}
        // color-scheme: dark pede ao navegador o icone de calendario claro
        // do seletor nativo. So faz sentido porque este campo vive
        // exclusivamente dentro do painel escuro do heroi da rota -- um
        // icone escuro sumiria contra o proprio fundo escuro do campo.
        style={{ colorScheme: "dark" }}
        className="rounded-xl border border-borda bg-superficie px-3 py-2 text-sm text-tinta outline-none focus:border-marca"
      />
      {valor ? (
        <button
          type="button"
          onClick={() => definir("")}
          className="text-xs text-tinta-fraca underline underline-offset-2 hover:text-marca"
        >
          limpar
        </button>
      ) : null}
    </div>
  );
}
