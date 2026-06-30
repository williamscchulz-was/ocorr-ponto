window.ROADMAP = {
  fases: [
    { id: "fase0",  nome: "Fase 0",        subtitulo: "Acesso + estrutura visual (sem login)" },
    { id: "fase1",  nome: "Fase 1 — MVP",  subtitulo: "Autenticação, SELF, consultas, comunicados, documentos" },
    { id: "alfa",   nome: "Alfa",          subtitulo: "Teste interno com 5, smoke SELF e recuo seguro" },
    { id: "beta",   nome: "Beta",          subtitulo: "Piloto de 20, gates, adoção e privacidade" },
    { id: "live",   nome: "Live",          subtitulo: "Lançamento geral, suporte e monitoramento contínuo" },
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
      descricao: "renderColabRoadmap() reusando o molde de Obrigações (agrupamento por fase no padrão .mes/mes--atual/.vermais, linhas no padrão obrigLinhaHtml, selos .st, pílulas .ob-pill, barras de progresso por fase + global). Cada item exibe Nome, Descrição, Objetivo, Prioridade, Complexidade, Dependências, Status e Critérios de aceite (modal de detalhe via openModal). Fonte: array estático public/roadmap.js populado a partir deste documento. UI redesenhada (jun/2026) como MAPA MENTAL vertical estilo trilho de metrô (renderPortalRoadmap: estações por fase com anel de progresso, folhas expansíveis, conectores SVG Bézier), contagens derivadas em runtime; chips dark aware.",
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
        "Lê o próprio doc + diretório GP.",
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
      status: "concluido",
      concluidoEm: "2026-06-25",
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
      status: "concluido",
      concluidoEm: "2026-06-25",
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
      objetivo: "Manter a base de logins viva sem o GP lembrar de criar conta a cada admissão.",
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
        "Após inativação, histórico/auditoria do ex-funcionário continuam legíveis para admin/GP.",
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
      status: "concluido",
      concluidoEm: "2026-06-25",
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
      nome: "Recuperação de senha = reset administrativo pelo GP",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Como o domínio colaborador.fiobras.local é fake, sendPasswordResetEmail não funciona e 'Esqueci a senha' fica oculto no modo Colaborador. O reset viável é administrativo pelo GP: re-seta a senha para nascimento (DDMMAAAA) + precisaTrocarSenha=true.",
      objetivo: "Resolver o 'esqueci a senha' sem e-mail real e sem billing.",
      dependencias: ["#6", "gestão admin de contas"],
      criteriosAceite: [
        "GP reseta a conta; próximo login do colaborador cai na troca obrigatória.",
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
      objetivo: "Colaborador acompanha o saldo sem depender do GP.",
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
      status: "concluido",
      concluidoEm: "2026-06-26",
      classificacao: "cria",
      descricao: "ENTREGUE (no ar v186). Segmentação por turno/setor lê cruzado (users.setor/.turno denormalizados pelo pipeline) + hasOnly nas subcoleções. Coleção comunicados/{id} + CRUD (criarComunicado, escutarComunicados, editarComunicado, fixarComunicado). Schema {titulo, corpo, segmento{tipo,valores}, autorUid, autorNome, publicadoEm(server), fixado, ativo, requerConfirmacao}. Cap comunicados.gerenciar (true admin/GP).",
      objetivo: "Estabelecer a comunicação 1→N que hoje não existe. Backbone de comunicados, avisos e notificações.",
      dependencias: ["rules (read segmentado, write temCap)", "papel colaborador"],
      criteriosAceite: [
        "Admin/GP cria e aparece em menos de 2s no segmento.",
        "Demais não criam.",
        "turno:1 não chega ao turno 2.",
        "Criação/edição na auditoria."
      ]
    },
    {
      id: "comunicados-tela-composicao",
      numero: 22,
      nome: "Comunicados: tela e composição (autor GP/admin)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-26",
      classificacao: "adapta",
      descricao: "ENTREGUE (v186) com pré-visualização ao vivo + IMAGEM no aviso (base64 com resize no cliente). Origem = PORTAL DO GESTOR (cap comunicados.gerenciar = admin/GP; supervisor comum não publica). renderComunicados com lista publicada (cronológica reversa, fixado no topo) + painel de leituras (X de Y leram/confirmaram) + modal compositor (título, corpo, segmento todos/turno/setor, fixar, requer confirmação, pré-visualização). Segmentação canônica de turno (1 Matutino, 2 Vespertino, 3 Noturno, geral Todos). Corpo texto simples + quebras (escapeHtml).",
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
      status: "concluido",
      concluidoEm: "2026-06-26",
      classificacao: "adapta",
      descricao: "ENTREGUE (v188) — tela Avisos do colaborador (3 queries por segmento; a rule não filtra query). Renderizar comunicados segmentados (home + aba) e gravar recibo em comunicados/{id}/leituras/{uid} ao abrir/confirmar, espelhando o recibo do chat; botão 'Confirmo que li' quando requerConfirmacao; badge de não-lido; painel 'X de Y leram' para o autor.",
      objetivo: "Prova de leitura juridicamente útil para o GP; lugar único e confiável para o colaborador.",
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
      status: "concluido",
      concluidoEm: "2026-06-26",
      classificacao: "adapta",
      descricao: "ENTREGUE (v186) — backbone institucional (ramo pessoal por funcionarioId entra depois). Coleção documentos com metadados, vínculo a funcionarioId, link Drive e hash. Schema {tipo, funcionarioId, titulo, descricao, url(Drive), hashSha256, status, criadoEm(server), criadoPor, exigeAssinatura}. Reusa driveUploadDisponivel+ehUrlSegura (só https); hash via crypto.subtle.digest.",
      objetivo: "Centralizar todo documento a entregar/assinar com rastreabilidade.",
      dependencias: ["#11", "anexo PJ (contratoUrl/ehUrlSegura/google-drive.js)", "rule nova"],
      criteriosAceite: [
        "GP cria com link Drive e vê 'pendente'.",
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
      status: "concluido",
      concluidoEm: "2026-06-26",
      classificacao: "reaproveita",
      descricao: "ENTREGUE (v188) com RE-AUTENTICAÇÃO no ato de assinar (o colaborador redigita a senha; reauthenticateWithCredential) — nivel escolhido pelo dono. Registrar aceite com um clique, gerando evento imutável na auditoria (docId, hashSha256, uid, hora-servidor, userAgent) + subcoleção documentos/{id}/assinaturas/{uid}. Modal com documento + caixa 'Li e estou de acordo' antes de habilitar Assinar. Ressalva: é 'aceite com trilha', NÃO validade jurídica plena; IP confiável não vem do cliente.",
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
      nome: "Meus holerites — repositório de PDFs via upload do GP",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Reframe: repositório de PDFs com upload/importação pelo GP (reusa o padrão de anexo do PJ + Drive + ehUrlSegura), não integração automática com ERP. holerites/{id} (funcionarioId, competencia, urlPdf, tipo); rule read self.",
      objetivo: "Acesso self ao contracheque — um dos itens mais valiosos do portal — entregável sem billing e sem esperar o ERP.",
      dependencias: ["#11", "anexo PJ + google-drive.js", "rule read SELF"],
      criteriosAceite: [
        "GP faz upload e o colaborador vê só os próprios e abre o PDF.",
        "Acessar de terceiro negado.",
        "Sem PDFs, estado vazio honesto."
      ]
    },
    {
      id: "espelho-ponto-repositorio-pdf",
      numero: 15,
      nome: "Espelho de ponto — repositório de PDFs via upload do GP",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Espelho de ponto como PDF importado pelo GP (mesmo padrão dos holerites), por competência. Deixa explícito que é o espelho que a folha/relógio já gera, não batidas vivas calculadas pelo app.",
      objetivo: "Entregar o espelho de ponto agora, sem depender da integração de batidas.",
      dependencias: ["#18", "#11"],
      criteriosAceite: [
        "GP faz upload por competência.",
        "Colaborador abre só os próprios PDFs.",
        "Acessar de terceiro negado.",
        "Sem PDFs, vazio honesto."
      ]
    },
    {
      id: "meus-recibos-repositorio-pdf",
      numero: 19,
      nome: "Meus recibos — repositório de PDFs via upload do GP",
      fase: "fase1",
      prioridade: "media",
      complexidade: "facil",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Listar/abrir recibos por tipo (férias, 13º, adiantamento, rescisão), reusando a coleção/tela/rule dos holerites variando o campo tipo. PDFs por upload do GP.",
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
      objetivo: "Cultura de reconhecimento e sinais qualitativos para o GP.",
      dependencias: ["#11", "reacoes{} do chat", "rule nova"],
      criteriosAceite: [
        "Reconhecer aparece em tempo real.",
        "Reagir usa reacoes{}.",
        "Sem auto-reconhecimento.",
        "GP arquiva inadequado."
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
      descricao: "GP/gestor emite (tipo='advertencia'), o colaborador lê e dá ciência (assina) ou registra discordância ('com ressalvas', texto livre). Reusa a assinatura N1. Visão GP do status (pendente/com ciência/com ressalvas/recusada), com badge das Obrigações.",
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
        "GP cria ciclo com modelo.",
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
      numero: "16a",
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
      numero: "16b",
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
      descricao: "Recuperação autônoma pelo colaborador via e-mail/SMS real (além do reset administrativo do GP). O domínio sintético fake impede reset nativo; exige serviço externo.",
      objetivo: "Reduzir a carga operacional do GP com resets.",
      dependencias: ["serviço externo", "reset administrativo (base)"],
      criteriosAceite: [
        "Colaborador recupera a senha sem o GP.",
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
    },
    {
      id: "alfa-grupo-selecao",
      numero: null,
      nome: "Definição do grupo alfa (5 pessoas) e ponto de contato no GP",
      fase: "alfa",
      prioridade: "alta",
      complexidade: "muito_facil",
      status: "planejado",
      descricao: "Selecionar 5 colaboradores para o teste interno do Portal, com perfis variados (alguém com facilidade digital, alguém com pouca familiaridade, líderes de turno) dentro dos 86 logins ativos, evitando diretoria, invalidez e aprendiz (sem acesso). Registrar nome, setor, turno e CPF de cada participante e combinar de viva voz que é uma versão de teste e que bugs e dúvidas são esperados. Definir um responsável do GP como ponto de contato e montar um canal simples de feedback (grupo de mensagens ou planilha única com data, pessoa, tela, o que esperava e o que aconteceu). O GP consolida em uma lista priorizada (bug, dúvida recorrente, sugestão) que alimenta o backlog antes do beta.",
      objetivo: "Começar o rollout por um grupo pequeno e controlado, com gente que representa a realidade da fábrica, e transformar o atrito relatado em correções concretas antes de abrir para mais pessoas.",
      dependencias: ["Provisão de logins (WKRADAR)", "Login por CPF (#4)", "Troca obrigatória de senha (#6)"],
      criteriosAceite: [
        "Lista nominal de 5 participantes alfa registrada, com setor, turno e CPF.",
        "Nenhum participante de diretoria, invalidez ou aprendiz na lista.",
        "Cada participante avisado pessoalmente de que é versão de teste antes do primeiro acesso.",
        "Um responsável do GP nomeado como ponto de contato e canal de feedback comunicado aos 5.",
        "Relatos consolidados em lista priorizada (bug, dúvida, sugestão) com pelo menos uma resposta do GP no prazo combinado, antes de iniciar o beta."
      ]
    },
    {
      id: "alfa-smoke-caminho-critico",
      numero: null,
      nome: "Smoke test do caminho crítico (login por CPF até consultas)",
      fase: "alfa",
      prioridade: "critica",
      complexidade: "medio",
      status: "planejado",
      descricao: "Roteiro de fumaça rodado a cada deploy do Portal, cobrindo o fluxo de ponta a ponta do colaborador: login por CPF (email sintético), troca obrigatória de senha, abertura da home, Minhas ocorrências, Meu banco de horas e abertura de um PDF (holerite ou espelho). Cada passo tem resultado esperado anotado (carrega, sem acesso negado, sem dado de terceiro). Rodado no celular e no PC do quiosque antes de liberar para os 5 do alfa. O checklist vive em docs (versionado), não no app.",
      objetivo: "Garantir que o caminho que todo colaborador percorre no primeiro acesso funciona antes de expor a primeira pessoa, pegando regressão de login, regras e consulta cedo e barato.",
      dependencias: ["Login por CPF (#4)", "Troca obrigatória de senha (#6)", "Endurecer regras de funcionarios e users (#2)", "Minhas ocorrências (#13)", "Meu banco de horas (#14)"],
      criteriosAceite: [
        "Roteiro escrito com os 6 passos e o resultado esperado de cada um, versionado em docs.",
        "Rodada completa registra data, executor, dispositivo (celular e PC do quiosque) e resultado por passo.",
        "Nenhum passo retorna acesso negado no fluxo do próprio colaborador.",
        "Nenhuma tela do roteiro exibe dado de terceiro (verificação visual item a item).",
        "Liberação do grupo alfa só ocorre com os 6 passos verdes."
      ]
    },
    {
      id: "alfa-checklist-self",
      numero: null,
      nome: "Checklist de segurança SELF (cada um só vê o seu)",
      fase: "alfa",
      prioridade: "critica",
      complexidade: "medio",
      status: "planejado",
      descricao: "Roteiro de verificação executado com o grupo alfa provando que cada colaborador acessa somente os próprios dados. Para cada coleção (funcionarios, ocorrências, banco de horas, holerites, documentos), tentar ler de um funcionário de terceiro e confirmar que o acesso é negado, e conferir que a tela nunca lista dado alheio. Inclui a varredura de minimização: inspecionar a aba de rede e o conteúdo da página para confirmar que CPF, PIS e data de nascimento de qualquer pessoa não chegam ao cliente do colaborador, e que o documento do próprio usuário carrega apenas o mínimo (vínculo e flags). Espelhar os casos no emulator (próprio liberado, terceiro negado) e repetir contra produção com contas alfa reais.",
      objetivo: "Provar, antes de ampliar o acesso, que o escopo SELF segura na prática e em produção, não só no emulator, e que o que não aparece na tela também não trafega na rede. O risco número um é o nascimento, que é a semente da senha de todos.",
      dependencias: ["Endurecer regras de funcionarios e users (#2)", "Vínculo uid e funcionarioId (#11)", "Minhas ocorrências (#13)", "Meu banco de horas sem PII (#14)", "Suíte de regras no emulator"],
      criteriosAceite: [
        "Para cada coleção SELF, a leitura de um funcionário de terceiro é negada (emulator e produção).",
        "Conta alfa sem vínculo não lê nenhum funcionário (proteção contra vínculo ausente verificada).",
        "Nenhum CPF, PIS ou nascimento de terceiro aparece na tela ou no tráfego de rede do colaborador.",
        "Resultado registrado por coleção (próprio liberado, terceiro negado) com data e ambiente; achado de dado em excesso vira correção bloqueante antes do beta.",
        "Suíte do emulator passa 100 por cento antes de liberar o alfa."
      ]
    },
    {
      id: "alfa-kill-switch",
      numero: null,
      nome: "Botão de desligar o Portal (kill switch)",
      fase: "alfa",
      prioridade: "critica",
      complexidade: "medio",
      status: "planejado",
      descricao: "Flag de habilitação do modo Colaborador lida no login a partir de um documento de configuração público e sem PII, por exemplo config/portalColaborador com {ativo, mensagem}. Com ativo igual a false, o login de colaborador cai em uma tela honesta de Portal em manutenção (mensagem configurável), enquanto o caminho do gestor segue intacto. Permite desligar o Portal em segundos, sem novo deploy e sem afetar o sistema de ponto dos gestores.",
      objetivo: "Ter um interruptor único para conter incidente (vazamento, bug de regra, sobrecarga) sem derrubar o app inteiro nem esperar build e deploy.",
      dependencias: ["Papel colaborador e escopo SELF (#1)", "Fluxo de login (onAuthStateChanged)", "config/portalColaborador (leitura pública, escrita só admin)"],
      criteriosAceite: [
        "Com a flag desligada, o colaborador vê a tela de manutenção e não acessa nenhuma consulta.",
        "Com a flag desligada, login e navegação do gestor continuam idênticos.",
        "Alternar a flag reflete no próximo login, sem novo deploy.",
        "Mensagem de manutenção é configurável e exibida sem emoji e sem traço.",
        "Mudança da flag fica registrada na auditoria (quem ligou ou desligou e quando)."
      ]
    },
    {
      id: "alfa-plano-recuo",
      numero: null,
      nome: "Plano de recuo do Portal (passo a passo ensaiado)",
      fase: "alfa",
      prioridade: "alta",
      complexidade: "facil",
      status: "planejado",
      descricao: "Procedimento escrito e ensaiado uma vez no grupo alfa para reverter o Portal a um estado seguro: ordem de ação (primeiro o botão de desligar, depois reverter o deploy do hosting, depois reverter as regras se necessário), comando de redeploy da última versão boa conhecida, e critério de quando reverter regras em vez de só desligar a flag. Reforça que inativar nunca apaga dado (a trilha é append only), então reverter regras não causa perda de histórico.",
      objetivo: "Transformar deu problema em uma sequência conhecida e rápida, sem improviso, preservando dados e auditoria.",
      dependencias: ["Botão de desligar o Portal (kill switch)", "Hosting (versão anterior)", "Regras do Firestore versionadas"],
      criteriosAceite: [
        "Documento de recuo versionado com a ordem das ações e o comando exato de redeploy da versão anterior.",
        "Ensaio registrado: Portal desligado e religado com sucesso no grupo alfa.",
        "Critério objetivo de quando desligar a flag, quando reverter regras e quando reverter o hosting.",
        "Confirmado por escrito que o recuo não apaga histórico nem auditoria.",
        "Tempo do ensaio (do incidente até o Portal seguro) anotado como referência."
      ]
    },
    {
      id: "beta-material-treinamento",
      numero: null,
      nome: "Material de primeiro acesso e treinamento curto do piloto (20 pessoas)",
      fase: "beta",
      prioridade: "alta",
      complexidade: "facil",
      status: "planejado",
      descricao: "Selecionar o grupo piloto de cerca de 20 pessoas (de preferência um turno ou setor inteiro, para o boca a boca jogar a favor) e produzir um material curto e visual de primeiro acesso (um cartão ou folha A5 e uma versão para celular) em linguagem simples: entre com o CPF, a senha inicial é a sua data de nascimento no formato ddmmaaaa (oito dígitos, sem barras), e na primeira vez o sistema pede para criar uma senha nova só sua. Incluir onde acessar (link ou QR Code), o que fazer se não conseguir entrar (procurar o GP) e o aviso de que é um sistema da empresa. Rodar um treinamento curto presencial de poucos minutos por turma, cobrindo primeiro acesso, troca de senha e consultas.",
      objetivo: "Remover a dúvida número um do primeiro acesso (qual é a senha e como ela funciona) com uma explicação que qualquer colaborador entende sozinho, validando o Portal com um grupo maior já organizado por turno ou setor.",
      dependencias: ["Login por CPF (#4)", "Troca obrigatória de senha (#6)", "Aprendizados do grupo alfa"],
      criteriosAceite: [
        "Grupo piloto de cerca de 20 pessoas definido, idealmente um turno ou setor inteiro.",
        "Material explica CPF, senha inicial igual ao nascimento em ddmmaaaa e troca obrigatória, em frases curtas, com forma de acesso (link ou QR Code) e o que fazer ao não conseguir entrar.",
        "Validado com pelo menos um participante alfa de baixa familiaridade digital, que entendeu sem ajuda.",
        "Treinamento curto realizado com cada turma, cobrindo primeiro acesso, troca de senha e consultas.",
        "Versão para impressão (cartão ou A5) e versão legível no celular, sem traço e sem emoji."
      ]
    },
    {
      id: "beta-rollout-gradual",
      numero: null,
      nome: "Rollout gradual controlado (alfa 5, beta 20, depois geral)",
      fase: "beta",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      descricao: "Liberação por lista de pessoas, não por percentual abstrato: alfa com 5, beta com 20 (um turno ou setor), depois geral. O controle de quem já foi liberado é operacional (provisão e ativação de conta pelo pipeline WKRADAR e pelo GP), não um experimento no cliente. Cada onda só abre depois que os critérios da onda anterior batem. Diretoria, afastados por invalidez e aprendizes seguem fora do acesso em todas as ondas. Quem não tem celular tem acesso garantido por quiosque ou PC compartilhado.",
      objetivo: "Conter o raio de impacto de qualquer falha a um grupo pequeno e crescer só com sinal verde, em vez de expor 86 pessoas de uma vez.",
      dependencias: ["Smoke test do caminho crítico", "Provisão de logins WKRADAR (86 ativos)", "Critérios de saída mensuráveis das fases"],
      criteriosAceite: [
        "Lista nominal de cada onda (5, depois 20) definida e registrada antes de liberar.",
        "A onda seguinte só é liberada depois que o critério da anterior bate.",
        "Diretoria, invalidez e aprendiz permanecem sem acesso em todas as ondas.",
        "Quem não tem celular na onda tem acesso garantido por quiosque ou PC compartilhado.",
        "O status de qual onda está ativa fica visível para GP e direção."
      ]
    },
    {
      id: "beta-monitoramento-adocao",
      numero: null,
      nome: "Monitoramento de adoção e saúde (logins, erros, resets)",
      fase: "beta",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      descricao: "Painel operacional simples para GP e direção com os sinais que decidem avançar ou recuar: quantos da onda entraram pelo menos uma vez, quantos concluíram a troca de senha, quantos resets administrativos foram pedidos, contagem de bugs abertos por gravidade e qualquer pico de acesso negado. Os números saem do que já existe (usuários com flags, auditoria de resets, provisão do pipeline); não cria coleta nova de dado de comportamento além do operacional.",
      objetivo: "Dar visibilidade objetiva da adoção e da saúde do Portal para sustentar os critérios de saída de cada fase, em vez de decidir por impressão.",
      dependencias: ["users (precisaTrocarSenha e ativo)", "Reset administrativo pelo GP (auditoria)", "Provisão WKRADAR", "Coleta de bugs da onda"],
      criteriosAceite: [
        "O painel mostra, por onda: quantos entraram, quantos trocaram a senha, número de resets e número de bugs por gravidade.",
        "Os números derivam de dados já existentes (flags, auditoria, pipeline), sem coleta nova de PII.",
        "O GP consegue ler o painel sem ajuda técnica.",
        "Pico anormal de acesso negado ou de resets fica visível para acionar o botão de desligar.",
        "Os indicadores do painel são exatamente os usados nos critérios de saída das fases."
      ]
    },
    {
      id: "beta-criterios-saida",
      numero: null,
      nome: "Critérios de saída mensuráveis (alfa, beta, live)",
      fase: "beta",
      prioridade: "alta",
      complexidade: "facil",
      status: "planejado",
      descricao: "Critérios objetivos e escritos para encerrar cada fase, calibrados ao tamanho real das ondas. Alfa: smoke com os 6 passos verdes, zero bug crítico aberto, checklist de segurança SELF concluído. Beta: pelo menos 80 por cento dos 20 entraram e trocaram a senha, zero bug crítico, fila de suporte do primeiro acesso estável (sem acúmulo de resets sem resposta). Live: comunicação oficial publicada, FAQ disponível, monitoramento contínuo de pé. Os critérios referenciam o painel de monitoramento e ficam versionados em docs.",
      objetivo: "Substituir parece pronto por condições claras de avanço, evitando escalar para mais gente com problema em aberto.",
      dependencias: ["Smoke test do caminho crítico", "Monitoramento de adoção e saúde", "Checklist de segurança SELF (alfa)"],
      criteriosAceite: [
        "Cada fase (alfa, beta, live) tem critérios de saída escritos, numéricos onde possível, versionados em docs.",
        "Nenhuma fase encerra com bug crítico em aberto.",
        "O critério do beta exige percentual mínimo de login e de troca de senha do grupo de 20.",
        "O critério do live exige comunicação oficial, FAQ e monitoramento contínuo ativos.",
        "Cada avanço de fase fica registrado com a data e a confirmação de que o critério bateu."
      ]
    },
    {
      id: "beta-privacidade-inativacao",
      numero: null,
      nome: "Aceite de privacidade por versão e teste da inativação automática",
      fase: "beta",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      descricao: "No primeiro acesso do grupo piloto, apresentar a política de privacidade do Portal (quais dados o GP trata, finalidade, retenção, canal do titular) e registrar o aceite por versão, reusando o padrão de assinatura com trilha (uid, identificação da versão, hora do servidor, dispositivo); trocar a versão do texto reabre o aceite pendente. No mesmo piloto, exercitar com um caso controlado o pipeline de inativação: ao marcar o funcionário como inativo ou demitido pelo WKRADAR, o cadastro de acesso do colaborador cai para inativo e o login passa a ser bloqueado no acesso seguinte; confirmar que o histórico e a trilha de quem saiu continuam legíveis para admin e GP (nada apagado) e medir o atraso entre a saída do quadro e o corte de acesso.",
      objetivo: "Cumprir a base legal e o dever de informação da LGPD com consentimento versionado e auditável, e provar que quem sai do quadro perde o acesso automaticamente com o dado retido, ainda no piloto antes da carga geral.",
      dependencias: ["Troca obrigatória de senha (#6)", "Assinatura com trilha (#30)", "Coleção de documentos (#29)", "Provisão de logins (#5 e #10)", "Inativação automática ao sair do quadro"],
      criteriosAceite: [
        "O colaborador do piloto vê a política e o aceite é gravado com versão, hora do servidor e dispositivo; sem o aceite da versão vigente o item fica pendente, e publicar nova versão reabre o aceite.",
        "O evento de aceite é imutável e aparece na auditoria.",
        "Conta marcada como inativa pelo pipeline não consegue entrar no acesso seguinte, com atraso medido e dentro do ciclo diário.",
        "Histórico e auditoria de quem saiu do quadro continuam legíveis para admin e GP; nada é apagado e o bloqueio fica registrado.",
        "Diretoria, invalidez e aprendiz confirmados sem login ativo."
      ]
    },
    {
      id: "live-comunicacao-oficial",
      numero: null,
      nome: "Comunicação oficial de lançamento (mural, WhatsApp e Portal)",
      fase: "live",
      prioridade: "alta",
      complexidade: "muito_facil",
      status: "planejado",
      descricao: "Anunciar o lançamento geral para os 86 colaboradores ativos em canais coordenados: comunicado oficial no próprio Portal, cartaz no mural e mensagem no WhatsApp, todos com a mesma mensagem curta (o que é o Portal, como acessar pela primeira vez com CPF e nascimento, e onde pedir ajuda). Reaproveitar o material de primeiro acesso já validado no beta e citar nominalmente o canal de suporte do GP. Combinar uma data e uma mensagem única para não gerar versões conflitantes. Nenhum exemplo ou captura mostra CPF, PIS ou nascimento real; toda imagem usa dado fictício ou mascarado.",
      objetivo: "Dar ao Portal um lançamento oficial e reconhecível, em vez de algo que aparece sem aviso, garantindo que todo colaborador saiba que existe, para que serve e como entrar, sem o próprio material virar fonte de vazamento.",
      dependencias: ["Treinamento e métricas de adoção do piloto", "Material de primeiro acesso (piloto)", "Comunicados (#21 e #22)"],
      criteriosAceite: [
        "Lançamento anunciado em Portal, mural e WhatsApp com a mesma mensagem.",
        "A mensagem explica o que é o Portal, como fazer o primeiro acesso e onde pedir ajuda.",
        "Material de primeiro acesso validado no beta reaproveitado na comunicação.",
        "Canal de suporte do GP citado nominalmente em todos os canais.",
        "Nenhum exemplo ou captura mostra CPF, PIS ou nascimento real; tudo fictício ou mascarado, sem traço e sem emoji."
      ]
    },
    {
      id: "live-faq-suporte-quiosque",
      numero: null,
      nome: "FAQ, suporte humano, reset pelo GP e acesso por quiosque",
      fase: "live",
      prioridade: "alta",
      complexidade: "facil",
      status: "planejado",
      descricao: "Estruturar o suporte contínuo do primeiro acesso: um FAQ curto com as dúvidas reais coletadas no alfa e no beta (esqueci a senha, não lembro meu nascimento, troquei e esqueci de novo, não consigo entrar, não tenho celular) e um procedimento humano claro para o GP, incluindo o reset administrativo (voltar a senha para o nascimento em ddmmaaaa com troca obrigatória no acesso seguinte), já que o esqueci a senha automático não existe no modo Colaborador. Para quem não tem celular, instrução de uso do PC compartilhado ou quiosque, com o passo explícito de encerrar a sessão (botão Sair) ao terminar. Definir quem no GP faz o reset, em quanto tempo, e registrar cada reset. Incluir um roteiro objetivo para acolher resistência (não quero usar celular, prefiro perguntar pessoalmente) sem forçar.",
      objetivo: "Garantir que ninguém fique travado no primeiro acesso nem fique de fora por falta de celular, e que o esqueci a senha tenha uma resposta humana rápida e registrada, sustentando a adoção depois do entusiasmo inicial.",
      dependencias: ["Recuperação de senha por reset administrativo do GP", "Gestão admin de contas de colaborador (#9)", "Onboarding do primeiro acesso (carrossel)", "Comunicação oficial de lançamento"],
      criteriosAceite: [
        "FAQ curto publicado com as dúvidas reais de primeiro acesso do alfa e do beta, cobrindo esqueci a senha (reset do GP), sem celular (quiosque ou PC) e não consigo entrar.",
        "Procedimento de reset administrativo documentado (quem faz, prazo, como o colaborador volta a entrar) e cada reset registrado na auditoria.",
        "Roteiro de uso do PC compartilhado inclui o passo de sair da sessão ao terminar.",
        "O FAQ explica que o colaborador vê apenas os próprios dados e indica o canal para dúvidas de privacidade.",
        "Material validado com o grupo beta antes do lançamento geral, sem traço e sem emoji."
      ]
    },
    {
      id: "live-monitoramento-retencao",
      numero: null,
      nome: "Monitoramento contínuo SELF e política de retenção rodando",
      fase: "live",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      descricao: "Depois do lançamento geral, acompanhamento contínuo dos sinais de segurança SELF: contas ativas em relação ao quadro, picos de acesso negado (tentativa de ler fora do escopo), resets administrativos e inativações processadas pelo pipeline. A política de retenção e inativação passa a rodar em regime: quem sai do quadro perde acesso, os dados ficam retidos pelo prazo definido e a auditoria registra cada evento. Revisão periódica do GP confere que ninguém fora do quadro tem acesso.",
      objetivo: "Manter o escopo SELF íntegro em produção ao longo do tempo, com a política de retenção e inativação em operação e revisão recorrente.",
      dependencias: ["Inativação automática ao sair do quadro", "Recuperação de senha por reset do GP", "Auditoria append only"],
      criteriosAceite: [
        "Painel ou rotina do GP cruza contas ativas com o quadro e sinaliza divergência.",
        "Tentativas de acesso fora do escopo (acesso negado) ficam visíveis para revisão.",
        "Resets administrativos e inativações do pipeline ficam rastreáveis na auditoria.",
        "Política de retenção e inativação documentada e em execução (prazos definidos, dado retido, nada apagado indevidamente).",
        "Revisão periódica confirma que ninguém fora do quadro mantém acesso."
      ]
    },
    {
      id: "categorias-sem-acesso-portal",
      numero: null,
      nome: "Categorias sem acesso ao Portal (diretoria, invalidez, aprendiz)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "facil",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Diretoria, aposentadoria por invalidez e menor aprendiz não acessam o Portal do Colaborador. O pipeline WKRADAR (sync-colaborador-users.mjs) trata essas categorias de forma unificada: não cria login e revoga se já existir (users.ativo=false + Auth disabled + auditoria), com motivoSemAcesso. Há allowlist explícita para exceções de teste (ex.: o login do diretor William). A trava users.ativo===false + Auth disabled barra a entrada no app.",
      objetivo: "Manter rastreável e auditável quem fica fora do Portal por categoria, sem depender de ressalva escondida dentro de outros itens.",
      dependencias: ["Criação e inativação automática de usuários (#5)", "Vínculo uid e funcionarioId (#11)", "Trava users.ativo no onAuthStateChanged"],
      criteriosAceite: [
        "Diretoria, invalidez e aprendiz não recebem login; se já existir, é revogado (ativo false + Auth disabled).",
        "Allowlist explícita permite exceções de teste sem reabrir a categoria.",
        "Nada é apagado: histórico e auditoria preservados (append only).",
        "Reexecutar o pipeline é idempotente."
      ]
    },
    {
      id: "documentos-institucionais-gestao",
      numero: null,
      nome: "Documentos institucionais (gestão pelo GP/admin)",
      fase: "fase2",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-26",
      classificacao: "adapta",
      descricao: "ENTREGUE (v186). Tela no portal do GESTOR (cap documentos.gerenciar = admin/GP) para publicar e versionar documentos institucionais: manual de regras, código de conduta, manual da cultura, política de privacidade e LGPD, termos. Reusa documentos/{id} com escopo institucional (sem funcionarioId, com segmento) + assinatura N1 (#30). Texto OU anexo Drive (https + hash SHA-256); exige assinatura ou ciência; trocar a versão reabre a assinatura. Painel de adesão (porcentagem e pendentes). O colaborador só consome (lê e assina). Supervisor comum não publica por padrão.",
      objetivo: "Dar ao GP um lugar para publicar os documentos da empresa com versão, segmento e prova de ciência, sem mexer nas telas atuais do gestor.",
      dependencias: ["Coleção documentos e repositório (#29)", "Assinatura N1 com trilha (#30)", "cap documentos.gerenciar", "Segmentação canônica de turno"],
      criteriosAceite: [
        "Só admin e GP (documentos.gerenciar) veem a aba e publicam; supervisor comum não.",
        "Documento com texto ou anexo Drive (https) + hash; segmento por turno, setor ou todos.",
        "Exige assinatura ou ciência; publicar nova versão reabre o aceite (versão anterior congela como prova).",
        "Painel de adesão (porcentagem e pendentes) lê de assinaturas e leituras no servidor, sem PII de terceiros.",
        "Zero regressão nas telas e regras atuais do gestor."
      ]
    },
    {
      id: "marca-proposta-c-pulso",
      numero: null,
      nome: "Marca FioPulse — Proposta C (pulso ECG + tagline)",
      fase: "fase1",
      prioridade: "media",
      complexidade: "facil",
      status: "concluido",
      concluidoEm: "2026-06-26",
      classificacao: "adapta",
      descricao: "ENTREGUE (v184). Mark ECG-pulso inline (SVG) unificado em 4 pontos (acesso, login gestor, login colaborador, sidebar) + tagline 'Fiobras · o batimento do GP'. Favicons 16/32/48 regerados (quadrado verde + ECG branco, legível a 16px) + variante monocromática. Aditivo, zero regressão.",
      objetivo: "Identidade única e reconhecível do FioPulse, do acesso à sidebar, em todos os tamanhos.",
      dependencias: ["Manual de marca Fiobras"],
      criteriosAceite: [
        "Mesma marca no acesso, login e sidebar.",
        "Favicon legível a 16px.",
        "Tagline unificada 'o batimento do GP'.",
        "Nenhuma tela existente alterada."
      ]
    },
    {
      id: "auditoria-mobile-app-like",
      numero: null,
      nome: "Auditoria mobile / sensação de app (viewport + chrome + toque)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "em_andamento",
      classificacao: "adapta",
      descricao: "1ª LEVA NO AR (v189). Viewport de app (maximum-scale=1, user-scalable=no — acaba o pinch-zoom preso). No mobile: esconde o hamburger redundante (.topbar__menu), o FAB flutuante e o toggle do rail (a bottom-nav cobre a navegação); alvos de toque ≥40px; senha 16px (evita zoom no iOS); safe-area na bottom-nav; empilha stats/filtros/cards do colaborador com botão largura total; títulos menores. 2ª LEVA (baixa prioridade, pendente): tamanhos da home do colaborador (saldo/KPI) + scroll-snap na tabela de permissões.",
      objetivo: "Deixar o app mobile-friendly de verdade (estrutura de app, não só adaptado).",
      dependencias: ["Casca de UI (topbar/sidebar/bottom-nav)"],
      criteriosAceite: [
        "Sem pinch-zoom preso no mobile.",
        "Sem menu sanduíche redundante no mobile.",
        "Alvos de toque confortáveis.",
        "Inputs não causam zoom no iOS.",
        "Cards e ações não estouram a largura."
      ]
    }
  ]
};
