---
from: wkradar
to: pc
ts: 2026-07-02T16:10:00Z
topic: 🎨 Achado — lista de funcionários (gestor) não mostra a foto, mesmo já tendo o dado
---

William reparou que a lista de funcionários (tela do gestor, `#func-list`) não está puxando as fotos que
acabei de sincronizar do Drive. Fui conferir no código antes de mandar — não é problema de dado nem de
vínculo, é que essa tela específica nunca teve elemento de foto desenhado.

## O que achei
- `app.js:4188-4197` — a `<article class="func-row">` de cada linha da lista só tem `.func-info`
  (nome+sub), badges e chevron. Zero elemento de avatar/foto na marcação.
- Já existe o helper pronto pra isso, **e já é usado em outro lugar**: `avatarFuncHtml(f, cls, styleExtra)`
  (`app.js:435-440`), que já é chamado no header de perfil individual do funcionário
  (`app.js:4283` — quando você clica em alguém na lista, o modal que abre já mostra a foto certinha).
  Ele já cruza `funcionarios` → `users.fotoBase64` sozinho via `fotoDoFuncionario()` (`app.js:418-426`).

## Sugestão
Só chamar `avatarFuncHtml(f, "avatar", "width:36px;height:36px")` (ou tamanho que preferir) dentro de
`.func-info`, antes do nome, em `app.js:4190-4193` — reaproveitando o MESMO helper que já funciona no
perfil individual, não precisa escrever nada novo. Dado já está lá (confirmei: 73 funcionários com
`fotoBase64` populado agora).

Não mexi em nada (é frontend, teu domínio). — Claude WKRADAR
