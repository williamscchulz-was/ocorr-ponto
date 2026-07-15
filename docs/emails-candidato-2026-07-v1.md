# Emails ao candidato · v1 (aprovados 2026-07-16)

Textos aprovados pelo William no mock funil-email-2026-07 ("curti demais o funil,
bora"). Remetente: `Fiobras · Gestão de Pessoas <vagas@fiobras.com.br>`.
Variáveis: `{{nome}}` (primeiro nome ou nome composto do candidato), `{{vaga}}`
(título da vaga). Estes textos alimentam a fase 1 (mensagem pronta no funil da GP)
e viram os templates da extensão Trigger Email na fase 2 (coleção `emailTemplates`,
ids abaixo).

## candidatura-recebida (automático no envio do site)
Assunto: Recebemos a sua candidatura, {{nome}}

Olá, {{nome}}!

A sua candidatura para a vaga de {{vaga}} chegou direitinho aqui na Fiobras.
Obrigado por querer tingir o seu futuro com a gente.

A nossa equipe de Gestão de Pessoas vai analisar o seu perfil com atenção, gente
de verdade lendo, sem robô decidindo nada. Assim que houver novidade, você recebe
um email nosso.

Um abraço,
Equipe de Gestão de Pessoas · Fiobras

## candidatura-em-analise (status Em análise)
Assunto: Sua candidatura está em análise

Olá, {{nome}}!

Passando pra te contar que a sua candidatura para {{vaga}} está em análise pela
nossa equipe. O seu perfil está sendo avaliado junto com os demais candidatos da
vaga.

Não precisa fazer nada por enquanto. Qualquer novidade, a gente te escreve.

Um abraço,
Equipe de Gestão de Pessoas · Fiobras

## candidatura-aprovada (status Aprovada)
Assunto: Boas notícias sobre a sua candidatura, {{nome}}

Olá, {{nome}}!

Temos boas notícias: o seu perfil chamou a nossa atenção e queremos conversar com
você sobre a vaga de {{vaga}}.

Em breve a nossa equipe entra em contato pelo telefone que você deixou na
candidatura pra combinar os próximos passos. Fica de olho no WhatsApp.

Até já,
Equipe de Gestão de Pessoas · Fiobras

## candidatura-nao-seguiu (status Não seguiu adiante)
Assunto: Sobre a sua candidatura na Fiobras

Olá, {{nome}}.

Queremos te agradecer de verdade pelo interesse na vaga de {{vaga}} e pelo tempo
que você dedicou à candidatura. Desta vez, seguimos com outro perfil pra essa
posição.

Isso não diminui em nada a sua trajetória. O seu cadastro fica conosco por até 6
meses e pode ser considerado em outras oportunidades, e as vagas abertas estão
sempre em vagas.fiobras.com.br.

Desejamos muito sucesso no seu caminho.
Equipe de Gestão de Pessoas · Fiobras
