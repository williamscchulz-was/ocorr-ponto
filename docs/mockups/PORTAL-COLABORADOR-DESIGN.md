# Portal do Colaborador — Spec de UX/UI (para o PC implementar)

> Desenhado pelo Claude WKRADAR com o William (sessão de design). O PC implementa no app.
> Mockups abríveis em `docs/mockups/colaborador-*.html`. Atualizado conforme as telas são desenhadas.

## Design system (vale para todas as telas)

- **Identidade FioPulse:** verde `#1AA34F` (marca), Poppins. **Sem emoji.** Marca = **Proposta C aprovada (2026-06-26)**: ícone de **pulso/ECG** (quadrado verde + linha de batimento, path `M2 12.5h4.2l2-5.5 3.4 10 2.4-6 1.7 3.5H22`) + tagline **"o batimento do RH"** (não mais "GH"). Unificar o mark em login/sidebar/topbar/favicon e nas telas. Ref: `marca-fiopulse-lockup.html` + bridge `2026-06-26-marca-proposta-C-aprovada.md`.
- **Responsivo (regra de ouro):**
  - **Mobile:** bottom nav **fixa** (`position:fixed` + `env(safe-area-inset-bottom)`), **só ícone** (sem rótulo), ativo num **círculo verde**, notificação = **pontinho** discreto (sem número). Sub-telas usam topbar com **seta de voltar**.
  - **Desktop:** **sidebar fixa à esquerda** (ícone + rótulo), ativo com fundo verde-suave, **sem bottom nav**. Toggle de tema + usuário no rodapé da sidebar. Conteúdo ocupa a largura.
- **Dark mode:** segue o **sistema automaticamente** + **botão de toggle** (topbar mobile / sidebar desktop). Paleta verde-escura (não cinza). Verde mais claro no escuro pro número "saltar".
- **Itens da nav:** Início · Ponto · Avisos · Documentos · Conta.
- **Tokens (claro / escuro):** ver os mockups — `--bg`, `--card`, `--green`, `--neg` (âmbar), etc. já definidos por classe `*--light` / `*--dark`.
- **Ícones nos mocks:** Tabler (ilustrativos) — usar o set SVG do app.
- **⚠️ Dados REAIS:** consumir `currentUser()` + `state.funcionarios[0]` (já carregado no boot) e `pipeline-rh/cur`. **Nunca** dados mockados ("Maria"). PII (CPF/PIS) nunca aparece pro colaborador.

## Telas

| # | Tela | Mockup | Status |
|---|---|---|---|
| 1 | **Início (home)** | `colaborador-home-mobile.html` · `colaborador-home-desktop.html` | ✅ aprovada |
| 2 | **Meu Banco de Horas** | `colaborador-banco-horas.html` | ✅ desenhada |
| 3 | **Comunicados (lista + leitura)** | `colaborador-comunicados.html` | ✅ desenhada |
| 4 | **Documentos / assinatura** | `colaborador-documentos-v2.html` (lista) + modal | ✅ desenhada |
| 5 | Holerites | (dentro de Documentos) | parcial |
| 6 | **Conta / perfil** | `colaborador-conta.html` | ✅ desenhada |
| 7 | **Acesso + login (CPF)** | `colaborador-acesso-login.html` | ✅ desenhada |

### 1. Início (home)
Saudação + cartão de identidade (nome, cargo · setor, chips: turno, tempo de casa, aniversário — sem PII) · **Banco de horas minimalista** (só o saldo; verde positivo / âmbar negativo) · **"Precisa da sua atenção"** (documento a assinar, comunicados novos) · atalhos (Meu ponto · Holerites · Comunicados · Documentos) · comunicado fixado · aniversariantes.
**Bind:** identidade/saldo de `funcionarios/{meuId}` + `pipeline-rh/cur`; aniversariantes de `/config/aniversariantes` (ou agregado). Comunicados/documentos = placeholder até as coleções existirem.
**🎨 Redesign aprovado (2026-06-26):** ver `colaborador-home-redesign.html` + auditoria `AUDITORIA-home-colaborador.md` (29 achados). Essência: renderizar as 3 seções que já têm CSS mas o `renderColabInicio` não emite (atenção/comunicado fixado/aniversariantes — causa do vão morto); 3 níveis de elevação; BH = único bloco saturado com 3 estados (positivo/negativo/00:00 "Em dia") + esconder p/ `bhExempt`; Holerites no lugar do Roadmap; topbar sem avatar duplicado; nav ancorada c/ safe-area + rótulos; light anti-lavado. Bridge `2026-06-26-home-redesign.md`.

### 2. Meu Banco de Horas
Abre ao tocar no card de BH (vive dentro de "Ponto"). Topbar com voltar. **Hero** com o saldo atual grande (âmbar se negativo). 2 mini-stats (início do mês / pior dia). **Gráfico do mês** = saldo diário (barras: verde crédito acima da linha zero, âmbar débito abaixo). **Lançamentos** = lista por dia (data + saldo + Δ do dia).
**Bind:** `pipeline-rh/cur.funcionarios[].lancamentos[]` (cada `{dataIso, saldoMin, saldoFmt}`) pro gráfico + lista; `saldoAtualFmt` pro hero. Δ = saldo do dia − saldo do dia anterior.

### 3. Comunicados
Tab "Avisos". Filtro Todos / Não lidos. **Fixado** em destaque (borda verde). Comunicado que exige confirmação mostra botão **"Confirmo que li"** (grava recibo → prova de leitura). Não-lido = pontinho azul; lido = discreto + "Lido em DD/MM". Chip de segmento (Todos / 1º turno / setor).
**Bind (a criar no back):** coleção `comunicados/{id}` (titulo, corpo, segmento, fixado, requerConfirmacao, publicadoEm) + recibo `comunicados/{id}/leituras/{uid}` (hora-servidor). Hoje = placeholder.

### 4. Documentos / assinatura
Tab "Docs". **Pendente de assinatura em destaque** (âmbar) com "Ler e assinar". Filtro Todos / Holerites / Recibos / Termos. Lista: holerites + espelho + recibos (PDF, baixar) e termos com selo "Assinado em DD/MM". **Modal de assinatura** (bottom-sheet, `colaborador-assinatura-modal.html`): texto do documento (com fade "role pra ler") + checkbox "Li e estou de acordo" (**o botão Assinar só habilita após marcar**) + botão "Assinar" + nota de **trilha** (usuário + data/hora = comprovante de aceite; é aceite com trilha, não jurídico pleno — N3 é futuro). (`colaborador-documentos-v2.html` = lista; o `colaborador-documentos.html` é o preview antigo do PC.)
**Bind (a criar no back):** `documentos/{id}` (tipo, funcionarioId, url Drive, hashSha256, status, exigeAssinatura) + `documentos/{id}/assinaturas/{uid}` (hash, uid, hora-servidor, userAgent) — roadmap #29/#30. Holerites/espelho por upload do RH (#18/#15). Hoje = placeholder.

### 6. Conta / perfil (`colaborador-conta.html`)
Tab "Conta". Cabeçalho com avatar + nome + cargo·setor. Grupos: **Meus dados** (Dados pessoais → idade/sexo/etc. read-only; Meu banco de horas → saldo), **Preferências** (Aparência = segmented **Automático / Claro / Escuro** [resolve o dark com toggle]; Notificações = switch), **Segurança** (Trocar senha; **Sair**). Rodapé com versão.
**Bind:** `funcionarios/{meuId}` (sem PII de terceiros; o próprio pode ver os próprios dados). Trocar senha = `updatePassword` (reauth). Tema salvo em localStorage.

### 7. Acesso + Login (`colaborador-acesso-login.html`)
**Acesso (split):** marca FioPulse + 2 cartões: "Portal do Colaborador" (card primário, entra por CPF) e "Portal do Gestor" (GH/líderes/admin → fluxo de login atual). **Login do colaborador:** CPF (máscara) + senha (com olho) + Entrar; **dica de 1º acesso** ("senha = data de nascimento DDMMAAAA"); "Ver demonstração (sem login)"; voltar; toggle de tema. **Troca obrigatória de senha** no 1º acesso = modal bloqueante (mesmo padrão do bottom-sheet de assinatura).
**Bind:** `cpfParaEmail(cpf)` → `{cpf}@colaborador.fiobras.local` → `signInWithEmailAndPassword`. `precisaTrocarSenha` força o modal. **⚠️ Lembrar do fix do diagnóstico:** pós-login renderizar a home REAL (não o mock) e aplicar `modo-colab` (esconde chat/FAB de gestor).

### 8. Roadmap do Portal — MAPA MENTAL (`roadmap-portal-mapa-mental.html`) ✅ aprovado 2026-06-26
Redesenho da tela `colab-roadmap` (substitui a timeline horizontal `.cp-rm-*`). **Mapa mental vertical estilo trilho de metrô:** nó raiz "Portal do Colaborador" → 7 fases como estações com anel de progresso, conectores SVG Bézier curvos, trecho "percorrido" na cor da marca até a fase em foco. Fase 1 — MVP abre por padrão com marcador "você está aqui"; demais recolhidas (clicar expande/recolhe os itens); "expandir/recolher tudo". Folhas (itens) alternam esquerda/direita; status por cor (concluído/em andamento/planejado/pendente); hover revela prioridade+complexidade. Resumo global + legenda no topo. Dark padrão + toggle.
**Bind:** `public/roadmap.js` (mesmo array de hoje); **contagens derivadas em runtime** dos itens (zero hardcode), validadas por asserção — mudar status reflete sozinho. Usar o set SVG do app + tokens semânticos (não os hex do mock). Card "Roadmap" da home (`.cp-rmcard`) segue como atalho. Handoff: `claude-bridge/inbox-pc/2026-06-25-roadmap-mapa-mental-aprovado.md`.
