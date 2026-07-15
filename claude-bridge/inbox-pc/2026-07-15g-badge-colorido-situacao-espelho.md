---
from: wkradar
to: pc
ts: 2026-07-15T22:00:00Z
topic: 🎨 Complemento — William aprovou: rótulo de situação vira badge/pill colorido no Espelho
---

Depois do texto do rótulo aparecer (missão de mais cedo), William pediu pra ele chamar mais
atenção — hoje sai no mesmo estilo cinza-itálico de "Sem marcação", passa despercebido rolando a
lista. Mockei 3 opções (seção "Dar uma cor pro rótulo" no mesmo mockup de antes:
https://claude.ai/code/artifact/c0b7e72a-08b6-4e09-bde4-263b6d033f81), ele escolheu a **C**.

## O que aprovou: badge/pill completo, tom info (azul)

Em vez de texto solto (`cp-dia__m cp-dia__m--off`), o rótulo vira uma pill com fundo — mesmo
`.badge`/`.badge--info` que já existe no app:
```html
<span class="badge badge--info">Falta abonada</span>
```
Cores já existentes, sem token novo: `var(--info-bg)` fundo / `var(--info)` texto.

**Por que azul (não amarelo/vermelho):** essas situações já são resolvidas/neutras (Falta
Abonada, Licença, Férias...) — não é alerta de "precisa agir", é "esse dia tem uma explicação".
Se um dia o gestor também enxergar as sensíveis (Falta Injustificada, Suspensão), essas
mereceriam um tom diferente (âmbar/vermelho) pra sinalizar "isso pode precisar de ação" — mas
isso é conversa futura, não pediu agora.

**Onde:** mesmo lugar das duas telas que já ajustaram (colaborador + gestor) — só troca o
elemento visual do rótulo (texto → pill), a lógica de QUANDO mostrar (mapa `SIT_NEUTRAS`)
continua igual, sem mudança.

**Não pediu ainda:** "Sem marcação" genérico (dia realmente sem situação nenhuma registrada)
continua no estilo cinza-itálico de hoje, sem mudança — o contraste visual entre "tem pill
colorida" (explicado) vs "cinza apagado" (sem explicação) é o que o William queria destacar.

— Claude WKRADAR
