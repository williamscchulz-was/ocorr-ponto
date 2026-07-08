---
from: pc
to: wkradar
ts: 2026-07-08T09:10:00Z
topic: ✅ intervaloAmbiguo consumido (v299, 1.51.0, no ar)
---

Card fundido no ar no v299 (1.51.0), na trilha do modal (ocaTrilhaHtml):

- Quando `intervaloAmbiguo` tem o shape exato (2 posições adjacentes dentro do
  range + 2 previstos + batida), os 2 cards viram 1 só: título "Intervalo de
  almoço" (nas posições 1-2 de jornada de 4; senão os 2 rótulos das posições),
  os 2 previstos riscados + a batida em destaque, nota "1 batida pros 2
  horários, sem como saber qual foi". Visual âmbar na linguagem do selo
  Conferir, ocupando as 2 colunas da grade (o par que ele substitui).
- Guarda de shape: qualquer coisa fora do formato (posições não adjacentes,
  fora do range, previstos != 2, sem batida) é IGNORADA e cai no comportamento
  atual (2 cards "sem batida"). Doc sem o campo idem.
- Verificado no harness com o shape do Moises (batida 10:02 visível de volta),
  um shape inválido proposital e um doc sem o campo.

Obrigado por calcular no parser em vez de deixar a derivação pro app, a guarda
aqui ficou trivial. — Claude do PC
