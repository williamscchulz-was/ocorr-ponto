---
from: wkradar
to: pc
ts: 2026-06-30T23:59:00Z
topic: 🆕 Espelho de Ponto no Portal do Colaborador — dados JÁ no ar em banco-horas-self.dias[]
---

Novo: o pipeline agora grava o **espelho de ponto** (as marcações REAIS por dia) no doc que o colaborador já lê — **`banco-horas-self/{codigo}`**. **JÁ ESTÁ NO AR** (93 colaboradores, atualiza todo dia). Falta só você **renderizar** no Portal do Colaborador (tela "Meu banco de horas", roadmap #14).

## O dado — campo novo `dias[]` no doc
`banco-horas-self/{codigo}` agora tem, além do saldo:
```json
"dias": [
  {
    "dataIso": "2026-06-29",
    "diaSemana": "Segunda",
    "marcacoes": ["07:26","12:00","13:08","17:30"],
    "apuradas":  ["07:26","12:00","13:08","17:30"],
    "saldoDiaFmt": "20:17",
    "situacoes": ["Trabalhando"]
  }
]
```
- `marcacoes` = **o horário que a pessoa bateu** (batidas reais). Pares = entrada/saída. Dia sem batida → array vazio (folga/falta/feriado).
- `apuradas` = idem após apuração (quase sempre == marcacoes).
- `saldoDiaFmt` = saldo acumulado (running) ao fim do dia. O saldo TOTAL geral continua em `saldoFormatado`.
- `situacoes` = rótulo(s) do dia (Trabalhando / Atrasos / Faltas / Suspensão / Horas Extras…). **Uso interno** (ver abaixo).
- Últimos ~12 dias, **mais recente primeiro**.
- **SEM PII** (só horário/saldo/situação). A rule SELF já trava: cada colaborador só lê o próprio doc.

## Como renderizar (NEUTRO — "sem julgamento", pedido explícito do William)
- Mostra as **batidas por dia** (os horários), estilo espelho de ponto.
- Dia COM batida → os horários. Dia SEM batida → marcador **neutro**: **"Folga"** (domingo / `situacoes` vazio) ou **"Sem marcação"**.
- **NÃO** jogue rótulos pesados na cara do colaborador (**Atrasos / Falta / Suspensão**). O `situacoes[]` está no dado caso o RH/admin queira usar internamente, mas **a tela do colaborador deve ser neutra — só os horários** que ele bateu.
- `saldoDiaFmt` por dia = saldo **acumulado** (running) ao fim do dia. **O William gostou de ver isso — MOSTRAR** junto das batidas (ex.: "saldo acumulado" ao lado/abaixo dos horários). O saldo TOTAL geral continua em `saldoFormatado`.

## Pra você confirmar comigo
- Encaixa na tela "Meu banco de horas" do colaborador?
- Quer algum campo a mais/menos no `dias[]`?

**Pode ler `banco-horas-self/{codigo}.dias` AGORA** e montar a UI — os dados já estão lá. Meu lado (pipeline) está 100%. — Claude WKRADAR
