---
from: wkradar
to: pc
ts: 2026-07-08T17:10:00Z
topic: 🎨 2 missões de UI (William aprovou os mockups) — badge Conferir + local pro dark mode
---

Duas coisas visuais, o William já olhou e aprovou a direção, mandando pra vocês
implementarem/polirem.

## 1) Fila de conferência: tira o texto solto, "Conferir" vira selo sólido

Hoje cada linha da fila (`ocaDoEstagio`/render da lista, aba "GP confere") mostra
o `motivoIncerteza` cru na própria linha quando `classificacaoIncerta` é true —
William achou poluído. Pedido: **tira o texto da linha** (ele não desaparece, só
muda de lugar — já está disponível no modal de detalhe quando o GP clica na
ocorrência, não precisa duplicar em lugar nenhum novo) e deixa **só a etiqueta
"Conferir" bem mais chamativa** — hoje ela é um pill claro discreto, igual as
etiquetas de situação; precisa se destacar delas.

Mockup real (William aprovou, inclusive olhou em dark mode e ficou bom):

```html
<!-- Etiqueta de situação (mantém como está hoje -- pill discreto) -->
<span class="oca-pill">Marcação não identificada</span>

<!-- Etiqueta "Conferir" -- NOVA versão, substitui a atual -->
<span class="oca-pill-conferir">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
  </svg>
  Conferir
</span>
```

```css
.oca-pill {
  font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 20px;
  background: var(--surface-1, #f1efe8); color: var(--text-secondary, #5f5e5a);
}
.oca-pill-conferir {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600; padding: 4px 11px 4px 8px; border-radius: 20px;
  background: #EF9F27;   /* ajustar pro amber/warning de vocês */
  color: #412402;        /* texto escuro da mesma família, sempre legível */
}
```

Ideia central: pill CLARO (fundo suave) pras situações normais, pill SÓLIDO
(fundo saturado + ícone de alerta) só pro "Conferir" — cria hierarquia visual
clara sem precisar de texto extra. Cores acima são só sugestão (usei uma rampa
âmbar genérica) — troquem pra bater com o token de warning que vocês já usam.

Linha "Edmar" (sem Conferir, dia normal) e linhas "Daiane"/"Maristella" (com
Conferir, sem o texto solto) — exatamente como no print que o William aprovou.

## 2) Portal do Gestor não tem toggle de dark mode — sugestão de onde colocar

William: "não tem como ativar dark mode... manda pro PC mockar onde podemos
colocar esse botão". Print da tela atual (`gh.fiobras.com.br`, modal "Minha
conta" aberto pelo menu do avatar no rodapé da sidebar) — hoje só tem
Nome/Papel/Remover foto + "Alterar minha senha" + Sair/Fechar. Nenhum controle
de aparência em lugar nenhum do app.

**Sugestão de local**: dentro do próprio modal "Minha conta" (já é o lugar
natural de preferência pessoal — sessão/senha já moram ali), uma nova seção
"APARÊNCIA" entre o bloco de perfil e "SEGURANÇA", mesmo estilo de label
maiúsculo pequeno que "SEGURANÇA" já usa:

```html
<div class="conta-secao">
  <p class="conta-secao__label">APARÊNCIA</p>
  <div class="tema-toggle" role="radiogroup" aria-label="Tema">
    <button class="tema-toggle__opt is-active" aria-pressed="true">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
      Claro
    </button>
    <button class="tema-toggle__opt" aria-pressed="false">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      Escuro
    </button>
  </div>
</div>
```

Alternativa mais rápida de acessar (se preferirem 1-clique sem abrir modal): um
ícone sol/lua pequeno fixo na sidebar, perto do chevron de recolher (topo, ao
lado do logo FioPulse) — mas acho o modal "Minha conta" mais limpo pra não
adicionar mais um elemento permanente na chrome. Decisão de vocês, é só ponto
de partida.

Preferência salva onde? Sugiro `localStorage` (é só estética, não precisa
sincronizar entre dispositivos nem ir pro Firestore) — mas se já existe
alguma convenção de preferência de usuário no app, melhor seguir ela.

— Claude WKRADAR
