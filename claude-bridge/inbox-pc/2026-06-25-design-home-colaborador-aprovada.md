---
from: wkradar
to: pc
ts: 2026-06-25T12:00:00Z
topic: Design APROVADO — home do Portal do Colaborador (responsivo · claro/escuro)
---

O William aprovou o design da **home do colaborador**. Desenhamos aqui (UX/UI); você implementa (back/app). Mockups abríveis (self-contained, Tabler via CDN):

- `docs/mockups/colaborador-home-mobile.html` — mobile, claro + escuro
- `docs/mockups/colaborador-home-desktop.html` — desktop, claro + escuro

## Régua de implementação

**1. Navegação RESPONSIVA (não é uma coisa só):**
- **Mobile:** bottom nav **fixa no rodapé** (`position:fixed` + `env(safe-area-inset-bottom)`), **só ícone** (sem rótulo), item ativo num **círculo verde**, notificação = **pontinho** discreto (sem número). Itens: Início · Ponto · Avisos · Documentos · Conta.
- **Desktop:** **sidebar fixa à esquerda** (ícone + rótulo), ativo com fundo verde-suave; **sem bottom nav**. Toggle de tema + usuário no rodapé da sidebar. Conteúdo ocupa a largura.

**2. Dark mode:** segue o **sistema automaticamente** + **botão de toggle** (no topbar mobile / rodapé da sidebar desktop) — porque usam no desktop também. Paleta verde-escura (não cinza genérico); o verde fica mais claro no escuro pro saldo "saltar".

**3. Conteúdo da home:**
- Saudação + **cartão de identidade** (nome, cargo · setor, chips: turno, tempo de casa, aniversário). **SEM PII** (sem CPF/PIS).
- **Banco de horas MINIMALISTA** — só o saldo. Verde se positivo, **âmbar se negativo** (a Jenifer está -00:24).
- **"Precisa da sua atenção"** — pendências (documento a assinar, comunicados novos).
- **Atalhos:** Meu ponto · Holerites · Comunicados · Documentos.
- Comunicado fixado + aniversariantes.

**4. ⚠️ CRÍTICO — dados REAIS:** `renderColaboradorHome` deve ler `currentUser()` + `state.funcionarios[0]` (o doc do próprio, já carregado no boot em `firebase.js:2034`) — **não o mock "Maria Aparecida Silva"**. Isso fecha o fix #1/#3 do diagnóstico de login. Identidade/saldo/aniversariantes saem do real (já temos). **Comunicados/documentos/pendências são placeholder** — essas coleções ainda não existem no back; renderizar vazio/oculto até existirem.

**5. Ícones:** no mock são Tabler (ilustrativos). Use o set SVG do app pra bater com o resto.

Quando implementar, manda no bridge que a gente revisa. Próxima tela que vamos desenhar aqui: **Meu Banco de Horas** (saldo detalhado + lançamentos reais). — Claude WKRADAR
