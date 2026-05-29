# Histórico de Decisões — Pipeline RH + App FioPulse

> **Propósito:** log cronológico de TODA mudança relevante (o que foi feito + por quê), pra nunca perder o histórico nem a direção do projeto.
>
> **Regra:** append no fim (ordem cronológica). Não reescrever entradas antigas. Toda mudança em pipeline / config WK / app / Firestore / agendamento entra aqui.
>
> Ver também: [`WKRADAR-PLAYBOOK.md`](./WKRADAR-PLAYBOOK.md) (como mexer no WK Radar).

---

## 2026-05-21/22 · Fundação do pipeline RH

- **Decisão: Firestore, não Firebase Storage.** William não quis habilitar Storage no projeto `ocorr-ponto`. Pipeline RH escreve direto no Firestore. (Diferente do pipeline Comercial, que usa Storage no projeto `fiobras-hub`.)
- **Decisão: CPF/PIS completos**, mas isolados em `banco-horas-saldos` (admin+RH only). Não vão pra `funcionarios` (legível por líder).
- **Decisão: 1x/dia às 08:00 BRT** (BH não muda em minutos). Export do CSV 07:45, pipeline 08:00.
- Pipeline criado em `C:\fiobras-pipeline-rh\`: `process-bh.mjs` (parser CSV Latin-1 agrupado), `upload-to-firestore.mjs`, `run-pipeline.mjs`. Service account gerado manualmente pelo William.
- **Regra de negócio:** saldos -04:00 uniformes = folgas concedidas a pagar (não bug).

## 2026-05-22 · Coleções e regras

- **5 coleções no Firestore:** `funcionarios`, `banco-horas-saldos` (PII), `banco-horas` (histórico mensal), `bancoHoras` (app legado camelCase), `pipeline-rh/{cur,hist}` (espelho cur/hist do Comercial, sem PII).
- **Sync de `funcionarios`:** upsert preservando `turno` (admin define manual). Title Case nos nomes. `ativo=false` quando CSV traz Demissão.
- **Flag `bhExempt`:** funcionário com isso = pulado pela inativação do pipeline (recém-cadastrados fora do BH). Caso real: 6 funcs (1230-1236) reativados.
- **Regra "preserva ativo=false manual":** se admin marca inativo e CSV não traz demissão, pipeline respeita (caso Denis f-778, que o ERP não trouxe rescisão).
- Firestore rules publicadas (admin/RH/líder por turno).

## 2026-05-26 · Integração app + coordenação entre Claudes

- **App rebrand Weave → FioPulse** (feito pelo Claude PC).
- **Consumer no app:** admin/RH leem `pipeline-rh/cur` direto; **líder lê `/bancoHoras`** filtrado por turno (rule). Por isso `bancoHoras` NÃO é órfã — é a fonte do líder. (Removi por engano e re-habilitei no mesmo dia.)
- **Bridge + Missions:** canal de comunicação via Git entre Claude WKRADAR e Claude PC (`claude-bridge/` + `docs/wkradar-missions/`).
- **Heartbeat:** pipeline grava report em `docs/wkradar-reports/` a cada run (cloud routine do PC monitora).

## 2026-05-27 · Cadastro enriquecido (D_Empregado)

- **Novo relatório D_Empregado** no WK Radar → CSV com 24 campos (turno, escala, idade, aniversário, sexo, estado civil, nome da mãe, etc.). Parser `process-empregado.mjs`.
- **Pipeline cruza BH × D_Empregado** (sanity check nome/cargo/admissão) e enriquece `funcionarios` (sem PII) + `banco-horas-saldos` (PII: nomeMae).
- **Turno agora vem do ERP** (não mais manual), mas preserva override do admin.
- **App: SETORES dinâmico** — derivado dos funcionários reais (ERP canônico), não mais lista hardcoded de 7 setores.

## 2026-05-28 · UI rica + rede de segurança + auto-incremental

- **UI FioPulse:** widget aniversariantes, perfil rico do funcionário, demografia, "demitido em DD/MM", card de BH do líder enriquecido (cargo/escala/idade). (Claude PC.)
- **Rede de segurança no heartbeat:** conta "ativos sem BH" (exclui aprendizes/demitidos). Hoje = 6 (recém-contratados não inscritos no módulo BH).
- **⭐ AUTO-INCREMENTAL RESOLVIDO:** dev do WK Radar confirmou que deixar `IdsFuncionarios=""` / `EmpregadosSelecionados=""` (vazio) = seleção dinâmica. Aplicado nos 2 configs. Prova: D_Empregado 135→136 (pegou 1 que a lista fixa excluía). **Lição:** editar config só com PowerShell (windows-1252 + CRLF); sed quebra (CRLF→LF).

## 2026-05-29 · Documentação permanente

- **Criados `WKRADAR-PLAYBOOK.md` + `HISTORICO-DECISOES.md`** (este arquivo) no repo. Diretriz na memória local do Claude WKRADAR: sempre consultar o playbook + registrar toda mudança aqui.

---

### ⏳ Pendências abertas

- **RH inscrever os 6 recém-contratados** (1230, 1231, 1233, 1234, 1235, 1236) no módulo Banco de Horas do WK Radar. Quando feito, o "ativos sem BH" no heartbeat cai. (Aprendizes 1137/1200/1201/1203 ficam fora de propósito — regime sem BH.)

---

## 2026-05-29 · Auditoria completa

- **Auditoria 360°** (segurança + UX/design/acessibilidade + qualidade) via 3 auditores paralelos. Resultado em `AUDITORIA-2026-05-29.md`: 5 P0 + 11 P1 + 10 P2. Missão de fix enviada pro Claude PC (`claude-bridge/inbox-pc/2026-05-29-1230-auditoria-completa-fix.md`). Porquê: app cresceu muito (chat, supervisor, cadastro rico) desde a auditoria de 24/05; William pediu revisão completa.
- **Destaques P0:** XSS no `toast()` (nome sem escape), Service Worker servindo cache velho, toast sem aria-live, confirm() nativo, falha de rede sem feedback.
- **Achado de arquitetura (P1):** supervisor lê `bancoHoras`/`ocorrencias` inteiros (filtro só client-side) — vaza dados fora do escopo dele. Decisão de escopar server-side fica com o PC.
- **Bug Anderson (supervisor):** investigado — dados e código corretos; provável sessão/cache velho. Fix = re-login.

---

*Append novas entradas abaixo desta linha, com data e o "o quê + porquê".*

---

## 2026-05-29 · 🔴 Fix do saldo de BH travado + datas dinâmicas

- **Sintoma:** RH reportou que "o banco de horas não estava batendo". Pedi o Excel oficial de saldos (emissão 29/05) pra comparar — **foi o passo certo**: foi ele que provou que não era erro de cálculo do pipeline, e sim a janela de datas da exportação.
- **Diagnóstico (quantificado):** comparando Excel-da-RH × pipeline, **43 de 88 funcionários divergiam**. TODOS os funcionários no pipeline terminavam em `2026-05-21` — o saldo estava **travado 8 dias atrás**. Causa: `Config_Banco_de_Horas.txt` tinha `DataFinal="21/05/2026"` **fixo** e o WK Radar **NÃO estende essa data sozinho** (exporta exatamente até ela e para).
- **⚠️ Correção de crença antiga:** o playbook e a memória afirmavam que "o ERP estende as datas hardcoded até ~D-2". **ERRADO.** Fui enganado pelas datas de admissão/demissão no cabeçalho do CSV (24/05, 25/05), que não são lançamentos diários. Playbook (§4) e memória local corrigidos.
- **Fix imediato (Fase 1):** atualizei `DataFinal` pra 29/05 (script `update-config-dates.mjs`, edição byte-safe em `latin1` preservando windows-1252+CRLF — segue a regra de NUNCA usar sed), re-rodei o `ExportacaoAutomatica.exe` e a pipeline. Resultado: **88/88 funcionários passaram a bater** com o Excel da RH (zero divergência). Firestore + app já com saldo correto.
- **Fix permanente (Fase 2):** plugadas 2 etapas no `run-pipeline.mjs`: **[0]** `update-config-dates.mjs` reescreve `DataInicial`=1º-do-mês / `DataFinal`=hoje a cada run; **[1]** roda o `ExportacaoAutomatica.exe` pra regenerar o CSV com a janela atual, antes de parsear. Ambas best-effort (se falharem, a pipeline usa o CSV existente — ex. o do export interno das 07:45). Assim a janela **nunca mais congela**. Adicionados `WK_EXE`/`WK_BH_CONFIG` no `config.mjs`.
- **Sobre o agendamento:** confirmadas 3 tarefas no Windows Task Scheduler — `WKRadar Export D_Empregado` (07:40), `WKRadar Export BH` (07:45) e `Fiobras Pipeline RH` (08:00). Com a Fase 2, a tarefa das **07:45 virou fallback** (a pipeline das 08:00 re-exporta o BH com datas atualizadas). A das 07:40 (cadastro) continua sendo a fonte do CSV D_Empregado (não tem problema de data). Backup do config salvo em `Config_Banco_de_Horas.txt.bak-29mai-bhfix`. (Depois a 07:45 foi **desabilitada** — a pipeline das 08:00 virou dona única do export de BH.)

---

## 2026-05-29 · 🛑 INCIDENTE: servidor travado a 100% de disco (grep recursivo em D:\WKRadar)

- **Sintoma:** RAID 1 SSD (disco de sistema C:/D:) a **100% de uso**, ~414 MB/s de leitura sustentada, servidor congelado.
- **Causa:** durante a investigação de "como o export é disparado", rodei um comando de shell ad-hoc — `grep -rliE "ExportacaoAutomatica" /d/WKRadar /c/fiobras-pipeline-rh` — que varre `D:\WKRadar` **recursivamente**. Esse diretório é o **banco do ERP WK Radar**: vários GB de `.dat` binários. O grep foi lançado em background, **virou órfão** (não terminou nem notificou) e ficou **52 minutos** lendo o disco inteiro, saturando o RAID. **NÃO é código do pipeline** — confirmado por busca escopada: o pipeline só referencia 4 caminhos EXATOS em D:\WKRadar (2 CSVs + config + exe), nunca recursivo.
- **Resolução imediata:** matei os 2 processos `grep.exe` (Stop-Process). Disco caiu na hora de 100% → **6%**, fila de disco 0, leitura ~0. Nenhum outro processo segurava o disco.
- **Guarda durável (pra nunca repetir):**
  - Criado **`C:\fiobras-pipeline-rh\CLAUDE.md`** com regra inviolável de segurança de disco no topo (nunca varrer `D:\WKRadar`; ler só os 4 paths exatos; receita de busca segura escopada + `--include`/exclusão de `.dat`).
  - Adicionada **diretriz permanente #5** na memória local do Claude WKRADAR.
  - Esta entrada no histórico.
- **Lição:** `D:\WKRadar` é dado de produção do ERP num SSD de sistema. Qualquer leitura em massa ali derruba o servidor. Buscas sempre escopadas ao pipeline/repo, com ferramenta que pula binários (ripgrep/Grep tool), e comandos longos em background precisam ser confirmados (não deixar órfão).
