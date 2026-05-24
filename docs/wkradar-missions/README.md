# WKRADAR Missions

Protocolo de comunicação assíncrona via Git entre o worktree do William
(Claude local) e a sessão **Claude Code com `/loop 30m`** rodando no
servidor WKRADAR (Windows interno).

## Fluxo

```
William (worktree)                   WKRADAR (/loop 30m)
─────────────────                    ────────────────────
1. cria pending/*.md   ──push──→     2. git pull
                                     3. lê pending/ (mais antigo primeiro)
                                     4. executa PowerShell
                                     5. move pra done/*-DONE.md (sucesso)
                                                   *-FAIL.md (erro)
                                                   *-SKIPPED.md (pulado)
                                     6. escreve docs/wkradar-reports/...
6. git fetch ←──push──               7. push pro main
7. lê DONE
```

## Estrutura de pastas

```
docs/
├── wkradar-missions/
│   ├── README.md              ← este arquivo
│   ├── pending/               ← missões aguardando execução
│   │   └── YYYY-MM-DD-HHMM-<slug>.md
│   └── done/                  ← missões concluídas
│       ├── YYYY-MM-DD-HHMM-<slug>-DONE.md
│       ├── YYYY-MM-DD-HHMM-<slug>-FAIL.md
│       └── YYYY-MM-DD-HHMM-<slug>-SKIPPED.md
└── wkradar-reports/           ← monitor reports do /loop
    └── YYYY-MM-DD-HHMM.md
```

## Convenções de naming

- **Pending**: `YYYY-MM-DD-HHMM-<kebab-slug>.md`
- **Done**: mesmo nome + sufixo `-DONE.md` (ou `-FAIL.md` / `-SKIPPED.md`)
- Ordem de execução: alfabética (= cronológica)

## Formato de uma missão

```markdown
# MISSÃO: <título curto>

**Solicitante:** <nome/contexto>
**Criado em:** YYYY-MM-DD HH:MM
**Prioridade:** baixa | média | alta
**Contexto:** <por que essa missão existe>

## Tarefa

<descrição direta do que fazer>

## Comandos PowerShell

```powershell
# código pronto pra executar
```

## Critério de sucesso

<lista clara do que o DONE deve conter>

## Output esperado

<formato esperado do arquivo DONE>
```

## Formato do DONE

Append no fim do arquivo original:

```markdown
---

## OUTPUT (executado em YYYY-MM-DD HH:MM)

<conteúdo gerado pela execução>
```

## Regras de segurança

- **Nunca** commitar dados pessoais (nomes, CPFs, salários reais) em DONE
- Anonimizar antes: `nome: "<func_001>"`, `cpf: "***.***.***-XX"`
- Se a missão exigir dados reais (debug específico), criar ramo separado e abrir PR — não vai pra main

## Cloud Routine (heartbeat redundante)

Uma rotina cron de 1h no Claude.ai monitora este repo. Se nenhum
`wkradar-reports/*.md` é committed por 2+ horas, ela avisa o William
de que o `/loop` do WKRADAR pode ter caído.
