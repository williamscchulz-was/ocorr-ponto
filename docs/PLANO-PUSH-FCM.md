# Push notifications (FCM) · Plano de arquitetura (2026-07-23)

Dono: William ("interessante", pediu plano quando puxasse o assunto). SEM
implementação nesta missão: é decisão dele antes de qualquer código.

## 1. O que o push adiciona sobre a central atual

A central de notificações v402 (`public/app.js:3984`) já resolve tudo com o
app ABERTO: deriva do state carregado, sino com badge, tela cheia, zero
coleção nova. O que ela não alcança: usuário que não está com o app em foco.
Push resolve exatamente essa lacuna, empurrando um aviso mesmo com o app
fechado ou em background.

Honestidade sobre limite de plataforma:
- **Android/Chrome**: web push funciona plenamente, com app fechado.
- **iOS/Safari (PWA)**: só funciona se o app estiver **instalado na tela de
  início** (modo standalone) E o iOS for **16.4+**. Safari aberto em aba
  normal NUNCA recebe push web, não importa a versão. Isso é a maior parte
  do público do FioPulse (colaboradores de chão de fábrica com iPhone), então
  o ganho real depende de quantos já instalaram o PWA (hoje não medimos
  isso); a fase F1 abaixo passa a medir.
- Não existe fallback silencioso: quem não instalou ou está em iOS antigo
  simplesmente não recebe push. Continua vendo tudo na central in-app quando
  abrir o app, sem perda de informação, só sem o empurrão.

## 2. Arquitetura mínima (Ponytail)

Escada aplicada: nada de app dedicado de push, nada de terceiro (OneSignal
etc). FCM é nativo do Firebase que o projeto já usa (mesmo `messagingSenderId`
em `public/firebase.config.js`), então degrau 5 resolve.

**2.1 Cliente (PWA existente)**
- `public/sw.js` ganha um handler `push` (recebe o payload, chama
  `self.registration.showNotification`) e `notificationclick` (foca/abre o
  app na rota do `nav` embutido, mesmo dispatcher de destino que
  `notifDestino` já resolve em `app.js:5081`, reusado, não duplicado).
- Import do SDK `firebase-messaging-compat` só nesse arquivo (o app.js
  principal não carrega Firebase Messaging à toa; mantém o bundle atual
  intocado).
- `public/firebase.js` ganha uma função `pedirPermissaoPush()`, chamada só a
  partir do opt-in explícito (item 3): pede `Notification.requestPermission`,
  se concedida chama `getToken(messaging, { vapidKey })` e grava o token na
  coleção nova (2.2). VAPID key gerada 1x no console Firebase (Cloud
  Messaging → Web configuration), vai para `firebase.config.js` (já
  gitignored, mesmo tratamento das outras chaves).

**2.2 Coleção de tokens: shape e regra (rascunho)**

```
fcmTokens/{uid}/tokens/{token}
  token: string (o próprio token, redundante como doc id só por causa do id opaco)
  criadoEm: Timestamp (request.time)
  ua: string (user agent, para depurar dispositivo, <=200 chars)
```

Subcoleção por uid (não coleção plana) porque um usuário pode ter mais de um
aparelho/instalação: cada token é seu próprio doc, revogar 1 aparelho não
mexe nos outros.

Regra (aditiva, own-only, molde do `termoAdesao`/`eventos` já no repo):

```
match /fcmTokens/{uid}/tokens/{token} {
  allow read: if isAuthed() && request.auth.uid == uid;
  allow create: if isAuthed() && request.auth.uid == uid
              && request.resource.data.token == token
              && request.resource.data.criadoEm == request.time
              && request.resource.data.keys().hasOnly(['token', 'criadoEm', 'ua'])
              && request.resource.data.ua is string && request.resource.data.ua.size() <= 200;
  allow update: if false;               // token não muda, só recria
  allow delete: if isAuthed() && request.auth.uid == uid; // opt-out / logout limpa o próprio
}
```

Cloud Function roda como Admin SDK (ignora rules), então lê `fcmTokens/*`
para disparar sem precisar de regra de leitura ampla: a regra acima só
protege o create/delete do próprio dono contra qualquer outro cliente.

**2.3 Disparo: Cloud Function, mesmos eventos da central**

A central deriva de `comunicadosColab`, `documentosColab`, `meusRecibos`
(ver `notifItensColab`, `app.js:4076`). O push espelha exatamente essas TRÊS
fontes, nunca mais:
- comunicado/aviso publicado (`comunicados/{id}` create, `tipo != 'aviso'`
  vira "Novo comunicado", `tipo == 'aviso'` vira "Novo aviso")
- documento novo pendente de aceite/assinatura (`documentos/{id}` create ou
  update que suba `versao`)
- recibo novo (`recibos/{id}` create)

**Denúncia NUNCA entra**, mesma invariante de discrição da central
(`app.js:3990`, Lei 14.457/2022), reforçada aqui porque uma Function de push
seria a forma mais fácil de vazar essa regra por engano se copiada sem
pensar.

`functions/index.js` ganha 3 `onDocumentCreated`/`onDocumentUpdated` (mesmo
padrão de `enviarWaMsg` já no arquivo: idempotência por claim transacional,
`retry: false`, log sem PII). Cada trigger resolve a lista de uid-alvo
(comunicado = todos os colaboradores ativos ou o setor-alvo, documento/recibo
= o dono), busca os tokens em `fcmTokens/{uid}/tokens`, envia via
`admin.messaging().sendEachForMulticast`. Token que responder
`messaging/registration-token-not-registered` é apagado do Firestore no
mesmo passe (autolimpeza, sem job à parte).

## 3. Privacidade e LGPD

- **Zero PII no corpo do push.** Título fixo genérico: "Você tem uma
  novidade no FioPulse". Sem nome, sem tipo de documento, sem valor de
  recibo: o conteúdo real só aparece dentro do app, atrás do login. Isso
  também evita vazar em tela de bloqueio compartilhada (chão de fábrica).
- **Opt-in explícito**, nunca automático. O toggle "Notificações" que já
  existe em Conta (`app.js:6142-6146`, hoje só grava
  `localStorage.fiopulse:notif` sem efeito real) é o lugar natural: ligar o
  toggle passa a chamar `pedirPermissaoPush()` de verdade; desligar apaga o
  token do Firestore (opt-out limpo, não só um flag mudo).
- `Notification.requestPermission()` é o próprio consentimento do navegador
  (o usuário já viu o prompt nativo do sistema); a coleção grava só token +
  timestamp + user agent, nada de geolocalização nem device fingerprint.
- Token órfão (usuário demitido, conta desativada) precisa expurgo: entra na
  mesma varredura de expurgo já existente em `functions/index.js`
  (`expurgarCandidaturasVencidas` é o molde) ou um gatilho simples em
  `users/{uid}` indo `ativo:false`, que apaga a subcoleção `fcmTokens/{uid}`.

## 4. Custos

FCM em si é gratuito, sem teto de mensagens. O custo incremental é só
execução de Cloud Functions (Blaze, já ativo pelo `enviarWaMsg`/`onSchedule`
existentes): volume esperado é dezenas de disparos por dia (1 por
comunicado/documento/recibo novo, multiplicado pelos tokens do público
daquele evento), ordem de grandeza irrelevante dentro do free tier de
invocações do Cloud Functions. Sem custo de terceiro, sem assinatura nova.

## 5. Fases de rollout

- **F1 · Infra + opt-in.** `sw.js` com handler push, `pedirPermissaoPush()`,
  coleção `fcmTokens` + regra (gate Fable, mesmo ritual de toda rule nova),
  toggle de Conta religado de verdade. NENHUM disparo ainda, serve pra medir
  quantos colaboradores instalaram o PWA e vão ligar o toggle antes de
  investir na Function de disparo.
- **F2 · Disparos.** As 3 Functions (comunicado/documento/recibo), autolimpeza
  de token morto, teste ponta a ponta em 1 aparelho Android + 1 iOS
  instalado 16.4+.
- **F3 · Métricas.** Contagem de opt-in ativo e taxa de entrega (quantos
  `sendEachForMulticast` retornam sucesso) visível em algum canto da
  Auditoria do gestor, pra decidir se vale expandir pra mais eventos.

Gate Fable obrigatório na regra de `fcmTokens` (dado de dispositivo, PII
leve) e no release de F2 (primeira Function que grava PII, mesmo que
mínima, em produção), mesmo crivo que qualquer mudança de rules/PII já
segue no projeto.

## 6. Riscos e o que NÃO fazer

- NÃO expandir a lista de eventos além dos 3 que a central já deriva sem
  aprovação nova do William: cada evento novo é decisão de produto, não só
  técnica (ex.: ocorrência aprovada poderia parecer óbvio mas não está na
  central hoje).
- NÃO incluir denúncia, nunca, sob nenhuma refatoração futura; comentário
  fixo no código do trigger deve repetir essa invariante (mesmo padrão do
  `app.js:3990`).
- NÃO colocar conteúdo identificável no corpo do push (nome, valor, tipo de
  documento) mesmo que pareça inofensivo: título genérico é definitivo, não
  um placeholder de v1.
- NÃO tratar push como camada de confiabilidade: é só um empurrão. A central
  in-app continua sendo a fonte de verdade (quem não recebeu push por
  qualquer motivo, iOS não instalado, token expirado, offline, ainda vê
  tudo ao abrir o app). Nenhuma lógica de negócio pode depender de o push ter
  chegado.
- Risco de token morto acumulando: sem a autolimpeza do item 2.3, a
  coleção cresce sem controle e o `sendEachForMulticast` desperdiça chamadas
  em tokens inválidos; autolimpeza entra JUNTO com F2, não depois.
- Risco de spam/fadiga: 3 eventos é pouco, mas se comunicados forem
  publicados em lote (ex.: RH publica 5 avisos seguidos), o colaborador leva
  5 pushes na mesma hora. Sem agregação em F1/F2; se virar problema real,
  agregação por janela é trabalho de fase futura, não escopo daqui.
