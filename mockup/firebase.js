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

  // Sem config → modo demo, não faz nada
  if (!cfg || !cfg.apiKey || cfg.apiKey === "COLE_AQUI") {
    console.info("[Firebase] sem config — rodando em modo demo (localStorage).");
    return;
  }

  // Marca o body pra esconder atalhos de login demo
  document.documentElement.classList.add("firebase-mode");

  const SDK_VERSION = "10.12.5";
  const SDK_BASE = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

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
      ]);

      const app = firebase.initializeApp(cfg);
      const auth = firebase.auth();
      const db = firebase.firestore();

      // Limpa qualquer sessão de modo demo
      localStorage.removeItem("ocorr-ponto:v1");

      window.FIREBASE = { app, auth, db };

      installFirebaseStore(auth, db);
      wireAuthFlow(auth, db);

      console.info("[Firebase] ativo, projeto:", cfg.projectId);
    } catch (err) {
      console.error("[Firebase] erro ao iniciar:", err);
      alert("Falha ao iniciar Firebase. Veja o console (F12). Voltando ao modo demo.");
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
        if (!confirm("Resetar APAGA todos os documentos. Tem certeza?")) return state;
        const batch = db.batch();
        const cols = ["ocorrencias", "funcionarios", "users"];
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
        console.error(err);
        toast("Erro ao salvar: " + err.message, "danger");
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
        console.error(err);
        toast("Erro ao salvar: " + err.message, "danger");
      }
    };

    // Override deleteOcorrencia → admin exclui do Firestore
    window.deleteOcorrencia = async function (id) {
      const o = state.ocorrencias.find((x) => x.id === id);
      if (!o) return;
      const f = getFuncionario(o.funcionarioId);
      const tipo = getTipo(o.tipo);
      const label = `${f?.nome || "?"} · ${tipo?.label || "?"} · ${formatDate(o.data)}`;
      if (!confirm(`Excluir DEFINITIVAMENTE esta ocorrência?\n\n${label}\n\nIsso some do histórico, sem desfazer.`)) return;

      try {
        await db.collection("ocorrencias").doc(id).delete();
        state.ocorrencias = state.ocorrencias.filter((x) => x.id !== id);
        closeModal();
        toast("Ocorrência excluída.");
        renderApp();
      } catch (err) {
        console.error(err);
        toast("Erro ao excluir: " + err.message, "danger");
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
        console.error(err);
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
        closeModal();
        toast("Tipo criado!");
        renderApp();
      } catch (err) {
        console.error(err);
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
        closeModal();
        toast(id ? "Funcionário atualizado." : "Funcionário criado.");
        renderApp();
      } catch (err) {
        console.error(err);
        toast("Erro ao salvar: " + err.message, "danger");
      }
    };

    // Override deleteFuncionario → /funcionarios
    window.deleteFuncionario = async function (id) {
      const f = state.funcionarios.find((x) => x.id === id);
      if (!f) return;
      const usado = state.ocorrencias.some((o) => o.funcionarioId === id);
      if (usado) return toast("Este funcionário tem ocorrências. Marque como inativo.", "danger");
      if (!confirm(`Excluir "${f.nome}"?`)) return;
      try {
        await db.collection("funcionarios").doc(id).delete();
        state.funcionarios = state.funcionarios.filter((x) => x.id !== id);
        closeModal();
        toast("Funcionário excluído.");
        renderApp();
      } catch (err) {
        toast("Erro: " + err.message, "danger");
      }
    };

    // Override doImportFuncionarios → batch write em /funcionarios
    window.doImportFuncionarios = async function () {
      const data = window._importData;
      if (!Array.isArray(data) || data.length === 0) return;
      const replace = $("#import-replace").checked;
      if (replace) {
        if (!confirm(`Substituir TODO o cadastro pelos ${data.length} do JSON? Ocorrências antigas mantêm o nome denormalizado.`)) return;
        // Deleta existentes
        const snap = await db.collection("funcionarios").get();
        const batchDel = db.batch();
        snap.docs.forEach((d) => batchDel.delete(d.ref));
        await batchDel.commit();
        state.funcionarios = [];
      }

      // Firestore batch tem limite de 500 ops; vamos em chunks de 400.
      const chunks = [];
      for (let i = 0; i < data.length; i += 400) chunks.push(data.slice(i, i + 400));

      let total = 0;
      for (const chunk of chunks) {
        const batch = db.batch();
        for (const item of chunk) {
          const id = "f-" + (item.codigo || slugify(item.nome));
          const ref = db.collection("funcionarios").doc(id);
          batch.set(ref, {
            nome: item.nome,
            codigo: item.codigo || null,
            turno: item.turno || null,
            setor: item.setor || null,
            ativo: item.ativo !== false,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          const existing = state.funcionarios.find((x) => x.id === id);
          if (existing) Object.assign(existing, {
            nome: item.nome, codigo: item.codigo, turno: item.turno || null,
            setor: item.setor || null, ativo: item.ativo !== false,
          });
          else state.funcionarios.push({
            id, nome: item.nome, codigo: item.codigo, turno: item.turno || null,
            setor: item.setor || null, ativo: item.ativo !== false,
          });
        }
        await batch.commit();
        total += chunk.length;
      }

      closeModal();
      toast(`${total} funcionários sincronizados no Firestore.`);
      renderApp();
    };

    // Override deleteTipo → exclui de /tipos
    window.deleteTipo = async function (id) {
      const t = (state.tiposCustom || []).find((x) => x.id === id);
      if (!t) return;
      const usado = state.ocorrencias.some((o) => o.tipo === id);
      if (usado) {
        if (!confirm(`"${t.label}" está em uso. Excluir manterá os registros mas some do form. Continuar?`)) return;
      } else {
        if (!confirm(`Excluir "${t.label}"?`)) return;
      }
      try {
        await db.collection("tipos").doc(id).delete();
        state.tiposCustom = state.tiposCustom.filter((x) => x.id !== id);
        toast("Tipo excluído.");
        renderApp();
      } catch (err) {
        console.error(err);
        toast("Erro ao excluir: " + err.message, "danger");
      }
    };
  }

  // ----------------------------------------
  // Fluxo de autenticação
  // ----------------------------------------

  function wireAuthFlow(auth, db) {
    // Override login: trata input como email (login-user) + senha
    window.login = async function (emailOrId, senha) {
      const err = $("#login-error");
      err.classList.add("hidden");

      // Aceita "rh1" digitado virar "rh1@" + autocomplete sugerido,
      // mas o esperado é email completo. Se não tem @, mostramos erro.
      if (!emailOrId.includes("@")) {
        err.textContent = "Use seu email corporativo completo.";
        err.classList.remove("hidden");
        return;
      }

      try {
        await auth.signInWithEmailAndPassword(emailOrId, senha);
        // onAuthStateChanged toma o controle daqui
      } catch (e) {
        err.textContent = traduzErroAuth(e);
        err.classList.remove("hidden");
      }
    };

    window.logout = async function () {
      await auth.signOut();
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
        await db.collection("users").doc(uid).set(userDoc);

        // Envia email de redefinição pra ele criar a própria senha
        let resetEnviado = false;
        try {
          await secondary.auth().sendPasswordResetEmail(email);
          resetEnviado = true;
        } catch (e) {
          console.warn("Não foi possível enviar email de redefinição:", e.message);
        }

        // Adiciona ao state local pra UI atualizar
        state.users.push({ id: uid, ...userDoc, criadoEm: new Date().toISOString() });

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

    // Reset de senha via Firebase Auth
    window.firebaseResetSenha = async function () {
      const email = ($("#login-user").value || "").trim();
      if (!email || !email.includes("@")) {
        toast("Digite seu email primeiro, aí clique de novo em 'Esqueci minha senha'.", "danger");
        return;
      }
      try {
        await auth.sendPasswordResetEmail(email);
        toast("Email de recuperação enviado pra " + email);
      } catch (e) {
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

    // Observador de autenticação
    auth.onAuthStateChanged(async (fbUser) => {
      if (!fbUser) {
        state.currentUserId = null;
        $("#app")?.classList.add("hidden");
        $("#login")?.classList.remove("hidden");
        return;
      }

      // Busca o doc users/{uid} pra papel/turno
      try {
        const userSnap = await db.collection("users").doc(fbUser.uid).get();
        if (!userSnap.exists) {
          $("#login-error").textContent =
            "Seu usuário existe no Auth mas não tem perfil cadastrado. " +
            "Peça ao admin pra criar /users/" + fbUser.uid + " no Firestore.";
          $("#login-error").classList.remove("hidden");
          await auth.signOut();
          return;
        }

        const userData = userSnap.data();
        const userInState = {
          id: fbUser.uid,
          nome: userData.nome,
          email: fbUser.email,
          role: userData.role,
          turno: userData.turno || null,
        };

        // Popula state.users com pelo menos esse user
        state.users = [userInState];
        state.currentUserId = fbUser.uid;

        await carregarDadosCompletos(db);

        $("#login").classList.add("hidden");
        $("#app").classList.remove("hidden");
        state.view = { page: "dashboard", filterTab: "pendentes", filterTurno: null, search: "" };
        renderApp();
      } catch (err) {
        console.error("Erro carregando perfil:", err);
        toast("Erro ao carregar perfil: " + err.message, "danger");
      }
    });
  }

  async function carregarDadosCompletos(db) {
    const u = currentUser();

    // Funcionários (todos podem ler)
    const funcSnap = await db.collection("funcionarios").get();
    state.funcionarios = funcSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Tipos custom (todos podem ler)
    const tiposSnap = await db.collection("tipos").get();
    state.tiposCustom = tiposSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      criadoEm: tsToIso(d.data().criadoEm),
    }));

    // Ocorrências (filtradas pelas regras conforme papel)
    let q = db.collection("ocorrencias").orderBy("data", "desc");
    if (u.role === "lider") q = q.where("funcionarioTurno", "==", u.turno);

    const occSnap = await q.get();
    state.ocorrencias = occSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        data: tsToDateStr(data.data),
        dataConferencia: tsToDateStr(data.dataConferencia),
        criadoEm: tsToIso(data.criadoEm),
        atualizadoEm: tsToIso(data.atualizadoEm),
      };
    });

    // Usuários (só admin vê todos)
    if (u.role === "admin") {
      const usersSnap = await db.collection("users").get();
      state.users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  }

  function tsToDateStr(ts) {
    if (!ts) return null;
    if (typeof ts === "string") return ts;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toISOString().slice(0, 10);
  }

  function tsToIso(ts) {
    if (!ts) return null;
    if (typeof ts === "string") return ts;
    return (ts.toDate ? ts.toDate() : new Date(ts)).toISOString();
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
