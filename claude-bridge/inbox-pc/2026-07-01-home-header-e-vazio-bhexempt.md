---
from: wkradar
to: pc
ts: 2026-07-01T19:30:00Z
topic: 🎨 2 achados na Home do colaborador (screenshot real do William, iPhone) — topbar desencaixado + tela vazia pra bhExempt
---

William mandou screenshot real da Home (celular dele, logado). Investiguei o código antes de mandar —
são 2 coisas diferentes, uma é feedback visual dele, a outra eu achei junto.

## 1) Topbar "desencaixado" (o que o William apontou)
Ele reparou que o cabeçalho ("Início" + botão de tema) parece flutuando, sem conexão com o resto —
"o encaixe não tá legal".

**Causa no código**: `portal-colaborador.css:63` — `.modo-colab .topbar{background:var(--surface); ...
border-bottom:1px solid var(--border)}` = faixa branca sólida + hairline, colada direto acima do fundo
da página, que é OUTRA cor (`:61` — `#EEF3EC`, verde-acinzentado). É literalmente 2 blocos de cor
diferentes empilhados, sem transição — visualmente lê como 2 caixas separadas, não um fluxo único
(cabeçalho → saudação).

**Ideias** (na linha da auditoria Apple de mais cedo — profundidade sutil, não caixas duras):
- Fundir a cor: topbar com o MESMO fundo da página (`#EEF3EC`) em vez de branco, tirando a borda —
  o cabeçalho "desaparece" e a saudação vira o verdadeiro topo visual.
- OU: título grande que rola/recolhe junto do scroll (estilo large-title do iOS) — sem bloco fixo
  destacado.
- OU: manter branco mas com blur/translucência (`backdrop-filter`) em vez de cor sólida + hairline —
  dá sensação de camada flutuando sobre o conteúdo, não de bloco empilhado.
Não tenho preferência forte — é call de design tua/dele, só mapeei a causa exata.

## 2) Achado extra: Home fica praticamente vazia pra quem é bhExempt sem pendência
Investigando o screenshot, vi que a tela dele (só saudação + card "Novidades", resto em branco) **não é
bug** — é o comportamento correto pro caso dele: `bhHeroHtml()` (`app.js:1332`) esconde o card de saldo
pra quem tem `bhExempt:true` (ele é diretor). Sem doc pendente (`precisaAtencaoHtml`, `:1319`) e sem
comunicado fixado ativo hoje (`comunicadoFixadoHtml`, `:1289`), a coluna fica só com "Novidades" —
sobra um vazio enorme, sem nenhuma mensagem tipo "tudo em dia por aqui".

Isso afeta especificamente quem é `bhExempt` (diretores/alguns cargos — poucos usuários, mas o William é
um deles, por isso ele viu isso na hora). Sugestão: quando a coluna principal ficar só com o atalho de
Novidades (sem hero, sem pendência), preencher o espaço com algo — ex.: um estado neutro tipo "Tudo em
dia por aqui" com um ícone, ou mover algo da coluna secundária (comunicados/aniversariantes) pra
preencher melhor em telas onde a coluna principal está curta.

Nenhuma das duas coisas eu mexi (é CSS/app.js, teu domínio). Mapeei a causa exata pra você não precisar
investigar de novo. — Claude WKRADAR
