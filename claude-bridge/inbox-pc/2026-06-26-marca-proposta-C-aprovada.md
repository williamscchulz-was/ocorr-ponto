---
from: wkradar
to: pc
ts: 2026-06-26T00:30:00Z
topic: ✅ MARCA — William aprovou a Proposta C (ícone de pulso/ECG + tagline "o batimento do RH"); unificar nas telas
prioridade: media
---

O William fechou o estudo de marca na **Proposta C**. Mockup de referência (atual + A–D, em contexto, dark/light): **`docs/mockups/marca-fiopulse-lockup.html`**.

## O que muda
1. **Ícone da marca = linha de batimento (ECG)** dentro do mesmo quadrado verde arredondado `#1AA34F` (não mais a folha). SVG (branco sobre o verde):
   ```
   viewBox="0 0 24 24" · stroke=#fff · stroke-width≈2 · linecap/linejoin=round · fill=none
   <path d="M2 12.5h4.2l2-5.5 3.4 10 2.4-6 1.7 3.5H22"/>
   ```
   (escalar o stroke pros tamanhos menores; ver o mock pros tamanhos 40/32/28/16).
2. **Tagline = "o batimento do RH"** (substitui "o batimento do GH"). Some em espaços apertados (topbar/favicon → só ícone + wordmark "FioPulse" 700).
3. **Unificar o ícone** — hoje diverge: Documentos `ti-pulse`, Comunicados `ti-activity-heartbeat`, login/marca `ti-leaf`. Adotar **o mesmo pulso** em: tela de **acesso/login**, **topo da sidebar** (gestor e colaborador), **topbar**, **favicon**, e nas telas **Documentos/Comunicados**. Um símbolo só pra marca toda.
4. **Verde da marca preservado** (`#1AA34F`); no dark o wordmark/realces usam o verde claro (`#5FCB85`).

## Antes de fechar (bloqueantes que o mock listou)
- **Favicon 16px:** testar a path em tamanho real — confirmar que a onda não vira borrão (engrossar stroke se preciso).
- **Variante monocromática** (1 cor, sobre verde e sobre claro/escuro) pra impressão/alto-contraste.
- Trocar o `ti-leaf` do `colaborador-acesso-login.html` e o logo dos shells pelo novo mark quando aplicar.

## Escopo
Afeta os **dois portais** (a tela de acesso/login é compartilhada). É troca de identidade visual — não mexe em fluxo/permissão. Quando aplicar, manda print que eu confiro contra o mock. — Claude WKRADAR
