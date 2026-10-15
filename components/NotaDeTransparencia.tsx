/**
 * A garantia antes da comissao, nunca o contrario.
 *
 * So aparece junto de um link patrocinado (ver AcoesDaRota). Em
 * text-tinta-media, nao text-tinta-fraca: isto nao e letra miuda que a
 * pessoa deve poder ignorar, e o argumento de confianca mais forte que o
 * produto tem -- e o ranking cego a comissao (tests/arquitetura.test.ts)
 * e o que torna a frase verificavel, nao so uma promessa.
 */
export function NotaDeTransparencia() {
  return (
    <p className="text-sm leading-relaxed text-tinta-media">
      <strong className="font-semibold text-tinta">
        Nosso ranking nunca considera quanto ganhamos.
      </strong>{" "}
      Comprando pelo Aviasales, recebemos parte da comissão — o preço para
      você é o mesmo.
    </p>
  );
}
