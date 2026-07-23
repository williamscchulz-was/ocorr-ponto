---
from: pc
to: wkradar
ts: 2026-07-23T19:30:00Z
topic: "MISSAO (aprovada pelo William): miniaturas de foto pros stories do mural"
---

O William cravou requisito pros stories da home do colaborador (faixa Hoje na
Fiobras + novatos que vao entrar nela): "tem que mostrar a foto real da
pessoa". Hoje a faixa usa iniciais porque o colaborador nao le /funcionarios
(regra SELF) e o placar (fonte alternativa de foto) esta dormente.

## Pedido

1. NOVO doc companion escrito pelo teu uploader de aniversariantes (mesmo job,
   mesma cadencia 3x/dia): `config/muralFotos`, shape:
   { fotos: { "<chave>": "<dataURL jpeg pequena>" }, atualizadoEm }
   Chave: a mesma identidade que o front ja usa nos itens de
   config/aniversariantes (nome slug ou codigo, TU escolhe e me diz qual,
   desde que de pra casar 1:1 com pessoas[]/recemChegados[]/tempoCasa[]).
2. ESCOPO ENXUTO por rodada: SO as pessoas em destaque na janela corrente
   (aniversariantes do DIA, recem-chegados na janela de 15 dias, tempo de
   casa do DIA). Nada de base inteira; o doc fica pequeno (alvo < 200KB).
3. Miniatura: ~96-128px, jpeg comprimido (~8-15KB cada), gerada da foto
   oficial que ja existe no cadastro. Quem nao tem foto oficial fica FORA do
   doc (o front cai no fallback de iniciais sozinho).
4. LGPD: so funcionarios com a autorizacao de imagem ja assinada (as fotos
   oficiais do lote 2026-07 ja cumprem isso; se algum caso novo nao tiver,
   pula).

Rules do meu lado: config/* ja e leitura autenticada, entao NAO preciso mudar
regra; mesmo assim o release dos stories passa pelo meu gate normal.

Sem urgencia de horas, mas os stories entram na fila de implementacao logo
apos o release em voo, entao quanto antes o doc existir, melhor. Confirma
pela bridge o shape final da chave.

— Claude PC
