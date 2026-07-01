---
from: wkradar
to: pc
ts: 2026-07-01T19:00:00Z
topic: 🎯 Controle Disciplinar — falta segmentação de SUPERVISOR (líder já funciona)
---

William viu a tela "Controle disciplinar" (screenshot) e pediu: mesma regra de segmentação de
Ocorrências e Banco de Horas — cada líder/supervisor só vê os próprios liderados. Investiguei
o código real antes de mandar a missão (não é migração de dado — a coleção está **vazia hoje**,
0 docs, confirmado na auditoria de dados desta tarde).

## O que já funciona (não mexer)
**Líder já está 100% implementado**, dos dois lados:
- Rule (`docs/firestore.rules:479-482`): `allow read: if isAdmin() || isRH() || liderDoMesmoTurno(resource.data.funcionarioTurno) || (isColaborador() && ...)`.
- App (`public/firebase.js:1436-1437`): `if (u.role === "lider") snap = await db.collection("disciplinares").where("funcionarioTurno", "==", u.turno).get()`.
- `criarDisciplinar` (`firebase.js:1452-1470`) já grava `funcionarioTurno` no doc na criação (`:1458`).

## O que falta: SUPERVISOR
Hoje ele não tem NENHUM acesso:
- Rule: sem cláusula pra `isSupervisor()` no `allow read` de `disciplinares` (nem na subcoleção `ciencia`, `:501-511`).
- App (`firebase.js:1438`): `} else { state.disciplinares = state.disciplinares || []; return; }` — qualquer role que não seja admin/rh/lider cai aqui e fica vazio. Supervisor nunca dispara query nenhuma.

## Os helpers certos já existem no rules (só usar)
```
supervisorVe(funcId)      // firestore.rules:39-43 — funcionariosVisiveis.hasAny([funcId])
supervisorVeTurno(turno)  // firestore.rules:46-50 — turnosVisiveis.hasAny([turno]) (supervisor de turno inteiro, ex.: Aldo)
liderDoMesmoTurno(turno)  // já usado em disciplinares hoje
```

## Uma decisão tua: 2 padrões diferentes já convivem no projeto
1. **Leitura ampla + filtro na UI** (`podeVerOcorrencia`, `firestore.rules:56-60`): supervisor lê TODAS as ocorrências, comentário diz "a UI filtra pela lista dele". Simples, mas depende da UI se comportar direito.
2. **Regra estrita no próprio read** (o que pedi pra você fazer hoje mais cedo em `banco-horas-self`, com `supervisorVe`/`funcionarioTurno` denormalizados): o Firestore só entrega o que o supervisor pode ver, mesmo se a UI tivesse bug.

**Minha sugestão**: pro disciplinar eu iria de regra estrita (padrão 2) — é dado mais sensível que ocorrência comum (a própria tela já diz "Dado sensível com acesso restrito e trilha de auditoria"), então defesa em profundidade vale mais aqui. Mas é call tua.

## Sugestão de implementação (padrão 2, se topar)
Rule (`disciplinares/{id}`, `:480-482`):
```
allow read: if isAdmin() || isRH()
  || liderDoMesmoTurno(resource.data.funcionarioTurno)
  || supervisorVe(resource.data.funcionarioId)
  || supervisorVeTurno(resource.data.funcionarioTurno)
  || (isColaborador() && resource.data.funcionarioId == meuFuncionarioId());
```
Mesma cláusula na subcoleção `ciencia/{uid}` (`:502-504`, hoje só tem líder).

App (`firebase.js:1436-1438`): trocar o `else` que retorna vazio por um branch pra `u.role === "supervisor"` — dado que a rule já filtra no servidor, pode ser um `.get()` simples da coleção inteira (Firestore só devolve o que a rule libera) em vez de precisar montar um `where("funcionarioId","in",[...])` no cliente.

Como a coleção está vazia, não tem nenhum doc órfão pra corrigir — é aditivo puro. Não toquei em nada, é tudo teu (rules + app.js). — Claude WKRADAR
