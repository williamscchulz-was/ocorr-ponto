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
      // Templates de email (reset senha, verificação) saem em pt-BR
      auth.languageCode = "pt";
      const db = firebase.firestore();

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
      // Splash "Entrando…": o inline script do <head> já marcou .sessao-restaurando
      // quando manterConectado=1. Salvaguarda: se o auth travar (rede), esconde
      // o splash após 7s pra não prender o usuário (cai no login).
      if (manterConectadoBoot) {
        setTimeout(() => document.documentElement.classList.remove("sessao-restaurando"), 7000);
      } else {
        document.documentElement.classList.remove("sessao-restaurando");
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
        if (!(await confirmar({
          titulo: "Resetar tudo?",
          msg: "Isso APAGA todos os documentos do Firestore. Não dá pra desfazer.",
          okLabel: "Resetar",
          perigo: true,
        }))) return state;
        const batch = db.batch();
        // Todas as coleções gravadas por documento — senão o reset deixa
        // órfãos (saldos, PJs, chat, presença, tipos/ações custom).
        const cols = ["ocorrencias", "funcionarios", "users", "bancoHoras", "pj", "mensagens", "presence", "tipos", "acoes"];
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
        debug?.(err);
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

    // Override deleteOcorrencia → admin exclui do Firestore
    window.deleteOcorrencia = async function (id) {
      const o = state.ocorrencias.find((x) => x.id === id);
      if (!o) return;
      const f = getFuncionario(o.funcionarioId);
      const tipo = getTipo(o.tipo);
      const label = `${f?.nome || "?"} · ${tipo?.label || "?"} · ${formatDate(o.data)}`;
      if (!(await confirmar({
        titulo: "Excluir ocorrência?",
        msg: `${label}. Isso some do histórico, sem desfazer.`,
        okLabel: "Excluir",
        perigo: true,
      }))) return;

      try {
        await db.collection("ocorrencias").doc(id).delete();
        state.ocorrencias = state.ocorrencias.filter((x) => x.id !== id);
        closeModal();
        toast("Ocorrência excluída.");
        renderApp();
      } catch (err) {
        debug?.(err);
        toast("Erro ao excluir: " + err.message, "danger");
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
        toast("Marcada como lançada!");
        renderApp();
      } catch (err) {
        debug?.(err);
        toast("Erro: " + err.message, "danger");
      }
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
          };
          await db.collection("pj").doc(novoId).set(docData);
          if (!state.pjs) state.pjs = [];
          state.pjs.push({
            id: novoId,
            ...dados,
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
            historicoValores: docData.historicoValores,
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

      try {
        await db.collection("pj").doc(id).update({
          valorAtual: novoValor,
          historicoValores: novoHist,
          dataProximaRevisao: novaProxRevisao,
          atualizadoPor: u.id,
          atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        });
        Object.assign(pj, {
          valorAtual: novoValor,
          historicoValores: novoHist,
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

      await db.collection("pj").doc(pjId).update({
        aditivos: firebase.firestore.FieldValue.arrayUnion(novo),
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        atualizadoPor: u?.id || "?",
      });
      const local = (state.pjs || []).find((p) => p.id === pjId);
      if (local) local.aditivos = [...(local.aditivos || []), novo];
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

      await db.collection("pj").doc(pjId).update({
        aditivos: firebase.firestore.FieldValue.arrayRemove(alvo),
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        atualizadoPor: u?.id || "?",
      });
      local.aditivos = (local.aditivos || []).filter((a) => a.id !== aditivoId);
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
        state.pjs = state.pjs.filter((p) => p.id !== id);
        closeModal();
        toast("PJ excluído.");
        renderApp();
      } catch (err) {
        toast("Erro: " + err.message, "danger");
      }
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

      try {
        await auth.signInWithEmailAndPassword(emailOrId, senha);
        // onAuthStateChanged toma o controle daqui (vai carregar dados +
        // renderizar). Botão fica em "Entrando..." até a transição.
        return true;
      } catch (e) {
        err.textContent = traduzErroAuth(e);
        err.classList.remove("hidden");
        return false;
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
        if (role === "supervisor") {
          // Supervisor nasce sem turno e com lista vazia; admin define os
          // funcionários visíveis depois, na edição do usuário.
          userDoc.turno = null;
          userDoc.funcionariosVisiveis = [];
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
      // Se o papel mudou pra algo != supervisor, zera a lista de funcionários
      // visíveis (não faz sentido manter escopo de supervisor noutro papel).
      if (dados.role !== undefined && dados.role !== "supervisor") {
        update.funcionariosVisiveis = [];
      }

      try {
        await db.collection("users").doc(uid).update(update);
        const local = state.users.find((x) => x.id === uid);
        if (local) Object.assign(local, update);
        return { ok: true };
      } catch (e) {
        return { ok: false, err: e.message || String(e) };
      }
    };

    // ===== Chat interno =====
    const MSG_RETENCAO_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias

    function parKeyDe(a, b) { return [a, b].sort().join("__"); }
    window.parKeyChat = parKeyDe;

    // Envia mensagem de texto. paraUid/paraNome = destinatário.
    window.enviarMensagem = async function (paraUid, paraNome, texto) {
      const u = currentUser();
      if (!u || !auth.currentUser) throw new Error("Não autenticado.");
      const t = String(texto || "").trim();
      if (!t) throw new Error("Mensagem vazia.");
      if (t.length > 2000) throw new Error("Mensagem muito longa (máx 2000).");
      const meu = auth.currentUser.uid;
      await db.collection("mensagens").add({
        parKey: parKeyDe(meu, paraUid),
        de: meu,
        deNome: u.nome || "?",
        para: paraUid,
        paraNome: paraNome || "?",
        texto: t,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        expiraEm: firebase.firestore.Timestamp.fromMillis(Date.now() + MSG_RETENCAO_MS),
        lido: false,
      });
    };

    // Escuta UMA conversa com o peer. cb(msgs, err).
    //
    // IMPORTANTE: regras do Firestore NÃO são filtros — uma query só é aceita
    // se for *provadamente segura* pelas constraints. A regra de /mensagens é
    // (de==eu || para==eu), então uma query por parKey NÃO é provável segura
    // (Firestore não sabe que parKey codifica os participantes) → permission
    // denied. Por isso usamos DUAS queries alinhadas à regra e juntamos:
    //   A) enviadas:  de==eu  E para==peer   (segura por de==eu)
    //   B) recebidas: de==peer E para==eu     (segura por para==eu)
    // Sem orderBy (ordena no cliente) → sem índice composto.
    window.escutarConversa = function (peerUid, cb) {
      if (!auth.currentUser) { cb(null, new Error("não autenticado")); return () => {}; }
      const meu = auth.currentUser.uid;
      let enviadas = [], recebidas = [];
      let prontoA = false, prontoB = false;
      const mapDoc = (d) => ({ id: d.id, ...d.data(), criadoEm: tsToIso(d.data().criadoEm) });
      const emit = () => {
        if (!prontoA || !prontoB) return; // espera os 2 primeiros snapshots (evita piscar)
        const todas = [...enviadas, ...recebidas]
          .sort((a, b) => (a.criadoEm || "9999").localeCompare(b.criadoEm || "9999"));
        cb(todas, null);
      };
      const onErr = (e) => { debug?.("[chat] conversa snapshot:", e.message); cb(null, e); };
      const unsubA = db.collection("mensagens")
        .where("de", "==", meu).where("para", "==", peerUid)
        .onSnapshot((s) => { enviadas = s.docs.map(mapDoc); prontoA = true; emit(); }, onErr);
      const unsubB = db.collection("mensagens")
        .where("de", "==", peerUid).where("para", "==", meu)
        .onSnapshot((s) => { recebidas = s.docs.map(mapDoc); prontoB = true; emit(); }, onErr);
      return () => { try { unsubA(); } catch {} try { unsubB(); } catch {} };
    };

    // Escuta TODAS as mensagens recebidas por mim (pra badge de não-lidas + lista
    // de conversas). Popula state.mensagensRecebidas e atualiza o badge do nav.
    // Retorna unsubscribe.
    window.escutarMinhasMensagens = function () {
      if (!auth.currentUser) return () => {};
      const meu = auth.currentUser.uid;
      return db.collection("mensagens")
        .where("para", "==", meu)
        .onSnapshot((snap) => {
          // sort desc no cliente (sem orderBy → sem índice composto)
          state.mensagensRecebidas = snap.docs
            .map((d) => ({ id: d.id, ...d.data(), criadoEm: tsToIso(d.data().criadoEm) }))
            .sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
          try { window.atualizarBadgeChat?.(); } catch {}
        }, (e) => debug?.("[chat] minhas msgs snapshot:", e.message));
    };

    // Marca como lida toda msg recebida nesta conversa.
    window.marcarConversaLida = async function (parKey) {
      if (!auth.currentUser) return;
      const meu = auth.currentUser.uid;
      const snap = await db.collection("mensagens")
        .where("parKey", "==", parKey)
        .where("para", "==", meu)
        .where("lido", "==", false)
        .get();
      if (snap.empty) return;
      const batch = db.batch();
      snap.docs.forEach((d) => batch.update(d.ref, { lido: true }));
      await batch.commit();
    };

    // Atualizar a própria foto de perfil. Recebe base64 (data URL) ou null
    // pra remover. Rule do Firestore garante que só o próprio user pode
    // atualizar e que só o campo fotoBase64 pode ser tocado por self-update.
    window.atualizarMinhaFoto = async function (base64OrNull) {
      const user = auth.currentUser;
      if (!user) throw new Error("Não está logado.");
      const uid = user.uid;
      const value = base64OrNull || firebase.firestore.FieldValue.delete();
      await db.collection("users").doc(uid).update({ fotoBase64: value });
      // Reflete no state local
      const me = (state.users || []).find((x) => x.id === uid);
      if (me) {
        if (base64OrNull) me.fotoBase64 = base64OrNull;
        else delete me.fotoBase64;
      }
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

    // Restaura estado do checkbox "manter conectado" entre visitas
    try {
      const remembered = localStorage.getItem("fiopulse:manterConectado") === "1";
      const cb = $("#login-remember");
      if (cb) cb.checked = remembered;
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
    // Listener global do chat (mensagens recebidas → badge + lista de conversas)
    let chatUnsub = null;
    // Listener vivo das ocorrências (tempo real). Set de ids da última emissão
    // pra detectar deltas (novas ocorrências pendentes/visíveis → notifica).
    let ocorrenciasUnsub = null;
    let ocorrenciasIdsConhecidos = null; // null = ainda não houve 1ª carga

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
      // Para o listener global do chat e zera as mensagens recebidas
      if (chatUnsub) { chatUnsub(); chatUnsub = null; }
      state.mensagensRecebidas = [];
      // Para o listener vivo das ocorrências e reseta a detecção de deltas
      // (próximo login volta a tratar a 1ª emissão como carga inicial → sem beep)
      if (ocorrenciasUnsub) { ocorrenciasUnsub(); ocorrenciasUnsub = null; }
      ocorrenciasIdsConhecidos = null;
      // Para qualquer subscription de conversa aberta (app.js)
      try { window.pararEscutaConversa?.(); } catch {}
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

    // Splash de restauração de sessão: esconde o overlay "Entrando…".
    function esconderSplash() {
      document.documentElement.classList.remove("sessao-restaurando");
    }

    // Observador de autenticação
    auth.onAuthStateChanged(async (fbUser) => {
      if (!fbUser) {
        await limparPresenca();
        state.currentUserId = null;
        $("#app")?.classList.add("hidden");
        $("#login")?.classList.remove("hidden");
        esconderSplash(); // sem sessão → mostra login (sem flash de novo)
        restoreLoginButton();
        // Cancela timer de inatividade
        if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
        return;
      }
      // Inicia timer assim que loga
      resetIdleTimer();

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
          // Escopo do supervisor — sem isso o filtro de visibilidade fica vazio
          funcionariosVisiveis: userData.funcionariosVisiveis || [],
          // Foto de perfil do próprio usuário (avatar na sidebar)
          fotoBase64: userData.fotoBase64 || null,
        };

        // Popula state.users com pelo menos esse user
        state.users = [userInState];
        state.currentUserId = fbUser.uid;

        await carregarDadosCompletos(db);

        $("#login").classList.add("hidden");
        $("#app").classList.remove("hidden");
        esconderSplash(); // troca splash → app direto (login nunca pisca)
        state.view = { page: "dashboard", filterTab: "pendentes", filterTurno: null, search: "" };
        renderApp();

        // Inicia presença DEPOIS do app renderizar (state.view existe)
        iniciarPresenca().catch((e) => debug?.("[Presence] init falhou:", e));

        // Inicia o listener global do chat (mensagens recebidas → badge)
        if (chatUnsub) { chatUnsub(); chatUnsub = null; }
        try { chatUnsub = window.escutarMinhasMensagens(); }
        catch (e) { debug?.("[chat] init falhou:", e); }
      } catch (err) {
        debug?.("Erro carregando perfil:", err);
        toast("Erro ao carregar perfil: " + err.message, "danger");
        // Sign out faz onAuthStateChanged disparar de novo com null,
        // que volta pra tela de login e restaura o botão "Entrar".
        await auth.signOut().catch(() => {});
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

    // Ações custom (todos podem ler)
    const acoesSnap = await db.collection("acoes").get();
    state.acoesCustom = acoesSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      criadoEm: tsToIso(d.data().criadoEm),
    }));

    // Banco de Horas — fontes diferentes por papel pra isolamento por turno:
    //
    // Admin/RH: lê pipeline-rh/cur (canônico, tem meta agregada). Doc único
    // com TODOS os funcionários ativos — não dá pra filtrar por turno via rule.
    //
    // Líder: lê /bancoHoras filtrando por funcionarioTurno=u.turno. Cada doc
    // tem o turno denormalizado pelo pipeline, regra do Firestore garante o
    // isolamento. Sem acesso à meta agregada (não precisa, vê só dos seus).
    state.bancoHoras = {};
    state.pipelineMeta = null;
    try {
      if (u.role === "admin" || u.role === "rh") {
        const curSnap = await db.collection("pipeline-rh").doc("cur").get();
        if (curSnap.exists) {
          const cur = curSnap.data();
          const atualizadoEm = tsToIso(cur.meta?.generatedAt);
          for (const f of (cur.funcionarios || [])) {
            state.bancoHoras["f-" + f.funcId] = {
              funcionarioCodigo: f.funcId,
              funcionarioNome: f.nome,
              minutos: f.saldoAtualMin,
              saldoFormatado: f.saldoAtualFmt,
              atualizadoEm,
              ultimaDataIso: f.ultimaDataIso,
            };
          }
          state.pipelineMeta = {
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
          debug?.("[pipeline-rh] cur carregado:", state.pipelineMeta);
        } else {
          debug?.("[pipeline-rh] doc 'cur' não existe — pipeline RH não rodou ainda.");
        }
      } else if (u.role === "lider") {
        // Query OBRIGATORIAMENTE filtrada por turno pra casar com a rule.
        const bhSnap = await db.collection("bancoHoras")
          .where("funcionarioTurno", "==", u.turno)
          .get();
        bhSnap.docs.forEach((d) => {
          state.bancoHoras[d.id] = {
            ...d.data(),
            atualizadoEm: tsToIso(d.data().atualizadoEm),
          };
        });
        debug?.("[bancoHoras] líder turno", u.turno, "→", bhSnap.size, "saldos");
      } else if (u.role === "supervisor") {
        // Supervisor lê a coleção bancoHoras inteira (rule permite leitura
        // ampla; a UI filtra pela lista funcionariosVisiveis do supervisor).
        const bhSnap = await db.collection("bancoHoras").get();
        bhSnap.docs.forEach((d) => {
          state.bancoHoras[d.id] = {
            ...d.data(),
            atualizadoEm: tsToIso(d.data().atualizadoEm),
          };
        });
        debug?.("[bancoHoras] supervisor →", bhSnap.size, "saldos");
      }
    } catch (e) {
      debug?.("[bh] falha ao ler banco de horas:", e?.message || e);
    }

    // Controle PJ (admin/RH só)
    state.pjs = [];
    if (u.role === "admin" || u.role === "rh") {
      const pjSnap = await db.collection("pj").get();
      state.pjs = pjSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        criadoEm: tsToIso(d.data().criadoEm),
        atualizadoEm: tsToIso(d.data().atualizadoEm),
      }));
    }

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
        return (user.funcionariosVisiveis || []).includes(o.funcionarioId);
      }
      return false;
    };

    // Cancela listener anterior (re-login na mesma instância, troca de papel etc).
    if (ocorrenciasUnsub) { ocorrenciasUnsub(); ocorrenciasUnsub = null; }

    // Promise que resolve no PRIMEIRO snapshot, pra carregarDadosCompletos
    // poder await-ar o boot. Timeout de segurança de 5s pra não travar a tela
    // se o listener nunca emitir (rede/regra) — segue o boot, listener
    // continua vivo e atualiza a UI quando/se emitir.
    let primeiroSnapshotResolvido = false;
    await new Promise((resolve) => {
      const safety = setTimeout(() => {
        if (!primeiroSnapshotResolvido) {
          primeiroSnapshotResolvido = true;
          debug?.("[ocorrencias] timeout de 5s no 1º snapshot — seguindo boot");
          resolve();
        }
      }, 5000);

      ocorrenciasUnsub = q.onSnapshot((snap) => {
        state.ocorrencias = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            data: tsToIsoDate(data.data),
            dataConferencia: tsToIsoDate(data.dataConferencia),
            lancadoEm: tsToIsoDate(data.lancadoEm),
            criadoEm: tsToIso(data.criadoEm),
            atualizadoEm: tsToIso(data.atualizadoEm),
          };
        });

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

        // SEMPRE: avisa a UI pra reagir (re-render seguro + badge no título).
        try { window.aoAtualizarOcorrencias?.(); } catch (e) { debug?.("[ocorrencias] aoAtualizarOcorrencias falhou:", e); }

        // Resolve o boot no 1º snapshot (cancela o timeout de segurança).
        if (!primeiroSnapshotResolvido) {
          primeiroSnapshotResolvido = true;
          clearTimeout(safety);
          resolve();
        }
      }, (err) => {
        debug?.("[ocorrencias] snapshot erro:", err);
        // Em erro no 1º snapshot, libera o boot mesmo assim (não trava a tela).
        if (!primeiroSnapshotResolvido) {
          primeiroSnapshotResolvido = true;
          clearTimeout(safety);
          resolve();
        }
      });
    });

    // Usuários — todos carregam o diretório completo (pro chat poder
    // listar/mandar mensagem pra qualquer um, online ou offline).
    // Sem segredos nos docs (nome/email/papel/turno/foto). Regra do
    // Firestore: read liberado pra autenticados.
    try {
      const usersSnap = await db.collection("users").get();
      state.users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      debug?.("[users] não foi possível carregar diretório:", e?.message || e);
      // mantém ao menos o próprio user já populado em wireAuthFlow
    }
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
