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

---

## 2026-06-17 · Situação do vínculo (afastado/encostado/aposentado) — preparação do pipeline

- **Necessidade:** o FioPulse precisa saber quem está AFASTADO/encostado/aposentado por invalidez pra tirar de rankings/contagens (ex.: tempo de casa). Hoje só existe `ativo` (= demitido sim/não); quem está afastado mas não desligado aparece como `ativo:true`.
- **Verificação na fonte:** li os cabeçalhos reais dos 2 exports (D_Empregado 24 cols; BH 17 cols). **NENHUM tem coluna de situação/status/afastado/categoria.** Não é o pipeline descartando — a coluna **nunca esteve no CSV**. O mais próximo é `Demitido` (S/N), que só capta desligamento. → A coluna precisa ser ADICIONADA ao relatório D_Empregado no WK Radar.
- **Preparação do pipeline (feito):**
  - `process-empregado.mjs` **refatorado pra mapear colunas por NOME** (não mais por posição fixa de 24). Assim adicionar/reordenar coluna no WK **não quebra** o parser nem perde enriquecimento (antes: throw se ≠24 colunas). Validação virou soft (warn).
  - Detecção da coluna de situação por nome flexível (`Situação`/`Categoria`/`Vínculo`/`Status`/…). Adicionados ao parsed: `situacao` (rótulo cru) e `afastado` (boolean derivado: true quando a situação ≠ "trabalhando normalmente"). Lista `SITUACOES_NORMAIS` editável quando soubermos os valores reais.
  - `upload-to-firestore.mjs` grava `situacao`+`afastado` em **`funcionarios/{codigo}`** (merge:true → preserva `bhExempt`/`turno`) e em **`pipeline-rh/cur`+`hist`**. Schema só ADICIONA campos; `ativo` mantém significado (demitido s/n).
  - Hoje (sem a coluna): `situacao=null`/`afastado=false` em 100% — inofensivo. Testado: 142 funcs, 0 warnings.
- **Pendente:** RH/admin adicionar a coluna "Situação" ao relatório D_Empregado no WK Radar (UI). Depois disso, o pipeline lê os valores reais; aí confirmamos a classificação `afastado` (em especial casos como "Férias") e validamos os writes.

### ✅ Concluído no mesmo dia (2026-06-17)

- **Campo adicionado pelo admin** no relatório D_Empregado: **"Situação do Emp."** (grupo "Outros" do designer). Export regenerado → CSV passou de 24 → 25 colunas. Config íntegro (sem variante "2", `EmpregadosSelecionados=""` preservado, Latin-1/CRLF ok).
- **Valores distintos reais** (142 funcs): `Trabalhando`(87), `Rescisão`(47), `Aposentadoria por Invalidez`(5), `Férias`(2), `Licença Médica`(1).
- **Classificação `afastado` final:**
  - `false`: **Trabalhando** (normal), **Rescisão** (é DESLIGADO — já coberto por `ativo=false`, não é "afastado"), **Férias** (temporário; conta pra tempo de casa — decisão: manter no ranking).
  - `true`: **Aposentadoria por Invalidez**, **Licença Médica** (+ defaults: afastamentos futuros desconhecidos caem em `true`).
  - Correção vs. regra provisória: "Rescisão" tinha caído em `true` por engano (todo valor ≠ normal); ajustado pra `false` porque rescisão = demissão.
- **Resultado:** 6 funcionários `afastado=true`. Caso-alvo capturado: `f-1133` (Licença Médica, `ativo=true`) — afastado sem desligamento, que antes passava como ativo nos rankings.
- **Gravado em:** `funcionarios/{codigo}` (142 docs, merge — `bhExempt`/`turno` preservados, confirmado nos 5 de invalidez que têm `bhExempt=true`) + `pipeline-rh/cur` (84) + `pipeline-rh/hist`. Schema só ganhou `situacao`+`afastado`; `ativo` inalterado.
- **Automação:** a tarefa `WKRadar Export D_Empregado` (07:40) já usa o modelo atualizado → daqui pra frente a coluna sai sozinha todo dia e o pipeline das 08:00 parseia+sobe sem intervenção. O parser mapeia por NOME, então é robusto a reordenação.

### Ajuste: afastado (não demitido) CONTA no quadro — `ativo=true`

- **Motivo:** o admin tinha desativado manualmente os aposentados por invalidez (ex.: Nivaldo Clasen, f-140) pra tirá-los de contagens — workaround de antes do `afastado` existir. Mas eles **contam no quadro** (não são demitidos); o "INATIVO" era enganoso.
- **Regra nova no `upload-to-firestore.mjs`:** `afastado === true && !demitido` → força `ativo=true` (mesmo com inativo manual antigo). O `afastado` passa a ser o que exclui de rankings/visões; `ativo` volta a significar só "no quadro / não demitido". Demitido (ex.: Denis f-778, situacao "Rescisão") segue `ativo=false`. Não-afastados com inativo manual (sem situação de afastamento) continuam preservados.
- **Efeito:** 5 aposentados por invalidez voltaram a `ativo=true` (+5 no headcount → 95 ativos), todos com `afastado=true` + `situacao`. Validado no Firestore.
- **Heartbeat:** o cálculo de "ativos sem BH" agora também exclui `afastado` (eles legitimamente não têm BH) — evita falso alarme.
- **Falta no app (PC):** trocar o banner binário "Funcionário INATIVO" por exibir a **situação** quando `afastado=true` (ex.: "Afastado · Aposentadoria por Invalidez"), e reservar "INATIVO" só pra `ativo=false` (demitido). Headcount usa `ativo`; rankings usam `afastado!==true`.

### Flag `diretor` (categoria à parte do quadro operacional)

- **Necessidade:** diretores (Landolino f-108, Jules f-527, William f-1029) contam no quadro mas são categoria à parte; precisam de tag/filtro como os afastados.
- **Campo novo `diretor` (boolean):** derivado do cargo (`/diretor/i`) no `process-empregado.mjs`. Gravado em `funcionarios/{codigo}` e `pipeline-rh`. Hoje 3 (Diretor Presidente/Comercial/Administrativo) — únicos com "diretor" no cargo.
- **Contagens (Firestore):** 95 ativos · 6 afastados · 3 diretores · **86 ativos-operacionais** (`ativo && !afastado && !diretor`).
- **Falta no app (PC):** badge "Diretor" e "Afastado" na lista de funcionários; e o filtro de status (dropdown "Apenas ativos") ganhar opções pra filtrar afastados/diretores (ex.: "Operacionais", "Afastados", "Diretores"). Spec no bridge.

### ✅ App entregue — FioPulse v1.9.0 (PC, 2026-06-17)

- Missão `2026-06-17-tags-afastado-diretor` **concluída e em produção** (movida pra `wkradar-missions/done/`). Claude PC implementou: badges (Afastado/Diretor) + banner/selo no perfil + filtro de status + exclusões por tela.
- **Matriz aplicada:** Banco de Horas e Demografia **sem diretor**; ranking **sem afastado + sem diretor**; quadro/contagem e aniversários **mantêm todos**. Flags lidas direto do Firestore (`afastado`/`diretor`/`situacao`), ausência = false.
- Dados confirmados no Firestore: 95 ativos · 6 afastados · 3 diretores · 86 operacionais. Sem pendência de pipeline — todas as coleções (`funcionarios`, `pipeline-rh`, `bancoHoras`) carregam os flags.

### Flag `aprendiz` (menor aprendiz) — 2026-06-17

- **Campo novo `aprendiz` (boolean)**, derivado do cargo (`/aprendiz/i`), nas 3 coleções. Hoje 7 (4 ativos). Decisão do William: **mesmo tratamento do diretor** — conta no quadro + listagem + aniversário; **fora de BH (já era regime sem BH), demografia e ranking**.
- Contagens novas: ranking-operacional = **82** (`ativo && !afastado && !diretor && !aprendiz`); demografia = **88** (`ativo && !diretor && !aprendiz`).
- Missão pro PC: `wkradar-missions/pending/2026-06-17-tag-menor-aprendiz.md` (badge "Menor Aprendiz" + somar `aprendiz` aos filtros de exclusão; mockup exigido).
- **Implementação no app feita pelo WKRADAR** (autorizado pelo William, commit `c8741fc`, **v1.9.1**): badge `badge--neutral` "Menor Aprendiz" na lista + selo no perfil + opção "Aprendizes" no filtro de status + `f.aprendiz !== true` nos filtros de BH/demografia/ranking (espelho do `diretor`). Bump `CURRENT_VERSION=1.9.1`, `CACHE=fiopulse-v158`, `?v=158`; changelog 1.9.1. `node --check` OK nos 3 JS. **Deploy pendente:** sem `firebase login` no servidor do pipeline → PC roda `firebase deploy --only hosting` (aviso no bridge). Nota: 1ª vez que o Claude WKRADAR mexeu direto no `public/` do app — normalmente é domínio do PC; foi exceção autorizada.

---

## 2026-05-29 · 🔬 Investigação: RAID a 100% "do nada" — causa EXTERNA (controlador/SSD), não o pipeline

> Investigação **read-only** (sem varrer disco — só métricas/perf/Event Log), continuando o incidente do grep órfão (acima). Objetivo: achar a causa **recorrente e externa** dos picos de 100% no RAID 1 SSD de sistema.

### Hardware do RAID (descoberto via `Get-PhysicalDisk` + eventos RST Middleware)
- **Disco 0 (C:+D:) = "Intel Raid 1 Volume", RAID 1 de 2× `CT2000BX500S` (Crucial BX500 2 TB)**, controlado pelo Intel RST (`iaStorVD` / `RstMwService`).
- **Os BX500 são SSDs QLC *DRAM-less* de consumo** — conhecidos por **colapso de desempenho sob escrita sustentada** (quando o cache SLC enche, a taxa despenca pra nível de HDD e a latência dispara). Dois deles em espelho = o gargalo do servidor.
- Disco 1 (E:) = Seagate IronWolf ST4000VN006 4 TB (HDD, passthru), ocioso.

### 🔴 Achado principal — resets de controlador (assinatura do "100% do nada")
- Event Viewer / System, fonte **`iaStorVD`, ID 129: "Redefinir para dispositivo \Device\RaidPort0, emitido"** = o driver Intel RST **resetou a porta do RAID** porque uma I/O não completou no timeout. Quando isso acontece, o disco fica em **100% de tempo ativo com pouca vazão** — tudo travado esperando o reset. **Isso É o "100% do nada".**
- Distribuição (90 dias): **38 resets em 21/05** concentrados às 21h (17) e 23h (19) — um episódio de stall longo naquela noite; e esparsos em 04/05, 15/05, 23/05, 24/05, em horas variadas (10h/12h/18h/19h). **Padrão disperso/dependente de carga**, não horário fixo → bate com stall de SSD (cache SLC esgotado / disco lento), não com tarefa agendada.
- Eventos **`disk` ID 51 "erro durante operação de paginação" em `\Device\Harddisk2`** todo dia ~01:00–01:02, junto da criação de VSS shadow copies do volume WKRADAR — correlaciona com a tarefa **`Microsoft-Windows-WindowsBackup` (diária 01:00)**.

### Agenda dos suspeitos externos (levantada com `Get-ScheduledTaskInfo`)
- **Windows Backup (`Microsoft-Windows-WindowsBackup`)** — diário **01:00** (cria VSS + lê disco; gera os eventos 51 noturnos).
- **`WKRADAR - Backup` → `WKBackup.exe`** — diário **11:55** (sem repetição); lê o banco do ERP pra backup.
- **7× "Exportação Saldo Estoque" (300/300T/302/360RET/400/401/404)** → `.bat` → `ExportacaoAutomatica.exe` — **repetem a cada 30 min, o dia todo** (`PT30M`/`P1D`), escalonadas. Consumidor frequente do banco D:\WKRadar (bursts curtos).
- **Pipeline Comercial** (`Fiobras Dim*`/`Fat*`) e exports de estoque 360 — rajada **14:00–14:04** + estoque a cada 30 min; todos chamam o mesmo `ExportacaoAutomatica.exe`.
- **Pipeline RH** — `WKRadar Export D_Empregado` 07:40 + `Fiobras Pipeline RH` 08:00 (já auditado, descartado).
- **Windows Defender** — **Real-Time DESLIGADO** (`RealTimeProtectionEnabled=False`); só **quick scan diário ~04:06 (~41 s)**. **Descartado** como causa de pico sustentado.
- **Defrag/Otimização** — semanal, rodou 22/05. **ReFS "Data Integrity Scan"** = **no-op** (todos os volumes são NTFS). Descartados.
- **SQL Server** (`sqlservr`) também roda no servidor (além do Firebird/.dat do WK) — segundo motor de banco fazendo I/O.

### Conclusão (hipótese forte, a confirmar com o logger no próximo pico)
A causa mais provável do **"100% do nada"** NÃO é um processo varrendo arquivo — é o **par de SSDs Crucial BX500 (QLC sem DRAM) em RAID 1 estolando sob escrita sustentada**, fazendo o **Intel RST resetar a RaidPort0 (evento 129)** e o disco ficar 100% travado esperando. Gatilhos prováveis de carga: backups (01:00 e 11:55), exports de estoque a cada 30 min + rajada comercial das 14:00, e operações pesadas do ERP/SQL. **"Sem processo culpado no pico" = diagnóstico, não falha de medição** (aponta controlador/SSD).

### Logger instalado (pra pegar o culpado no ato)
- `C:\fiobras-pipeline-rh\_diag\disk-watch.ps1` — loop 10 s, read-only; loga %tempo/fila/latência/MBps, top-5 processos de I/O quando carrega, e **marca cada evento 129/51/153 novo** em `disk-resets.log`. Rodando agora (**PID salvo em `_diag\disk-watch.pid`**). Há `STOP-disk-watch.ps1` pra encerrar — **não deixar órfão**.
- ⚠️ **Pendências que exigem elevação (Claude rodou sem admin — "Acesso negado"):** (a) registrar o logger como tarefa no boot/SYSTEM (pra sobreviver reboot e pegar madrugada) e (b) ler **SMART** dos BX500 (`Get-StorageReliabilityCounter` / `smartctl`) pra confirmar wear/erros. Comandos prontos no `_diag\README.md`.

### Recomendação de mitigação (ordem de impacto)
1. **Confirmar saúde dos BX500 via SMART (elevado).** Se houver Wear alto / Reallocated / erros → **trocar os 2 SSDs por modelos com DRAM e TLC (linha datacenter/pro)**; BX500 QLC é inadequado pra disco de sistema de ERP+SQL com escrita constante. **Maior alavanca.**
2. **Espalhar os horários de backup/export** pra não somar com carga do ERP: mover `WKBackup.exe` (11:55) e a rajada comercial (14:00) pra janela ociosa noturna; reavaliar a real necessidade dos exports de estoque **a cada 30 min** (talvez 1–2×/dia baste).
3. **Atualizar driver Intel RST** (eventos 129 também podem agravar por driver antigo) e checar no app "Intel Optane/RST" se há **verify/patrol read** agendado caindo em horário de expediente — reagendar pra madrugada.
4. **Mover o pagefile** (hoje em C:, no mesmo RAID estolante) — se sobrar pressão, considerar pagefile no HDD E: ou, melhor, resolver o SSD (item 1).
5. Manter o logger até capturar 1–2 picos e fechar o diagnóstico empiricamente; depois **parar o logger** (STOP-disk-watch.ps1).

---

## 2026-05-29 · 🔎 RAID 100% — confirmação via app Intel RST + achado do cache de escrita

Seguimento da investigação acima. Como o RAID esconde o SMART dos membros (`Get-StorageReliabilityCounter` no volume retorna dado fantasma: Wear=0% Temp=0C; só o HDD do E: aparece real), abrimos o **app Intel RST** (RstHSA) pra ver os discos por trás.

- **Confirmado:** 2× **Crucial CT2000BX500SSD1** (seriais `2504E9A2E8E0` porta 4, `2504E9A2F0D8` porta 5), firmware **M6CR082**, SATA 6 Gb/s, controlador **VMD**, RAID 1 (Volume1). **Status: Normal** nos dois → sem alarme de falha iminente; o travamento é **desempenho**, não SSD morrendo.
- **App da Intel NÃO expõe o % de vida útil/SMART** nessa versão (só "Normal"). O número de wear só sai via `smartctl` (não instalado; sob VMD pode nem funcionar) — mas **não é bloqueante**: o BX500 QLC sem DRAM é arquiteturalmente errado pro workload independente do desgaste.
- **🔴 Achado novo e acionável:** painel da Intel mostra **"Cache de disco de dados: Desativado"** nos 2 SSDs. Cache de escrita desligado faz o QLC lento ficar **ainda mais lento sob escrita** → ajuda a entupir a fila e disparar os resets (evt 129). O servidor **TEM nobreak (confirmado pelo William)**, então ligar o cache de escrita é seguro (o risco do cache é corromper em queda de energia).

**Ação imediata (grátis, reversível):** habilitar o cache de escrita do volume RAID — Gerenciador de Dispositivos → Unidades de disco → "Intel Raid 1 Volume" → Propriedades → aba **Políticas** → marcar **"Habilitar cache de gravação no dispositivo"**. (Opcional, só por ter nobreak: marcar também "Desativar liberação do buffer".) Reversível desmarcando. Medir resets evt 129 antes/depois pelo logger.

**Continua valendo** a troca dos BX500 por SSD com DRAM/TLC (WD Red SA500 / Samsung 870 EVO / ou enterprise PM893) como correção definitiva — o cache só alivia.

---

## 2026-05-29 · ⚠️ Correção de orientação: cache de escrita — habilitar SÓ a Caixa 1

Correção da entrada anterior (que listava como "opcional" desativar a liberação do buffer). **Retificado:**

- **Caixa 1 "Habilitar cache de gravação no dispositivo" = OK / habilitar.** Risco baixo: SQL Server e Firebird continuam emitindo flush nos commits, então o banco **não corrompe** numa queda; no pior caso perde-se fração de segundo não-commitada. Reversível.
- **Caixa 2 "Desativar liberação do buffer de cache de gravação do Windows" = NÃO HABILITAR.** Suprime os flushes → numa queda de energia o banco **pode corromper de verdade**. Só seria segura com RAID de verdade com bateria (BBU), **não** com SSD de consumo + nobreak. Deixar SEMPRE desmarcada nesta máquina.
- **Escudo real numa queda longa:** o nobreak precisa estar configurado pra **desligar o servidor sozinho** quando a bateria estiver fraca (UPS software / energia do Windows) — senão queda longa = tombo mesmo. Backups diários (01:00 e 11:55) são a rede de segurança extra.
- **Decisão do William (2026-05-29):** habilitar **só a Caixa 1**. Acompanhar resets evt 129 no `_diag\disk-resets.log` nos próximos dias; se persistir sob carga, trocar os BX500.

---

## 2026-06-24 · Pipeline cria/inativa logins de COLABORADOR (Portal do Colaborador)

- **Missão do PC** (`criar-inativar-usuarios-colaborador`): o pipeline passa a provisionar as contas de Auth dos colaboradores via Admin SDK (login por CPF). 100% pipeline, sem UI.
- **Script novo `sync-colaborador-users.mjs`** (idempotente), plugado no `run-pipeline.mjs` como **passo 5/7 best-effort** (após upload, antes do heartbeat). Identidade: email sintético `{cpf}@colaborador.fiobras.local`, senha inicial = nascimento `DDMMAAAA`, `precisaTrocarSenha:true`. Grava `users/{uid}` (role colaborador, funcionarioId, codigo, nome, ativo, criadoPor:"pipeline") **sem PII** (CPF/PIS/nascimento NÃO entram em users — LGPD). Auditoria por criação/inativação. Fontes: `funcionarios` (ativo/diretor/situacao autoritativos) + `parsed-empregado.json` (cpf+nascimento).
- **Decisões do William (hoje):**
  - **Diretoria** (`diretor===true`): NÃO cria login.
  - **Aposentadoria por Invalidez** (os bhExempt "de verdade" — 122/140/384/420/470): NÃO cria.
  - **Afastado não-invalidez** (ex.: Licença Médica): cria (afastado acessa o portal).
  - **Readmissão:** reset senha pra nascimento + `precisaTrocarSenha` + "login novo / sem ver histórico antigo". A parte de senha/reativação está no pipeline; **"não ver histórico" é app-side** (escopo por `funcionarioId`) → pendente alinhar com o PC (gravar `readmitidoEm`? depende se o ERP reusa código). Não bloqueia (0 readmissões hoje).
- **1ª rodada (backfill), em produção:** **90 criados**, 0 inativados, 0 erros; pulados 3 diretoria + 5 invalidez; 0 sem CPF / 0 sem nascimento / 0 CPF duplicado. Idempotência confirmada (2ª passada: 0 criados, 90 "já existiam"). Relatório no bridge (`inbox-pc/2026-06-24-relatorio-1a-rodada-colaboradores.md`).
- **Pré-requisito de dados:** data de nascimento confirmada disponível (`funcionarios.nascimento` + `banco-horas-saldos.dataNascimento`, 100%); CPF de `parsed-empregado.json`/`banco-horas-saldos`. Missão movida pra `done/`.
- **Ajuste no mesmo dia — menor aprendiz SEM acesso:** William definiu que aprendiz também não acessa o portal. O script passou a tratar as 3 categorias sem-acesso (diretoria · invalidez · **aprendiz**) de forma unificada: **não cria E revoga login existente** (`ativo:false` + `auth disabled:true` + auditoria; nunca apaga). Os **4 logins de aprendiz** criados na 1ª rodada (f-1200/1201/1202/1203) foram **revogados**. Estado: **86 colaboradores com login ativo** (90 − 4). Idempotente. Update no bridge (`inbox-pc/2026-06-24-update-aprendiz-sem-acesso.md`).

## 2026-06-24 · Régua de acesso: SELF só no Portal do Colaborador (S3/S4 = won't-do)

- **Decisão do William:** a área de **gestor/supervisor/líder/RH/admin MANTÉM as regras atuais** — não mexer. O escopo estrito "cada um vê só o seu" (SELF) é **exclusivo do Portal do Colaborador**.
- **Consequência — S3/S4 da auditoria encerrado (won't-do):** NÃO vamos blindar o supervisor server-side. O pipeline **não** vai gravar o campo `supervisores: [...]` em `bancoHoras`/`ocorrencias`. Segue o trade-off já aceito (supervisor lê amplo com filtro client-side, escrita travada, sem PII nesses docs). Gestor/supervisor é público interno/confiável.
- **Portal do Colaborador:** SELF de ferro (rules `funcionarioId == uid`, sem CPF/PIS de terceiros) — é a superfície externa, gente nova logando; é onde a segurança aperta. Resposta definitiva ao re-ping do PC em `inbox-pc/2026-06-24-resposta-s3s4-escopo.md`.

## 2026-06-24 · Allowlist de teste no Portal (William diretor) + bug pós-troca-de-senha

- **Pedido do PC:** provisionar 1 login de teste do Portal pro William Schulz (diretor) — ele queria testar o portal antes do alfa. Como diretoria = "sem acesso" (não cria + revoga), criar simples não bastava (a sync diária revogaria).
- **Solução:** `ALLOWLIST_PORTAL = ['1029']` no `sync-colaborador-users.mjs` — códigos nela **bypassam** a exclusão por categoria (criam e **nunca são revogados**). William (f-1029) provisionado: `role:colaborador`, `ativo:true`, `precisaTrocarSenha:true`, sem PII no `users`. Match inequívoco (único "William Schulz" diretor; o "William Pereira Sehn" cód 1244 é outro, já tem login do backfill). Idempotência confirmada (re-run: 0 criados/0 revogados). Total colaboradores ativos: **87**. Reporte sem PII no bridge (`inbox-pc/2026-06-24-provisionado-login-teste-william.md`).
- **🐞 Bug aberto (do lado do app/PC):** colaborador (Jenifer f-671) loga, **troca a senha com sucesso, mas NÃO entra no app**. Dado 100% correto (verificado: ativo, precisaTrocarSenha já false, funcionario existe). Logo é o **fluxo de boot pós-troca** — suspeita: `permission-denied` (boot do colaborador rodando leitura ampla que as rules SELF bloqueiam) ou home real do colaborador não ligada. Diagnóstico fino em andamento (workflow). William vai bater no mesmo até o PC corrigir.

---

## 2026-06-25 · 🔗 WKBackup é gatilho-chave do RAID 100% + alerta de espaço no E:

Investigando `E:\WKRadar\Backup` (HD ocioso, fora do RAID — leitura segura), achado que **liga as duas pontas** com a investigação do RAID 100% (29/05):

- **O `WKBackup.exe` lê o banco INTEIRO do ERP do RAID SSD (D:) via VSS e copia pro E:.** Por execução: **~72 GB / ~430 mil arquivos** (o grosso é "Fiobras 2012" = **64 GB em 317.349 arquivos minúsculos**). Duração **~53 min** (11:55→12:48 no log de 25/06). **Roda 2×/dia (11:55 e 18:30)** → ~144 GB/dia lidos do RAID + escritos no E:.
- **Por que importa pro 100%:** ler ~317 mil arquivos pequenos do SSD é o **pior caso de I/O aleatório** pros BX500 QLC. 2×/dia por ~1h **em horário de expediente** = forte gatilho dos resets de controlador (evt 129). Os 4 resets das ~12h (histograma 90d) caem na janela do backup; as VSS shadow copies noturnas dos eventos 51 são desse backup.
- **Backup saudável:** log termina "concluído com Sucesso, 0 perdidos". Os ~17 mil "erros" do log são **falso positivo** (nomes de pasta `NFe\Emissao\Erro(s)`). Logs de 156 MB = verbosos (registram cada arquivo), não é bug.
- **⚠️ Espaço no E::** 92% usado, **301 GB livres** (eram 640 em 29/05 → −340 GB em 27 dias). Pasta de backup ≈ **2,9 TB** (~41 execuções × 72 GB), dominante no E:. Retenção observada ~21 dias (mais antigo 04/06).
- **Agendamento:** Windows Task Scheduler só tem o gatilho das **11:55** (tarefa "WKRADAR - Backup", sem repetição). O das **18:30 NÃO está no Task Scheduler** → provável **agendador interno do ERP WK** (ou tarefa só visível com admin). A confirmar.

**Recomendações (alavancam o RAID 100% + espaço), a validar com William/WK antes de mexer:**
1. **Mover o(s) backup(s) pra madrugada** (fora do expediente, escalonado do Windows Backup das 01:00) → tira ~2h/dia de leitura pesada do RAID de cima dos usuários do ERP = menos stall diurno.
2. **Reavaliar rodar 2×/dia.** 1×/dia à noite provavelmente basta → corta pela metade a carga no RAID e a escrita no E:.
3. **Encurtar retenção** (ex.: 21→10 dias) libera ~1,4 TB no E: (92% é zona de perigo).
4. Não alterar config de backup sem aval (é recuperação/compliance do ERP). Schedule/retenção podem estar dentro do WKBackup ou do ERP.

---

## 2026-06-25 · 🧹 Automação de limpeza de backups antigos (retenção 14 dias, 02:00 diário)

Continuando os achados do dia (E: a 92%, pasta backup ~2,9 TB, kits de 72 GB × 2/dia), o William pediu uma automação pra apagar backups com mais de 14 dias.

### Spec definida
- **Decisão pela data no NOME** do item (padrão `*-AAAA-MM-DD-HH-MM`), nunca pelos arquivos internos (que têm datas variadas).
- **Apaga pasta inteira, recursivo, permanente** (sem Lixeira).
- **Retenção: 14 dias.** Schedule: **1× por dia, às 02:00** (fora do expediente).
- **Trava de segurança:** o script só toca em itens cujo nome bata o regex `-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})(?:\.log)?$`. Qualquer outra coisa no Root (inclusive a pasta `_scripts\` e os próprios `_limpeza*.{log,txt}`) é IGNORADA.

### Artefatos criados (em `E:\WKRadar\Backup\_scripts\` — fora do projeto pipeline-rh)
- `limpa-backup-antigo.ps1` — o script. Modo dry-run por padrão (lista e salva snapshot em `_limpeza-dryrun.txt`); com `-Apply` apaga de verdade e loga em `_limpeza.log`. Aceita `-RetentionDays N` e `-MeasureSize` (opcional, lento).
- `REGISTRAR-tarefa-agendada-ADMIN.ps1` — registra a tarefa "WKRADAR - Limpa Backup Antigo" como SYSTEM, diária 02:00. Rodar **uma vez** numa janela admin.

### Validação (dry-run em 25/06 14:51)
- 290 itens no Root → **85 candidatos** (= 12 kits completos + 1 log órfão de 04/06) → 2 ignorados (`_scripts\` e o próprio snapshot — auto-proteção confirmada).
- Corte: itens com data anterior a 11/06 → preserva 14 dias completos a partir de 11/06.
- Estimativa de liberação na primeira execução: ~12 kits × ~72 GB ≈ **~864 GB** (E: hoje 92%/301 GB livres → vai pra ~30%/~1,1 TB livre depois).
- Execuções subsequentes: ~144 GB/dia entra, ~144 GB/dia sai (estável).

### Execução real
- Apagamento de hoje rodando em background sob o usuário do William (a tarefa SYSTEM ainda não foi registrada — exige admin). Próximas execuções serão pela tarefa agendada.

### Conexão com a missão do RAID 100%
A limpeza por si só **não muda** a leitura pesada do RAID feita pelo `WKBackup.exe` 2×/dia (gatilho do evt 129). O que ela resolve é o **espaço no E:** (que estava virando problema). Mover/diminuir backups continua na fila de recomendações futuras pra atacar o RAID.

### Aprendizado (2026-06-25 14:56) — precisa SYSTEM/admin

Tentativa de rodar `-Apply` com o usuário comum do William deu **"Acesso negado"** nos 85 itens (0 apagados, espaço inalterado). Causa: `WKBackup.exe` cria os arquivos como **SYSTEM** com ACL restrita; usuário não-elevado não tem DELETE. **Comportamento esperado e seguro** (proteção do NTFS).

Implicação: a limpeza **só funciona** rodando como SYSTEM (via tarefa agendada) ou numa janela admin. O script agora detecta esse caso e imprime uma mensagem clara no resumo.

**Plano:** William roda `REGISTRAR-tarefa-agendada-ADMIN.ps1` numa janela admin (cria a tarefa SYSTEM). Pra liberar os ~864 GB AGORA sem esperar 02:00, ele pode disparar a tarefa manualmente no Task Scheduler depois de criada (botão "Executar"), ou rodar `limpa-backup-antigo.ps1 -Apply` na própria janela admin.

---

## 2026-06-26 — Denormalização setor/turno em users/{uid} (pré-requisito da segmentação de Comunicados/Documentos)

**O quê:** o Pacote Gestor (Comunicados + Documentos institucionais) segmenta por turno e por setor, mas a rule `casaSegmento` lê `users/{uid}.setor` e `users/{uid}.turno` — campos que não existiam. Sem eles, qualquer comunicado segmentado (≠ "todos") negava todo mundo.

**Solução (lado pipeline, WKRADAR):**
- `sync-colaborador-users.mjs`: denormaliza em `users/{uid}` **só 2 campos não-PII** — `setor` (= `funcionarios.setor`/departamento) e `turno` (= `funcionarios.turno`, **tipo canônico preservado, SEM coerção**). Grava na criação e na reativação, e **mantém fresco a cada run** (self-heal: reescreve se o setor/turno do funcionário mudou).
- `backfill-users-segmentacao.mjs` (one-shot): populou os **91 colaboradores** já existentes. Idempotente (re-dry = 0 atualizados / 91 já ok), lê só Firestore (funcionarios + users), sem varrer disco, sem PII.

**Mapa canônico de turno (CONTRATO com a rule):** `1=Matutino, 2=Vespertino, 3=Noturno` (números) · `'geral'=Todos` (string) · `null`=sem turno. Confirmado em produção: convivem `number` (1/2/3) e `string` ('geral') — o pipeline passa adiante **sem converter** (a rule compara por tipo).

**LGPD:** `users` segue sem CPF/PIS/nascimento; `setor`/`turno` não são PII.

**Não mexeu em rule:** a rule de segmentação já estava escrita/testada pelo PC (Emulator verde). O pipeline só alimenta os campos.

**Raciocínio:** denormalizar em `users` (em vez de a rule cruzar com `funcionarios`) mantém a regra barata (1 get do próprio doc) e evita o colaborador ler `funcionarios` de terceiros. Self-heal evita segmentação velha quando alguém troca de turno/setor.

**Achado pro PC:** os setores reais vêm em MAIÚSCULAS (PREPARAÇÃO, REPASSE, DIRETOS BENEFICIAMENTO, ADMINISTRAÇÃO, ...). O dropdown de setor do compositor tem que usar esses valores exatos (o mock usava "Produção"/"Administrativo", que não casam) — montar a partir dos setores distintos reais.

---

## 2026-06-25 · ✅ Limpeza de backup executada com sucesso (945 GB liberados)

Continuação do dia. Limpeza inicial dos backups antigos foi feita via wrapper de batches pra não saturar o HD.

### Resultado
- **Espaço livre em E:: 301 GB (92% usado) → 1.246 GB (67% usado).** **+945 GB liberados** em 53 min.
- 82 itens apagados em 20 batches (≈4–5 por batch), pausa adaptativa 60s base (subia se disco %time>60).
- **0 erros** nos 20 batches.
- Datas restantes: **12/06 → 25/06 = 14 dias exatos** preservados, como combinado.
- Log de auditoria: `E:\WKRadar\Backup\_limpeza-batches.log` e `_limpeza.log`.

### Achado novo: por que apagar tudo de uma vez trava o servidor (mesmo o HD sendo "separado")
Os 3 discos estão atrás do **mesmo controlador Intel VMD/RST** (Port 0, Bus 2, Targets 4/5/6 — SSDs do RAID + HD do E:). I/O massivo no E: enche a fila do controlador e atrasa o RAID também. Somam-se: o Windows escreve no event log/pagefile do C: pra cada delete, cache de metadados NTFS na RAM pressiona o sistema, VSS/notificações de filesystem disparam. Batches com pausa adaptativa entre eles dão tempo pra fila/cache/journal drenarem. Validado empiricamente nesta execução: sistema permaneceu responsivo, sem evento 129.

### Bandeira amarela: tarefa agendada 02:00 sumiu
`REGISTRAR-tarefa-agendada-ADMIN.ps1` rodou e retornou "OK - Tarefa registrada" mostrando próxima execução 26/06 02:00. Mas verificação ~1h depois (`Get-ScheduledTask`) retornou TAREFA NAO ENCONTRADA. Causa não identificada (sem evento de delete no log, sem tentativa de auditoria — sumiu silencioso). Plano: William re-roda o script de registro. Se sumir de novo, investigar policy/política de tarefas ou registrar via `schtasks.exe /Create` direto como alternativa.

### Wrapper de batches — artefatos
- `E:\WKRadar\Backup\_scripts\limpa-backup-em-batches.ps1` — wrapper. Param `-Batches N` (padrão 20), `-BasePauseSec N` (padrão 60), `-Apply`.
- O principal (`limpa-backup-antigo.ps1`) ganhou `-MaxItems N` (pega só os N mais antigos por execução, sort por data crescente).
- **Da próxima limpeza diária pela tarefa SYSTEM**: como só sobram ~2 itens/dia pra apagar (kit novo entra, kit velho de 15 dias atrás sai), o script principal direto roda rápido — não precisa de batches.

---

## 2026-06-26 · ✅ Correção: tarefa agendada NUNCA sumiu — minha verificação que falhou

Continuação direta da entrada anterior ("bandeira amarela: tarefa agendada 02:00 sumiu").

**Correção honesta:** a tarefa estava registrada o tempo todo. O que falhou foi minha **verificação remota** via `Get-ScheduledTask` num shell **sem privilégio elevado** — tarefas registradas como SYSTEM/`RunLevel Highest` não são visíveis assim. `schtasks /Query` também retornou "Acesso negado" no shell normal, o que confirma o problema de leitura, não de existência.

**Prova:** verificação feita pelo William na própria janela admin em 26/06 09:27 retornou:
```
NextRunTime              LastRunTime              LastTaskResult
27/06/2026 02:00:00      26/06/2026 02:00:01      0
```
A tarefa rodou automaticamente hoje 02:00:01 com sucesso (LastTaskResult=0). Provavelmente apagou o kit do dia 11/06 (que com corte hoje <12/06 virou >14d).

**Lição:** ao verificar tarefas com privilégio elevado a partir de uma sessão não-admin, dá silenciosamente vazio em `Get-ScheduledTask`. Não confundir "não consegui ver" com "não existe". Próxima vez: pedir verificação direto na janela admin do operador, OU executar via `Invoke-Command -ScriptBlock { ... }` com credenciais elevadas.

**Status final:** automação 100% operacional. Sem ação humana pendente.

---

## 2026-06-26 · 🧪 Automação de ocorrências (atraso/falta/saída) da apuração do WK — TESTE

**Objetivo:** as ocorrências de ponto passam a sair AUTOMÁTICAS da apuração do WK Radar pra área do gestor, em vez da Suyanne digitar uma a uma. RH só **confere**.

**Fonte nova:** `Radar Ponto → Apurações → Relatório de Apurações` salvo como Exportação Automática → `Config_Relatorio_de_Apurações.txt` → `ExpAuto_Apuracoes.txt` (latin1, `;`, com cabeçalho). Mesmo motor do BH/D_Empregado. Parser `process-apuracoes.mjs` (mapeia por nome de coluna).

**Regras de negócio (decididas com o William):**
1. **Só 4 situações** vão pro app: Atrasos, Faltas Injustificadas, Saída Antecipada, Saída Intermediária (checkboxes no WK). Extras/licenças/abonos/férias = fora.
2. **Colapsa o split interno do WK** (mesmas batidas/situação no dia em 2+ linhas, saldo fatiado) → 1 ocorrência por **código+data+situação**.
3. **Turno GERAL:** atraso/saída do Geral vai pro banco de horas (NÃO gera ocorrência); **só Falta Injustificada gera**. Turnos 1/2/3 geram tudo. (junho: 160 → **90** ocorrências.)

**Conferência — achado importante:** o **"Conferido" do WK NÃO é exportável** (não existe campo nem filtro no modelador — só o checkbox da tela operacional Apuração Mensal). Então **o app é o dono da conferência**: pipeline é **cria-e-NUNCA-reabre** (id estável; se o doc existe, preserva o status; conferida fica conferida). Na produção, **data de corte** evita despejar o histórico já tratado. (Long-shot futuro: perguntar pro Mik se dá pra expor o Conferido via fórmula/Info Plus.)

**Teste (sandbox):** coleção **`ocorrencias-auto`** (SEPARADA da `ocorrencias` de produção) populada com 90 ocorrências de junho. PC vai criar uma **aba de revisão** no gestor (cap admin/RH, aditiva). Bridge: `claude-bridge/inbox-pc/2026-06-26-ocorrencias-auto-teste.md`.

**Status:** TESTE — ainda NÃO está no `run-pipeline.mjs` diário. Vira rotina só depois que William + RH validarem a aba. Scripts novos em `C:\fiobras-pipeline-rh`: `process-apuracoes.mjs`, `upload-ocorrencias-auto.mjs`, `inline-run-apuracoes-export.mjs`.

---

## 2026-06-26 · ⏰ Pipeline 3×/dia em dias úteis + D_Empregado dobrado pra dentro do pipeline

**Agendamento:** a tarefa `Fiobras Pipeline RH` (Task Scheduler, roda como `wkradar`/Limited) passou de 1 trigger diário 08:00 pra **3 triggers semanais seg–sex: 08:00, 10:00 e 14:00** (sem sábado/domingo). Feito direto via `Set-ScheduledTask` (tarefa é do usuário wkradar, não-elevada → editável do shell). `DaysOfWeek=62` = Mon–Fri.

**Exportação do Radar dentro do pipe:** o `run-pipeline.mjs` (passo 1) agora roda o `ExportacaoAutomatica.exe` pra **BH E D_Empregado** (antes só BH; o D_Empregado dependia da tarefa separada das 07:40). Assim **uma execução do pipeline cobre os dois exports** + processa + sobe. Adicionado `WK_EMP_CONFIG` (Config_Informativos.txt) no `config.mjs`.

**Porquê:** (1) William quer BH/cadastro atualizando 3×/dia, não só de manhã; (2) o **monitor novo** pegou o `ExpAuto_D_Empregado.txt` com ~30h — a tarefa das 07:40 não rodou hoje. Dobrar o D_Empregado pra dentro do pipeline conserta a defasagem de vez (re-exporta a cada run) e deixa o pipeline auto-suficiente.

**Redundância:** a tarefa `WKRadar Export D_Empregado` (07:40) ficou redundante (o pipeline já exporta o D_Empregado 3×/dia) e foi **desabilitada** em 26/06 (a `WKRadar Export BH` das 07:45 já estava Disabled). Agora o `run-pipeline.mjs` é a fonte única de todos os exports.

**Teste:** rodada manual OK em 34s (2 exports → ~17s a mais que antes); D_Empregado regenerado (mtime = agora).

---

## 2026-06-26 · 📊 Monitor do Pipeline RH (doc monitor/wkradar + painel no gestor)

**Objetivo:** painel no Portal do Gestor pra ver, num olhar, se os exports do Radar + o pipeline rodaram 100% (inspirado no "Status dos arquivos" do sistema Comercial). William aprovou o mock.

**Back:** novo `write-monitor.mjs` grava `monitor/wkradar` no fim de **cada execução** (passo **[8/10]**, antes do heartbeat; sempre roda, registra até falha). Coleta: idade dos CSVs do WK (BH, D_Empregado), frescor das coleções (pipeline-rh/cur, banco-horas-self, bancoHoras, aniversariantes, funcionarios, logins) e o status/duração do run (via env). Status por fonte: ok (idade ok) / atenção (>6h = não regenerou neste run) / parado (>48h ou faltando). **SEM PII.** Pipeline agora = 10 passos.

**Front:** o PC cria o painel "Status do pipeline" (lê `monitor/wkradar`, renderiza `fontes[]` dinâmico, cap admin/RH, aditivo). Bridge: `claude-bridge/inbox-pc/2026-06-26-monitor-pipeline-painel.md`.

**De quebra:** o monitor já pegou um problema real — o `ExpAuto_D_Empregado.txt` estava com ~30h (tarefa 07:40 não rodou). Resolvido ao dobrar o export do D_Empregado pra dentro do pipeline (entrada acima). Scripts novos: `write-monitor.mjs`, `inline-monitor-data.mjs`.

---

## 2026-06-26 · 🎨 Redesign premium do Portal do Colaborador (5 telas) + super-HTML

**Objetivo:** depois da home aprovada (auditoria de 29 achados + redesign), William pediu pra estender a linguagem premium pras outras telas do colaborador e "apresentar num super HTML".

**Feito:** redesenhei as 4 telas restantes na **mesma identidade exata** da home — **Conta/Perfil**, **Banco de horas**, **Comunicados/Avisos**, **Documentos**. Linguagem: 3 níveis de elevação (repouso/card/herói), herói de marca (gradiente verde + glow) com no máx. 1 por tela, saldo negativo em **âmbar** (nunca vermelho), light "anti-lavado" (`#EEF3EC`), dark padrão + toggle, sem emoji, ícones Tabler, `tabular-nums`, `aria`/`sr-only`. Cada tela escopada sob id raiz único (`#scr-*`).

**Entregáveis** (`docs/mockups/`): `colaborador-{conta,bh,comunicados,documentos}-redesign.html` + **super-HTML mural** `portal-redesign-showcase.html` (as 5 telas em frames de celular). Spec atualizado em `PORTAL-COLABORADOR-DESIGN.md`. Handoff: `claude-bridge/inbox-pc/2026-06-26-colaborador-redesign-pacote.md` (bind real por tela: funcionarios/{meuId}, pipeline-rh/cur.funcionarios[].lancamentos[], comunicados/{id}+leituras, documentos/{id}+assinaturas).

**Método:** workflow multi-agente (1 agente por tela, tokens premium pinados) → montagem do mural → render inline pra aprovação.

**Em paralelo (PC, no ar):** Monitor "Status do pipeline" (v193, lê monitor/wkradar) e Aniversariantes na home (v195, lê config/aniversariantes). Próximo: **redesign premium do Portal do Gestor** (Dashboard, Comunicados-composição, Documentos institucionais, Conferência de ocorrências, Monitor) — mesma linguagem, shell desktop compartilhado.

---

## 2026-06-26 · 🎨 Redesign premium do Portal do Gestor (5 telas, desktop)

**Objetivo:** William liberou estender a linguagem premium pro **Portal do Gestor** ("pode fazer de tudo, inclusive do portal do gestor") e apresentar num super-HTML. Só design (regras/permissões do gestor intocadas; tudo aditivo).

**Feito:** 5 telas desktop num **shell compartilhado** (rail 232px com marca + nav + usuário/toggle; topbar + conteúdo) — **Dashboard**, **Comunicados (composição)**, **Documentos institucionais**, **Conferência de ocorrências** (aba de teste), **Monitor**. Mesmos tokens do colaborador (dark padrão + toggle, herói de marca, 3 elevações, light anti-lavado, sem emoji, Tabler, tabular-nums, aria). Cada tela escopada sob `#g-*`.

**Destaques:**
- **Conferência de ocorrências** materializa as regras já capturadas: herói com breakdown por tipo, cards com previsto×apurado + saldo + observação do WK, botões Conferir/Ajustar/Descartar, card já-conferido discreto, card da regra do **Turno Geral** (só falta injustificada gera), selo "Ambiente de teste", rodapé "Origem: ocorrencias-auto".
- **Dashboard** com KPI-herói "12 ocorrências a conferir" + headcount por setor (barras) + atividade do pipeline.
- **Comunicados** = composer (segmento/fixar/exigir confirmação) + lista com métrica de leitura. **Documentos institucionais** = upload + adesão por documento.

**Método:** workflow multi-agente (1 agente/tela, shell + tokens pinados, ancorado no mockup de conteúdo real) → assembler Node limpa fragmentos (tira prosa/cercas) → mural `gestor-portal-redesign-showcase.html` + 5 telas `gestor-{dash,com,doc,ocr,mon}-redesign.html`.

**Handoff:** `claude-bridge/inbox-pc/2026-06-26-gestor-portal-redesign-pacote.md` (bind/backend por tela). O Monitor já está no ar (PC v193); o redesign é alinhamento visual. firestore.rules é do PC — não tocado.

---

## 2026-06-26 · 🎯 Ocorrências: fonte canônica = relatório "Relação de Ocorrências por Empregado" (pivot)

**Virada:** o William trouxe o relatório do WK **"Relação de Ocorrências por Empregado"** (PDF, 5 págs, 155 linhas, jun/2026). É a fonte LIMPA e oficial — **substitui** o parse da apuração (`process-apuracoes`, que inferia situação a partir de Ocorrência=Sim). O relatório já vem **filtrado nas 4 situações** que vão pro app e com a **magnitude**.

**Colunas:** `Cód.E · Nome · Cód.D · Departamento · Data · Cód.(sit) · Situação · Diurnas · Noturna`. **Códigos de situação:** 32 Faltas Injustificadas · 36 Atrasos · 37 Saída Antecipada · 38 Saída Intermediária (zero ruído — sem compensado/DSR/abono).

**2 regras confirmadas pelo William:**
1. **Só dias FECHADOS (D-1 pra trás).** A emissão de 26/06 14:31 trouxe **22 "Faltas de 08:00"** de gente que ainda estava trabalhando — artefato do dia aberto. O export usa `DataFinal=ontem` e o parser descarta `dataIso >= hoje`.
2. **Turno GERAL:** atraso/saída vão pro banco de horas (NÃO geram ocorrência); **só Falta Injustificada gera**. Turnos fixos geram tudo. A escala/turno vem do `D_Empregado` (parsed-empregado) por código (o relatório não traz turno).
3. Dedupe por (código+data+situação); splits de situações diferentes no mesmo dia ficam como 2 ocorrências.

**Construído (em `C:\fiobras-pipeline-rh`):** `process-ocorrencias.mjs` (parser novo, detecção de delim/cabeçalho + as 3 regras), `inline-run-ocorrencias-export.mjs` (seta datas D-1 + roda o exe), e `config.mjs` ganhou `WK_OCORR_CONFIG`/`OCORRENCIAS_CSV_PATH`/`PARSED_OCORRENCIAS_OUT`/`COL_OCORRENCIAS_AUTO`.

**Falta (ação WK do William):** criar o export do relatório no modelador do WK → `Config_Relatorio_de_Ocorrencias.txt` gerando `ExpAuto_Ocorrencias.txt` (TXT delimitado, com cabeçalho, sem aspas, todos os funcionários). Depois: validar parser contra o TXT real → adaptar `upload-ocorrencias-auto.mjs` → repovoar `ocorrencias-auto` → entrar no `run-pipeline`. `process-apuracoes.mjs` fica como histórico (descontinuado).

---

## 2026-06-26 · ✅ Ocorrências reais NO AR em ocorrencias-auto (59) — fluxo end-to-end

**Funcionando ponta a ponta:** `inline-run-ocorrencias-export.mjs` (datas→D-1 + ArquivoExportacao→ASCII, byte-safe latin1) → `ExpAuto_Ocorrencias.txt` → `process-ocorrencias.mjs` (parser rico, detecção de coluna por nome) → `parsed-ocorrencias.json` → `upload-ocorrencias-auto.mjs --reset` → `ocorrencias-auto` (59 docs). Apagados os 90 docs antigos (teste de apuração antigo, com 26/06 + Geral errados).

**Distribuição (junho, D-1):** 30 Faltas Injustificadas + 18 Atrasos + 11 Saídas Antecipadas = 59 (73 atrasos/saídas de Geral filtrados pra BH).

**🔑 Quirk WK aprendida:** o **`ExportacaoAutomatica.exe` IGNORA** o `ListarSomenteOcorrencias=Sim` e o `IdsSituacoes` do config — a exportação automática sai com a **apuração inteira** (6348 linhas, todos os dias). Então o filtro das 4 situações é feito **no parser** (process-ocorrencias), não no WK. (O filtro do config só vale na emissão interativa.)

**Config:** o Integrador WK criou `Config_Relatorio_de_Apurações1.txt`; o William renomeou tirando o "1" → `Config_Relatorio_de_Apurações.txt`. Usa o **modelo da apuração** (`ExpAuto_Relatorio_de_Apuracoes`), não o "Relação de Ocorrências" de 9 colunas — o que é melhor (vem com previsto×apurado + saldo). `WK_OCORR_CONFIG`/`OCORRENCIAS_CSV_PATH` no config.mjs apontam pra ele; o runner reescreve ArquivoExportacao→`ExpAuto_Ocorrencias.txt` (ASCII, sem ç/õ).

**Limitação conhecida:** neste layout o **saldoDiário de falta = 00:00** e a magnitude (8h) não vem em coluna — pro card de falta usar `marcacoesApuradas==null` ("sem marcação") + `marcacoesPrevistas`. Atrasos/saídas têm previsto×apurado.

**Status:** TESTE/sandbox validável na aba de conferência. **Ainda NÃO está no run-pipeline diário** — entra como rotina depois que William + RH validarem a aba. Bridge: `claude-bridge/inbox-pc/2026-06-26-ocorrencias-auto-dados-reais.md`.
