/* ============================================================
   ProjectFlow AI — núcleo
   Estado global, persistência local, permissões, mutações
   centralizadas (auditoria + eventos + webhooks + notificações),
   roteador e primitivas de UI. Sem dependências externas.
   ============================================================ */
(function () {
  "use strict";

  var PF = window.PF = {};
  var LS_KEY = "projectflow.db.v1";

  /* ---------- persistência ---------- */
  PF.load = function () {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var db = JSON.parse(raw);
        if (db && db.meta && db.meta.seedVersion === PFSeed.VERSION) { PF.db = db; return; }
      }
    } catch (e) { /* storage indisponível ou corrompido: cai para o seed */ }
    PF.db = PFSeed.build();
    PF.save();
  };
  var saveT = null;
  PF.save = function () {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      try { localStorage.setItem(LS_KEY, JSON.stringify(PF.db)); } catch (e) { /* quota/privado */ }
    }, 120);
  };
  PF.resetDemo = function () {
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
    PF.db = PFSeed.build();
    PF.save();
    PF.toast("Dados de demonstração restaurados", "Todo o estado voltou ao cenário inicial.", "ok");
    PF.refresh();
  };

  /* ---------- helpers ---------- */
  PF.uid = function (p) { return (p || "id") + Math.random().toString(36).slice(2, 9); };
  PF.esc = function (s) { return String(s == null ? "" : s); }; // texto sempre via textContent
  PF.byId = function (coll, id) { return PF.db[coll].find(function (x) { return x.id === id; }) || null; };
  PF.user = function (id) { return PF.byId("users", id); };
  PF.me = function () { return PF.user(PF.db.settings.currentUserId); };
  PF.project = function (id) { return PF.byId("projects", id); };
  PF.team = function (id) { return PF.byId("teams", id); };
  PF.task = function (id) { return PF.byId("tasks", id); };

  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  PF.fmtDate = function (iso) {
    if (!iso) return "—";
    var d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
    return d.getDate() + " " + MESES[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : "");
  };
  PF.fmtDateTime = function (iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return PF.fmtDate(iso) + ", " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  };
  PF.rel = function (iso) {
    var ms = Date.now() - new Date(iso).getTime();
    var m = Math.round(ms / 60000);
    if (m < 1) return "agora";
    if (m < 60) return "há " + m + " min";
    var h = Math.round(m / 60);
    if (h < 24) return "há " + h + " h";
    var d = Math.round(h / 24);
    if (d < 30) return "há " + d + " d";
    return PF.fmtDate(iso);
  };
  PF.daysLeft = function (dateOnly) {
    if (!dateOnly) return null;
    return Math.ceil((new Date(dateOnly + "T23:59:59") - Date.now()) / 86400000);
  };
  PF.isOverdue = function (t) {
    return t.dueDate && t.status !== "done" && PF.daysLeft(t.dueDate) < 0;
  };

  /* ---------- construtor de DOM (conteúdo de usuário sempre como texto) ---------- */
  PF.h = function (tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "dataset") Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
      else if (k === "style") el.style.cssText = v;
      else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "html") el.innerHTML = v; // apenas para SVG interno de ícones
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };
  function append(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(function (k) { append(el, k); }); return; }
    if (kid instanceof Node) { el.appendChild(kid); return; }
    el.appendChild(document.createTextNode(String(kid)));
  }
  var h = PF.h;

  /* ---------- ícones (traço único 1.6, 24x24) ---------- */
  var IC = {
    home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
    folders: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    tasks: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 5-5"/>',
    board: '<rect x="4" y="4" width="4.5" height="16" rx="1.5"/><rect x="10" y="4" width="4.5" height="11" rx="1.5"/><rect x="16" y="4" width="4.5" height="7" rx="1.5"/>',
    backlog: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    sprint: '<path d="M5 12a7 7 0 1 1 2 4.9"/><path d="M5 17v-5h5"/><path d="m12 9 0 3.5 2.5 1.5"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    users: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M15.8 14.6c2.4.2 4.1 1.6 4.7 4.1"/>',
    shield: '<path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6z"/><path d="m9.3 11.8 2 2 3.6-3.8"/>',
    sparkle: '<path d="M12 4l1.8 4.6L18.5 10l-4.7 1.4L12 16l-1.8-4.6L5.5 10l4.7-1.4z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    plug: '<path d="M9 7V3.5M15 7V3.5"/><path d="M7 7h10v4a5 5 0 0 1-10 0z"/><path d="M12 16v4.5"/>',
    bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2.5H4.5z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    webhook: '<circle cx="6.5" cy="17" r="2.5"/><circle cx="17.5" cy="17" r="2.5"/><circle cx="12" cy="7" r="2.5"/><path d="M10.8 9.2 7.5 14.6M13.2 9.2l3.3 5.4M9 17h6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.3M12 18.2v2.3M3.5 12h2.3M18.2 12h2.3M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18"/>',
    chart: '<path d="M4 4v16h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
    pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6h5"/>',
    scroll: '<path d="M7 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7"/><path d="M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2"/><path d="M10 9h6M10 13h6"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 4.5 4.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    chevR: '<path d="m9 6 6 6-6 6"/>',
    chevL: '<path d="m15 6-6 6 6 6"/>',
    chevU: '<path d="m6 15 6-6 6 6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    filter: '<path d="M4 6h16l-6 7v5l-4 2v-7z"/>',
    flag: '<path d="M6 21V4"/><path d="M6 5h11l-2.5 3.5L17 12H6"/>',
    tag: '<path d="m4 12 8-8h8v8l-8 8z"/><circle cx="15.5" cy="8.5" r="1.3"/>',
    comment: '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z"/>',
    link: '<path d="M10 14a4 4 0 0 0 6 .4l2.5-2.5a4 4 0 1 0-5.7-5.7L11.5 7.5"/><path d="M14 10a4 4 0 0 0-6-.4L5.5 12a4 4 0 1 0 5.7 5.7l1.3-1.3"/>',
    play: '<path d="M7 5v14l12-7z"/>',
    refresh: '<path d="M4 12a8 8 0 0 1 14-5.3L20 8.5"/><path d="M20 4v4.5h-4.5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15.5"/><path d="M4 20v-4.5h4.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
    moon: '<path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z"/>',
    check: '<path d="m5 13 4.5 4.5L19 8"/>',
    alert: '<path d="M12 4 2.8 20h18.4z"/><path d="M12 10v4M12 17.2v.3"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.3"/>',
    dots: '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>',
    inbox: '<path d="M4 13.5 6.5 5h11L20 13.5V19H4z"/><path d="M4 13.5h5l1.5 2.5h3l1.5-2.5h5"/>',
    bug: '<circle cx="12" cy="13" r="5"/><path d="M12 8V6M8.5 9 6 6.5M15.5 9 18 6.5M7 13H4M20 13h-3M8.5 17 6 19.5M15.5 17l2.5 2.5"/>',
    epic: '<path d="M12 4l6 8-6 8-6-8z"/>',
    subtask: '<path d="M6 5v10a3 3 0 0 0 3 3h9"/><path d="m14.5 14.5 3.5 3.5-3.5 3.5"/><circle cx="6" cy="5" r="1.6"/>',
    send: '<path d="M4 11.5 20 4l-4.5 16-4-6.5z"/><path d="M11.5 13.5 20 4"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a0 0 0 0 1 0 0V5a1 1 0 0 1 1-1h10v1"/><path d="M15 5V4H5a1 1 0 0 0-1 1v10h1"/>',
    eye: '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.6"/>',
    eyeOff: '<path d="M4 4l16 16"/><path d="M10 5.3A9.8 9.8 0 0 1 12 5c5.5 0 9 7 9 7a16.7 16.7 0 0 1-2.7 3.4M6.6 6.6C4.3 8.2 3 12 3 12s3.5 7 9 7a8.8 8.8 0 0 0 4-1"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/><path d="M10.5 11v5M13.5 11v5"/>',
    edit: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14.5 7.5 3 3"/>',
    external: '<path d="M14 5h5v5"/><path d="M19 5 10.5 13.5"/><path d="M19 13v6H5V5h6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    star: '<path d="m12 4 2.4 5 5.6.7-4.1 3.8 1.1 5.5-5-2.8-5 2.8 1.1-5.5L4 9.7 9.6 9z"/>',
    archive: '<rect x="4" y="4" width="16" height="5" rx="1"/><path d="M6 9v10h12V9"/><path d="M10 13h4"/>',
    block: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    target: '<path d="M12 4l6 8-6 8-6-8z"/><path d="M12 8.5 14.5 12 12 15.5 9.5 12z"/>',
    timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.8M9.5 3.5h5"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/>',
    sms: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
    wapp: '<path d="M12 4a8 8 0 0 0-6.9 12L4 20l4.2-1A8 8 0 1 0 12 4z"/><path d="M9.3 9.5c0 3 2.2 5.2 5.2 5.2l.9-1.5-1.9-1-.8.7a3.8 3.8 0 0 1-1.6-1.6l.7-.8-1-1.9z"/>',
    arrowR: '<path d="M4 12h15M14 6.5 19.5 12 14 17.5"/>',
    grip: '<circle cx="9" cy="6" r="1.1"/><circle cx="15" cy="6" r="1.1"/><circle cx="9" cy="12" r="1.1"/><circle cx="15" cy="12" r="1.1"/><circle cx="9" cy="18" r="1.1"/><circle cx="15" cy="18" r="1.1"/>',
    key: '<circle cx="8" cy="14" r="4"/><path d="m11 11 8-8M16 6l2.5 2.5M13.5 8.5 16 11"/>',
    building: '<rect x="5" y="4" width="14" height="16" rx="1"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2"/>',
    briefcase: '<rect x="4" y="8" width="16" height="11" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M4 13h16"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19h14"/>'
  };
  PF.icon = function (name, size) {
    size = size || 16;
    var span = document.createElement("span");
    span.style.cssText = "display:inline-flex;flex:none";
    span.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[name] || IC.info) + "</svg>";
    return span;
  };
  var icon = PF.icon;

  /* ---------- metadados de domínio ---------- */
  PF.STATUSES = ["backlog", "todo", "in_progress", "in_review", "done"];
  PF.STATUS_META = {
    backlog: { label: "Backlog", color: "var(--ink-3)" },
    todo: { label: "A fazer", color: "var(--ink-2)" },
    in_progress: { label: "Em andamento", color: "var(--accent)" },
    in_review: { label: "Em revisão", color: "var(--violet)" },
    done: { label: "Concluído", color: "var(--ok)" }
  };
  PF.statusIcon = function (st, size) {
    size = size || 14;
    var c = PF.STATUS_META[st].color;
    var inner = "";
    if (st === "backlog") inner = '<circle cx="12" cy="12" r="7" stroke-dasharray="3.2 3.2"/>';
    else if (st === "todo") inner = '<circle cx="12" cy="12" r="7"/>';
    else if (st === "in_progress") inner = '<circle cx="12" cy="12" r="7"/><path d="M12 12V5.4A6.6 6.6 0 0 1 12 18.6z" fill="' + "currentColor" + '" stroke="none"/>';
    else if (st === "in_review") inner = '<circle cx="12" cy="12" r="7"/><path d="M12 12V5.4A6.6 6.6 0 1 1 5.4 12z" fill="currentColor" stroke="none"/>';
    else inner = '<circle cx="12" cy="12" r="8" fill="currentColor" stroke="none"/><path d="m8.6 12.2 2.3 2.3 4.5-4.7" stroke="var(--surface)" stroke-width="2"/>';
    var span = document.createElement("span");
    span.style.cssText = "display:inline-flex;flex:none;color:" + c;
    span.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' + inner + "</svg>";
    return span;
  };
  PF.statusChip = function (st) {
    return h("span", { class: "status-chip" }, PF.statusIcon(st), PF.STATUS_META[st].label);
  };

  PF.PRIORITIES = ["urgent", "high", "medium", "low"];
  PF.PRIO_META = {
    urgent: { label: "Urgente", color: "var(--danger)", glyph: '<path d="m6 11 6-5 6 5M6 17l6-5 6 5"/>' },
    high: { label: "Alta", color: "var(--warn)", glyph: '<path d="m6 14.5 6-5 6 5"/>' },
    medium: { label: "Média", color: "var(--info)", glyph: '<path d="M6 9.5h12M6 14.5h12"/>' },
    low: { label: "Baixa", color: "var(--ink-3)", glyph: '<path d="m6 9.5 6 5 6-5"/>' }
  };
  PF.prioChip = function (p, bare) {
    var m = PF.PRIO_META[p];
    var span = document.createElement("span");
    span.className = "prio";
    span.style.color = m.color;
    span.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + m.glyph + "</svg>";
    if (!bare) span.appendChild(document.createTextNode(m.label));
    else span.setAttribute("data-tip", m.label);
    return span;
  };

  PF.TYPE_META = {
    task: { label: "Tarefa", icon: "tasks", color: "var(--accent)" },
    bug: { label: "Bug", icon: "bug", color: "var(--danger)" },
    subtask: { label: "Subtarefa", icon: "subtask", color: "var(--ink-2)" },
    epic: { label: "Épico", icon: "epic", color: "var(--violet)" }
  };
  PF.typeIcon = function (type, size) {
    var m = PF.TYPE_META[type] || PF.TYPE_META.task;
    var s = icon(m.icon, size || 14);
    s.style.color = m.color;
    s.setAttribute("data-tip", m.label);
    return s;
  };

  PF.avatarEl = function (user, size) {
    if (!user) {
      var ghost = h("span", { class: "avatar " + (size || ""), "data-tip": "Sem responsável" });
      ghost.style.background = "var(--surface-2)";
      ghost.style.border = "1px dashed var(--border-2)";
      return ghost;
    }
    var a = h("span", { class: "avatar " + (size || ""), "data-tip": user.name }, user.initials);
    a.style.setProperty("--av", user.color);
    return a;
  };
  PF.whoCell = function (userId) {
    var u = PF.user(userId);
    if (!u) return h("span", { class: "muted" }, "—");
    return h("span", { class: "who-cell" }, PF.avatarEl(u, "sm"), h("span", { class: "nm" }, u.name));
  };
  PF.labelChip = function (name) {
    var colors = { backend: "#2B5FD9", frontend: "#B23A78", mobile: "#6D4FC4", infra: "#0E7490", dados: "#9A5B00", ux: "#3D7068", seguranca: "#BE3030", performance: "#7A5C2E", documentacao: "#4A6572", cliente: "#1D7A4C" };
    var c = h("span", { class: "label-chip" }, name);
    c.style.setProperty("--lc", colors[name] || "var(--ink-3)");
    return c;
  };

  /* ---------- permissões ---------- */
  var ALL_CAPS = ["project.view", "project.create", "project.edit", "project.archive", "project.delete", "project.members",
    "task.view", "task.create", "task.edit", "task.move", "task.assign", "task.delete",
    "sprint.view", "sprint.manage", "team.view", "team.manage", "user.manage",
    "webhook.view", "webhook.manage", "notif.view", "notif.manage",
    "mcp.view", "mcp.read", "mcp.write", "audit.view", "insights.view", "ai.use", "ai.apply"];
  var ROLE_CAPS = {
    admin: ALL_CAPS.slice(),
    pm: ["project.view", "project.create", "project.edit", "project.archive", "project.members",
      "task.view", "task.create", "task.edit", "task.move", "task.assign", "task.delete",
      "sprint.view", "sprint.manage", "team.view",
      "webhook.view", "notif.view", "mcp.view", "mcp.read", "mcp.write",
      "audit.view", "insights.view", "ai.use", "ai.apply"],
    lead: ["project.view", "task.view", "task.create", "task.edit", "task.move", "task.assign",
      "sprint.view", "team.view", "team.manage",
      "notif.view", "mcp.view", "mcp.read", "insights.view", "ai.use", "ai.apply"],
    dev: ["project.view", "task.view", "task.create", "task.edit", "task.move",
      "sprint.view", "team.view", "notif.view", "mcp.view", "mcp.read", "ai.use"],
    viewer: ["project.view", "task.view", "sprint.view", "team.view",
      "webhook.view", "notif.view", "mcp.view", "audit.view", "insights.view"]
  };
  PF.can = function (cap) {
    var me = PF.me();
    if (!me) return false;
    return (ROLE_CAPS[me.roleId] || []).indexOf(cap) >= 0;
  };
  PF.roleName = function (roleId) { var r = PF.byId("roles", roleId); return r ? r.name : roleId; };

  PF.visibleProjects = function () {
    var me = PF.me();
    var list = PF.db.projects.filter(function (p) { return !p.archived; });
    if (me.roleId === "admin" || me.roleId === "viewer") return list;
    if (me.roleId === "pm") return list.filter(function (p) { return p.orgId === me.orgId; });
    return list.filter(function (p) {
      if (p.orgId !== me.orgId) return false;
      if (p.leadId === me.id) return true;
      return p.teamIds.some(function (t) { return me.teamIds.indexOf(t) >= 0; });
    });
  };
  PF.canSeeProject = function (projectId) {
    return PF.visibleProjects().some(function (p) { return p.id === projectId; });
  };
  PF.canTouchTask = function (t) {
    var me = PF.me();
    if (!PF.can("task.edit")) return false;
    if (me.roleId === "admin" || me.roleId === "pm") return true;
    if (!PF.canSeeProject(t.projectId)) return false;
    if (me.roleId === "lead") return me.teamIds.indexOf(t.teamId) >= 0 || t.assigneeId === me.id;
    return t.assigneeId === me.id || t.createdBy === me.id || !t.assigneeId;
  };
  PF.deny = function (what) {
    var me = PF.me();
    PF.db.audit.unshift({
      id: PF.uid("au"), ts: new Date().toISOString(), userId: me.id,
      action: "denied", entityType: "permission", entityId: null, projectId: null,
      before: null, after: null, summary: "tentativa sem permissão: " + what, source: "ui"
    });
    PF.save();
    PF.toast("Sem permissão", "O perfil “" + PF.roleName(me.roleId) + "” não pode " + what + ".", "err");
  };
  PF.guard = function (cap, what) {
    if (PF.can(cap)) return true;
    PF.deny(what);
    return false;
  };

  /* ---------- auditoria, eventos, webhooks, notificações ---------- */
  function audit(action, entityType, entityId, projectId, before, after, summary, source) {
    PF.db.audit.unshift({
      id: PF.uid("au"), ts: new Date().toISOString(), userId: PF.me().id,
      action: action, entityType: entityType, entityId: entityId, projectId: projectId,
      before: before || null, after: after || null, summary: summary, source: source || "ui"
    });
  }
  PF.auditPush = audit;

  function deliverWebhook(wh, ev) {
    var fail = wh.health === "failing";
    var attempts = [];
    var now = Date.now();
    if (fail) {
      for (var i = 0; i < 3; i++) attempts.push({ ts: new Date(now + i * 1500).toISOString(), httpStatus: 503, ok: false, durationMs: 900 + Math.floor(Math.random() * 1800) });
    } else {
      attempts.push({ ts: new Date(now).toISOString(), httpStatus: 200, ok: true, durationMs: 60 + Math.floor(Math.random() * 350) });
    }
    PF.db.deliveries.unshift({
      id: PF.uid("dl"), webhookId: wh.id, eventId: ev.id, eventType: ev.type,
      ts: new Date().toISOString(), status: fail ? "failed" : "success",
      httpStatus: fail ? 503 : 200, attempts: attempts,
      payload: { id: ev.id, type: ev.type, occurredAt: ev.ts, data: ev.payload }
    });
    if (fail) PF.toast("Entrega de webhook falhou", wh.name + " respondeu 503 — 3 tentativas registradas.", "warn");
  }

  var NOTIF_MAP = {
    "task.assigned.v1": { tpl: "nt-assigned", to: function (ev) { return ev.payload.assignee; } },
    "comment.mention.v1": { tpl: "nt-mention", to: function (ev) { return ev.payload.mentioned; } },
    "sprint.started.v1": { tpl: "nt-sprint-start", to: function (ev) { var p = PF.project(ev.projectId); return p && p.leadId; } },
    "sprint.completed.v1": { tpl: "nt-sprint-end", to: function (ev) { var p = PF.project(ev.projectId); return p && p.leadId; } },
    "task.blocked.v1": { tpl: "nt-blocked", to: function (ev) { return ev.payload.assignee; } }
  };

  function notify(ev) {
    var map = NOTIF_MAP[ev.type];
    if (!map) return;
    var toId = map.to(ev);
    if (!toId) return;
    var tpl = PF.byId("notifTemplates", map.tpl);
    var prefs = PF.db.notifPrefs[tpl.event] || {};
    var toUser = PF.user(toId);
    if (!toUser) return;
    ["email", "whatsapp", "sms"].forEach(function (ch) {
      if (!prefs[ch]) return;
      var provider = PF.db.providers[ch];
      var vars = ev.payload.vars || {};
      var subj = tpl.subject, body = tpl.body;
      Object.keys(vars).forEach(function (k) { subj = subj.split("{" + k + "}").join(vars[k]); body = body.split("{" + k + "}").join(vars[k]); });
      PF.db.notifications.unshift({
        id: PF.uid("nf"), ts: new Date().toISOString(), channel: ch, templateId: tpl.id,
        eventType: tpl.event, toUserId: toId, subject: subj, body: body,
        status: provider.configured ? "delivered" : "failed",
        attempts: provider.configured ? 1 : 1,
        failReason: provider.configured ? null : "Provedor de " + ch.toUpperCase() + " não configurado"
      });
    });
  }

  PF.emitEvent = function (type, projectId, entityId, payload) {
    var ev = {
      id: PF.uid("ev"), ts: new Date().toISOString(), type: type,
      projectId: projectId, entityId: entityId, actorId: PF.me().id, payload: payload || {}
    };
    PF.db.events.unshift(ev);
    PF.db.webhooks.forEach(function (wh) {
      if (wh.active && wh.events.indexOf(type) >= 0) deliverWebhook(wh, ev);
    });
    notify(ev);
    return ev;
  };

  /* ---------- ações (mutações centralizadas) ---------- */
  var act = PF.act = {};

  act.setProfile = function (userId) {
    var u = PF.user(userId);
    PF.db.settings.currentUserId = userId;
    PF.save();
    PF.toast("Perfil alterado", "Agora você está navegando como " + u.name + " (" + PF.roleName(u.roleId) + ").", "info");
    // se a rota atual não é permitida para o novo perfil, volta ao início
    var route = PF.currentRoute();
    if (route && route.cap && !PF.can(route.cap)) PF.navigate(PF.db.settings.activeApp === "insights" ? "/insights" : "/dashboard");
    else PF.refresh();
  };

  act.setTheme = function (mode) {
    PF.db.settings.theme = mode;
    PF.save();
    PF.applyTheme();
  };

  act.setApp = function (app) {
    PF.db.settings.activeApp = app;
    PF.save();
    PF.navigate(app === "insights" ? "/insights" : "/dashboard");
  };

  act.setCurrentProject = function (id) {
    PF.db.settings.currentProjectId = id;
    PF.save();
    PF.refresh();
  };

  act.createProject = function (f) {
    if (!PF.guard("project.create", "criar projetos")) return null;
    var p = {
      id: PF.uid("prj"), orgId: PF.me().orgId, key: f.key.toUpperCase(), name: f.name, desc: f.desc || "",
      teamIds: f.teamIds || [], leadId: f.leadId || PF.me().id, priority: f.priority || "medium",
      status: "active", startDate: f.startDate || new Date().toISOString().slice(0, 10),
      targetDate: f.targetDate || null, favorite: false, archived: false,
      createdAt: new Date().toISOString(), color: "#2B5FD9"
    };
    PF.db.projects.push(p);
    PF.db.taskCounters[p.id] = 0;
    audit("create", "project", p.id, p.id, null, { name: p.name, key: p.key }, "criou o projeto " + p.name, f.source || "ui");
    PF.emitEvent("project.created.v1", p.id, p.id, { project: p.name, key: p.key });
    PF.save(); PF.refresh();
    PF.toast("Projeto criado", p.name + " (" + p.key + ") está ativo.", "ok");
    return p;
  };

  act.updateProject = function (id, fields, source) {
    if (!PF.guard("project.edit", "editar projetos")) return;
    var p = PF.project(id);
    var before = {}, after = {};
    Object.keys(fields).forEach(function (k) {
      if (JSON.stringify(p[k]) !== JSON.stringify(fields[k])) { before[k] = p[k]; after[k] = fields[k]; p[k] = fields[k]; }
    });
    if (!Object.keys(after).length) return;
    audit("update", "project", p.id, p.id, before, after, "atualizou o projeto " + p.name, source || "ui");
    PF.emitEvent("project.updated.v1", p.id, p.id, { project: p.name, fields: Object.keys(after) });
    PF.save(); PF.refresh();
    PF.toast("Projeto atualizado", p.name, "ok");
  };

  act.archiveProject = function (id) {
    if (!PF.guard("project.archive", "arquivar projetos")) return;
    var p = PF.project(id);
    p.archived = true;
    audit("archive", "project", p.id, p.id, { archived: false }, { archived: true }, "arquivou o projeto " + p.name, "ui");
    PF.save(); PF.refresh();
    PF.toast("Projeto arquivado", p.name + " saiu das listagens ativas.", "ok");
  };

  act.deleteProject = function (id) {
    if (!PF.guard("project.delete", "excluir projetos")) return;
    var p = PF.project(id);
    PF.db.projects = PF.db.projects.filter(function (x) { return x.id !== id; });
    PF.db.tasks = PF.db.tasks.filter(function (t) { return t.projectId !== id; });
    audit("delete", "project", id, id, { name: p.name }, null, "excluiu o projeto " + p.name + " (simulado)", "ui");
    PF.save();
    PF.navigate("/projects");
    PF.toast("Projeto excluído", p.name + " e suas tarefas foram removidos (simulação).", "ok");
  };

  act.toggleFavorite = function (id) {
    var p = PF.project(id);
    p.favorite = !p.favorite;
    PF.save(); PF.refresh();
  };

  act.createEpic = function (projectId, f, source) {
    if (!PF.guard("task.create", "criar épicos")) return null;
    var ep = { id: PF.uid("ep"), projectId: projectId, name: f.name, desc: f.desc || "", status: "active", ownerId: f.ownerId || PF.me().id };
    PF.db.epics.push(ep);
    audit("create", "epic", ep.id, projectId, null, { name: ep.name }, "criou o épico " + ep.name, source || "ui");
    PF.save();
    return ep;
  };

  act.createTask = function (f, source) {
    if (!PF.guard("task.create", "criar tarefas")) return null;
    if (!PF.canSeeProject(f.projectId)) { PF.deny("criar tarefas neste projeto"); return null; }
    var p = PF.project(f.projectId);
    PF.db.taskCounters[p.id] = (PF.db.taskCounters[p.id] || 0) + 1;
    var t = {
      id: PF.uid("tsk"), ref: p.key + "-" + (100 + PF.db.taskCounters[p.id]),
      projectId: p.id, epicId: f.epicId || null, parentId: f.parentId || null,
      type: f.type || "task", title: f.title, desc: f.desc || "",
      status: f.status || "todo", priority: f.priority || "medium",
      assigneeId: f.assigneeId || null, teamId: f.teamId || p.teamIds[0] || null,
      sprintId: f.sprintId || null, labels: f.labels || [], acceptance: f.acceptance || [],
      blockedBy: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      dueDate: f.dueDate || null, createdBy: PF.me().id
    };
    PF.db.tasks.push(t);
    audit("create", "task", t.id, p.id, null, { title: t.title, status: t.status }, "criou a tarefa " + t.ref, source || "ui");
    PF.emitEvent("task.created.v1", p.id, t.id, { task: t.ref, title: t.title });
    if (t.assigneeId) {
      var u = PF.user(t.assigneeId);
      PF.emitEvent("task.assigned.v1", p.id, t.id, { task: t.ref, assignee: t.assigneeId, vars: { ref: t.ref, nome: u.name.split(" ")[0], titulo: t.title, projeto: p.name } });
    }
    PF.save(); PF.refresh();
    if (!f.silent) PF.toast("Tarefa criada", t.ref + " — " + t.title, "ok");
    return t;
  };

  act.updateTask = function (id, fields, source) {
    var t = PF.task(id);
    if (!t) return;
    if (!PF.canTouchTask(t)) { PF.deny("editar a tarefa " + t.ref); return; }
    var p = PF.project(t.projectId);
    var before = {}, after = {};
    Object.keys(fields).forEach(function (k) {
      if (JSON.stringify(t[k]) !== JSON.stringify(fields[k])) { before[k] = t[k]; after[k] = fields[k]; t[k] = fields[k]; }
    });
    if (!Object.keys(after).length) return;
    t.updatedAt = new Date().toISOString();

    if ("status" in after) {
      audit("status", "task", t.id, t.projectId, { status: before.status }, { status: after.status },
        "moveu " + t.ref + " de " + PF.STATUS_META[before.status].label + " para " + PF.STATUS_META[after.status].label, source || "ui");
      PF.emitEvent("task.status_changed.v1", t.projectId, t.id, { task: t.ref, from: before.status, to: after.status });
      if (after.status === "done") PF.emitEvent("task.completed.v1", t.projectId, t.id, { task: t.ref });
    }
    if ("assigneeId" in after) {
      audit("assign", "task", t.id, t.projectId, { assigneeId: before.assigneeId }, { assigneeId: after.assigneeId },
        "atribuiu " + t.ref + (after.assigneeId ? " a " + PF.user(after.assigneeId).name : " a ninguém"), source || "ui");
      if (after.assigneeId) {
        var u = PF.user(after.assigneeId);
        PF.emitEvent("task.assigned.v1", t.projectId, t.id, { task: t.ref, assignee: after.assigneeId, vars: { ref: t.ref, nome: u.name.split(" ")[0], titulo: t.title, projeto: p.name } });
      }
    }
    if ("blockedBy" in after && after.blockedBy.length > (before.blockedBy || []).length) {
      var blockerId = after.blockedBy[after.blockedBy.length - 1];
      var blocker = PF.task(blockerId);
      audit("block", "task", t.id, t.projectId, null, { blockedBy: blockerId }, t.ref + " bloqueada por " + (blocker ? blocker.ref : "?"), source || "ui");
      PF.emitEvent("task.blocked.v1", t.projectId, t.id, { task: t.ref, assignee: t.assigneeId, vars: { ref: t.ref, bloqueio: blocker ? blocker.ref : "?" } });
    }
    var other = Object.keys(after).filter(function (k) { return ["status", "assigneeId", "blockedBy"].indexOf(k) < 0; });
    if (other.length) {
      var ob = {}, oa = {};
      other.forEach(function (k) { ob[k] = before[k]; oa[k] = after[k]; });
      audit(other.indexOf("priority") >= 0 ? "priority" : "update", "task", t.id, t.projectId, ob, oa, "atualizou " + t.ref + " (" + other.join(", ") + ")", source || "ui");
    }
    PF.save(); PF.refresh();
  };

  act.moveTask = function (id, status, source) {
    act.updateTask(id, { status: status }, source);
  };

  act.deleteTask = function (id) {
    var t = PF.task(id);
    if (!PF.guard("task.delete", "excluir tarefas")) return;
    PF.db.tasks = PF.db.tasks.filter(function (x) { return x.id !== id && x.parentId !== id; });
    audit("delete", "task", id, t.projectId, { title: t.title }, null, "excluiu a tarefa " + t.ref + " (simulado)", "ui");
    PF.save(); PF.refresh();
    PF.toast("Tarefa excluída", t.ref + " removida (simulação).", "ok");
  };

  act.addComment = function (taskId, text) {
    var t = PF.task(taskId);
    if (!PF.canSeeProject(t.projectId) || !PF.can("task.create")) { PF.deny("comentar nesta tarefa"); return; }
    var c = { id: PF.uid("cm"), taskId: taskId, userId: PF.me().id, text: text, createdAt: new Date().toISOString() };
    PF.db.comments.push(c);
    audit("comment", "task", t.id, t.projectId, null, null, "comentou em " + t.ref, "ui");
    // menções: @Nome Sobrenome
    PF.db.users.forEach(function (u) {
      if (u.id !== PF.me().id && text.indexOf("@" + u.name) >= 0) {
        PF.emitEvent("comment.mention.v1", t.projectId, t.id, { task: t.ref, mentioned: u.id, vars: { ref: t.ref, autor: PF.me().name } });
      }
    });
    PF.save(); PF.refresh();
  };

  act.createSprint = function (projectId, f) {
    if (!PF.guard("sprint.manage", "criar sprints")) return null;
    var s = { id: PF.uid("sp"), projectId: projectId, name: f.name, goal: f.goal || "", status: "planned", startDate: f.startDate, endDate: f.endDate };
    PF.db.sprints.push(s);
    audit("create", "sprint", s.id, projectId, null, { name: s.name }, "criou a " + s.name, "ui");
    PF.save(); PF.refresh();
    PF.toast("Sprint criada", s.name, "ok");
    return s;
  };

  act.startSprint = function (id) {
    if (!PF.guard("sprint.manage", "iniciar sprints")) return;
    var s = PF.byId("sprints", id);
    s.status = "active";
    audit("sprint_start", "sprint", s.id, s.projectId, { status: "planned" }, { status: "active" }, "iniciou a " + s.name, "ui");
    PF.emitEvent("sprint.started.v1", s.projectId, s.id, { sprint: s.name, vars: { sprint: s.name, projeto: PF.project(s.projectId).name, meta: s.goal } });
    PF.save(); PF.refresh();
    PF.toast("Sprint iniciada", s.name, "ok");
  };

  act.completeSprint = function (id) {
    if (!PF.guard("sprint.manage", "encerrar sprints")) return;
    var s = PF.byId("sprints", id);
    s.status = "done";
    var done = PF.db.tasks.filter(function (t) { return t.sprintId === id && t.status === "done"; }).length;
    var open = PF.db.tasks.filter(function (t) { return t.sprintId === id && t.status !== "done"; });
    open.forEach(function (t) { t.sprintId = null; }); // volta para o backlog da lista
    audit("sprint_end", "sprint", s.id, s.projectId, { status: "active" }, { status: "done" },
      "encerrou a " + s.name + " (" + done + " concluídas, " + open.length + " devolvidas ao backlog)", "ui");
    PF.emitEvent("sprint.completed.v1", s.projectId, s.id, { sprint: s.name, done: done, vars: { sprint: s.name, feitas: String(done) } });
    PF.save(); PF.refresh();
    PF.toast("Sprint encerrada", s.name + ": " + done + " tarefas concluídas; " + open.length + " voltaram ao backlog.", "ok");
  };

  act.createWebhook = function (f) {
    if (!PF.guard("webhook.manage", "gerenciar webhooks")) return null;
    var wh = {
      id: PF.uid("wh"), name: f.name, url: f.url,
      secret: "whsec_" + Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10),
      events: f.events, active: true, health: /fail|erro|500|503/.test(f.url) ? "failing" : "ok",
      createdAt: new Date().toISOString()
    };
    PF.db.webhooks.push(wh);
    audit("create", "webhook", wh.id, null, null, { name: wh.name, url: wh.url }, "cadastrou o webhook " + wh.name, "ui");
    PF.save(); PF.refresh();
    PF.toast("Webhook cadastrado", wh.name, "ok");
    return wh;
  };

  act.updateWebhook = function (id, fields) {
    if (!PF.guard("webhook.manage", "gerenciar webhooks")) return;
    var wh = PF.byId("webhooks", id);
    var before = {}, after = {};
    Object.keys(fields).forEach(function (k) {
      if (JSON.stringify(wh[k]) !== JSON.stringify(fields[k])) { before[k] = wh[k]; after[k] = fields[k]; wh[k] = fields[k]; }
    });
    if ("url" in after) wh.health = /fail|erro|500|503/.test(wh.url) ? "failing" : "ok";
    if (Object.keys(after).length) audit("update", "webhook", wh.id, null, before, after, "atualizou o webhook " + wh.name, "ui");
    PF.save(); PF.refresh();
  };

  act.deleteWebhook = function (id) {
    if (!PF.guard("webhook.manage", "gerenciar webhooks")) return;
    var wh = PF.byId("webhooks", id);
    PF.db.webhooks = PF.db.webhooks.filter(function (x) { return x.id !== id; });
    audit("delete", "webhook", id, null, { name: wh.name }, null, "excluiu o webhook " + wh.name, "ui");
    PF.save(); PF.refresh();
    PF.toast("Webhook excluído", wh.name, "ok");
  };

  act.testWebhook = function (id) {
    if (!PF.guard("webhook.manage", "testar webhooks")) return;
    var wh = PF.byId("webhooks", id);
    var ev = { id: PF.uid("ev"), ts: new Date().toISOString(), type: "ping.v1", projectId: null, entityId: null, actorId: PF.me().id, payload: { message: "Teste manual disparado por " + PF.me().name } };
    PF.db.events.unshift(ev);
    deliverWebhook(wh, ev);
    audit("test", "webhook", wh.id, null, null, null, "testou o webhook " + wh.name, "ui");
    PF.save(); PF.refresh();
    if (wh.health !== "failing") PF.toast("Teste enviado", wh.name + " respondeu 200 OK.", "ok");
  };

  act.redeliver = function (deliveryId) {
    if (!PF.guard("webhook.manage", "reenviar entregas")) return;
    var dl = PF.byId("deliveries", deliveryId);
    var wh = PF.byId("webhooks", dl.webhookId);
    dl.attempts.push({ ts: new Date().toISOString(), httpStatus: 200, ok: true, durationMs: 120 + Math.floor(Math.random() * 200), manual: true });
    dl.status = "success"; dl.httpStatus = 200;
    audit("redeliver", "webhook", wh.id, null, null, null, "reenviou manualmente o evento " + dl.eventType + " para " + wh.name, "ui");
    PF.save(); PF.refresh();
    PF.toast("Evento reenviado", "Entrega concluída com 200 OK (simulação de endpoint recuperado).", "ok");
  };

  act.resendNotification = function (id) {
    var nf = PF.byId("notifications", id);
    nf.attempts += 1;
    var provider = PF.db.providers[nf.channel];
    if (provider.configured) { nf.status = "delivered"; nf.failReason = null; PF.toast("Notificação reenviada", "Entregue via " + nf.channel + ".", "ok"); }
    else PF.toast("Reenvio falhou", "Provedor de " + nf.channel.toUpperCase() + " segue não configurado.", "err");
    PF.save(); PF.refresh();
  };

  act.setNotifPref = function (eventType, channel, val) {
    if (!PF.guard("notif.manage", "alterar preferências de notificação")) return;
    PF.db.notifPrefs[eventType][channel] = val;
    audit("update", "notification", eventType, null, null, { channel: channel, enabled: val }, "alterou preferência de notificação (" + eventType + " / " + channel + ")", "ui");
    PF.save(); PF.refresh();
  };

  act.setProvider = function (channel, fields) {
    if (!PF.guard("webhook.manage", "configurar provedores")) return;
    Object.assign(PF.db.providers[channel], fields);
    audit("update", "notification", channel, null, null, fields, "configurou o provedor de " + channel, "ui");
    PF.save(); PF.refresh();
    PF.toast("Provedor atualizado", PF.db.providers[channel].name, "ok");
  };

  act.createTeam = function (f) {
    if (!PF.guard("user.manage", "criar equipes")) return;
    var t = { id: PF.uid("tm"), orgId: PF.me().orgId, name: f.name, desc: f.desc || "", leadId: f.leadId || null, memberIds: f.leadId ? [f.leadId] : [] };
    PF.db.teams.push(t);
    audit("create", "team", t.id, null, null, { name: t.name }, "criou a equipe " + t.name, "ui");
    PF.save(); PF.refresh();
    PF.toast("Equipe criada", t.name, "ok");
  };

  act.toggleTeamMember = function (teamId, userId) {
    var team = PF.team(teamId);
    var me = PF.me();
    var allowed = PF.can("user.manage") || (PF.can("team.manage") && team.leadId === me.id);
    if (!allowed) { PF.deny("gerenciar integrantes da equipe " + team.name); return; }
    var u = PF.user(userId);
    var idx = team.memberIds.indexOf(userId);
    if (idx >= 0) {
      team.memberIds.splice(idx, 1);
      u.teamIds = u.teamIds.filter(function (x) { return x !== teamId; });
      audit("update", "team", team.id, null, { member: u.name }, null, "removeu " + u.name + " da equipe " + team.name, "ui");
    } else {
      team.memberIds.push(userId);
      if (u.teamIds.indexOf(teamId) < 0) u.teamIds.push(teamId);
      audit("update", "team", team.id, null, null, { member: u.name }, "adicionou " + u.name + " à equipe " + team.name, "ui");
    }
    PF.save(); PF.refresh();
  };

  act.inviteUser = function (f) {
    if (!PF.guard("user.manage", "convidar usuários")) return;
    var parts = f.name.trim().split(" ");
    var u = {
      id: PF.uid("u"), name: f.name, email: f.email, title: f.title || "",
      initials: (parts[0][0] + (parts[1] ? parts[parts.length - 1][0] : "")).toUpperCase(),
      color: "#4A6572", roleId: f.roleId, orgId: PF.me().orgId, teamIds: f.teamIds || [], active: false, invited: true
    };
    PF.db.users.push(u);
    (f.teamIds || []).forEach(function (tid) {
      var tm = PF.team(tid);
      if (tm && tm.memberIds.indexOf(u.id) < 0) tm.memberIds.push(u.id);
    });
    audit("create", "user", u.id, null, null, { name: u.name, role: f.roleId }, "convidou " + u.name + " (" + u.email + ")", "ui");
    PF.save(); PF.refresh();
    PF.toast("Convite enviado", "Convite simulado para " + u.email + ".", "ok");
  };

  act.setUserRole = function (userId, roleId) {
    if (!PF.guard("user.manage", "alterar papéis de acesso")) return;
    var u = PF.user(userId);
    var old = u.roleId;
    u.roleId = roleId;
    audit("update", "user", u.id, null, { role: old }, { role: roleId }, "alterou o papel de " + u.name + " para " + PF.roleName(roleId), "ui");
    PF.save(); PF.refresh();
    PF.toast("Papel atualizado", u.name + " agora é " + PF.roleName(roleId) + ".", "ok");
  };

  /* ---------- tema ---------- */
  PF.applyTheme = function () {
    var root = document.documentElement;
    root.classList.add("theme-switching");
    var mode = PF.db.settings.theme;
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.remove("theme-switching"); });
    });
    PF.refresh();
  };
  PF.effectiveTheme = function () {
    var mode = PF.db.settings.theme;
    if (mode !== "system") return mode;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  /* ---------- roteador ---------- */
  PF.routes = {};
  PF.navigate = function (path) {
    if (location.hash === "#" + path) PF.refresh();
    else location.hash = "#" + path;
  };
  PF.parseHash = function () {
    var hsh = location.hash.replace(/^#\/?/, "");
    var parts = hsh.split("/").filter(Boolean);
    return parts.length ? parts : ["dashboard"];
  };
  PF.currentRoute = function () {
    var parts = PF.parseHash();
    return PF.routes[parts[0]] || null;
  };
  PF.refresh = function () {
    var content = document.querySelector(".content");
    var st = content ? content.scrollTop : 0;
    PF.renderApp();
    var c2 = document.querySelector(".content");
    if (c2) c2.scrollTop = st;
    if (PF._drawerRefresh) PF._drawerRefresh();
  };

  /* ---------- overlays ---------- */
  var overlays = function () { return document.getElementById("overlays"); };

  PF.closeOverlays = function () {
    overlays().replaceChildren();
    PF._drawerRefresh = null;
    document.removeEventListener("keydown", escClose);
  };
  function escClose(e) { if (e.key === "Escape") PF.closeOverlays(); }

  PF.modal = function (opts) {
    PF.closeOverlays();
    var card = h("div", { class: "modal-card" + (opts.wide ? " wide" : ""), role: "dialog", "aria-modal": "true", "aria-label": opts.title });
    card.appendChild(h("div", { class: "modal-head" },
      h("h3", {}, opts.title),
      h("span", { class: "grow" }),
      h("button", { class: "btn btn-ghost btn-icon", "aria-label": "Fechar", onclick: PF.closeOverlays }, icon("x"))
    ));
    var body = h("div", { class: "modal-body" });
    append(body, opts.body);
    card.appendChild(body);
    if (opts.foot) { var f = h("div", { class: "modal-foot" }); append(f, opts.foot); card.appendChild(f); }
    var wrap = h("div", { class: "modal" }, card);
    var bd = h("div", { class: "backdrop", onclick: PF.closeOverlays });
    overlays().append(bd, wrap);
    document.addEventListener("keydown", escClose);
    var first = card.querySelector("input, select, textarea, button:not([aria-label=Fechar])");
    if (first) first.focus();
    return { close: PF.closeOverlays, card: card };
  };

  PF.confirm = function (opts) {
    return new Promise(function (resolve) {
      var m = PF.modal({
        title: opts.title || "Confirmar",
        body: h("p", { style: "margin:0" }, opts.msg),
        foot: [
          h("button", { class: "btn", onclick: function () { PF.closeOverlays(); resolve(false); } }, "Cancelar"),
          h("button", { class: "btn " + (opts.danger ? "btn-danger" : "btn-primary"), onclick: function () { PF.closeOverlays(); resolve(true); } }, opts.confirmLabel || "Confirmar")
        ]
      });
      void m;
    });
  };

  PF.drawer = function (opts) {
    PF.closeOverlays();
    var dr = h("aside", { class: "drawer", role: "dialog", "aria-modal": "true", "aria-label": opts.label || "Detalhes" });
    var head = h("div", { class: "drawer-head" });
    append(head, opts.head);
    head.appendChild(h("span", { class: "grow" }));
    if (opts.headActions) append(head, opts.headActions);
    head.appendChild(h("button", { class: "btn btn-ghost btn-icon", "aria-label": "Fechar", onclick: PF.closeOverlays }, icon("x")));
    var body = h("div", { class: "drawer-body" });
    append(body, opts.body);
    dr.append(head, body);
    if (opts.foot) { var f = h("div", { class: "drawer-foot" }); append(f, opts.foot); dr.appendChild(f); }
    var bd = h("div", { class: "backdrop", onclick: PF.closeOverlays });
    overlays().append(bd, dr);
    document.addEventListener("keydown", escClose);
    return { close: PF.closeOverlays, body: body, head: head };
  };

  PF.menuOpen = null;
  PF.menu = function (anchor, items) {
    closeMenu();
    var m = h("div", { class: "menu", role: "menu" });
    items.forEach(function (it) {
      if (it === "sep") { m.appendChild(h("div", { class: "menu-sep" })); return; }
      if (it.head) { m.appendChild(h("div", { class: "menu-head" }, it.head)); return; }
      var btn = h("button", {
        class: "menu-item" + (it.danger ? " danger" : ""), role: "menuitem",
        "aria-checked": it.checked ? "true" : null,
        onclick: function () { closeMenu(); it.onClick && it.onClick(); }
      });
      if (it.icon) btn.appendChild(icon(it.icon, 15));
      if (it.node) btn.appendChild(it.node);
      var txt = h("span", { class: "grow" }, it.label);
      if (it.sub) txt.appendChild(h("span", { class: "mi-sub" }, it.sub));
      btn.appendChild(txt);
      if (it.checked) btn.appendChild(icon("check", 14));
      m.appendChild(btn);
    });
    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect();
    var mw = m.offsetWidth, mh = m.offsetHeight;
    var x = Math.min(r.left, window.innerWidth - mw - 8);
    var y = r.bottom + 6;
    if (y + mh > window.innerHeight - 8) y = Math.max(8, r.top - mh - 6);
    m.style.left = x + "px"; m.style.top = y + "px";
    PF.menuOpen = m;
    setTimeout(function () {
      document.addEventListener("click", onDoc);
      document.addEventListener("keydown", onEsc);
    }, 0);
    function onDoc(e) { if (!m.contains(e.target)) closeMenu(); }
    function onEsc(e) { if (e.key === "Escape") closeMenu(); }
    function closeMenuInner() {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onEsc);
      m.remove(); PF.menuOpen = null;
    }
    m._close = closeMenuInner;
  };
  function closeMenu() { if (PF.menuOpen && PF.menuOpen._close) PF.menuOpen._close(); }
  PF.closeMenu = closeMenu;

  PF.toast = function (title, msg, kind) {
    kind = kind || "info";
    var icons = { ok: "check", err: "alert", warn: "alert", info: "info" };
    var t = h("div", { class: "toast " + kind },
      h("span", { class: "t-ic" }, icon(icons[kind], 16)),
      h("div", {}, h("b", {}, title), msg ? h("span", {}, msg) : null)
    );
    document.getElementById("toasts").appendChild(t);
    setTimeout(function () {
      t.classList.add("leaving");
      setTimeout(function () { t.remove(); }, 220);
    }, 4200);
  };

  PF.emptyState = function (iconName, title, msg, action) {
    return h("div", { class: "empty" },
      h("div", { class: "e-ic" }, icon(iconName, 20)),
      h("b", {}, title),
      h("p", {}, msg || ""),
      action || null
    );
  };

  PF.field = function (label, control, opts) {
    opts = opts || {};
    var f = h("div", { class: "field" + (opts.span2 ? " span2" : "") }, h("label", {}, label), control);
    if (opts.hint) f.appendChild(h("span", { class: "hint" }, opts.hint));
    return f;
  };
  PF.setInvalid = function (fieldEl, msg) {
    fieldEl.classList.add("invalid");
    var old = fieldEl.querySelector(".err");
    if (old) old.remove();
    fieldEl.appendChild(h("span", { class: "err" }, icon("alert", 12), msg));
  };
  PF.clearInvalid = function (form) {
    form.querySelectorAll(".field.invalid").forEach(function (f) {
      f.classList.remove("invalid");
      var e = f.querySelector(".err"); if (e) e.remove();
    });
  };

  PF.select = function (options, value, onChange, attrs) {
    var s = h("select", Object.assign({ class: "select", onchange: function () { onChange && onChange(s.value); } }, attrs || {}));
    options.forEach(function (o) {
      var opt = h("option", { value: o.value }, o.label);
      if (o.value === value) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  };

  PF.switchEl = function (checked, onChange, label) {
    var input = h("input", { type: "checkbox", role: "switch", "aria-label": label || "Alternar" });
    input.checked = !!checked;
    input.addEventListener("change", function () { onChange(input.checked); });
    return h("span", { class: "switch" }, input, h("span", { class: "tr" }));
  };

  PF.progressBar = function (pct, ok) {
    var p = h("div", { class: "progress" + (ok ? " ok" : ""), role: "progressbar", "aria-valuenow": Math.round(pct) },
      h("i", { style: "width:" + Math.max(0, Math.min(100, pct)) + "%" }));
    return p;
  };

  /* ---------- derivações de domínio ---------- */
  PF.projectTasks = function (projectId) {
    return PF.db.tasks.filter(function (t) { return t.projectId === projectId; });
  };
  PF.projectProgress = function (projectId) {
    var ts = PF.projectTasks(projectId).filter(function (t) { return !t.parentId; });
    if (!ts.length) return 0;
    return Math.round(100 * ts.filter(function (t) { return t.status === "done"; }).length / ts.length);
  };
  PF.visibleTasks = function () {
    var vis = {};
    PF.visibleProjects().forEach(function (p) { vis[p.id] = 1; });
    return PF.db.tasks.filter(function (t) { return vis[t.projectId]; });
  };
  PF.epicsOf = function (projectId) {
    return PF.db.epics.filter(function (e) { return e.projectId === projectId; });
  };
  PF.sprintsOf = function (projectId) {
    return PF.db.sprints.filter(function (s) { return s.projectId === projectId; });
  };
  PF.projectRisk = function (p) {
    var ts = PF.projectTasks(p.id).filter(function (t) { return !t.parentId; });
    var late = ts.filter(PF.isOverdue).length;
    var blocked = ts.filter(function (t) { return t.blockedBy.length && t.status !== "done"; }).length;
    var target = p.targetDate ? PF.daysLeft(p.targetDate) : 99;
    var prog = PF.projectProgress(p.id);
    if (p.status === "done") return { level: "ok", label: "Entregue" };
    if (late >= 3 || (target != null && target < 15 && prog < 60) || blocked >= 2) return { level: "high", label: "Em risco", late: late, blocked: blocked };
    if (late >= 1 || (target != null && target < 30 && prog < 50)) return { level: "mid", label: "Atenção", late: late, blocked: blocked };
    return { level: "ok", label: "Saudável", late: late, blocked: blocked };
  };

  PF.load();
})();
