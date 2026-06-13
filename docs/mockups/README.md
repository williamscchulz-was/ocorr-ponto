# Mockups — protótipos de referência

Protótipos HTML standalone (abrir direto no navegador) usados pra **validar o
visual antes de mexer no app**. Workflow: mocka aqui → aprova → aplica em
`public/`. Ficam como histórico de design e referência das decisões.

> Não fazem parte do app em produção — são só referência. Abrir com duplo
> clique ou `start docs/mockups/<arquivo>.html`.

## Por área

### Identidade / boot
- `splash-logo.html` — splash com a logo "se desenhando" (self-drawing SVG). **No app.**
- `splash-login.html` — estudo de splash/login.
- `wordmark-fonte-marca.html` — wordmark "FioPulse" + tipografia da marca.

### Layout / navegação
- `redesign-minimalista.html` — direção geral do visual minimalista.
- `sidebar-minimalista.html` / `sidebar-retratil.html` — barra lateral.
- `login-minimalista.html` — tela de login.
- `microinteracoes.html` — micro-interações sutis. **No app.**
- `mobile-auditoria.html` — auditoria de responsividade mobile. **No app.**

### Telas
- `auditoria.html` — linha do tempo de auditoria. **No app.**
- `permissoes.html` — painel de permissões (matriz papéis × acessos). **No app.**
- `configuracoes-minimalista.html` — Configurações. **No app.**
- `funcionarios-minimalista.html` — lista de Funcionários. **No app.**
- `controle-pj-minimalista.html` — lista de Controle PJ. **No app.**
- `pj-contrato-aditivos.html` — contrato + aditivos do PJ. **No app.**
- `ocr-redesign.html` — leitura de contrato (cena de scan + cartão de revisão). **No app.**

### Banco de horas
- `bh-card-minimalista.html` — card de saldo.
- `grafico-banco-horas.html` / `grafico-bh-no-perfil.html` — gráfico do mês (perfil). **No app.**

### Chat
- `chat-redesign.html` — chat estilo rede social. **No app.**
- `chat-reacoes.html` — reações em mensagens (estilo iMessage/WhatsApp). **No app.**

### Auditoria
- `audit-ux.html` — reconstrução de UX: skeleton de carga, estados (vazio / erro / offline / sucesso inline), microinterações, specs de motion e design system. Referência pra decidir o que aplicar.
- `validacao-inline.html` — validação de formulário ancorada no campo (erro embaixo + borda vermelha) × toast que some. Reaproveita o `.field__error` existente.
- `skeleton-premium.html` — skeleton nas listas pré-carregadas ("teatro calibrado"): variantes sempre / só 1ª visita / só cascata, com o custo em ms visível. **No app** (variante B: só 1ª visita).

### Auditoria 2 — jun/2026 (sênior, 59 achados, 7 lentes)
Comece pelo índice: **`audit2-index.html`** — resumo executivo + tabela de prioridades (P0/P1/P2) + links pras 8 páginas. As páginas seguem o padrão Hoje × Proposto, tokens reais, interativas onde é motion.
- `audit2-dashboard-hierarquia.html` — KPI dominante, stats rebaixados, linha pendente que salta, toolbar sticky.
- `audit2-listas-densidade.html` — Funcionários (7 stats → 2), âncoras de varredura, tokens de tipo, tabular-nums.
- `audit2-microinteracoes-motion.html` — transição de view/aba, toast com progresso+pausa, saída de modal espelhada, nó da conferência.
- `audit2-fluxos-undo.html` — desfazer no toast, conferência com radio-cards, import de BH com diff + aviso de perda, recap de reajuste.
- `audit2-formularios-busca.html` — limpar na busca, inputs 16px (sem zoom iOS), bottom-sheet acima do teclado, filtros no mobile.
- `audit2-mobile-navegacao.html` — chat-FAB vs modais/bottom-nav/safe-area, rótulos legíveis, drawer com swipe-to-close.
- `audit2-marca-refino-visual.html` — reações em SVG, sidebar tokenizada, sombras unificadas, foco AA, badge Pendente com contraste OK.
- `audit2-conteudo-microcopy.html` — sem copy de demo, GH unificado, jargão traduzido, datas com ano, empty states, toasts em frase.

_"No app" = aprovado e já aplicado em produção; os demais são estudos/referência._
