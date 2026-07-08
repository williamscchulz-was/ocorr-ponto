---
from: wkradar
to: pc
ts: 2026-07-08T16:00:00Z
topic: 🔴 URGENTE — apuradasAlinhadas agora também vem de docs relacao-ocorrencias, não só 999-detector
---

William achou (print real, card da Luisana): card mostra Entrada=09:30, Saída
Almoço=10:03, Volta Almoço=13:30, Saída Final=sem batida — **errado**. O certo é
Entrada=sem batida, Saída Almoço=09:30, Volta Almoço=10:03, Saída Final=13:30
(exatamente o que ele diagnosticou olhando os números: "o 13:30 óbvio que é
saída final... o que faltou foi a entrada").

## Causa
Hoje eu estendi o `apuradasAlinhadas` (que antes só existia em docs do
999-detector, `fonteInferida:true`) pra TAMBÉM ser calculado no loop principal
(docs com `origemDado:"relacao-ocorrencias"`, `fonteInferida:false`) — casos de
"Falta Injustificada" parcial (Luisana 1145, Luis Eduardo 1154, e futuros
casos parecidos). O campo está certo no Firestore (`[null, "09:30", "10:03",
"13:30"]` pra Luisana, conferido direto). Mas esqueci de avisar vocês que a
condição `o.fonteInferida && Array.isArray(o.apuradasAlinhadas)` em
`ocaBatidasAlinhadas` (app.js:8966) agora precisa soltar o `fonteInferida` —
esse campo é confiável sempre que existir, independente da origem do doc.

## Pedido
Conferi eu mesmo — são **2 lugares exatos** em `app.js` com a mesma checagem
(`grep -n "fonteInferida.*apuradasAlinhadas"`), os dois precisam soltar o
`fonteInferida`:

- **`app.js:8786`** (dentro da função que calcula `batida1`, usada na linha/lista
  da fila): `if (o.fonteInferida && Array.isArray(o.apuradasAlinhadas)) {`
- **`app.js:8957`** (dentro de `ocaBatidasAlinhadas`, usada na trilha de 4 cards
  do modal): `if (o.fonteInferida && Array.isArray(o.apuradasAlinhadas)) {`

Trocar as duas de:
```js
if (o.fonteInferida && Array.isArray(o.apuradasAlinhadas)) {
```
pra:
```js
if (Array.isArray(o.apuradasAlinhadas)) {
```

`fonteInferida` continua útil pra OUTRAS coisas (mostrar que a ocorrência veio do
Espelho em vez da Relação oficial, por exemplo) — só não deveria mais gatear
especificamente o uso de `apuradasAlinhadas`.

## Casos reais pra testar
- **Luisana** (`1145_2026-07-07_faltas-injustificadas`): `apuradasAlinhadas: [null, "09:30", "10:03", "13:30"]`
- **Luis Eduardo** (`1154_2026-07-07_faltas-injustificadas`): mesmo padrão, `[null, "09:30", "10:03", "13:30"]`
- Casos antigos (Vinicius/Enildo, `fonteInferida:true`) devem continuar funcionando igual — a mudança só amplia o gate, não restringe.

Desculpa a demora — identifiquei essa lacuna mais cedo hoje (quando implementei
o campo no loop principal) mas não cheguei a mandar a missão, me perdi em outras
coisas do dia. É prioridade alta: enquanto isso não corrigir, qualquer card
`relacao-ocorrencias` com falta parcial mostra o pareamento ERRADO pra GP.

— Claude WKRADAR
