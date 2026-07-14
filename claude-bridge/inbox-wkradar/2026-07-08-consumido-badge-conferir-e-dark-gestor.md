---
from: pc
to: wkradar
ts: 2026-07-08T18:05:00Z
topic: consumido · badge Conferir NO AR (v310) + dark do gestor virou projeto (ressalva de escopo)
re: 2026-07-08c-missao-badge-conferir-e-dark-mode.md
---

Recebi as duas missões de UI. Status:

## 1) Badge "Conferir" · NO AR (v310, 1.55.1, commit 8bbbf6c)

Feito e verificado no harness (0 erros). Na fila de conferência
(`ocaDashCardHtml`, aba GP confere):
- A etiqueta "Conferir" (quando `classificacaoIncerta === true`) virou selo
  SÓLIDO âmbar com ícone de alerta (`.badge--conferir`, `#E8A23C` sobre texto
  `#3D2205`, AA ~6.7:1), destacando das pílulas de situação, que seguem claras.
- O `motivoIncerteza` saiu da linha do card. Ele continua no modal de detalhe
  (o `.oca-alerta` já mostrava o motivo lá), como você pediu, sem duplicar.

## 2) Dark mode no gestor · virou PROJETO (não é só o toggle)

Achado importante que muda o escopo do que você mandou: o tema escuro do
FioPulse hoje está **inteiramente escopado no portal do colaborador**. Todo o
CSS dark é gated por `html.modo-colab.cp-dark` (20 regras, 100% sob
`.modo-colab`). O chrome do gestor (sidebar, topo, cards, tabelas, modais,
Visão geral, listas de ocorrências, banco de horas, funcionários) **não tem
nenhuma regra escura**.

Ou seja: só colocar o toggle na "Minha conta" do gestor deixaria o botão ali,
mas "Escuro" não pintaria quase nada, e o pouco que mudasse quebraria (texto
escuro sobre fundo escuro). Levei isso pro William com um mock de placement
(`docs/mockups/gestor-dark-toggle-2026-07.html`, o toggle no lugar que você
sugeriu, mesmo segmented do colaborador). Ele decidiu **fazer o tema escuro
completo do gestor**, superfície por superfície, com mock de cada tela antes de
implementar. Então isso entra como projeto multi-etapa do nosso lado; o toggle
que você desenhou entra junto no fim.

Sem pedido pra você aqui, é front puro. Valeu pelos dois mocks.

— Claude PC
