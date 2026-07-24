// ============================================
// Firebase integration (modo produção)
//
// Carrega o SDK compat do Firebase, override das funções do app
// para usar Auth + Firestore. Se window.FIREBASE_CONFIG não existir
// (arquivo firebase.config.js ausente), o app segue em modo demo
// (localStorage), sem nenhum efeito colateral.
//
// Setup: docs/SETUP_FIREBASE.md
// ============================================

(function () {
  const cfg = window.FIREBASE_CONFIG;

  // Seam de teste do contrato de loader (P2 do BOOT PERFEITO): exposto ANTES do guard de
  // demo porque o probe boot-loaders-verify roda em modo demo (config abortado) e precisa
  // exercitar o retry+diff+render REAL. loaderHome só depende de globais (state, renderApp,
  // debug) — a declaração `async function` mais abaixo é hasteada, então vale nos 2 modos.
  window.__loaderHome = loaderHome;

  // Sem config → modo demo, não faz nada
  if (!cfg || !cfg.apiKey || cfg.apiKey === "COLE_AQUI") {
    console.info("[Firebase] sem config — rodando em modo demo (localStorage).");
    return;
  }

  // Marca o body pra esconder atalhos de login demo
  document.documentElement.classList.add("firebase-mode");

  // ATENCAO: esta versao esta duplicada nos <link rel="preload"> do index.html
  // (perf mobile). Mexeu aqui, mexe la, senao o preload baixa a versao errada.
  const SDK_VERSION = "10.12.5";
  const SDK_BASE = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

  // Handles do listener vivo de ocorrências. Vivem no escopo do IIFE porque
  // DUAS funções irmãs precisam deles: carregarDadosCompletos (cria/recria o
  // onSnapshot) e wireAuthFlow (cancela no signOut). Declarar dentro de uma
  // delas faz a outra estourar "ocorrenciasUnsub is not defined".
  let ocorrenciasUnsub = null;
  let ocorrenciasAutoUnsub = null; // listener VIVO das automáticas (paridade com as manuais)
  // Escopo do supervisor nas automáticas: a regra dá read AMPLO (espelha /ocorrencias), o
  // cliente filtra pra o escopo dele na INGESTAO (avulsos OU turnos). Admin/RH/líder passam
  // direto (líder já filtrado server-side por turno). Filtrar na entrada corrige tudo rio
  // abaixo (vgTendencia/ocaFaltasMes consomem o state cru).
  const noEscopoAuto = (u, o) => u.role !== "supervisor"
    || (u.funcionariosVisiveis || []).includes(o.funcionarioId)
    || (u.turnosVisiveis || []).includes(Number(o.turno));
  let ocorrenciasIdsConhecidos = null; // null = ainda não houve 1ª carga

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Falha ao carregar " + src));
      document.head.appendChild(s);
    });
  }

  async function bootFirebase() {
    try {
      await loadScript(`${SDK_BASE}/firebase-app-compat.js`);
      await Promise.all([
        loadScript(`${SDK_BASE}/firebase-auth-compat.js`),
        loadScript(`${SDK_BASE}/firebase-firestore-compat.js`),
        loadScript(`${SDK_BASE}/firebase-storage-compat.js`),
        // App Check (FASE 1, observação): best-effort. Se a rede da gstatic estiver
        // bloqueada (harness/probe), a falha é engolida e firebase.appCheck fica
        // undefined — o boot segue e a ativação abaixo é pulada pelo guard.
        loadScript(`${SDK_BASE}/firebase-app-check-compat.js`).catch(() => {}),
      ]);

      const app = firebase.initializeApp(cfg);

      // App Check · FASE 1 (observação, enforcement DESLIGADO no console). Cunha
      // tokens reCAPTCHA v3 pra a fase de medição; nada é barrado ainda. Guard duplo à
      // prova de boot: sem o script (harness/probe bloqueia a gstatic) firebase.appCheck
      // fica undefined e o boot segue; o try engole qualquer falha de activate. O 2º arg
      // (true) liga o auto-refresh do token. Chave pública do site (reCAPTCHA v3) por desenho.
      if (firebase.appCheck) {
        try {
          firebase.appCheck().activate("6LfVfGEtAAAAAKvii4vlZ1V8P8whyNBF4eF6uyzy", true);
        } catch (e) { /* nunca prende o boot */ }
      }
      const auth = firebase.auth();
      // Templates de email (reset senha, verificação) saem em pt-BR
      auth.languageCode = "pt";
      const db = firebase.firestore();
      // P1 (BOOT PERFEITO) · persistência local do Firestore, ANTES de qualquer leitura
      // (o SDK compat exige ser a 1ª operação sobre o db). Efeito: no cold start do PWA
      // as leituras resolvem do cache em disco na hora (o "client is offline" some) e a
      // "última home boa" nasce de graça do próprio SDK. failed-precondition (várias abas
      // sem suporte a multi-tab) e unimplemented (navegador sem IndexedDB) degradam pra
      // sem-persistência, com debug, NUNCA quebram o boot.
      try {
        db.enablePersistence({ synchronizeTabs: true }).catch((e) => {
          debug?.("[Firestore] persistência indisponível (" + (e && e.code) + "), seguindo sem cache em disco");
        });
      } catch (e) { debug?.("[Firestore] enablePersistence falhou:", (e && (e.code || e.message)) || e); }
      // Storage: PDFs de recibo/cartão ponto (arquivo de verdade, fora do Firestore).
      const storage = firebase.storage();
      // Marco do boot: SDK carregado e Firebase inicializado (ver window.__bootDbg()).
      if (window.__bootMarks && window.__bootMarks.firebaseReady == null) window.__bootMarks.firebaseReady = performance.now();

      // Limpa qualquer sessão de modo demo
      localStorage.removeItem("ocorr-ponto:v1");

      // PERSISTÊNCIA — define ANTES de qualquer outra coisa pra evitar
      // que o Firebase auto-restaure user com persistence default (LOCAL).
      //   manterConectado=1 → LOCAL  (sobrevive a fechar browser)
      //   default (não marcado) → NONE (memória apenas — refresh logo-out)
      //
      // NONE ≠ SESSION: SESSION sobrevive refresh na mesma aba; NONE não.
      // Como o user pediu "refresh sem manter conectado = login screen",
      // NONE é o correto.
      let manterConectadoBoot = false;
      try { manterConectadoBoot = localStorage.getItem("fiopulse:manterConectado") === "1"; }
      catch {}
      // Salvaguarda: com sessão a restaurar (esqueleto no ar), se o auth travar
      // (rede), esconde a abertura após 7s pra não prender o usuário (cai no login).
      if (manterConectadoBoot) {
        setTimeout(() => { if (window.hideSplash) window.hideSplash(); }, 7000);
      }
      const initialPersistence = manterConectadoBoot
        ? firebase.auth.Auth.Persistence.LOCAL
        : firebase.auth.Auth.Persistence.NONE;
      try {
        await auth.setPersistence(initialPersistence);
        debug?.("[Auth] persistência inicial:", manterConectadoBoot ? "LOCAL" : "NONE");
      } catch (e) {
        debug?.("[Auth] setPersistence falhou:", e);
      }

      // Storage persistente: pede ao browser pra NÃO despejar o armazenamento
      // (IndexedDB do Firebase Auth + localStorage). No Android/Chrome, quando
      // concedido (silencioso, sem popup), a sessão sobrevive muito mais tempo.
      // No iOS o Safari ainda pode despejar após ~7 dias sem abrir (limite da
      // Apple, não do app), mas pedir não custa e não atrapalha. Fire-and-forget.
      try { navigator.storage?.persist?.().then((ok) => debug?.("[Storage] persistente:", ok)).catch(() => {}); } catch {}

      window.FIREBASE = { app, auth, db, storage };

      installFirebaseStore(auth, db);
      wireAuthFlow(auth, db);

      console.info("[Firebase] ativo, projeto:", cfg.projectId);
    } catch (err) {
      console.error("[Firebase] erro ao iniciar:", err);
      const msg = "Falha ao iniciar o Firebase, voltando ao modo demo. (F12 pra detalhes)";
      if (window.toast) window.toast(msg, "danger"); else alert(msg);
    }
  }

  // ----------------------------------------
  // Override do store + funções de mutação
  // ----------------------------------------

  function installFirebaseStore(auth, db) {
    // Substitui o store sync por wrappers que escrevem no Firestore.
    // Leituras vão pelo state local (que é populado por wireAuthFlow).

    window.store = {
      load: () => null,
      save: () => {},      // no-op: persistência é por documento agora
      init: () => state,    // já populado por wireAuthFlow
      reset: async () => {
        if (!(await confirmar({
          titulo: "Resetar tudo?",
          msg: "Isso APAGA todos os documentos do Firestore. Não dá pra desfazer.",
          okLabel: "Resetar",
          perigo: true,
        }))) return state;
        const batch = db.batch();
        // Todas as coleções gravadas por documento — senão o reset deixa
        // órfãos (saldos, PJs, presença, tipos/ações custom).
        const cols = ["ocorrencias", "funcionarios", "users", "bancoHoras", "pj", "presence", "tipos", "acoes", "obrigacoes"];
        for (const c of cols) {
          const snap = await db.collection(c).get();
          snap.docs.forEach((d) => batch.delete(d.ref));
        }
        await batch.commit();
        location.reload();
        return state;
      },
    };

    // Override saveNovaOcorrencia → escreve no Firestore
    window.saveNovaOcorrencia = async function () {
      const data = $("#f-data").value;
      const horario = $("#f-horario").value;
      const funcionarioId = $("#f-func").value;
      const tipo = $("#f-tipo").value;
      const observacao = $("#f-obs").value.trim();

      if (!data || !horario || !funcionarioId || !tipo) {
        toast("Preencha todos os campos obrigatórios.", "danger");
        return;
      }

      const u = currentUser();
      const func = getFuncionario(funcionarioId);
      if (!func) return toast("Funcionário inválido.", "danger");
      // A REGRA exige turno definido (funcionarioTurno in [1,2,3,'geral']): sem
      // isso a escrita era rejeitada e a Suyanne via a ocorrência "fantasma" do
      // cache até o rollback, sem gravar nada (achado do WKRADAR 2026-07-03).
      if (![1, 2, 3, "geral"].includes(func.turno)) {
        const el = document.getElementById("f-erro");
        if (el) { el.hidden = false; el.textContent = `${func.nome} está sem turno definido. Defina o turno na tela Funcionários antes de registrar a ocorrência.`; }
        toast("Funcionário sem turno definido.", "danger");
        return;
      }

      const now = firebase.firestore.FieldValue.serverTimestamp();
      const novo = {
        data: firebase.firestore.Timestamp.fromDate(new Date(data + "T00:00:00")),
        funcionarioId,
        funcionarioNome: func.nome,
        funcionarioTurno: func.turno,
        tipo,
        horario,
        acao: null,
        dataConferencia: null,
        observacao,
        criadoPor: u.id,
        criadoEm: now,
        atualizadoEm: now,
        conferidoPor: null,
        historico: [{
          por: u.id,
          em: new Date().toISOString(),
          acao: "Criou ocorrência",
        }],
      };

      try {
        const ref = await db.collection("ocorrencias").add(novo);
        // Atualiza state local pra UI responsiva
        state.ocorrencias.unshift({
          id: ref.id,
          ...novo,
          data: data,
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString(),
        });
        closeModal();
        toast("Ocorrência registrada!");
        renderApp();
      } catch (err) {
        debug?.(err);
        // Falha TEM que ser barulhenta: o form fica aberto com o erro FIXO
        // (o toast de 2.6s passava batido e a perda de dado era silenciosa).
        const el = document.getElementById("f-erro");
        if (el) { el.hidden = false; el.textContent = "A ocorrência NÃO foi gravada: " + (err?.message || err) + ". Tente de novo; se repetir, avise o administrador."; }
        toast("A ocorrência NÃO foi gravada.", "danger");
      }
    };

    // Override confirmConferencia
    window.confirmConferencia = async function (id) {
      const o = state.ocorrencias.find((x) => x.id === id);
      if (!o) return;
      const acao = $("#conf-acao").value;
      const obs = $("#conf-obs").value.trim();

      if (!acao) return toast("Selecione a ação antes de confirmar.", "danger");

      const u = currentUser();
      const today = todayIso();
      const novoHist = [...(o.historico || []), {
        por: u.id,
        em: new Date().toISOString(),
        acao: `Conferiu (${getAcao(acao).label})`,
      }];

      try {
        await db.collection("ocorrencias").doc(id).update({
          acao,
          dataConferencia: firebase.firestore.Timestamp.fromDate(new Date(today + "T00:00:00")),
          observacao: obs,
          conferidoPor: u.id,
          atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
          historico: novoHist,
        });

        Object.assign(o, {
          acao,
          dataConferencia: today,
          observacao: obs,
          conferidoPor: u.id,
          historico: novoHist,
        });
        closeModal();
        toast("Conferência confirmada!");
        renderApp();
      } catch (err) {
        debug?.(err);
        toast("Erro ao salvar: " + err.message, "danger");
      }
    };

    // Override saveEditOcorrencia → admin edita qualquer campo
    window.saveEditOcorrencia = async function (id) {
      const o = state.ocorrencias.find((x) => x.id === id);
      if (!o) return;
      const u = currentUser();
      if (u.role !== "admin") return;

      const data = $("#ef-data").value;
      const horario = $("#ef-horario").value;
      const funcionarioId = $("#ef-func").value;
      const tipo = $("#ef-tipo").value;
      const acao = $("#ef-acao").value || null;
      const observacao = $("#ef-obs").value.trim();
      if (!data || !horario || !funcionarioId || !tipo) {
        return toast("Preencha data, funcionário, tipo e horário.", "danger");
      }

      const func = getFuncionario(funcionarioId);
      const dataConferencia = acao
        ? (o.dataConferencia || todayIso())
        : null;
      const conferidoPor = acao ? (o.conferidoPor || u.id) : null;

      const novoHist = [...(o.historico || []), {
        por: u.id,
        em: new Date().toISOString(),
        acao: "Admin editou a ocorrência",
      }];

      const dadosFirestore = {
        data: firebase.firestore.Timestamp.fromDate(new Date(data + "T00:00:00")),
        funcionarioId,
        funcionarioNome: func?.nome || o.funcionarioNome,
        funcionarioTurno: func?.turno ?? o.funcionarioTurno,
        tipo,
        horario,
        acao,
        dataConferencia: dataConferencia
          ? firebase.firestore.Timestamp.fromDate(new Date(dataConferencia + "T00:00:00"))
          : null,
        conferidoPor,
        observacao,
        historico: novoHist,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      };

      try {
        await db.collection("ocorrencias").doc(id).update(dadosFirestore);
        Object.assign(o, {
          data, funcionarioId,
          funcionarioNome: func?.nome || o.funcionarioNome,
          funcionarioTurno: func?.turno ?? o.funcionarioTurno,
          tipo, horario, acao, dataConferencia, conferidoPor, observacao,
          historico: novoHist,
        });
        closeModal();
        toast("Ocorrência atualizada.");
        renderApp();
      } catch (err) {
        debug?.(err);
        toast("Erro ao salvar: " + err.message, "danger");
      }
    };

    // Excluir = SOFT DELETE pra auditoria (2026-07-09): marca a flag em vez de
    // apagar o doc. O conteúdo inteiro fica preservado na aba Excluídas, com quem
    // e quando, e dá pra restaurar. (Delete físico segue possível só via console.)
    window.deleteOcorrencia = async function (id) {
      const o = state.ocorrencias.find((x) => x.id === id);
      if (!o) return;
      const f = getFuncionario(o.funcionarioId);
      const tipo = getTipo(o.tipo);
      const label = `${f?.nome || "?"} · ${tipo?.label || "?"} · ${formatDate(o.data)}`;
      if (!(await confirmar({
        titulo: "Excluir ocorrência?",
        msg: `${label}. Ela sai das listas e vai pra aba Excluídas, com seu nome e a data. Dá pra restaurar depois.`,
        okLabel: "Excluir",
        perigo: true,
      }))) return;

      try {
        const uid = auth.currentUser && auth.currentUser.uid;
        await db.collection("ocorrencias").doc(id).update({
          excluida: true, excluidaEm: firebase.firestore.FieldValue.serverTimestamp(), excluidaPor: uid,
        });
        window.registrarAuditoria?.({ tipo: "occ", acao: "Excluiu ocorrência", alvo: label });
        closeModal();
        toast("Ocorrência excluída. Ela fica na aba Excluídas.");
        // O onSnapshot reclassifica e re-renderiza sozinho.
      } catch (err) {
        debug?.(err);
        toast("Erro ao excluir: " + err.message, "danger");
      }
    };
    // Restaurar uma excluída: limpa a flag, o doc volta pras listas normais.
    window.restaurarOcorrencia = async function (id) {
      const o = (state.ocorrenciasExcluidas || []).find((x) => x.id === id);
      if (!o) return;
      try {
        const FV = firebase.firestore.FieldValue;
        await db.collection("ocorrencias").doc(id).update({
          excluida: FV.delete(), excluidaEm: FV.delete(), excluidaPor: FV.delete(),
        });
        const f = getFuncionario(o.funcionarioId);
        window.registrarAuditoria?.({ tipo: "occ", acao: "Restaurou ocorrência excluída", alvo: f?.nome || id });
        closeModal();
        toast("Ocorrência restaurada.");
      } catch (err) {
        debug?.(err);
        toast("Erro ao restaurar: " + err.message, "danger");
      }
    };

    // Override marcarComoLancada → /ocorrencias
    window.marcarComoLancada = async function (id) {
      const o = state.ocorrencias.find((x) => x.id === id);
      if (!o) return;
      const u = currentUser();
      if (u.role !== "rh" && u.role !== "admin") return;
      if (isPending(o)) return toast("Confira a ocorrência antes de marcar como lançada.", "danger");

      const novoHist = [...(o.historico || []), {
        por: u.id,
        em: new Date().toISOString(),
        acao: "Marcou como lançada",
      }];

      try {
        await db.collection("ocorrencias").doc(id).update({
          lancada: true,
          lancadoEm: firebase.firestore.FieldValue.serverTimestamp(),
          lancadoPor: u.id,
          historico: novoHist,
          atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        });
        Object.assign(o, {
          lancada: true,
          lancadoEm: new Date().toISOString(),
          lancadoPor: u.id,
          historico: novoHist,
        });
        closeModal();
        toast("Marcada como lançada.", "success", { duration: 6000, action: { label: "Desfazer", onClick: () => reverterLancada(id) } });
        renderApp();
      } catch (err) {
        debug?.(err);
        toast("Erro: " + err.message, "danger");
      }
    };

    // Undo rápido (sem confirm) do "Desfazer" no toast de lançamento → /ocorrencias.
    window.reverterLancada = async function (id) {
      const o = state.ocorrencias.find((x) => x.id === id);
      if (!o || !isLancada(o)) return;
      const u = currentUser();
      const novoHist = [...(o.historico || []), {
        por: u.id, em: new Date().toISOString(), acao: "Desfez lançamento (undo)",
      }];
      try {
        await db.collection("ocorrencias").doc(id).update({
          lancada: false, lancadoEm: null, lancadoPor: null,
          historico: novoHist, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        });
        Object.assign(o, { lancada: false, lancadoEm: null, lancadoPor: null, historico: novoHist });
        toast("Lançamento desfeito.");
        renderApp();
      } catch (err) { toast("Erro ao desfazer: " + err.message, "danger"); }
    };

    // Override desfazerLancamento → /ocorrencias (volta pra Conferida)
    window.desfazerLancamento = async function (id) {
      const o = state.ocorrencias.find((x) => x.id === id);
      if (!o) return;
      const u = currentUser();
      if (u.role !== "rh" && u.role !== "admin") return;
      if (!isLancada(o)) return;

      if (!(await confirmar({
        titulo: "Desfazer lançamento?",
        msg: "A ocorrência volta pra Conferidas e a marca de lançada some.",
        okLabel: "Desfazer",
        perigo: true,
      }))) return;

      const novoHist = [...(o.historico || []), {
        por: u.id,
        em: new Date().toISOString(),
        acao: "Desfez lançamento",
      }];

      try {
        await db.collection("ocorrencias").doc(id).update({
          lancada: false,
          lancadoEm: null,
          lancadoPor: null,
          historico: novoHist,
          atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        });
        Object.assign(o, {
          lancada: false,
          lancadoEm: null,
          lancadoPor: null,
          historico: novoHist,
        });
        closeModal();
        toast("Lançamento desfeito. Voltou pra Conferidas.");
        renderApp();
      } catch (err) {
        debug?.(err);
        toast("Erro: " + err.message, "danger");
      }
    };

    // Override updateObservacao
    window.updateObservacao = async function (id) {
      const o = state.ocorrencias.find((x) => x.id === id);
      if (!o) return;
      const obs = $("#conf-obs").value.trim();
      if (obs === o.observacao) return closeModal();

      const u = currentUser();
      const novoHist = [...(o.historico || []), {
        por: u.id,
        em: new Date().toISOString(),
        acao: "Atualizou observação",
      }];

      try {
        await db.collection("ocorrencias").doc(id).update({
          observacao: obs,
          atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
          historico: novoHist,
        });
        o.observacao = obs;
        o.historico = novoHist;
        closeModal();
        toast("Observação atualizada.");
        renderApp();
      } catch (err) {
        debug?.(err);
        toast("Erro ao salvar: " + err.message, "danger");
      }
    };

    // Override saveTipo → persiste em /tipos
    window.saveTipo = async function () {
      const label = $("#tipo-label").value.trim();
      const tone = $("#tipo-tone").value;
      if (!label) return toast("Informe o nome do tipo.", "danger");
      if (label.length < 3) return toast("Nome muito curto.", "danger");

      const id = "custom-" + slugify(label);
      if (getTipo(id)) return toast("Já existe um tipo com nome parecido.", "danger");

      const u = currentUser();
      const novo = {
        label,
        tone,
        padrao: false,
        criadoPor: u.id,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      };

      try {
        await db.collection("tipos").doc(id).set(novo);
        if (!state.tiposCustom) state.tiposCustom = [];
        state.tiposCustom.push({
          id,
          ...novo,
          criadoEm: new Date().toISOString(),
        });
        window.logEvento?.({ tipo: "dados", acao: "Criou tipo de ocorrência", alvo: (novo.label || id) });
        closeModal();
        toast("Tipo criado!");
        renderApp();
      } catch (err) {
        debug?.(err);
        toast("Erro ao salvar: " + err.message, "danger");
      }
    };

    // Override saveFuncionario → /funcionarios
    window.saveFuncionario = async function (id) {
      const nome = $("#func-nome").value.trim();
      if (!nome || nome.length < 3) return toast("Nome muito curto.", "danger");
      const turnoStr = $("#func-turno").value;
      const dados = {
        nome,
        codigo: $("#func-codigo").value.trim() || null,
        turno: parseTurno(turnoStr),
        setor: $("#func-setor").value || null,
        ativo: $("#func-ativo").checked,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      };
      // bhExempt: só admin enxerga o toggle no modal. Se o checkbox existe,
      // grava o valor; senão omite o campo (não sobrescreve quando RH edita).
      const bhEl = $("#func-bhexempt");
      if (bhEl) dados.bhExempt = bhEl.checked;
      try {
        if (id) {
          await db.collection("funcionarios").doc(id).update(dados);
          const f = state.funcionarios.find((x) => x.id === id);
          if (f) Object.assign(f, dados);
        } else {
          const novoId = "f-" + (dados.codigo || slugify(nome) + "-" + Date.now());
          await db.collection("funcionarios").doc(novoId).set({
            ...dados,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
          });
          state.funcionarios.push({ id: novoId, ...dados });
        }
        window.logEvento?.({ tipo: "dados", acao: id ? "Atualizou funcionário" : "Criou funcionário", alvo: nome });
        closeModal();
        toast(id ? "Funcionário atualizado." : "Funcionário criado.");
        renderApp();
      } catch (err) {
        debug?.(err);
        toast("Erro ao salvar: " + err.message, "danger");
      }
    };

    // Override deleteFuncionario → /funcionarios
    window.deleteFuncionario = async function (id) {
      const f = state.funcionarios.find((x) => x.id === id);
      if (!f) return;
      const usado = state.ocorrencias.some((o) => o.funcionarioId === id);
      if (usado) return toast("Este funcionário tem ocorrências. Marque como inativo.", "danger");
      if (!(await confirmar({
        titulo: "Excluir funcionário?",
        msg: `Remover "${f.nome}" do cadastro.`,
        okLabel: "Excluir",
        perigo: true,
      }))) return;
      try {
        await db.collection("funcionarios").doc(id).delete();
        window.logEvento?.({ tipo: "dados", acao: "Excluiu funcionário", alvo: (f?.nome || id) });
        state.funcionarios = state.funcionarios.filter((x) => x.id !== id);
        closeModal();
        toast("Funcionário excluído.");
        renderApp();
      } catch (err) {
        toast("Erro: " + err.message, "danger");
      }
    };

    // Lê dados sensíveis (CPF, PIS, nomeMae) de banco-horas-saldos/{codigo}.
    // Admin+RH only — rule do Firestore garante mesmo se UI burlar.
    // Retorna null se sem permissão, sem código, ou doc inexistente.
    // Usado no perfil enriquecido do funcionário pra mostrar PII só pra quem deve.
    window.lerSaldoSensivel = async function (codigo) {
      const u = currentUser();
      if (!u || (u.role !== "admin" && u.role !== "rh")) return null;
      if (!codigo) return null;
      try {
        const snap = await db.collection("banco-horas-saldos").doc(String(codigo)).get();
        if (!snap.exists) return null;
        const d = snap.data();
        return { cpf: d.cpf || null, pis: d.pis || null, nomeMae: d.nomeMae || null };
      } catch (e) {
        debug?.("[saldo-sensivel] read falhou:", e?.message || e);
        return null;
      }
    };

    // Override savePJ → /pj
    window.savePJ = async function (id) {
      const u = currentUser();
      const nome = $("#pj-nome").value.trim();
      if (!nome || nome.length < 2) return toast("Informe o nome do PJ.", "danger");

      const valorRaw = $("#pj-valor").value;
      const valor = valorRaw ? Number(valorRaw) : 0;

      const dados = {
        nome,
        cnpj: $("#pj-cnpj").value.trim() || null,
        tipoServico: $("#pj-tipo").value.trim() || null,
        valorAtual: valor,
        periodicidade: $("#pj-periodicidade").value,
        dataInicio: $("#pj-data-inicio").value || null,
        dataProximaRevisao: $("#pj-data-revisao").value || null,
        status: $("#pj-status").value,
        temFerias: !!$("#pj-tem-ferias").checked,
        diasFeriasAno: $("#pj-tem-ferias").checked
          ? (Number($("#pj-dias-ano").value) || 30)
          : null,
        // inicioDireitoFerias removido — usa dataInicio do contrato como base
        inicioDireitoFerias: null,
        contratoUrl: $("#pj-contrato-url").value.trim() || null,
        atualizadoPor: u.id,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // Id da subpasta do Drive (capturado no upload) — pro link "Abrir pasta
      // deste PJ". Só seta quando há valor (não apaga o existente na edição).
      const _folderId = ($("#pj-drive-folder-id") && $("#pj-drive-folder-id").value) || "";
      if (_folderId) dados.driveFolderId = _folderId;

      try {
        if (id) {
          const existing = (state.pjs || []).find((p) => p.id === id);
          if (!existing) return toast("PJ não encontrado.", "danger");
          // Registra histórico se valor mudou
          let novoHist = existing.historicoValores || [];
          if (existing.valorAtual !== dados.valorAtual) {
            novoHist = [...novoHist, {
              valor: dados.valorAtual,
              data: new Date().toISOString().slice(0, 10),
              por: u.id,
            }];
            dados.historicoValores = novoHist;
          }
          // Log de auditoria (historico[] do PJ — agregado pela tela Auditoria).
          const acaoLog = existing.valorAtual !== dados.valorAtual ? "Alterou o valor do contrato" : "Editou o PJ";
          dados.historico = [...(existing.historico || []), { por: u.id, em: new Date().toISOString(), acao: acaoLog }];
          await db.collection("pj").doc(id).update(dados);
          Object.assign(existing, {
            ...dados,
            atualizadoEm: new Date().toISOString(),
            historicoValores: novoHist,
          });
        } else {
          const novoId = "pj-" + Date.now();
          const docData = {
            ...dados,
            criadoPor: u.id,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            historicoValores: valor > 0 ? [{
              valor,
              data: new Date().toISOString().slice(0, 10),
              por: u.id,
            }] : [],
            historico: [{ por: u.id, em: new Date().toISOString(), acao: "Criou o PJ" }],
          };
          await db.collection("pj").doc(novoId).set(docData);
          if (!state.pjs) state.pjs = [];
          state.pjs.push({
            id: novoId,
            ...dados,
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
            historicoValores: docData.historicoValores,
            historico: docData.historico,
          });
        }
        closeModal();
        toast(id ? "PJ atualizado." : "PJ cadastrado.");
        renderApp();
      } catch (err) {
        debug?.(err);
        toast("Erro ao salvar: " + err.message, "danger");
      }
    };

    // Override saveFeriasPJ → /pj (append uma baixa no array)
    window.saveFeriasPJ = async function (pjId) {
      const pj = (state.pjs || []).find((p) => p.id === pjId);
      if (!pj) return;
      const u = currentUser();
      const tipo = document.querySelector('input[name="ferias-tipo"]:checked')?.value || "gozadas";
      const dias = Number($("#ferias-dias").value);
      const data = $("#ferias-data").value || new Date().toISOString().slice(0, 10);
      const observacao = $("#ferias-obs").value.trim();
      if (!dias || dias <= 0) return toast("Informe a quantidade de dias.", "danger");

      const novo = {
        id: "fer-" + Date.now(),
        tipo,
        dias,
        data,
        observacao: observacao || null,
        criadoPor: u.id,
        criadoEm: new Date().toISOString(),
      };
      const novoFerias = [...(pj.ferias || []), novo];

      try {
        await db.collection("pj").doc(pjId).update({
          ferias: novoFerias,
          atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
          atualizadoPor: u.id,
        });
        pj.ferias = novoFerias;
        closeModal();
        toast(`Baixa de ${dias} dia${dias !== 1 ? "s" : ""} registrada.`);
        setTimeout(() => {
          if ($("#pj-ferias-list")) renderPJFeriasList(pjId);
          renderApp();
        }, 50);
      } catch (err) {
        debug?.(err);
        toast("Erro: " + err.message, "danger");
      }
    };

    // Override deletePJFerias → /pj
    window.deletePJFerias = async function (pjId, feriasId) {
      const pj = (state.pjs || []).find((p) => p.id === pjId);
      if (!pj?.ferias) return;
      const baixa = pj.ferias.find((f) => f.id === feriasId);
      if (!baixa) return;
      const desc = `${baixa.dias} dia${baixa.dias !== 1 ? "s" : ""} ${baixa.tipo === "vendidas" ? "vendidas" : "gozadas"} (${formatDate(baixa.data)})`;
      if (!(await confirmar({
        titulo: "Excluir baixa?",
        msg: `Remover a baixa de ${desc}. O saldo aumenta de volta.`,
        okLabel: "Excluir",
        perigo: true,
      }))) return;

      const novoFerias = pj.ferias.filter((f) => f.id !== feriasId);
      try {
        await db.collection("pj").doc(pjId).update({
          ferias: novoFerias,
          atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        });
        pj.ferias = novoFerias;
        toast("Baixa removida.");
        renderPJFeriasList(pjId);
        renderApp();
      } catch (err) {
        toast("Erro: " + err.message, "danger");
      }
    };

    // Override aplicarReajuste → /pj
    window.aplicarReajuste = async function (id) {
      const pj = (state.pjs || []).find((p) => p.id === id);
      if (!pj) return;
      const u = currentUser();
      const novoValor = Number($("#reaj-novo-valor").value);
      const pct = Number($("#reaj-percentual").value);
      const motivo = $("#reaj-motivo").value.trim() || `Reajuste IPCA jan/${ultimoAnoReajusteVigente()}`;

      if (!Number.isFinite(novoValor) || novoValor <= 0) return toast("Informe o novo valor.", "danger");
      if (novoValor === pj.valorAtual) return toast("Valor novo é igual ao atual.", "danger");

      const valorAntigo = pj.valorAtual;
      const novaEntrada = {
        valor: novoValor,
        data: new Date().toISOString().slice(0, 10),
        por: u.id,
        motivo,
        percentual: Number.isFinite(pct) ? pct : null,
        valorAnterior: valorAntigo,
      };
      const novoHist = [...(pj.historicoValores || []), novaEntrada];
      const novaProxRevisao = `${new Date().getFullYear() + 1}-01-15`;
      const fmt = (v) => "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const novoHistLog = [...(pj.historico || []), { por: u.id, em: new Date().toISOString(), acao: `Reajustou: ${fmt(valorAntigo)} → ${fmt(novoValor)}` }];

      try {
        await db.collection("pj").doc(id).update({
          valorAtual: novoValor,
          historicoValores: novoHist,
          historico: novoHistLog,
          dataProximaRevisao: novaProxRevisao,
          atualizadoPor: u.id,
          atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        });
        Object.assign(pj, {
          valorAtual: novoValor,
          historicoValores: novoHist,
          historico: novoHistLog,
          dataProximaRevisao: novaProxRevisao,
        });
        closeModal();
        toast(`Reajuste aplicado: ${formatMoeda(valorAntigo)} → ${formatMoeda(novoValor)}`);
        renderApp();
      } catch (err) {
        debug?.(err);
        toast("Erro: " + err.message, "danger");
      }
    };

    // Adiciona um aditivo contratual ao array /pj/{id}.aditivos
    // (arrayUnion evita conflito se 2 admins adicionarem ao mesmo tempo)
    window.adicionarAditivoPJ = async function (pjId, aditivo) {
      const u = currentUser();
      if (!pjId) throw new Error("pjId obrigatório");
      if (!aditivo?.descricao) throw new Error("Descrição obrigatória.");
      if (!aditivo?.data) throw new Error("Data obrigatória.");

      const novo = {
        id: aditivo.id || "ad-" + Date.now(),
        data: aditivo.data,
        dataVigencia: aditivo.dataVigencia || aditivo.data,
        descricao: aditivo.descricao,
        contratoUrl: aditivo.contratoUrl || null,
        criadoPor: u?.id || "?",
        criadoEm: new Date().toISOString(),
      };

      const local = (state.pjs || []).find((p) => p.id === pjId);
      const histEntry = { por: u?.id || "?", em: new Date().toISOString(), acao: "Adicionou aditivo: " + String(aditivo.descricao || "").slice(0, 80) };
      const novoHistLog = [...((local && local.historico) || []), histEntry];
      await db.collection("pj").doc(pjId).update({
        aditivos: firebase.firestore.FieldValue.arrayUnion(novo),
        historico: novoHistLog,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        atualizadoPor: u?.id || "?",
      });
      if (local) { local.aditivos = [...(local.aditivos || []), novo]; local.historico = novoHistLog; }
      return novo;
    };

    // Remove aditivo do array /pj/{id}.aditivos por id
    window.removerAditivoPJ = async function (pjId, aditivoId) {
      const u = currentUser();
      if (!pjId || !aditivoId) throw new Error("pjId e aditivoId obrigatórios");
      const local = (state.pjs || []).find((p) => p.id === pjId);
      if (!local) throw new Error("PJ não encontrado");
      const alvo = (local.aditivos || []).find((a) => a.id === aditivoId);
      if (!alvo) throw new Error("Aditivo não encontrado");

      const histEntry = { por: u?.id || "?", em: new Date().toISOString(), acao: "Removeu aditivo: " + String(alvo.descricao || "").slice(0, 80) };
      const novoHistLog = [...(local.historico || []), histEntry];
      await db.collection("pj").doc(pjId).update({
        aditivos: firebase.firestore.FieldValue.arrayRemove(alvo),
        historico: novoHistLog,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        atualizadoPor: u?.id || "?",
      });
      local.aditivos = (local.aditivos || []).filter((a) => a.id !== aditivoId);
      local.historico = novoHistLog;
    };

    // Remove um lançamento do historicoValores por índice e recalcula o
    // valorAtual pelo lançamento mais recente que sobrar (corrige erros de OCR).
    window.removerValorHistorico = async function (pjId, index) {
      const u = currentUser();
      const local = (state.pjs || []).find((p) => p.id === pjId);
      if (!local || !Array.isArray(local.historicoValores)) throw new Error("PJ ou histórico não encontrado");
      if (index < 0 || index >= local.historicoValores.length) throw new Error("Índice inválido");

      const removido = local.historicoValores[index];
      const novo = local.historicoValores.filter((_, i) => i !== index);
      // valorAtual = valor do lançamento mais recente (por data) que restou.
      let novoValorAtual = local.valorAtual;
      if (novo.length) {
        const maisRecente = [...novo].sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")))[0];
        if (maisRecente && typeof maisRecente.valor === "number") novoValorAtual = maisRecente.valor;
      }
      const valFmt = "R$ " + Number(removido?.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const novoHistLog = [...(local.historico || []), { por: u?.id || "?", em: new Date().toISOString(), acao: `Removeu ${valFmt} do histórico de valores` }];

      await db.collection("pj").doc(pjId).update({
        historicoValores: novo,
        valorAtual: novoValorAtual,
        historico: novoHistLog,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        atualizadoPor: u?.id || "?",
      });
      Object.assign(local, { historicoValores: novo, valorAtual: novoValorAtual, historico: novoHistLog });
    };

    // Override deletePJ → /pj
    window.deletePJ = async function (id) {
      const pj = (state.pjs || []).find((p) => p.id === id);
      if (!pj) return;
      if (!(await confirmar({
        titulo: "Excluir PJ?",
        msg: `Excluir "${pj.nome}". O histórico inteiro será perdido.`,
        okLabel: "Excluir",
        perigo: true,
      }))) return;
      try {
        await db.collection("pj").doc(id).delete();
        window.registrarAuditoria?.({ tipo: "pj", acao: "Excluiu o PJ", alvo: "PJ · " + (pj.nome || "?") });
        state.pjs = state.pjs.filter((p) => p.id !== id);
        closeModal();
        toast("PJ excluído.");
        renderApp();
      } catch (err) {
        toast("Erro: " + err.message, "danger");
      }
    };

    // Log global IMUTÁVEL (/auditoria) — eventos que somem do histórico normal
    // (exclusões de ocorrência/PJ). Push otimista local (aparece na Auditoria
    // na hora) + grava no Firestore. Best-effort: nunca bloqueia a ação.
    window.registrarAuditoria = async function (evt) {
      const por = (auth.currentUser && auth.currentUser.uid) || "?";
      const acao = String(evt?.acao || "").slice(0, 200);
      const tipo = evt?.tipo || "geral";
      const alvo = String(evt?.alvo || "").slice(0, 300);
      if (!Array.isArray(state.auditoriaGlobal)) state.auditoriaGlobal = [];
      state.auditoriaGlobal.unshift({ por, acao, tipo, alvo, em: new Date().toISOString() });
      try {
        await db.collection("auditoria").add({
          por, acao, tipo, alvo,
          em: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        debug?.("[auditoria] falha ao registrar:", e?.message || e);
      }
    };

    // Log de evento significativo na coleção /eventos (self-write append-only; cada um grava
    // só os próprios). Best-effort: se falhar, não atrapalha o fluxo. A rule exige por==uid,
    // em==server-time e hasOnly(por,porNome,porRole,tipo,acao,alvo). Reflete na sessão se a
    // tela de Auditoria já carregou state.eventos (só quem tem auditoria.ver).
    window.logEvento = async function (evt) {
      const por = (auth.currentUser && auth.currentUser.uid) || null;
      if (!por) return; // sem sessão, não loga
      const u = currentUser();
      const acao = String(evt?.acao || "").slice(0, 200);
      if (!acao) return;
      const doc = {
        por,
        porNome: String((u && u.nome) || "").slice(0, 120),
        porRole: String((u && u.role) || "").slice(0, 40),
        tipo: String(evt?.tipo || "geral").slice(0, 40),
        acao,
        em: firebase.firestore.FieldValue.serverTimestamp(),
      };
      const alvo = (evt && evt.alvo != null) ? String(evt.alvo).slice(0, 300) : "";
      if (alvo) doc.alvo = alvo;
      if (Array.isArray(state.eventos)) state.eventos.unshift({ ...doc, em: new Date().toISOString() });
      try { await db.collection("eventos").add(doc); }
      catch (e) { debug?.("[eventos] falha ao registrar:", e?.message || e); }
    };

    // Carrega o log global sob demanda (chamado ao abrir a tela Auditoria).
    window.carregarAuditoriaGlobal = async function () {
      const u = currentUser();
      if (!u || (u.role !== "admin" && u.role !== "rh")) return;
      try {
        const snap = await db.collection("auditoria").orderBy("em", "desc").limit(300).get();
        state.auditoriaGlobal = snap.docs.map((d) => ({ id: d.id, ...d.data(), em: tsToIso(d.data().em) }));
      } catch (e) {
        debug?.("[auditoria] load falhou:", e?.message || e);
      }
    };

    // Carrega a coleção /eventos sob demanda (junto da Auditoria). Só admin/RH (a rule gateia
    // por auditoria.ver). Ordena por em desc; limite alto pra cobrir o histórico recente.
    window.carregarEventosGlobal = async function () {
      const u = currentUser();
      if (!u || (u.role !== "admin" && u.role !== "rh")) return;
      try {
        const snap = await db.collection("eventos").orderBy("em", "desc").limit(400).get();
        state.eventos = snap.docs.map((d) => ({ id: d.id, ...d.data(), em: tsToIso(d.data().em) }));
      } catch (e) {
        debug?.("[eventos] load falhou:", e?.message || e);
        if (!Array.isArray(state.eventos)) state.eventos = [];
      }
    };

    // ===== Comunicados (Pacote Gestor) — escreve /comunicados no Firestore =====
    // Gestor com a cap (comunicados.gerenciar) cria/edita/fixa/despublica. publicadoEm
    // e server-time (a rule exige == request.time). state.comunicados e populado em
    // carregarDadosCompletos; apos cada escrita a lista e recarregada. PII zero: a
    // subcolecao leituras guarda funcionarioId; o nome e cruzado no cliente.
    async function recarregarComunicados() {
      try {
        const snap = await db.collection("comunicados").orderBy("publicadoEm", "desc").limit(200).get();
        // Subcoleções em PARALELO (era N+1 sequencial: 1 roundtrip por doc no boot).
        const arr = await Promise.all(snap.docs.map(async (d) => {
          const dat = d.data();
          const c = { id: d.id, ...dat, publicadoEm: tsToIso(dat.publicadoEm), editadoEm: tsToIso(dat.editadoEm), leituras: [] };
          try {
            const ls = await d.ref.collection("leituras").get();
            c.leituras = ls.docs.map((x) => ({ ...x.data(), em: tsToIso(x.data().em) }));
          } catch (e) { /* sem leituras visiveis */ }
          return c;
        }));
        state.comunicados = arr;
      } catch (e) {
        debug?.("[comunicados] load:", e?.message || e);
        state.comunicados = state.comunicados || [];
      }
    }
    window.recarregarComunicados = recarregarComunicados;

    // Espelho de ponto (gestor): lê banco-horas-self/{codigo} de um liderado, sob demanda.
    // A rule libera admin/RH sempre; líder por funcionarioTurno e supervisor por funcionarioId
    // (denormalizados no doc pelo pipeline). Retorna os dados ou null; erro (permission) propaga.
    window.carregarEspelhoFuncionario = async function (codigo) {
      const snap = await db.collection("banco-horas-self").doc(String(codigo)).get();
      return snap.exists ? snap.data() : null;
    };

    window.criarComunicado = async function (dados) {
      const u = currentUser();
      const tipo = dados.tipo === "aviso" ? "aviso" : "comunicado";
      // Aviso interno é sempre Todos — reforça no backend caso a UI escape.
      const seg = tipo === "aviso" ? { tipo: "todos", valores: [] } : (dados.segmento || { tipo: "todos", valores: [] });
      const doc = {
        titulo: String(dados.titulo || "").slice(0, 140),
        corpo: String(dados.corpo || ""),
        tipo,
        segmento: seg,
        requerConfirmacao: !!dados.requerConfirmacao,
        fixado: !!dados.fixado,
        ativo: true,
        anexo: (dados.anexo && ehUrlSegura(dados.anexo.url)) ? dados.anexo : null,
        imagem: (typeof dados.imagem === "string" && dados.imagem.indexOf("data:image/") === 0) ? dados.imagem : null,
        alcanceEstimado: Number(dados.alcanceEstimado) || 0,
        autorUid: (auth.currentUser && auth.currentUser.uid) || u?.id || null,
        autorNome: u?.nome || "GP",
        publicadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        editadoEm: null,
        editadoPor: null,
      };
      try {
        await db.collection("comunicados").add(doc);
        window.registrarAuditoria?.({ tipo: "comunicado", acao: tipo === "aviso" ? "Publicou aviso interno" : "Publicou comunicado", alvo: doc.titulo });
        await recarregarComunicados();
        closeModal();
        toast("Comunicado publicado.");
        renderApp();
      } catch (e) {
        debug?.("[comunicado criar]", e?.message || e);
        toast("Erro ao publicar: " + e.message, "danger");
      }
    };

    window.editarComunicado = async function (id, patch) {
      const u = currentUser();
      const tipo = patch.tipo === "aviso" ? "aviso" : "comunicado";
      const up = {
        titulo: String(patch.titulo || "").slice(0, 140),
        corpo: String(patch.corpo || ""),
        tipo,
        segmento: tipo === "aviso" ? { tipo: "todos", valores: [] } : (patch.segmento || { tipo: "todos", valores: [] }),
        requerConfirmacao: !!patch.requerConfirmacao,
        fixado: !!patch.fixado,
        imagem: (typeof patch.imagem === "string" && patch.imagem.indexOf("data:image/") === 0) ? patch.imagem : null,
        alcanceEstimado: Number(patch.alcanceEstimado) || 0,
        editadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        editadoPor: (auth.currentUser && auth.currentUser.uid) || u?.id || null,
      };
      try {
        await db.collection("comunicados").doc(id).update(up);
        window.registrarAuditoria?.({ tipo: "comunicado", acao: "Editou comunicado", alvo: up.titulo });
        await recarregarComunicados();
        closeModal();
        toast("Comunicado atualizado.");
        renderApp();
      } catch (e) {
        debug?.("[comunicado editar]", e?.message || e);
        toast("Erro ao salvar: " + e.message, "danger");
      }
    };

    window.fixarComunicado = async function (id, fixado) {
      try {
        await db.collection("comunicados").doc(id).update({ fixado: !!fixado });
        window.registrarAuditoria?.({ tipo: "comunicado", acao: fixado ? "Fixou comunicado" : "Desafixou comunicado", alvo: id });
        await recarregarComunicados();
        toast(fixado ? "Comunicado fixado." : "Comunicado desafixado.");
        renderApp();
      } catch (e) {
        toast("Erro: " + e.message, "danger");
      }
    };

    window.despublicarComunicado = async function (id) {
      try {
        await db.collection("comunicados").doc(id).update({ ativo: false });
        window.registrarAuditoria?.({ tipo: "comunicado", acao: "Despublicou comunicado", alvo: id });
        await recarregarComunicados();
        closeModal();
        toast("Comunicado despublicado.");
        renderApp();
      } catch (e) {
        toast("Erro: " + e.message, "danger");
      }
    };

    // App do colaborador (fase futura): registra leitura/ciencia. set-once (nao
    // sobrescreve o 'em' da 1a vez). A rule amarra ao segmento do pai.
    window.registrarLeitura = async function (comunicadoId, opts = {}) {
      const uid = auth.currentUser && auth.currentUser.uid;
      if (!uid) return { ok: false, err: "sem sessao" };
      const u = currentUser();
      try {
        const ref = db.collection("comunicados").doc(comunicadoId).collection("leituras").doc(uid);
        const snap = await ref.get();
        if (snap.exists) return { ok: true };
        await ref.set({
          uid,
          funcionarioId: (u && u.funcionarioId) || null,
          confirmado: !!opts.confirmar,
          em: firebase.firestore.FieldValue.serverTimestamp(),
          userAgent: String(navigator.userAgent || "").slice(0, 200),
        });
        window.logEvento?.({ tipo: "ciencias", acao: opts.confirmar ? "Confirmou ciência de comunicado" : "Visualizou comunicado", alvo: ((state.comunicadosColab || []).find((x) => x.id === comunicadoId)?.titulo || comunicadoId) });
        window.gamiClaim?.("comunicado", comunicadoId, "Comunicado: " + ((state.comunicadosColab || []).find((x) => x.id === comunicadoId)?.titulo || "")); // pos-acao, nunca bloqueia
        return { ok: true };
      } catch (e) {
        return { ok: false, err: e.message };
      }
    };

    // App do colaborador: registra que VISUALIZOU o comunicado (abriu o post). Sem ciência,
    // sem toast — set-once (confirmado:false). Conta como "visto" no acompanhamento do gestor.
    window.registrarVisualizacaoComunicado = async function (comunicadoId) {
      const c = (state.comunicadosColab || []).find((x) => x.id === comunicadoId);
      if (c && c.minhaLeitura) return { ok: true }; // já visto, não reescreve
      // Otimista: marca "visto" na hora (set síncrono antes do await), pra refletir no feed
      // imediatamente mesmo se o write demorar OU não houver sessão (prévia). A persistência
      // de verdade segue no registrarLeitura; sem sessão fica só local na sessão.
      if (c) c.minhaLeitura = { confirmado: false, em: new Date().toISOString() };
      return await window.registrarLeitura(comunicadoId, { confirmar: false });
    };

    // App do colaborador: confirma ciência de um comunicado (Li e estou ciente).
    // set-once via registrarLeitura; reflete no state.comunicadosColab e re-renderiza.
    window.confirmarCienciaComunicado = async function (comunicadoId) {
      const r = await window.registrarLeitura(comunicadoId, { confirmar: true });
      if (r && r.ok) {
        const c = (state.comunicadosColab || []).find((x) => x.id === comunicadoId);
        if (c && !c.minhaLeitura) c.minhaLeitura = { confirmado: true, em: new Date().toISOString() };
        toast("Ciência registrada.");
        renderApp();
      } else {
        toast("Não consegui registrar: " + ((r && r.err) || "?"), "danger");
      }
      return r;
    };

    // ===== Documentos institucionais (Pacote Gestor) — escreve /documentos =====
    // criadoEm server-time (rule exige == request.time); escopo institucional sem
    // funcionarioId. novaVersao = unica forma de trocar anexo em doc publicado+assinatura
    // (versao incrementa em 1). Subcoleções amarradas ao pai e com schema hasOnly.
    async function recarregarDocumentos() {
      try {
        const snap = await db.collection("documentos").orderBy("criadoEm", "desc").limit(200).get();
        // Subcoleções em PARALELO (era N+1 sequencial COM 2 awaits em série por doc).
        const arr = await Promise.all(snap.docs.map(async (dd) => {
          const dat = dd.data();
          const o = { id: dd.id, ...dat, criadoEm: tsToIso(dat.criadoEm), publicadoEm: tsToIso(dat.publicadoEm), versaoEm: tsToIso(dat.versaoEm), assinaturas: [], leituras: [] };
          await Promise.all([
            dd.ref.collection("assinaturas").get().then((asn) => { o.assinaturas = asn.docs.map((x) => ({ ...x.data(), em: tsToIso(x.data().em) })); }).catch(() => { /* sem acesso */ }),
            dd.ref.collection("leituras").get().then((lt) => { o.leituras = lt.docs.map((x) => ({ ...x.data(), em: tsToIso(x.data().em) })); }).catch(() => { /* sem acesso */ }),
          ]);
          return o;
        }));
        state.documentos = arr;
      } catch (e) { debug?.("[documentos] load:", e?.message || e); state.documentos = state.documentos || []; }
    }
    window.recarregarDocumentos = recarregarDocumentos;

    // ===== ocorrencias-auto (TESTE / sandbox) — conferência pelo RH =====
    // Coleção SEPARADA da 'ocorrencias' de produção (zero impacto no fluxo manual). O conteúdo
    // é gravado só pelo pipeline (Admin SDK). Aqui admin/RH apenas LÊ e CONFERE: muda status
    // para 'conferida' e faz APPEND no historico (quem/quando). Carga preguiçosa (lazy).
    async function recarregarOcorrenciasAuto() {
      try {
        const u = currentUser();
        let q = db.collection("ocorrencias-auto");
        // Líder só pode LER (regra) as do próprio turno — a consulta precisa filtrar por turno,
        // senão o get() da coleção inteira é rejeitado. Admin/RH leem tudo.
        if (u && u.role === "lider" && u.turno != null) q = q.where("turno", "==", u.turno);
        const snap = await q.limit(1000).get();
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((o) => noEscopoAuto(u, o));
        arr.sort((a, b) => String(b.dataIso || "").localeCompare(String(a.dataIso || "")));
        state.ocorrenciasAuto = arr;
      } catch (e) {
        debug?.("[ocorrencias-auto] carregar:", e?.message || e);
        state.ocorrenciasAuto = state.ocorrenciasAuto || [];
        toast?.("Não consegui carregar as ocorrências automáticas.", "danger");
      }
    }
    window.recarregarOcorrenciasAuto = recarregarOcorrenciasAuto;

    // ===== monitor/wkradar — saúde do pipeline (somente leitura, admin/RH) =====
    // Doc gravado pelo servidor a cada run. Converte os Timestamps p/ ISO e expõe no state.
    window.carregarMonitorPipeline = async function () {
      try {
        const snap = await db.collection("monitor").doc("wkradar").get();
        if (!snap.exists) { state.monitorPipeline = { vazio: true }; return; }
        const d = snap.data();
        state.monitorPipeline = {
          ...d,
          checadoEm: tsToIso(d.checadoEm),
          fontes: Array.isArray(d.fontes) ? d.fontes.map((f) => ({ ...f, atualizadoEm: tsToIso(f.atualizadoEm) })) : [],
        };
      } catch (e) {
        debug?.("[monitor] carregar:", e?.message || e);
        state.monitorPipeline = { erro: true };
      }
    };


    // Transições do fluxo RH→Líder (coleção ocorrencias-auto). Cada uma muda só status + faz
    // APPEND de 1 no historico (a rule exige hasOnly(status,historico) e historico +1).
    //   validar:   rh_confere -> com_lider   (RH/admin)
    //   dispensar: rh_confere -> dispensada  (RH/admin)
    //   confirmar: com_lider  -> confirmada  (líder do turno OU RH/admin)
    // extras (opcional): { acaoId, acaoLabel, observacao } — a DESTINAÇÃO escolhida
    // pelo líder ao confirmar (mesma liturgia da ocorrência manual). Vai no doc
    // (acao/observacao) e na entrada do histórico (destino/obs).
    async function _transicaoOca(id, novoStatus, acao, msgOk, extras) {
      const u = currentUser();
      const uid = (auth.currentUser && auth.currentUser.uid) || null;
      const o = (state.ocorrenciasAuto || []).find((x) => x.id === id);
      if (!o) return;
      const entrada = { acao, por: uid, porNome: u?.nome || "", emIso: new Date().toISOString() };
      if (extras?.acaoLabel) entrada.destino = extras.acaoLabel;
      if (extras?.observacao) entrada.obs = extras.observacao;
      if (extras?.alterou) entrada.alterou = extras.alterou; // resumo da correção (Tipo/Duração de→para)
      const novoHist = [...(Array.isArray(o.historico) ? o.historico : []), entrada];
      const patch = { status: novoStatus, historico: novoHist };
      if (extras?.acaoId) patch.acao = extras.acaoId;
      if (extras?.observacao) patch.observacao = extras.observacao;
      // Correção do RH: reclassifica tipo/duracaoFmt no MESMO update. A regra só aceita
      // fora de rh_confere (novoStatus != rh_confere), pra não expor a edição ao reprocessamento do WK.
      if (extras?.tipo != null) patch.tipo = extras.tipo;
      if (extras?.duracaoFmt != null) patch.duracaoFmt = extras.duracaoFmt;
      // A revisao humana da RH resolve a incerteza do sistema (999-detector): ao SAIR de
      // rh_confere, zera classificacaoIncerta pra o lider nao ver "Conferir" numa ocorrencia
      // ja examinada e ajustada. Mantem motivoIncerteza/historico como registro do que o
      // sistema pensou. So dispara saindo de rh_confere (ramo RH/admin da regra), nunca no
      // confirmar do lider/supervisor (com_lider -> confirmada, ramo sem esse campo).
      if (["rh_confere", "aguardando_conferencia"].includes(o.status) && o.classificacaoIncerta === true) patch.classificacaoIncerta = false;
      try {
        await db.collection("ocorrencias-auto").doc(id).update(patch);
        Object.assign(o, patch); // otimista local
        window.registrarAuditoria?.({ tipo: "ocorrencia-auto", acao: "Ocorrência automática: " + acao + (extras?.acaoLabel ? ` (${extras.acaoLabel})` : ""), alvo: `${o.nome || ""} · ${o.data || ""} · ${o.tipo || ""}` });
        toast?.(msgOk);
        renderApp();
      } catch (e) {
        debug?.("[ocorrencias-auto] " + acao + ":", e?.message || e);
        toast?.("Erro: " + (e?.message || e), "danger");
        renderApp(); // re-render reabilita o botão
      }
    }
    window.validarOcorrenciaAuto   = (id) => _transicaoOca(id, "com_lider",  "validou",   "Enviada para o líder.");
    // extras.observacao = motivo da dispensa (obrigatório na UI; a regra já aceita observacao)
    window.dispensarOcorrenciaAuto = (id, extras) => _transicaoOca(id, "dispensada", "dispensou", "Ocorrência dispensada.", extras);
    window.confirmarOcorrenciaAuto = (id, extras) => _transicaoOca(id, "confirmada", "confirmou", "Conferência confirmada.", extras);
    // Correção do RH: reclassifica tipo/duracaoFmt E envia ao líder num único update (a regra
    // exige sair de rh_confere; editar-e-ficar seria revertido pelo pipeline). extras:
    // { tipo?, duracaoFmt?, observacao (motivo, obrigatório na UI), alterou (resumo p/ trilha) }.
    window.corrigirOcorrenciaAuto  = (id, extras) => _transicaoOca(id, "com_lider", "corrigiu", "Correção enviada ao líder.", extras);

    // Lançamento na folha (espelho do fluxo manual, cap ocorrencias.lancar): marca ou
    // desfaz numa CONFIRMADA sem mexer no status. A regra trava no trio + historico.
    async function _lancamentoOca(id, marcar) {
      const u = currentUser();
      const uid = (auth.currentUser && auth.currentUser.uid) || null;
      const o = (state.ocorrenciasAuto || []).find((x) => x.id === id);
      if (!o) return;
      const entrada = { acao: marcar ? "lancou" : "desfezLancamento", por: uid, porNome: u?.nome || "", emIso: new Date().toISOString() };
      const patch = marcar
        ? { lancada: true, lancadoEm: new Date().toISOString().slice(0, 10), lancadoPor: uid, historico: [...(Array.isArray(o.historico) ? o.historico : []), entrada] }
        : { lancada: false, lancadoEm: null, lancadoPor: null, historico: [...(Array.isArray(o.historico) ? o.historico : []), entrada] };
      try {
        await db.collection("ocorrencias-auto").doc(id).update(patch);
        Object.assign(o, patch);
        window.registrarAuditoria?.({ tipo: "ocorrencia-auto", acao: marcar ? "Ocorrência automática: marcou como lançada" : "Ocorrência automática: desfez lançamento", alvo: `${o.nome || ""} · ${o.data || ""} · ${o.tipo || ""}` });
        toast?.(marcar ? "Marcada como lançada." : "Lançamento desfeito.");
        renderApp();
      } catch (e) {
        debug?.("[ocorrencias-auto] lancamento:", e?.message || e);
        toast?.("Erro: " + (e?.message || e), "danger");
        renderApp();
      }
    }
    window.lancarOcorrenciaAuto = (id) => _lancamentoOca(id, true);
    window.desfazerLancamentoAuto = (id) => _lancamentoOca(id, false);

    // config/aniversariantes (sem PII: nome/dia/mes). Leitura autenticada (rule config/{doc}).
    // RETRY (paridade com verificarTermoAdesao): no cold start do PWA o Firestore rejeita as
    // primeiras leituras com "client is offline"; sem retry, os recem-chegados nunca chegavam e
    // o card de boas-vindas da home nao nascia. So a ULTIMA falha zera o state (uma falha
    // intermediaria nao apaga o que ja tinha). Devolve o dado carregado (ou null).
    window.carregarAniversariantes = async function (tentativas) {
      const n = Math.max(1, tentativas || 1);
      for (let i = 0; i < n; i++) {
        try {
          const snap = await db.collection("config").doc("aniversariantes").get();
          state.aniversariantes = snap.exists ? snap.data() : null;
          return state.aniversariantes;
        } catch (e) {
          debug?.("[aniversariantes] carregar (tentativa " + (i + 1) + "):", e?.message || e);
          if (i < n - 1) await new Promise((r) => setTimeout(r, 1200));
        }
      }
      state.aniversariantes = null;
      return null;
    };

    // ===== PESQUISA DE CLIMA (cliente) — regras /pesquisasClima NO AR (gate Fable).
    // Anonimato ESTRUTURAL: a resposta anonima e doc ORFAO (sem uid, sem tempo). Batch
    // OBRIGATORIO recibo+resposta+contador (a resposta prova elegibilidade so pelo recibo
    // do mesmo batch). Contador com FieldValue.increment(1) (corrida). ZERO logEvento no
    // fluxo de resposta (senao deanonimiza via /eventos, ressalva Fable). =====
    const _FV = firebase.firestore.FieldValue;
    const _clima = () => db.collection("pesquisasClima");

    // Normaliza a janela num objeto de config (muta e devolve): 'inicio' e cosmetico
    // (string ISO curta pro cabecalho); 'fim' e GATE FUNCIONAL do recibo (a rule so deixa
    // o recibo nascer se request.time < p.fim), entao TEM que virar Timestamp fim-do-dia —
    // uma string deixaria a comparacao da rule em erro e NEGARIA toda resposta.
    function _climaJanela(o) {
      if (!o) return o;
      if (typeof o.inicio === "string") o.inicio = o.inicio.slice(0, 10);
      if (typeof o.fim === "string") {
        const d = new Date(o.fim.slice(0, 10) + "T23:59:59");
        if (isNaN(d)) delete o.fim; else o.fim = firebase.firestore.Timestamp.fromDate(d);
      }
      return o;
    }

    window.criarPesquisaClima = async function (cfg) {
      const uid = auth.currentUser && auth.currentUser.uid;
      const data = {
        titulo: String(cfg.titulo || "").slice(0, 120), anonima: !!cfg.anonima, status: "rascunho",
        dimensoes: Array.isArray(cfg.dimensoes) ? cfg.dimensoes.slice(0, 12) : [],
        incluiEnps: cfg.incluiEnps !== false, incluiAberta: cfg.incluiAberta !== false,
        publico: cfg.publico && cfg.publico.tipo ? cfg.publico : { tipo: "todos", valores: [] },
        elegiveis: Number(cfg.elegiveis) || 0,
        criadoPor: uid, criadoEm: _FV.serverTimestamp(),
      };
      if (cfg.inicio) data.inicio = String(cfg.inicio);
      if (cfg.fim) data.fim = String(cfg.fim);
      _climaJanela(data);
      const ref = await _clima().add(data);
      return ref.id;
    };
    // Rascunho: a regra aceita editar tudo menos criadoPor/criadoEm; passe o patch de config.
    window.editarPesquisaClima = async function (pid, patch) {
      await _clima().doc(pid).update(_climaJanela({ ...patch }));
    };
    // Abrir: rascunho -> aberta criando o contador no MESMO batch (a regra exige).
    window.abrirPesquisaClima = async function (pid) {
      const uid = auth.currentUser && auth.currentUser.uid;
      const b = db.batch();
      b.update(_clima().doc(pid), { status: "aberta", abertaEm: _FV.serverTimestamp(), abertaPor: uid });
      b.set(_clima().doc(pid).collection("meta").doc("contador"), { n: 0 });
      await b.commit();
    };
    window.encerrarPesquisaClima = async function (pid) {
      const uid = auth.currentUser && auth.currentUser.uid;
      await _clima().doc(pid).update({ status: "encerrada", encerradaEm: _FV.serverTimestamp(), encerradaPor: uid });
    };
    // Ainda sem UI (o v1 só encerra manual); mantida pelo ramo 2 da regra (aberta -> estender
    // fim). Passa por _climaJanela pra NUNCA gravar fim string (quebraria request.time < p.fim).
    window.estenderPesquisaClima = async function (pid, fim) { await _clima().doc(pid).update(_climaJanela({ fim })); };
    window.excluirPesquisaClimaRascunho = async function (pid) { await _clima().doc(pid).delete(); };

    // Colaborador responde: batch recibo + resposta (anonima=auto-id sem identidade; senao uid)
    // + contador increment(1). payload: { notas: {perguntaId:1..5}, enps?, comentario? }.
    window.responderPesquisaClima = async function (pid, anonima, payload) {
      const uid = auth.currentUser && auth.currentUser.uid;
      const p = _clima().doc(pid);
      const b = db.batch();
      b.set(p.collection("recibos").doc(uid), { em: _FV.serverTimestamp() });
      const notas = payload.notas || {};
      if (anonima) {
        const r = { notas };
        if (payload.enps != null) r.enps = payload.enps;
        if (payload.comentario) r.comentario = String(payload.comentario).slice(0, 1000);
        b.set(p.collection("respostas").doc(), r); // auto-id, SEM uid e SEM tempo
      } else {
        const r = { uid, notas, respondidoEm: _FV.serverTimestamp() };
        if (payload.enps != null) r.enps = payload.enps;
        if (payload.comentario) r.comentario = String(payload.comentario).slice(0, 1000);
        b.set(p.collection("respostas").doc(uid), r);
      }
      b.update(p.collection("meta").doc("contador"), { n: _FV.increment(1) });
      await b.commit();
      // Proposital: NENHUM registrarAuditoria/logEvento aqui (anonimato).
      // Gamificacao: o ponto NUNCA nasce neste batch (a regra exige recibo PRE-existente;
      // no mesmo commit, o par de timestamps desanonimizaria a resposta -- gate Fable).
      // Fica a pendencia LOCAL: o catch-up reivindica na proxima abertura, mesmo que a
      // pesquisa ja tenha encerrado (a lista do colab so ve abertas).
      try {
        const pend = JSON.parse(localStorage.getItem("gamiPesqPend") || "[]");
        if (!pend.includes(pid)) { pend.push(pid); localStorage.setItem("gamiPesqPend", JSON.stringify(pend)); }
      } catch { /* sem espaco/lixo local: o catch-up das abertas cobre */ }
    };

    // Gestor: todas as pesquisas (config).
    window.carregarPesquisasClimaGestor = async function () {
      try {
        const snap = await _clima().orderBy("criadoEm", "desc").get();
        state.pesquisasClima = snap.docs.map((d) => ({ id: d.id, ...d.data(), criadoEm: tsToIso(d.data().criadoEm) }));
      } catch (e) { debug?.("[clima] gestor:", e?.message || e); state.pesquisasClima = []; }
      return state.pesquisasClima;
    };
    window.carregarProgressoClima = async function (pid) {
      try { const c = await _clima().doc(pid).collection("meta").doc("contador").get(); return c.exists ? (c.data().n || 0) : 0; }
      catch { return 0; }
    };
    // Colaborador: pesquisas ABERTAS do segmento (3 queries + dedupe) + se ja respondeu (recibo).
    window.carregarPesquisasClimaColab = async function () {
      const uid = auth.currentUser && auth.currentUser.uid;
      const f = (state.funcionarios || [])[0] || null;
      const meuTurno = f ? f.turno : null, meuSetor = f ? f.setor : null;
      const col = _clima();
      const qs = [col.where("status", "==", "aberta").where("publico.tipo", "==", "todos")];
      if (meuTurno != null) qs.push(col.where("status", "==", "aberta").where("publico.tipo", "==", "turno").where("publico.valores", "array-contains", meuTurno));
      if (meuSetor) qs.push(col.where("status", "==", "aberta").where("publico.tipo", "==", "setor").where("publico.valores", "array-contains", meuSetor));
      let algum = false;
      const snaps = await Promise.all(qs.map((q) => q.get().then((s) => { algum = true; return s; }).catch((e) => { debug?.("[clima] colab q:", e?.message || e); return null; })));
      // Total failure (cold start offline) -> lanca pra o loaderHome tentar de novo, sem
      // zerar o cache. Falha PARCIAL (um segmento) segue tolerada: dedupe do que veio.
      if (qs.length && !algum) throw new Error("clima offline");
      const seen = {}, arr = [];
      for (const sn of snaps) { if (!sn) continue; for (const d of sn.docs) { if (seen[d.id]) continue; seen[d.id] = 1; arr.push({ id: d.id, ...d.data() }); } }
      await Promise.all(arr.map(async (p) => { try { const r = await col.doc(p.id).collection("recibos").doc(uid).get(); p.jaRespondi = r.exists; } catch { p.jaRespondi = false; } }));
      state.pesquisasClimaColab = arr;
      return arr;
    };
    // Gestor: resultados. Identificada le ao vivo; anonima so encerrada + n>=5 (a regra nega
    // antes -> permission-denied vira "selado"). Agregacao defensiva fica na UI.
    window.carregarResultadosClima = async function (pid) {
      const contador = await window.carregarProgressoClima(pid);
      try {
        const snap = await _clima().doc(pid).collection("respostas").get();
        return { selado: false, contador, respostas: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
      } catch (e) {
        return { selado: true, contador, respostas: [], motivo: (e && (e.code || e.message)) || "denied" };
      }
    };

    // ===== AVALIACAO DE DESEMPENHO (cliente). v1 gestor+auto; regras deployadas
    // (tests/avaliacao-desempenho-rules.test.mjs). Id da avaliacao e DETERMINISTICO
    // "{papel}_{avaliadorUid}_{alvoUid}" (re-salvar nao duplica). O colaborador so
    // ve o proprio resultado com o ciclo ENCERRADO (decisao William). =====
    const _dsmp = () => db.collection("avaliacaoCiclos");

    // periodoInicio/periodoFim TEM que virar Timestamp (a regra compara
    // request.time < periodoFim; string deixaria a comparacao em erro e NEGARIA
    // toda avaliacao). Inicio = 00:00 local, fim = fim-do-dia local.
    function _dsmpJanela(o) {
      if (!o) return o;
      if (typeof o.periodoInicio === "string") {
        const d = new Date(o.periodoInicio.slice(0, 10) + "T00:00:00");
        if (isNaN(d)) delete o.periodoInicio; else o.periodoInicio = firebase.firestore.Timestamp.fromDate(d);
      }
      if (typeof o.periodoFim === "string") {
        const d = new Date(o.periodoFim.slice(0, 10) + "T23:59:59");
        if (isNaN(d)) delete o.periodoFim; else o.periodoFim = firebase.firestore.Timestamp.fromDate(d);
      }
      return o;
    }

    window.criarCicloDesempenho = async function (cfg) {
      const uid = auth.currentUser && auth.currentUser.uid;
      const data = _dsmpJanela({
        nome: String(cfg.nome || "").slice(0, 120),
        modalidade: cfg.modalidade === "auto" ? "auto" : "gestor",
        escalaMax: Math.min(10, Math.max(3, Math.round(Number(cfg.escalaMax) || 5))),
        competencias: Array.isArray(cfg.competencias) ? cfg.competencias.slice(0, 12) : [],
        publico: cfg.publico && cfg.publico.tipo ? cfg.publico : { tipo: "todos", valores: [] },
        periodoInicio: cfg.periodoInicio, periodoFim: cfg.periodoFim,
        status: "rascunho", criadoPor: uid, criadoEm: _FV.serverTimestamp(),
      });
      const ref = await _dsmp().add(data);
      return ref.id;
    };
    window.editarCicloDesempenho = async function (cid, patch) {
      await _dsmp().doc(cid).update(_dsmpJanela({ ...patch }));
    };
    window.ativarCicloDesempenho = async function (cid) {
      const uid = auth.currentUser && auth.currentUser.uid;
      await _dsmp().doc(cid).update({ status: "ativo", ativadoEm: _FV.serverTimestamp(), ativadoPor: uid });
    };
    window.estenderCicloDesempenho = async function (cid, fim) {
      await _dsmp().doc(cid).update(_dsmpJanela({ periodoFim: fim }));
    };
    window.encerrarCicloDesempenho = async function (cid) {
      const uid = auth.currentUser && auth.currentUser.uid;
      await _dsmp().doc(cid).update({ status: "encerrado", encerradoEm: _FV.serverTimestamp(), encerradoPor: uid });
    };
    window.excluirCicloDesempenhoRascunho = async function (cid) { await _dsmp().doc(cid).delete(); };

    // Salva (rascunho) ou conclui uma avaliacao. O alvo e o FUNCIONARIO (alvoFid); id
    // deterministico "{papel}_{alvoFid}" = UMA oficial de gestor + UMA auto por alvo
    // (getDoc direto, sem query). payload: { notas: {compId: 1..escalaMax},
    // comentarios?: {compId: string}, feedbackGeral?: string }. atualizadoEm SEMPRE
    // serverTimestamp (a regra exige == request.time). Concluida e imutavel na regra.
    window.salvarAvaliacaoDesempenho = async function (cicloId, papel, alvoFid, payload, concluir) {
      const uid = auth.currentUser && auth.currentUser.uid;
      if (!uid) throw new Error("sem sessao");
      const id = `${papel}_${alvoFid}`;
      const data = {
        alvoFid, avaliadorUid: uid, papel,
        notas: (payload && payload.notas) || {},
        status: concluir ? "concluida" : "rascunho",
        atualizadoEm: _FV.serverTimestamp(),
      };
      if (payload && payload.comentarios && Object.keys(payload.comentarios).length) data.comentarios = payload.comentarios;
      if (payload && payload.feedbackGeral) data.feedbackGeral = String(payload.feedbackGeral).slice(0, 2000);
      await _dsmp().doc(cicloId).collection("avaliacoes").doc(id).set(data);
      return id;
    };

    // Gestor/GP: todos os ciclos.
    window.carregarCiclosDesempenhoGestor = async function () {
      try {
        const snap = await _dsmp().orderBy("criadoEm", "desc").get();
        state.ciclosDesempenho = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (e) { debug?.("[desemp] gestor:", e?.message || e); state.ciclosDesempenho = []; }
      return state.ciclosDesempenho;
    };
    // Colaborador: ciclos ATIVOS (autoavaliar) + ENCERRADOS (resultado) do segmento.
    // 2 status x 3 segmentos = ate 6 queries (in + array-contains nao combinam com
    // seguranca; explicito e barato). Dedupe por id.
    window.carregarCiclosDesempenhoColab = async function () {
      const f = (state.funcionarios || [])[0] || null;
      const meuTurno = f ? f.turno : null, meuSetor = f ? f.setor : null;
      const col = _dsmp();
      const qs = [];
      for (const st of ["ativo", "encerrado"]) {
        qs.push(col.where("status", "==", st).where("publico.tipo", "==", "todos"));
        if (meuTurno != null) qs.push(col.where("status", "==", st).where("publico.tipo", "==", "turno").where("publico.valores", "array-contains", meuTurno));
        if (meuSetor) qs.push(col.where("status", "==", st).where("publico.tipo", "==", "setor").where("publico.valores", "array-contains", meuSetor));
      }
      let algum = false;
      const snaps = await Promise.all(qs.map((q) => q.get().then((s) => { algum = true; return s; }).catch((e) => { debug?.("[desemp] colab q:", e?.message || e); return null; })));
      if (qs.length && !algum) throw new Error("desempenho offline"); // total failure -> loaderHome tenta de novo
      const seen = {}, arr = [];
      for (const sn of snaps) { if (!sn) continue; for (const d of sn.docs) { if (seen[d.id]) continue; seen[d.id] = 1; arr.push({ id: d.id, ...d.data() }); } }
      // Enriquece: nos ativos de modalidade 'auto', a MINHA auto (convite some quando
      // concluida); nos encerrados recentes (60 dias), o resultado do gestor (a regra
      // so libera concluida + encerrado; negado/inexistente = sem convite).
      const meuFid = f ? f.id : null;
      if (meuFid) {
        const agora = Date.now();
        await Promise.all(arr.map(async (c) => {
          try {
            if (c.status === "ativo" && c.modalidade === "auto") {
              const d = await col.doc(c.id).collection("avaliacoes").doc(`auto_${meuFid}`).get();
              c.minhaAuto = d.exists ? { id: d.id, ...d.data() } : null;
            } else if (c.status === "encerrado") {
              const em = c.encerradoEm && typeof c.encerradoEm.toDate === "function" ? c.encerradoEm.toDate().getTime() : agora;
              if (agora - em <= 60 * 864e5) {
                const d = await col.doc(c.id).collection("avaliacoes").doc(`gestor_${meuFid}`).get();
                c.meuResultado = d.exists ? { id: d.id, ...d.data() } : null;
                if (c.meuResultado) {
                  const a = await col.doc(c.id).collection("avaliacoes").doc(`auto_${meuFid}`).get().catch(() => null);
                  c.minhaAuto = a && a.exists ? { id: a.id, ...a.data() } : null;
                }
              }
            }
          } catch (e) { debug?.("[desemp] colab enrich:", e?.code || e?.message); }
        }));
      }
      state.ciclosDesempenhoColab = arr;
      return arr;
    };
    // Colaborador: a propria auto (autor le sempre) + o resultado do gestor sobre si
    // (a regra so libera concluida com ciclo ENCERRADO -> permission-denied vira null,
    // que a UI mostra como "disponivel no fechamento do ciclo").
    window.carregarMinhaAvaliacaoDesempenho = async function (cicloId, meuFid) {
      const col = _dsmp().doc(cicloId).collection("avaliacoes");
      let auto = null, doGestor = null;
      try { const d = await col.doc(`auto_${meuFid}`).get(); if (d.exists) auto = { id: d.id, ...d.data() }; } catch {}
      try { const d = await col.doc(`gestor_${meuFid}`).get(); if (d.exists) doGestor = { id: d.id, ...d.data() }; }
      catch (e) { debug?.("[desemp] resultado selado:", e?.code || e?.message); }
      return { auto, doGestor };
    };
    // Gestor: a avaliacao OFICIAL de um alvo (pra ver/continuar o rascunho) e a auto
    // CONCLUIDA do alvo (comparativo; rascunho alheio/fora do escopo nega -> null).
    window.carregarAvaliacaoDoAlvo = async function (cicloId, alvoFid, papel) {
      try {
        const d = await _dsmp().doc(cicloId).collection("avaliacoes").doc(`${papel}_${alvoFid}`).get();
        return d.exists ? { id: d.id, ...d.data() } : null;
      } catch { return null; }
    };
    // GP: todas as avaliacoes do ciclo (acompanhamento/resultados).
    window.carregarAvaliacoesCicloGP = async function (cicloId) {
      try {
        const snap = await _dsmp().doc(cicloId).collection("avaliacoes").get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (e) { debug?.("[desemp] gp:", e?.message || e); return []; }
    };

    // ===== Aniversario (reacao coracao "Parabenizar" no card da home) =====
    // Coleção muralAniversario/{postId}: doc pai NUNCA é escrito pelo cliente (rule write:false);
    // só a subcoleção reacoes/{uid} vale. Tudo LAZY (só ao renderizar a home), fora do
    // boot/carregarDadosCompletos. Rules já deployadas (tests/mural-rules.test.mjs).

    // Lê só as reações do post. minhaReacao = existe reacoes/{meuUid}.
    window.carregarReacoesAniversario = async function (postId) {
      const uid = auth.currentUser && auth.currentUser.uid;
      const base = db.collection("muralAniversario").doc(postId);
      try {
        const reacoesSnap = await base.collection("reacoes").get();
        const reacoes = reacoesSnap.docs.map((d) => ({ uid: d.data().uid || d.id, nome: d.data().autorNome || "" }));
        const minhaReacao = !!(uid && reacoes.some((r) => r.uid === uid));
        const out = { reacoes, minhaReacao, total: reacoes.length };
        // Cache anti-flicker (auditoria WKRADAR 2026-07-14): o template nasce preenchido
        // no próximo render em vez de voltar ao placeholder. Erro NÃO cacheia (mantém o
        // último valor bom).
        (state._reacoesCache || (state._reacoesCache = {}))[postId] = out;
        return out;
      } catch (e) {
        debug?.("[aniv reacoes] carregar:", e?.message || e);
        return { reacoes: [], minhaReacao: false, total: 0, err: e.message };
      }
    };

    // Fotos de quem reagiu, por uid, lidas do PLACAR da gamificação (pontos/{uid}.foto,
    // denormalizada com autorização de imagem, a mesma fonte do ranking; leitura aberta
    // a autenticado). Cache de sessão em state._fotoReatorCache: "" = sabidamente sem
    // foto (não re-busca); erro NÃO cacheia (tenta de novo no próximo preenchimento).
    // O próprio uid não entra (a foto dele vem do users doc, já no state).
    window.carregarFotosReatores = async function (uids) {
      const cc = state._fotoReatorCache || (state._fotoReatorCache = {});
      const meu = auth.currentUser && auth.currentUser.uid;
      const falta = [...new Set(uids || [])].filter((u) => u && u !== meu && cc[u] === undefined);
      if (!falta.length) return;
      const pontos = db.collection("gamificacao").doc(String(new Date().getFullYear())).collection("pontos");
      await Promise.all(falta.map(async (u) => {
        try {
          const s = await pontos.doc(u).get();
          const f = s.exists ? s.data().foto : "";
          cc[u] = (typeof f === "string" && f.indexOf("data:image/") === 0) ? f : "";
        } catch (e) { debug?.("[mural fotos] placar:", e?.code || e?.message); }
      }));
    };

    // Toggle de reação do mural. ligar=true -> set reacoes/{uid}; ligar=false -> delete.
    // Retorna o novo estado (bool). Id da doc = uid (rule exige request.auth.uid == uid).
    // tipo: 'coracao' (post de aniversário) ou 'bemvindo' (post bv- de boas-vindas);
    // a regra exige o tipo casado com o prefixo do postId.
    window.toggleReacaoAniversario = async function (postId, ligar, tipo = "coracao") {
      const uid = auth.currentUser && auth.currentUser.uid;
      if (!uid) throw new Error("sem sessao");
      const ref = db.collection("muralAniversario").doc(postId).collection("reacoes").doc(uid);
      if (ligar) {
        // autorNome = o nome REAL (users/{uid}.nome; a regra valida ==userDoc().nome anti-spoof):
        // alimenta o mini-avatar de iniciais de quem parabenizou no card do colega.
        await ref.set({ uid, tipo, autorNome: (currentUser()?.nome || "").slice(0, 80), em: firebase.firestore.FieldValue.serverTimestamp() });
        return true;
      }
      await ref.delete();
      return false;
    };

    // Recados (texto + autor) do post do mural, pro STORY RICO do próprio homenageado (v404).
    // Subcoleção muralAniversario/{postId}/recados, leitura aberta a autenticado (rule
    // read: isAuthed, já deployada). Cache de sessão em state._recadosCache (estilo
    // _reacoesCache): o story do próprio nasce preenchido no re-open, sem re-fetch em re-render.
    // Ordena por 'em' desc no cliente (campo obrigatório na regra; sem índice composto). Só
    // LEITURA nesta versão — o compositor de recado não entra. Erro NÃO cacheia.
    window.carregarRecadosMural = async function (postId) {
      const base = db.collection("muralAniversario").doc(postId).collection("recados");
      try {
        const snap = await base.get();
        const recados = snap.docs
          .map((d) => { const x = d.data() || {}; return { autorNome: x.autorNome || "", texto: x.texto || "", _em: (x.em && x.em.toMillis) ? x.em.toMillis() : 0 }; })
          .sort((a, b) => b._em - a._em)
          .map(({ autorNome, texto }) => ({ autorNome, texto }));
        (state._recadosCache || (state._recadosCache = {}))[postId] = recados;
        return recados;
      } catch (e) {
        debug?.("[mural recados] carregar:", e?.message || e);
        return (state._recadosCache && state._recadosCache[postId]) || [];
      }
    };

    // ===== GAMIFICACAO (cliente). Rules deployadas (tests/gamificacao-rules.test.mjs,
    // gate Fable 2026-07-14). O claim do ponto NUNCA participa da acao principal:
    // roda DEPOIS, em batch proprio (a regra aceita prova pre-existente), e toda
    // falha e silenciosa -- o debito legitimo fica pro catch-up. Dedup e da REGRA
    // (id deterministico); o cliente so evita writes fadados a negar. =====
    const _gamiAno = () => String(new Date().getFullYear());
    const _gami = () => db.collection("gamificacao").doc(_gamiAno());

    // Config da temporada (cache de sessao). null = sem temporada -> feature dormente.
    // P2 (BOOT PERFEITO): FALHA DE REDE NAO CACHEIA. So o sucesso grava state.gamiConfig
    // (inclusive "doc nao existe", que e resposta valida -> null legitimo). Antes o catch
    // gravava null e, como o guard abaixo pula reler quando != undefined, uma unica falha
    // no cold start grudava a feature dormente a sessao inteira. Agora a leitura seguinte
    // (proximo carregarGamiHome/refetch de foco) tenta de novo.
    window.carregarGamiConfig = async function (force) {
      if (state.gamiConfig !== undefined && !force) return state.gamiConfig;
      try {
        const s = await _gami().get();
        state.gamiConfig = s.exists ? { ano: _gamiAno(), ...s.data() } : null;
      } catch (e) { debug?.("[gami] config:", e?.code || e?.message); /* nao gruda: fica undefined pra reler */ }
      return state.gamiConfig;
    };

    // Credita 1 acao: evento {acao}_{refId} + placar no MESMO batch (total exato,
    // exigido pela regra). Retorna true se creditou; false por qualquer motivo
    // (sem sessao, temporada inativa, acao fora da tabela, dedup, prova negada).
    window.gamiClaim = async function (acao, refId, rotulo) {
      try {
        const user = auth.currentUser;
        const u = currentUser();
        if (!user || !u || u.role !== "colaborador" || !refId) return false;
        const cfg = await window.carregarGamiConfig();
        if (!cfg || cfg.ativa !== true) return false;
        const pontos = Number(cfg.tabela && cfg.tabela[acao]);
        if (!Number.isInteger(pontos) || pontos <= 0) return false;
        const eid = `${acao}_${refId}`;
        if ((state.gamiExtrato || []).some((e) => e.id === eid)) return false; // ja creditado (economia; o dedup real e da regra)
        const meuRef = _gami().collection("pontos").doc(user.uid);
        const atual = await meuRef.get();
        const total = (atual.exists ? Number(atual.data().total) || 0 : 0) + pontos;
        const b = db.batch();
        const ev = { acao, refId, pontos, em: _FV.serverTimestamp() };
        if (rotulo) ev.rotulo = String(rotulo).slice(0, 140);
        b.set(meuRef.collection("eventos").doc(eid), ev);
        const nome = String(u.nome || "").slice(0, 120);
        if (atual.exists) {
          // UPDATE parcial (gate delta 4): a foto so trafega quando MUDOU -- senao cada
          // claim de 1 ponto re-subiria a imagem inteira no 3G. A igualdade anti-spoof
          // avalia o doc final, entao a foto persistida continua valendo sem trafegar.
          const upd = { total, nome, ultimoEvento: eid };
          const persistida = atual.data().foto;
          if (u.fotoBase64 && persistida !== u.fotoBase64) upd.foto = u.fotoBase64;
          else if (!u.fotoBase64 && persistida !== undefined) upd.foto = _FV.delete();
          if (u.decoracao != null && (atual.data().decoracao || "") !== (u.decoracao || "")) upd.decoracao = u.decoracao;
          b.update(meuRef, upd);
        } else {
          const placar = { total, nome, ultimoEvento: eid };
          if (u.decoracao != null) placar.decoracao = u.decoracao;
          if (u.fotoBase64) placar.foto = u.fotoBase64;
          b.set(meuRef, placar);
        }
        await b.commit();
        state.gamiMeu = { ...(state.gamiMeu || {}), total, nome, ultimoEvento: eid };
        if (state.gamiExtrato) state.gamiExtrato.unshift({ id: eid, ...ev, em: new Date().toISOString() });
        return true;
      } catch (e) { debug?.("[gami] claim", acao, refId, ":", e?.code || e?.message); return false; }
    };

    // Home do colab (boot): config + meu placar (2 leituras; o resto e da tela).
    window.carregarGamiHome = async function () {
      const user = auth.currentUser;
      if (!user) return;
      const cfg = await window.carregarGamiConfig();
      if (!cfg) return;
      try {
        const s = await _gami().collection("pontos").doc(user.uid).get();
        state.gamiMeu = s.exists ? s.data() : { total: 0 };
      } catch (e) { debug?.("[gami] placar:", e?.code || e?.message); }
    };

    // Tela Conquistas: extrato + entregas (premios revelados) + ranking top 10.
    // Config REVALIDADA (force): a GP pode ter editado valores/ativado a temporada
    // depois do boot; claim com tabela velha nega na regra (visto em prod 2026-07-14).
    window.carregarGamificacaoColab = async function () {
      const user = auth.currentUser;
      if (!user) return null;
      const cfg = await window.carregarGamiConfig(true);
      if (!cfg) { state.gamiMeu = null; return null; }
      const meuRef = _gami().collection("pontos").doc(user.uid);
      try {
        const [meu, extr, entr, top] = await Promise.all([
          meuRef.get(),
          meuRef.collection("eventos").get(),
          _gami().collection("entregas").where("uid", "==", user.uid).get(),
          _gami().collection("pontos").orderBy("total", "desc").limit(10).get(),
        ]);
        state.gamiMeu = meu.exists ? meu.data() : { total: 0 };
        state.gamiExtrato = extr.docs
          .map((d) => ({ id: d.id, ...d.data(), em: tsToIso(d.data().em) }))
          .sort((a, b) => String(b.em || "").localeCompare(String(a.em || "")));
        state.gamiEntregas = entr.docs.map((d) => ({ id: d.id, ...d.data(), em: tsToIso(d.data().em) }));
        state.gamiTop = top.docs.map((d, i) => ({ uid: d.id, pos: i + 1, ...d.data() }));
      } catch (e) { debug?.("[gami] colab:", e?.code || e?.message); }
      return state.gamiMeu;
    };

    // Catch-up: credita acoes do ANO ja feitas e ainda sem evento (retroativo do
    // lancamento da feature, claim ADIADO da pesquisa, acao feita noutro aparelho).
    // Roda com o extrato carregado (tela Conquistas). Sequencial de proposito: cada
    // claim le o total corrente. So provas com 'em' do servidor entram (decisao do
    // gate: minhaLeitura/minhaAssinatura do state vem do boot, que le o servidor).
    window.gamiCatchUp = async function () {
      const user = auth.currentUser;
      if (!user) return false;
      // Config REVALIDADA antes de desistir (caso William 21/07: a tabela recém-salva
      // pela GP só valia depois de fechar e abrir o app, porque o catch-up rodava com a
      // config em cache da sessão). Custa 1 leitura por varredura; os claims na
      // sequência já usam a fresca.
      await window.carregarGamiConfig?.(true);
      if (!state.gamiConfig || state.gamiConfig.ativa !== true) return false;
      const anoOk = (iso) => iso && String(iso).slice(0, 4) === _gamiAno();
      const pend = [];
      for (const c of state.comunicadosColab || [])
        if (c.minhaLeitura && anoOk(c.minhaLeitura.em)) pend.push(["comunicado", c.id, "Comunicado: " + (c.titulo || "")]);
      for (const d of state.documentosColab || []) {
        if (d.minhaLeitura && d.minhaLeitura.confirmado === true && anoOk(d.minhaLeitura.em)) pend.push(["documento-leitura", d.id, "Leitura confirmada: " + (d.titulo || "documento")]);
        if (d.minhaAssinatura && anoOk(d.minhaAssinatura.em)) pend.push(["documento-assinatura", d.id, "Assinou: " + (d.titulo || "documento")]);
      }
      for (const r of state.meusRecibos || [])
        if (r.minhaAssinatura && anoOk(r.minhaAssinatura.em))
          pend.push([r.tipo === "cartao-ponto" ? "cartao-ponto" : "folha", r.id, (r.tipo === "cartao-ponto" ? "Cartão ponto " : "Folha de pagamento ") + (r.competencia || "")]);
      for (const p of state.pesquisasClimaColab || [])
        if (p.jaRespondi) pend.push(["pesquisa", p.id, "Pesquisa de clima: " + (p.titulo || "")]);
      // pendencias locais de pesquisa (a lista do colab so ve as ABERTAS; o pid fica
      // guardado na hora da resposta pra reivindicar mesmo depois de encerrada)
      let pesqLocal = [];
      try { pesqLocal = JSON.parse(localStorage.getItem("gamiPesqPend") || "[]"); } catch { /* lixo local */ }
      for (const pid of pesqLocal) pend.push(["pesquisa", pid, "Pesquisa de clima"]);
      if (state.termoAdesaoOk === true) pend.push(["termo", user.uid, "Termo de Adesão à assinatura eletrônica"]);
      // coracao/boas-vindas: so cobre os posts do mural ja carregados nesta sessao
      // (state._reacoesCache, preenchido ao renderizar os cards da home) com minha reacao
      // ligada. NAO varre o mural inteiro -- fora da janela visivel nao pontua, por design.
      // Nome real no rótulo do retroativo (achado William 21/07, "deveria mostrar quem
      // é"): cruza o postId com as listas do config (mesma fonte dos cards, acentos
      // certos); sem match, capitaliza o 1º pedaço do slug. Rótulo é cosmético: erro
      // aqui nunca derruba o crédito (try + fallback genérico).
      const _nomeDoPost = (post) => {
        try {
          const a = state.aniversariantes || {};
          const pares = [
            ...(Array.isArray(a.pessoas) && typeof muralPostId === "function" ? a.pessoas.map((p) => [muralPostId(p.nome), p.nome]) : []),
            ...(Array.isArray(a.tempoCasa) && typeof tdcPostId === "function" ? a.tempoCasa.map((p) => [tdcPostId(p.nome), p.nome]) : []),
            ...(Array.isArray(a.recemChegados) && typeof bvPostId === "function" ? a.recemChegados.map((p) => [bvPostId(p.nome, p.admissao), p.nome]) : []),
          ];
          const hit = pares.find(([id]) => id === post);
          if (hit && hit[1]) return String(hit[1]).trim().split(/\s+/)[0];
        } catch (e) { /* cosmético */ }
        const slug = post.replace(/^(aniv|bv|tdc)-/, "").replace(/-\d{4}$/, "").split("-")[0] || "";
        return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "";
      };
      for (const [post, r] of Object.entries(state._reacoesCache || {})) {
        if (!r || r.minhaReacao !== true) continue;
        const nome = _nomeDoPost(post);
        if (post.startsWith("aniv-")) pend.push(["coracao", post, nome ? `Parabenizou ${nome}` : "Parabenizou um colega"]);
        else if (post.startsWith("bv-")) pend.push(["boas-vindas", post, nome ? `Deu boas-vindas a ${nome}` : "Deu boas-vindas a um colega"]);
        else if (post.startsWith("tdc-")) pend.push(["tempo-casa", post, nome ? `Parabenizou ${nome} pelo tempo de casa` : "Parabenizou um colega pelo tempo de casa"]);
      }
      // Foto NUNCA entra no catch-up (decisao William, gate delta 3): o ponto e pelo ATO
      // de trocar/adicionar (gancho no atualizarMinhaFoto). As fotos oficiais importadas
      // vivem no mesmo campo e virariam brinde em massa aqui.
      let creditou = false;
      for (const [acao, refId, rotulo] of pend) {
        if ((state.gamiExtrato || []).some((e) => e.id === `${acao}_${refId}`)) continue;
        if (await window.gamiClaim(acao, refId, rotulo)) creditou = true;
      }
      // limpa do local o que ja consta no extrato (creditado agora ou antes)
      if (pesqLocal.length) {
        const resta = pesqLocal.filter((pid) => !(state.gamiExtrato || []).some((e) => e.id === `pesquisa_${pid}`));
        try { localStorage.setItem("gamiPesqPend", JSON.stringify(resta)); } catch { /* sem espaco */ }
      }
      return creditou;
    };

    // Equipar aro do avatar: grava em users/{uid} (lista fechada da regra; desequipar
    // e SEMPRE string vazia, nunca deleteField -- o delete do campo NEGA por design) e
    // re-sincroniza o placar (ramo cosmetico da regra) pro aro aparecer no ranking.
    window.equiparDecoracao = async function (dec) {
      const user = auth.currentUser;
      const u = currentUser();
      if (!user || !u) throw new Error("sem sessao");
      const val = String(dec || "");
      await db.collection("users").doc(user.uid).update({ decoracao: val });
      u.decoracao = val;
      const sync = { decoracao: val, nome: u.nome };
      if (u.fotoBase64 != null) sync.foto = u.fotoBase64;
      try { await _gami().collection("pontos").doc(user.uid).update(sync); }
      catch (e) { debug?.("[gami] sync placar:", e?.code || e?.message); } // sem placar ainda: o 1o claim leva
      if (state.gamiMeu) state.gamiMeu.decoracao = val;
    };

    // Streak de presenca (William 2026-07-14): marca o DIA no doc proprio (a regra so
    // aceita HOJE e so soma +1 no dia seguinte exato) e, a cada multiplo de 5 dias
    // seguidos, reivindica o ponto. Silencioso; roda no boot do colaborador.
    window.gamiPingStreak = async function () {
      try {
        const user = auth.currentUser;
        const u = currentUser();
        if (!user || !u || u.role !== "colaborador") return;
        const cfg = await window.carregarGamiConfig();
        if (!cfg || cfg.ativa !== true) return;
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const ref = _gami().collection("presenca").doc(user.uid);
        const s = await ref.get();
        let dias = 1;
        if (s.exists) {
          const ult = s.data().ultimoDia && s.data().ultimoDia.toDate ? s.data().ultimoDia.toDate() : null;
          const jaHoje = ult && ult.getTime() === hoje.getTime();
          if (jaHoje) dias = Number(s.data().dias) || 1;
          else {
            if (ult && hoje.getTime() - ult.getTime() === 24 * 3600e3) dias = (Number(s.data().dias) || 0) + 1;
            await ref.update({ dias, ultimoDia: firebase.firestore.Timestamp.fromDate(hoje) });
          }
        } else {
          await ref.set({ dias: 1, ultimoDia: firebase.firestore.Timestamp.fromDate(hoje) });
        }
        // Cache de sessao (mesmo padrao de state.gamiMeu): o card da home le daqui,
        // sincrono, sem contador paralelo (William 2026-07-15, ideia A do mock streak-home).
        state.gamiStreakDias = dias;
        if (dias > 0 && dias % 5 === 0) {
          // chave derivada do MESMO ultimoDia gravado (a regra exige; derivar de "agora"
          // permitiria double-claim na virada de meia-noite UTC, gate delta 4)
          const diaKey = `${hoje.getUTCFullYear()}-${hoje.getUTCMonth() + 1}-${hoje.getUTCDate()}`;
          await window.gamiClaim("streak", diaKey, `Sequência de ${dias} dias no app`);
        }
      } catch (e) { debug?.("[gami] streak:", e?.code || e?.message); }
    };

    // ----- Gestor (cap gamificacao.gerenciar) -----
    window.salvarGamiConfig = async function (tabela, marcos, ativa) {
      const uid = auth.currentUser && auth.currentUser.uid;
      await _gami().set({
        tabela, marcos, ativa: !!ativa,
        atualizadoEm: _FV.serverTimestamp(), atualizadoPor: uid,
      });
      state.gamiConfig = { ano: _gamiAno(), tabela, marcos, ativa: !!ativa };
    };
    window.carregarGamiPremios = async function () {
      try { const s = await _gami().collection("privado").doc("premios").get(); return s.exists ? s.data() : {}; }
      catch (e) { debug?.("[gami] premios:", e?.code || e?.message); return null; }
    };
    window.salvarGamiPremios = async function (premios) {
      await _gami().collection("privado").doc("premios").set(premios);
    };
    // Ranking completo + entregas (fila de premiacao da GP).
    window.carregarGamiGestor = async function () {
      try {
        const [pts, entr] = await Promise.all([
          _gami().collection("pontos").orderBy("total", "desc").get(),
          _gami().collection("entregas").get(),
        ]);
        state.gamiRanking = pts.docs.map((d, i) => ({ uid: d.id, pos: i + 1, ...d.data() }));
        state.gamiEntregasTodas = entr.docs.map((d) => ({ id: d.id, ...d.data(), em: tsToIso(d.data().em) }));
      } catch (e) { debug?.("[gami] gestor:", e?.code || e?.message); state.gamiRanking = []; state.gamiEntregasTodas = []; }
    };
    window.registrarGamiEntrega = async function (uidAlvo, marco, premio) {
      const uid = auth.currentUser && auth.currentUser.uid;
      await _gami().collection("entregas").doc(`${uidAlvo}_${marco}`).set({
        uid: uidAlvo, marco: Number(marco), premio: String(premio || "").slice(0, 200),
        em: _FV.serverTimestamp(), porUid: uid,
      });
      window.registrarAuditoria?.({ tipo: "gamificacao", acao: `Entregou prêmio do marco ${marco}`, alvo: uidAlvo });
    };

    // ===== VAGAS (gestor; a pagina publica vagas.fiobras.com.br le direto). =====
    // Rules: cap vagas.gerenciar; anonimo le SO publicada + config/vagas (WhatsApp).
    window.carregarVagasGestor = async function () {
      try {
        const [vs, cf] = await Promise.all([
          db.collection("vagas").orderBy("criadoEm", "desc").get(),
          db.collection("config").doc("vagas").get().catch(() => null),
        ]);
        state.vagas = vs.docs.map((d) => ({ id: d.id, ...d.data(), criadoEm: tsToIso(d.data().criadoEm), publicadaEm: tsToIso(d.data().publicadaEm) }));
        state.vagasConfig = cf && cf.exists ? cf.data() : {};
      } catch (e) { debug?.("[vagas] gestor:", e?.code || e?.message); state.vagas = state.vagas || []; state.vagasConfig = state.vagasConfig || {}; }
    };
    window.salvarVaga = async function (id, dados) {
      const uid = auth.currentUser && auth.currentUser.uid;
      const campos = {
        titulo: String(dados.titulo || "").slice(0, 120),
        setor: String(dados.setor || "").slice(0, 60),
        turno: String(dados.turno || "").slice(0, 40),
        cidade: String(dados.cidade || "").slice(0, 60),
        descricao: String(dados.descricao || "").slice(0, 3000),
        requisitos: String(dados.requisitos || "").slice(0, 3000),
        // Benefícios marcados nesta vaga (só os do catálogo): lista <=15 de strings 1..40
        // (contrato /vagas nas rules). O front só oferece itens do catálogo.
        beneficios: Array.isArray(dados.beneficios)
          ? dados.beneficios.filter((b) => typeof b === "string" && b).map((b) => b.slice(0, 40)).slice(0, 15)
          : [],
        // Visibilidade (fase 2): default 'publica' = comportamento de hoje. A rule valida o enum.
        visibilidade: ["publica", "interna", "ambas"].includes(dados.visibilidade) ? dados.visibilidade : "publica",
      };
      if (id) { await db.collection("vagas").doc(id).update(campos); return id; }
      const ref = await db.collection("vagas").add({ ...campos, status: "rascunho", criadoPor: uid, criadoEm: _FV.serverTimestamp() });
      return ref.id;
    };
    window.publicarVaga = async function (id) {
      await db.collection("vagas").doc(id).update({ status: "publicada", publicadaEm: _FV.serverTimestamp() });
      window.registrarAuditoria?.({ tipo: "vagas", acao: "Publicou vaga no site", alvo: id });
    };
    window.encerrarVaga = async function (id) {
      await db.collection("vagas").doc(id).update({ status: "encerrada", encerradaEm: _FV.serverTimestamp() });
      window.registrarAuditoria?.({ tipo: "vagas", acao: "Encerrou vaga do site", alvo: id });
    };
    window.excluirVaga = async function (id) { await db.collection("vagas").doc(id).delete(); };
    // BACKFILL de visibilidade (pré-requisito do go-live, fase 2): a query nova do site filtra
    // visibilidade in ['publica','ambas'], que NÃO devolve doc SEM o campo. Ao abrir a tela
    // Vagas, marco 'publica' nas vagas legadas (rascunho/publicada) que ainda não têm o campo,
    // pra elas seguirem aparecendo no site. Encerrada fica de fora (update é one-way, seria
    // negado, e ela nem entra na query do site). Update de 1 campo passa no vagaShapeOk;
    // idempotente (uma vez gravado, o filtro pula) e best-effort silencioso (falha isolada
    // não trava a tela). Patcha o state local pra o selo refletir sem re-fetch.
    window.backfillVisibilidadeVagas = async function () {
      const vagas = state.vagas || [];
      const legadas = vagas.filter((v) => v && !("visibilidade" in v) && v.status !== "encerrada");
      if (!legadas.length) return;
      await Promise.allSettled(legadas.map(async (v) => {
        try {
          await db.collection("vagas").doc(v.id).update({ visibilidade: "publica" });
          v.visibilidade = "publica";
        } catch (e) { debug?.("[vagas] backfill visibilidade:", e?.code || e?.message); }
      }));
    };
    // VAGAS INTERNAS no portal do colaborador (fase 2). Query: publicada + visibilidade
    // interna/ambas (a rule deixa o colaborador COM vinculo ler essa faixa). Lê tambem o
    // PROPRIO interesse por vaga (doc vagaId__int__funcionarioId; a rule permite ler o proprio),
    // pra a tela mostrar "interesse enviado" persistente entre sessoes. Cache no state.
    window.carregarVagasInternasColab = async function () {
      const u = currentUser();
      state.vagasInternasColab = state.vagasInternasColab || [];
      state.meusInteressesInternos = state.meusInteressesInternos || {};
      if (!u || u.role !== "colaborador" || !u.funcionarioId) { state.vagasInternasColab = []; state.meusInteressesInternos = {}; return; }
      // P2 (BOOT PERFEITO): a query principal PROPAGA a falha (o loaderHome tenta de novo e
      // preserva o cache); antes o catch engolia e zerava. Fetch-then-swap: so grava no fim.
      const snap = await db.collection("vagas")
        .where("status", "==", "publicada")
        .where("visibilidade", "in", ["interna", "ambas"]).get();
      const vagas = snap.docs.map((d) => {
        const v = d.data();
        return { id: d.id, titulo: v.titulo || "", setor: v.setor || "", turno: v.turno || "",
          cidade: v.cidade || "", descricao: v.descricao || "", visibilidade: v.visibilidade || "" };
      });
      // Meu interesse por vaga: 1 get por vaga (poucas internas abertas). A rule libera SO o
      // proprio doc (origem interna + uid == ele). Falha isolada nao esconde a vaga.
      const meus = {};
      await Promise.all(vagas.map(async (vg) => {
        try {
          const r = await db.collection("candidaturas").doc(`${vg.id}__int__${u.funcionarioId}`).get();
          if (r.exists) { const d = r.data(); meus[vg.id] = { status: d.status || "nova", em: tsToIso(d.em) }; }
        } catch (e) { /* leitura do proprio interesse; nao trava a lista */ }
      }));
      state.vagasInternasColab = vagas;
      state.meusInteressesInternos = meus;
    };
    // INTERESSE INTERNO (1 toque). Grava candidatura com o shape EXATO do criaInterna (hasOnly):
    // vagaId/origem/uid/funcionarioId/nome/cargo/setor/turno/tempoCasaMeses/motivacao/em/status.
    // id deterministico vagaId__int__funcionarioId (1 interesse por vaga por colaborador; repetir
    // vira update -> NEGA = dedupe estrutural). nome == users/{uid}.nome (anti-spoof da rule).
    window.registrarInteresseInterno = async function (vagaId, snapshot, motivacao) {
      const u = currentUser();
      const uid = auth.currentUser && auth.currentUser.uid;
      if (!u || !u.funcionarioId || !uid) throw new Error("Sem vínculo de colaborador.");
      const s = snapshot || {};
      const payload = {
        vagaId: String(vagaId).slice(0, 60),
        origem: "interna",
        uid,
        funcionarioId: u.funcionarioId,
        nome: u.nome, // EXATO = users/{uid}.nome (a rule exige a igualdade)
        cargo: String(s.cargo || "").slice(0, 80),
        setor: String(s.setor || "").slice(0, 80),
        turno: String(s.turno || "").slice(0, 40),
        tempoCasaMeses: Math.max(0, Math.min(1200, Math.round(Number(s.tempoCasaMeses) || 0))),
        motivacao: String(motivacao || "").slice(0, 300),
        em: _FV.serverTimestamp(),
        status: "nova",
      };
      await db.collection("candidaturas").doc(`${vagaId}__int__${u.funcionarioId}`).set(payload);
      // Reflete no state pra a tela mostrar "enviado" na hora, sem re-fetch.
      state.meusInteressesInternos = state.meusInteressesInternos || {};
      state.meusInteressesInternos[vagaId] = { status: "nova", em: new Date().toISOString() };
    };
    // config/vagas guarda whatsapp + catálogo de benefícios NO MESMO doc (shape
    // hasOnly(['whatsapp','beneficiosCatalogo']) nas rules; whatsapp SEMPRE presente).
    // Cada save reescreve o doc, então preserva o outro campo a partir do state.
    window.salvarConfigVagas = async function (whatsapp, beneficiosCatalogo) {
      const cur = state.vagasConfig || {};
      const wa = String(whatsapp != null ? whatsapp : (cur.whatsapp || "")).slice(0, 30);
      const cat = Array.isArray(beneficiosCatalogo) ? beneficiosCatalogo
        : (Array.isArray(cur.beneficiosCatalogo) ? cur.beneficiosCatalogo : null);
      const payload = { whatsapp: wa };
      if (cat) payload.beneficiosCatalogo = cat.filter((b) => typeof b === "string" && b).map((b) => b.slice(0, 40)).slice(0, 30);
      await db.collection("config").doc("vagas").set(payload);
      state.vagasConfig = payload;
    };
    // Candidaturas: gravadas pelo site publico (fora da empresa, fronteira de
    // confianca maxima); todo campo passa por escapeHtml no render do gestor.
    window.carregarCandidaturasGestor = async function () {
      try {
        const cs = await db.collection("candidaturas").orderBy("em", "desc").get();
        state.candidaturas = cs.docs.map((d) => ({ id: d.id, ...d.data(), em: tsToIso(d.data().em) }));
      } catch (e) { debug?.("[vagas] candidaturas:", e?.code || e?.message); state.candidaturas = state.candidaturas || []; }
    };
    // URL de download do currículo (PDF que o candidato subiu). O gestor SÓ abre no viewer
    // pdf.js interno (rasteriza, não executa nada de dentro do PDF). null = objeto sumiu do
    // cofre (404) ou a regra negou → o chamador mostra "não encontrado no cofre".
    window.urlCurriculo = async function (curriculoPath) {
      try { return await firebase.storage().ref(curriculoPath).getDownloadURL(); }
      catch (e) { debug?.("[vagas] url curriculo:", e?.message || e); return null; }
    };
    window.excluirCandidatura = async function (id) {
      // EXPURGO LGPD (ordem do gate): o ARQUIVO do candidato (currículo no cofre) sai ANTES
      // do cadastro. Arquivo já ausente (excluído numa tentativa anterior, ou nunca enviado)
      // NÃO bloqueia o expurgo do doc — o Firestore é a fonte de verdade do "existe".
      const c = (state.candidaturas || []).find((x) => x.id === id);
      const path = c && c.curriculoPath;
      if (path) {
        try { await firebase.storage().ref(path).delete(); }
        catch (e) { debug?.("[vagas] expurgo curriculo:", e?.code || e?.message); }
      }
      await db.collection("candidaturas").doc(id).delete();
      // Expurgo dos IRMÃOS do funil (espelho da function apagarIrmaosFunil, functions/index.js):
      // os avisos enfileirados por esta candidatura em /mail e /waMsg. 'recebida' é o próprio id
      // (sem sufixo); os 3 status com mensagem viram sufixo. Tokens do MAIL são HIFENIZADOS
      // (em-analise/aprovada/nao-seguiu), os do waMsg em UNDERSCORE (em_analise/aprovada/
      // nao_seguiu), casando com o wiring de atualizarStatusCandidatura. Deletes idempotentes
      // (doc ausente = no-op). Best-effort e SILENCIOSO: allSettled garante que os 8 disparam e a
      // falha de um irmão NUNCA desfaz nem bloqueia a exclusão da candidatura (já concluída acima).
      // Zero PII no console (só um aviso genérico).
      try {
        const mailIds = [id, id + "-em-analise", id + "-aprovada", id + "-nao-seguiu"];
        const waIds = [id, id + "-em_analise", id + "-aprovada", id + "-nao_seguiu"];
        await Promise.allSettled([
          ...mailIds.map((mid) => db.collection("mail").doc(mid).delete()),
          ...waIds.map((wid) => db.collection("waMsg").doc(wid).delete()),
        ]);
      } catch (e) { debug?.("[vagas] expurgo irmãos do funil (best-effort):", e?.code || e?.message); }
      window.registrarAuditoria?.({ tipo: "vagas", acao: "Excluiu candidatura", alvo: id });
    };

    // FUNIL DE STATUS (fase 1, 2026-07-16): a GP move a candidatura entre os 4 passos.
    // Escreve SO o campo status (a regra exige affectedKeys().hasOnly(['status']) e o
    // valor no enum); o resto do cadastro do candidato fica imutavel. Espelha no state
    // local pra tela refletir na hora sem re-fetch. Auditoria SEM PII: so o rotulo do
    // status e o id do doc (mesmo alvo do "Excluiu candidatura", padrao ja existente).
    const _CAND_STATUS_ROTULO = { recebida: "Recebida", "em-analise": "Em análise", aprovada: "Aprovada", contratada: "Contratada", "nao-seguiu": "Não seguiu adiante" };
    window.atualizarStatusCandidatura = async function (id, status) {
      if (!_CAND_STATUS_ROTULO[status]) throw new Error("status inválido");
      await db.collection("candidaturas").doc(id).update({ status });
      const c = (state.candidaturas || []).find((x) => x.id === id);
      if (c) c.status = status; // mantém o state honesto na sessão (doc já gravado)
      window.registrarAuditoria?.({ tipo: "vagas", acao: "Moveu candidatura para " + _CAND_STATUS_ROTULO[status], alvo: id });
      // EMAIL AUTOMATICO de status (extensao Trigger Email): enfileira mail/{id}-{status}
      // pros 3 status finais; 'recebida' NAO dispara (esse email sai do site, no envio).
      // Best-effort: o status JA foi gravado acima, entao um erro aqui (ex.: re-visitar um
      // status = mail create-only ja existe, a rule nega o update) NAO desfaz nada, so vira
      // debug. Retorna se o mail foi enfileirado (o toast honra "gravado != entregue"). to ==
      // email da candidatura + molde pinado = shape exato de /mail (docs/firestore.rules).
      if (status === "recebida" || !c) return false;
      // FILA DE WHATSAPP (espelho estrutural do mail; go-live depende de pre-req na Meta).
      // waMsg/{id}-{status underscore}: os tokens Meta usam underscore (em_analise/aprovada/
      // nao_seguiu). Create-only, entao re-visitar o mesmo status NEGA (permission-denied
      // esperado, e o dedupe natural: 1 mensagem por status). Best-effort e SILENCIOSO como o
      // mail: nunca bloqueia o mail, nunca promete no toast (o email segue o canal anunciado;
      // o WhatsApp entra quando a Meta liberar). So dispara com telefone (candidatura legada
      // pode nao ter); para == telefone da candidatura (a rule compara byte a byte). ZERO PII
      // no console (loga so o token do status).
      // _WA_STATUS = os status COM mensagem automática (email + WhatsApp têm molde/template);
      // 'recebida' já saiu acima, 'contratada' (v383) NÃO está aqui: não manda nada.
      const _WA_STATUS = { "em-analise": "em_analise", aprovada: "aprovada", "nao-seguiu": "nao_seguiu" };
      const waSt = _WA_STATUS[status];
      if (waSt && c.telefone) {
        try {
          await db.collection("waMsg").doc(id + "-" + waSt).set({
            para: c.telefone,
            template: "candidatura_" + waSt,
            params: { nome: primeiroNomeCand(c.nome), vaga: String(c.vagaTitulo || "").slice(0, 120) },
            em: firebase.firestore.FieldValue.serverTimestamp(),
            candidaturaId: id,
          });
          debug?.("[wa] status enfileirado:", waSt);
        } catch (e) { debug?.("[wa] status nao enfileirado:", waSt, e?.code || e?.message); }
      }
      // Guarda equivalente à do WhatsApp: só os status com molde criam doc de /mail. Sem
      // isto, 'contratada' tentaria mail/{id}-contratada com molde inexistente (a rule
      // negaria, mas não se deve nem tentar). Toast honesto: retorna false = sem promessa.
      if (!waSt) return false;
      try {
        await db.collection("mail").doc(id + "-" + status).set({
          to: c.email,
          template: { name: "candidatura-" + status, data: { nome: primeiroNomeCand(c.nome), vaga: String(c.vagaTitulo || "").slice(0, 120) } },
        });
        debug?.("[email] status enfileirado:", id, status);
        return true;
      } catch (e) { debug?.("[email] status nao enfileirado:", id, status, e?.code || e?.message); return false; }
    };

    // SEED DOS MOLDES de email. Quando um ADMIN abre a tela Vagas, garante que os 4 moldes
    // existem em /emailTemplates e cria SO os que faltam (idempotente; a rule da create/update
    // SO a admin). Best-effort e silencioso: le a colecao 1x (list, permitida a autenticado),
    // cria os ausentes, erro vira debug e nunca quebra a tela. Nao-admin nem tenta (evita ruido
    // de permission-denied). moldeEmail/MOLDES_EMAIL vem do app.js (fonte unica dos textos).
    window.semearMoldesEmail = async function () {
      const u = currentUser();
      if (!u || u.role !== "admin") return;
      if (typeof MOLDES_EMAIL === "undefined" || typeof moldeEmail !== "function") return;
      try {
        const snap = await db.collection("emailTemplates").get();
        const existentes = {};
        snap.docs.forEach((d) => { existentes[d.id] = true; });
        for (const { id, key } of MOLDES_EMAIL) {
          if (existentes[id]) continue; // ja existe: nao toca (preserva customizacao manual)
          const molde = moldeEmail(key);
          if (!molde) continue;
          try { await db.collection("emailTemplates").doc(id).set(molde); debug?.("[email] molde semeado:", id); }
          catch (e) { debug?.("[email] seed de molde falhou:", id, e?.code || e?.message); }
        }
      } catch (e) { debug?.("[email] seed abortado:", e?.code || e?.message); }
    };

    // EXPURGO AUTOMÁTICO de candidaturas (LGPD, decisão William 2026-07-16): candidatura de
    // vaga ENCERRADA há mais de 6 meses se apaga SOZINHA, "sem depender de ninguém lembrar".
    // O consentimento do site diz "guardamos por até 6 meses e depois apagamos
    // automaticamente" — esta varredura é o que cumpre a promessa. A VAGA em si fica
    // (histórico da empresa); só o dado pessoal do candidato (cadastro + currículo no cofre)
    // sai, reusando window.excluirCandidatura (arquivo-antes-do-doc + auditoria). Roda em
    // background na sessão da GP quando a tela Vagas carrega os dados; fire-and-forget: nunca
    // bloqueia o render, erro individual pula em silêncio (a próxima sessão tenta de novo).
    const EXPURGO_CAND_MESES = 6; // janela de guarda; sem knob de config (YAGNI)
    let _expurgoEmCurso = false;
    window.expurgarCandidaturasVencidas = async function () {
      // SÓ quem gerencia vagas: sem a cap as rules negariam o delete e viraria ruído.
      if (typeof can !== "function" || !can("vagas.gerenciar")) return;
      if (_expurgoEmCurso) return; // uma varredura de cada vez
      _expurgoEmCurso = true;
      try {
        const vagas = state.vagas || [];
        const candidaturas = state.candidaturas || [];
        if (!vagas.length || !candidaturas.length) return;
        const corte = new Date();
        corte.setMonth(corte.getMonth() - EXPURGO_CAND_MESES); // 6 meses atrás (fronteira de mês real)
        const corteMs = corte.getTime();
        // encerradaEm chega como Timestamp cru (carregarVagasGestor não o converte); defensivo
        // pra string/número também. Sem data válida = não expurga (não sabe quando encerrou).
        const encMs = (v) => {
          const e = v && v.encerradaEm;
          if (!e) return null;
          const d = (typeof e.toDate === "function") ? e.toDate() : new Date(e);
          return isNaN(d.getTime()) ? null : d.getTime();
        };
        for (const v of vagas) {
          if (v.status !== "encerrada") continue;         // publicada/rascunho: intocada
          const ms = encMs(v);
          if (ms == null || ms >= corteMs) continue;       // sem data ou dentro da janela: intocada
          const alvos = candidaturas.filter((c) => c.vagaId === v.id);
          if (!alvos.length) continue;
          let ok = 0;
          for (const c of alvos) {
            try {
              await window.excluirCandidatura(c.id); // canônico: cofre ANTES do doc + auditoria
              ok++;
              const i = candidaturas.indexOf(c); // mantém o state honesto na sessão (doc já saiu)
              if (i >= 0) candidaturas.splice(i, 1);
            } catch (e) { debug?.("[vagas] expurgo auto (pula 1):", e?.code || e?.message); }
          }
          // 1 entrada-resumo por vaga varrida (as de "Excluiu candidatura" já saem do reuso).
          // ZERO PII do candidato aqui: só o título da vaga e a contagem.
          if (ok) window.registrarAuditoria?.({ tipo: "vagas", acao: `Expurgo automático: ${ok} candidatura(s), 6 meses após encerrar`, alvo: "Vaga · " + (v.titulo || v.id) });
        }
      } finally { _expurgoEmCurso = false; }
    };

    // ===== CANAL DE DENUNCIA (sigilo por desenho; ver docs/firestore.rules,
    // bloco "CANAL DE DENUNCIA", secao "GUARDAS DE FRONT obrigatorias"). =====
    // O ENVIO e ANONIMO por desenho: add() com ID aleatorio (nunca doc(id).set),
    // ZERO logEvento/console.log do conteudo, NADA em localStorage/sessionStorage
    // em qualquer caminho (sucesso ou erro). Só a TRIAGEM do admin é auditada.
    const _denunciaHashHex = async (texto) => {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    };
    // CODIGO DE ACOMPANHAMENTO (2026-07-16): bearer token ALEATORIO FORTE gerado no
    // cliente, NUNCA derivado de identidade (uid/CPF/nome) nem de hora — cada envio
    // sorteia um codigo novo, entao nao identifica o autor nem correlaciona denuncias
    // do mesmo autor. Alfabeto sem ambiguos (0/O/1/I/L fora): 31 simbolos, 8 sorteados
    // = ~40 bits. getRandomValues com rejeicao dos bytes que enviesariam o modulo.
    const _COD_ALFA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 31 chars, sem 0 O 1 I L
    const _gerarCodigoAcomp = () => {
      const n = _COD_ALFA.length, lim = 256 - (256 % n); // 248: descarta o resto enviesado
      const out = [];
      while (out.length < 8) {
        const buf = new Uint8Array(16);
        crypto.getRandomValues(buf);
        for (let i = 0; i < buf.length && out.length < 8; i++) {
          if (buf[i] < lim) out.push(_COD_ALFA[buf[i] % n]);
        }
      }
      return `FBR-${out.slice(0, 4).join("")}-${out.slice(4, 8).join("")}`;
    };
    window.enviarDenuncia = async function ({ categoria, texto, contato }) {
      const txt = String(texto).trim();
      const hash = await _denunciaHashHex(txt);
      const codigo = _gerarCodigoAcomp();
      const payload = { categoria, texto: txt, hash, em: _FV.serverTimestamp(), status: "nova", codigoAcompanhamento: codigo };
      const cont = String(contato || "").trim();
      if (cont) payload.contato = cont.slice(0, 200);
      try {
        // Batch ATOMICO: a denuncia (id aleatorio, nunca derivado) e o espelho
        // content-free /denunciaStatus/{codigo} sobem juntos ou nenhum sobe. O espelho
        // carrega SO status + em (server): quem tem o codigo consulta o andamento sem
        // ver relato/PII. ZERO log do conteudo em qualquer caminho (sucesso ou erro).
        const batch = db.batch();
        batch.set(db.collection("denuncias").doc(), payload); // doc() sem id = aleatorio (= add)
        batch.set(db.collection("denunciaStatus").doc(codigo), { status: "nova", em: _FV.serverTimestamp() });
        await batch.commit();
        return { hash, codigo };
      } catch (e) {
        // Relança pro chamador (a UI trata); NUNCA logar o conteúdo aqui.
        throw e;
      }
    };
    // CONSULTA do andamento pelo denunciante (colaborador): get por id no espelho
    // content-free. ZERO log, ZERO auditoria, ZERO storage — o sigilo da consulta faz
    // parte do desenho. Normaliza (trim/uppercase) e devolve {status, em, atualizadoEm}
    // ou null. Erro de rede tambem vira null (silencioso): a UI mostra a MESMA mensagem
    // neutra pra codigo invalido, inexistente ou offline (anti-enumeracao).
    window.consultarDenunciaStatus = async function (codigo) {
      const id = String(codigo || "").trim().toUpperCase();
      if (!id) return null;
      try {
        const snap = await db.collection("denunciaStatus").doc(id).get();
        if (!snap.exists) return null;
        const x = snap.data() || {};
        return { status: x.status || "nova", em: tsToIso(x.em), atualizadoEm: tsToIso(x.atualizadoEm) };
      } catch (e) {
        debug?.("[denuncia] consulta:", e?.code || e?.message); // silencioso, sem PII
        return null;
      }
    };
    window.carregarDenunciasAdmin = async function () {
      try {
        const ds = await db.collection("denuncias").orderBy("em", "desc").get();
        state.denuncias = ds.docs.map((d) => {
          const x = d.data();
          return { id: d.id, ...x, em: tsToIso(x.em), concluidaEm: tsToIso(x.concluidaEm) };
        });
        state.denunciasNovas = state.denuncias.filter((x) => x.status === "nova").length;
        window.expurgarDenunciasVencidas?.(); // fire-and-forget (concluídas > 5 anos, exceto permanentes)
      } catch (e) { debug?.("[denuncia] admin:", e?.code || e?.message); state.denuncias = state.denuncias || []; }
    };
    window.triarDenuncia = async function (id, status, nota, desfecho, guardaPermanente) {
      if (!["nova", "em_analise", "concluida"].includes(status)) return;
      const patch = { status, nota: String(nota || "").slice(0, 2000) };
      if (typeof guardaPermanente === "boolean") patch.guardaPermanente = guardaPermanente;
      const d = (state.denuncias || []).find((x) => x.id === id);
      if (status === "concluida") {
        patch.desfecho = desfecho;
        // Carimba concluidaEm SÓ na transição pra concluída; se já estava concluída e o
        // admin só ajustou nota/desfecho/guarda, preserva o relógio de retenção original.
        if (!d || d.status !== "concluida" || !d.concluidaEm) patch.concluidaEm = _FV.serverTimestamp();
      }
      await db.collection("denuncias").doc(id).update(patch);
      // Espelho de acompanhamento: reflete o novo andamento pro denunciante que consulta
      // por codigo, SO quando o status realmente MUDA (nao bumpa atualizadoEm em edicao de
      // nota/desfecho sem transicao). Denuncia LEGADA (sem codigoAcompanhamento, anterior
      // ao protocolo) pula em silencio; falha do espelho e best-effort e NAO derruba a
      // triagem (a fonte de verdade do andamento e a propria /denuncias).
      const cod = d && d.codigoAcompanhamento;
      if (cod && d.status !== status) {
        try { await db.collection("denunciaStatus").doc(cod).update({ status, atualizadoEm: _FV.serverTimestamp() }); }
        catch (e) { debug?.("[denuncia] espelho triagem:", e?.code || e?.message); }
      }
      window.registrarAuditoria?.({ tipo: "denuncia", acao: `Triagem: ${status}`, alvo: id });
    };
    window.excluirDenuncia = async function (id) {
      // Apaga o espelho de acompanhamento JUNTO (best-effort): busca o codigo no state.
      // Espelho ausente (denuncia legada sem codigo, ou ja apagado) NAO bloqueia o expurgo
      // do relato — o Firestore e a fonte de verdade do "existe".
      const d = (state.denuncias || []).find((x) => x.id === id);
      const cod = d && d.codigoAcompanhamento;
      if (cod) {
        try { await db.collection("denunciaStatus").doc(cod).delete(); }
        catch (e) { debug?.("[denuncia] espelho expurgo:", e?.code || e?.message); }
      }
      await db.collection("denuncias").doc(id).delete();
      window.registrarAuditoria?.({ tipo: "denuncia", acao: "Excluiu denuncia (LGPD)", alvo: id });
    };
    // Expurgo automático LGPD (William 2026-07-16), espelha expurgarCandidaturasVencidas:
    // na sessão do ADMIN, ao carregar denúncias, apaga em silêncio as CONCLUÍDAS há mais de
    // 5 anos (piso de retenção da Lei 14.457/2022). Guarda permanente NUNCA entra. A própria
    // rule confere o piso; aqui o cliente só antecipa os candidatos. Fire-and-forget: erro
    // individual pula, nunca bloqueia render; 1 registro-resumo SEM PII (só a contagem).
    const EXPURGO_DEN_ANOS = 5;
    let _expurgoDenEmCurso = false;
    window.expurgarDenunciasVencidas = async function () {
      if (currentUser()?.role !== "admin") return; // canal fora da matriz de cap: só admin
      if (_expurgoDenEmCurso) return;
      _expurgoDenEmCurso = true;
      try {
        const lista = state.denuncias || [];
        if (!lista.length) return;
        const corte = new Date();
        corte.setFullYear(corte.getFullYear() - EXPURGO_DEN_ANOS); // 5 anos atrás (fronteira real)
        const corteMs = corte.getTime();
        const concMs = (d) => {
          const c = d && d.concluidaEm;
          if (!c) return null;
          const dt = (typeof c.toDate === "function") ? c.toDate() : new Date(c);
          return isNaN(dt.getTime()) ? null : dt.getTime();
        };
        let ok = 0;
        for (const d of lista.slice()) {
          if (d.status !== "concluida") continue;   // só denúncia encerrada
          if (d.guardaPermanente === true) continue; // caso gravíssimo: nunca expira
          const ms = concMs(d);
          if (ms == null || ms >= corteMs) continue; // sem carimbo ou dentro do piso: fica
          try {
            await window.excluirDenuncia(d.id);      // canônico (delete + auditoria); a rule reconfere o piso
            ok++;
            const i = lista.indexOf(d);
            if (i >= 0) lista.splice(i, 1);           // mantém o state honesto na sessão
          } catch (e) { debug?.("[denuncia] expurgo auto (pula 1):", e?.code || e?.message); }
        }
        // 1 entrada-resumo, ZERO PII (só a contagem, sem id/relato/categoria).
        if (ok) window.registrarAuditoria?.({ tipo: "denuncia", acao: `Expurgo automático: ${ok} denúncia(s), 5 anos após conclusão` });
        state.denunciasNovas = lista.filter((x) => x.status === "nova").length;
      } finally { _expurgoDenEmCurso = false; }
    };

    window.criarDocumentoInstitucional = async function (dados, publicarAgora) {
      const u = currentUser();
      const seg = dados.segmento || { tipo: "todos", valores: [] };
      const doc = {
        escopo: "institucional",
        titulo: String(dados.titulo || "").slice(0, 140),
        descricao: String(dados.descricao || ""),
        tipo: dados.tipo || "outro",
        segmento: seg,
        anexo: (dados.anexo && ehUrlSegura(dados.anexo.url)) ? dados.anexo : null,
        versao: 1,
        exigeAssinatura: !!dados.exigeAssinatura,
        confirmacao: ["nenhuma", "aceite", "assinatura"].includes(dados.confirmacao) ? dados.confirmacao : (dados.exigeAssinatura ? "assinatura" : "aceite"),
        status: "rascunho",
        alcanceEstimado: Number(dados.alcanceEstimado) || 0,
        criadoPor: (auth.currentUser && auth.currentUser.uid) || u?.id || null,
        autorNome: u?.nome || "GP",
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        publicadoEm: null, versaoEm: null, versaoPor: null,
      };
      try {
        const ref = await db.collection("documentos").add(doc);
        window.registrarAuditoria?.({ tipo: "documento", acao: "Criou documento", alvo: doc.titulo });
        if (publicarAgora) {
          await ref.update({ status: "publicado", publicadoEm: firebase.firestore.FieldValue.serverTimestamp() });
          window.registrarAuditoria?.({ tipo: "documento", acao: "Publicou documento", alvo: doc.titulo });
        }
        await recarregarDocumentos();
        closeModal(); toast(publicarAgora ? "Documento publicado." : "Rascunho salvo."); renderApp();
      } catch (e) { debug?.("[documento criar]", e?.message || e); toast("Erro ao salvar: " + e.message, "danger"); }
    };

    window.editarDocumento = async function (id, patch, publicarAgora) {
      const up = {
        titulo: String(patch.titulo || "").slice(0, 140),
        descricao: String(patch.descricao || ""),
        tipo: patch.tipo || "outro",
        segmento: patch.segmento || { tipo: "todos", valores: [] },
        anexo: (patch.anexo && ehUrlSegura(patch.anexo.url)) ? patch.anexo : null,
        exigeAssinatura: !!patch.exigeAssinatura,
        confirmacao: ["nenhuma", "aceite", "assinatura"].includes(patch.confirmacao) ? patch.confirmacao : (patch.exigeAssinatura ? "assinatura" : "aceite"),
        alcanceEstimado: Number(patch.alcanceEstimado) || 0,
      };
      try {
        const ref = db.collection("documentos").doc(id);
        await ref.update(up);
        if (publicarAgora) {
          await ref.update({ status: "publicado", publicadoEm: firebase.firestore.FieldValue.serverTimestamp() });
          window.registrarAuditoria?.({ tipo: "documento", acao: "Publicou documento", alvo: up.titulo });
        } else {
          window.registrarAuditoria?.({ tipo: "documento", acao: "Editou documento", alvo: up.titulo });
        }
        await recarregarDocumentos();
        closeModal(); toast(publicarAgora ? "Documento publicado." : "Rascunho salvo."); renderApp();
      } catch (e) { debug?.("[documento editar]", e?.message || e); toast("Erro ao salvar: " + e.message, "danger"); }
    };

    window.publicarDocumento = async function (id) {
      const d = (state.documentos || []).find((x) => x.id === id);
      try {
        await db.collection("documentos").doc(id).update({
          status: "publicado",
          publicadoEm: firebase.firestore.FieldValue.serverTimestamp(),
          alcanceEstimado: d ? (Number(d.alcanceEstimado) || 0) : 0,
        });
        window.registrarAuditoria?.({ tipo: "documento", acao: "Publicou documento", alvo: d?.titulo || id });
        await recarregarDocumentos();
        toast("Documento publicado."); renderApp();
      } catch (e) { toast("Erro: " + e.message, "danger"); }
    };

    // Exclusao fisica do documento institucional. A rule permite só admin
    // (allow delete: if isAdmin()). Remove o doc; subcoleções (assinaturas/leituras)
    // ficam órfãs e inacessíveis — aceitável pro caso de uso.
    window.excluirDocumento = async function (id) {
      const d = (state.documentos || []).find((x) => x.id === id);
      try {
        await db.collection("documentos").doc(id).delete();
        window.registrarAuditoria?.({ tipo: "documento", acao: "Excluiu documento", alvo: d?.titulo || id });
        await recarregarDocumentos();
        toast("Documento excluído."); renderApp();
      } catch (e) { toast("Erro ao excluir: " + (e?.message || e), "danger"); }
    };

    window.novaVersaoDocumento = async function (id, patch) {
      const d = (state.documentos || []).find((x) => x.id === id);
      const nova = ((d && d.versao) || 1) + 1;
      try {
        await db.collection("documentos").doc(id).update({
          versao: nova,
          anexo: { url: patch.url || "", nome: patch.nome || (d && d.titulo) || "", hashSha256: patch.hashSha256 || "" },
          versaoEm: firebase.firestore.FieldValue.serverTimestamp(),
          versaoPor: (auth.currentUser && auth.currentUser.uid) || null,
        });
        window.registrarAuditoria?.({ tipo: "documento", acao: "Nova versao (v" + nova + ")", alvo: d?.titulo || id });
        await recarregarDocumentos();
        closeModal(); toast("Nova versão publicada. Assinatura reaberta."); renderApp();
      } catch (e) { toast("Erro: " + e.message, "danger"); }
    };

    // App do colaborador: leitura (ciência) de documento. A assinatura N1 só-senha foi
    // substituída pela assinatura carimbada (geo+comprovante, assinarDocumentoCarimbado).
    window.registrarLeituraDocumento = async function (docId, opts = {}) {
      const uid = auth.currentUser && auth.currentUser.uid;
      if (!uid) return { ok: false, err: "sem sessao" };
      const u = currentUser();
      try {
        const ref = db.collection("documentos").doc(docId).collection("leituras").doc(uid);
        const snap = await ref.get();
        if (snap.exists) return { ok: true };
        await ref.set({ uid, funcionarioId: (u && u.funcionarioId) || null, confirmado: !!opts.confirmar, em: firebase.firestore.FieldValue.serverTimestamp(), userAgent: String(navigator.userAgent || "").slice(0, 200) });
        window.logEvento?.({ tipo: "ciencias", acao: opts.confirmar ? "Confirmou leitura de documento" : "Visualizou documento", alvo: ((state.documentosColab || []).find((x) => x.id === docId)?.titulo || docId) });
        // Ponto so no aceite RECEM-GRAVADO por este caminho (confirmado true no servidor);
        // o early-return acima nunca reivindica, o catch-up cobre com o valor do boot.
        if (opts.confirmar) window.gamiClaim?.("documento-leitura", docId, "Leitura confirmada: " + ((state.documentosColab || []).find((x) => x.id === docId)?.titulo || "documento"));
        return { ok: true };
      } catch (e) { return { ok: false, err: e.message }; }
    };

    // Documento de só ciência (sem assinatura): marca como lido.
    window.confirmarLeituraDocumentoColab = async function (docId) {
      const r = await window.registrarLeituraDocumento(docId, { confirmar: true });
      if (r && r.ok) {
        const d = (state.documentosColab || []).find((x) => x.id === docId);
        if (d && !d.minhaLeitura) d.minhaLeitura = { confirmado: true, em: new Date().toISOString() };
        toast("Leitura registrada.");
        renderApp();
      }
      return r;
    };

    // ===== Recibos (recibo de pagamento / cartão ponto por funcionário) =====
    // Metadados leves em recibos/{funcionarioId}_{competencia}_{tipo}; o PDF (base64)
    // vive na subcoleção arquivo/pdf — a lista lê só o pai, o arquivo vem sob demanda.
    // Colaborador lê SÓ o dele (rule SELF); admin/RH gerenciam (cap recibos.gerenciar).

    // CPF -> funcionarioId (admin/RH only). DUAS fontes, ambas chaveadas pelo código
    // CRU (ex.: "1041"; o funcionarioId do app = "f-"+codigo, diferente de bancoHoras):
    //   1) /identificacao: diretório de TODOS os ativos (pipeline) — cobre quem não tem
    //      banco de horas (ex.: menor aprendiz). Tem PRECEDÊNCIA.
    //   2) /banco-horas-saldos: fallback (só quem participa de BH).
    // TRANSITÓRIO: vive só na memória do navegador do gestor durante o import, pra
    // rotear as páginas. O CPF NUNCA persiste no doc do recibo (LGPD).
    window.carregarMapaCpf = async function () {
      const u = currentUser();
      if (!u || (u.role !== "admin" && u.role !== "rh")) return null;
      try {
        const [bhSnap, idSnap] = await Promise.all([
          db.collection("banco-horas-saldos").get().catch((e) => { debug?.("[recibos] saldos:", e?.message || e); return null; }),
          db.collection("identificacao").get().catch((e) => { debug?.("[recibos] identificacao:", e?.message || e); return null; }),
        ]);
        const mapa = {};
        const absorve = (snap) => {
          if (!snap) return;
          for (const d of snap.docs) {
            const cpf = String(d.data().cpf || "").replace(/\D/g, "");
            if (cpf.length === 11) mapa[cpf] = "f-" + d.id;
          }
        };
        absorve(bhSnap);
        absorve(idSnap); // por último = sobrepõe (fonte mais completa)
        return mapa;
      } catch (e) { debug?.("[recibos] mapa cpf:", e?.message || e); return null; }
    };

    // Lista do gestor (metadados de todos). Lazy: chamada quando a aba abre.
    // Fase B: junto vêm as assinaturas de cada recibo (padrão do recarregarDocumentos) —
    // alimenta a adesão do lote ("X de N assinaram") e o status por pessoa.
    window.recarregarRecibosGestor = async function () {
      try {
        const snap = await db.collection("recibos").orderBy("criadoEm", "desc").limit(2000).get();
        const arr = snap.docs.map((d) => { const x = d.data(); return { id: d.id, _ref: d.ref, ...x, criadoEm: tsToIso(x.criadoEm) }; });
        await Promise.all(arr.map(async (r) => {
          try {
            const asn = await r._ref.collection("assinaturas").get();
            r.assinaturas = asn.docs.map((x) => ({ ...x.data(), em: tsToIso(x.data().em) }));
          } catch (e) { r.assinaturas = []; }
          delete r._ref;
        }));
        state.recibos = arr;
      } catch (e) { debug?.("[recibos] load gestor:", e?.message || e); state.recibos = state.recibos || []; }
    };

    // Frescor pós-escrita (o "assinou e não aparece"): relê SÓ a subcoleção assinaturas
    // dos recibos cujos ids foram passados e atualiza state.recibos IN PLACE. Sem listener
    // novo — é um .get() pontual dos ids que o modal de adesão está exibindo.
    window.recarregarAssinaturasRecibos = async function (ids) {
      const alvo = (ids || []).filter(Boolean);
      if (!alvo.length) return;
      await Promise.all(alvo.map(async (id) => {
        try {
          const asn = await db.collection("recibos").doc(id).collection("assinaturas").get();
          const r = (state.recibos || []).find((x) => x.id === id);
          if (r) r.assinaturas = asn.docs.map((x) => ({ ...x.data(), em: tsToIso(x.data().em) }));
        } catch (e) { debug?.("[recibos] frescor assinaturas:", e?.message || e); }
      }));
    };

    // Análogo pro documento institucional: relê assinaturas + leituras daquele doc e
    // atualiza state.documentos in place. Alimenta o painel de adesão sem re-boot.
    window.recarregarAdesaoDocumento = async function (docId) {
      if (!docId) return;
      try {
        const ref = db.collection("documentos").doc(docId);
        const [asn, lei] = await Promise.all([
          ref.collection("assinaturas").get().catch(() => null),
          ref.collection("leituras").get().catch(() => null),
        ]);
        const d = (state.documentos || []).find((x) => x.id === docId);
        if (!d) return;
        if (asn) d.assinaturas = asn.docs.map((x) => ({ ...x.data(), em: tsToIso(x.data().em) }));
        if (lei) d.leituras = lei.docs.map((x) => ({ ...x.data(), em: tsToIso(x.data().em) }));
      } catch (e) { debug?.("[documento] frescor adesao:", e?.message || e); }
    };

    // Grava o lote: metadados + arquivo (base64) por funcionário, em chunks de 8.
    // RESILIENTE (lição do lote 24/82: uma falha transitória no 4º commit abortava os
    // 58 restantes): falha num chunk NÃO derruba os seguintes — re-tenta 1x, confere
    // se o commit chegou apesar do erro (o SDK pode aplicar e falhar só no retry
    // interno) e no fim reporta quem ficou de fora. Retorna { ok, n, falhas, err }.
    window.criarRecibosEmLote = async function (itens, onProgress) {
      const uid = auth.currentUser && auth.currentUser.uid;
      if (!uid) return { ok: false, n: 0, falhas: [], err: "sem sessao" };
      const espera = (ms) => new Promise((r) => setTimeout(r, ms));
      const idDe = (it) => `${it.funcionarioId}_${it.competencia}_${it.tipo}`;
      const montaBatch = (chunk) => {
        const batch = db.batch();
        for (const it of chunk) {
          const ref = db.collection("recibos").doc(idDe(it));
          batch.set(ref, {
            funcionarioId: it.funcionarioId,
            codigo: it.codigo || null,
            funcionarioNome: it.nome || "",
            competencia: it.competencia,
            tipo: it.tipo,
            paginas: it.paginas || 1,
            nomeArquivo: it.nomeArquivo || "recibo.pdf",
            status: "disponivel",
            criadoPor: uid,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
          });
          batch.set(ref.collection("arquivo").doc("pdf"), { funcionarioId: it.funcionarioId, base64: it.pdfBase64 });
        }
        return batch;
      };
      // O commit chegou mesmo com erro? (batch é atômico: 1º doc existe = entrou tudo)
      const chegou = async (chunk) => {
        try { const s = await db.collection("recibos").doc(idDe(chunk[0])).get(); return s.exists; }
        catch (e) { return false; }
      };
      // Padrão REAL de falha (24/82 e 56/82, sempre N lotes exatos): o canal do Firestore
      // morre no meio e tudo depois falha em série. Re-tentar no canal morto não adianta:
      // RECICLA a conexão (disableNetwork/enableNetwork) antes de tentar de novo.
      const reciclarConexao = async () => {
        try { await db.disableNetwork(); } catch (e) {}
        await espera(400);
        try { await db.enableNetwork(); } catch (e) {}
        await espera(600);
      };
      const TAM = 6; // commits mais leves aguentam melhor conexão fraca
      let salvos = 0; const falhas = []; let ultimoErr = null;
      for (let i = 0; i < itens.length; i += TAM) {
        const chunk = itens.slice(i, i + TAM);
        let okChunk = false;
        for (let tentativa = 1; tentativa <= 3 && !okChunk; tentativa++) {
          try { await montaBatch(chunk).commit(); okChunk = true; }
          catch (e) {
            ultimoErr = (e && (e.code ? e.code + ": " + e.message : e.message)) || String(e);
            debug?.(`[recibos] chunk ${Math.floor(i / TAM) + 1} falhou (tentativa ${tentativa}):`, ultimoErr);
            await espera(900);
            if (await chegou(chunk)) { okChunk = true; break; } // aplicou apesar do erro
            if (tentativa < 3) await reciclarConexao(); // canal pode ter morrido: renova
          }
        }
        if (okChunk) salvos += chunk.length;
        else falhas.push(...chunk.map((it) => it.nome || it.funcionarioId));
        // 3º arg: nomes do chunk que acabou de entrar (alimenta o ticker do overlay)
        onProgress?.(salvos, itens.length, okChunk ? chunk.map((it) => it.nome || "") : null);
        await espera(150); // respiro entre commits (não afoga o canal)
      }
      if (salvos > 0) {
        const alvo = `${salvos} × ${itens[0]?.tipo || "recibo"} · ${itens[0]?.competencia || ""}`
          + (falhas.length ? ` (${falhas.length} falharam · ${String(ultimoErr || "").slice(0, 120)})` : "");
        window.registrarAuditoria?.({ tipo: "recibos", acao: "Importou lote de recibos", alvo });
        window.logEvento?.({ tipo: "recibos", acao: "Importou lote", alvo });
      }
      return { ok: falhas.length === 0, n: salvos, falhas, err: ultimoErr };
    };

    // Busca o PDF (base64) de UM recibo, sob demanda (abrir/baixar).
    window.carregarArquivoRecibo = async function (reciboId) {
      try {
        const snap = await db.collection("recibos").doc(reciboId).collection("arquivo").doc("pdf").get();
        return snap.exists ? (snap.data().base64 || null) : null;
      } catch (e) { debug?.("[recibos] arquivo:", e?.message || e); return null; }
    };

    // Exclui um lote inteiro (tipo+competência): metadados + arquivos. Rule: só admin
    // (decisão: RH gerencia create/update; destruir é do admin, como nos documentos).
    // Guard aqui também: erro claro em vez de permission-denied no meio do batch.
    window.excluirLoteRecibos = async function (tipo, competencia) {
      const u = currentUser();
      if (!u || u.role !== "admin") return { ok: false, err: "Só o administrador exclui lotes." };
      try {
        const snap = await db.collection("recibos")
          .where("tipo", "==", tipo).where("competencia", "==", competencia).get();
        for (let i = 0; i < snap.docs.length; i += 200) {
          const chunk = snap.docs.slice(i, i + 200);
          const batch = db.batch();
          for (const d of chunk) {
            batch.delete(d.ref.collection("arquivo").doc("pdf"));
            batch.delete(d.ref);
          }
          await batch.commit();
        }
        window.registrarAuditoria?.({ tipo: "recibos", acao: "Excluiu lote de recibos", alvo: `${tipo} · ${competencia} (${snap.size})` });
        await window.recarregarRecibosGestor();
        return { ok: true, n: snap.size };
      } catch (e) { debug?.("[recibos] excluir lote:", e?.message || e); return { ok: false, err: e.message }; }
    };

    // ===== Fase B: assinatura carimbada do recibo/cartão =====

    // Reautentica com a senha AGORA (prova de presença, padrão N1 dos documentos).
    window.reautenticarSenha = async function (senha) {
      const user = auth.currentUser;
      if (!user) return { ok: false, msg: "Sessão expirada. Entre de novo." };
      if (!senha) return { ok: false, msg: "Digite sua senha pra confirmar." };
      try {
        const cred = firebase.auth.EmailAuthProvider.credential(user.email, senha);
        await user.reauthenticateWithCredential(cred);
        return { ok: true };
      } catch (e) {
        return { ok: false, msg: "Senha incorreta. Confira e tente de novo." };
      }
    };

    // Guarda a versão CARIMBADA no Storage (create-only) + a trilha imutável no Firestore.
    // Identidade já foi reautenticada pelo caller (reautenticarSenha). Se o upload achar o
    // arquivo de uma tentativa anterior, reaproveita e recalcula o hash DO ARQUIVO REAL
    // (a trilha nunca aponta hash de um arquivo que não é o do cofre).
    window.assinarReciboColab = async function (reciboId, geo, pdfAssinadoDataUrl, hashSha256) {
      const user = auth.currentUser;
      if (!user) return { ok: false, msg: "Sessão expirada. Entre de novo." };
      const u = currentUser();
      const r = (state.meusRecibos || []).find((x) => x.id === reciboId);
      if (!r || !u || r.funcionarioId !== u.funcionarioId) return { ok: false, msg: "Recibo não encontrado." };
      if (!geo || typeof geo.lat !== "number" || typeof geo.lng !== "number")
        return { ok: false, msg: "Localização ausente. Tente de novo." };
      const arquivoPath = `recibos/${r.funcionarioId}/assinado/${r.competencia}-${r.tipo}.pdf`;
      const ref = firebase.storage().ref(arquivoPath);
      let hashFinal = hashSha256 || "";
      const subir = () => ref.putString(pdfAssinadoDataUrl, "data_url", { contentType: "application/pdf" });
      try {
        await subir();
      } catch (e) {
        // token pode estar sem as claims (sessão anterior ao backfill): renova e re-tenta
        try { await user.getIdToken(true); await subir(); }
        catch (e2) {
          // create-only: se JÁ existe (tentativa anterior que falhou só na trilha), reusa
          // o arquivo do cofre e recalcula o hash a partir DELE.
          try {
            const url = await ref.getDownloadURL();
            const buf = await (await fetch(url)).arrayBuffer();
            const h = await crypto.subtle.digest("SHA-256", buf);
            hashFinal = Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
          } catch (e3) {
            return { ok: false, msg: "Não consegui guardar o arquivo assinado: " + (e2?.message || e2) };
          }
        }
      }
      try {
        await db.collection("recibos").doc(reciboId).collection("assinaturas").doc(user.uid).set({
          uid: user.uid,
          funcionarioId: r.funcionarioId,
          em: firebase.firestore.FieldValue.serverTimestamp(),
          userAgent: String(navigator.userAgent || "").slice(0, 200),
          geo: { lat: geo.lat, lng: geo.lng, acc: (typeof geo.acc === "number" ? Math.round(geo.acc) : null) },
          hashSha256: hashFinal,
          aceiteTexto: "Li e estou de acordo",
          arquivoPath,
        });
      } catch (e) {
        return { ok: false, msg: "O arquivo foi guardado, mas o registro da assinatura falhou (" + (e?.message || e) + "). Toque em Assinar de novo que ele completa." };
      }
      r.minhaAssinatura = { uid: user.uid, em: new Date().toISOString(), arquivoPath, geo };
      window.logEvento?.({ tipo: "recibos", acao: "Assinou", alvo: `${r.tipo} · ${r.competencia}` });
      window.registrarAuditoria?.({ tipo: "recibos", acao: "Assinou recibo (carimbado no arquivo)", alvo: `${r.funcionarioNome || r.funcionarioId} · ${r.tipo} · ${r.competencia}` });
      window.gamiClaim?.(r.tipo === "cartao-ponto" ? "cartao-ponto" : "folha", reciboId, (r.tipo === "cartao-ponto" ? "Cartão ponto " : "Folha de pagamento ") + (r.competencia || ""));
      return { ok: true, arquivoPath };
    };

    // Assinatura eletrônica CARIMBADA de DOCUMENTO institucional (nível 'assinatura').
    // Espelha assinarReciboColab: sobe um COMPROVANTE (PDF novo, gerado no cliente) no
    // Storage e grava a trilha imutável no Firestore. Identidade já foi reautenticada pelo
    // caller (reautenticarSenha). O hash é do CONTEÚDO ORIGINAL (anexo ou texto), calculado
    // no cliente e passado aqui — NUNCA é o hash do comprovante.
    window.assinarDocumentoCarimbado = async function (docId, geo, comprovanteDataUrl, hashOriginal) {
      const user = auth.currentUser;
      if (!user) return { ok: false, msg: "Sessão expirada. Entre de novo." };
      const u = currentUser();
      const d = (state.documentosColab || []).find((x) => x.id === docId);
      if (!d) return { ok: false, msg: "Documento não encontrado." };
      if (!geo || typeof geo.lat !== "number" || typeof geo.lng !== "number")
        return { ok: false, msg: "Localização ausente. Tente de novo." };
      const versaoDoDocumento = Number(d.versao) || 1;
      // ponytail: a versão vai no NOME do arquivo pra cada versão virar um comprovante
      // distinto; mas a trilha usa a chave uid create-only (docId/assinaturas/{uid}), então
      // re-assinar uma NOVA versão hoje é barrado pela rule (o doc do uid já existe). Upgrade
      // futuro: chave `{uid}_v{n}` + rule aditiva que valide o sufixo == versaoAssinada.
      const arquivoPath = `documentos-assinados/${u?.funcionarioId || user.uid}/${docId}-v${versaoDoDocumento}.pdf`;
      const ref = firebase.storage().ref(arquivoPath);
      // sha256Original em customMetadata é cinto e suspensório: o hash do conteúdo original
      // também vive na trilha (Firestore) e na página de autenticação do PDF; guardar no
      // objeto do Storage dá uma terceira âncora. A rule do Storage não restringe metadata.
      const subir = () => ref.putString(comprovanteDataUrl, "data_url", { contentType: "application/pdf", customMetadata: { sha256Original: String(hashOriginal || "") } });
      try {
        await subir();
      } catch (e) {
        // token pode estar sem as claims (sessão anterior ao backfill): renova e re-tenta
        try { await user.getIdToken(true); await subir(); }
        catch (e2) {
          // create-only no Storage: se o comprovante JÁ existe (tentativa anterior que morreu
          // antes de gravar a trilha), ele serve — segue DIRETO pra trilha. O hash é do
          // ORIGINAL (não do comprovante), então não há nada a recomputar. Só distinguimos
          // "já existe" de "falha real" perguntando ao cofre se o objeto está lá.
          let jaExiste = false;
          try { await ref.getMetadata(); jaExiste = true; } catch (e3) { /* não existe / sem acesso */ }
          if (!jaExiste) return { ok: false, msg: "Não consegui guardar o comprovante: " + (e2?.message || e2) };
          // segue pra trilha
        }
      }
      const aceiteTexto = "Li o documento e estou de acordo. Autorizo o registro eletrônico da minha assinatura.";
      try {
        await db.collection("documentos").doc(docId).collection("assinaturas").doc(user.uid).set({
          uid: user.uid,
          funcionarioId: (u && u.funcionarioId) || null,
          versaoAssinada: versaoDoDocumento,
          hashSha256: hashOriginal || "",
          aceiteTexto,
          em: firebase.firestore.FieldValue.serverTimestamp(),
          userAgent: String(navigator.userAgent || "").slice(0, 200),
          geo: { lat: geo.lat, lng: geo.lng, acc: (typeof geo.acc === "number" ? Math.round(geo.acc) : null) },
          arquivoPath,
        });
      } catch (e) {
        return { ok: false, msg: "O comprovante foi guardado, mas o registro da assinatura falhou (" + (e?.message || e) + "). Toque em Assinar de novo que ele completa." };
      }
      d.minhaAssinatura = { uid: user.uid, versaoAssinada: versaoDoDocumento, em: new Date().toISOString(), arquivoPath, geo, hashSha256: hashOriginal || "", aceiteTexto };
      window.logEvento?.({ tipo: "ciencias", acao: "Assinou documento", alvo: (d.titulo || docId) + " v" + versaoDoDocumento });
      window.registrarAuditoria?.({ tipo: "documento", acao: "Assinou documento (carimbado)", alvo: (d.titulo || docId) + " v" + versaoDoDocumento });
      window.gamiClaim?.("documento-assinatura", docId, "Assinou: " + (d.titulo || "documento"));
      return { ok: true, arquivoPath };
    };

    // URL de download da versão assinada (Storage). Retorna a URL ou null — os call sites
    // (recibos e comprovante) seguem lendo url|null, sem mudança de contrato. Em falha grava
    // o CÓDIGO do erro do path original em window.__ultimoErroStorage (ex.:
    // 'storage/object-not-found', 'storage/unauthorized') pra o chamador dar um toast com a
    // causa certa em vez de silêncio.
    //
    // TOLERÂNCIA A PASTA IRMÃ (só comprovantes de documentos): o path é
    // `documentos-assinados/{dono}/{arquivo}`, onde {dono} foi `funcionarioId || uid` no ato
    // de assinar. Se a claim funcionarioId do token mudou entre assinar e ler (re-provisão do
    // pipeline), ou caiu no fallback uid, a leitura do path EXATO é negada. A TRILHA é
    // IMUTÁVEL por regra (hasOnly) — NÃO reescrevemos o arquivoPath; só tentamos as pastas
    // irmãs plausíveis (funcionarioId atual, uid atual e, no gestor, o funcionarioId do
    // assinante) com o MESMO nome de arquivo. A pasta que o token autoriza abre normal. As
    // rules não mudam: pasta errada continua negada por design. (Caminho PLANO de 2 segmentos
    // nunca existiu neste código — confirmado no git —, mas o mesmo mecanismo o cobriria.)
    window.urlArquivoAssinado = async function (arquivoPath, opts) {
      // TIMEOUT por tentativa (bug B2, William 2026-07-17): o SDK do Storage re-tenta por até
      // 2 minutos antes de rejeitar; numa rede ruim isso vira botão MUDO (promise pendurada
      // segura o withBusy e nem toast sai). Prazo de 6s por tentativa: estourou, vira código
      // 'timeout', a promise SEMPRE assenta e o usuário SEMPRE recebe resposta.
      const tentar = async (p) => {
        try {
          const url = await Promise.race([
            firebase.storage().ref(p).getDownloadURL(),
            new Promise((_, rej) => setTimeout(() => rej({ code: "timeout" }), 6000)),
          ]);
          return { url };
        }
        catch (e) { const code = (e && e.code) || String((e && e.message) || e); debug?.("[recibos] url assinado (" + p + "):", code); return { url: null, code }; }
      };
      const primeira = await tentar(arquivoPath);
      window.__ultimoErroStorage = primeira.url ? null : primeira.code;
      if (primeira.url) return primeira.url;
      // Fallback de pasta irmã só pra comprovantes de documentos (recibos têm outro prefixo).
      const m = /^documentos-assinados\/(?:(.+)\/)?([^/]+)$/.exec(String(arquivoPath || ""));
      if (!m) return null;
      const donoOriginal = m[1] || null; // pasta já tentada acima (null se path plano)
      const arquivo = m[2];              // {docId}-v{n}.pdf
      const u = currentUser();
      const candidatos = [
        opts && opts.funcionarioId,                  // assinante (contexto gestor/trilha)
        u && u.funcionarioId,                        // funcionarioId do usuário atual
        auth.currentUser && auth.currentUser.uid,    // uid do usuário atual (legado do fallback)
      ].filter((c) => c && c !== donoOriginal);
      const vistos = new Set();
      for (const c of candidatos) {
        if (vistos.has(c)) continue; vistos.add(c);
        const r = await tentar("documentos-assinados/" + c + "/" + arquivo);
        if (r.url) { debug?.("[recibos] comprovante aberto por pasta irmã:", c); window.__ultimoErroStorage = null; return r.url; }
      }
      return null;
    };

    // ===== Disciplinares (advertencia/suspensao) — dado SENSIVEL =====
    // Gestor (admin/RH le tudo, lider le do turno dele). Sem orderBy nas queries com where
    // (evita indice composto); ordena no cliente. Auditoria no create/delete.
    async function recarregarDisciplinares() {
      try {
        const u = currentUser();
        let snap = null;
        if (u.role === "admin" || u.role === "rh") {
          snap = await db.collection("disciplinares").get();
        } else if (u.role === "lider") {
          snap = await db.collection("disciplinares").where("funcionarioTurno", "==", u.turno).get();
        } else { state.disciplinares = state.disciplinares || []; return; }
        // Ciências em PARALELO (era N+1 sequencial).
        const arr = await Promise.all(snap.docs.map(async (d) => {
          const dat = d.data();
          const o = { id: d.id, ...dat, criadoEm: tsToIso(dat.criadoEm), ciencias: [] };
          try { const cs = await d.ref.collection("ciencia").get(); o.ciencias = cs.docs.map((x) => ({ ...x.data(), em: tsToIso(x.data().em) })); } catch (e) { /* sem ciencias visiveis */ }
          return o;
        }));
        arr.sort((a, b) => String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")));
        state.disciplinares = arr;
      } catch (e) { debug?.("[disciplinares] load:", e?.message || e); state.disciplinares = state.disciplinares || []; }
    }
    window.recarregarDisciplinares = recarregarDisciplinares;

    window.criarDisciplinar = async function (dados) {
      const u = currentUser();
      try {
        const ref = await db.collection("disciplinares").add({
          funcionarioId: dados.funcionarioId,
          funcionarioNome: dados.funcionarioNome || "",
          funcionarioTurno: (dados.funcionarioTurno === undefined ? null : dados.funcionarioTurno),
          funcionarioCargo: dados.funcionarioCargo || "",
          funcionarioSetor: dados.funcionarioSetor || "",
          tipo: dados.tipo,
          data: dados.data || null,
          motivo: dados.motivo || "",
          descricao: dados.descricao || "",
          dias: dados.tipo === "suspensao" ? (Number(dados.dias) || 0) : null,
          anexo: (dados.anexo && dados.anexo.url) ? { url: dados.anexo.url, nome: dados.anexo.nome || "" } : null,
          aplicadoPor: (auth.currentUser && auth.currentUser.uid) || null,
          aplicadoPorNome: (u && u.nome) || "",
          criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        });
        window.registrarAuditoria?.({ tipo: "disciplinar", acao: "Registrou " + (dados.tipo === "suspensao" ? "suspensao" : "advertencia " + dados.tipo), alvo: dados.funcionarioNome || dados.funcionarioId });
        await recarregarDisciplinares();
        closeModal(); toast("Ocorrência disciplinar registrada."); renderApp();
        return { ok: true, id: ref.id };
      } catch (e) { toast("Erro: " + (e?.message || e), "danger"); return { ok: false, err: e?.message }; }
    };

    window.excluirDisciplinar = async function (id) {
      const d = (state.disciplinares || []).find((x) => x.id === id);
      try {
        await db.collection("disciplinares").doc(id).delete();
        window.registrarAuditoria?.({ tipo: "disciplinar", acao: "Excluiu registro disciplinar", alvo: (d && d.funcionarioNome) || id });
        await recarregarDisciplinares();
        toast("Registro excluído."); renderApp();
      } catch (e) { toast("Erro ao excluir: " + (e?.message || e), "danger"); }
    };

    // Colaborador da ciencia (self-write na subcolecao). So o dono consegue (rule).
    window.darCienciaDisciplinar = async function (id) {
      const u = currentUser();
      try {
        const uid = auth.currentUser && auth.currentUser.uid;
        await db.collection("disciplinares").doc(id).collection("ciencia").doc(uid).set({
          uid,
          funcionarioId: (u && u.funcionarioId) || "",
          em: firebase.firestore.FieldValue.serverTimestamp(),
          userAgent: (navigator.userAgent || "").slice(0, 200),
        });
        const d = (state.disciplinaresColab || []).find((x) => x.id === id);
        if (d) d.minhaCiencia = { em: new Date().toISOString() };
        window.logEvento?.({ tipo: "ciencias", acao: "Registrou ciência disciplinar", alvo: "Registro disciplinar" + (d?.data ? " · " + d.data : "") });
        toast("Ciência registrada."); renderApp();
        return { ok: true };
      } catch (e) { toast("Não consegui registrar: " + (e?.message || e), "danger"); return { ok: false }; }
    };

    // Termo de adesão à assinatura eletrônica (1º acesso do colaborador). Self-write
    // create-only em /termoAdesao/{uid} (id = uid). A rule é imutável e valida hasOnly dos
    // 6 campos exatos + funcionarioId == users/{uid}.funcionarioId (euSouODono) + versao e
    // hashSha256 CRAVADOS na regra. Se o doc JÁ existe (create-only barra o 2º write),
    // tratamos como "já aceitou" e resolvemos ok.
    // Lê o aceite do termo com N tentativas (cold start offline do PWA). Atualiza
    // state.termoAdesaoOk e retorna true/false/null (null = todas as tentativas falharam).
    window.verificarTermoAdesao = async function (tentativas) {
      const n = Math.max(1, tentativas || 1);
      const uidT = (auth.currentUser && auth.currentUser.uid) || (currentUser() && currentUser().id);
      if (!uidT) { state.termoAdesaoOk = null; return null; }
      for (let i = 0; i < n; i++) {
        try {
          const t = await db.collection("termoAdesao").doc(String(uidT)).get();
          state.termoAdesaoOk = t.exists && t.data().versao === TERMO_VERSAO;
          return state.termoAdesaoOk;
        } catch (e) {
          debug?.("[colab] termo adesão (tentativa " + (i + 1) + "):", e?.message || e);
          if (i < n - 1) await new Promise((r) => setTimeout(r, 1200));
        }
      }
      state.termoAdesaoOk = null;
      return null;
    };

    window.registrarTermoAdesao = async function () {
      const user = auth.currentUser;
      if (!user) return { ok: false, msg: "Sessão expirada. Entre de novo." };
      const u = currentUser();
      if (!u || u.role !== "colaborador" || !u.funcionarioId)
        return { ok: false, msg: "Termo indisponível para este acesso." };
      const ref = db.collection("termoAdesao").doc(user.uid);
      try {
        await ref.set({
          uid: user.uid,
          funcionarioId: u.funcionarioId,
          versao: TERMO_VERSAO,
          hashSha256: TERMO_HASH,
          em: firebase.firestore.FieldValue.serverTimestamp(),
          userAgent: String(navigator.userAgent || "").slice(0, 200),
        });
        state.termoAdesaoOk = true;
        window.logEvento?.({ tipo: "acessos", acao: "Aderiu à assinatura eletrônica", alvo: `termo ${TERMO_VERSAO}` });
        window.gamiClaim?.("termo", user.uid, "Termo de Adesão à assinatura eletrônica");
        return { ok: true };
      } catch (e) {
        // create-only: doc já existe (aceitou num acesso anterior) → já ok, não quebra.
        try {
          const snap = await ref.get();
          if (snap.exists) { state.termoAdesaoOk = true; return { ok: true, jaExistia: true }; }
        } catch (e2) { /* leitura de confirmação falhou; cai no erro genérico abaixo */ }
        return { ok: false, msg: "Não consegui registrar o aceite: " + (e?.message || e) };
      }
    };

    // Termo do canal de denúncias (2º gate do 1º acesso, DEPOIS da adesão). ESPELHO do
    // termoAdesao acima: self-write create-only em /termoCanalDenuncia/{uid}, imutável, mesmos
    // 6 campos + funcionarioId == users/{uid}.funcionarioId + versao/hash CRAVADOS na regra.
    window.verificarTermoCanalDenuncia = async function (tentativas) {
      const n = Math.max(1, tentativas || 1);
      const uidT = (auth.currentUser && auth.currentUser.uid) || (currentUser() && currentUser().id);
      if (!uidT) { state.termoCanalOk = null; return null; }
      for (let i = 0; i < n; i++) {
        try {
          const t = await db.collection("termoCanalDenuncia").doc(String(uidT)).get();
          state.termoCanalOk = t.exists && t.data().versao === TERMO_CANAL_VERSAO;
          return state.termoCanalOk;
        } catch (e) {
          debug?.("[colab] termo canal (tentativa " + (i + 1) + "):", e?.message || e);
          if (i < n - 1) await new Promise((r) => setTimeout(r, 1200));
        }
      }
      state.termoCanalOk = null;
      return null;
    };

    window.registrarTermoCanalDenuncia = async function () {
      const user = auth.currentUser;
      if (!user) return { ok: false, msg: "Sessão expirada. Entre de novo." };
      const u = currentUser();
      if (!u || u.role !== "colaborador" || !u.funcionarioId)
        return { ok: false, msg: "Termo indisponível para este acesso." };
      const ref = db.collection("termoCanalDenuncia").doc(user.uid);
      try {
        await ref.set({
          uid: user.uid,
          funcionarioId: u.funcionarioId,
          versao: TERMO_CANAL_VERSAO,
          hashSha256: TERMO_CANAL_HASH,
          em: firebase.firestore.FieldValue.serverTimestamp(),
          userAgent: String(navigator.userAgent || "").slice(0, 200),
        });
        state.termoCanalOk = true;
        window.logEvento?.({ tipo: "acessos", acao: "Aceitou o termo do canal de denúncias", alvo: `termo ${TERMO_CANAL_VERSAO}` });
        return { ok: true };
      } catch (e) {
        // create-only: doc já existe (aceitou num acesso anterior) → já ok, não quebra.
        try {
          const snap = await ref.get();
          if (snap.exists) { state.termoCanalOk = true; return { ok: true, jaExistia: true }; }
        } catch (e2) { /* leitura de confirmação falhou; cai no erro genérico abaixo */ }
        return { ok: false, msg: "Não consegui registrar o aceite: " + (e?.message || e) };
      }
    };

    // Carrega os DOCS completos dos aceites do próprio colaborador (tela Documentos, grupo
    // "Meus termos"). Get por uid nas 2 coleções self-read (/termoAdesao, /termoCanalDenuncia;
    // rule read = dono+admin+RH). Não denormaliza PII: nome/CPF/local vêm no cliente das mesmas
    // fontes do gate. Cacheia em state.meusTermos SÓ quando não houve erro (erro deixa undefined
    // pra reabrir refazer a leitura). Retorna { ok } — o caller decide o toast.
    window.carregarMeusTermos = async function () {
      const uidT = (auth.currentUser && auth.currentUser.uid) || (currentUser() && currentUser().id);
      if (!uidT) { state.meusTermos = []; return { ok: true }; }
      const defs = [
        { tipo: "adesao", col: "termoAdesao" },
        { tipo: "canal", col: "termoCanalDenuncia" },
      ];
      const out = []; let erro = false;
      await Promise.all(defs.map(async (d) => {
        try {
          const snap = await db.collection(d.col).doc(String(uidT)).get();
          if (snap.exists) {
            const dat = snap.data() || {};
            out.push({ tipo: d.tipo, em: tsToIso(dat.em), versao: dat.versao || "", hashSha256: dat.hashSha256 || "", id: d.col + "/" + uidT });
          }
        } catch (e) { erro = true; debug?.("[colab] meus termos " + d.tipo + ":", e?.message || e); }
      }));
      if (erro) return { ok: false }; // não cacheia: próxima abertura tenta de novo
      const ordem = { adesao: 0, canal: 1 };
      out.sort((a, b) => (ordem[a.tipo] ?? 9) - (ordem[b.tipo] ?? 9));
      state.meusTermos = out;
      return { ok: true };
    };

    // Import Banco de Horas: substituição completa em /bancoHoras
    window.doImportBancoHorasFirebase = async function (entries) {
      const u = currentUser();
      try {
        // 1) Apaga TODOS os docs atuais de bancoHoras (substituição completa)
        const snap = await db.collection("bancoHoras").get();
        const deleteBatches = [];
        let curDel = db.batch(); let opsDel = 0;
        snap.docs.forEach((d) => {
          curDel.delete(d.ref); opsDel++;
          if (opsDel >= 400) { deleteBatches.push(curDel); curDel = db.batch(); opsDel = 0; }
        });
        if (opsDel > 0) deleteBatches.push(curDel);
        for (const b of deleteBatches) await b.commit();

        // 2) Insere os novos
        const chunks = [];
        for (let i = 0; i < entries.length; i += 400) chunks.push(entries.slice(i, i + 400));

        let total = 0;
        for (const chunk of chunks) {
          const batch = db.batch();
          for (const e of chunk) {
            const f = getFuncionario(e.funcionarioId);
            batch.set(db.collection("bancoHoras").doc(e.funcionarioId), {
              funcionarioCodigo: e.codigo,
              funcionarioNome: f?.nome || e.nome,
              funcionarioTurno: f?.turno ?? null,
              minutos: e.minutos,
              saldoFormatado: e.saldoStr,
              atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
              atualizadoPor: u.id,
            });
          }
          await batch.commit();
          total += chunk.length;
        }

        // 3) Reflete no state local
        state.bancoHoras = {};
        for (const e of entries) {
          state.bancoHoras[e.funcionarioId] = {
            funcionarioCodigo: e.codigo,
            minutos: e.minutos,
            saldoFormatado: e.saldoStr,
            atualizadoEm: new Date().toISOString(),
            atualizadoPor: u.id,
          };
        }

        window.logEvento?.({ tipo: "dados", acao: "Importou banco de horas", alvo: `${total} saldos` });
        closeModal();
        toast(`${total} saldos sincronizados no Firestore.`);
        renderApp();
      } catch (err) {
        debug?.(err);
        toast("Erro ao importar: " + err.message, "danger");
      }
    };

    // Override doImportFuncionarios → batch write em /funcionarios
    window.doImportFuncionarios = async function () {
      const data = window._importData;
      if (!Array.isArray(data) || data.length === 0) return;
      const markAusentes = $("#import-replace").checked;

      if (markAusentes) {
        if (!(await confirmar({
          titulo: "Marcar inativos?",
          msg: "Os funcionários que não estão no JSON serão marcados como inativos. Eles continuam no Firestore, ocorrências antigas mantêm a referência.",
          okLabel: "Marcar inativos",
          perigo: true,
        }))) return;
      }

      const incomingIds = new Set();

      // Upsert em chunks de 400 (limite de batch do Firestore é 500)
      const chunks = [];
      for (let i = 0; i < data.length; i += 400) chunks.push(data.slice(i, i + 400));

      let total = 0;
      for (const chunk of chunks) {
        const batch = db.batch();
        for (const item of chunk) {
          const id = "f-" + (item.codigo || slugify(item.nome));
          incomingIds.add(id);
          const ref = db.collection("funcionarios").doc(id);
          batch.set(ref, {
            nome: item.nome,
            codigo: item.codigo || null,
            turno: item.turno ?? null,
            liderNome: item.liderNome || null,
            setor: item.setor || null,
            ativo: item.ativo !== false,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          const existing = state.funcionarios.find((x) => x.id === id);
          if (existing) Object.assign(existing, {
            nome: item.nome, codigo: item.codigo, turno: item.turno ?? null,
            liderNome: item.liderNome || null,
            setor: item.setor || null, ativo: item.ativo !== false,
          });
          else state.funcionarios.push({
            id, nome: item.nome, codigo: item.codigo, turno: item.turno ?? null,
            liderNome: item.liderNome || null,
            setor: item.setor || null, ativo: item.ativo !== false,
          });
        }
        await batch.commit();
        total += chunk.length;
      }

      let inativados = 0;
      if (markAusentes) {
        // Pega TODOS os funcionarios atuais do Firestore (mesmo os de outras páginas que o state local pode não ter)
        const allSnap = await db.collection("funcionarios").get();
        const inativarBatches = [];
        let currentBatch = db.batch();
        let opsInBatch = 0;
        for (const doc of allSnap.docs) {
          if (!incomingIds.has(doc.id) && doc.data().ativo !== false) {
            currentBatch.update(doc.ref, {
              ativo: false,
              atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            });
            inativados++;
            opsInBatch++;
            if (opsInBatch >= 400) {
              inativarBatches.push(currentBatch);
              currentBatch = db.batch();
              opsInBatch = 0;
            }
          }
        }
        if (opsInBatch > 0) inativarBatches.push(currentBatch);
        for (const b of inativarBatches) await b.commit();

        // Reflete no state local
        for (const f of state.funcionarios) {
          if (!incomingIds.has(f.id) && f.ativo !== false) f.ativo = false;
        }
      }

      window.logEvento?.({ tipo: "dados", acao: "Importou funcionários", alvo: `${total} no JSON${markAusentes ? ` · ${inativados} inativados` : ""}` });
      closeModal();
      toast(`Sincronizado: ${total} no JSON${markAusentes ? ` · ${inativados} inativados` : ""}.`);
      renderApp();
    };

    // Override saveAcao → /acoes
    window.saveAcao = async function () {
      const label = $("#acao-label").value.trim();
      if (!label) return toast("Informe o nome da ação.", "danger");
      if (label.length < 3) return toast("Nome muito curto.", "danger");
      const id = "custom-" + slugify(label);
      if (getAcao(id)) return toast("Já existe uma ação com nome parecido.", "danger");

      const u = currentUser();
      const nova = {
        label,
        padrao: false,
        criadoPor: u.id,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      };
      try {
        await db.collection("acoes").doc(id).set(nova);
        if (!state.acoesCustom) state.acoesCustom = [];
        state.acoesCustom.push({ id, ...nova, criadoEm: new Date().toISOString() });
        window.logEvento?.({ tipo: "dados", acao: "Criou ação", alvo: (nova.label || id) });
        closeModal();
        toast("Ação criada!");
        renderApp();
      } catch (err) {
        debug?.(err);
        toast("Erro: " + err.message, "danger");
      }
    };

    // Override updateAcao → /acoes (rename, com suporte a override de padrão)
    window.updateAcao = async function (id) {
      const label = $("#edit-acao-label").value.trim();
      if (!label || label.length < 3) return toast("Nome muito curto.", "danger");

      const u = currentUser();
      const dados = {
        label,
        padrao: false,
        atualizadoPor: u.id,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      };
      try {
        await db.collection("acoes").doc(id).set(dados, { merge: true });
        if (!state.acoesCustom) state.acoesCustom = [];
        const existing = state.acoesCustom.find((x) => x.id === id);
        if (existing) Object.assign(existing, { label, padrao: false });
        else state.acoesCustom.push({ id, label, padrao: false, atualizadoPor: u.id, atualizadoEm: new Date().toISOString() });
        closeModal();
        toast("Ação atualizada.");
        renderApp();
      } catch (err) {
        toast("Erro: " + err.message, "danger");
      }
    };

    // Override updateTipo → /tipos (rename + tone, override de padrão também)
    window.updateTipo = async function (id) {
      const label = $("#edit-tipo-label").value.trim();
      const tone = $("#edit-tipo-tone").value;
      if (!label || label.length < 3) return toast("Nome muito curto.", "danger");

      const u = currentUser();
      const dados = {
        label,
        tone,
        padrao: false,
        atualizadoPor: u.id,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      };
      try {
        await db.collection("tipos").doc(id).set(dados, { merge: true });
        if (!state.tiposCustom) state.tiposCustom = [];
        const existing = state.tiposCustom.find((x) => x.id === id);
        if (existing) Object.assign(existing, { label, tone, padrao: false });
        else state.tiposCustom.push({ id, label, tone, padrao: false, atualizadoPor: u.id, atualizadoEm: new Date().toISOString() });
        closeModal();
        toast("Tipo atualizado.");
        renderApp();
      } catch (err) {
        toast("Erro: " + err.message, "danger");
      }
    };

    // Override deleteAcao → /acoes
    window.deleteAcao = async function (id) {
      const a = (state.acoesCustom || []).find((x) => x.id === id);
      if (!a) return;
      const usada = state.ocorrencias.some((o) => o.acao === id);
      if (usada) {
        if (!(await confirmar({
          titulo: `Excluir "${a.label}"?`,
          msg: "Está em uso. Excluir deixa essas ocorrências com a ação registrada mas a opção some do dropdown.",
          okLabel: "Excluir",
          perigo: true,
        }))) return;
      } else {
        if (!(await confirmar({
          titulo: "Excluir ação?",
          msg: `Remover a ação "${a.label}".`,
          okLabel: "Excluir",
          perigo: true,
        }))) return;
      }
      try {
        await db.collection("acoes").doc(id).delete();
        state.acoesCustom = state.acoesCustom.filter((x) => x.id !== id);
        toast("Ação excluída.");
        renderApp();
      } catch (err) {
        toast("Erro: " + err.message, "danger");
      }
    };

    // Override deleteTipo → exclui de /tipos
    window.deleteTipo = async function (id) {
      const t = (state.tiposCustom || []).find((x) => x.id === id);
      if (!t) return;
      const usado = state.ocorrencias.some((o) => o.tipo === id);
      if (usado) {
        if (!(await confirmar({
          titulo: `Excluir "${t.label}"?`,
          msg: "Está em uso. Excluir mantém os registros mas o tipo some do form.",
          okLabel: "Excluir",
          perigo: true,
        }))) return;
      } else {
        if (!(await confirmar({
          titulo: "Excluir tipo?",
          msg: `Remover o tipo "${t.label}".`,
          okLabel: "Excluir",
          perigo: true,
        }))) return;
      }
      try {
        await db.collection("tipos").doc(id).delete();
        state.tiposCustom = state.tiposCustom.filter((x) => x.id !== id);
        toast("Tipo excluído.");
        renderApp();
      } catch (err) {
        debug?.(err);
        toast("Erro ao excluir: " + err.message, "danger");
      }
    };

    // ---- Obrigações do GH → /obrigacoes (CRUD + marcar conclusão por período) ----
    window.salvarObrigacao = async function (dados, id) {
      const u = currentUser();
      try {
        if (id) {
          await db.collection("obrigacoes").doc(id).set(
            { ...dados, atualizadoPor: u.id, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() },
            { merge: true });
          const o = (state.obrigacoes || []).find((x) => x.id === id);
          if (o) Object.assign(o, dados);
        } else {
          const ref = await db.collection("obrigacoes").add({
            ...dados, ativo: true, conclusoes: {}, criadoPor: u.id,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
          });
          if (!state.obrigacoes) state.obrigacoes = [];
          state.obrigacoes.push({ id: ref.id, ativo: true, conclusoes: {}, ...dados });
        }
        closeModal(); toast("Obrigação salva."); renderApp();
      } catch (err) { toast("Erro: " + err.message, "danger"); }
    };
    window.removerObrigacao = async function (id) {
      const o = (state.obrigacoes || []).find((x) => x.id === id);
      if (!o) return;
      if (!(await confirmar({ titulo: "Excluir obrigação?", msg: `Remover "${o.titulo}".`, okLabel: "Excluir", perigo: true }))) return;
      try {
        await db.collection("obrigacoes").doc(id).delete();
        state.obrigacoes = (state.obrigacoes || []).filter((x) => x.id !== id);
        closeModal(); toast("Obrigação excluída."); renderApp();
      } catch (err) { toast("Erro: " + err.message, "danger"); }
    };
    window.marcarObrigacao = async function (id, periodo, feito) {
      const o = (state.obrigacoes || []).find((x) => x.id === id);
      if (!o) return;
      const u = currentUser();
      o.conclusoes = o.conclusoes || {};
      // FieldPath (não string com ponto): o período "2026-06" começa com dígito.
      const fp = new firebase.firestore.FieldPath("conclusoes", periodo);
      try {
        if (feito) {
          o.conclusoes[periodo] = { por: u.id, em: new Date().toISOString() };
          await db.collection("obrigacoes").doc(id).update(fp, { por: u.id, em: firebase.firestore.FieldValue.serverTimestamp() });
        } else {
          delete o.conclusoes[periodo];
          await db.collection("obrigacoes").doc(id).update(fp, firebase.firestore.FieldValue.delete());
        }
        renderApp();
      } catch (err) { toast("Erro: " + err.message, "danger"); }
    };
  }

  // ----------------------------------------
  // Fluxo de autenticação
  // ----------------------------------------

  function wireAuthFlow(auth, db) {
    // Override login: trata input como email (login-user) + senha.
    // Retorna true em sucesso, false em erro — submit handler usa
    // pra controlar o loading state do botão.
    window.login = async function (emailOrId, senha) {
      const err = $("#login-error");
      err.classList.add("hidden");

      if (!emailOrId.includes("@")) {
        err.textContent = "Use seu email corporativo completo.";
        err.classList.remove("hidden");
        return false;
      }

      // Lê checkbox "manter conectado" — define persistência ANTES do signIn.
      // - marcado  → LOCAL (sobrevive a fechar o browser, refresh, etc.)
      // - desmarcado (default) → NONE (memória apenas; refresh = login screen)
      const manterConectado = !!$("#login-remember")?.checked;
      try {
        localStorage.setItem("fiopulse:manterConectado", manterConectado ? "1" : "0");
      } catch {}
      try {
        const target = manterConectado
          ? firebase.auth.Auth.Persistence.LOCAL
          : firebase.auth.Auth.Persistence.NONE;
        await auth.setPersistence(target);
      } catch (e) {
        debug?.("[Auth] não foi possível ajustar persistência:", e);
      }

      // Login DELIBERADO (form ou toque no card via entrarComCredencialSalva): sinaliza
      // pro onAuthStateChanged ENTRAR no portal. Sem isto (boot restaurando sessão) ele
      // ESTACIONA na escolha de portal (William 2026-07-15).
      window.__entrarIntencional = true;
      try {
        await auth.signInWithEmailAndPassword(emailOrId, senha);
        try { localStorage.setItem("fiopulse:ultimoUser", emailOrId); } catch {}
        window.credencialGuardar?.(emailOrId, senha, "FioPulse · Gestor");
        // onAuthStateChanged toma o controle daqui (vai carregar dados +
        // renderizar). Botão fica em "Entrando..." até a transição.
        return true;
      } catch (e) {
        window.__entrarIntencional = false;
        err.textContent = traduzErroAuth(e);
        err.classList.remove("hidden");
        return false;
      }
    };

    // ===== Credenciais no COFRE DO SISTEMA (Credential Management API) =====
    // O app NUNCA guarda senha por conta própria (decisão William 2026-07-15,
    // "bem resolvido, profissional"): store() entrega ao gerenciador do
    // Chrome/Android; get() faz a entrada em 1 toque (silenciosa quando o
    // usuário já permitiu). iPhone/Safari não tem a API e usa o autofill nativo
    // do teclado (Face ID), que os atributos autocomplete dos forms habilitam.
    const _temCredApi = () => typeof window.PasswordCredential === "function" && !!navigator.credentials;
    window.credencialGuardar = async function (id, senha, rotulo) {
      if (!_temCredApi() || !id || !senha) return;
      try {
        await navigator.credentials.store(new PasswordCredential({ id: String(id), password: String(senha), name: rotulo || "FioPulse" }));
      } catch (e) { /* usuário recusou ou navegador negou: silencioso por design */ }
    };
    window.credencialObter = async function () {
      if (!_temCredApi()) return null;
      try {
        const c = await navigator.credentials.get({ password: true, mediation: "optional" });
        return (c && c.type === "password" && c.password) ? { id: c.id, senha: c.password } : null;
      } catch (e) { return null; }
    };
    // Entrada em 1 toque: pega a credencial do cofre e loga no portal certo
    // (11 dígitos = CPF de colaborador; com @ = email de gestor). Retorna true
    // se logou; false deixa o chamador cair no formulário normal.
    // portalDesejado (opcional, "colab"|"gestor"): se a credencial do cofre não
    // casa com o portal tocado, devolve false SEM logar — assim tocar Gestor nunca
    // entra por engano com uma credencial de colaborador salva (e vice-versa).
    window.entrarComCredencialSalva = async function (portalDesejado) {
      const cred = await window.credencialObter();
      if (!cred) return false;
      const soDigitos = String(cred.id).replace(/\D/g, "");
      const ehColab = soDigitos.length === 11 && !String(cred.id).includes("@");
      if (portalDesejado === "colab" && !ehColab) return false;
      if (portalDesejado === "gestor" && ehColab) return false;
      if (ehColab) return window.loginColaborador(soDigitos, cred.senha);
      return window.login ? window.login(cred.id, cred.senha) : false;
    };

    window.logout = async function () {
      try { await window.logEvento?.({ tipo: "acessos", acao: "Saiu", alvo: (currentUser()?.nome || "") }); } catch (e) {}
      // Pós-logout o cofre não entra mais em silêncio (padrão da API: o próximo
      // acesso pede o toque no seletor de credencial).
      try { await navigator.credentials?.preventSilentAccess?.(); } catch (e) {}
      await auth.signOut();
    };

    // Login do COLABORADOR por CPF: monta o e-mail sintético e entra. Erros vão pro
    // campo da tela #login-colab (não o #login-error do gestor). Persistência é
    // SEMPRE LOCAL (William 2026-07-15, login automático; o antigo checkbox saiu).
    window.loginColaborador = async function (cpf, senha) {
      const err = $("#colab-login-error");
      if (err) err.classList.add("hidden");
      const dig = String(cpf || "").replace(/\D/g, "");
      const setErr = (m) => { if (err) { err.textContent = m; err.classList.remove("hidden"); } };
      // CPF incompleto: validação inline colada no campo (borda vermelha + msg
      // sob o input), não no slot fixo depois da senha.
      if (dig.length !== 11) {
        if (window.campoInvalido) return window.campoInvalido("#colab-cpf", "Digite um CPF completo (11 números).");
        setErr("Digite um CPF completo (11 números)."); return false;
      }
      if (!senha) {
        if (window.campoInvalido) return window.campoInvalido("#colab-senha", "Digite sua senha.");
        setErr("Digite sua senha."); return false;
      }
      const email = dig + "@colaborador.fiobras.local";
      // Colaborador fica logado SEMPRE (William 2026-07-15, "automático, urgente"):
      // o antigo checkbox opt-in fazia quase todo mundo cair em NONE e relogar a
      // cada abertura. Aparelho pessoal, o colab só vê os próprios dados e o Sair
      // segue na Conta. O GESTOR mantém o opt-in (dados de todos os funcionários).
      try { localStorage.setItem("fiopulse:manterConectado", "1"); } catch {}
      try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      } catch (e) {}
      // Login DELIBERADO → onAuthStateChanged ENTRA no portal (vs. boot restaurando,
      // que estaciona na escolha). Ver window.login (gestor).
      window.__entrarIntencional = true;
      try {
        await auth.signInWithEmailAndPassword(email, senha);
        try { localStorage.setItem("fiopulse:ultimoCpf", String(cpf || "")); } catch {}
        window.credencialGuardar?.(dig, senha, "FioPulse · Colaborador");
        return true; // onAuthStateChanged assume daqui (carrega + renderiza)
      } catch (e) {
        window.__entrarIntencional = false;
        // A tela do colaborador só tem CPF + senha; erro de credencial não pode
        // vazar "Email" (detalhe do login sintético). Reescreve pra CPF.
        const cred = e && (e.code === "auth/invalid-credential" || e.code === "auth/wrong-password" || e.code === "auth/user-not-found");
        setErr(cred ? "CPF ou senha inválidos." : traduzErroAuth(e));
        window.sacudirErro?.($("#colab-senha")?.closest(".field") || $("#colab-senha")); // B · treme o campo
        return false;
      }
    };

    // Zera precisaTrocarSenha no próprio doc (após a troca obrigatória). A rule
    // self-update já permite este campo. Só o próprio uid.
    window.zerarPrecisaTrocarSenha = async function () {
      const user = auth.currentUser;
      if (!user) return { ok: false, err: "Não está logado." };
      try {
        await db.collection("users").doc(user.uid).update({ precisaTrocarSenha: false });
        window.logEvento?.({ tipo: "senha", acao: "Completou troca obrigatória de senha", alvo: (currentUser()?.nome || "") });
        return { ok: true };
      }
      catch (e) { return { ok: false, err: e.message }; }
    };

    // Redefinição de senha de colaborador pela GP (v405). O gate REAL é server-side (Cloud
    // Function redefinirSenhaColaborador: valida o papel do caller por users+config/permissoes
    // e que o alvo é colaborador — nunca confia no cliente). Aqui só chamamos a callable e
    // traduzimos o erro. O SDK de Functions carrega SOB DEMANDA (ação rara; não pesa no boot
    // de todo mundo). Retorna { ok, senha } | { ok:false, err } — NUNCA lança (o botão trata o err).
    window.redefinirSenhaColaborador = async function (uid) {
      if (!uid) return { ok: false, err: "Este colaborador não tem conta de acesso vinculada." };
      try {
        if (!firebase.functions) await loadScript(`${SDK_BASE}/firebase-functions-compat.js`);
        const call = firebase.app().functions("us-central1").httpsCallable("redefinirSenhaColaborador");
        const res = await call({ uid });
        const senha = res && res.data && res.data.senha;
        if (!senha) return { ok: false, err: "Resposta inesperada do servidor." };
        return { ok: true, senha };
      } catch (e) {
        const code = (e && e.code) || "";
        if (code.indexOf("permission-denied") >= 0) return { ok: false, err: "Você não tem permissão para redefinir esta senha." };
        if (code.indexOf("unauthenticated") >= 0) return { ok: false, err: "Sessão expirada. Entre de novo." };
        if (code.indexOf("not-found") >= 0) return { ok: false, err: (e && e.message) || "Colaborador não encontrado." };
        if (code.indexOf("resource-exhausted") >= 0) return { ok: false, err: (e && e.message) || "Limite diário de redefinições atingido. Tente amanhã." };
        if (code.indexOf("invalid-argument") >= 0) return { ok: false, err: "Dados inválidos." };
        return { ok: false, err: (e && e.message) || "Não foi possível redefinir a senha." };
      }
    };

    // Convida usuário novo (admin only).
    // Usa instância SECUNDÁRIA do Firebase Auth pra não deslogar o admin atual.
    window.inviteUser = async function ({ email, nome, role, turno }) {
      const u = currentUser();
      if (u.role !== "admin") return { ok: false, err: "Apenas admin pode convidar usuários." };
      if (!email || !nome || !role) return { ok: false, err: "Preencha email, nome e papel." };
      if (role === "lider" && !turno) return { ok: false, err: "Líder precisa de turno." };

      const tempPassword = gerarSenhaTemp();
      const secondaryName = "invite-" + Date.now();
      const secondary = firebase.initializeApp(cfg, secondaryName);
      try {
        const result = await secondary.auth().createUserWithEmailAndPassword(email, tempPassword);
        const uid = result.user.uid;

        const userDoc = {
          email,
          nome,
          role,
          ativo: true,
          criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
          criadoPor: u.id,
        };
        if (role === "lider") {
          userDoc.turno = turno === "geral" ? "geral" : Number(turno);
        }
        if (role === "supervisor") {
          // Supervisor nasce sem turno e sem escopo; admin define os turnos que
          // ele cobre e/ou os avulsos depois, na edição do usuário.
          userDoc.turno = null;
          userDoc.funcionariosVisiveis = [];
          userDoc.turnosVisiveis = [];
        }
        await db.collection("users").doc(uid).set(userDoc);

        // Envia email de redefinição pra ele criar a própria senha
        let resetEnviado = false;
        try {
          await secondary.auth().sendPasswordResetEmail(email);
          resetEnviado = true;
        } catch (e) {
          debug?.("Não foi possível enviar email de redefinição:", e.message);
        }

        // Adiciona ao state local pra UI atualizar
        state.users.push({ id: uid, ...userDoc, criadoEm: new Date().toISOString() });

        window.logEvento?.({ tipo: "dados", acao: "Convidou usuário", alvo: `${nome} (${role})` });
        return { ok: true, uid, email, tempPassword, resetEnviado };
      } catch (err) {
        return { ok: false, err: traduzErroAuth(err) };
      } finally {
        await secondary.auth().signOut().catch(() => {});
        await secondary.delete().catch(() => {});
      }
    };

    function gerarSenhaTemp() {
      // Senha de 12 chars com letras + números + 1 símbolo
      const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const sym = "!@#$%&*";
      let pw = sym[Math.floor(Math.random() * sym.length)];
      for (let i = 0; i < 11; i++) pw += chars[Math.floor(Math.random() * chars.length)];
      return pw;
    }

    // Atualiza dados de outro usuário (admin only). Permite mudar nome,
    // role, turno e ativo. Email não muda (Firebase Auth).
    window.atualizarUsuario = async function (uid, dados) {
      const me = currentUser();
      if (me.role !== "admin") return { ok: false, err: "Apenas admin pode editar usuários." };
      if (!uid) return { ok: false, err: "UID inválido." };

      const update = {};
      if (dados.nome !== undefined) update.nome = String(dados.nome).trim();
      if (dados.role !== undefined) update.role = dados.role;
      if (dados.turno !== undefined) {
        update.turno = dados.turno || null;
      }
      if (dados.ativo !== undefined) update.ativo = !!dados.ativo;
      if (dados.funcionariosVisiveis !== undefined) {
        update.funcionariosVisiveis = Array.isArray(dados.funcionariosVisiveis) ? dados.funcionariosVisiveis : [];
      }
      if (dados.turnosVisiveis !== undefined) {
        update.turnosVisiveis = Array.isArray(dados.turnosVisiveis) ? dados.turnosVisiveis.map(Number).filter((n) => !Number.isNaN(n)) : [];
      }
      // Se o papel mudou pra algo != supervisor, zera o escopo de supervisor
      // (lista de avulsos + turnos) — não faz sentido manter noutro papel.
      if (dados.role !== undefined && dados.role !== "supervisor") {
        update.funcionariosVisiveis = [];
        update.turnosVisiveis = [];
      }

      try {
        await db.collection("users").doc(uid).update(update);
        const local = state.users.find((x) => x.id === uid);
        if (local) Object.assign(local, update);
        window.logEvento?.({ tipo: "dados", acao: "Atualizou usuário", alvo: `${(local && local.nome) || uid}${update.role ? " · papel " + update.role : ""}` });
        return { ok: true };
      } catch (e) {
        return { ok: false, err: e.message || String(e) };
      }
    };

    // Salva a matriz de permissões (mapa completo por papel). Admin only — a
    // regra do Firestore também exige admin, então a UI não é a única barreira.
    window.salvarPermissoes = async function (mapa) {
      const me = currentUser();
      if (!me || me.role !== "admin") return { ok: false, err: "Apenas admin pode editar permissões." };
      if (!mapa || typeof mapa !== "object") return { ok: false, err: "Mapa inválido." };
      try {
        await db.collection("config").doc("permissoes").set(mapa);
        state.permissoes = mapa;
        window.logEvento?.({ tipo: "dados", acao: "Atualizou matriz de permissões", alvo: "Permissões por papel" });
        return { ok: true };
      } catch (e) {
        return { ok: false, err: e.message || String(e) };
      }
    };

    // Atualizar a própria foto de perfil. Recebe base64 (data URL) ou null
    // pra remover. Rule do Firestore garante que só o próprio user pode
    // atualizar e que só o campo fotoBase64 pode ser tocado por self-update.
    window.atualizarMinhaFoto = async function (base64OrNull) {
      const user = auth.currentUser;
      if (!user) throw new Error("Não está logado.");
      const uid = user.uid;
      // Remoção DELIBERADA vira "" (string vazia), NÃO delete: o pipeline de fotos
      // oficiais (WKRADAR) só preenche campo AUSENTE/null — "" significa "a pessoa
      // tirou de propósito, não repor a foto oficial por cima".
      const value = base64OrNull || "";
      await db.collection("users").doc(uid).update({ fotoBase64: value });
      // Reflete no state local ("" cai nas iniciais no aplicarAvatar)
      const me = (state.users || []).find((x) => x.id === uid);
      if (me) me.fotoBase64 = value;
      // Gamificacao: foto propria vale ponto (1x por temporada; dedup e da regra) e a
      // foto denormalizada do placar acompanha (ranking); remocao tira do placar.
      if (value) window.gamiClaim?.("foto", uid, "Adicionou a própria foto de perfil");
      try {
        const sync = value ? { foto: value, nome: u?.nome } : { foto: _FV.delete(), nome: u?.nome };
        await _gami().collection("pontos").doc(uid).update(sync);
      } catch (e) { debug?.("[gami] sync foto placar:", e?.code || e?.message); }
    };

    // Alterar a própria senha (usuário logado)
    window.alterarMinhaSenha = async function (atual, nova) {
      const user = auth.currentUser;
      if (!user) return { ok: false, err: "Não está logado." };
      if (!atual || !nova) return { ok: false, err: "Preencha senha atual e nova." };
      if (nova.length < 6) return { ok: false, err: "Senha nova precisa ter pelo menos 6 caracteres." };

      try {
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, atual);
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(nova);
        // Defensivo: refresh do token após a troca, pra não sobrar estado de auth obsoleto.
        try { await user.getIdToken(true); } catch (e) {}
        window.logEvento?.({ tipo: "senha", acao: "Alterou a própria senha", alvo: (currentUser()?.nome || "") });
        return { ok: true };
      } catch (e) {
        return { ok: false, err: traduzErroAuth(e) };
      }
    };

    // Reset de senha via Firebase Auth
    window.firebaseResetSenha = async function () {
      const emailInput = $("#login-user");
      const email = (emailInput?.value || "").trim();
      if (!email || !email.includes("@")) {
        toast("Digite seu email no campo Usuário acima, depois clica em 'Esqueci minha senha'.", "danger");
        if (emailInput) emailInput.focus();
        return;
      }
      debug?.("[Auth] enviando email de redefinição pra:", email);
      try {
        await auth.sendPasswordResetEmail(email);
        window.logEvento?.({ tipo: "senha", acao: "Solicitou redefinição de senha", alvo: email });
        toast(`Email enviado pra ${email}. Veja na caixa de entrada (e na pasta de spam).`);
      } catch (e) {
        debug?.("[Auth] reset error:", e);
        toast(traduzErroAuth(e), "danger");
      }
    };

    // Atualiza login UI: esconde quick buttons + ajusta copy.
    // firebase.js carrega após DOMContentLoaded já ter disparado, então
    // chamamos direto se o DOM já está pronto.
    const tweakLoginUI = () => {
      const quick = $("#login-quick");
      if (quick) quick.style.display = "none";
      const lead = document.querySelector(".login__form p.lead");
      if (lead) lead.textContent = "Entre com seu email e senha corporativos.";
      const divider = document.querySelector(".login__divider");
      if (divider) divider.style.display = "none";
      const userInput = $("#login-user");
      if (userInput) {
        userInput.type = "email";
        userInput.placeholder = "voce@empresa.com";
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", tweakLoginUI);
    } else {
      tweakLoginUI();
    }

    // Restaura o botão de login se ficou em "Entrando..." (chamado quando
    // sign-out acontece, sucesso ou erro de carregamento)
    function restoreLoginButton() {
      const btn = document.querySelector('#login-form button[type="submit"]');
      if (!btn || !btn.disabled) return;
      btn.disabled = false;
      btn.innerHTML = "Entrar";
      const u = $("#login-user"); if (u) u.disabled = false;
      const p = $("#login-pass"); if (p) p.disabled = false;
    }

    // Persistência inicial já foi setada em bootFirebase (LOCAL ou NONE
    // conforme localStorage 'fiopulse:manterConectado'). window.login()
    // ajusta dinamicamente conforme checkbox no momento do submit.

    // Migração: chave antiga era "weave:manterConectado" — copia se existir
    try {
      const old = localStorage.getItem("weave:manterConectado");
      if (old !== null && localStorage.getItem("fiopulse:manterConectado") === null) {
        localStorage.setItem("fiopulse:manterConectado", old);
        localStorage.removeItem("weave:manterConectado");
      }
    } catch {}

    // Auto-login LIGADO por padrão (decisão do William 2026-06): migra uma vez quem tinha "0"
    // (era o default opt-in antigo) ou nada -> "1". Quem desmarcar depois fica "0" e não re-migra.
    try {
      if (localStorage.getItem("fiopulse:autoLoginDefaultOn") !== "1") {
        localStorage.setItem("fiopulse:manterConectado", "1");
        localStorage.setItem("fiopulse:autoLoginDefaultOn", "1");
      }
    } catch {}

    // Restaura "manter conectado" (LIGADO por padrão) + pré-preenche o usuário do último acesso.
    try {
      const cb = $("#login-remember");
      if (cb) cb.checked = localStorage.getItem("fiopulse:manterConectado") !== "0";
      const ult = localStorage.getItem("fiopulse:ultimoUser");
      const ui = $("#login-user");
      if (ui && ult && !ui.value) ui.value = ult;
    } catch {}

    // Auto-logout por inatividade: 30 min sem interação → signOut.
    // DESLIGADO quando user marcou "manter conectado" (opt-in explícito).
    const IDLE_MS = 30 * 60 * 1000;
    let idleTimer = null;
    function manterConectadoAtivo() {
      try { return localStorage.getItem("fiopulse:manterConectado") === "1"; }
      catch { return false; }
    }
    function resetIdleTimer() {
      if (idleTimer) clearTimeout(idleTimer);
      if (!auth.currentUser) return;
      // Se user optou por manter conectado, não desloga por idle
      if (manterConectadoAtivo()) return;
      idleTimer = setTimeout(async () => {
        if (auth.currentUser) {
          try { await window.logEvento?.({ tipo: "acessos", acao: "Saiu (inatividade)", alvo: (currentUser()?.nome || "") }); } catch (e) {}
          await auth.signOut().catch(() => {});
          if (typeof toast === "function") toast("Sessão expirada por inatividade. Entre de novo.", "danger");
        }
      }, IDLE_MS);
    }
    ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((evt) => {
      window.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    // ============================================
    // Presença em tempo real (/presence/{uid})
    // ============================================
    const PRESENCE_HEARTBEAT_MS = 60 * 1000; // 60s
    const PRESENCE_ONLINE_MS = 2 * 60 * 1000; // <2min = ativo
    const PRESENCE_IDLE_MS = 7 * 60 * 1000;   // <7min = ausente, >= = some
    let presenceHeartbeat = null;
    let presenceUnsubscribe = null;
    // ocorrenciasUnsub / ocorrenciasIdsConhecidos são declarados no escopo do
    // IIFE (lá no topo) — carregarDadosCompletos, função irmã, também os usa.

    // Estado adicional pra colab: qual PJ esse user está editando
    let presencePjEditing = null;

    async function pingPresenca() {
      if (!auth.currentUser) return;
      const u = currentUser();
      if (!u) return;
      try {
        await db.collection("presence").doc(auth.currentUser.uid).set({
          uid: auth.currentUser.uid,
          nome: u.nome || auth.currentUser.email,
          role: u.role || "lider",
          turno: u.turno || null,
          page: state.view?.page || "dashboard",
          pjEditing: presencePjEditing,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        debug?.("[Presence] heartbeat falhou:", e);
      }
    }

    // Exposto pro app.js: sinaliza qual PJ esse user está editando
    window.setarPJEditando = function (pjId) {
      presencePjEditing = pjId || null;
      pingPresenca(); // dispara update imediato
    };

    // Subscription do PJ específico que está sendo editado
    let pjDocUnsubscribe = null;
    let pjDocUltimoAtualizadoEm = null;
    window.iniciarEscutaPJ = function (pjId, onChange) {
      if (pjDocUnsubscribe) pjDocUnsubscribe();
      pjDocUltimoAtualizadoEm = null;
      if (!pjId) return;
      pjDocUnsubscribe = db.collection("pj").doc(pjId).onSnapshot((doc) => {
        if (!doc.exists) return;
        const dados = doc.data();
        // Ignora o snapshot inicial (cache local + carregamento)
        const atualMs = dados.atualizadoEm?.toMillis?.() || 0;
        if (pjDocUltimoAtualizadoEm === null) {
          pjDocUltimoAtualizadoEm = atualMs;
          return;
        }
        // Só notifica se a marca temporal mudou + foi alguém diferente
        if (atualMs > pjDocUltimoAtualizadoEm
            && dados.atualizadoPor
            && dados.atualizadoPor !== auth.currentUser?.uid) {
          pjDocUltimoAtualizadoEm = atualMs;
          if (typeof onChange === "function") {
            onChange({ id: doc.id, ...dados });
          }
        } else {
          pjDocUltimoAtualizadoEm = atualMs;
        }
      }, (err) => debug?.("[PJ doc] snapshot erro:", err));
    };
    window.pararEscutaPJ = function () {
      if (pjDocUnsubscribe) { pjDocUnsubscribe(); pjDocUnsubscribe = null; }
      pjDocUltimoAtualizadoEm = null;
    };

    function ouvirPresenca() {
      if (presenceUnsubscribe) presenceUnsubscribe();
      presenceUnsubscribe = db.collection("presence").onSnapshot((snap) => {
        const agora = Date.now();
        state.presence = snap.docs
          .map((d) => {
            const data = d.data();
            const lastSeenMs = data.lastSeen?.toMillis?.() || 0;
            const age = agora - lastSeenMs;
            let status = "offline";
            if (age < PRESENCE_ONLINE_MS) status = "ativo";
            else if (age < PRESENCE_IDLE_MS) status = "ausente";
            return {
              uid: d.id,
              nome: data.nome || "?",
              role: data.role || "",
              turno: data.turno || null,
              page: data.page || "",
              pjEditing: data.pjEditing || null,
              lastSeenMs,
              status,
              age,
            };
          })
          .filter((p) => p.status !== "offline");
        if (typeof renderPresence === "function") renderPresence();
      }, (err) => {
        debug?.("[Presence] snapshot erro:", err);
      });
    }

    async function iniciarPresenca() {
      await pingPresenca();
      ouvirPresenca();
      // Heartbeat
      if (presenceHeartbeat) clearInterval(presenceHeartbeat);
      presenceHeartbeat = setInterval(() => {
        // Só pinga se aba visível — economiza writes e bateria
        if (document.visibilityState === "visible") pingPresenca();
      }, PRESENCE_HEARTBEAT_MS);
    }

    async function limparPresenca() {
      if (presenceHeartbeat) { clearInterval(presenceHeartbeat); presenceHeartbeat = null; }
      if (presenceUnsubscribe) { presenceUnsubscribe(); presenceUnsubscribe = null; }
      state.comunicados = [];
      state.documentos = [];
      state.comunicadosColab = [];
      state.documentosColab = [];
      // Sinais da carga única de Documentos: sem resetar, o PRÓXIMO login da mesma
      // aba pularia o skeleton com dados velhos/vazios (auditoria 2026-07-17).
      state.documentosColabProntos = false;
      state.meusTermos = undefined;
      state.ocorrenciasAuto = null; // null = recarrega no próximo acesso à aba
      state.monitorPipeline = null;
      state.aniversariantes = null;
      // Para o listener vivo das ocorrências e reseta a detecção de deltas
      // (próximo login volta a tratar a 1ª emissão como carga inicial → sem beep)
      if (ocorrenciasUnsub) { ocorrenciasUnsub(); ocorrenciasUnsub = null; }
      if (ocorrenciasAutoUnsub) { ocorrenciasAutoUnsub(); ocorrenciasAutoUnsub = null; }
      ocorrenciasIdsConhecidos = null;
      state.presence = [];
      // Para qualquer subscription de PJ ativa (modal pode estar aberto
      // quando signOut dispara por idle timeout — listener ficaria órfão
      // com regra de auth falhando e poluindo console)
      try { window.pararEscutaPJ?.(); } catch {}
      // Limpa pjEditing antes do delete final (best-effort)
      presencePjEditing = null;
      if (auth.currentUser) {
        try {
          await db.collection("presence").doc(auth.currentUser.uid).delete();
        } catch (e) { debug?.("[Presence] cleanup falhou:", e); }
      }
    }

    // Quando o tab volta a ficar visível, pinga imediatamente
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && auth.currentUser) {
        pingPresenca();
        refetchAoFoco(); // re-busca dados voláteis (BH/avisos/docs) ao voltar pra aba
      }
    });
    // Beforeunload: tenta limpar (best-effort, sem garantias)
    window.addEventListener("beforeunload", () => {
      if (auth.currentUser) {
        // sendBeacon não suporta Firestore SDK, então só dispara delete
        // (pode não completar — backstop é o threshold de 7min na UI)
        db.collection("presence").doc(auth.currentUser.uid).delete().catch(() => {});
      }
    });

    // Esconde a abertura de boot (esqueleto ou, na estreia, o fio).
    function esconderSplash() {
      if (window.hideSplash) window.hideSplash();
      else { var sp = document.getElementById("splash"); if (sp) sp.classList.add("splash--out"); }
    }

    // Navega pra DENTRO do portal com a sessão já viva. Dois chamadores:
    //  (1) onAuthStateChanged num login DELIBERADO (form ou toque no card via credencial);
    //  (2) app.js quando o usuário toca o card do portal que corresponde à sessão viva
    //      (window.__entrarPortalComSessao), depois que o boot estacionou na escolha.
    // Reúne o que antes era inline no observador (esconde telas de acesso/login, revela
    // #app, define a landing por papel, renderiza e liga a presença do gestor).
    function entrarNoPortal() {
      const u = currentUser();
      const ehColab = u?.role === "colaborador";
      window.__escolhaPortal = false;
      $("#acesso")?.classList.add("hidden");
      $("#login")?.classList.add("hidden");
      $("#login-colab")?.classList.add("hidden");
      $("#app")?.classList.remove("hidden");
      esconderSplash();
      // Landing SEMPRE na Visão geral pro gestor (pedido William 2026-07-08).
      state.view = ehColab
        ? { page: "colab-home" }
        : { page: "visao-geral", filterTab: "pendentes", filterTurno: null, search: "" };
      renderApp();
      // F3 (Fundação SELF): presença NÃO é ligada para o colaborador (privacidade +
      // rule de presence não o contempla). Só o gestor entra na presença em tempo real.
      if (!ehColab) iniciarPresenca().catch((e) => debug?.("[Presence] init falhou:", e));
    }
    window.__entrarPortalComSessao = entrarNoPortal;

    // Observador de autenticação
    auth.onAuthStateChanged(async (fbUser) => {
      // Marco do boot: o auth resolveu pela 1ª vez (com ou sem sessão) — ver __bootDbg().
      if (window.__bootMarks && window.__bootMarks.authResolved == null) window.__bootMarks.authResolved = performance.now();
      if (!fbUser) {
        await limparPresenca();
        state.currentUserId = null;
        window.__escolhaPortal = false; // deslogado: a escolha é a de "sem sessão"
        $("#app")?.classList.add("hidden");
        // Sem sessão → tela de ACESSO (escolha de portal). Mantém o login do
        // gestor a um toque, sem regressão. Fallback pro #login se o app.js
        // ainda não definiu o portão (ex.: erro de carga).
        if (window.__portaoSemSessao) window.__portaoSemSessao();
        else $("#login")?.classList.remove("hidden");
        esconderSplash(); // sem sessão → mostra a escolha (sem flash)
        restoreLoginButton();
        // Cancela timer de inatividade
        if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
        return;
      }
      // Boot com ATUALIZAÇÃO na frente (app.js: reg.waiting no boot): o app vai recarregar
      // em ~2s. Não gasta rede/CPU restaurando sessão, carregando dados e renderizando por
      // baixo da tela de atualização (era o jank do bug William v353). O reload refaz o boot
      // limpo; se o SW falhar, o timeout de segurança em app.js solta o boot (a flag some no
      // reload). Caminho SEM atualização fica intacto (flag nunca setada).
      if (window.__atualizandoApp) return;
      // Inicia timer assim que loga
      resetIdleTimer();

      // Renova o ID token à força (1x por login): puxa as CUSTOM CLAIMS (role,
      // funcionarioId) que o pipeline seta via Admin SDK — é o que as regras do
      // Storage leem (elas não conseguem consultar o Firestore). Fire-and-forget:
      // nada do boot depende disso; o Storage só é usado depois.
      fbUser.getIdToken(true).catch(() => {});

      // Busca o doc users/{uid} pra papel/turno
      try {
        const userSnap = await db.collection("users").doc(fbUser.uid).get();
        if (!userSnap.exists) {
          $("#login-error").textContent =
            "Seu usuário existe no Auth mas não tem perfil cadastrado. " +
            "Peça ao admin pra criar /users/" + fbUser.uid + " no Firestore.";
          $("#login-error").classList.remove("hidden");
          window.__forcarLoginGestor = true; // erro de perfil → volta ao login, não à escolha
          await auth.signOut();
          return;
        }

        const userData = userSnap.data();
        // F2 (Fundação SELF): conta inativa não entra. Ausência de 'ativo' = ativo
        // (ativo !== false) → regressão zero para os gestores atuais (sem o campo).
        // Nota: isto barra a ENTRADA; token já emitido sobrevive ~1h (revogação real = Admin SDK, futuro).
        if (userData.ativo === false) {
          $("#login-error").textContent = "Seu acesso está inativo. Procure o GP.";
          $("#login-error").classList.remove("hidden");
          window.__forcarLoginGestor = true;
          await auth.signOut();
          return;
        }
        const userInState = {
          id: fbUser.uid,
          nome: userData.nome,
          email: fbUser.email,
          role: userData.role,
          turno: userData.turno || null,
          // Escopo do supervisor — sem isso o filtro de visibilidade fica vazio
          funcionariosVisiveis: userData.funcionariosVisiveis || [],
          turnosVisiveis: userData.turnosVisiveis || [], // turnos cobertos (automação)
          // Foto de perfil do próprio usuário (avatar na sidebar)
          fotoBase64: userData.fotoBase64 || null,
          // F2: vínculo uid<->funcionarioId (escopo SELF do colaborador). Gestores não têm
          // esses campos → null, sem efeito. Lido aqui, NUNCA escrito pelo app (onboarding = #5).
          funcionarioId: userData.funcionarioId || null,
          codigo: userData.codigo || null,
          precisaTrocarSenha: userData.precisaTrocarSenha === true,
        };

        // Popula state.users com pelo menos esse user
        state.users = [userInState];
        state.currentUserId = fbUser.uid;

        await carregarDadosCompletos(db);
        state.dadosCarregadosEm = new Date().toISOString();
        window.logEvento?.({ tipo: "acessos", acao: "Entrou", alvo: userInState.nome });

        // Login DELIBERADO entra no portal; boot RESTAURANDO a sessão estaciona na
        // escolha de portal (William 2026-07-15: "carrega o app e depois vai pra tela
        // dos dois portais; ao tocar no do colaborador entra direto"). Nos dois casos a
        // sessão fica viva e os dados já carregados — o toque no card só navega.
        const intencional = window.__entrarIntencional === true;
        window.__entrarIntencional = false;
        if (intencional) {
          entrarNoPortal();
        } else {
          // Estaciona na escolha. A flag trava o _renderAppNow: um snapshot/refetch em
          // background NÃO pode empurrar pra dentro do portal antes do toque no card.
          window.__escolhaPortal = true;
          $("#login").classList.add("hidden");
          $("#login-colab")?.classList.add("hidden");
          mostrarAcesso();
          esconderSplash();
        }
      } catch (err) {
        debug?.("Erro carregando perfil:", err);
        toast("Erro ao carregar perfil: " + err.message, "danger");
        // Sign out faz onAuthStateChanged disparar de novo com null,
        // que volta pra tela de login e restaura o botão "Entrar".
        window.__forcarLoginGestor = true;
        await auth.signOut().catch(() => {});
      }
    });
  }

  // ===== Banco de Horas (gestor) — extraído pra poder recarregar sozinho no re-fetch ao foco =====
  // Carrega o saldo de banco de horas pro gestor. ROBUSTEZ: monta num mapa temporário e só
  // troca state.bancoHoras quando a leitura conclui — assim um erro transitório (re-fetch ao
  // foco, blip de rede/token, doc grande) NUNCA apaga o saldo que já estava bom na tela.
  // 1 retry no read canônico cobre o blip. Diagnóstico (state._dbgBh*) some quando funciona.
  async function carregarBancoHorasGestor(u) {
    // db NÃO está no closure desta função (ela é irmã de installFirebaseStore, não filha) —
    // pega o singleton global. Sem isto: ReferenceError "db is not defined" -> catch -> BH vazio.
    const db = firebase.firestore();
    const novo = {};
    let meta = null;
    let dbgErr = null, dbgExists = null;
    try {
      if (u.role === "admin" || u.role === "rh") {
        let curSnap = null, ultimoErro = null;
        for (let tent = 0; tent < 2; tent++) {
          try { curSnap = await db.collection("pipeline-rh").doc("cur").get(); ultimoErro = null; break; }
          catch (e) { ultimoErro = e; }
        }
        if (ultimoErro) throw ultimoErro;
        dbgExists = !!(curSnap && curSnap.exists);
        if (curSnap && curSnap.exists) {
          const cur = curSnap.data();
          const atualizadoEm = tsToIso(cur.meta?.generatedAt);
          for (const f of (cur.funcionarios || [])) {
            novo["f-" + f.funcId] = {
              funcionarioCodigo: f.funcId,
              funcionarioNome: f.nome,
              minutos: f.saldoAtualMin,
              saldoFormatado: f.saldoAtualFmt,
              // Saldo ORIGINAL (folga, hora por hora; caso Jenifer 2026-07-07). Nomes
              // canonizados iguais aos dos docs bancoHoras/banco-horas-self do WK.
              minutosOriginal: (typeof f.saldoOriginalMin === "number") ? f.saldoOriginalMin : null,
              saldoOriginalFormatado: f.saldoOriginalFmt || null,
              atualizadoEm,
              ultimaDataIso: f.ultimaDataIso,
              lancamentos: Array.isArray(f.lancamentos) ? f.lancamentos : [],
            };
          }
          meta = {
            schema: cur.schema,
            month: cur.month,
            generatedAt: atualizadoEm,
            periodStart: cur.meta?.periodStart,
            periodEnd: cur.meta?.periodEnd,
            totalAtivos: cur.meta?.totalFuncionariosAtivos,
            totalInativos: cur.meta?.totalFuncionariosInativos,
            totalLancamentos: cur.meta?.totalLancamentos,
            warnings: cur.meta?.warnings,
          };
          debug?.("[pipeline-rh] cur carregado:", meta);
        } else {
          debug?.("[pipeline-rh] doc 'cur' não existe — pipeline RH não rodou ainda.");
        }
        state.bancoHoras = novo;
        state.pipelineMeta = meta;
      } else if (u.role === "lider") {
        const bhSnap = await db.collection("bancoHoras").where("funcionarioTurno", "==", u.turno).get();
        bhSnap.docs.forEach((d) => { novo[d.id] = { ...d.data(), atualizadoEm: tsToIso(d.data().atualizadoEm) }; });
        debug?.("[bancoHoras] líder turno", u.turno, "→", bhSnap.size, "saldos");
        state.bancoHoras = novo;
        state.pipelineMeta = null;
      } else if (u.role === "supervisor") {
        const bhSnap = await db.collection("bancoHoras").get();
        bhSnap.docs.forEach((d) => { novo[d.id] = { ...d.data(), atualizadoEm: tsToIso(d.data().atualizadoEm) }; });
        debug?.("[bancoHoras] supervisor →", bhSnap.size, "saldos");
        state.bancoHoras = novo;
        state.pipelineMeta = null;
      }
      state._dbgBhErr = dbgErr;
      state._dbgBhExists = dbgExists;
      state._dbgBhN = Object.keys(novo).length;
    } catch (e) {
      // NÃO apaga o que já tinha (state.bancoHoras intacto). Só registra o diagnóstico.
      state._dbgBhErr = e?.code || e?.message || String(e);
      state._dbgBhExists = dbgExists;
      state._dbgBhN = Object.keys(state.bancoHoras || {}).length;
      debug?.("[bh] falha ao ler banco de horas:", e?.message || e);
    }
  }

  // Re-fetch dos dados VOLÁTEIS (ficam velhos na tela) sem re-rodar o boot inteiro nem
  // re-assinar listeners. Resolve RH vendo BH velho + colaborador não vendo aviso novo.
  async function recarregarVolateis() {
    const db = firebase.firestore(); // mesma razão de carregarBancoHorasGestor: db fora do closure
    const u = currentUser();
    if (!u) return;
    if (u.role === "colaborador") {
      // Reusa os MESMOS loaders da home (retry+diff+render coalescido) em vez de re-rodar o
      // boot inteiro; o funcionário já está em state.funcionarios[0] (estável no foco). O
      // throttle/guardas ficam no refetchAoFoco, que chama esta função.
      await carregarHomeColab(db, u);
    } else {
      const tarefas = [carregarBancoHorasGestor(u)];
      if (window.recarregarComunicados) tarefas.push(window.recarregarComunicados());
      if (window.recarregarDocumentos) tarefas.push(window.recarregarDocumentos());
      if (state.ocorrenciasAuto != null && window.recarregarOcorrenciasAuto) tarefas.push(window.recarregarOcorrenciasAuto());
      // Recibos e disciplinares ficavam de fora — daí o "assinou/registrou e não aparece"
      // ao voltar o foco. Só recarrega recibos se a aba já foi aberta uma vez (state.recibos
      // != null); disciplinares o boot sempre carrega no gestor.
      if (state.recibos != null && window.recarregarRecibosGestor) tarefas.push(window.recarregarRecibosGestor());
      if (window.recarregarDisciplinares) tarefas.push(window.recarregarDisciplinares());
      if ((u.role === "admin" || u.role === "rh") && window.carregarMonitorPipeline) tarefas.push(window.carregarMonitorPipeline());
      await Promise.all(tarefas.map((p) => Promise.resolve(p).catch(() => {})));
    }
    state.dadosCarregadosEm = new Date().toISOString();
  }
  window.recarregarVolateis = recarregarVolateis;

  // Throttle + guardas: re-fetch quando a aba volta ao foco. Não dispara com modal aberto
  // (não atrapalha cadastro) nem mais de 1x a cada 20s.
  let _ultimoRefetch = 0, _refetchEmAndamento = false;
  async function refetchAoFoco() {
    const auth = firebase.auth(); // auth fora do closure desta funcao irma — singleton
    if (!auth.currentUser || document.visibilityState !== "visible") return;
    if (_refetchEmAndamento || document.body.classList.contains("modal-aberto")) return;
    if (Date.now() - _ultimoRefetch < 20000) return;
    _refetchEmAndamento = true;
    try {
      await recarregarVolateis();
      _ultimoRefetch = Date.now();
      // recarregarVolateis já releu recibos (quando a aba foi aberta) — carimba o TTL pra
      // o lazy-load da tela não disparar um 2º fetch redundante logo em seguida.
      if (typeof marcarCarga === "function" && state.recibos != null) marcarCarga("recibos");
      // Anti-flicker (auditoria WKRADAR 2026-07-14): telas que não consomem NENHUM dado
      // volátil recarregado aqui não re-renderizam no foco; o state atualizou em silêncio
      // e a tela certa nasce na próxima navegação.
      const SEM_VOLATEIS = ["auditoria", "gamificacao", "vagas", "avaliacoes", "colab-conquistas"];
      if (typeof renderApp === "function" && !SEM_VOLATEIS.includes(state.view && state.view.page)) renderApp();
    } catch (e) { debug?.("[refetch foco] falhou:", e?.message || e); }
    finally { _refetchEmAndamento = false; }
  }
  window.addEventListener("focus", () => { if (typeof firebase !== "undefined" && firebase.auth?.().currentUser) refetchAoFoco(); });

  // P2 (BOOT PERFEITO) · CONTRATO UNIFORME DE LOADER da home do colab. `ler` faz a leitura
  // E grava no state (fetch-then-swap dele mesmo, NUNCA zera antes) e PODE lançar em falha
  // de rede; retry 3x/1200ms no molde de carregarAniversariantes (cold start do PWA rejeita
  // as 1ªs leituras com "client is offline"). `assina` resume o state observado num id
  // BARATO (contagem+ids+marca de estado, NUNCA JSON de payload pesado como o base64 de
  // documentosColab); se a assinatura mudou de antes->depois E a tela ativa (`telas`)
  // consome o dado, repinta a home pelo agendador coalescido (renderApp). A falha final só
  // loga; quem preserva/zera o state é o próprio `ler`. Exposto p/ o probe boot-loaders-verify.
  async function loaderHome(nome, ler, assina, telas) {
    const antes = assina();
    for (let i = 0; i < 3; i++) {
      try { await ler(); break; }
      catch (e) {
        debug?.("[colab] " + nome + " (tentativa " + (i + 1) + "):", (e && (e.code || e.message)) || e);
        if (i < 2) await new Promise((r) => setTimeout(r, 1200));
      }
    }
    if (assina() !== antes && telas.includes(state.view && state.view.page)) {
      try { renderApp(); } catch (e) { /* render nunca derruba o loader */ }
    }
  }
  // (seam __loaderHome exposto no topo do IIFE, antes do guard de demo)

  // FASE B do colab: os 10 loaders da home, cada um sob o contrato loaderHome (retry+diff+
  // render). Extraída de carregarDadosCompletos pra o refetch de foco (recarregarVolateis)
  // reusar EXATAMENTE o mesmo contrato em vez de re-rodar o boot inteiro. Pressupõe o
  // funcionário do colab já em state.funcionarios[0] (lido antes, no boot; estável no foco).
  async function carregarHomeColab(db, u) {
    const auth = firebase.auth(); // singleton (fora do closure), mesma razão de carregarDadosCompletos
    await Promise.all([
      // Saldo SELF do banco de horas (sem PII), por código. Coleção populada pelo pipeline.
      loaderHome("saldo-bh", async () => {
        if (!u.codigo) { state.meuSaldoBH = null; return; }
        const bh = await db.collection("banco-horas-self").doc(String(u.codigo)).get();
        state.meuSaldoBH = bh.exists ? bh.data() : null;
      }, () => JSON.stringify(state.meuSaldoBH || null), ["colab-home", "colab-ponto"]),

      // Minhas férias (doc ferias/{codigo} do PRÓPRIO colaborador; a rule libera só o próprio).
      // Mesmo shape do gestor (resumo + periodos[] com gozos[]), mas na voz do dono: alimenta o
      // chip de situação na home e a aba Férias em Meu ponto. Fetch-then-swap: falha preserva o
      // valor anterior; sem código ou sem doc => null e o chip/aba degradam honestos.
      loaderHome("ferias-minha", async () => {
        if (!u.codigo) { state.feriasMinha = null; return; }
        const snap = await db.collection("ferias").doc(String(u.codigo)).get();
        state.feriasMinha = snap.exists ? { ...snap.data(), atualizadoEm: tsToIso(snap.data().atualizadoEm) } : null;
      }, () => {
        const fm = state.feriasMinha; if (!fm) return "null";
        const r = fm.resumo || {};
        return [r.temVencida ? 1 : 0, r.diasVencidos || 0, r.proporcionalAtual || 0, r.deFeriasAgora ? 1 : 0, r.diasAbonoTotal || 0, (fm.periodos || []).length].join("|");
      }, ["colab-home", "colab-ponto"]),

      // Comunicados do SEGMENTO (query por todos/turno/setor; a rule não filtra). Junta e
      // dedupe no cliente; preserva o "visto" otimista (prevCom) quando a leitura falha.
      loaderHome("comunicados", async () => {
        const prevCom = state.comunicadosColab || [];
        const f = state.funcionarios[0] || null;
        const meuTurno = f ? f.turno : null, meuSetor = f ? f.setor : null;
        const col = db.collection("comunicados");
        const queries = [col.where("ativo", "==", true).where("segmento.tipo", "==", "todos")];
        if (meuTurno != null) queries.push(col.where("ativo", "==", true).where("segmento.tipo", "==", "turno").where("segmento.valores", "array-contains", meuTurno));
        if (meuSetor) queries.push(col.where("ativo", "==", true).where("segmento.tipo", "==", "setor").where("segmento.valores", "array-contains", meuSetor));
        let algum = false;
        const snaps = await Promise.all(queries.map((q) => q.get().then((s) => { algum = true; return s; }).catch((e) => { debug?.("[colab] comunicados q:", e?.message || e); state._dbgComErr = (e && (e.code || e.message)) || String(e); return null; })));
        if (!algum) throw new Error("comunicados offline"); // TODAS falharam -> retry sem zerar
        const seen = {}; const arr = [];
        for (const sn of snaps) { if (!sn) continue; for (const d of sn.docs) { if (seen[d.id]) continue; seen[d.id] = 1; const dat = d.data(); arr.push({ id: d.id, ...dat, publicadoEm: tsToIso(dat.publicadoEm) }); } }
        const uid = auth.currentUser && auth.currentUser.uid;
        await Promise.all(arr.map(async (c) => {
          const prev = prevCom.find((x) => x.id === c.id);
          try { const l = await db.collection("comunicados").doc(c.id).collection("leituras").doc(uid).get(); c.minhaLeitura = l.exists ? { ...l.data(), em: tsToIso(l.data().em) } : ((prev && prev.minhaLeitura) || null); }
          catch (e) { c.minhaLeitura = (prev && prev.minhaLeitura) || null; }
        }));
        state.comunicadosColab = arr; state._dbgComN = arr.length;
      }, () => (state.comunicadosColab || []).map((c) => c.id + ":" + (c.ativo ? 1 : 0) + (c.fixado ? 1 : 0) + (c.minhaLeitura ? 1 : 0)).sort().join("|"), ["colab-home", "colab-comunicados"]),

      // Documentos institucionais publicados do segmento (mesma lógica de query). Mantém o
      // gate documentosColabProntos (o skeleton da tela só cede quando publicados chegaram).
      loaderHome("documentos", async () => {
        const f2 = state.funcionarios[0] || null;
        const t2 = f2 ? f2.turno : null, s2 = f2 ? f2.setor : null;
        const dbase = db.collection("documentos").where("status", "==", "publicado").where("escopo", "==", "institucional");
        const dq = [dbase.where("segmento.tipo", "==", "todos")];
        if (t2 != null) dq.push(dbase.where("segmento.tipo", "==", "turno").where("segmento.valores", "array-contains", t2));
        if (s2) dq.push(dbase.where("segmento.tipo", "==", "setor").where("segmento.valores", "array-contains", s2));
        let algum = false;
        const dsnaps = await Promise.all(dq.map((q) => q.get().then((s) => { algum = true; return s; }).catch((e) => { debug?.("[colab] documentos q:", e?.message || e); state._dbgDocErr = (e && (e.code || e.message)) || String(e); return null; })));
        if (!algum) throw new Error("documentos offline");
        const dseen = {}; const darr = [];
        for (const sn of dsnaps) { if (!sn) continue; for (const d of sn.docs) { if (dseen[d.id]) continue; dseen[d.id] = 1; const dat = d.data(); darr.push({ id: d.id, ...dat, publicadoEm: tsToIso(dat.publicadoEm), versaoEm: tsToIso(dat.versaoEm) }); } }
        const uid2 = auth.currentUser && auth.currentUser.uid;
        await Promise.all(darr.map(async (d) => {
          d.minhaAssinatura = null; d.minhaLeitura = null;
          try { const a = await db.collection("documentos").doc(d.id).collection("assinaturas").doc(uid2).get(); if (a.exists) d.minhaAssinatura = { ...a.data(), em: tsToIso(a.data().em) }; } catch (e) { /* */ }
          try { const l = await db.collection("documentos").doc(d.id).collection("leituras").doc(uid2).get(); if (l.exists) d.minhaLeitura = { ...l.data(), em: tsToIso(l.data().em) }; } catch (e) { /* */ }
        }));
        state.documentosColab = darr; state._dbgDocN = darr.length;
        state.documentosColabProntos = true;
      }, () => (state.documentosColab || []).map((d) => d.id + ":" + (d.minhaAssinatura ? 1 : 0) + (d.minhaLeitura ? 1 : 0)).sort().join("|"), ["colab-documentos"]),

      // Registro disciplinar do próprio colaborador (advertência/suspensão) + a própria ciência.
      loaderHome("disciplinares", async () => {
        if (!u.funcionarioId) { state.disciplinaresColab = []; return; }
        const uidC = auth.currentUser && auth.currentUser.uid;
        const dsnap = await db.collection("disciplinares").where("funcionarioId", "==", u.funcionarioId).get();
        const arr = await Promise.all(dsnap.docs.map(async (dd) => {
          const dat = dd.data();
          const o = { id: dd.id, ...dat, criadoEm: tsToIso(dat.criadoEm), minhaCiencia: null };
          try { const c = await dd.ref.collection("ciencia").doc(uidC).get(); if (c.exists) o.minhaCiencia = { ...c.data(), em: tsToIso(c.data().em) }; } catch (e) { /* */ }
          return o;
        }));
        arr.sort((a, b) => String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")));
        state.disciplinaresColab = arr;
      }, () => (state.disciplinaresColab || []).map((d) => d.id + ":" + (d.minhaCiencia ? 1 : 0)).sort().join("|"), ["colab-home"]),

      // Minhas ocorrências (read-only; a rule libera só as próprias). Excluídas fora da vista.
      loaderHome("ocorrencias", async () => {
        if (!u.funcionarioId) { state.ocorrenciasColab = []; return; }
        const osnap = await db.collection("ocorrencias").where("funcionarioId", "==", u.funcionarioId).get();
        state.ocorrenciasColab = osnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((o) => o.excluida !== true);
      }, () => (state.ocorrenciasColab || []).map((o) => o.id + ":" + (o.lancada ? 1 : 0)).sort().join("|"), ["colab-ponto"]),

      // Meus recibos (folha + cartão ponto): metadados leves + a MINHA assinatura de cada.
      loaderHome("recibos", async () => {
        if (!u.funcionarioId) { state.meusRecibos = []; return; }
        const rsnap = await db.collection("recibos").where("funcionarioId", "==", u.funcionarioId).get();
        const arr = rsnap.docs
          .map((d) => { const x = d.data(); return { id: d.id, ...x, criadoEm: tsToIso(x.criadoEm) }; })
          .sort((a, b) => String(b.competencia || "").localeCompare(String(a.competencia || "")));
        const uidR = auth.currentUser && auth.currentUser.uid;
        await Promise.all(arr.map(async (r) => {
          try { const a = await db.collection("recibos").doc(r.id).collection("assinaturas").doc(uidR).get(); r.minhaAssinatura = a.exists ? { ...a.data(), em: tsToIso(a.data().em) } : null; }
          catch (e) { r.minhaAssinatura = null; }
        }));
        state.meusRecibos = arr;
      }, () => (state.meusRecibos || []).map((r) => r.id + ":" + (r.minhaAssinatura ? 1 : 0)).sort().join("|"), ["colab-home", "colab-folha", "colab-ponto"]),

      // Clima + desempenho + gamificação (home). Em PARALELO entre si (independentes) pra o
      // pior caso offline não serializar 3 retries; cada um com o próprio contrato.
      (async () => {
        await Promise.all([
          loaderHome("clima", () => window.carregarPesquisasClimaColab(), () => (state.pesquisasClimaColab || []).map((p) => p.id + ":" + (p.jaRespondi ? 1 : 0)).sort().join("|"), ["colab-home"]),
          loaderHome("desempenho", () => window.carregarCiclosDesempenhoColab(), () => (state.ciclosDesempenhoColab || []).map((c) => c.id + ":" + c.status + ":" + (c.minhaAuto ? 1 : 0) + (c.meuResultado ? 1 : 0)).sort().join("|"), ["colab-home"]),
          // gami: config + placar + presença do dia (streak). São best-effort (não lançam);
          // a config já não gruda em falha (P2), então o loaderHome cobre só o diff+render.
          loaderHome("gami", async () => { await window.carregarGamiHome(); await window.gamiPingStreak(); }, () => ((state.gamiMeu && state.gamiMeu.total) || 0) + "|" + (state.gamiStreakDias || 0) + "|" + ((state.gamiConfig && state.gamiConfig.ativa) ? 1 : 0), ["colab-home", "colab-conquistas"]),
        ]);
      })(),

      // Aniversariantes do mês + recém-chegados (card de boas-vindas). carregarAniversariantes
      // já faz o próprio retry 3x e não lança; o loaderHome aqui garante só o diff+render.
      loaderHome("aniversariantes", () => window.carregarAniversariantes(3), () => JSON.stringify(state.aniversariantes || null), ["colab-home"]),

      // Vagas internas abertas + o meu interesse por vaga (fase 2).
      loaderHome("vagas-internas", () => window.carregarVagasInternasColab(), () => (state.vagasInternasColab || []).map((v) => v.id).sort().join(",") + "|" + Object.keys(state.meusInteressesInternos || {}).sort().join(","), ["colab-home", "colab-oportunidades"]),

      // Termos (adesão à assinatura eletrônica + canal de denúncias): já têm retry próprio
      // (3x) e gate de exibição decidido no render. Fora do loaderHome (não repintam a home).
      (async () => {
        state.termoAdesaoOk = await window.verificarTermoAdesao(3);
        state.termoCanalOk = await window.verificarTermoCanalDenuncia(3);
      })(),
    ]);
    // Safety: mesmo num boot totalmente offline (3 retries falharam), o skeleton da tela
    // Documentos precisa ceder (mantém o comportamento antigo de sempre marcar pronto).
    state.documentosColabProntos = true;
  }
  window.carregarHomeColab = carregarHomeColab;

  async function carregarDadosCompletos(db) {
    if (window.__atualizandoApp) return; // boot com atualização na frente: recarrega em ~2s (ver app.js)
    const auth = firebase.auth(); // auth NÃO está no closure (irmã de installFirebaseStore) — singleton.
                                  // Sem isto: o ramo colaborador lança "auth is not defined" ao montar
                                  // a leitura (uid), cai no catch e zera comunicados/documentos do colab.
    const u = currentUser();

    // F3 (Fundação SELF): o colaborador NÃO roda .get() amplo (vazaria a base inteira e, após
    // endurecer as rules na F5, tomaria permission-denied e travaria o boot). Carrega só o próprio
    // funcionário — compatível com as rules de HOJE e com as endurecidas. As telas self usam
    // coleções próprias (banco-horas-self, documentos, etc.) nas fases seguintes.
    if (u && u.role === "colaborador") {
      state.tiposCustom = []; state.acoesCustom = [];
      state.obrigacoes = []; state.bancoHoras = {}; state.pipelineMeta = null;
      state.ocorrencias = state.ocorrencias || [];
      // Fetch-then-swap (mesmo padrão do BH gestor v206): NÃO zera funcionarios/meuSaldoBH antes
      // da leitura — se a releitura falhar, a Conta mantém os dados em vez de virar parede de "—".
      if (u.funcionarioId) {
        try {
          const meu = await db.collection("funcionarios").doc(u.funcionarioId).get();
          if (meu.exists) state.funcionarios = [{ id: meu.id, ...meu.data() }];
          else state.funcionarios = [];
        } catch (e) { debug?.("[colab] meu funcionario:", e?.message || e); }
      } else {
        state.funcionarios = [];
      }

      // O resto do boot do colaborador (FASE B) roda sob o CONTRATO UNIFORME de loader:
      // os 10 blocos da home ganharam retry 3x + detector de mudança barato + render
      // coalescido (loaderHome). Extraída pra carregarHomeColab, que o refetch de foco
      // (recarregarVolateis) reusa com o MESMO contrato em vez de re-rodar o boot inteiro.
      await carregarHomeColab(db, u);
      return;
    }

    // ===== FASE A (paralela, leve): catálogos + permissões =====
    // Eram 5 awaits em FILA e as permissões carregavam POR ÚLTIMO (os gates de can()
    // abaixo decidiam sempre pelo PERM_DEFAULT no 1º boot). Agora 1 rodada só, e as
    // permissões chegam ANTES dos gates. funcionarios/tipos/acoes sem catch de
    // propósito: falha neles aborta o boot como sempre abortou.
    await Promise.all([
      db.collection("funcionarios").get().then((snap) => {
        state.funcionarios = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }),
      db.collection("tipos").get().then((snap) => {
        state.tiposCustom = snap.docs.map((d) => ({ id: d.id, ...d.data(), criadoEm: tsToIso(d.data().criadoEm) }));
      }),
      db.collection("acoes").get().then((snap) => {
        state.acoesCustom = snap.docs.map((d) => ({ id: d.id, ...d.data(), criadoEm: tsToIso(d.data().criadoEm) }));
      }),
      db.collection("obrigacoes").get().then((snap) => {
        state.obrigacoes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }).catch((e) => { state.obrigacoes = state.obrigacoes || []; debug?.("[obrigacoes] load:", e?.message || e); }),
      db.collection("config").doc("permissoes").get().then((permSnap) => {
        state.permissoes = permSnap.exists ? (permSnap.data() || null) : null;
      }).catch((e) => { debug?.("[permissoes] não carregou (usa default):", e?.message || e); state.permissoes = null; }),
    ]);

    // ===== FASE B (paralela, pesada): coleções independentes entre si =====
    // Era uma corrente de awaits (comunicados -> documentos -> disciplinares -> banco
    // de horas), um RTT esperando o outro; nenhuma lê o resultado da outra. Banco de
    // Horas: fontes diferentes por papel (admin/RH lê pipeline-rh/cur; líder lê
    // /bancoHoras por turno, a regra garante o isolamento).
    state.comunicados = state.comunicados || [];
    state.documentos = state.documentos || [];
    state.disciplinares = state.disciplinares || [];
    state.ferias = state.ferias || {};
    state.pjs = []; // preenchido no pós-render (abaixo)
    await Promise.all([
      (typeof can === "function" && can("comunicados.gerenciar")) ? recarregarComunicados() : null,
      (typeof can === "function" && can("documentos.gerenciar")) ? recarregarDocumentos() : null,
      (u.role === "admin" || u.role === "rh" || u.role === "lider")
        ? recarregarDisciplinares().catch((e) => debug?.("[disciplinares] boot:", e?.message || e))
        : null,
      carregarBancoHorasGestor(u),
      // Férias vencidas/proporcional (pipeline WKRADAR, SEM PII, só ATIVOS, ~95 docs). A rule
      // libera leitura pros 4 papéis-gestor (global, igual a /funcionarios); a UI é quem escopa
      // por podeVerFuncionario. Chave = funcionarioId ("f-"+código) pra casar direto com f.id na
      // lista. Boot-only, seguindo a liturgia de /funcionarios (que também não refaz no foco):
      // badge e linha nascem em lockstep com o cadastro. Falha isolada não derruba o boot.
      db.collection("ferias").get().then((snap) => {
        const m = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          const key = data.funcionarioId || ("f-" + d.id);
          m[key] = { ...data, atualizadoEm: tsToIso(data.atualizadoEm) };
        });
        state.ferias = m;
      }).catch((e) => { state.ferias = state.ferias || {}; debug?.("[ferias] load:", e?.message || e); }),
    ]);

    // Log global de auditoria NÃO é lido no boot (perf): carrega sob demanda
    // ao abrir a tela Auditoria (window.carregarAuditoriaGlobal).
    state.auditoriaGlobal = [];

    // Ocorrências — TEMPO REAL via onSnapshot (listener vivo).
    // limit(500): teto de leitura por boot pra não crescer sem limite conforme
    // o histórico aumenta (custo de reads + memória). Como o orderBy é data desc,
    // pega as 500 mais recentes. "Carregar mais" fica pra depois se precisar.
    // Líder filtra por turno server-side (casa com a rule); admin/rh/supervisor
    // leem amplo e a UI filtra (supervisor por funcionariosVisiveis).
    let q = db.collection("ocorrencias").orderBy("data", "desc");
    if (u.role === "lider") q = q.where("funcionarioTurno", "==", u.turno);
    q = q.limit(500);

    // "Pendente" no firebase.js: acao == null (não conferida). Espelha isPending
    // do app.js (que também checa dataConferencia), mas pra detectar NOVAS
    // ocorrências relevantes basta a ausência de ação — doc novo nunca vem
    // conferido. Mantemos simples e independente do app.js.
    const isPendingFb = (o) => o.acao == null;
    // Visibilidade pro user atual (mesma lógica do podeVerOcorrenciaUI):
    // admin/rh veem tudo; líder só do turno (já garantido pela query, mas
    // checamos por segurança); supervisor só de funcionariosVisiveis.
    const visivelPara = (user, o) => {
      if (!user) return false;
      if (user.role === "admin" || user.role === "rh") return true;
      if (user.role === "lider") return o.funcionarioTurno === user.turno;
      if (user.role === "supervisor") {
        // Turno VIVO do funcionário (consistente com o podeVerOcorrenciaUI do app.js),
        // com fallback pro denorm quando o funcionário ainda não estiver carregado.
        const f = (state.funcionarios || []).find((x) => x.id === o.funcionarioId);
        const turno = f ? f.turno : o.funcionarioTurno;
        return (user.funcionariosVisiveis || []).includes(o.funcionarioId)
          || (turno != null && (user.turnosVisiveis || []).includes(Number(turno)));
      }
      return false;
    };

    // Cancela listener anterior (re-login na mesma instância, troca de papel etc).
    if (ocorrenciasUnsub) { ocorrenciasUnsub(); ocorrenciasUnsub = null; }
    if (ocorrenciasAutoUnsub) { ocorrenciasAutoUnsub(); ocorrenciasAutoUnsub = null; }

    // Promise que resolve no PRIMEIRO snapshot, pra carregarDadosCompletos
    // poder await-ar o boot. Timeout de segurança de 5s pra não travar a tela
    // se o listener nunca emitir (rede/regra) — segue o boot, listener
    // continua vivo e atualiza a UI quando/se emitir.
    state.ocorrenciasProntas = false; // skeleton até o 1º snapshot chegar
    // O boot NÃO espera mais o 1º snapshot (era o estágio mais pesado do login, até
    // 500 docs): a tela abre com o skeleton e o snapshot re-renderiza sozinho via
    // aoAtualizarOcorrencias. Safety de 5s destrava o skeleton se o listener nunca
    // emitir (rede/regra), e o listener segue vivo e preenche quando/se emitir.
    const safetyOcorrencias = setTimeout(() => {
      if (!state.ocorrenciasProntas) {
        state.ocorrenciasProntas = true;
        debug?.("[ocorrencias] timeout de 5s no 1º snapshot, skeleton destravado");
        try { window.aoAtualizarOcorrencias?.(); } catch (e) { /* */ }
      }
    }, 5000);

    ocorrenciasUnsub = q.onSnapshot((snap) => {
      const todas = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          data: tsToIsoDate(data.data),
          dataConferencia: tsToIsoDate(data.dataConferencia),
          lancadoEm: tsToIsoDate(data.lancadoEm),
          criadoEm: tsToIso(data.criadoEm),
          atualizadoEm: tsToIso(data.atualizadoEm),
          excluidaEm: tsToIso(data.excluidaEm),
        };
      });
      // Soft delete filtrado NA INGESTÃO: excluídas saem de state.ocorrencias e
      // tudo rio abaixo (abas, KPIs, contagens) segue certo sem mexer em nada;
      // a aba Excluídas (auditoria) lê o array próprio.
      state.ocorrenciasExcluidas = todas.filter((o) => o.excluida === true);
      state.ocorrencias = todas.filter((o) => o.excluida !== true);

      // Detecção de deltas: compara ids deste snapshot com os da última vez.
      const user = currentUser();
      if (ocorrenciasIdsConhecidos === null) {
        // 1ª carga: só popula o Set, NUNCA notifica.
        ocorrenciasIdsConhecidos = new Set(state.ocorrencias.map((o) => o.id));
      } else {
        let qtdNovas = 0;
        for (const o of state.ocorrencias) {
          if (!ocorrenciasIdsConhecidos.has(o.id) &&
              isPendingFb(o) && visivelPara(user, o)) {
            qtdNovas++;
          }
        }
        // Atualiza o Set com TODOS os ids atuais (inclui os não-pendentes/não
        // visíveis, pra não re-notificar depois caso virem relevantes via update).
        ocorrenciasIdsConhecidos = new Set(state.ocorrencias.map((o) => o.id));
        if (qtdNovas > 0) {
          try { window.onNovasOcorrencias?.(qtdNovas); } catch (e) { debug?.("[ocorrencias] onNovasOcorrencias falhou:", e); }
        }
      }

      state.ocorrenciasProntas = true;
      clearTimeout(safetyOcorrencias);
      // SEMPRE: avisa a UI pra reagir (re-render seguro + badge no título).
      try { window.aoAtualizarOcorrencias?.(); } catch (e) { debug?.("[ocorrencias] aoAtualizarOcorrencias falhou:", e); }
    }, (err) => {
      debug?.("[ocorrencias] snapshot erro:", err);
      state.ocorrenciasProntas = true; // não fica preso no skeleton se der erro
      clearTimeout(safetyOcorrencias);
      try { window.aoAtualizarOcorrencias?.(); } catch (e) { /* */ }
    });

    // Automáticas (ocorrencias-auto) — TEMPO REAL igual às manuais (pedido William 2026-07-08,
    // "auto e manual mesma coisa, o reload segue tbm"). Antes era get pontual (só atualizava ao
    // refocar); agora um snapshot vivo reflete conferência/lançamento/novos docs na hora. Líder
    // líder filtra por turno server-side (casa com a rule); supervisor lê AMPLO (regra espelha
    // /ocorrencias) e o cliente filtra pelo escopo dele na ingestao (noEscopoAuto). Inicia []
    // pra ensureOcaCarregada não disparar o get lazy em paralelo.
    if (["admin", "rh", "lider", "supervisor"].includes(u.role)) {
      state.ocorrenciasAuto = state.ocorrenciasAuto || [];
      let qAuto = db.collection("ocorrencias-auto");
      if (u.role === "lider" && u.turno != null) qAuto = qAuto.where("turno", "==", u.turno);
      ocorrenciasAutoUnsub = qAuto.limit(1000).onSnapshot((snap) => {
        state.ocorrenciasAuto = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .filter((o) => noEscopoAuto(u, o))
          .sort((a, b) => String(b.dataIso || "").localeCompare(String(a.dataIso || "")));
        try { window.aoAtualizarOcorrencias?.(); } catch (e) { /* */ }
      }, (err) => { debug?.("[ocorrencias-auto] snapshot erro:", err?.message || err); });
    }

    // ===== PÓS-RENDER (não bloqueia o login): monitor, PJ e diretório de usuários =====
    // Alimentam o chip do pipeline, a aba PJ e o diretório, nada disso é o 1º segundo da
    // tela. Carregam em paralelo depois que o app já apareceu e um único re-render
    // aplica. Mesmo espírito do iniciarPresenca/auditoriaGlobal.
    (async () => {
      await Promise.all([
        ((u.role === "admin" || u.role === "rh") && window.carregarMonitorPipeline)
          ? window.carregarMonitorPipeline().catch((e) => debug?.("[monitor] boot:", e?.message || e))
          : null,
        // Contador leve pro LACRE dourado do menu (só admin, canal fora da matriz de cap):
        // conta as 'nova' com um limite pequeno; o valor exato é recomputado quando a tela
        // de Denúncias carrega a lista inteira (carregarDenunciasAdmin). Boolean-relevante.
        (u.role === "admin")
          ? db.collection("denuncias").where("status", "==", "nova").limit(50).get().then((snap) => {
              state.denunciasNovas = snap.size;
            }).catch((e) => debug?.("[denuncia] contador nova:", e?.message || e))
          : null,
        (u.role === "admin" || u.role === "rh")
          ? db.collection("pj").get().then((pjSnap) => {
              state.pjs = pjSnap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
                criadoEm: tsToIso(d.data().criadoEm),
                atualizadoEm: tsToIso(d.data().atualizadoEm),
              }));
            }).catch((e) => debug?.("[pj] load:", e?.message || e))
          : null,
        // Diretório completo (Auditoria e presença resolvem nome/foto por uid). Sem
        // segredos nos docs (nome/email/papel/turno/foto); read liberado a autenticados.
        db.collection("users").get().then((usersSnap) => {
          state.users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }).catch((e) => debug?.("[users] não foi possível carregar diretório:", e?.message || e)),
      ]);
      try { renderApp(); } catch (e) { /* re-render best-effort pós-boot */ }
    })();
  }

  // Converte Timestamp/Date/string → ISO curto "YYYY-MM-DD" (consumido por
  // formatDate(iso) no app.js). NÃO confundir com o tsToDateStr global do
  // app.js, que devolve formato longo "DD de mês de YYYY" pra exibição direta
  // de nascimento/admissão. Semânticas diferentes de propósito — daí o nome
  // distinto pra não shadowar/confundir.
  function tsToIsoDate(ts) {
    if (!ts) return null;
    if (typeof ts === "string") return ts;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return null; // ts malformado -> null em vez de RangeError no toISOString
    return d.toISOString().slice(0, 10);
  }

  function tsToIso(ts) {
    if (!ts) return null;
    if (typeof ts === "string") return ts;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return null; // ts malformado -> null em vez de RangeError no toISOString
    return d.toISOString();
  }

  function traduzErroAuth(e) {
    const map = {
      "auth/user-not-found": "Usuário não encontrado.",
      "auth/wrong-password": "Senha incorreta.",
      "auth/invalid-credential": "Email ou senha inválidos.",
      "auth/invalid-email": "Email inválido.",
      "auth/too-many-requests": "Muitas tentativas. Tente novamente em alguns minutos.",
      "auth/network-request-failed": "Sem conexão. Verifique a internet.",
    };
    return map[e.code] || e.message || "Erro de autenticação.";
  }

  // Inicia depois do DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootFirebase);
  } else {
    bootFirebase();
  }
})();
