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

---

## 2026-06-29 · ✅ Ocorrências (Relação de Ocorrências) — export HEADLESS, sem automação de tela

**O quê:** o pipeline passou a gerar as ocorrências do RH (faltas/atrasos/saídas → `ocorrencias-auto`) de forma **HEADLESS**, via `ExportacaoAutomatica.exe` + o config `Config_Relatorio_de_Apurações1.txt` — a MESMA mecânica do export do BH. **Não depende mais de automação de tela** (e portanto não depende de sessão desbloqueada).

### Cadeia (3 passos novos no run-pipeline.mjs, todos best-effort)
- `export-ocorrencias.mjs`: reescreve no config (byte-safe latin1, preserva 1252+CRLF) `DataInicial`=1º-do-mês / `DataFinal`=hoje + `ArquivoExportacao`→ASCII, e roda `ExportacaoAutomatica.exe ...1.txt /Silent` → CSV.
- `process-ocorrencias-rh.py <CSV>`: lê o CSV (latin-1, `;`) OU XLSX (mesmas colunas), aplica **D-1** (corta dataIso>=hoje) + **regra do Geral** (turno geral: atraso/saída→BH, só Falta gera) → `parsed-ocorrencias.json` (84 ocorrências).
- `upload-ocorrencias-auto.mjs`: sobe pra `ocorrencias-auto` (cria-e-nunca-reabre).

### A descoberta (por que agora funciona)
O histórico dizia que o export de apuração NÃO batia com o relatório do RH — mas isso era com o config antigo. O William já tinha ajustado o **`...Apurações1.txt`** no Modelador do WK pra ficar IDÊNTICO ao relatório do RH (9 colunas: Cód.Emp·Nome·Cód.Depto·Departamento·Data·Cód.Sit·Situação·Diurnas·Noturnas). **Verificado 2026-06-29: o CSV headless é byte-a-byte == o XLSX que sai pela UI (197=197 brutas, zero diff)** → 84 após regras. Casos-chave batem (DAVID 1232, JOILSON 1185, CIBELE 1229). A pista veio do William ("já existe uma exportação automática aqui no sistema, talvez podes usar").

### Caminho percorrido (registro do esforço)
Antes de achar o headless, foi construída uma automação de **TELA** completa (`rh-export-auto.ps1`, PowerShell) que dirige a UI do WK. No processo descobriu-se que **o WK Radar 7.20 é um app Chromium/CEF** (menu hambúrguer web — navega por teclado com o mouse jogado pro canto, senão fecha) + diálogos **NATIVOS MFC** (visualizador `Afx:`, "Salvar como" `#32770`). Exportar = ícone "grade verde" (#3 da toolbar), NÃO o do Excel (#4, que exige MS Excel instalado e dá erro). Funcionou (gerou XLSX idêntico em ~24s), MAS: exige sessão Windows DESBLOQUEADA (tela bloqueada → `CopyFromScreen` "identificador inválido", `SendKeys` "Acesso negado") e é frágil (coordenadas 1920×1080). Por isso virou só **FALLBACK**.

### Arquivos
- Novos: `export-ocorrencias.mjs` (runner headless), `rh-export-auto.ps1` (fallback de UI).
- Editados: `config.mjs` (`WK_OCORR_CONFIG` → `...Apurações1.txt`), `process-ocorrencias-rh.py` (lê CSV **ou** XLSX), `run-pipeline.mjs` (bloco de ocorrências: export headless → parse → upload, best-effort).
- Já agendado: roda dentro da tarefa "Fiobras Pipeline RH" (run-pipeline.mjs, 3x/dia) — sem tarefa nova.

### Validação + fix dinâmico (mesmo dia, à tarde)
O William exportou o relatório na mão (`teste atualizado 30.06.xlsx`) pra conferir. Comparação programática revelou:
- Regra do Geral OK (PEDRO 183 e os 30 funcionários geral filtrados, 0 vazamento — nem na saída nem na coleção).
- **Achado:** o headless deixava recém-contratados de fora (ex.: DIONEIA 1244) porque o config `...1.txt` tinha `IdsFuncionarios` ESTÁTICA. **Fix:** `export-ocorrencias.mjs` agora LIMPA `IdsFuncionarios` a cada run → **seleção DINÂMICA** (pega todos, inclusive novos). Pós-fix a DIONEIA passou a bater exatinho com o manual.
- Diferenças residuais (2 ocorrências) eram o RH **justificando ao vivo** no WK entre as exportações — o headless ficou até mais atual. Não é bug.

**Coleção `ocorrencias-auto` RESETADA** (`upload --reset`: 144 antigas apagadas → 93 atuais) pro RH conferir do zero. Verificado: 93 docs, 0 PEDRO, 0 vazamento de Geral. (Task #13 — inscrever os 6 recém-contratados no BH — segue pendente, mas agora eles JÁ aparecem nas ocorrências via seleção dinâmica.)

### Regra estendida aos LÍDERES DE TURNO (William, mesma sessão, 30/06)
O William apontou que os **líderes de turno** seguem a mesma regra do Geral (atraso/saída → BH, só Falta gera) mesmo tendo turno fixo. Identificados pelo campo **`cargo` = "LIDER DE TURNO"** no cadastro: **ADELIR PADILHA (785), DJONIFFER KRIECK (866), NIVALDO CLASEN (140)** — o NIVALDO o William nem tinha citado, mas o filtro por cargo pegou. `process-ocorrencias-rh.py` agora trata `turno=='geral' OU cargo contém 'lider'` igual (pega líderes futuros automático). Efeito: o DJONIFFER tinha **9 atrasos/saídas** que saíram da conferência (só ficou a falta de 27/06). Coleção re-resetada (80 atuais). **Pendência observada:** o último dia (D-1) pode vir com pico de falta-falsa se a apuração ainda não fechou — William decidiu DEIXAR como está (RH dispensa na conferência); a regra do Geral/Líder fica (faltas de Geral/Líder geram, como a MARIA).

### Refinamento de inativos + fluxo de 2 estágios (William, 30/06 à tarde)
- **Líderes setados À MÃO** (`LIDERES={785 ADELIR, 866 DJONIFFER}`), **NÃO por cargo** — o cargo "LIDER DE TURNO" pegava o **NIVALDO 140**, que é **afastado** (aposentadoria por invalidez). William: "tem que olhar tudo".
- **AFASTADOS excluídos** (NIVALDO). **DEMITIDOS APARECEM** marcados (`situacaoFunc`, `demitido`) — a falta deles é real (vira suspensão/rescisão, o RH precisa ver): JOILSON 1185 = 8 faltas → demitido **29/06**, todas reais. Mas só **ATÉ a `demissaoIso`**; ocorrência após a saída corta (safeguard; hoje 0, o WK não lista pós-saída). Coleção em **73**.
- **Fluxo novo (MOCKADO, p/ o PC implementar):** a aba "Conferência (beta)" vira estágio dentro de **Ocorrências** — 2 níveis: **RH confere** (valida/dispensa) → **com o líder** (age c/ colaborador) → **confirmada** (+ Dispensadas). Demitido com tag "em rescisão". **Permissão:** o líder precisa enxergar o estágio "com o líder" do SEU setor — mexe em segmentação de gestor = domínio do Claude do PC. Missão pro PC pendente de aprovação do William.

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

---

## 2026-06-27 · 🩹 Fix: setor vinha do relatório de BH (defasado), não do D_Empregado

**Sintoma (William reportou):** após o pipeline rodar, divergências de setor — **REPASSE** e **RETORCEDEIRAS**. 6 funcionários com `funcionarios.setor` errado vs o cadastro: DAIANE(1037), AMANDA(1192), ANDRIELLI(1210)→REPASSE; SIMONE(1158), MARCELO(1235), SINTIA(1239)→RETORCEDEIRAS.

**Causa:** `upload-to-firestore.mjs` usava `primary.departamento` (linha 116: `primary = bh || emp`, BH preferencial) pra gravar `setor`. O **departamento do relatório de BH defasa** o do **D_Empregado** (cadastro autoritativo, mantido pelo RH). Quando alguém muda de setor, o D_Empregado atualiza antes do BH. O pipeline JÁ logava o aviso `depto diverge BH vs Emp` (cross-validation) — mas gravava o do BH mesmo assim. Propagava pra `users.setor` (segmentação), `bancoHoras` (líder) e `pipeline-rh` (app).

**Fix:** setor agora prefere `emp?.departamento` (D_Empregado), caindo no BH só se não houver cadastro. 4 pontos: `funcionarios.setor` (L149), `bancoHoras.setor` (L305), `pipeline-rh.departamento` (L390) e `process-ocorrencias` (setor da ocorrência). Re-rodei upload + sync-colaborador-users → **0 divergências** (cadastro = funcionarios = users). Código corrigido → próximas execuções saem certas.

**Aberto (menor):** 10 `users` com setor null — provavelmente contas de gestor/admin/líder (sem funcionario), não colaboradores. A confirmar se incomoda.

---

## 2026-06-29 · 🎯 Ocorrências REAIS: regras de magnitude + batida (de 84 → 43)

**Problema (William):** a Conferência estava cheia de "Falta Injustificada" com **saldo 00:00** onde a pessoa **bateu ponto e trabalhou** (ex.: JHENYFFER bateu 21:56–05:05). Não eram faltas reais.

**Investigação:** o relatório limpo "Relação de Ocorrências" (com Diurnas/Noturnas) é **do RH, não está no Minerador** — não dá pra automatizar por ele. Solução: adicionamos as colunas **Horas Diurnas + Horas Noturnas** ao modelo da apuração (`ExpAuto_Relatorio_de_Apuracoes`). Aí descobrimos a semântica real:
- **Atraso/Saída:** Diurnas/Noturnas = a **magnitude real** da ocorrência (DJONIFFER atraso 00:12, FRANCIELE saída 00:30). Bom sinal.
- **Falta:** Diurnas/Noturnas mostra as **horas do turno** mesmo p/ quem trabalhou (JOILSON "falta 08:00" tendo batido 05:02–13:32). NÃO distingue falta real de falsa.

**Regras finais no `process-ocorrencias.mjs`:**
1. Só 4 situações (32/36/37/38) + Ocorrência=Sim.
2. **Falta só é REAL se SEM batida** (ausência total). Bateu ponto → rótulo errado → descarta. (47 falsas removidas em junho.)
3. **Atraso/Saída:** magnitude (Diurnas+Noturnas) > 0 (real). (Regra `magnitude 0` só ativa quando o layout tem essas colunas.)
4. Turno Geral: atraso/saída → BH (só falta gera). 5. D-1. 6. Dedupe.

**Resultado:** 6497 linhas → **43 ocorrências reais** (11 Faltas + 20 Atrasos + 12 Saídas), repovoadas em `ocorrencias-auto`. Magnitude guardada (`diurnas`/`noturna`/`duracaoFmt`) p/ o card mostrar.

**Em aberto:** atraso compensado por hora-extra continua aparecendo (foi atraso de fato); suprimir é regra futura se o RH quiser. Partial-absence (trabalhou parte) não vira falta — se saiu cedo, aparece como Saída.


---

## 2026-06-30 · ✅ Fluxo RH→Líder + uploader (rh_confere, situacaoFunc/demitido) + reset mensal

**Contexto:** unificar a aba "Conferência (beta)" na aba "Ocorrências" com um estágio extra ANTES de "pendentes": o RH confere → manda pro líder → líder confirma. Missão enviada ao Claude PC (`inbox-pc/2026-06-30-ocorrencias-fluxo-rh-lider.md`); ele fechou a máquina de estados e está mockando (subiu `docs/mockups/disciplinar-modal-v2.html`).

**Máquina de estados (definida com o PC):**
```
pipeline cria => "rh_confere"
  RH valida   => "com_lider"   → líder confirma => "confirmada"
  RH dispensa => "dispensada"
```
Mantém "cria-e-nunca-reabre": o pipeline nunca volta um status que o app já avançou.

**Mudanças no pipeline (lado WKRADAR):**
1. `upload-ocorrencias-auto.mjs`: status inicial `aguardando_conferencia` → **`rh_confere`**. E passou a **gravar `situacaoFunc`** ("Trabalhando"/"Rescisão") **e `demitido`** (bool) no doc — antes estavam só no parser e não chegavam no Firestore (o app não enxergava). `demitido==true` → app mostra pill "em rescisão".
2. `run-pipeline.mjs`: **reset mensal automático**. Guarda o mês corrente em `ocorrencias-mes.txt`; se virou o mês, sobe com `--reset` (zera a coleção). **01/07 começa limpo** no esquema novo. Estado inicializado em `2026-06` pra não resetar junho à toa.

**Regras de quem aparece (revalidadas com o William):**
- Turno **Geral** e **líderes de turno** (ADELIR PADILHA 785, DJONIFFER KRIECK 866 — setados MANUALMENTE por código, NÃO por cargo) → atraso/saída vai pro BH; **só Falta gera ocorrência**.
- **Afastados** (ex.: NIVALDO) → NÃO entram.
- **Demitidos** (ex.: JOILSON — era suspensão) → **aparecem marcados** pro RH, mas só até a data de demissão (corte pós-demissão como salvaguarda).
- Seleção **dinâmica** (IdsFuncionarios vazio) → pega recém-contratados (ex.: DIONEIA).

**Decisão em aberto (PC + William):** recorte do líder por **setor** ou **turno** (app hoje usa turno via `liderDoMesmoTurno`; sugeri setor). Não afeta o pipeline — mando `setor` e `turno` no doc. `faltasMes`: PC conta no cliente (sem campo denormalizado).

**Go-live:** 01/07 (aparece 02/07 pelo delay D-1).


---

## 2026-06-30 · 🔎 Auditoria não mostra leitura/assinatura do colaborador — causa-raiz + missão pro PC

**William:** "na auditoria precisa aparecer quando o colaborador lê e assina o documento — não tá aparecendo."

**Investigação (workflow 3 agentes, read-only no app):** causa dupla + exibição.
1. **Regra:** create no `/auditoria` é só admin/RH (`firestore.rules:181-188`). O `registrarAssinaturaDocumento` (firebase.js:1272) JÁ chama `registrarAuditoria`, mas roda no fluxo do COLABORADOR (sem `auditoria.ver`) → write **negado**, cai no catch best-effort → a assinatura **nunca persiste** no log (só push otimista local que some no reload). Por isso nem a assinatura aparece pro RH.
2. **Código:** leitura/ciência (`registrarLeituraDocumento` 1276, `registrarLeitura` comunicado 1032, `darCienciaDisciplinar` 1386) não chamam `registrarAuditoria`.
3. **Exibição:** `coletarAuditoria` (app.js:8266) não lê as subcoleções de assinaturas/leituras/ciência; `classificarAcaoAuditoria`/`AUD_FILTROS` (app.js:8242-8263) sem categoria pra isso.

**Encaminhamento:** rules + app/firebase são domínio do PC → não mexi. Missão `inbox-pc/2026-06-30-auditoria-leitura-assinatura.md` com 2 opções — **A (recomendada):** auditoria ingere as subcoleções via collectionGroup, sem afrouxar a regra imutável; **B:** afrouxar `/auditoria` pra evento "self" do colaborador — + mudanças de exibição (keywords + chip "Leituras & Assinaturas") + nota de sensibilidade (disciplinar). PC decide a arquitetura.

**À parte (mesmo dia) — email "pages build and deployment ... Failed":** é o GitHub Pages travado (deploy `294e101e` "em andamento" → todo push novo falha). NÃO afeta produção: o app roda no **Firebase** — `gh.fiobras.com.br` e `weave-fiobras.web.app` confirmados por header (sem `Server: GitHub.com`; o github.io tem `Server: GitHub.com` e título diferente "| ocorr-ponto" = espelho vestigial/desatualizado). Recomendado **desligar o Pages** (Settings → Pages → Source: None) pra parar os emails; não toca gh.fiobras.com.br nem weave (ambos Firebase, sem CNAME no repo).


---

## 2026-06-30 · 🔌 GitHub Pages DESLIGADO (decisão: William)

**Contexto:** emails "pages build and deployment ... Failed" chegando a cada push. Investigado: o app roda 100% no **Firebase** — `gh.fiobras.com.br` e `weave-fiobras.web.app` resolvem pra `199.36.158.100` (IP do Firebase Hosting) e os headers HTTP não têm `Server: GitHub.com`. O GitHub Pages (`williamscchulz-was.github.io/ocorr-ponto`, IPs `185.199.108–111.153`) era um espelho **vestigial e desatualizado** (título "…| ocorr-ponto"; deploy travado no commit `294e101e` "em andamento" → toda republicação falhava, gerando os emails).

**Decisão (William):** **desligar o Pages.** Settings → Pages → Build and deployment → Source "Deploy from a branch" → **Branch = None** + Save. Site unpublished; os emails de falha cessam. **Produção intacta** — Firebase não usa Pages, e não há CNAME no repo apontando o domínio pro Pages.

**Aprendizado (como distinguir Firebase × GitHub Pages):** (a) **IP** — Firebase Hosting = `199.36.158.100`; GitHub Pages = `185.199.108–111.153`. (b) **Header** — Pages sempre manda `Server: GitHub.com` + `X-GitHub-Request-Id`; Firebase não. Útil pra futuras dúvidas de "qual URL é servida por quem".


---

## 2026-06-30 · 🏷️ "GH" não "RH" + piso de go-live 01/07 (coleção zerada)

**William (vendo a aba nova no ar):** "mostrar somente ocorrências a partir de julho — essa aba deveria estar vazia agora. Além disso, não é RH na Fiobras, é GH."

**Piso de go-live (meu lado — FEITO):** `process-ocorrencias-rh.py` ganhou `GO_LIVE = "2026-07-01"` — descarta ocorrência com `dataIso < 2026-07-01` (junho era teste/sandbox). Re-rodei o parser no CSV de junho: 199 brutas → 28 cortadas (D-1, dia aberto) → **171 cortadas (pré-go-live) → 0**. `upload-ocorrencias-auto.mjs --reset` zerou a coleção (73 → 0). **Aba vazia agora**; de 02/07 entram só ocorrências de julho+ (com o D-1 de sempre). Casa com o reset mensal automático que já existe.

**"GH" não "RH" (pro PC):** na Fiobras o setor é **GH (Gestão Humana)**, não Recursos Humanos. Missão `inbox-pc/2026-06-30-gh-nao-rh-e-piso-julho.md`: PC troca o label `RH confere` → `GH confere` (e todo "RH" visível → GH). O status interno `rh_confere` → `gh_confere` foi proposto como rename **opcional COORDENADO** (coleção vazia = momento limpo; landar antes de 02/07) — aguardando o PC decidir o caminho.


---

## 2026-06-30 · ✏️ Correção: é GP (Gestão de Pessoas), NÃO "GH"

Na entrada anterior registrei "GH (Gestão Humana)" — **errado**. O William corrigiu o próprio engano: o setor na Fiobras é **GP — Gestão de Pessoas** (nem RH, nem GH). Substituir GH→GP em tudo: label da aba "GP confere", textos visíveis (slogan "o batimento do RH" no `index.html` ×5, `changelog.js`, `roadmap.js`), e o status interno `gp_confere` **se** decidirmos renomear.

Missão corrigida pro PC: `inbox-pc/2026-06-30-gp-gestao-de-pessoas.md` (substitui a `...gh-nao-rh-e-piso-julho.md`). **Escopo em decisão com o William:** só texto visível (seguro) × também o identificador interno do papel `rh`→`gp` (migração de user docs + `firestore.rules` + 34 refs no app — risco; precisa de plano). O `rh_confere`→`gp_confere` é barato agora (coleção vazia) se for "tudo".


---

## 2026-06-30 · ✅ GP — decisões do William: só texto visível + remover o slogan

Sobre o RH→GP, William decidiu: (1) **escopo só VISÍVEL** — NÃO renomear o papel interno `rh`/`isRH()`/`firestore.rules`/role nos user docs/`rh_confere` (invisível; zero migração/risco; meu uploader segue `rh_confere`); (2) **remover o slogan** "Fiobras · o batimento do RH" (não substituir, só tirar — "não precisa por ora"); (3) demais textos visíveis → GP (aba "GP confere", `changelog.js`, `roadmap.js`). Repassado ao PC: `inbox-pc/2026-06-30-gp-decisoes-william.md`. Meu lado (pipeline) não muda nada — é tudo texto/UI do app.


---

## 2026-06-30 · 🚨 Removido o aviso "validade jurídica plena" da assinatura (urgente, William)

William pediu URGENTE pra tirar o texto "(não é validade jurídica plena)" das telas de assinatura. Removido em `app.js`: ~5734 (modal "Adesão", `<span>` do footer inteiro) e ~1183 (sheet de assinar do colaborador — só a frase do disclaimer, mantida a instrução útil de redigitar a senha). `roadmap.js` #33 ("Assinatura N3 — validade jurídica") NÃO tocado (é feature planejada). Editado por mim (WKRADAR) no domínio do app por urgência; flag no bridge pro PC. **Falta deploy** (`firebase deploy --only hosting:weave`) pra ir ao ar. Bridge: `inbox-pc/2026-06-30-urgente-tira-validade-juridica.md`.


---

## 2026-06-30 · 📋 Auditoria completa: log de TODO evento + LOGINS (desenho, decisões William)

William quer a auditoria pegando **todo evento significativo de todo usuário + logins**. Workflow (3 agentes) mapeou o estado: hoje só **~25%** das ações sensíveis entram no log global; **logins não** são logados; e a **regra do `/auditoria` bloqueia o colaborador** de escrever (raiz do problema).

**Decisões do William:** escopo = **eventos significativos** (não cada clique/visualização); login = **client-side agora** (auto-relato; server-side/Cloud Function fica pra depois).

**Desenho recomendado (missão `inbox-pc/2026-06-30-auditoria-completa-eventos-logins.md`):** coleção própria **`/eventos`** append-only, **self-write** (`por == auth.uid`) + read `auditoria.ver` — destrava login de todos + eventos de colaborador + a ciência/assinatura da missão anterior numa fonte só. Helper `logEvento()` nos pontos significativos: login/logout (`onAuthStateChanged` firebase.js:2479 + `logout` 1837 + auto-logout 2270), senha (alterar/reset/zerarPrecisa), CRUD de funcionário/usuário/papel/tipo/bancoHoras (**lote = 1 evento-resumo**, não N), ciência/assinatura. `coletarAuditoria` ingere `/eventos` (4ª fonte) + filtros novos (Acessos/Senha/Dados/Ciências).

**Cuidados:** client-side = não pega login falho nem é anti-fraude (server-side é evolução); volume controlado (significativos + lote resumido); PII só pra `auditoria.ver`. **Unifica** a missão `2026-06-30-auditoria-leitura-assinatura.md`. Domínio do PC (rules + app); **pipeline não escreve em `/eventos`** — não me afeta.


---

## 2026-06-30 · ✅ Espelho de Ponto no banco-horas-self (marcações reais por dia) — LIVE

William quer o colaborador vendo **o horário que bateu, por dia** (espelho de ponto), **NEUTRO** ("sem julgamento"). Implementado e no ar.

**Fonte:** relatório de apuração NOVO montado no WK Modelador pelo William — **config 4** (`Config_Relatorio_de_Apurações4.txt`). Diferença do antigo (`ExpAuto_Apuracoes.txt`): **"Listar somente ocorrências" DESMARCADO + situações "Vários"** → traz `Originais`/`Apuradas` (batidas REAIS) em TODO dia trabalhado, não só nos de ocorrência. (O antigo mostrava a OLINDA vazia porque ela é **aposentada por invalidez**, não porque suprimia.)

**Pipeline (lado WKRADAR, novo — não-git, local):**
- `config.mjs`: `WK_ESPELHO_CONFIG` (config 4), `ESPELHO_CSV_PATH` (`ExpAuto_Espelho_Ponto.txt`, ASCII), `PARSED_ESPELHO_OUT`.
- `export-espelho.mjs`: reescreve byte-safe latin1 (janela rolante ~20 dias, saída ASCII, `IdsFuncionarios` vazio=todos, `GerarSemAspas=1`) + roda o `.exe`; **espera o arquivo FRESCO aparecer** (o exe roda destacado, não dá pra confiar no exit code).
- `process-espelho-ponto.mjs`: parser → `dias[]` (últimos ~12, mais recente 1º), colapsa o split do WK, à prova de aspas. Campos: `{dataIso, diaSemana, marcacoes[], apuradas[], saldoDiaFmt (running, fim do dia), situacoes[]}`. SEM PII.
- `upload-banco-horas-self.mjs`: junta `dias[]` no doc self (só ativos; demitidos sem login não entram — ex.: JOILSON 1185).
- `run-pipeline.mjs`: passos novos (export-espelho no bloco de exports + process-espelho-ponto antes do upload self).
- **Testado ponta a ponta: 93 colaboradores no ar** (183 PEDRO com 12 dias de batidas reais).

**Lado app (PC):** missão `inbox-pc/2026-06-30-espelho-de-ponto-portal-colaborador.md` — renderizar **NEUTRO** na tela "Meu banco de horas": só os horários; dia sem batida = "Folga"/"Sem marcação"; **NÃO** mostrar Atrasos/Falta/Suspensão pro colaborador (`situacoes[]` fica pro RH). Dados já legíveis.

**Aprendizado WK:** o relatório de apuração só preenche `Originais/Apuradas` em dia de ocorrência quando "Listar somente ocorrências" / filtro de situação restringem. Desmarcando + todas as situações, vem a batida de TODO dia trabalhado. Ver memória project-apuracao-marcacoes.


---

## 2026-07-01 · 🔧 Espelho de Ponto → mês vigente + 🐛 bug real do WK (janela de 1 dia) + correção de um falso alarme

**Pedido do William:** `dias[]` no `banco-horas-self` deixar de ser "últimos ~12 dias" e virar o **MÊS VIGENTE inteiro** (dia 1 → hoje) — formato natural de espelho de ponto. UI do PC já suporta (renderiza tudo que vier, sem cap de 12).

**Implementado:** `export-espelho.mjs` pede `DataInicial`=1º-do-mês (era janela rolante ~20 dias); `process-espelho-ponto.mjs` trocou `N_DIAS=12` (slice) por `MAX_DIAS=31` (teto de segurança) + sem filtro de contagem.

**🐛 Bug real do WK descoberto no teste (dia 1º/07, o pior caso — mês vigente = 1 dia só):** quando `DataInicial == DataFinal` (janela de 1 dia), o exportador do WK **silenciosamente não gera arquivo nenhum** pro relatório de Espelho de Ponto (confirmado reproduzindo: janela 01/07→01/07 não gerou; 30/06→01/07 gerou normal). Bateria **TODO dia 1º de mês**, pra sempre.
**Fix:** no dia 1º, `export-espelho.mjs` e `update-config-dates.mjs` esticam `DataInicial` pra ONTEM (cruza pro mês anterior, garante ≥2 dias na janela); o parser (`process-espelho-ponto.mjs`) filtra esse dia extra fora (só fica `dataIso >= 1º-do-mês-vigente`), mantendo o contrato "só mês vigente" limpo.

**⚠️ Quase um alarme falso — Banco de Horas:** ao investigar, achei que a rodada automática das 08:00 de hoje tinha "zerado" o saldo de TODO MUNDO em `bancoHoras` (o mesmo bug de janela de 1 dia também afeta `Config_Banco_de_Horas.txt`, via `update-config-dates.mjs`). Cheguei a tratar como incidente crítico — **mas comparei com o histórico real de junho no Firestore antes de alarmar**: dia 1º de **junho** TAMBÉM mostrava saldo 00:00 pra esses mesmos funcionários (dado real, gerado pela pipeline normal do mês passado). Conclusão: **"Banco Horas Mensal" reseta por desenho todo dia 1º** — 00:00 no dia 1º É o valor correto, não é bug de dado. Apliquei a mesma correção defensiva em `update-config-dates.mjs` (estica pra ontem no dia 1) por segurança/consistência — **não** porque o valor estivesse errado, mas pra não depender de um comportamento frágil do WK (janela de 1 dia = risco de "nada gerado" nesse OU em outros relatórios no futuro). Reprocessei a cadeia (process-bh → upload-to-firestore → upload-banco-horas-self) com a janela corrigida; `pipeline-rh/cur` migrou certo pro mês 2026-07 (junho virou histórico fechado).

**Aprendizado geral:** qualquer script que monta janela `DataInicial`=1º-do-mês / `DataFinal`=hoje precisa garantir ≥2 dias (nunca janela de 1 dia só) — é uma fragilidade do exportador do WK, não específica de um relatório.

---

## 2026-07-01 · 🔎 Auditoria completa do backend (fiobras-pipeline-rh) — 55 achados, 49 confirmados

William pediu auditoria completa do backend. Workflow com 6 frentes em paralelo (parsing/dados, escrita Firestore, orquestração/resiliência, segurança/config, consistência entre scripts, observabilidade/logging) + verificação adversarial de cada achado (61 agentes, ~2.7M tokens). **55 achados preliminares → 49 confirmados / 6 refutados (falso positivo)** pela verificação.

**Críticos (2):** (1) reset mensal de `ocorrencias-auto` (`upload-ocorrencias-auto.mjs`) apaga a coleção ANTES de validar que o novo parse tem dados — se o parser falhar/gerar vazio no dia da virada de mês, a conferência do mês inteiro some sem nada pra repor. (2) `upload-to-firestore.mjs` lê turno/ativo de `funcionarios` DEPOIS de já ter escrito lá — janela teórica de turno desatualizado indo pro `bancoHoras` (usado pra isolar líder por turno nas rules).

**Altos (9):** GO_LIVE hardcoded no `process-ocorrencias-rh.py` (deveria estar em config, não no código — vira permanente e não dá pra reabrir histórico depois); `runScript`/`runExe`/`runPython` sem timeout (sub-processo travado = pipeline pendurado pra sempre, nunca chega no heartbeat); export de BH best-effort sem checar idade do CSV (dado velho processado como se fosse fresco, sem aviso); `write-monitor.mjs` não cobre `banco-horas-saldos` (PII) nem `banco-horas` (histórico); `process-espelho-ponto.mjs` best-effort sem alerta se falhar (Portal fica sem marcações, ninguém percebe); `log()` engole erro de escrita do arquivo de log silenciosamente.

**Médios (~20):** `parseInt(...)||null` mascara zero legítimo em `process-empregado.mjs`; configs do WK reescritos in-place sem atomic write/backup; `LIDERES={"785","866"}` hardcoded por código (risco se reatribuído); tipos de `turno` inconsistentes (number vs string) entre scripts; batch=400 vs 500 inconsistente entre uploaders; delete em lote sem try/catch por commit; `ocorrencias-mes.txt` fora do `.gitignore`; regex de config não valida se a substituição realmente aconteceu.

**Baixos/info:** portabilidade zero (paths Windows hardcoded), `process-ocorrencias.mjs` é código morto (nunca chamado, substituído por `process-ocorrencias-rh.py`), docs órfãos em `banco-horas-self` quando colaborador é demitido (sem risco de vazamento, é só limpeza), path absoluto do WK exposto no heartbeat público (baixo risco).

**Refutados (6, falso positivo — verificação funcionou):** overflow de CPF (função já rejeita !=11 dígitos), heartbeat não rodar em erro não-capturado (o catch já envolve tudo, roda sempre), "bug" no regex `$11$2` do GerarSemAspas (JS interpreta certo, não é bug), PII vazando em logs de erro (err.message nunca carrega os valores), escrita não-atômica de `ocorrencias-mes.txt` (a ordem do código já protege isso).

**Status:** nenhum fix aplicado ainda — William vai priorizar o que corrigir. Relatório completo na conversa com o Claude WKRADAR.


---

## 2026-07-01 · ✅ Corrigidos os 2 achados CRÍTICOS da auditoria de backend

William priorizou: só os 2 críticos por ora. Ambos corrigidos e testados com dado real (não sintético).

**1) `upload-ocorrencias-auto.mjs` — trava contra reset com parse vazio.** Antes: `--reset` (virada de mês) apagava a coleção ANTES de checar se o novo parse tinha dado. Se o parser falhasse/CSV corrompesse no dia da virada, a conferência do mês inteiro sumia sem nada pra repor. Fix: se `--reset` e `occ.length === 0`, aborta com `exit(1)` ANTES de tocar na coleção (mensagem clara no log). Como `ocorrencias-mes.txt` só é escrito se o upload terminar com sucesso, a próxima rodada tenta o reset de novo automaticamente. **Testado com dado real**: hoje (01/07, dia do go-live) o parse de fato veio com 0 ocorrências (D-1 corta 01/07 e GO_LIVE também é 01/07 — dia 1 nunca tem ocorrência válida, por desenho) — a trava abortou corretamente em vez de reprocessar/apagar de novo.

**2) `upload-to-firestore.mjs` — elimina a releitura de turno/ativo que causava a race.** Antes: `uploadBancoHorasApp` e `uploadPipelineRH` faziam CADA UMA seu próprio `.get()` de `funcionarios` DEPOIS que `uploadFuncionarios` já tinha commitado — janela teórica onde uma escrita externa (admin manual) entre essas leituras deixaria `bancoHoras`/`pipeline-rh` com turno desatualizado (rule de isolamento do líder por turno depende desse campo). Fix: `uploadFuncionarios` agora CALCULA e RETORNA `{turnoByDocId, ativoByDocId}` em memória (o valor final que ela mesma decidiu escrever/preservar), e `uploadBancoHorasApp`/`uploadPipelineRH` recebem isso por parâmetro em vez de reler o Firestore. Elimina a classe inteira de race + 2 queries redundantes da coleção inteira por rodada. **Testado**: rodei o upload completo e comparei `funcionarios.turno`/`bancoHoras.funcionarioTurno`/`pipeline-rh.cur.turno` pra 3 funcionários — idênticos entre as 3 coleções, sem regressão.

**Não aplicados (William decidiu deixar pra depois):** os outros 47 achados (9 altos + ~20 médios + ~18 baixos/info) da auditoria completa de 2026-07-01. Lista completa na conversa com o Claude WKRADAR.


---

## 2026-07-01 · ✅ 6 achados "alto" da auditoria de backend corrigidos e testados

William: "manda ver" nos altos. Corrigidos, um por um, testados com pipeline real rodando de ponta a ponta ao final (exit 0, 17.7s, sem regressão).

1. **Timeout em `runScript`/`runExe`/`runPython`/`runPowerShell`** (`run-pipeline.mjs`) — antes, sub-processo travado deixava o pipeline pendurado pra sempre (nunca chegava no heartbeat). Agora cada helper mata o processo (`p.kill()`) e rejeita se passar do timeout (5min scripts, 3min exe, 5min python, 10min powershell).
2. **Idade do CSV de BH checada** (`process-bh.mjs`) — se a exportação do WK falhar e o CSV ficar velho, agora vira warning explícito (>24h) em vez de processar dado velho como se fosse fresco, silenciosamente.
3. **`GO_LIVE` movido pra `config.mjs`** (`OCORRENCIAS_GO_LIVE`) — `process-ocorrencias-rh.py` recebe via 2º argv (passado por `run-pipeline.mjs`), com fallback pro valor de sempre se rodado manual/isolado. Fonte única, não precisa mais editar o `.py` pra mudar o piso.
4. **Monitor cobrindo `banco-horas-saldos` (tinha PII, zero cobertura) e `banco-horas` (histórico)** (`write-monitor.mjs`) — pontos cegos fechados. **Achado extra durante o teste**: o histórico usa doc por func×mês, e meses FECHADOS nunca mais são reescritos — um `limit(1)` sem `orderBy` pegava um doc antigo por acaso e dava falso "parado". Corrigido com `orderBy('atualizadoEm','desc')`.
5. **Espelho de ponto: falha silenciosa agora visível** — monitor passou a trackear o mtime do `parsed-espelho-ponto.json` (se `process-espelho-ponto.mjs` falhar, o arquivo intermediário fica velho e aparece no monitor, em vez de sumir sem ninguém perceber).
6. **`log()` não engole mais erro de escrita silenciosamente** (`run-pipeline.mjs`) — se `appendFileSync` no log falhar (disco cheio, permissão, arquivo trancado), agora vai pro stderr também (Task Scheduler costuma capturar), em vez de só desaparecer.

**Verificação:** monitor foi de "1 parado" (falso alarme do histórico, corrigido) pra "11 ok / 0 atenção / 0 parado". Pipeline completo rodado do zero (export → parse → upload → monitor → heartbeat), exit 0.

**Não aplicados ainda:** ~20 médios + ~18 baixos/info da auditoria de 2026-07-01. Ficam documentados pra quando o William quiser retomar.


---

## 2026-07-01 · ✅ Espelho de ponto: mês anterior + mês vigente (2 meses) no ar

William quer guardar 2 meses (vigente + anterior), não só o vigente — doc cabe tranquilo (~10-12KB de 1MB, confirmado pelo PC). Implementado:

- `export-espelho.mjs`: `DataInicial` = 1º do mês **ANTERIOR** (era 1º do vigente). Bônus: essa janela nunca fica de 1 dia só (mesmo no dia 1º do mês vigente, o mês anterior inteiro garante ≥28 dias de intervalo) — **elimina de vez** o bug do WK de janela de 1 dia (achado nesta mesma sessão, mais cedo hoje), sem precisar mais do hack de "estica pra ontem".
- `process-espelho-ponto.mjs`: piso do filtro passou de "1º do mês vigente" pra "1º do mês ANTERIOR"; teto de segurança `MAX_DIAS` 31→**62**.
- Comentários atualizados em `config.mjs`/`upload-banco-horas-self.mjs`/`run-pipeline.mjs`.

**Testado com dado real**: janela ficou `01/06 → 01/07` (confirmado no export); 183/356 vieram com 30 dias (01/06→30/06, 01/07 ainda não apurado — característica normal, não bug). Doc verificado no Firestore: ~5.2-5.8 KB hoje (vai estabilizar ~10-12KB com o mês fechado). Pipeline completo rodado de ponta a ponta de novo (com os 6 fixes "alto" + essa mudança juntos): exit 0, monitor 11 ok / 0 atenção / 0 parado.

Avisei o PC (`inbox-pc/2026-07-01-espelho-2-meses-no-ar.md`) — zero mudança do lado dele (já agrupa por mês, "acende sozinho").


---

## 2026-07-01 · ✅ Achados "médio" da auditoria de backend — varredura quase completa

William: "autorizo ir para os médios". Testado tudo junto no final (pipeline completo, exit 0, monitor 11 ok/0/0).

**Corrigidos:**
1. `process-empregado.mjs`: `parseInt(...)||null` mascarava zero legítimo (idade/codEscala/diasNaEmpresa) → `parseIntOrNull` novo (só null se NaN de verdade). 0 casos afetados hoje, protege caso futuro (contratado no dia 0).
2. `process-empregado.mjs`: CSV do D_Empregado sumir saía com `exit(0)` ("sucesso" falso) → agora `exit(1)`, orquestrador loga o aviso de verdade.
3. `process-apuracoes.mjs`: path hardcoded do parsed-empregado → `CONFIG.PARSED_EMPREGADO_OUT`.
4. `upload-ocorrencias-auto.mjs`: batch 400→500 (padroniza com os outros uploaders); delete-loop do RESET com try/catch + mensagem clara se falhar no meio (fica parcial, idempotente, próxima rodada retry).
5. `write-heartbeat-report.mjs`: `writeFileSync` do report agora em try/catch (antes crashava cru se disco cheio/permissão negada).
6. `update-config-dates.mjs` + `export-ocorrencias.mjs` + `export-espelho.mjs` (os 3 que reescrevem config do WK): escrita ATÔMICA (temp+rename, não writeFileSync direto — protege contra processo morto no meio) + verificação por releitura byte-a-byte (confirma que o que foi escrito bate com o que devia, sem confiar só no replace() em memória).
7. `sync-colaborador-users.mjs` + `backfill-users-segmentacao.mjs`: comparação de turno tolerante a tipo (`String(a)===String(b)`) pra não gerar update falso se um lado tiver number e outro string — SEM mudar o que é escrito (tipo canônico intacto; o PC depende dele nas rules/query do líder, então não uniformizei o tipo, só a comparação).
8. `write-monitor.mjs`: strings de coleção → `CONFIG.COL_*` (única fonte).
9. `.gitignore`: `ocorrencias-mes.txt` adicionado (defensivo — esta pasta não é repo git hoje).
10. `process-ocorrencias.mjs` (211 linhas, ZERO referências em qualquer lugar, confirmado por grep) — **deletado**. Resolve de quebra o achado "comportamento divergente entre process-ocorrencias.mjs e process-ocorrencias-rh.py": não tem mais o que divergir.

**Avaliados e propositalmente NÃO alterados (com razão):**
- **LIDERES hardcoded** (`{"785","866"}`) — a auditoria sugeriu derivar de cargo/flag; mas foi decisão DELIBERADA do William (2026-06-30) reverter de "por cargo" pra "manual" justamente porque cargo pegava o NIVALDO (afastado) como líder. Reverter contradiria a própria correção. Mantido.
- **Portabilidade** (paths Windows hardcoded em `config.mjs`) — todo o sistema é Windows-tied (WK Radar roda só em Windows, `.exe` nativo). Portabilidade Linux/Mac não tem uso prático aqui. Não vale o esforço.
- **CPF/PIS/nomeMãe sem criptografia em `parsed-empregado.json`** — é uma decisão de arquitetura (key management pra encriptar em repouso), não um bug de código. Precisa de decisão do William antes de implementar algo.
- **Race de `ocorrencias-mes.txt`** (escrita DEPOIS do upload) — reavaliado: é a ordem CORRETA. Se escrevesse ANTES e o upload falhasse, a próxima rodada NÃO tentaria de novo (pior). A ordem atual garante retry automático e idempotente. Nada a mudar.

**Não abordados nesta rodada** (rated "baixo"/"info" pela auditoria, fora do escopo autorizado: só médios): ~18 achados menores documentados na entrada de auditoria original.

---

## 2026-07-01 · 🛡️ 3 melhorias de robustez na limpeza de backup (checagem de logs + reforço)

Após 6 dias de execução automática sem erros (26/06-01/07), revisão completa dos logs (`_limpeza.log` + `_limpeza-batches.log`, 884 linhas) confirmou: **nenhum erro novo** desde a correção de permissão do dia 25/06. Aproveitado pra implementar 3 reforços de robustez sugeridos e aprovados pelo William.

### 1. Rotação do `_limpeza.log`
Novo parâmetro `-LogMaxMB` (padrão 5). Antes de cada execução `-Apply`, se `_limpeza.log` passar de 5 MB, é movido pra `_limpeza.log.1` (mantém só 1 histórico) e um novo log começa limpo. Testado isoladamente (pasta scratch): confirmado que rotaciona corretamente e preserva o conteúdo anterior no `.1`.

### 2. Circuit-breaker contra apagar demais
Novos parâmetros `-MinKeepDays` (padrão 7) e `-StaleAfterDays` (padrão 2). Antes de apagar, o script agora calcula:
- **Idade do backup mais recente encontrado** — se > `StaleAfterDays`, assume que o `WKBackup.exe` parou de gerar backups novos (ERP fora do ar, tarefa falhando, etc.) e **aborta a exclusão** desta execução (não quer continuar "comendo" os únicos backups que sobraram).
- **Dias distintos que sobrariam após apagar** — se < `MinKeepDays`, também aborta (proteção contra reduzir a retenção real abaixo de um mínimo seguro, mesmo que o `RetentionDays` configurado diga 14).

Se disparar (modo `-Apply`): loga `CIRCUIT-BREAKER ACIONADO`, sai com `exit 3`, chama o alerta (item 3), e **não apaga nada** nessa execução. Em dry-run, só avisa (não aborta, já que dry-run não apaga mesmo).

Testado com sucesso (dry-run, pasta de produção): forçando `-StaleAfterDays 0` e `-MinKeepDays 20` artificialmente, ambos dispararam corretamente sem apagar nada.

Também atualizado `limpa-backup-em-batches.ps1`: detecta a string `CIRCUIT-BREAKER ACIONADO` na saída de cada batch e interrompe o loop inteiro (evita várias chamadas repetidas / vários alertas em sequência se o breaker disparar no meio de uma limpeza grande).

### 3. Alerta ativo: popup na tela + arquivo marcador
Nova função `Send-Alert`, chamada quando: (a) há erro ao apagar algum item (`errCount > 0`), ou (b) o circuit-breaker aborta uma execução `-Apply`. Faz duas coisas:
- Grava/sobrescreve `E:\WKRadar\Backup\_ULTIMO-ERRO.txt` com data, motivo e caminho do log completo — registro persistente mesmo se ninguém estiver olhando na hora.
- Dispara `msg.exe * /TIME:0` (popup nativo do Windows, fica até ser fechado manualmente) pra qualquer sessão logada no servidor.

**Validação:** testado em pasta isolada (não mexeu na produção). O popup não apareceu quando disparado pela sessão do Claude (headless, sem sessão gráfica anexada — comportamento esperado). William testou manualmente `msg * /TIME:30 "..."` na própria janela admin e **confirmou que o popup aparece normalmente**. Como a tarefa real roda como SYSTEM (que tem permissão pra sinalizar qualquer sessão ativa via WTS API), o popup deve funcionar quando alguém estiver logado no servidor; se ninguém estiver logado (ex: 2h da manhã), o popup simplesmente não é visto no momento — mas o arquivo `_ULTIMO-ERRO.txt` garante que o alerta não se perde.

### Armadilha de encoding descoberta (repetida do incidente do `REGISTRAR-tarefa-agendada-ADMIN.ps1`)
Ao escrever as novas strings do script, o uso de **travessão "—"  dentro de literais de string** (fora de comentários) quebrou o parser do PowerShell 5.1 com erros confusos e em cascata ("Token inesperado", "string sem terminador", etc.) — mesma classe de problema do incidente anterior com backtick de continuação de linha. Causa provável: encoding/codepage na escrita do arquivo corrompe caracteres multibyte dentro de strings tokenizadas (comentários não sofrem, pois não são tokenizados). **Lição adicionada ao padrão de trabalho:** evitar travessão "—", aspas curvas e backticks dentro de string literals em `.ps1` neste servidor — usar hífen simples "-" e, se precisar quebra de linha, usar `[Environment]::NewLine` ou string multi-linha real em vez de `` `r`n ``. Sempre validar com `[System.Management.Automation.Language.Parser]::ParseFile()` após editar.

### Arquivos alterados
- `E:\WKRadar\Backup\_scripts\limpa-backup-antigo.ps1` — +5 params, rotação de log, circuit-breaker, `Send-Alert`.
- `E:\WKRadar\Backup\_scripts\limpa-backup-em-batches.ps1` — detecta `CIRCUIT-BREAKER ACIONADO` e aborta o loop de batches.


---

## 2026-07-01 · ✅ PII no disco: William decidiu — reduzir janela de exposição (não criptografar)

Perguntei ao William "como criptografar" o `parsed-empregado.json`/`parsed-bh.json` (têm CPF/PIS/nome da mãe/nascimento em texto puro). Apresentei 4 opções (reduzir janela de exposição / DPAPI do Windows / chave em arquivo ao lado / BitLocker no disco todo), explicando o que cada uma protege de verdade:
- **DPAPI**: robusto (preso à conta+máquina), mas exige chamar PowerShell a cada leitura/escrita — complexo.
- **Chave em arquivo ao lado**: pouca proteção real — quem lê o JSON também lê a chave do lado.
- **BitLocker (disco todo)**: só protege contra roubo físico do disco, não contra acesso normal ao Windows já ligado (o cenário mais provável aqui).
- **Reduzir janela de exposição**: sem criptografia, sem chave — apaga o arquivo logo depois do último consumidor da rodada.

**Decisão: reduzir a janela de exposição.** Implementado em `run-pipeline.mjs`: depois do `write-heartbeat-report.mjs` (passo 9, confirmado por grep como o ÚLTIMO consumidor de ambos os arquivos numa rodada), o pipeline apaga `parsed-bh.json` e `parsed-empregado.json` (`unlinkSync`, best-effort, nunca derruba o pipeline). Antes: os 2 arquivos ficavam no disco o dia inteiro entre as 3 execuções (08h/10h/14h). Agora: só existem durante os ~20-30s da rodada em si — o resto do tempo (a maior parte do dia), não existem no disco.

**Testado com dado real**: pipeline completo rodado do zero — `PIPELINE OK · 21.6s`, log confirmou `[PII-cleanup] removido` pros 2 arquivos, e depois do run os arquivos de fato não existiam mais no disco (verificado com `ls`).

**Nota:** scripts de debug manual (`inline-check-setores.mjs` e similares) que leem `parsed-empregado.json` fora de uma rodada do pipeline vão precisar rodar `process-empregado.mjs` primeiro pra regenerar o arquivo — comportamento esperado, não é bug.


---

## 2026-07-01 · ✅ 4 achados "baixo/info" com ganho real — corrigidos e testados

William: "aplica o que é ganho real e bora!" — os 4 que recomendei (dos ~18 baixo/info restantes da auditoria):

1. **Contadores de descarte do parser de ocorrências agora persistem no JSON** (`process-ocorrencias-rh.py`): novo campo `regras` em `parsed-ocorrencias.json` — `{goLive, hoje, brutas, final, puloAberto, puloPreGoLive, removidoGeral, removidoAfastado, removidoPosDemissao, demitidoMarcado}`. Antes só existiam no console (stdout efêmero de uma rodada agendada) — se um dia sumissem ocorrências demais, ninguém teria como auditar o porquê dias depois. Testado: campo confere com o console (184 pré-go-live hoje).
2. **`export-espelho.mjs`: `Atomics.wait()` (bloqueava a thread) → `setTimeout`/`await` (top-level await, ESM nativo)** no loop que espera o arquivo do WK aparecer. Testado com export real, funcionou igual.
3. **Path do servidor removido do report público do heartbeat** (`write-heartbeat-report.mjs`): `sourceCSV` e `## Source` agora mostram só `basename` (ex.: `ExpAuto_Banco_de_Horas.txt`), não mais `D:\WKRadar\BI\Registros\...` — o report vai pro GitHub, não precisa expor estrutura de disco/RAID do servidor.
4. **Limpeza de docs órfãos em `banco-horas-self`** (`upload-banco-horas-self.mjs`): quando colaborador é demitido/some do BH, o doc dele agora é apagado (antes ficava pra sempre — sem risco de vazamento, rule SELF já travava, mas lixo acumulando). **Testado com dado real: encontrou e removeu 2 docs órfãos de verdade que estavam sobrando em produção.**

**Verificação final:** pipeline completo rodado do zero com TODAS as correções da sessão juntas (2 críticos + 9 altos + médios + esses 4) — `PIPELINE OK · 23.6s`, monitor 11 ok/0 atenção/0 parado, heartbeat commitado e enviado, `sourceCSV` confirmado sem path do servidor.

**Consequência colateral notada**: como `parsed-bh.json`/`parsed-empregado.json` agora são apagados no fim de cada rodada (decisão de hoje sobre PII), rodar os scripts isoladamente fora de uma rodada completa exige regenerar esses arquivos primeiro (`node process-bh.mjs` / `node process-empregado.mjs`) — comportamento esperado, documentado.

**Restam ~14 achados baixo/info** (teóricos/risco quase-zero ou decisão de negócio) não abordados nesta rodada — ver entrada anterior "Achados médio" pra lista completa do que foi avaliado e propositalmente deixado de lado.


---

## 2026-07-01 · 🎨 Mega auditoria de UI/UX do Portal do Colaborador (inspirada na Apple)

William pediu auditoria completa de design (mobile+desktop) do Portal do Colaborador, com inspiração em princípios de design da Apple (clareza, hierarquia, espaço generoso, profundidade sutil, movimento com propósito) — **preservando a identidade Fiobras** (verde + Poppins).

**Workflow:** mapeamento das 9 telas do colaborador (Acesso, Login CPF, Troca de Senha, Home, Meu Ponto, Conta, Avisos, Documentos, Roadmap) + 9 agentes em paralelo (tipografia, espaçamento, cor/profundidade/dark mode, movimento, navegação, ergonomia mobile, ergonomia desktop, consistência de componentes, acessibilidade) → 79 achados brutos → 1 agente de síntese que **conferiu contra o código real** antes de fechar.

**Achado-chave:** ~200 das 754 linhas de `portal-colaborador.css` + 2 funções JS inteiras (`cpTileHtml`/`cpStationHtml`, `app.js:1614-1637`) são **código morto** (versão antiga de Home/Conta/Avisos/Roadmap, já substituída por `.pp-*`/`.fp-*`) — boa parte dos achados brutos citava classes que não renderizam mais. Também recalculei 2 alegações de contraste WCAG que a auditoria bruta marcou como insuficientes — as duas passam (~6:1, acima do mínimo 4.5:1).

**Roteiro final:** Passo 0 (apagar código morto, risco zero) → 7 ganhos rápidos (alvos de toque, feedback `:active`, transições, padding, font-size de input, safe-area, peso de fonte) → 5 melhorias estruturais (tokens do Roadmap, botão primário duplicado, badges sem padrão, empty states reinventados, escala tipográfica) → 4 decisões estratégicas do William (todas na recomendação): (1) Home mantém só o atalho "Novidades" (remove os 3 redundantes com a navegação principal); (2) Roadmap mantém o mapa mental mas reduz de 6+ pra 4 estados de cor; (3) os 3 prefixos CSS (cp-/pp-/fp-) **não são unificados agora** — convivem com papel documentado; (4) vale investir em layout desktop 2-colunas (Home/Conta) — hoje é mobile esticado.

Mostrei um mockup visual (antes/depois) de um trecho da Home ilustrando padding consistente + feedback de toque, pro William ver a diferença na prática antes de aprovar o roteiro.

**Missão completa (com todos os `arquivo:linha`) mandada pro Claude PC:** `inbox-pc/2026-07-01-mega-auditoria-uiux-portal-colaborador.md`. É auditoria de LEITURA — nada foi implementado ainda, fica a critério do PC priorizar dentro da agenda.


---

## 2026-07-01 · 🔍 4 frentes "do nosso lado" — versionamento, dados, credencial, monitoramento

William: "teria mais alguma coisa que a gente poderia olhar do nosso lado". 4 candidatos propostos, todos escolhidos.

### 1) Versionamento do pipeline — feito
`C:\fiobras-pipeline-rh` NUNCA teve controle de versão. Criado repo git **LOCAL** (sem remoto por ora), identidade local `Claude WKRADAR <claude-wkradar@local>` (mesma convenção do ocorr-ponto-repo). `.gitignore` reforçado: além de `service-account.json`, agora cobre `parsed-*.json` (glob — **corrigiu uma lacuna real**: `parsed-empregado.json`, que TEM CPF/PIS/nome da mãe, não estava listado antes, só `parsed-bh.json` estava), `colaborador-sync-report.json`, `__pycache__/`, `_diag/*.log`, `.claude/`, `rh-export/`, `rh-ocorr.txt`. 4 commits, 84→86 arquivos rastreados, curado à mão (removi cache Python, logs de 2.4MB, um arquivo de nome acidental, dumps de debug).

### 2) Auditoria de qualidade dos DADOS (não do código) — feito, achado crítico corrigido
Workflow com 6 agentes consultando o Firestore de produção direto (não código): integridade de `funcionarios`, consistência cruzada BH, qualidade de `banco-horas-self`, consistência `users`×`funcionarios`, sanidade de ocorrências/comunicados/documentos, e verificação direta de vazamento de PII. **31 achados**.

**🔴 CRÍTICO corrigido:** campo `nascimento` (data de nascimento COMPLETA, com ano) presente em **145/145 docs de `funcionarios`** — vazava pra líder/supervisor/colaborador via firestore.rules (mais amplo que `banco-horas-saldos`, único lugar autorizado pra PII pela regra de ouro do projeto). Corrigido em `upload-to-firestore.mjs` (`FieldValue.delete()`), autorizado pelo William e aplicado em produção — verificado 0/145 docs com o campo depois. `aniversarioDia`/`aniversarioMes`/`aniversarioDM` (sem ano) preservados, cobrem o uso legítimo (widget de aniversariantes).

**🟠 Outros achados altos:** (a) 4 funcionários ativos (aprendizes f-1200 a f-1203) sem NENHUM registro de Banco de Horas em lugar nenhum — **confirmado com o William: esperado** (regime de aprendiz não tem BH, não é bug). (b) coleção `documentos` com 2 docs pai inexistentes e 3 assinaturas órfãs — reportado pro PC (`inbox-pc/2026-07-01-achado-documentos-assinaturas-orfas.md`, é domínio do app dele).

**🟡 Médios/baixos (documentados, sem ação hoje):** f-1244 (Dioneia) com `ativo=false` sem demissão registrada — William vai confirmar com o RH; `banco-horas-saldos` usa doc ID sem prefixo `f-` (bare código) diferente das outras 3 coleções — inconsistência de convenção, não mexida por poder quebrar leitura do app; nome em `banco-horas-saldos` em CAIXA ALTA vs Title Case nas outras fontes — cosmético; `funcionarios.turno` tipo misto (já endereçado hoje mais cedo com comparação tolerante).

### 3) Higiene da credencial (service-account.json) — achado sério corrigido
Idade: 40 dias (não urgente). **Achado real**: o servidor é associado a um domínio Active Directory (`wkradar.local`) e o grupo local "Users" (com permissão de LEITURA no arquivo) continha `AUTORIDADE NT\Usuários autenticados` e `Usuários do Domínio` — ou seja, **qualquer conta do domínio inteiro conseguia ler a chave de acesso total ao Firestore**, não só a conta que roda o pipeline. Corrigido com autorização do William: `icacls` restringindo pra só `WKRADAR\wkradar` + `Administrators` + `SYSTEM`. Testado e confirmado: pipeline continua lendo a chave e conectando no Firestore normalmente.

### 4) Monitoramento de verdade — rotina criada
Descoberta: o comentário no código sobre "Cloud Routine do Claude PC monitora este diretório" não tem evidência de estar ativo (`CronList`/tarefas agendadas do lado WKRADAR vazios). O que existe de fato é **passivo** (painel no app, só mostra quando alguém abre). Task Scheduler do Windows em si está saudável (última rodada 10:00 sucesso, zero falhas). Criada rotina agendada (`check-pipeline-rh-heartbeat`, 16:05 seg-sex) que confere se o report de hoje existe e teve `status: ok`, e manda push notification SÓ se algo estiver errado (sem barulho quando tudo bem).


---

## 2026-07-01 · ✅ banco-horas-self denormalizado (funcionarioTurno + funcionarioId) pro Espelho de Ponto do gestor

PC subiu uma aba "Espelho de ponto" no Portal do Gestor (v238) reusando o `dias[]` que o pipeline já grava — mas precisava de 2 campos denormalizados no doc pra rule liberar leitura de líder/supervisor com escopo seguro (líder por turno, supervisor por lista de atribuídos). Rule já tinha sido deployada com guard "campo existe" (sem os campos = negado, sem buraco de segurança).

**Implementado em `upload-banco-horas-self.mjs`:** carrega `parsed-empregado.json` (mesmo padrão do `upload-ocorrencias-auto.mjs`) e grava `funcionarioTurno` (mesmo valor de `bancoHoras.funcionarioTurno`) e `funcionarioId` (`f-{codigo}`) em cada doc.

**Testado:** 92/92 docs cobertos, valores conferidos batendo exatamente com `bancoHoras` (3 amostras, inclusive turno `"geral"` string e numérico). Pipeline completo rodado de ponta a ponta: exit 0, sem regressão.

Avisado o PC (`inbox-pc/2026-07-01-denormalizado-bh-self-no-ar.md`) — ele confirma líder/supervisor lendo ao vivo.


---

## 2026-07-01 · ✅ Caso Dioneia (f-1244) resolvido — achado o mecanismo real de "preso em inativo"

Fechamento do achado da auditoria de dados: William confirmou com o RH (Jenifer, chat) — Dioneia Cristine Ramos é contratação **legítima e recente** (2-3 dias), ficou sem crachá/marcações nos primeiros dias, "sumiu" das apurações de ponto até a Jenifer/Suyanne conferirem e regularizarem o crachá ontem (30/06).

**Causa raiz confirmada nos dados**: no WK (D_Empregado + BH), ela está 100% limpa hoje — sem demissão, `situacao: "Trabalhando"`, já com lançamentos de ponto (30/06, 01/07). Mas em `funcionarios/f-1244` o Firestore mantinha `ativo: false`. Motivo: a lógica **"preserva ativo=false manual"** (feita pro caso Denis f-778 — respeitar quando um admin desativa alguém de propósito sem o CSV trazer demissão) **não distingue** "admin desativou por decisão" de "o próprio pipeline desativou por ausência temporária num export" (provavelmente ela sumiu de algum export nos primeiros dias, antes do crachá). Uma vez `ativo=false` sem demissão, o pipeline **protege esse estado pra sempre**, mesmo com dado limpo em runs seguintes — **rodar de novo não resolve sozinho** (testado e confirmado: rodei antes de saber disso e ela continuou presa).

**Correção aplicada (autorizada pelo William):** `ativo: true` direto no Firestore (correção pontual, quebra o loop). Confirmado rodando o pipeline de novo com dado real: **"0 inativo manual preservados"** (era 1), `pipeline-rh/cur` foi de **91 → 92 ativos**, login do Portal do Colaborador **reativado automaticamente** ("Reativados: 1" no relatório do `sync-colaborador-users.mjs`). Não precisou de mais nada manual — ela segue ativa sozinha daqui pra frente enquanto o dado dela continuar limpo.

**⚠️ Risco sistêmico anotado (não corrigido hoje, só documentado):** qualquer novo contratado que fique ausente de um export por 1 rodada (típico: sem crachá ainda nos primeiros dias) pode cair na mesma armadilha. Corrigir de vez exigiria distinguir, no dado, "pipeline desativou por ausência" de "admin desativou manualmente" (hoje os dois casos são indistinguíveis no doc) — fica como possível próxima frente.


---

## 2026-07-01 · 🎯 Controle Disciplinar precisa de segmentação de supervisor (missão pro PC)

William viu a tela "Controle disciplinar" (screenshot, "Nenhuma ocorrência registrada") e pediu a mesma regra de segmentação que Ocorrências e Banco de Horas já têm (cada líder/supervisor só vê os próprios liderados).

**Investigado antes de mandar a missão** (`docs/firestore.rules` + `public/firebase.js`): **líder já está 100% funcionando** (rule `:479-482` usa `liderDoMesmoTurno(funcionarioTurno)`, app `:1436-1437` já filtra a query por turno, `criarDisciplinar` já grava `funcionarioTurno` na criação). **Falta só supervisor** — hoje ele cai num `else` que retorna lista vazia sem nem consultar o Firestore, e a rule não tem cláusula pra `isSupervisor()` em `disciplinares` nem na subcoleção `ciencia`.

Coleção `disciplinares` está **vazia hoje** (0 docs, confirmado na auditoria de dados de mais cedo) — mudança 100% aditiva, sem migração.

Missão enviada (`inbox-pc/2026-07-01-disciplinar-segmentar-lider-supervisor.md`): aponta os helpers já existentes no rules (`supervisorVe`/`supervisorVeTurno`) pra reusar, e destaca que o projeto já tem 2 padrões de segmentação de supervisor convivendo (leitura ampla + filtro na UI, usado em ocorrências; regra estrita no read, usado hoje em `banco-horas-self`) — sugeri regra estrita pro disciplinar por ser dado mais sensível, mas deixei a decisão com o PC.


---

## 2026-07-01 · 🎨 Home do colaborador: topbar desencaixado + tela vazia pra bhExempt (missão pro PC)

William mandou screenshot real (próprio celular, logado) reclamando do "encaixe" do cabeçalho da Home. Investiguei antes de mandar a missão — 2 achados distintos:

1. **Topbar desencaixado (feedback dele)**: `portal-colaborador.css:63` — topbar com fundo branco sólido + hairline colado direto acima do fundo da página (`#EEF3EC`, cor diferente) — lê visualmente como 2 blocos empilhados sem transição. Sugeri 3 caminhos (fundir cor de fundo / large-title que recolhe no scroll / blur translúcido em vez de cor sólida) sem forçar uma escolha — é call de design do PC/William.

2. **Achado extra (não era bug, mas é gap de UX real)**: a tela dele apareceu quase vazia (só saudação + "Novidades") — **não é bug**, é o comportamento correto pra quem tem `bhExempt:true` (ele é diretor, `app.js:1332` esconde o card de saldo de propósito). Sem pendência nem comunicado fixado, a coluna fica vazia sem nenhuma mensagem tipo "tudo em dia" — afeta especificamente usuários `bhExempt` (poucos, mas o William é um deles, por isso ele reparou na hora).

Missão enviada (`inbox-pc/2026-07-01-home-header-e-vazio-bhexempt.md`) — é tudo CSS/app.js, domínio do PC, não mexi em nada.


---

## 2026-07-01 · 🎨 Mockup "Liquid Glass" da Home do colaborador aprovado por William

William pediu um mockup completo inspirado no "Liquid Glass" da Apple pra Home do colaborador, com claro e escuro. Gerei via workflow multi-agente: 3 designers criaram direções distintas em paralelo (vidro em tudo / vidro só nos elementos principais / profundidade em camadas com animação), um diretor de design sintetizou a melhor combinação, e um revisor técnico checou contraste e corrigiu um bug real (no modo escuro, duas variáveis de cor colapsavam na mesma tonalidade, deixando o botão "Assinar" quase ilegível — corrigido).

William pediu pra ver os 3 conceitos originais separados (não só a síntese) e arquivos `.html` de verdade em vez de só o preview inline — gerei os 4 (3 conceitos + síntese) como arquivos standalone que abrem sozinhos no navegador.

**Aprovado**: a direção "profundidade em camadas" — o card de Banco de Horas vira uma "ilha flutuante" com glow radial atrás e uma animação de luz que atravessa a superfície ao tocar/passar o mouse. Copiado pro repo em `docs/mockups/colab-home-liquid-glass-mock.html` e mandado pro PC (`inbox-pc/2026-07-01-mockup-liquid-glass-aprovado-home.md`) como referência visual — é HTML solto, não código real do app, e o William autorizou o PC a remockar/melhorar se tiver ideias melhores (não é uma trava rígida).


---

## 2026-07-02 · 🔍 Export de Ocorrências travado desde 30/06 — causa raiz achada e corrigida

William reparou no widget "Status do pipeline" que o export de Banco de Horas estava com 18h de atraso ("1 atenção"). Investigando isso, achei que o pipeline rodou mas o `.exe` do WK travou por timeout (180s) — sem processo zumbi, sem evento de RAID no log do Windows, primeira ocorrência desse tipo no histórico do log. Best-effort, sem impacto grave (autocorrige na próxima rodada).

**Achado maior, junto**: o export de Ocorrências (`ExpAuto_Ocorrencias.txt`) não estava atualizando desde **30/06 14:00** — 12+ rodadas reportando "OK" sem nunca escrever um arquivo novo. William confirmou na tela do Modelador do WK que EXISTEM ocorrências reais de 01/07 e 02/07 batendo os filtros — não era falta de dado.

**Causa raiz** (achada lendo o `.log` que o próprio WK grava ao lado do config, mesma pasta): `WK.WKConsistenciaException: Não existem informações para emissão do relatório.` — o motor de apuração do WK decide "sem dado" pra uma janela muito curta e recente (só os 2 dias do mês corrente) e sai com sucesso (exit 0) sem escrever nada. Nosso script só conferia exit 0 + tamanho do CSV > 50 bytes — nunca detectava isso.

**2 fixes aplicados em `export-ocorrencias.mjs`** (autorizados pelo William):
1. Compara mtime do CSV antes/depois do `.exe` rodar — se não mudou, falha alto e claro, lendo o `.log` irmão do config e citando a exceção do WK na mensagem de erro (em vez de "OK" silencioso).
2. `DataInicial` passa a ser 1º do mês **anterior** (não do mês atual) — mesma correção já aplicada hoje cedo em `export-espelho.mjs`/BH. Janela mais larga garante que o WK sempre tenha apuração "fechada" de sobra pra reportar; a regra de go-live no parser já descarta tudo antes de 01/07, então não vaza dado antigo.

**Verificado**: rodei de novo, CSV mudou (17089→19812 bytes), parse foi de 0→3 ocorrências finais de 01/07 — batendo EXATAMENTE (nome, situação, horário) com o que William viu na tela do WK.

**Caso à parte, em acompanhamento**: a ocorrência da Dioneia (f-1244, contratada 29/06) de 01/07 continua ausente do export mesmo já aparecendo na UI do WK — só ela, as outras 3 bateram certinho. Provável atraso de sincronização ligado à contratação muito recente. Criei uma scheduled task (`watch-dioneia-ocorrencia-0701`, roda 15h todo dia) que checa o CSV, avisa só quando resolver (ou depois de 7 dias sem resolver), e se autodesliga quando terminar.
