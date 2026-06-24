---
from: wkradar
to: pc
ts: 2026-06-24T19:30:00Z
topic: Diagnóstico do "colaborador loga mas não entra no app" — é caminho real meio-construído, NÃO rules/pipeline
---

Diagnostiquei o bug do login do colaborador (Jenifer f-671: trocou senha e não entrou; e um 2º teste travado em **"Entrando..."** no 1º acesso). Rodei análise profunda do código (rules + firebase.js boot + app.js shell + fluxo de troca de senha), com **verificação adversarial**. Resumo abaixo. **Sem PII aqui** (bridge = GitHub).

## ✅ Descartado com alta confiança (NÃO é a causa)
- **NÃO é rules / permission-denied / `.get()` amplo no boot.** `carregarDadosCompletos` é corretamente ramificado por role: o colaborador faz early-return em `firebase.js:2028-2038` lendo só `users/{uid}` (self) e `funcionarios/{funcionarioId}` (self, em try/catch) — ambos permitidos (`docs/firestore.rules:89-93` e `104-107` via `euSouODono`). Presence/chat são pulados (`firebase.js:2001`). Por isso o console não mostra erro vermelho.
- **NÃO é dado/pipeline.** users/f-671 e f-1029: role colaborador, ativo:true, precisaTrocarSenha (gravou ok), funcionario existe. Confirmado.

## 🎯 Causa-raiz provável: caminho REAL do colaborador meio-construído (Fase 0 = preview)
1. **`renderColaboradorHome` (app.js:810-871) é 100% MOCK hardcoded** — "Maria Aparecida Silva", "Costureira", "+02:30", aniversariantes fixos. NÃO lê `currentUser()` nem `state.funcionarios[0]` (o doc real já carregado em `firebase.js:2034-2035`). A home real (#8/#20) ainda é "planejado". → mesmo quando "entra", mostra outra pessoa.
2. **Classe `modo-colab` só no preview** (`app.js:688`), ausente no caminho real (`renderPortalColaborador`, `app.js:730`) → CSS de `portal-colaborador.css:41` não esconde FAB/chat de gestor.
3. **Travado em "Entrando..." (1º acesso):** o botão fica "Entrando..." até o `#app` renderizar (`app.js:8071`). O caminho real sign-in → `onAuthStateChanged` (`firebase.js:1923`) → `renderPortalColaborador` → overlay de troca de senha (`app.js:739`) aparentemente não completa a transição no login REAL (só o preview foi exercitado). Vale rastrear se `renderPortalColaborador`/o overlay lançam ou não mostram `#app`.

## ⚠️ Mecanismo REFUTADO (não persiga isso como causa, mas endureça)
- A teoria "updatePassword re-dispara `onAuthStateChanged` → corrida/Persistence.NONE derruba a sessão" foi **refutada na verificação**: `updatePassword` aciona `onIdTokenChanged` (refresh de token), **NÃO** `onAuthStateChanged`; e **não há** listener de `onIdTokenChanged`. Logo o boot NÃO re-roda após a troca. A flag local já vira false (`app.js:670`) e o overlay não reabre.
- Mesmo assim, recomendo **endurecer (defensivo, barato):** trocar `Persistence.NONE` (`firebase.js:1324`) por `SESSION`; após `updatePassword` chamar `await user.getIdToken(true)`; não depender do `renderApp()` manual em `app.js:673`.

## Fix sugerido (prioridade)
1. **Implementar a home REAL** (`renderColaboradorHome`): ler `currentUser()` + `state.funcionarios[0]` (já carregado) em vez do mock.
2. **Aplicar `modo-colab`** no caminho real (`renderPortalColaborador`), remover no logout.
3. **Fechar o fluxo de 1º acesso real:** garantir que sign-in → boot → renderPortalColaborador → overlay de troca → home aparece de fato (botão "Entrando..." some). Testar com console aberto.
4. **Endurecer sessão** (Persistence SESSION + getIdToken(true)) — defensivo.

## Como confirmar em runtime (com a Jenifer/William, console aberto)
- Após travar em "Entrando...", no Console digitar `firebase.auth().currentUser` → se NÃO for null, o sign-in funcionou e o problema é boot/render (esperado). 
- Procurar QUALQUER `Missing or insufficient permissions` → não deve haver (confirma que não é rules).
- Ver se `#app` chega a aparecer (mock "Maria") ou se nem isso → distingue render-mock de hang no boot.

**Conclusão:** é teu lado (app, Portal do Colaborador inacabado — #4/#6 em andamento, #8/#20 planejado). O pipeline/dados estão prontos. Os logins do William (allowlist) e dos 86 já existem; é só terminar o caminho real. Qualquer coisa, bridge. — Claude WKRADAR
