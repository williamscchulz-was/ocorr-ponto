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


---

## 2026-07-07 · 🐛 999-detector: bug de alinhamento posicional entre previstas/apuradas

William reportou (2 modais, casos Vinicius e Enildo, ambos 06/07): "o que faltou foi registrar a entrada... mas alocou os horários tudo errado". Confirmado: o app pareava `marcacoesPrevistas[i]` com `marcacoesApuradas[i]` por índice cru. Como `apuradas` tem sempre 1 item a menos que `previstas` no caso 999 (marcação ausente), faltar a **entrada** (posição 0) deslocava TODO o resto do pareamento — a saída-almoço real virava "entrada", a entrada-tarde virava "saída-almoço", e por aí em diante, terminando numa "falta" inventada na saída final que na real bateu certinho.

**Causa raiz no parser**: o próprio `horarioPrevistoRelevante` (item 4, caso Eliziane Waier, 2026-07-06) já tinha uma versão latente do mesmo bug — `classifica_marcacao_ausente` calculava a posição ausente internamente só pra devolver um RÓTULO, e o loop chamador RE-ADIVINHAVA a posição a partir do rótulo (hardcoded `pos=1` pro caso "Entrada/Saída Lanche", sem checar se a posição real ambígua batia — só é seguro pra escala de exatamente 4 marcações).

**Fix** (`process-ocorrencias-rh.py`): extraída `posicao_marcacao_ausente(previstas, apuradas)` — mesma lógica de candidatos por janela (`JANELA_MATCH_MIN=120`, `desvio_circular`), mas devolve a POSIÇÃO exata, não só o rótulo. `classifica_marcacao_ausente` agora é uma casca fina em cima dela (comportamento idêntico pra quem já chamava). Novo campo **`apuradasAlinhadas`**: array do MESMO TAMANHO/ordem de `marcacoesPrevistas`, com `null` exatamente na posição que faltou bater — o app deve emparelhar `previstas[i]`/`apuradasAlinhadas[i]` direto, sem inventar deslocamento. Propagado em `upload-ocorrencias-auto.mjs` (batch.set) e `resync-ocorrencias-horario-relevante.mjs` (CAMPOS/fonteDoCampo).

**Testado** com os 5 casos reais gerados na rodada (2 faltando entrada — Vinicius/Enildo/Jhenyffer —, 2 faltando saída — Edmar/Charles): `null` cai exatamente na posição certa nos dois sentidos. Ex. Vinicius: previstas `13:30 17:00 17:30 22:00`, apuradas cru `17:35 18:07 22:00` → `apuradasAlinhadas: [null, "17:35", "18:07", "22:00"]`.

**Backfill em produção**: rodado `resync-ocorrencias-horario-relevante.mjs` real — só os 2 docs esperados (Vinicius/Enildo, ainda `rh_confere`) mudaram, só o campo novo; os outros 33 docs (já fora de `rh_confere`, RH mexeu) corretamente protegidos pelo guard existente. Confirmado lendo direto do Firestore pós-resync.

**Pendente**: avisar o PC (bridge) que `apuradasAlinhadas` existe e é a fonte certa pro card renderizar pareamento previsto/apurado em docs `fonteInferida:true` — hoje ele mostra `marcacoesPrevistas`/`marcacoesApuradas` cru (tamanhos diferentes), que é exatamente o que causou o bug reportado.

**Caso à parte, em acompanhamento**: a ocorrência da Dioneia (f-1244, contratada 29/06) de 01/07 continua ausente do export mesmo já aparecendo na UI do WK — só ela, as outras 3 bateram certinho. Provável atraso de sincronização ligado à contratação muito recente. Criei uma scheduled task (`watch-dioneia-ocorrencia-0701`, roda 15h todo dia) que checa o CSV, avisa só quando resolver (ou depois de 7 dias sem resolver), e se autodesliga quando terminar.


---

## 2026-07-07 · 🆕 saldoOriginal: saldo de banco de horas sem o percentual da situação (caso Jenifer/GP)

Jenifer (Coordenadora de Gestão de Pessoas) reclamou pro William: o saldo de banco de horas que ela via no perfil do funcionário estava MULTIPLICADO pelo percentual da situação (ex.: hora extra 75% = ×1,75), quando o valor certo pra saber quanto o colaborador pode FOLGAR é o ORIGINAL (bruto) — folga é compensada hora-por-hora, o percentual só vale se for pago em dinheiro.

**Investigação**: "GP" não é sistema externo — é a Gestão de Pessoas, ou seja, a própria Jenifer usando o FioPulse (confirmado: `app.js` literalmente rotula a seção "Dados sensíveis (admin/GP)"). Rastreada a cadeia até `pipeline-rh/cur.minutos ← upload-to-firestore.mjs:339 ← f.saldoAtualMin (process-bh.mjs)` — nosso próprio pipeline também só carregava o valor multiplicado, mesmo bug do lado de cá.

**Descoberta de dado**: o relatório "Banco de Horas" do WK que exportamos automaticamente não tinha (até então) NENHUMA coluna com o saldo original — só a tela manual de Movimentação (por funcionário, aba Banco de Horas) mostrava "Saldo Original" ao lado do "Saldo". William foi na tela de configuração do modelo do relatório (William mexeu direto no WK) e adicionou 6 campos novos: `Diurnas Originais`, `Noturnas Originais`, `Situação`, `Cód. Situação`, e os 4 percentuais (`% Situação Banco/Folha D./N.`). Isso mudou a ESTRUTURA do CSV: passou a vir 1 linha por SITUAÇÃO (não mais 1 por dia — um dia pode ter 2+ situações, ex. Atraso + Hora Extra no mesmo dia) mais uma linha-resumo no fim de cada funcionário (sem Cód Emp nem Data Saldo, só "Saldo Atual").

**Fix** (`process-bh.mjs`): soma `Diurnas Originais + Noturnas Originais` por lançamento (somando múltiplas situações do mesmo dia), acumula dia a dia em SEGUNDOS (não minutos, pra não arredondar antes da hora) → `saldoOriginalMin`/`Fmt`, aditivo, sem alterar `saldoAtualMin`/`Fmt` existentes. Detecta e ignora a linha-resumo sem gerar warning (é formato esperado), usando-a só de cross-check contra o "Saldo" acumulado.

**Revisão do Fable** (pedido explícito do William, "a lógica precisa ficar perfeita"): confirmou a lógica central correta com um cross-check próprio ainda mais forte (delta diário do "Saldo" WK vs Σ "Total Diário B.H." — bateu 664/664 dias), e achou:
- **Alto**: `upload-banco-horas-self.mjs` (Portal do Colaborador — TODO funcionário, não só a Jenifer) tinha sido esquecido — mesmo padrão de bug que já aconteceu 2x antes nesta sessão (campo calculado no parser, esquecido no uploader). Corrigido.
- **Alto**: app ainda não lê o campo em lugar nenhum (confirmado por grep) — pendente do PC.
- **Médio, descartados por decisão do William**: trava se o WK parar de mandar as colunas novas ("o WK não vai parar"); trava se os percentuais Banco/Folha mudarem de 100/0 ("no fim das contas zera a cada mês e o Pulse não se mete nisso" — o saldo é mensal, sem carry-over, confirmado pelo Fable).
- **Médio, corrigido**: arredondamento por linha (Diurnas e Noturnas arredondados separado antes de somar) podia divergir 1-3min no fim do mês — trocado por acumular em segundos e arredondar 1x só.
- **Achado lateral, corrigido na hora + endurecido**: `IdsFuncionarios` no `Config_Banco_de_Horas.txt` apareceu como lista FIXA de 148 ids (não mais vazio/dinâmico). William mandou corrigir imediatamente — revertido pra `""` (vazio) na hora, byte-safe, verificado. Pediu segunda revisão do Fable pra confirmar a causa raiz: **regressão conhecida e já documentada 3x antes** neste histórico (linhas 45, 351, 1378) — toda vez que um humano salva o modelo do relatório pela UI do WK, `IdsFuncionarios` materializa como lista estática (vazio=dinâmico é comportamento confirmado pelo dev do WK Radar, não suposição). Fable também confirmou que os 148 eram o cadastro INTEIRO (97 ativos + 51 demitidos recentes — bate exato), não uma seleção curada de propósito. **Causa raiz do "só o BH pegou essa regressão hoje"**: `export-espelho.mjs`/`export-ocorrencias.mjs`/`export-apuracoes.mjs` já limpavam `IdsFuncionarios` defensivamente toda rodada; `update-config-dates.mjs` (usado pelo BH) só reescrevia datas. Corrigido: mesmo padrão de auto-cura aplicado lá, com warning quando encontra a lista já preenchida (sinaliza edição manual recente na UI do WK). Os 4 exports agora têm a mesma defesa.

**Propagado em 4 lugares** (aditivo): `banco-horas-saldos` (`uploadSaldos`), `bancoHoras` (`uploadBancoHorasApp`, como `minutosOriginal`/`saldoOriginalFormatado`), `pipeline-rh/cur` (`uploadPipelineRH`/`pubFuncionario` — a fonte da tela da Jenifer), `banco-horas-self` (Portal do Colaborador).

**Testado** com casos reais: Jenifer (671, situação única) `saldoOriginalFmt=00:59` bate EXATO com a tela dela; Anderson (612, 2 situações no mesmo dia — Atraso + Hora Extra) soma corretamente (-76+112=36min); Djoniffer (866, mesma coisa + Noturnas negativo) também bateu (-15+29=14min).

**Pendente**: bridge mandado pro PC (`2026-07-07-saldooriginal-gp-e-portal-colaborador.md`) — troca de 2 telas (perfil GP + Portal do Colaborador). `parsed-bh.json`/`parsed-empregado.json` apagados do disco ao terminar (PII).

---

## 2026-07-07 · 🆕 999-detector: ocorrência incerta não fica mais invisível (caso Moises)

William viu um caso (Moises Silva de Carvalho, 612/1215, 06/07) que uma funcionária (Suyanne) teve que criar NA MÃO — o WK já tinha marcado 999 (marcação não identificada) naquele dia, mas nossa ocorrência automática nunca apareceu. Investigado: o algoritmo (`posicao_marcacao_ausente`) achou 2 posições candidatas igualmente válidas (saída OU volta do almoço, só 30min de diferença) e, por design ("não arrisca"), descartava o caso inteiro em silêncio.

William discordou desse design: a incerteza FINA (qual posição exata) não deveria impedir de trazer o fato GROSSO (dia tem problema, o WK já apontou 999) pro sistema — "não pode deixar de apontar pq ficou com dúvida, aí ela corrige na mão, por isso existe o botão editar".

**Investigação mais ampla**: dos 4 casos "ambíguos" da rodada de hoje, só 1 (Moises) era exatamente esse tipo (ambíguo entre as 2 posições do meio/lanche). Os outros 3 eram estruturalmente diferentes: 2 tinham MAIS marcações batidas que o esperado (com valor idêntico duplicado — ex. "13:32" duas vezes seguidas —, sugerindo duplicata no Espelho, não ausência de verdade); 1 tinha só 1 de 4 marcações esperadas (incompleto demais pra qualquer heurística de posição).

**Design acordado com William** (discussão rápida antes de implementar, "vamos estudar antes de mexer"): (1) tag com motivo, não só um booleano solto; (2) rótulo o MAIS ESPECÍFICO que o dado ainda permitir — quando os candidatos são só posições do meio, mantém "Não Registrou Entrada/Saída Lanche" (o rótulo já era genérico o bastante pra cobrir os 2 lados); só quando nem isso dá pra afirmar (duplicata, incompleto, ambíguo envolvendo borda) usa o genérico "Marcação Não Identificada"; (3) badge visual "⚠ Conferir" + observação com o motivo — mockup fica com o PC.

**Fix** (`process-ocorrencias-rh.py`): nova função `diagnostica_marcacao_ausente` (substitui o uso direto de `posicao_marcacao_ausente` no loop) devolve `(posição, motivo, candidatos)` em vez de só `None`. Novos campos `classificacaoIncerta` (bool) + `motivoIncerteza` (string|null). Quando incerto, `apuradasAlinhadas`/`horarioPrevistoRelevante` ficam `null` (não dá pra alinhar sem saber a posição) — `marcacoesPrevistas`/`marcacoesApuradas` cru continuam disponíveis pra GP investigar.

**Testado**: os 4 casos que antes eram descartados agora geram ocorrência — Moises com rótulo específico + incerto; os outros 3 com o genérico + motivo certo cada (duplicata ×2, incompleto ×1). Os 5 casos confiantes de antes continuam idênticos (regressão zero). Propagado em `upload-ocorrencias-auto.mjs` e `resync-ocorrencias-horario-relevante.mjs`.

**Pendente**: bridge mandado pro PC (`2026-07-07-classificacaoincerta-badge-conferir.md`) — mockup do badge "Conferir".

**2ª rodada, mesmo dia**: William reparou no card real do Moises que `apuradasAlinhadas: null` jogava fora informação que já era certa — a Entrada (05:02) e a Saída Final (13:33) batiam nos DOIS cenários possíveis (só a posição do meio, saída ou volta do almoço, diverge entre eles), mas o campo virava `null` inteiro só por causa dessa 1 posição ambígua. Nova função `apuradas_alinhadas_parcial`: testa cada candidato como se fosse o ausente (mesma fórmula do caso confiante — remover k, o resto casa por índice), mantém só as posições onde TODOS os candidatos concordam. Moises: `["05:02", null, null, "13:33"]` em vez de `null` solto. Resync rodado (só o doc dele mudou, os outros 35 já tinham saído de `rh_confere`). Confirmado que o app do PC já trata `null` por posição (`ocaBatidasAlinhadas`) — renderiza certo sem nenhuma mudança adicional do lado dele; os outros 3 casos incertos (sem candidato válido — duplicata/poucas marcações) continuam `null` por inteiro, como deveria.

**3ª rodada, mesmo dia**: mesmo card do Moises — a batida real de 10:02 ainda ficava invisível (os 2 cards do meio mostravam "sem batida" cada um). Gerei 2 mockups (visualize widget): Ideia A (mostra a batida disputada nos 2 candidatos, borda tracejada âmbar) e Ideia B (funde os 2 cards num só, "Intervalo de almoço", com os 2 previstos de um lado e a única batida real do outro). William escolheu a B. Novo campo `intervaloAmbiguo` (object|null): `{posicoes, previstos, batida}`, populado só quando sobram exatamente 2 posições ADJACENTES sem batida com 1 única marcação disputada entre elas (o caso comum) — calculado no parser, não deixado pro app derivar sozinho. Moises: `{posicoes:[1,2], previstos:["09:00","09:30"], batida:"10:02"}`; os outros 3 incertos continuam `null` (não têm esse formato). Testado, resync rodado, bridge mandado pro PC (`2026-07-07-intervaloambiguo-card-fundido-intervalo-almoco.md`).

**Achado paralelo (mesmo dia, investigação da Nagela)**: a "duplicata" da Nagela (961, 03/07) foi confirmada na fonte crua do Espelho (`ExpAuto_Espelho_Ponto.txt`) — o "13:32" duplicado JÁ vem assim do WK, não é bug nosso. Mais importante: na tela de Movimentação do WK, a 2ª batida (NSR 000287022) já está marcada como "Desconsiderada" (Motivo: "Marcações Incorretas") — o WK internamente já resolveu isso, mas o export do Espelho não carrega esse status. William suspeita que a GP já tratou isso manualmente antes mesmo dessa ocorrência existir (a funcionalidade de incerto só existe desde hoje). Pendente: William checar se o relatório "Relatório de Apurações" (`Modelo="ExpAuto_Relatorio_de_Apuracoes_1"`, mesmo report designer usado pro saldo original) tem um campo "Tipo"/"Motivo" de marcação disponível pra incluir — se tiver, dá pra filtrar "Desconsideradas" automaticamente e nem gerar a ocorrência nesses casos. Também pendente: conferir se o caso do Alex (1241, mesmo padrão de duplicata) segue o mesmo formato.

---

## 2026-07-07/08 · 🚨 "Falta Injustificada" falsa em massa — apuração do WK não fechou (caso Franciele)

William mandou print da Franciele (1074): card dizia "Falta Injustificada de 8h 00" com as 4 posições "sem batida", mas a tela de Movimentação do WK mostrava 4 batidas reais e próximas do horário (11:53/17:37/18:07/20:28 contra previsto 12:00/17:30/18:00/20:30) — "mostra que não teve batidas mas teve".

**Causa raiz**: a linha dela no CSV cru da Relação de Ocorrências (Minerador) veio com as colunas Apuradas/Originais **vazias** mesmo pro dia já fechado (07/07, exportado 08/07 09:08) — a apuração do WK não tinha processado o dia ainda. Levantamento na hora: **27 pessoas** na mesma rodada de hoje tinham exatamente esse padrão (apuradas vazias na Relação), e para TODAS elas o Espelho de Ponto (fonte separada, assenta mais rápido) tinha as 4 batidas completas e coerentes com a escala — confirmando que não era falta real em nenhum dos 27 casos, era só o mesmo problema de timing da apuração.

**Fix** (`process-ocorrencias-rh.py`, loop principal): quando a linha vem sem apuradas, cruza com `espelho` (lookup `(código, data) → batidas`, já carregado em memória pro 999-detector) — se tiver dado lá, usa como fallback e recalcula tudo que depende de apuradas (`desviosMin`, `duracaoTrabalhadaDiaMin`, `compensadoNoDia`, `horarioRelevante`). Marca `classificacaoIncerta`/`motivoIncerteza` (mesmo par de campos do 999-detector, reaproveitado) pra acionar o selo "Conferir" que o PC já tinha construído — não precisou de nenhuma missão nova pro PC, o mecanismo já existia. **Não reclassifica** a situação (continua "Faltas Injustificadas", o rótulo que a Relação mandou) nem corrige `duracaoFmt`/o badge "8h 00" (que ainda vem da duração original do WK) — decisão deliberada de não sobrepor a classificação oficial sozinho; a GP decide depois de conferir.

**Testado e aplicado em produção na hora** (William: "faz a correção agora"): 27/27 casos confirmados com apuradas reais e duração trabalhada de ~8h cada (470-522min, a maioria com `compensadoNoDia` batendo). Resync rodado: 32 docs atualizados (os 27 + 4 que resolveram sozinhos com o dado fresco, incluindo 3 que já estavam `classificacaoIncerta` de uma verificação anterior).

**Pendente/observação**: o badge de duração ("Falta Injustificada de 8h 00") ainda mostra o número original do WK mesmo após o fix — só o conteúdo da trilha (horários) e o aviso "Conferir" refletem a correção. Se isso confundir a GP na prática, é um ajuste futuro (zerar/recalcular a duração exibida quando `classificacaoIncerta` vier desse motivo específico).

---

## 2026-07-08 · 🔍 Revisão ampla dos 5 exports do WK (pedido do William "pra termos menos erros")

Depois do caso da Franciele, William pediu revisão de todos os 5 configs do pipeline (BH, D_Empregado, Ocorrências, Espelho, Apurações), não só o de Ocorrências. Antes disso, perguntei sobre o campo `"ValidoImportacao"="Sim"` (existe em Ocorrências/Espelho/Apurações, não documentado em lugar nenhum) — William preferiu não mexer sem confirmar o que faz primeiro (fica pendente, investigar com calma depois).

**Lidos os 5 configs lado a lado**:
- **BH**: `IdsFuncionarios=""` (correto, com auto-cura desde hoje cedo), `DataFinal` fresco (08/07).
- **D_Empregado**: `EmpregadosSelecionados=""` (correto no momento), mas **SEM NENHUMA proteção** — `run-pipeline.mjs` rodava o `.exe` direto com o config cru, único dos 5 sem reescrita defensiva. Risco maior que o do BH: alimenta o cadastro-mestre (funcionarios/, banco-horas-saldos, enriquecimento de todos os outros uploads) — se regredir, gente some do sistema inteiro, não só de um relatório.
- **Ocorrências**: `IdsFuncionarios=""` (correto, já tinha auto-cura), `ValidoImportacao="Sim"` (não mexido).
- **Espelho**: idem, `IdsSituacoes` lista quase todos os códigos (1-91) — faz sentido pra um relatório abrangente.
- **Apurações**: `IdsFuncionarios=""` (correto), mas `DataFinal="06/07/2026"` — **desatualizado** (2 dias atrás das outras). Não é bug ativo: esse export está dormente (fase de teste, não agendado no pipeline — ver decisão anterior), então não é mantido a cada rodada. Sem ação por enquanto; só registrado pra não esquecer que a data trava assim que for reativado algum dia.

**Fix aplicado**: criado `export-empregado.mjs` (mesmo padrão dos outros 3 export-*.mjs — reescreve `ArquivoExportacao` + `EmpregadosSelecionados` vazio, escrita atômica byte-safe, roda o `.exe`, espera arquivo fresco). `run-pipeline.mjs` trocado pra chamar esse script em vez de invocar o `.exe` direto. Cuidado tomado: **não mexeu** em `GerarSemAspas` (esse relatório usa `"0"` = COM aspas nos campos, diferente dos outros 4 que usam `"1"` — `process-empregado.mjs` já espera esse formato, não era bug).

**Testado**: rodou de verdade, 148 funcionários (90 trabalhando + 51 rescisão + 5 afastado + 2 férias), sem regressão.

---

## 2026-07-08 · 🐛 Falta falsa: correção precisa suprimir, não só avisar (2ª rodada Franciele)

William viu que a 1ª correção (gerar a ocorrência com `classificacaoIncerta` + aviso) não bastava: "SE NO ESPELHO DO PONTO MOSTRA QUE ELA BATEU, NAO GERA OCORRENCIA". Pediu ajuda do Fable pra acertar a regra exata antes de mexer de novo.

**Análise do Fable** (verificação adversarial contra os 27 casos reais de 07/07): a regra do William está certa, mas não literalmente "qualquer batida → suprime" — o critério é **"o Espelho DESMENTE a falta"**: mesma contagem de batidas que o previsto E todo desvio dentro de `JANELA_MATCH_MIN` (120min), medido com `desvios_todas_posicoes` (pausa por DURAÇÃO, não por relógio cru — mesma lição do caso Carlos Zoz; desvio posicional puro erraria o caso da Edicleia 991, cuja pausa só deslizou 28min mas dá 121min de diferença posicional bruta). Achado importante: dos 27 casos, **23 tinham o dia inteiro batido** (pior desvio 11min) — suprimidos. **4 bateram só PARTE do dia** (Edmar 753: só durante o intervalo, nada na entrada/saída; Luisana 1145 e Luis Eduardo 1154: sem a entrada; Paulo Cesar 1221: só a tarde) — esses continuam gerados com `classificacaoIncerta`, porque podem ser falta parcial real. Confirmado também: toda linha com Apuradas vazia no CSV real é "Faltas Injustificadas" — os outros tipos nunca vêm vazios (sem apuração fechada o WK não calcula desvio).

**Fix** (`process-ocorrencias-rh.py`): antes de aceitar o fallback do Espelho, calcula `desvios_todas_posicoes` contra o previsto — se `sit == "Faltas Injustificadas"` e todos os desvios ≤ 120min, **suprime inteiramente** (`continue`, nem gera); senão, mesmo comportamento de antes (gera com `classificacaoIncerta`). Contador novo `suprimidoEspelhoDiaCompleto` no JSON de regras, pra auditoria.

**Testado**: `suprimidoEspelhoDiaCompleto=23` bateu exato com a previsão do Fable; os 4 casos-exceção confirmados com `classificacaoIncerta=true` e o motivo certo. Reverificação contínua (`upload-ocorrencias-auto.mjs`) resolveu os 23 automaticamente — o circuit breaker de 50% (que o Fable previu que poderia travar) **não disparou**, a fila tinha volume suficiente. Aplicado em produção: Franciele `auto_resolvida`, Edmar continua `rh_confere` com aviso.

---

## 2026-07-08 · 🔧 Timeout do export-ocorrencias.mjs: causa raiz, retry, observabilidade

William reparou (print de uma pasta de arquivos) que `ExpAuto_Ocorrencias_Minerador.txt` estava com quase 19h de atraso — `export-ocorrencias.mjs` vinha travando por timeout de forma recorrente (07/03 2x, 07/06 2x, 08/07 1x), mesmo com o timeout já em 480s. Pediu investigação funda do Fable, "super solução", tratando-o como conselheiro permanente pra essa classe de problema.

**Investigação do Fable** (evidência, não suposição): a causa raiz **NÃO é a consulta/janela/modelo** — descartado com prova: os timeouts de 07/03 aconteceram ANTES da migração pro Minerador (mesmo sintoma no config antigo); o CSV do Minerador tem 253 linhas/43KB contra 3.868 linhas/349KB do Espelho (15x maior), mesma janela, mesmo relatório-base, e o Espelho nunca travou; rodadas saudáveis levam 1-4s com a janela cheia. É um **travamento transiente e específico do processo do lado do WK**, provavelmente ligado ao módulo Ponto em horário comercial (RH fechando apuração — confirmado pelo próprio caso das 27 faltas do mesmo dia, entre 09:08 e meio-dia). Evidência: 7s depois de matar a árvore travada, os outros 3 exports rodaram limpo em ~5s cada — não era o servidor ocupado, era aquele processo específico preso. Achado bônus: metade dos "5 timeouts" era cascata do nosso próprio `taskkill` sem `/T` (já corrigido em 07-06) — e um comentário no código citava "14h/17h, horário de pico" que na verdade era log em UTC lido como hora local (os horários reais são 11h/14h BRT, rodadas agendadas, não pico real).

**Mitigações avaliadas e descartadas** (com motivo): reduzir a janela de datas (ganho ~zero, reintroduziria o bug antigo do WK de não gerar arquivo com janela de 1 dia); dividir a query em pedaços (multiplicaria invocações de um `.exe` de instância única); mexer em `ValidoImportacao`/`ListarSomenteOcorrencias` (zero evidência de efeito em performance); promover o Espelho a fonte primária (também falhou em 07/03, e carrega o MESMO artefato de apuração-não-fechada na própria coluna Situação — trocaria um problema por outro).

**5 correções aplicadas**:
1. `run-pipeline.mjs`: retry (2 tentativas de 180s + pausa de 20s) no lugar de 1 tentativa de 480s — pior caso ~380s, recupera sozinho na maioria das vezes em vez de esperar a próxima rodada agendada.
2. `wk-lock-recovery.mjs`: timeout de 60s no `spawnSync` do PowerShell (2º ponto de espera infinita no caminho, sem limite próprio antes).
3. `run-pipeline.mjs` (`waitWithTimeout`): loga a árvore de processos (nome/pid/pai) antes do `taskkill` — próxima ocorrência identifica de vez qual processo trava.
4. `write-monitor.mjs`: Ocorrências e Espelho entram no painel de frescor (só BH/D_Empregado tinham cobertura — por isso ninguém percebeu o CSV parado exceto por acaso).
5. `write-heartbeat-report.mjs`: idade das 4 exportações + campo `fontesVelhas` (>8h) no frontmatter do report que a cloud routine do PC já vigia — mensagem mandada pro PC pedindo pra ela também alertar nesse campo.

**Testado**: `write-monitor.mjs` rodado de verdade (13 ok / 0 atenção / 0 parado). `export-ocorrencias.mjs` também rodou manualmente com sucesso durante a investigação (não travou dessa vez) — trouxe dado fresco que revelou mais um problema (ver entrada seguinte).

**Deixado pro William decidir** (ação de alto risco, autorização explícita necessária): deslocar os 3 horários do Task Scheduler pra fora do minuto redondo (ex.: 09:07/11:07/14:07) — evidência sugestiva mas não conclusiva de alinhamento ao :00.

---

## 2026-07-08 · 🐛 Falta falsa, 3ª causa: WK mantém rótulo "Falta" mesmo com apuração fechada e completa

Durante a investigação acima, `export-ocorrencias.mjs` rodou com sucesso manualmente e trouxe dado fresco — a apuração do WK tinha fechado pra Franciele (1074) e várias outras pessoas, com as 4 batidas reais aparecendo NATIVAMENTE na própria Relação de Ocorrências. Só que a **situação continuou "Faltas Injustificadas"** mesmo assim — o rótulo e o cálculo de apuradas ficam dessincronizados no WK mesmo depois de fechar, não é só "apuradas vazias enquanto não fecha" (a causa das 2 rodadas anteriores do mesmo dia).

**Fix** (`process-ocorrencias-rh.py`): o check de "dia completo bate" (mesmo critério já validado pelo Fable — `desvios_todas_posicoes` dentro de `JANELA_MATCH_MIN`) agora roda **sempre** que `sit == "Faltas Injustificadas"` e existe alguma apurada — nativa OU via fallback do Espelho — não só dentro do bloco que usa o fallback. Mesma regra, aplicada de forma mais abrangente.

**Bônus**: casos parciais nativos (sem precisar do fallback) que faltam exatamente 1 marcação agora também ganham `apuradasAlinhadas` (reaproveitando `diagnostica_marcacao_ausente`/`apuradas_alinhadas_parcial`, as mesmas funções do 999-detector e do card do Moises) — evita o MESMO bug de pareamento por índice cru, só que numa origem de dado diferente (loop principal, não 999-detector). Confirmado nos casos da Luisana (1145) e Luis Eduardo (1154): `[null, "09:30", "10:03", "13:30"]`, alinhamento correto.

**Testado e aplicado em produção**: 23 suprimidos de novo (mesmos de antes, agora via dado nativo); Franciele resolvida automaticamente; Luisana/Luis Eduardo com alinhamento correto; Edmar/Paulo Cesar (2 marcações faltando, caso mais ambíguo) continuam sem alinhamento forçado, por design — mesma filosofia de "não arriscar" do resto do sistema.

**Achado paralelo, em investigação**: William reparou (print de uma listagem de arquivos) que `ExpAuto_Ocorrencias_Minerador.txt` estava com timestamp de quase 19h atrás — `export-ocorrencias.mjs` vem travando por timeout de forma recorrente (07/03, 07/06, 08/07, mesmo já com timeout de 8min). Mandei isso pro Fable incorporar como contexto adicional; William pediu um estudo mais profundo dedicado a essa instabilidade — ver próxima entrada.

---

## 2026-07-08 · 🐛 apuradasAlinhadas gateado só pra fonteInferida — bug de exibição (não de dado)

William achou (print do card da Luisana) o pareamento errado de novo: Entrada mostrando 09:30 (deveria ser "sem batida"), Saída Final sumindo (deveria mostrar 13:30). Investigado: o campo `apuradasAlinhadas` estava CERTO no Firestore (`[null, "09:30", "10:03", "13:30"]`) — o bug era só de exibição. Achado: quando estendi `apuradasAlinhadas` pro loop principal mais cedo hoje (entrada anterior deste histórico), esqueci de avisar o PC que o gate `o.fonteInferida && Array.isArray(o.apuradasAlinhadas)` em `app.js` (2 lugares: linha 8786 e 8957) precisava soltar o `fonteInferida` — esse campo agora é confiável em QUALQUER origem de doc, não só `espelho-marcacoes`. Missão urgente mandada pro PC com as 2 linhas exatas.

---

## 2026-07-08 · 🛡️ Watchdog independente: "isso não pode se repetir" (William)

Depois da correção do timeout, William pediu algo mais forte que retry+observabilidade: "precisa ser uma checagem... isso não pode se repetir". Confirmado com ele (2 perguntas): checador independente que roda sozinho, TENTA CONSERTAR sozinho (reexporta a fonte velha), só notifica se o autoconserto falhar — de hora em hora.

**Implementado**: `check-pipeline-health.mjs` — confere idade dos 4 CSVs do WK (limiar 6h, mais apertado que as 8h do heartbeat), tenta reexportar (reusa os `export-*.mjs` já existentes + `update-config-dates.mjs`+exe direto pro BH, que não tem wrapper próprio), confere de novo, sai com exit 1 só se continuar velho mesmo depois de tentar. Testado rodando de verdade: 4/4 fontes já frescas, nenhum reexport disparado.

**Agendamento**: criada rotina `pipeline-rh-health-watchdog` (hora em hora, minuto 17 pra evitar o minuto redondo) via `mcp__scheduled-tasks`, que roda o script e manda `PushNotification` só se o exit code for != 0. `notifyOnCompletion: false` pra não duplicar aviso (a lógica de "avisar só se falhar" já está no prompt da rotina).

**Achado ao criar**: já existia uma rotina parecida (`check-pipeline-rh-heartbeat`, 1x/dia às 16h) — mas ela só confere se o pipeline "rodou com sucesso hoje" (lê o `status` do report), não se cada fonte específica está fresca. Por isso não pegou o caso de hoje (o pipeline "teve sucesso" mesmo com Ocorrências travada por dentro, best-effort). As duas rotinas são complementares, não redundantes — a nova cobre exatamente essa lacuna.

**Limitação avisada ao William**: essa rotina só dispara enquanto o app Claude Code estiver aberto no servidor (não é um serviço Windows independente) — se fechar, o agendamento só retoma quando reabrir.

---

## 2026-07-08 · 🐛 999 falso-positivo: WK marca "não identificada" mesmo com dia completo (caso Acira)

William achou (print real) a Acira (626) com "Marcação Não Identificada", mas as 4 batidas batiam certinho com o previsto (desvios de 2-7min) — e apontou que isso se repetia várias vezes. Investigado: **17 pessoas** na mesma rodada (07/07) tinham exatamente esse padrão — contagem de marcações batendo (4=4), mas o WK sinalizando 999 mesmo assim. Achado real: **duração do intervalo de almoço sempre ~30min (27-33min) em todos os 17 casos, só o horário ABSOLUTO variando** — escala de almoço flexível (política real), não erro — o WK compara contra o horário FIXO nominal e marca 999 quando o horário real (mas válido) difere, mesma armadilha do caso Carlos Zoz (pausa é por duração, não por relógio).

**Fix** (`process-ocorrencias-rh.py`): `diagnostica_marcacao_ausente` já tinha esse caso como early-return ("quantidade bate, mas o WK sinalizou 999 mesmo assim"), mas só virava `classificacaoIncerta` genérico, nunca suprimia. Agora, quando a contagem bate E todos os desvios (`desvios_todas_posicoes`, mesmo critério de sempre) ficam dentro de `JANELA_MATCH_MIN`, suprime inteiramente — mesma filosofia da correção de falta falsa mais cedo hoje.

**Testado e aplicado em produção**: 17/17 suprimidos, bate exato com a investigação manual. Circuit breaker do uploader disparou (17/26 = 65% da fila de `rh_confere` na janela, acima do limite de 50%) — pedida e obtida autorização explícita do William, resolvido com script one-off (mesma transação segura do resolver automático: só toca se ainda `rh_confere`, `status: auto_resolvida`, mensagem específica no histórico).

## 2026-07-02 · 🔧 BH resolvido de vez: processo órfão do WK + dispositivo de auto-recuperação

Continuação do achado de mais cedo (export de BH travando). Aumentei o timeout (180s→5min) e coloquei um respiro de 2s entre chamadas consecutivas do WK_EXE, mas o problema persistiu — mesmo código de crash (355941) e um EPERM novo no rename do config.

**Causa raiz real, achada com o Monitor de Recursos (Windows, nativo)**: um processo **órfão**, `Ponto.exe -AutoExport:...` — não é o terminal de ponto dos funcionários, é o worker interno que o `ExportacaoAutomatica.exe` invoca pra fazer o export de verdade. O pai (`ExportacaoAutomatica.exe`) tinha crashado (355941) sem avisar o filho, que ficou rodando sozinho desde as 08:00 (quase 2h), segurando o config de Banco de Horas travado o tempo todo.

Descartei primeiro a hipótese de ser o serviço `wksauto` (William reiniciou, não resolveu) antes de achar o `Ponto.exe` órfão de verdade via Monitor de Recursos → Identificadores Associados. Confirmado órfão (processo-pai não existe) e encerrado com autorização do William — resolveu na hora, BH rodou limpo em 27s.

**Dispositivo de auto-recuperação criado** pra não precisar repetir essa investigação manual: `find-and-clear-wk-lock.ps1` (usa a API RestartManager do Windows, a mesma por trás do Monitor de Recursos) + `wk-lock-recovery.mjs`. Regra de segurança rígida: só encerra um processo automaticamente se ele bater OS DOIS critérios — nome numa whitelist conhecida (hoje só `Ponto`) E processo-pai não existe (órfão confirmado). Fora desse padrão exato, nunca mata nada, só loga quem está segurando (nome+PID) pra investigação manual continuar possível. Testado (com um processo de teste, não com o WK de verdade): confirma que NÃO mata quando o nome não bate a whitelist, e mata+libera quando bate.

Aplicado em `update-config-dates.mjs` e `export-ocorrencias.mjs` — os 2 pontos que reescrevem config do WK via rename atômico. Documentado no `WKRADAR-PLAYBOOK.md` com o passo a passo manual (Monitor de Recursos) como fallback, caso o automático não reconheça o padrão numa próxima vez.


---

## 2026-07-02 · 🔓 Login de menor aprendiz habilitado no Portal (folha de pagamento)

William pediu pra habilitar login dos menores aprendizes porque precisam ver a própria folha de pagamento (holerite recebido do GP) no Portal do Colaborador.

O código tinha uma exclusão deliberada pra essa categoria (`sync-colaborador-users.mjs`, decisão do próprio William em 2026-06-24 — "Menor aprendiz: NÃO cria e revoga"). Como é dado de menor de idade + informação financeira/salarial sensível (LGPD tem regra especial pra dado de criança/adolescente), não apliquei de primeira — perguntei se isso já tinha sido validado com jurídico/RH antes de reverter a trava. Confirmado que sim, pode liberar.

**Mudança em `sync-colaborador-users.mjs`**: removida a exclusão de `aprendiz` da lógica de `motivoSemAcesso` (Diretoria e Aposentadoria por Invalidez continuam sem acesso, inalterado). Testado com `--dry` antes de aplicar de verdade: **4 aprendizes reativados** (contas já existiam desde antes da regra de 06-24, só estavam revogadas — não foram criadas do zero), 0 erros.


---

## 2026-07-02 · 🔍 Aprendizes sem CPF em nenhuma coleção — achado repassado pro PC

Depois de habilitar o login dos aprendizes, William testou a tela nova de Conferência de recibos do PC (v248) com o holerite de uma aprendiz e bateu em "CPF não está no cadastro".

Investigado: **não é bug** — é lacuna estrutural. Os 4 aprendizes (f-1200 a f-1203) existem em `funcionarios` mas sem CPF (regra de LGPD: CPF só em `banco-horas-saldos`). E eles não existem em `banco-horas-saldos`/`banco-horas-self`/`bancoHoras` porque **nunca aparecem no export de Banco de Horas do WK** (regime de aprendiz não gera banco de horas, vem de dentro do ERP, não é filtro do pipeline). Resultado: hoje não existe nenhuma coleção com CPF pros aprendizes.

Mandado pro PC (`inbox-pc/2026-07-02-aprendizes-sem-cpf-nenhuma-colecao.md`) — conectei com o "diretório de identificação (código+nome+CPF)" que ele já tinha comentado que ia construir pra outra coisa (custom claims do Storage), sugerindo desenhar pensando nos dois usos de uma vez. Não mexi em nada, é decisão dele.


---

## 2026-07-02 · 🆕 Coleção identificacao criada — código+nome+CPF pra todo ativo

William decidiu não esperar o desenho completo do PC e pediu pra já disponibilizar o CPF dos aprendizes (achado de mais cedo: eles não tinham CPF em nenhuma coleção). Perguntei o escopo — confirmado: todo mundo ativo, não só os 4 aprendizes, já que é o mesmo diretório que o PC vai precisar pro Storage.

**`upload-identificacao.mjs`** (novo): grava `identificacao/{codigo}` = `{codigo, nome, cpf, atualizadoEm}` pra todo funcionário ativo (98 hoje). Fonte: `parsed-empregado.json`. Idempotente, com limpeza de órfão (demitido some do diretório na rodada seguinte) — mesmo padrão do `banco-horas-self`. Ligado no pipeline como etapa best-effort (6b/10).

Rodei manual pra popular já: 98 docs, confirmei os 4 aprendizes com CPF certo.

**Importante**: não criei rule nenhuma (domínio do PC) — sem regra casando, a coleção fica inacessível do cliente por padrão do Firestore. Avisado no bridge (`inbox-pc/2026-07-02-identificacao-no-ar.md`), junto com a ressalva de que o shape é uma primeira versão enxuta (só os 3 campos que ele descreveu) — se ele já tinha algo mais elaborado desenhado, é só falar que ajusto.


---

## 2026-07-02 · 🔑 Custom claims (role+funcionarioId) implementadas — destrava Storage dos recibos

Missão do PC (spec completo, `inbox-wkradar/2026-07-01-recibos-cpf-e-custom-claims.md`): sem essas 2 claims no token do Firebase Auth, a regra do Storage nega leitura de recibo em PDF pra todo mundo, inclusive admin/RH — as rules do Storage não conseguem ler o Firestore, então o controle de acesso ao arquivo depende do token.

Perguntei ao William se via risco grande antes de implementar — avaliação: baixo, já que `setCustomUserClaims` não desloga ninguém nem muda comportamento até o PC forçar refresh do token do lado dele (que ele só faz depois de eu confirmar). Autorizado, implementei:

- **`custom-claims-helper.mjs`**: função idempotente `ensureCustomClaims` — só escreve se a claim realmente mudou (evita invalidar token à toa), funcionarioId fica ausente (não string vazia) quando não se aplica.
- **`backfill-custom-claims.mjs`**: passada única sobre TODOS os `users/{uid}` (todos os papéis, não só quem o pipeline cria). Rodado: 103 usuários, 103 atualizados, 0 erros. Idempotência confirmada numa segunda rodada em `--dry`.
- **`sync-colaborador-users.mjs`**: manutenção contínua pro lado colaborador — seta a claim na criação/reativação, e autocura em quem já existe (defensivo, sem escrita redundante).

**Aviso pro PC**: contas de gestor (admin/rh/líder/supervisor) são criadas pelo lado dele — o backfill cobriu quem já existe, mas gestor novo precisa da mesma lógica no fluxo de criação dele, senão nasce sem claim.

Mandado pro bridge (`inbox-pc/2026-07-02-claims-backfill-feito.md`) com o handshake de teste que ele pediu (2 uids — 1 colaborador, 1 rh — claims confirmadas em ambos).


---

## 2026-07-02 · 🔧 Auto-heal de claims p/ todos os papéis + 📷 fotos oficiais do Drive automáticas

Duas missões do PC no mesmo pedido.

**1) Auto-heal de custom claims estendido pra todo mundo.** PC explicou por que minha sugestão anterior (ele espelhar `setCustomUserClaims` no fluxo de criação de gestor) não dava: é API Admin SDK, o app roda client SDK, não tem como. Solução: o `backfill-custom-claims.mjs` que já varria TODOS os `users/{uid}` (sem filtro de papel) virou etapa recorrente do pipeline (7b/10) em vez de passada única — gestor novo criado pelo app se autocura em até uma rodada (≤8h).

**2) `sync-fotos-drive.mjs` (novo): fotos oficiais do Drive → avatar automático.** William quer as fotos entrando sozinhas, sem clique de ninguém. Casamento arquivo→funcionário por código no nome do arquivo (`"1244 - Dioneia..."`) ou, sem código, nome normalizado contra `parsed-empregado.json`. Contrato rígido (regra de ouro do William, "faz isso apenas uma vez"): fotoBase64 ausente/null → preenche; `""` → respeita remoção proposital (nunca repõe); dataURL existente → intocável (escolha do funcionário). Imagem processada com `sharp`: quadrado 300px, JPEG q75, ~9KB real (bem abaixo da meta de 40KB).

Service account já tinha acesso de leitura na pasta do Drive — não precisou pedir compartilhamento pro William.

**Testado**: 80 imagens na pasta do Drive, 76 casaram (74 por código + 2 por nome), 4 não bateram (nomes que não existem no roster atual — Alexander Schacht Sasse, Hernandes Schlickamann, Joacir Branger, Edilson Locks — logado claro no relatório pro PC ver o padrão com o William se quiser). 73 gravados de verdade (3 casaram mas ainda não têm login criado). 0 erros. Rodei `--dry` antes de aplicar, mesmo resultado — confirma idempotência.

Ligadas no pipeline como etapas best-effort (7b/10 claims, 7c/10 fotos). Novas dependências: `googleapis`, `sharp`. Respondido pro PC no bridge com os números.


---

## 2026-07-02 · 🕐 Marcações/atraso preenchidas nas ocorrencias-auto + CORS do bucket

**CORS do bucket** (missão pequena do PC): aplicado `setCorsConfiguration` em `ocorr-ponto.firebasestorage.app` — GET only, só as 2 origens do app, header Content-Type. Confirmei com o William antes de aplicar (bloqueio automático do harness por ser infra compartilhada com parâmetros vindos de mensagem do PC) — dei minha avaliação de risco (baixo, CORS não abre acesso novo, só permite o navegador tentar, quem pode ler continua 100% controlado pelas rules do Storage já deployadas) e ele autorizou.

**Marcações/atraso nas ocorrências**: William reparou que o modal de conferência mostrava "Previsto —" e "Batido sem marcação" no Atraso da Luisana. Achado: `previstas`/`apuradas` estavam hardcoded `None` desde sempre no `process-ocorrencias-rh.py` (o relatório oficial não traz essas colunas). `duracaoFmt` (o tempo do atraso em si) já funcionava, vindo de Diurnas/Noturnas.

Implementado: previsto vem da escala do cadastro (regex `HH:MM`, cobre os vários formatos inconsistentes de escala no WK); apurado vem do Espelho de Ponto (já fresco no pipeline) cruzando por código+data. Backfill separado pros 3 docs de julho já criados (upload é "cria-e-nunca-reabre", não alcançava quem já existia) — só fez merge dos 2 campos novos, confirmei que status/histórico do RH (`com_lider`/`dispensada`) ficaram intactos.

Verificado: Luisana bateu exatamente com o que o William viu (previsto 05:00-09:00-09:30-13:30, apurado 05:45-09:30-10:02-13:32, 45min = duracaoFmt). Respondido pro PC com o exemplo.


---

## 2026-07-02 · 🎯 Avatar oficial Fiobras (opção B) — smoke test pronto, aguardando aprovação

Missão grande do PC: rosto recortado do fundo original, composto sobre a bandeira verde Fiobras (visual de crachá, igual pra empresa inteira). William aprovou o mock e pediu reimportação das 73 fotos já sincronizadas.

Pedi autorização explícita pro William antes de instalar os pacotes novos (reconhecimento facial é categoria sensível, bloqueio automático do harness por não ter pedido direto do usuário) — autorizado.

**Stack**: `@vladmandic/face-api` + `@tensorflow/tfjs` puro JS backend wasm (NUNCA `tfjs-node`, o PC já tinha avisado do binário quebrado no Windows/Node 20+) + `@imgly/background-removal-node` + `sharp`.

**3 conflitos de biblioteca nativa achados e resolvidos** durante a implementação:
1. `sharp` + `@imgly/background-removal-node` no mesmo processo = SEGFAULT (onnxruntime nativo × libvips/Cairo). Fix: `bg-remove-worker.mjs`, processo-filho isolado.
2. `sharp` com `canvas`+`tfjs-wasm` carregados travava `.composite()` de forma inconsistente (erro de dimensão mesmo com dimensões idênticas confirmadas). Fix: `compose-worker.mjs`, também isolado.
3. Bug/particularidade do próprio sharp: encadear `.resize().extract()` quando o extract é um no-op, ou `.composite().resize()` sem materializar entre os dois, produz buffer com metadata correta mas que quebra na operação seguinte. Corrigido evitando esses encadeamentos.

Nenhum precisou do fallback Python (`rembg`) que o PC sugeriu como plano B — a stack JS funcionou 100% depois do isolamento de processo.

**Smoke test** (5 fotos variadas, conforme pedido): 785 boa / 671 escura / 1239 rosto pequeno / 949 rosto grande / 601 caso limite (sem rosto detectável nem em alta resolução — mantida como estava, corretamente). 4 tratadas com sucesso (score 0.94-1.00), 0 erros. Conferi visualmente 3 delas eu mesmo antes de mandar pro PC — recorte limpo, bem enquadrado, funciona até no caso escuro.

**Parado aguardando aprovação** do William/PC antes de rodar o lote completo (73), conforme pedido explícito na missão.


---

## 2026-07-03 · 🚨 26 "Faltas Injustificadas" falsas — atraso de fechamento do WK, causa raiz corrigida

William reparou (comparando o relatório bruto do WK com a tela de Ocorrências) que uma leva grande de "Falta Injustificada" surgiu pra 02/07 na fila do RH — 26 pessoas de departamentos bem diferentes, implausível todas terem faltado no mesmo dia.

**Investigado**: os 26 docs foram TODOS criados na mesma rodada — a primeira do dia (08h de hoje), logo que 02/07 "formou" de dia aberto pra fechado. Rodei um export fresco mais tarde (mesma janela de datas, ~08h50) e comparei: **só 3 das 26 ainda batem** (Paulo Cesar Coelho Santos, Manuel Alejandro Quintero Avendano, Yusmary Del Carmen) — as outras 23 já não aparecem mais, confirmando que eram falso positivo.

**Causa raiz**: o próprio WK Radar não termina de processar/fechar o dia anterior instantaneamente à meia-noite — parece ter um fechamento que roda de madrugada e ainda não tinha terminado às 08h. Como `ocorrencias-auto` é "cria-e-nunca-reabre", essa leitura prematura vira permanente.

**Ações tomadas** (autorizadas pelo William):
1. **Apagados os 23 falsos positivos confirmados** — só depois de checar que nenhum tinha status diferente de `rh_confere` (RH não tinha mexido em nenhum, sem trabalho perdido).
2. **Horário do Task Scheduler mudado de 08h/10h/14h para 09h/11h/14h** — dá uma hora a mais de folga antes da primeira rodada do dia, tempo suficiente pro WK terminar de fechar o dia anterior (confirmado empiricamente: dados já estavam certos por volta das 08h50).

Nada mudou do lado do PC — é ajuste puro de agendamento + limpeza de dado no pipeline.


---

## 2026-07-03 · Detector de "marcação não identificada" (código WK 999) — novo tipo de ocorrência automática

Investigação do caso do Charles Andre Marowski (f-1204, "não registrou saída" sumida da tela) levou a descobrir que o Espelho de Ponto do WK tem uma situação interna própria, código 999 "Marcações Não Identificadas" (confirmada na tela "Relação de Situações" do próprio WK), pra dias com marcação incompleta/ambígua.

**Testado empiricamente antes de implementar** (pedido do William): comparar previstas x apuradas em toda linha do Espelho, sem olhar o código 999, deu 237 "casos" — ruído demais (turno com hora-extra, escalas com menos marcações por natureza). Filtrando por situação==999 + maturidade de >=2 dias (o Espelho assenta mais devagar que a Relação de Ocorrências — mesma causa raiz do incidente das 26 Faltas falsas), 40 casos brutos viraram 3 candidatos limpos: Edmar Leite da Silva (753) e Charles (1204) faltando a saída, Jhenyffer Caroline Silva Pereira (1151, 3º turno) faltando a entrada.

Turno noturno inicialmente foi excluído por precaução (medo do WK quebrar a virada de meia-noite em 2 linhas de data) — conferido nos dados crus de 3 funcionários do 3º turno num mês inteiro e não é isso: o turno inteiro sempre cai numa linha só, na data de início. Exclusão removida.

**Revisão adversarial (workflow, 3 ângulos + verificação)** antes de ligar no pipeline pegou 4 problemas reais, todos corrigidos:
1. Matching guloso de previstas x apuradas podia errar a posição quando 2 horários previstos ficam próximos — trocado por tentativa posicional (testa cada posição como candidata a ausente, exige bater todo o resto dentro da janela; ambíguo se mais de 1 posição bate).
2. dedupId sem prefixo de fonte — hoje não colide por acaso (rótulos diferentes das 4 situações oficiais), mas sem garantia estrutural. Adicionado prefixo `esp_` só na fonte nova (a antiga já tem docs reais, não mexe no formato dela).
3. Filtro "Geral e líderes de turno: só Falta gera, resto vira BH" não estava replicado no detector novo — adicionado.
4. Ocorrência gerada por essa fonte não tinha nenhum campo estruturado sinalizando "isso é heurística, não fato oficial do WK" — adicionado `fonteInferida: true` no Firestore (era só texto livre no histórico antes).

A revisão também teve uma inconsistência interna curiosa: 2 achados sobre o campo "setor" se contradisseram entre si (um dizia que o código novo usava a chave errada, outro dizia o oposto) — resolvido conferindo o schema real do `parsed-empregado.json` (o campo é `departamento`, meu código já estava certo; o achado que dizia "usa a chave errada" tinha até concluído "está FALSO" no texto mas ficou marcado como confirmado por engano no campo estruturado).

**Já está ligado no pipeline em produção** (só editei `process-ocorrencias-rh.py` e `upload-ocorrencias-auto.mjs`, ambos já rodam via `run-pipeline.mjs` nos passos [OCR-parse]/[OCR-upload] — sem passo novo pra ligar).

## 2026-07-03 · Investigação do caso Charles: users/{uid} sem funcionarioTurno

PC confirmou e corrigiu (v269) a causa raiz da ocorrência manual do Charles que sumiu: regra do Firestore exige `funcionarioTurno in [1,2,3,'geral']`, e o form deixava selecionar funcionário sem turno definido. Ao investigar de onde vinha o "sem turno", conferi as 2 fontes que controlo: WK Radar e `funcionarios/f-1204` (Firestore) — as duas SEMPRE tiveram turno=1 certo. Achei o gap real: `users/{uid}` (doc de auth/login) não tem o campo `funcionarioTurno` — só `funcionarioId`/`role`/`nome`/`ativo`. Nunca escrevi esse campo lá (só denormalizei `funcionarioTurno` em `banco-horas-self`, pedido de 01/07). Reportado ao PC pra confirmar se é essa a coleção que o form/rule consulta — se for, é fácil eu adicionar (mesmo padrão do funcionarioId/custom claims).


---

## 2026-07-03 · Lote completo de avatares (opção B) rodado — 62 tratados, 0 erros

Smoke test de 5 fotos aprovado pelo William direto no app ("está aprovado, gostei muito
do resultado", relatado pelo PC) e reconfirmado direto no chat comigo. Rodado o lote
completo: 80 imagens na pasta do Drive -> 62 tratadas (rosto detectado + fundo removido
+ composto na bandeira da marca), 0 degradadas, 7 sem rosto detectável (mantidas como
estavam), 4 puladas (já tratada/removida/escolha do colaborador), 3 sem login ainda,
0 erros. Fotos finais ~4-11KB cada. Relatório completo mandado pro PC
(claude-bridge/inbox-pc/2026-07-03-avatar-lote-completo.md). Script
sync-fotos-drive-tratamento.mjs continua fora do run-pipeline.mjs por ora (roda sob
demanda) — vira rotina agendada só se pedido.


---

## 2026-07-03 · Avatar: fallback de 2 estágios na detecção de rosto — recupera 6 de 7 "sem-rosto"

William reportou 2 pessoas do lote de 73 avatares (Anderson Dobuchak/612, Moises Silva de Carvalho/1215) com foto "errada" no app — investigado e confirmado visualmente que ambos têm fotos originais claras, rosto bem visível a olho humano, mas o detector (face-api SsdMobilenetv1) não achou o rosto.

**Causa raiz** (achada testando várias escalas de redimensionamento): o `minConfidence` default do modelo é 0.5, e as 7 pessoas "sem-rosto" do lote tinham sinal real mas abaixo desse limiar em certas escalas — não é ausência de rosto, é threshold cortando detecção marginal.

**Consultado o conselheiro (Fable)** antes de implementar — vetou a ideia inicial (tentar 7 escalas cegamente) e desenhou um fallback de 2 estágios mais preciso: estágio 1 intocado (resolução original, threshold 0.5); estágio 2 só se o 1º falhar — 3 escalas (1600/800/480px), threshold 0.35, escolhe o maior score, com filtro de sanidade de proporção e reprovação automática se a detecção de baixa confiança não passar no crivo do `confiancaMatte()` (some pra "sem-rosto" em vez de gravar algo arriscado). Também recomendou uma válvula de escape manual (`overrides-rosto.json`) pros casos que nenhum algoritmo pega.

**Implementado por um agente Opus, verificado por um agente Sonnet** (diff conferido campo a campo + dry-run real nos 7 casos + inspeção visual das boxes detectadas). Rodado de verdade nos 7 códigos: **6 recuperados** (601, 1215, 1218, 1039, 476, 612 — mais que os 3 previstos no diagnóstico inicial, sem nenhum falso positivo), só Paula Cristina dos Santos (1048) continua sem rosto detectável em nenhuma escala — fica pendente de override manual se quiserem tratar ela também.

Registrado em memória (`feedback_orquestracao_agentes.md`) os princípios de orquestração que o William formalizou nesta sessão: modelo caro só decide (nunca mecânico), lentes estreitas por agente, agente propõe/humano decide, registrar acerto validado (não só erro), ceticismo com arquitetura badalada importada sem necessidade real.

---

## 2026-07-03 · Fechamento da investigação do caso Charles: `users/{uid}.funcionarioTurno` NÃO é o gap

Conferido o código antes de aceitar a hipótese do WKRADAR (não chutar em cima do relato). O form de "Nova ocorrência" nunca leu nem lerá `users/{uid}`: `public/firebase.js:153` busca `func = getFuncionario(funcionarioId)` do cache de `funcionarios/{codigo}`, a validação em `firebase.js:158` confere `func.turno`, o campo `funcionarioTurno` do documento novo é denormalizado de `func.turno` no momento da escrita (`firebase.js:170`), e a regra (`docs/firestore.rules:266`) confere `request.resource.data.funcionarioTurno` — o campo do doc sendo criado, nunca `users/`. Como o WKRADAR já confirmou que `funcionarios/f-1204.turno` (Charles) sempre foi 1 nas duas fontes, o plano de adicionar `funcionarioTurno` em `users/{uid}` foi descartado — não resolveria nada porque nunca foi lá que o app lia. O gap real já estava fechado pela v269 (funcionário sem turno em `funcionarios/{codigo}` agora bloqueia na UI com instrução fixa, nunca mais falha silenciosa). Resposta completa em `claude-bridge/inbox-wkradar/2026-07-03-1440-resposta-gap-turno-e-status.md`.


---

## 2026-07-03 · Bug real: Espelho de Ponto mostrava marcação incompleta (9% dos dias da empresa)

William reparou no "Meu ponto" que o dia 29/06 da Lucivane (545) mostrava só 2 marcações (07:26 · 12:02), parecendo falta de registro. Investigado: o WK Radar tem 2 colunas no Espelho — "Originais" (scan bruto) e "Apuradas" (reconciliação do próprio WK, que enche buraco quando confia). Pra esse dia, Originais tinha só 2, mas Apuradas tinha as 4 completas (07:26-12:02-13:12-17:30), situação "Trabalhando" (nunca virou 999). `process-espelho-ponto.mjs` estava montando o campo `marcacoes` (o que o Portal mostra) a partir de Originais em vez de Apuradas.

**Escopo real**: não era só a Lucivane — checado no CSV cru, **230 de 2570 dias-marcação da empresa inteira (8.9%)** têm Originais mais curto que Apuradas. Bug afetava o "Meu ponto" de qualquer colaborador nesses dias.

**Corrigido**: `marcacoes` agora prefere Apuradas (só cai pra Originais se Apuradas vier vazio, defensivo). Rodado de verdade (`process-espelho-ponto.mjs` + `upload-banco-horas-self.mjs`), conferido no Firestore que o doc da Lucivane já reflete os 4 horários certos. Propaga pra todo mundo na próxima rodada agendada também (já rodou agora manualmente).

Sobre o "dia de hoje" (03/07) não aparecer: confirmado que **não é bug** — o export do Espelho do WK simplesmente ainda não tem a linha de hoje (mesmo atraso de fechamento documentado no incidente das 26 Faltas falsas e no detector de "Marcações Não Identificadas"). Comportamento esperado, dado ainda não existe na fonte.


---

## 2026-07-03 · Confirmado (de novo): dado "incompleto" era só imaturidade, não bug — e fechado gap de lock-recovery

William apontou que 02/07 (ontem) da Lucivane ainda mostrava só 1 marcação — certo dele, já devia ter assentado. Reexportei o Espelho fresco: 02/07 realmente já tinha as 4 marcações completas (situação virou "Trabalhando"), e agora é o 03/07 (hoje) que está com só 1 — o mesmo padrão de atraso de fechamento do WK andou um dia pra frente, confirmando de novo (3ª vez nesta sessão: Faltas falsas, detector 999, agora isso) que não existe bug de dado aqui, é característica do WK mesmo. Reprocessado e resubido pro Firestore com o dado fresco.

No caminho, achei e corrigi um gap real: `export-espelho.mjs` era o único dos 3 scripts que reescrevem config do WK ainda usando `fs.renameSync` puro (sem o `wk-lock-recovery.mjs` que os outros 2 já tinham desde 2026-07-01/02) — travou 2x hoje no mesmo `Config_Relatorio_de_Apurações4.txt`, preso por um `Ponto.exe` órfão. Corrigido pra usar o mesmo mecanismo dos outros.


---

## 2026-07-03 · "Meu ponto" agora esconde dia não maduro (William: "isso não pode acontecer")

Depois de confirmar (de novo) que o dia incompleto era só o WK ainda processando, o William foi direto ao ponto: mostrar pro colaborador um dia que parece errado mas na verdade só não fechou ainda **não pode acontecer**, mesmo sendo "esperado" do lado do WK. Perguntei o formato (esconder vs. mostrar com aviso "em apuração") — ele escolheu esconder.

Implementado em `process-espelho-ponto.mjs`: dia com menos de 2 dias (mesmo buffer já validado nesta sessão pras Faltas falsas e pro detector 999) não entra no array `dias` do `banco-horas-self`. Roda com `dataIso <= hoje-2dias`. É janela ROLANTE — o dia aparece sozinho assim que completa 2 dias na próxima rodada, não precisa de nenhuma ação manual. NÃO filtra por situação: um caso genuíno de marcação faltando (tipo Charles 1204) continua aparecendo depois de maduro — a intenção é esconder só enquanto o dado ainda PODE mudar sozinho, não esconder informação real.

Rodado e resubido pro Firestore — Lucivane agora mostra até 01/07 (2 dias atrás), 02/07 e 03/07 saem da lista até maturarem.


---

## 2026-07-03 · Correção do fix anterior: esconder dia imaturo quebrava a tela do gestor

William usou a tela de gestor (Espelho de outro colaborador, não "Meu ponto" próprio) pra investigar o caso do saldo -00:08 da Lucivane, e bateu de frente com o fix de "esconder dia imaturo" de mais cedo — o dia 02/07 (que ele precisava ver pra achar a causa) tinha sumido de lá também, já que gestor e colaborador leem a mesma coleção `banco-horas-self`.

Corrigido: voltei a mandar TODOS os dias no array `dias[]`, e adicionei `maduro:true/false` em cada dia (mesmo buffer de 2 dias). Quem decide esconder ou não agora é a tela — "Meu ponto" do colaborador deve filtrar `maduro`, "Espelho de Ponto do gestor" deve mostrar tudo. Avisado o PC, precisa de ajuste do lado dele pro "Meu ponto" aplicar o filtro (a mudança de dado já está no ar, mas sem o filtro client-side o colaborador volta a ver o dia instável até o PC aplicar).


---

## 2026-07-06 · ⛔ Tentativa de automatizar o export de Apurações — BLOQUEADA (relatório rico sumiu do WK)

**Objetivo (tarefa separada, mais simples que o uploader):** colocar o export+parse de Apurações (`process-apuracoes.mjs`, já maduro, "FASE DE TESTE") no agendamento diário, SEM criar uploader novo pro Firestore (schema ainda em aberto). Mesmo padrão de segurança do `export-ocorrencias.mjs`: reescrita de datas byte-safe latin1, `ArquivoExportacao` ASCII, `IdsFuncionarios` vazio, escrita atômica + `wk-lock-recovery.mjs`, verificação de mtime avançando.

**O que achei ao investigar qual config WK gera `ExpAuto_Apuracoes.txt`:** nenhum dos 5 configs hoje em `D:\WKRadar\BI\Config\Config_Relatorio_de_Apurações{,1,2,3,4}.txt` aponta pra lá — todos foram reaproveitados por trabalho anterior (`1`=fallback dormente de Ocorrências → `ExpAuto_Ocorrencias.txt`; `4`=Espelho de Ponto ativo → `ExpAuto_Espelho_Ponto.txt`; `2`/`3` nunca chegaram a rodar). O arquivo `ExpAuto_Apuracoes.txt` que existia em disco (1.6MB, 6494 linhas, 20 colunas completas: Cód.Emp/Ficha/Crachá/Nome/Data/Ocorrência/Observação/Cód.Sit/Situação/Tipo Situação/Horário/Originais/Apuradas/Previstas/Saldo Diário/Departamento/Turma/Escala/Tipo/Motivo) datava de 26/06 — gerado manualmente na sessão que criou `process-apuracoes.mjs` (ver entrada 2026-06-26 acima), via `Config_Relatorio_de_Apurações.txt` (sem sufixo, na época).

**Tentei reconstruir:** copiei o config sem sufixo (mesmo `Hash`/`Modelo="ExpAuto_Relatorio_de_Apuracoes"`, técnica validada — Hash não valida conteúdo, item 3 do `WKRADAR-PLAYBOOK.md`/quirks) pra um config novo (`Config_Relatorio_de_Apurações5.txt`), corrigindo `ArquivoExportacao`→`ExpAuto_Apuracoes.txt`, `ListarSomenteOcorrencias`→"Não", `IdsFuncionarios`→vazio. **Rodei de verdade** (`export-apuracoes.mjs`, `node export-apuracoes.mjs`): exit 0, mtime avançou, arquivo gerado (67KB). Só que o CSV saiu com **9 colunas semanais** (Cód.Emp/Nome/Cód.Depto/Departamento/Data/Cód.Sit/Situação/Diurnas/Noturnas) — o relatório **"Relação de Ocorrências"**, o MESMO que `export-ocorrencias.mjs` já usa como fallback dormente. Ou seja: esse Hash específico, hoje, no WK, resolve pro relatório enxuto — não pro rico.

**Conclusão:** o relatório rico de 20 colunas **não existe mais como definição salva no WK** — foi perdido/sobrescrito quando William reaproveitou o config sem sufixo pra virar `WK_OCORR_CONFIG` (2026-07-01/02, ver entrada "Automação 100% headless"). O outro Hash existente (`ExpAuto_Relatorio_de_Apuracoes_1`, configs 3/4) resolve pro **Espelho de Ponto** (7 colunas). Nenhum dos 2 Hashes salvos hoje produz o relatório completo. Isso **não é recuperável por edição de arquivo** — precisa de ação humana no Modelador do WK Radar (recriar/re-salvar o relatório rico, provavelmente com um Hash novo).

**Decisão:** NÃO wireei nada quebrado no `run-pipeline.mjs`. Reverti a chamada de `export-apuracoes.mjs`/`process-apuracoes.mjs` que tinha adicionado lá. Mantive só o que é seguro e correto independente do bloqueio: `config.mjs` ganhou `WK_APURACOES_CONFIG`/`APURACOES_CSV_PATH`/`PARSED_APURACOES_OUT` centralizados (com comentário explicando o bloqueio) e `process-apuracoes.mjs` passou a importar os paths de `CONFIG` em vez de hardcoded (limpeza segura, não muda lógica de negócio). `export-apuracoes.mjs` foi criado (mesmo padrão de segurança do `export-ocorrencias.mjs`: datas dinâmicas 1º-do-mês-anterior→hoje, ASCII, lock-recovery, verificação de mtime) mas **não está referenciado em `run-pipeline.mjs`** e tem aviso grande no cabeçalho avisando que aponta pro config errado.

**Efeito colateral (não destrutivo, mas real):** rodar o teste **sobrescreveu** `D:\WKRadar\BI\Registros\ExpAuto_Apuracoes.txt` (arquivo gerado, não é dado bruto do ERP — WK regenera) com o CSV de 9 colunas, e rodar `process-apuracoes.mjs` em cima disso sobrescreveu `parsed-apuracoes.json` local com um resultado vazio (`0 ocorrências` — o parser não achou a coluna `Ocorrência` no CSV errado, falhou silenciosamente pra 0 em vez de erro, o que é uma fragilidade a considerar depois: hoje ele não valida que o cabeçalho tem as colunas esperadas antes de processar). **Nenhum dado subiu pro Firestore** (`process-apuracoes.mjs` nunca escreve lá). `parsed-apuracoes.json` é artefato local/efêmero (não versionado, não é fonte de verdade) — a versão de 01/07 com dado rico real se perdeu, mas não havia como preservar sem reescrever por cima do teste real que a tarefa pedia.

**Config 5 fica no disco** (`Config_Relatorio_de_Apurações5.txt`) — não apaguei (regra de não deletar nada em `D:\WKRadar`), mas está órfão/não referenciado por nenhum script ativo, igual `...2.txt`/`...3.txt` já estavam.

**Pendência pro William:** decidir se vale recriar o relatório rico no Modelador do WK (repetindo o processo que gerou o `ExpAuto_Apuracoes.txt` original em 26/06) antes de reativar a automação de Apurações — ou se o schema de app deveria migrar pra uma fonte mais simples (ex.: Espelho de Ponto + Ocorrências combinados, que juntos cobrem quase as mesmas colunas, mas exigiria reescrever a lógica de `process-apuracoes.mjs`, fora do escopo desta tarefa).

Lição: ao decidir "esconder X", pensar em TODAS as telas que consomem o mesmo dado, não só a que motivou o pedido.


---

## 2026-07-03 · Buffer de maturidade ajustado pra 1 dia (não 2) — Espelho de Ponto

William apontou que esconder D-1 não fazia sentido, só o dia corrente. Reconferido com a evidência do próprio dia (02/07 assentou entre manhã e tarde do MESMO dia) — o buffer de 2 dias emprestado do detector de ocorrências (999) era conservador demais pra esse caso de uso específico. Ajustado `process-espelho-ponto.mjs` pra `maduro:false` só no dia corrente. Já rodado e resubido.

Caso do saldo zero da Lucivane (01/07, ~2h44 de excesso trabalhado, saldo fechou 00:00) permanece sem explicação — descartado bug de exibição (app só renderiza o campo puro) e bug de parser (confirmado no CSV bruto do WK nos dois relatórios). Mandada mensagem pro PC pedindo ajuda, mas ambos concordamos que provavelmente só resolve com alguém checando a política de Banco de Horas direto na tela do WK Radar — nenhum dos dois Claudes tem acesso à UI do sistema, só aos exports.


---

## 2026-07-03 · CAUSA RAIZ ACHADA: Banco de Horas Mensal reseta na virada do mês (explica todo o "saldo errado")

Depois de várias idas e voltas sobre o saldo "errado" da Lucivane e o pressentimento do William de que "junho tava tudo certo" — investigação sistemática confirmou: o WK tem o "Banco Horas Mensal - Geral" configurado como tipo "Mês" (campo `Tipo Per. B.H.` no export), e esse contador **reseta pra 00:00 na virada de cada mês**, pra maioria dos funcionários.

**Prova concreta**: Paulo Cesar Coelho Santos (1221) fechou junho com -12:33 acumulado (visível subindo/descendo a coluna saldo do Espelho o mês inteiro) e virou 00:00 em 01/07 — delta exato de +12:33 (753min), batendo com o "salto gigante" achado na auditoria. Confirmado em 88 pessoas: 55 resetam assim, 33 não resetam (carregam saldo normal) — segunda coisa a esclarecer, pode ser diferença de tipo de contrato/política ou inconsistência real.

Isso explica RETROATIVAMENTE por que junho pareceu consistente (nenhuma virada de mês dentro do período) e julho pareceu bagunçado (toda comparação dia-a-dia cruzando 30/06→01/07 pega o reset, não o trabalho real daquele dia) — inclusive o caso original da Lucivane (fechou junho em -00:13, resetou pra 00:00 em 01/07, por isso as 2h44 de hora extra que ela trabalhou naquele dia não aparecem refletidas ali).

**Não é bug do pipeline** — é comportamento real e consistente do "Banco Horas Mensal" do próprio WK, fielmente refletido pelos meus scripts. **Pergunta de negócio em aberto, não técnica**: reset mensal é a política pretendida da empresa (banco "use ou perca" mensal) ou é configuração errada no WK (deveria ser corrido/perpétuo)? E por que 33 de 88 não resetaram — outro tipo de banco, ou inconsistência? Só William/RH/quem configura o WK pode responder — não é algo que dá pra decidir ou corrigir a partir dos exports.


---

## 2026-07-03 · Caso do saldo da Lucivane (01/07) — encerrado: confirmado problema do lado do WK

William confirmou: o problema é do lado do WK (lançamento/configuração dentro do sistema deles), vai ser corrigido por lá. Fechando o registro da investigação.

Checagens finais feitas antes de encerrar: reexportado o Espelho fresco (3ª vez ao longo do dia) — valor de 01/07 estável em 00:00, não é mais dado assentando. Conferido que não existe segundo tipo de Banco de Horas pra ela (só "Geral", código 2; existe também "Produção", código 1, pra outro grupo). Nenhum rastro das 2h44 de hora extra em nenhum dos 2 arquivos do WK que o pipeline lê. Duas hipóteses ficaram em aberto sem confirmação possível a partir dos exports: (a) nunca foi lançada, precisa de correção manual dentro do WK; (b) foi paga em dinheiro na folha em vez de banco de horas (relatório que o pipeline não tem acesso). Não é bug do pipeline — dado fielmente refletido dos exports do WK.


---

## 2026-07-05 · Assinatura eletrônica de documentos: página de autenticação anexada (v277) + decisões jurídicas

Evolução da assinatura carimbada de documentos institucionais (task 86, que foi ao ar no v276 como um comprovante A4 SEPARADO). Decisão do William: seguir o modelo DocuSign, o documento assinado vira um PDF ÚNICO (conteúdo original + uma página de autenticação no fim), no lugar de dois arquivos soltos. O objetivo declarado foi "deixar super confiável e chegar a algo juridicamente válido". Nível de assinatura escolhido: **avançada** (Lei 14.063/2020 + MP 2.200-2 art. 10 §2º + CPC art. 411), que resolve pro caso de uso atual. Qualificada (ICP-Brasil/e-CPF) fica como projeto separado só se um dia precisar pra ato de altíssimo risco, é inviável exigir e-CPF de trabalhador de fábrica.

**Revisão do Fable (gate de segurança, PII/validade jurídica).** Voltou "GO com 4 ajustes" e pegou duas coisas importantes:

1. **Fragilidade JÁ EM PRODUÇÃO (herdada do v276):** documento cujo anexo é só um LINK (Drive) caía num fallback que hasheava string vazia, ou seja, a trilha guardava o SHA-256 do nada, que não prova integridade de coisa nenhuma. Não dá pra consertar o que já foi assinado (trilha é append-only e imutável, por design). Estancado daqui pra frente: o compositor agora BLOQUEIA o nível "assinatura" quando o documento só tem link externo (tem que ter arquivo no app ou o texto). Documentos já assinados sob v276 com anexo-link ficam com hash sem valor probatório, registrado aqui pra memória.
2. **Armadilha de ciclo de vida:** ao publicar uma nova versão do documento, o anexo antigo é substituído no Firestore, então o conteúdo que o colaborador efetivamente assinou podia SUMIR do sistema, deixando o hash da trilha inverificável. Corrigido embutindo os BYTES EXATOS do original como attachment DENTRO do PDF assinado (via pdf.attach() do pdf-lib). Qualquer perito extrai o anexo, calcula o SHA-256 e bate contra a trilha e contra a página de autenticação. Para documento só-texto, anexa a descrição como um .txt.

Outros ajustes implementados no v277 (tudo cliente, sem mudança de regra, o path e o payload da trilha continuam idênticos ao v276): validação do PDF na publicação (PDF cifrado/corrompido dá erro claro pro RH, não trava o colaborador depois); sanitização WinAnsi de todo texto desenhado (emoji/CJK não quebram mais o gerador); rodapé "Página X de Y · ID {idAssinatura}" em toda página; página de autenticação declara o escopo do hash, a versão assinada e a política (hora do servidor Firebase, geolocalização, credencial pessoal com senha reconfirmada); cascata de fallback (monta o PDF → se falhar, rasteriza via pdf.js → se falhar, cai no comprovante standalone do v276), a assinatura nunca trava. Verificado em navegador com 4 casos (PDF multipágina, imagem, texto com acento, fallback rasterizado), o attachment bateu o SHA-256 da trilha nos quatro.

**Decisão do William sobre o termo de adesão ao meio eletrônico** (a maior peça pra validade jurídica, apontada pelo Fable): **os dois**. Papel na admissão pros novos (o RH arquiva o termo assinado) E um termo digital no app (nível assinatura), que deve ser o primeiro documento institucional que quem já está na base assina, cobrindo todo mundo. O termo digital ainda precisa ser redigido (conteúdo jurídico) e publicado como documento nível "assinatura", fica de pendência.


---

## 2026-07-06 · 22 "Faltas Injustificadas" falsas (de novo) — mesma causa raiz, dessa vez 3 dias pra assentar

William reparou (comparando o app com a tela do WK) que Franciele Lemes Rosa (1074) aparecia com "Falta Injustificada de 8h" no dia 03/07, mas as batidas do dia mostravam ela trabalhando quase o dia inteiro (só 13min de saída antecipada). Comparei com um export fresco do WK: 03/07 realmente tinha virado "Saída Antecipada" (13min) — a "Falta" tinha sido capturada pelo pipeline manual desta manhã (08:28) ANTES do WK terminar de assentar aquele dia, EXATAMENTE 3 dias depois do fato (sexta 03/07, rodada de segunda 06/07 de manhã) — mais lento que qualquer assentamento visto antes nesta sessão (que resolvia em horas).

**Verificação sistemática**: cruzei as 30 "Faltas Injustificadas" da coleção `ocorrencias-auto` contra o export fresco — **26 de 30 eram falsas** (situação mudou ou o dia simplesmente não tinha mais ocorrência nenhuma). Só 4 continuavam genuínas (1206, 1221, 1237, 1246). Os números batem exatamente com o total de 26 Faltas que a rodada de hoje de manhã gerou.

**Apagadas as 22 que tinham status `rh_confere` intocado** (autorização explícita do William: "vc tem minha autorização sempre! se estivermos falando do mesmo assunto... pode apagar e corrigir e deixar redondo"). Coleção `ocorrencias-auto` foi de 37 pra 15 docs. Nenhuma tinha sido tocada pelo RH.

**Achado à parte**: o William apontou que a "Falta" de 06/07 (HOJE) pra Franciele que apareceu no export fresco TAMBÉM não é confiável ainda ("ela ainda nem veio trabalhar" — o dia não fechou). Correto — meu próprio filtro `puloAberto` (dataIso >= HOJE) já ignora isso automaticamente, então nunca chegou a subir. Boa lembrança de não tratar dado de dia aberto como validado só porque "parece fazer sentido".

**Questão em aberto pro pipeline**: o buffer atual pra "Faltas Injustificadas" do relatório oficial é só "não é hoje" (1 dia). O detector de "Marcações Não Identificadas" (999) e o Espelho de Ponto já usam buffer de 1-2 dias por causa desse mesmo padrão de assentamento lento. Esse incidente mostra que às vezes o assentamento do relatório oficial pode levar MAIS de 1 dia inteiro (aconteceu com uma sexta-feira, sem rodada no fim de semana). Vale considerar aplicar o mesmo tipo de buffer de maturidade (2+ dias) na fonte oficial de Faltas/Atrasos também — ainda não implementado, só levantado como possibilidade.


---

## 2026-07-06 · Implementada reverificação automática de ocorrências (resolve o padrão recorrente de Faltas falsas)

Depois do 2º incidente de Faltas falsas no mesmo dia (Franciele Lemes Rosa, 22 de 30 Faltas falsas — ver entrada anterior), consultei o conselheiro (Fable) sobre a melhor arquitetura: aumentar o buffer de maturidade (como já feito no Espelho e no detector 999) ou outra abordagem. Veredito: **não aumentar buffer** — o assentamento do WK não é um prazo fixo (é um evento, "WK terminou de apurar"), pode levar horas ou 3+ dias dependendo de fim de semana/feriado, e nenhum N de dias estático cobre todo caso sem atrasar toda falta REAL também.

**Solução implementada**: reverificação contínua em `upload-ocorrencias-auto.mjs`. Toda rodada do pipeline reconfere os docs `rh_confere` (que o RH ainda não olhou) contra o dado fresco desta rodada:
- Se a situação sumiu/mudou → doc vira `auto_resolvida` (soft-resolve, nunca apaga, guarda no histórico o que o WK mostra agora).
- Se depois o WK reafirmar (dedupId reaparece) → volta pra `rh_confere` (rearme).
- Circuit breaker: se resolveria mais de 50% dos `rh_confere` na janela válida, aborta só essa etapa (protege contra CSV truncado/export com problema).
- Transactions com releitura + reconfirmação de status, protegendo contra corrida com o RH mexendo no mesmo instante.
- `com_lider`/`dispensada`/`confirmada` (decisão humana) nunca são tocados — só `rh_confere` e `auto_resolvida` entram nos filtros.

Implementado por agente Opus, verificado por agente Sonnet (diff completo + dry-run real contra dado de hoje: `autoResolvidas=0`/`rearmadas=0`, esperado já que o incidente tinha sido limpo manualmente antes desta mudança).

**Pendência**: novo status `auto_resolvida` precisa de tratamento na UI do RH (PC) — hoje a tela teria um status que ela não conhece. Avisado via bridge.

## 2026-07-06 (tarde) — Ocorrências: fonte Minerador do WK + campo horarioRelevante

**O que mudou:**
1. Fonte de "Ocorrências" trocada do relatório headless de 9 colunas
   (`Config_Relatorio_de_Apurações1.txt` → `ExpAuto_Ocorrencias.txt`) para um
   relatório novo construído pelo William no WK ("Minerador",
   `Config_Minerador_Ocorrencias.txt` → `ExpAuto_Ocorrencias_Minerador.txt`).
   Mesmas 9 colunas de sempre (validadas linha a linha idênticas pro
   04/07/2026) + 3 colunas nativas do WK: Previstas/Originais/Apuradas — já
   corretas por dia, inclusive sábado/domingo com escala diferente da semana
   (validado: Nagela 961 sábado turno 1, Franciele 1074/Josineire 1115 sábado
   turno 2, Djoniffer 866/Rosenildo 1133 turno 3 sem mudança). Isso elimina a
   tabela manual `ESCALA_SABADO`/`ESCALA_DOMINGO` no loop principal do
   `process-ocorrencias-rh.py` — ela continua existindo só pro detector de
   "Marcações Não Identificadas" (999), que opera sobre o Espelho de Ponto
   (sem coluna Previstas nativa).
2. Config do Minerador corrigido antes de virar produção: `GerarSemAspas`
   estava "0" (campos com aspas) e `IdsFuncionarios` tinha lista estática de
   ~155 IDs (mesmo bug de excluir contratado novo já corrigido antes no
   config antigo) — ambos corrigidos pra `1`/vazio.
3. Tentativa de colocar "Apurações" (outro relatório) em produção —
   BLOQUEADA: o relatório rico de 20 colunas que `process-apuracoes.mjs`
   espera não existe mais como definição distinta no WK (o Hash/config foi
   reaproveitado internamente pela migração acima). `export-apuracoes.mjs`
   foi criado mas NÃO ligado no `run-pipeline.mjs`. Decisão (validada pelo
   Fable): não vale recriar o relatório rico no Modelador — o Minerador já
   cobre Previstas/Originais/Apuradas por ocorrência e o Espelho cobre o
   dia-a-dia; o que só existia no relatório rico (Tipo Situação/Motivo/
   Observação/Turma) ninguém consome hoje. Fica pausado; reabrir só se o RH
   pedir campo que só exista lá.
4. `rh-export-auto.ps1` (automação de UI, nunca esteve no Task Scheduler)
   formalmente aposentado como fallback — só deixou de ser mencionado nos
   comentários, arquivo continua no disco intocado.
5. **Bug reportado pelo RH** (caso Eliziane Waier 979, 03/07/2026, "Saída
   Antecipada"): o card mostrava "21:55" (a ENTRADA) como horário de
   destaque, quando o evento real foi a saída às 04:39 (previsto 05:00).
   Campos novos adicionados: `originais`, `horarioRelevante`,
   `horarioPrevistoRelevante`, `observacaoHoraNoturna`. 1ª tentativa usou
   "maior desvio |apurada-prevista| genérico" — CONTRA-EXEMPLO no próprio
   caso Eliziane: o intervalo de almoço dela deslocou 1h inteira (mesma
   duração, só mais tarde), gerando desvio maior que os 21min da saída real.
   Corrigido pra usar o PRÓPRIO rótulo de situação: "Atrasos"→sempre entrada
   (posição 0), "Saída Antecipada"→sempre saída final (última posição); o
   desvio genérico (com correção circular mod 1440 pra virada de meia-noite)
   fica só como fallback pra tipos sem mapeamento óbvio (ex. "Saída
   Intermediária"). `observacaoHoraNoturna` é só texto informativo — NUNCA
   calcula duração nova (hora noturna reduzida do WK, ~1,14x, não é
   subtração simples de horário — ver achado do William no mesmo dia).
6. **Achado da revisão do Fable** (conselheiro sob demanda, revisão geral do
   pipeline): os 4 campos do item 5 eram calculados no parser Python mas
   `upload-ocorrencias-auto.mjs` não os gravava no `batch.set` — o fix não
   chegava no Firestore. Corrigido + rodado `backfill-ocorrencias-horario-
   relevante.mjs` (merge aditivo, nunca toca status/histórico, mesmo padrão
   do `backfill-ocorrencias-marcacoes.mjs`) pra alcançar os 14 docs já
   criados antes do fix, incluindo o da própria Eliziane.

**Pendências abertas da revisão do Fable (não resolvidas ainda, ver
próxima entrada quando decididas):**
- Reset de virada de mês (`run-pipeline.mjs`) vai apagar TODO `ocorrencias-
  auto` e recriar julho inteiro como pendente em 01/08 — nunca disparou de
  verdade ainda (junho era pré-go-live). Precisa virar poda seletiva antes
  de agosto.
- Repositório `fiobras-pipeline-rh` não tem remote no GitHub — só existe no
  disco local (mesmo disco com histórico de SSD degradando).
- Timeout do `export-ocorrencias.mjs` mata o processo Node mas deixa o
  `.exe` do WK órfão (aconteceu de verdade numa rodada hoje).
- Falha em `process-empregado.mjs` agora pode causar cascata destrutiva
  (inativação, reset de senha, ou apagar `identificacao` inteira) porque o
  PII-cleanup remove a rede de segurança do JSON antigo a cada rodada.

Commits: `f572929` (migração Minerador), `924aa84` (apurações bloqueada),
`8355b5e` + `77fb505` (horarioRelevante + fix do uploader + backfill).

## 2026-07-06 (fim de tarde) — Correção: líderes de turno voltam pro BH automático

Reverte a entrada anterior sobre "remover exceção de LIDERES" (mesma tarde). William
confirmou por engano que líder de turno (Adelir Padilha 785, Djoniffer Krieck 866)
seria categoria Turno normal (RH conferindo em vez de outro líder) — corrigiu na
sequência, ao ver o Atraso do Djoniffer (01/07) aparecendo na fila real do RH: a regra
de fato é **Djoniffer e Adelir vão direto pro banco de horas igual ao Geral, sem
exceção nenhuma — só Falta Injustificada gera conferência**, mesma regra de antes.

Restaurada a constante `LIDERES = {"785", "866"}` em `process-ocorrencias-rh.py`
(commit `826dcd5`, reverte `d9b7711`). Os 3 registros que tinham sido criados
incorretamente enquanto a regra estava trocada (todos ainda em `rh_confere`, nenhum
GP tinha mexido) foram apagados do Firestore com autorização explícita do William:
`785_2026-07-03_saida-antecipada`, `866_2026-07-01_atrasos`, `866_2026-07-02_atrasos`.
A Falta Injustificada do Djoniffer (04/07) permanece — essa sempre gera conferência,
para Geral, Turno e líderes por igual.

**Lição**: mesmo com autorização direta do usuário, uma regra de negócio que muda o
roteamento de conferência do RH merece uma pergunta de confirmação extra antes de
implementar — a resposta inicial ("o RH mesmo faz essa conferência no caso dos dois
líderes") tinha uma leitura ambígua que levou à interpretação errada.

## 2026-07-06 (noite) — Circuit breaker em upload-banco-horas-self.mjs + resgate de commit preso em stash

**Mudança principal**: `upload-banco-horas-self.mjs` ganhou um circuit breaker na
limpeza de docs órfãos (linhas ~84-99 do arquivo): se a limpeza fosse apagar **mais
de 50%** dos docs existentes na coleção `banco-horas-self`, o script agora **aborta**
(só a limpeza — o `set` dos docs elegíveis já rodado antes continua normal) e loga
`console.error`, em vez de proceder cegamente. Mesmo padrão do circuit breaker que já
existia em `upload-ocorrencias-auto.mjs` (bloco "candidatosResolver"/"abortaResolver").

**Por quê**: sem essa guarda, um CSV de Banco de Horas truncado-mas-parseável (export
do WK que quebra no meio, mas ainda gera um arquivo sintaticamente válido) faria o
script interpretar "sumiu do CSV desta rodada" como "não é mais elegível" — e apagaria
o doc de saldo de gente que deveria continuar visível no Portal do Colaborador. É a
mesma classe de risco que já tinha motivado o breaker do `upload-ocorrencias-auto.mjs`.

**Testado**: rodado de verdade (`node upload-banco-horas-self.mjs`) contra o Firestore
de produção — 94 docs, 0 órfãos nesta rodada, breaker não disparou (comportamento
normal preservado).

**Achado no caminho — commit preso em stash**: antes de documentar, chequei o estado
do arquivo no repo e o circuit breaker **não estava no working tree nem commitado** —
estava só dentro de um `git stash` no `master` (`stash@{0}`, "WIP on master"), junto
com **mais 8 arquivos** de correções do mesmo dia (18 renomeações de scripts de
depuração pra `_scratch/` incluídas). Ou seja: o trabalho tinha sido feito e testado,
mas ficou preso sem commit — risco real de se perder (stash não teria sobrevivido a um
`git stash drop`/limpeza acidental). Com autorização do William, restaurei o stash
inteiro e commitei tudo junto (`df2a946`, master), já que as mudanças eram do mesmo dia
e complementares. Conteúdo do commit, além do circuit breaker:

- `process-empregado.mjs`: **não sobrescreve mais** `parsed-empregado.json` com
  `funcionarios:[]` quando o CSV de cadastro sumir — preserva o último cadastro bom
  conhecido. Resolve a pendência "Falha em `process-empregado.mjs` pode causar cascata
  destrutiva" listada na entrada de 2026-07-01 (revisão do Fable) acima.
- `upload-to-firestore.mjs` / `upload-identificacao.mjs`: guardas contra
  `empregadoMap`/`elegiveis` vazio — não inativa em massa nem apaga a coleção
  `identificacao` inteira quando o enriquecimento do cadastro vier vazio (mesma
  motivação do item acima, defesa em profundidade).
- `process-espelho-ponto.mjs`: quando o WK quebra o dia em 2+ linhas no export de
  apuração, usa o array de marcações **estritamente mais longo** já visto pro dia (não
  mais só a 1ª linha encontrada).
- `process-ocorrencias-rh.py`: `LIDERES`/`ESCALA_SABADO`/`ESCALA_DOMINGO` saem de
  hardcoded no `.py` e vão pra `CONFIG` (fonte única, passados via argv por
  `run-pipeline.mjs`); corrige comparação de ausência em turno noturno pra usar desvio
  circular (mod 1440) em vez de diferença crua de minutos (virada de meia-noite
  quebrava a janela de match); extrai `desvios_todas_posicoes()` e expõe campo novo
  `desviosMin[]` (desvio por posição, não só o vencedor).
- `sync-colaborador-users.mjs`: mascara o e-mail sintético (que embute CPF) antes de
  gravar no relatório persistido (relatório fica indefinidamente no disco).
- `write-monitor.mjs`: agenda atualizada pra `09:00 · 11:00 · 14:00` e `passos:10`.

**Lição pro processo**: quando uma mudança "já foi feita e testada" segundo o relato,
vale conferir o estado real do arquivo/commit antes de documentar como fato — nesse
caso a mudança existia de verdade, mas só dentro de um stash, não no histórico do git.
Documentar sem checar teria registrado como "commitado" algo que ainda podia se perder.

## 2026-07-06 (noite, cont.) — desviosMin[] esquecido no uploader (mesmo padrão de antes)

Igual ao `horarioRelevante` mais cedo hoje: o campo `desviosMin` (array de desvio em
minutos por posição, ver commit `df2a946`) foi calculado certinho no parser mas
`upload-ocorrencias-auto.mjs` não gravava no Firestore — achado pela verificação do
próprio Workflow antes de eu confirmar a feature como pronta pro PC. Corrigido
(commit `242f20d`): adicionado ao `batch.set` + ao `resync-ocorrencias-horario-
relevante.mjs` (que passou a comparar por `JSON.stringify` em vez de `!==`, necessário
pra array — `!==` sempre dá "diferente" em array por comparar referência, não
conteúdo). Rodado em produção: 5 docs receberam `desviosMin` novo.

**Lição repetida**: sempre que um campo novo é calculado no parser Python, checar
explicitamente se `upload-ocorrencias-auto.mjs` de fato grava ele no `batch.set` antes
de declarar a feature pronta — já aconteceu 2x no mesmo dia (`horarioRelevante` e
`desviosMin`). Vale considerar um teste automatizado que compare as chaves do dict de
saída do parser contra as chaves do `batch.set`, pra pegar esse esquecimento sem
depender de lembrar manualmente toda vez.

## 2026-07-06 (madrugada) — Sábado Franciele: dado congelado (não bug de extração) + tag direcional

Caso reportado pelo PC/William: doc da Franciele (04/07, sábado, 2º turno) exibia
previsto de DIA ÚTIL. Rastreado ponta a ponta: fonte Minerador CORRETA (09:00-13:00),
parser atual CORRETO — o doc foi criado às 09:02 de segunda (rodada ANTES da migração
Minerador) e o cria-e-nunca-reabre congelou o `marcacoesPrevistas` antigo; os backfills
do dia só cobriam os campos novos → doc internamente inconsistente. **Reparo**: resync
estendido pra `marcacoesPrevistas`/`marcacoesApuradas` (guarda de rh_confere mantida),
11 docs reparados em produção (classe de sábado inteira), 12 já decididos intocados.
A ocorrência da Franciele é GENUÍNA (saiu 60min antes) — só a exibição estava errada.

**Segundo fix no mesmo commit** (`36da871`): tag "gerou a ocorrência" caía na marcação
errada quando o maior desvio absoluto era na direção INOFENSIVA (Franciele 03/07:
chegou 14min adiantada e a tag ficava na entrada, em vez da saída 13min antes; Nagela
04/07: ficou 4h a mais no fim e a tag ficava na saída, em vez do atraso de 3h55 na
entrada). Nova `desvios_problematicos()`: entrada só conta ATRASO, saída final só
SAIR ANTES, pausa só ESTOURO de duração; tudo-zero cai no absoluto. `desviosMin`
(contrato do app v289) inalterado. Validado 1:1 contra a classificação do WK nos 6
casos reais conhecidos. Detalhe de escala: sábado turno 2 = 09:00-13:00 no WK (não
08:00 como a tabela manual dizia — evidência: Josineire 09:06 = "Atraso de 6min").

**Proposta em aberto (decidir com William)**: resync como passo agendado do pipeline,
pra conteúdo de doc rh_confere nunca mais congelar quando parser/WK mudarem.

## 2026-07-07 (madrugada) — Compensação no dia + resync agendado + saldoDiario

1. **Caso Nagela (atraso compensado)**: novos campos `duracaoPrevistaDiaMin`/
   `duracaoTrabalhadaDiaMin`/`compensadoNoDia` (minutos de relógio, diagnóstico —
   oficial continua `duracaoFmt`). O Saldo Diário do Espelho NÃO serve de sinal de
   compensação pra Turno (verificado: 00:00 tanto pra Nagela que compensou quanto pra
   Eliziane devendo 18min — pendência de autorização zera o saldo). Testado com conta
   manual em 5 casos reais; resync em produção. PC avisado (selo "Compensou no dia").
2. **Resync agendado** (GO do William via bridge): passo [OCR-resync] no pipeline,
   toda rodada, guardas: só `rh_confere`, só campos de dado, idempotente, loga
   contagem. Fecha de vez a classe "dado congelado em cria-e-nunca-reabre".
3. **saldoDiario**: parser junta o Saldo Diário oficial do Espelho por (código,data)
   nos dois loops; resync propaga conforme assenta. 14 docs preenchidos em produção.
4. Auditoria total em andamento: órfão Ponto.exe (PID 53700, desde 11:00) morto com
   verificação de pai; pilot A-parsers concluído (achados F1-F8, destaque: CSV
   só-header bypassa a guarda last-known-good do process-empregado; PII-cleanup +
   falha do passo 3 derruba o parser de ocorrências); fan-out B-F disparado.

## 2026-07-07 — Buffer de maturidade do detector 999 volta pra 1 dia (caso Vinicius)

William apontou (caso real: Vinicius 1205, 06/07, "Não Registrou Entrada", visto na
tela de Movimentação do WK com situação 999 já atribuída) que o buffer de 2 dias do
detector de marcação ausente estava inconsistente com o resto do pipeline — o loop
principal (Atrasos/Faltas/Saída) já gera ocorrência de dia fechado com só 1 dia de
folga. O buffer de 2 dias (achado 2026-07-03) fazia sentido na época porque o loop
principal TAMBÉM dependia do Espelho pra Previsto/Apurado — isso mudou 2026-07-06 com
a migração pro Minerador (loop principal não usa mais Espelho). `MADURO_LIMITE` voltou
pra `hoje - 1 dia`. Rede de segurança inalterada: se o Espelho mudar depois, a
reverificação contínua resolve sozinha (`auto_resolvida`).

Testado com dado real e já em produção: Vinicius (1205) e Enildo (1206, mesmo padrão
no mesmo dia — faltou marcar entrada às 13:30, batida real 17:35) geraram corretamente,
batendo com a tela do WK. Commit `4c56589`.

## 2026-07-08 — Task Scheduler do pipeline RH roda Interactive (janela na tela + dias inteiros pulados)

William: "TUDO QUE RODA DO PIPELINE RH TEM QUE RODAR EM SILENT, NAO PODE FICAR
APARECENDO NADA NA TELA". Duas causas investigadas:

1. **`windowsHide` ausente em todo spawn/spawnSync/execSync** (11 arquivos .mjs) —
   corrigido, mas é defensivo/insuficiente sozinho (a maioria usa `stdio:'inherit'`,
   já compartilha o console do pai em vez de abrir janela própria).
2. **Causa real**: a task nativa "Fiobras Pipeline RH" (`Get-ScheduledTask`) está
   configurada `LogonType=Interactive` — roda DENTRO da sessão gráfica do usuário
   `wkradar`, então o console do `node.exe` (e o que ele abre) aparece na tela. As 9
   tasks irmãs do pipeline Comercial (mesma máquina, mesmo usuário, meses rodando o
   mesmo `ExportacaoAutomatica.exe /Silent`) usam `LogonType=Password` (roda em sessão
   não-interativa, sem desktop pra pintar nada). Só a do RH ficou diferente.

Proposta inicial errada: `Settings.Hidden=$true` (controla só a listagem no console
MMC do Task Scheduler, não a janela do processo). Achado do Fable (revisão pedida
antes de aplicar) — fix real é migrar `LogonType` pra `Password`, igual às irmãs.

**Achado bônus (mesma causa, gravidade maior)**: task `Interactive` só dispara se
tiver sessão logada no horário agendado — RDP desconectado/tela bloqueada ainda
conta como "logado" (dispara normal), mas logoff/reboot de verdade faz a rodada
inteira ser pulada, **silenciosamente, sem erro nenhum**. Confirmado no log:
`pipeline-bh.log` não tem NENHUMA linha em 2026-06-05, com os dias vizinhos (03, 04,
06) todos com 9 linhas normais. `StartWhenAvailable=False`, então a rodada perdida
nunca é recuperada depois. Provavelmente explica rodadas "perdidas" do passado nunca
diagnosticadas.

Correção de fato: os horários reais da task são **09:00/11:00/14:00 BRT** (confirmado
via `Get-ScheduledTask` StartBoundary), não 08:00/10:00/14:00 como CLAUDE.md e o
comentário de run-pipeline.mjs diziam — já corrigidos os dois.

**Migração pra Password NÃO aplicada ainda** — exige a senha do usuário `wkradar`
(GUI do Task Scheduler ou `schtasks /Change /RU wkradar /RP`), e entrar senha em
qualquer campo é ação vetada pra mim (regra de segurança) — só o William pode fazer
esse passo. Risco checado pelo Fable: sem dependência de desktop no pipeline RH
(ocorrências é headless, fotos usam API HTTP não drive montado, o único script que
precisa de tela — `rh-export-auto.ps1` — não é chamado por task nenhuma). Ponto de
atenção pra depois da migração: `git push` do heartbeat (write-heartbeat-report.mjs)
nunca rodou em sessão não-interativa nesta máquina — endurecido com
`GIT_TERMINAL_PROMPT=0` (falha rápido em vez de pendurar esperando prompt), mas
**conferir a 1ª rodada pós-migração** mesmo assim (não usar S4U — quebra DPAPI/GCM
que o git credential manager depende).

**Tentativa do William (mesmo dia) via GUI**: marcar "Executar estando o usuário
conectado ou não" deu erro genérico do Task Scheduler ("Um ou mais dos argumentos
especificados não são válidos") — mesma família do erro que o `schtasks /Change
/RU wkradar /RP *` deu por CLI antes ("ERRO: Parâmetro incorreto. (57,8):UserId").
2 causas prováveis, não confirmadas ainda: (1) conta `wkradar` com senha em branco
(Windows recusa guardar credencial vazia pra rodar sem sessão) — se for isso, mexer
nisso muda o login diário da máquina, decisão do William; (2) o campo "Configurar
para" da task está em "Windows Vista/Server 2008" (bem antigo pra um Server 2025),
possível incompatibilidade de schema ao resalvar o principal — não testado ainda se
subir esse valor resolve. **William decidiu deixar pra depois** (2026-07-08) — não
é bloqueio urgente, só a reclamação original da janela na tela que segue em aberto.
Quando retomar: testar a troca do "Configurar para" primeiro (não-destrutivo), só
investigar a senha em branco se isso não resolver.

**Em aberto**: watchdog horário novo (`pipeline-rh-health-watchdog`, criado hoje via
scheduled task do Claude Code, mecanismo diferente da Task Scheduler nativa) pode
ser uma 2ª fonte de janela — coincide no tempo (William reclamou no mesmo dia em que
o watchdog nasceu, 8x mais disparos/dia que a task nativa). Sem visibilidade de como
esse mecanismo executa por baixo dos panos — Fable recomendou teste empírico
(observar o próximo disparo, ou pausar 2-3 ciclos) em vez de especular.

## 2026-07-08 — Supervisor não lê nada em ocorrencias-auto (rule sem isSupervisor())

Aldo (supervisor, `turnosVisiveis:[1,2,3]` confirmado no doc) reportou zero
ocorrências visíveis. Causa: `docs/firestore.rules` match `/ocorrencias-auto/{id}`
(linhas 614-673) nunca menciona `isSupervisor()` — nem no `allow read` (só
admin/RH/líder-mesmo-turno) nem nos 3 ramos do `allow update`. Supervisor cai em
PERMISSION_DENIED na leitura da coleção inteira; não é filtro de UI errado
(`podeVerOcorrenciaUI`/`podeConferirUI` em app.js já tratam supervisor certinho,
conferido). Comparado com a coleção antiga `ocorrencias`, que já tem o padrão certo
("read amplo pro supervisor, UI filtra por turnosVisiveis/funcionariosVisiveis").

Achado separado (mesma investigação, coleção antiga `ocorrencias`): o ramo de update
do supervisor ali depende de `resource.data.funcionarioTurno`, campo que o pipeline
nunca escreve (só grava `turno`) — se essa coleção ainda recebe writes, supervisor-
por-turno está igualmente quebrado lá (só o `funcionariosVisiveis` explícito
funciona). Não confirmado se `ocorrencias` (legada) ainda está viva.

Diagnóstico 100% read-only (doc do Aldo + amostra `ocorrencias-auto` + cross-check
`funcionarios`), nenhuma escrita feita. `ocorrencias-auto` e `firestore.rules` são
território do PC — reportado urgente via bridge
(`2026-07-08-urgente-supervisor-nao-le-ocorrencias-auto.md`) com o fix proposto
(espelhar o `|| isSupervisor()` da coleção antiga) em vez de eu mexer na rule.

**Ampliação (mesmo dia, William: "não é só o Aldo né, tem que checar tudo")**:
1. **Alcance real**: 4 supervisores ativos no total (Jacques, Aldo, Anderson,
   Joacir) — todos igualmente bloqueados, o bug é da ROLE inteira, não de uma pessoa.
2. **Auditoria completa do `firestore.rules`** (25 `match` blocks, arquivo inteiro
   lido e comparado role a role): achado um **2º caso da mesma classe** —
   `match /disciplinares/{id}` (+ subcoleção `ciencia`) tem `liderDoMesmoTurno(...)`
   no read mas `isSupervisor()` nunca aparece, nem hardcoded nem via `temCap`. Mesmo
   padrão do `ocorrencias-auto`: líder presente, supervisor ausente, quando o resto
   do arquivo trata os dois como papéis paralelos. Não confirmado se é intencional
   (disciplinar pode ser proposital só-líder, mais sensível) ou o mesmo esquecimento.
   Revisadas também `comunicados`/`documentos`/`banco-horas`(kebab)/`pipeline-rh` —
   padrão DIFERENTE ali (líder TAMBÉM ausente, não só supervisor), sugere design
   intencional (conteúdo só RH autoriza), não bug — mencionado por completude, baixa
   prioridade. As outras 18 coleções conferem certinho contra `config/permissoes`
   (onde a exclusão de líder/supervisor é explícita na matriz — PII/dado sensível,
   não lacuna). Reportado em `2026-07-08b-supervisor-alcance-real-e-2o-caso-disciplinares.md`.

## 2026-07-08 — Caso Edmar: WK emite Faltas E Atrasos contraditórias pro mesmo dia

William, olhando o modal de uma ocorrência real (Edmar 753, 07/07, "Atrasos"):
"o que aconteceu com edmar é que ele não bateu nem entrada nem saída e ali mostra
tudo errado". Card mostrava "Entrada 09:02, Atraso de 4h02" com aparência sólida
(sem selo de incerteza).

**Causa raiz, confirmada no CSV cru do Minerador**: a MESMA linha (mesmas
Previstas `05:00-09:00-09:30-13:30` e Apuradas `09:02-09:31`) aparece **DUAS
VEZES** no export, uma com situação "Faltas Injustificadas" (cód. 32) e outra
com "Atrasos" (cód. 36) — o próprio WK gerou 2 classificações contraditórias
pro mesmo dia/pessoa, ambas com só 2 de 4 marcações batidas (ele bateu só no
meio do dia — nem entrada, nem saída final, exatamente o que o William
diagnosticou de olho). Cada linha vira um doc `ocorrencias-auto` separado
(dedupId inclui o rótulo de situação, não colidem).

A ocorrência de Falta JÁ tinha proteção (regra de 07/07, achado Franciele):
`classificacaoIncerta=true` quando apuradas < previstas. A de Atrasos NÃO —
essa checagem só rodava dentro do `if sit == "Faltas Injustificadas"`. Sem o
alerta, e sem `apuradasAlinhadas` (`diagnostica_marcacao_ausente` desiste
quando faltam 2+ marcações — "diff > 1", fora do alcance da lógica de posição
única/ambígua existente), o app caía no pareamento cru por índice — 1ª
apurada vira "Entrada", 2ª vira "Saída Almoço" — inventando um atraso de
4h02 que não existe.

**Fix** (`process-ocorrencias-rh.py`): generalizada a checagem de "dia
parcial" pra qualquer situação (não só Falta) — sempre que apuradas < previstas
e a situação não é Falta (que já tem tratamento próprio, incluindo a supressão
de dia-completo-mas-mal-rotulado), marca `classificacaoIncerta=true` com motivo
explicando quantas bateram. Mudança aditiva/fail-safe: só aumenta cautela,
nunca suprime nem afrouxa nada.

**Testado com dado real**: rodada completa (39 ocorrências), blast radius de
+1 caso (só o Edmar) — não é reclassificação em massa. **Validação
independente notável**: enquanto eu construía o fix, a RH (Suyanne Soares dos
Santos) corrigiu esse EXATO doc na mão (duração 4h02 → 7h31, observação "Não
registrou entrada e saída") — confirma que a incerteza que o código passou a
sinalizar bate 100% com o julgamento humano real, feito de forma
independente.

Não precisou de correção manual/resync emergencial — a RH já resolveu o caso
específico antes do fix chegar a produção; o código garante que o PRÓXIMO
caso do gênero (qualquer situação, não só Atrasos) já nasce sinalizado, sem
precisar de outro humano pescar por acaso. Commit `62c1c82`.

## 2026-07-08 — Duplicata entre loop principal e detector 999 (Luisana/Luis Eduardo)

William, olhando a fila "GP confere": "por algum motivo duplicou as ocorrências
dessas duas pessoas". Confirmado no Firestore: Luisana (1145) e Luis Eduardo
(1154) tinham 2 docs cada pro mesmo dia (07/07) — um do loop principal
(`..._faltas-injustificadas`, já `com_lider`, RH tinha corrigido o tipo pra
"Atrasos"/mantido "Faltas") e um do detector 999
(`esp_..._nao-registrou-entrada`, `rh_confere`, recém-criado).

**Causa**: as 2 fontes (Relação de Ocorrências / loop principal, Espelho de
Ponto / detector 999) atualizam em velocidades diferentes. A ocorrência
principal nasceu na rodada das 09h; só na rodada das 14h o Espelho passou a
marcar "Marcações Não Identificadas" pro mesmo dia, e o detector 999 gerou um
2º card pro MESMO incidente — sem saber que o loop principal já tinha coberto
aquele dia horas antes (o fix de mesma-rodada do caso Edmar, mais cedo hoje,
não alcança esse caso: são rodadas DIFERENTES).

**Fix em 2 camadas**:
1. `process-ocorrencias-rh.py`: `codsDatasPrincipal` rastreia (código,
   dataIso) que o loop principal já gerou NESTA rodada — detector 999 pula se
   já coberto (duplicata dentro da mesma rodada).
2. `upload-ocorrencias-auto.mjs`: `codsDatasComPrincipalVivo` consulta o
   Firestore ATUAL por docs principais (sem prefixo `esp_`) ainda vivos
   (status ≠ `auto_resolvida`) — o uploader não cria o doc `esp_` novo se já
   existe um principal vivo pro mesmo dia (cobre duplicata ENTRE rodadas, o
   caso real de hoje). `auto_resolvida` fica FORA do bloqueio: significa que
   o pipeline já retirou o principal de cena, então um achado novo do 999 é
   sinal fresco, não duplicata.

Loop principal sempre vence (é a fonte oficial do WK); o 999 é rede de
segurança só pros dias que ela não pega (caso original Vinicius/Enildo).

Limpeza manual dos 2 docs já duplicados: marcados `auto_resolvida` com
trilha explicando o motivo (mesmo padrão seguro, nunca hard-delete, usado
hoje pro caso Acira/Katiana). Varredura na coleção inteira (todos os pares
código+data com 2+ docs) confirmou: nenhuma outra duplicata ATIVA — só
sobrou o caso do Edmar (2 docs do loop principal, Faltas E Atrasos, ambos já
`com_lider`/corrigidos pela RH, nenhum na fila — WK emitindo 2 situações
contraditórias pro mesmo dia é um problema diferente, já documentado acima,
sem fix de deduplicação ainda porque nenhum dos dois é "menos oficial" que o
outro). Commit `7e0d089`.
