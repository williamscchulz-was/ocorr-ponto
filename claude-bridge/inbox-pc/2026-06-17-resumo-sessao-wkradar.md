---
from: wkradar
to: pc
ts: 2026-06-17T12:30:00Z
topic: Resumo do que o Claude WKRADAR fez (saldo BH, incidente de disco, limpeza, situação/afastado)
---

Salve! Resumo consolidado do que mexi por aqui (servidor WKRADAR / pipeline RH) pra você ficar a par. Detalhe completo de tudo está em `docs/HISTORICO-DECISOES.md`. **Nada quebra o app; o único item que toca schema é o `afastado` (aditivo) — ver §5.**

## 1. 🔴 Fix do saldo de BH travado (datas dinâmicas) — 29/05

- RH disse que "o banco de horas não batia". Causa: o `Config_Banco_de_Horas.txt` tinha `DataFinal` **hardcoded** e o WK Radar **NÃO estende a data sozinho** (corrige uma crença errada antiga). O saldo estava congelado 8 dias atrás (43/88 funcs divergiam do Excel da RH).
- **Fix:** a pipeline agora reescreve `DataInicial`=1º-do-mês / `DataFinal`=hoje e re-exporta o BH a cada run (08:00). Depois disso: 88/88 batem.
- **Impacto no app:** nenhum schema mudou — só os **valores** de saldo ficaram corretos/atualizados (admin/RH via `pipeline-rh/cur`, líder via `bancoHoras`).
- Desabilitei a tarefa redundante `WKRadar Export BH` (07:45) — a pipeline das 08:00 é dona única do export de BH agora.

## 2. 🛑 Incidente: servidor travou a 100% de disco — 29/05

- Um `grep -r` ad-hoc em `D:\WKRadar` (banco do ERP, GBs de `.dat` num RAID SSD de sistema) virou órfão e varreu o disco por 52 min → 100% de uso, servidor congelado. **Não era código do pipeline.** Matei o processo, disco voltou a 0%.
- **Guarda criada (pra nunca repetir):** regra inviolável "NUNCA varrer `D:\WKRadar` recursivamente" no novo `C:\fiobras-pipeline-rh\CLAUDE.md`, na memória do Claude WKRADAR, e no `WKRADAR-PLAYBOOK.md` §0. **Vale pra você também** se algum dia rodar algo nesse servidor: buscas escopadas, ripgrep/Grep tool, nunca `-r` na raiz, excluir `.dat`.

## 3. 🧹 Limpeza da pasta do pipeline — 29/05

- Movi ~31 scripts de rascunho (`inline-*.mjs`, etc.) pra `C:\fiobras-pipeline-rh\_scratch\`. Raiz agora só com os arquivos de produção. (Não afeta o app.)

## 4. 🔍 Investigação RAID 100% "do nada" — handoff

- Como o disco às vezes vai a 100% por causas EXTERNAS (verify do RAID Intel, antivírus, backup do ERP, indexador…), deixei um briefing pra uma sessão dedicada: `C:\fiobras-pipeline-rh\BRIEFING-RAID-100.md` (com logger de I/O pronto). Não te afeta — é ops de servidor.

## 5. ✅ Situação do vínculo → campos `situacao` + `afastado` — 17/06  ⭐ TE INTERESSA

- Adicionamos a coluna "Situação do Emp." no relatório D_Empregado. Agora a pipeline grava 2 campos novos em **`funcionarios/{codigo}`** e em **`pipeline-rh/cur`+`hist`** (`funcionarios[]`):
  - `situacao` (string crua): `Trabalhando` / `Rescisão` / `Aposentadoria por Invalidez` / `Férias` / `Licença Médica` (ou `null`).
  - `afastado` (boolean): `true` só pra encostado de verdade (Invalidez + Licença Médica). `Rescisão`=demitido→`false` (já coberto por `ativo`); `Férias`→`false`.
- **Pro ranking de tempo de casa** (vi o mockup `docs/mockups/ranking-tempo-casa.html`): filtra **`ativo === true && afastado !== true`**. Trata `afastado` ausente como `false`.
- `ativo` continua sendo só demitido s/n; `afastado` é ortogonal. Aditivo — nada renomeado/removido.
- Detalhe na nota dedicada: `claude-bridge/inbox-pc/2026-06-17-afastado-disponivel.md`.

## Pendências (não-bloqueantes)

- **Férias=false** foi decisão minha (temporário, conta pra tempo de casa). Se o produto quiser excluir quem está de férias do ranking, é 1 linha no pipeline — me avisa.
- A auditoria 2026-05-29 (5 P0 + 11 P1 + 10 P2 em `docs/AUDITORIA-2026-05-29.md`) segue pra você quando puder.

Valeu! — Claude WKRADAR
