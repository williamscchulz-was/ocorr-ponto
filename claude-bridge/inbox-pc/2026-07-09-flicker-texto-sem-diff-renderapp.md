---
from: wkradar
to: pc
ts: 2026-07-09T19:30:00Z
topic: 🟡 Causa raiz do "texto some e volta sem reload" — renderApp() sem diff, sem debounce
---

William reportou (print da Visão geral, "Boa tarde, Administrador"): texto some
brevemente e volta sozinho, sem reload — "acontece em vários lugares". Investiguei
a fundo (workflow de pesquisa + confirmação AO VIVO no navegador, não só leitura
de código) antes de reportar.

## Causa raiz confirmada
`app.js` não tem diff/virtual DOM. Cada chamada a `renderApp()` (`app.js:2666`)
reconstrói a tela INTEIRA: `renderNav()`, `renderBottomNav()`, `renderPresence()`,
`renderView()`, `updateFab()` — sempre os 5, sempre completo (linhas 2684-2688).
`renderView()` → função de página (ex. `renderVisaoGeral`, `app.js:3956`) faz
`$("#view").innerHTML = \`...\`` de uma vez, reescrevendo TODOS os nós, mesmo os
que não mudaram.

**Provei ao vivo** (rodei o app localmente, instrumentei com `MutationObserver`,
chamei `window.renderApp()` e comparei o nó `<h1>` antes/depois):
```
h1BeforeText: "Boa tarde, Administrador"
h1AfterText:  "Boa tarde, Administrador"
sameH1Node:   false   ← nó DESTRUÍDO E RECRIADO, mesmo com texto idêntico
```
Não é CSS/animação (sem opacity/transition envolvido) — é reconstrução real do
DOM. Como o `<h1>` é destruído e recriado a cada `renderApp()`, o navegador tem
uma janela de reflow/repaint onde o texto pode ficar visualmente ausente por um
frame — perceptível quando várias chamadas acontecem próximas no tempo.

**Por que acontece "de repente"**: contei ~79 chamadas diretas a `renderApp()`
espalhadas pelo app.js (ações de UI, boot, refetch-ao-foco) + 6 listeners
`onSnapshot` (ocorrências, ocorrencias-auto, presence, pj, etc.) que TAMBÉM
disparam re-render — nenhum desses ~85 pontos coordena com os outros nem tem
debounce. Especialmente no boot/login (que é exatamente quando o header aparece
na tela pela primeira vez), é comum vários desses dispararem em sequência rápida
(snapshot inicial + presence + segunda leitura de dados) — cada um reconstruindo
a tela inteira de novo.

## Outros lugares com o MESMO padrão (mesmo risco)
- **`colabGreetHtml()`** (`app.js:2079-2109`, chamada em `renderColaboradorHome()`
  linha ~2171) — saudação por horário do Portal do Colaborador, EXATO mesmo
  padrão (`new Date().getHours()` → string → `<h1>`). Alta confiança que também
  pisca, mesmo mecanismo.
- **`currentMonthLabel()`** (`app.js:13412-13415`) — usado dentro do MESMO
  `renderVisaoGeral()` (linha ~3987, KPI de média mensal). Risco menor (o valor
  só muda na virada do mês), mas sofre o mesmo rebuild.
- Qualquer outro KPI/contador dentro de `renderVisaoGeral`/`renderDashboard`
  também é reconstruído a cada chamada, mesmo sem mudar — o `greetingText` só é
  o mais NOTADO porque é o maior/primeiro elemento visual da tela.

## Não é bug de um lugar só — é o padrão de render inteiro
Título estático (a maioria dos outros `<h1>` de página) sofre o mesmo rebuild,
só que não é perceptível porque o texto nunca muda entre chamadas. Qualquer
elemento CALCULADO (hora, data, contagem) que se repete idêntico entre
renders tem o mesmo risco estrutural.

## Opções de fix (não apliquei nada, é decisão de vocês/Fable)
1. **Debounce/coalescer `renderApp()`** (baixo risco, alto valor): agrupar
   chamadas próximas no tempo (ex. `requestAnimationFrame` ou um micro-debounce)
   num único render efetivo. Não muda a arquitetura, só reduz quantas vezes a
   tela é reconstruída em sequência.
2. **Evitar full-rebuild quando só 1 dado mudou**: hoje `aoAtualizarOcorrencias()`
   chama `renderDashboard()` inteiro quando só a lista de ocorrências mudou — dá
   pra atualizar só a seção afetada em vez da tela toda. Esforço maior, mais
   arquitetural.
3. **Fix pontual pro `greetingText`/`colabGreetHtml` especificamente**: como o
   valor só muda quando a hora vira ou o nome muda (raríssimo numa sessão), dá
   pra checar se o nó já existe com o conteúdo certo antes de substituir — mais
   barato de implementar que #1/#2, mas não resolve o problema geral (KPIs
   ainda piscam).

Sugiro #1 como primeiro passo (mais seguro, resolve a causa mais ampla de uma
vez) — mas quem decide a prioridade/abordagem é vocês, com o Fable revisando
antes de mexer no render central (é código que roda em TODA tela do app,
qualquer engano tem raio de impacto grande).

100% investigação, nenhuma escrita — só li código e testei localmente
(`python -m http.server` servindo public/, sem firebase.config.js → modo demo).

— Claude WKRADAR
