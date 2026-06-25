# Portal do Colaborador — Spec de UX/UI (para o PC implementar)

> Desenhado pelo Claude WKRADAR com o William (sessão de design). O PC implementa no app.
> Mockups abríveis em `docs/mockups/colaborador-*.html`. Atualizado conforme as telas são desenhadas.

## Design system (vale para todas as telas)

- **Identidade FioPulse:** verde `#1AA34F` (marca), Poppins, "o batimento do GH". **Sem emoji.**
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
| 5 | Holerites | — | a desenhar |
| 6 | Conta / perfil | — | a desenhar |
| 7 | Acesso + login (CPF) | — | a desenhar |

### 1. Início (home)
Saudação + cartão de identidade (nome, cargo · setor, chips: turno, tempo de casa, aniversário — sem PII) · **Banco de horas minimalista** (só o saldo; verde positivo / âmbar negativo) · **"Precisa da sua atenção"** (documento a assinar, comunicados novos) · atalhos (Meu ponto · Holerites · Comunicados · Documentos) · comunicado fixado · aniversariantes.
**Bind:** identidade/saldo de `funcionarios/{meuId}` + `pipeline-rh/cur`; aniversariantes de `/config/aniversariantes` (ou agregado). Comunicados/documentos = placeholder até as coleções existirem.

### 2. Meu Banco de Horas
Abre ao tocar no card de BH (vive dentro de "Ponto"). Topbar com voltar. **Hero** com o saldo atual grande (âmbar se negativo). 2 mini-stats (início do mês / pior dia). **Gráfico do mês** = saldo diário (barras: verde crédito acima da linha zero, âmbar débito abaixo). **Lançamentos** = lista por dia (data + saldo + Δ do dia).
**Bind:** `pipeline-rh/cur.funcionarios[].lancamentos[]` (cada `{dataIso, saldoMin, saldoFmt}`) pro gráfico + lista; `saldoAtualFmt` pro hero. Δ = saldo do dia − saldo do dia anterior.

### 3. Comunicados
Tab "Avisos". Filtro Todos / Não lidos. **Fixado** em destaque (borda verde). Comunicado que exige confirmação mostra botão **"Confirmo que li"** (grava recibo → prova de leitura). Não-lido = pontinho azul; lido = discreto + "Lido em DD/MM". Chip de segmento (Todos / 1º turno / setor).
**Bind (a criar no back):** coleção `comunicados/{id}` (titulo, corpo, segmento, fixado, requerConfirmacao, publicadoEm) + recibo `comunicados/{id}/leituras/{uid}` (hora-servidor). Hoje = placeholder.

### 4. Documentos / assinatura
Tab "Docs". **Pendente de assinatura em destaque** (âmbar) com "Ler e assinar". Filtro Todos / Holerites / Recibos / Termos. Lista: holerites + espelho + recibos (PDF, baixar) e termos com selo "Assinado em DD/MM". **Modal de assinatura** (bottom-sheet, `colaborador-assinatura-modal.html`): texto do documento (com fade "role pra ler") + checkbox "Li e estou de acordo" (**o botão Assinar só habilita após marcar**) + botão "Assinar" + nota de **trilha** (usuário + data/hora = comprovante de aceite; é aceite com trilha, não jurídico pleno — N3 é futuro). (`colaborador-documentos-v2.html` = lista; o `colaborador-documentos.html` é o preview antigo do PC.)
**Bind (a criar no back):** `documentos/{id}` (tipo, funcionarioId, url Drive, hashSha256, status, exigeAssinatura) + `documentos/{id}/assinaturas/{uid}` (hash, uid, hora-servidor, userAgent) — roadmap #29/#30. Holerites/espelho por upload do RH (#18/#15). Hoje = placeholder.
