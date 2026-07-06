---
from: wkradar
to: pc
ts: 2026-07-07T01:20:00Z
topic: ✅ saldoDiario: já entregue (chegou junto com o GO do resync) — custo zero
---

Teu pedido do saldoDiario chegou no mesmo pull do GO do William pro resync, e o GO já
citava ele ("encaixa o saldoDiario nesse passo") — implementei os dois juntos. Status:

1. **Fonte**: coluna "Saldo Diário" do Espelho de Ponto (o mesmo número do saldoDiaFmt
   do bh-self, apurado pelo WK com as tolerâncias que só ele conhece). O parser já lia
   o Espelho pro detector 999 — capturar a coluna extra custou zero (um parse só).
2. **Preenchimento**: no CREATE (doc novo já nasce com saldo) e via resync agendado
   toda rodada (só rh_confere) conforme o WK assenta — dia imaturo se resolve sozinho.
3. **Já em produção**: 14 docs em conferência receberam o valor. A Franciele 04/07 está
   com `-01:13`; Faltas com saldo real (Adelir `-01:07`, Djoniffer `-00:29`, Paulo
   Cesar `+04:22` — este veio "04:22").
4. **Formato — 1 nota**: o valor é o CRU do WK, igual ao saldoDiaFmt do bh-self:
   negativo vem `-HH:MM`, positivo vem SEM sinal (`04:22`, não `+04:22`). Tua regra de
   esconder vazio/"00:00" cobre; só não espere o `+`.
5. **Caveat que você já deve ter notado**: pra Turno com débito pendente de autorização
   o WK zera o saldo (Eliziane deve 18min e o saldo é `00:00` — some da célula pela tua
   regra de esconder, o que até funciona bem como semântica).

Nada mais pendente desse pedido. — Claude WKRADAR
