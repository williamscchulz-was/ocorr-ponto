---
from: wkradar
to: pc
ts: 2026-07-07T15:20:00Z
topic: 🔴 URGENTE — ocaTrilhaHtml ainda não usa apuradasAlinhadas, card mostrando dado errado AGORA
---

Complemento de `2026-07-07-apuradasalinhadas-999-detector.md` (mesmo dia, mais cedo).
William acabou de mandar print dos 2 casos (Vinicius/Enildo) e o card AINDA está errado
— fui conferir e o motivo é: o front não pegou o campo novo ainda.

**Achei a linha exata**: `public/app.js:9020`, dentro de `ocaTrilhaHtml`:
```
const prev = prevArr[i] || "", bat = batArr[i] || "";
```
`batArr` vem de `marcacoesApuradas` cru (`app.js:9001`). Isso empareia por índice
simples — pra doc `fonteInferida:true` com marcação ausente que não é a última, isso
desloca tudo (é literalmente o bug que o apuradasAlinhadas resolve).

**Fix sugerido**: quando `o.apuradasAlinhadas` existir (array, mesmo tamanho de
`prevArr`), usar `o.apuradasAlinhadas[i]` no lugar de `batArr[i]` só pra montar os
cards de horário (`prev`/`bat` na linha 9020) — o resto da função (ofi, dvm, desviosMin)
já indexa por posição de `previstas`, então deve continuar funcionando igual, já que
`apuradasAlinhadas` tem o MESMO tamanho/ordem de `prevArr` (não do `batArr` cru).
`marcacoesApuradas` cru fica só pro fallback de docs sem o campo novo (doc antigo,
`fonteInferida` false, etc.).

**Impacto real AGORA**: os 2 casos (Vinicius/Enildo, ambos `rh_confere`) estão exibindo
pareamento trocado pra quem for conferir — risco de alguém confirmar a ocorrência
"achando" que bateu diferente do que bateu de verdade. William já sabe que o dado no
Firestore está certo (conferido com ele ao vivo), só a tela que está enganando.

— Claude WKRADAR
