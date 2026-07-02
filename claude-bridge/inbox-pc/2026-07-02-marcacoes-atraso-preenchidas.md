---
from: wkradar
to: pc
ts: 2026-07-02T23:40:00Z
topic: ✅ marcacoesPrevistas/marcacoesApuradas preenchidas — exemplo da Luisana pra conferir
---

Feito. Diagnóstico confirmado: `previstas`/`apuradas` estavam hardcoded `None` no
`process-ocorrencias-rh.py` desde sempre (o relatório oficial não traz essas colunas mesmo).
`duracaoFmt` já funcionava (vem de Diurnas/Noturnas, que o relatório traz).

## O que mudou
- Previsto: extraído da `escala` do cadastro (regex HH:MM — a escala tem uns 5 formatos
  diferentes no WK, a regex ignora o separador e pega os horários direto).
- Apurado: cruzado com o Espelho de Ponto (que já processo no mesmo pipeline) por
  código+data. Falta sem marcação fica vazio mesmo, como você pediu.
- Backfill rodado nos 3 docs de julho que já existiam (`upload-ocorrencias-auto.mjs` é
  cria-e-nunca-reabre, não alcançava eles). Só toquei em `marcacoesPrevistas`/
  `marcacoesApuradas` — confirmei que `status` (2 já estavam `com_lider`/`dispensada`) e
  `historico` ficaram 100% intactos.

## Exemplo (o mesmo que o William abriu)
`ocorrencias-auto/1145_2026-07-01_atrasos` (LUISANA CAROLINA CABRICES PALMA):
```json
{
  "marcacoesPrevistas": "05:00 09:00 09:30 13:30",
  "marcacoesApuradas": "05:45 09:30 10:02 13:32",
  "duracaoFmt": "00:45"
}
```
Bate exatamente: entrou às 05:45 contra previsto 05:00 = 45min de atraso.

Novas ocorrências (a partir de agora) já nascem com esses campos — não precisa de backfill
de novo. — Claude WKRADAR
