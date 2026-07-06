# Relatório Técnico de Desenvolvimento · FioPulse

**Base para descritivo de projeto de PD&I na Lei do Bem (Lei nº 11.196/2005), categoria Desenvolvimento Experimental (Manual de Frascati).**

Empresa: FIOBRAS LTDA (CNPJ 01.475.188/0001-97). Repositório analisado: `C:\projetos\ocorr-ponto`. Data da apuração: 06/07/2026.

## Nota metodológica e de escopo

Todos os números deste relatório foram extraídos diretamente do repositório, por comandos de levantamento (`git log`, `git ls-files`, `wc -l`, `grep`, leitura de `package.json`, `changelog.js`, `sw.js` e das regras de segurança). Não há valores estimados de memória nem arredondados por efeito. Onde o dado não estava disponível no repositório analisado, isso é declarado explicitamente.

Limitações da apuração, declaradas de saída:

1. **`cloc` não está instalado** na máquina de apuração. As linhas de código foram medidas por `wc -l` (linhas físicas) e por contagem de linhas não em branco (`grep -c '[^[:space:]]'`, proxy mais conservador de linhas efetivas). Ambas incluem comentários. Onde a distinção importa, os dois números são apresentados.
2. **Este repositório contém apenas o módulo FioPulse.** Os demais módulos citados no escopo do HUB (Manutenção, CRM, Formação de Preço de Venda, Demonstrativo Gerencial, Comercial) residem em outros repositórios que não foram disponibilizados para esta análise. O que se afirma sobre eles é descritivo (a partir do escopo informado), não medido, e está marcado como tal.
3. **O pipeline de integração com o ERP** (extração e tratamento dos relatórios) reside em repositório separado, `C:\fiobras-pipeline-rh`, que não é acessível a partir deste repositório. Ele está documentado indiretamente pelo histórico de decisões e pela ponte de coordenação presentes aqui, e essa documentação é citada nominalmente, com a ressalva de que os arquivos-fonte daquele pipeline não foram medidos linha a linha.

---

## 1. Descrição funcional

O sistema é um **HUB digital corporativo** concebido para operar como camada de aplicação sobre o ERP da empresa (WK Radar, da WK Sistemas), consolidando processos que hoje vivem em planilhas, papel e conferência manual. O HUB é organizado em módulos independentes; este relatório cobre integralmente o módulo **FioPulse** (o único presente neste repositório) e registra os demais como componentes externos não analisados.

### 1.1 FioPulse (módulo de Gestão de Pessoas) · analisado neste repositório

Aplicativo de RH em formato PWA, com dois portais: **portal do gestor** e **portal do colaborador**. Funções apuradas no código:

- **Banco de horas e horas trabalhadas.** Importa o saldo de banco de horas a partir do arquivo XLSX exportado pelo sistema de ponto e substitui o saldo dos funcionários encontrados, com casamento por código (`public/app.js`, função de importação em torno da linha 9678 e leitura XLSX em 9727 a 9731). Exibe o saldo por colaborador e o espelho de ponto (jornada prevista contra batidas apuradas).
- **Holerite / recibo de pagamento e cartão de ponto.** Importa o PDF da folha, separa por funcionário e disponibiliza a cada colaborador apenas o seu documento, com assinatura eletrônica. Substitui a entrega física de contracheque e a coleta manual de assinatura.
- **Ocorrências de ponto (RH e líder).** Recebe as ocorrências detectadas na apuração do ponto (atraso, saída antecipada, falta injustificada), roteia para conferência do RH e do líder por turno, e registra a decisão em trilha. Substitui a conferência manual de relatório de ponto.
- **Assinatura eletrônica avançada de documentos.** Recibos, comunicados, advertências e documentos institucionais são assinados no app com reautenticação por senha, carimbo de data e hora do servidor, geolocalização e hash SHA-256 do arquivo original, anexados a uma página de autenticação no próprio PDF. Substitui a assinatura física e o arquivamento em papel.
- **Comunicados, documentos institucionais, disciplinar (advertência e suspensão) e auditoria de eventos.** Digitalizam a comunicação interna, a distribuição de documentos com níveis de confirmação (leitura, aceite, assinatura) e o registro disciplinar com ciência do colaborador.
- **Controle de PJ (prestadores).** Cadastro de contratos, valores, reajuste por IPCA, férias e leitura automática de dados do contrato em PDF (extração de texto e OCR via Google Drive como alternativa).

**Especificidade para o setor têxtil de fios tintos.** O sistema é modelado sobre a realidade operacional da empresa: turnos de produção (1º, 2º e 3º turno) com regras próprias de banco de horas por categoria (pessoal de turno contra pessoal geral), líderes por turno como instância de autorização das ocorrências, e a marca visual do produto (o cone de fio) incorporada à identidade da aplicação. A lógica de negócio (o que vai automático para o banco de horas contra o que exige autorização do líder, por categoria) reproduz a política de RH específica da operação fabril.

### 1.2 Demais módulos do HUB · NÃO presentes neste repositório

Os módulos a seguir foram informados como parte do HUB, porém **não estão neste repositório e não foram analisados**. O texto abaixo é o escopo informado, não uma medição:

| Módulo | Escopo informado | Situação nesta apuração |
|---|---|---|
| Manutenção | Gestão de manutenção industrial | Repositório não disponibilizado |
| CRM | Gestão de relacionamento comercial | Repositório não disponibilizado |
| Formação de Preço de Venda | Cálculo de preço para o setor | Repositório não disponibilizado |
| Demonstrativo Gerencial | Painel gerencial | Repositório não disponibilizado |
| Comercial | Pipeline comercial (projeto `fiobras-hub`, citado no repositório) | Repositório não disponibilizado |

Para um descritivo completo do HUB, é necessário repetir esta apuração sobre cada um desses repositórios.

---

## 2. Stack tecnológica

Extraída dos arquivos reais (`public/index.html`, `public/*.js`, `package.json`, `sw.js`).

### 2.1 Arquitetura

- **PWA (Progressive Web App)** de página única, com Service Worker (`public/sw.js`) para cache e atualização, e `manifest`/`webmanifest`.
- **Front-end em HTML, CSS e JavaScript puros (vanilla), sem framework de UI.** Não há React, Vue, Angular nem bundler de aplicação: o código roda direto no navegador; o único passo de build é a minificação para `dist/`.
- **Back-end serverless Firebase:** Firestore (banco em tempo real, 64 referências no código do app), Authentication, Storage e Hosting. A sincronização em tempo real usa `onSnapshot` (ocorrências, presença, mensagens).
- **Segurança como código:** regras declarativas de Firestore e Storage (`docs/firestore.rules`, `docs/storage.rules`) versionadas e testadas em emulador.

### 2.2 Bibliotecas e serviços (contagem de referências no código)

| Recurso | Uso | Evidência |
|---|---|---|
| Firebase (Firestore/Auth/Storage/Hosting) | Back-end, tempo real, autenticação | 64 referências a `firestore`; carga do SDK via CDN |
| pdf.js | Renderização de PDF em canvas (visualizador próprio, sem chrome do navegador) | 26 referências; carga via `cdnjs.cloudflare.com` (`public/app.js:10903`) |
| pdf-lib + fontkit | Geração e carimbo de PDF (comprovante de assinatura, página de autenticação, fonte cursiva) | 34 + 20 referências |
| SheetJS (XLSX) | Leitura do XLSX de banco de horas exportado pelo ponto | 7 referências; carga sob demanda (`loadXLSX`, `public/app.js:9861`) |
| Service Worker / Geolocation | PWA e carimbo de geolocalização na assinatura | 4 e 2 referências |
| Google Drive API | Upload de contratos PJ e OCR como alternativa | `public/google-drive.js` |

**Ausências apuradas (reportadas por transparência):**

- **Chart.js: não utilizado.** Nenhuma referência encontrada; os gráficos do painel são SVG próprios.
- **FCM (Firebase Cloud Messaging) / push: não implementado.** Nenhuma referência a `getMessaging`/`onMessage`/`firebase-messaging`.
- **Cloudflare Workers: não utilizado.** As duas ocorrências de "cloudflare" no código são apenas o host de CDN (`cdnjs.cloudflare.com`) de onde se carrega o pdf.js, não um Worker.

### 2.3 Dependências de build (`package.json`)

O `package.json` do repositório declara: dependência `firebase-admin` (^13.10.0, usada por um script administrativo de senhas) e devDependency `esbuild` (^0.28.1, o minificador do build). **A aplicação em si (pasta `public/`) não tem dependências npm em runtime:** as bibliotecas são carregadas por CDN sob demanda. Não há `node_modules` nem `dist/` versionados (0 arquivos rastreados em ambos), o que mantém o tamanho apurado restrito ao código-fonte real.

---

## 3. Métricas de desenvolvimento (a partir do git)

### 3.1 Período e atividade

| Métrica | Valor apurado |
|---|---|
| Primeiro commit | 14/05/2026 08:53 (-03:00) |
| Último commit | 06/07/2026 13:34 (-03:00) |
| Duração | 54 dias corridos (aprox. 7,7 semanas, aprox. 1,77 mês) |
| Total de commits | 643 |
| Autores (git) | William Schulz: 420 commits · Claude WKRADAR: 223 commits |
| Commits que tocaram `public/app.js` | 187 |
| Versões documentadas no changelog (`public/changelog.js`) | 65 |
| Iterações de build/deploy (cache do Service Worker, `sw.js`) | 285 (`fiopulse-v285`) |

O autor "Claude WKRADAR" corresponde ao agente de IA que mantém o pipeline de RH e a ponte de coordenação; "William Schulz" é o desenvolvedor humano (cujos commits são coautorados pela IA de desenvolvimento, conforme registrado nas mensagens de commit). Ver seção 5.

### 3.2 Tamanho do código (linhas), separando produto de material arquivado

Medição por `wc -l` (linhas físicas) e por linhas não em branco (proxy de linhas efetivas). Apenas arquivos rastreados pelo git; `node_modules` e `dist/` não estão versionados.

| Bucket (código de produto) | Físico (`wc -l`) | Não em branco |
|---|---:|---:|
| Aplicação, JavaScript (`public/*.js`) | 20.659 | 19.357 |
| Estilos (`public/*.css`) | 5.848 | 5.473 |
| Markup (`public/index.html`) | 632 | 579 |
| Regras de segurança (`docs/*.rules`) | 794 | 726 |
| Testes automatizados (`tests/*.mjs`) | 1.119 | 967 |
| Build (`scripts/*.mjs`) | 1.295 | 1.169 |
| **Total desenvolvido (produto)** | **30.347** | **28.271** |

Detalhe do JavaScript da aplicação, por arquivo (físico): `app.js` 14.230 · `firebase.js` 3.616 · `roadmap.js` 1.368 · `changelog.js` 394 · `utils.js` 343 · `google-drive.js` 323 · `data.js` 282 · `sw.js` 61 · `firebase.config.example.js` 42.

**Material separado do produto (não entra no tamanho apurado):**

- **Mockups arquivados (`docs/mockups/*.html`): 130 arquivos, 43.892 linhas.** São protótipos de tela para aprovação, não o produto em produção; foram deliberadamente excluídos do total de código, para que o tamanho seja realista.
- Documentação e coordenação (`*.md`): 244 arquivos, incluindo histórico de decisões, playbooks e a ponte com o pipeline.
- Fontes e imagens: 10 `woff2`, 1 `ttf`, 9 `png`, 1 `svg`.

### 3.3 Volume de iteração

| Métrica (todo o histórico) | Valor |
|---|---:|
| Inserções de linha | 107.374 |
| Remoções de linha | 12.159 |
| Churn total (inserções + remoções) | 119.533 |

O churn total (119.533 linhas movimentadas) é cerca de **4 vezes o tamanho final do produto** (28.271 linhas não em branco), o que evidencia reescrita e refino sucessivos, não digitação linear (ver seção 6).

---

## 4. Estimativa de esforço equivalente (COCOMO II)

Aplicação do modelo COCOMO II (Post-Architecture, calibração 2000) sobre o **tamanho real apurado**, para estimar o esforço que um desenvolvimento convencional exigiria, e comparação com o esforço real.

### 4.1 Premissas explícitas

- **Tamanho (entrada do modelo):** 28,27 KLOC, o total desenvolvido em linhas não em branco (tabela 3.2). Optou-se pela contagem não em branco (mais conservadora) em vez da física (30,35 KLOC). Não há `cloc`, portanto o número inclui comentários; é uma medida de tamanho de fonte, não de pontos de função.
- **Fórmula de esforço:** PM = A × (KLOC)^E × ∏EM, com A = 2,94.
- **Expoente de escala:** E = B + 0,01 × ∑SF, com B = 0,91. Adotados os cinco fatores de escala (PREC, FLEX, RESL, TEAM, PMAT) no nível **Nominal**, resultando E = 1,0997.
- **Multiplicadores de esforço (∏EM):** adotados todos **Nominais** (∏EM = 1,0). É uma premissa conservadora e neutra: não se aplicou bônus nem penalidade de produtividade.
- **Prazo:** TDEV = 3,67 × (PM)^F, com F = 0,28 + 0,2 × (E − 0,91) = 0,3179.
- **Equipe média:** PM / TDEV.
- **Esforço real:** 1 desenvolvedor ao longo do período apurado (54 dias, 1,77 mês), apoiado por IA. Esforço real ≈ 1 × 1,77 = **1,77 pessoa-mês**. A IA é tratada como acelerador, não como pessoa adicional.

### 4.2 Cálculo

- (KLOC)^E = 28,27^1,0997 = 39,46
- **Esforço estimado (convencional): PM = 2,94 × 39,46 = 116,0 pessoa-mês**
- **Prazo estimado: TDEV = 3,67 × 116,0^0,3179 = 16,6 meses**
- **Equipe média estimada: 116,0 / 16,6 = 7,0 pessoas**

Sensibilidade: usando o tamanho físico (30,35 KLOC) em vez do não em branco, o modelo dá aproximadamente 125 pessoa-mês, 17,1 meses e 7,3 pessoas. A ordem de grandeza não muda.

### 4.3 Comparação com o esforço real e fator de aceleração

| Dimensão | Estimativa COCOMO II (convencional) | Real apurado (1 dev + IA) | Fator |
|---|---:|---:|---:|
| Esforço | 116,0 pessoa-mês | 1,77 pessoa-mês | **aprox. 65,5×** |
| Prazo | 16,6 meses | 1,77 mês | **aprox. 9,4×** |
| Equipe | 7,0 pessoas | 1 pessoa | 7× |

**Leitura.** O modelo indica que um desenvolvimento convencional deste escopo demandaria da ordem de **116 pessoa-mês** e uma equipe de **7 pessoas** ao longo de **cerca de 16 meses**. O trabalho real foi executado por **um único desenvolvedor apoiado por IA generativa em cerca de 1,8 mês**. O fator de aceleração de esforço resultante é da ordem de **65 vezes**, e o de compressão de prazo, da ordem de **9 vezes**. Trata-se de uma comparação modelo contra realidade, com as premissas acima; não é um experimento controlado, e o COCOMO é, por natureza, um estimador. Os valores devem ser lidos como ordem de grandeza da produtividade obtida, sustentada pelo tamanho e pelo período reais medidos no repositório.

---

## 5. Papel da IA generativa (Claude) no desenvolvimento

O desenvolvimento adotou, de forma central e sistemática, IA generativa (modelos Claude, da Anthropic) como acelerador do ciclo de engenharia. As evidências estão no próprio repositório:

- **Coautoria registrada nos commits.** As mensagens de commit trazem, por convenção do projeto, a assinatura de coautoria da IA de desenvolvimento; e um dos dois autores git (`Claude WKRADAR`, 223 commits) é o próprio agente de IA que mantém o pipeline de integração e a ponte de coordenação (`claude-bridge/`).
- **Uso multifuncional da IA.** Ao longo do histórico, a IA foi empregada para: geração de código de aplicação e de regras de segurança; depuração de defeitos (inclusive defeitos de integridade de dados, como duplicação por clique repetido e horário incorreto em destaque); refatoração (extração de funções, remoção de código morto); e apoio ao design de interface, com um fluxo em que cada mudança visual passa por um protótipo HTML aprovado antes de tocar o app (daí os 130 mockups arquivados).
- **Metodologia de revisão adversarial.** O projeto institucionalizou revisões por IA em múltiplas perspectivas (uma IA "conselheira" para arquitetura e para o portão de segurança de mudanças de regra e de dados sensíveis; revisões adversariais que tentam refutar cada achado antes de aceitá-lo). Essa orquestração de múltiplos agentes é parte do método, não acessório.

**Por que isso configura abordagem experimental e metodologicamente nova.** O desenvolvimento não seguiu o modelo convencional (equipe humana, ferramentas determinísticas). Ele testou e calibrou, na prática, um método de engenharia assistida por IA: como decompor o trabalho entre agentes, como usar revisão adversarial para conter alucinação, como manter a barra de segurança (regras testadas em emulador, gate de PII e LGPD) num ritmo de entrega muito acelerado. O objeto do experimento não é apenas o produto, é também o **processo** de produzir software correto e seguro com IA generativa, cujo desempenho (seção 4) não era conhecido a priori.

---

## 6. Evidências de incerteza técnica e caráter experimental

O caráter de Desenvolvimento Experimental (Frascati) se sustenta em incerteza técnica genuína e em ciclos de tentativa e erro documentados, distintos de desenvolvimento rotineiro.

### 6.1 Evidências quantitativas de tentativa e erro

- **Churn de 119.533 linhas para um produto de 28.271 linhas** (fator de aproximadamente 4×): o produto final é uma fração do que foi escrito e reescrito. Desenvolvimento rotineiro tende a churn próximo do tamanho final; aqui, a diferença mede a busca por solução.
- **187 commits sobre um único arquivo (`public/app.js`)** e **643 commits em 54 dias** (média de aproximadamente 12 commits por dia): cadência de iteração incompatível com especificação estável executada linearmente.
- **65 versões documentadas** e **285 iterações de build**: o produto foi reentregue continuamente, sinal de refino incremental sob incerteza, não de um projeto fechado de antemão.

### 6.2 Incerteza documentada no histórico de decisões

O arquivo `docs/HISTORICO-DECISOES.md` registra episódios concretos de incerteza resolvida por investigação, entre eles:

- **Diagnóstico quantificado de divergência de dados:** comparação entre o Excel oficial da RH e a saída do pipeline mostrou que **43 de 88 funcionários divergiam**, com o saldo travado 8 dias atrás; a causa raiz (data final fixa na configuração do ERP, que o ERP não estende sozinho) só foi encontrada por investigação, e uma crença anterior documentada teve de ser corrigida ("o ERP estende as datas hardcoded", constatada ERRADA).
- **Correção de premissa sobre o comportamento do ERP** e reescrita do parser para mapear colunas por nome em vez de posição fixa, após o relatório passar de 24 para 25 colunas.

### 6.3 Barreira técnica central: integração com o ERP sem API

O ERP **WK Radar (WK Sistemas) não disponibiliza API para integração externa.** Essa é a barreira técnica material do projeto. A solução exigida foi o desenvolvimento de **rotinas próprias de extração baseadas na geração e no tratamento (parsing) de relatórios estruturados emitidos pelo próprio ERP**, com todas as fragilidades daí decorrentes (formato, codificação, janela de datas, ausência de campos).

**Evidência material no repositório analisado (FioPulse):** a aplicação implementa a ingestão dos relatórios do ERP no lado do cliente:

| Rotina | Caminho | Lógica |
|---|---|---|
| Importação de banco de horas | `public/app.js` (aprox. linhas 9678 a 9731; carregador `loadXLSX` em 9859 a 9864) | Carrega o SheetJS sob demanda, lê o XLSX exportado pelo sistema de ponto (`XLSX.read` com `type:'array'`, `sheet_to_json` com `header:1`) e substitui o saldo dos funcionários por casamento de código. É o tratamento do relatório de saldo do ERP. |
| Extração de contrato PJ (texto e OCR) | `public/app.js` (aprox. 10542 `extrairTextoDoPDF`, 10587 a 10589 fallback de OCR via Drive) e `public/google-drive.js` | Extrai texto do PDF do contrato; quando o PDF é imagem, aciona OCR via Google Drive como alternativa. Trata a ausência de dado estruturado no ERP para PJ. |
| Importação de recibo / cartão de ponto | `public/app.js` (manipulação de arquivo em 10552 e 11472; base64 em 7535) | Lê o PDF da folha, separa por funcionário e distribui individualmente. |

**Evidência documental do pipeline server-side (repositório separado, não medido aqui):** o histórico e a ponte de coordenação documentam nominalmente os scripts que fazem a extração e o tratamento dos relatórios do ERP, mantidos em `C:\fiobras-pipeline-rh` (repositório à parte, não acessível nesta apuração):

- `process-bh.mjs` — parser do CSV de banco de horas (codificação Latin-1, agrupamento por funcionário).
- `process-empregado.mjs` — parser do relatório de cadastro D_Empregado (CSV de 24, depois 25 colunas), refatorado para mapear colunas por nome, tornando o parser robusto a reordenação e inclusão de campos no ERP.
- `process-espelho-ponto.mjs` — parser do espelho de ponto (jornada prevista contra batidas), fonte do banco de horas por dia.
- `update-config-dates.mjs` — reescreve, de forma byte-safe em Latin-1 preservando codificação e quebra de linha do ERP, a janela de datas da configuração de exportação, para que o relatório não congele numa data fixa.
- `run-pipeline.mjs`, `upload-to-firestore.mjs`, `config.mjs` — orquestração, escrita no Firestore e configuração.

A necessidade de reescrever configuração do ERP byte a byte (Latin-1, windows-1252, CRLF), de mapear colunas por nome porque o layout do relatório muda, de descobrir empiricamente que a janela de datas não se estende sozinha, e de tratar a ausência de campos que "nunca estiveram no CSV", constitui evidência concreta de incerteza técnica e de sua resolução por tentativa e erro. É precisamente o tipo de esforço que o Manual de Frascati classifica como Desenvolvimento Experimental: não havia caminho conhecido e determinístico para integrar o HUB ao ERP, e a solução teve de ser construída e calibrada contra o comportamento real, e não documentado, do sistema legado.

---

## 7. Ressalvas finais

- Os fatores de aceleração da seção 4 são comparações entre um modelo de estimativa (COCOMO II, com premissas nominais declaradas) e o esforço real medido; são ordem de grandeza, não medição de laboratório.
- O tamanho de código foi medido por `wc -l` e linhas não em branco, na ausência de `cloc`; inclui comentários.
- Este relatório cobre o módulo FioPulse. Os demais módulos do HUB e os arquivos-fonte do pipeline de RH estão em repositórios não disponibilizados para esta apuração e precisam ser medidos separadamente para um descritivo completo do projeto.

*Documento gerado a partir de levantamento direto no repositório em 06/07/2026.*
