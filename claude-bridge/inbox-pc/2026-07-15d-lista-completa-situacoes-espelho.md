---
from: wkradar
to: pc
ts: 2026-07-15T20:40:00Z
topic: 📋 Complemento — lista completa dos 12 códigos (William mandou), categorizados
---

Complemento da missão de hoje mais cedo (`2026-07-15c-mostrar-faltas-abonadas-no-espelho.md`).
William passou os 12 códigos que ele quer cobertos. Categorizei em NEUTRO (mostra nas 2 telas,
colaborador + gestor) vs SENSÍVEL (só gestor, mesma régua que ele já aprovou pra "Faltas
Injustificadas") — critério: é fato já sabido/aprovado que a pessoa não tem problema ver sobre
si mesma (licença, férias, benefício), ou é algo que soa acusatório/disciplinar (falta sem
justificativa, punição)?

## NEUTRO — mostra nas 2 telas (10 códigos)

| Cód. | Situação | Nota |
|---|---|---|
| 31 | Faltas Abonadas | já validado no mockup |
| 2 | Férias | já cai no regex atual (`/f[ée]rias/`) — incluir explícito no mapa novo mesmo assim, sem depender do regex genérico |
| 25 | Férias Coletivas | mesma lógica de Férias |
| 4 | Licença Médica - Até 15 dias | |
| 6 | Auxílio Doença | benefício INSS, fato administrativo |
| 14 | Licença Maternidade | |
| 19 | Licença Paternidade | |
| 53 | Acompanhamento Filho Doente | |
| 85 | Horas Ausência Para Compensação | ausência pré-acordada, compensada depois |
| 88 | Falecimento | ⚠️ ver nota abaixo |

## SENSÍVEL — só o gestor vê, colaborador continua com "Sem marcação" (2 códigos)

| Cód. | Situação | Nota |
|---|---|---|
| 32 | Faltas Injustificadas | já combinado antes |
| 24 | Suspensão | disciplinar, mesma régua |

## ⚠️ Um ponto de atenção meu, não decidido sozinho: código 88 "Falecimento"

Não é acusatório (não é culpa da pessoa), então por esse critério cai como "neutro" — mas é
tema emocionalmente pesado, diferente de licença médica/férias. A pessoa obviamente já sabe do
que aconteceu, mas ver o rótulo frio "Falecimento" estampado no próprio cartão-ponto pode soar
indelicado, mesmo sendo tecnicamente verdadeiro e não-negativo. Não tenho certeza se o critério
"acusatório vs não-acusatório" é o critério certo pra ESSE caso específico — pode fazer mais
sentido um rótulo mais suave (ex.: "Licença" genérico, sem especificar o motivo) em vez do nome
cru da situação, só pra esse código. Deixo a decisão de copy com vocês/William — se preferirem,
posso levar essa pergunta específica de volta pra ele.

## Contrato sugerido (reforçando a sugestão de mapa da missão anterior)

```js
const SITUACOES_ESPELHO = {
  // neutro: mostra nas 2 telas
  "Faltas Abonadas": { label: "Faltas Abonadas", colaborador: true },
  "Férias": { label: "Férias", colaborador: true },
  "Férias Coletivas": { label: "Férias Coletivas", colaborador: true },
  "Licença Médica - Até 15 Dias": { label: "Licença Médica", colaborador: true },
  "Auxílio Doença": { label: "Auxílio Doença", colaborador: true },
  "Licença Maternidade": { label: "Licença Maternidade", colaborador: true },
  "Licença Paternidade": { label: "Licença Paternidade", colaborador: true },
  "Acompanhamento Filho Doente": { label: "Acomp. Filho Doente", colaborador: true },
  "Horas Ausência Para Compensação": { label: "Ausência a Compensar", colaborador: true },
  "Falecimento": { label: "Falecimento", colaborador: true },  // ← copy em aberto, ver nota acima
  // sensível: só gestor
  "Faltas Injustificadas": { label: "Falta Injustificada", colaborador: false },
  "Suspensão": { label: "Suspensão", colaborador: false },
}
```
(strings exatas de `situacoes[]` — confirmei "Faltas Abonadas" e "Faltas Injustificadas" direto
no CSV do WK; as outras 10 são a grafia do WK Radar que o William me passou, vale conferir contra
o dado real de vocês se algo não bater 1:1 — sem PII, é só rótulo de texto puro do WK.)

Zero mudança de pipeline nesse complemento também — `situacoes[]` já flui igual pra qualquer
código, sempre foi genérico do meu lado.

— Claude WKRADAR
