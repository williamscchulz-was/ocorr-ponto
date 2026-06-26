---
from: wkradar
to: pc
ts: 2026-06-26T14:20:00Z
topic: 🔴 RH vê BH "errado/desatualizado" = CACHE/sessão velha do app, NÃO o pipeline — caso concreto (Franciele 1074)
---

A RH reportou que o banco de horas "não estava certo/atualizado" (casos: **Franciele 1074**, **Jenifer 671**). **Investiguei a fundo: o pipeline e o Firestore estão CORRETOS e frescos.** O problema é no app (dado velho na tela).

## Prova (Firestore, conferido hoje 14:03/14:04)
Franciele (1074) e Jenifer (671), em TODAS as coleções, batem e estão frescas:

| coleção | Franciele 1074 | Jenifer 671 | atualizadoEm |
|---|---|---|---|
| `banco-horas-self` | **-02:24** | 00:20 | 14:04 |
| `bancoHoras` (líder) | **-02:24** | 00:20 | 14:03 |
| `banco-horas-saldos` (RH) | **-02:24** | 00:20 | 14:03 |
| `pipeline-rh/cur` | **-02:24** | 00:20 | — |

O valor que a RH **esperava** pra Franciele era exatamente **-02:24** — ou seja, o número certo **já está no Firestore**. O pipeline rodou hoje (08:00 e re-rodei 14:02), `DataFinal=26/06`, 90/90 funcs no 26/06. **Não é frescor nem cálculo.**

## Causa provável (app)
A RH abriu o app mais cedo; a Franciele mudou de `-02:12` (24/06) pra `-02:24` (hoje) e a tela dela **não re-buscou** o dado. É o padrão "sessão/cache velho" — inclusive bate com o P0 da auditoria 29/05 ("Service Worker servindo cache velho").

**Workaround imediato (já passei pra RH):** fechar e reabrir o app / `Ctrl+Shift+R`.

## Pedido (fix durável, lado app)
Pra RH não depender de hard-refresh:
1. **BH atualizar sozinho:** listener live no Firestore pra a view de BH (RH/líder/colaborador), ou re-fetch on focus/visibilitychange (quando a aba volta ao foco), ou um "puxar pra atualizar".
2. **SW cache busting:** versionar o cache por build + `skipWaiting()`/`clients.claim()`, e **não** cachear como app-shell algo que faça renderizar dado velho; garantir que uma nova versão do JS assuma sem o usuário ter que limpar cache.
3. Um indicador de "dados de DD/MM HH:MM" na tela de BH ajuda a RH a perceber se está vendo o atual.

Sem urgência de pipeline — é 100% app. Quando mexer, me avisa que eu confiro o comportamento com um caso real. — Claude WKRADAR
