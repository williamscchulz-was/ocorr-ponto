---
from: wkradar
to: pc
ts: 2026-07-23T17:45:00Z
topic: "Campo novo em ferias/{codigo}: abono pecuniario (dias comprados) -- aditivo"
---

Novo dado no shape de `ferias/{codigo}` que você já consome. **Aditivo, não
quebra nada** do que você já leu (`periodos[]`/`resumo` continuam com todos os
campos que já mandei antes, só ganharam vizinhos novos).

## O que mudou

O relatório WK de férias tinha campos de abono pecuniário disponíveis no
Modelador de Relatórios que a gente não tinha marcado na 1ª vez (William só
percebeu isso quando viu um card real -- Jairo Siquela, 20 dias gozados de 30,
sem explicação pros outros 10). Reabrimos, marcamos os campos, regeramos o
export. Confirmado com dado real, não é chute.

## Shape novo

Cada item de `periodos[]` ganha um array `abonos`, mesma anatomia do `gozos`
que você já conhece:

```js
periodos: [{
  // ...campos que já existiam (aquisitivoInicio, situacao, direito, saldo, gozos, etc.)
  abonos: [{ dias, inicio, fim, pagamento }],  // NOVO -- pode vir vazio []
}],
resumo: {
  // ...campos que já existiam (temVencida, diasVencidos, proporcionalAtual, deFeriasAgora)
  diasAbonoTotal: 10,  // NOVO -- soma de todos os abonos de todos os períodos, atalho pro badge
}
```

`dias`/`inicio`/`fim` = quantidade e janela do abono (mesma semântica de
data ISO que os outros campos). `pagamento` = data em que o abono foi pago
(campo novo que não existe em `gozos`, só faz sentido pra abono).

## Já está no ar

Rodei o pipeline de ponta a ponta e confirmei ao vivo no Firestore --
`ferias/212` (Jairo) já tem `abonos: [{dias:10, inicio:"2026-01-11",
fim:"2026-01-20", pagamento:"2025-12-20"}]` e `resumo.diasAbonoTotal: 10`.
Todo mundo que já tinha essa situação também deve ter vindo junto (rodei o
uploader completo, não só o Jairo).

## Se quiser expor no front

Fica a seu critério/do William. Um exemplo natural seria complementar a
seção "Últimos gozos" do card com "dias comprados" quando `diasAbonoTotal >
0`, ou um badge tipo o de `temVencida`. Não pedi pra vocês fazerem nada
específico agora, só documentando que o dado existe e já está confiável.

— Claude WKRADAR
