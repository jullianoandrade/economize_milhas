# Fronteira do motor — até onde a resposta é verdadeira

> Escrito em 10 de novembro de 2026, a partir de medição direta do motor em
> produção (credenciais reais, 74.778 observações de preço acumuladas).
>
> Este documento existe para responder uma pergunta de escopo que o código
> hoje responde por acidente: **para quais voos esta plataforma tem o
> direito de dar um veredito?**

## A resposta curta

**A fronteira é geográfica: o voo precisa tocar o Brasil.**

Origem brasileira, destino brasileiro, ou os dois. Fora disso a plataforma
pode mostrar preço, sazonalidade e janela de compra — mas **não pode dizer
quantas milhas custa, nem se vale resgatar.**

Não é cautela. É que a resposta seria falsa, e dá para demonstrar.

---

## O que acontece hoje fora da fronteira

A base tem 130 aeroportos internacionais, o que significa que **16.770 pares
estrangeiro→estrangeiro já respondem em produção**. Rodei o motor contra
eles com cotação real da Travelpayouts:

| Rota | Preço real | O que a plataforma diz | Correto? |
|---|---|---|---|
| LIS→MAD (1h15) | R$ 122 | **42.000 milhas** Smiles | número absurdo em tela |
| CDG→FCO | R$ 355 | **42.000 milhas** Smiles | número absurdo em tela |
| LHR→NRT (Londres–Tóquio) | R$ 2.561 | 42.000 Smiles · **"vale resgatar"** | **falso** |
| JFK→LAX (doméstico EUA) | R$ 801 | 24.000 TudoAzul · **"vale resgatar"** | **falso** |
| JFK→LHR (transatlântico) | R$ 1.347 | 24.000 TudoAzul, faixa *América do Norte* | **falso** |
| EZE→SCL | R$ 575 | 12.000 TudoAzul · **"vale resgatar"** | **falso** |
| *GRU→LIS (referência)* | *R$ 1.933* | *42.000 Smiles · CPM R$ 37,69* | *correto* |

O caso que resume tudo: a plataforma classifica **Londres→Tóquio com CPM de
R$ 52,64 — melhor que GRU→LIS, de R$ 37,69.** O ranking está invertido. Um
voo que nenhum programa brasileiro precifica aparece como o melhor resgate
do catálogo.

### A causa, em uma linha

`lib/milhas/regioes.ts` decide a faixa assim:

```ts
const estrangeiro = origem.regiao === "brasil" ? destino : origem;
```

"Pegue o lado que não é o Brasil" é elegante e correto **enquanto um dos
lados é o Brasil** — inclusive garante a simetria desejada, com LIS→GRU
custando o mesmo que GRU→LIS. Quando nenhum lado é brasileiro, a regra cai
silenciosamente na **origem**. Por isso JFK→LHR vira "América do Norte":
pegou Nova York. E LHR→NRT vira "Europa": pegou Londres e ignorou Tóquio.

Não há conserto de parâmetro. A pergunta não se aplica.

---

## A fronteira é geográfica, não de nacionalidade de programa

Vale desfazer uma confusão natural, porque ela muda o caminho de expansão.

`data/programas.json` já tem **cinco** programas, e dois deles não são
brasileiros: **TAP Miles&Go** e **Iberia Plus**. Eles estão ali com todo o
direito — um brasileiro resgata GRU→LIS na TAP sem nenhuma estranheza.

Ou seja: **"programa estrangeiro" nunca foi a fronteira.** O que define o
anel atual é o voo tocar o Brasil, porque é isso que as tabelas de resgate
sabem precificar. A estrutura de `data/tabelas-resgate.json` deixa isso
explícito sem querer:

```
tabelas.{programa}.economica.{regiao}
```

Sete regiões, e todas significam implicitamente *"saindo do Brasil"*. Não
existe eixo de origem. A tabela é unidimensional porque o produto é.

---

## Por que isso não é limitação — é a fonte da vantagem

Quatro razões, e nenhuma é sentimental:

**1. Tudo no produto é brasileiro.** CPM em reais, cartões brasileiros,
Livelo e Esfera, bônus de transferência, CONAR. O usuário é um brasileiro
acumulando em programa brasileiro. As três fontes de receita — cartão de
crédito, hospedagem, kit de viagem — só existem para o viajante brasileiro.

**2. A profundidade é o ativo, não a largura.** O diferencial que está sendo
construído é a curva de "preço × dias antes do voo" por rota, que exige
tempo rodando e não se compra pronta. Diluir a coleta em rotas que não geram
receita atrasa o único ativo que não dá para copiar.

**3. A largura já está ocupada.** Buscador global de passagem é um mercado
decidido — Google Flights e Skyscanner ganharam. Entrar nele com veredito
impreciso troca uma plataforma precisa num nicho por mais um buscador ruim.

**4. A base ainda não está firme.** Das 35 células das tabelas de resgate,
**7 são pesquisadas, 18 interpoladas e 10 indisponíveis.** Antes de somar
eixo novo, há 18 interpolações para virar pesquisa.

---

## O caminho de expansão

Os anéis são cumulativos e cada um tem um gatilho objetivo. **Nenhum abre
antes do anterior estar firme.**

### Anel 1 — voos que tocam o Brasil *(onde estamos)*

BR→exterior, exterior→BR, BR→BR. Programas brasileiros e estrangeiros,
desde que a tabela saia do Brasil.

*Firme quando:* as 18 células interpoladas virarem pesquisadas, e a curva
própria cobrir as rotas com demanda real.

### Anel 2 — trecho estrangeiro, com honestidade *(próximo, barato)*

Estrangeiro→estrangeiro continua respondendo: preço, sazonalidade, janela de
compra. **Sem número de milhas.** Em vez disso, a frase verdadeira:
*"trecho fora dos programas brasileiros — aqui a conta é em dinheiro."*

Isso não é consolo, é o caso de uso real: o brasileiro que voa GRU→LIS e
depois compra LIS→MAD no meio da viagem. O conselho certo para ele quase
sempre é guardar as milhas para o trecho longo — e a plataforma passa a
dizer isso **de propósito**, em vez de por acidente. É o mesmo padrão de
degradação honesta que o projeto já usa em toda parte: responde o que sabe,
declara a fonte, cala sobre o que não sabe.

*Gatilho:* imediato. Entra junto com a guarda da Fase 0.

### Anel 3 — alianças e matriz de regiões *(futuro, caro)*

Aqui mora a ideia certa: Smiles, LATAM Pass e TudoAzul **resgatam em
parceiros de aliança**, então LIS→MAD *tem* preço em milhas brasileiras — só
que não é o da tabela Brasil→Europa. É o da tabela do parceiro, para aquele
par de regiões.

**O custo não é mais dado. É uma dimensão a mais.** A tabela deixa de ser
`{região}` e passa a ser `{região de origem} × {região de destino}`:

| | Hoje | Com matriz |
|---|---|---|
| Células por programa | 7 | **49** |
| Total no catálogo (5 programas) | 35 | **245** |
| Já pesquisadas | 7 | 7 |

Multiplicar por sete um catálogo que já é 51% interpolado produziria um
número bonito e falso em escala industrial — exatamente o que este
documento existe para impedir.

*Gatilho:* Anel 1 com a maioria das células pesquisadas, e demanda medida —
busca de trecho estrangeiro em volume que justifique o esforço de curadoria.
A Fase 3 do plano (rota buscada vira rota monitorada) é o que produz essa
medição.

### Anel 4 — itinerário multi-trecho

A viagem inteira em vez do trecho. É o que transforma o Anel 2 em produto.

---

## Onde esta decisão fica travada

A cultura do repositório é clara: *"não são convenções, são testes que
falham."* Uma decisão de escopo que vive só em documento apodrece. Ela fica
registrada em quatro camadas, cada uma para um leitor diferente:

| Camada | Leitor | Forma |
|---|---|---|
| **Produto** | quem busca LIS→MAD | a nota do Anel 2, em tela |
| **Build** | quem mexer no motor | trava em `tests/`: rota fora do modelo não emite número de milhas |
| **README** | quem chega no projeto | uma linha em *Travas que quebram o build* |
| **Este documento** | quem for decidir expandir | o porquê, e os gatilhos |

A trava e a linha do README entram junto com a guarda em
`lib/milhas/regioes.ts` (Fase 0 do plano). **Até lá, os 16.770 pares seguem
no ar com os números da tabela acima** — este documento descreve a decisão,
não o estado atual do código.

---

## Verificação

Este documento é decisão, não código. O que vale conferir antes de agir
sobre ele:

- **A tabela de rotas erradas** foi gerada rodando `classificarRota` e
  `calcularVeredito` contra cotações reais da Travelpayouts em 10/11/2026.
  Reproduzível: alimentar o motor com o preço e comparar a faixa atribuída
  com a geografia real do trecho.
- **Contagem de células** (7 pesquisadas, 18 interpoladas, 10
  indisponíveis): lida de `data/tabelas-resgate.json`, campo `confianca`.
  Muda a cada curadoria — vale recontar antes de usar como argumento.
- **16.770 pares estrangeiro→estrangeiro**: 130 aeroportos internacionais na
  base atual, em pares ordenados. Esse número cresce com a Fase 2 (ampliação
  da base), que é justamente por isso que a guarda a precede.
- **Parcerias de aliança** não foram verificadas em detalhe aqui. Antes do
  Anel 3, confirmar nas páginas oficiais quais parceiros cada programa
  aceita e com qual tabela — é curadoria, não inferência.
