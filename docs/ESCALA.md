# Guia de escala — FioPulse

**Veredito:** escala bem pro propósito — ferramenta interna de **uma** empresa
(centenas de funcionários, dezenas de usuários simultâneos). O backend é
Firebase (infra do Google) e aguenta muito mais do que a Fiobras vai precisar.
Este doc registra os limites reais e o que fazer ao se aproximar de cada um.

## O que escala sem esforço

- **Frontend** estático no CDN (Firebase Hosting) — escala praticamente sem limite.
- **Firestore + Auth** — infra do Google, escala horizontal automática.
- **Listas capadas no cliente** (isto é o que faz durar anos sem ficar lento):
  - Ocorrências: **500 mais recentes** — `public/firebase.js`, `collection("ocorrencias").orderBy("data","desc").limit(500)`.
  - Auditoria: **300 últimas** — `.limit(300)`.
  - Banco de horas / funcionários já vêm **filtrados por papel** (líder só o turno dele, etc.).
- **Consequência importante:** o banco crescer por anos **não** deixa o app lento.
  O Firestore guarda tudo (armazenamento é barato); o app só puxa o recente.

## Tetos e gatilhos

| Limite | Quando aparece | Sinal | O que fazer |
|---|---|---|---|
| **Cota grátis do plano Spark** (~50k leituras/dia) | Mais gente logada + tempo real relendo | Erros de quota no console; app "para" no fim do dia | **Ligar o Blaze** (paga por uso; o teto some). Não reescreve nada. |
| **Chat sem TTL** | Uso intenso de chat ao longo de meses | Carga de mensagens crescendo (listener de `mensagens` não tem `limit`) | Ligar Blaze → habilitar **TTL de 3 dias** no campo `expiraEm` (já gravado nas mensagens). |
| **`pipeline-rh/cur` é um doc único** | **Milhares** de funcionários ativos (todos num array no doc) | Doc se aproximando de **1MB** (limite do Firestore) | Dividir em sub-docs (por turno/página) no ETL do WKRADAR e montar no app. |
| **Sem paginação nas listas** | Precisar ver histórico além do recente | "só aparece o recente (500)" | Adicionar "carregar mais" (`startAfter`) nas queries. |
| **`get()` nas regras de segurança** | Volume muito alto de operações | leituras extras por operação (`userDoc()`/`permDoc()`) | Aceitável no volume atual; reavaliar cache só se explodir. |

## O que ele NÃO é

Não é um SaaS multi-empresa. Foi feito pra **a** Fiobras (single-tenant). Para
vender pra várias empresas, precisaria de isolamento por empresa (rework do
modelo de dados + regras). Não é o objetivo hoje.

## A "chave" principal: ligar o Blaze

Quando ligar: quota de leitura/escrita estourando, **ou** querer recursos que
dependem dele — **TTL do chat**, **Cloud Functions** (ex.: trocar email pela
própria tela, limpezas automáticas). O Blaze é pay-as-you-go (centavos no
volume da Fiobras) e **mantém a cota grátis embutida**. Não muda código —
destrava recursos.

**Marco de "repensar arquitetura":** só lá pra **milhares** de funcionários
(o doc único do pipeline) ou se o produto virar multi-empresa. Pra crescer
2–5x o tamanho atual, escala sem reescrever.
