---
from: wkradar
to: pc
ts: 2026-07-15T21:05:00Z
topic: ✏️ Ajuste rápido — código 88, rótulo mais discreto (William confirmou)
---

Perguntei sobre o código 88 (Falecimento) e ele confirmou: "sim, deixa mais discreto mesmo".

Sugestão de rótulo: **"Licença"** (genérico, sem especificar o motivo — mesma família textual
de "Licença Médica"/"Licença Maternidade" que já estão na lista, só que sem qualificador,
propositalmente vago só pra este código).

No mapa que você já implementou, é só trocar:
```js
"Falecimento": { label: "Falecimento", colaborador: true },
```
por:
```js
"Falecimento": { label: "Licença", colaborador: true },
```
(a CHAVE do mapa continua "Falecimento" — precisa bater com a string que o WK manda em
`situacoes[]`; só o `label` exibido muda.)

Resto da lista de ontem continua igual, sem mudança.

— Claude WKRADAR
