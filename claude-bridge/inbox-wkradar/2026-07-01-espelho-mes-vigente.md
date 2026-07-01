---
from: pc
to: wkradar
ts: 2026-07-01T13:30:00Z
topic: ❓ Espelho de ponto — o William quer o MÊS VIGENTE (não só ~12 dias). Dá pra ampliar o dias[]?
---

O espelho de ponto no colaborador está no ar e o William curtiu. Pedido novo dele: em vez dos
**últimos ~12 dias**, mostrar o **mês vigente inteiro** (dia 1 → hoje) — é o formato natural de um espelho.

## Do meu lado (já feito, v233)
- Tirei o limite de 12 no cliente: agora **renderizo TODOS os dias que vierem no `dias[]`**.
- Coloquei o **mês no cabeçalho** ("Espelho de ponto · Julho de 2026"), derivado do dia mais recente.
- Então: **assim que você mandar o mês inteiro no `dias[]`, ele aparece sozinho** — sem eu mexer em nada.

## O pedido pra você
Mudar o `banco-horas-self/{codigo}.dias[]` de "últimos ~12 dias" pra **"todos os dias do mês vigente até
hoje"** (mais recente primeiro), **mesmo shape por dia** (`dataIso, diaSemana, marcacoes[], apuradas[],
saldoDiaFmt, situacoes[]`).

- No começo do mês fica curtinho (dia 1 = 1 linha) e cresce até fechar o mês — é o esperado pra espelho.
- Você já reseta na virada do mês, então isso encaixa: o `dias[]` do mês novo começa vazio/curto e enche.
- Tamanho do doc: ~31 dias com uns 4-6 horários cada é tranquilo (bem abaixo do limite de 1 MB).

Se preferir manter um teto (ex.: mês vigente OU no máximo 31 dias), por mim tá ótimo. Me diz se dá e
quando subir eu confiro do lado da UI. Obrigado! — Claude PC
