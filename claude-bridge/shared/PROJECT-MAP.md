# Project Map — Fiobras Pipeline RH + App

Mapa rápido pra qualquer Claude entrar e entender onde tudo vive.

## Servidor WKRADAR (`C:\`)

| Path | O que é |
|---|---|
| `C:\fiobras-pipeline\` | Pipeline **Comercial** (mais antigo) · gera `data-cur.json`+`data-hist.json` · sobe pro Firebase Storage `gs://fiobras-hub.firebasestorage.app/comercial/` |
| `C:\fiobras-pipeline-rh\` | Pipeline **RH/Banco de Horas** · lê CSV WK Radar → escreve no Firestore do projeto `ocorr-ponto` (sem Storage) |
| `C:\ocorr-ponto-repo\` | Clone do repo `ocorr-ponto` (github.com/williamscchulz-was/ocorr-ponto) · inclui esse `claude-bridge/` |
| `C:\ocorr-ponto-live\` | Working dir do app deployado (baixado da prod) · checkbox "Incluir inativos" + v=66, aguardando deploy |
| `C:\fiobras-dashboard-repo\` | Dashboard maior da Fiobras (comercial, crm, manutencao, preco, ti) |
| `C:\Users\WKRADAR\fiobras-dashboard\` | Outro clone do dashboard, mais velho |

## Firebase

| Projeto | Bucket / DB | Notas |
|---|---|---|
| `ocorr-ponto` | Firestore só (Storage **não habilitado**) | App `weave-fiobras.web.app` + pipeline RH |
| `fiobras-hub` | Firebase Storage `gs://fiobras-hub.firebasestorage.app/` | Pipeline Comercial pubblica JSONs aqui |

## Coleções Firestore do `ocorr-ponto`

| Coleção | Conteúdo | Quem lê |
|---|---|---|
| `users/{uid}` | papel + turno do usuário do Auth | self + admin |
| `funcionarios/{f-codigo}` | master list (nome, cargo, depto, turno, ativo, demissao) | todos logados |
| `tipos/{id}` | tipos custom de ocorrência | todos logados |
| `acoes/{id}` | ações custom | todos logados |
| `ocorrencias/{id}` | registros de ocorrência de ponto | filtrado por papel/turno |
| `bancoHoras/{f-codigo}` | snapshot simples por funcionário (schema do app) | todos logados |
| `banco-horas-saldos/{codigo}` | snapshot rico com **CPF/PIS** | admin + RH |
| `banco-horas/{codigo}_{YYYY-MM}` | histórico mensal de lançamentos diários | admin + RH |
| `pipeline-rh/{cur,hist}` | espelho cur/hist do Comercial **sem PII** | admin + RH |
| `pj/{id}` | controle PJ | admin + RH |
| `presence/{uid}` | online status | self |

## Schemas relevantes

Ver [SCHEMAS.md](./SCHEMAS.md).

## CSVs-fonte

| CSV | Gera pipeline | Cadência |
|---|---|---|
| `D:\WKRadar\BI\Registros\ExpAuto_Banco_de_Horas.txt` | RH (WK Radar ERP, receita "Fiobras - Banco de horas") | Daily 07:45 BRT via Task Scheduler "WKRadar Export BH" |
| `C:\Users\WKRADAR\Documents\Fiobras - Comercial\*` | Comercial | (gerência manual ou outra automação) |

## Cron / Task Scheduler

| Tarefa | Horário | Comando |
|---|---|---|
| `WKRadar Export BH` | 07:45 diário | `D:\WKRadar\Pgms\Radar\ExportacaoAutomatica.exe "...Config_Banco_de_Horas.txt" /Silent` |
| `Fiobras Pipeline RH` | 08:00 diário | `node C:\fiobras-pipeline-rh\run-pipeline.mjs` |

## Service Accounts

- `C:\fiobras-pipeline-rh\service-account.json` → projeto `ocorr-ponto` · Firebase Admin SDK
- `C:\fiobras-pipeline\service-account.json` → projeto `fiobras-hub` · Firebase Admin SDK

## Memória persistente (Claude Code)

`C:\Users\WKRADAR\.claude\projects\C--fiobras-pipeline-rh\memory\` — entradas:
- `MEMORY.md` — índice
- `project_pipeline_rh.md` — geral
- `project_ocorr_ponto_stack.md` — stack do app
- `project_csv_bh_parsing.md` — armadilhas do parser CSV
- `project_bh_folgas_pagar.md` — saldos -04:00 são folgas concedidas
- `project_bh_exempt_flag.md` — `bhExempt: true` pula funcionário no pipeline
- `project_bh_relatorio_inclui_demitidos.md` — ERP traz demitidos por ~6 meses pós-saída
- `project_bh_preserva_inativo_manual.md` — admin override ativo=false é preservado
