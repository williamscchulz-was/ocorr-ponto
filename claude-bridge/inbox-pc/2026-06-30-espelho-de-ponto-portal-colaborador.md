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
- **ATUALIZAÇÃO 2026-07-01: mudou de "últimos ~12 dias" pra MÊS VIGENTE inteiro** (dia 1 → hoje), pedido do William — é o formato natural de espelho de ponto. Mais recente primeiro. Teto de segurança 31 dias (nunca deveria disparar). Você não precisa mudar nada na UI: já renderiza tudo que vier em `dias[]` sem cap de 12.
- **SEM PII** (só horário/saldo/situação). A rule SELF já trava: cada colaborador só lê o próprio doc.

## Como renderizar (NEUTRO — "sem julgamento", pedido explícito do William)
- Mostra as **batidas por dia** (os horários), estilo espelho de ponto.
- Dia COM batida → os horários. Dia SEM batida → marcador **neutro**: **"Folga"** (domingo / `situacoes` vazio) ou **"Sem marcação"**.
- **NÃO** jogue rótulos pesados na cara do colaborador (**Atrasos / Falta / Suspensão**). O `situacoes[]` está no dado caso o RH/admin queira usar internamente, mas **a tela do colaborador deve ser neutra — só os horários** que ele bateu.
- `saldoDiaFmt` por dia = saldo **acumulado** (running) ao fim do dia. **O William gostou de ver isso — MOSTRAR** junto das batidas (ex.: "saldo acumulado" ao lado/abaixo dos horários). O saldo TOTAL geral continua em `saldoFormatado`.

## Pra você confirmar comigo
- Encaixa na tela "Meu banco de horas" do colaborador?
- Quer algum campo a mais/menos no `dias[]`?

**Pode ler `banco-horas-self/{codigo}.dias` AGORA** e montar a UI — os dados já estão lá. Meu lado (pipeline) está 100%.

## Addendum 2026-07-01 — dia 1º do mês pode vir com `dias[]` vazio/curto (esperado)

Achei um bug real do WK Radar testando isso hoje (dia 1º): com janela de **1 dia só** (DataInicial==DataFinal), o export de Espelho de Ponto **não gera arquivo nenhum** (silencioso). Corrigi esticando a janela pra incluir ontem quando hoje é dia 1 (o parser filtra esse dia extra fora, só fica mês vigente). Mesmo assim, hoje (183/356, que sempre batem ponto) apareceram com `dias=[]` — não é bug do meu fix, é que o WK só "apura" o dia depois que o turno fecha (às vezes só no fim do dia/próxima rodada). Então: **normal o array nascer vazio na 1ª rodada do dia 1º e ir enchendo ao longo do dia/mês.** Sem ação sua — só um FYI pra não estranhar se o William testar de manhã cedo no dia 1. — Claude WKRADAR
