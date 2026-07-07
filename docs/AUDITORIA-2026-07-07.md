# Auditoria total FioPulse — 2026-07-07

Loop goal-based. Rig A (Playwright mockado, rede externa bloqueada, 2 viewports, 2 temas) + Rig B/analítico (perf do boot por código, RTT modelado). 12 agentes de auditoria (7 áreas Fable + botões Haiku + 2 inspeções Sonnet) + adversarial Fable nos graves.

## Cobertura (números)
- Matriz: ~763 vereditos pass, **26 fails estruturados**, ~9 warns nas 7 áreas + inspeção visual.
- Botões: 42 handlers com latência classificados — **A(withBusy) 14 · B(texto) 11 · C(só disabled) 9 · D(sem feedback) 8**.
- Estático: 3 blocos CSS mortos + 5 funções JS mortas + 6 achados a11y.
- Graves: 2, ambos verificados adversarialmente (CONFIRMADO). Cap de adversarial não descartou nada.
- Lacuna admitida: Rig B (cronômetro real no emulador) ficou instável no Windows (colisão de chrome + wiring de auth); a perf foi respondida pela timeline ANALÍTICA do código (fonte confiável), não por wall-clock ao vivo.

## GRAVES (2, adversarial CONFIRMADO)
1. **FAB "Nova ocorrência" some ao chegar na tela de Ocorrências (mobile).** O handler global de scroll (app.js:123-141) adiciona `fab--rec` (styles.css:4059: opacity 0, pointer-events none) ao rolar pra baixo e só tira ao rolar pra cima; ao navegar já rolado, a ação primária nasce invisível. → FIX-NOW.
2. **Badge de Avisos no drawer do colaborador (escuro) contraste 1.00:1.** `.nav__badge--pend` rgb(159,224,181) sobre amarelo rgb(255,203,0) = ilegível (styles.css:710 + portal-colaborador.css:51). → FIX-NOW.

## Feedback de botão (dor nº3 do William) — FIX-NOW
Classe D (sem NENHUM feedback), as críticas: remover foto (app.js:2280), atualizar foto (5317), remover foto alt (5338), **excluir disciplinar (6865)**, **excluir documento institucional (7001)**, abrir comprovante assinado (7430). Classe C (só disabled) nos submits dos modais de ocorrência automática: confirmar (8966), validar (9210), dispensar (9249), corrigir (9342), atualizar volateis (1035). → padronizar com o `withBusy`/spinner que já existe.

## FIX-NOW (defeito objetivo, baixo risco, sem decisão)
- Modal detalhe da ocorrência auto **estoura 30px na horizontal** no mobile (Editar+Dispensar+Confirmar não quebram linha), app.js:9199. 
- **Sheet de assinatura reabre sozinha** após fechar com Esc durante a busca de localização (Esc não limpa `_assState`, o callback de geolocation reabre), app.js:273/1527.
- **Gate do Termo sem focus trap**: foco fica no body e o app atrás fica tabável num gate bloqueante, app.js:767.
- Contraste: **pill de versão** na sidebar 3.23:1 (.version-pill--side) e badge de nav 4.34:1 (margem estreita).
- Copy/convenção (travessão como separador, proibido): toast do Firebase (firebase.js:105), "Fase 1 — MVP" (roadmap.js:4), 5 títulos do changelog (changelog.js), select de funcionário "Nome — Turno" nos modais Nova/Editar ocorrência.
- "1 **faltas** no mês" (singular), app.js:8870.
- Erro de validação inline não some ao corrigir o campo (3 modais das automáticas).
- Gráfico "Ocorrências por mês" rotula o balde catch-all como **"Saídas"** (deveria ser "Outras"), app.js:3717/3750.
- **ReferenceError `firebase is not defined`** a cada foco da janela quando o SDK não carregou (firebase.js:3203, listener fora do caminho de sucesso).
- Dead code: CSS `.com-card`/`.disc-cols` + 6 classes órfãs; JS `renderOcorrenciasAuto`, `openImportFuncModal`, `renderTipos`, `renderUsuarios`, `docNivelMeta`, `diasParaReajuste`.
- a11y: 6 botões só-ícone com `title` mas sem `aria-label` + FAB; range slider e selects sem nome acessível.

## NEEDS-OWNER-DECISION (William)
- **Mural de aniversário inacessível no desktop**: o card "Parabenizar" (coração) é `display:none` em >=901px (portal-colaborador.css:479). Intencional (só mobile) ou o colaborador no desktop também deve poder parabenizar?
- **"Sair" da sidebar desloga sem confirmar**, enquanto "Sair" da Conta confirma ("Sair da conta?"). Padronizar (sidebar também confirma) ou deixar?
- **Saldo diário do espelho**: o "acumulado até o dia" só existe em tooltip de hover (inacessível no toque). Pôr um rótulo visível na coluna? (relacionado à correção que fiz hoje).
- **Matriz de permissões**: alvo de toque real 26x26px no mobile. Redesenhar a célula pro dedo?

## LATER (já adiado / grande)
Split de bundle por portal (#135), 904KB de JS síncrono (adiado na auditoria de julho). Persistence offline (parte da decisão de perf).

## Decisão 1 · Performance do boot (timeline analítica)
Ver scratchpad/audit/perf-timeline.md. Gestor = 13 leituras Firestore SEQUENCIAIS (sem Promise.all) + N+1 nas subcoleções; colab já é Promise.all com um for sequencial em disciplinares. Anexos base64 (até ~900KB/doc) vêm no payload do boot. Plano aditivo (sem tocar modelo): (1) não awaitar 1º snapshot de ocorrencias antes do render; (2) Promise.all nos ~10 estágios independentes do gestor; (3) Promise.all(map) nos N+1; (4) adiar pj/users/permissões pro pós-render; (5) condicional: anexo lazy no viewer.

## Decisão 2 · Splash
Mock 3 direções (docs/mockups/splash-redesign-2026-07.html): A Pulso (recomendada, ECG da marca batendo), B Esqueleto vivo, C Sereno. Aguardando escolha do William. Mudança visual → mock aprovado antes de tocar o app.
