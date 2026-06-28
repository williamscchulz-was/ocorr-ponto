# Auditoria: redesign WKRADAR aplicado vs pendente (mobile + gestor)
**Data:** 2026-06-27 · **Por:** PC · **Versão no ar:** v199

Cruzamento honesto entre o que o WKRADAR entregou (mocks/specs no bridge + `docs/mockups/`)
e o que está REALMENTE aplicado no código deployado.

## Resumo franco
Apliquei: o **backend completo** (comunicados, documentos, ocorrencias-auto, monitor, re-fetch,
regras testadas) + a **home do colaborador** no redesign premium (Fatias A/B/C) + **Conferência** +
**Monitor**. **NÃO apliquei** o redesign premium tela-a-tela das **outras telas do colaborador**
(Banco de horas, Conta, Comunicados, Documentos, Roadmap) nem do **gestor** (Dashboard, Comunicados,
Documentos). E o **"Meu Ponto" (banco de horas) do colaborador é um STUB "Em construção"**.

## Mobile geral (app-like) — ✅ APLICADO (v189)
Viewport de app (sem pinch-zoom preso), hamburger removido no mobile (bottom-nav cobre), FAB
escondido, alvos de toque, safe-area. Confirmado no ar.

## Portal do Colaborador (mobile) — 5 telas + roadmap
| Tela | Mock WKRADAR | Estado no código | Status |
|---|---|---|---|
| Home | `colaborador-home-redesign.html` | renderColaboradorHome (A/B/C) | ✅ APLICADO (v195-199) |
| Banco de horas (`colab-ponto`) | `colaborador-bh-redesign.html` | renderColabPonto (herói + detalhe em breve) | 🟡 APLICADO PARCIAL (v200) — gráfico/lançamentos esperam dado WKRADAR |
| Conta/perfil (`colab-conta`) | `colaborador-conta-redesign.html` | renderColabConta + chips (v201) | ✅ APLICADO |
| Comunicados (`colab-comunicados`) | `colaborador-comunicados-redesign.html` | renderColabComunicados + filtro (v201) | ✅ APLICADO |
| Documentos (`colab-documentos`) | `colaborador-documentos-redesign.html` | renderColabDocumentos (pendente/em dia) | ✅ APLICADO |
| Roadmap (`colab-roadmap`) | `roadmap-portal-mapa-mental.html` | **renderPortalRoadmap (mapa mental fp-*)** | ✅ JÁ ESTAVA APLICADO (auditoria inicial errou) |

**Colaborador (mobile) = COMPLETO** (só o gráfico/lançamentos da tela de BH esperam o WKRADAR subir `lancamentos[]`).

## Portal do Gestor (desktop) — redesign premium das 5 telas
| Tela | Mock WKRADAR | Estado | Status |
|---|---|---|---|
| Dashboard | `gestor-dash-redesign.html` | renderDashboard (antigo) | ⚠️ Funcional, redesign NÃO aplicado |
| Comunicados | `gestor-com-redesign.html` | renderComunicados (v186) | ⚠️ Funcional, redesign NÃO aplicado |
| Documentos institucionais | `gestor-doc-redesign.html` | renderDocumentos (v186) | ⚠️ Funcional, redesign NÃO aplicado |
| Conferência | `gestor-ocr-redesign.html` | renderOcorrenciasAuto (v191) | ✅ Funcional+visual, perto do mock |
| Monitor | `gestor-mon-redesign.html` | renderOcorrenciasAuto/Monitor (v193-194) | ✅ Aplicado; redesign é alinhamento visual opcional |

## Plano proposto (mobile primeiro, por valor)
1. **Banco de horas (`colab-ponto`)** — fechar o STUB: herói (saldo do mês) + gráfico CSS (crédito verde/débito âmbar) + lista de lançamentos por dia. Bind: `pipeline-rh/cur.funcionarios[].lancamentos[]`. **Maior buraco.**
2. **Conta/perfil** — redesign premium (cabeçalho + herói BH + grupos Meus dados / Preferências / Segurança).
3. **Comunicados** e **Documentos** do colaborador — aplicar o redesign premium sobre o funcional.
4. **Roadmap** mapa mental (trilho de metrô).
5. **Gestor** (desktop) — Dashboard/Comunicados/Documentos no redesign premium.
