// ============================================================
// Histórico de versões (Novidades). Carregado SOB DEMANDA ao abrir o modal
// (lazy-load via app.js) — não pesa no boot.
//
// DISCIPLINA: a cada mudança visível ao usuário,
//   1) bumpe window.CURRENT_VERSION (em app.js);
//   2) adicione uma entry NO TOPO deste array, movendo current:true pra ela.
// Mantenha conciso: versão + data + títulos macro de 1 linha.
//
// type: 'feat' (novidade) | 'fix' (correção) | 'high' (destaque) | 'note' (aviso)
// aud (público): 'gestor' = só o Portal do Gestor vê; ausente OU 'colab'/'todos' = o
//   colaborador também vê. O gestor SEMPRE vê tudo. Pode ir na entry (vale p/ todos os
//   itens) ou por item (sobrepõe a entry). O portal do colaborador filtra pelo aud.
// ============================================================
window.CHANGELOG = [
  {
    v: "1.27.0", d: "3 jul 2026", current: true, items: [
      { type: "high", aud: "gestor", title: "Segunda leva de polimento: no celular as abas de Ocorrências, Configurações e Documentos ficaram maiores e mais fáceis de tocar, e as linhas de cada dia alinham o nome no mesmo lugar tenha a ocorrência vindo do relógio ou lançada à mão." },
      { type: "feat", title: "No Portal do Colaborador: os selos de saldo e de recibo pendente ficaram mais legíveis no tema claro, o recibo a assinar mostra um selo curto sem cortar o texto, e a barra de baixo agora tem o verde deslizando de um item pro outro." },
      { type: "fix", title: "As iniciais do seu avatar são as mesmas em todo canto do portal (antes a saudação e o menu lateral podiam mostrar letras diferentes)." },
    ],
  },
  {
    v: "1.26.1", d: "3 jul 2026", aud: "gestor", items: [
      { type: "fix", title: "Registrar ocorrência ficou à prova de silêncio: funcionário sem turno definido é barrado na hora com instrução clara, e qualquer falha de gravação agora fica escrita no formulário até você resolver (antes um aviso de 2 segundos podia passar batido e a ocorrência não era salva)." },
    ],
  },
  {
    v: "1.26.0", d: "3 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Grande polimento da auditoria: números de pendências iguais em toda parte, aba Todas completa e em ordem cronológica, lista de ocorrências com colunas alinhadas, tipos com a mesma grafia e cor em qualquer origem, e o saldo negativo do modal agora é vermelho de verdade." },
      { type: "feat", aud: "gestor", title: "No celular: abas numa linha só rolável (o sublinhado agora fica na aba certa), cards re-organizados sem esconder o horário, nomes não são mais cortados na lista de Funcionários, nada fica escondido atrás dos botões flutuantes, e o espelho do funcionário abre numa folha por cima da lista." },
      { type: "feat", title: "Textos internos de diagnóstico sumiram das telas, selos com melhor leitura nos dois temas, navegação por teclado alcança as ocorrências automáticas e o foco não deforma mais os cantos dos campos." },
      { type: "note", title: "O app ficou mais leve de carregar: os arquivos agora vão minificados pro ar." },
    ],
  },
  {
    v: "1.25.0", d: "3 jul 2026", aud: "gestor", items: [
      { type: "high", title: "Nasceu a Visão geral: o novo início do portal, com o pulso da empresa num olhar. Cartão Precisa de você com as pendências acionáveis, gráfico de ocorrências por mês, aniversariantes, admissões recentes, demografia, ranking e atividade recente." },
      { type: "feat", title: "A página de Ocorrências ficou só com o trabalho: abas de conferência, busca e lista. Cada cartão da Visão geral respeita a sua permissão e mostra os números do seu recorte (líder vê o turno dele)." },
    ],
  },
  {
    v: "1.24.0", d: "2 jul 2026", aud: "gestor", items: [
      { type: "high", title: "O Portal do Gestor no celular ganhou a mesma cara do app do colaborador: atalhos redondos na Home (com pendências), resumo compacto, barra de baixo com só 3 itens em ilha de vidro e o botão de Nova ocorrência flutuando acima dela." },
      { type: "feat", title: "A versão do app agora aparece num selo ao lado da saudação (a barra do topo saiu de cena no celular)." },
    ],
  },
  {
    v: "1.23.1", d: "2 jul 2026", items: [
      { type: "high", title: "O aplicativo ficou mais limpo no celular: a barra do topo saiu de cena (o título da página assume o lugar) e a barra de baixo virou uma ilha flutuante de vidro, com o conteúdo passando por baixo. O tema e a versão do app agora vivem na Conta." },
    ],
  },
  {
    v: "1.23.0", d: "2 jul 2026", aud: "gestor", items: [
      { type: "high", title: "A tela da ocorrência automática cresceu no desktop: duas colunas, com a jornada prevista lado a lado com as batidas do dia, a primeira batida do atraso em destaque e o tempo do atraso calculado (Atraso de 32 min). Vale pra GP conferir e pro líder destinar." },
      { type: "note", title: "Enquanto o pipeline não preencher as marcações de julho, a tela mostra 'sem marcação no dia' e segue funcionando normal." },
    ],
  },
  {
    v: "1.22.3", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "A lista principal de Funcionários agora mostra a foto de cada colaborador (quem não tem segue com as iniciais)." },
      { type: "fix", title: "Fotos que apareciam estouradas em alguns avatares do gestor (cartão do espelho e disciplinares) agora ficam sempre enquadradas." },
    ],
  },
  {
    v: "1.22.2", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Dispensar uma ocorrência automática agora pede o motivo (obrigatório). O porquê fica gravado na trilha." },
      { type: "feat", title: "Toda ocorrência automática abre o detalhe ao clicar no card, igual à manual: pessoa, marcações e a trilha completa, com o motivo da dispensa e a destinação escolhida pelo líder." },
    ],
  },
  {
    v: "1.22.1", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "As fotos dos colaboradores agora aparecem também no Portal do Gestor: espelho de ponto, conferência de ocorrências, perfil do funcionário, disciplinares e popup do banco de horas." },
    ],
  },
  {
    v: "1.22.0", d: "2 jul 2026", items: [
      { type: "high", title: "O visualizador de documentos foi refeito: agora o arquivo aparece limpo na tela, com TODAS as páginas (no iPhone só aparecia a primeira), sem barra nem painel do navegador." },
      { type: "fix", aud: "gestor", title: "Ver um recibo assinado ficou confiável: se o download direto falhar, a versão carimbada abre em nova aba em vez de mostrar o original sem avisar." },
    ],
  },
  {
    v: "1.21.2", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Ocorrência automática agora tem a mesma conferência da manual: o líder abre a tela, vê previsto e batido, escolhe a Ação (obrigatória) e a observação antes de confirmar. Acabou o confirmar de um clique sem verificar." },
    ],
  },
  {
    v: "1.21.1", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "No Banco de Horas, clicar no funcionário abre o espelho do mês num popup (saldo + marcações), com atalho pra aba Espelho de ponto já com a pessoa selecionada." },
    ],
  },
  {
    v: "1.21.0", d: "2 jul 2026", items: [
      { type: "high", title: "Chegou a assinatura eletrônica: o recibo e o cartão ponto agora são assinados dentro do app, e a assinatura fica CARIMBADA no próprio arquivo, com seu nome em letra de assinatura, data, hora e local. O arquivo assinado fica guardado em cofre e não muda nunca mais." },
      { type: "feat", title: "Pra assinar, o app pede a sua localização (é o registro de onde você assinou, parte da validade) e a sua senha. A folha te guia passo a passo, inclusive na permissão do navegador." },
      { type: "feat", aud: "gestor", title: "O lote de recibos virou painel de adesão: quantos assinaram, quem falta, e a hora de cada assinatura. O Ver abre a versão carimbada de quem já assinou." },
    ],
  },
  {
    v: "1.20.4", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "O progresso da importação ganhou vida: os nomes dos funcionários desfilam com um check verde enquanto os arquivos são separados e salvos." },
    ],
  },
  {
    v: "1.20.3", d: "2 jul 2026", aud: "gestor", items: [
      { type: "fix", title: "Gravação do lote aguenta conexão instável: se o canal com o banco cair no meio, o sistema recicla a conexão e tenta de novo (3 vezes), com lotes mais leves e pausa entre eles." },
      { type: "feat", title: "Sair ou atualizar a página no meio de uma importação agora dispara o aviso do navegador (era assim que lotes morriam pela metade sem ninguém ver)." },
    ],
  },
  {
    v: "1.20.2", d: "2 jul 2026", aud: "gestor", items: [
      { type: "fix", title: "Corrigido: ao clicar em Gerar, a barra de progresso sumia na hora e a geração rodava invisível (parecia que nada acontecia). Agora o progresso aparece por cima da conferência, do início ao fim." },
    ],
  },
  {
    v: "1.20.1", d: "2 jul 2026", aud: "gestor", items: [
      { type: "fix", title: "Gravação do lote blindada: se a conexão falhar no meio, o sistema re-tenta, segue com os próximos e mostra um resumo claro de quem ficou de fora. A lista sempre atualiza sozinha (sem F5)." },
      { type: "feat", title: "Lote parcial se completa sozinho: importe de novo o mesmo PDF e competência; os já gerados aparecem como \"já gerado\" na conferência e só o que falta é criado." },
      { type: "feat", title: "Menores aprendizes agora são identificados no import: o diretório de identificação (pipeline) entrou no ar cobrindo todo o quadro." },
    ],
  },
  {
    v: "1.20.0", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "A tela de Importar recibos ficou moderna: arraste e solte o PDF (ou toque pra escolher), veja o arquivo num card com nome e tamanho, e o Analisar só habilita com arquivo. Tipo e competência lado a lado." },
      { type: "feat", title: "Identificação mais completa no import: nova fonte de CPF que cobre TODO o quadro, inclusive menores aprendizes (que não têm banco de horas). Ativa assim que o pipeline popular." },
    ],
  },
  {
    v: "1.19.1", d: "2 jul 2026", aud: "gestor", items: [
      { type: "fix", title: "Corrigido: as janelas de importar recibos, conferência e lote não fechavam no X nem no Cancelar. Fechar a conferência também libera a memória do PDF." },
    ],
  },
  {
    v: "1.19.0", d: "2 jul 2026", items: [
      { type: "high", title: "A Home ganhou atalhos no estilo do app do seu banco: uma fileira de botões redondos que rola pro lado (Meu ponto, Folha de pagamento, Avisos, Documentos, Novidades, Conta). Pendência aparece como bolinha no atalho: recibo novo, aviso não lido, documento pra assinar." },
      { type: "feat", title: "No celular, a barra de baixo ficou mais limpa: Início, Avisos e Conta. O resto está nos atalhos da Home e no menu." },
      { type: "fix", aud: "gestor", title: "Conferência do import: a leitura do nome ficou tolerante ao jeito que o PDF quebra o texto (menos falsos \"a resolver\"), e o código impresso na página (Cod.) agora vale como confirmação e vira sugestão quando o CPF não resolve." },
    ],
  },
  {
    v: "1.18.1", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Conferência do import de recibos melhorou: a miniatura agora abre a página inteira ampliada (com navegação entre páginas), o erro mostra o CPF lido, e o \"a resolver\" ganhou busca por nome ou código com sugestão de um toque." },
    ],
  },
  {
    v: "1.18.0", d: "2 jul 2026", items: [
      { type: "high", title: "Chegou a Folha de pagamento: um menu novo com os seus recibos, mês a mês. Abrem dentro do app, dá pra ler e baixar, e só você vê os seus. A assinatura eletrônica chega na próxima etapa." },
      { type: "feat", title: "Em Meu ponto, quando o GP importar, aparece também o seu cartão ponto oficial do mês em arquivo, junto do espelho ao vivo." },
      { type: "feat", aud: "gestor", title: "Documentos ganhou a aba \"Recibos e cartão ponto\": o GP importa um único PDF da folha (WK) e o sistema separa por funcionário pelo CPF, com conferência página a página (miniaturas reais) antes de gerar." },
    ],
  },
  {
    v: "1.17.0", d: "1 jul 2026", items: [
      { type: "high", title: "A sua Home ganhou um visual novo: uma saudação pelo horário do dia (bom dia, boa tarde, boa noite) com o seu nome, e no seu aniversário ela vira festa. No computador ela abre em duas colunas." },
      { type: "feat", title: "Agora você pode colocar a sua foto de perfil: toque no ícone de câmera na sua foto, na Conta. Ela aparece na saudação da Home, no topo e na Conta. Sem foto, ficam as suas iniciais." },
      { type: "feat", title: "Aniversariantes ficaram mais leves: no celular aparece só quem faz aniversário hoje; no computador, o mês inteiro." },
    ],
  },
  {
    v: "1.16.0", d: "1 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Comunicados agora têm o tipo \"Aviso interno\": um recado rápido pra todos. No compositor é só escolher; no feed ele aparece com um selo âmbar \"Aviso\", separando do comunicado por turno ou setor." },
    ],
  },
  {
    v: "1.15.0", d: "1 jul 2026", items: [
      { type: "high", title: "Documentos institucionais agora abrem dentro do app: o GP anexa uma imagem ou PDF e o colaborador lê na hora, sem sair pro Drive. Rola o documento e assina ou dá ciência ali mesmo." },
    ],
  },
  {
    v: "1.14.0", d: "1 jul 2026", items: [
      { type: "feat", title: "Em Meu ponto, no Portal do Colaborador, você acompanha as suas ocorrências (só leitura) e o espelho de ponto: os horários que você bateu a cada dia, atualizados diariamente." },
    ],
  },
  {
    v: "1.13.3", d: "30 jun 2026", items: [
      { type: "note", title: "Onde o sistema dizia RH ou GH, agora diz GP (Gestão de Pessoas)." },
    ],
  },
  {
    v: "1.13.2", d: "30 jun 2026", items: [
      { type: "high", title: "Avisos agora só registram visualização: abriu o post, conta como visto. Sem precisar confirmar ciência." },
    ],
  },
  {
    v: "1.13.1", d: "30 jun 2026", items: [
      { type: "feat", title: "No Portal do Colaborador, toque no aviso pra abrir o post inteiro: imagem ampliável em tela cheia, texto completo e o anexo." },
    ],
  },
  {
    v: "1.13.0", d: "30 jun 2026", aud: "gestor", items: [
      { type: "high", title: "Ocorrências ganhou o estágio \"GP confere\": o GP valida ou dispensa as ocorrências automáticas do ponto, e o que ele valida vai pro líder do turno confirmar." },
      { type: "feat", title: "Comunicados e Documentos agora aparecem em grade, estilo feed: cards menores e visão geral mais rápida." },
      { type: "note", title: "Quem está marcado em rescisão aparece sinalizado na conferência, com a contagem de faltas no mês." },
    ],
  },
  {
    v: "1.12.0", d: "24 jun 2026", items: [
      { type: "high", title: "Novo: ao abrir o sistema você escolhe \"Portal do Colaborador\" ou \"Portal do Gestor/Administrador\". O acesso do gestor continua igual — só ganhou um toque a mais." },
      { type: "feat", title: "Prévia do Portal do Colaborador: início com identidade, banco de horas, comunicados, documentos e o Roadmap do Portal." },
    ],
  },
  {
    v: "1.11.0", d: "18 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Toques premium: a barrinha das abas desliza, os números animam quando mudam, e o 'Tudo em dia' chega com uma comemoração discreta." },
      { type: "feat", title: "No celular: vibração curtinha ao lançar/conferir/marcar, topbar com sombra ao rolar e o botão + que recolhe ao descer." },
    ],
  },
  {
    v: "1.10.0", d: "18 jun 2026", aud: "gestor", items: [
      { type: "high", title: "Novo: Obrigações do GP — checklist das rotinas (fechar folha, banco de horas, eSocial, pagar PJ…) que zera sozinha a cada mês/ano." },
      { type: "feat", title: "Card no dashboard mostra o que vence no mês, o que está pendente e o que atrasou; marca como feito em um toque." },
    ],
  },
  {
    v: "1.9.1", d: "17 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Menores aprendizes têm badge \"Menor Aprendiz\" na lista e filtro de status próprio." },
      { type: "note", title: "Aprendizes saem de banco de horas, demografia e ranking (como a diretoria); seguem contando no quadro e nos aniversários." },
    ],
  },
  {
    v: "1.9.0", d: "17 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Afastados e diretores têm marcação própria: badge na lista, banner/selo no perfil e filtro de status (Operacionais · Afastados · Diretores)." },
      { type: "note", title: "Diretores saem de banco de horas, demografia e ranking; afastados saem do ranking. Os dois seguem contando no quadro e nos aniversários." },
    ],
  },
  {
    v: "1.8.2", d: "13 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Chat: a mensagem aparece na hora ao enviar (com 'enviando…'), botão pra descer rápido na conversa, e cores de não-lida/leitura na paleta da marca." },
      { type: "fix", title: "Corrigido o realce ao passar o mouse nas listas — tinha sumido por um token de cor quebrado." },
    ],
  },
  {
    v: "1.8.1", d: "13 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Novo no painel do admin: ranking dos 10 funcionários de casa mais antiga, ao lado do card de Demografia." },
    ],
  },
  {
    v: "1.8.0", d: "13 jun 2026", aud: "gestor", items: [
      { type: "high", title: "Chat mais rápido: a lista de conversas para de se redesenhar a cada batimento de presença — sem mais perder a rolagem ou o foco." },
      { type: "fix", title: "Correções no chat: a foto não quebra mais o layout, 'digitando…' não vaza pra conversa errada, enviar sem internet avisa (em vez de fingir que mandou), e os horários acertam à noite." },
      { type: "feat", title: "Chat acessível: ESC fecha, o leitor de tela anuncia mensagens novas e as reações têm nome." },
    ],
  },
  {
    v: "1.7.0", d: "13 jun 2026", aud: "gestor", items: [
      { type: "high", title: "Auditoria de design: contraste e foco mais legíveis, números alinhados em colunas, e o botão de chat não cobre mais as janelas." },
      { type: "feat", title: "No dashboard, a contagem 'Conferidas' virou 'Resolvidas' (conferidas + lançadas) — sem mais confusão com a aba." },
      { type: "feat", title: "Hierarquia mais clara: o número que pede ação ganha destaque, a ocorrência pendente recebe uma marca, e Funcionários abre direto na lista (contagem por turno foi pro filtro)." },
      { type: "feat", title: "Micro-interações: avisos com barra de tempo que pausa ao passar o mouse, e transições suaves ao trocar de tela e ao fechar janelas." },
      { type: "high", title: "Rede de segurança: ao marcar como lançada aparece 'Desfazer' por alguns segundos; e o import de Banco de Horas avisa quem perderia o saldo antes de substituir." },
    ],
  },
  {
    v: "1.6.2", d: "10 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Primeira visita às listas ganha um instante de carregamento elegante; no resto do uso, tudo segue instantâneo." },
    ],
  },
  {
    v: "1.6.1", d: "10 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Erros de formulário agora aparecem no próprio campo, em vez de um aviso que some." },
      { type: "feat", title: "Listas navegáveis pelo teclado: Tab percorre, Enter abre o item." },
    ],
  },
  {
    v: "1.6.0", d: "10 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Toques de UX: skeleton ao carregar, aviso de 'sem conexão', e a ocorrência desliza pra fora ao ser lançada." },
    ],
  },
  {
    v: "1.5.0", d: "1 jun 2026", aud: "gestor", items: [
      { type: "high", title: "Nova tela de abertura: a marca da Fiobras se desenha sozinha quando o app carrega." },
    ],
  },
  {
    v: "1.4.0", d: "1 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Permissões editáveis: admin liga/desliga na matriz o que cada papel (GP, Líder, Supervisor) pode fazer." },
    ],
  },
  {
    v: "1.3.0", d: "1 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Painel de Permissões: matriz do que cada papel (Admin, GP, Líder, Supervisor) faz + escopo por usuário (turno / funcionários)." },
    ],
  },
  {
    v: "1.2.0", d: "1 jun 2026", aud: "gestor", items: [
      { type: "high", title: "Leitura de contrato repaginada: cena de scan animada + cartão revisando o que foi encontrado." },
      { type: "feat", title: "Extração mais esperta: reconhece CPF além de CNPJ e prioriza o valor mensal/honorários." },
    ],
  },
  {
    v: "1.1.0", d: "29 mai 2026", aud: "gestor", items: [
      { type: "fix", title: "Usabilidade no celular: topbar, listas, formulários e chat ajustados pra mobile." },
      { type: "feat", title: "Toque e segure pra reagir no chat (celular); Novidades acessível também no desktop." },
    ],
  },
  {
    v: "1.0.0", d: "29 mai 2026", aud: "gestor", items: [
      { type: "feat", title: "Chat novo: conversas separadas de pessoas, com reações e confirmação de leitura." },
      { type: "feat", title: "Auditoria: linha do tempo de quem conferiu, lançou, alterou ou excluiu." },
      { type: "high", title: "Visual minimalista em todo o app + identidade FioPulse." },
    ],
  },
  {
    v: "0.9.0", d: "26 mai 2026", aud: "gestor", items: [
      { type: "feat", title: "Banco de horas com gráfico do mês no perfil do funcionário." },
      { type: "feat", title: "Controle PJ: contrato e aditivos juntos, com pasta no Drive." },
      { type: "fix", title: "Login mais rápido e sem piscar a tela." },
    ],
  },
];
