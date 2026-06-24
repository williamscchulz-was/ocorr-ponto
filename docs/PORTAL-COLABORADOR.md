# Portal do Colaborador — FioPulse

Plano de produto consolidado e **refinado**. Documento de execução para William aprovar e
implementar **uma feature por vez**. Substitui a versão anterior incorporando o novo briefing:
primeira entrega = Fase 0 sem autenticação, Roadmap in-app como feature real, prioridade em
todos os itens, reframe de holerite/espelho/recibo, e a tela de acesso com split de portais.

---

## 1. Visão e princípio

O Portal do Colaborador **não é um sistema novo**. É a **segunda metade do FioPulse**: hoje o
sistema enxerga o funcionário como objeto de gestão (o RH e os líderes olham *para* ele); o
Portal o transforma em sujeito (ele olha os próprios dados e age). É servido no **mesmo
endereço** (gh.fiobras.com.br), pelo **mesmo index.html** e pela **mesma casca de UI**. O
princípio que governa todo o plano é: **reaproveitar, não recriar.**

- **Mesmo endereço, mesmo shell.** O app já roteia 100% por `state.view.page` via
  `renderView()` e monta menu por `renderNav`/`renderBottomNav`. A experiência diverge por
  `user.role`, que já vem de `users/{uid}` no `onAuthStateChanged`. Suporta um 4º papel
  (`colaborador`) sem refatorar.
- **Cada feature self é a contraparte de algo do lado gestor.** Comunicado ↔ leitura;
  documento emitido ↔ assinatura; avaliação ↔ autoavaliação. Essa simetria é o que mantém o
  custo baixo e a coesão alta — a auditoria append-only é a espinha dorsal de confiança.
- **Colaborador vê só os próprios dados** (escopo SELF). É a única mudança realmente
  estrutural, e ela cascateia em `PERM_DEFAULT`, `can()` e as Firestore rules (com o vínculo
  `uid ↔ funcionarioId`).
- **Regras do dono:** minimalista, sem emoji na UI, **mockar visual em HTML real** (aberto no
  navegador, nunca o preview embutido do Claude Code) e **aprovar antes de aplicar**,
  reaproveitar tudo. **Não iniciar desenvolvimento — isto é plano.**

### O que mudou nesta revisão (vs. plano anterior)

1. **Primeira entrega = Fase 0, SEM autenticação.** Tela de acesso (split Colaborador/Gestor),
   estrutura visual do Portal do Colaborador (shell + navegação + dashboard), e a área Roadmap
   dentro do portal. Autenticação (login CPF etc.) passa para fase posterior.
2. **Roadmap do Portal vira feature real** dentro do portal (molde: Obrigações).
3. **Toda funcionalidade ganha Prioridade** (Crítica/Alta/Média/Baixa/Muito Baixa), além de
   Complexidade e Status.
4. **Rede social corporativa = Muito Baixa, FORA do MVP** — só depois de Comunicados, Avisos,
   Aniversariantes, Reconhecimentos e Notificações.
5. **Reframe de viabilidade:** Holerites, Recibos e Espelho **NÃO** esperam ERP. A versão
   viável já é um **repositório de PDFs com upload/importação pelo RH** (reusa o padrão de
   anexo do PJ + Drive). Integração automática com ERP vira evolução futura.
6. **Itens novos:** atualização automática diária de usuários (pipeline WKRADAR), inativação
   automática ao sair do quadro, manter histórico+auditoria após inativação, recuperação de
   senha = reset administrativo, assinatura em 3 níveis (N1/N2/N3).

---

## 2. Nova estrutura de acesso (split Colaborador / Gestor) — a PRIMEIRA entrega

Hoje o app tem dois estados visuais alternados por classe `.hidden`: `#login` (index.html:59) e
`#app` (index.html:108). A Fase 0 insere um **terceiro estado ANTES do `#login`**: uma section
`#acesso` com dois cartões grandes, no mesmo visual do `#login` (mesma `.login__mark`, logo,
wordmark "FioPulse", rodapé "© 2026 Fiobras · acesso restrito").

### Layout (mobile-first, sem emoji, paleta Fiobras verde #008835)
- Topo: marca FioPulse (reusa `.login__mark`/`.login__wordmark`, index.html:61-67).
- Dois cartões empilhados (vertical no mobile, lado a lado >720px):
  1. **Portal do Colaborador** — subtítulo "Acompanhe ponto, comunicados e documentos". Selo
     discreto na Fase 0: "Prévia · sem login ainda". Ação: entra no modo visual.
  2. **Portal do Gestor / Administrador** — subtítulo "GH, líderes e supervisores". Ação:
     revela o formulário de login ATUAL (e-mail/senha).
- Rodapé idêntico ao `#login`.

### Fluxo GESTOR (zero regressão — caminho de hoje intacto)
Clicar no cartão Gestor esconde `#acesso` e mostra o `#login` de hoje, **sem mudar nada**
(mesmo `#login-form`, `onAuthStateChanged` de firebase.js:1893). Adiciona-se só um botão
"Voltar" no topo do `#login` que reexibe `#acesso`. `login()`/`window.login` (override Firebase
em firebase.js:1271) e o submit handler (app.js:7636) **NÃO mudam**.

**Auto-restore de sessão:** na inicialização, se já há sessão de gestor (`currentUserId` válido
/ `onAuthStateChanged` com `fbUser`) → vai direto pro `#app`, como hoje. A tela `#acesso` só
aparece quando **NÃO há sessão**. Regra: sem sessão → `#acesso`; com sessão → `#app`.

### Fluxo COLABORADOR (modo visual SEM auth)
Clicar no cartão Colaborador **não chama Firebase nem signIn**. Chama
`entrarModoColaboradorVisual()`, que:
- (a) cria um usuário sintético em memória — `state.users=[{id:'__preview-colab', nome:'Colaborador
  (prévia)', role:'colaborador', preview:true}]` e `state.currentUserId='__preview-colab'`. Como
  `currentUser()` (app.js:57) só lê `state.currentUserId`/`getUser`, o shell inteiro passa a
  enxergar um colaborador logado **sem tocar em Firebase Auth**;
- (b) seta `state.view.page='colab-home'`, esconde `#acesso`, mostra `#app`;
- (c) chama `renderApp()` — que ramifica por role.

**Saída:** "Sair da prévia" apenas zera `state.currentUserId` e volta pro `#acesso`; **nunca**
chama `auth.signOut`. **Faixa fixa no topo:** "Modo prévia — sem login. Dados ilustrativos."
**Persistência:** lembrar o último portão em `localStorage('fiopulse:portal')` só por UX — o
modo colaborador-preview **nunca** é auto-restaurado como sessão real (ao recarregar, volta pro
`#acesso`, para não parecer "logado").

### Por que não regride o app atual
Gestores nunca entram em `role==='colaborador'` (vem de `users/{uid}.role`). Todos os ramos
novos são `if(role==='colaborador') return …;` **ANTES** do código de hoje, então o caminho do
gestor é byte-a-byte o atual. O usuário-preview só existe em memória e nunca é gravado.

---

## 3. Diagnóstico: existe / adapta / cria do zero

| Capacidade | Situação | Como serve o Portal |
|---|---|---|
| Auth e-mail/senha + `inviteUser` (app secundária) | **Existe** | Login por CPF = e-mail sintético. `inviteUser` é o mecanismo de criação em massa. |
| Permissões data-driven (`PERM_CAPS`/`PERM_DEFAULT`/`can`/`temCap`) | **Existe** | Trilho para o papel `colaborador`; matriz já desenha coluna por papel. |
| Casca de UI (`renderApp`/`renderNav`/`renderBottomNav`/`renderView`) | **Existe** | Ramificar por `role==='colaborador'`. Suporta um 4º papel sem refatorar. |
| Chat 1:1 (reações, recibo, presença) | **Existe** | Canal direto e base de reconhecimentos/feed. |
| Auditoria append-only (`registrarAuditoria` + rule imutável) | **Existe** | Motor de "aceite com trilha" (assinatura N1). |
| Ocorrências (CRUD + card + histórico) | **Existe** | "Minhas ocorrências" = query por `funcionarioId` + rule SELF. |
| Banco de horas + `graficoBarrasBH` + lançamentos diários | **Existe (parcial)** | Saldo próprio existe, mas não num path SELF — precisa de `banco-horas-self`. |
| Funcionários enriquecidos (`nascimento`, aniversário, etc.) | **Existe** | Cartão de identidade; CPF/nascimento já no sistema (semente de senha). |
| Aniversariantes, demografia, changelog | **Existe** | Widgets prontos para a home. |
| Anexo/contrato + histórico versionado (Controle PJ + `google-drive.js`) | **Existe** | Molde para documentos, holerites, espelho (PDF), assinatura. |
| Obrigações (agrupa por mês + status por período + badge + progresso) | **Existe** | **Molde direto do Roadmap in-app** e dos painéis de campanha/avaliação. |
| Tela de acesso (split Colaborador/Gestor) | **Adapta** | 3º estado antes do `#login`, reusando a identidade do `#login`. |
| Shell + nav + dashboard do colaborador SEM auth | **Adapta** | Ramifica os 3 dispatchers; Fase 0 pinta stubs e dados ilustrativos. |
| Papel `colaborador` + escopo `self` + vínculo `uid↔funcionarioId` | **Adapta** | Mudança central. Cascateia em `PERM_DEFAULT`, `podeVer*` e rules. |
| Login por CPF, senha=nascimento, troca obrigatória 1º acesso | **Adapta** | E-mail sintético + flag `precisaTrocarSenha` + `alterarMinhaSenha`. |
| Endurecimento de rules de `funcionarios`/`users` | **Adapta** | Fechar vazamento sem quebrar chat/diretório dos gestores. |
| Atualização/inativação automática diária de usuários | **Adapta** | Pega carona no pipeline WKRADAR diário. |
| Comunicados internos (broadcast 1→N) + Avisos | **Cria** | Coleção `comunicados` + recibo de leitura. Hoje só há chat 1:1 e changelog. |
| **Holerites / recibos / espelho** | **Adapta (reframe)** | **Repositório de PDFs com upload pelo RH** (reusa anexo do PJ + Drive). **Não** bloqueado por ERP. |
| Espelho de ponto REAL (batidas) / apuração mensal | **Cria — bloqueado pela ORIGEM** | Dependem do ERP/WKRADAR trazer batidas/consolidado. FioPulse é só consumidor. |
| Documentos + assinatura N1 (aceite com trilha) | **Cria/Adapta** | Coleção `documentos` (molde PJ) + aceite via auditoria. |
| Assinatura N2 (código e-mail/SMS) / N3 (ICP-Brasil/gov.br) | **Cria — exige Blaze/externo** | Serviço externo + Cloud Functions. |
| Reconhecimentos internos | **Adapta** | Coleção `reconhecimentos` reusando reações do chat. |
| Avaliação de desempenho | **Cria** | Coleção `avaliacoes` (molde `conclusoes{}` das Obrigações). |
| Canal de ética (confidencial) | **Cria** | Coleção write-create-only; anonimato técnico real exige Cloud Function. |
| Push fora do app (FCM) / onboarding robusto / ética anônima real / N3 | **Cria — exige Blaze** | Cloud Functions e/ou provedor externo. |
| Recuperação de senha self por e-mail/SMS real | **Cria — exige externo** | Domínio sintético fake impede reset nativo; precisa de serviço externo. |
| Rede social corporativa (feed) | **Cria — Muito Baixa, fora do MVP** | Só depois de Comunicados/Avisos/Aniversariantes/Reconhecimentos/Notificações. |

---

## 4. Arquitetura do Portal

### Fase 0 — shell sem auth (base visual)
Reaproveita `renderApp()` inteiro (topbar, avatar via `aplicarAvatar` app.js:391, sidebar,
modais, toast, FAB de chat). Ramificar **apenas** as três funções de despacho por
`role==='colaborador'` — e na Fase 0 elas pintam stubs e dados ilustrativos, não consultas
Firestore.

- **`renderApp()` — guardas:** `const ehColab = u.role==='colaborador'`. Envolver em
  `if(!ehColab)` tudo que depende de dado real/listener: `renderPresence()`,
  `window.atualizarBadgeChat()`, `checkChangelog()`, o toast de aniversário (app.js:637).
  `updateFab()` não precisa de ajuste: `can('ocorrencias.criar')` é `false` p/ colaborador, o
  FAB de nova ocorrência some sozinho. `roleLabel()` (app.js:381) ganha o caso `'colaborador'`.
- **`renderNav()`/`renderBottomNav()`:** `if(u.role==='colaborador') return renderNavColaborador()`
  (e equivalente bottom). Itens Fase 0: `colab-home` (Início), `colab-ponto` (Meu Ponto,
  stub), `colab-comunicados` (Comunicados, stub), `colab-documentos` (Documentos, stub),
  `colab-roadmap` (Roadmap do Portal). Bottom-nav sem FAB; "Conta" abre menu com "Sair da
  prévia".
- **`renderView()`:** despacho self **ANTES** do dispatch de gestor (app.js:1179); se a página
  não for `colab-*`, força `colab-home` (espelha o redirect de `renderObrigacoes`). Registrar
  as rotas `colab-*` em `_SKEL_PAGES` (app.js:1163) para o mesmo skeleton 300ms.

### Auth / SELF — fase posterior (Fase 1)
O modo preview da Fase 0 é só visual. A autenticação real entra na Fase 1:
- **Login por CPF (e-mail sintético, sem Custom Token):** CPF (só dígitos) →
  `{cpf}@colaborador.fiobras.local`. `signInWithEmailAndPassword` padrão.
- **Senha inicial = nascimento** (`DDMMAAAA`) + **troca obrigatória no 1º acesso**
  (`precisaTrocarSenha=true` → modal bloqueante via `alterarMinhaSenha`).
- **Vínculo `uid↔funcionarioId`:** gravar `funcionarioId` (= `'f-'+codigo`) e `codigo` em
  `users/{uid}` na criação; lê-los no `onAuthStateChanged`. É o elo que diz "qual funcionário
  sou eu" — pré-requisito de toda query e rule self.

### Papel colaborador (escopo SELF)
1. `PERM_CAPS`: nova área "Portal" com caps SELF (`self.ver`, `self.assinar`, `etica.enviar`).
2. `PERM_DEFAULT`: bloco `colaborador` com caps de gestor em `false` e caps SELF em `true`.
3. `can()` não ganha lógica nova — escopo SELF é resolvido por filtros de query (por
   `funcionarioId`) e pelas rules. `podeVerFuncionario`/`podeVerOcorrenciaUI` ganham um ramo
   `if (u.role==='colaborador')`.

### Regras e PII (o ponto mais delicado)
Hoje **qualquer autenticado lê `funcionarios` e `users` inteiras** (necessário ao
chat/diretório). Com colaboradores logados isso vaza dados de todos. Mudanças (Fase 1):
helpers `isColaborador()`/`euSouODono(funcId)`; `funcionarios` read self para colaborador;
`users` read gestor-ou-próprio + `/config/diretorioGH` público (sem PII) para o chat;
`ocorrencias` com OR self; `banco-horas-self` read self; `banco-horas-saldos` (CPF/PIS)
permanece admin/RH fixo; `presence` **não ligada** ao colaborador; `users` self-update ampliado
para `precisaTrocarSenha`; **`carregarDadosCompletos` ramificado por role** (colaborador nunca
roda `.get()` amplo). Testar no **Emulator Suite** antes do deploy de rules.

### Feature Roadmap in-app
Tela "Roadmap do Portal do Colaborador" dentro do portal, reusando 1:1 o molde visual de
`renderObrigacoes()` + o card de dashboard `renderObrigacoesWidget()`. **Fonte de dados:
arquivo estático versionado no Git** (`public/roadmap.js`) — ver §5.

---

## 5. A área "Roadmap do Portal do Colaborador" (feature)

### Modelo de dados — arquivo estático versionado (NÃO Firestore)
Recomendação: `public/roadmap.js` exportando `const ROADMAP = { fases:[...], itens:[...] }`
(ou `window.ROADMAP`), carregado no index.html como mais um `<script>`. A tela `renderRoadmap()`
lê `window.ROADMAP` direto — sem fetch, sem await, sem listener.

**Por que arquivo versionado:**
- O conteúdo do roadmap muda na velocidade do **código**, não do dado operacional. Quem edita
  é o próprio William via Claude Code, junto do commit que entrega a feature. Marcar um item
  como "Concluído" deve ser o **mesmo ato** de fazer deploy daquela feature.
- Na Fase 0 não há login no portal. Ler/escrever Firestore para um colaborador
  não-autenticado exigiria afrouxar rules — exatamente o vazamento que o plano combate.
  Arquivo estático = zero superfície de risco, zero rule nova, zero billing.
- Obrigações usa Firestore porque é dado operacional editado por humanos no dia a dia. O
  Roadmap é o oposto: é o mapa do produto, governado pelo desenvolvedor. Reusa-se a **camada
  visual** de Obrigações (agrupamento + status + progresso), **não** a camada de dados.

**Evolução futura** (pós-auth, se o RH quiser editar): migrar para um doc único
`/config/roadmap` (1 documento, não coleção) reusando o mesmo schema, gated por uma cap
`roadmap.gerenciar`. **Dívida registrada:** o array estático pode divergir do documento ao
longo do tempo — na Fase 0 é aceitável; a migração para fonte única é dívida assumida.

### UI
- **Header (molde page-header):** título + subtítulo ("O que já existe, o que está sendo
  construído e o que vem por aí."). SEM botão "Nova". À direita, barra de progresso geral
  (X de N concluídas).
- **Agrupamento por FASE** (substitui o agrupamento por mês): blocos na ordem Fase 0 → Fase 1
  → Fase 2 → Futuro, reusando `.mes`/`.mes__cab`/`.mes__lista`. Bloco em foco = `mes--atual`
  com contador (`mes__cont`). Fases seguintes atrás de "Ver as próximas fases"
  (`.vermais`/`.outros`/`.is-open`).
- **Barra de progresso por fase** no `.mes__cab` (% concluído + N/Total) e uma global no header.
- **Linha de item** (reusa `.ob`/`obrigLinhaHtml`): indicador de status à esquerda (NÃO
  clicável — é indicador, não checkbox), Nome em `.ob__nome`, e em `.ob__meta` os selos de
  Prioridade e Complexidade + o número. À direita, selo de status (`.st`): Concluído (verde,
  `st--ok`), Em andamento (azul/âmbar, molde `pend` + estilo novo), Planejado (neutro),
  Pendente/bloqueado (vermelho/cinza, `st--atras`). Clicar abre modal de detalhe (read-only).
- **Modal de detalhe** (reusa `openModal`): todos os campos do schema — Nome, Descrição,
  Objetivo, Prioridade, Complexidade, Dependências (lista com link para os itens citados),
  Status, Critérios de aceite como checklist read-only. É o "guia oficial".
- **Card no dashboard/home** (reusa `renderObrigacoesWidget`): "Roadmap do Portal" com barra de
  progresso global + pills (`ob-pill--ok/--pend/--atras`): "X concluídas · Y em andamento · Z
  planejadas" + as 2-3 próximas linhas em foco. Clicar abre a tela (`data-roadmap-abrir`).
- **Estados:** 0% honesto quando nada concluído; estado vazio honesto se uma fase não tiver
  itens; skeleton 300ms só por consistência.

### Schema do item
- `id` (string) — slug estável e único (ex.: `papel-colaborador-self`), usado em dependências e âncoras.
- `numero` (opcional) — `#N` só para exibição.
- `nome` (string) — título curto da funcionalidade.
- `descricao` (string) — o que a funcionalidade É/faz, em 1-2 frases.
- `objetivo` (string) — o porquê / benefício (separado da descrição para o modal).
- `prioridade` (enum) — `critica` | `alta` | `media` | `baixa` | `muito_baixa`.
- `complexidade` (enum) — `muito_facil` | `facil` | `medio` | `dificil` | `muito_dificil`.
- `dependencias` (array de string OU de ids) — referenciar por id quando possível; dependências
  externas como texto ("billing Blaze", "origem ERP/WKRADAR").
- `status` (enum) — `planejado` | `em_andamento` | `concluido` | `pendente` (bloqueado por
  origem externa/billing).
- `criteriosAceite` (array de string) — checklist do que define "pronto".
- `fase` (enum) — `fase0` | `fase1` | `fase2` | `futuro`.
- `concluidoEm` (string, opcional) — data AAAA-MM-DD quando `status='concluido'`.
- `classificacao` (enum, opcional) — `reaproveita` | `adapta` | `cria`.

**Status inicial:** todos `planejado`, exceto os bloqueados por origem/billing (que nascem
`pendente`) e os próprios itens da Fase 0 (que nascem `em_andamento`/`concluido` conforme
entregues — o roadmap documenta a si mesmo).

### Critérios de aceite (da feature Roadmap)
- A tela aparece como item de menu dentro do shell do portal e abre em
  `state.view.page='colab-roadmap'`, SEM exigir login (Fase 0).
- Itens vêm de `public/roadmap.js` (versionado); nenhuma leitura de Firestore, nenhuma rule nova.
- Itens agrupados em fases na ordem correta; o bloco em foco é destaque (`mes--atual`); fases
  seguintes atrás de "Ver as próximas fases".
- Cada fase mostra barra de progresso (% e N/Total); existe barra global no header e no card.
- Cada linha mostra Nome, número, selo de Prioridade, selo de Complexidade e selo de Status
  com as cores do molde (Concluído=verde, Em andamento/Planejado=âmbar/neutro, Pendente=vermelho/cinza).
- Clicar abre modal de detalhe read-only com todos os campos; o modal **não** edita.
- Dependências no modal listam os itens citados (e externas como texto), linkando quando possível.
- Card "Roadmap do Portal" no dashboard reusa o molde do widget de Obrigações.
- Mudar o status de um item em `roadmap.js` reflete na tela e nas barras após reload, sem outra
  alteração de código.
- Sem emoji; layout aprovado em mock HTML real antes de aplicar.
- **Regressão zero:** Obrigações dos gestores e seus estilos (`.ob`, `.mes`, `.vermais`,
  `.ob-pill`, `.st`) continuam idênticos — o Roadmap reusa as classes sem alterá-las (ou usa
  variações `.rm-*` se houver risco de colisão).

---

## 6. Roadmap priorizado — todas as features

Legenda de fase: **Fase 0** (acesso+shell visual sem auth) · **Fase 1 (MVP)** (auth + SELF +
consultas + comunicados + documentos N1) · **Fase 2** (operação e engajamento, sem billing) ·
**Futuro** (origem ERP / billing Blaze / provedor externo).

| # | Nome | Fase | Prioridade | Complexidade | Status | Classif. | Dependências |
|---|---|---|---|---|---|---|---|
| 38 | Tela de acesso (split Colaborador/Gestor) | Fase 0 | Crítica | Fácil | Em andamento | adapta | Casca de UI (renderApp/renderView) |
| 39 | Estrutura visual/shell + navegação do portal SEM auth | Fase 0 | Crítica | Médio | Em andamento | adapta | #38; renderNav/renderBottomNav/renderView |
| 40 | Dashboard inicial do colaborador (base visual, dados ilustrativos) | Fase 0 | Crítica | Médio | Em andamento | adapta | #39 |
| 41 | Roadmap do Portal in-app (fases, status, progresso) | Fase 0 | Alta | Médio | Em andamento | adapta | #39; molde Obrigações |
| 1 | Papel colaborador + escopo SELF | Fase 1 | Crítica | Médio | Planejado | adapta | PERM_CAPS/PERM_DEFAULT/can |
| 11 | Vínculo uid↔funcionarioId no perfil | Fase 1 | Crítica | Médio | Planejado | adapta | #1; users/{uid} + rule self-update |
| 2/12 | Endurecer rules funcionarios/users (sem quebrar chat) | Fase 1 | Crítica | Difícil | Planejado | adapta | #11; carregarDadosCompletos ramificado; /config/diretorioGH |
| 4 | Login por CPF via e-mail sintético | Fase 1 | Crítica | Muito Fácil | Planejado | reaproveita | Auth e-mail/senha; #5 |
| 3 | Toggle Colaborador(CPF)/Gestor(e-mail) no login | Fase 1 | Alta | Fácil | Planejado | adapta | #4; window.login |
| 5 | Criação automática de usuários (CPF+nascimento, lote) | Fase 1 | Crítica | Difícil | Planejado | adapta | #1; nascimento + banco-horas-saldos.cpf; inviteUser |
| — | Atualização automática DIÁRIA de usuários (WKRADAR) | Fase 1 | Alta | Médio | Planejado | adapta | #5; pipeline-rh/{cur,hist} |
| — | Inativação automática ao sair do quadro | Fase 1 | Alta | Médio | Planejado | adapta | Atualização diária; funcionarios.demissao/ativo; users.ativo no onAuthStateChanged |
| — | Manter histórico + auditoria após inativação | Fase 1 | Alta | Fácil | Planejado | reaproveita | Inativação automática; auditoria append-only |
| 6 | Troca obrigatória de senha no 1º acesso | Fase 1 | Crítica | Médio | Planejado | adapta | #5; #7; alterarMinhaSenha |
| 7 | Rule self-update da flag precisaTrocarSenha | Fase 1 | Alta | Muito Fácil | Planejado | adapta | firestore.rules |
| — | Recuperação de senha = reset administrativo pelo RH | Fase 1 | Alta | Médio | Planejado | adapta | #6; gestão admin de contas |
| 8 | Shell e navegação definitivos do colaborador (dados reais) | Fase 1 | Crítica | Médio | Planejado | adapta | #39; #1; #2/12 |
| 20 | Início do colaborador com dados reais (cartão + atalhos) | Fase 1 | Alta | Médio | Planejado | adapta | #40; #11; #2/12; renderFuncPerfilSecoes |
| 13 | Minhas ocorrências (consulta read-only) | Fase 1 | Alta | Fácil | Planejado | reaproveita | #11; ocorrencias + rule SELF; renderOccCard |
| 14 | Meu banco de horas (saldo self + gráfico, sem PII) | Fase 1 | Alta | Médio | Planejado | adapta | #11; banco-horas-self; graficoBarrasBH |
| 21 | Comunicados: coleção + camada de dados (1→N) | Fase 1 | Alta | Médio | Planejado | cria | rules (read segmentado, write temCap); papel colaborador |
| 22 | Comunicados: tela e composição (autor RH/admin) | Fase 1 | Alta | Médio | Planejado | adapta | #21; openModal/toast |
| 23 | Comunicados: leitura pelo colaborador + recibo | Fase 1 | Alta | Médio | Planejado | adapta | #21; #22; recibo do chat |
| — | Avisos internos (subtipo de comunicado) | Fase 1 | Média | Fácil | Planejado | adapta | #21 |
| 24 | Widget de aniversariantes no início | Fase 1 | Média | Fácil | Planejado | reaproveita | #20; renderAniversariantesWidget; /config/aniversariantes |
| 29 | Coleção documentos + repositório (base de assinatura) | Fase 1 | Alta | Médio | Planejado | adapta | #11; anexo PJ (contratoUrl/ehUrlSegura/google-drive.js); rule nova |
| 30 | Assinatura N1 — aceite com trilha (usuário+data+hora+UA+log) | Fase 1 | Alta | Médio | Planejado | reaproveita | #29; registrarAuditoria; crypto.subtle |
| 18 | Meus holerites — repositório de PDFs via upload do RH | Fase 1 | Alta | Médio | Planejado | adapta | #11; anexo PJ + google-drive.js; rule read SELF |
| 15 | Espelho de ponto — repositório de PDFs via upload do RH | Fase 1 | Alta | Médio | Planejado | adapta | #18; #11 |
| 19 | Meus recibos — repositório de PDFs via upload do RH | Fase 1 | Média | Fácil | Planejado | adapta | #18 |
| 9 | Gestão admin de contas de colaborador | Fase 2 | Média | Médio | Planejado | adapta | #5; #6; auditoria |
| 15b | Espelho de ponto — versão SALDO (lançamentos diários) | Fase 2 | Média | Fácil | Planejado | adapta | #14; banco-horas-self |
| 25 | Notificações corporativas in-app (central + badge) | Fase 2 | Média | Difícil | Planejado | adapta | #23; listener de ocorrências; badge/toast do chat |
| 26 | Reconhecimentos internos (elogios entre colegas) | Fase 2 | Média | Médio | Planejado | adapta | #11; reacoes{} do chat; rule nova |
| 33b | Assinatura N2 — código por e-mail/SMS | Fase 2 | Média | Difícil | Planejado | cria | #30; serviço externo + Cloud Functions (Blaze) |
| 31 | Assinatura de advertências (disciplinar com ciência) | Fase 2 | Média | Médio | Planejado | adapta | #30; #29; badge das Obrigações |
| 32 | Assinatura de contratos e aditivos (campanha por segmento) | Fase 2 | Média | Difícil | Planejado | adapta | #30; #29; aditivos[] do PJ; conclusoes{} |
| 34 | Avaliação de desempenho — ciclos e questionários | Fase 2 | Média | Difícil | Planejado | cria | conclusoes{}; podeVerFuncionario; PERM_CAPS; rules |
| 36 | Canal de ética/denúncia (confidencial in-app) | Fase 2 | Média | Médio | Planejado | cria | papel colaborador; caps de ética; rule write-create-only |
| 10 | Onboarding robusto via Cloud Function (Admin SDK) | Futuro | Baixa | Difícil | Pendente | cria | billing Blaze; substitui #5 |
| 16 | Integração automática ERP/WKRADAR de holerites | Futuro | Baixa | Muito Difícil | Pendente | cria | #18; origem ERP hospedar PDFs; Storage |
| 16b | Espelho de ponto REAL (batidas) via origem | Futuro | Baixa | Muito Difícil | Pendente | cria | origem WKRADAR/ERP; vínculo + rules self |
| 17 | Apuração de ponto (fechamento mensal) via origem | Futuro | Baixa | Muito Difícil | Pendente | cria | origem ERP/folha; espelho real |
| 28 | Notificações push fora do app (FCM) | Futuro | Baixa | Muito Difícil | Pendente | cria | billing Blaze; #25 como fallback; SW de push |
| 33 | Assinatura N3 — validade jurídica (ICP-Brasil/gov.br/Clicksign/D4Sign) | Futuro | Baixa | Muito Difícil | Pendente | cria | #30; Cloud Functions + Blaze; contrato externo |
| — | Recuperação de senha self por e-mail/SMS real | Futuro | Baixa | Difícil | Pendente | cria | serviço externo; reset administrativo (base) |
| 35 | Avaliação — autoavaliação e feedback do colaborador | Futuro | Baixa | Médio | Planejado | adapta | #34; vínculo; renderView/renderNav ramificados |
| 37 | Canal de ética — anonimato técnico real | Futuro | Baixa | Muito Difícil | Pendente | cria | Cloud Functions + Blaze; #36; política de retenção |
| 27 | Rede social corporativa (feed: posts/comentários/curtidas) | Futuro | **Muito Baixa** | Difícil | Planejado | cria | reacoes{}; google-drive.js; Comunicados/Avisos/Aniversariantes/Reconhecimentos/Notificações antes |

---

## 7. Fases e ordem ideal de implementação

A lógica é: **base visual sem risco → fundação SELF + segurança → login → consultas baratas →
comunicação → documentos → o que depende de origem/billing por último.**

### Fase 0 — base visual sem auth (já em andamento)
Entrega valor de produto (clareza de direção, base para iterar) **antes** de qualquer risco de
autenticação. Ordem: (1) mock HTML navegável da Fase 0 + aprovação do dono; (2) Tela de acesso
split; (3) modo colaborador-preview + ramificação dos 3 dispatchers; (4) dashboard inicial +
telas-stub; (5) Roadmap in-app. O Roadmap como feature real vira o documento vivo de
alinhamento com a diretoria — reduz o risco político de um projeto longo perder patrocínio.

### Fase 1 (MVP) — o salto self honesto
1. **Papel colaborador + escopo SELF (#1)** e **vínculo uid↔funcionarioId (#11)** — fundação;
   entregar colados.
2. **Endurecer rules (#2/#12)** — gate de segurança obrigatório antes de qualquer tela self ir
   a produção. Testar no Emulator. Tratar como entrega de primeira classe: um vazamento de
   nascimento/PII no lançamento mataria a confiança do projeto.
3. **Rule self-update de precisaTrocarSenha (#7)** — barata, pré-requisito da troca de senha.
4. **Criação automática de usuários (#5)** + **atualização/inativação automática diária** +
   **histórico após inativação** — origem das contas e sincronização com o pipeline.
5. **Login por CPF (#4)** → **Toggle (#3)** → **Troca obrigatória (#6)** → **Reset
   administrativo** — fecham o onboarding com segurança.
6. **Shell definitivo (#8)** + **Início com dados reais (#20)**.
7. **Consultas baratas:** Minhas ocorrências (#13), Meu banco de horas (#14), Aniversariantes (#24).
8. **Comunicados:** coleção (#21) → tela autor (#22) → leitura+recibo (#23) + Avisos.
9. **Documentos:** coleção (#29) → Assinatura N1 (#30).
10. **Repositórios PDF (reframe):** Holerites (#18), Espelho via PDF (#15), Recibos (#19) — via
    upload do RH, sem billing.

### Fase 2 — operação e engajamento (sem billing novo)
Gestão admin de contas (#9), Espelho versão SALDO (#15b), Notificações in-app (#25),
Reconhecimentos (#26), Assinatura N2 (#33b), Advertências (#31), Contratos/aditivos (#32),
Avaliação ciclos (#34), Canal de ética confidencial (#36).

### Futuro — origem ERP, billing Blaze ou provedor externo
Onboarding via Cloud Function (#10), Integração ERP de holerites (#16), Espelho REAL (#16b),
Apuração (#17), Push FCM (#28), Assinatura N3 (#33), Recuperação self real, Autoavaliação (#35),
Ética anônima técnica real (#37), **Rede social (#27)**.

---

## 8. MVP / Fase 2 / Futuro — e o lugar da rede social

### MVP (Fase 1)
A fundação SELF + segurança + onboarding + consultas com dado/UI prontos + comunicados +
documentos N1 + os repositórios de PDF (graças ao reframe). É o menor conjunto que entrega um
Portal real **sem depender de origem externa nem de billing novo**.

### Fase 2
Operação (gestão de contas, reset), engajamento (notificações in-app, reconhecimentos) e
conformidade (advertências, contratos, avaliação, ética confidencial, assinatura N2).

### Futuro
Tudo que exige **billing Blaze**, **origem ERP** ou **provedor externo**.

### Rede social corporativa = Muito Baixa, FORA do MVP
A "rede social corporativa" do briefing é o **Feed (#27)** — prioridade **Muito Baixa**, Fase
Futuro, **explicitamente fora do MVP**. Pertencimento se constrói por **utilidade** (o
colaborador entra porque resolve a vida dele), não por feed. As alternativas mais simples e de
maior alívio operacional vêm **antes**, nesta ordem: **Comunicados → Avisos → Aniversariantes →
Reconhecimentos → Notificações in-app**. Só quando o Portal já for o lugar onde o colaborador
resolve ponto, documento, contracheque e dúvida vale considerar feed e push.

---

## 9. Backlog detalhado

### Fase 0 — acesso + shell visual sem auth

#### 9.1 Tela de acesso (split Colaborador/Gestor) — #38
**Fase:** 0 · **Prioridade:** Crítica · **Complexidade:** Fácil · **Status:** Em andamento · **Classificação:** adapta

- **Descrição:** Criar a section `#acesso` no index.html (antes de `#login`) com a marca
  FioPulse e dois cartões grandes: "Portal do Colaborador" (selo "Prévia · sem login ainda") e
  "Portal do Gestor/Administrador". Inicialização: sem sessão → `#acesso`; com sessão de gestor
  → direto pro `#app`. Cartão Gestor revela o `#login` de hoje (com botão "Voltar").
- **Objetivo:** Entrada única e clara para os dois públicos no mesmo endereço, sem confundir o
  colaborador com "e-mail corporativo", e sem tocar no fluxo de login dos gestores.
- **Dependências:** casca de UI existente (`renderApp`/`renderView`); toggle `.hidden`
  (login()/logout()).
- **Critérios de aceite:** `#acesso` aparece quando não há sessão, no lugar de `#login` direto;
  cartão Gestor revela o login atual sem nenhuma mudança no fluxo/`onAuthStateChanged`; botão
  Voltar reexibe `#acesso`; gestor com sessão nunca vê `#acesso` nem `#login`; visual idêntico
  à identidade do `#login` (sem emoji), aprovado em mock; login de gestor byte-a-byte como antes.

#### 9.2 Entrar no modo Colaborador-preview sem auth — #38 (parte)
**Fase:** 0 · **Prioridade:** Crítica · **Complexidade:** Fácil · **Status:** Em andamento · **Classificação:** cria

- **Descrição:** `entrarModoColaboradorVisual()` cria usuário sintético em memória
  (`state.users=[{id:'__preview-colab',role:'colaborador',preview:true}]`,
  `state.currentUserId='__preview-colab'`), NÃO chama Firebase/signIn e NÃO grava em
  `store.save`. Esconde `#acesso`, mostra `#app`, seta `colab-home`, chama `renderApp()`. "Sair
  da prévia" zera `currentUserId` e volta pro `#acesso` (nunca `auth.signOut`). Recarregar não
  auto-restaura o preview.
- **Objetivo:** Permitir construir e validar toda a base visual do portal sem o risco de
  autenticação, de forma honesta (modo prévia).
- **Dependências:** `currentUser()` (app.js:57); `#38`.
- **Critérios de aceite:** clicar em "Portal do Colaborador" entra no shell sem chamada de
  rede; `currentUser()` retorna o preview; recarregar volta pra Tela de Acesso; "Sair da
  prévia" sem erros; nenhuma escrita em localStorage/Firestore no modo preview.

#### 9.3 Estrutura visual / shell + navegação do portal SEM auth — #39
**Fase:** 0 · **Prioridade:** Crítica · **Complexidade:** Médio · **Status:** Em andamento · **Classificação:** adapta

- **Descrição:** No topo de `renderApp()`, `const ehColab=u.role==='colaborador'` e envolver em
  `if(!ehColab)` as chamadas que dependem de dado real/listener (`renderPresence()`,
  `atualizarBadgeChat()`, `checkChangelog()`, toast de aniversário). `renderNav`/`renderBottomNav`
  ramificam para versões do colaborador (5 itens, sem FAB; "Conta" com "Sair da prévia").
  `renderView` roteia `colab-*` ANTES do dispatch de gestor e força `colab-home` se a página não
  for `colab-*`. `roleLabel()` ganha o caso `'colaborador'`. Registrar `colab-*` em `_SKEL_PAGES`.
- **Objetivo:** Base de navegação reaproveitando o shell inteiro, com retorno antecipado que
  preserva o caminho do gestor byte-a-byte.
- **Dependências:** `#38`; `renderNav`/`renderBottomNav`/`renderView`.
- **Critérios de aceite:** gestores renderizam exatamente como hoje; colaborador vê só o menu
  próprio sem FAB; nenhum listener de presence/chat/changelog é iniciado no modo preview;
  navegar para view de gestor redireciona para `colab-home`; `roleLabel` exibe "Colaborador" sem
  afetar os demais.

#### 9.4 Dashboard inicial do colaborador (base visual) — #40
**Fase:** 0 · **Prioridade:** Crítica · **Complexidade:** Médio · **Status:** Em andamento · **Classificação:** adapta

- **Descrição:** `renderColaboradorHome()` com faixa "Modo prévia — dados ilustrativos"; cartão
  de identidade ilustrativo (nome fictício, cargo, setor, turno, admissão, tempo de casa,
  aniversário) no visual de `renderFuncPerfilSecoes` mas com dados mock locais e SEM PII; linha
  de stats (`.stats`/`.stat`) com Saldo de banco de horas, Comunicados não lidos e Documentos
  pendentes (números ilustrativos); cards de atalho que navegam para as telas-stub; placeholder
  de aniversariantes (2-3 nomes fictícios). Não ler `state.funcionarios`/`ocorrencias`.
- **Objetivo:** Mostrar a casa do colaborador e o lugar de cada futura feature, sem prometer
  dado real.
- **Dependências:** `#39`; `renderDashboard`/`.stats`/`.stat`; `renderFuncPerfilSecoes`.
- **Critérios de aceite:** home mostra cartão de identidade sem nenhuma PII; stats e atalhos com
  dados ilustrativos navegam ao clicar; nenhuma leitura de coleções reais; faixa "Modo prévia"
  visível; layout coeso com o design system, sem emoji, aprovado em mock.

#### 9.5 Telas-stub: Meu Ponto, Comunicados, Documentos — #40 (parte)
**Fase:** 0 · **Prioridade:** Alta · **Complexidade:** Muito Fácil · **Status:** Em andamento · **Classificação:** cria

- **Descrição:** Helper `renderStubColab(titulo, descricao, icone, faseLabel)` reusando
  `.page-header` + `.empty`, e as três telas (`colab-ponto`/`colab-comunicados`/`colab-documentos`)
  que o chamam. Cada stub: título, parágrafo "Em breve…", ícone do design system, selo "Planejado
  para a Fase X". Zero dado real, zero listener.
- **Objetivo:** Base visual para as próximas entregas plugarem o conteúdo.
- **Dependências:** `#39`; `.page-header`/`.empty`.
- **Critérios de aceite:** as três telas renderizam o estado-stub coeso; nenhuma consulta a
  Firestore; cada stub deixa clara a fase planejada; reaproveita o padrão visual sem emoji;
  aprovado em mock.

#### 9.6 Roadmap do Portal in-app — #41
**Fase:** 0 · **Prioridade:** Alta · **Complexidade:** Médio · **Status:** Em andamento · **Classificação:** adapta

- **Descrição:** `renderColabRoadmap()` reusando o molde de Obrigações (agrupamento por fase no
  padrão `.mes`/`mes--atual`/`.vermais`, linhas no padrão `obrigLinhaHtml`, selos `.st`, pílulas
  `.ob-pill`, barras de progresso por fase + global). Cada item exibe Nome, Descrição, Objetivo,
  Prioridade, Complexidade, Dependências, Status e Critérios de aceite (modal de detalhe via
  `openModal`). Fonte: array estático `public/roadmap.js` populado a partir deste documento.
- **Objetivo:** Tornar o roadmap o guia oficial e documento vivo de alinhamento, reaproveitando
  o motor de status/progresso já testado em produção.
- **Dependências:** `#39`; molde Obrigações; `public/roadmap.js`.
- **Critérios de aceite:** ver §5 (critérios da feature Roadmap).

#### 9.7 Mock HTML navegável da Fase 0 + aprovação
**Fase:** 0 · **Prioridade:** Crítica · **Complexidade:** Fácil · **Status:** Em andamento · **Classificação:** cria

- **Descrição:** Antes de tocar no app, montar mock HTML standalone (no navegador, nunca o
  preview do Claude Code) cobrindo: Tela de Acesso, shell do colaborador, dashboard, as 3
  telas-stub e o Roadmap por fases. Validar identidade Fiobras, ausência de emoji,
  responsividade mobile-first e o teatro de carregamento.
- **Objetivo:** Cumprir a regra do dono (mockar e aprovar antes de aplicar) e evitar retrabalho.
- **Dependências:** bloqueante para os demais itens da Fase 0.
- **Critérios de aceite:** mock abre no navegador e cobre todas as telas da Fase 0; identidade
  e regras do dono respeitadas; responsivo verificado; aprovação explícita registrada antes de
  qualquer mudança em app.js/index.html.

---

### Fase 1 (MVP) — auth, SELF, consultas, comunicados, documentos

#### 9.8 Papel colaborador + escopo SELF — #1
**Fase:** 1 · **Prioridade:** Crítica · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Introduzir o 4º papel `colaborador` no motor data-driven
  (`PERM_CAPS`/`PERM_DEFAULT`/`can`); bloco `colaborador` (caps de gestor `false`, caps self
  `true`); área "Portal" em `PERM_CAPS`; incluir `colaborador` na matriz; ramo
  `if(u.role==='colaborador')` em `podeVerFuncionario`/`podeVerOcorrenciaUI`.
- **Objetivo:** Destravar todo o Portal. Fundação única sobre a qual escopo SELF, filtros e
  rules se apoiam.
- **Dependências:** nenhuma externa; pré-requisito de quase tudo.
- **Critérios de aceite:** colaborador loga em shell sem telas de gestor;
  `currentUser().funcionarioId/.codigo` populados; matriz mostra a coluna `colaborador` com caps
  de gestor off; `podeVerFuncionario` só `true` para o próprio; regressão zero nos demais papéis.

#### 9.9 Vínculo uid↔funcionarioId no perfil — #11
**Fase:** 1 · **Prioridade:** Crítica · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Gravar `funcionarioId`(='f-'+codigo) e `codigo` em `users/{uid}` na criação e
  lê-los no `onAuthStateChanged`; helpers `isColaborador()`/`euSouODono(funcId)`; self-update
  restrito (colaborador não edita esses campos).
- **Objetivo:** Habilitar todas as consultas self com um único ponto de verdade.
- **Dependências:** #1; `users/{uid}` + rule self-update; `onAuthStateChanged`; #5 para popular.
- **Critérios de aceite:** `funcionarioId/.codigo` preenchidos após login; update desses campos
  pelo próprio é negado; sem vínculo não lê nenhum funcionário (fail-safe).

#### 9.10 Endurecer rules de funcionarios/users — #2/#12
**Fase:** 1 · **Prioridade:** Crítica · **Complexidade:** Difícil · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Fechar o vazamento (hoje qualquer autenticado lê `funcionarios`/`users`
  inteiras). Helpers `isColaborador()`/`euSouODono`; `funcionarios` read self; `users` read
  gestor-ou-próprio; `/config/diretorioGH` público (sem PII) para o chat; ramificar
  `carregarDadosCompletos` por role (colaborador nunca roda `.get()` amplo).
- **Objetivo:** Pré-condição de segurança para ligar colaboradores. Risco #1 (nascimento é
  semente de senha de todos).
- **Dependências:** #11; testar no Emulator Suite antes do deploy.
- **Critérios de aceite:** colaborador recebe permission-denied em `.get()` amplo; lê o próprio
  doc + diretório GH; chat/diretório dos gestores intactos; Emulator passa próprio-OK /
  terceiro-NEGADO.

#### 9.11 Login por CPF via e-mail sintético — #4
**Fase:** 1 · **Prioridade:** Crítica · **Complexidade:** Muito Fácil · **Status:** Planejado · **Classificação:** reaproveita

- **Descrição:** `cpfParaEmail(cpf)` → `{cpf}@colaborador.fiobras.local`;
  `signInWithEmailAndPassword` padrão; handler do modo Colaborador monta o e-mail antes de
  `window.login`.
- **Objetivo:** Login por CPF sem billing nem Custom Token, reaproveitando o Auth em produção.
- **Dependências:** #3 e #5; sem billing.
- **Critérios de aceite:** CPF com/sem pontuação resulta no mesmo e-mail; CPF inválido mostra
  erro antes do Auth; conta resolve para `role='colaborador'`.

#### 9.12 Toggle Colaborador(CPF)/Gestor(e-mail) no login — #3
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Fácil · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Toggle no `#login` alternando o modo do campo (label CPF + máscara só dígitos
  vs. e-mail). No submit em modo Colaborador, monta o e-mail sintético. Lembrar último modo em
  localStorage. "Esqueci a senha" oculto no modo Colaborador (domínio fake).
- **Objetivo:** Entrada clara para os dois públicos na mesma tela de login.
- **Dependências:** #4; `window.login`.
- **Critérios de aceite:** alternar troca label/máscara; login de colaborador cai no shell do
  colaborador; login de gestor idêntico; mock aprovado.

#### 9.13 Criação automática de usuários colaboradores — #5
**Fase:** 1 · **Prioridade:** Crítica · **Complexidade:** Difícil · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Gerar logins em lote cruzando `funcionarios.nascimento` +
  `banco-horas-saldos.cpf`, reusando `inviteUser` (app secundária), senha=nascimento (DDMMAAAA)
  e `precisaTrocarSenha:true`; lote sequencial com progresso, log e idempotência; tratar
  sem-CPF/sem-nascimento.
- **Objetivo:** Onboarding de centenas sem cadastro manual, com dados que já existem.
- **Dependências:** #1; CPF do pipeline (write:false). **Dívida:** lote client-side é frágil —
  robusto seria Cloud Function (#10, Blaze).
- **Critérios de aceite:** lote cria N contas + N docs com vínculo/flag sem deslogar o admin;
  rerodar não duplica; pendências em relatório; conta loga e cai na troca obrigatória.

#### 9.14 Atualização automática DIÁRIA de usuários (WKRADAR)
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Riding no pipeline WKRADAR diário: novos funcionários ganham conta
  automaticamente; vínculos e dados de identidade são reconciliados a partir de
  `pipeline-rh/{cur,hist}`.
- **Objetivo:** Manter a base de logins viva sem o RH lembrar de criar conta a cada admissão.
- **Dependências:** #5; `pipeline-rh/{cur,hist}` (atualizado diariamente).
- **Critérios de aceite:** funcionário novo do pipeline aparece com conta no dia seguinte sem
  ação manual; idempotente (não duplica); pendências (sem CPF/nascimento) listadas.

#### 9.15 Inativação automática ao sair do quadro
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Quando o WKRADAR marca `funcionarios.ativo=false`/`demissao`, refletir em
  `users/{uid}.ativo=false`; checar `ativo` no `onAuthStateChanged` e **bloquear a entrada**.
- **Objetivo:** Cortar o acesso de quem saiu do quadro automaticamente.
- **Dependências:** atualização diária; `funcionarios.demissao/ativo`. **Ponto cego:**
  desativar o doc NÃO desabilita a credencial no Firebase Auth — daí o check em
  `onAuthStateChanged` (revogação real só via Admin SDK no futuro).
- **Critérios de aceite:** ex-funcionário com `users.ativo=false` não consegue entrar; gestores
  ativos sem regressão; bloqueio registrado.

#### 9.16 Manter histórico + auditoria após inativação
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Fácil · **Status:** Planejado · **Classificação:** reaproveita

- **Descrição:** Inativação **não deleta** o doc do usuário nem os registros associados;
  histórico e trilha de auditoria preservados (append-only).
- **Objetivo:** Conformidade e rastreabilidade (defesa trabalhista, LGPD com política de
  retenção).
- **Dependências:** inativação automática; auditoria append-only (`registrarAuditoria` + rule
  imutável).
- **Critérios de aceite:** após inativação, histórico/auditoria do ex-funcionário continuam
  legíveis para admin/RH; nada é apagado; política de retenção documentada.

#### 9.17 Troca obrigatória de senha no 1º acesso — #6
**Fase:** 1 · **Prioridade:** Crítica · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Ler `precisaTrocarSenha` no `onAuthStateChanged`; modal bloqueante via
  `alterarMinhaSenha`; ao sucesso, zerar a flag (rule self-update); nova senha ≠ nascimento, ≥6.
- **Objetivo:** Mitigar a semente de senha fraca (nascimento é previsível).
- **Dependências:** #5; #7.
- **Critérios de aceite:** recém-criado é forçado ao modal e não navega antes; após trocar,
  próximo login sem modal; nova senha=nascimento rejeitada; gestores nunca veem o modal.

#### 9.18 Rule self-update da flag precisaTrocarSenha — #7
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Muito Fácil · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Ampliar `affectedKeys().hasOnly(['fotoBase64'])` para incluir
  `precisaTrocarSenha`, mantendo `role`/`funcionarioId`/`ativo`/`codigo` bloqueados no mesmo update.
- **Objetivo:** Fechar a troca obrigatória sem abrir outra porta de auto-edição.
- **Dependências:** acoplada ao #6; testar no Emulator.
- **Critérios de aceite:** colaborador seta `precisaTrocarSenha=false` no próprio doc; negado ao
  mudar role; self-update de fotoBase64 segue funcionando.

#### 9.19 Recuperação de senha = reset administrativo pelo RH
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Como o domínio `colaborador.fiobras.local` é fake, `sendPasswordResetEmail`
  não funciona e "Esqueci a senha" fica oculto no modo Colaborador. O reset viável é
  **administrativo pelo RH**: re-seta a senha para nascimento (DDMMAAAA) + `precisaTrocarSenha=true`.
- **Objetivo:** Resolver o "esqueci a senha" sem e-mail real e sem billing.
- **Dependências:** #6; gestão admin de contas. **Limitação:** resetar a senha de OUTRO usuário
  sem Admin SDK é client-side (recria nascimento, não senha arbitrária); reintroduz senha
  previsível a cada reset.
- **Critérios de aceite:** RH reseta a conta; próximo login do colaborador cai na troca
  obrigatória; ação registrada na auditoria; "Esqueci a senha" não aparece no modo Colaborador.

#### 9.20 Shell e navegação definitivos do colaborador (dados reais) — #8
**Fase:** 1 · **Prioridade:** Crítica · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Promover o shell visual da Fase 0 a definitivo, ligando dados reais e
  consultas self (com rules endurecidas e `carregarDadosCompletos` ramificado por role).
- **Objetivo:** A casa real do colaborador, reaproveitando topbar/avatar/sidebar/modais/toast.
- **Dependências:** #39 (Fase 0); #1; #2/#12.
- **Critérios de aceite:** colaborador vê só o menu próprio sem FAB; consultas self carregam sem
  permission-denied; gestores sem alteração; tentar view de gestor redireciona; mock aprovado.

#### 9.21 Início do colaborador com dados reais — #20
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** `renderColaboradorHome` real com o cartão do próprio funcionário (nome, cargo,
  setor, turno, admissão, tempo de casa, aniversário) + cards de atalho. Reusa
  `renderFuncPerfilSecoes` em modo self (esconder PII admin-only); lê só `funcionarios/{meuId}`.
- **Objetivo:** Entrada coesa do Portal com dado real, orientando às consultas.
- **Dependências:** #40 (Fase 0); #11; #2/#12; `renderFuncPerfilSecoes`.
- **Critérios de aceite:** só o próprio cartão; nenhuma PII (CPF/PIS); atalhos navegam; nav sem
  itens de gestor.

#### 9.22 Minhas ocorrências (consulta read-only) — #13
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Fácil · **Status:** Planejado · **Classificação:** reaproveita

- **Descrição:** Tela self listando as ocorrências do próprio colaborador
  (`where funcionarioId == meu`), reusando `renderOccCard` e o histórico, sem ações de status.
- **Objetivo:** Transparência sobre atrasos/faltas/abonos sem perguntar ao líder. Dado e UI já
  existem.
- **Dependências:** #11; `ocorrencias` + rule SELF; `renderOccCard`.
- **Critérios de aceite:** vê só as próprias; ler de terceiros negado na rule; sem botões de
  conferir/lançar/editar; histórico em leitura.

#### 9.23 Meu banco de horas (saldo self + gráfico, sem PII) — #14
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Expor o próprio saldo + gráfico do mês via `banco-horas-self/{codigo}` (saldo +
  lançamentos, SEM PII) populado pelo pipeline, reusando `graficoBarrasBH`; carregar no
  `carregarDadosCompletos` ramificado.
- **Objetivo:** Colaborador acompanha o saldo sem depender do RH.
- **Dependências:** #11; pipeline WKRADAR escrevendo `banco-horas-self`; `graficoBarrasBH`.
- **Critérios de aceite:** vê o próprio saldo + gráfico; não lê outro `codigo`; sem pipeline,
  "sem dados" em vez de erro.

#### 9.24 Comunicados: coleção + camada de dados — #21
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** cria do zero

- **Descrição:** Coleção `comunicados/{id}` + CRUD (`criarComunicado`, `escutarComunicados`,
  `editarComunicado`, `fixarComunicado`). Schema `{titulo, corpo, segmento{tipo,valores},
  autorUid, autorNome, publicadoEm(server), fixado, ativo, requerConfirmacao}`. Cap
  `comunicados.gerenciar` (true admin/RH).
- **Objetivo:** Estabelecer a comunicação 1→N que hoje não existe. Backbone de comunicados,
  avisos e notificações.
- **Dependências:** rules (read segmentado, write por temCap); turno/setor; papel colaborador.
- **Critérios de aceite:** admin/RH cria e aparece em <2s no segmento; demais não criam;
  `turno:1` não chega ao turno 2; criação/edição na auditoria.

#### 9.25 Comunicados: tela e composição (autor RH/admin) — #22
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** `renderComunicados` com lista publicada (cronológica reversa, fixado no topo) +
  modal de composição (título, corpo, segmento, fixado/requer confirmação). Corpo texto simples
  + quebras (escapeHtml).
- **Objetivo:** Canal oficial de avisos com segmentação, substituindo WhatsApp/mural.
- **Dependências:** #21; mock aprovado.
- **Critérios de aceite:** publica em <5 cliques e aparece na lista; fixado diferenciado e no
  topo; sem emoji; editar atualiza em tempo real.

#### 9.26 Comunicados: leitura pelo colaborador + recibo — #23
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Renderizar comunicados segmentados (home + aba) e gravar recibo em
  `comunicados/{id}/leituras/{uid}` ao abrir/confirmar, espelhando o recibo do chat; botão
  "Confirmo que li" quando `requerConfirmacao`; badge de não-lido; painel "X de Y leram" para o
  autor.
- **Objetivo:** Prova de leitura juridicamente útil para o RH; lugar único e confiável para o
  colaborador.
- **Dependências:** #21; #22; rule de `leituras` (create só do próprio uid, read agregado p/
  gestores).
- **Critérios de aceite:** abrir cria 1 doc em `/leituras/{uid}` com hora-servidor; badge zera e
  persiste; comunicado com confirmação só sai de "pendente" após aceite; autor vê "X de Y leram".

#### 9.27 Avisos internos (subtipo de comunicado)
**Fase:** 1 · **Prioridade:** Média · **Complexidade:** Fácil · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Aviso geral como subtipo leve de comunicado (campo `tipo='aviso'`), sem
  segmentação obrigatória, para recados rápidos.
- **Objetivo:** Cobrir o caso "recado geral" sem criar coleção nova.
- **Dependências:** #21.
- **Critérios de aceite:** aviso publicado aparece para todos; reusa a coleção `comunicados`;
  diferenciado visualmente do comunicado segmentado; sem emoji.

#### 9.28 Widget de aniversariantes no início — #24
**Fase:** 1 · **Prioridade:** Média · **Complexidade:** Fácil · **Status:** Planejado · **Classificação:** reaproveita

- **Descrição:** Exibir `renderAniversariantesWidget` na home do colaborador, alimentado por
  doc agregado `/config/aniversariantes` (nome + dia/mês, sem ano/PII).
- **Objetivo:** Engajamento social de custo quase zero — componente e dados já existem.
- **Dependências:** #20; privacidade (doc agregado sem nascimento/idade).
- **Critérios de aceite:** vê aniversariantes do mês com o do dia destacado; nada sensível
  exposto; reusa o componente sem fork.

#### 9.29 Coleção documentos + repositório (base de assinatura) — #29
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Coleção `documentos` com metadados, vínculo a `funcionarioId`, link Drive e
  hash. Schema `{tipo, funcionarioId, titulo, descricao, url(Drive), hashSha256, status,
  criadoEm(server), criadoPor, exigeAssinatura}`. Reusa `driveUploadDisponivel`+`ehUrlSegura`
  (só https); hash via `crypto.subtle.digest`.
- **Objetivo:** Centralizar todo documento a entregar/assinar com rastreabilidade.
- **Dependências:** `google-drive.js`/`ehUrlSegura`; molde `renderControlePJ`; #11; rule nova.
- **Critérios de aceite:** RH cria com link Drive e vê "pendente"; url não-https bloqueada;
  `hashSha256` preenchido; colaborador lê só os próprios; assinado não pode editar.

#### 9.30 Assinatura N1 — aceite com trilha — #30
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** reaproveita

- **Descrição:** Registrar aceite com um clique, gerando evento imutável na auditoria (`docId`,
  `hashSha256`, `uid`, hora-servidor, `userAgent`) + subcoleção `documentos/{id}/assinaturas/{uid}`.
  Modal com documento + caixa "Li e estou de acordo" antes de habilitar Assinar.
- **Objetivo:** Substituir papel por aceite digital rastreável e imutável, sem custo externo.
  **Ressalva honesta:** é "aceite com trilha", NÃO validade jurídica plena. **IP confiável NÃO
  vem do cliente** — capturam-se userAgent e hora-servidor; IP real exigiria Cloud Function.
- **Dependências:** #29; `registrarAuditoria` + rule append-only; `crypto.subtle`.
- **Critérios de aceite:** assinar cria doc em `/assinaturas/{uid}` com hora-servidor; evento na
  Auditoria; status vira "assinado"; sem a caixa, botão desabilitado; evento não editável.

#### 9.31 Meus holerites — repositório de PDFs via upload do RH — #18
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** **Reframe:** repositório de PDFs com **upload/importação pelo RH** (reusa o
  padrão de anexo do PJ + Drive + `ehUrlSegura`), **não** integração automática com ERP.
  `holerites/{id}` (`funcionarioId`, `competencia`, `urlPdf`, `tipo`); rule read self.
- **Objetivo:** Acesso self ao contracheque — um dos itens mais valiosos do portal —
  entregável **sem billing e sem esperar o ERP**.
- **Dependências:** #11; anexo PJ + `google-drive.js`; rule read SELF. **Governança:** processo
  recorrente do RH precisa de convenção de nomeação por competência e cuidado para não subir o
  holerite errado no funcionário errado (risco de PII).
- **Critérios de aceite:** RH faz upload e o colaborador vê só os próprios e abre o PDF; acessar
  de terceiro negado; sem PDFs, estado vazio honesto.

#### 9.32 Espelho de ponto — repositório de PDFs via upload do RH — #15
**Fase:** 1 · **Prioridade:** Alta · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Espelho de ponto como **PDF importado pelo RH** (mesmo padrão dos holerites),
  por competência. Deixa explícito que é o espelho que a folha/relógio já gera, não batidas
  vivas calculadas pelo app.
- **Objetivo:** Entregar o espelho de ponto **agora**, sem depender da integração de batidas.
- **Dependências:** #18; #11.
- **Critérios de aceite:** RH faz upload por competência; colaborador abre só os próprios PDFs;
  acessar de terceiro negado; sem PDFs, vazio honesto.

#### 9.33 Meus recibos — repositório de PDFs via upload do RH — #19
**Fase:** 1 · **Prioridade:** Média · **Complexidade:** Fácil · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Listar/abrir recibos por tipo (férias, 13º, adiantamento, rescisão), reusando a
  coleção/tela/rule dos holerites variando o campo `tipo`. PDFs por **upload do RH**.
- **Objetivo:** Completar o autoatendimento financeiro com custo marginal baixo.
- **Dependências:** #18.
- **Critérios de aceite:** vê só os próprios por tipo; PDF respeita a rule de Storage; sem PDFs,
  vazio honesto.

---

### Fase 2 — operação e engajamento (sem billing novo)

#### 9.34 Gestão admin de contas de colaborador — #9
**Fase:** 2 · **Prioridade:** Média · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Controle individual na tela de usuários: desativar, forçar troca, resetar senha
  para nascimento, criar conta avulsa. Tudo registrado em auditoria.
- **Objetivo:** Operação do dia a dia (novo admitido, esqueceu a senha, desligamento) sem
  Firebase Console.
- **Dependências:** #5; #6. **Limitação:** reset de outro usuário sem Admin SDK é client-side.
- **Critérios de aceite:** desativar bloqueia entrada; forçar troca leva ao modal; criar avulso
  loga com CPF+nascimento; ações na Auditoria.

#### 9.35 Espelho de ponto — versão SALDO (lançamentos diários) — #15b
**Fase:** 2 · **Prioridade:** Média · **Complexidade:** Fácil · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Espelho diário baseado nos lançamentos de saldo do banco de horas (data +
  saldo do dia/acumulado), deixando explícito que **não** são batidas reais. Reusa
  `banco-horas-self`.
- **Objetivo:** Visão diária do banco sem prometer batidas (que dependem do relógio).
- **Dependências:** #14; lançamentos diários do pipeline.
- **Critérios de aceite:** lista diária do mês; UI deixa claro que não são batidas; sem dados,
  vazio.

#### 9.36 Notificações corporativas in-app (central + badge) — #25
**Fase:** 2 · **Prioridade:** Média · **Complexidade:** Difícil · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Central in-app que agrega eventos (novo comunicado, ocorrência minha, documento
  a assinar, reconhecimento) com badge, reusando o padrão de badge/toast/beep do chat. Notificação
  é estado derivado, não coleção redundante.
- **Objetivo:** Ponto único de "o que é novo para mim" sem push externo.
- **Dependências:** #23; listener de ocorrências por funcionarioId. Push real = FCM (Futuro).
- **Critérios de aceite:** publicar comunicado para meu segmento incrementa o badge; clicar
  navega e zera; não-lido persiste entre refreshes.

#### 9.37 Reconhecimentos internos — #26
**Fase:** 2 · **Prioridade:** Média · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Coleção `reconhecimentos/{id}` + mural/widget reusando o padrão de reações por
  uid do chat. Categorias curtas, sem emoji.
- **Objetivo:** Cultura de reconhecimento e sinais qualitativos para o RH.
- **Dependências:** `reagirMensagem`; #11; rule nova (create autenticado, update só reações
  próprias, arquivar só admin/RH).
- **Critérios de aceite:** reconhecer aparece em tempo real; reagir usa `reacoes{}`; sem
  auto-reconhecimento; RH arquiva inadequado.

#### 9.38 Assinatura N2 — código por e-mail/SMS — #33b
**Fase:** 2 · **Prioridade:** Média · **Complexidade:** Difícil · **Status:** Planejado · **Classificação:** cria do zero

- **Descrição:** Segundo fator de aceite via código enviado por e-mail/SMS, elevando a força do
  N1. Exige serviço externo de envio + Cloud Functions.
- **Objetivo:** Aumentar a robustez probatória do aceite para documentos sensíveis.
- **Dependências:** #30; serviço externo de e-mail/SMS + **billing Blaze**. O domínio sintético
  fake impede e-mail nativo; SMS é pago.
- **Critérios de aceite:** ao assinar, o colaborador recebe um código e confirma; o evento de
  auditoria registra o canal e a confirmação; sem serviço configurado, recai no N1 com aviso.

#### 9.39 Assinatura de advertências (disciplinar com ciência) — #31
**Fase:** 2 · **Prioridade:** Média · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** RH/gestor emite (`tipo='advertencia'`), o colaborador lê e dá ciência (assina)
  ou registra discordância ("com ressalvas", texto livre). Reusa a assinatura N1. Visão RH do
  status (pendente/com ciência/com ressalvas/recusada), com badge das Obrigações.
- **Objetivo:** Formalizar a ciência de medidas disciplinares com hora auditável; elimina o
  "recusou a assinar" não rastreável. Ciência ≠ concordância.
- **Dependências:** #30; #29; badge de Obrigações + toast.
- **Critérios de aceite:** emitir aparece como "pendente de ciência"; dar ciência muda status
  com carimbo; ressalva grava o texto; badge some após ciência; auditoria distingue emissão e
  ciência.

#### 9.40 Assinatura de contratos e aditivos (campanha por segmento) — #32
**Fase:** 2 · **Prioridade:** Média · **Complexidade:** Difícil · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Contratos/aditivos/termos (LGPD, conduta) para assinatura, reusando o padrão de
  anexo + histórico versionado em array do PJ. Campanha por segmento com painel de % assinado e
  lista de pendentes (molde `conclusoes{}`). Versão congelada por hash.
- **Objetivo:** Distribuição e coleta de aceite centralizada e versionada, em massa.
- **Dependências:** anexo+`aditivos[]` do PJ; #30; `conclusoes{}` das Obrigações; #11.
- **Critérios de aceite:** campanha "todos" inicia em 0%; cada alvo vê pendente e assina; painel
  atualiza %; nova versão reabre pendentes; histórico imutável.

#### 9.41 Avaliação de desempenho — ciclos e questionários — #34
**Fase:** 2 · **Prioridade:** Média · **Complexidade:** Difícil · **Status:** Planejado · **Classificação:** cria do zero

- **Descrição:** Coleção `avaliacoes` `{ciclo, funcionarioId, avaliadorUid, modelo, respostas,
  status}` modelada no `conclusoes{}` das Obrigações, com editor de modelo de questionário (nota
  1-5/texto/sim-não). Tela do gestor com escopo via `podeVerFuncionario`.
- **Objetivo:** Substituir planilhas por fluxo estruturado, com histórico por ciclo.
- **Dependências:** `conclusoes{}`; PERM_CAPS/DEFAULT/can; `podeVerFuncionario`; rules.
- **Critérios de aceite:** RH cria ciclo com modelo; gestor preenche/rascunho/envia; status
  mostra quantas faltam; colaborador vê só após liberação; reabrir gera auditoria.

#### 9.42 Canal de ética / denúncia (confidencial in-app) — #36
**Fase:** 2 · **Prioridade:** Média · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** cria do zero

- **Descrição:** Colaborador envia denúncia/relato a um comitê de forma **confidencial** (autor
  conhecido só pelo comitê, protegido por rules). Coleção `canal-etica` write-create-only +
  protocolo. **Não anônimo técnico** (isso é Futuro).
- **Objetivo:** Cumprir compliance/ouvidoria com canal seguro e rastreável, sem expor o
  denunciante ao gestor.
- **Dependências:** papel colaborador; caps de ética; rule específica (create autenticado, read
  só comitê). **Não** passa pelo `registrarAuditoria` padrão (que exige `por==auth.uid` e
  quebraria a confidencialidade) — trilha do comitê separada.
- **Critérios de aceite:** enviar gera protocolo; colaborador não lista relatos (read negado);
  comitê vê a fila e muda status; gestor comum sem acesso; documentação deixa claro
  "confidencial, não anônimo técnico".

---

### Futuro — origem ERP, billing Blaze ou provedor externo

#### 9.43 Onboarding robusto via Cloud Function (Admin SDK) — #10
**Fase:** Futuro · **Prioridade:** Baixa · **Complexidade:** Difícil · **Status:** Pendente · **Classificação:** cria do zero

- **Descrição:** Substituir o lote client-side por Cloud Function (Admin SDK) que cria contas no
  servidor, cruzando coleções e gravando vínculo+flags; idempotente; opcional gatilho ao chegar
  novo funcionário.
- **Objetivo:** Onboarding confiável da base inteira sem depender do navegador. Resolve a dívida
  do #5.
- **Dependências:** **billing Blaze**; substitui/complementa #5.
- **Critérios de aceite:** onboarda a base sem o navegador; idempotente; novos do pipeline ganham
  conta sem ação manual.

#### 9.44 Integração automática ERP/WKRADAR de holerites — #16
**Fase:** Futuro · **Prioridade:** Baixa · **Complexidade:** Muito Difícil · **Status:** Pendente · **Classificação:** cria do zero

- **Descrição:** Substituir o upload manual de holerites por integração automática: o ERP/folha
  hospeda os PDFs e o pipeline os disponibiliza.
- **Objetivo:** Evolução natural do repositório de PDFs (#18) quando houver apetite.
- **Dependências:** #18; origem ERP hospedar PDFs; Storage com regras próprias.
- **Critérios de aceite:** novos holerites aparecem sem upload manual; rule read self preservada;
  consistência com os PDFs já importados.

#### 9.45 Espelho de ponto REAL (batidas entrada/saída) via origem — #16b
**Fase:** Futuro · **Prioridade:** Baixa · **Complexidade:** Muito Difícil · **Status:** Pendente · **Classificação:** cria do zero

- **Descrição:** Exibir batidas reais. **Bloqueado pela origem:** o FioPulse só tem saldo, não
  batidas. Exige o pipeline/ERP hospedar as marcações (ex.: `ponto-self/{codigo}_{YYYY-MM}`).
- **Objetivo:** Espelho de ponto verdadeiro, o mais pedido em portais — só viável após a origem
  disponibilizar.
- **Dependências:** **origem crítica** (relógio/WKRADAR/ERP); vínculo + rules self.
- **Critérios de aceite:** quando populado, vê batidas por dia; sem origem, oculto/vazio; não lê
  terceiros.

#### 9.46 Apuração de ponto (fechamento mensal) via origem — #17
**Fase:** Futuro · **Prioridade:** Baixa · **Complexidade:** Muito Difícil · **Status:** Pendente · **Classificação:** cria do zero

- **Descrição:** Apuração mensal consolidada (horas, extras, faltas, DSR, saldo). **Bloqueado
  pela origem:** é calculada na folha/relógio; o app não calcula.
- **Objetivo:** "Conta final" do mês.
- **Dependências:** **origem crítica** (ERP/folha); idealmente junto das batidas reais.
- **Critérios de aceite:** quando enviado, vê o consolidado; app não tenta calcular; acesso só
  ao próprio `codigo`.

#### 9.47 Notificações push fora do app (FCM) — #28
**Fase:** Futuro · **Prioridade:** Baixa · **Complexidade:** Muito Difícil · **Status:** Pendente · **Classificação:** cria do zero

- **Descrição:** Entregar avisos críticos como push (PWA fechado) via FCM, disparado por Cloud
  Function quando um comunicado prioritário é publicado; opt-in; fallback in-app.
- **Objetivo:** Garantir alcance fora do app (escala, fechamento, emergência).
- **Dependências:** **billing Blaze** (Functions+FCM); #25 como fallback; SW de push.
- **Critérios de aceite:** comunicado prioritário gera push com app fechado; quem negou recebe
  in-app sem erro; tokens inválidos limpos.

#### 9.48 Assinatura N3 — validade jurídica (ICP-Brasil/gov.br/Clicksign/D4Sign) — #33
**Fase:** Futuro · **Prioridade:** Baixa · **Complexidade:** Muito Difícil · **Status:** Pendente · **Classificação:** cria do zero

- **Descrição:** Elevar o aceite-com-trilha para assinatura com validade jurídica plena,
  integrando provedor externo via Cloud Function (envia documento, recebe status/comprovante por
  webhook; IP/geolocalização confiáveis no servidor).
- **Objetivo:** Força probante jurídica plena (rescisões, acordos).
- **Dependências:** **Cloud Functions + Blaze**; contrato com provedor (custo recorrente); #30
  como base.
- **Critérios de aceite:** documento crítico vai ao provedor com fluxo qualificado; status
  reflete "assinado juridicamente" com link do comprovante.

#### 9.49 Recuperação de senha self-service por e-mail/SMS real
**Fase:** Futuro · **Prioridade:** Baixa · **Complexidade:** Difícil · **Status:** Pendente · **Classificação:** cria do zero

- **Descrição:** Recuperação autônoma pelo colaborador via e-mail/SMS real (além do reset
  administrativo do RH). O domínio sintético fake impede reset nativo; exige serviço externo.
- **Objetivo:** Reduzir a carga operacional do RH com resets.
- **Dependências:** serviço externo de e-mail/SMS; reset administrativo (base).
- **Critérios de aceite:** colaborador recupera a senha sem o RH; canal de envio configurável;
  fluxo registrado.

#### 9.50 Avaliação — autoavaliação e feedback do colaborador — #35
**Fase:** Futuro · **Prioridade:** Baixa · **Complexidade:** Médio · **Status:** Planejado · **Classificação:** adapta

- **Descrição:** Colaborador faz a própria autoavaliação no ciclo (`tipo='auto'`) e
  visualiza/comenta o feedback do gestor após liberação. Adapta `avaliacoes` + tela self.
- **Objetivo:** Engaja o colaborador, dá voz/PDI, reduz a sensação "de cima pra baixo".
- **Dependências:** #34; vínculo; `renderView`/`renderNav` ramificados; `registrarAuditoria`.
- **Critérios de aceite:** preenche e envia a própria; após liberação vê auto x gestor; marcar
  "ciente" gera auditoria; não vê de terceiros.

#### 9.51 Canal de ética — anonimato técnico real — #37
**Fase:** Futuro · **Prioridade:** Baixa · **Complexidade:** Muito Difícil · **Status:** Pendente · **Classificação:** cria do zero

- **Descrição:** Evoluir para anonimato técnico real (sem `autorUid`, sem rastro) via Cloud
  Function que recebe o relato e grava anonimizado, com comunicação bidirecional por protocolo.
- **Objetivo:** Atender padrões de integridade mais exigentes.
- **Dependências:** **Cloud Functions + Blaze**; #36 como base; política de retenção/expurgo.
- **Critérios de aceite:** relato sem dado reidentificável; denunciante acompanha via protocolo;
  comitê responde sem ver identidade; auditoria do comitê não reidentifica.

#### 9.52 Rede social corporativa (feed) — #27
**Fase:** Futuro · **Prioridade:** Muito Baixa · **Complexidade:** Difícil · **Status:** Planejado · **Classificação:** cria do zero

- **Descrição:** Feed 1→N (`posts/{id}` + comentários/curtidas) com publicação institucional e
  interação, reusando `reacoes{}` e a renderização de cards. **FORA do MVP.**
- **Objetivo:** Espaço de cultura e pertencimento — só faz sentido **depois** que o Portal já
  resolve ponto/documento/contracheque/dúvida. Pertencimento vem por utilidade, não por feed.
- **Dependências:** `reacoes{}`; `google-drive.js`; **Comunicados/Avisos/Aniversariantes/
  Reconhecimentos/Notificações vêm antes**; rules novas; monitorar custo de leitura do Firestore.
- **Critérios de aceite:** post aparece em tempo real; curtir/comentar atualiza contadores;
  moderador remove impróprio; leitura paginada.

---

## 10. Riscos técnicos

1. **Privacidade das rules (risco #1, bloqueante).** Hoje qualquer autenticado lê
   `funcionarios`/`users` inteiras (o chat/diretório dos gestores depende disso). No instante em
   que o primeiro colaborador logar, ele lê nome, cargo, setor, turno e **nascimento** de toda a
   base — e nascimento é a semente da senha de todos. Endurecer exige helpers, read self,
   `/config/diretorioGH` público e ramificar `carregarDadosCompletos` por role. Tem que passar
   no **Emulator Suite** (próprio-OK / terceiro-NEGADO) antes do deploy — um deploy errado ou
   vaza tudo, ou derruba o chat dos 4 papéis de gestor já em produção.
2. **Senha = nascimento é previsível e legível.** Há uma janela entre a criação em lote e o 1º
   login em que a conta tem senha conhecida. A troca obrigatória mitiga mas não fecha a janela.
   Mitigações: restringir a leitura de `nascimento` assim que as contas forem criadas;
   considerar "data de ativação"; logar o 1º login na auditoria.
3. **Reset de senha sem e-mail real.** Domínio fake → `sendPasswordResetEmail` não funciona;
   "Esqueci a senha" fica oculto no modo Colaborador. Reset viável é administrativo pelo RH
   (reintroduz senha previsível + carga operacional). Resetar a senha de outro sem Admin SDK é
   limitação client-side (só re-onboarda).
4. **Dependência de origem (ERP/WKRADAR).** O reframe libera a versão viável (repositório de
   PDFs por upload), mas é preciso ser honesto: holerite/recibo viáveis = PDFs importados
   manualmente; espelho só existe na versão SALDO (batidas o sistema não tem); a importação
   manual é processo recorrente do RH e precisa de **governança** (quem sobe, nomeação por
   competência, evitar subir o PDF no funcionário errado — risco de PII grave).
5. **Billing (Blaze) é a fronteira.** Onboarding robusto (#10), push FCM (#28), N2/N3
   (#33b/#33), ética anônima real (#37) e recuperação self real exigem Cloud Functions/serviço
   externo. Corretamente marcados como Futuro/Pendente; deixar gravado na UI do Roadmap (status
   Pendente + dependência "billing Blaze") para alinhar expectativa.
6. **Onboarding em massa client-side é frágil.** Criar centenas de contas via app secundária é
   sequencial e quebra se a aba fechar. Precisa de idempotência, progresso visível e log de
   pendências. Dívida assumida do MVP; o caminho robusto é a Cloud Function (Blaze).
7. **Atualização/inativação automática tem ponto cego.** Desativar o doc do funcionário NÃO
   desabilita o login no Firebase Auth. É preciso checar `ativo` no `onAuthStateChanged` e
   bloquear; revogação real só via Admin SDK no futuro. Preservar histórico+auditoria conflita
   com LGPD se não houver política de retenção/expurgo.
8. **Anonimato do canal de ética é impossível no MVP.** `registrarAuditoria` exige
   `por==auth.uid`, o que quebra anonimato. MVP honesto = **confidencial** (autor conhecido só
   pelo comitê), rotulado como tal. Anonimato técnico real só com Cloud Function (Blaze).
9. **Assinatura — rótulo honesto.** N1 é "aceite com trilha", NÃO validade jurídica plena. **IP
   confiável não vem do cliente Firestore.** N2 esbarra no domínio fake e em SMS pago; N3 é
   contrato externo + Blaze. Risco: RH/jurídico tratarem o N1 como prova plena.
10. **Regressão no que já está em produção.** O Portal mexe em pontos compartilhados
    (`carregarDadosCompletos`, rules de `funcionarios`/`users`/`mensagens`, `PERM_DEFAULT`,
    `onAuthStateChanged`). Defesa: testar no Emulator, manter o split por role com retorno
    antecipado, e validar **regressão zero dos gestores** como critério de aceite obrigatório
    antes de cada deploy. Presence **não** deve ser ligada para colaborador.

---

## 11. Ganhos por público

### RH
- Para de criar conta manual: onboarding em lote cruza `nascimento` + `cpf` e gera centenas de
  logins de uma vez, com dados que já existem.
- Atualização e inativação automáticas pegando carona no pipeline diário: quem entra ganha
  acesso, quem sai é bloqueado, com histórico+auditoria preservados.
- Prova de leitura juridicamente útil: comunicados com recibo dão o "X de Y leram" que hoje não
  existe (políticas, avisos legais, mudança de regra de ponto).
- Canal oficial 1→N segmentado (turno/setor) substitui WhatsApp/mural, com hora-servidor.
- Repositório de documentos com trilha (holerites, recibos, contratos, advertências, termos).
- Fim do "recusou a assinar" não rastreável: ciência digital com carimbo + hash + userAgent.
- Campanha de assinatura em massa com painel de % assinado (molde `conclusoes{}`).
- Avaliação de desempenho estruturada por ciclos; canal de ética confidencial (compliance).
- Auto-atendimento tira o RH do balcão (saldo, holerite, faltas).

### Gestores
- Menos interrupção operacional: perguntas de rotina viram auto-serviço.
- Comunicado segmentado por turno/setor chega só a quem interessa, com recibo.
- Avaliação dentro do escopo do gestor (via `podeVerFuncionario`), com histórico.
- Fluxo disciplinar formalizado com badge e prova de hora-servidor.
- Sinais de engajamento (reconhecimentos, leitura de comunicados).
- **Nenhuma regressão** no que já usam — o Portal é aditivo.

### Colaboradores
- Transparência sobre o próprio ponto (ocorrências + saldo com gráfico) no celular.
- Entrada simples por CPF + senha inicial = nascimento com troca obrigatória.
- Cartão de identidade próprio, sem PII sensível exposta.
- Acesso self ao contracheque/recibos (PDFs do RH).
- Comunicados oficiais num canal confiável (com fixado no topo).
- Assinar documentos e dar ciência em advertências pelo celular, com comprovante.
- Voz e proteção: canal de ética confidencial; (evolução) autoavaliação e feedback.
- Engajamento leve: aniversariantes do mês e reconhecimentos dos colegas.

---

## 12. Melhorias ainda não consideradas (sugestões novas)

Todas de custo baixo e zero billing, penduradas no backbone de comunicação 1→N e no motor de
status/badge das Obrigações:

1. **Central de documentos pessoais com pedido/requisição.** Além de baixar, o colaborador
   **solicita** documentos que o RH ainda emite a mão (declaração de vínculo, comprovante de
   renda). Fila de status (solicitado → em produção → disponível) no molde `conclusoes{}`.
2. **Lembretes/pendências na home.** Card "O que precisa da sua atenção" agregando comunicado a
   confirmar, documento a assinar, advertência a dar ciência. Estado **derivado**, não coleção
   nova. Aumenta a taxa de leitura/assinatura sem push.
3. **Autoatendimento de dados cadastrais com aprovação.** O colaborador **abre um pedido** de
   atualização (telefone, contato de emergência, endereço, dados bancários) em
   `solicitacoes-cadastro` que o RH revisa e aplica na origem — sem quebrar o pipeline.
4. **FAQ / base de conhecimento de RH** (`faq` read-all, write por cap). Resolve a cauda longa
   de dúvidas. Menor custo / maior alívio operacional do conjunto.
5. **Pesquisa de clima leve / pulse** (1 pergunta por vez), gravada sem `autorUid` identificável
   (só agregado), reusando a lógica do canal confidencial.
6. **Meus benefícios / carteira digital** (VT, VR/VA, plano) read-self, alimentada pelo pipeline
   ou upload.
7. **Calendário/avisos de folga, feriado e escala por turno** — reaproveita comunicados
   segmentados + widget de próximos eventos. Útil para operação por turnos.
8. **Solicitação de férias/abono/ajuste de ponto como fila de pedido** (não cálculo): formaliza
   e rastreia o fluxo hoje verbal/WhatsApp; reusa `conclusoes{}` e `podeVerFuncionario`.
9. **Onboarding de novo admitido como checklist** (assinar LGPD, ler conduta, confirmar dados),
   gerado quando o pipeline traz o admitido. Reusa campanha de assinatura + lembretes.
10. **Modo quiosque** para quem não tem smartphone: totem/tablet no RH/portaria, login por CPF +
    logout por inatividade. Mesmo Portal com timeout de sessão.
11. **Assinatura em lote pelo colaborador:** uma tela "assinar pendências" com cada documento e
    seu aceite individual, em vez de caçar item por item. Melhora a conclusão de campanha.

---

## 13. Visão estratégica de longo prazo

O Portal é a **segunda metade do FioPulse**: o mesmo endereço, o mesmo shell e as mesmas
coleções passam a servir os dois lados de toda relação trabalhista — de um lado o gestor
publica/avalia/emite, do outro o colaborador lê/assina/responde — com a auditoria append-only
como espinha dorsal de confiança. Cada feature do Portal é a contraparte *self* de algo que já
existe do lado gestor, e essa simetria é o que mantém custo baixo e coesão alta.

A maturidade tem três saltos. O **primeiro** é a Fase 0 — tela de acesso, estrutura visual e a
área de Roadmap dentro do portal — que entrega valor de produto **antes** de qualquer risco de
autenticação. O Roadmap como feature real (molde Obrigações) vira o documento vivo de
alinhamento com a diretoria, substituindo este markdown por uma tela que qualquer stakeholder
abre — e isso reduz o risco político de um projeto longo perder patrocínio.

O **segundo** salto é o MVP self honesto: o colaborador entra por CPF, troca a senha, vê
ficha/ocorrências/banco de horas, recebe comunicados com recibo e assina documentos com trilha
— tudo sem billing novo e sem depender da origem, porque reusa dado e UI que já existem. O ponto
de inflexão técnico é o **endurecimento das rules + o vínculo uid↔funcionarioId**: o investimento
mais arriscado e menos visível, mas a fundação de tudo. Vale tratá-lo como entrega de primeira
classe, com teste no Emulator como critério de aceite — um vazamento de nascimento/PII no
lançamento mataria a confiança do projeto inteiro.

O **terceiro** salto é a fronteira que o dono escolheu não cruzar por ora: billing (Blaze) e
integração com a origem (ERP/WKRADAR). Aqui a visão é de paciência deliberada. O reframe correto
— holerite/recibo/espelho como repositório de PDFs com upload do RH — extrai 80% do valor com
20% do custo e sem dependência externa; a integração automática é a evolução natural quando
houver apetite. A assinatura N1 cobre a esmagadora maioria dos documentos internos; N2/N3 ficam
reservados aos poucos que exigem força probante plena. A disciplina de **não prometer o que
depende de Blaze**, e de rotular isso no próprio Roadmap, é o que protege a credibilidade.

A longo prazo, o ativo mais valioso não é nenhuma tela isolada — é a **mudança de canal**. Hoje
a comunicação da Fiobras com o chão de fábrica é informal e não rastreável (WhatsApp, mural,
boca a boca). O Portal centraliza isso num canal oficial, segmentado por turno/setor, com prova
de leitura e trilha imutável. Uma vez que esse canal exista e tenha adoção, ele vira a plataforma
para tudo o que vier depois (FAQ, pulse, benefícios, férias, escala, onboarding guiado) — todas
de custo marginal quase zero. A **rede social corporativa, corretamente rebaixada a Muito Baixa,
é justamente o que NÃO deve guiar a visão**: pertencimento se constrói por utilidade, não por
feed; quando o Portal for o lugar onde o colaborador resolve a vida dele, o engajamento social
vem de brinde.

O risco estratégico final é operacional, não técnico: **um portal vazio mata a adoção.** No
lançamento já tem de haver conteúdo (comunicados reais, alguns documentos, banco de horas
populado) e o RH precisa de um processo claro de alimentação (quem sobe holerite, quem publica,
quem reseta senha). A tecnologia está ~80% pronta por reuso; o trabalho de longo prazo é tanto
de engenharia quanto de **operação**.

---

## 14. Decisões abertas

1. **Login por CPF + senha=nascimento.** Recomendado: e-mail sintético + Auth padrão (sem Custom
   Token/Blaze). A semente de senha é previsível por design; a troca obrigatória no 1º acesso
   mitiga, mas há janela entre criação e 1º login. **Decisão pendente:** bloquear o login até a
   troca / restringir a leitura de `nascimento` / usar "data de ativação"?
2. **Recuperação de senha sem e-mail real.** Reset administrativo pelo RH é o único viável sem
   billing (e reintroduz senha previsível + carga no RH). **Decisão pendente:** aceitar o reset
   administrativo como definitivo do MVP, ou priorizar serviço externo de e-mail/SMS (Blaze)?
3. **Fonte de holerite/recibo/espelho.** Reframe: repositório de PDFs por **upload do RH**
   (viável agora). Integração automática com ERP e espelho REAL de batidas dependem da origem.
   **Decisão pendente:** qual a convenção de governança do upload (nomeação por competência,
   quem sobe, conferência) para evitar vazamento de PII?
4. **Níveis de assinatura.** N1 (aceite com trilha) = MVP, sem billing, **não** é validade
   jurídica plena. N2 (código e-mail/SMS) e N3 (ICP-Brasil/gov.br) = Futuro, exigem Blaze/externo.
   **Decisão pendente:** quais tipos de documento exigem mais que N1 (rescisão, acordo)?
5. **Billing (Blaze).** Onboarding robusto, push FCM, N2/N3, ética anônima real e recuperação
   self real exigem Cloud Functions/serviço externo. **Decisão pendente:** há apetite para
   habilitar Blaze em algum momento, e com qual teto de custo?
6. **Fonte única do Roadmap.** Na Fase 0 é array estático em `public/roadmap.js` (versionado).
   **Decisão pendente (dívida registrada):** migrar para `/config/roadmap` (1 doc, gated por
   cap) quando/se o RH quiser editar in-app?
7. **Presence para colaborador.** Recomendado **não** ligar (privacidade + simplicidade). A rule
   de presence só aceita os 4 papéis de gestor hoje. **Confirmar** que fica desligada.
