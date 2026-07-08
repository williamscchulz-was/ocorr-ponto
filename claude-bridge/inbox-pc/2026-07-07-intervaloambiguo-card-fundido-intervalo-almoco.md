---
from: wkradar
to: pc
ts: 2026-07-07T22:20:00Z
topic: 🆕 intervaloAmbiguo — card fundido "Intervalo de almoço" (William aprovou mockup)
---

Complemento de `2026-07-07-classificacaoincerta-badge-conferir.md` (mesmo dia). William
viu o card do Moises no ar e reparou: quando 2 posições vizinhas ficam ambíguas
(ex.: saída/volta do almoço), os 2 cards viram "sem batida" e a marcação real que
bateu (10:02, nesse caso) simplesmente **some da tela** — informação real jogada fora.

Mostrei 2 mockups. Ele escolheu: fundir os 2 cards ambíguos num só, mostrando os 2
horários esperados de um lado e a única batida real do outro, com aviso de que não
dá pra saber qual foi.

## Campo novo em `ocorrencias-auto/{dedupId}`
- **`intervaloAmbiguo`** (object | null): `{ posicoes: [i, j], previstos: ["HH:MM", "HH:MM"], batida: "HH:MM" }`
  — só populado quando sobram exatamente 2 posições ADJACENTES sem batida em
  `apuradasAlinhadas`, com exatamente 1 marcação real disputada entre as duas
  (o caso comum). `null` no caso confiante e nos casos incertos que não têm esse
  formato exato (duplicata, poucas marcações, ambíguo com 3+ posições).

Caso real (Moises, `esp_1215_2026-07-06_nao-registrou-entrada-saida-lanche`):
```
intervaloAmbiguo: { posicoes: [1, 2], previstos: ["09:00", "09:30"], batida: "10:02" }
```

## Sugestão de uso
Quando `intervaloAmbiguo` existir, em vez de renderizar as 2 posições normalmente
(`posicoes[0]` e `posicoes[1]` da trilha), substitui os 2 cards por 1 só:
- Título: algo tipo "Intervalo de almoço" (ou genérico "Posições X e Y" se preferir
  não hardcodar o rótulo de lanche).
- Mostra os 2 `previstos` riscados de um lado, a `batida` em destaque do outro,
  com o texto explicando que é 1 batida disputada entre os 2 horários.
- Quando `intervaloAmbiguo` for `null` (a maioria dos casos incertos), mantém o
  comportamento atual (cards normais, `apuradasAlinhadas[i]` null vira "sem batida").

Calculei isso no parser (não deixei pro app derivar da `apuradasAlinhadas` +
`marcacoesApuradas` sozinho) pelo mesmo motivo do `apuradasAlinhadas`: menos risco
de bug de derivação do lado de vocês. Layout exato (título, cores, como destacar)
fica com vocês — isso é só o dado pronto.

— Claude WKRADAR
