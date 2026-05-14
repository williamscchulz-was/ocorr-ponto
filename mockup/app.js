// ============================================
// Ocorrências do Ponto — App Logic
// ============================================

const state = {
  ...store.init(),
  view: { page: "dashboard", filterTab: "pendentes", filterTurno: null, search: "" },
};

// ---------- Helpers ----------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

const formatDateFull = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const formatDay = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return String(d.getDate()).padStart(2, "0");
};
const formatMonth = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const getFuncionario = (id) => state.funcionarios.find((f) => f.id === id);
const getAllTipos = () => [
  ...TIPOS_OCORRENCIA,
  ...(state.tiposCustom || []),
];
const parseTurno = (v) => {
  if (!v) return null;
  if (v === "geral") return "geral";
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const getTipo = (id) => getAllTipos().find((t) => t.id === id);
const getAcao = (id) => ACOES.find((a) => a.id === id);
const getUser = (id) => state.users.find((u) => u.id === id);

const currentUser = () => state.currentUserId ? getUser(state.currentUserId) : null;

const isPending = (occ) => !occ.acao || !occ.dataConferencia;

const initials = (nome) => {
  const parts = nome.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
};

// SVG icons (inline for offline)
const icon = (name) => {
  const icons = {
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    chevron: '<polyline points="9 18 15 12 9 6"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${icons[name] || ""}</svg>`;
};

// ---------- Toast ----------

function toast(msg, variant = "success") {
  const el = document.createElement("div");
  el.className = `toast toast--${variant}`;
  el.innerHTML = `${icon(variant === "success" ? "check" : "alert")}<span>${msg}</span>`;
  $("#toast-root").appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity 200ms";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 200);
  }, 2400);
}

// ---------- Modal ----------

function openModal(html, opts = {}) {
  const root = $("#modal-root");
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true">${html}</div>
    </div>
  `;
  const backdrop = $("#modal-backdrop");
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
  if (opts.onMount) opts.onMount(root.querySelector(".modal"));
}

function closeModal() {
  const backdrop = $("#modal-backdrop");
  if (!backdrop) return;
  backdrop.style.animation = "fadeIn 160ms reverse";
  setTimeout(() => ($("#modal-root").innerHTML = ""), 140);
}

// ---------- Login ----------

function renderLoginQuick() {
  const root = $("#login-quick");
  root.innerHTML = state.users.map((u) => `
    <button type="button" data-user="${u.id}">
      <strong>${u.nome}</strong>
      <span>${roleLabel(u)}</span>
    </button>
  `).join("");

  $$("#login-quick button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.user;
      const u = getUser(id);
      $("#login-user").value = u.id;
      $("#login-pass").value = u.senha;
      login(u.id, u.senha);
    });
  });
}

function roleLabel(user) {
  if (user.role === "admin") return "Administrador";
  if (user.role === "rh") return "RH";
  if (user.role === "lider") return `Líder ${user.turno}º Turno`;
  return user.role;
}

function login(userId, senha) {
  const u = state.users.find((x) => x.id === userId && x.senha === senha);
  const err = $("#login-error");
  if (!u) {
    err.textContent = "Usuário ou senha inválidos.";
    err.classList.remove("hidden");
    return;
  }
  err.classList.add("hidden");
  state.currentUserId = u.id;
  store.save({ ...state, view: undefined });
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");
  state.view = { page: "dashboard", filterTab: "pendentes", filterTurno: null, search: "" };
  renderApp();
}

function logout() {
  state.currentUserId = null;
  store.save({ ...state, view: undefined });
  $("#app").classList.add("hidden");
  $("#login").classList.remove("hidden");
  $("#login-user").value = "";
  $("#login-pass").value = "";
}

// ---------- App Shell ----------

function renderApp() {
  const u = currentUser();
  if (!u) { logout(); return; }

  // Sidebar user
  $("#user-avatar").textContent = initials(u.nome);
  $("#user-name").textContent = u.nome;
  $("#user-role").textContent = roleLabel(u);

  renderNav();
  renderBottomNav();
  renderView();
  updateFab();
}

function renderNav() {
  const u = currentUser();
  const pending = pendingForUser(u).length;

  const items = [];
  items.push({ id: "dashboard", label: "Ocorrências", icon: "inbox", badge: pending });

  if (u.role === "rh" || u.role === "admin") {
    items.push({ id: "funcionarios", label: "Funcionários", icon: "users" });
    items.push({ id: "config", label: "Configurações", icon: "settings" });
  }

  $("#nav").innerHTML = items.map((it) => `
    <button class="nav__item ${state.view.page === it.id ? "active" : ""}" data-page="${it.id}">
      ${icon(it.icon)}
      <span>${it.label}</span>
      ${it.badge ? `<span class="nav__badge">${it.badge}</span>` : ""}
    </button>
  `).join("");

  $$("#nav .nav__item").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.view.page = btn.dataset.page;
      renderApp();
      closeSidebar();
    });
  });
}

function renderBottomNav() {
  const u = currentUser();
  const pending = pendingForUser(u).length;
  const canCreate = u.role === "rh" || u.role === "admin";

  // Itens à esquerda do FAB
  const left = [
    { id: "dashboard", label: "Ocorrências", icon: "inbox", badge: pending },
  ];
  if (u.role === "rh" || u.role === "admin") {
    left.push({ id: "funcionarios", label: "Funcionários", icon: "users" });
  }

  // Itens à direita do FAB
  const right = [];
  if (u.role === "rh" || u.role === "admin") {
    right.push({ id: "config", label: "Ajustes", icon: "settings" });
  }
  // Conta/logout sempre presente
  right.push({ id: "__menu", label: "Conta", icon: "user" });

  const renderItem = (it) => `
    <button class="bottom-nav__item ${state.view.page === it.id ? "active" : ""}" data-page="${it.id}" aria-label="${it.label}">
      ${icon(it.icon)}
      <span>${it.label}</span>
      ${it.badge ? `<span class="bottom-nav__badge">${it.badge > 9 ? "9+" : it.badge}</span>` : ""}
    </button>`;

  const fabHtml = canCreate ? `
    <button class="bottom-nav__item bottom-nav__item--fab" data-action="nova" aria-label="Nova ocorrência">
      <span class="bottom-nav__fab">${icon("plus")}</span>
    </button>` : "";

  $("#bottom-nav").innerHTML =
    left.map(renderItem).join("") +
    fabHtml +
    right.map(renderItem).join("");

  $$("#bottom-nav .bottom-nav__item").forEach((btn) => {
    const page = btn.dataset.page;
    const action = btn.dataset.action;
    btn.addEventListener("click", () => {
      if (action === "nova") return openNovaOcorrencia();
      if (page === "__menu") return openSidebar();
      state.view.page = page;
      renderApp();
    });
  });
}

function pendingForUser(u) {
  return state.ocorrencias.filter((o) => {
    if (!isPending(o)) return false;
    if (u.role === "lider") {
      const f = getFuncionario(o.funcionarioId);
      return f && f.turno === u.turno;
    }
    return true;
  });
}

function visibleOcorrencias() {
  const u = currentUser();
  return state.ocorrencias.filter((o) => {
    if (u.role === "lider") {
      const f = getFuncionario(o.funcionarioId);
      return f && f.turno === u.turno;
    }
    return true;
  });
}

function updateFab() {
  const u = currentUser();
  const fab = $("#fab");
  if (u.role === "rh" || u.role === "admin") {
    fab.classList.add("show");
    fab.onclick = () => openNovaOcorrencia();
  } else {
    fab.classList.remove("show");
  }
}

// ---------- Views ----------

function renderView() {
  const u = currentUser();
  const page = state.view.page;
  const view = $("#view");

  if (page === "dashboard") return renderDashboard();
  if (page === "funcionarios") return renderFuncionarios();
  if (page === "config") return renderConfig();
  // legacy: redirects pra config se alguém entrar via URL antigo
  if (page === "tipos" || page === "usuarios") {
    state.view.configTab = page;
    state.view.page = "config";
    return renderConfig();
  }
}

function renderDashboard() {
  const u = currentUser();
  $("#topbar-title").textContent = "Ocorrências";

  const visible = visibleOcorrencias();
  const pending = visible.filter(isPending);
  const done = visible.filter((o) => !isPending(o));

  const greeting = greetingText(u);
  const subtitle =
    u.role === "lider"
      ? `Você visualiza apenas ocorrências do ${u.turno}º turno.`
      : u.role === "rh"
      ? "Registre e acompanhe ocorrências de todos os turnos."
      : "Você tem acesso completo ao sistema.";

  $("#view").innerHTML = `
    <header class="page-header">
      <div>
        <h1>${greeting}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="row">
        ${
          u.role === "rh" || u.role === "admin"
            ? `<button class="btn btn--primary" id="btn-nova">${icon("plus")}<span>Nova ocorrência</span></button>`
            : ""
        }
      </div>
    </header>

    <div class="stats">
      <div class="stat stat--accent">
        <div class="stat__label">Pendentes</div>
        <div class="stat__value">${pending.length}</div>
        <div class="stat__hint">${u.role === "lider" ? "aguardando sua conferência" : "aguardando líder"}</div>
      </div>
      <div class="stat">
        <div class="stat__label">Conferidas</div>
        <div class="stat__value">${done.length}</div>
        <div class="stat__hint">no período visível</div>
      </div>
      <div class="stat">
        <div class="stat__label">Total mês</div>
        <div class="stat__value">${visible.length}</div>
        <div class="stat__hint">${currentMonthLabel()}</div>
      </div>
      <div class="stat">
        <div class="stat__label">Funcionários ativos</div>
        <div class="stat__value">${countActiveFuncs(u)}</div>
        <div class="stat__hint">${u.role === "lider" ? `turno ${u.turno}` : "todos os turnos"}</div>
      </div>
    </div>

    <div class="tabs" id="tabs">
      <button class="tab ${state.view.filterTab === "pendentes" ? "active" : ""}" data-tab="pendentes">
        Pendentes <span class="tab__count">${pending.length}</span>
      </button>
      <button class="tab ${state.view.filterTab === "conferidas" ? "active" : ""}" data-tab="conferidas">
        Conferidas <span class="tab__count">${done.length}</span>
      </button>
      <button class="tab ${state.view.filterTab === "todas" ? "active" : ""}" data-tab="todas">
        Todas <span class="tab__count">${visible.length}</span>
      </button>
    </div>

    <div class="toolbar">
      <div class="toolbar__search">
        ${icon("search")}
        <input type="text" id="search" placeholder="Buscar por funcionário ou tipo..." value="${state.view.search}" />
      </div>
      ${u.role !== "lider" ? `
        <select id="turno-filter">
          <option value="">Todos os turnos</option>
          <option value="1" ${state.view.filterTurno === "1" ? "selected" : ""}>1º Turno</option>
          <option value="2" ${state.view.filterTurno === "2" ? "selected" : ""}>2º Turno</option>
          <option value="3" ${state.view.filterTurno === "3" ? "selected" : ""}>3º Turno</option>
          <option value="geral" ${state.view.filterTurno === "geral" ? "selected" : ""}>Geral</option>
        </select>
      ` : ""}
    </div>

    <div id="occ-list"></div>
  `;

  // Wire up
  if ($("#btn-nova")) $("#btn-nova").addEventListener("click", openNovaOcorrencia);

  $$("#tabs .tab").forEach((t) => {
    t.addEventListener("click", () => {
      state.view.filterTab = t.dataset.tab;
      renderDashboard();
    });
  });

  $("#search").addEventListener("input", (e) => {
    state.view.search = e.target.value;
    renderOccList();
  });
  $("#search").addEventListener("focus", (e) => {
    const len = e.target.value.length;
    e.target.setSelectionRange(len, len);
  });

  if ($("#turno-filter")) {
    $("#turno-filter").addEventListener("change", (e) => {
      state.view.filterTurno = e.target.value || null;
      renderOccList();
    });
  }

  renderOccList();
}

function renderOccList() {
  const u = currentUser();
  const tab = state.view.filterTab;
  const search = state.view.search.toLowerCase();
  const turno = state.view.filterTurno;

  let list = visibleOcorrencias();

  if (tab === "pendentes") list = list.filter(isPending);
  else if (tab === "conferidas") list = list.filter((o) => !isPending(o));

  if (turno) {
    list = list.filter((o) => {
      const f = getFuncionario(o.funcionarioId);
      return f && String(f.turno) === turno;
    });
  }

  if (search) {
    list = list.filter((o) => {
      const f = getFuncionario(o.funcionarioId);
      const tipo = getTipo(o.tipo);
      return (f && f.nome.toLowerCase().includes(search)) ||
             (tipo && tipo.label.toLowerCase().includes(search));
    });
  }

  // Sort: pending first, newest first
  list.sort((a, b) => {
    const pa = isPending(a), pb = isPending(b);
    if (pa !== pb) return pa ? -1 : 1;
    return b.data.localeCompare(a.data);
  });

  const root = $("#occ-list");
  if (list.length === 0) {
    root.innerHTML = `
      <div class="empty">
        <div class="empty__icon">${icon("inbox")}</div>
        <h3>Nada por aqui</h3>
        <p>${tab === "pendentes" ? "Nenhuma ocorrência pendente neste filtro." : "Nenhum registro encontrado."}</p>
      </div>
    `;
    return;
  }

  root.innerHTML = `<div class="list">${list.map(renderOccCard).join("")}</div>`;
  $$("#occ-list .occ").forEach((el) => {
    el.addEventListener("click", () => openOcorrenciaDetail(el.dataset.id));
  });
}

function renderOccCard(o) {
  const f = getFuncionario(o.funcionarioId);
  const tipo = getTipo(o.tipo);
  const pending = isPending(o);

  return `
    <article class="occ" data-id="${o.id}">
      <div class="occ__date">
        <strong>${formatDay(o.data)}</strong>
        <span>${formatMonth(o.data)}</span>
      </div>
      <div class="occ__main">
        <div class="occ__name">${f ? f.nome : "—"}</div>
        <div class="occ__sub">
          <span class="badge badge--${tipo?.tone || "neutral"}">${tipo?.label || "—"}</span>
          <span class="dot"></span>
          <span>${f?.setor || "—"} · ${TURNOS[f?.turno]?.label || "—"}</span>
        </div>
      </div>
      <div class="occ__time">${o.horario || "—"}</div>
      <div>
        ${pending
          ? `<span class="badge badge--warning"><span class="dot"></span>Pendente</span>`
          : `<span class="badge badge--success"><span class="dot"></span>${getAcao(o.acao)?.label || "Conferida"}</span>`
        }
      </div>
      <svg class="icon occ__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </article>
  `;
}

// ---------- Nova Ocorrência ----------

function openNovaOcorrencia() {
  const u = currentUser();
  if (u.role === "lider") return;

  const today = todayIso();

  openModal(`
    <div class="modal__header">
      <div>
        <h2>Nova ocorrência</h2>
        <p>Preencha os dados que o RH conhece. O líder cuida da conferência depois.</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="nova-form">
      <div class="field-row">
        <div class="field">
          <label for="f-data">Data</label>
          <input type="date" id="f-data" required value="${today}" max="${today}" />
        </div>
        <div class="field">
          <label for="f-horario">Horário</label>
          <input type="time" id="f-horario" required />
        </div>
      </div>

      <div class="field">
        <label for="f-func">Funcionário</label>
        <select id="f-func" required>
          <option value="">Selecione...</option>
          ${state.funcionarios
            .filter((f) => f.ativo !== false)
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .map((f) => `
              <option value="${f.id}">${f.nome}${f.turno ? " — " + (TURNOS[f.turno]?.label || "?") : " — sem turno"}</option>
            `).join("")}
        </select>
        ${state.funcionarios.length === 0
          ? `<span class="field__error">${icon("alert")} Nenhum funcionário cadastrado. <a href="#" id="link-import" style="color:var(--plum);">Ir para Funcionários</a> e importar.</span>`
          : ""}
      </div>

      <div class="field">
        <label for="f-tipo">Tipo de ocorrência</label>
        <select id="f-tipo" required>
          <option value="">Selecione...</option>
          ${getAllTipos().map((t) => `<option value="${t.id}">${t.label}</option>`).join("")}
        </select>
      </div>

      <div class="field">
        <label for="f-obs">Observação <span class="muted text-xs">(opcional)</span></label>
        <textarea id="f-obs" placeholder="Contexto, justificativa, anexos referenciados..."></textarea>
        <span class="field__hint">O líder poderá adicionar mais informações na conferência.</span>
      </div>
    </form>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-save">${icon("check")}<span>Registrar</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#btn-save").addEventListener("click", saveNovaOcorrencia);
      const linkImport = $("#link-import");
      if (linkImport) {
        linkImport.addEventListener("click", (e) => {
          e.preventDefault();
          closeModal();
          state.view.page = "funcionarios";
          renderApp();
        });
      }
    },
  });
}

function saveNovaOcorrencia() {
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
  const novo = {
    id: "o" + Date.now(),
    data,
    funcionarioId,
    tipo,
    horario,
    acao: null,
    dataConferencia: null,
    observacao,
    historico: [{ por: u.id, em: new Date().toISOString(), acao: "Criou ocorrência" }],
    criadoPor: u.id,
    criadoEm: new Date().toISOString(),
  };

  state.ocorrencias.unshift(novo);
  store.save(state);
  closeModal();
  toast("Ocorrência registrada com sucesso!");
  renderApp();
}

// ---------- Detail / Conferência ----------

function openOcorrenciaDetail(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;

  const u = currentUser();
  const f = getFuncionario(o.funcionarioId);
  const tipo = getTipo(o.tipo);
  const pending = isPending(o);
  const canConfer = (u.role === "admin" || (u.role === "lider" && f && f.turno === u.turno));
  const canEdit = canConfer || u.role === "rh";

  openModal(`
    <div class="modal__header">
      <div>
        <h2>Ocorrência · ${formatDateFull(o.data)}</h2>
        <p>${pending ? "Aguardando conferência do líder" : "Conferida em " + formatDateFull(o.dataConferencia)}</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>

    <div class="modal__body">
      <div class="row" style="margin-bottom:16px; gap:12px;">
        <div class="avatar avatar--lg">${initials(f?.nome || "?")}</div>
        <div>
          <div style="font-weight:600; color:var(--plum); font-size:16px;">${f?.nome || "—"}</div>
          <div class="muted text-sm">${f?.setor || "—"} · ${TURNOS[f?.turno]?.label || "—"}</div>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-cell">
          <label>Tipo</label>
          <strong>${tipo?.label || "—"}</strong>
        </div>
        <div class="detail-cell">
          <label>Horário</label>
          <strong>${o.horario || "—"}</strong>
        </div>
      </div>

      ${pending && canConfer ? `
        <div class="field">
          <label for="conf-acao">Ação <span style="color:var(--danger)">*</span></label>
          <select id="conf-acao">
            <option value="">Escolha como tratar a ocorrência...</option>
            ${ACOES.map((a) => `<option value="${a.id}">${a.label}</option>`).join("")}
          </select>
          <span class="field__hint">A data da conferência será marcada automaticamente.</span>
        </div>
      ` : !pending ? `
        <div class="detail-grid">
          <div class="detail-cell">
            <label>Ação aplicada</label>
            <strong>${getAcao(o.acao)?.label || "—"}</strong>
          </div>
          <div class="detail-cell">
            <label>Data conferência</label>
            <strong>${formatDateFull(o.dataConferencia)}</strong>
          </div>
        </div>
      ` : ""}

      <div class="field">
        <label for="conf-obs">Observação</label>
        <textarea id="conf-obs" ${!canEdit ? "disabled" : ""} placeholder="Adicione contexto, justificativas ou notas...">${o.observacao || ""}</textarea>
      </div>

      <div style="margin-top:20px;">
        <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Histórico</div>
        <div class="timeline">
          ${o.historico.map((h, i, arr) => `
            <div class="timeline__item ${i < arr.length - 1 || !pending ? "done" : ""}">
              <div class="timeline__item-title">${h.acao}</div>
              <div class="timeline__item-meta">${getUser(h.por)?.nome || h.por} · ${formatDateTime(h.em)}</div>
            </div>
          `).join("")}
          ${pending ? `
            <div class="timeline__item">
              <div class="timeline__item-title muted">Aguardando conferência do líder</div>
              <div class="timeline__item-meta">próxima etapa</div>
            </div>
          ` : ""}
        </div>
      </div>
    </div>

    <div class="modal__footer">
      ${u.role === "admin" ? `<button class="btn btn--danger" id="btn-del-occ" style="margin-right:auto;">${icon("trash")}<span>Excluir</span></button>` : ""}
      <button class="btn btn--ghost" data-close>Fechar</button>
      ${canEdit && !pending ? `<button class="btn btn--soft" id="btn-update-obs">${icon("check")}<span>Salvar observação</span></button>` : ""}
      ${pending && canConfer ? `<button class="btn btn--primary" id="btn-confer">${icon("check")}<span>Confirmar conferência</span></button>` : ""}
      ${pending && u.role === "rh" ? `<button class="btn btn--soft" id="btn-update-obs">${icon("check")}<span>Salvar observação</span></button>` : ""}
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      if ($("#btn-confer")) $("#btn-confer").addEventListener("click", () => confirmConferencia(o.id));
      if ($("#btn-update-obs")) $("#btn-update-obs").addEventListener("click", () => updateObservacao(o.id));
      if ($("#btn-del-occ")) $("#btn-del-occ").addEventListener("click", () => deleteOcorrencia(o.id));
    },
  });
}

function deleteOcorrencia(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;
  const f = getFuncionario(o.funcionarioId);
  const tipo = getTipo(o.tipo);
  const label = `${f?.nome || "?"} · ${tipo?.label || "?"} · ${formatDate(o.data)}`;
  if (!confirm(`Excluir DEFINITIVAMENTE esta ocorrência?\n\n${label}\n\nIsso some do histórico, sem desfazer.`)) return;

  state.ocorrencias = state.ocorrencias.filter((x) => x.id !== id);
  store.save(state);
  closeModal();
  toast("Ocorrência excluída.");
  renderApp();
}

function confirmConferencia(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;
  const acao = $("#conf-acao").value;
  const obs = $("#conf-obs").value.trim();

  if (!acao) {
    toast("Selecione a ação antes de confirmar.", "danger");
    return;
  }

  const u = currentUser();
  o.acao = acao;
  o.dataConferencia = todayIso();
  o.observacao = obs;
  o.historico.push({
    por: u.id,
    em: new Date().toISOString(),
    acao: `Conferiu (${getAcao(acao).label})`,
  });

  store.save(state);
  closeModal();
  toast("Conferência confirmada!");
  renderApp();
}

function updateObservacao(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;
  const obs = $("#conf-obs").value.trim();
  if (obs === o.observacao) {
    closeModal();
    return;
  }

  const u = currentUser();
  o.observacao = obs;
  o.historico.push({
    por: u.id,
    em: new Date().toISOString(),
    acao: "Atualizou observação",
  });

  store.save(state);
  closeModal();
  toast("Observação atualizada.");
  renderApp();
}

// ---------- Funcionários (Admin/RH) ----------

function renderFuncionarios() {
  const u = currentUser();
  $("#topbar-title").textContent = "Funcionários";

  const semTurno = state.funcionarios.filter((f) => !f.turno).length;

  $("#view").innerHTML = `
    <header class="page-header">
      <div>
        <h1>Funcionários</h1>
        <p>Clique num funcionário pra definir turno e setor. RH/admin podem importar lote.</p>
      </div>
      <div class="row" style="gap:8px; flex-wrap:wrap;">
        <button class="btn btn--ghost" id="btn-import-func">${icon("download")}<span>Importar lote</span></button>
        <button class="btn btn--primary" id="btn-novo-func">${icon("plus")}<span>Novo funcionário</span></button>
      </div>
    </header>

    <div class="stats">
      <div class="stat ${semTurno > 0 ? "stat--accent" : ""}">
        <div class="stat__label">Sem turno definido</div>
        <div class="stat__value">${semTurno}</div>
        <div class="stat__hint">${semTurno > 0 ? "ajustar antes de líderes verem" : "tudo certo"}</div>
      </div>
      ${[1, 2, 3, "geral"].map((t) => `
        <div class="stat">
          <div class="stat__label">${TURNOS[t].label}</div>
          <div class="stat__value">${state.funcionarios.filter((f) => f.turno === t).length}</div>
          <div class="stat__hint">${TURNOS[t].horario}</div>
        </div>
      `).join("")}
    </div>

    <div class="toolbar">
      <div class="toolbar__search">
        ${icon("search")}
        <input type="text" id="func-search" placeholder="Buscar por nome ou código..." />
      </div>
      <select id="func-turno-filter">
        <option value="">Todos</option>
        <option value="sem">Sem turno</option>
        <option value="1">1º Turno</option>
        <option value="2">2º Turno</option>
        <option value="3">3º Turno</option>
        <option value="geral">Geral</option>
      </select>
    </div>

    <div id="func-list"></div>
  `;

  $("#btn-import-func").addEventListener("click", openImportFuncModal);
  $("#btn-novo-func").addEventListener("click", () => openFuncionarioModal(null));
  $("#func-search").addEventListener("input", renderFuncList);
  $("#func-turno-filter").addEventListener("change", renderFuncList);
  renderFuncList();
}

function renderFuncList() {
  const search = ($("#func-search")?.value || "").toLowerCase();
  const filter = $("#func-turno-filter")?.value || "";

  let list = [...state.funcionarios];
  if (search) {
    list = list.filter((f) =>
      f.nome.toLowerCase().includes(search) ||
      (f.codigo || "").toLowerCase().includes(search)
    );
  }
  if (filter === "sem") list = list.filter((f) => !f.turno);
  else if (filter) list = list.filter((f) => String(f.turno) === filter);

  list.sort((a, b) => {
    if (!a.turno && b.turno) return -1;
    if (a.turno && !b.turno) return 1;
    return a.nome.localeCompare(b.nome);
  });

  const root = $("#func-list");
  if (list.length === 0) {
    const semFiltro = !search && !filter;
    root.innerHTML = `
      <div class="empty">
        <div class="empty__icon">${icon("users")}</div>
        <h3>${semFiltro ? "Sem funcionários cadastrados ainda" : "Nenhum resultado"}</h3>
        <p>${semFiltro
          ? "Importe a lista completa de uma vez, ou crie um a um."
          : "Tente ajustar a busca ou o filtro de turno."}</p>
        ${semFiltro ? `
          <div class="row" style="gap:8px; justify-content:center; margin-top:8px;">
            <button class="btn btn--primary" id="btn-empty-novo">${icon("plus")}<span>Novo funcionário</span></button>
            <button class="btn btn--ghost" id="btn-empty-import">${icon("download")}<span>Importar lote</span></button>
          </div>` : ""}
      </div>`;
    const bn = $("#btn-empty-novo"); if (bn) bn.addEventListener("click", () => openFuncionarioModal(null));
    const bi = $("#btn-empty-import"); if (bi) bi.addEventListener("click", openImportFuncModal);
    return;
  }

  root.innerHTML = `<div class="list">${list.map((f) => `
    <article class="occ" style="grid-template-columns: 44px 1fr auto auto auto;" data-func="${f.id}">
      <div class="avatar">${initials(f.nome)}</div>
      <div class="occ__main">
        <div class="occ__name">${f.nome}</div>
        <div class="occ__sub">${f.codigo ? "cód: " + f.codigo + " · " : ""}${f.setor || "sem setor"}</div>
      </div>
      ${f.turno
        ? `<span class="badge badge--neutral">${TURNOS[f.turno].label}</span>`
        : `<span class="badge badge--warning"><span class="dot"></span>Sem turno</span>`}
      <span class="badge badge--${f.ativo === false ? "neutral" : "success"}">${f.ativo === false ? "Inativo" : "Ativo"}</span>
      <svg class="icon occ__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </article>`).join("")}</div>`;

  $$("#func-list .occ").forEach((el) => {
    el.addEventListener("click", () => openFuncionarioModal(el.dataset.func));
  });
}

const SETORES = ["Produção", "Qualidade", "Logística", "Manutenção", "Administrativo", "Comercial", "RH"];

function openFuncionarioModal(id) {
  const f = id ? state.funcionarios.find((x) => x.id === id) : null;
  const isNew = !f;

  openModal(`
    <div class="modal__header">
      <div>
        <h2>${isNew ? "Novo funcionário" : "Editar funcionário"}</h2>
        <p>${isNew ? "Será incluído no cadastro." : f.nome}</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="func-form" onsubmit="return false">
      <div class="field">
        <label for="func-nome">Nome completo <span style="color:var(--danger)">*</span></label>
        <input type="text" id="func-nome" required value="${f?.nome || ""}" />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="func-codigo">Código/Matrícula</label>
          <input type="text" id="func-codigo" value="${f?.codigo || ""}" placeholder="ex: 1234" />
        </div>
        <div class="field">
          <label for="func-turno">Turno</label>
          <select id="func-turno">
            <option value="">— Sem turno —</option>
            ${[1, 2, 3, "geral"].map((t) => `<option value="${t}" ${f?.turno === t ? "selected" : ""}>${TURNOS[t].label} (${TURNOS[t].horario})</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="field">
        <label for="func-setor">Setor</label>
        <select id="func-setor">
          <option value="">— Não definido —</option>
          ${SETORES.map((s) => `<option value="${s}" ${f?.setor === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label class="row" style="gap:8px; cursor:pointer;">
          <input type="checkbox" id="func-ativo" ${f?.ativo !== false ? "checked" : ""} />
          <span>Funcionário ativo</span>
        </label>
        <span class="field__hint">Inativos não aparecem no formulário de nova ocorrência.</span>
      </div>
    </form>
    <div class="modal__footer">
      ${!isNew ? `<button class="btn btn--danger" id="btn-del-func">${icon("trash")}<span>Excluir</span></button>` : ""}
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-save-func">${icon("check")}<span>${isNew ? "Criar" : "Salvar"}</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#btn-save-func").addEventListener("click", () => saveFuncionario(id));
      if (!isNew) $("#btn-del-func").addEventListener("click", () => deleteFuncionario(id));
    },
  });
}

function saveFuncionario(id) {
  const nome = $("#func-nome").value.trim();
  if (!nome || nome.length < 3) return toast("Nome muito curto.", "danger");

  const turnoStr = $("#func-turno").value;
  const dados = {
    nome,
    codigo: $("#func-codigo").value.trim() || null,
    turno: parseTurno(turnoStr),
    setor: $("#func-setor").value || null,
    ativo: $("#func-ativo").checked,
  };

  if (id) {
    const f = state.funcionarios.find((x) => x.id === id);
    Object.assign(f, dados);
  } else {
    const novoId = "f" + Date.now();
    state.funcionarios.push({ id: novoId, ...dados });
  }
  store.save(state);
  closeModal();
  toast(id ? "Funcionário atualizado." : "Funcionário criado.");
  renderApp();
}

function deleteFuncionario(id) {
  const f = state.funcionarios.find((x) => x.id === id);
  if (!f) return;
  const usado = state.ocorrencias.some((o) => o.funcionarioId === id);
  if (usado) {
    return toast("Este funcionário tem ocorrências. Marque como inativo no lugar.", "danger");
  }
  if (!confirm(`Excluir "${f.nome}" do cadastro?`)) return;
  state.funcionarios = state.funcionarios.filter((x) => x.id !== id);
  store.save(state);
  closeModal();
  toast("Funcionário excluído.");
  renderApp();
}

function openImportFuncModal() {
  openModal(`
    <div class="modal__header">
      <div>
        <h2>Importar funcionários</h2>
        <p>Selecione um arquivo <code>.json</code> com a lista. Estrutura esperada: <code>[{ codigo, nome, turno, liderNome, setor, ativo }, ...]</code></p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <div class="modal__body">
      <div class="field">
        <label for="import-file">Arquivo JSON <span style="color:var(--danger)">*</span></label>
        <input type="file" id="import-file" accept=".json,application/json" />
        <span class="field__hint">Em desenvolvimento local, se houver <code>mockup/funcionarios.json</code>, ele é carregado automaticamente.</span>
      </div>

      <div id="import-preview" style="margin-top:8px;"></div>

      <div class="field" style="margin-top:16px;">
        <label class="row" style="gap:8px; cursor:pointer;">
          <input type="checkbox" id="import-replace" />
          <span>Substituir cadastro inteiro</span>
        </label>
        <span class="field__hint">Desmarcado: adiciona novos e atualiza existentes (por código). Marcado: apaga tudo e refaz.</span>
      </div>
    </div>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-do-import" disabled>${icon("download")}<span>Importar</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#btn-do-import").addEventListener("click", doImportFuncionarios);

      $("#import-file").addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => parseAndPreview(ev.target.result, file.name);
        reader.onerror = () => {
          $("#import-preview").innerHTML = `
            <div class="field__error">
              ${icon("alert")} Erro ao ler o arquivo: ${reader.error?.message || "desconhecido"}
            </div>`;
        };
        reader.readAsText(file);
      });

      // Auto-fetch quando rodando local (file existe no servidor estático)
      fetch("funcionarios.json")
        .then((r) => r.ok ? r.text() : Promise.reject(new Error("404")))
        .then((text) => parseAndPreview(text, "funcionarios.json (carregado do servidor local)"))
        .catch(() => {
          if (!window._importData) {
            $("#import-preview").innerHTML = `
              <div class="text-sm muted" style="padding: 12px; background: var(--surface-warm); border-radius: var(--radius);">
                ${icon("alert")} Sem arquivo selecionado. Escolha o <code>funcionarios.json</code> do seu computador acima.
              </div>`;
          }
        });
    },
  });
}

function parseAndPreview(text, label) {
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("Esperado array JSON");
    window._importData = data;

    const turnos = { 1: 0, 2: 0, 3: 0, null: 0 };
    data.forEach((f) => {
      const t = f.turno ?? "null";
      turnos[t] = (turnos[t] || 0) + 1;
    });

    $("#import-preview").innerHTML = `
      <div class="detail-grid" style="margin-top:8px;">
        <div class="detail-cell">
          <label>Encontrados</label>
          <strong>${data.length} funcionários</strong>
        </div>
        <div class="detail-cell">
          <label>Origem</label>
          <strong style="font-size:12px;">${label}</strong>
        </div>
      </div>
      <div class="text-sm muted" style="margin-top:8px; line-height: 1.6;">
        Por turno: 1º (${turnos[1] || 0}) · 2º (${turnos[2] || 0}) · 3º (${turnos[3] || 0}) · Sem turno (${turnos["null"] || 0})<br/>
        Primeiros nomes: ${data.slice(0, 5).map((f) => f.nome).join(", ")}${data.length > 5 ? "..." : ""}
      </div>`;
    $("#btn-do-import").disabled = false;
  } catch (e) {
    $("#import-preview").innerHTML = `
      <div class="field__error">
        ${icon("alert")} JSON inválido: ${e.message}
      </div>`;
    $("#btn-do-import").disabled = true;
  }
}

function doImportFuncionarios() {
  const data = window._importData;
  if (!Array.isArray(data) || data.length === 0) return;

  const replace = $("#import-replace").checked;
  if (replace) {
    if (!confirm(`Substituir TODO o cadastro atual (${state.funcionarios.length} funcionários) pelos ${data.length} do JSON? Ocorrências antigas mantêm o nome denormalizado.`)) return;
    state.funcionarios = [];
  }

  let novos = 0, atualizados = 0;
  for (const item of data) {
    const id = "f-" + (item.codigo || slugify(item.nome));
    const existing = state.funcionarios.find((x) => x.id === id || x.codigo === item.codigo);
    const dados = {
      nome: item.nome,
      codigo: item.codigo || null,
      turno: item.turno || null,
      setor: item.setor || null,
      ativo: item.ativo !== false,
    };
    if (existing) {
      Object.assign(existing, dados);
      atualizados++;
    } else {
      state.funcionarios.push({ id, ...dados });
      novos++;
    }
  }

  store.save(state);
  closeModal();
  toast(`Import concluído: ${novos} novos, ${atualizados} atualizados.`);
  renderApp();
}

// ---------- Configurações (Admin/RH) ----------

function renderConfig() {
  const u = currentUser();
  if (u.role !== "admin" && u.role !== "rh") {
    state.view.page = "dashboard";
    return renderApp();
  }
  $("#topbar-title").textContent = "Configurações";

  // Default tab = "tipos" pra RH, ou se não tem permissão pra users
  if (!state.view.configTab) state.view.configTab = "tipos";

  const tabs = [{ id: "tipos", label: "Tipos de Ocorrência", icon: "tag" }];
  if (u.role === "admin") tabs.push({ id: "usuarios", label: "Usuários", icon: "users" });

  $("#view").innerHTML = `
    <header class="page-header">
      <div>
        <h1>Configurações</h1>
        <p>Ajustes do sistema. Apenas administradores e RH.</p>
      </div>
    </header>

    <div class="tabs" id="config-tabs">
      ${tabs.map((t) => `
        <button class="tab ${state.view.configTab === t.id ? "active" : ""}" data-tab="${t.id}">
          ${t.label}
        </button>
      `).join("")}
    </div>

    <div id="config-content"></div>
  `;

  $$("#config-tabs .tab").forEach((b) => {
    b.addEventListener("click", () => {
      state.view.configTab = b.dataset.tab;
      renderConfig();
    });
  });

  // Render do conteúdo da tab
  if (state.view.configTab === "usuarios" && u.role === "admin") {
    renderUsuariosInto("#config-content");
  } else {
    renderTiposInto("#config-content");
  }
}

// ---------- Tipos de Ocorrência (Admin/RH) ----------

const TONES = [
  { id: "neutral", label: "Neutro" },
  { id: "info", label: "Informativo" },
  { id: "warning", label: "Atenção" },
  { id: "danger", label: "Crítico" },
  { id: "success", label: "Positivo" },
];

function renderTipos() { renderTiposInto("#view"); }
function renderTiposInto(selector) {
  const u = currentUser();
  if (u.role !== "admin" && u.role !== "rh") return;

  const padrao = TIPOS_OCORRENCIA;
  const custom = state.tiposCustom || [];

  $(selector).innerHTML = `
    <div class="row row--between" style="margin: 16px 0 12px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="font-family: var(--font-display); font-size: 20px; margin: 0; color: var(--plum); font-weight: 700;">Tipos de Ocorrência</h2>
        <p style="margin: 4px 0 0; color: var(--text-muted); font-size: 13px;">Motivos disponíveis no formulário de nova ocorrência.</p>
      </div>
      <button class="btn btn--primary" id="btn-novo-tipo">${icon("plus")}<span>Novo tipo</span></button>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat__label">Tipos padrão</div>
        <div class="stat__value">${padrao.length}</div>
        <div class="stat__hint">imutáveis no sistema</div>
      </div>
      <div class="stat">
        <div class="stat__label">Personalizados</div>
        <div class="stat__value">${custom.length}</div>
        <div class="stat__hint">criados pela equipe</div>
      </div>
      <div class="stat">
        <div class="stat__label">Total disponível</div>
        <div class="stat__value">${padrao.length + custom.length}</div>
        <div class="stat__hint">no formulário de nova ocorrência</div>
      </div>
    </div>

    <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Padrão do sistema</div>
    <div class="list" style="margin-bottom:24px;">
      ${padrao.map((t) => `
        <article class="occ" style="grid-template-columns: 1fr auto auto; cursor:default;">
          <div class="occ__main">
            <div class="occ__name">${t.label}</div>
            <div class="occ__sub">id: ${t.id}</div>
          </div>
          <span class="badge badge--${t.tone}">${TONES.find((to) => to.id === t.tone)?.label || t.tone}</span>
          <span class="badge badge--neutral">PADRÃO</span>
        </article>
      `).join("")}
    </div>

    <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Personalizados</div>
    ${custom.length === 0 ? `
      <div class="empty">
        <div class="empty__icon">${icon("tag")}</div>
        <h3>Sem tipos personalizados</h3>
        <p>Crie tipos extras se os padrão não cobrirem alguma situação específica do seu time.</p>
        <button class="btn btn--soft" id="btn-novo-tipo-2">${icon("plus")}<span>Criar primeiro tipo</span></button>
      </div>
    ` : `
      <div class="list">
        ${custom.map((t) => `
          <article class="occ" style="grid-template-columns: 1fr auto auto; cursor:default;" data-tipo="${t.id}">
            <div class="occ__main">
              <div class="occ__name">${t.label}</div>
              <div class="occ__sub">id: ${t.id} · criado por ${getUser(t.criadoPor)?.nome || t.criadoPor || "—"}</div>
            </div>
            <span class="badge badge--${t.tone}">${TONES.find((to) => to.id === t.tone)?.label || t.tone}</span>
            <button class="btn btn--ghost btn--sm" data-delete="${t.id}" title="Excluir">${icon("trash")}</button>
          </article>
        `).join("")}
      </div>
    `}
  `;

  $("#btn-novo-tipo").addEventListener("click", openNovoTipoModal);
  const btn2 = $("#btn-novo-tipo-2");
  if (btn2) btn2.addEventListener("click", openNovoTipoModal);

  $$("[data-delete]").forEach((b) => {
    b.addEventListener("click", () => deleteTipo(b.dataset.delete));
  });
}

function openNovoTipoModal() {
  openModal(`
    <div class="modal__header">
      <div>
        <h2>Novo tipo de ocorrência</h2>
        <p>Será adicionado ao formulário e a quem registrar daqui pra frente.</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="form-tipo" onsubmit="return false">
      <div class="field">
        <label for="tipo-label">Nome do tipo <span style="color:var(--danger)">*</span></label>
        <input type="text" id="tipo-label" required maxlength="60" placeholder="Ex: Saída para Treinamento" />
        <span class="field__hint">Aparece no dropdown de "Tipo de ocorrência" no momento de registrar.</span>
      </div>
      <div class="field">
        <label for="tipo-tone">Cor/severidade</label>
        <select id="tipo-tone">
          ${TONES.map((t) => `<option value="${t.id}" ${t.id === "neutral" ? "selected" : ""}>${t.label}</option>`).join("")}
        </select>
        <span class="field__hint">Define o tom do badge na listagem (não muda o fluxo).</span>
      </div>
    </form>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-save-tipo">${icon("check")}<span>Criar tipo</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#btn-save-tipo").addEventListener("click", saveTipo);
      setTimeout(() => $("#tipo-label").focus(), 100);
    },
  });
}

function slugify(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function saveTipo() {
  const label = $("#tipo-label").value.trim();
  const tone = $("#tipo-tone").value;
  if (!label) return toast("Informe o nome do tipo.", "danger");

  const id = "custom-" + slugify(label);
  if (getTipo(id)) return toast("Já existe um tipo com nome parecido.", "danger");
  if (label.length < 3) return toast("Nome muito curto.", "danger");

  const u = currentUser();
  const novo = {
    id,
    label,
    tone,
    padrao: false,
    criadoPor: u.id,
    criadoEm: new Date().toISOString(),
  };

  if (!state.tiposCustom) state.tiposCustom = [];
  state.tiposCustom.push(novo);
  store.save(state);
  closeModal();
  toast("Tipo criado!");
  renderApp();
}

function deleteTipo(id) {
  const t = (state.tiposCustom || []).find((x) => x.id === id);
  if (!t) return;
  const usado = state.ocorrencias.some((o) => o.tipo === id);
  if (usado) {
    if (!confirm(`"${t.label}" está em uso por ocorrências antigas. Excluir manterá os registros mas o tipo some do formulário. Continuar?`)) return;
  } else {
    if (!confirm(`Excluir o tipo "${t.label}"?`)) return;
  }
  state.tiposCustom = state.tiposCustom.filter((x) => x.id !== id);
  store.save(state);
  toast("Tipo excluído.");
  renderApp();
}

// ---------- Usuários (Admin) ----------

function renderUsuarios() { renderUsuariosInto("#view"); }
function renderUsuariosInto(selector) {
  $(selector).innerHTML = `
    <div class="row row--between" style="margin: 16px 0 12px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="font-family: var(--font-display); font-size: 20px; margin: 0; color: var(--plum); font-weight: 700;">Usuários do sistema</h2>
        <p style="margin: 4px 0 0; color: var(--text-muted); font-size: 13px;">Quem acessa, com qual papel e qual turno.</p>
      </div>
      <button class="btn btn--soft" disabled title="Cadastro via Firebase Console por enquanto">${icon("plus")}<span>Novo usuário</span></button>
    </div>

    <div class="list">
      ${state.users.map((u) => `
        <article class="occ" style="grid-template-columns: 44px 1fr auto;">
          <div class="avatar">${initials(u.nome || u.email || "?")}</div>
          <div class="occ__main">
            <div class="occ__name">${u.nome || "(sem nome)"}</div>
            <div class="occ__sub">${u.email || "@" + u.id}</div>
          </div>
          <span class="badge badge--${u.role === "admin" ? "danger" : u.role === "rh" ? "info" : "neutral"}">${roleLabel(u)}</span>
        </article>
      `).join("")}
    </div>

    <div style="margin-top:24px;">
      <button class="btn btn--ghost" id="reset-btn">${icon("alert")}<span>Resetar dados locais</span></button>
      <span class="text-xs muted" style="display:block; margin-top:6px;">Útil apenas em modo demo. No Firebase, dados ficam no Firestore.</span>
    </div>
  `;

  $("#reset-btn").addEventListener("click", () => {
    if (confirm("Apagar todos os registros locais e voltar ao seed inicial?")) {
      const fresh = store.reset();
      Object.assign(state, fresh);
      state.view = { page: "dashboard", filterTab: "pendentes", filterTurno: null, search: "" };
      toast("Dados resetados.");
      renderApp();
    }
  });
}

// ---------- Helpers de copy ----------

function greetingText(u) {
  const h = new Date().getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const primeiro = u.nome.split(" ")[0];
  return `${saudacao}, ${primeiro}`;
}

function currentMonthLabel() {
  const d = new Date();
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function countActiveFuncs(u) {
  if (u.role === "lider") return state.funcionarios.filter((f) => f.turno === u.turno).length;
  return state.funcionarios.length;
}

// ---------- Sidebar mobile ----------

function openSidebar() {
  $("#sidebar").classList.add("open");
  $("#sidebar-backdrop").classList.add("show");
}
function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#sidebar-backdrop").classList.remove("show");
}

// ---------- Boot ----------

document.addEventListener("DOMContentLoaded", () => {
  renderLoginQuick();

  // Auto-restore session if user was logged in
  if (state.currentUserId && getUser(state.currentUserId)) {
    $("#login").classList.add("hidden");
    $("#app").classList.remove("hidden");
    state.view = { page: "dashboard", filterTab: "pendentes", filterTurno: null, search: "" };
    renderApp();
  }

  // Login form
  $("#login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const user = $("#login-user").value.trim().toLowerCase();
    const pass = $("#login-pass").value;
    login(user, pass);
  });

  // Logout
  $("#logout-btn").addEventListener("click", logout);

  // Reset de senha (só ativo em modo Firebase via window.firebaseResetSenha)
  const forgot = $("#btn-forgot");
  if (forgot) {
    forgot.addEventListener("click", () => {
      if (typeof window.firebaseResetSenha === "function") {
        window.firebaseResetSenha();
      } else {
        toast("Recuperação de senha só funciona em modo Firebase.", "danger");
      }
    });
  }

  // Sidebar
  $("#menu-btn").addEventListener("click", openSidebar);
  $("#sidebar-backdrop").addEventListener("click", closeSidebar);

  // ESC closes modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
});

// PWA: register service worker if available (silent fail in file://)
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
