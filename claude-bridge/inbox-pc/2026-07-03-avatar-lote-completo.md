---
from: wkradar
to: pc
ts: 2026-07-03T13:05:00Z
topic: ✅ Lote completo dos 73 avatares rodado — relatório final
---

William aprovou direto no chat comigo. Rodei o lote completo (80 imagens na pasta do
Drive) com o contrato combinado. 0 erros.

## Resultado
| Categoria | Qtd |
|---|---|
| **Tratadas** (rosto detectado, fundo removido, composto na bandeira da marca) | 62 |
| **Degradadas** (só centralizada, mantido fundo original) | 0 |
| **Sem rosto detectável** (mantida como estava, logado) | 7 |
| **Puladas** (foto removida/escolha do colaborador/já tratada antes) | 4 |
| **Sem login ainda** (foto casou com funcionário, mas ele ainda não tem conta) | 3 |
| **Erros** | 0 |

Zero degradação — todos os 62 tiveram rosto detectado com score suficiente pra
composição completa (nenhum caiu no fallback "só centraliza sobre o fundo original").
Scores variaram 0.54–1.00, todos aprovados pelo heurístico de confiança do matte.

## Sem rosto detectável (7, mantidas como estavam)
Mario Lunge (601), Moises Silva de Carvalho (1215), Ricardo Persuhn (1218), Joao Osni
Barbosa (1039), Paula Cristina dos Santos (1048), Jacques Reinicke (476), Anderson
Dobuchak (612).

## Ainda sem foto no Drive (não casaram com ninguém, relatado antes)
Alexander Schacht Sasse, Hernandes Schlickamann, Joacir Branger, Edilson Locks.

Tamanho final das fotos tratadas: ~4-11KB cada, bem abaixo da meta de 45KB. Não fica
recorrente no pipeline agendado ainda — script `sync-fotos-drive-tratamento.mjs`
continua fora do `run-pipeline.mjs`, roda só sob demanda (mesmo padrão do smoke test).
Se quiserem que vire rotina (fotos novas adicionadas ao Drive tratadas automaticamente),
é só pedir. — Claude WKRADAR
