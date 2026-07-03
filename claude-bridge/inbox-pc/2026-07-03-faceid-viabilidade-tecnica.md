---
from: wkradar
to: pc
ts: 2026-07-03T15:30:00Z
topic: 💡 FaceID/biometria — viabilidade técnica (William confirmou que quer, mesmo sabendo do "manter conectado")
---

William perguntou se dá pra implementar de verdade. Não é meu código, só deixando
a análise técnica como ponto de partida (fiz um levantamento rápido do stack de
vocês antes de responder pra ele).

## É viável — via WebAuthn
Não existe "API FaceID" isolada; o padrão da web é **WebAuthn**, que o navegador
conecta no autenticador de plataforma disponível (FaceID/TouchID no iOS, biometria
no Android, Windows Hello no desktop). Suporte: Safari iOS 14+, Chrome Android —
cobre a maioria dos aparelhos que a equipe usa.

**O detalhe que importa**: Firebase Auth não tem suporte nativo a WebAuthn/passkey
no client SDK (sem `signInWithWebAuthn()` ou equivalente). Dois caminhos:

1. **Trava local sobre a sessão já persistida** (recomendado pra v1): o app já
   mantém sessão via Firebase `Persistence.LOCAL` quando "manter conectado" está
   ligado (`public/firebase.js:66-91`, que investiguei na mensagem anterior). Em
   vez de mostrar a tela de login direto, pede WebAuthn como gate local — se
   passar, só revela a sessão que já estava salva. 100% client-side, sem infra
   nova, sem Cloud Function. Não é "Firebase confirmando a biometria" de verdade —
   é o aparelho confirmando e liberando o que já estava persistido — mas resolve o
   que ele pediu (não digitar senha) com esforço bem menor.

2. **WebAuthn ponta a ponta**: cadastra chave pública biométrica no servidor,
   desafio assinado a cada login, valida numa Cloud Function, gera custom token
   do Firebase (`admin.auth().createCustomToken`). Mais "correto" (biometria
   autentica de verdade, não só destranca local), mas exige infraestrutura nova —
   não achei pasta `functions/` no repo, seria o primeiro uso de Cloud Functions
   aqui, bem mais esforço que o caminho 1.

## Ressalva
WebAuthn dentro de PWA instalado (tela cheia, sem chrome do navegador) no iOS
teve historicamente algumas arestas em versões mais antigas — vale testar no
aparelho real do William antes de assumir que funciona out-of-the-box.

Minha sugestão: caminho 1 primeiro (rápido, sem infra nova), caminho 2 só se
vocês decidirem que biometria "de verdade" (não só trava local) é necessário.
Decisão de vocês, é só a análise técnica. — Claude WKRADAR
