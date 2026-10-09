# Evolução a longo prazo — viabilidade da plataforma

> Escrito em 9 de outubro de 2026, logo após a conclusão do MVP (commits `8f5d2a8` a `a2f3bfc`).
>
> Nada aqui foi implementado. O documento existe para responder, com números, se a plataforma aguenta virar negócio — antes de qualquer decisão de investimento, não depois.

## Por que este documento existe

A plataforma está no ar, funcionando, com dado real e custo zero de infraestrutura. A pergunta deixou de ser técnica e virou de sustentação: *se der certo, quebra?* E, especificamente: *teríamos que sair da Vercel?*

A ordem aqui é deliberada — custos, riscos e pontos de ruptura primeiro; mercado como contexto. É um documento para decidir, não para convencer ninguém.

---

## A resposta curta

**Sim, você vai sair do plano Hobby — mas por licença, não por limite técnico.** O Hobby da Vercel é restrito a uso não-comercial. No dia em que a flag de monetização ligar, é Pro (US$ 20/mês), ponto. Isso são ~R$ 110/mês e não é um problema.

**"Sair da Vercel", porém, é outra conversa — e provavelmente nunca será pelo site.**

Aqui está o ponto que inverte a intuição: a parte do projeto que quebra primeiro **não é a aplicação**. O site é quase todo estático (PPR, Lighthouse 97–99, zero imagem pesada, respostas JSON pequenas) — ele escala praticamente de graça em qualquer lugar. O que não escala é a **coleta de dados**: o cron, preso a 1 execução por dia e 60 segundos de janela.

Então a migração provável não é "trocar de hospedagem". É **tirar o coletor da Vercel e deixar o site onde está** — o que custa cerca de R$ 30/mês, não uma reescrita.

---

## Os três degraus de ruptura

### Degrau 1 — hoje, até ~1.000 usuários/mês

| | |
|---|---|
| Stack | Vercel Hobby + Supabase Free |
| Custo | **R$ 0** |
| O que limita | O cron: 1×/dia, 60s. Teto de ~30 rotas por execução. |
| Gatilho para sair | Ligar a monetização (licença) **ou** querer passar de 30 rotas |

O site não é o gargalo em lugar nenhum deste degrau. O banco comporta ~2,4 anos no ritmo atual de 20 rotas.

### Degrau 2 — monetização ligada, 1k a 20k usuários/mês

| | |
|---|---|
| Stack | Vercel Pro + Supabase Pro + coletor fora da Vercel |
| Custo | **~R$ 250/mês** (Vercel US$20 + Supabase US$25 + worker ~US$5) |
| O que limita | **Armazenamento de histórico.** 100 rotas esgotam os 500 MB em ~6 meses. |
| Solução | Particionamento com `pg_partman` + retenção: observação com mais de 90 dias vira mediana agregada por faixa |

Esse degrau é onde mora a decisão de engenharia mais importante do projeto, e ela **não é sobre dinheiro**. Sem política de retenção, qualquer plano estoura — só muda a data. Com retenção, o banco fica estável indefinidamente e você pode coletar muito mais rotas pelo mesmo preço.

Atenção a uma limitação concreta: **nem Supabase nem Neon oferecem a compressão do TimescaleDB** (ambos só servem a edição Apache). Para dados históricos, o caminho portátil é particionamento nativo do Postgres. Se um dia a compressão virar necessidade, aí sim é Postgres auto-hospedado.

### Degrau 3 — 50k a 100k usuários/mês

| | |
|---|---|
| Stack | Reavaliar caso a caso |
| Custo da Vercel | Vira função de banda. Modelos de terceiros estimam ~US$ 2.200/mês a 5 TB, contra ~US$ 250 no Cloudflare |
| O que limita | Provavelmente **nada disso** — nosso app é leve. O limite real vira a API de preço. |

E aqui tem uma inversão interessante: a **Search API da Travelpayouts** (busca em tempo real, em vez do cache que usamos hoje) exige 50 mil usuários mensais. Hoje isso é um bloqueio. Neste degrau, vira **destravamento** — exatamente quando você precisaria dela, ela abre.

Risco a vigiar neste degrau: a Vercel **não tem limite de gasto ativado por padrão**. Um pico de tráfego ou um crawler mal-comportado pode gerar conta alta num único dia. Configurar o Spend Management é obrigatório antes de ligar a monetização, não depois.

---

## O que realmente limita, em ordem

1. **Armazenamento de histórico** — resolvível com desenho (retenção/particionamento), não com dinheiro
2. **Janela do cron** — resolvível tirando a coleta da Vercel, ~R$ 30/mês
3. **API de preço** — o gargalo vira destravamento a 50k usuários
4. **Banda** — improvável ser problema; o app não serve imagem pesada

Nenhum dos quatro é existencial. Dois são decisões de arquitetura que custam tempo, não capital.

---

## Mercado: o tamanho e a janela

Dados da ABEMF para o 1º trimestre de 2026:

| Indicador | Valor | Variação |
|---|---|---|
| Faturamento do setor de fidelização | **R$ 6,3 bilhões** | +11,2% |
| Pontos emitidos | 299,3 bilhões | +19,7% |
| Pontos resgatados | 250,1 bilhões | +15,6% |
| Transações | 13,6 milhões | +7,8% |
| *Breakage* (pontos que expiram sem uso) | **11,1%** | menor nível da história |

Três leituras:

**O breakage em queda é vento a favor.** Significa que as pessoas estão efetivamente usando os pontos, em vez de deixá-los morrer. Uma ferramenta que ajuda a decidir *quando e como* resgatar entra num mercado que já está se movendo nessa direção.

**93% dos pontos vêm de varejo, bancos e serviços — só 7% de passagens aéreas.** Isso confirma empiricamente a tese que moldou nossa arquitetura: o dinheiro está no cartão de crédito, não no voo.

**São ~15 milhões de passagens emitidas por ano com milhas.** Esse é o universo de decisões que a plataforma se propõe a melhorar.

---

## Concorrência e o diferencial real

| | Modelo | Escala | Receita |
|---|---|---|---|
| **Seats.aero** (EUA) | Assinatura US$ 9,99/mês | **1 pessoa, zero funcionários** | US$ 1,5M–8M/ano (estimativas conflitantes) |
| **Point.me** (EUA) | Assinatura + white-label para bancos | 51 funcionários, US$ 25M levantados | ~US$ 2,9M ARR |
| **123/MaxMilhas/HotMilhas** (BR) | Marketplace de milhas | — | **Recuperação judicial: R$ 2,4 bi, 800 mil credores** |

O Seats.aero é a prova de que o modelo funciona **sem equipe e sem investidor**. Uma pessoa, bootstrapped, assinatura barata. É o benchmark mais relevante para você.

Mas o dado mais importante da tabela é o terceiro. **O maior nome do mercado brasileiro de milhas implodiu**, deixando 800 mil pessoas lesadas. Isso tem uma consequência direta: no Brasil, hoje, **o ativo escasso nesse mercado é confiança** — não tecnologia, não dado, não tráfego.

E é exatamente aí que a arquitetura que construímos já investiu, antes de saber que seria o diferencial:

- Ranking cego a comissão, **travado por teste automatizado** — a promessa é verificável por máquina, não por palavra
- Procedência declarada em cada número ("pesquisado", "interpolado", "estimativa", "preço de busca real")
- O app diz "pague em dinheiro" quando é o caso, recusando ativamente a recomendação que daria comissão
- Diz que clube de milhas quase sempre sai caro, mesmo sendo um produto de assinatura recorrente

Num mercado cheio de site que ordena cartão por comissão sem avisar, isso não é escrúpulo — é posicionamento, e é o único que não dá para copiar sem reescrever o produto.

---

## Os dois riscos jurídicos

### 1. O precedente do scraping — e por que estamos fora dele

A Air Canada processou o Seats.aero em outubro de 2023 por coletar dados de disponibilidade com bots: violação de termos de uso, fraude computacional (CFAA) e uso indevido de marca. O Seats.aero venceu a liminar em março de 2024 — a companhia não conseguiu demonstrar dano iminente — e em 2026 contra-atacou alegando prática anticompetitiva. **Ainda não há decisão de mérito.**

**Nossa posição é estruturalmente diferente: não fazemos scraping.** Usamos uma API licenciada (Travelpayouts, com token e termos de afiliado) e tabelas curadas a partir de fontes públicas identificadas.

Essa foi uma decisão da fase 1, tomada por motivo técnico — não havia API de resgate disponível. Em retrospecto, é o maior ativo jurídico do projeto. Vale protegê-lo: **nenhuma evolução futura deve introduzir scraping dos sites dos programas**, por mais tentador que seja o dado exato de resgate.

### 2. PL 3.083/2026 — aprovado na Câmara, aguardando Senado

Aprovado em 13 de agosto de 2026 em votação simbólica. Se virar lei:

- Programas que vendem pontos ou cobram por clubes terão de oferecer **conversão oficial em dinheiro**
- Programas sem esse canal **não poderão proibir nem dificultar a venda de milhas**
- Limites para cancelar contas ou anular passagens por causa de venda de pontos

Uma coalizão de entidades do setor classificou o projeto como **"ameaça existencial"**.

**Impacto para nós — e ele é majoritariamente positivo.** Se passar, a liquidez das milhas aumenta e o custo por milheiro fica mais transparente, o que favorece diretamente uma ferramenta de comparação. O risco é de manutenção: as tabelas de resgate podem mudar de forma abrupta e nossa base curada precisaria ser revista. Incômodo, não fatal.

Vale acompanhar a tramitação no Senado — é a variável externa com maior poder de mexer no produto.

### LGPD: hoje estamos quase fora do escopo

Por decisão de arquitetura, **nenhum dado pessoal está no banco**: saldo de milhas, gastos e metas vivem no `localStorage` do aparelho. Isso nos mantém praticamente fora do alcance da LGPD hoje.

Quando entrarem login e alertas de preço, muda:

- Enquadramento como agente de pequeno porte (Resolução ANPD 2/2022): encarregado (DPO) **dispensado**, mas canal de comunicação com o titular é **obrigatório**
- Supabase e Vercel ficam fora do Brasil → regras de transferência internacional (Resolução 19/2024)
- Multa de até 2% do faturamento, limitada a R$ 50 milhões por infração

Na prática, a fiscalização ainda é branda: até o início de 2026 a ANPD havia aplicado multa pecuniária em pouquíssimos casos, um deles de R$ 14.400 a uma microempresa. Mas a agência sinalizou foco em **publicidade digital direcionada** para 2026–2027, o que toca diretamente uma plataforma de viagens que personaliza ofertas.

---

## Veredito de viabilidade

**É viável, e o gargalo não é infraestrutura.**

Para colocar em perspectiva: o Seats.aero fatura entre US$ 1,5M e US$ 8M por ano com **uma pessoa**. O custo de infraestrutura que mapeei aqui para o degrau 2 é de **R$ 250/mês**. A ordem de grandeza entre custo e receita potencial não é apertada — é confortável.

O que realmente decide não aparece em nenhuma tabela de preço:

1. **Confiança**, num mercado onde o maior player quebrou e queimou 800 mil pessoas
2. **Densidade do dado próprio** — a curva de antecedência só vale se tiver profundidade, e profundidade exige tempo rodando. Cada dia sem coletar é um dia perdido para sempre
3. **Disciplina para não fazer scraping**, mesmo quando o dado exato estiver a um bot de distância

Os três são decisões suas, não da Vercel.

---

## Ordem recomendada (quando for implementar)

1. **Política de retenção e particionamento** — antes de expandir rotas, não depois. É o que torna tudo o resto sustentável.
2. **Tirar a coleta da Vercel** — paralelizar em lotes e mover para um worker dedicado ou GitHub Actions. Destrava cobertura nacional por ~R$ 30/mês.
3. **Spend Management na Vercel** — obrigatório antes de ligar a monetização.
4. **Acompanhar o PL 3.083 no Senado** — é a variável externa de maior impacto.
5. Só então: login, alertas de preço e o que mais vier.

---

## Verificação

Este documento é análise, não código — não há teste a rodar. O que vale checar antes de agir sobre ele:

- **Preços das plataformas**: as fontes são blogs comparativos de 2026 com números divergentes entre si. Confirmar nas páginas oficiais da Vercel e da Supabase antes de orçar.
- **Receita do Seats.aero**: as estimativas variam em 5× entre fontes (US$ 1,5M e US$ 8M). Nenhuma é dado auditado.
- **PL 3.083/2026**: conferir a tramitação atual no portal do Senado; este documento reflete a situação em outubro de 2026.
- **Projeções de armazenamento**: baseadas em ~115 linhas por rota por dia, medidas em produção, e em estimativa de ~250 bytes por linha com índices. Vale medir o tamanho real da tabela antes do degrau 2.

---

## Fontes

**Infraestrutura**
- [Vercel Pricing 2026 — planos, limites e custos ocultos](https://deploywise.dev/blog/vercel-pricing-explained)
- [Vercel Free vs Pro 2026 — limites oficiais](https://www.fencode.dev/en/blog/vercel-free-vs-pro-2026-official-limits-pricing)
- [Custo real de PaaS: Vercel, Railway, Render, Fly.io e Hetzner](https://bex.co/blog/2026/08/21/your-paas-bill-lied-cost-teardown-vercel-railway-render-flyio-hetzner)
- [Neon vs Supabase 2026 — preços e custos reais](https://www.jetadmin.io/blog/neon-vs-supabase/)
- [pg_partman — particionamento e retenção automática](https://www.crunchydata.com/blog/auto-archiving-and-data-retention-management-in-postgres-with-pg_partman)
- [TimescaleDB no Supabase — limitações](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/extensions/timescaledb.mdx)

**Mercado**
- [ABEMF 1T26 — faturamento cresce 11,2% e supera R$ 6,3 bilhões](https://aeroin.net/faturamento-dos-programas-de-fidelidade-no-brasil-cresce-112-e-supera-r-63-bilhoes-no-1o-trimestre-de-2026/)
- [Pontos expirados atingem menor nível da história](https://passageirodeprimeira.com/pontos-milhas-expirados-menor-nivel-historico-abemf/)

**Concorrência**
- [Seats.aero: US$ 8M/ano sem funcionários](https://ventureradar.substack.com/p/micro-saas-ideas-seats-aero)
- [Point.me levanta US$ 15M em Série B](https://www.phocuswire.com/point-me-series-b-funding)
- [123 Milhas: R$ 2,4 bi e 800 mil credores na recuperação judicial](https://renovainvest.com.br/blog/recuperacao-judicial-da-123milhas/)

**Jurídico**
- [Air Canada processa o Seats.aero por scraping](https://awardwallet.com/blog/air-canada-sues-seats-aero/)
- [Seats.aero acusa a Air Canada de prática anticompetitiva](https://viewfromthewing.com/air-canada-says-award-scraping-is-computer-fraud-seats-aero-says-thats-anticompetitive/)
- [Câmara aprova regras para programas de fidelidade (PL 3.083/2026)](https://agenciabrasil.ebc.com.br/politica/noticia/2026-08/camara-aprova-regras-para-programas-de-fidelidade-com-milhas-ou-pontos)
- [Entidades condenam PL das milhas: "ameaça existencial ao setor"](https://www.panrotas.com.br/aviacao/empresas/2026/09/entidades-condenam-pl-das-milhas-ameaca-existencial-ao-setor_231609.html)
- [Resolução ANPD 2/2022 — agentes de pequeno porte](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022)
