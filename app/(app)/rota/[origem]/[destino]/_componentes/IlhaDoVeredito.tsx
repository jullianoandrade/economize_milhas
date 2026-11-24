"use client";

import type { ReactNode } from "react";
import { usarPerfil, usePerfilHidratado } from "@/store/perfil";
import { useVereditoPersonalizado } from "@/lib/cliente/veredito";
import { HeroiDaRota } from "./HeroiDaRota";
import type { FaseDaJornada } from "@/lib/monetizacao/jornada";
import type { PassagemVista } from "./passagem";

/**
 * Troca o veredito de mercado pelo da pessoa, depois da hidratação.
 *
 * `children` é o mesmo HeroiDaRota já renderizado no servidor com o CPM
 * de mercado -- aparece primeiro, sem atraso, e continua sendo o que
 * quem não tem JavaScript ou não respondeu o perfil vê.
 *
 * IMPORTANTE: esta ilha chama HeroiDaRota diretamente, em vez de receber
 * "o que desenhar" como função via prop. Uma funcao nao atravessa a
 * fronteira servidor->cliente -- o protocolo RSC so serializa dado,
 * nunca closures. Uma versao anterior passava um `renderizar` assim
 * daqui, e o build compilava limpo mas a pagina quebrava na hidratacao
 * (erros React #419/#441, so visiveis em producao). ComoPagar tem a sua
 * propria ilha irma, IlhaDeComoPagar, pela mesma razao -- nao porque
 * precisasse de logica diferente, mas porque "qual componente chamar"
 * so pode ser uma escolha de QUAL ARQUIVO, nunca um prop.
 *
 * Nunca por cookie: isso tornaria a rota inteira dinâmica e mataria a
 * pré-renderização parcial.
 */
export function IlhaDoVeredito({
  origem,
  destino,
  dataEscolhida,
  fase,
  passagem,
  children,
}: {
  origem: string;
  destino: string;
  dataEscolhida: string | null;
  fase: FaseDaJornada;
  passagem: PassagemVista | null;
  children: ReactNode;
}) {
  const hidratado = usePerfilHidratado();
  const gasto = usarPerfil((p) => p.gastoMensalCartaoBRL);
  const cartaoId = usarPerfil((p) => p.cartaoId);

  const pessoal = useVereditoPersonalizado(
    hidratado,
    gasto,
    cartaoId,
    origem,
    destino,
  );

  // Com data escolhida, o servidor ja respondeu com o preco DAQUELE dia.
  // /api/veredito so conhece o mais barato da rota em qualquer dia, e
  // trocar por ele faria a placa falar de um voo e o botao de outro.
  // Melhor manter o CPM de mercado do que misturar as duas passagens.
  if (!pessoal || passagem?.daDataEscolhida) return <>{children}</>;

  return (
    <HeroiDaRota
      veredito={pessoal.veredito}
      fonte={pessoal.fonte}
      observacaoDaFonte={pessoal.observacaoDaFonte}
      origemIata={origem}
      destinoIata={destino}
      dataEscolhida={dataEscolhida}
      fase={fase}
      passagem={passagem}
    />
  );
}
