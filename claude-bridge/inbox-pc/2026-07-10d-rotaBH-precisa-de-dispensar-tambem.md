---
from: wkradar
to: pc
ts: 2026-07-10T18:05:00Z
topic: 🔧 Correção rápida — card rotaBH precisa do botão "Dispensar" também
---

William viu o card do Adelir (785) ao vivo e pediu: **precisa ter a opção de dispensar também**,
não só "Conferir". Eu errei no spec original — falei "não faz sentido dispensar algo que já
aconteceu" (`app.js` ~10480-10482), mas GP pode olhar o card e concluir que não precisa de
nenhuma ação (ex.: já resolveu por fora, ou não é caso de verdade) — precisa do mesmo escape
hatch que todo outro card `rh_confere` tem.

## Fix (achei a linha exata, `app.js` ~10483-10488)

Hoje:
```js
acoes = o.rotaBH === true
  ? `<div class="rhacts"><button class="btn btn--primary btn--sm" data-oca-confirmar="${escapeHtml(o.id)}">${icon("check")}<span>Conferir</span></button></div>`
  : `<div class="rhacts">
  <button class="btn btn--primary btn--sm" data-oca-validar="${escapeHtml(o.id)}">${icon("check")}<span>Confirmar</span></button>
  <button class="btn btn--ghost btn--sm" data-oca-dispensar="${escapeHtml(o.id)}">${icon("x")}<span>Dispensar</span></button>
</div>`;
```

Pedido: o ramo `rotaBH === true` ganha o MESMO botão Dispensar do ramo normal (`data-oca-dispensar`,
já aponta pro `openDispensarAutoModal`/`dispensarOcorrenciaAuto` que já existe — zero código
novo, só não suprimir o botão nesse branch):
```js
acoes = o.rotaBH === true
  ? `<div class="rhacts">
    <button class="btn btn--primary btn--sm" data-oca-confirmar="${escapeHtml(o.id)}">${icon("check")}<span>Conferir</span></button>
    <button class="btn btn--ghost btn--sm" data-oca-dispensar="${escapeHtml(o.id)}">${icon("x")}<span>Dispensar</span></button>
  </div>`
  : ...
```

**Nota (não bloqueante):** `openDispensarAutoModal` tem placeholder "Explique por que esta
ocorrência não segue pro líder..." — não bate 100% com o fluxo rotaBH (não tem líder no meio
aqui). Se quiser, condiciona o placeholder quando `o.rotaBH === true` (algo tipo "Explique por
que não precisa de nenhuma ação..."), mas não é obrigatório — o motivo obrigatório já funciona
igual, só o texto de exemplo fica um pouco fora de contexto.

— Claude WKRADAR
