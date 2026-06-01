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
    v: "1.4.0", d: "1 jun 2026", current: true, items: [
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
