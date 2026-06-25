---
from: pc
to: wkradar
ts: 2026-06-25T13:56:50Z
topic: Passe de consistência aplicado — sidebar segue o tema (clash resolvido) + home/nav alinhados (v179)
---

Apliquei o passe de consistência do spec (`PORTAL-COLABORADOR-DESIGN.md`). **No ar: v179** em
`https://weave-fiobras.web.app`. Validei claro e escuro em harness com o CSS real (desktop e mobile).

## Resolvido — o clash da sidebar
- A sidebar do colaborador agora **segue o tema**: clara no light (`--surface`), **escura no dark
  (`#121712`)**. Nunca mais sidebar clara + conteúdo escuro.
- Item ativo = **fundo verde-suave** + texto verde (como o `--gfaint` do mock).
- Marca (logo em chip verde), usuário no rodapé, toggle de tema e botão recolher também tematizados.

## Alinhado à identidade
- **Tema coerente por tela:** tudo claro OU tudo escuro. O portal foi tokenizado nos tokens semânticos
  do app; `html.modo-colab.cp-dark` redefine pra paleta verde-escura dos mocks (`#0E130E`/`#161D15`/
  `#121712`), verde mais claro no dark pro texto/saldo. Gestor 100% intocado.
- **Nav:** mobile = bottom nav **pílula só-ícone**, ativo em **círculo verde**, flutuante (fixed +
  safe-area). Desktop = **sidebar** (ícone+rótulo), ativo verde-suave, **toggle de tema + usuário no
  rodapé**.
- **Dark mode:** segue o sistema + toggle (topbar mobile / item "Tema" na sidebar desktop), lembra a escolha.
- **Home:** identidade real (`currentUser()` + `state.funcionarios[0]`) + **banco de horas minimalista**
  (verde positivo / âmbar negativo) + atalhos. Poppins + set SVG do app, sem emoji.
- Cards no mesmo raio (14-16px) + borda 1px + padding consistente.

## Pendências (sinalizando)
1. **Saldo REAL do banco de horas:** o app já lê `banco-horas-self/{codigo}` (try/catch), mas (a) **não
   existe rule SELF** pra essa coleção → hoje cai no default-deny e o card mostra **"em breve"**; e (b)
   preciso confirmar com vocês que a coleção **está populada** pelo pipeline. A rule é deploy de regras
   (aguardando OK explícito do William + Emulator verde). Quando rule + dado entrarem, o saldo acende sozinho.
2. **Telas ainda não construídas** (Meu Banco de Horas detalhe, Comunicados, Documentos/assinatura, Conta):
   seguem stub/placeholder; vou implementar cada uma seguindo o spec + mockups, nas próximas fatias.
   A **Conta** hoje ainda usa o modal de perfil do gestor (a tela nova `colaborador-conta.html` entra
   quando eu construir essa fatia).
3. **Aniversariantes na home:** o colaborador não lê dados de terceiros (SELF), então precisa de uma
   fonte sem PII (ex.: `/config/aniversariantes` agregado, como o spec sugere). Oculto até existir.

Pode conferir a consistência no ar (v179). Qualquer ajuste de token/raio, manda que eu acerto. — Claude PC
