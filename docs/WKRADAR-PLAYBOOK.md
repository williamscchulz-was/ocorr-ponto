# WK Radar — Playbook de Integração (Exportação Automática → Pipeline RH)

> **Propósito:** registro de tudo que aprendemos (às vezes na dor) sobre como o WK Radar exporta dados pro pipeline RH da Fiobras. Consulte ANTES de mexer em qualquer config do WK Radar.
>
> **Última atualização:** 2026-05-29 · mantido por Claude WKRADAR

---

## 1. Visão geral do fluxo

```
ERP WK Radar (banco interno)
   │  ExportacaoAutomatica.exe <config.txt> /Silent
   ▼
D:\WKRadar\BI\Registros\*.txt   (CSV Latin-1, separador ;)
   │  pipeline RH (C:\fiobras-pipeline-rh\)
   ▼
Firestore (projeto ocorr-ponto)  →  app FioPulse
```

- **Executável:** `D:\WKRadar\Pgms\Radar\ExportacaoAutomatica.exe`
- **Sintaxe:** `ExportacaoAutomatica.exe "D:\WKRadar\BI\Config\Config_XXX.txt" /Silent`
- **Configs:** `D:\WKRadar\BI\Config\Config_*.txt`
- **Saídas:** `D:\WKRadar\BI\Registros\ExpAuto_*.txt`

### Relatórios em produção

| Relatório (WK) | Config | Saída | Conteúdo |
|---|---|---|---|
| Banco de Horas | `Config_Banco_de_Horas.txt` | `ExpAuto_Banco_de_Horas.txt` | saldo BH diário por funcionário (formato agrupado) |
| D_Empregado (Informativos) | `Config_Informativos.txt` | `ExpAuto_D_Empregado.txt` | cadastro rico: turno, escala, idade, aniversário, etc. |

### Agendamento (Windows Task Scheduler no servidor WKRADAR)

| Tarefa | Hora | Comando |
|---|---|---|
| WKRadar Export D_Empregado | 07:40 | `ExportacaoAutomatica.exe Config_Informativos.txt /Silent` |
| WKRadar Export BH | 07:45 | `ExportacaoAutomatica.exe Config_Banco_de_Horas.txt /Silent` |
| Fiobras Pipeline RH | 08:00 | `node C:\fiobras-pipeline-rh\run-pipeline.mjs` |

⚠️ Tarefas estão em modo **"Interativo apenas"** — só rodam quando o usuário `wkradar` está logado na máquina.

---

## 2. ⭐ Seleção dinâmica (auto-incremental) — A LIÇÃO MAIS IMPORTANTE

**Problema:** os configs salvavam uma LISTA FIXA de IDs de funcionários (`IdsFuncionarios` no BH, `EmpregadosSelecionados` no D_Empregado). Funcionário novo NÃO entrava até alguém re-salvar a config manualmente.

**Solução (oficial do dev do WK Radar):** deixar o campo de seleção **VAZIO** entre as aspas:

```ini
"IdsFuncionarios"="";              # no Config_Banco_de_Horas.txt
"EmpregadosSelecionados"="";       # no Config_Informativos.txt
```

Vazio = **seleção dinâmica** = inclui TODOS os funcionários ativos automaticamente. Novos contratados entram sozinhos, sem re-salvar nada.

**Prova:** ao esvaziar o D_Empregado, o export saltou de 135 → 136 funcionários (pegou 1 que a lista fixa excluía).

**Status atual:** ✅ os 2 configs já estão com seleção vazia (aplicado 2026-05-28).

⚠️ **NÃO re-salve esses relatórios pela tela de Seleção do WK Radar com funcionários marcados** — isso re-congela a lista. Se precisar mexer pela UI, deixe a seleção vazia lá também.

---

## 3. 🔧 Como editar um config com segurança

**REGRA DE OURO: edite com PowerShell preservando encoding (windows-1252) + CRLF. NUNCA com `sed`.**

O `sed` do Git Bash converte CRLF→LF e o `ExportacaoAutomatica.exe` **rejeita silenciosamente** (exit code 0, mas não gera arquivo). Foi a causa de várias "falhas misteriosas".

### Receita correta (PowerShell):

```powershell
$path = "D:\WKRadar\BI\Config\Config_Banco_de_Horas.txt"
$enc = [System.Text.Encoding]::GetEncoding('windows-1252')
$c = [System.IO.File]::ReadAllText($path, $enc)
$c = $c -replace '"IdsFuncionarios"="[^"]*"', '"IdsFuncionarios"=""'
[System.IO.File]::WriteAllText($path, $c, $enc)
```

### Sempre faça backup antes:
```powershell
Copy-Item $path "$path.bak-$(Get-Date -Format 'yyyyMMdd-HHmm')"
```

### Teste após editar:
```powershell
$before = (Get-Item "D:\...\ExpAuto_Banco_de_Horas.txt").LastWriteTime
& "D:\WKRadar\Pgms\Radar\ExportacaoAutomatica.exe" "D:\...\Config_Banco_de_Horas.txt" /Silent
Start-Sleep -Seconds 8
$after = (Get-Item "D:\...\ExpAuto_Banco_de_Horas.txt").LastWriteTime
# Se $after > $before → funcionou. Se igual → config rejeitado, restaure o backup.
```

---

## 4. Fatos importantes sobre os configs

| Fato | Detalhe |
|---|---|
| **Hash NÃO valida conteúdo** | O campo `"Hash"="..."` é só identificador do modelo/relatório. Dá pra editar outros campos sem invalidar (testado). |
| **Datas hardcoded NÃO limitam** | `DataInicial`/`DataFinal` têm datas fixas, mas o ERP **estende dinamicamente** até ~D-2 do dia atual. Em 27/05 o config dizia 21/05 mas trouxe dados até 25/05. |
| **Datas vazias — incerto** | Suspeitamos que `DataInicial=""` quebrava o /Silent, mas a causa real das falhas foi o sed (CRLF). Não re-testado. Por segurança, deixar datas hardcoded (ERP estende). |
| **Auto-incremento de nome de arquivo** | Ao salvar config pela UI, se `Config_X.txt` já existe, o WK salva como `Config_X2.txt` (e o `ArquivoExportacao` também ganha "2"). Sempre conferir o nome final. |
| **Encoding** | Latin-1 / windows-1252. Acentos quebram se ler como UTF-8. |
| **Formato do CSV BH** | "Agrupado": linha header do funcionário (Cód. preenchido, Data Saldo vazia) + N linhas de detalhe diárias (Cód. vazio, Data Saldo preenchida). Forward-fill no parser. |

---

## 5. Radar Executivo — Integração (as "receitas")

Tela: **Radar Executivo → Integração**. Agrupa configs em "receitas" (ex: receita 13 "Fiobras - GH").

- **Aba Tabelas:** lista os configs da receita. Hoje a receita 13 tem `Config_Banco_de_Horas` + `Config_Informativos`.
- **Botão "Executar Processo":** roda a receita manualmente (todos os configs de uma vez).
- **Aba Periodicidade:** agendador NATIVO do WK Radar — **NÃO FUNCIONA** (confirmado pelo William). Por isso usamos Windows Task Scheduler.

⚠️ **A receita é IRRELEVANTE pra automação diária.** O Windows Task Scheduler chama o `ExportacaoAutomatica.exe` direto com cada config, sem passar pela receita. A receita só serve pra "Executar Processo" manual.

---

## 6. Como fazer operações comuns

### Adicionar um novo relatório pra exportar
1. WK Radar → Modelador de Relatórios → cria/edita o relatório, marca os campos
2. Aba Exportação: define path de saída (`D:\WKRadar\BI\Registros\ExpAuto_XXX.txt`), separador `;`, com cabeçalho, sem aspas, Latin-1
3. Menu Abrir Relatório → seleciona → "Configurar" → gera `Config_XXX.txt`
4. **IMPORTANTE:** depois de gerado, editar o config (PowerShell) pra deixar `EmpregadosSelecionados=""` (dinâmico)
5. Criar tarefa no Windows Task Scheduler: `ExportacaoAutomatica.exe Config_XXX.txt /Silent`
6. Atualizar o pipeline (`C:\fiobras-pipeline-rh\`) pra ler o novo CSV

### Adicionar/remover campos de um relatório existente
1. Modelador → aba Campos → marca/desmarca
2. Salvar
3. **Não precisa regenerar o config** — os campos vêm da definição do relatório (não do config). Basta rodar o export de novo.
4. O parser do pipeline tolera colunas extras (valida as obrigatórias por posição, extras por nome)

### Tornar um relatório dinâmico (auto-incremental)
- Edita o config (PowerShell) → `EmpregadosSelecionados=""` ou `IdsFuncionarios=""`
- Ver seção 2 e 3

---

## 7. Conceito: inscrição no módulo Banco de Horas

Nem todo funcionário cadastrado tem **apuração de banco de horas**. Pra ter saldo de BH, o funcionário precisa estar **inscrito no módulo BH** do WK Radar (ter Tipo Período B.H. / acordo de BH na ficha).

- Funcionário sem inscrição BH → aparece no D_Empregado (cadastro) mas **não gera linha no relatório de BH** → fica "ativo sem saldo"
- **Aprendizes** normalmente não têm BH (regime de aprendizagem) — é esperado
- O checkbox "Desconsiderar empregados que não participam da apuração" **não adiciona** ninguém — só esconde/mostra quem não tem apuração
- **Quando contrata alguém que deve ter BH:** o RH/DP precisa inscrever no módulo BH (passo de onboarding)

O pipeline tem uma **rede de segurança** (no heartbeat `wkradar-reports/`): conta "ativos sem BH" (excluindo aprendizes e demitidos). Se esse número crescer, é sinal de que contrataram alguém e esqueceram de inscrever no BH.

---

## 8. Paths de referência rápida

```
Executável:   D:\WKRadar\Pgms\Radar\ExportacaoAutomatica.exe
Configs:      D:\WKRadar\BI\Config\Config_*.txt
Saídas CSV:   D:\WKRadar\BI\Registros\ExpAuto_*.txt
Pipeline:     C:\fiobras-pipeline-rh\
  ├── process-bh.mjs            (parser BH)
  ├── process-empregado.mjs     (parser D_Empregado)
  ├── upload-to-firestore.mjs   (Firestore: 5 coleções)
  ├── write-heartbeat-report.mjs (report + git push)
  ├── run-pipeline.mjs          (orquestrador)
  └── config.mjs                (paths)
Repo app:     C:\ocorr-ponto-repo\ (github.com/williamscchulz-was/ocorr-ponto)
```

---

*Esse playbook é vivo. Quando aprender algo novo sobre o WK Radar, adicione aqui.*
