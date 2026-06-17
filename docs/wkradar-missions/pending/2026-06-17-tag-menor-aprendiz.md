---
from: wkradar
to: pc
ts: 2026-06-17
tipo: missão (app FioPulse) — continuação de 2026-06-17-tags-afastado-diretor
status: pending
requer: MOCKUP do badge antes de implementar
---

# Missão — Tag "Menor Aprendiz" (app FioPulse)

Continuação direta da v1.9.0 (tags afastado/diretor, já em produção). Agora o **menor aprendiz** ganha tag e **o mesmo tratamento de exclusão do diretor**.

## Dado novo (já no Firestore)

Campo **`aprendiz` (boolean)** em `funcionarios/{codigo}`, `pipeline-rh/{cur,hist}.funcionarios[]` e `bancoHoras/{f-id}`. Derivado do cargo (`/aprendiz/i`). Hoje **7** (4 ativos + 3 demitidos). Ausência = `false`.

## Regra: aprendiz = MESMO tratamento do diretor

Na prática: **onde você exclui `diretor`, exclua também `aprendiz`.**

| Tela / uso | Diretor | **Aprendiz** | Afastado |
|---|---|---|---|
| Quadro / contagem | ✅ | ✅ | ✅ |
| Listagem (com badge) | ✅ | ✅ (badge **"Menor Aprendiz"**) | ✅ |
| Aniversariantes | ✅ | ✅ | ✅ |
| Banco de Horas | ❌ | ❌ (regime sem BH — já não aparece) | sim |
| Demografia | ❌ | ❌ | sim |
| Ranking (tempo de casa) | ❌ | ❌ | ❌ |

**Contagens hoje:** 95 ativos · 6 afastados · 3 diretores · 4 aprendizes ativos · **ranking-operacional = 82** (`ativo && !afastado && !diretor && !aprendiz`) · **demografia = 88** (`ativo && !diretor && !aprendiz`).

## TODO

- [ ] **Badge "Menor Aprendiz"** na listagem (`aprendiz===true`). [MOCKUP pro William aprovar]
- [ ] **Demografia**: somar `&& aprendiz!==true` ao filtro (junto do `diretor!==true` que já tem).
- [ ] **Ranking tempo de casa**: somar `&& aprendiz!==true` ao filtro existente (`ativo && !afastado && !diretor && !aprendiz`). Atualizar o mockup `ranking-tempo-casa.html`.
- [ ] **Filtro de status** (dropdown): opcional adicionar opção "Aprendizes" (4).
- [ ] Quadro, listagem e aniversários **mantêm** os aprendizes.

## Entrega
1. Mockup do badge em `docs/mockups/` → William aprova.
2. Implementa + deploy (bump `?v=` + cache SW). Sem mexer no schema (dado já no Firestore).

— Claude WKRADAR
