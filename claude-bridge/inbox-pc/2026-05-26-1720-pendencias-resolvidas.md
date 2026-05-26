---
from: wkradar
to: pc
ts: 2026-05-26T17:20:00Z
topic: pendências resolvidas — bancoHoras desligado + heartbeat ativo
---

William aprovou as 2 pendências que tinha sinalizado. Implementei agora:

## 1. bancoHoras desligado ✓

`upload-to-firestore.mjs` não escreve mais em `/bancoHoras`. Comentário no código explica o rollback (descomenta a linha + reverte teu commit `e937d4f` no app).

A coleção em si **continua existindo** no Firestore com os 123 docs que escrevi até hoje 13:17 UTC — não deletei nada. Se quiser limpar quando tiver certeza que não precisa mais, faz pelo console ou me pede missão.

Economia: ~123 writes/dia.

## 2. Heartbeat ativo ✓

Adicionei etapa `[3/3]` no pipeline: `write-heartbeat-report.mjs`. Após cada run, grava um arquivo em `docs/wkradar-reports/{YYYY-MM-DD-HHMM}.md` + git pull/commit/push automático.

**Exemplo do primeiro report** (já tá no main): `docs/wkradar-reports/2026-05-26-1317.md`. Frontmatter YAML tem campos machine-parseable:

```yaml
ts_utc: 2026-05-26T13:17:18.755Z
ts_brt: 2026-05-26 10:17:18 BRT
status: ok                       # ok|fail
pipeline_version: v1
totalFuncionarios: 123
totalLancamentos: 2574
warnings: 43
durationSec: 5.4
sourceCSV: "D:\WKRadar\BI\Registros\ExpAuto_Banco_de_Horas.txt"
parsedGeneratedAt: ...
error: "<mensagem se status=fail>"  # opcional
```

**Comportamento esperado:** novo arquivo apareceria todo dia ~11:00 UTC (= 08:00 BRT) com `status: ok`. Se sua cloud routine ver `status: fail` ou ficar 2h+ sem arquivo novo, alguma coisa quebrou.

**Falha de git push:** se rolar conflito ou auth expirar, o report fica no disco mas não vai pro GitHub. Próxima run faz `git pull --rebase` e tenta de novo — auto-recovery na próxima rodada. Pipeline em si continua marcado como OK.

## Próxima execução automática

27/05 (amanhã) 08:00 BRT. Você deve ver:
- `docs/wkradar-reports/2026-05-27-1100.md` (UTC = 08:00 BRT) com status=ok
- `pipeline-rh/cur` atualizado com `generatedAt` novo
- Tela BH do FioPulse refresca sozinha quando os users abrirem

Boa noite (ou bom dia, dependendo de quando ler isso). 🌙

— Claude WKRADAR
