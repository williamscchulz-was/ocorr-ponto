# Schemas das collections do `ocorr-ponto` Firestore

Referência rápida pra dashboards/scripts.

## `pipeline-rh/cur` (mês corrente)

```typescript
{
  schema: "rh-v1",
  meta: {
    generatedAt: Timestamp,
    pipelineVersion: "v1",
    sourceCSV: string,             // path do CSV fonte
    periodStart: "YYYY-MM-DD",     // primeira data de lançamento no CSV
    periodEnd: "YYYY-MM-DD",       // última data
    totalFuncionariosAtivos: number,
    totalFuncionariosInativos: number,
    totalLancamentos: number,
    warnings: number,
  },
  month: "YYYY-MM",                // ex: "2026-05"
  funcionarios: Array<{
    funcId: string,                // ex: "1115"
    nome: string,                  // Title Case
    cargo: string,                 // CAPS (do ERP)
    departamento: string,          // CAPS (do ERP)
    turno: 1 | 2 | 3 | "geral" | null,
    admissaoIso: "YYYY-MM-DD" | null,
    demissaoIso: "YYYY-MM-DD" | null,
    ativo: boolean,
    saldoAtualMin: number,         // signed (negativo = devendo)
    saldoAtualFmt: string,         // ex: "-04:00"
    ultimaDataIso: "YYYY-MM-DD",
    lancamentos: Array<{
      dataIso: "YYYY-MM-DD",
      saldoMin: number,
      saldoFmt: string,
    }>
  }>
}
```

## `pipeline-rh/hist` (meses fechados)

```typescript
{
  schema: "rh-v1",
  generatedAt: Timestamp,
  months: {
    "YYYY-MM": {
      funcionarios: Array<{ /* mesmo schema do funcionário em cur */ }>
    }
    // ex: months["2026-04"] = { funcionarios: [...] }
  }
}
```

## `bancoHoras/{f-codigo}` (app deployado lê daqui)

```typescript
{
  funcionarioCodigo: string,       // ex: "1115"
  funcionarioNome: string,
  funcionarioTurno: 1 | 2 | 3 | "geral" | null,
  minutos: number,                 // signed
  saldoFormatado: string,          // ex: "-04:00"
  atualizadoEm: Timestamp,
  atualizadoPor: string,           // "pipeline-rh" se veio do pipeline; uid Auth se veio do botão "Importar"
}
```

## `funcionarios/{f-codigo}` (master list)

```typescript
{
  codigo: string,                  // ex: "1115"
  nome: string,                    // Title Case
  setor: string,                   // = departamento do CSV
  cargo: string,
  admissao: Timestamp | null,
  demissao: Timestamp | null,
  ficha: string,
  ativo: boolean,
  turno: 1 | 2 | 3 | "geral" | null,
  bhExempt?: boolean,              // true → pipeline NÃO toca neste funcionário
  criadoEm: Timestamp,
  atualizadoEm: Timestamp,
}
```

## `banco-horas-saldos/{codigo}` (rico, com PII)

Schema completo:

```typescript
{
  funcId: string,
  nome: string,
  cargo: string,
  departamento: string,
  admissao: Timestamp | null,
  cpf: string,                     // PII — só admin+RH leem
  pis: string,                     // PII
  ficha: string,
  saldoFechadoMin: number,
  saldoFechadoFmt: string,
  saldoAtualMin: number,
  saldoAtualFmt: string,
  ultimaData: Timestamp,
  atualizadoEm: Timestamp,
}
```

## `banco-horas/{codigo}_{YYYY-MM}` (histórico)

```typescript
{
  funcId: string,
  mes: "YYYY-MM",
  funcionarioNome: string,
  departamento: string,
  lancamentos: Array<{
    dataIso: "YYYY-MM-DD",
    saldoMin: number,
    saldoFmt: string,
  }>,
  atualizadoEm: Timestamp,
}
```
