# Auditoria Completa — FioPulse · 2026-05-29

> Auditoria de **segurança + UX/design/acessibilidade + qualidade de código**, feita por 3 auditores em paralelo (Claude WKRADAR). Cobre o estado do app após adições recentes (chat `mensagens`, role `supervisor`, cadastro enriquecido).
>
> **Escopo:** `public/app.js` (~6000 ln), `public/firebase.js` (~1700 ln), `public/data.js`, `public/sw.js`, `public/styles.css`, `public/index.html`, `docs/firestore.rules`.
>
> **Dono dos fixes:** quase tudo é app/rules → **Claude PC** (que deploya). Itens de pipeline marcados como `[WKRADAR]`.

---

## ✅ Já corrigido (auditoria anterior 2026-05-24 — confirmado OK)

- PII isolada: `banco-horas-saldos`/`banco-horas`/`pipeline-rh` → read admin+RH, write false. `lerSaldoSensivel` revalida no client.
- Escalada de privilégio bloqueada: self-update em `users` só `fotoBase64` (`affectedKeys().hasOnly`).
- `escapeHtml` aplicado em ~80 sinks de innerHTML. Listener PJ órfão tratado.

---

## 🔴 P0 — Crítico (corrigir já)

### S1. XSS armazenado via `toast()` — `app.js:257` + `:574`
`toast(msg)` faz `innerHTML = ...<span>${msg}</span>` **sem escapar**. A linha 574 passa `toast(\`Aniversário hoje: ${nomes}\`)` com `nomes` de `f.nome` (Firestore, editável por RH e vindo do CSV/pipeline). Nome `<img src=x onerror=...>` executa script em toda sessão.
**Fix:** escapar dentro do toast — `<span>${escapeHtml(msg)}</span>` na linha 257. Um ponto cobre os ~14 callers.
**Bônus [WKRADAR]:** posso sanitizar `nome` no pipeline (strip de `<>`) como defesa em profundidade — secundário ao fix do app.

### C1. Service Worker serve versão velha de cache — `sw.js:12`
`CACHE = "fiopulse-v3"` é estático e nunca muda em deploy. HTML é network-first (ok), mas no offline/falha de rede o fallback serve HTML antigo → assets `?v=N` velhos vêm do cache-first eternamente, e assets antigos nunca são purgados (`activate` só apaga caches com nome != CACHE, que não muda).
**Fix:** derivar nome do cache da versão de build (`fiopulse-${BUILD}`) e bumpar a cada deploy, ou stale-while-revalidate com limpeza de `?v=` órfãos. Mínimo: bumpar `CACHE` junto com o `?v=`.

### U1. Toasts não anunciados por leitor de tela — `index.html:138` + `app.js:254`
`#toast-root` e `.toast` sem `role`/`aria-live`. Erros/confirmações invisíveis pra quem usa leitor de tela.
**Fix:** `#toast-root` → `aria-live="polite" aria-atomic="false"`; toast `danger` → `role="alert"`/`aria-live="assertive"`.

### U2. `confirm()` nativo em exclusão destrutiva — `app.js:1865`
Exclusão "DEFINITIVA" de ocorrência usa `window.confirm()` — quebra a identidade visual e pode ser suprimido em PWA standalone.
**Fix:** modal `.btn--danger` consistente com o resto do app.

### U3. Sem tratamento de falha de rede — `app.js:5948` (login) + escritas
`catch` do login só faz `console.error` — usuário vê o botão voltar a "Entrar" sem mensagem. Sem detecção de `navigator.onLine`.
**Fix:** `toast("Sem conexão. Tente novamente.", "danger")` + popular `#login-error` nos catches.

---

## 🟡 P1 — Importante

### S2. `mensagens.create` não valida `parKey`/`para` — `firestore.rules:107-113`
Exige `parKey is string` mas não força `parKey == [de,para].sort().join` nem que `para` seja uid real. Permite forjar `deNome`/spam em parKey arbitrário.
**Fix:** na rule, validar `parKey` derivado de `[auth.uid, para]` ordenado; UI sempre usa nome de `/users` (ignora `deNome` do payload).

### S3. Supervisor lê `bancoHoras` INTEIRO — vaza saldo fora do escopo — `rules:84` + `firebase.js:1686`
`read: ...|| isSupervisor()` libera todos os docs; o filtro por `funcionariosVisiveis` é **só client-side**. No DevTools, supervisor vê saldo de todos. (Não é PII, mas é dado sensível.)
**Fix:** escopar server-side — rule `resource.id in userDoc().funcionariosVisiveis` + query `where(documentId(),'in',visiveis)` (limite 30/in → batch), ou mover leitura pra Cloud Function/Admin SDK.

### S4. Supervisor lê TODAS as ocorrências — `rules:36-39`
`podeVerOcorrencia` retorna true pra qualquer supervisor (sem `supervisorVe`). Write já está escopado; o read não. Mesmo vazamento client-side do S3.
**Fix:** escopar read server-side ou aceitar formalmente "supervisor = leitor global de ocorrências" (documentar).

### U4. Modal sem focus trap nem `aria-labelledby` — `app.js:268`
`role="dialog" aria-modal` existe, mas foco não entra/aprisiona e não há `aria-labelledby`.
**Fix:** `id` no `<h2>` + `aria-labelledby`; mover foco ao 1º campo; ciclar Tab dentro do modal.

### U5. Avatar/foto sem alt — `app.js:338-352`, `:652`
Foto via `background-image` em `.avatar` — mudo pra leitor de tela.
**Fix:** `role="img"` + `aria-label="Foto de <nome>"`.

### U6. Bottom-nav estoura com 6+ itens — `app.js:950-983`
Admin/RH: Ocorrências, Banco, Mensagens, Equipe, Ajustes, Conta + FAB numa barra flutuante. Em ~360px fica apertado.
**Fix:** validar em 360px; agrupar "Ajustes/Conta" em "Mais".

### U7. Contraste de texto muted abaixo de AA — `styles.css:31`
`--text-muted:#5D7858` ≈ 4.0:1 sobre branco (< 4.5:1). Usado em subtítulos, hints, preview de chat (12px).
**Fix:** escurecer pra ~`#4A6245`.

### C2. `marcarConversaLida`: índice composto + loop de re-render — `firebase.js:1246`
Query 3 campos (`parKey`+`para`+`lido==false`) precisa índice composto; sem ele rejeita silencioso. E roda a cada snapshot → marca lido → listener global re-dispara → re-render.
**Fix:** confirmar índice em produção; tratar erro visível; evitar re-marcar em loop.

### C3. Listeners `window` do crop de foto vazam — `app.js:464-469`
`mousemove/up/touchmove/end` em `window` nunca removidos no `closeModal` (`:294`). Cada foto aberta vaza 4 listeners.
**Fix:** `AbortController` com signal, ou remover refs no confirm/cancel.

### C4. Chat reconstrói thread inteira a cada msg — `app.js:5788`
`thread.innerHTML = ...` recria o composer, rouba scroll/foco de quem lê histórico.
**Fix:** append incremental de balões; auto-scroll só se já estava no fim.

### C5. Boot lê coleções inteiras sem paginação — `firebase.js:1607-1733`
`ocorrencias` sem `limit` (cresce sem teto), supervisor lê `bancoHoras` inteiro. Centenas/milhares de reads por login conforme histórico cresce.
**Fix:** `limit()` em ocorrências (ex. 90 dias/500 docs) + "carregar mais".

### C6. `ocorrencias`/funcionarios sem listener realtime — stale data
Lidos 1× no boot; só mutam local após escrita do próprio user. Mudança de outro user só aparece após refresh. (Chat/presence têm onSnapshot; o core não.)
**Fix:** avaliar `onSnapshot` ao menos em ocorrências.

---

## 🟢 P2 — Polimento

- **S5.** `presence` write sem validar conteúdo (`rules:98`) — validar `role in [...]`, `nome size<100`.
- **S6.** `console.error(err)` com dados do Firestore (`firebase.js` vários) — usar `debug?.()` em prod.
- **U8.** `outline:none` global (`styles.css:482`) — confirmar que foco programático (modal) mostra anel.
- **U9.** Empty states sem botão de ação onde faria sentido (`app.js:1399`, `2801`) — "Limpar filtros".
- **U10.** `type="number"` em valores monetários (`app.js:3374`, `4240`) — usar `inputmode="decimal"`.
- **U11.** Marcação de campo obrigatório inconsistente (`app.js:2578`) — padronizar + `aria-required`.
- **U12.** `manifest` sem ícone `maskable` (`manifest.webmanifest:11`) — adicionar variante.
- **U13.** Hint de presença diz "(mock)" (`index.html:120`) — remover.
- **C7.** Dead code: dois `tsToDateStr` com semânticas opostas (`app.js:107` vs `firebase.js:1736`); comentário `presenceColor` "MOCK" enganoso (`app.js:636`); `store.reset` lista só 3 coleções, deixa órfãos.
- **C8.** `renderChatLista` re-renderiza lista inteira a cada msg (`firebase.js:1237`) — ok no volume atual.

---

## Resumo

| Severidade | Qtd | Destaques |
|---|---|---|
| P0 | 5 | XSS no toast, SW cache velho, a11y de toast, confirm() nativo, falha de rede |
| P1 | 11 | rules de chat/supervisor, focus trap, contraste, índice de chat, leaks, paginação, realtime |
| P2 | 10 | validações, dead code, polish |

**Pontos fortes:** PII bem isolada, escapeHtml difundido, touch targets 44px, focus-visible, empty states contextuais, modal não fecha em clique acidental.

Ver [HISTORICO-DECISOES.md](./HISTORICO-DECISOES.md) e [WKRADAR-PLAYBOOK.md](./WKRADAR-PLAYBOOK.md).
