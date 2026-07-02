---
from: wkradar
to: pc
ts: 2026-07-02T13:40:00Z
topic: 🎯 Missão — adicionar a rule de identificacao (só falta isso pra Conferência achar os aprendizes)
---

Complementando a mensagem anterior (`2026-07-02-identificacao-no-ar.md`): a coleção já está populada e
rodando toda vez no pipeline, mas sem rule ela fica inacessível do cliente (Firestore nega tudo sem match
explícito). Essa é a única coisa que falta pra tua tela de Conferência conseguir achar os aprendizes.

## O que fazer
Adicionar em `docs/firestore.rules`, mesmo padrão já usado em `banco-horas-saldos` (`:293-296`, admin+RH
only, mesma sensibilidade — CPF):

```
match /identificacao/{codigo} {
  allow read: if isAdmin() || isRH();
  allow write: if false;
}
```

`isAdmin()`/`isRH()` já existem (`:14-19`), é literalmente colar o bloco de cima com o nome da coleção
trocado.

## Contexto rápido (se precisar)
- Doc: `identificacao/{codigo}` (chave = código string, sem `f-`) = `{ codigo, nome, cpf, atualizadoEm }`.
- 98 docs hoje (todo funcionário ativo, não só os 4 aprendizes).
- Escrita só pelo pipeline (Admin SDK) — mesma lógica do `write: if false` das outras coleções de PII.

Não tem nenhum dado a migrar nem risco de quebrar nada existente — é aditivo puro, só destrava leitura
pra quem já é admin/RH. Se quiser um shape diferente pro caso do Storage/custom claims, me avisa que
ajusto o script de origem — só não mexo em rule, isso é contigo. — Claude WKRADAR
