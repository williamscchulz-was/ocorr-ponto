# Auditoria FioPulse — 2026-05-24

> Auditoria full-stack do app: código, UX, perf, bugs, segurança e
> acessibilidade. Achados são **verificados via grep + leitura de código**,
> não conjectura. Prioridades P0/P1/P2 já refletem realidade vs hype.

---

## 🔴 P0 — Crítico (resolver antes de subir pra produção real)

### 1. XSS armazenado em campos de texto (CONFIRMADO)
**Onde:** todo o app usa `innerHTML` interpolado com dados do usuário
sem escape. **57 ocorrências** de `${...}` dentro de `innerHTML`. Função
`escapeHtml` / `sanitize` **não existe no projeto** (confirmado via grep).

**Reproduzir:**
1. Admin cria PJ com nome `<img src=x onerror=alert(1)>`
2. Salvar no Firestore
3. Qualquer pessoa que abrir Controle PJ executa o JS

**Vetores específicos:**
- `mockup/app.js:1502` (funcionário) · `:2273-2479` (PJ) · `:1070` (observação dentro de textarea)
- `contratoUrl` com `javascript:` (input `type=url` valida só sintaxe)
- Banner colab `:2620` interpolando `autor.nome` sem escape

**Impacto:** roubo de token Auth, ações com privilégio de admin, escalation total.

**Fix:**
```js
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g,
  c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
```
Aplicar em **todo** interpolado de fonte humana. Validar `contratoUrl` com
`new URL(v).protocol === "https:"` antes de salvar.

---

### 2. Listener Firestore órfão quando sessão expira (CONFIRMADO)
**Onde:** `mockup/firebase.js:1311-1320` (`limparPresenca`) não chama
`pararEscutaPJ()` nem `setarPJEditando(null)`.

**Reproduzir:**
1. Abre modal de PJ
2. Fica 30 min sem mexer → idle timeout → `signOut`
3. `pjDocUnsubscribe` continua escutando `/pj/{id}` com user que já saiu
4. Próxima leitura falha por regra de auth → erros no console + risco de
   reescrever `pjEditing` de outro user

**Fix:** chamar `window.pararEscutaPJ?.()` + `window.setarPJEditando?.(null)`
dentro de `limparPresenca`.

---

### 3. PII em logs do console (CONFIRMADO)
**Onde:**
- `firebase.js:1082` — `console.log("[Auth] enviando email...", email)`
- `app.js:3083-3084` — CNPJs encontrados no contrato
- `app.js:333` — lista de nomes em `[Colab MOCK] iniciando simulação com:`
- `google-drive.js:79-96` — `console.log("[Drive] OAuth success")` + resposta completa

**Impacto:** qualquer pessoa com DevTools (incluindo browser extension malicioso)
vê emails, nomes e CNPJs reais.

**Fix:** `if (location.hostname === "localhost") console.log(...)` ou flag global
`window.DEBUG`. Manter `console.error` que ajuda debug de erro real.

---

### 4. Scripts blocking sem `defer` no `<head>` (CONFIRMADO)
**Onde:** `mockup/index.html:140-146` — 5 scripts `<script src="...">` no fim
do `<body>` SEM `defer` ou `async`. Total **~244KB JS** parseado serialmente
+ Firebase SDK CDN (~250KB) carregado dentro de `firebase.js`.

**Impacto:** parse blocking de ~500KB. First Contentful Paint estimado
~600ms em 4G mid-tier.

**Fix:** adicionar `defer` em todos os 5 scripts (preserva ordem). Considerar
lazy-load do `google-drive.js` (só carrega quando modal PJ abrir).

---

## 🟠 P1 — Importante (próxima sprint)

### 5. Mock de edição colaborativa = ~110 linhas dead code (CONFIRMADO)
**Onde:** `mockup/app.js:317` (`iniciarSimulacaoColaborativa`) — nunca
chamada. Junto vêm `marcarCampoEditando`, `desmarcarCampoEditando`, `_colabTimers`,
`pararSimulacaoColaborativa`, `hexToRgba`. Substituído pela versão real
(`setarPJEditando` + `iniciarEscutaPJ` + `atualizarBannerColabModal`).

**Bonus:** `styles.css:795-869` tem ~75 linhas de CSS associado (`.field--editing`,
`.field__editor-badge`, `.field__cursor-pulse`, animações `collabBadgeIn`/`cursorBlink`)
também órfãs.

**Fix:** deletar funções + CSS. Manter só `notificarEdicaoColab` + `.collab-toast`
que ainda são usadas pelo callback real (linha 2618).

---

### 6. Bug `.active` vs `.ativo` no filtro de presença (CONFIRMADO)
**Onde:** `mockup/app.js:320` e `:440` usam `x.active !== false`. Campo real é
`x.ativo` (PT-BR). Todo o resto do código usa `.ativo` corretamente (12 outras
ocorrências).

**Por que não quebrou ainda:** `undefined !== false` retorna `true`, então o
filtro sempre passa. Bug latente — só apareceria se alguém marcar `user.active = false`
explicitamente (nunca acontece).

**Fix:** trocar `.active` por `.ativo` nas 2 linhas. Cai junto com a remoção
do mock acima.

---

### 7. Duplicação massiva entre `app.js` (demo) e `firebase.js` (overrides)
**Onde:** 16 funções CRUD reescritas em ambos: `saveNovaOcorrencia`,
`confirmConferencia`, `savePJ`, `aplicarReajuste`, `saveFuncionario`,
`saveFeriasPJ`, `saveTipo`, `saveAcao`, etc. Cada par compartilha 70-90%
da lógica — só muda a parte de persistência.

**Estimativa:** ~600-800 linhas duplicadas (~14% do JS).

**Fix:** padrão "validar+montar+aplicar" puro em `app.js`, com hook
`await persistFn(doc)` injetável. `persistFn` default = `store.save`, firebase.js
sobrescreve só essa função.

---

### 8. Validação de CNPJ + datas + valores
**Onde:** `pj-cnpj` aceita `aaaa` (só `maxlength=20`). Sem validação de
dígitos verificadores. `pj-valor` aceita negativos via paste.

**Fix:** função `validarCNPJ()` com checksum + `Math.max(0, Number(v))` antes
de salvar.

---

### 9. Touch targets < 44px (acessibilidade)
**Onde:** `.topbar__menu` 40×40 (`styles.css:696`), `.btn--sm` ~32px alto,
`.modal__close`, `.btn--icon` 40×40. WCAG 2.5.5 exige ≥44.

**Fix:** subir todos pra 44px mínimo (padding interno se necessário).

---

### 10. Search inputs sem debounce
**Onde:** `func-search`, `pj-search`, `bh-search`, dashboard search — todos
re-renderizam a lista a cada keystroke. Com 130 funcionários × innerHTML
rebuild é perceptível em mobile.

**Fix:** `debounce(150ms)` em todos.

---

### 11. `outline:none` no `:focus` sem `:focus-visible`
**Onde:** `styles.css:293`. Usuários de teclado não veem qual botão está focado.

**Fix:** `*:focus-visible { outline: 2px solid var(--plum); outline-offset: 2px; }`.

---

### 12. Poppins com 7 weights (~80KB desnecessário)
**Onde:** `index.html:16` carrega `wght@0,400;0,500;0,600;0,700;0,800;1,700;1,800`.
CSS usa só 400/500/600/700. Italic 700/800 nunca aparecem.

**Fix:** trimmar pra `wght@400;500;600;700`.

---

### 13. HTML órfãos (`mockup-online.html`, `mockup-colab.html`)
**Onde:** ~1240 linhas combinadas. Não referenciados por nada (só citam um ao
outro em comentário). São mockups antigos antes da implementação real.

**Fix:** deletar ou mover pra `docs/mockups-historicos/`.

---

### 14. Erros engolidos silenciosamente
**Onde:** `firebase.js:972`, `:1138`, `:1145` (`catch {}` sem log).
**Fix:** trocar por `catch (e) { console.debug(e); }`.

---

## 🟡 P2 — Nice to have

15. **`alert()` em `firebase.js:62`** — usar `toast()` (resto do app já usa)
16. **Senhas temp via `Math.random()`** (`firebase.js:1047`) — usar `crypto.getRandomValues`
17. **Falta `aria-label` em 17 botões só-ícone**
18. **Sem `skip-to-content` link**
19. **`confirm()` nativo destrutivo** (linhas 1579, 3606, 4164) — modal estilizado seria melhor
20. **`renderApp()` chamado ~25 vezes** — perde scroll/foco. Granular renders seria melhor
21. **Globais `window._importData`/`_bhImportEntries`** — usar variáveis modulares
22. **Migração `weave:` → `fiopulse:` no localStorage** (`firebase.js:1131`) pode ser removida em 1-2 sprints
23. **Service Worker `sw.js` sem versionamento** — update pode ficar cacheado
24. **`db.collection("ocorrencias").get()` sem limit** (`firebase.js:1417`) — após 1000 docs custo Firestore linear
25. **`renderTipos()`/`renderUsuarios()` (`app.js:3888`, `:4124`)** — funções não usadas, só as variantes `*Into("#config-content")` rodam

---

## ✅ Achados que foram FALSOS ALARMES

- **firebase.config.js commitado no Git**: o agent reportou mas é FALSO — só o `.example.js` está no Git. Confirmado via `git ls-files`.
- **Login demo bypass em produção**: parcialmente verdade. Em modo demo (sem `FIREBASE_CONFIG`) a senha vem de `data.js`/localStorage. MAS em produção o `installFirebase()` sobrescreve `window.login` antes do user interagir. Risco real só se Firebase falhar ao carregar — falback pra demo modo nesse caso. **Recomendação P1**: bloquear demo se `FIREBASE_CONFIG` definido mas falhou.

---

## 📊 Métricas

| Métrica | Valor |
|---|---|
| Linhas JS total | 6,449 (app.js 4394 + firebase.js 1469 + google-drive.js 306 + data.js 280) |
| Linhas CSS | 1,791 |
| Funções declaradas em app.js | ~113 |
| Funções dead/não chamadas | ≥6 confirmadas |
| `console.*` count | 47 (11 app.js + 29 firebase.js + 7 google-drive.js) |
| `try/catch` engolidores silenciosos | 6 firebase.js + 1 app.js |
| `addEventListener` / `removeEventListener` | 104 / 0 |
| Duplicação app.js ↔ firebase.js | ~14% do JS (~600-800 linhas) |
| First-load JS estimado | ~244KB próprio + ~250KB Firebase CDN |
| First-load CSS | 37KB |
| Lighthouse a11y estimado | ~65/100 |

---

## 🎯 Plano de ataque recomendado

**Sprint 1 (P0 — antes de subir pra todos os 60 funcionários da Fiobras):**
1. escapeHtml + aplicar em todos os interpolados
2. defer nos scripts
3. limpar PII dos logs
4. fix do listener órfão no signOut

**Sprint 2 (limpeza + UX):**
5. remover dead code (mock colab ~185 linhas JS+CSS)
6. fix `.active` → `.ativo`
7. focus-visible + touch targets 44px
8. debounce nos search
9. trimmar Poppins weights
10. deletar HTML órfãos
11. validação CNPJ

**Sprint 3 (refator estrutural):**
12. Refatorar duplicação app.js ↔ firebase.js (hook `persistFn`)
13. Granular renders (preservar scroll/foco)
14. Service Worker versionado
15. Modal estilizado pra confirmações destrutivas

---

*Auditoria gerada via 2 sub-agents (general-purpose) + validação manual.
Total: ~270K tokens, ~9 minutos de análise.*
