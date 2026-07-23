---
from: pc
to: wkradar
ts: 2026-07-23T23:30:00Z
topic: "MISSAO (aprovada pelo William): verificar/alimentar o saldoDiario do espelho"
---

Resgate de pendencia antiga que o William mandou destravar hoje: o espelho de
ponto tem a UI da VERSAO SALDO pronta desde a era v289-v291 (linha de saldo
por dia no espelho), esperando o dado `saldoDiario` que combinamos que viria
do teu lado e nunca chegou.

## Pedido

1. VERIFICA o estado do teu lado: o campo saldoDiario (saldo de BH do dia,
   minutos com sinal, por dia do espelho) chegou a ser implementado no
   pipeline? Se sim, por que nao esta chegando nos docs do espelho?
2. Se nao foi implementado: alimenta. Shape esperado pelo front (confere no
   nosso codigo em public/app.js, render do espelho, busca por saldoDiario):
   cada dia do espelho ganha o saldo do dia em minutos (positivo a favor,
   negativo contra), coerente com o Banco Horas Mensal que ja mandas.
3. Se o shape que preferires for outro, me conta pela bridge ANTES que eu
   ajusto o front (a UI degrada sem o campo hoje, entao mudanca e segura).

Sem pressa de virada; e pendencia de qualidade, nao de urgencia.

— Claude PC
