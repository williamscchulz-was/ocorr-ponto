# Modelo de dados · desempenho

COLECOES FIRESTORE

1) avaliacaoCiclos/{cicloId}
   Campos: nome, periodoInicio (Timestamp), periodoFim (Timestamp), modalidade ('gestor' | 'auto' | '360'), escalaMax (5), competencias [{id, nome, descricao, peso}], participantesFiltro {tipo:'turno'|'setor'|'lista', valores:[]}, status ('rascunho'|'ativo'|'encerrado'), criadoPor (uid gestor), criadoEm, encerradoEm.
   A modalidade e a alma do ciclo: define quais papeis de avaliacao existem. Nada de PII forte aqui (segue a regra do projeto: nome/foto vem de funcionarios via avatarFuncHtml, nao denormalizar).
   Regras: create/update/delete so gestor (can('gestor')). Read: gestor total; colaborador le so o(s) ciclo(s) em que participa (query where participa, ou campo espelhado). Escrita valida modalidade in ['gestor','auto','360'] e competencias is list (hasOnly nos campos).

2) avaliacaoCiclos/{cicloId}/avaliacoes/{avaliacaoId}
   ID deterministico p/ idempotencia: `${papel}_${avaliadorUid}_${alvoUid}` (evita duplicar avaliacao e o doc-fantasma do cache otimista).
   Campos: alvoUid, avaliadorUid, papel ('gestor'|'auto'|'par'), notas {compId:1..5}, comentarios {compId:string}, feedbackGeral, notaCalculada (media ponderada por peso), status ('rascunho'|'concluida'), atualizadoEm.
   Auto = alvoUid==avaliadorUid, papel 'auto'.
   Regras (aditivas, testadas no emulador 100% antes do deploy):
   - papel 'auto': so o dono escreve (request.auth.uid == alvoUid == avaliadorUid) e SO enquanto o ciclo esta 'ativo'; imutavel apos status 'concluida' (write-once no fechamento) ou apos periodoFim.
   - papel 'gestor': so can('gestor') do turno/escopo do alvo; le total.
   - papel 'par': so o par DESIGNADO escreve (checar doc de designacao abaixo); nao pode auto-designar-se.
   - notas: cada valor int, >=1, <=escalaMax; papel in enum; hasOnly nos campos.

3) avaliacaoCiclos/{cicloId}/paresDesignados/{alvoUid}
   Campos: pares [uid,uid] (sorteados server-side no mesmo setor, minimo 2-3 p/ nao desanonimizar). Cria a Cloud Function ao abrir o ciclo 360. Regra: read so gestor + o proprio par (p/ saber que precisa avaliar); nunca legivel pelo alvo (senao quebra anonimato).

4) avaliacaoCiclos/{cicloId}/resultados/{alvoUid}  (agregado, escrito SO server-side)
   Campos: notaGeral, porPapel {gestor:{media, porComp{}}, auto:{...}, pares:{media, porComp{}, n}}, gaps [{compId, gestor, auto, diff}], feedbackGeral (do gestor), evolucaoVsCicloAnterior, planoDesenvolvimento [{titulo, descricao, prazo}].
   Consolidacao numa Cloud Function (nunca no cliente): agrega medias por competencia por papel. Os pares entram SO como media anonima (media dos 2-3), o avaliadorUid do par NUNCA e exposto ao alvo.
   Regras: write so via Admin SDK (allow write:if false p/ cliente). Read: o proprio (alvoUid==uid) e o gestor. As avaliacoes individuais de par nunca sao legiveis pelo alvo.

ANONIMATO / LGPD
- Dado de avaliacao e juizo sobre pessoa (sensivel). Gate Fable obrigatorio nas rules antes do deploy (mudanca que toca PII).
- Pares anonimos: agregacao server-side + minimo de pares + o alvo so ve a MEDIA dos pares, nunca notas/identidade individuais.
- Direito de acesso: o colaborador ve o proprio resultado (tela C2) e a propria autoavaliacao. Nao ve a de colegas nem quem foram os pares.
- Comentarios sao texto livre (fronteira de confianca): escapeHtml na renderizacao, sempre.
- Retencao definida por ciclo; abrir o resultado registra evento append-only em /eventos (trilha de ciencia, reusa a colecao ja existente).
- Sem denormalizar nome/CPF/foto nas avaliacoes (regra dura do projeto): identidade sempre via funcionarios/avatarFuncHtml no runtime.

CALCULO DA NOTA
- notaCalculada por avaliacao = media ponderada pelas competencias (peso do ciclo).
- notaGeral do alvo depende da modalidade: 'gestor' = nota do gestor; 'auto' = oficial e a do gestor, a auto aparece lado a lado; '360' = pondera gestor/auto/pares conforme config do ciclo. Gaps = |gestor - auto| por competencia, destacados quando >= 1.
