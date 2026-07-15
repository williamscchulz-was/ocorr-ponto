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
    v: "1.82.0", d: "16 jul 2026", current: true, items: [
      { type: "feat", aud: "gestor", title: "Expurgo automatico LGPD: candidaturas de vagas encerradas ha mais de 6 meses (cadastro e curriculo) sao apagadas sozinhas, com registro na auditoria. A vaga fica no historico; o dado pessoal do candidato sai." },
    ],
  },
  {
    v: "1.81.1", d: "16 jul 2026", items: [
      { type: "fix", title: "A bolinha de pendencia do Meu ponto e do Pagamento contava documentos que voce ja tinha assinado (dependia do aparelho lembrar que voce viu). Assinado nunca mais aparece como pendente, em nenhum aparelho." },
    ],
  },
  {
    v: "1.81.0", d: "16 jul 2026", items: [
      { type: "feat", title: "Sua sequencia de dias no app agora aparece no card de pontos da home: cinco pontinhos que vao enchendo a cada dia seguido. Completou os cinco, ficam dourados e o premio cai na conta." },
    ],
  },
  {
    v: "1.80.0", d: "16 jul 2026", items: [
      { type: "high", title: "Espelho de ponto: dia sem batida agora mostra o motivo real (ferias, licencas, falta abonada, falta injustificada e outros), no portal do colaborador e do gestor. Transparencia sobre o seu proprio dado." },
      { type: "feat", aud: "gestor", title: "Vagas: a candidatura do site virou FICHA COMPLETA (dados pessoais, ate 3 experiencias, pretensao salarial, transporte e indicacao) com o botao Ver ficha completa na tela Vagas." },
      { type: "feat", aud: "gestor", title: "Beneficios por vaga: catalogo proprio na nova sub-aba Beneficios (cadastra uma vez, marca por vaga) e os selos aparecem no site pro candidato." },
    ],
  },
  {
    v: "1.79.0", d: "16 jul 2026", items: [
      { type: "feat", title: "Mural mais esperto: depois que voce da as boas-vindas a um colega, o convite se despede da sua home com uma animacao suave. Ele continua aparecendo so pra quem ainda nao deu." },
    ],
  },
  {
    v: "1.78.0", d: "16 jul 2026", items: [
      { type: "high", title: "O app agora abre sempre na escolha de portal: toque no seu e, com a sessao salva, voce entra direto, sem digitar nada. E da pra trocar de portal por um atalho na sua conta, nos dois portais." },
      { type: "feat", title: "Atualizacao transparente: quando chega uma versao nova, o app avisa que esta atualizando, mostra a barra de progresso e recarrega sozinho ja no novo." },
    ],
  },
  {
    v: "1.77.0", d: "15 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Vagas: as candidaturas agora chegam com perfil comportamental (barras D I S C, selo e leitura pronta), idade e curriculo aberto dentro do app. Excluir uma candidatura tambem expurga o curriculo do cofre." },
      { type: "feat", title: "Espelho de ponto: dia com falta abonada agora aparece nomeado, em vez do generico Sem marcacao, no portal do colaborador e do gestor." },
    ],
  },
  {
    v: "1.76.0", d: "15 jul 2026", items: [
      { type: "high", title: "Voce nao precisa mais logar toda vez: o portal do colaborador agora mantem voce conectado sempre. Um login e pronto, o app abre direto." },
      { type: "high", title: "Momentos que importam ganharam celebracao: assinar recibo ou documento, aceitar o termo, responder pesquisa e, o melhor, CRUZAR UM MARCO de pontos agora tem a confirmacao cerimonial com o anel dourado." },
      { type: "feat", title: "No Android, o app agora oferece salvar sua senha no cofre do celular e entrar com um toque. No iPhone, o teclado oferece a senha salva com Face ID." },
    ],
  },
  {
    v: "1.75.0", d: "15 jul 2026", items: [
      { type: "high", title: "Os paineis do celular ganharam fisica de verdade: sobem com mola, seguem o seu dedo quando voce arrasta pela alca, e decidem sozinhos se fecham ou voltam. Igualzinho aos apps que voce ja ama." },
    ],
  },
  {
    v: "1.74.0", d: "15 jul 2026", items: [
      { type: "high", title: "Home repaginada: o saldo do banco de horas agora vive num selo elegante junto do seu nome (toque nele pra abrir o Meu ponto) e os seus pontos da temporada ganharam o palco, num card mais enxuto. Menos poluicao, mesma informacao." },
    ],
  },
  {
    v: "1.73.0", d: "15 jul 2026", items: [
      { type: "high", title: "Parabenizar um aniversariante e dar boas-vindas a quem chegou agora VALEM PONTO na temporada. Quem ja curtiu este ano recebe o retroativo sozinho ao abrir Conquistas." },
      { type: "fix", title: "iPhone: consertado o defeito que deslocava a tela e a barra de navegacao ao trocar de tela com a pagina rolada. E a tela nao estica mais alem do limite ao puxar." },
      { type: "fix", title: "Canal de denuncia: o cabecalho agora vai ate as bordas no celular, como o resto do app. E a home ficou mais limpa: Novidades vive no atalho redondo do hub." },
    ],
  },
  {
    v: "1.72.0", d: "15 jul 2026", items: [
      { type: "high", title: "Canal de denuncia no ar: um espaco seguro pra relatar assedio, discriminacao, violencia, problema de seguranca ou fraude, direto pra direcao da empresa. Anonimo por padrao (nem o sistema guarda quem enviou), com codigo de integridade que prova que o relato nunca foi alterado. Previsto na Lei 14.457/2022." },
    ],
  },
  {
    v: "1.71.0", d: "15 jul 2026", items: [
      { type: "high", title: "Navegar ficou suave: as telas agora se encaixam com transicao continua em vez de trocar no corte seco, e na home o seu avatar viaja junto ate a tela Conta. Em quem prefere menos movimento, tudo continua instantaneo." },
    ],
  },
  {
    v: "1.70.1", d: "15 jul 2026", items: [
      { type: "note", title: "Motor de tela reconstruido por dentro: o app so redesenha o que realmente mudou. Mais leve no celular, e o que voce esta digitando nunca se perde quando algo atualiza sozinho." },
    ],
  },
  {
    v: "1.70.0", d: "15 jul 2026", aud: "gestor", items: [
      { type: "feat", title: "Vagas: o site ganha um botao flutuante de WhatsApp direto pra GP assim que o numero for cadastrado na tela Vagas. E vaga encerrada com candidaturas agora tem a limpeza LGPD num toque (excluir todas)." },
      { type: "fix", title: "Visao geral: o card Chegaram ha pouco agora considera os ultimos 15 dias, a mesma janela do portal do colaborador." },
    ],
  },
  {
    v: "1.69.2", d: "14 jul 2026", items: [
      { type: "fix", title: "Acabamento fino nas transicoes: a barrinha das abas, a entrada em cascata das listas e o fio da tela Novidades nao piscam mais quando a tela atualiza sozinha. Toda tela do app agora passa por uma verificacao automatica de estabilidade antes de cada versao." },
    ],
  },
  {
    v: "1.69.1", d: "14 jul 2026", items: [
      { type: "fix", title: "Fim do pisca-pisca: a curtida de boas-vindas, o coracao de aniversario e as contagens nao somem mais por um instante quando o app volta do segundo plano ou atualiza sozinho." },
    ],
  },
  {
    v: "1.69.0", d: "14 jul 2026", aud: "gestor", items: [
      { type: "high", title: "Vagas: o candidato agora preenche um formulario no proprio site (nome, telefone, email e mensagem), sem WhatsApp. As candidaturas aparecem na tela Vagas, com contagem por vaga e exclusao (LGPD)." },
      { type: "feat", title: "Vagas: turno virou seletor (1º, 2º, 3º ou Geral), o campo tipo saiu, e vaga encerrada pode ser excluida (as candidaturas dela precisam ser excluidas antes)." },
    ],
  },
  {
    v: "1.68.1", d: "14 jul 2026", items: [
      { type: "fix", title: "O saldo por dia do espelho agora mostra o valor original pra folga (sem o multiplicador da situacao), igual ao saldo atual. Vale no Meu ponto e no espelho do gestor." },
      { type: "fix", title: "Conquistas: barra de carregamento na primeira abertura, e a maozinha de boas-vindas foi redesenhada." },
      { type: "fix", aud: "gestor", title: "Menu lateral: com muitos itens ele agora rola por dentro, sem empurrar o seu avatar pra fora. E a tela Vagas ganhou icone proprio." },
    ],
  },
  {
    v: "1.68.0", d: "14 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Portal de Vagas no ar: a GP publica vagas na tela nova Vagas e elas aparecem na hora no site aberto vagas.fiobras.com.br, com candidatura direto no WhatsApp da GP. Nenhum dado de candidato entra no sistema." },
    ],
  },
  {
    v: "1.67.0", d: "14 jul 2026", items: [
      { type: "high", title: "Sequencia de dias: entrar no app todo dia agora vale ponto a cada 5 dias seguidos. Transparencia: o registro da sua presenca e visivel so pra voce e pra GP, e nunca e usado pra outra coisa." },
      { type: "feat", title: "O ranking agora mostra a foto de todo mundo no podio (uso de imagem autorizado por todos). E as medalhas de tempo de casa vao ate 30 anos, com as suas conquistas separadas das que estao em andamento." },
      { type: "feat", title: "Medalhas de coracao e de boas-vindas redesenhadas, com mais capricho." },
      { type: "med", aud: "gestor", title: "Menu lateral organizado em grupos (Ponto, Equipe, Comunicacao, Sistema) e, no modo recolhido, o nome do item aparece ao passar o mouse. O X da busca tambem foi alinhado." },
    ],
  },
  {
    v: "1.66.0", d: "14 jul 2026", items: [
      { type: "feat", title: "Adicionar a sua propria foto de perfil agora vale ponto na temporada (uma vez por ano). E a sua foto aparece com o aro no seu perfil de Conquistas e no ranking." },
      { type: "fix", title: "Pontos retroativos mais confiaveis: a tela Conquistas re-verifica seus creditos a cada abertura (e nao so na primeira), inclusive quando a GP muda os valores no meio do caminho." },
    ],
  },
  {
    v: "1.65.2", d: "14 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Autoavaliacao de desempenho saiu das acoes pontuaveis da Gamificacao (decisao GP): avaliacao nao e corrida por pontos." },
    ],
  },
  {
    v: "1.65.1", d: "14 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Tela Gamificacao no visual padrao do painel: cards, tabelas e campos alinhados (a primeira versao subiu sem estilo)." },
    ],
  },
  {
    v: "1.65.0", d: "14 jul 2026", items: [
      { type: "high", title: "Chegaram as Conquistas: o que voce faz no portal agora vale pontos. Assinar cartao ponto e folha, dar ciencia em comunicados e documentos, responder pesquisas e concluir a autoavaliacao somam na temporada do ano, com marcos que dao premios SURPRESA. Veja seus pontos, o top 10 e suas medalhas no novo item Conquistas." },
      { type: "feat", title: "A aba Conta da barra de navegacao agora mostra a sua foto (ou iniciais) com o aro equipado, do jeito que voce conhece do WhatsApp." },
      { type: "feat", title: "Decoracao do avatar: cruzou marcos, ganhou aros (bronze, prata, ouro e o aro FioPulse). Escolha o seu na aba Badges. O numero 1 do ranking usa a coroa de Rei dos pontos enquanto reinar." },
      { type: "feat", aud: "gestor", title: "Nova tela Gamificacao (GP): configura os pontos por acao, os marcos e os premios de cada um (o colaborador nao ve a lista, e surpresa), ativa a temporada e registra as entregas na fila de premiacao." },
    ],
  },
  {
    v: "1.64.1", d: "10 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Os cards Resolvido no Banco de Horas tambem podem ser dispensados: junto do Conferir, a GP tem o botao Dispensar com motivo, pra quando o caso nao precisa de nenhuma acao." },
    ],
  },
  {
    v: "1.64.0", d: "10 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Demografia da empresa e Ranking de tempo de casa redesenhados: numeros grandes pra idade media e tempo de casa, barra de distribuicao por sexo com legenda, escolaridade e naturalidade com barras proporcionais, e o ranking com posicoes em destaque (top 3 realcado)." },
    ],
  },
  {
    v: "1.63.0", d: "10 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Os casos do Turno Geral e de líderes que o sistema resolve sozinho no Banco de Horas agora aparecem na aba GP confere, com o selo Resolvido no Banco de Horas. A GP clica Conferir, a ação já vem sugerida (Banco de Horas Geral), confirma e lança, sem passar pelo líder. Antes esses casos eram descartados em silêncio." },
    ],
  },
  {
    v: "1.62.0", d: "9 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Excluir uma ocorrência não apaga mais o registro: ele vai pra nova aba Excluídas, com data da exclusão, e pode ser restaurado. O conteúdo fica guardado pra auditoria em vez de sumir do histórico." },
    ],
  },
  {
    v: "1.61.0", d: "9 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Avaliação de desempenho completa na aba Avaliações. A GP monta o ciclo (competências com peso, quem avalia e quem participa) e cada líder avalia as pessoas do próprio time, com nota por competência e feedback. Dá pra salvar rascunho e concluir quando estiver pronto." },
      { type: "feat", aud: "colab", title: "Quando um ciclo de avaliação incluir autoavaliação, o convite aparece no seu início: você se avalia nas mesmas competências que o seu gestor. Quando o ciclo encerra, você vê o resultado completo, lado a lado com a sua autoavaliação e com o feedback do gestor." },
    ],
  },
  {
    v: "1.60.0", d: "9 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Dar as boas-vindas: no card Chegaram há pouco da Visão geral, cada recém-contratado ganhou um botão de mão levantada pra receber as boas-vindas dos colegas, no mesmo espírito do coração de aniversário." },
    ],
  },
  {
    v: "1.59.2", d: "9 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Visão geral mais alinhada: Aniversariantes e Chegaram há pouco agora ficam da mesma altura lado a lado, e Demografia e Ranking de tempo de casa viraram cards abertos em par, sem precisar expandir." },
    ],
  },
  {
    v: "1.59.1", d: "9 jul 2026", items: [
      { type: "fix", aud: "colab", title: "Coração de aniversário: dar o coração de novo num post que você já curtiu não dá mais erro. Antes, em rede de celular instável, a segunda tentativa falhava com aviso; agora é tratada como sucesso." },
      { type: "med", title: "Abertura mais rápida no celular: o app adianta o carregamento das bibliotecas e, quando a rede está lenta, não fica mais preso esperando ela (usa em segundos o que já está salvo)." },
      { type: "med", title: "Tato mais refinado nos botões e no interruptor, dentro de uma linguagem de movimento única no app." },
    ],
  },
  {
    v: "1.59.0", d: "9 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Nova aba Avaliações com a Pesquisa de clima. Monte a pesquisa (dimensões, perguntas e tipo de resposta, anônima ou identificada, eNPS e comentário), publique para o público que escolher e acompanhe os resultados agregados por dimensão, o eNPS e os comentários. Numa pesquisa anônima o resultado só aparece com no mínimo 5 respostas e após encerrar." },
      { type: "feat", aud: "colab", title: "Quando o RH abre uma pesquisa de clima do seu segmento, ela aparece no seu início para responder. Numa pesquisa anônima, suas respostas são gravadas sem nome, sem código e sem horário; o RH só vê o resultado em grupo." },
    ],
  },
  {
    v: "1.58.4", d: "9 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Corrigido o resto do pisca: ao trocar de aba, o cabeçalho e os indicadores começavam invisíveis e faziam um fade a cada troca. Removida essa animação de entrada; agora as telas aparecem na hora, sem piscar." },
    ],
  },
  {
    v: "1.58.3", d: "9 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Corrigido o flicker em que textos (a saudação, os indicadores) sumiam e voltavam por um instante sem recarregar. Os re-renders da tela agora são agrupados num só por quadro, então a rajada de atualizações do boot não repinta a tela várias vezes." },
    ],
  },
  {
    v: "1.58.2", d: "9 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Ocorrência automática que a GP já revisou e ajustou não mostra mais o aviso \"Conferir\" pro líder. O alerta de incerteza do sistema some depois que um humano examinou; o motivo original fica registrado no histórico." },
    ],
  },
  {
    v: "1.58.1", d: "8 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Ajustes na Visão geral: o turnover passou a usar a fórmula clássica de RH (média de admitidos e demitidos sobre o quadro), o card de Saldo de horas saiu (ele já vive no Banco de horas) e o rótulo redundante das resolvidas foi removido." },
    ],
  },
  {
    v: "1.58.0", d: "8 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Padrão único de indicadores no app inteiro: os cards limpos da Visão geral e da Auditoria agora valem também em Funcionários, Banco de horas, Disciplinar e Comunicados." },
      { type: "med", aud: "gestor", title: "O Portal do Gestor volta a abrir sempre na Visão geral." },
    ],
  },
  {
    v: "1.57.1", d: "8 jul 2026", items: [
      { type: "med", aud: "gestor", title: "O indicador de Turnover agora mostra as duas pontas do mês: contratações e desligamentos." },
    ],
  },
  {
    v: "1.57.0", d: "8 jul 2026", items: [
      { type: "high", aud: "gestor", title: "A Visão geral ficou mais limpa e alinhada. Os indicadores adotaram um padrão único com número grande e comparação com o mês anterior. O \"Precisa de você\" virou um bloco de ação em destaque. Os aniversariantes ganharam o rosto de quem faz aniversário no dia. Demografia e Ranking abrem em acordeão sem desalinhar. Saíram o gráfico mensal (a comparação foi pros indicadores) e a lista de atividade recente." },
    ],
  },
  {
    v: "1.56.0", d: "8 jul 2026", items: [
      { type: "high", aud: "gestor", title: "O Portal do Gestor ganhou tema escuro. Escolha em Minha conta, seção Aparência: Automático (segue o seu sistema), Claro ou Escuro. A preferência fica salva neste aparelho." },
    ],
  },
  {
    v: "1.55.1", d: "8 jul 2026", items: [
      { type: "med", aud: "gestor", title: "Na fila de conferência, a etiqueta \"Conferir\" ficou mais destacada (selo âmbar com ícone de alerta) e o texto do motivo saiu da linha; ele continua no detalhe da ocorrência." },
    ],
  },
  {
    v: "1.55.0", d: "8 jul 2026", items: [
      { type: "high", aud: "gestor", title: "Os indicadores da Visão geral ganharam um visual novo: cards soltos com ícone, o de conferir em destaque verde, e um mini gráfico dos últimos 6 meses nos que têm histórico (quadro de pessoas, resolvidas e turnover)." },
    ],
  },
  {
    v: "1.54.0", d: "8 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "A Visão geral ganhou um indicador de Turnover (rotatividade) no mês, com o anualizado e a contagem de desligamentos, calculado com admissões e demissões." },
      { type: "fix", aud: "gestor", title: "Os supervisores voltam a enxergar as ocorrências automáticas dos funcionários que supervisionam e podem confirmá-las, igual acontece com as manuais. Antes o papel de supervisor ficava sem ver nenhuma." },
    ],
  },
  {
    v: "1.53.0", d: "8 jul 2026", items: [
      { type: "fix", title: "No card de aniversário, quando você parabeniza aparece a sua foto de perfil, e os colegas aparecem pelas iniciais." },
      { type: "fix", aud: "gestor", title: "As ocorrências automáticas agora atualizam na hora, sem precisar recarregar a tela: uma conferência, um lançamento ou uma ocorrência nova aparece sozinha, igual já acontecia com as manuais." },
      { type: "fix", aud: "gestor", title: "O total de Resolvidas no mês passou a somar as ocorrências automáticas junto com as manuais, no mesmo número." },
    ],
  },
  {
    v: "1.52.4", d: "8 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Na lista de ocorrências, o card das automáticas já conferidas ficou igual ao das manuais: uma etiqueta só (a ação, ou Lançada com a ação) e a seta pra abrir, com o botão Lançar direto na confirmada. Antes empilhava dois selos e uma linha com quem fez, que agora aparece na trilha ao abrir." },
    ],
  },
  {
    v: "1.52.3", d: "8 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Uma ocorrência automática marcada como lançada agora sai da aba Conferidas e passa pra aba Lançadas, com as contagens das abas certas, do mesmo jeito que já acontecia com as manuais." },
    ],
  },
  {
    v: "1.52.2", d: "8 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "O pareamento correto das batidas (cada horário na posição certa da jornada) agora vale pra toda ocorrência que traz o alinhamento da apuração, não só as detectadas pelo espelho. Corrige casos de falta parcial que mostravam os horários deslocados." },
    ],
  },
  {
    v: "1.52.1", d: "8 jul 2026", items: [
      { type: "fix", title: "No card de aniversário, quem parabenizou agora aparece como mini avatares com as iniciais, em vez de bolinhas vazias." },
    ],
  },
  {
    v: "1.52.0", d: "8 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Ocorrências automáticas confirmadas agora podem ser marcadas como lançadas na folha, igual às manuais: botão Marcar como lançada no detalhe (GP e admin), selo Lançada no card, desfazer com confirmação e registro na trilha." },
    ],
  },
  {
    v: "1.51.2", d: "8 jul 2026", items: [
      { type: "fix", title: "O Termo de Adesão não aparece mais de novo pra quem já aceitou. Ao abrir o app no celular, uma falha passageira de rede fazia o aceite não ser encontrado e o termo voltava a cada acesso; agora a leitura insiste e, se o termo abrir por engano, ele se fecha sozinho ao confirmar o aceite." },
    ],
  },
  {
    v: "1.51.1", d: "8 jul 2026", items: [
      { type: "fix", title: "No espelho de ponto, uma legenda agora explica o valor colorido de cada dia: é o saldo acumulado até aquele dia. Antes a explicação só aparecia parando o mouse em cima, o que não existe no celular." },
    ],
  },
  {
    v: "1.51.0", d: "8 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Quando uma batida fica em dúvida entre dois horários vizinhos (ex.: saída e volta do almoço), a jornada agora mostra um card único do intervalo com os dois horários esperados e a batida real, em vez de esconder a batida em dois \"sem batida\"." },
    ],
  },
  {
    v: "1.50.0", d: "7 jul 2026", items: [
      { type: "high", title: "O saldo do banco de horas agora mostra o valor pra FOLGA (hora por hora, sem o percentual das horas extras). O valor com adicionais, que vale quando é pago em folha, aparece como informação secundária no perfil do funcionário." },
      { type: "feat", aud: "gestor", title: "Ocorrências em que o sistema não confirmou qual marcação faltou agora chegam na fila com o selo Conferir e o motivo escrito no card, em vez de serem descartadas em silêncio. O detalhe avisa que as posições da jornada podem não corresponder." },
    ],
  },
  {
    v: "1.49.0", d: "7 jul 2026", items: [
      { type: "note", aud: "gestor", title: "O chat interno foi desativado e removido do app. A comunicação com a equipe segue pelos Comunicados e Avisos." },
    ],
  },
  {
    v: "1.48.3", d: "7 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Na lista de ocorrências, quando a marcação que gerou a ocorrência ficou sem batida (ex.: não registrou a entrada), o horário do card mostra o previsto rotulado (prev. 13:30) em vez de uma batida de outra marcação do dia." },
    ],
  },
  {
    v: "1.48.2", d: "7 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Na conferência de ocorrências automáticas, quando faltou uma batida (ex.: não registrou a entrada), os horários aparecem na posição certa: a que faltou fica marcada como sem batida e as demais não deslocam mais, o que antes podia mostrar uma falta na saída final que na verdade bateu certo." },
    ],
  },
  {
    v: "1.48.1", d: "7 jul 2026", items: [
      { type: "fix", title: "No computador, os aniversariantes do mês voltam a mostrar quem faz aniversário hoje, com o coração pra parabenizar, ao lado da lista do mês." },
      { type: "fix", title: "Sair do portal agora pede uma confirmação rápida, pra ninguém sair sem querer." },
    ],
  },
  {
    v: "1.48.0", d: "7 jul 2026", items: [
      { type: "high", title: "Entrar no app ficou bem mais rápido: o carregamento busca as informações de uma vez em vez de na fila, e a tela abre sem esperar a lista de ocorrências, que preenche sozinha em seguida." },
      { type: "feat", title: "A tela de abertura trocou os blocos cinza pela marca com a linha de pulso batendo enquanto o app carrega." },
      { type: "fix", title: "Botões que gravam ou excluem agora mostram que estão trabalhando (indicador girando e texto), inclusive excluir documento, excluir registro disciplinar e trocar a foto." },
      { type: "feat", aud: "gestor", title: "Na conferência, quando a pessoa compensou o desvio no próprio dia, aparece o selo verde Compensou no dia, com quanto trabalhou de quanto era previsto." },
      { type: "fix", aud: "gestor", title: "No celular, o botão Nova ocorrência não some mais ao chegar na tela depois de ter rolado a página, e retoques de contraste e leitura em todo o app." },
    ],
  },
  {
    v: "1.47.0", d: "6 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Nos desvios de cada batida, a cor agora indica o sinal, na mesma linguagem do saldo: vermelho quando pesa contra (atraso, saída antecipada, pausa mais longa), verde quando é a favor (chegou antes, saiu depois), cinza dentro da tolerância." },
    ],
  },
  {
    v: "1.46.0", d: "6 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Na conferência de ocorrências automáticas, as batidas do dia agora aparecem lado a lado (previsto e batido), cada uma com o seu desvio, e a que gerou a ocorrência fica destacada. Antes só dava pra ver a primeira batida, mesmo quando o problema estava em outra, como uma volta de almoço mais longa." },
    ],
  },
  {
    v: "1.44.0", d: "6 jul 2026", items: [
      { type: "feat", aud: "gestor", title: "Na conferência de ocorrências automáticas, a GP agora pode corrigir uma ocorrência antes de enviar ao líder: reclassificar o tipo e ajustar a duração do desvio. A correção vai junto do envio e fica registrada na trilha, com o que mudou e o motivo." },
    ],
  },
  {
    v: "1.43.0", d: "6 jul 2026", items: [
      { type: "feat", title: "No primeiro acesso, depois de criar a sua senha, você lê e dá o aceite no Termo de Adesão à Assinatura Eletrônica, com o seu nome e CPF já preenchidos. É rápido, aparece só uma vez, e é o que dá validade jurídica às suas assinaturas no app." },
    ],
  },
  {
    v: "1.42.0", d: "6 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Na conferência de ocorrências automáticas, o horário em destaque passou a ser o da marcação que gerou a ocorrência (a saída, numa saída antecipada; a entrada, num atraso), em vez de mostrar sempre a primeira batida do dia." },
    ],
  },
  {
    v: "1.41.0", d: "6 jul 2026", items: [
      { type: "fix", title: "A resposta ao toque ficou melhor no app inteiro. Quando você clica em algo que carrega, ver um recibo, abrir um documento, o botão mostra na hora que está trabalhando, então não parece mais que travou, e não dá mais pra registrar duas vezes sem querer por clique repetido." },
      { type: "fix", aud: "gestor", title: "O que outra pessoa faz aparece atualizado ao voltar na tela, sem precisar recarregar. Por exemplo, quando um colaborador assina um recibo, a contagem de assinaturas se atualiza sozinha." },
    ],
  },
  {
    v: "1.40.0", d: "6 jul 2026", items: [
      { type: "fix", title: "No computador, a tela de abertura agora mostra a silhueta do painel (barra lateral e cards) enquanto carrega, em vez do cartão estreito do celular perdido no meio da tela." },
    ],
  },
  {
    v: "1.39.0", d: "6 jul 2026", items: [
      { type: "fix", aud: "gestor", title: "Ocorrências automáticas que o relógio de ponto corrige sozinho (ex.: uma falta que virou nada quando o dia fechou) agora saem da fila de conferência com o selo 'Resolvida pelo WK', em vez de ficar pendurada como pendência falsa. Aparece na aba Todas pra auditoria." },
    ],
  },
  {
    v: "1.38.0", d: "6 jul 2026", items: [
      { type: "fix", title: "A abertura do app ficou mais visível: o esboço da tela aparece direito com um 'Carregando' enquanto os dados chegam, não parece mais travado." },
      { type: "fix", aud: "gestor", title: "Na conferência de ocorrências automáticas, quando é uma falta mas o dia tem batidas completas, aparece um aviso pra conferir o espelho antes de confirmar, evitando confirmar uma falta falsa gerada pelo relógio de ponto." },
    ],
  },
  {
    v: "1.37.0", d: "5 jul 2026", items: [
      { type: "feat", title: "No aniversário de um colega, agora dá pra parabenizar com um toque no coração, ali no card mesmo, e você vê quantos já parabenizaram. No seu aniversário, você vê quantos colegas já te desejaram feliz aniversário." },
    ],
  },
  {
    v: "1.36.0", d: "5 jul 2026", items: [
      { type: "fix", title: "A abertura do app ficou instantânea. Em vez de segurar a animação, aparece um esboço da tela que preenche assim que carrega, no espírito de abrir um app da Apple. A animação do fio escrevendo FioPulse agora roda só na estreia, no primeiro acesso do aparelho." },
    ],
  },
  {
    v: "1.35.0", d: "5 jul 2026", items: [
      { type: "fix", title: "O login ficou bem mais rápido e mostra um indicador girando enquanto entra, em vez de parecer travado. E abrir um documento não pisca mais na tela: aparece um carregando e o arquivo entra suave." },
    ],
  },
  {
    v: "1.34.0", d: "5 jul 2026", items: [
      { type: "feat", title: "O documento que você assina agora vira um PDF único: o conteúdo assinado mais uma página de autenticação no fim, com seu nome, data, local e o código de integridade. As páginas ficam numeradas, mais fácil de guardar e mais forte como prova." },
      { type: "feat", aud: "gestor", title: "O documento assinado passou a ser um arquivo só, no padrão dos serviços de assinatura eletrônica: conteúdo original mais página de autenticação com a trilha, numeração de páginas e o original embutido pra conferência de integridade." },
    ],
  },
  {
    v: "1.33.0", d: "5 jul 2026", items: [
      { type: "feat", title: "Ao assinar um documento que pede assinatura eletrônica, fica registrado com a sua localização e um comprovante em PDF, com a mesma validade da assinatura dos recibos. Você pode abrir o comprovante quando quiser." },
      { type: "feat", aud: "gestor", title: "Na trilha de quem confirmou um documento, dá pra abrir o comprovante de cada assinatura, com local e o código de integridade do arquivo." },
    ],
  },
  {
    v: "1.32.0", d: "5 jul 2026", items: [
      { type: "feat", title: "Toque na foto de qualquer pessoa pra ver ela ampliada, e cada documento mostra se você só precisa ler, confirmar leitura ou assinar." },
      { type: "feat", aud: "gestor", title: "Nova tela de Auditoria com a trilha de tudo que acontece no portal (login, leitura, assinatura, conferência, alteração). Ao publicar um documento você escolhe se o colaborador só lê, dá um aceite, ou assina. E os formulários de cadastro no computador ficaram em duas colunas, mais rápidos de preencher." },
    ],
  },
  {
    v: "1.31.0", d: "3 jul 2026", items: [
      { type: "feat", title: "No portal do colaborador: trocar senha virou uma tela mais clara e bonita, e no computador o conteúdo passou a ficar num tamanho confortável em vez de esticar na largura toda." },
      { type: "feat", aud: "gestor", title: "No Espelho de ponto, quando ninguém está selecionado a tela convida a escolher um liderado em vez de mostrar um painel vazio, e só fala de permissão quando é falta de permissão de verdade. A busca ficou igual nas telas de Funcionários, Banco de horas e Espelho." },
    ],
  },
  {
    v: "1.30.0", d: "3 jul 2026", items: [
      { type: "feat", title: "No portal do colaborador: o tipo de cada documento aparece com nome legível, o aviso não lido agora também aparece no computador, o saldo do banco de horas na Conta não repete mais, e as Novidades ficaram em linguagem mais clara." },
      { type: "feat", aud: "gestor", title: "No portal do gestor: a contagem de ativos do banco de horas passou a bater com a lista (sem diretoria e aprendizes), a tela de advertências usa uma cor mais séria nos alertas, e o botão de excluir do perfil ficou mais discreto pra não ser clicado sem querer." },
      { type: "fix", title: "Acessibilidade dos avisos em tela melhorada e a data de admissão passou a exibir certo em qualquer formato." },
    ],
  },
  {
    v: "1.29.0", d: "3 jul 2026", items: [
      { type: "fix", title: "No espelho de ponto, um dia que a apuração ainda pode ajustar não confunde mais: pro colaborador ele só aparece depois de fechar, e pro gestor aparece marcado como em apuração." },
    ],
  },
  {
    v: "1.28.0", d: "3 jul 2026", items: [
      { type: "high", title: "Nova tela de abertura: na primeira vez que você abre o app no dia, um cone de fio desenha o nome FioPulse. Nas próximas aberturas do mesmo dia o app abre direto." },
      { type: "feat", title: "Ajustes pra manter você conectado por mais tempo entre aberturas, pra digitar a senha com menos frequência (no iPhone o sistema ainda pode pedir login de vez em quando)." },
    ],
  },
  {
    v: "1.27.0", d: "3 jul 2026", items: [
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
      { type: "high", title: "Novo: ao abrir o sistema você escolhe \"Portal do Colaborador\" ou \"Portal do Gestor/Administrador\". O acesso do gestor continua igual, só ganhou um toque a mais." },
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
      { type: "high", title: "Novo: Obrigações do GP: checklist das rotinas (fechar folha, banco de horas, eSocial, pagar PJ…) que zera sozinha a cada mês/ano." },
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
      { type: "fix", title: "Corrigido o realce ao passar o mouse nas listas, tinha sumido por um token de cor quebrado." },
    ],
  },
  {
    v: "1.8.1", d: "13 jun 2026", aud: "gestor", items: [
      { type: "feat", title: "Novo no painel do admin: ranking dos 10 funcionários de casa mais antiga, ao lado do card de Demografia." },
    ],
  },
  {
    v: "1.8.0", d: "13 jun 2026", aud: "gestor", items: [
      { type: "high", title: "Chat mais rápido: a lista de conversas para de se redesenhar a cada batimento de presença, sem mais perder a rolagem ou o foco." },
      { type: "fix", title: "Correções no chat: a foto não quebra mais o layout, 'digitando…' não vaza pra conversa errada, enviar sem internet avisa (em vez de fingir que mandou), e os horários acertam à noite." },
      { type: "feat", title: "Chat acessível: ESC fecha, o leitor de tela anuncia mensagens novas e as reações têm nome." },
    ],
  },
  {
    v: "1.7.0", d: "13 jun 2026", aud: "gestor", items: [
      { type: "high", title: "Auditoria de design: contraste e foco mais legíveis, números alinhados em colunas, e o botão de chat não cobre mais as janelas." },
      { type: "feat", title: "No dashboard, a contagem 'Conferidas' virou 'Resolvidas' (conferidas + lançadas), sem mais confusão com a aba." },
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
