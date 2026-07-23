// ============================================================
// Histórico de versões (Novidades). Carregado SOB DEMANDA ao abrir o modal
// (lazy-load via app.js) — não pesa no boot.
//
// DISCIPLINA: a cada mudança visível ao usuário,
//   1) bumpe window.CURRENT_VERSION (em app.js);
//   2) adicione uma entry NO TOPO deste array, movendo current:true pra ela.
//
// REGRA DE TEXTO (permanente, William 2026-07-23): cada title é um TÍTULO CURTO
//   (alvo <= 60 caracteres, sem ponto final), em português correto COM acentos, em
//   linguagem de usuário. Só o título da mudança: sem explicar o porquê, sem detalhe
//   técnico, sem jargão (indicadores, não "KPI"; nada de cache, morph, enum). Sem
//   emoji e sem hífen/travessão como separador (vírgula, dois-pontos e · são ok).
//
// type: 'feat' (novidade) | 'fix' (correção) | 'high' (destaque) | 'note' (aviso)
// aud (público): 'gestor' = só o Portal do Gestor vê; ausente OU 'colab'/'todos' = o
//   colaborador também vê. O gestor SEMPRE vê tudo. Pode ir na entry (vale p/ todos os
//   itens) ou por item (sobrepõe a entry). O portal do colaborador filtra pelo aud.
// ============================================================
window.CHANGELOG = [
  {
    v: "2.9.0", d: "23 jul 2026", current: true, items: [
      { type: "feat", aud: "gestor", title: "Menu lateral novo, com seções que recolhem e modo régua" },
    ],
  },
  {
    v: "2.8.0", d: "23 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Aba Férias no perfil, com vencidas e proporcional" },
    ],
  },
  {
    v: "2.7.1", d: "23 jul 2026", items: [
      { type: "fix", aud: "colab", title: "Card de boas-vindas volta a aparecer na tela inicial" },
      { type: "feat", aud: "todos", title: "Nova mãozinha de boas-vindas, com aceno ao tocar" },
    ],
  },
  {
    v: "2.7.0", d: "23 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Vagas internas no funil, com visibilidade por vaga" },
      { type: "feat", aud: "colab", title: "Oportunidades internas no portal, com um toque" },
      { type: "fix", aud: "gestor", title: "Férias vencidas ignoram colaboradores afastados" },
    ],
  },
  {
    v: "2.6.0", d: "23 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Férias vencidas visíveis na lista de Funcionários" },
    ],
  },
  {
    v: "2.5.3", d: "23 jul 2026", items: [
      { type: "fix", aud: "colab", title: "Avisos, Pagamento e Conquistas mais estáveis" },
    ],
  },
  {
    v: "2.5.2", d: "23 jul 2026", items: [
      { type: "note", aud: "todos", title: "Proteção extra contra robôs nos bastidores" },
    ],
  },
  {
    v: "2.5.1", d: "23 jul 2026", items: [
      { type: "fix", aud: "colab", title: "Novidades com textos mais curtos e claros" },
      { type: "fix", aud: "gestor", title: "Histórico de Novidades revisado e enxugado" },
    ],
  },
  {
    v: "2.5.0", d: "22 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Indicadores da Visão geral numa régua mais enxuta" },
    ],
  },
  {
    v: "2.4.0", d: "22 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Cartão Ocorrências a conferir mostra a fila inteira" },
      { type: "feat", aud: "gestor", title: "Histórico de seis meses nos cartões da Visão geral" },
    ],
  },
  {
    v: "2.3.0", d: "22 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Situação de cada pessoa na lista de Funcionários" },
    ],
  },
  {
    v: "2.2.0", d: "22 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Aviso de quem está sem foto oficial em Funcionários" },
    ],
  },
  {
    v: "2.1.0", d: "22 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Painel de números no topo da tela Vagas" },
      { type: "feat", aud: "gestor", title: "Passo Contratada no funil da candidatura" },
    ],
  },
  {
    v: "2.0.3", d: "21 jul 2026", items: [
      { type: "feat", title: "Canal de denúncia também na tela Conta", aud: "colab" },
    ],
  },
  {
    v: "2.0.2", d: "22 jul 2026", items: [
      { type: "fix", title: "Abertura do app mais suave e contínua", aud: "colab" },
    ],
  },
  {
    v: "2.0.1", d: "21 jul 2026", items: [
      { type: "fix", title: "Novidades agora também na tela Conta", aud: "colab" },
    ],
  },
  {
    v: "2.0.0", d: "21 jul 2026", items: [
      { type: "feat", title: "Tela inicial renovada, com mural em faixa de rostos", aud: "colab" },
    ],
  },
  {
    v: "1.99.2", d: "21 jul 2026", items: [
      { type: "feat", title: "Card do mural encolhe depois de parabenizar", aud: "colab" },
    ],
  },
  {
    v: "1.99.1", d: "21 jul 2026", items: [
      { type: "fix", title: "Extrato de pontos mais claro e atualizado na hora", aud: "colab" },
    ],
  },
  {
    v: "1.99.0", d: "20 jul 2026", items: [
      { type: "feat", title: "Toques finais de capricho na home", aud: "colab" },
    ],
  },
  {
    v: "1.98.0", d: "20 jul 2026", items: [
      { type: "feat", title: "Apresentação rápida no primeiro acesso", aud: "colab" },
    ],
  },
  {
    v: "1.97.0", d: "18 jul 2026", items: [
      { type: "fix", title: "Home mais fluida, sem repintar a tela" },
    ],
  },
  {
    v: "1.96.0", d: "18 jul 2026", items: [
      { type: "fix", title: "Meu ponto atualiza só o trecho que mudou" },
    ],
  },
  {
    v: "1.95.0", d: "18 jul 2026", items: [
      { type: "fix", title: "Animações de entrada rodam uma vez só" },
      { type: "fix", title: "Carregamento sem piscar em Documentos e Conquistas" },
    ],
  },
  {
    v: "1.94.4", d: "17 jul 2026", items: [
      { type: "fix", title: "Documentos não somem durante a atualização" },
    ],
  },
  {
    v: "1.94.3", d: "17 jul 2026", items: [
      { type: "fix", title: "Fim do pisca ao navegar entre telas" },
    ],
  },
  {
    v: "1.94.2", d: "17 jul 2026", items: [
      { type: "fix", title: "Documentos aparecem todos de uma vez" },
      { type: "fix", title: "Entrada em Conquistas mais suave" },
    ],
  },
  {
    v: "1.94.1", d: "17 jul 2026", items: [
      { type: "fix", title: "Comprovante de assinatura abre sempre" },
    ],
  },
  {
    v: "1.94.0", d: "17 jul 2026", items: [
      { type: "feat", title: "Documentos carregam de uma vez, com progresso" },
      { type: "fix", title: "Botão Comprovante sempre responde" },
    ],
  },
  {
    v: "1.93.0", d: "17 jul 2026", items: [
      { type: "high", title: "Abertura contínua, sem piscadas" },
    ],
  },
  {
    v: "1.92.0", d: "17 jul 2026", items: [
      { type: "feat", title: "Coração novo no mural, que pulsa ao curtir" },
    ],
  },
  {
    v: "1.91.1", d: "17 jul 2026", items: [
      { type: "fix", title: "Seu rosto entra no card assim que você curte" },
    ],
  },
  {
    v: "1.91.0", d: "17 jul 2026", items: [
      { type: "high", title: "Mural celebra o tempo de casa dos colegas" },
      { type: "feat", title: "Quem parabeniza aparece com a foto no card" },
    ],
  },
  {
    v: "1.90.1", d: "17 jul 2026", items: [
      { type: "fix", title: "Barra de navegação não trava mais no iPhone" },
      { type: "fix", title: "Botão Comprovante dos documentos sempre responde" },
    ],
  },
  {
    v: "1.90.0", d: "16 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Email automático ao candidato a cada etapa" },
    ],
  },
  {
    v: "1.89.0", d: "16 jul 2026", items: [
      { type: "high", title: "Seus termos assinados na tela Documentos" },
      { type: "feat", title: "Percentual na tela de atualização" },
    ],
  },
  {
    v: "1.88.1", d: "16 jul 2026", items: [
      { type: "fix", title: "Comprovante abre até em assinaturas antigas" },
    ],
  },
  {
    v: "1.88.0", d: "16 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Funil de candidatos com mensagem em um toque" },
    ],
  },
  {
    v: "1.87.0", d: "16 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Apuração de denúncia em dossiê de tela cheia" },
      { type: "fix", title: "Barra de atualização enche suave até o fim" },
    ],
  },
  {
    v: "1.86.0", d: "16 jul 2026", items: [
      { type: "note", title: "Termo do Canal de Denúncias no próximo acesso" },
      { type: "feat", aud: "gestor", title: "Botão Copiar link na vaga publicada" },
    ],
  },
  {
    v: "1.85.0", d: "16 jul 2026", items: [
      { type: "high", title: "Acompanhe a sua denúncia por um código" },
    ],
  },
  {
    v: "1.84.0", d: "16 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Governança do canal de denúncia" },
      { type: "note", title: "Denúncias concluídas guardadas por cinco anos" },
    ],
  },
  {
    v: "1.83.0", d: "16 jul 2026", items: [
      { type: "feat", title: "Tela de atualização com o tempo certo" },
      { type: "feat", aud: "gestor", title: "Experiência atual na ficha do candidato" },
    ],
  },
  {
    v: "1.82.0", d: "16 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Expurgo automático de candidaturas antigas (LGPD)" },
    ],
  },
  {
    v: "1.81.1", d: "16 jul 2026", items: [
      { type: "fix", title: "Documento assinado não conta mais como pendente" },
    ],
  },
  {
    v: "1.81.0", d: "16 jul 2026", items: [
      { type: "feat", title: "Sua sequência de dias no card de pontos" },
    ],
  },
  {
    v: "1.80.0", d: "16 jul 2026", items: [
      { type: "high", title: "Motivo real do dia sem batida no espelho" },
      { type: "feat", aud: "gestor", title: "Ficha completa da candidatura na tela Vagas" },
      { type: "feat", aud: "gestor", title: "Benefícios por vaga, com selos no site" },
    ],
  },
  {
    v: "1.79.0", d: "16 jul 2026", items: [
      { type: "feat", title: "Convite do mural se despede após as boas-vindas" },
    ],
  },
  {
    v: "1.78.0", d: "16 jul 2026", items: [
      { type: "high", title: "App abre na escolha de portal, com entrada direta" },
      { type: "feat", title: "Atualização transparente, com aviso e barra" },
    ],
  },
  {
    v: "1.77.0", d: "15 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Perfil comportamental nas candidaturas de Vagas" },
      { type: "feat", title: "Falta abonada nomeada no espelho de ponto" },
    ],
  },
  {
    v: "1.76.0", d: "15 jul 2026", items: [
      { type: "high", title: "Você fica sempre conectado no portal" },
      { type: "high", title: "Celebração nos momentos que importam" },
      { type: "feat", title: "Salvar a senha no cofre do celular" },
    ],
  },
  {
    v: "1.75.0", d: "15 jul 2026", items: [
      { type: "high", title: "Painéis do celular com física de verdade" },
    ],
  },
  {
    v: "1.74.0", d: "15 jul 2026", items: [
      { type: "high", title: "Home repaginada, mais enxuta" },
    ],
  },
  {
    v: "1.73.0", d: "15 jul 2026", items: [
      { type: "high", title: "Parabenizar e dar boas-vindas valem ponto" },
      { type: "fix", title: "iPhone: tela e barra no lugar ao rolar" },
      { type: "fix", title: "Canal de denúncia e home mais ajustados no celular" },
    ],
  },
  {
    v: "1.72.0", d: "15 jul 2026", items: [
      { type: "high", title: "Canal de denúncia no ar, anônimo por padrão" },
    ],
  },
  {
    v: "1.71.0", d: "15 jul 2026", items: [
      { type: "high", title: "Navegação entre telas mais suave" },
    ],
  },
  {
    v: "1.70.1", d: "15 jul 2026", items: [
      { type: "note", title: "App mais leve e o que você digita não se perde" },
    ],
  },
  {
    v: "1.70.0", d: "15 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Botão de WhatsApp no site de Vagas" },
      { type: "fix", title: "Chegaram há pouco usa a janela de 15 dias" },
    ],
  },
  {
    v: "1.69.2", d: "14 jul 2026", items: [
      { type: "fix", title: "Acabamento fino, sem piscar nas transições" },
    ],
  },
  {
    v: "1.69.1", d: "14 jul 2026", items: [
      { type: "fix", title: "Curtidas e contagens não piscam mais" },
    ],
  },
  {
    v: "1.69.0", d: "14 jul 2026", aud: "gestor", items: [
      { type: "high", title: "Candidatura por formulário no site de Vagas" },
      { type: "feat", title: "Turno vira seletor na tela Vagas" },
    ],
  },
  {
    v: "1.68.1", d: "14 jul 2026", items: [
      { type: "fix", title: "Saldo do dia mostra o valor para folga" },
      { type: "fix", title: "Barra de carregamento em Conquistas" },
      { type: "fix", aud: "gestor", title: "Menu lateral rola por dentro, sem empurrar o avatar" },
    ],
  },
  {
    v: "1.68.0", d: "14 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Portal de Vagas no ar" },
    ],
  },
  {
    v: "1.67.0", d: "14 jul 2026", items: [
      { type: "high", title: "Entrar todo dia vale ponto na temporada" },
      { type: "feat", title: "Fotos no pódio do ranking e medalhas até 30 anos" },
      { type: "feat", title: "Medalhas de coração e boas-vindas redesenhadas" },
      { type: "med", aud: "gestor", title: "Menu lateral organizado em grupos" },
    ],
  },
  {
    v: "1.66.0", d: "14 jul 2026", items: [
      { type: "feat", title: "Colocar a sua foto de perfil vale ponto" },
      { type: "fix", title: "Pontos retroativos mais confiáveis" },
    ],
  },
  {
    v: "1.65.2", d: "14 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Autoavaliação sai das ações que valem ponto" },
    ],
  },
  {
    v: "1.65.1", d: "14 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Tela Gamificação no visual padrão do painel" },
    ],
  },
  {
    v: "1.65.0", d: "14 jul 2026", items: [
      { type: "high", title: "Chegaram as Conquistas: o portal agora vale pontos" },
      { type: "feat", title: "Sua foto com o aro na aba Conta" },
      { type: "feat", title: "Aros para decorar o seu avatar" },
      { type: "feat", aud: "gestor", title: "Nova tela Gamificação para a GP" },
    ],
  },
  {
    v: "1.64.1", d: "10 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Dispensar cards Resolvido no Banco de Horas" },
    ],
  },
  {
    v: "1.64.0", d: "10 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Demografia e Ranking de tempo de casa redesenhados" },
    ],
  },
  {
    v: "1.63.0", d: "10 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Casos resolvidos sozinhos aparecem em GP confere" },
    ],
  },
  {
    v: "1.62.0", d: "9 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Ocorrência excluída vai para a aba Excluídas" },
    ],
  },
  {
    v: "1.61.0", d: "9 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Avaliação de desempenho na aba Avaliações" },
      { type: "feat", aud: "colab", title: "Autoavaliação de desempenho no seu início" },
    ],
  },
  {
    v: "1.60.0", d: "9 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Dar boas-vindas a quem chegou há pouco" },
    ],
  },
  {
    v: "1.59.2", d: "9 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Visão geral mais alinhada" },
    ],
  },
  {
    v: "1.59.1", d: "9 jul 2026", items: [
      { type: "fix", aud: "colab", title: "Curtir de novo o coração não dá mais erro" },
      { type: "med", title: "Abertura mais rápida no celular" },
      { type: "med", title: "Tato mais refinado nos botões" },
    ],
  },
  {
    v: "1.59.0", d: "9 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Nova aba Avaliações com a Pesquisa de clima" },
      { type: "feat", aud: "colab", title: "Pesquisa de clima aparece no seu início" },
    ],
  },
  {
    v: "1.58.4", d: "9 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Telas aparecem na hora, sem piscar ao trocar de aba" },
    ],
  },
  {
    v: "1.58.3", d: "9 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Fim do pisca de textos ao carregar" },
    ],
  },
  {
    v: "1.58.2", d: "9 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Aviso Conferir some depois que a GP revisa" },
    ],
  },
  {
    v: "1.58.1", d: "8 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Ajustes na Visão geral" },
    ],
  },
  {
    v: "1.58.0", d: "8 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Padrão único de indicadores no app inteiro" },
      { type: "med", aud: "gestor", title: "Portal do Gestor abre sempre na Visão geral" },
    ],
  },
  {
    v: "1.57.1", d: "8 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Turnover mostra contratações e desligamentos" },
    ],
  },
  {
    v: "1.57.0", d: "8 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Visão geral mais limpa e alinhada" },
    ],
  },
  {
    v: "1.56.0", d: "8 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Tema escuro no Portal do Gestor" },
    ],
  },
  {
    v: "1.55.1", d: "8 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Etiqueta Conferir mais destacada na fila" },
    ],
  },
  {
    v: "1.55.0", d: "8 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Indicadores da Visão geral com visual novo" },
    ],
  },
  {
    v: "1.54.0", d: "8 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Indicador de Turnover na Visão geral" },
      { type: "fix", aud: "gestor", title: "Supervisores voltam a ver ocorrências automáticas" },
    ],
  },
  {
    v: "1.53.0", d: "8 jul 2026", items: [
      { type: "fix", title: "Sua foto ao parabenizar no card de aniversário" },
      { type: "fix", aud: "gestor", title: "Ocorrências automáticas atualizam na hora" },
      { type: "fix", aud: "gestor", title: "Resolvidas no mês somam automáticas e manuais" },
    ],
  },
  {
    v: "1.52.4", d: "8 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Card de automática conferida igual ao da manual" },
    ],
  },
  {
    v: "1.52.3", d: "8 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Automática lançada passa para a aba Lançadas" },
    ],
  },
  {
    v: "1.52.2", d: "8 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Batidas na posição certa em toda ocorrência" },
    ],
  },
  {
    v: "1.52.1", d: "8 jul 2026", items: [
      { type: "fix", title: "Quem parabenizou aparece com mini avatares" },
    ],
  },
  {
    v: "1.52.0", d: "8 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Marcar automática confirmada como lançada" },
    ],
  },
  {
    v: "1.51.2", d: "8 jul 2026", items: [
      { type: "fix", title: "Termo de Adesão não reaparece para quem aceitou" },
    ],
  },
  {
    v: "1.51.1", d: "8 jul 2026", items: [
      { type: "fix", title: "Legenda explica o valor colorido do espelho" },
    ],
  },
  {
    v: "1.51.0", d: "8 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Card único do intervalo para batida em dúvida" },
    ],
  },
  {
    v: "1.50.0", d: "7 jul 2026", items: [
      { type: "high", title: "Saldo do banco de horas no valor para folga" },
      { type: "feat", aud: "gestor", title: "Selo Conferir quando a marcação faltante é incerta" },
    ],
  },
  {
    v: "1.49.0", d: "7 jul 2026", items: [
      { type: "note", aud: "gestor", title: "Chat interno desativado e removido" },
    ],
  },
  {
    v: "1.48.3", d: "7 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Card mostra o horário previsto quando falta batida" },
    ],
  },
  {
    v: "1.48.2", d: "7 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Horários na posição certa quando falta batida" },
    ],
  },
  {
    v: "1.48.1", d: "7 jul 2026", items: [
      { type: "fix", title: "Aniversariantes de hoje voltam no computador" },
      { type: "fix", title: "Sair do portal pede confirmação" },
    ],
  },
  {
    v: "1.48.0", d: "7 jul 2026", items: [
      { type: "high", title: "Entrar no app ficou bem mais rápido" },
      { type: "feat", title: "Tela de abertura com a marca e o pulso batendo" },
      { type: "fix", title: "Botões mostram quando estão trabalhando" },
      { type: "feat", aud: "gestor", title: "Selo Compensou no dia na conferência" },
      { type: "fix", aud: "gestor", title: "Botão Nova ocorrência não some mais no celular" },
    ],
  },
  {
    v: "1.47.0", d: "6 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Cor do desvio indica se pesa a favor ou contra" },
    ],
  },
  {
    v: "1.46.0", d: "6 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Batidas do dia lado a lado na conferência" },
    ],
  },
  {
    v: "1.44.0", d: "6 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "GP corrige a ocorrência antes de enviar ao líder" },
    ],
  },
  {
    v: "1.43.0", d: "6 jul 2026", items: [
      { type: "feat", title: "Termo de Adesão à Assinatura Eletrônica no 1º acesso" },
    ],
  },
  {
    v: "1.42.0", d: "6 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Destaque na marcação que gerou a ocorrência" },
    ],
  },
  {
    v: "1.41.0", d: "6 jul 2026", items: [
      { type: "fix", title: "Resposta ao toque melhor no app inteiro" },
      { type: "fix", aud: "gestor", title: "Ações de outras pessoas atualizam ao voltar" },
    ],
  },
  {
    v: "1.40.0", d: "6 jul 2026", items: [
      { type: "fix", title: "Silhueta do painel na abertura no computador" },
    ],
  },
  {
    v: "1.39.0", d: "6 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Selo Resolvida pelo WK sai da fila de conferência" },
    ],
  },
  {
    v: "1.38.0", d: "6 jul 2026", items: [
      { type: "fix", title: "Abertura do app mais visível ao carregar" },
      { type: "fix", aud: "gestor", title: "Aviso ao conferir falta com o dia completo" },
    ],
  },
  {
    v: "1.37.0", d: "5 jul 2026", items: [
      { type: "feat", title: "Parabenizar o aniversariante com um toque" },
    ],
  },
  {
    v: "1.36.0", d: "5 jul 2026", items: [
      { type: "fix", title: "Abertura instantânea, com a animação só na estreia" },
    ],
  },
  {
    v: "1.35.0", d: "5 jul 2026", items: [
      { type: "fix", title: "Login mais rápido e documento sem piscar" },
    ],
  },
  {
    v: "1.34.0", d: "5 jul 2026", items: [
      { type: "feat", title: "Documento assinado vira um PDF único" },
      { type: "feat", aud: "gestor", title: "Documento assinado num arquivo só" },
    ],
  },
  {
    v: "1.33.0", d: "5 jul 2026", items: [
      { type: "feat", title: "Assinatura de documento com local e comprovante" },
      { type: "feat", aud: "gestor", title: "Comprovante de cada assinatura na trilha" },
    ],
  },
  {
    v: "1.32.0", d: "5 jul 2026", items: [
      { type: "feat", title: "Foto ampliada e o que cada documento pede" },
      { type: "feat", aud: "gestor", title: "Nova tela de Auditoria com a trilha do portal" },
    ],
  },
  {
    v: "1.31.0", d: "3 jul 2026", items: [
      { type: "feat", title: "Trocar senha numa tela mais clara" },
      { type: "feat", aud: "gestor", title: "Espelho convida a escolher um liderado" },
    ],
  },
  {
    v: "1.30.0", d: "3 jul 2026", items: [
      { type: "feat", title: "Ajustes no portal do colaborador" },
      { type: "feat", aud: "gestor", title: "Ajustes no portal do gestor" },
      { type: "fix", title: "Acessibilidade dos avisos e data de admissão" },
    ],
  },
  {
    v: "1.29.0", d: "3 jul 2026", items: [
      { type: "fix", title: "Dia em apuração marcado no espelho de ponto" },
    ],
  },
  {
    v: "1.28.0", d: "3 jul 2026", items: [
      { type: "high", title: "Nova tela de abertura, o fio desenha FioPulse" },
      { type: "feat", title: "Você fica conectado por mais tempo" },
    ],
  },
  {
    v: "1.27.0", d: "3 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Segunda leva de polimento no celular" },
      { type: "feat", title: "Selos mais legíveis no portal do colaborador" },
      { type: "fix", title: "Iniciais do avatar iguais em todo o portal" },
    ],
  },
  {
    v: "1.26.1", d: "3 jul 2026", aud: "gestor", items: [
      { type: "fix", title: "Registrar ocorrência à prova de falha silenciosa" },
    ],
  },
  {
    v: "1.26.0", d: "3 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Grande polimento da auditoria" },
      { type: "feat", aud: "gestor", title: "Auditoria mais ajustada no celular" },
      { type: "feat", title: "Telas mais limpas e legíveis nos dois temas" },
      { type: "note", title: "App mais leve de carregar" },
    ],
  },
  {
    v: "1.25.0", d: "3 jul 2026", aud: "gestor", items: [
      { type: "high", title: "Nasceu a Visão geral do portal" },
      { type: "feat", title: "Página de Ocorrências só com o trabalho" },
    ],
  },
  {
    v: "1.24.0", d: "2 jul 2026", aud: "gestor", items: [
      { type: "high", title: "Portal do Gestor no celular com nova cara" },
      { type: "feat", title: "Versão do app num selo ao lado da saudação" },
    ],
  },
  {
    v: "1.23.1", d: "2 jul 2026", items: [
      { type: "high", title: "App mais limpo no celular, com barra de vidro" },
    ],
  },
  {
    v: "1.23.0", d: "2 jul 2026", aud: "gestor", items: [
      { type: "high", title: "Ocorrência automática em duas colunas no desktop" },
      { type: "note", title: "Aviso de sem marcação enquanto as batidas não chegam" },
    ],
  },
  {
    v: "1.22.3", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Foto de cada colaborador na lista de Funcionários" },
      { type: "fix", title: "Fotos enquadradas nos avatares do gestor" },
    ],
  },
  {
    v: "1.22.2", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Dispensar ocorrência automática pede o motivo" },
      { type: "feat", title: "Ocorrência automática abre o detalhe no card" },
    ],
  },
  {
    v: "1.22.1", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Fotos dos colaboradores no Portal do Gestor" },
    ],
  },
  {
    v: "1.22.0", d: "2 jul 2026", items: [
      { type: "high", title: "Visualizador de documentos refeito, com todas as páginas" },
      { type: "fix", aud: "gestor", title: "Ver recibo assinado mais confiável" },
    ],
  },
  {
    v: "1.21.2", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Ocorrência automática com a conferência da manual" },
    ],
  },
  {
    v: "1.21.1", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Espelho do mês num popup no Banco de Horas" },
    ],
  },
  {
    v: "1.21.0", d: "2 jul 2026", items: [
      { type: "high", title: "Chegou a assinatura eletrônica no app" },
      { type: "feat", title: "Assinatura guiada passo a passo" },
      { type: "feat", aud: "gestor", title: "Lote de recibos vira painel de adesão" },
    ],
  },
  {
    v: "1.20.4", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Progresso da importação ganhou vida" },
    ],
  },
  {
    v: "1.20.3", d: "2 jul 2026", aud: "gestor", items: [
      { type: "fix", title: "Gravação do lote aguenta conexão instável" },
      { type: "feat", title: "Aviso ao sair no meio de uma importação" },
    ],
  },
  {
    v: "1.20.2", d: "2 jul 2026", aud: "gestor", items: [
      { type: "fix", title: "Barra de progresso visível ao gerar recibos" },
    ],
  },
  {
    v: "1.20.1", d: "2 jul 2026", aud: "gestor", items: [
      { type: "fix", title: "Gravação do lote blindada contra falhas" },
      { type: "feat", title: "Lote parcial se completa sozinho" },
      { type: "feat", title: "Menores aprendizes identificados na importação" },
    ],
  },
  {
    v: "1.20.0", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Tela de Importar recibos mais moderna" },
      { type: "feat", title: "Identificação mais completa na importação" },
    ],
  },
  {
    v: "1.19.1", d: "2 jul 2026", aud: "gestor", items: [
      { type: "fix", title: "Janelas de importação fecham no X e no Cancelar" },
    ],
  },
  {
    v: "1.19.0", d: "2 jul 2026", items: [
      { type: "high", title: "Atalhos redondos na Home, estilo app de banco" },
      { type: "feat", title: "Barra de baixo mais limpa no celular" },
      { type: "fix", aud: "gestor", title: "Leitura do nome mais tolerante na conferência" },
    ],
  },
  {
    v: "1.18.1", d: "2 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Conferência do import de recibos melhorada" },
    ],
  },
  {
    v: "1.18.0", d: "2 jul 2026", items: [
      { type: "high", title: "Chegou a Folha de pagamento" },
      { type: "feat", title: "Cartão ponto oficial em arquivo no Meu ponto" },
      { type: "feat", aud: "gestor", title: "Nova aba Recibos e cartão ponto em Documentos" },
    ],
  },
  {
    v: "1.17.0", d: "1 jul 2026", items: [
      { type: "high", title: "Home com visual novo e saudação pelo horário" },
      { type: "feat", title: "Coloque a sua foto de perfil na Conta" },
      { type: "feat", title: "Aniversariantes mais leves na Home" },
    ],
  },
  {
    v: "1.16.0", d: "1 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Novo tipo Aviso interno nos Comunicados" },
    ],
  },
  {
    v: "1.15.0", d: "1 jul 2026", items: [
      { type: "high", title: "Documentos institucionais abrem dentro do app" },
    ],
  },
  {
    v: "1.14.0", d: "1 jul 2026", items: [
      { type: "feat", title: "Meu ponto com ocorrências e espelho para você" },
    ],
  },
  {
    v: "1.13.3", d: "30 jun 2026", items: [
      { type: "note", title: "RH e GH agora se chamam GP" },
    ],
  },
  {
    v: "1.13.2", d: "30 jun 2026", items: [
      { type: "high", title: "Avisos contam como vistos ao abrir" },
    ],
  },
  {
    v: "1.13.1", d: "30 jun 2026", items: [
      { type: "feat", title: "Toque no aviso para abrir o post inteiro" },
    ],
  },
  {
    v: "1.13.0", d: "30 jun 2026", aud: "gestor", items: [
      { type: "high", title: "Novo estágio GP confere nas Ocorrências" },
      { type: "feat", title: "Comunicados e Documentos em grade, estilo feed" },
      { type: "note", title: "Quem está em rescisão sinalizado na conferência" },
    ],
  },
  {
    v: "1.12.0", d: "24 jun 2026", items: [
      { type: "high", title: "Escolha de portal ao abrir o sistema" },
      { type: "feat", title: "Prévia do Portal do Colaborador" },
    ],
  },
  {
    v: "1.11.0", d: "18 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Toques premium nas abas e nos números" },
      { type: "feat", title: "Vibração e topbar com sombra no celular" },
    ],
  },
  {
    v: "1.10.0", d: "18 jun 2026", aud: "gestor", items: [
      { type: "high", title: "Novo checklist de Obrigações do GP" },
      { type: "feat", title: "Card do que vence, pende e atrasa no mês" },
    ],
  },
  {
    v: "1.9.1", d: "17 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Badge e filtro de Menor Aprendiz" },
      { type: "note", title: "Aprendizes fora do banco de horas e do ranking" },
    ],
  },
  {
    v: "1.9.0", d: "17 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Marcação própria para afastados e diretores" },
      { type: "note", title: "Diretores e afastados fora do ranking" },
    ],
  },
  {
    v: "1.8.2", d: "13 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Chat com envio na hora e cores da marca" },
      { type: "fix", title: "Realce do mouse nas listas corrigido" },
    ],
  },
  {
    v: "1.8.1", d: "13 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Ranking dos 10 de casa mais antiga" },
    ],
  },
  {
    v: "1.8.0", d: "13 jun 2026", aud: "gestor", items: [
      { type: "high", title: "Chat mais rápido, sem perder a rolagem" },
      { type: "fix", title: "Correções no chat" },
      { type: "feat", title: "Chat mais acessível" },
    ],
  },
  {
    v: "1.7.0", d: "13 jun 2026", aud: "gestor", items: [
      { type: "high", title: "Auditoria de design: contraste e foco melhores" },
      { type: "feat", title: "Conferidas viram Resolvidas no dashboard" },
      { type: "feat", title: "Hierarquia mais clara nos números" },
      { type: "feat", title: "Micro-interações nos avisos e transições" },
      { type: "high", title: "Rede de segurança ao lançar e ao importar" },
    ],
  },
  {
    v: "1.6.2", d: "10 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Carregamento elegante na primeira visita" },
    ],
  },
  {
    v: "1.6.1", d: "10 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Erro de formulário aparece no próprio campo" },
      { type: "feat", title: "Listas navegáveis pelo teclado" },
    ],
  },
  {
    v: "1.6.0", d: "10 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Toques de UX ao carregar e ao lançar" },
    ],
  },
  {
    v: "1.5.0", d: "1 jun 2026", aud: "gestor", items: [
      { type: "high", title: "Nova tela de abertura com a marca da Fiobras" },
    ],
  },
  {
    v: "1.4.0", d: "1 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Permissões editáveis por papel" },
    ],
  },
  {
    v: "1.3.0", d: "1 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Novo painel de Permissões por papel" },
    ],
  },
  {
    v: "1.2.0", d: "1 jun 2026", aud: "gestor", items: [
      { type: "high", title: "Leitura de contrato repaginada" },
      { type: "feat", title: "Extração reconhece CPF além de CNPJ" },
    ],
  },
  {
    v: "1.1.0", d: "29 mai 2026", aud: "gestor", items: [
      { type: "fix", title: "Usabilidade ajustada para o celular" },
      { type: "feat", title: "Toque e segure para reagir no chat" },
    ],
  },
  {
    v: "1.0.0", d: "29 mai 2026", aud: "gestor", items: [
      { type: "feat", title: "Chat novo, com reações e confirmação de leitura" },
      { type: "feat", title: "Auditoria: linha do tempo das ações" },
      { type: "high", title: "Visual minimalista e identidade FioPulse" },
    ],
  },
  {
    v: "0.9.0", d: "26 mai 2026", aud: "gestor", items: [
      { type: "feat", title: "Banco de horas com gráfico do mês no perfil" },
      { type: "feat", title: "Controle PJ: contrato e aditivos juntos" },
      { type: "fix", title: "Login mais rápido e sem piscar" },
    ],
  },
];
