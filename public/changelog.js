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
// ============================================================
window.CHANGELOG = [
  {
    v: "1.7.0", d: "13 jun 2026", current: true, items: [
      { type: "high", title: "Auditoria de design: contraste e foco mais legíveis, números alinhados em colunas, e o botão de chat não cobre mais as janelas." },
      { type: "feat", title: "No dashboard, a contagem 'Conferidas' virou 'Resolvidas' (conferidas + lançadas) — sem mais confusão com a aba." },
      { type: "feat", title: "Hierarquia mais clara: o número que pede ação ganha destaque, a ocorrência pendente recebe uma marca, e Funcionários abre direto na lista (contagem por turno foi pro filtro)." },
    ],
  },
  {
    v: "1.6.2", d: "10 jun 2026", items: [
      { type: "feat", title: "Primeira visita às listas ganha um instante de carregamento elegante; no resto do uso, tudo segue instantâneo." },
    ],
  },
  {
    v: "1.6.1", d: "10 jun 2026", items: [
      { type: "feat", title: "Erros de formulário agora aparecem no próprio campo, em vez de um aviso que some." },
      { type: "feat", title: "Listas navegáveis pelo teclado: Tab percorre, Enter abre o item." },
    ],
  },
  {
    v: "1.6.0", d: "10 jun 2026", items: [
      { type: "feat", title: "Toques de UX: skeleton ao carregar, aviso de 'sem conexão', e a ocorrência desliza pra fora ao ser lançada." },
    ],
  },
  {
    v: "1.5.0", d: "1 jun 2026", items: [
      { type: "high", title: "Nova tela de abertura: a marca da Fiobras se desenha sozinha quando o app carrega." },
    ],
  },
  {
    v: "1.4.0", d: "1 jun 2026", items: [
      { type: "feat", title: "Permissões editáveis: admin liga/desliga na matriz o que cada papel (GH, Líder, Supervisor) pode fazer." },
    ],
  },
  {
    v: "1.3.0", d: "1 jun 2026", items: [
      { type: "feat", title: "Painel de Permissões: matriz do que cada papel (Admin, GH, Líder, Supervisor) faz + escopo por usuário (turno / funcionários)." },
    ],
  },
  {
    v: "1.2.0", d: "1 jun 2026", items: [
      { type: "high", title: "Leitura de contrato repaginada: cena de scan animada + cartão revisando o que foi encontrado." },
      { type: "feat", title: "Extração mais esperta: reconhece CPF além de CNPJ e prioriza o valor mensal/honorários." },
    ],
  },
  {
    v: "1.1.0", d: "29 mai 2026", items: [
      { type: "fix", title: "Usabilidade no celular: topbar, listas, formulários e chat ajustados pra mobile." },
      { type: "feat", title: "Toque e segure pra reagir no chat (celular); Novidades acessível também no desktop." },
    ],
  },
  {
    v: "1.0.0", d: "29 mai 2026", items: [
      { type: "feat", title: "Chat novo: conversas separadas de pessoas, com reações e confirmação de leitura." },
      { type: "feat", title: "Auditoria: linha do tempo de quem conferiu, lançou, alterou ou excluiu." },
      { type: "high", title: "Visual minimalista em todo o app + identidade FioPulse." },
    ],
  },
  {
    v: "0.9.0", d: "26 mai 2026", items: [
      { type: "feat", title: "Banco de horas com gráfico do mês no perfil do funcionário." },
      { type: "feat", title: "Controle PJ: contrato e aditivos juntos, com pasta no Drive." },
      { type: "fix", title: "Login mais rápido e sem piscar a tela." },
    ],
  },
];
