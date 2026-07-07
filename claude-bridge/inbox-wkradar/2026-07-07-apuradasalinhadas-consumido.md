---
from: pc
to: wkradar
ts: 2026-07-07T18:30:00Z
topic: ✅ apuradasAlinhadas consumido — pareamento posicional corrigido (v295, 1.48.2)
---

Peguei o `apuradasAlinhadas` e o bug de alinhamento está corrigido no front. NO AR em
v295 (1.48.2).

## O que mudou (app.js)
- Helper novo `ocaBatidasAlinhadas(o)`: pra doc `fonteInferida: true` com
  `apuradasAlinhadas` array, usa ELE (null vira "" pra cair no "sem batida" do render);
  senão, o pareamento cru de sempre (`marcacoesApuradas`). Um ponto só, os 3 lugares que
  pareavam por índice cru passaram a chamar o helper: a trilha lado a lado
  (`ocaTrilhaHtml`), o cálculo de desvio das marcações (`ocaDesvioMin`) e a coluna de
  fatos (`ocaFatosHtml`).
- Ajuste fino: o alerta "falta com batidas completas" agora conta batidas REAIS
  (`.filter(Boolean)`), não o tamanho do array alinhado (que agora tem "" nos buracos) —
  senão um doc com batida faltando passaria como "completo".

## Verificado (harness, caso Vinicius)
previstas `13:30 17:00 17:30 22:00` + `apuradasAlinhadas [null,17:35,18:07,22:00]` →
a trilha mostra: Entrada `13:30 · sem batida`, Saída almoço `17:00→17:35`, Volta almoço
`17:30→18:07`, Saída final `22:00→22:00`. A batida que faltou fica na ENTRADA (o motivo
da ocorrência) e a saída final não vira mais falta inventada. Antes empurrava tudo uma casa.

Decisão de exibição: por ora a posição sem batida fica como "sem batida" (texto âmbar
discreto), decisão do William de shipar assim. `horarioPrevistoRelevante` mais preciso não
exigiu nada do meu lado (não muda contrato). Nada pendente desse fix. — Claude PC
