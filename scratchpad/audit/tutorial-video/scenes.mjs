// ROTEIRO do video tutorial do FioPulse (portal do colaborador) · VERSAO 2 (tour definitivo).
// Ordem = ordem no video. Convencoes do projeto: portugues, SEM emoji, SEM hifen/travessao
// como separador de frase (hifen ortografico de "boas-vindas", "bem-vindo" e permitido).
// Tom sobrio e caloroso, DUETO de vozes (Francisca + Antonio) alternando por capitulo, com
// passagens de bastao sobrias. Narracao BENEFICIO-PRIMEIRO (o que a tela faz por voce antes
// de nomear a funcao). Conquistas = progresso pessoal, NUNCA comparacao com colegas.
//
// Cada cena:
//   id     identificador unico (vira nome de arquivo)
//   kind   "vignette" | "card" | "install" | "app"
//   voz    "f" (Francisca) | "m" (Antonio)     -> escolhe a voz neural
//   cap    legenda curta; UMA palavra-chave em <mark>amarelo</mark>. "" = sem.
//   capPos "bottom" (padrao) | "top"
//   narr   texto da narracao (com acentos, pra a voz pronunciar certo)
//   act    acao/estado (o capture.mjs despacha por aqui)  [kind:"app"]
//   plat   "ios" | "android"  + step 1..4                 [kind:"install"]
//   card   { tipo, kicker, titulo, sub, idx, total }      [kind:"card"]
//   pair   true  -> crossfade entre quadro A e B (interacao)
//   focus  { z, cx, cy } -> Ken Burns aproxima o gesto (close-up), cx/cy em 0..1 do quadro

export const RESPIRO = 0.42;    // silencio padrao apos a fala, em cada cena
export const RESPIRO_CARD = 0.3;
export const LEAD = 0.2;        // silencio antes da fala, em cada cena
export const NCAPS = 13;        // capitulos (pro anel dos cartoes)

export const scenes = [
  // ============ VINHETA DE ABERTURA (pulso da marca + wordmark) ============
  { id: "v00-vinheta", kind: "vignette", voz: "f",
    narr: "Esse é o FioPulse, o aplicativo da Fiobras. Ele reúne, na palma da sua mão, tudo o que é seu no trabalho." },
  { id: "v01-indice", kind: "card", voz: "f", card: { tipo: "indice", kicker: "Guia completo do colaborador", titulo: "O que você vai ver" },
    narr: "Neste guia, a gente passeia por tudo, com calma. Vamos começar." },

  // ================= PARTE 1 · INSTALAR =================
  { id: "c01-card", kind: "card", voz: "f", card: { tipo: "secao", kicker: "Parte 1", titulo: "Deixe o app à mão", sub: "Na tela do seu celular, abre com um toque", idx: 1, total: NCAPS },
    narr: "Quer abrir o app com um toque, sem digitar endereço? Vamos deixar ele na tela do seu celular." },
  { id: "c01-ios1", kind: "install", plat: "ios", step: 1, voz: "f", cap: "No iPhone, abra o <mark>Safari</mark>",
    narr: "No iPhone, abra o Safari e digite gh ponto fiobras ponto com ponto b r." },
  { id: "c01-ios2", kind: "install", plat: "ios", step: 2, voz: "f", cap: "Toque em <mark>Compartilhar</mark>, embaixo",
    narr: "Toque no botão Compartilhar, na barra de baixo. É o quadradinho com a seta pra cima." },
  { id: "c01-ios3", kind: "install", plat: "ios", step: 3, voz: "f", cap: "Escolha <mark>Adicionar</mark> à Tela de Início",
    narr: "Role e toque em Adicionar à Tela de Início. E no Android, Antônio?" },
  { id: "c01-and1", kind: "install", plat: "android", step: 2, voz: "m", cap: "No Android, pelo <mark>Chrome</mark>",
    narr: "No Android, o caminho é pelo Chrome. Com a tela do FioPulse aberta, toque nos três pontinhos, em cima." },
  { id: "c01-and2", kind: "install", plat: "android", step: 3, voz: "m", cap: "Toque em <mark>Instalar</mark> aplicativo",
    narr: "Na lista, toque em Instalar aplicativo. Em alguns aparelhos aparece como Adicionar à tela inicial." },
  { id: "c01-and3", kind: "install", plat: "android", step: 4, voz: "m", cap: "Confirme e <mark>pronto</mark>",
    narr: "Confirme em Instalar, e o ícone do FioPulse fica na sua tela, junto dos outros apps." },
  { id: "c01-nav", kind: "card", voz: "m", card: { tipo: "nota", kicker: "Sem instalar nada", titulo: "Prefere pelo navegador?", sub: "Dá pra usar direto, no celular ou no computador" },
    narr: "E se preferir não instalar, dá pra usar o FioPulse direto pelo navegador, no celular ou no computador." },

  // ================= PARTE 2 · PRIMEIRO ACESSO =================
  { id: "c02-card", kind: "card", voz: "m", card: { tipo: "secao", kicker: "Parte 2", titulo: "Seu primeiro acesso", sub: "Entrar é simples e seguro", idx: 2, total: NCAPS },
    narr: "Com o app na tela, toque no ícone pra abrir. Vou te mostrar o primeiro acesso." },
  { id: "c02-acesso", kind: "app", act: "acesso", voz: "m", cap: "Toque em Portal do <mark>Colaborador</mark>",
    narr: "Na abertura, escolha Portal do Colaborador." },
  { id: "c02-login", kind: "app", act: "login", voz: "m", cap: "Entre com o seu <mark>CPF</mark>",
    narr: "O seu login é o seu CPF. Na primeira vez, a senha é a sua data de nascimento, só os números. Depois, você cria uma senha nova, só sua." },
  { id: "c02-termo", kind: "app", act: "termo", voz: "m", cap: "Aceite o termo, <mark>uma vez</mark> só",
    narr: "No primeiro acesso, você aceita o termo da assinatura eletrônica. É rápido, e acontece uma vez só." },
  { id: "c02-onb1", kind: "app", act: "onb1", voz: "m", cap: "Uma <mark>apresentação</mark> te recebe",
    narr: "Logo na entrada, uma apresentação curta te recebe e mostra o que o portal faz." },
  { id: "c02-onb2", kind: "app", act: "onb2", voz: "m", cap: "Tudo o que importa, <mark>reunido</mark>",
    narr: "Seu ponto, seus recibos, os avisos e os documentos, tudo num só lugar." },

  // ================= PARTE 3 · A TELA INICIAL =================
  { id: "c03-card", kind: "card", voz: "f", card: { tipo: "secao", kicker: "Parte 3", titulo: "Sua tela inicial", sub: "Tudo à mão, já com o seu nome", idx: 3, total: NCAPS },
    narr: "Você entrou. Deixa eu te mostrar a sua tela inicial." },
  { id: "c03-top", kind: "app", act: "homeTop", voz: "f", cap: "Ela abre com o seu <mark>nome</mark>",
    narr: "Quer saber, de cara, quantas horas você tem no banco? A tela te recebe pelo nome e já mostra o seu saldo." },
  { id: "c03-sit", kind: "app", act: "homeSit", voz: "f", cap: "Um aviso quando você está de <mark>férias</mark>",
    narr: "Quando você está de férias ou afastado, um selo discreto avisa, e mostra até quando." },
  { id: "c03-atalhos", kind: "app", act: "atalhos", voz: "f", cap: "Os <mark>atalhos</mark> do dia a dia",
    narr: "Logo abaixo, os atalhos do dia a dia: ponto, pagamento, documentos, férias e vagas. A fileira desliza pro lado." },
  { id: "c03-nav", kind: "app", act: "navbar", voz: "f", cap: "A <mark>barra</mark> de baixo, sempre presente", capPos: "top",
    narr: "E na base fica a barra de navegação, sempre à mão: Início, Avisos, Conquistas e Conta." },

  // ================= PARTE 4 · HOJE NA FIOBRAS =================
  { id: "c04-card", kind: "card", voz: "m", card: { tipo: "secao", kicker: "Parte 4", titulo: "Hoje na Fiobras", sub: "A vida da equipe, com carinho", idx: 4, total: NCAPS },
    narr: "Uma parte que fizemos com muito carinho: a faixa Hoje na Fiobras, pra acompanhar a sua equipe." },
  { id: "c04-faixa", kind: "app", act: "faixaSheet", voz: "m", cap: "Um toque para <mark>parabenizar</mark> um colega", capPos: "top", pair: true,
    narr: "É aniversário de um colega? Tocando no rosto dele, você dá os parabéns com um toque. Um gesto simples, que faz o dia melhor." },
  { id: "c04-close", kind: "app", act: "faixaClose", voz: "m", cap: "Um <mark>coração</mark> que chega quentinho", capPos: "top", focus: { z: 1.7, cx: 0.8, cy: 0.9 },
    narr: "E o coração chega quentinho pra quem recebe." },
  { id: "c04-novato", kind: "app", act: "novato", voz: "m", cap: "Dê as <mark>boas-vindas</mark> a quem chega", pair: true, focus: { z: 1.5, cx: 0.5, cy: 0.62 },
    narr: "E quando alguém novo chega à equipe, um aceno de mão convida você a dar as boas-vindas. Ninguém começa sozinho." },

  // ================= PARTE 5 · NOTIFICACOES =================
  { id: "c05-card", kind: "card", voz: "f", card: { tipo: "secao", kicker: "Parte 5", titulo: "Você não perde nada", sub: "As notificações reunidas num lugar", idx: 5, total: NCAPS },
    narr: "Medo de deixar passar algo importante? O app junta tudo num lugar só." },
  { id: "c05-sino", kind: "app", act: "notifBell", voz: "f", cap: "O <mark>sino</mark>, no alto da tela",
    narr: "No alto da tela, o sino mostra quantas novidades esperam por você." },
  { id: "c05-central", kind: "app", act: "notifCentral", voz: "f", cap: "Tudo <mark>reunido</mark> e por data",
    narr: "Ao tocar, tudo aparece organizado por data: hoje, esta semana e antes. Um toque leva você direto pra tela certa." },
  { id: "c05-lidas", kind: "app", act: "notifLidas", voz: "f", cap: "Marque todas como <mark>lidas</mark>", pair: true,
    narr: "E quando quiser começar do zero, um botão marca todas como lidas." },

  // ================= PARTE 6 · MEU PONTO =================
  { id: "c06-card", kind: "card", voz: "m", card: { tipo: "secao", kicker: "Parte 6", titulo: "Meu ponto", sub: "Suas horas, claras e no bolso", idx: 6, total: NCAPS },
    narr: "Agora o que muita gente mais procura: as suas horas." },
  { id: "c06-bh", kind: "app", act: "pontoBH", voz: "m", cap: "Seu <mark>banco</mark> de horas, dia a dia",
    narr: "Quer conferir se as suas horas batem? Aqui está o saldo do banco de horas e as marcações dos últimos dias." },
  { id: "c06-occ", kind: "app", act: "pontoOcc", voz: "m", cap: "As <mark>ocorrências</mark>, pra acompanhar",
    narr: "Na aba Ocorrências, você acompanha os registros do seu ponto. Dúvida, é só falar com o seu líder." },
  { id: "c06-fer", kind: "app", act: "pontoFerias", voz: "m", cap: "Suas <mark>férias</mark>, sem surpresa",
    narr: "E na aba Férias, você vê os seus períodos, quantos dias tem direito e o que já foi usado." },

  // ================= PARTE 7 · PAGAMENTO =================
  { id: "c07-card", kind: "card", voz: "f", card: { tipo: "secao", kicker: "Parte 7", titulo: "Pagamento", sub: "Seus recibos, só seus", idx: 7, total: NCAPS },
    narr: "E o pagamento? Os seus recibos ficam guardados aqui, só pra você." },
  { id: "c07-folha", kind: "app", act: "folha", voz: "f", cap: "Seus <mark>recibos</mark> guardados",
    narr: "Em Pagamento ficam os seus recibos, um por competência, sempre à mão." },
  { id: "c07-assinar", kind: "app", act: "assinar", voz: "f", cap: "Assine pelo <mark>celular</mark>, com validade", pair: true,
    narr: "E dá pra assinar o recibo pelo celular. O app confirma a sua identidade e o local, e guarda o arquivo assinado, com data e hora." },

  // ================= PARTE 8 · DOCUMENTOS =================
  { id: "c08-card", kind: "card", voz: "m", card: { tipo: "secao", kicker: "Parte 8", titulo: "Documentos", sub: "As regras da casa, sempre à mão", idx: 8, total: NCAPS },
    narr: "Precisa consultar uma regra da empresa? Está tudo em Documentos." },
  { id: "c08-lista", kind: "app", act: "documentos", voz: "m", cap: "Políticas e <mark>comunicados</mark> oficiais",
    narr: "Aqui ficam as regras, as políticas e os comunicados oficiais da Fiobras." },
  { id: "c08-view", kind: "app", act: "docViewer", voz: "m", cap: "Abra e assine <mark>dentro</mark> do app",
    narr: "Você abre o documento dentro do app e, quando ele pede, registra a sua ciência ou a sua assinatura ali mesmo." },

  // ================= PARTE 9 · AVISOS =================
  { id: "c09-card", kind: "card", voz: "f", card: { tipo: "secao", kicker: "Parte 9", titulo: "Avisos", sub: "O mural da empresa, do mais novo ao mais antigo", idx: 9, total: NCAPS },
    narr: "Quer ficar por dentro dos comunicados da empresa? Eles vivem na aba Avisos." },
  { id: "c09-lista", kind: "app", act: "avisos", voz: "f", cap: "Do mais <mark>recente</mark> ao mais antigo",
    narr: "Na aba Avisos, você acompanha os comunicados da empresa, do mais recente ao mais antigo." },

  // ================= PARTE 10 · PESQUISAS =================
  { id: "c10-card", kind: "card", voz: "m", card: { tipo: "secao", kicker: "Parte 10", titulo: "Sua voz conta", sub: "Pesquisas de clima e desempenho", idx: 10, total: NCAPS },
    narr: "De vez em quando, a empresa quer ouvir você. E a sua opinião importa." },
  { id: "c10-convite", kind: "app", act: "pesquisa", voz: "m", cap: "Um convite <mark>discreto</mark> na home",
    narr: "Quando abre uma pesquisa de clima, um convite aparece aqui na home. Algumas são anônimas, e o app deixa isso claro antes de você responder." },

  // ================= PARTE 11 · VAGAS INTERNAS =================
  { id: "c11-card", kind: "card", voz: "f", card: { tipo: "secao", kicker: "Parte 11", titulo: "Vagas internas", sub: "Crescer dentro da Fiobras", idx: 11, total: NCAPS },
    narr: "Quer crescer dentro da Fiobras? As oportunidades internas ficam a um toque." },
  { id: "c11-tela", kind: "app", act: "vagasTela", voz: "f", cap: "Vagas para quem já é da <mark>casa</mark>",
    narr: "Pelo atalho Vagas, você chega às oportunidades abertas pra quem já é da casa." },
  { id: "c11-interesse", kind: "app", act: "vagasInteresse", voz: "f", cap: "Interesse em um <mark>toque</mark>", pair: true,
    narr: "Achou uma vaga com a sua cara? Em um toque você demonstra interesse. Só a Gestão de Pessoas vê, o seu líder não é avisado." },
  { id: "c11-status", kind: "app", act: "vagasStatus", voz: "f", cap: "Acompanhe o <mark>andamento</mark>",
    narr: "E o app acompanha a sua candidatura com você: recebida pela Gestão de Pessoas, em análise, e o desfecho. Você fica sabendo em que pé está, sem precisar perguntar." },

  // ================= PARTE 12 · CONQUISTAS =================
  { id: "c12-card", kind: "card", voz: "m", card: { tipo: "secao", kicker: "Parte 12", titulo: "Suas conquistas", sub: "O seu dia a dia vira progresso", idx: 12, total: NCAPS },
    narr: "Agora a parte que todo mundo gosta: as suas conquistas. O seu dia a dia vira progresso." },
  { id: "c12-barra", kind: "app", act: "gamiHome", voz: "m", cap: "Uma <mark>barra</mark> de pontos na home", focus: { z: 1.7, cx: 0.5, cy: 0.5 },
    narr: "Na tela inicial, uma barra mostra os seus pontos e o quanto falta pro próximo marco." },
  { id: "c12-pts", kind: "app", act: "conquistas", voz: "m", cap: "Seu <mark>total</mark> e os marcos da temporada",
    narr: "Em Conquistas, você vê o seu total, o progresso e os marcos da temporada: os que já alcançou e o próximo." },
  { id: "c12-badges", kind: "app", act: "conquistasBadges", voz: "m", cap: "Suas <mark>medalhas</mark>, conquistadas e a caminho",
    narr: "Aqui ficam as suas medalhas: as que você já conquistou e as que ainda vêm, como o tempo de casa." },
  { id: "c12-como", kind: "app", act: "conquistasComo", voz: "m", cap: "Como você <mark>ganha</mark> pontos",
    narr: "E como se ganha ponto? No dia a dia: assinando um recibo, dando ciência num comunicado, dando as boas-vindas e os parabéns aos colegas, ou mantendo a sua sequência de acessos. É o seu progresso, no seu ritmo." },

  // ================= PARTE 13 · CONTA =================
  { id: "c14-card", kind: "card", voz: "m", card: { tipo: "secao", kicker: "Parte 13", titulo: "Sua conta", sub: "Seus dados e as suas preferências", idx: 13, total: NCAPS },
    narr: "Pra fechar, a sua conta: os seus dados e o app do jeito que é bom pra você." },
  { id: "c14-conta", kind: "app", act: "conta", voz: "m", cap: "Seus <mark>dados</mark> e preferências",
    narr: "Na aba Conta ficam os seus dados, o seu banco de horas e as suas preferências." },
  { id: "c14-tema", kind: "app", act: "contaTema", voz: "m", cap: "Tema <mark>claro</mark> ou escuro", pair: true, focus: { z: 1.4, cx: 0.5, cy: 0.5 },
    narr: "Deixe o app no tema claro ou escuro, do jeito melhor pros seus olhos. E, quando terminar, é só tocar em Sair." },

  // ============ FECHAMENTO (dueto) ============
  { id: "z00-fecha1", kind: "card", voz: "f", card: { tipo: "fechamento", kicker: "FioPulse · Fiobras", titulo: "É todo seu", sub: "Ficou com dúvida? Fale com a Gestão de Pessoas" },
    narr: "É isso. Ficou com alguma dúvida, fale com a Gestão de Pessoas." },
  { id: "z01-fecha2", kind: "card", voz: "m", card: { tipo: "fechamento", kicker: "FioPulse · Fiobras", titulo: "Feito com carinho", sub: "Pra quem faz a Fiobras" },
    narr: "Seu ponto, seu pagamento, suas conquistas, tudo na palma da mão. Feito com carinho, pra quem faz a Fiobras." },
];
