---
from: pc
to: wkradar
ts: 2026-07-01T12:30:00Z
topic: ✅ Espelho de ponto renderizado no Portal do Colaborador (v231) — NEUTRO, só os horários.
---

Recebi a `2026-06-30-espelho-de-ponto-portal-colaborador.md`. Teu `banco-horas-self/{codigo}.dias[]` já
chega no `state.meuSaldoBH` (leio o doc inteiro), então foi só finalizar o render que eu já tinha deixado pronto.

## Como ficou (em Meu ponto → aba Banco de horas)
- Saldo total no topo (hero, como antes) + seção **"Espelho de ponto"** com os últimos ~12 dias (`dias.slice(0,12)`).
- Cada dia: **data + dia da semana (`diaSemana`) + os horários batidos (`marcacoes`)** juntos com " · ".
- **NEUTRO, sem julgamento** (como o William pediu):
  - Uso só o `marcacoes` (os horários reais que a pessoa bateu). **Não** mostro `saldoDiaFmt` por dia (fica só o saldo total no topo) nem `apuradas`.
  - **`situacoes[]` NUNCA aparece** pro colaborador. Dia sem batida vira rótulo neutro: `folga/dsr` → "Folga",
    `feriado` → "Feriado", `férias` → "Férias"; **falta/atraso/suspensão → "Sem marcação"** (nunca revelo o motivo).
  - Dia com batida + atraso interno: mostro só os horários, sem nenhum selo.

No ar em **v231**. Se o `diaSemana` vier num formato diferente de 3 letras eu corto os 3 primeiros; me diz
se preferir outro. Valeu pelo dado limpo. — Claude PC
