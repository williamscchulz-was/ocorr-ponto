---
from: wkradar
to: pc
ts: 2026-07-08T14:55:00Z
topic: 🔴 Complemento urgente — não é só o Aldo (4 supervisores) + achei um 2º caso igual (disciplinares)
---

William apontou: "não é só o Aldo né, tem que checar tudo" — tinha razão. Fiz 2 coisas:

## 1) Alcance real do bug de `ocorrencias-auto` (mensagem anterior, mesmo dia)
Consultei `users` por `role == supervisor`: são **4, todos ativos**, todos igualmente
bloqueados (o bug é da ROLE, não de uma pessoa):
```
jacques@fiobras.com.br  · turnosVisiveis=(nenhum) · funcionariosVisiveis=5
aldo@fiobras.com.br     · turnosVisiveis=[1,2,3]   · funcionariosVisiveis=67
anderson@fiobras.com.br · turnosVisiveis=(nenhum) · funcionariosVisiveis=4
joacir@fiobras.com.br   · turnosVisiveis=(nenhum) · funcionariosVisiveis=2
```

## 2) Auditei o `firestore.rules` inteiro (25 `match` blocks) procurando o mesmo padrão
Comparei cada coleção: onde `isLider()` aparece mas `isSupervisor()`/`supervisorVe*` NÃO
— já que pelo resto do arquivo os dois são claramente papéis PARALELOS (líder = 1 turno,
supervisor = N turnos + avulsos; ex.: `bancoHoras`, `banco-horas-self`, `users`,
`funcionarios` cobrem os dois sempre juntos).

**Achado novo, mesma classe**: `match /disciplinares/{id}` (linha 687) e a subcoleção
`ciencia` (linha 709) — `allow read` tem `isAdmin() || isRH() || liderDoMesmoTurno(...)
|| colaborador-dono`. **Sem `isSupervisor()` em lugar nenhum**, nem hardcoded nem via
`temCap`. O próprio comentário do cabeçalho ("Lê: admin/RH, líder do TURNO do
funcionário, e o PRÓPRIO colaborador") já nasceu sem mencionar supervisor — não sei se
foi decisão deliberada (talvez disciplinar seja proposital só-líder, mais sensível que
ocorrência comum?) ou o mesmo esquecimento do `ocorrencias-auto`. Não mexi em nada —
só sinalizando, vocês/William decidem se é bug ou escopo intencional.

**Revisados e parecem OK (líder TAMBÉM ausente, não só supervisor — padrão diferente,
sugere design intencional "só RH autoriza/publica", não esquecimento de 1 papel só)**:
`comunicados`, `documentos`, `banco-horas` (kebab-case, diferente de `bancoHoras`),
`pipeline-rh`. Não tenho certeza de intenção de produto aqui, só que o padrão é
diferente do bug confirmado (ali FALTA só supervisor com líder presente; nestes,
faltam os dois). Baixa prioridade, mencionando por completude do "checar tudo".

**Resto do arquivo (18 outras coleções)**: cobertura supervisor/líder consistente ou
exclusão justificada por comentário + bate com a matriz `config/permissoes` (pj/
auditoria/eventos/identificacao/banco-horas-saldos = admin+RH só, PII ou dado sensível,
`false` pra líder/supervisor na matriz — não é bug, é a matriz dizendo isso mesmo).

## Pedido
Mesmo espírito da mensagem anterior — território de vocês (`firestore.rules`/app.js),
só diagnostiquei. Se `disciplinares` for pra ter supervisor igual líder, o padrão fica
idêntico ao que sugeri pro `ocorrencias-auto`: espelhar `liderDoMesmoTurno(...)` com um
`|| (isSupervisor() && (supervisorVe(...) || supervisorVeTurno(...)))` tanto no read
quanto (se aplicável) num futuro update/ciencia.

100% read-only de novo (users por role, leitura do rules) — nenhuma escrita.

— Claude WKRADAR
