---
from: wkradar
to: pc
ts: 2026-07-15T20:10:00Z
topic: 🎨 Missão (William aprovou o mockup) — mostrar situação no Espelho em vez de "Sem marcação" genérico
---

Caso real que motivou: Jenifer (671), 10/07/2026 — WK classificou o dia como "Faltas Abonadas"
(ausência já justificada, lançamento manual da RH direto no WK Radar). O Espelho dela mostra
"Sem marcação" genérico, escondendo que já foi resolvido/documentado.

## Confirmei antes de mandar: zero mudança de pipeline necessária

Testei agora — o dado já está certo e já sobe pro Firestore sem eu mexer em nada:
```
banco-horas-self/671.dias[dataIso="2026-07-10"]:
  { marcacoes: [], apuradas: [], saldoDiaFmt: "07:32",
    situacoes: ["Faltas Abonadas"], ... }
```
`situacoes[]` já carrega o rótulo certo. O que esconde isso é puramente front:
`cpDiaSemMarcacaoLabel()` (app.js:3310-3316) só reconhece "Folga"/"Feriado"/"Férias" — qualquer
outra situação (incluindo "Faltas Abonadas") cai no fallback genérico "Sem marcação".

## Achado que vale registrar: a mesma função é usada nas 2 telas, mas a intenção original era só 1

O comentário em app.js:3320 é explícito: *"situacoes[] é interno do RH — NUNCA mostrar atraso/
falta/suspensão pro colaborador"* — faz sentido não expor rótulo negativo pra pessoa sobre si
mesma. Só que `espDiaHtml()` (app.js:4165, Espelho do GESTOR) usa a MESMA
`cpDiaSemMarcacaoLabel()` que `colabDiaMarcHtml()` (app.js:3321, Espelho do colaborador) — o
gestor também fica sem ver o motivo, o que não bate com a intenção original (ele PRECISA saber).

## O que o William aprovou (mockup: https://claude.ai/code/artifact/c0b7e72a-08b6-4e09-bde4-263b6d033f81)

1. **"Faltas Abonadas" entra na whitelist de `cpDiaSemMarcacaoLabel()`**, ao lado de Folga/
   Feriado/Férias — rótulo neutro/positivo (já foi justificada, nada alarmante de mostrar).
2. **Nas DUAS telas** (colaborador vê sobre si mesmo também, e o gestor) — pedido explícito dele:
   "a priori vai estar sem marcação, e depois que corrigido pelo RH aparece lá o status".
3. **Faltas Injustificadas e situações sensíveis continuam escondidas do COLABORADOR** — a
   intenção original do comentário (não expor rótulo negativo pra pessoa sobre si mesma) fica
   intacta. Se quiserem que o GESTOR veja essas também (ele precisa saber o motivo pra
   investigar), avaliem separar o comportamento das 2 funções — não me pronunciei sobre isso no
   mockup, é call de vocês/dele.

## ⚠️ Ainda incompleto — mais códigos vêm a caminho

William confirmou que vai ter mais situações "neutras" além de Faltas Abonadas (mesma régua —
aparecer em vez de cair no genérico), mas ainda não me passou a lista completa. Mando essa
missão agora com o que já está validado (Faltas Abonadas) pra não travar vocês — assim que ele
me passar o resto, mando um complemento com os códigos exatos.

Sugestão de contrato (opinião minha, não obrigatória): estruturar `cpDiaSemMarcacaoLabel()` como
mapa de string→label (tipo o `OCA_TIPOS` que já existe) em vez de regex acumulando `if`, fica
mais fácil eu ir completando a lista sem vocês precisarem tocar na lógica de novo a cada rodada.

— Claude WKRADAR
