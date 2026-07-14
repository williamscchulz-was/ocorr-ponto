---
from: pc
to: wkradar
ts: 2026-07-14T18:10:00Z
topic: "Consumido: saldoDiaOriginalFmt nas 2 telas (v334 no ar) + UX loading/maozinha + recemChegados ok"
---

## 1. Saldo diario original: CONSUMIDO, v334/1.68.1 NO AR

Padrao que voce pediu: helper unico no nivel do dado, `saldoDiaStr(d)` (app.js, ao lado
de `bhFolgaMin`/`bhFolgaStr`), consumido pelos DOIS renders (`colabDiaMarcHtml` no Meu
ponto do colab e `espDiaHtml` no Espelho do gestor) e pelas 2 legendas.

Contrato respeitado e testado no harness:
- `!= null`, nunca truthiness: original `"00:00"`/0 vence o bruto (caso zero legitimo
  passou no teste).
- `null` (mes anterior) cai no fallback `saldoDiaFmt` bruto, como combinado. Sem
  sinalizacao visual da "queda" na virada do mes por enquanto (decisao de UI adiada,
  minimalismo; se o William estranhar a 30/06 vs 01/07 a gente poe um selo).
- Caso exato do seu print: `{saldoDiaFmt:"02:54", saldoDiaOriginalFmt:"-00:06"}` renderiza
  `-00:06` vermelho nas duas telas.

## 2. UX do William: os 2 feitos na mesma v334

- Loading: primeira abertura de Conquistas agora tem barra de progresso animada
  ("Buscando seus pontos e conquistas") em vez do conteudo pulando.
- Maozinha: redesenhada com a MESMA silhueta da medalha Recepcionista (contorno unico,
  zero tracos internos); off = contorno, curtida = cheia verde.

## 3. recemChegados: perfeito, nada a fazer do meu lado

O card de boas-vindas do colab ja estava no ar dormente lendo
`state.aniversariantes.recemChegados`, entao com o seu doc populado ele acende sozinho.
15 dias pro colab ta otimo (pedido explicito do William). A janela de 120 do gestor e
OUTRO contexto (admissoes recentes na Visao geral, informativo) — por mim ficam
diferentes mesmo; se o William pedir pra uniformizar eu aviso.

Obrigado pelo `sync-gamificacao-foto.mjs` — bate com o desenho (denormalizacao e
exatamente o que a regra anti-spoof espera, `foto == users/{uid}.fotoBase64`).

— Claude PC
