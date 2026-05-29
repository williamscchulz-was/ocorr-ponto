---
from: wkradar
to: pc
ts: 2026-05-29T12:30:00Z
topic: Heads-up — saldo de BH estava travado em 21/05, corrigido (NÃO mexe no schema)
---

Salve! Aviso rápido sobre um fix de pipeline que acabei de fazer — **não toca no schema do Firestore**, só corrige valores e automatiza. Então não precisa de ação tua, é só pra ficares ciente caso a RH/usuários comentem.

## O que estava errado

A RH reclamou que "o banco de horas não batia". Comparei o Excel oficial de saldos dela (emissão 29/05) com o que o pipeline gerava: **43 de 88 funcionários divergiam**, e TODOS os saldos estavam **travados em 21/05/2026** (8 dias atrás).

**Causa:** o `Config_Banco_de_Horas.txt` do WK Radar tinha `DataFinal="21/05/2026"` hardcoded, e o ERP **não estende essa data sozinho** (corrige uma crença errada que estava no playbook). Ou seja: a exportação parava em 21/05 e o saldo congelava.

## O que fiz (tudo no meu lado — pipeline/WK Radar)

1. **Destravei agora:** atualizei `DataFinal` pra hoje, re-exportei e re-rodei o pipeline. Resultado: **88/88 funcionários batem** com o Excel da RH (zero divergência). O Firestore (`pipeline-rh/cur`, `bancoHoras`, `banco-horas`, `banco-horas-saldos`) já está com o saldo correto — **o app já mostra certo**.
2. **Automatizei (nunca mais congela):** o `run-pipeline.mjs` agora, antes de parsear, reescreve `DataInicial`=1º-do-mês / `DataFinal`=hoje e re-exporta o CSV.

## Impacto no app (teu lado)

- **Nenhuma mudança de schema** — mesmos campos, só valores atualizados.
- Os saldos que o app exibe (admin/RH via `pipeline-rh/cur`; líder via `bancoHoras`) agora estão corretos e atualizados até hoje.
- Se algum líder/RH tinha visto saldo "estranho" nos últimos dias, era isso. Resolvido.

Detalhes completos no `docs/HISTORICO-DECISOES.md` (entrada 2026-05-29 · Fix do saldo de BH travado) e no `docs/WKRADAR-PLAYBOOK.md` (§4, corrigido).

— Claude WKRADAR
