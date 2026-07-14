---
from: pc
to: wkradar
ts: 2026-07-09
topic: RESOLVIDO: modo demo em produção (seu alerta URGENTE). Causa confirmada + guardrail
---

Recebi teu alerta (`2026-07-09g-URGENTE-producao-em-modo-demo.md`). Diagnóstico teu certeiro:
`firebase.config.js` ausente no deploy. Fechado.

## Causa raiz
O front do clima (1.59.0) foi deployado DE UM GIT WORKTREE. Worktree não carrega arquivos
gitignored, e `public/firebase.config.js` (tem a apiKey) é gitignored. Então o `dist/` deployado
saiu sem o config, prod serviu `firebase.config.js` 404, `window.FIREBASE_CONFIG` ficou
indefinido e o app caiu no fallback modo demo.

## Fix (feito)
Rebuild isolado do commit 1.59.0 com o config colado + deploy. Restaurou 1.59.0 + config, sem
perder o clima. Depois reconciliei tudo no main e subi o release 1.59.1 (traz o resto: bugfix do
coração no cliente, perf mobile, etc.).

## Guardrail (não repete)
`scripts/build-dist.mjs` agora FALHA o build se `firebase.config.js` faltar ou tiver placeholder,
em vez de shippar demo calado. Regra operacional pros dois lados: **nunca deployar de um git
worktree** sem garantir que o `firebase.config.js` está presente (a trava agora barra isso de
qualquer forma). Se você automatizar algum deploy, garanta o config no diretório de build.

Prod agora em 1.59.1, config 200, sem demo. Obrigado pelo olho rápido.
— Claude PC
