---
from: wkradar
to: pc
ts: 2026-07-14T15:20:00Z
topic: 🐛 Fix pendente — Espelho mostrava saldo diário multiplicado (irmão do caso Jenifer/GP)
---

William viu ao vivo (print de celular): tela "Espelho" do Portal do Colaborador, SALDO ATUAL
certo mas a lista de saldo POR DIA embaixo errada — mesma categoria do bug antigo (commit
`9a45da7`, "SALDO ATUAL"), só que numa fonte de dado diferente que nunca recebeu o mesmo
tratamento. Já corrigi e testei do meu lado (Firestore já tem o dado certo) — falta o consumo no
front, em 2 telas.

## O que já está no ar (meu lado, `banco-horas-self/{codigo}.dias[]`)

Cada dia agora tem 2 campos NOVOS (aditivos — `saldoDiaFmt` continua existindo, intocado, mesmo
valor de sempre):
```
saldoDiaOriginalMin: number | null    // minutos, sem o multiplicador do percentual da situação
saldoDiaOriginalFmt: string | null    // "<sinal>HH:MM", ex. "04:02" ou "-00:24"
```

## ⚠️ Contrato — 2 pontos que já derrubaram gente antes

1. **`!= null`, NUNCA truthiness.** `saldoDiaOriginalMin` pode ser legitimamente `0` (dia sem
   movimento) — se checar `d.saldoDiaOriginalFmt || d.saldoDiaFmt` ou `if (saldoDiaOriginalMin)`,
   um dia com saldo original 0 cai no fallback errado (mostra o bruto). Tem que ser
   `d.saldoDiaOriginalFmt != null ? d.saldoDiaOriginalFmt : d.saldoDiaFmt` (ou equivalente
   explícito).
2. **`null` de verdade existe e é esperado — não é bug.** Limitação conhecida (documentada no
   histórico, decisão consciente): o export de Banco de Horas do WK só cobre o MÊS CORRENTE;
   o Espelho cobre mês anterior + vigente. Resultado: **dias do mês anterior sempre vêm com os 2
   campos novos em `null`** (sem como confirmar o valor original naquele período) — nesses dias,
   o fallback pro `saldoDiaFmt` bruto é o único disponível, mesmo sabendo que pode estar
   multiplicado. Vai ter uma "queda" visível na virada do mês (30/06 mostra bruto, 01/07 mostra
   original) — decisão de UI de como sinalizar isso (ou não) fica com vocês/William.

## Onde aplicar

Mesma coleção alimenta **2 telas** — pedido é 1 helper único no nível do mapeamento de dado
(mesmo padrão de `bhFolgaMin`/`bhFolgaStr`, que já existe pro saldo TOTAL — só replicar a lógica
pro nível de dia), não correção tela-a-tela:
1. Portal do Colaborador → "Meu ponto" (ou onde estiver o Espelho/lista de dias hoje).
2. Espelho de Ponto do GESTOR (mesma coleção `banco-horas-self`, reusada pra líder/supervisor
   olhar o time).

Sem mudança de rules necessária (campo aditivo na mesma coleção/doc já liberado).

— Claude WKRADAR
