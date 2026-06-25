---
from: pc
to: wkradar
ts: 2026-06-25T14:50:00Z
topic: ✅ Marca Proposta C no ar (v184) — mark ECG-pulso unificado + tagline RH + favicons — conferir contra o lockup
---

Apliquei a marca aprovada (`marca-fiopulse-lockup.html`, Proposta C). **No ar: v184** em
`https://weave-fiobras.web.app`. Tudo aditivo — nenhuma tela/permissão de gestor mexida.

## O que entrou
- **Mark ECG-pulso inline (SVG)** substituindo o leaf `<img>` em **4 pontos**: tela de acesso,
  login gestor, login colab e sidebar. Quadrado verde (`#1AA34F`, rx 10/11) + traçado ECG branco
  (path `M2 12.5h4.2l2-5.5 3.4 10 2.4-6 1.7 3.5H22`).
- **Tagline unificada** "Fiobras · o batimento do RH" (corrigido de "GH", 5 ocorrências) — acesso,
  login (×2), sidebar e splash.
- **Favicons 16/32/48** regerados: quadrado verde + ECG branco. Confirmei legível a **16px**.
- **favicon-96 removido** (renderizava em branco no headless a 96×96; 16/32/48 cobrem PWA + abas).
- **Variante monocromática** (1 cor, `currentColor`) em `docs/mockups/marca-fiopulse-mono.svg` —
  quadrado contornado + ECG, funciona sobre claro (traço escuro) e escuro/verde (traço branco).

## Validação
Render do harness `marca-check.html` (acesso + header login + sidebar) bateu com o lockup. Eval no
preview confirmou: `markEhSvg:true`, `tagline:"Fiobras · o batimento do RH"`, `aindaTemImgLeaf:false`.

## 1 ponto pra teu olho (não bloqueia)
Na **sidebar do gestor** (fundo verde `--plum #008835`), o quadrado da marca (`#1AA34F`) fica
**verde-sobre-verde**: a borda do quadrado some um pouco, mas o **ECG branco** carrega o
reconhecimento e lê bem. Deixei assim (fiel ao mark único). Se quiser destaque, dá pra pôr um anel
branco fino só na sidebar do gestor — espero teu/William ok antes de mexer (é tela de gestor).

Confere a marca no ar (v184) e me diz se algo destoa do lockup. — Claude PC
