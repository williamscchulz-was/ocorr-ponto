# FioPulse · Instruções do projeto

PWA de RH da Fiobras (controle de ponto, portal do colaborador + portal do gestor).
Repo: `C:\projetos\ocorr-ponto`. Stack: HTML/CSS/JS vanilla em `public/`, Firebase
(Firestore + Auth + Storage + Hosting). Deploy `hosting:weave` serve `dist/` minificado.

## Hierarquia de agentes

Contexto de custo: este projeto roda em assinatura de plano fixo (Max). Opus 4.8,
Sonnet 5 e Haiku 4.5 estão TODOS inclusos; o custo por token entre eles é irrelevante.
O único recurso pago à parte é o Fable 5 (usage credits, cerca de 2x o Opus, esvazia o
limite 2x mais rápido). Logo: use Opus/Sonnet/Haiku à vontade, roteando por adequação e
velocidade; seja econômico só com o Fable.

- **Opus 4.8 (`claude-opus-4-8`) · orquestrador e default.** Recebe o pedido, planeja,
  decide arquitetura, faz o grosso do trabalho substantivo e roteia o resto. É o cavalo
  de trabalho, sem custo marginal. (Quem seta o modelo do loop é o `/model`; este arquivo
  documenta a intenção, não força. Para preservar a liberdade de trocar, não cravamos o
  modelo em `settings.json`.)
- **Sonnet 5 (`claude-sonnet-5`) · executor de volume.** Bulk e tarefas paralelas.
  Consome de um limite SEMANAL SEPARADO do Opus, então jogar volume no Sonnet preserva a
  folga do Opus. Escolhido por balde separado + velocidade.
- **Haiku 4.5 (`claude-haiku-4-5-20251001`) · executor mecânico.** Renames, boilerplate,
  rodar comandos, edições triviais. Escolhido por velocidade.
- **Fable 5 (`claude-fable-5`) · escalation cirúrgico (PAGO).** Só o Opus decide chamar,
  por julgamento, e só nos casos abaixo.

Delegação: o Opus delega via Agent/Workflow passando `model: haiku|sonnet|opus` conforme
a adequação. NÃO criamos um arquivo de agente por modelo (o Agent e o Workflow já aceitam
`model`/`effort` por chamada; um arquivo por modelo seria peça morta, ver escada abaixo).

### Quando o Opus escala pro Fable

Chamar o agente `conselheiro-fable` (`model: fable`) SÓ quando:

1. Bug genuinamente difícil ou novo que o raciocínio do próprio Opus não resolveu (na
   prática: resistiu a tentativa séria e o Opus não está convergindo).
2. Planejar arquitetura realmente cabeluda onde a capacidade extra do Fable muda o
   resultado de forma mensurável.
3. GATE de segurança (rede de proteção sobre dado sensível): toda mudança de regra do
   Firestore/Storage e todo release grande que toca dados de usuário, LGPD ou PII passa
   por uma revisão do Fable antes de ir.

Anti-falha:
- Fable NUNCA pra grunt work nem planejamento trivial (queima crédito à toa).
- Opus NUNCA insiste sozinho num problema que claramente o superou (na dúvida, escala).
- Fable é advisor read-only por padrão (diagnostica e devolve plano; o Opus implementa).
  HÍBRIDO sob demanda: se um bug específico travou de vez, o Opus pode, caso a caso, rodar
  o Fable com permissão de edição pra ele mesmo pôr a mão na massa. Não é padrão, é decisão
  pontual do Opus, consciente de que é sessão paga.

## Escada do Ponytail (minimalismo e YAGNI · herdada por TODO agente)

Preguiçoso na solução, nunca na leitura: entenda o problema inteiro antes de aplicar a
escada. Pare no primeiro degrau que resolve:

1. Isso precisa existir? Não: pula (YAGNI).
2. Já existe neste codebase? Reusa, não reescreve (ex.: `avatarFuncHtml`, `icon()` em
   `utils.js`, `can()`, o harness Playwright em `scratchpad/audit/`, helpers de `firebase.js`).
3. A biblioteca padrão resolve? Usa (JS nativo: `Intl`, `crypto.randomUUID`, `structuredClone`).
4. Recurso nativo da plataforma resolve? Usa (browser: `<input type=date>`, `dialog`,
   `IntersectionObserver`; Firestore: `where`/query em vez de filtrar no cliente).
5. Dependência já instalada resolve? Usa (Firebase SDK, SheetJS, pdf.js).
6. Dá em uma linha? Uma linha.
7. Só então: o mínimo que funciona.

Guardas inegociáveis (nunca cortadas por preguiça): validação de fronteira de confiança
(input do usuário, `escapeHtml`), regras do Firestore/Storage, tratamento de perda de
dados, dinheiro, PII e LGPD, acessibilidade. Preguiçoso, não negligente.

Enforcement em dois pontos:
- Entrada: quem planeja (Opus, ou Fable quando escalado) roda a escada antes de gerar
  trabalho ("isso é mesmo necessário?").
- Saída: ao revisar o output dos executores, rejeita over-engineering, dependência nova
  desnecessária e arquivo a mais ANTES de aceitar.

Atalho deliberado no código leva comentário `ponytail:` nomeando o caminho de upgrade.
Ex.: `// ponytail: o browser ja tem, <input type=date>` antes de um date picker custom.

## Metodologia premium (2026-07-14, William: "as pessoas precisam ver muito cuidado")

Cada tela transparece capricho, e capricho se PROVA, não se promete:

1. **Toda tela nasce preenchida.** Dado assíncrono tem cache no state (padrões:
   `_espState.cache`, `state._reacoesCache`, `state._inkPos`, `state._fpRail`) e o
   template renasce do cache; placeholder/skeleton SÓ na primeira carga da sessão.
   Um re-render sem mudança de state produz DOM IDÊNTICO, sempre.
2. **Animação de entrada não suja o DOM.** Efeito one-shot usa Web Animations API
   (`element.animate`, ver `animarEntrada`), nunca classe/style inline que um
   re-render ressuscita; anima 1x por navegação, re-render não re-cascateia.
3. **Gatilho automático não estoura render.** onSnapshot/foco passam por agendador
   coalescido (`renderApp`, `aoAtualizarOcorrencias`); tela que não usa o dado
   recarregado não re-renderiza (`refetchAoFoco`, lista `SEM_VOLATEIS`).
4. **Guarda executável no ritual de release:** `node scratchpad/audit/flicker-guard.mjs`
   (servidor local 8081) varre TODAS as telas dos 2 portais (dinâmico via
   NAV_GRUPOS/COLAB_NAV, tela nova entra sozinha) e falha se algum re-render não
   nascer idêntico ao estabilizado. Vermelho = não sobe.

## Convenções do projeto (todo agente respeita)

- Texto visível em português, SEM emoji e SEM hífen/travessão como separador de frase
  (vírgula, dois-pontos; `·` é permitido). Vale pra UI e pra resposta no chat.
- Minimalista. Comentário de código só onde há restrição não óbvia.
- Mudança visual passa por MOCK em HTML real (servido em localhost, nunca o preview
  embutido do Claude Code) e aprovação do William ANTES de tocar o app.
- Código morto sai no mesmo passe (o git guarda o histórico).
- Fontes legíveis vivem em `public/`; `dist/` é gerado no deploy por `scripts/build-dist.mjs`.
  NUNCA editar `dist/` à mão.
- Regras do Firestore/Storage: mudança aditiva, testada no emulador (suíte inteira, 100%);
  o deploy de rules segue a autorização permanente do William só com testes 100%.
- Ritual de release: bump de versão (`changelog.js` + `CURRENT_VERSION` + `?v=` no
  `index.html` + `sw.js`) e deploy `hosting:weave` (o predeploy minifica).
- Histórico de decisões: `docs/HISTORICO-DECISOES.md`, `docs/AUDITORIA-POLISH-2026.md` e a
  memória do projeto (`MEMORY.md` em `~/.claude/projects/C--projetos-ocorr-ponto/memory/`).
- Ponte com o Claude do pipeline (WKRADAR): `claude-bridge/` (leio de `inbox-pc/`, escrevo
  em `inbox-wkradar/`).
