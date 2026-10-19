# Milhas

Responde uma pergunta: **esta passagem vale mais em milhas ou em dinheiro?**

A resposta depende de quem pergunta. Quem tem cartão sem anuidade acumula
milhas a custo quase zero; quem compra pontos paga caro por elas. O mesmo
voo, pelo mesmo preço, muda de recomendação conforme o custo por milheiro
de cada pessoa — e é isso que o app calcula.

Produção: [economizemilhas.vercel.app](https://economizemilhas.vercel.app)

## Rodando

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 328 testes
npm run lint
npm run build
```

O app sobe e funciona com `.env.local` inteiro em branco: nesse caso usa a
base curada em `data/`. Nenhuma credencial é bloqueante. Copie
`.env.example` para `.env.local` quando quiser preços reais da
Travelpayouts ou histórico no Supabase.

## Estrutura

```
app/
  (app)/          telas do produto, com barra de navegação
    (inicio)/     a home            — route group, URL continua "/"
    rota/         a tela principal  — veredito, quando ir, como pagar
    objetivos/    metas de viagem e acompanhamento
    aprender/     glossário e calculadora de CPM
    promocoes/
  (entrada)/      boas-vindas e transparência, sem navegação
  api/            cálculo pesado fica no servidor: a base de aeroportos
                  tem 268 entradas e não precisa ir ao navegador
components/
  casca/          navegação, rodapé, cabeçalho
  dominio/        Termo, ReguaDoResgate, LinkExterno, PerguntaDoCartao…
  ui/             CampoDeLugar, Ilustracao
lib/              o motor: milhas, tempo, metas, monetização, glossário
data/             base curada e versionada (programas, cartões, clubes…)
tests/            328 testes, incluindo travas de arquitetura
```

Componente usado por **uma** tela mora com a tela, em `_componentes/`
(pasta privada: o Next não a transforma em rota). Usado por **duas ou
mais**, vai para `components/`. Os route groups `(app)` e `(entrada)` não
aparecem na URL — existem para dar uma casca a cada um.

## O motor não sabe o que é tela

Tudo em `lib/` é função pura, sem rede e sem relógio implícito: a data de
hoje entra por parâmetro. É o que torna os testes possíveis e o que impede
a resposta de mudar conforme o fuso do aparelho.

`lib/milhas/rotulos.ts` e `lib/glossario/termos.ts` não importam nada do
barril `lib/dados` de propósito — eles rodam no navegador, e aquele barril
arrasta a base inteira de aeroportos junto.

## Travas que quebram o build

Não são convenções: são testes que falham.

- **O ranking é cego a comissão.** `lib/milhas` e `lib/tempo` não podem
  importar `lib/monetizacao` nem `data/parceiros-comercial.json`. Esse
  arquivo tem **um** leitor autorizado no projeto inteiro. É o que torna a
  promessa de `/como-nos-sustentamos` verificável por máquina, e não algo
  em que o usuário precisa acreditar.
- **Só `LinkExterno` emite âncora externa** — `target="_blank"` ou `rel`
  com `sponsored` em qualquer outro arquivo quebra o build.
- **O formato frágil da Aviasales** vive num arquivo só; uma falha nele
  degrada para a busca parcial, nunca some com o botão.
- **Todo `<Termo id>` existe no glossário**, e todo termo do glossário tem
  pelo menos um gatilho em tela.
- **Nenhuma capacidade do motor sai de vista sem decisão**
  (`tests/superficie.test.ts`): cada campo público aparece numa tela ou
  está numa lista de lacunas com o motivo escrito.
- **A paleta é medida, não declarada**: contraste WCAG AA lido do próprio
  `globals.css`.

## Web e celular, mesma base

Desktop ganha barra superior e layouts de duas colunas a partir de `lg`;
celular mantém a pílula flutuante de navegação e segue instalável como
PWA. Quem decide é o CSS — não há JavaScript medindo tela, nem duas
versões para manter.
