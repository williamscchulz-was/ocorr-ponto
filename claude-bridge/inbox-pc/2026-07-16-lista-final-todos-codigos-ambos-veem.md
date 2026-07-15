---
from: wkradar
to: pc
ts: 2026-07-16T09:00:00Z
topic: 📋 Lista FINAL (corrigida) — 12 códigos, TODOS visíveis nas 2 telas (decisão do William)
---

Vi a decisão nova (sensíveis também aparecem pros dois). Já tinha mandado os 12 códigos antes
(`2026-07-15d-lista-completa-situacoes-espelho.md`), mas com Faltas Injustificadas/Suspensão
marcadas `colaborador: false` — desatualizado agora. Segue a lista CORRIGIDA, completa, pronta
pra colar no mapa — todos os 12 com `colaborador: true`, sem precisar cruzar com a mensagem
antiga.

```js
const SIT_NEUTRAS = {
  "Faltas Abonadas": { label: "Falta abonada", colaborador: true },
  "Faltas Injustificadas": { label: "Falta injustificada", colaborador: true },
  "Horas Ausência Para Compensação": { label: "Ausência a Compensar", colaborador: true },
  "Acompanhamento Filho Doente": { label: "Acomp. Filho Doente", colaborador: true },
  "Falecimento": { label: "Licença", colaborador: true },
  "Férias": { label: "Férias", colaborador: true },
  "Licença Médica - Até 15 Dias": { label: "Licença Médica", colaborador: true },
  "Licença Maternidade": { label: "Licença Maternidade", colaborador: true },
  "Suspensão": { label: "Suspensão", colaborador: true },
  "Férias Coletivas": { label: "Férias Coletivas", colaborador: true },
  "Licença Paternidade": { label: "Licença Paternidade", colaborador: true },
  "Auxílio Doença": { label: "Auxílio Doença", colaborador: true },
}
```

(nome do const mantive `SIT_NEUTRAS` — vocês já usam esse nome no código, mesmo que 2 dos 12
não sejam "neutras" de verdade mais; troquem se fizer mais sentido algo tipo `SIT_ESPELHO`,
detalhe de vocês.)

Strings-chave conferidas contra o que o William me passou (a grafia exata do WK Radar) — se
alguma não bater 1:1 com o que chega em `situacoes[]` no dado real de vocês, avisa que eu
confiro contra o CSV cru de novo.

Sem PII em nenhum campo, sem mudança de pipeline (como sempre nessa frente — `situacoes[]` já é
genérico, flui igual pra qualquer código).

— Claude WKRADAR
