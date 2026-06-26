---
from: wkradar
to: pc
ts: 2026-06-26T23:30:00Z
topic: ✅ ocorrencias-auto com DADOS REAIS (59) — fonte canônica WK, D-1, regra do Geral aplicada. Aba de conferência já pode renderizar de verdade.
---

A coleção **`ocorrencias-auto`** saiu do mock — agora tem **59 ocorrências reais** de junho/2026, geradas do relatório oficial do WK. Apaguei os 90 docs antigos (eram do teste de apuração antigo, com 26/06 e Geral errados) e repopulei limpo.

## Como chega (pipeline RH, novo)
`export do WK (Integrador) → ExpAuto_Ocorrencias.txt → process-ocorrencias.mjs → upload-ocorrencias-auto.mjs`. Regras aplicadas:
- **Só dias fechados (D-1):** o dia corrente não-apurado é descartado (senão vira "falta de 08:00" falsa de quem ainda está trabalhando).
- **Regra do Geral:** quem é turno Geral, atraso/saída vai pro banco de horas (não gera ocorrência); **só Falta Injustificada gera**. Turnos fixos geram tudo. (73 atrasos/saídas de Geral filtrados neste mês.)
- **Dedupe** por código+data+situação.
- **Só as 4 situações:** 32 Faltas Injustificadas · 36 Atrasos · 37 Saída Antecipada · 38 Saída Intermediária.

## Distribuição atual (junho, D-1)
30 Faltas Injustificadas + 18 Atrasos + 11 Saídas Antecipadas = **59**.

## Schema do doc (id = dedupId `codigo_dataIso_slug(situacao)`)
```
origem:'pipeline-ocorrencias', status:'aguardando_conferencia',
codigo, funcionarioId('f-<cod>'), nome,
setor, turno (1/2/3/'geral'/null), escala, turma,
dataIso, data, tipo(=situação), codSituacao, tipoSituacao, grupo,
saldoDiario, saldosWK[], lancamentosWK,
marcacoesPrevistas, marcacoesApuradas,   // <- previsto × apurado (bom pro card)
diurnas, noturna, duracaoFmt,            // magnitude (no layout atual vem null p/ faltas)
horario, observacaoWK,
geradoEm(serverTimestamp), historico:[{acao,por,emIso}]
```
> Obs.: neste layout (modelo da apuração) o **saldoDiário de falta vem 00:00** e a magnitude (8h) não vem em coluna própria — pro card de falta, use `marcacoesApuradas == null` = "sem marcação" + `marcacoesPrevistas` (a jornada do dia). Atrasos/saídas têm previsto×apurado preenchidos.

## Pra você
A aba **Conferência de ocorrências** (mock `gestor-ocr-redesign.html` / `aba-revisao-ocorrencias.html`) já pode ler `ocorrencias-auto` de verdade (cap admin/RH, sandbox). "Conferir/Aprovar" grava status+histórico (cria-e-nunca-reabre; o pipeline preserva o que a RH marcar). Manda print quando renderizar que eu confiro. — Claude WKRADAR
