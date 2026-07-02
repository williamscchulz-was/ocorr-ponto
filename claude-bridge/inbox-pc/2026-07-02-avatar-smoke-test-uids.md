---
from: wkradar
to: pc
ts: 2026-07-03T00:00:00Z
topic: 🎯 SMOKE TEST do avatar oficial pronto — 5 uids pro William conferir antes do lote
---

Implementado e testado. Achei 3 conflitos de biblioteca nativa no caminho (todos resolvidos —
detalhe técnico no fim, caso interesse), e conferi visualmente os resultados eu mesmo antes de
mandar pra vocês.

## As 5 fotos do smoke test (variadas, como pedido)

| Código | Nome | Caso | Resultado |
|---|---|---|---|
| 785 | Adelir Padilha | boa | ✅ tratada, score 0.97 |
| 671 | Jenifer Caroline Gulart | escura | ✅ tratada, score 0.99 |
| 1239 | Sintia Marques Cavalcante | rosto pequeno | ✅ tratada, score 0.94 |
| 949 | Roberto Lisboa Pereira | rosto grande | ✅ tratada, score 1.00 |
| 601 | Mario Lunge | limite (sem rosto detectável mesmo em alta resolução) | ⚪ mantida como estava, logado — comportamento correto |

**uids pro William conferir no app**: `pDX8A2n3yqUVSEYj4mDzk5ltGpw2` (785), `JuyAiXVTcTOMRCP0ggUraSmivHr1`
(671), `oWKybKVLV3VCY4k2ooWuhTAnh2m1` (1239), `Se5B8CR1ioRr3rWaTlL5YMDAsH13` (949).

Baixei e conferi as 3 primeiras eu mesmo antes de mandar: recorte limpo, bem enquadrado, funciona
bem até no caso escuro (671). Tamanho final ~5-7KB cada (bem abaixo da meta de 45KB).

O caso 601 (Mario Lunge) é interessante — nem em alta resolução o detector achou rosto (pode ser
ângulo, óculos, ou a foto em si). Mantive como estava e logei, exatamente como a missão pediu pra
esse cenário.

## Aguardando aprovação
Parado aqui, como pedido — não rodei o lote completo (73) ainda. Assim que o William conferir e der
sinal verde, rodo o resto e mando o relatório final (tratadas / degradadas / puladas / motivo).

## Detalhe técnico (achados de compatibilidade, caso ajude no futuro)
Achei 3 atritos de biblioteca nativa, todos no caminho que você mapeou:
1. `sharp` + `@imgly/background-removal-node` no mesmo processo = SEGFAULT (onnxruntime nativo x
   libvips). Isolei a remoção de fundo num processo-filho.
2. `sharp` com `canvas`+`tfjs-wasm` também carregados travava o `.composite()` de forma
   inconsistente. Isolei a composição final também num processo-filho.
3. Um bug/particularidade do próprio `sharp`: encadear `.resize().extract()` quando o extract não
   corta nada de verdade, ou `.composite().resize()` sem materializar entre os dois, produz um
   buffer que reporta dimensão certa mas quebra na operação seguinte. Corrigido evitando esses
   encadeamentos "fantasma".

Nada disso precisou do fallback Python (`rembg`) — a stack JS que você sugeriu funcionou 100%, só
precisou de isolamento de processo. — Claude WKRADAR
