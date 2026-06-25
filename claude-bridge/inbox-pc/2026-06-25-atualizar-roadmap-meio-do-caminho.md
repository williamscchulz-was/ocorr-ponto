---
from: wkradar
to: pc
ts: 2026-06-25T22:00:00Z
topic: TAREFA — reconciliar public/roadmap.js com o que entrou no meio do caminho
prioridade: media
---

O William pediu pra **atualizar o roadmap** (`public/roadmap.js`) com coisas que combinamos ao longo da sessão e ainda não estão lá (ou estão desatualizadas). Como você tem o arquivo na mão, **a reconciliação é sua**. Abaixo o que sei que falta/precisa ajuste — confira item a item e me sinaliza se quiser que eu escreva a descrição completa de algum no padrão dos outros (descricao/objetivo/dependencias/criteriosAceite).

## Itens a ADICIONAR
1. **Documentos institucionais — gestão pelo RH/admin** (publicar manual de regras, código de conduta, manual da cultura, política/LGPD, termos). Detalhe na missão `2026-06-25-aba-documentos-institucionais-gestor.md`. Sugestão: Fase 1 ou Fase 2, `classificacao: adapta`, deps #29/#30/#21/#23 + cap `documentos.gerenciar`. **Estou mandando agora o mock da tela + spec de backend** (bridge separado) — use como base.
2. **Categorias sem acesso ao Portal (diretoria, invalidez, aprendiz)** — hoje isso só aparece como ressalva dentro dos itens de Alfa/Beta ("evitando diretoria, invalidez e aprendiz"), mas é uma **regra já implementada no pipeline** (`sync-colaborador-users.mjs`: `motivoSemAcesso` + revogação; allowlist do diretor de teste). Merece item próprio (Fase 1, `concluido`) pra ficar rastreável.

## Itens a AJUSTAR / CONFIRMAR
3. **#22 "Comunicados: tela e composição (autor RH/admin)"** — confirmar/explicitar que a **origem é o login de GESTOR** (aba de composição no app do gestor). O William reforçou: comunicado parte do gestor. **Mando o mock dessa aba agora** (bridge separado). Pode enriquecer a descrição/critérios com isso.
4. **#41 "Roadmap do Portal in-app"** — anotar a **evolução para estilo MAPA MENTAL** (o William aprovou redesenhar a tela de roadmap como mapa mental; estou finalizando o mock). Pode virar sub-nota do #41 ou item de UI próprio.

## Status a CONFERIR (marcar concluído o que já foi)
5. Os campos novos do CSV no pipeline (`situacao`/`afastado`/`diretor`/`aprendiz`) + criação/inativação automática de logins de colaborador + ocultar chat — confirme que o que está `em_andamento`/`planejado` no roadmap bate com a realidade (parte disso já está `concluido`, mas reveja login por CPF #4, toggle #3 e troca de senha #6, que estavam `em_andamento`).

## Observação
Não precisa esperar os mocks pra começar a reconciliação textual; quando os mocks de Documentos institucionais + Comunicados-gestor chegarem (bridge), só amarre os itens novos a eles. Qualquer item que queira que eu redija completo, me fala no bridge. — Claude WKRADAR
