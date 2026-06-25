// ============================================================
// utils.js — helpers PUROS do FioPulse (Fase 1 do refactor do app.js).
// Só entrada → saída: sem `state`, sem Firestore, sem render.
// Carregado ANTES dos demais scripts (escopo global compartilhado,
// sem build step) — tudo aqui é visível pra app.js/firebase.js.
// Regra: nenhuma regra de negócio entra neste arquivo.
// ============================================================

// ---------- DOM ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Debounce: usado nos search inputs pra não re-renderizar a lista
// inteira (130+ funcionários) a cada keystroke.
const debounce = (fn, ms = 150) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), ms);
  };
};

// ---------- Log ----------
// Logger gateado: console.log que carrega PII (emails, nomes, CNPJs)
// deve usar debug() em vez de console.log direto. Só imprime em localhost
// ou se window.DEBUG = true for setado manualmente (DevTools).
const _ehDev = (() => {
  try {
    return location.hostname === "localhost" ||
           location.hostname === "127.0.0.1" ||
           location.hostname.endsWith(".local");
  } catch { return false; }
})();
const debug = (...args) => {
  if (_ehDev || window.DEBUG === true) console.log(...args);
};

// ---------- Segurança / validação ----------
// Escapa HTML pra evitar XSS quando interpolando dados de usuário em
// innerHTML. Aplicar em: nomes, observações, CNPJs, razão social,
// emails, descrições e qualquer texto vindo de input/Firestore.
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Valida que uma URL é https:// — usar antes de salvar contratoUrl pra
// rejeitar javascript: / data: que viraria XSS via href.
const ehUrlSegura = (url) => {
  if (!url || !url.trim()) return true; // vazio é OK (campo opcional)
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch { return false; }
};

// Valida CNPJ via dígitos verificadores. Aceita string com ou sem máscara.
// Retorna true se válido OU se vazio (campo opcional). False se inválido.
const ehCPFValido = (raw) => {
  const cpf = String(raw).replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(cpf[i], 10) * (10 - i);
  let d1 = (s * 10) % 11; if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9], 10)) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(cpf[i], 10) * (11 - i);
  let d2 = (s * 10) % 11; if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10], 10);
};

// Aceita CNPJ (14) OU CPF (11) — prestador PJ ou PF/MEI. Vazio = OK (opcional).
const ehCNPJValido = (raw) => {
  if (!raw || !String(raw).trim()) return true; // vazio = OK (opcional)
  const cnpj = String(raw).replace(/\D/g, "");
  if (cnpj.length === 11) return ehCPFValido(cnpj); // CPF de prestador PF/MEI
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false; // 00000000000000, etc

  // Calcula dígitos verificadores
  const calc = (size) => {
    const pesos = size === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < size; i++) soma += parseInt(cnpj[i], 10) * pesos[i];
    const mod = soma % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  return parseInt(cnpj[12], 10) === calc(12)
      && parseInt(cnpj[13], 10) === calc(13);
};

// ---------- Datas / formatação ----------
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

// Helpers pros campos do pipeline RH (funcionários enriquecidos).
// Firestore Timestamp tem .toDate(); ISO string já é string; null → null.
// Use em: f.nascimento, f.admissao, f.demissao (vêm como Timestamp do Firestore).
function tsToDateStr(ts) {
  if (!ts) return null;
  let d = null;
  if (typeof ts === "string") d = new Date(ts);
  else if (ts.toDate) d = ts.toDate();
  else if (ts.seconds) d = new Date(ts.seconds * 1000);
  else if (ts instanceof Date) d = ts;
  if (!d || isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// Formata tempo de casa em "X anos e Y meses" a partir do número de dias.
// Pipeline já calcula diasNaEmpresa; aqui só formata pro humano.
function tempoDeCasa(dias) {
  if (!dias || dias < 1) return "—";
  const anos = Math.floor(dias / 365);
  const meses = Math.floor((dias % 365) / 30);
  if (anos === 0 && meses === 0) return `${dias} ${dias === 1 ? "dia" : "dias"}`;
  if (anos === 0) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  if (meses === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
  return `${anos} ${anos === 1 ? "ano" : "anos"} e ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

// Recebe lista de timestamps (Firestore Timestamp, ISO string, Date, ou ms)
// Retorna { value, hint } pro card de "Última atualização".
// value = tempo relativo ("há 5m", "há 2h", "agora")
// hint  = data + hora detalhada ("14/05 às 15:30")
function formatUltimaAtualizacao(dates) {
  const ms = (dates || [])
    .filter(Boolean)
    .map((d) => {
      if (typeof d === "number") return d;
      if (typeof d === "string") return new Date(d).getTime();
      if (d?.toMillis) return d.toMillis();
      if (d?.seconds) return d.seconds * 1000;
      return new Date(d).getTime();
    })
    .filter((n) => !Number.isNaN(n) && n > 0);

  if (ms.length === 0) {
    return { value: "—", hint: "aguardando 1ª sincronização" };
  }

  const max = Math.max(...ms);
  const agora = Date.now();
  const diffMin = Math.floor((agora - max) / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  let value;
  if (diffMin < 1) value = "agora";
  else if (diffMin < 60) value = `há ${diffMin}m`;
  else if (diffH < 24) value = `há ${diffH}h`;
  else if (diffD < 7) value = `há ${diffD}d`;
  else value = new Date(max).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  const dt = new Date(max);
  const hint = dt.toLocaleString("pt-BR", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
  return { value, hint };
}

const formatDay = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return String(d.getDate()).padStart(2, "0");
};
const formatMonth = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};

const todayIso = () => new Date().toISOString().slice(0, 10);

// Saldo do banco de horas: minutos (com sinal) → "+12h30" / "-4h05" / "0h00".
function formatSaldoHoras(minutos) {
  if (minutos == null) return "—";
  const sinal = minutos < 0 ? "-" : (minutos > 0 ? "+" : "");
  const abs = Math.abs(minutos);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sinal}${h}h${m.toString().padStart(2, "0")}`;
}

function formatMoeda(valor) {
  if (valor == null) return "—";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Hora curta (HH:MM) a partir de ISO. "" se inválido (msg otimista sem ts).
function formatHoraCurta(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Dia local (YYYY-MM-DD no fuso do usuário) — en-CA produz esse formato.
// O chat usa isto pra separar/rotular dias SEM o erro de fuso do toISOString
// (UTC): em BRT, msg entre 21h–00h cairia no dia UTC seguinte e mostrava
// "ontem"/data errada nas últimas ~3h. Aqui a comparação é sempre local.
const diaLocalISO = (d) => {
  const dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-CA");
};

// Valida foto base64 (data:image...) antes de injetar em background-image:url().
// Bloqueia CSS-injection/XSS por foto adulterada vinda do Firestore. "" se inválida.
const fotoSegura = (foto) => (typeof foto === "string"
  && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(foto)) ? foto : "";

// Hora curta se for hoje; "ontem"; senão data curta. Usado na lista de conversas.
function formatHoraOuDia(iso) {
  if (!iso) return "";
  const diaMsg = diaLocalISO(iso);
  const hoje = diaLocalISO(new Date());
  const ontem = diaLocalISO(new Date(Date.now() - 86400000));
  if (diaMsg === hoje) return formatHoraCurta(iso);
  if (diaMsg === ontem) return "ontem";
  return formatDate(diaMsg);
}

// Rótulo do separador de dia dentro da thread do chat. Recebe um dia LOCAL
// (diaLocalISO) e compara com hoje/ontem locais.
function labelDiaChat(dia) {
  const hoje = diaLocalISO(new Date());
  const ontem = diaLocalISO(new Date(Date.now() - 86400000));
  if (dia === hoje) return "Hoje";
  if (dia === ontem) return "Ontem";
  return formatDate(dia);
}

// ---------- Texto ----------
const initials = (nome) => {
  const parts = nome.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
};

function slugify(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------- Ícones ----------
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
    message: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    briefcase: '<rect x="2.5" y="7" width="19" height="13.5" rx="2.2"/><path d="M8 7V5.2A2.2 2.2 0 0 1 10.2 3h3.6A2.2 2.2 0 0 1 16 5.2V7"/><path d="M2.5 12.5h19"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2.2"/><path d="M9 4V3.2A1.2 1.2 0 0 1 10.2 2h3.6A1.2 1.2 0 0 1 15 3.2V4"/><path d="M9 10h6M9 14h6M9 18h4"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    undo: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
    megafone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 9a3.5 3.5 0 0 1 0 6"/><path d="M19 6.5a7 7 0 0 1 0 11"/>',
    pin: '<path d="M9 4h6l-1 6 3.5 2.5V15H6.5v-2.5L10 10z"/><line x1="12" y1="15" x2="12" y2="21"/>',
    eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${icons[name] || ""}</svg>`;
};
