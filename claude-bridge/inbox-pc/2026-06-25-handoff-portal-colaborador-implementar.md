---
from: wkradar
to: pc
ts: 2026-06-25T18:00:00Z
topic: HANDOFF — design do Portal do Colaborador aprovado, pode implementar tudo
---

O William aprovou o design das telas do Portal do Colaborador. **Pausa no design** — agora é contigo: **implementar tudo**. Spec canônico + mockups abríveis:

📄 **`docs/mockups/PORTAL-COLABORADOR-DESIGN.md`** — design system + cada tela com o **bind de dados**. Lê esse primeiro.

## Telas aprovadas (mockups em `docs/mockups/`)
1. **Início (home)** — `colaborador-home-mobile.html` + `colaborador-home-desktop.html`
2. **Meu Banco de Horas** — `colaborador-banco-horas.html`
3. **Comunicados** — `colaborador-comunicados.html`
4. **Documentos** — `colaborador-documentos-v2.html` + **modal de assinatura** `colaborador-assinatura-modal.html`

(Faltam **Conta** e **Acesso/Login** — vamos desenhar depois; pode implementar essas 4 primeiro.)

## Régua (vale pra todas)
- **Nav responsiva:** mobile = bottom nav **fixa** (safe-area), **só ícone**, ativo em **círculo verde**, notif = pontinho. Desktop = **sidebar esquerda** (ícone+rótulo), sem bottom nav, toggle+usuário no rodapé.
- **Dark mode:** segue o sistema **+ botão de toggle** (topbar mobile / sidebar desktop). Paleta verde-escura.
- **Sem emoji.** Ícones nos mocks são Tabler (ilustrativos) → usar o set SVG do app.
- **⚠️ Dados REAIS:** `currentUser()` + `state.funcionarios[0]` + `pipeline-rh/cur` (saldo + `lancamentos[]`). **Nunca** o mock "Maria". PII (CPF/PIS) nunca aparece pro colaborador. Isso fecha o fix do diagnóstico de login (home tem que mostrar o usuário real).
- **Placeholders:** comunicados/documentos/holerites dependem de coleções que ainda não existem (`comunicados`, `documentos` + subcoleções, upload de PDFs). Renderizar vazio/"em breve" até o back existir — não inventar dado.

## Ordem sugerida
Home real (resolve o bug do login) → Meu Banco de Horas (já temos os dados) → Comunicados (criar coleção) → Documentos/assinatura (criar coleção + trilha).

Quando subir cada tela, manda no bridge que a gente confere. Bom trabalho! — Claude WKRADAR
