window.ROADMAP = {
  fases: [
    { id: "fase0",  nome: "Fase 0",        subtitulo: "Primeira versão para conhecer o portal (ainda sem login)" },
    { id: "fase1",  nome: "Fase 1 — MVP",  subtitulo: "Entrada, seus dados, comunicados e documentos" },
    { id: "alfa",   nome: "Alfa",          subtitulo: "Teste com um grupo pequeno, com cuidado extra" },
    { id: "beta",   nome: "Beta",          subtitulo: "Piloto maior, com acompanhamento e privacidade" },
    { id: "live",   nome: "Live",          subtitulo: "Aberto para todos, com suporte e acompanhamento contínuo" },
    { id: "fase2",  nome: "Fase 2",        subtitulo: "Mais recursos do dia a dia e para se sentir parte" },
    { id: "futuro", nome: "Futuro",        subtitulo: "Ideias para mais adiante" }
  ],
  itens: [
    {
      id: "tela-acesso",
      numero: 38,
      nome: "Tela inicial para escolher: sou colaborador ou gestor",
      fase: "fase0",
      prioridade: "critica",
      complexidade: "facil",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Uma primeira tela, com a marca do FioPulse, com dois caminhos bem claros: 'Portal do Colaborador' e 'Portal do Gestor'. Você escolhe o seu e segue por ali, sem se confundir. Quem é gestor entra normalmente com seus dados.",
      objetivo: "Uma entrada única e clara para as duas pessoas no mesmo endereço, sem confundir você com pedidos que não fazem sentido.",
      dependencias: ["Estrutura visual do portal"],
      criteriosAceite: [
        "A tela de escolha aparece antes de qualquer login.",
        "O caminho do gestor abre o login de sempre.",
        "Dá para voltar para a tela de escolha.",
        "Quem já está logado como gestor não vê essa tela.",
        "Visual alinhado à identidade do portal, aprovado antes."
      ]
    },
    {
      id: "shell-navegacao-sem-auth",
      numero: 39,
      nome: "Estrutura e menu do portal do colaborador",
      fase: "fase0",
      prioridade: "critica",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "O portal do colaborador ganha seu próprio menu, com só o que é seu (Início, suas consultas e Conta). Sem as ferramentas de gestor. A base de navegação já fica pronta para receber as telas de verdade.",
      objetivo: "A base de navegação do seu portal, simples e com só o que é seu.",
      dependencias: ["Tela inicial de acesso"],
      criteriosAceite: [
        "O colaborador vê só o menu dele.",
        "As telas de gestor ficam de fora.",
        "O portal do gestor continua igual."
      ]
    },
    {
      id: "dashboard-inicial-colaborador",
      numero: 40,
      nome: "Tela de Início do colaborador (primeira versão, com dados de exemplo)",
      fase: "fase0",
      prioridade: "critica",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Uma prévia da sua tela de Início, marcada como 'versão de demonstração' e com dados de exemplo (nada real ainda). Mostra o seu cartão (nome, cargo, setor, turno, tempo de casa), um resumo do saldo de banco de horas, comunicados e documentos, e atalhos para as telas que virão.",
      objetivo: "Mostrar como vai ser a sua tela de Início e onde cada coisa vai ficar, sem prometer dado real ainda.",
      dependencias: ["Estrutura e menu do portal do colaborador"],
      criteriosAceite: [
        "A tela mostra o cartão sem expor dados pessoais sensíveis.",
        "Resumos e atalhos usam dados de exemplo e já navegam ao tocar.",
        "Fica claro que é uma versão de demonstração.",
        "Visual alinhado ao portal, aprovado antes."
      ]
    },
    {
      id: "roadmap-portal-in-app",
      numero: 41,
      nome: "Roadmap do portal dentro do app (fases, andamento e progresso)",
      fase: "fase0",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Esta própria tela: um mapa do que já está pronto e do que ainda vem, organizado por fases, com barra de progresso de cada fase e do total. Cada item mostra o nome, uma descrição, o objetivo e a situação, e dá para tocar para ver os detalhes. O visual é um trilho vertical, no estilo de linha de metrô, com uma estação por fase.",
      objetivo: "Deixar claro, para todo mundo, o que o portal já faz e para onde ele está indo.",
      dependencias: ["Estrutura e menu do portal do colaborador"],
      criteriosAceite: [
        "A tela aparece no menu do portal e abre sem precisar de login (Fase 0).",
        "Os itens vêm agrupados por fase, na ordem certa, com a fase atual em destaque.",
        "Cada fase mostra barra de progresso, e existe uma barra do total.",
        "Cada item mostra nome, situação e selos de prioridade e complexidade.",
        "Tocar num item abre os detalhes só para leitura.",
        "Visual aprovado antes de entrar no ar."
      ]
    },
    {
      id: "papel-colaborador-self",
      numero: 1,
      nome: "Cada pessoa vê só o que é dela",
      fase: "fase1",
      prioridade: "critica",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "A base que faz o portal reconhecer você como colaborador e mostrar apenas os seus dados, nunca os de outra pessoa. É a fundação sobre a qual todas as suas consultas se apoiam.",
      objetivo: "A base de tudo: liberar o portal mostrando só o que é seu.",
      dependencias: [],
      criteriosAceite: [
        "O colaborador entra no portal dele, sem telas de gestor.",
        "Você enxerga apenas o seu próprio cadastro.",
        "O portal do gestor continua igual."
      ]
    },
    {
      id: "vinculo-uid-funcionarioid",
      numero: 11,
      nome: "Ligar o seu login ao seu cadastro de funcionário",
      fase: "fase1",
      prioridade: "critica",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Quando a conta é criada, o seu login já fica amarrado ao seu cadastro de funcionário. É esse vínculo que permite mostrar as suas informações com segurança, sem misturar com as de ninguém.",
      objetivo: "Ter um ponto único e confiável que liga você ao seu cadastro.",
      dependencias: ["Cada pessoa vê só o que é dela"],
      criteriosAceite: [
        "Depois de entrar, o portal já sabe qual é o seu cadastro.",
        "Você não consegue alterar sozinho esses dados de vínculo.",
        "Sem esse vínculo, por segurança, nenhum cadastro é exibido."
      ]
    },
    {
      id: "endurecer-rules-funcionarios-users",
      numero: 2,
      nome: "Proteção e privacidade dos dados de cadastro",
      fase: "fase1",
      prioridade: "critica",
      complexidade: "dificil",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Reforço na segurança para garantir que cada pessoa acesse apenas o próprio cadastro. Dados sensíveis, como a data de nascimento, ficam protegidos e não ficam acessíveis a outras pessoas.",
      objetivo: "Proteger os dados de todos antes de liberar o acesso dos colaboradores.",
      dependencias: ["Ligar o seu login ao seu cadastro de funcionário"],
      criteriosAceite: [
        "O colaborador acessa só o próprio cadastro.",
        "As ferramentas dos gestores continuam funcionando.",
        "Testes de segurança confirmam: o próprio libera, o de terceiro é negado."
      ]
    },
    {
      id: "login-cpf-email-sintetico",
      numero: 4,
      nome: "Entrar com o CPF",
      fase: "fase1",
      prioridade: "critica",
      complexidade: "muito_facil",
      status: "concluido",
      concluidoEm: "2026-06-25",
      classificacao: "reaproveita",
      descricao: "O colaborador entra no portal usando o próprio CPF, do jeito mais simples, com ou sem pontos e traços.",
      objetivo: "Um jeito fácil e conhecido de entrar, usando o CPF.",
      dependencias: ["Criação automática de contas"],
      criteriosAceite: [
        "CPF com ou sem pontuação funciona igual.",
        "CPF inválido avisa antes de tentar entrar.",
        "A conta entra como colaborador."
      ]
    },
    {
      id: "toggle-colaborador-gestor-login",
      numero: 3,
      nome: "Escolher entre entrar por CPF ou por e-mail na tela de login",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "facil",
      status: "concluido",
      concluidoEm: "2026-06-25",
      classificacao: "adapta",
      descricao: "Na tela de login, uma chave alterna entre o modo colaborador (entra com CPF) e o modo gestor (entra com e-mail). O portal lembra a última escolha para facilitar.",
      objetivo: "Uma entrada clara para as duas pessoas na mesma tela.",
      dependencias: ["Entrar com o CPF"],
      criteriosAceite: [
        "Alternar troca o campo entre CPF e e-mail.",
        "O colaborador cai no portal dele; o gestor no dele.",
        "Aprovado antes."
      ]
    },
    {
      id: "criacao-automatica-usuarios",
      numero: 5,
      nome: "Criação automática de contas",
      fase: "fase1",
      prioridade: "critica",
      complexidade: "dificil",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "As contas dos colaboradores são criadas em lote a partir dos dados que a empresa já tem, sem cadastro manual um por um. A senha inicial é a data de nascimento, e no primeiro acesso o portal pede para você criar uma senha nova só sua.",
      objetivo: "Criar as contas de todos de uma vez, usando dados que já existem, sem digitação manual.",
      dependencias: ["Cada pessoa vê só o que é dela"],
      criteriosAceite: [
        "O lote cria as contas sem tirar o administrador do sistema.",
        "Rodar de novo não cria conta duplicada.",
        "Pendências (sem CPF ou sem nascimento) saem em relatório.",
        "A conta entra e cai na troca de senha obrigatória."
      ]
    },
    {
      id: "atualizacao-diaria-usuarios-wkradar",
      numero: null,
      nome: "Contas atualizadas automaticamente todos os dias",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Todo dia, quem é admitido ganha a conta automaticamente e os dados de cadastro são conferidos e mantidos em dia, sem ninguém precisar lembrar de fazer isso a cada admissão.",
      objetivo: "Manter as contas sempre em dia sem trabalho manual.",
      dependencias: ["Criação automática de contas"],
      criteriosAceite: [
        "Quem é admitido aparece com conta no dia seguinte, sem ação manual.",
        "Não cria conta duplicada.",
        "Pendências (sem CPF ou nascimento) ficam listadas."
      ]
    },
    {
      id: "inativacao-automatica-saida-quadro",
      numero: null,
      nome: "Acesso encerrado automaticamente ao sair da empresa",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Quando alguém deixa a empresa, o acesso ao portal é encerrado automaticamente e a pessoa deixa de conseguir entrar.",
      objetivo: "Encerrar o acesso de quem saiu, de forma automática.",
      dependencias: ["Contas atualizadas automaticamente todos os dias"],
      criteriosAceite: [
        "Ex-funcionário não consegue mais entrar.",
        "Quem está ativo continua entrando normalmente.",
        "O encerramento fica registrado."
      ]
    },
    {
      id: "manter-historico-auditoria-apos-inativacao",
      numero: null,
      nome: "Histórico preservado depois que a pessoa sai",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "facil",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "reaproveita",
      descricao: "Encerrar o acesso não apaga nada: o histórico e os registros da pessoa continuam guardados, do jeito que estavam.",
      objetivo: "Guardar o histórico com segurança, seguindo a lei e a política de privacidade.",
      dependencias: ["Acesso encerrado automaticamente ao sair da empresa"],
      criteriosAceite: [
        "Depois da saída, o histórico continua disponível para o RH.",
        "Nada é apagado.",
        "A política de guarda dos dados fica documentada."
      ]
    },
    {
      id: "troca-obrigatoria-senha-primeiro-acesso",
      numero: 6,
      nome: "Criar uma senha nova no primeiro acesso",
      fase: "fase1",
      prioridade: "critica",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-25",
      classificacao: "adapta",
      descricao: "No primeiro acesso, o portal pede para você trocar a senha inicial (a data de nascimento) por uma senha nova, só sua, com pelo menos 6 caracteres e diferente do nascimento.",
      objetivo: "Deixar a sua conta mais segura logo na primeira vez.",
      dependencias: ["Criação automática de contas"],
      criteriosAceite: [
        "Quem entra pela primeira vez precisa criar a senha antes de seguir.",
        "Depois de trocar, o próximo acesso já não pede de novo.",
        "Repetir o nascimento como senha nova não é aceito.",
        "Gestores não passam por essa tela."
      ]
    },
    {
      id: "rule-self-update-precisa-trocar-senha",
      numero: 7,
      nome: "Guardar com segurança que a senha já foi trocada",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "muito_facil",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Ajuste de segurança para o portal registrar que você já criou sua senha nova, sem abrir nenhuma outra brecha de edição no seu cadastro.",
      objetivo: "Completar a troca de senha com segurança.",
      dependencias: [],
      criteriosAceite: [
        "O portal registra que a sua senha já foi trocada.",
        "Você continua sem conseguir alterar dados que não são seus para mexer.",
        "A troca da sua foto de perfil continua funcionando."
      ]
    },
    {
      id: "recuperacao-senha-reset-administrativo",
      numero: null,
      nome: "Esqueci a senha: o RH reinicia para você",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Se você esquecer a senha, o RH reinicia ela de volta para a sua data de nascimento, e no próximo acesso o portal pede para você criar uma senha nova de novo.",
      objetivo: "Resolver o 'esqueci a senha' com o apoio do RH.",
      dependencias: ["Criar uma senha nova no primeiro acesso"],
      criteriosAceite: [
        "O RH reinicia a conta e o colaborador cria a senha nova no próximo acesso.",
        "A ação fica registrada.",
        "A opção automática de recuperar senha não aparece no modo colaborador."
      ]
    },
    {
      id: "shell-navegacao-definitivos-dados-reais",
      numero: 8,
      nome: "Portal do colaborador definitivo, com dados reais",
      fase: "fase1",
      prioridade: "critica",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "A estrutura de demonstração da Fase 0 passa a valer para valer, agora mostrando os seus dados reais com segurança.",
      objetivo: "A sua casa de verdade no portal, com dados reais.",
      dependencias: ["Estrutura e menu do portal do colaborador", "Cada pessoa vê só o que é dela", "Proteção e privacidade dos dados de cadastro"],
      criteriosAceite: [
        "O colaborador vê só o menu dele.",
        "Suas consultas carregam sem erro de acesso.",
        "O portal do gestor continua igual.",
        "Aprovado antes."
      ]
    },
    {
      id: "inicio-colaborador-dados-reais",
      numero: 20,
      nome: "Sua tela de Início com dados reais (cartão e atalhos)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "A tela de Início com o seu cartão real (nome, cargo, setor, turno, admissão, tempo de casa, aniversário) e atalhos para as suas consultas. Dados sensíveis, que só o RH precisa ver, não aparecem para você.",
      objetivo: "Uma entrada organizada, com o seu dado real, que leva às suas consultas.",
      dependencias: ["Tela de Início do colaborador", "Ligar o seu login ao seu cadastro de funcionário", "Proteção e privacidade dos dados de cadastro"],
      criteriosAceite: [
        "Só o seu próprio cartão aparece.",
        "Dados sensíveis (como CPF e PIS) não são exibidos.",
        "Os atalhos navegam.",
        "O menu não traz itens de gestor."
      ]
    },
    {
      id: "minhas-ocorrencias",
      numero: 13,
      nome: "Minhas ocorrências (consulta)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "facil",
      status: "planejado",
      classificacao: "reaproveita",
      descricao: "Uma tela onde você vê as suas ocorrências (atrasos, faltas, abonos), só para consulta.",
      objetivo: "Ver os seus atrasos, faltas e abonos sem precisar perguntar ao líder.",
      dependencias: ["Ligar o seu login ao seu cadastro de funcionário"],
      criteriosAceite: [
        "Você vê só as suas.",
        "Não há botões de editar ou lançar; é só leitura.",
        "O histórico fica disponível para consulta."
      ]
    },
    {
      id: "meu-banco-de-horas",
      numero: 14,
      nome: "Meu banco de horas (saldo e gráfico do mês)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Uma tela com o seu saldo de banco de horas e um gráfico do mês, para você acompanhar sozinho.",
      objetivo: "Acompanhar o seu saldo de horas sem depender do RH.",
      dependencias: ["Ligar o seu login ao seu cadastro de funcionário"],
      criteriosAceite: [
        "Você vê o seu próprio saldo e gráfico.",
        "Você não acessa o saldo de outra pessoa.",
        "Sem dados ainda, aparece 'sem dados' em vez de erro."
      ]
    },
    {
      id: "comunicados-colecao-dados",
      numero: 21,
      nome: "Comunicados: a base do canal de avisos",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-26",
      classificacao: "cria",
      descricao: "Já no ar. A base que permite ao RH publicar comunicados para todos ou só para um turno ou setor específico. É o alicerce dos avisos e notificações do portal.",
      objetivo: "Criar o canal oficial de avisos da empresa para os colaboradores.",
      dependencias: [],
      criteriosAceite: [
        "O RH publica e o comunicado aparece na hora para o público certo.",
        "Só quem tem permissão publica.",
        "Aviso de um turno não chega ao outro.",
        "Publicações ficam registradas."
      ]
    },
    {
      id: "comunicados-tela-composicao",
      numero: 22,
      nome: "Comunicados: tela para o RH publicar",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-26",
      classificacao: "adapta",
      descricao: "Já no ar. A tela onde o RH escreve e publica os comunicados, com prévia ao vivo e possibilidade de anexar imagem. Dá para escolher o público (todos, um turno ou um setor), fixar no topo e pedir confirmação de leitura. Também mostra quem já leu.",
      objetivo: "Um canal oficial de avisos com escolha de público, no lugar do WhatsApp e do mural.",
      dependencias: ["Comunicados: a base do canal de avisos"],
      criteriosAceite: [
        "Publica em poucos toques e o comunicado aparece na lista.",
        "O fixado fica destacado e no topo.",
        "Editar atualiza na hora."
      ]
    },
    {
      id: "comunicados-leitura-recibo",
      numero: 23,
      nome: "Comunicados: leitura e confirmação pelo colaborador",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-26",
      classificacao: "adapta",
      descricao: "Já no ar. A tela de Avisos do colaborador, que mostra os comunicados do seu público. Ao abrir, fica registrado que você leu, e quando o comunicado pede, há o botão 'Confirmo que li'. Um selo mostra o que ainda não foi lido, e o autor consegue ver quantas pessoas já leram.",
      objetivo: "Um lugar confiável para você receber os avisos, com registro de leitura que ajuda o RH.",
      dependencias: ["Comunicados: a base do canal de avisos", "Comunicados: tela para o RH publicar"],
      criteriosAceite: [
        "Abrir o comunicado registra a leitura com data e hora.",
        "O selo de não lido some e continua zerado.",
        "Comunicado com confirmação só sai de 'pendente' quando você confirma.",
        "O autor vê quantos já leram."
      ]
    },
    {
      id: "avisos-internos",
      numero: null,
      nome: "Avisos rápidos (recado geral)",
      fase: "fase1",
      prioridade: "media",
      complexidade: "facil",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Um tipo mais leve de comunicado, para recados rápidos que vão para todo mundo, sem precisar escolher público.",
      objetivo: "Dar conta do 'recado geral' de um jeito simples.",
      dependencias: ["Comunicados: a base do canal de avisos"],
      criteriosAceite: [
        "O aviso publicado aparece para todos.",
        "Fica visualmente diferente do comunicado por público."
      ]
    },
    {
      id: "widget-aniversariantes-inicio",
      numero: 24,
      nome: "Aniversariantes na tela de Início",
      fase: "fase1",
      prioridade: "media",
      complexidade: "facil",
      status: "planejado",
      classificacao: "reaproveita",
      descricao: "Um bloco na tela de Início mostrando os aniversariantes do mês (só nome e dia, sem outros dados).",
      objetivo: "Um toque de proximidade entre os colegas, com custo quase zero.",
      dependencias: ["Sua tela de Início com dados reais"],
      criteriosAceite: [
        "Você vê os aniversariantes do mês, com o do dia em destaque.",
        "Nada sensível é exposto."
      ]
    },
    {
      id: "colecao-documentos-repositorio",
      numero: 29,
      nome: "Documentos: a base para receber e assinar",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-26",
      classificacao: "adapta",
      descricao: "Já no ar. A base que guarda os documentos da empresa com título, descrição, situação e o registro de quem deve assinar. Cada documento fica ligado com segurança à pessoa certa.",
      objetivo: "Centralizar num só lugar todo documento a entregar ou assinar, com rastreabilidade.",
      dependencias: ["Ligar o seu login ao seu cadastro de funcionário"],
      criteriosAceite: [
        "O RH cria o documento e ele aparece como 'pendente'.",
        "Cada colaborador lê só os próprios.",
        "Depois de assinado, o documento não pode mais ser alterado."
      ]
    },
    {
      id: "assinatura-n1-aceite-com-trilha",
      numero: 30,
      nome: "Assinar documentos com um clique e registro",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-26",
      classificacao: "reaproveita",
      descricao: "Já no ar. Você lê o documento, marca 'Li e estou de acordo' e assina digitando a sua senha para confirmar que é você. Fica um registro seguro e que não pode ser alterado (quem, dia e hora). É um aceite com registro confiável, não uma assinatura com validade jurídica plena.",
      objetivo: "Trocar o papel por um aceite digital com registro seguro, sem custo extra.",
      dependencias: ["Documentos: a base para receber e assinar"],
      criteriosAceite: [
        "Assinar cria um registro com data e hora do servidor.",
        "A situação do documento passa a 'assinado'.",
        "Sem marcar 'Li e estou de acordo', o botão de assinar fica desabilitado.",
        "O registro não pode ser editado."
      ]
    },
    {
      id: "meus-holerites-repositorio-pdf",
      numero: 18,
      nome: "Folha de pagamento: seus recibos por funcionário",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-07-02",
      classificacao: "adapta",
      descricao: "Já no ar (melhor que o previsto). Em vez de subir um arquivo por pessoa, o RH importa um único PDF com a folha inteira, e o portal separa automaticamente por funcionário, conferindo página a página antes de gerar. Você vê os seus recibos no menu 'Folha de pagamento' e abre direto no app.",
      objetivo: "Acesso ao seu contracheque no portal, um dos itens mais úteis, sem esperar o sistema da folha.",
      dependencias: ["Ligar o seu login ao seu cadastro de funcionário"],
      criteriosAceite: [
        "O RH importa um PDF e você vê só os seus recibos, abrindo no app.",
        "Ninguém acessa o recibo de outra pessoa.",
        "Sem recibos ainda, a tela mostra um aviso honesto de vazio."
      ]
    },
    {
      id: "recibos-assinatura-carimbada",
      numero: null,
      nome: "Assinar o recibo com o carimbo dentro do próprio arquivo",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      classificacao: "cria",
      descricao: "Você assina o recibo confirmando a senha e permitindo a localização, e a assinatura, com o seu nome, os termos e a data, fica carimbada dentro do próprio PDF. Fica um registro seguro de quem assinou, quando e onde.",
      objetivo: "Substituir a assinatura em papel do recibo por uma assinatura com registro completo, visível no arquivo.",
      dependencias: ["Folha de pagamento: seus recibos por funcionário"],
      criteriosAceite: [
        "Sem permitir a localização, não dá para assinar.",
        "O PDF assinado mostra os termos e o seu nome.",
        "Fica um registro seguro (quem, quando, onde).",
        "O RH vê quem já assinou e quem falta."
      ]
    },
    {
      id: "espelho-ponto-repositorio-pdf",
      numero: 15,
      nome: "Cartão ponto oficial em arquivo",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-07-02",
      classificacao: "adapta",
      descricao: "Já no ar, junto com os recibos: o RH importa o cartão ponto da mesma forma, um PDF por mês separado por funcionário. Você vê o seu em 'Meu ponto', na seção 'Cartão ponto (arquivo)', ao lado do acompanhamento do seu banco de horas.",
      objetivo: "Ter o cartão ponto oficial em arquivo, do jeito que a folha já gera.",
      dependencias: ["Folha de pagamento: seus recibos por funcionário"],
      criteriosAceite: [
        "O RH importa por mês, do mesmo jeito dos recibos.",
        "Você abre só os seus PDFs; ninguém acessa os de outra pessoa.",
        "Sem PDFs, a seção não aparece."
      ]
    },
    {
      id: "meus-recibos-repositorio-pdf",
      numero: 19,
      nome: "Meus recibos (férias, 13º, adiantamento, rescisão)",
      fase: "fase1",
      prioridade: "media",
      complexidade: "facil",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Ver e abrir os seus recibos por tipo: férias, 13º salário, adiantamento e rescisão.",
      objetivo: "Completar o acesso aos seus documentos financeiros.",
      dependencias: ["Folha de pagamento: seus recibos por funcionário"],
      criteriosAceite: [
        "Você vê só os seus, organizados por tipo.",
        "Sem recibos, a tela mostra um aviso honesto de vazio."
      ]
    },
    {
      id: "gestao-admin-contas-colaborador",
      numero: 9,
      nome: "RH cuida das contas dos colaboradores",
      fase: "fase2",
      prioridade: "media",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Uma tela onde o RH resolve o dia a dia das contas: desativar, pedir troca de senha, reiniciar senha e criar conta avulsa. Tudo fica registrado.",
      objetivo: "Resolver o dia a dia das contas (admissão, esqueci a senha, desligamento) de forma simples.",
      dependencias: ["Criação automática de contas", "Criar uma senha nova no primeiro acesso"],
      criteriosAceite: [
        "Desativar bloqueia a entrada.",
        "Pedir troca de senha leva o colaborador à tela de trocar.",
        "As ações ficam registradas."
      ]
    },
    {
      id: "espelho-ponto-versao-saldo",
      numero: 15,
      nome: "Ponto do dia a dia pelo banco de horas",
      fase: "fase2",
      prioridade: "media",
      complexidade: "facil",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Uma visão dia a dia do seu banco de horas (data e saldo do dia), deixando claro que são os saldos, e não os horários de entrada e saída.",
      objetivo: "Ver o seu banco de horas dia a dia, sem prometer os horários batidos.",
      dependencias: ["Meu banco de horas"],
      criteriosAceite: [
        "Mostra a lista diária do mês.",
        "Deixa claro que não são os horários batidos.",
        "Sem dados, a tela fica vazia."
      ]
    },
    {
      id: "notificacoes-corporativas-in-app",
      numero: 25,
      nome: "Central de notificações no app",
      fase: "fase2",
      prioridade: "media",
      complexidade: "dificil",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Uma central dentro do app que junta o que é novo para você (novo comunicado, uma ocorrência sua, um documento para assinar, um reconhecimento), com um selo de novidades.",
      objetivo: "Um lugar único para ver 'o que é novo para mim'.",
      dependencias: ["Comunicados: leitura e confirmação pelo colaborador"],
      criteriosAceite: [
        "Um comunicado novo para o seu público acende o selo.",
        "Tocar leva até o item e zera o selo.",
        "O que não foi lido continua marcado entre um acesso e outro."
      ]
    },
    {
      id: "reconhecimentos-internos",
      numero: 26,
      nome: "Reconhecimentos entre colegas",
      fase: "fase2",
      prioridade: "media",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Um mural onde os colegas registram reconhecimentos e elogios uns aos outros, com categorias curtas.",
      objetivo: "Estimular uma cultura de reconhecimento no dia a dia.",
      dependencias: ["Ligar o seu login ao seu cadastro de funcionário"],
      criteriosAceite: [
        "O reconhecimento aparece na hora.",
        "Não dá para reconhecer a si mesmo.",
        "O RH pode arquivar algo inadequado."
      ]
    },
    {
      id: "assinatura-n2-codigo-email-sms",
      numero: 33,
      nome: "Assinatura mais forte com código por e-mail ou SMS",
      fase: "fase2",
      prioridade: "media",
      complexidade: "dificil",
      status: "planejado",
      classificacao: "cria",
      descricao: "Uma camada extra de segurança ao assinar: além da senha, você recebe um código por e-mail ou SMS e confirma. Isso reforça a assinatura para documentos mais sensíveis.",
      objetivo: "Deixar a assinatura mais robusta para documentos importantes.",
      dependencias: ["Assinar documentos com um clique e registro"],
      criteriosAceite: [
        "Ao assinar, você recebe um código e confirma.",
        "O registro guarda por onde veio o código e a confirmação.",
        "Sem o serviço configurado, volta à assinatura simples com aviso."
      ]
    },
    {
      id: "assinatura-advertencias",
      numero: 31,
      nome: "Ciência de advertências pelo colaborador",
      fase: "fase2",
      prioridade: "media",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "O gestor registra uma advertência, o colaborador lê e dá ciência (assina), ou registra que discorda, com um texto livre. O gestor acompanha a situação (pendente, com ciência, com ressalvas ou recusada). Dar ciência não é concordar; é apenas confirmar que tomou conhecimento.",
      objetivo: "Formalizar a ciência de medidas disciplinares com data registrada, no lugar do 'recusou a assinar' sem prova.",
      dependencias: ["Assinar documentos com um clique e registro", "Documentos: a base para receber e assinar"],
      criteriosAceite: [
        "A advertência aparece como 'pendente de ciência'.",
        "Dar ciência muda a situação, com data registrada.",
        "A ressalva guarda o texto do colaborador.",
        "O registro diferencia a emissão da ciência."
      ]
    },
    {
      id: "assinatura-contratos-aditivos",
      numero: 32,
      nome: "Assinatura de contratos e aditivos por grupo",
      fase: "fase2",
      prioridade: "media",
      complexidade: "dificil",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Contratos, aditivos e termos (como o de privacidade e o de conduta) para assinatura, enviados para um grupo de pessoas de uma vez, com painel de quanto já foi assinado e quem ainda falta. Cada versão fica guardada.",
      objetivo: "Distribuir e coletar assinaturas em massa, de forma organizada e versionada.",
      dependencias: ["Assinar documentos com um clique e registro", "Documentos: a base para receber e assinar"],
      criteriosAceite: [
        "A campanha para 'todos' começa em 0%.",
        "Cada pessoa vê o pendente e assina.",
        "O painel mostra o percentual assinado.",
        "Uma versão nova reabre o pendente para todos.",
        "O histórico fica guardado."
      ]
    },
    {
      id: "revisar-assinatura-documentos-institucionais",
      numero: null,
      nome: "Rever a assinatura dos documentos da empresa (carimbo no arquivo)",
      fase: "fase2",
      prioridade: "media",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Hoje a assinatura de documentos da empresa (como o Manual da Cultura) fica registrada no sistema, mas sem o carimbo dentro do arquivo. Quando o carimbo dos recibos estiver pronto, avaliar trazer a mesma experiência para os documentos da empresa e rever o painel de quem assinou.",
      objetivo: "Uma experiência de assinatura só, igual entre recibo, cartão ponto e documento da empresa.",
      dependencias: ["Assinar o recibo com o carimbo dentro do próprio arquivo", "Assinar documentos com um clique e registro"],
      criteriosAceite: [
        "Fica decidido se o documento da empresa também ganha carimbo no arquivo.",
        "Se ganhar, reusa o mesmo mecanismo dos recibos.",
        "O painel de quem assinou é revisado."
      ]
    },
    {
      id: "avaliacao-desempenho-ciclos",
      numero: 34,
      nome: "Avaliação de desempenho (ciclos e questionários)",
      fase: "fase2",
      prioridade: "media",
      complexidade: "dificil",
      status: "planejado",
      classificacao: "cria",
      descricao: "Um fluxo estruturado de avaliação, por ciclo, com questionários montados pelo RH (nota de 1 a 5, texto, sim ou não). O gestor avalia a sua equipe, e o histórico fica guardado por ciclo.",
      objetivo: "Trocar planilhas por um fluxo organizado, com histórico por ciclo.",
      dependencias: [],
      criteriosAceite: [
        "O RH cria o ciclo com o questionário.",
        "O gestor preenche, salva rascunho e envia.",
        "A situação mostra quantas avaliações faltam.",
        "O colaborador só vê depois de liberado."
      ]
    },
    {
      id: "canal-etica-confidencial",
      numero: 36,
      nome: "Canal de ética e denúncia (confidencial)",
      fase: "fase2",
      prioridade: "media",
      complexidade: "medio",
      status: "planejado",
      classificacao: "cria",
      descricao: "Um canal onde o colaborador envia uma denúncia ou relato para um comitê de forma confidencial: quem enviou é conhecido apenas pelo comitê, não pelo gestor. Cada relato recebe um número de protocolo.",
      objetivo: "Um canal de ouvidoria seguro, sem expor quem faz o relato ao gestor.",
      dependencias: ["Cada pessoa vê só o que é dela"],
      criteriosAceite: [
        "Enviar gera um número de protocolo.",
        "O colaborador não consegue ver a lista de relatos.",
        "O comitê vê a fila e acompanha a situação.",
        "O gestor comum não tem acesso.",
        "Fica claro que é confidencial, não anônimo por completo."
      ]
    },
    {
      id: "onboarding-cloud-function",
      numero: 10,
      nome: "Criação de contas mais robusta, no servidor",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "Levar a criação das contas para o servidor, deixando o processo mais confiável e independente do navegador, inclusive criando a conta automaticamente quando alguém é admitido.",
      objetivo: "Criar as contas de toda a base com mais confiabilidade.",
      dependencias: ["Criação automática de contas"],
      criteriosAceite: [
        "Cria as contas de toda a base sem depender do navegador.",
        "Rodar de novo não duplica.",
        "Novos admitidos ganham conta sem ação manual."
      ]
    },
    {
      id: "integracao-erp-holerites",
      numero: "16a",
      nome: "Recibos entregues automaticamente pelo sistema da folha",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "muito_dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "No lugar do RH importar os recibos, o próprio sistema da folha disponibiliza os arquivos, que chegam ao portal automaticamente.",
      objetivo: "A evolução natural dos recibos: entrega automática, quando fizer sentido.",
      dependencias: ["Folha de pagamento: seus recibos por funcionário"],
      criteriosAceite: [
        "Recibos novos aparecem sem importação manual.",
        "Cada um continua vendo só os seus.",
        "Fica consistente com os recibos já importados."
      ]
    },
    {
      id: "espelho-ponto-real-batidas",
      numero: "16b",
      nome: "Ponto com os horários batidos de verdade",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "muito_dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "Mostrar os horários de entrada e saída batidos de verdade. Hoje o portal tem só o saldo de horas, não os horários; para isso, o sistema da folha ou do relógio precisa disponibilizar essas marcações.",
      objetivo: "O cartão ponto de verdade, com os horários batidos, um dos itens mais pedidos.",
      dependencias: ["Ligar o seu login ao seu cadastro de funcionário"],
      criteriosAceite: [
        "Quando os dados chegarem, você vê os horários por dia.",
        "Sem esses dados, a tela fica oculta ou vazia.",
        "Ninguém acessa os horários de outra pessoa."
      ]
    },
    {
      id: "apuracao-ponto-fechamento-mensal",
      numero: 17,
      nome: "Fechamento do ponto no fim do mês",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "muito_dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "O fechamento do mês fechado (horas, extras, faltas, descanso e saldo). Esse cálculo é feito na folha e no relógio de ponto; o portal só mostraria o resultado.",
      objetivo: "A conta final do mês, para você conferir.",
      dependencias: ["Ponto com os horários batidos de verdade"],
      criteriosAceite: [
        "Quando o fechamento chegar, você vê o consolidado.",
        "O portal não tenta calcular por conta própria.",
        "Você acessa só o seu."
      ]
    },
    {
      id: "notificacoes-push-fcm",
      numero: 28,
      nome: "Notificações no celular mesmo com o app fechado",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "muito_dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "Entregar avisos importantes como notificação no celular, mesmo com o app fechado, para quem optar por receber. Quem não quiser, continua vendo os avisos dentro do app.",
      objetivo: "Garantir que avisos importantes cheguem mesmo com o app fechado.",
      dependencias: ["Central de notificações no app"],
      criteriosAceite: [
        "Um aviso importante gera notificação com o app fechado.",
        "Quem preferiu não receber continua vendo dentro do app, sem erro."
      ]
    },
    {
      id: "assinatura-n3-validade-juridica",
      numero: 33,
      nome: "Assinatura com validade jurídica plena",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "muito_dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "Elevar a assinatura para uma com validade jurídica completa, usando um serviço especializado, para os documentos mais importantes (como rescisões e acordos).",
      objetivo: "Assinatura com força jurídica plena para os documentos mais importantes.",
      dependencias: ["Assinar documentos com um clique e registro"],
      criteriosAceite: [
        "O documento importante segue por um fluxo com validade plena.",
        "A situação mostra 'assinado juridicamente', com o comprovante."
      ]
    },
    {
      id: "recuperacao-senha-self-email-sms",
      numero: null,
      nome: "Recuperar a senha sozinho, por e-mail ou SMS",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "Poder recuperar a senha sozinho, por e-mail ou SMS, além do reinício feito pelo RH.",
      objetivo: "Reduzir a dependência do RH para recuperar a senha.",
      dependencias: ["Esqueci a senha: o RH reinicia para você"],
      criteriosAceite: [
        "O colaborador recupera a senha sem precisar do RH.",
        "O canal de envio é configurável.",
        "O processo fica registrado."
      ]
    },
    {
      id: "avaliacao-autoavaliacao-feedback",
      numero: 35,
      nome: "Autoavaliação e feedback do colaborador",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "medio",
      status: "planejado",
      classificacao: "adapta",
      descricao: "Você faz a sua própria autoavaliação no ciclo e, depois de liberado, vê e comenta o feedback do gestor.",
      objetivo: "Dar voz ao colaborador e reduzir a sensação de avaliação só de cima para baixo.",
      dependencias: ["Avaliação de desempenho (ciclos e questionários)"],
      criteriosAceite: [
        "Você preenche e envia a sua autoavaliação.",
        "Depois de liberado, compara a sua com a do gestor.",
        "Você não vê a de outras pessoas."
      ]
    },
    {
      id: "canal-etica-anonimato-tecnico",
      numero: 37,
      nome: "Canal de ética com anonimato completo",
      fase: "futuro",
      prioridade: "baixa",
      complexidade: "muito_dificil",
      status: "pendente",
      classificacao: "cria",
      descricao: "Evoluir o canal de ética para anonimato completo, sem deixar rastro de quem enviou, mantendo a conversa com o comitê por meio do número de protocolo.",
      objetivo: "Atender aos padrões mais exigentes de ética e integridade.",
      dependencias: ["Canal de ética e denúncia (confidencial)"],
      criteriosAceite: [
        "O relato não guarda dado que identifique a pessoa.",
        "Quem denunciou acompanha pelo protocolo.",
        "O comitê responde sem ver a identidade."
      ]
    },
    {
      id: "rede-social-corporativa-feed",
      numero: 27,
      nome: "Rede social da empresa (mural com posts, comentários e curtidas)",
      fase: "futuro",
      prioridade: "muito_baixa",
      complexidade: "dificil",
      status: "planejado",
      classificacao: "cria",
      descricao: "Um mural onde a empresa publica e as pessoas interagem, com posts, comentários e curtidas. Só faz sentido depois que o portal já resolve bem o ponto, os documentos, o contracheque e as dúvidas.",
      objetivo: "Um espaço de cultura e pertencimento, depois que o essencial já estiver resolvido.",
      dependencias: ["Comunicados, avisos, aniversariantes e reconhecimentos antes"],
      criteriosAceite: [
        "O post aparece na hora.",
        "Curtir e comentar atualizam os contadores.",
        "Um moderador remove conteúdo impróprio."
      ]
    },
    {
      id: "onboarding-1o-acesso",
      numero: null,
      nome: "Boas-vindas no primeiro acesso (apresentação e checklist)",
      fase: "fase1",
      prioridade: "media",
      complexidade: "facil",
      status: "planejado",
      classificacao: "cria",
      descricao: "No primeiro acesso, depois de trocar a senha, uma apresentação curta de 5 telas mostra o que o portal faz (ponto, comunicados, documentos), seguida de um checklist de primeiros passos (conferir seus dados, assinar o Código de Ética, conhecer o app), que fica salvo na Ajuda.",
      objetivo: "Receber bem quem está entrando e ajudar a dar os primeiros passos, sem complicar.",
      dependencias: ["Entrar com o CPF", "Criar uma senha nova no primeiro acesso"],
      criteriosAceite: [
        "A apresentação só aparece na primeira vez e não se repete depois.",
        "Dá para pular e ir direto ao checklist.",
        "O checklist fica na Ajuda até você concluir e não bloqueia o uso do portal."
      ]
    },
    {
      id: "ocultar-chat-portal-colaborador",
      numero: null,
      nome: "Deixar o portal do colaborador limpo, sem as ferramentas de gestor",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "muito_facil",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Já no ar. O portal do colaborador não mostra o chat interno, que é uma ferramenta dos gestores, nem o botão de nova ocorrência. A tela fica limpa, só com o que é seu.",
      objetivo: "Um portal limpo para o colaborador, só com o que é dele.",
      dependencias: ["Estrutura e menu do portal do colaborador"],
      criteriosAceite: [
        "No login do colaborador, o chat e o botão de nova ocorrência não aparecem.",
        "Os gestores continuam com o chat normal.",
        "Ao sair, tudo volta ao estado certo."
      ]
    },
    {
      id: "alfa-grupo-selecao",
      numero: null,
      nome: "Escolher o grupo de teste (5 pessoas) e um ponto de contato no RH",
      fase: "alfa",
      prioridade: "alta",
      complexidade: "muito_facil",
      status: "planejado",
      descricao: "Escolher 5 colaboradores para o primeiro teste do portal, com perfis variados (alguém com facilidade no celular, alguém com menos familiaridade, e líderes de turno), evitando quem não terá acesso (diretoria, afastados por invalidez e aprendizes). Combinar com cada um, pessoalmente, que é uma versão de teste e que dúvidas e problemas são esperados. Definir uma pessoa do RH como ponto de contato e um jeito simples de receber os retornos, que viram uma lista de melhorias antes do próximo grupo.",
      objetivo: "Começar pequeno e controlado, com gente que representa o dia a dia da fábrica, e transformar cada retorno em melhoria antes de abrir para mais pessoas.",
      dependencias: ["Entrar com o CPF", "Criar uma senha nova no primeiro acesso"],
      criteriosAceite: [
        "Lista dos 5 participantes definida.",
        "Ninguém do grupo que não deve ter acesso entra na lista.",
        "Cada participante avisado, pessoalmente, de que é uma versão de teste.",
        "Uma pessoa do RH nomeada como ponto de contato, com um canal de retorno.",
        "Retornos reunidos numa lista de prioridades antes do próximo grupo."
      ]
    },
    {
      id: "alfa-smoke-caminho-critico",
      numero: null,
      nome: "Teste rápido do caminho principal antes de cada liberação",
      fase: "alfa",
      prioridade: "critica",
      complexidade: "medio",
      status: "planejado",
      descricao: "A cada nova versão, um roteiro rápido percorre de ponta a ponta o caminho que todo colaborador faz: entrar com o CPF, trocar a senha, abrir a tela de Início, ver as ocorrências, o banco de horas e abrir um PDF (recibo ou cartão ponto). Cada passo tem um resultado esperado, e o teste é feito no celular e no computador compartilhado antes de liberar para o grupo.",
      objetivo: "Garantir que o caminho principal funciona antes de a primeira pessoa usar, pegando problemas cedo.",
      dependencias: ["Entrar com o CPF", "Criar uma senha nova no primeiro acesso", "Minhas ocorrências", "Meu banco de horas"],
      criteriosAceite: [
        "Roteiro escrito com os passos e o resultado esperado de cada um.",
        "Cada rodada anota a data, quem testou, o aparelho e o resultado.",
        "Nenhum passo dá erro de acesso no caminho do próprio colaborador.",
        "Nenhuma tela mostra dado de outra pessoa.",
        "Só libera o grupo com todos os passos aprovados."
      ]
    },
    {
      id: "alfa-checklist-self",
      numero: null,
      nome: "Conferir que cada pessoa vê só os próprios dados",
      fase: "alfa",
      prioridade: "critica",
      complexidade: "medio",
      status: "planejado",
      descricao: "Um roteiro feito com o grupo de teste para provar que cada colaborador acessa somente os próprios dados. Para cada área (cadastro, ocorrências, banco de horas, recibos, documentos), tenta-se acessar o dado de outra pessoa e confirma-se que é negado. Também se verifica que dados sensíveis, como CPF, PIS e nascimento de terceiros, nunca chegam à tela do colaborador. Os testes são repetidos no ambiente de teste e em produção.",
      objetivo: "Provar, antes de abrir para mais gente, que cada um vê só o que é seu, na prática e em produção.",
      dependencias: ["Proteção e privacidade dos dados de cadastro", "Ligar o seu login ao seu cadastro de funcionário", "Minhas ocorrências", "Meu banco de horas"],
      criteriosAceite: [
        "Em cada área, acessar o dado de outra pessoa é negado.",
        "Conta sem vínculo não vê nenhum cadastro.",
        "Nenhum dado sensível de terceiros aparece para o colaborador.",
        "Resultado registrado por área, com data e ambiente.",
        "Tudo aprovado antes de liberar o grupo."
      ]
    },
    {
      id: "alfa-kill-switch",
      numero: null,
      nome: "Botão para desligar o portal na hora, se precisar",
      fase: "alfa",
      prioridade: "critica",
      complexidade: "medio",
      status: "planejado",
      descricao: "Um controle que permite desligar o portal do colaborador em segundos, se surgir algum problema. Com ele desligado, o colaborador vê uma tela honesta de 'portal em manutenção', enquanto o portal do gestor continua funcionando normalmente. Tudo sem precisar de uma nova publicação do sistema.",
      objetivo: "Ter um interruptor único para conter um problema sem derrubar o app inteiro.",
      dependencias: ["Cada pessoa vê só o que é dela"],
      criteriosAceite: [
        "Com o portal desligado, o colaborador vê a tela de manutenção e não acessa nada.",
        "O portal do gestor continua igual.",
        "Ligar e desligar tem efeito no acesso seguinte, sem nova publicação.",
        "A mensagem de manutenção é configurável.",
        "A mudança fica registrada (quem ligou ou desligou e quando)."
      ]
    },
    {
      id: "alfa-plano-recuo",
      numero: null,
      nome: "Plano para voltar atrás rápido, se algo der errado",
      fase: "alfa",
      prioridade: "alta",
      complexidade: "facil",
      status: "planejado",
      descricao: "Um passo a passo escrito e testado uma vez para reverter o portal a um estado seguro se algo der errado: primeiro o botão de desligar, depois voltar à última versão que funcionava bem. Fica registrado que voltar atrás nunca apaga dado nem histórico.",
      objetivo: "Transformar 'deu problema' numa sequência conhecida e rápida, sem improviso e sem perder dados.",
      dependencias: ["Botão para desligar o portal na hora, se precisar"],
      criteriosAceite: [
        "Passo a passo escrito com a ordem das ações.",
        "Teste registrado: portal desligado e religado com sucesso no grupo.",
        "Fica claro quando desligar e quando voltar a versão.",
        "Confirmado por escrito que voltar atrás não apaga histórico.",
        "Tempo do teste anotado como referência."
      ]
    },
    {
      id: "beta-material-treinamento",
      numero: null,
      nome: "Material de primeiro acesso e treinamento curto para o piloto (20 pessoas)",
      fase: "beta",
      prioridade: "alta",
      complexidade: "facil",
      status: "planejado",
      descricao: "Escolher um grupo piloto de cerca de 20 pessoas (de preferência um turno ou setor inteiro) e criar um material curto e visual de primeiro acesso, em linguagem simples: entre com o CPF, a senha inicial é a sua data de nascimento (oito dígitos, sem barras), e na primeira vez o portal pede uma senha nova só sua. O material diz onde acessar, o que fazer se não conseguir entrar (procurar o RH) e que é um sistema da empresa. Também um treinamento curto e presencial por turma.",
      objetivo: "Tirar a dúvida número um do primeiro acesso (qual é a senha e como funciona), com uma explicação que qualquer pessoa entende sozinha.",
      dependencias: ["Entrar com o CPF", "Criar uma senha nova no primeiro acesso", "Escolher o grupo de teste (5 pessoas) e um ponto de contato no RH"],
      criteriosAceite: [
        "Grupo piloto de cerca de 20 pessoas definido.",
        "Material explica o CPF, a senha inicial e a troca obrigatória, em frases curtas, com onde acessar e o que fazer se não conseguir.",
        "Validado com alguém de menos familiaridade digital, que entendeu sem ajuda.",
        "Treinamento curto feito com cada turma.",
        "Versão para impressão e versão legível no celular."
      ]
    },
    {
      id: "beta-rollout-gradual",
      numero: null,
      nome: "Liberação aos poucos e com cuidado (5, depois 20, depois todos)",
      fase: "beta",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      descricao: "A liberação acontece por lista de pessoas: primeiro o grupo de 5, depois o piloto de 20 (um turno ou setor) e só então todos. Cada etapa só abre depois que a anterior deu certo. Diretoria, afastados por invalidez e aprendizes seguem sem acesso. Quem não tem celular tem acesso garantido por um computador compartilhado ou quiosque.",
      objetivo: "Limitar o impacto de qualquer problema a um grupo pequeno e só crescer com sinal verde, em vez de abrir para todos de uma vez.",
      dependencias: ["Teste rápido do caminho principal antes de cada liberação"],
      criteriosAceite: [
        "Lista de cada etapa definida antes de liberar.",
        "A etapa seguinte só abre depois que a anterior deu certo.",
        "Quem não deve ter acesso permanece sem acesso em todas as etapas.",
        "Quem não tem celular tem acesso por quiosque ou computador compartilhado.",
        "Fica visível qual etapa está ativa."
      ]
    },
    {
      id: "beta-monitoramento-adocao",
      numero: null,
      nome: "Acompanhar o uso e a saúde do portal (acessos, erros, senhas reiniciadas)",
      fase: "beta",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      descricao: "Um painel simples para o RH e a direção acompanharem os sinais que dizem se dá para avançar ou é melhor recuar: quantos da etapa já entraram pelo menos uma vez, quantos trocaram a senha, quantas senhas foram reiniciadas, quantos problemas estão abertos e se há algum pico de erro de acesso. Os números saem do que já existe, sem coletar dado novo sobre o comportamento das pessoas.",
      objetivo: "Ter uma visão clara da adoção e da saúde do portal, para decidir com base em números e não em impressão.",
      dependencias: ["Liberação aos poucos e com cuidado (5, depois 20, depois todos)"],
      criteriosAceite: [
        "O painel mostra, por etapa: quantos entraram, quantos trocaram a senha, quantas senhas reiniciadas e quantos problemas.",
        "Os números vêm do que já existe, sem coletar dado pessoal novo.",
        "O RH consegue ler o painel sem ajuda técnica.",
        "Um pico anormal de erro de acesso ou de senhas reiniciadas fica visível."
      ]
    },
    {
      id: "beta-criterios-saida",
      numero: null,
      nome: "Condições claras para avançar de etapa (5, 20, todos)",
      fase: "beta",
      prioridade: "alta",
      complexidade: "facil",
      status: "planejado",
      descricao: "Condições objetivas e escritas para encerrar cada etapa. Grupo de 5: teste do caminho principal aprovado, nenhum problema grave em aberto, conferência de segurança concluída. Piloto de 20: a maior parte já entrou e trocou a senha, nenhum problema grave, fila de suporte tranquila. Todos: comunicação oficial publicada, perguntas frequentes disponíveis e acompanhamento contínuo de pé.",
      objetivo: "Trocar o 'parece pronto' por condições claras de avanço, sem escalar para mais gente com problema em aberto.",
      dependencias: ["Acompanhar o uso e a saúde do portal (acessos, erros, senhas reiniciadas)"],
      criteriosAceite: [
        "Cada etapa tem condições de saída escritas, com números onde dá.",
        "Nenhuma etapa encerra com problema grave em aberto.",
        "O piloto exige um mínimo de gente que entrou e trocou a senha.",
        "A abertura para todos exige comunicação oficial, perguntas frequentes e acompanhamento.",
        "Cada avanço fica registrado com a data e a confirmação."
      ]
    },
    {
      id: "beta-privacidade-inativacao",
      numero: null,
      nome: "Aceite da política de privacidade e teste do corte de acesso ao sair",
      fase: "beta",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      descricao: "No primeiro acesso do grupo piloto, mostrar a política de privacidade do portal (quais dados a empresa usa, para quê, por quanto tempo e como falar sobre eles) e registrar o aceite; se o texto mudar, o aceite é pedido de novo. No mesmo piloto, testar com um caso controlado o corte automático de acesso: ao marcar alguém como desligado, a conta é bloqueada no acesso seguinte, e confirmar que o histórico de quem saiu continua guardado.",
      objetivo: "Cumprir a lei de privacidade com um aceite registrado e provar, ainda no piloto, que quem sai perde o acesso automaticamente, com o histórico preservado.",
      dependencias: ["Criar uma senha nova no primeiro acesso", "Assinar documentos com um clique e registro", "Acesso encerrado automaticamente ao sair da empresa"],
      criteriosAceite: [
        "O colaborador vê a política e o aceite é registrado; se a versão muda, o aceite é pedido de novo.",
        "O aceite fica registrado e não pode ser alterado.",
        "Conta marcada como desligada não entra no acesso seguinte.",
        "O histórico de quem saiu continua guardado; nada é apagado.",
        "Diretoria, invalidez e aprendiz confirmados sem acesso."
      ]
    },
    {
      id: "live-comunicacao-oficial",
      numero: null,
      nome: "Anúncio oficial do lançamento (mural, WhatsApp e portal)",
      fase: "live",
      prioridade: "alta",
      complexidade: "muito_facil",
      status: "planejado",
      descricao: "Anunciar a abertura do portal para todos os colaboradores em canais coordenados: um comunicado no próprio portal, um cartaz no mural e uma mensagem no WhatsApp, todos com a mesma mensagem curta (o que é o portal, como entrar pela primeira vez com CPF e nascimento, e onde pedir ajuda). Nenhuma imagem de exemplo mostra dado real de ninguém.",
      objetivo: "Dar ao portal um lançamento oficial e reconhecível, para que todo colaborador saiba que ele existe, para que serve e como entrar.",
      dependencias: ["Material de primeiro acesso e treinamento curto para o piloto (20 pessoas)", "Comunicados: tela para o RH publicar"],
      criteriosAceite: [
        "Anúncio no portal, no mural e no WhatsApp, com a mesma mensagem.",
        "A mensagem explica o que é o portal, como fazer o primeiro acesso e onde pedir ajuda.",
        "O canal de suporte do RH aparece em todos os lugares.",
        "Nenhum exemplo mostra dado real; tudo fictício ou mascarado."
      ]
    },
    {
      id: "live-faq-suporte-quiosque",
      numero: null,
      nome: "Perguntas frequentes, suporte do RH e acesso por quiosque",
      fase: "live",
      prioridade: "alta",
      complexidade: "facil",
      status: "planejado",
      descricao: "Montar o suporte contínuo do primeiro acesso: uma lista curta de perguntas frequentes com as dúvidas reais que apareceram nos testes (esqueci a senha, não lembro meu nascimento, troquei e esqueci de novo, não consigo entrar, não tenho celular) e um caminho claro para o RH ajudar, incluindo reiniciar a senha. Para quem não tem celular, instruções de uso do computador compartilhado ou quiosque, com o passo de sair da sessão ao terminar.",
      objetivo: "Garantir que ninguém fique travado no primeiro acesso nem de fora por falta de celular, com uma resposta humana rápida para o 'esqueci a senha'.",
      dependencias: ["Esqueci a senha: o RH reinicia para você", "RH cuida das contas dos colaboradores", "Anúncio oficial do lançamento (mural, WhatsApp e portal)"],
      criteriosAceite: [
        "Perguntas frequentes publicadas, cobrindo esqueci a senha, sem celular e não consigo entrar.",
        "Caminho para reiniciar a senha documentado (quem faz, prazo, como o colaborador volta a entrar), com registro.",
        "As instruções do computador compartilhado incluem o passo de sair da sessão ao terminar.",
        "As perguntas frequentes explicam que você vê só os seus dados e indicam o canal para dúvidas de privacidade."
      ]
    },
    {
      id: "live-monitoramento-retencao",
      numero: null,
      nome: "Acompanhamento contínuo da segurança e da guarda dos dados",
      fase: "live",
      prioridade: "alta",
      complexidade: "medio",
      status: "planejado",
      descricao: "Depois de abrir para todos, acompanhamento contínuo dos sinais de segurança: quantas contas ativas em relação ao quadro, picos de tentativa de acessar fora do que é permitido, senhas reiniciadas e desligamentos processados. A política de guarda dos dados passa a valer no dia a dia: quem sai perde o acesso, os dados ficam guardados pelo prazo definido e cada evento fica registrado. O RH revisa de tempos em tempos se ninguém de fora do quadro tem acesso.",
      objetivo: "Manter, ao longo do tempo, a garantia de que cada um vê só o que é seu, com a política de guarda dos dados funcionando.",
      dependencias: ["Acesso encerrado automaticamente ao sair da empresa", "Esqueci a senha: o RH reinicia para você"],
      criteriosAceite: [
        "Uma rotina do RH cruza contas ativas com o quadro e sinaliza divergência.",
        "Tentativas de acesso fora do permitido ficam visíveis para revisão.",
        "Senhas reiniciadas e desligamentos ficam registrados.",
        "A política de guarda dos dados fica documentada e em execução; nada é apagado indevidamente.",
        "A revisão periódica confirma que ninguém de fora do quadro tem acesso."
      ]
    },
    {
      id: "categorias-sem-acesso-portal",
      numero: null,
      nome: "Grupos que não têm acesso ao portal (diretoria, invalidez, aprendiz)",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "facil",
      status: "concluido",
      concluidoEm: "2026-06-24",
      classificacao: "adapta",
      descricao: "Já no ar. Diretoria, afastados por invalidez e menor aprendiz não acessam o portal do colaborador. Esses grupos são tratados de forma automática: a conta não é criada e, se já existir, o acesso é encerrado, sempre com registro. Há uma lista de exceções para casos de teste.",
      objetivo: "Manter claro e registrado quem fica de fora do portal, sem depender de ressalva escondida em outros itens.",
      dependencias: ["Criação automática de contas", "Ligar o seu login ao seu cadastro de funcionário"],
      criteriosAceite: [
        "Diretoria, invalidez e aprendiz não recebem conta; se já existir, é encerrada.",
        "Uma lista de exceções permite casos de teste.",
        "Nada é apagado: histórico preservado.",
        "Rodar de novo não muda o resultado."
      ]
    },
    {
      id: "documentos-institucionais-gestao",
      numero: null,
      nome: "Documentos da empresa (publicados pelo RH)",
      fase: "fase2",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-06-26",
      classificacao: "adapta",
      descricao: "Já no ar. Uma tela no portal do RH para publicar e versionar os documentos da empresa: manual de regras, código de conduta, manual da cultura, política de privacidade e termos. Dá para escolher o público e pedir assinatura ou ciência; ao publicar uma versão nova, a assinatura é pedida de novo. O RH acompanha quem já assinou e quem falta. O colaborador só lê e assina.",
      objetivo: "Dar ao RH um lugar para publicar os documentos da empresa, com versão, público e registro de ciência.",
      dependencias: ["Documentos: a base para receber e assinar", "Assinar documentos com um clique e registro"],
      criteriosAceite: [
        "Só o RH publica; o colaborador lê e assina.",
        "O documento tem texto ou anexo, e escolhe público por turno, setor ou todos.",
        "Pede assinatura ou ciência; uma versão nova reabre o aceite.",
        "O painel mostra quem assinou e quem falta, sem expor dado de terceiros."
      ]
    },
    {
      id: "marca-proposta-c-pulso",
      numero: null,
      nome: "Identidade visual do FioPulse (marca do pulso e assinatura)",
      fase: "fase1",
      prioridade: "media",
      complexidade: "facil",
      status: "concluido",
      concluidoEm: "2026-06-26",
      classificacao: "adapta",
      descricao: "Já no ar. A marca do FioPulse, com o traço de pulso, aparece de forma consistente em todos os pontos (tela de acesso, login e menu), junto com a assinatura 'Fiobras · o batimento do RH'. Ícone do app legível até em tamanho pequeno.",
      objetivo: "Uma identidade única e reconhecível do FioPulse, da entrada ao menu, em qualquer tamanho.",
      dependencias: [],
      criteriosAceite: [
        "A mesma marca na tela de acesso, no login e no menu.",
        "Ícone do app legível em tamanho pequeno.",
        "Nenhuma tela existente foi alterada."
      ]
    },
    {
      id: "auditoria-mobile-app-like",
      numero: null,
      nome: "Sensação de app de verdade no celular",
      fase: "fase1",
      prioridade: "alta",
      complexidade: "medio",
      status: "em_andamento",
      classificacao: "adapta",
      descricao: "Primeira parte no ar. Ajustes para o portal parecer um app de verdade no celular: acaba o zoom preso ao dar dois toques, some o menu sanduíche que ficava sobrando, os botões ficam maiores e mais fáceis de tocar, e os cartões deixam de estourar a largura da tela. Uma segunda parte, menor, ainda está por vir.",
      objetivo: "Deixar o portal com jeito de app no celular, e não só de site adaptado.",
      dependencias: ["Estrutura e menu do portal do colaborador"],
      criteriosAceite: [
        "Sem zoom preso no celular.",
        "Sem menu sanduíche sobrando.",
        "Botões confortáveis de tocar.",
        "Os campos não dão zoom sozinho ao digitar.",
        "Cartões e ações não estouram a largura."
      ]
    },
    {
      id: "espelho-ponto-gestor",
      numero: null,
      nome: "Cartão ponto da equipe no portal do gestor",
      fase: "fase2",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-07-01",
      classificacao: "cria",
      descricao: "Já no ar. Uma tela onde o líder ou supervisor vê o cartão ponto da própria equipe (mês atual e anterior, com os horários batidos, folgas e o saldo do dia), do mesmo jeito que cada colaborador vê o seu. Cada gestor vê só quem é da equipe dele: o líder por turno, o supervisor pelo grupo que já é dele.",
      objetivo: "Dar ao gestor a mesma visão de cartão ponto que o colaborador tem de si, só da equipe dele, sem configuração nova.",
      dependencias: ["Cartão ponto oficial em arquivo"],
      criteriosAceite: [
        "O líder vê o cartão ponto só de quem é do turno dele; o supervisor só do grupo dele.",
        "O cartão ponto é igual ao do colaborador (mês atual e anterior).",
        "Nenhuma configuração nova: a equipe vem do que já existe.",
        "Aprovado antes de entrar no ar."
      ]
    },
    {
      id: "supervisor-por-turnos",
      numero: null,
      nome: "Supervisor enxerga turnos inteiros, com atualização automática",
      fase: "fase2",
      prioridade: "alta",
      complexidade: "medio",
      status: "concluido",
      concluidoEm: "2026-07-01",
      classificacao: "cria",
      descricao: "Já no ar. O supervisor deixou de depender de uma lista pessoa por pessoa: agora marca os turnos que enxerga (1º, 2º, 3º) e passa a ver turnos inteiros, com as novas admissões entrando sozinhas. A lista individual continua existindo, para casos pontuais. O que ele vê vale para Funcionários, Ocorrências e o cartão ponto da equipe.",
      objetivo: "Deixar o alcance do supervisor crescer sozinho: cobre turnos inteiros, e o RH só ajusta as exceções.",
      dependencias: ["Cartão ponto da equipe no portal do gestor"],
      criteriosAceite: [
        "O supervisor marca os turnos e vê todos daqueles turnos, incluindo admissões futuras.",
        "A lista individual continua para casos pontuais.",
        "Vale para Funcionários, Ocorrências e cartão ponto de uma vez.",
        "Quem já usava só a lista individual continua funcionando igual."
      ]
    }
  ]
};
