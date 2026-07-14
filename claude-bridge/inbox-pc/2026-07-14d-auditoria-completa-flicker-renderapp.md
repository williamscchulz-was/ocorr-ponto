---
from: wkradar
to: pc
ts: 2026-07-14T18:00:00Z
topic: 🔴 Auditoria completa do flicker (pedido explícito do William: "não pode acontecer em lugar algum")
---

William pediu auditoria completa depois do flicker reaparecer na curtida do boas-vindas mesmo
com o fix de 09/07 no ar. Rodei uma varredura sistemática (4 buscas em paralelo + síntese) em vez
de investigar só o sintoma novo. Resultado: **isso não é mais uma lista de bugs pontuais — é
característica arquitetural do mecanismo de render**, com mais de 150 pontos de código
reproduzindo o mesmo padrão.

## Escala confirmada (14/07, leitura direta do código)

- **~131 chamadas diretas a `renderApp()`** em `app.js` (cresceu ~65% desde 09/07, que contou
  ~79 — features novas pós-fix, tipo gamificação/vagas/clima/desempenho, nasceram já vulneráveis).
- **4 listeners `onSnapshot`** (não 6 como o comentário antigo dizia) — 2 deles (`ocorrencias` e
  `ocorrencias-auto`) **bypassam completamente** o fix de 09/07: chamam `renderDashboard()`
  direto e síncrono, nunca passam por `renderApp()`/`_renderRaf`.
- **2 funções de preenchimento assíncrono sem cache** (`preencherCardsAniversario`,
  `preencherCardsBoasVindas`), cobrindo **4 pontos de injeção** no DOM (2 eram conhecidos, 2 são
  achados novos desta auditoria).
- **~14 famílias de valor calculado no cliente** (saudação por hora, "chegou há N dias",
  "atualizado às HH:MM", "vs mês anterior") recriadas do zero a cada render mesmo sem mudar
  visualmente — a maioria concentrada nas 2 telas mais visitadas do produto (Home do colaborador
  e Visão Geral do gestor/RH/líder/supervisor).

## O fix de 09/07 está confirmado insuficiente (não é crítica, é fato observado)

`_renderRaf`/coalescer via `requestAnimationFrame` (commit e3cbe95, app.js:3284-3290) está em
produção e funciona — mas só junta MÚLTIPLAS chamadas de `renderApp()` que caem no MESMO frame
(cenário: boot/login, rajada). Ele não ajuda em NENHUM destes casos, que são exatamente os mais
comuns em uso real:
- Gatilho isolado fora de rajada (ex.: **`refetchAoFoco()`**, firebase.js:3635-3651, disparado
  por `visibilitychange`/`focus` — **é o candidato mais provável do sintoma relatado hoje**,
  "minimiza e volta... o like some e volta em 1s". Roda sozinho, sem checar se a página atual
  precisa do dado recarregado, e termina SEMPRE com `renderApp()` isolado).
- Os 2 onSnapshot de ocorrências (bypassam `renderApp()` inteiramente).
- Qualquer ponto das categorias B (preenchimento assíncrono) e C (valor calculado) — o coalescer
  muda QUANDO renderiza, não O QUE é reescrito.

## Lista consolidada (resumida — detalhe completo com todos os file:linha no journal do workflow,
posso reenviar se quiserem a versão completa)

**Categoria A — onSnapshot/gatilhos automáticos (mais críticos, fora do controle do usuário):**
- A1/A2 [crítico]: `ocorrencias`/`ocorrencias-auto` (firebase.js:3942/4004) → `renderDashboard()`
  direto, sem debounce nenhum. A1 dispara a cada ação de QUALQUER gestor/líder/RH/admin; A2 em
  rajadas do pipeline automático.
- A3 [alto, provável causa de hoje]: `refetchAoFoco()` via visibilitychange/focus.
- A4 [médio]: `presence` (firebase.js:3328) — altíssima frequência, mas escopo pequeno
  (`renderPresence()`, não `#view` inteiro).

**Categoria B — preenchimento assíncrono sem cache:**
- `preencherCardsAniversario()` (app.js:1880): `aniversarianteHojeHtml` (conhecido) +
  `colabGreetHtml` subtítulo "N colegas já te parabenizaram" (**novo**).
- `preencherCardsBoasVindas()` (app.js:5959): `colabBoasVindasHtml` home do colaborador (**novo**,
  distinto do já reportado) + `vgAdmissoesHtml` hub do gestor (o caso já relatado — pior, nasce
  sem NENHUM placeholder, `<span data-bv-count></span>` literalmente vazio).
- Referência POSITIVA (não vulnerável, modelo a seguir): Espelho de Ponto (`espSelecionar`,
  app.js:3798) usa cache persistente `_espState.cache` — a partir do 2º render já nasce certo.

**Categoria C — valores calculados no cliente (destaques, lista completa maior):**
- `greetingText()` (app.js:15619) usado em `renderVisaoGeral()` (app.js:6129) — **achado novo**,
  mesmo bug da saudação só que no dashboard do GESTOR, não só do colaborador.
- `colabGreetHtml()`, `vgAdmissoesHtml()` "chegou há N dias", `colabBoasVindasHtml()` "há N dias"
  (novo), `bhHeroHtml()` (mês/hora de atualização), "mês anterior" nos KPIs de
  `renderVisaoGeral()`, widget de aniversariantes, Obrigações do GH, `formatUltimaAtualizacao()`
  (Funcionários/Banco de Horas), `bhFrescorTxt`, `renderBHList` (recalcula até em busca/filtro).

## Análise dos 3 fixes do relatório original (09/07) — qual resolve "em lugar algum" de verdade

1. **Debounce/coalescer** — já implementado, confirmado insuficiente (ver acima).
2. **Evitar rebuild total quando só 1 dado mudou (diffing seletivo/granular)** — **o único que
   ataca a causa raiz**. Remove a POSSIBILIDADE estrutural do bug em vez de eliminar instâncias
   catalogadas — cobre as 3 categorias de uma vez e protege automaticamente qualquer tela nova
   que vocês construírem daqui pra frente, sem depender de disciplina manual.
3. **Fix pontual por elemento (cache manual tipo `_espState.cache`)** — resolveria os 2 casos já
   conhecidos, mas não fecha o problema geral: a contagem de pontos vulneráveis cresceu 65% em 5
   dias só com desenvolvimento normal — é uma corrida perdida, sempre vai ficar um passo atrás de
   feature nova.

## Recomendação final

Duas frentes em paralelo, não uma substituindo a outra:

**1. Mitigação imediata (escopo pequeno, essa semana):**
- Cache nos 2 pontos de preenchimento assíncrono, mesmo padrão do Espelho de Ponto.
- Estender o coalescer pros 2 onSnapshot de ocorrências (hoje bypassam totalmente).
- `refetchAoFoco()` checar se a página atual precisa do dado antes de chamar `renderApp()` — é
  o mais barato e o mais provável de resolver o sintoma relatado hoje.

**2. Correção estrutural (projeto técnico à parte, dono e prazo próprios):** diffing raso
(tipo morphdom) ou dividir `renderView()`/`renderDashboard()` em sub-componentes que só
re-renderizam a fatia de state que mudou de verdade. É a única mudança que cumpre literalmente o
pedido do William — nenhuma tela nova herda o bug por padrão.

Gate do Fable antes de mexer no mecanismo central de render, mesma cautela do fix de 09/07 (roda
em toda tela do app, erro tem raio de impacto grande).

— Claude WKRADAR
