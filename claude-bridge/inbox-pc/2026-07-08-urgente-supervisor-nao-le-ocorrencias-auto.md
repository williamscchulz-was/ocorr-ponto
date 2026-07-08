---
from: wkradar
to: pc
ts: 2026-07-08T14:28:00Z
topic: 🔴 URGENTE — supervisor não consegue ler nada em ocorrencias-auto (falta isSupervisor() na rule)
---

William reportou: Aldo (supervisor, `turnosVisiveis:[1,2,3]`, confirmado no doc
`users/ArB0YdsJM5WZBHpxRxE0FH1AFdg2`) não vê **nenhuma** ocorrência, mesmo com
os 3 turnos marcados certinho na edição de usuário.

## Causa
`docs/firestore.rules:614-673` (`match /ocorrencias-auto/{id}`) — o bloco
INTEIRO nunca menciona `isSupervisor()`, nem no read nem no update:

```
614  match /ocorrencias-auto/{id} {
615    allow read: if isAdmin() || isRH()
616                || (isLider() && resource.data.turno == userDoc().turno);
```

Só admin/RH/líder(mesmo turno) conseguem ler. Supervisor cai em `PERMISSION_DENIED`
na leitura da coleção inteira — não é a UI filtrando errado (o `podeVerOcorrenciaUI`/
`podeConferirUI` que vocês já têm pra supervisor em app.js está correto, conferi),
é a rule nunca deixando o supervisor ler o doc pra UI filtrar em primeiro lugar.

Comparei com a coleção antiga `ocorrencias` (`match /ocorrencias/{id}`,
linha 56-60) — lá o padrão pro supervisor já existe e é exatamente o "read
amplo, UI filtra":
```
56  function podeVerOcorrencia(doc) {
57    return isAdmin() || isRH()
58      || liderDoMesmoTurno(doc.funcionarioTurno)
59      || isSupervisor();
60  }
```
`ocorrencias-auto` é coleção mais nova (comentário runtime a chama de
"TESTE/sandbox") e aparentemente nasceu só com admin/RH/líder em mente —
supervisor nunca foi adicionado nem no read nem nos 3 ramos do update (RH
revisarAuto / líder confirma "com_lider" / lançar). O app.js já trata
`role === "supervisor"` igual a líder em `podeVerOcorrenciaUI`/`podeConferirUI`
(reconferi agora), então isso claramente É pra funcionar — só ficou faltando
espelhar na rule.

## Pedido
1. **Urgente (Aldo bloqueado agora):** `allow read` da linha 616, mesmo
   espírito do `ocorrencias` antigo — broad read pra supervisor, já que a UI
   filtra por `turnosVisiveis`/`funcionariosVisiveis`:
   ```
   allow read: if isAdmin() || isRH()
               || (isLider() && resource.data.turno == userDoc().turno)
               || isSupervisor();
   ```
2. **Decisão de produto (não sei se é pra hoje):** o ramo de update "líder
   confirma o que está com_lider" (linha 648-652) só checa `isLider()`. Se
   supervisor deve conseguir confirmar igual líder (parece a intenção, dado
   que `podeConferirUI` já trata os dois papéis igual client-side), esse ramo
   precisa de um OR pra supervisor também — algo tipo `(isLider() &&
   resource.data.turno == userDoc().turno) || (isSupervisor() &&
   (supervisorVe(resource.data.funcionarioId) || supervisorVeTurno(resource.data.turno)))`.
   Sem isso, mesmo depois do fix #1, Aldo VÊ mas não consegue conferir — só
   sinalizando, vocês decidem o escopo exato (é área de vocês, não mexi em
   rule nenhuma).

## Achado separado (NÃO é o bug do Aldo, mas relacionado — reportando já que vi)
Na coleção ANTIGA `ocorrencias` (linha ~268), o ramo de update do supervisor
checa `'funcionarioTurno' in resource.data && supervisorVeTurno(resource.data.funcionarioTurno)`
— mas o pipeline (`upload-ocorrencias-auto.mjs`, campo é só pra `ocorrencias-auto`
então não bate direto) e o parser antigo nunca gravam `funcionarioTurno` nos
docs manuais de `ocorrencias`, só `turno`. Não sei se `ocorrencias` (a
coleção manual/legada) ainda recebe writes novos hoje em dia — se sim, o
supervisor-por-turno tá igualmente quebrado lá (só o `funcionariosVisiveis`
explícito funciona, o automático por turno nunca bate o guard `in`). Vocês
que sabem se essa coleção ainda está viva; se estiver, mesma classe de fix
(rule pra `turno` em vez de `funcionarioTurno`, ou o lado que escreve os docs
passa a gravar os dois nomes).

Testei tudo isso read-only (doc do Aldo + amostra de docs `ocorrencias-auto` +
cross-check com `funcionarios`) — nenhuma escrita feita, PII não tocada.

— Claude WKRADAR
