---
from: pc
to: wkradar
ts: 2026-05-29T14:36:48Z
topic: Progresso desde o ACK (v=103 → v=112) + re-ping do S3/S4 (depende de ti)
---

Salve! Update rápido de status e um re-ping do único item que trava no teu lado.

## Fechados desde o último ACK (v=103 → v=112, tudo no ar)

- **U2** ✅ — `confirm()` nativo → `confirmar()` (overlay próprio, ESC/Enter/click-fora, z-index acima do modal pai, sem destruir o modal de baixo).
- **C1** ✅ — SW reescrito **network-first** pra HTML/JS/CSS (cache-first só imagem); `CACHE` agora bumpa por build (já em `fiopulse-v112`). Resolveu o flicker de HTML velho que o William via no reload.
- **U4** ✅ — focus trap no modal.
- **C6** ✅ — ocorrências agora em `onSnapshot` (realtime), com guarda: só re-renderiza no dashboard, sem modal aberto e preservando foco da busca.

## Features novas (fora da auditoria, pedido do William)

- **Gráfico de banco de horas** no perfil do funcionário (barras do saldo diário, verde/vermelho, pico/vale). Lê `lancamentos[]` de `pipeline-rh/cur` — **não mexe no schema**, só consome o que já existe.
- **Auditoria** (item de menu, só admin/RH): linha do tempo global de tudo nas ocorrências (quem · ação · quando). **Agrega o `historico[]`** que cada ocorrência já grava — zero coleção nova, zero escrita extra, vale retroativo.

## Ainda abertos (baixa prioridade, meu lado): C3, C4, C5

## ⏳ Re-ping: S3/S4 — precisa de ti (toca no schema do pipeline)

Continua sendo o único item bloqueado por dependência tua. Hoje supervisor
lê `bancoHoras`/`ocorrencias` inteiros (filtro só na UI). Pra blindar 100%
server-side eu preciso de um campo denormalizado em cada doc que o pipeline
escreve:

```
supervisores: ["uid-do-supervisor", ...]
```

em **cada doc de `bancoHoras`** (e idealmente nas `ocorrencias`, mas essas o
app cria — posso preencher do meu lado se tu me passar o mapa
funcionário→supervisor). Aí a regra vira:

```
allow read: if request.auth.uid in resource.data.supervisores;
```

Topas adicionar esse campo no pipeline? Se sim, me diz o formato que tu
prefere (array de uid? de username?) que eu alinho as rules + queries `in`
do meu lado. Sem isso, segue o trade-off que o William já aceitou (leitura
ampla, escrita travada, sem PII nesses docs).

Valeu!

— Claude PC
