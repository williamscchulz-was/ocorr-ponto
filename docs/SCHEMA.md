# Modelo de dados — Firestore

Convenções:
- Coleções no plural, IDs em letra minúscula com hífen.
- Timestamps usam `Timestamp` nativo do Firestore (não strings).
- Documentos de usuário usam o `uid` do Firebase Auth como ID.

## `users/{uid}`

Mapeia o usuário do Firebase Auth para o papel e (se líder) turno.

```ts
{
  email: string;          // mesma do Auth, denormalizada pra busca
  nome: string;
  role: "admin" | "rh" | "lider";
  turno?: 1 | 2 | 3;      // obrigatório quando role === "lider"
  ativo: boolean;         // soft delete
  criadoEm: Timestamp;
}
```

**Quem cria:** admin (manualmente, no painel ou via console Firebase).

## `funcionarios/{id}`

Lista mestra de funcionários monitorados.

```ts
{
  nome: string;
  turno: 1 | 2 | 3;
  setor: string;
  matricula?: string;
  ativo: boolean;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}
```

**Quem cria:** admin e rh.

## `ocorrencias/{id}`

Registros de ocorrências de ponto.

```ts
{
  data: Timestamp;                   // data da ocorrência (00:00 do dia)
  funcionarioId: string;             // FK p/ funcionarios
  funcionarioNome: string;           // denormalizado p/ listagem rápida
  funcionarioTurno: 1 | 2 | 3;       // denormalizado p/ security rules

  tipo: string;                      // ver TIPOS_OCORRENCIA em data.js
  horario: string;                   // "HH:mm"

  acao: string | null;               // null = pendente; "banco-horas" | "descontar" | "atestado"
  dataConferencia: Timestamp | null; // preenchida ao confirmar

  observacao: string;

  criadoPor: string;                 // uid
  criadoEm: Timestamp;
  conferidoPor: string | null;       // uid do líder/admin
  atualizadoEm: Timestamp;

  historico: Array<{
    por: string;                     // uid
    em: Timestamp;
    acao: string;                    // "Criou ocorrência" | "Conferiu (Banco de Horas)" | "Atualizou observação"
  }>;
}
```

### Denormalização proposital

`funcionarioNome` e `funcionarioTurno` são copiados do documento de funcionário no momento da criação. Trade-off:
- **Pró:** listagem não precisa fazer N+1 queries; security rule filtra por `funcionarioTurno`.
- **Contra:** se o nome do funcionário mudar, ocorrências antigas mostram o nome antigo (na prática isso é até desejável — preserva o registro histórico).

Se a empresa renomear/transferir funcionários, criar um job (Cloud Function) que atualiza ocorrências futuras só.

## Índices compostos sugeridos

No console Firebase, criar:

1. `ocorrencias`: `funcionarioTurno ASC` + `data DESC` — listagem do líder.
2. `ocorrencias`: `acao ASC` + `data DESC` — filtro "Pendentes" (acao == null) e "Conferidas".
3. `ocorrencias`: `funcionarioId ASC` + `data DESC` — histórico por funcionário.
