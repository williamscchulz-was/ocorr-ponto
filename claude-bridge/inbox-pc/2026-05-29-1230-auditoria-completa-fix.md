---
from: wkradar
to: pc
ts: 2026-05-29T15:30:00Z
topic: Auditoria completa do FioPulse — fixes pra você
---

Salve! O William pediu uma auditoria completa (segurança + UX/design + qualidade) e que eu deixasse os ajustes pra você. Rodei 3 auditores em paralelo. Resultado completo e priorizado em:

📄 **`docs/AUDITORIA-2026-05-29.md`** (lê esse — tem todos os achados com arquivo:linha + fix sugerido)

## Resumo: 5 P0 + 11 P1 + 10 P2

**Quase tudo é teu domínio** (app.js, firebase.js, styles.css, index.html, sw.js, firestore.rules). Eu (WKRADAR) cuido só de 1 item de pipeline (sanitizar nome — defesa em profundidade, secundário).

### 🔴 P0 — recomendo atacar primeiro (rápidos e críticos)
1. **S1 · XSS no `toast()`** (`app.js:257`) — `innerHTML` sem escape; nome de funcionário com HTML executa script. **Fix de 1 linha:** `escapeHtml(msg)` no toast. Maior impacto/menor esforço.
2. **C1 · Service Worker cache velho** (`sw.js:12`) — `CACHE="fiopulse-v3"` estático nunca purga; offline serve HTML/JS antigo. Bumpar nome do cache por build.
3. **U1 · Toast sem aria-live** (`index.html:138`) — leitor de tela não anuncia erros.
4. **U2 · `confirm()` nativo** na exclusão de ocorrência (`app.js:1865`) → modal estilizado.
5. **U3 · Falha de rede sem feedback** no login (`app.js:5948`).

### 🟡 P1 — destaques
- **S2/S3/S4 · Rules**: `mensagens.create` não valida parKey/para; **supervisor lê bancoHoras E ocorrências INTEIROS** (filtro só client-side → vaza saldo/dados de quem ele não supervisiona no DevTools). Decisão arquitetural: escopar server-side (`resource.id in userDoc().funcionariosVisiveis` + query `in`) ou aceitar leitura ampla documentando.
- **U4** focus trap no modal · **U5** alt nas fotos · **U6** bottom-nav estoura em 360px · **U7** contraste muted < AA (#5D7858)
- **C2** índice composto do chat + loop re-render · **C3** listeners do crop de foto vazam · **C4** chat reconstrói thread (rouba scroll) · **C5** boot sem paginação (ocorrências sem limit) · **C6** ocorrências sem realtime (stale)

### 🟢 P2
Validação de presence, dead code (dois `tsToDateStr`!), inputmode em valores monetários, manifest maskable, hint "(mock)", etc. Tudo no doc.

## Sobre o bug do Anderson (supervisor)

Investiguei à parte: **dados 100% corretos** (`funcionariosVisiveis: ["f-612","f-942","f-1074","f-1139"]`, todos ativos, existem em funcionarios E bancoHoras). Código de filtro (`funcionariosVisiveisPara`) também correto. Suspeita: **sessão/cache velho** do Anderson (logou antes da lista ser setada → user object em cache sem `funcionariosVisiveis`). Teste: logout + Ctrl+F5 + login. Se persistir, é bug de render path — aí vale você rastrear (relacionado ao S3/S4 acima).

## Como reportar de volta

Pode ir corrigindo e me avisando o progresso aqui no bridge, ou commitando direto. Não precisa missão formal de volta — só me dá um ACK quando atacar os P0 pra eu saber. Se algum fix tocar no schema do Firestore que o pipeline escreve, me avisa antes.

Valeu! Auditoria detalhada tá no doc. 🔍

— Claude WKRADAR
