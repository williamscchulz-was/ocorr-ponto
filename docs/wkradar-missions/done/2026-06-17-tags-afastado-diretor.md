---
from: wkradar
to: pc
ts: 2026-06-17
tipo: missão (app FioPulse)
status: pending
requer: MOCKUP de cada item antes/junto da implementação
---

# Missão — Tags e filtros de Afastado + Diretor (app FioPulse)

O pipeline **já gravou os dados** (ver §"Dados"). Esta missão é 100% **app** (`public/app.js`, `firebase.js`, `styles.css`, `index.html`) — teu domínio + deploy. **O William pediu MOCKUP de tudo** (HTML em `docs/mockups/`, como o `ranking-tempo-casa.html`) pra ele aprovar antes de você implementar/deployar.

## Contexto

Funcionários ganharam 3 marcadores. Alguns são **ativos no quadro** mas precisam ser tratados à parte:
- **Afastado** (ex.: Aposentadoria por Invalidez, Licença Médica) — conta no quadro, mas fora de rankings.
- **Diretor** (Landolino, Jules, William) — conta no quadro, aparece **só** em aniversário; fora de BH, demografia e ranking.

## Dados (já no Firestore — não precisa mexer no pipeline)

Em `funcionarios/{codigo}`, `pipeline-rh/{cur,hist}.funcionarios[]` e `bancoHoras/{f-id}`:
- `situacao` (string): `"Trabalhando"` | `"Rescisão"` | `"Aposentadoria por Invalidez"` | `"Férias"` | `"Licença Médica"` | `null`
- `afastado` (boolean) — encostado de verdade (hoje 6).
- `diretor` (boolean) — derivado do cargo (hoje 3).
- `ativo` (boolean) — **só** demitido sim/não (inalterado).

Tratar ausência de qualquer flag como `false`/não. Contagens hoje: **95 ativos · 6 afastados · 3 diretores · 86 operacionais** (`ativo && !afastado && !diretor`).

## Matriz de inclusão (a regra central)

| Tela / uso | Quem entra |
|---|---|
| **Quadro / contagem de headcount** | `ativo===true` (inclui afastados E diretores) → 95 |
| **Listagem de funcionários** | todos (com **badge** "Afastado" / "Diretor") |
| **Aniversariantes** | `ativo===true` (inclui afastados E **diretores**) |
| **Banco de Horas** (admin/RH e líder) | `ativo===true && diretor!==true` (diretor **fora**) |
| **Demografia** | `ativo===true && diretor!==true` (diretor **fora**) |
| **Ranking (tempo de casa, etc.)** | `ativo===true && afastado!==true && diretor!==true` → 86 |

> Diretor: entra só em **quadro + listagem + aniversário**. Afastado: entra em tudo **menos ranking**.

## TODO (cada item precisa de MOCKUP)

- [ ] **Badge "Diretor"** na listagem de funcionários (`diretor===true`). [mockup]
- [ ] **Badge "Afastado"** na listagem (`afastado===true`). [mockup]
- [ ] **Banner no perfil**: quando `afastado===true` (e ativo) → "Afastado · {situacao}" (âmbar/info, NÃO o vermelho de inativo). "Funcionário INATIVO" (vermelho) só pra `ativo===false`. Quando `diretor===true` → opcional um selo "Diretoria". [mockup]
- [ ] **Filtro de status** (o dropdown "Apenas ativos" no topo da lista) ganhar opções: **Operacionais** (86) · **Afastados** (6) · **Diretores** (3) · **Apenas ativos** (95) · **Todos**. [mockup]
- [ ] **Banco de Horas**: excluir `diretor===true` das telas/contagens de BH (admin/RH lê `pipeline-rh/cur`; líder lê `bancoHoras` — ambos têm o flag). [mockup se mudar visual]
- [ ] **Demografia**: excluir `diretor===true` dos gráficos/contagens. [mockup]
- [ ] **Ranking tempo de casa** (`docs/mockups/ranking-tempo-casa.html`): aplicar `ativo && !afastado && !diretor`. [atualizar mockup]
- [ ] **Aniversariantes**: garantir que afastados E diretores aparecem (não filtrar por afastado/diretor aqui).

## Entrega

1. Mockups em `docs/mockups/` (1 por item visual) → William aprova.
2. Implementação no app + deploy (bump do `?v=` e do cache do SW).
3. Não precisa mexer no schema do Firestore (dados já estão lá). Se faltar algum flag em alguma coleção, me avisa no bridge.

— Claude WKRADAR
