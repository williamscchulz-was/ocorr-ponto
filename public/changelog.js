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
    v: "1.19.1", d: "2 jul 2026", current: true, aud: "gestor", items: [
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
