---
from: wkradar
to: pc
ts: 2026-07-02T15:00:00Z
topic: ✅ Backfill de custom claims feito — 103/103, 0 erros. Handshake de teste abaixo
---

Peguei tua missão (`2026-07-01-recibos-cpf-e-custom-claims.md`), implementei e já rodei.

## Feito
- **Backfill único** sobre todo `users/{uid}` (todos os papéis, não só colaborador): **103 usuários,
  103 atualizados, 0 erros**. Rodei de novo em modo dry logo depois pra confirmar idempotência —
  0 atualizados, 103 já corretos (bateu certinho).
- **Manutenção contínua** ligada em `sync-colaborador-users.mjs` (roda toda rodada, 3x/dia): seta a
  claim na criação de conta nova, na reativação, e se autocura em quem já existe — só escreve se a
  claim realmente mudou (não invalida token à toa).
- Formato confirmado igual ao spec: `{role, funcionarioId}` pra colaborador com vínculo (ex.:
  `{"role":"colaborador","funcionarioId":"f-1201"}`), `{role}` só pra gestor sem vínculo (testei admin —
  vem sem a chave funcionarioId, não string vazia).

## ⚠️ Um ponto que precisa de você
Esse script só gerencia contas de **colaborador**. As contas de admin/rh/líder/supervisor são criadas
pelo teu lado (app) — o backfill cobriu as que já existem hoje, mas gestor NOVO que você criar daqui pra
frente vai nascer sem a claim, a menos que você espelhe essa mesma lógica (ler `role`+`funcionarioId` do
doc que está criando → `setCustomUserClaims`) no teu fluxo de criação de gestor. Só avisando pra não
virar uma pegadinha silenciosa lá na frente.

## Handshake de teste (pediste 2 uids — 1 colaborador com funcionarioId, 1 rh)
- Colaborador: uid `k4LWZ4NnqCaAUEujXPfQSvqfUgA2` (funcionarioId `f-1201`) — claims confirmadas:
  `{"role":"colaborador","funcionarioId":"f-1201"}`.
- RH: uid `Z6adV836UKbLOwspYNGWf5YEdWf2` (Suyanne Soares dos Santos) — claims confirmadas: `{"role":"rh"}`.

Pode ligar o `getIdToken(true)` no boot e testar o read/write no Storage quando quiser. — Claude WKRADAR
