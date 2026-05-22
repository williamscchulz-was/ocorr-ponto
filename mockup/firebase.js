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
        console.error(err);
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

      if (!confirm("Desfazer o lançamento? A ocorrência volta pra Conferidas e a marca de lançada some.")) return;

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
        console.error(err);
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
        console.error(err);
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
        console.error(err);
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
      if (!confirm(`Excluir a baixa de ${desc}? O saldo aumenta de volta.`)) return;

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
        console.error(err);
        toast("Erro: " + err.message, "danger");
      }
    };

    // Override deletePJ → /pj
    window.deletePJ = async function (id) {
      const pj = (state.pjs || []).find((p) => p.id === id);
      if (!pj) return;
      if (!confirm(`Excluir o PJ "${pj.nome}"? O histórico inteiro será perdido.`)) return;
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
        console.error(err);
        toast("Erro ao importar: " + err.message, "danger");
      }
    };

    // Override doImportFuncionarios → batch write em /funcionarios
    window.doImportFuncionarios = async function () {
      const data = window._importData;
      if (!Array.isArray(data) || data.length === 0) return;
      const markAusentes = $("#import-replace").checked;

      if (markAusentes) {
        if (!confirm(`Marcar como inativos os funcionários que não estão no JSON? Eles continuam no Firestore, ocorrências antigas mantêm a referência. Continuar?`)) return;
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
        console.error(err);
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
        if (!confirm(`"${a.label}" está em uso. Excluir deixa essas ocorrências com a ação registrada mas a opção some do dropdown. Continuar?`)) return;
      } else {
        if (!confirm(`Excluir "${a.label}"?`)) return;
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
      // - marcado  → LOCAL (sobrevive a fechar o browser)
      // - desmarcado (default) → SESSION (some ao fechar a aba)
      const manterConectado = !!$("#login-remember")?.checked;
      try {
        localStorage.setItem("weave:manterConectado", manterConectado ? "1" : "0");
      } catch {}
      try {
        const target = manterConectado
          ? firebase.auth.Auth.Persistence.LOCAL
          : firebase.auth.Auth.Persistence.SESSION;
        await auth.setPersistence(target);
      } catch (e) {
        console.warn("[Auth] não foi possível ajustar persistência:", e);
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
      console.log("[Auth] enviando email de redefinição pra:", email);
      try {
        await auth.sendPasswordResetEmail(email);
        toast(`Email enviado pra ${email}. Veja na caixa de entrada (e na pasta de spam).`);
      } catch (e) {
        console.error("[Auth] reset error:", e);
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

    // Persistência inicial = SESSION (default seguro).
    // window.login() ajusta dinamicamente conforme checkbox "manter conectado".
    auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch((e) => {
      console.warn("[Auth] não foi possível ajustar persistência:", e);
    });

    // Restaura estado do checkbox "manter conectado" entre visitas
    try {
      const remembered = localStorage.getItem("weave:manterConectado") === "1";
      const cb = $("#login-remember");
      if (cb) cb.checked = remembered;
    } catch {}

    // Auto-logout por inatividade: 30 min sem interação → signOut.
    // DESLIGADO quando user marcou "manter conectado" (opt-in explícito).
    const IDLE_MS = 30 * 60 * 1000;
    let idleTimer = null;
    function manterConectadoAtivo() {
      try { return localStorage.getItem("weave:manterConectado") === "1"; }
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
        console.warn("[Presence] heartbeat falhou:", e);
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
      }, (err) => console.warn("[PJ doc] snapshot erro:", err));
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
              lastSeenMs,
              status,
              age,
            };
          })
          .filter((p) => p.status !== "offline");
        if (typeof renderPresence === "function") renderPresence();
      }, (err) => {
        console.warn("[Presence] snapshot erro:", err);
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
      state.presence = [];
      if (auth.currentUser) {
        try {
          await db.collection("presence").doc(auth.currentUser.uid).delete();
        } catch (e) { console.warn("[Presence] cleanup falhou:", e); }
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

    // Observador de autenticação
    auth.onAuthStateChanged(async (fbUser) => {
      if (!fbUser) {
        await limparPresenca();
        state.currentUserId = null;
        $("#app")?.classList.add("hidden");
        $("#login")?.classList.remove("hidden");
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
        };

        // Popula state.users com pelo menos esse user
        state.users = [userInState];
        state.currentUserId = fbUser.uid;

        await carregarDadosCompletos(db);

        $("#login").classList.add("hidden");
        $("#app").classList.remove("hidden");
        state.view = { page: "dashboard", filterTab: "pendentes", filterTurno: null, search: "" };
        renderApp();

        // Inicia presença DEPOIS do app renderizar (state.view existe)
        iniciarPresenca().catch((e) => console.warn("[Presence] init falhou:", e));
      } catch (err) {
        console.error("Erro carregando perfil:", err);
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

    // Banco de Horas (todos logados leem)
    const bhSnap = await db.collection("bancoHoras").get();
    state.bancoHoras = {};
    bhSnap.docs.forEach((d) => {
      state.bancoHoras[d.id] = {
        ...d.data(),
        atualizadoEm: tsToIso(d.data().atualizadoEm),
      };
    });

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
        lancadoEm: tsToDateStr(data.lancadoEm),
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
