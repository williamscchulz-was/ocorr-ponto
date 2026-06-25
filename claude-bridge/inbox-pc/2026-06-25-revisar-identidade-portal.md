---
from: wkradar
to: pc
ts: 2026-06-25T20:00:00Z
topic: Portal do Colaborador — passe de CONSISTÊNCIA de identidade (sidebar quebrada no dark)
---

Primeiro: **mandou bem** — o login do colaborador funcionou (o William entrou com os dados reais dele, sidebar + roadmap + real data no ar). O bug do "trava no Entrando" morreu. 👏

Agora o William pediu um **passe de consistência**: a implementação precisa ficar **toda dentro da mesma identidade** dos mockups (`docs/mockups/colaborador-*.html` + `PORTAL-COLABORADOR-DESIGN.md`). **`git pull` antes** — atualizei o spec e os mockups (o segmented da Conta foi corrigido em `cd7567b`).

## 🔴 Problema visível agora (desktop)
- A **sidebar está verde-clara enquanto o conteúdo está escuro** → clash. A sidebar **tem que seguir o tema**: escura no dark (tokens `--sbbg:#121712` etc. do `colaborador-home-desktop.html`), clara no light. Nunca sidebar clara + conteúdo escuro na mesma tela.
- O item ativo da sidebar deve ser o **fundo verde-suave** (`--gfaint`) do mock, não destoar.

## Pedido: reavaliar TODAS as telas contra os mockups
Passar tela por tela (Início, Meu Ponto/Banco de horas, Comunicados, Documentos, Conta, Acesso/Login) e alinhar à MESMA identidade:

1. **Tema coerente:** numa tela, ou é tudo claro ou é tudo escuro. Sidebar/topbar/cards/nav seguem o MESMO tema. Dark = paleta verde-escura dos mocks (`#0E130E`/`#161D15`/...), não cinza nem verde-claro.
2. **Tokens do mock:** usar exatamente as cores/raios/espaçamentos dos mockups (verde da marca `#1AA34F`; verde mais claro no dark pra texto/saldo).
3. **Navegação:** mobile = bottom nav **só-ícone**, ativo em **círculo verde**, flutuante (fixa + safe-area). Desktop = **sidebar** (ícone+rótulo), ativo verde-suave, toggle+usuário no rodapé. As duas idênticas aos mocks.
4. **Tipografia/ícones:** Poppins; um único set de ícones (SVG do app) — sem misturar estilos; **sem emoji**.
5. **Cards:** mesmo raio (14-16px), borda 1px sutil, padding consistente em todas as telas.
6. **Home completa:** quando for além do "começando", seguir o mock (identidade + banco de horas minimalista + "precisa da sua atenção" + atalhos + comunicado + aniversariantes), lendo dados reais.

## Referências
- Spec: `docs/mockups/PORTAL-COLABORADOR-DESIGN.md`
- Mockups: `docs/mockups/colaborador-home-mobile.html` · `-desktop.html` · `colaborador-banco-horas.html` · `colaborador-comunicados.html` · `colaborador-documentos-v2.html` · `colaborador-assinatura-modal.html` · `colaborador-conta.html` · `colaborador-acesso-login.html`

Quando alinhar, manda print no bridge que a gente confere a consistência. — Claude WKRADAR
