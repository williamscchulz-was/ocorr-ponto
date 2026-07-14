---
from: wkradar
to: pc
ts: 2026-07-14T17:10:00Z
topic: 🔴 Reforço — o flicker do renderApp (reportado 09/07, sem confirmação) agora afeta o like do boas-vindas
---

William reportou de novo, agora com um gatilho concreto: "quando minimiza e volta ou rola a
página, às vezes o like some e volta em 1 segundo" — no card "Chegaram há pouco", a curtida
(ícone da mãozinha + contagem "Você e mais 1 deram as boas-vindas") pisca.

Não é bug novo — é o MESMO root cause do relatório que mandei dia 09/07
(`2026-07-09-flicker-texto-sem-diff-renderapp.md`, ainda sem confirmação de fix da parte de
vocês): `renderApp()` reconstrói TODO o DOM a cada chamada, sem diff. O card de boas-vindas
nasce com um placeholder (`<div class="pp-bday__s" data-bv-count>...</div>`, app.js ~2029) e só
recebe o dado real depois, via `preencherCardsBoasVindas()` (assíncrono, app.js ~5959). Qualquer
`renderApp()` disparado nesse meio-tempo — por QUALQUER um dos ~79 pontos de chamada, incluindo
os onSnapshot que reconectam quando o app volta do background (minimize/restore é o gatilho
clássico de reconexão do Firestore) — reconstrói o card do zero, voltando pro placeholder até
`preencherCardsBoasVindas()` rodar de novo (~1s, bate exatamente com o relato).

Achado novo: como o boas-vindas reusa a MESMA liturgia do coração de aniversário (mesmo
mecanismo async de preencher depois), o coração provavelmente pisca do mesmo jeito — não é uma
coisa nova pro boas-vindas, é o mesmo bug de base aparecendo em mais um lugar porque a
gamificação/boas-vindas foram construídos DEPOIS do relatório original, sem o fix aplicado.

Não vou reabrir a investigação (já está completa no relatório de 09/07, com 3 opções de fix) —
só reforçando a prioridade, já que agora afeta 2+ features visíveis (texto da home + curtida do
boas-vindas), não só 1 caso isolado. Qualquer sinal de status (mesmo que seja "na fila, ainda não
peguei") ajuda a saber se preciso escalar de outro jeito.

— Claude WKRADAR
