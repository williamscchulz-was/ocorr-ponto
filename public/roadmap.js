window.ROADMAP = {
  fases: [
    { id: "fase0",  nome: "Fase 0",        subtitulo: "Acesso + estrutura visual (sem login)" },
    { id: "fase1",  nome: "Fase 1 — MVP",  subtitulo: "Autenticação, SELF, consultas, comunicados, documentos" },
    { id: "fase2",  nome: "Fase 2",        subtitulo: "Operação e engajamento (sem billing)" },
    { id: "futuro", nome: "Futuro",        subtitulo: "Origem ERP, billing Blaze ou provedor externo" }
  ],
  itens: [
    {
      id: "tela-acesso",
      numero: 38,
      nome: "Tela de acesso (split Colaborador/Gestor)",
      fase: "fase0",
      prioridade: "critica",
      complexidade: "facil",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Criar a section #acesso no index.html (antes de #login) com a marca FioPulse e dois cartões grandes: 'Portal do Colaborador' (selo 'Prévia · sem login ainda') e 'Portal do Gestor/Administrador'. Sem sessão vai para #acesso; com sessão de gestor vai direto para o #app. O cartão Gestor revela o #login de hoje (com botão 'Voltar').",
      objetivo: "Entrada única e clara para os dois públicos no mesmo endereço, sem confundir o colaborador com 'e-mail corporativo', e sem tocar no fluxo de login dos gestores.",
      dependencias: ["Casca de UI (renderApp/renderView)"],
      criteriosAceite: [
        "#acesso aparece quando não há sessão, no lugar de #login direto.",
        "Cartão Gestor revela o login atual sem nenhuma mudança no fluxo/onAuthStateChanged.",
        "Botão Voltar reexibe #acesso.",
        "Gestor com sessão nunca vê #acesso nem #login.",
        "Visual idêntico à identidade do #login (sem emoji), aprovado em mock.",
        "Login de gestor byte-a-byte como antes."
      ]
    },
    {
      id: "shell-navegacao-sem-auth",
      numero: 39,
      nome: "Estrutura visual/shell + navegação do portal SEM auth",
      fase: "fase0",
      prioridade: "critica",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "No topo de renderApp(), const ehColab=u.role==='colaborador' e envolver em if(!ehColab) as chamadas que dependem de dado real/listener (renderPresence(), atualizarBadgeChat(), checkChangelog(), toast de aniversário). renderNav/renderBottomNav ramificam para versões do colaborador (5 itens, sem FAB; 'Conta' com 'Sair da prévia'). renderView roteia colab-* ANTES do dispatch de gestor e força colab-home se a página não for colab-*. roleLabel() ganha o caso 'colaborador'. Registrar colab-* em _SKEL_PAGES.",
      objetivo: "Base de navegação reaproveitando o shell inteiro, com retorno antecipado que preserva o caminho do gestor byte-a-byte.",
      dependencias: ["#38", "renderNav/renderBottomNav/renderView"],
      criteriosAceite: [
        "Gestores renderizam exatamente como hoje.",
        "Colaborador vê só o menu próprio sem FAB.",
        "Nenhum listener de presence/chat/changelog é iniciado no modo preview.",
        "Navegar para view de gestor redireciona para colab-home.",
        "roleLabel exibe 'Colaborador' sem afetar os demais."
      ]
    },
    {
      id: "dashboard-inicial-colaborador",
      numero: 40,
      nome: "Dashboard inicial do colaborador (base visual, dados ilustrativos)",
      fase: "fase0",
      prioridade: "critica",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "renderColaboradorHome() com faixa 'Modo prévia — dados ilustrativos'; cartão de identidade ilustrativo (nome fictício, cargo, setor, turno, admissão, tempo de casa, aniversário) no visual de renderFuncPerfilSecoes mas com dados mock locais e SEM PII; linha de stats (.stats/.stat) com Saldo de banco de horas, Comunicados não lidos e Documentos pendentes (números ilustrativos); cards de atalho que navegam para as telas-stub; placeholder de aniversariantes (2-3 nomes fictícios). Não ler state.funcionarios/ocorrencias.",
      objetivo: "Mostrar a casa do colaborador e o lugar de cada futura feature, sem prometer dado real.",
      dependencias: ["#39"],
      criteriosAceite: [
        "Home mostra cartão de identidade sem nenhuma PII.",
        "Stats e atalhos com dados ilustrativos navegam ao clicar.",
        "Nenhuma leitura de coleções reais.",
        "Faixa 'Modo prévia' visível.",
        "Layout coeso com o design system, sem emoji, aprovado em mock."
      ]
    },
    {
      id: "roadmap-portal-in-app",
      numero: 41,
      nome: "Roadmap do Portal in-app (fases, status, progresso)",
      fase: "fase0",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "renderColabRoadmap() reusando o molde de Obrigações (agrupamento por fase no padrão .mes/mes--atual/.vermais, linhas no padrão obrigLinhaHtml, selos .st, pílulas .ob-pill, barras de progresso por fase + global). Cada item exibe Nome, Descrição, Objetivo, Prioridade, Complexidade, Dependências, Status e Critérios de aceite (modal de detalhe via openModal). Fonte: array estático public/roadmap.js populado a partir deste documento.",
      objetivo: "Tornar o roadmap o guia oficial e documento vivo de alinhamento, reaproveitando o motor de status/progresso já testado em produção.",
      dependencias: ["#39", "molde Obrigações", "public/roadmap.js"],
      criteriosAceite: [
        "A tela aparece como item de menu dentro do shell do portal e abre em colab-roadmap, sem exigir login (Fase 0).",
        "Itens vêm de public/roadmap.js (versionado); nenhuma leitura de Firestore, nenhuma rule nova.",
        "Itens agrupados em fases na ordem correta; o bloco em foco é destaque (mes--atual); fases seguintes atrás de 'Ver as próximas fases'.",
        "Cada fase mostra barra de progresso (% e N/Total); existe barra global no header e no card.",
        "Cada linha mostra Nome, número, selo de Prioridade, selo de Complexidade e selo de Status com as cores do molde.",
        "Clicar abre modal de detalhe read-only com todos os campos; o modal não edita.",
        "Dependências no modal listam os itens citados (e externas como texto), linkando quando possível.",
        "Card 'Roadmap do Portal' no dashboard reusa o molde do widget de Obrigações.",
        "Mudar o status de um item em roadmap.js reflete na tela e nas barras após reload, sem outra alteração de código.",
        "Sem emoji; layout aprovado em mock HTML real antes de aplicar.",
        "Regressão zero: Obrigações dos gestores e seus estilos continuam idênticos."
      ]
    },
    {
      id: "papel-colaborador-self",
      numero: 1,
      nome: "Papel colaborador + escopo SELF",
      fase: "fase1",
      prioridade: "critica",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Introduzir o 4º papel colaborador no motor data-driven (PERM_CAPS/PERM_DEFAULT/can); bloco colaborador (caps de gestor false, caps self true); área 'Portal' em PERM_CAPS; incluir colaborador na matriz; ramo if(u.role==='colaborador') em podeVerFuncionario/podeVerOcorrenciaUI.",
      objetivo: "Destravar todo o Portal. Fundação única sobre a qual escopo SELF, filtros e rules se apoiam.",
      dependencias: ["PERM_CAPS/PERM_DEFAULT/can"],
      criteriosAceite: [
        "Colaborador loga em shell sem telas de gestor.",
        "currentUser().funcionarioId/.codigo populados.",
        "Matriz mostra a coluna colaborador com caps de gestor off.",
        "podeVerFuncionario só true para o próprio.",
        "Regressão zero nos demais papéis."
      ]
    },
    {
      id: "vinculo-uid-funcionarioid",
      numero: 11,
      nome: "Vínculo uid↔funcionarioId no perfil",
      fase: "fase1",
      prioridade: "critica",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Gravar funcionarioId (='f-'+codigo) e codigo em users/{uid} na criação e lê-los no onAuthStateChanged; helpers isColaborador()/euSouODono(funcId); self-update restrito (colaborador não edita esses campos).",
      objetivo: "Habilitar todas as consultas self com um único ponto de verdade.",
      dependencias: ["#1", "users/{uid} + rule self-update"],
      criteriosAceite: [
        "funcionarioId/.codigo preenchidos após login.",
        "Update desses campos pelo próprio é negado.",
        "Sem vínculo não lê nenhum funcionário (fail-safe)."
      ]
    },
    {
      id: "endurecer-rules-funcionarios-users",
      numero: 2,
      nome: "Endurecer rules funcionarios/users (sem quebrar chat)",
      fase: "fase1",
      prioridade: "critica",
      complexidade: "dificil",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Fechar o vazamento (hoje qualquer autenticado lê funcionarios/users inteiras). Helpers isColaborador()/euSouODono; funcionarios read self; users read gestor-ou-próprio; /config/diretorioGH público (sem PII) para o chat; ramificar carregarDadosCompletos por role (colaborador nunca roda .get() amplo).",
      objetivo: "Pré-condição de segurança para ligar colaboradores. Risco #1 (nascimento é semente de senha de todos).",
      dependencias: ["#11", "carregarDadosCompletos ramificado", "/config/diretorioGH"],
      criteriosAceite: [
        "Colaborador recebe permission-denied em .get() amplo.",
        "Lê o próprio doc + diretório GH.",
        "Chat/diretório dos gestores intactos.",
        "Emulator passa próprio-OK / terceiro-NEGADO."
      ]
    },
    {
      id: "login-cpf-email-sintetico",
      numero: 4,
      nome: "Login por CPF via e-mail sintético",
      fase: "fase1",
      prioridade: "critica",
      complexidade: "muito_facil",
      status: "em_andamento",
      classificacao: "reaproveita",
      descricao: "cpfParaEmail(cpf) gera {cpf}@colaborador.fiobras.local; signInWithEmailAndPassword padrão; o handler do modo Colaborador monta o e-mail antes de window.login.",
      objetivo: "Login por CPF sem billing nem Custom Token, reaproveitando o Auth em produção.",
      dependencias: ["Auth e-mail/senha", "#5"],
      criteriosAceite: [
        "CPF com/sem pontuação resulta no mesmo e-mail.",
        "CPF inválido mostra erro antes do Auth.",
        "Conta resolve para role='colaborador'."
      ]
    },
    {
      id: "toggle-colaborador-gestor-login",
      numero: 3,
      nome: "Toggle Colaborador(CPF)/Gestor(e-mail) no login",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "facil",
      status: "em_andamento",
      classificacao: "adapta",
      descricao: "Toggle no #login alternando o modo do campo (label CPF + máscara só dígitos vs. e-mail). No submit em modo Colaborador, monta o e-mail sintético. Lembrar último modo em localStorage. 'Esqueci a senha' oculto no modo Colaborador (domínio fake).",
      objetivo: "Entrada clara para os dois públicos na mesma tela de login.",
      dependencias: ["#4", "window.login"],
      criteriosAceite: [
        "Alternar troca label/máscara.",
        "Login de colaborador cai no shell do colaborador.",
        "Login de gestor idêntico.",
        "Mock aprovado."
      ]
    },
    {
      id: "criacao-automatica-usuarios",
      numero: 5,
      nome: "Criação automática de usuários (CPF+nascimento, lote)",
      fase: "fase1",
      prioridade: "critica",
      complexidade: "dificil",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Gerar logins em lote cruzando funcionarios.nascimento + banco-horas-saldos.cpf, reusando inviteUser (app secundária), senha=nascimento (DDMMAAAA) e precisaTrocarSenha:true; lote sequencial com progresso, log e idempotência; tratar sem-CPF/sem-nascimento.",
      objetivo: "Onboarding de centenas sem cadastro manual, com dados que já existem.",
      dependencias: ["#1", "nascimento + banco-horas-saldos.cpf", "inviteUser"],
      criteriosAceite: [
        "Lote cria N contas + N docs com vínculo/flag sem deslogar o admin.",
        "Rerodar não duplica.",
        "Pendências em relatório.",
        "Conta loga e cai na troca obrigatória."
      ]
    },
    {
      id: "atualizacao-diaria-usuarios-wkradar",
      numero: null,
      nome: "Atualização automática DIÁRIA de usuários (WKRADAR)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Riding no pipeline WKRADAR diário: novos funcionários ganham conta automaticamente; vínculos e dados de identidade são reconciliados a partir de pipeline-rh/{cur,hist}.",
      objetivo: "Manter a base de logins viva sem o RH lembrar de criar conta a cada admissão.",
      dependencias: ["#5", "pipeline-rh/{cur,hist}"],
      criteriosAceite: [
        "Funcionário novo do pipeline aparece com conta no dia seguinte sem ação manual.",
        "Idempotente (não duplica).",
        "Pendências (sem CPF/nascimento) listadas."
      ]
    },
    {
      id: "inativacao-automatica-saida-quadro",
      numero: null,
      nome: "Inativação automática ao sair do quadro",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Quando o WKRADAR marca funcionarios.ativo=false/demissao, refletir em users/{uid}.ativo=false; checar ativo no onAuthStateChanged e bloquear a entrada.",
      objetivo: "Cortar o acesso de quem saiu do quadro automaticamente.",
      dependencias: ["Atualização diária", "funcionarios.demissao/ativo", "users.ativo no onAuthStateChanged"],
      criteriosAceite: [
        "Ex-funcionário com users.ativo=false não consegue entrar.",
        "Gestores ativos sem regressão.",
        "Bloqueio registrado."
      ]
    },
    {
      id: "manter-historico-auditoria-apos-inativacao",
      numero: null,
      nome: "Manter histórico + auditoria após inativação",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "facil",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "reaproveita",
      descricao: "Inativação não deleta o doc do usuário nem os registros associados; histórico e trilha de auditoria preservados (append-only).",
      objetivo: "Conformidade e rastreabilidade (defesa trabalhista, LGPD com política de retenção).",
      dependencias: ["Inativação automática", "auditoria append-only"],
      criteriosAceite: [
        "Após inativação, histórico/auditoria do ex-funcionário continuam legíveis para admin/RH.",
        "Nada é apagado.",
        "Política de retenção documentada."
      ]
    },
    {
      id: "troca-obrigatoria-senha-primeiro-acesso",
      numero: 6,
      nome: "Troca obrigatória de senha no 1º acesso",
      fase: "fase1",
      prioridade: "critica",
      complexidade: "medio",
      status: "em_andamento",
      classificacao: "adapta",
      descricao: "Ler precisaTrocarSenha no onAuthStateChanged; modal bloqueante via alterarMinhaSenha; ao sucesso, zerar a flag (rule self-update); nova senha diferente de nascimento, com no mínimo 6 caracteres.",
      objetivo: "Mitigar a semente de senha fraca (nascimento é previsível).",
      dependencias: ["#5", "#7", "alterarMinhaSenha"],
      criteriosAceite: [
        "Recém-criado é forçado ao modal e não navega antes.",
        "Após trocar, próximo login sem modal.",
        "Nova senha=nascimento rejeitada.",
        "Gestores nunca veem o modal."
      ]
    },
    {
      id: "rule-self-update-precisa-trocar-senha",
      numero: 7,
      nome: "Rule self-update da flag precisaTrocarSenha",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "muito_facil",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Ampliar affectedKeys().hasOnly(['fotoBase64']) para incluir precisaTrocarSenha, mantendo role/funcionarioId/ativo/codigo bloqueados no mesmo update.",
      objetivo: "Fechar a troca obrigatória sem abrir outra porta de auto-edição.",
      dependencias: ["firestore.rules"],
      criteriosAceite: [
        "Colaborador seta precisaTrocarSenha=false no próprio doc.",
        "Negado ao mudar role.",
        "Self-update de fotoBase64 segue funcionando."
      ]
    },
    {
      id: "recuperacao-senha-reset-administrativo",
      numero: null,
      nome: "Recuperação de senha = reset administrativo pelo RH",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Como o domínio colaborador.fiobras.local é fake, sendPasswordResetEmail não funciona e 'Esqueci a senha' fica oculto no modo Colaborador. O reset viável é administrativo pelo RH: re-seta a senha para nascimento (DDMMAAAA) + precisaTrocarSenha=true.",
      objetivo: "Resolver o 'esqueci a senha' sem e-mail real e sem billing.",
      dependencias: ["#6", "gestão admin de contas"],
      criteriosAceite: [
        "RH reseta a conta; próximo login do colaborador cai na troca obrigatória.",
        "Ação registrada na auditoria.",
        "'Esqueci a senha' não aparece no modo Colaborador."
      ]
    },
    {
      id: "shell-navegacao-definitivos-dados-reais",
      numero: 8,
      nome: "Shell e navegação definitivos do colaborador (dados reais)",
      fase: "fase1",
      prioridade: "critica",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Promover o shell visual da Fase 0 a definitivo, ligando dados reais e consultas self (com rules endurecidas e carregarDadosCompletos ramificado por role).",
      objetivo: "A casa real do colaborador, reaproveitando topbar/avatar/sidebar/modais/toast.",
      dependencias: ["#39", "#1", "#2/12"],
      criteriosAceite: [
        "Colaborador vê só o menu próprio sem FAB.",
        "Consultas self carregam sem permission-denied.",
        "Gestores sem alteração.",
        "Tentar view de gestor redireciona.",
        "Mock aprovado."
      ]
    },
    {
      id: "inicio-colaborador-dados-reais",
      numero: 20,
      nome: "Início do colaborador com dados reais (cartão + atalhos)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "renderColaboradorHome real com o cartão do próprio funcionário (nome, cargo, setor, turno, admissão, tempo de casa, aniversário) + cards de atalho. Reusa renderFuncPerfilSecoes em modo self (esconder PII admin-only); lê só funcionarios/{meuId}.",
      objetivo: "Entrada coesa do Portal com dado real, orientando às consultas.",
      dependencias: ["#40", "#11", "#2/12", "renderFuncPerfilSecoes"],
      criteriosAceite: [
        "Só o próprio cartão.",
        "Nenhuma PII (CPF/PIS).",
        "Atalhos navegam.",
        "Nav sem itens de gestor."
      ]
    },
    {
      id: "minhas-ocorrencias",
      numero: 13,
      nome: "Minhas ocorrências (consulta read-only)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "facil",
      status: "planejado",
      classificacao: "reaproveita",
      descricao: "Tela self listando as ocorrências do próprio colaborador (where funcionarioId == meu), reusando renderOccCard e o histórico, sem ações de status.",
      objetivo: "Transparência sobre atrasos/faltas/abonos sem perguntar ao líder. Dado e UI já existem.",
      dependencias: ["#11", "ocorrencias + rule SELF", "renderOccCard"],
      criteriosAceite: [
        "Vê só as próprias.",
        "Ler de terceiros negado na rule.",
        "Sem botões de conferir/lançar/editar.",
        "Histórico em leitura."
      ]
    },
    {
      id: "meu-banco-de-horas",
      numero: 14,
      nome: "Meu banco de horas (saldo self + gráfico, sem PII)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Expor o próprio saldo + gráfico do mês via banco-horas-self/{codigo} (saldo + lançamentos, SEM PII) populado pelo pipeline, reusando graficoBarrasBH; carregar no carregarDadosCompletos ramificado.",
      objetivo: "Colaborador acompanha o saldo sem depender do RH.",
      dependencias: ["#11", "banco-horas-self", "graficoBarrasBH"],
      criteriosAceite: [
        "Vê o próprio saldo + gráfico.",
        "Não lê outro codigo.",
        "Sem pipeline, 'sem dados' em vez de erro."
      ]
    },
    {
      id: "comunicados-colecao-dados",
      numero: 21,
      nome: "Comunicados: coleção + camada de dados (1→N)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "cria",
      descricao: "Coleção comunicados/{id} + CRUD (criarComunicado, escutarComunicados, editarComunicado, fixarComunicado). Schema {titulo, corpo, segmento{tipo,valores}, autorUid, autorNome, publicadoEm(server), fixado, ativo, requerConfirmacao}. Cap comunicados.gerenciar (true admin/RH).",
      objetivo: "Estabelecer a comunicação 1→N que hoje não existe. Backbone de comunicados, avisos e notificações.",
      dependencias: ["rules (read segmentado, write temCap)", "papel colaborador"],
      criteriosAceite: [
        "Admin/RH cria e aparece em menos de 2s no segmento.",
        "Demais não criam.",
        "turno:1 não chega ao turno 2.",
        "Criação/edição na auditoria."
      ]
    },
    {
      id: "comunicados-tela-composicao",
      numero: 22,
      nome: "Comunicados: tela e composição (autor RH/admin)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "renderComunicados com lista publicada (cronológica reversa, fixado no topo) + modal de composição (título, corpo, segmento, fixado/requer confirmação). Corpo texto simples + quebras (escapeHtml).",
      objetivo: "Canal oficial de avisos com segmentação, substituindo WhatsApp/mural.",
      dependencias: ["#21", "mock aprovado"],
      criteriosAceite: [
        "Publica em menos de 5 cliques e aparece na lista.",
        "Fixado diferenciado e no topo.",
        "Sem emoji.",
        "Editar atualiza em tempo real."
      ]
    },
    {
      id: "comunicados-leitura-recibo",
      numero: 23,
      nome: "Comunicados: leitura pelo colaborador + recibo",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Renderizar comunicados segmentados (home + aba) e gravar recibo em comunicados/{id}/leituras/{uid} ao abrir/confirmar, espelhando o recibo do chat; botão 'Confirmo que li' quando requerConfirmacao; badge de não-lido; painel 'X de Y leram' para o autor.",
      objetivo: "Prova de leitura juridicamente útil para o RH; lugar único e confiável para o colaborador.",
      dependencias: ["#21", "#22", "recibo do chat"],
      criteriosAceite: [
        "Abrir cria 1 doc em /leituras/{uid} com hora-servidor.",
        "Badge zera e persiste.",
        "Comunicado com confirmação só sai de 'pendente' após aceite.",
        "Autor vê 'X de Y leram'."
      ]
    },
    {
      id: "avisos-internos",
      numero: null,
      nome: "Avisos internos (subtipo de comunicado)",
      fase: "fase1",
      prioridade: "media",
      complexidade: "facil",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Aviso geral como subtipo leve de comunicado (campo tipo='aviso'), sem segmentação obrigatória, para recados rápidos.",
      objetivo: "Cobrir o caso 'recado geral' sem criar coleção nova.",
      dependencias: ["#21"],
      criteriosAceite: [
        "Aviso publicado aparece para todos.",
        "Reusa a coleção comunicados.",
        "Diferenciado visualmente do comunicado segmentado.",
        "Sem emoji."
      ]
    },
    {
      id: "widget-aniversariantes-inicio",
      numero: 24,
      nome: "Widget de aniversariantes no início",
      fase: "fase1",
      prioridade: "media",
      complexidade: "facil",
      status: "planejado",
      classificacao: "reaproveita",
      descricao: "Exibir renderAniversariantesWidget na home do colaborador, alimentado por doc agregado /config/aniversariantes (nome + dia/mês, sem ano/PII).",
      objetivo: "Engajamento social de custo quase zero — componente e dados já existem.",
      dependencias: ["#20", "renderAniversariantesWidget", "/config/aniversariantes"],
      criteriosAceite: [
        "Vê aniversariantes do mês com o do dia destacado.",
        "Nada sensível exposto.",
        "Reusa o componente sem fork."
      ]
    },
    {
      id: "colecao-documentos-repositorio",
      numero: 29,
      nome: "Coleção documentos + repositório (base de assinatura)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Coleção documentos com metadados, vínculo a funcionarioId, link Drive e hash. Schema {tipo, funcionarioId, titulo, descricao, url(Drive), hashSha256, status, criadoEm(server), criadoPor, exigeAssinatura}. Reusa driveUploadDisponivel+ehUrlSegura (só https); hash via crypto.subtle.digest.",
      objetivo: "Centralizar todo documento a entregar/assinar com rastreabilidade.",
      dependencias: ["#11", "anexo PJ (contratoUrl/ehUrlSegura/google-drive.js)", "rule nova"],
      criteriosAceite: [
        "RH cria com link Drive e vê 'pendente'.",
        "url não-https bloqueada.",
        "hashSha256 preenchido.",
        "Colaborador lê só os próprios.",
        "Assinado não pode editar."
      ]
    },
    {
      id: "assinatura-n1-aceite-com-trilha",
      numero: 30,
      nome: "Assinatura N1 — aceite com trilha (usuário+data+hora+UA+log)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "reaproveita",
      descricao: "Registrar aceite com um clique, gerando evento imutável na auditoria (docId, hashSha256, uid, hora-servidor, userAgent) + subcoleção documentos/{id}/assinaturas/{uid}. Modal com documento + caixa 'Li e estou de acordo' antes de habilitar Assinar. Ressalva: é 'aceite com trilha', NÃO validade jurídica plena; IP confiável não vem do cliente.",
      objetivo: "Substituir papel por aceite digital rastreável e imutável, sem custo externo.",
      dependencias: ["#29", "registrarAuditoria", "crypto.subtle"],
      criteriosAceite: [
        "Assinar cria doc em /assinaturas/{uid} com hora-servidor.",
        "Evento na Auditoria.",
        "Status vira 'assinado'.",
        "Sem a caixa, botão desabilitado.",
        "Evento não editável."
      ]
    },
    {
      id: "meus-holerites-repositorio-pdf",
      numero: 18,
      nome: "Meus holerites — repositório de PDFs via upload do RH",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Reframe: repositório de PDFs com upload/importação pelo RH (reusa o padrão de anexo do PJ + Drive + ehUrlSegura), não integração automática com ERP. holerites/{id} (funcionarioId, competencia, urlPdf, tipo); rule read self.",
      objetivo: "Acesso self ao contracheque — um dos itens mais valiosos do portal — entregável sem billing e sem esperar o ERP.",
      dependencias: ["#11", "anexo PJ + google-drive.js", "rule read SELF"],
      criteriosAceite: [
        "RH faz upload e o colaborador vê só os próprios e abre o PDF.",
        "Acessar de terceiro negado.",
        "Sem PDFs, estado vazio honesto."
      ]
    },
    {
      id: "espelho-ponto-repositorio-pdf",
      numero: 15,
      nome: "Espelho de ponto — repositório de PDFs via upload do RH",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Espelho de ponto como PDF importado pelo RH (mesmo padrão dos holerites), por competência. Deixa explícito que é o espelho que a folha/relógio já gera, não batidas vivas calculadas pelo app.",
      objetivo: "Entregar o espelho de ponto agora, sem depender da integração de batidas.",
      dependencias: ["#18", "#11"],
      criteriosAceite: [
        "RH faz upload por competência.",
        "Colaborador abre só os próprios PDFs.",
        "Acessar de terceiro negado.",
        "Sem PDFs, vazio honesto."
      ]
    },
    {
      id: "meus-recibos-repositorio-pdf",
      numero: 19,
      nome: "Meus recibos — repositório de PDFs via upload do RH",
      fase: "fase1",
      prioridade: "media",
      complexidade: "facil",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Listar/abrir recibos por tipo (férias, 13º, adiantamento, rescisão), reusando a coleção/tela/rule dos holerites variando o campo tipo. PDFs por upload do RH.",
      objetivo: "Completar o autoatendimento financeiro com custo marginal baixo.",
      dependencias: ["#18"],
      criteriosAceite: [
        "Vê só os próprios por tipo.",
        "PDF respeita a rule de Storage.",
        "Sem PDFs, vazio honesto."
      ]
    },
    {
      id: "gestao-admin-contas-colaborador",
      numero: 9,
      nome: "Gestão admin de contas de colaborador",
      fase: "fase2",
      prioridade: "media",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Controle individual na tela de usuários: desativar, forçar troca, resetar senha para nascimento, criar conta avulsa. Tudo registrado em auditoria.",
      objetivo: "Operação do dia a dia (novo admitido, esqueceu a senha, desligamento) sem Firebase Console.",
      dependencias: ["#5", "#6", "auditoria"],
      criteriosAceite: [
        "Desativar bloqueia entrada.",
        "Forçar troca leva ao modal.",
        "Criar avulso loga com CPF+nascimento.",
        "Ações na Auditoria."
      ]
    },
    {
      id: "espelho-ponto-versao-saldo",
      numero: 15,
      nome: "Espelho de ponto — versão SALDO (lançamentos diários)",
      fase: "fase2",
      prioridade: "media",
      complexidade: "facil",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Espelho diário baseado nos lançamentos de saldo do banco de horas (data + saldo do dia/acumulado), deixando explícito que não são batidas reais. Reusa banco-horas-self.",
      objetivo: "Visão diária do banco sem prometer batidas (que dependem do relógio).",
      dependencias: ["#14", "banco-horas-self"],
      criteriosAceite: [
        "Lista diária do mês.",
        "UI deixa claro que não são batidas.",
        "Sem dados, vazio."
      ]
    },
    {
      id: "notificacoes-corporativas-in-app",
      numero: 25,
      nome: "Notificações corporativas in-app (central + badge)",
      fase: "fase2",
      prioridade: "media",
      complexidade: "dificil",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Central in-app que agrega eventos (novo comunicado, ocorrência minha, documento a assinar, reconhecimento) com badge, reusando o padrão de badge/toast/beep do chat. Notificação é estado derivado, não coleção redundante.",
      objetivo: "Ponto único de 'o que é novo para mim' sem push externo.",
      dependencias: ["#23", "listener de ocorrências", "badge/toast do chat"],
      criteriosAceite: [
        "Publicar comunicado para meu segmento incrementa o badge.",
        "Clicar navega e zera.",
        "Não-lido persiste entre refreshes."
      ]
    },
    {
      id: "reconhecimentos-internos",
      numero: 26,
      nome: "Reconhecimentos internos (elogios entre colegas)",
      fase: "fase2",
      prioridade: "media",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Coleção reconhecimentos/{id} + mural/widget reusando o padrão de reações por uid do chat. Categorias curtas, sem emoji.",
      objetivo: "Cultura de reconhecimento e sinais qualitativos para o RH.",
      dependencias: ["#11", "reacoes{} do chat", "rule nova"],
      criteriosAceite: [
        "Reconhecer aparece em tempo real.",
        "Reagir usa reacoes{}.",
        "Sem auto-reconhecimento.",
        "RH arquiva inadequado."
      ]
    },
    {
      id: "assinatura-n2-codigo-email-sms",
      numero: 33,
      nome: "Assinatura N2 — código por e-mail/SMS",
      fase: "fase2",
      prioridade: "media",
      complexidade: "dificil",
      status: "planejado",
      classificacao: "cria",
      descricao: "Segundo fator de aceite via código enviado por e-mail/SMS, elevando a força do N1. Exige serviço externo de envio + Cloud Functions.",
      objetivo: "Aumentar a robustez probatória do aceite para documentos sensíveis.",
      dependencias: ["#30", "serviço externo + Cloud Functions (Blaze)"],
      criteriosAceite: [
        "Ao assinar, o colaborador recebe um código e confirma.",
        "O evento de auditoria registra o canal e a confirmação.",
        "Sem serviço configurado, recai no N1 com aviso."
      ]
    },
    {
      id: "assinatura-advertencias",
      numero: 31,
      nome: "Assinatura de advertências (disciplinar com ciência)",
      fase: "fase2",
      prioridade: "media",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "RH/gestor emite (tipo='advertencia'), o colaborador lê e dá ciência (assina) ou registra discordância ('com ressalvas', texto livre). Reusa a assinatura N1. Visão RH do status (pendente/com ciência/com ressalvas/recusada), com badge das Obrigações.",
      objetivo: "Formalizar a ciência de medidas disciplinares com hora auditável; elimina o 'recusou a assinar' não rastreável. Ciência não é concordância.",
      dependencias: ["#30", "#29", "badge das Obrigações"],
      criteriosAceite: [
        "Emitir aparece como 'pendente de ciência'.",
        "Dar ciência muda status com carimbo.",
        "Ressalva grava o texto.",
        "Badge some após ciência.",
        "Auditoria distingue emissão e ciência."
      ]
    },
    {
      id: "assinatura-contratos-aditivos",
      numero: 32,
      nome: "Assinatura de contratos e aditivos (campanha por segmento)",
      fase: "fase2",
      prioridade: "media",
      complexidade: "dificil",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Contratos/aditivos/termos (LGPD, conduta) para assinatura, reusando o padrão de anexo + histórico versionado em array do PJ. Campanha por segmento com painel de % assinado e lista de pendentes (molde conclusoes{}). Versão congelada por hash.",
      objetivo: "Distribuição e coleta de aceite centralizada e versionada, em massa.",
      dependencias: ["#30", "#29", "aditivos[] do PJ", "conclusoes{}"],
      criteriosAceite: [
        "Campanha 'todos' inicia em 0%.",
        "Cada alvo vê pendente e assina.",
        "Painel atualiza %.",
        "Nova versão reabre pendentes.",
        "Histórico imutável."
      ]
    },
    {
      id: "avaliacao-desempenho-ciclos",
      numero: 34,
      nome: "Avaliação de desempenho — ciclos e questionários",
      fase: "fase2",
      prioridade: "media",
      complexidade: "dificil",
      status: "planejado",
      classificacao: "cria",
      descricao: "Coleção avaliacoes {ciclo, funcionarioId, avaliadorUid, modelo, respostas, status} modelada no conclusoes{} das Obrigações, com editor de modelo de questionário (nota 1-5/texto/sim-não). Tela do gestor com escopo via podeVerFuncionario.",
      objetivo: "Substituir planilhas por fluxo estruturado, com histórico por ciclo.",
      dependencias: ["conclusoes{}", "podeVerFuncionario", "PERM_CAPS", "rules"],
      criteriosAceite: [
        "RH cria ciclo com modelo.",
        "Gestor preenche/rascunho/envia.",
        "Status mostra quantas faltam.",
        "Colaborador vê só após liberação.",
        "Reabrir gera auditoria."
      ]
    },
    {
      id: "canal-etica-confidencial",
      numero: 36,
      nome: "Canal de ética/denúncia (confidencial in-app)",
      fase: "fase2",
      prioridade: "media",
      complexidade: "medio",
      status: "planejado",
      classificacao: "cria",
      descricao: "Colaborador envia denúncia/relato a um comitê de forma confidencial (autor conhecido só pelo comitê, protegido por rules). Coleção canal-etica write-create-only + protocolo. Não anônimo técnico (isso é Futuro).",
      objetivo: "Cumprir compliance/ouvidoria com canal seguro e rastreável, sem expor o denunciante ao gestor.",
      dependencias: ["papel colaborador", "caps de ética", "rule write-create-only"],
      criteriosAceite: [
        "Enviar gera protocolo.",
        "Colaborador não lista relatos (read negado).",
        "Comitê vê a fila e muda status.",
        "Gestor comum sem acesso.",
        "Documentação deixa claro 'confidencial, não anônimo técnico'."
      ]
    },
    {
      id: "onboarding-cloud-function",
      numero: 10,
      nome: "Onboarding robusto via Cloud Function (Admin SDK)",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "Substituir o lote client-side por Cloud Function (Admin SDK) que cria contas no servidor, cruzando coleções e gravando vínculo+flags; idempotente; opcional gatilho ao chegar novo funcionário.",
      objetivo: "Onboarding confiável da base inteira sem depender do navegador. Resolve a dívida do #5.",
      dependencias: ["billing Blaze", "substitui #5"],
      criteriosAceite: [
        "Onboarda a base sem o navegador.",
        "Idempotente.",
        "Novos do pipeline ganham conta sem ação manual."
      ]
    },
    {
      id: "integracao-erp-holerites",
      numero: 16,
      nome: "Integração automática ERP/WKRADAR de holerites",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "muito_dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "Substituir o upload manual de holerites por integração automática: o ERP/folha hospeda os PDFs e o pipeline os disponibiliza.",
      objetivo: "Evolução natural do repositório de PDFs (#18) quando houver apetite.",
      dependencias: ["#18", "origem ERP hospedar PDFs", "Storage"],
      criteriosAceite: [
        "Novos holerites aparecem sem upload manual.",
        "Rule read self preservada.",
        "Consistência com os PDFs já importados."
      ]
    },
    {
      id: "espelho-ponto-real-batidas",
      numero: 16,
      nome: "Espelho de ponto REAL (batidas) via origem",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "muito_dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "Exibir batidas reais. Bloqueado pela origem: o FioPulse só tem saldo, não batidas. Exige o pipeline/ERP hospedar as marcações (ex.: ponto-self/{codigo}_{YYYY-MM}).",
      objetivo: "Espelho de ponto verdadeiro, o mais pedido em portais — só viável após a origem disponibilizar.",
      dependencias: ["origem WKRADAR/ERP", "vínculo + rules self"],
      criteriosAceite: [
        "Quando populado, vê batidas por dia.",
        "Sem origem, oculto/vazio.",
        "Não lê terceiros."
      ]
    },
    {
      id: "apuracao-ponto-fechamento-mensal",
      numero: 17,
      nome: "Apuração de ponto (fechamento mensal) via origem",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "muito_dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "Apuração mensal consolidada (horas, extras, faltas, DSR, saldo). Bloqueado pela origem: é calculada na folha/relógio; o app não calcula.",
      objetivo: "A 'conta final' do mês.",
      dependencias: ["origem ERP/folha", "espelho real"],
      criteriosAceite: [
        "Quando enviado, vê o consolidado.",
        "App não tenta calcular.",
        "Acesso só ao próprio codigo."
      ]
    },
    {
      id: "notificacoes-push-fcm",
      numero: 28,
      nome: "Notificações push fora do app (FCM)",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "muito_dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "Entregar avisos críticos como push (PWA fechado) via FCM, disparado por Cloud Function quando um comunicado prioritário é publicado; opt-in; fallback in-app.",
      objetivo: "Garantir alcance fora do app (escala, fechamento, emergência).",
      dependencias: ["billing Blaze", "#25 como fallback", "SW de push"],
      criteriosAceite: [
        "Comunicado prioritário gera push com app fechado.",
        "Quem negou recebe in-app sem erro.",
        "Tokens inválidos limpos."
      ]
    },
    {
      id: "assinatura-n3-validade-juridica",
      numero: 33,
      nome: "Assinatura N3 — validade jurídica (ICP-Brasil/gov.br/Clicksign/D4Sign)",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "muito_dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "Elevar o aceite-com-trilha para assinatura com validade jurídica plena, integrando provedor externo via Cloud Function (envia documento, recebe status/comprovante por webhook; IP/geolocalização confiáveis no servidor).",
      objetivo: "Força probante jurídica plena (rescisões, acordos).",
      dependencias: ["#30", "Cloud Functions + Blaze", "contrato externo"],
      criteriosAceite: [
        "Documento crítico vai ao provedor com fluxo qualificado.",
        "Status reflete 'assinado juridicamente' com link do comprovante."
      ]
    },
    {
      id: "recuperacao-senha-self-email-sms",
      numero: null,
      nome: "Recuperação de senha self por e-mail/SMS real",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "Recuperação autônoma pelo colaborador via e-mail/SMS real (além do reset administrativo do RH). O domínio sintético fake impede reset nativo; exige serviço externo.",
      objetivo: "Reduzir a carga operacional do RH com resets.",
      dependencias: ["serviço externo", "reset administrativo (base)"],
      criteriosAceite: [
        "Colaborador recupera a senha sem o RH.",
        "Canal de envio configurável.",
        "Fluxo registrado."
      ]
    },
    {
      id: "avaliacao-autoavaliacao-feedback",
      numero: 35,
      nome: "Avaliação — autoavaliação e feedback do colaborador",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Colaborador faz a própria autoavaliação no ciclo (tipo='auto') e visualiza/comenta o feedback do gestor após liberação. Adapta avaliacoes + tela self.",
      objetivo: "Engaja o colaborador, dá voz/PDI, reduz a sensação 'de cima pra baixo'.",
      dependencias: ["#34", "vínculo", "renderView/renderNav ramificados"],
      criteriosAceite: [
        "Preenche e envia a própria.",
        "Após liberação vê auto x gestor.",
        "Marcar 'ciente' gera auditoria.",
        "Não vê de terceiros."
      ]
    },
    {
      id: "canal-etica-anonimato-tecnico",
      numero: 37,
      nome: "Canal de ética — anonimato técnico real",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "muito_dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "Evoluir para anonimato técnico real (sem autorUid, sem rastro) via Cloud Function que recebe o relato e grava anonimizado, com comunicação bidirecional por protocolo.",
      objetivo: "Atender padrões de integridade mais exigentes.",
      dependencias: ["Cloud Functions + Blaze", "#36 como base", "política de retenção"],
      criteriosAceite: [
        "Relato sem dado reidentificável.",
        "Denunciante acompanha via protocolo.",
        "Comitê responde sem ver identidade.",
        "Auditoria do comitê não reidentifica."
      ]
    },
    {
      id: "rede-social-corporativa-feed",
      numero: 27,
      nome: "Rede social corporativa (feed: posts/comentários/curtidas)",
      fase: "futuro",
      prioridade: "muito_baixa",
      complexidade: "dificil",
      status: "planejado",
      classificacao: "cria",
      descricao: "Feed 1→N (posts/{id} + comentários/curtidas) com publicação institucional e interação, reusando reacoes{} e a renderização de cards. FORA do MVP.",
      objetivo: "Espaço de cultura e pertencimento — só faz sentido depois que o Portal já resolve ponto/documento/contracheque/dúvida. Pertencimento vem por utilidade, não por feed.",
      dependencias: ["reacoes{}", "google-drive.js", "Comunicados/Avisos/Aniversariantes/Reconhecimentos/Notificações antes"],
      criteriosAceite: [
        "Post aparece em tempo real.",
        "Curtir/comentar atualiza contadores.",
        "Moderador remove impróprio.",
        "Leitura paginada."
      ]
    },
    {
      id: "onboarding-1o-acesso",
      numero: null,
      nome: "Onboarding do 1º acesso (carrossel + checklist)",
      fase: "fase1",
      prioridade: "media",
      complexidade: "facil",
      status: "planejado",
      classificacao: "cria",
      descricao: "No primeiro acesso (após a troca de senha), um carrossel de boas vindas de 5 telas (ponto, comunicados, documentos) seguido de um checklist de primeiros passos (conferir dados, assinar o Código de Ética, conhecer o app) que fica salvo em Ajuda. Aprovado em docs/mockups/onboarding-carrossel.html.",
      objetivo: "Acolher o colaborador novo e levar ele a completar o essencial sem inventar fluxo: reaproveita a assinatura, o perfil e o próprio carrossel.",
      dependencias: ["Login por CPF (#4)", "Troca obrigatória de senha (#6)", "users/{uid}.onboardingVisto", "Assinatura do Código de Ética"],
      criteriosAceite: [
        "Carrossel só aparece com onboardingVisto != true; ao concluir grava onboardingVisto=true e não repete.",
        "Pular leva direto ao checklist; Voltar/Continuar navegam o carrossel.",
        "Estado do checklist é DERIVADO (senha trocada, ética assinada, app visto); só onboardingVisto é gravado.",
        "Checklist acessível em Ajuda até concluir; não bloqueia o uso do portal.",
        "Sem emoji, sem traço na copy; aprovado em mock."
      ]
    },
    {
      id: "ocultar-chat-portal-colaborador",
      numero: null,
      nome: "Ocultar o chat (ferramenta de gestor) do Portal do Colaborador",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "muito_facil",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "O Portal do Colaborador não expõe o chat interno (ferramenta dos gestores). Os listeners de chat e presença já eram pulados pro colaborador (firebase.js, if(!ehColab)), mas o botão flutuante (#chat-fab) e o FAB de nova ocorrência (#fab) ainda apareciam porque a classe modo-colab só era aplicada na prévia, não no login real. Agora renderPortalColaborador aplica modo-colab (o CSS esconde #fab e #chat-fab) e a faixa de prévia migrou para a classe modo-preview, que só entra na prévia; a classe é removida ao deslogar ou ao renderizar um gestor.",
      objetivo: "Colaborador não acessa o chat interno de gestores; portal limpo, só com o que é dele.",
      dependencias: ["renderPortalColaborador", "portal-colaborador.css (.modo-colab)", "fix do login do colaborador"],
      criteriosAceite: [
        "No login real do colaborador, o botão de chat (#chat-fab) e o FAB não aparecem.",
        "Nenhum listener de chat ou presença é iniciado pro colaborador.",
        "Gestores continuam com o chat normal.",
        "Ao deslogar, a classe modo-colab é removida.",
        "A faixa de prévia não aparece no login real (só na prévia, via modo-preview)."
      ]
    }
  ]
};
