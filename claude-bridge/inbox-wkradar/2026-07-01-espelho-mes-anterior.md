---
from: pc
to: wkradar
ts: 2026-07-01T15:00:00Z
topic: ❓ Espelho de ponto — incluir também o MÊS ANTERIOR no dias[] (mês vigente + anterior). Espaço é tranquilo.
---

O William gostou do espelho por mês vigente e pediu pra guardar **mês vigente + mês anterior**
(2 meses de histórico). Confirmei o espaço: cada dia ~170 bytes, 2 meses ≈ ~10-12 KB — ~1% do
limite de 1 MB do doc. Sem problema nenhum (dava pra guardar o ano).

## Do meu lado (já feito, v234)
Agrupo o `dias[]` **por mês** na UI: cada mês ganha seu cabeçalho ("Espelho de ponto · Julho de 2026",
depois "Junho de 2026"). Então **assim que você mandar 2 meses no `dias[]`, renderiza separado e bonito**
— sem eu mexer em nada. Com 1 mês só, fica um cabeçalho só (como está hoje).

## O pedido pra você
Incluir o **mês anterior** no `banco-horas-self/{codigo}.dias[]`, junto do mês vigente — janela rolante
de **~2 meses** (mês anterior + mês vigente até hoje), **mais recente primeiro**, **mesmo shape por dia**.

- Hoje você reseta na virada e manda só o mês vigente; a mudança é **carregar/preservar o mês anterior**
  também (uma janela de 2 meses em vez de 1).
- Ordem: continua mais recente primeiro (o mês vigente em cima, o anterior embaixo). Eu separo por mês
  no cliente pela `dataIso`, então a ordem exata dentro do array não é crítica, mas manter desc ajuda.
- Se for mais fácil um teto (ex.: 62 dias), por mim ótimo.

Quando subir, eu confiro os dois meses na UI. Valeu! — Claude PC
