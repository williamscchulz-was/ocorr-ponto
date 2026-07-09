# Modelo de dados · clima

MODELO DE DADOS FIRESTORE (pesquisa de clima, anonimidade configuravel por pesquisa)

COLECOES

1) /pesquisasClima/{pesquisaId}  (documento de config, escrito so por gestor/RH)
   - titulo: string
   - inicio, fim: timestamp
   - anonima: boolean  (CRAVADO na criacao, imutavel apos abrir; e o pino do LGPD)
   - status: 'rascunho' | 'aberta' | 'encerrada'
   - dimensoes: array<string>  (ex.: ['lideranca','ambienteSeguranca','reconhecimento','comunicacao'])
   - incluiEnps: boolean, incluiAberta: boolean
   - publico: { tipo: 'todos'|'turno'|'setor', valores: array<string> }
   - elegiveis: number  (denormalizado p/ taxa de resposta, sem PII)
   - criadoPor, criadoEm

2) /pesquisasClima/{pesquisaId}/respostas/{respostaId}
   O respostaId muda conforme a privacidade da pesquisa, e ai que a anonimidade vive:
   - Se anonima:      respostaId = auto-id aleatorio. NENHUM campo com uid/nome/CPF/setor no doc. Grava so notas.
   - Se identificada: respostaId = uid do colaborador (1 doc por pessoa, evita duplicar) + campo uid explicito.
   Campos comuns:
   - dimensoesNotas: map<string, number 1..5>  (por pergunta; a media vira 0-100 no relatorio)
   - enps: number 0..10
   - comentario: string  (texto livre; guarda de fronteira: escapeHtml + limite de tamanho no cliente e na regra)
   - respondidoEm: timestamp
   Numa anonima, o unico jeito de saber "quem ja respondeu" (pra taxa e pra sumir o convite) e uma
   colecao-irma separada de RECIBOS que NAO liga pessoa a conteudo:

3) /pesquisasClima/{pesquisaId}/recibos/{uid}
   - existe: true, em: timestamp   (SO marca que aquele uid entregou; zero conteudo de resposta)
   - Serve pra: barra de progresso do gestor, esconder o convite de quem ja respondeu, calcular taxa.
   - Numa pesquisa anonima, o recibo (quem) e a resposta (o que) vivem em docs diferentes e a regra
     PROIBE ligar os dois: a resposta anonima nao carrega uid, entao nem o RH nem uma query reconstroi o par.

4) /pesquisasClima/{pesquisaId}/agregado/resumo  (1 doc de leitura do gestor)
   - Mantido por Cloud Function on-write das respostas (o cliente do gestor NUNCA le /respostas cru numa
     pesquisa anonima, so o agregado): enpsScore, promotores/neutros/detratores, mediaPorDimensao,
     totalRespostas, comentarios[] (lista de textos sem autor).

REGRAS (aditivas, testadas no emulador 100% antes do deploy; gate Fable por tocar PII/LGPD)
- /pesquisasClima/{id}: read por qualquer autenticado elegivel; create/update so por role gestor (can('gerenciarClima')).
  update BLOQUEIA mudar 'anonima' e 'dimensoes' depois de status=='aberta' (invariante temporal, estilo temCap ja usado no projeto).
- /respostas/{rid} create: apenas o dono, dentro da janela inicio..fim, status=='aberta'.
    . Se pesquisa.anonima==true: a regra EXIGE que o doc NAO contenha campo 'uid' (hasOnly nas chaves de nota/enps/comentario)
      e que rid != request.auth.uid (impede reancorar no proprio uid). Assim o conteudo fica orfao de identidade por construcao.
    . Se pesquisa.anonima==false: exige rid == request.auth.uid e uid == request.auth.uid.
  respostas READ: numa anonima, NINGUEM le /respostas (nem gestor); o gestor le so /agregado. Numa identificada,
  gestor com role pode ler. Colaborador nunca le resposta de outro. update/delete: negado (append-only, imutavel).
- /recibos/{uid}: create so pelo proprio uid (self-write), read pelo gestor (contagem) e pelo dono (saber se ja respondeu).
  Nunca guarda conteudo, so o par (uid, timestamp).
- /agregado/resumo: read gestor; write so Cloud Function (Admin SDK), nunca cliente.

LGPD / ANONIMATO
- A privacidade e uma propriedade ESTRUTURAL, nao um filtro de UI: numa pesquisa anonima a identidade
  simplesmente nao e gravada junto do conteudo, entao nao existe caminho tecnico (query, export, regra afrouxada)
  que reconstrua quem disse o que. Isso e o que a tela de resultados comunica ("resultado por pessoa indisponivel de proposito").
- Comentario aberto: aviso explicito na UI pra nao se identificar no texto; sanitizacao no cliente e limite de chars na regra.
- Pesquisa identificada: consentimento informado, o colaborador ve o selo "Identificada" e o aviso antes de responder.
- Retencao: agregados podem viver indefinidamente (sem PII); respostas identificadas seguem a politica de retencao
  de dados pessoais (expurgo apos N ciclos), configuravel pelo RH. Minimo de respostas por corte (ex.: >=5) antes de
  exibir recorte por setor/turno numa anonima, senao o grupo pequeno vira reidentificavel (k-anonimato leve no agregado).
