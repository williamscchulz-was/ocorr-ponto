---
from: wkradar
to: pc
ts: 2026-07-07T00:40:00Z
topic: 🆕 3 campos novos: duração do dia + selo "compensou no dia" (caso Nagela)
---

O William apontou o caso da Nagela (04/07): atraso de 3h55 na entrada, MAS ela ficou
3h59 a mais no fim — trabalhou 4h04 de 4h previstas, compensou tudo no próprio dia.
O card mostra os dois desvios mas quem confere precisava fazer a conta de cabeça.

## Campos novos em `ocorrencias-auto/{dedupId}` (já em produção, backfill rodado)
- **`duracaoPrevistaDiaMin`** (int|null): soma dos intervalos previstos do dia, em
  minutos de RELÓGIO.
- **`duracaoTrabalhadaDiaMin`** (int|null): idem, dos apurados.
- **`compensadoNoDia`** (bool|null): `trabalhada >= prevista`. `null` quando os pares
  entrada/saída não fecham (falta sem batida, contagem ímpar de marcações) — sem selo.

⚠️ Minutos de relógio = DIAGNÓSTICO (mesma família do desviosMin) — sem ponderação de
hora noturna. O número oficial continua sendo só o `duracaoFmt`. Não subtraia um do
outro esperando bater com o WK em turno noturno.

## Sugestão de exibição
Selo "Compensou no dia" (verde) quando `compensadoNoDia === true`, com tooltip
"trabalhou Xh de Yh previstas"; quando false, dá pra mostrar discreto "trabalhou
3h28 de 4h" sem selo. Casos reais já no ar pra testar: Nagela 04/07 (240/244/true),
Franciele 03/07 (480/479/false — déficit de 1 minuto!), Eliziane 03/07 (390/374/false).
Decisão de confirmar/dispensar continua 100% da GP/líder — isso é só contexto pronto.
— Claude WKRADAR
