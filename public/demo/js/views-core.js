/* ============================================================
   ProjectFlow AI — shell + dashboard + projetos + equipes +
   usuários/permissões + configurações
   ============================================================ */
(function () {
  "use strict";
  var h = PF.h, icon = PF.icon;
  PF.ui = PF.ui || {};

  /* ============================ SHELL ============================ */
  var NAV_WORKSPACE = [
    { head: "Workspace" },
    { route: "dashboard", label: "Início", icon: "home" },
    { route: "projects", label: "Meus projetos", icon: "folders" },
    { route: "my-tasks", label: "Minhas tarefas", icon: "tasks", cnt: function () { return PF.db.tasks.filter(function (t) { return t.assigneeId === PF.me().id && t.status !== "done"; }).length; } },
    { route: "teams", label: "Equipes", icon: "users" },
    { head: "Projetos" },
    { route: "board", label: "Kanban", icon: "board" },
    { route: "backlog", label: "Backlog", icon: "backlog" },
    { route: "sprints", label: "Sprints", icon: "sprint" },
    { route: "timeline", label: "Cronograma", icon: "calendar" },
    { head: "Inteligência e integrações" },
    { route: "assistant", label: "Assistente de IA", icon: "sparkle" },
    { route: "mcp", label: "Agentes MCP", icon: "plug" },
    { route: "webhooks", label: "Webhooks", icon: "webhook" },
    { route: "notifications", label: "Notificações", icon: "bell" },
    { head: "Gestão" },
    { route: "access", label: "Usuários e permissões", icon: "shield" },
    { route: "settings", label: "Configurações", icon: "settings" }
  ];
  var NAV_INSIGHTS = [
    { head: "Insights" },
    { route: "insights", label: "Visão executiva", icon: "pulse" },
    { route: "insights/analytics", label: "Análise de projetos", icon: "chart" },
    { route: "insights/audit", label: "Central de auditoria", icon: "scroll" }
  ];

  var DEMO_PROFILES = ["u1", "u2", "u4", "u8", "u18"];

  PF.renderApp = function () {
    var parts = PF.parseHash();
    var key = parts[0] === "insights" && parts[1] ? "insights/" + parts[1] : parts[0];
    var route = PF.routes[key] || PF.routes[parts[0]] || PF.routes.dashboard;
    var app = route.app || "workspace";
    if (PF.db.settings.activeApp !== app) { PF.db.settings.activeApp = app; PF.save(); }

    var root = document.getElementById("app");
    root.replaceChildren();

    var shell = h("div", { class: "shell", dataset: { app: app } });
    shell.appendChild(renderSidebar(app, key));
    var main = h("div", { class: "main" });
    main.appendChild(renderTopbar(route, parts));
    var content = h("div", { class: "content" });
    var page = h("div", { class: "page" + (route.wide ? " wide" : "") });
    content.appendChild(page);
    main.appendChild(content);
    shell.appendChild(main);
    root.appendChild(shell);

    if (route.cap && !PF.can(route.cap)) {
      page.appendChild(PF.ui.noAccess(route.title));
    } else {
      route.render(page, parts.slice(1));
    }
    PF._shell = shell;
  };

  function renderSidebar(app, activeKey) {
    var sb = h("aside", { class: "sidebar" });
    var isInsights = app === "insights";
    sb.appendChild(h("div", { class: "sb-brand" },
      h("span", { class: "sb-logo", "aria-hidden": "true" }, "P"),
      h("span", {}, h("b", {}, "ProjectFlow AI"), h("span", { class: "env" }, isInsights ? "Insights" : "Workspace"))
    ));

    var sw = h("div", { class: "app-switch", role: "tablist", "aria-label": "Alternar aplicação" },
      h("button", { class: !isInsights ? "active" : "", onclick: function () { PF.act.setApp("workspace"); } }, "Workspace"),
      h("button", { class: isInsights ? "active" : "", onclick: function () { PF.act.setApp("insights"); } }, "Insights")
    );
    sb.appendChild(sw);

    var nav = h("nav", { class: "sb-nav", "aria-label": "Navegação principal" });
    var items = isInsights ? NAV_INSIGHTS : NAV_WORKSPACE;
    var section = null;
    items.forEach(function (it) {
      if (it.head) {
        section = h("div", { class: "sb-section" }, h("div", { class: "sb-section-title" }, it.head));
        nav.appendChild(section);
        return;
      }
      var btn = h("button", {
        class: "sb-item" + (activeKey === it.route ? " active" : ""),
        onclick: function () {
          PF.navigate("/" + it.route);
          document.querySelector(".shell") && document.querySelector(".shell").classList.remove("nav-open");
        }
      }, icon(it.icon, 16), h("span", { class: "grow" }, it.label));
      if (it.cnt) {
        var n = it.cnt();
        if (n) btn.appendChild(h("span", { class: "cnt num" }, String(n)));
      }
      (section || nav).appendChild(btn);
    });
    sb.appendChild(nav);

    var me = PF.me();
    sb.appendChild(h("div", { class: "sb-footer" },
      h("button", {
        class: "sb-item", onclick: function () { PF.resetDemo(); }
      }, icon("refresh", 16), h("span", { class: "grow" }, "Restaurar demonstração"))
    ));
    void me;
    return sb;
  }

  function renderTopbar(route, parts) {
    var tb = h("div", { class: "topbar" });
    tb.appendChild(h("button", {
      class: "btn btn-ghost btn-icon tb-burger", "aria-label": "Abrir menu",
      onclick: function () { document.querySelector(".shell").classList.toggle("nav-open"); }
    }, icon("menu")));

    // breadcrumbs
    var crumbs = h("div", { class: "crumbs" });
    var app = route.app || "workspace";
    crumbs.appendChild(h("a", { href: "#/" + (app === "insights" ? "insights" : "dashboard") }, app === "insights" ? "Insights" : "Workspace"));
    crumbs.appendChild(h("span", { class: "sep" }, "/"));
    if (route.crumb) {
      var extra = route.crumb(parts.slice(1));
      if (extra) { crumbs.appendChild(extra.link); crumbs.appendChild(h("span", { class: "sep" }, "/")); crumbs.appendChild(h("span", { class: "cur" }, extra.label)); }
      else crumbs.appendChild(h("span", { class: "cur" }, route.title));
    } else crumbs.appendChild(h("span", { class: "cur" }, route.title));
    tb.appendChild(crumbs);

    tb.appendChild(renderSearch());

    // tema
    var dark = PF.effectiveTheme() === "dark";
    tb.appendChild(h("button", {
      class: "btn btn-ghost btn-icon", "aria-label": dark ? "Mudar para tema claro" : "Mudar para tema escuro",
      "data-tip": dark ? "Tema claro" : "Tema escuro",
      onclick: function () { PF.act.setTheme(dark ? "light" : "dark"); }
    }, icon(dark ? "sun" : "moon")));

    tb.appendChild(renderBell());
    tb.appendChild(renderProfile());
    return tb;
  }

  function renderSearch() {
    var wrap = h("div", { class: "tb-search" });
    var input = h("input", { class: "input", type: "search", placeholder: "Buscar tarefas e projetos…", "aria-label": "Buscar" });
    wrap.appendChild(h("span", { class: "ic" }, icon("search", 14)));
    wrap.appendChild(input);
    var results = null;
    function close() { if (results) { results.remove(); results = null; } }
    input.addEventListener("input", function () {
      close();
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) return;
      var tasks = PF.visibleTasks().filter(function (t) {
        return t.title.toLowerCase().indexOf(q) >= 0 || t.ref.toLowerCase().indexOf(q) >= 0;
      }).slice(0, 6);
      var projs = PF.visibleProjects().filter(function (p) {
        return p.name.toLowerCase().indexOf(q) >= 0 || p.key.toLowerCase().indexOf(q) >= 0;
      }).slice(0, 3);
      results = h("div", { class: "results" });
      if (!tasks.length && !projs.length) results.appendChild(h("div", { class: "menu-head" }, "Nenhum resultado"));
      projs.forEach(function (p) {
        results.appendChild(h("button", {
          class: "menu-item",
          onclick: function () { close(); input.value = ""; PF.navigate("/projects/" + p.id); }
        }, icon("folders", 14), h("span", { class: "grow" }, p.name, h("span", { class: "mi-sub" }, "Projeto · " + p.key))));
      });
      tasks.forEach(function (t) {
        results.appendChild(h("button", {
          class: "menu-item",
          onclick: function () { close(); input.value = ""; PF.ui.openTask(t.id); }
        }, PF.typeIcon(t.type), h("span", { class: "grow" }, t.title, h("span", { class: "mi-sub" }, t.ref + " · " + PF.STATUS_META[t.status].label))));
      });
      wrap.appendChild(results);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); input.blur(); }
      if (e.key === "Enter" && results) {
        var first = results.querySelector(".menu-item");
        if (first) first.click();
      }
    });
    document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) close(); });
    return wrap;
  }

  function renderBell() {
    var me = PF.me();
    var mine = PF.db.notifications.filter(function (n) { return PF.can("user.manage") || n.toUserId === me.id; });
    var unread = mine.slice(0, 5);
    var btn = h("button", { class: "btn btn-ghost btn-icon bell-wrap", "aria-label": "Notificações", "data-tip": "Notificações" }, icon("bell"));
    if (mine.some(function (n) { return n.status === "failed"; })) btn.appendChild(h("span", { class: "notif-dot" }));
    btn.addEventListener("click", function () {
      var items = [{ head: "Notificações recentes" }];
      if (!unread.length) items.push({ label: "Nenhuma notificação", onClick: function () {} });
      unread.forEach(function (n) {
        items.push({
          icon: n.channel === "email" ? "mail" : n.channel === "sms" ? "sms" : "wapp",
          label: n.subject,
          sub: (PF.user(n.toUserId) ? "para " + PF.user(n.toUserId).name + " · " : "") + PF.rel(n.ts) + (n.status === "failed" ? " · FALHOU" : ""),
          onClick: function () { PF.navigate("/notifications"); }
        });
      });
      items.push("sep");
      items.push({ icon: "bell", label: "Ver todas as notificações", onClick: function () { PF.navigate("/notifications"); } });
      PF.menu(btn, items);
    });
    return btn;
  }

  function renderProfile() {
    var me = PF.me();
    var btn = h("button", { class: "profile-btn", "aria-label": "Trocar perfil de demonstração" },
      PF.avatarEl(me),
      h("span", { class: "who" }, h("b", {}, me.name), h("span", {}, PF.roleName(me.roleId))),
      icon("chevD", 13)
    );
    btn.addEventListener("click", function () {
      var items = [{ head: "Perfis de demonstração" }];
      DEMO_PROFILES.forEach(function (uid) {
        var u = PF.user(uid);
        items.push({
          node: PF.avatarEl(u, "sm"),
          label: u.name,
          sub: PF.roleName(u.roleId) + " · " + u.title,
          checked: u.id === me.id,
          onClick: function () { PF.act.setProfile(u.id); }
        });
      });
      items.push("sep");
      items.push({ head: "Outros usuários" });
      PF.db.users.filter(function (u) { return DEMO_PROFILES.indexOf(u.id) < 0 && !u.invited; }).slice(0, 5).forEach(function (u) {
        items.push({
          node: PF.avatarEl(u, "sm"), label: u.name, sub: PF.roleName(u.roleId),
          checked: u.id === me.id,
          onClick: function () { PF.act.setProfile(u.id); }
        });
      });
      PF.menu(btn, items);
    });
    return btn;
  }

  PF.ui.noAccess = function (what) {
    return PF.emptyState("block", "Acesso restrito",
      "O perfil “" + PF.roleName(PF.me().roleId) + "” não tem acesso a " + (what || "esta área") + ". Troque o perfil no canto superior direito para experimentar.",
      h("button", { class: "btn", onclick: function () { PF.navigate("/dashboard"); } }, "Voltar ao início"));
  };

  PF.ui.pageHead = function (title, sub, actions) {
    var head = h("div", { class: "page-head" },
      h("div", {}, h("h1", {}, title), sub ? h("div", { class: "sub" }, sub) : null));
    if (actions) {
      var pa = h("div", { class: "page-actions" });
      (Array.isArray(actions) ? actions : [actions]).forEach(function (a) { if (a) pa.appendChild(a); });
      head.appendChild(pa);
    }
    return head;
  };

  /* ============================ DASHBOARD ============================ */
  var dashF = { period: 30, projectId: "", teamId: "", assigneeId: "" };

  PF.routes.dashboard = {
    title: "Início", app: "workspace",
    render: function (page) {
      var me = PF.me();
      var projects = PF.visibleProjects();

      var actions = [];
      if (PF.can("task.create")) actions.push(h("button", { class: "btn", onclick: function () { PF.ui.taskModal(); } }, icon("plus", 14), "Nova tarefa"));
      if (PF.can("project.create")) actions.push(h("button", { class: "btn btn-primary", onclick: function () { PF.ui.projectModal(); } }, icon("plus", 14), "Novo projeto"));
      page.appendChild(PF.ui.pageHead("Bom dia, " + me.name.split(" ")[0],
        "Visão operacional de " + projects.length + " projeto(s) visíveis para o seu perfil.", actions));

      // filtros
      var fbar = h("div", { class: "fbar" });
      fbar.appendChild(PF.select([
        { value: "7", label: "Últimos 7 dias" }, { value: "14", label: "Últimos 14 dias" },
        { value: "30", label: "Últimos 30 dias" }, { value: "90", label: "Últimos 90 dias" }
      ], String(dashF.period), function (v) { dashF.period = +v; PF.refresh(); }, { "aria-label": "Período" }));
      fbar.appendChild(PF.select([{ value: "", label: "Todos os projetos" }].concat(projects.map(function (p) { return { value: p.id, label: p.name }; })),
        dashF.projectId, function (v) { dashF.projectId = v; PF.refresh(); }, { "aria-label": "Projeto" }));
      fbar.appendChild(PF.select([{ value: "", label: "Todas as equipes" }].concat(PF.db.teams.map(function (t) { return { value: t.id, label: t.name }; })),
        dashF.teamId, function (v) { dashF.teamId = v; PF.refresh(); }, { "aria-label": "Equipe" }));
      fbar.appendChild(PF.select([{ value: "", label: "Todos os responsáveis" }].concat(PF.db.users.filter(function (u) { return !u.invited; }).map(function (u) { return { value: u.id, label: u.name }; })),
        dashF.assigneeId, function (v) { dashF.assigneeId = v; PF.refresh(); }, { "aria-label": "Responsável" }));
      if (dashF.projectId || dashF.teamId || dashF.assigneeId) {
        fbar.appendChild(h("button", { class: "btn btn-ghost btn-sm clear-f", onclick: function () { dashF.projectId = dashF.teamId = dashF.assigneeId = ""; PF.refresh(); } }, icon("x", 12), "Limpar filtros"));
      }
      page.appendChild(fbar);

      // universo filtrado
      var visIds = {}; projects.forEach(function (p) { visIds[p.id] = 1; });
      var tasks = PF.db.tasks.filter(function (t) {
        if (!visIds[t.projectId] || t.parentId) return false;
        if (dashF.projectId && t.projectId !== dashF.projectId) return false;
        if (dashF.teamId && t.teamId !== dashF.teamId) return false;
        if (dashF.assigneeId && t.assigneeId !== dashF.assigneeId) return false;
        return true;
      });
      var cutoff = Date.now() - dashF.period * 86400000;

      var activeProjects = projects.filter(function (p) { return p.status === "active" && (!dashF.projectId || p.id === dashF.projectId); });
      var myOpen = tasks.filter(function (t) { return t.assigneeId === me.id && t.status !== "done"; });
      var late = tasks.filter(PF.isOverdue);
      var next7 = tasks.filter(function (t) { var d = PF.daysLeft(t.dueDate); return t.status !== "done" && d != null && d >= 0 && d <= 7; });
      var activeSprints = PF.db.sprints.filter(function (s) { return s.status === "active" && visIds[s.projectId] && (!dashF.projectId || s.projectId === dashF.projectId); });
      var doneInPeriod = tasks.filter(function (t) { return t.status === "done" && new Date(t.updatedAt).getTime() >= cutoff; });

      var strip = h("div", { class: "stat-strip", style: "margin-bottom:14px" });
      function stat(lbl, val, ctx, ctxClass, onclick) {
        var s = h("div", { class: "stat" + (onclick ? " clickable" : ""), onclick: onclick },
          h("div", { class: "lbl" }, lbl), h("div", { class: "val" }, String(val)),
          ctx ? h("div", { class: "ctx " + (ctxClass || "") }, ctx) : null);
        strip.appendChild(s);
      }
      stat("Projetos ativos", activeProjects.length, projects.filter(function (p) { return PF.projectRisk(p).level === "high"; }).length + " em risco", "bad", function () { PF.navigate("/projects"); });
      stat("Minhas tarefas abertas", myOpen.length, myOpen.filter(PF.isOverdue).length + " atrasadas", myOpen.filter(PF.isOverdue).length ? "bad" : "", function () { PF.navigate("/my-tasks"); });
      stat("Tarefas atrasadas", late.length, "no recorte atual", late.length ? "bad" : "good");
      stat("Entregas em 7 dias", next7.length, "com prazo definido");
      stat("Concluídas no período", doneInPeriod.length, "últimos " + dashF.period + " dias", "good");
      page.appendChild(strip);

      var grid = h("div", { class: "grid c2-1" });
      var colL = h("div", { class: "grid", style: "align-content:start" });
      var colR = h("div", { class: "grid", style: "align-content:start" });
      grid.append(colL, colR);
      page.appendChild(grid);

      // minhas tarefas
      var pMine = h("div", { class: "panel" });
      pMine.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Minhas tarefas"), h("span", { class: "spacer" }),
        h("button", { class: "btn btn-ghost btn-sm", onclick: function () { PF.navigate("/my-tasks"); } }, "Ver todas", icon("arrowR", 12))));
      var mineList = h("div", { class: "panel-body flush" });
      if (!myOpen.length) mineList.appendChild(PF.emptyState("tasks", "Nada atribuído a você", "Tarefas atribuídas ao seu perfil aparecem aqui."));
      else myOpen.sort(function (a, b) { return (a.dueDate || "9") < (b.dueDate || "9") ? -1 : 1; }).slice(0, 6).forEach(function (t) {
        mineList.appendChild(taskRow(t));
      });
      pMine.appendChild(mineList);
      colL.appendChild(pMine);

      // próximas entregas
      var pNext = h("div", { class: "panel" });
      pNext.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Próximas entregas"), h("span", { class: "spacer" }),
        h("span", { class: "chip" }, next7.length + " em 7 dias")));
      var nextBody = h("div", { class: "panel-body flush" });
      var upcoming = tasks.filter(function (t) { return t.status !== "done" && t.dueDate && PF.daysLeft(t.dueDate) >= -30; })
        .sort(function (a, b) { return a.dueDate < b.dueDate ? -1 : 1; }).slice(0, 6);
      if (!upcoming.length) nextBody.appendChild(PF.emptyState("calendar", "Sem prazos no recorte", "Defina datas de vencimento nas tarefas para acompanhá-las aqui."));
      else upcoming.forEach(function (t) { nextBody.appendChild(taskRow(t, true)); });
      pNext.appendChild(nextBody);
      colL.appendChild(pNext);

      // atividades recentes
      var pAct = h("div", { class: "panel" });
      pAct.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Atividades recentes"), h("span", { class: "spacer" }),
        PF.can("audit.view") ? h("button", { class: "btn btn-ghost btn-sm", onclick: function () { PF.navigate("/insights/audit"); } }, "Auditoria", icon("arrowR", 12)) : null));
      var actBody = h("div", { class: "panel-body" });
      var acts = PF.db.audit.filter(function (a) {
        if (a.projectId && !visIds[a.projectId]) return false;
        if (dashF.projectId && a.projectId !== dashF.projectId) return false;
        return new Date(a.ts).getTime() >= cutoff && a.action !== "denied";
      }).slice(0, 8);
      if (!acts.length) actBody.appendChild(h("p", { class: "muted" }, "Nenhuma atividade no período."));
      acts.forEach(function (a) {
        var u = PF.user(a.userId);
        actBody.appendChild(h("div", { class: "hist-item" },
          PF.avatarEl(u, "sm"),
          h("span", {}, h("b", {}, u ? u.name : "?"), " " + a.summary),
          h("time", {}, PF.rel(a.ts))));
      });
      pAct.appendChild(actBody);
      colL.appendChild(pAct);

      // sprints ativas
      var pSpr = h("div", { class: "panel" });
      pSpr.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Sprints ativas"), h("span", { class: "spacer" }),
        h("button", { class: "btn btn-ghost btn-sm", onclick: function () { PF.navigate("/sprints"); } }, "Sprints", icon("arrowR", 12))));
      var sprBody = h("div", { class: "panel-body" });
      if (!activeSprints.length) sprBody.appendChild(h("p", { class: "muted" }, "Nenhuma sprint ativa no recorte."));
      activeSprints.forEach(function (s) {
        var st = PF.db.tasks.filter(function (t) { return t.sprintId === s.id && !t.parentId; });
        var done = st.filter(function (t) { return t.status === "done"; }).length;
        var pct = st.length ? Math.round(100 * done / st.length) : 0;
        sprBody.appendChild(h("div", { style: "margin-bottom:12px" },
          h("div", { style: "display:flex;gap:8px;align-items:baseline;margin-bottom:4px" },
            h("b", {}, s.name), h("span", { class: "subtle", style: "font-size:11px" }, PF.project(s.projectId).name),
            h("span", { class: "grow" }), h("span", { class: "num muted", style: "font-size:12px" }, done + "/" + st.length)),
          PF.progressBar(pct, pct === 100),
          h("div", { class: "subtle", style: "font-size:11px;margin-top:3px" }, "termina " + PF.fmtDate(s.endDate))));
      });
      pSpr.appendChild(sprBody);
      colR.appendChild(pSpr);

      // favoritos
      var favs = projects.filter(function (p) { return p.favorite; });
      var pFav = h("div", { class: "panel" });
      pFav.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Projetos favoritos")));
      var favBody = h("div", { class: "panel-body flush" });
      if (!favs.length) favBody.appendChild(h("div", { class: "panel-body" }, h("p", { class: "muted", style: "margin:0" }, "Marque projetos com a estrela para fixá-los aqui.")));
      favs.forEach(function (p) {
        var prog = PF.projectProgress(p.id);
        favBody.appendChild(h("button", {
          class: "menu-item", style: "border-radius:0;padding:10px 14px",
          onclick: function () { PF.navigate("/projects/" + p.id); }
        },
          h("span", { class: "dot", style: "background:" + p.color }),
          h("span", { class: "grow" }, p.name, h("span", { class: "mi-sub" }, p.key + " · " + prog + "% concluído")),
          icon("chevR", 14)));
      });
      pFav.appendChild(favBody);
      colR.appendChild(pFav);

      // resumo por equipe
      var pTeam = h("div", { class: "panel" });
      pTeam.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Resumo por equipe")));
      var tt = h("table", { class: "tbl" },
        h("thead", {}, h("tr", {}, h("th", {}, "Equipe"), h("th", { class: "num" }, "Abertas"), h("th", { class: "num" }, "Atrasadas"))));
      var tb = h("tbody");
      PF.db.teams.forEach(function (tm) {
        var tms = tasks.filter(function (t) { return t.teamId === tm.id && t.status !== "done"; });
        if (!tms.length && dashF.teamId && dashF.teamId !== tm.id) return;
        var lateN = tms.filter(PF.isOverdue).length;
        tb.appendChild(h("tr", {},
          h("td", {}, tm.name),
          h("td", { class: "num" }, String(tms.length)),
          h("td", { class: "num" }, lateN ? h("span", { style: "color:var(--danger);font-weight:600" }, String(lateN)) : "0")));
      });
      tt.appendChild(tb);
      pTeam.appendChild(h("div", { class: "tbl-wrap" }, tt));
      colR.appendChild(pTeam);
    }
  };

  function taskRow(t, withDue) {
    var due = PF.daysLeft(t.dueDate);
    var row = h("button", {
      class: "menu-item", style: "border-radius:0;padding:9px 14px;border-bottom:1px solid var(--border)",
      onclick: function () { PF.ui.openTask(t.id); }
    },
      PF.statusIcon(t.status),
      PF.typeIcon(t.type),
      h("span", { class: "grow" }, t.title,
        h("span", { class: "mi-sub" }, t.ref + " · " + PF.project(t.projectId).name +
          (withDue && t.dueDate ? " · vence " + PF.fmtDate(t.dueDate) : ""))),
      PF.isOverdue(t) ? h("span", { class: "chip danger" }, "atrasada") : null,
      PF.prioChip(t.priority, true),
      PF.avatarEl(PF.user(t.assigneeId), "sm"));
    return row;
  }
  PF.ui.taskRow = taskRow;

  /* ============================ PROJETOS ============================ */
  var projF = { q: "", status: "" };

  PF.routes.projects = {
    title: "Projetos", app: "workspace",
    crumb: function (parts) {
      if (parts[0]) { var p = PF.project(parts[0]); if (p) return { link: h("a", { href: "#/projects" }, "Projetos"), label: p.name }; }
      return null;
    },
    render: function (page, params) {
      if (params[0]) return renderProjectDetail(page, params[0], params[1]);

      page.appendChild(PF.ui.pageHead("Projetos", "Projetos visíveis para o perfil atual, com progresso e risco.",
        PF.can("project.create") ? h("button", { class: "btn btn-primary", onclick: function () { PF.ui.projectModal(); } }, icon("plus", 14), "Novo projeto") : null));

      var fbar = h("div", { class: "fbar" });
      var qIn = h("input", { class: "input search", type: "search", placeholder: "Buscar por nome ou chave…", value: projF.q, "aria-label": "Buscar projetos" });
      qIn.addEventListener("input", function () { projF.q = qIn.value; renderList(); });
      fbar.appendChild(qIn);
      fbar.appendChild(PF.select([
        { value: "", label: "Todos os status" }, { value: "active", label: "Ativo" },
        { value: "paused", label: "Pausado" }, { value: "done", label: "Concluído" }
      ], projF.status, function (v) { projF.status = v; renderList(); }, { "aria-label": "Status" }));
      page.appendChild(fbar);

      var holder = h("div");
      page.appendChild(holder);

      function renderList() {
        holder.replaceChildren();
        var list = PF.visibleProjects().filter(function (p) {
          if (projF.status && p.status !== projF.status) return false;
          var q = projF.q.trim().toLowerCase();
          if (q && p.name.toLowerCase().indexOf(q) < 0 && p.key.toLowerCase().indexOf(q) < 0) return false;
          return true;
        });
        if (!list.length) { holder.appendChild(PF.emptyState("folders", "Nenhum projeto encontrado", "Ajuste os filtros ou crie um novo projeto.")); return; }

        var tbl = h("table", { class: "tbl" },
          h("thead", {}, h("tr", {},
            h("th", { style: "width:30px" }), h("th", {}, "Projeto"), h("th", {}, "Status"),
            h("th", {}, "Prioridade"), h("th", {}, "Progresso"), h("th", {}, "Equipes"),
            h("th", {}, "Responsável"), h("th", {}, "Entrega"), h("th", {}, "Risco"), h("th", { class: "actions-col" }, ""))));
        var tb = h("tbody");
        list.forEach(function (p) {
          var prog = PF.projectProgress(p.id);
          var risk = PF.projectRisk(p);
          var starBtn = h("button", {
            class: "btn btn-ghost btn-icon btn-sm", "aria-label": p.favorite ? "Remover dos favoritos" : "Favoritar",
            onclick: function (e) { e.stopPropagation(); PF.act.toggleFavorite(p.id); }
          }, icon("star", 14));
          if (p.favorite) starBtn.style.color = "var(--warn)";
          var row = h("tr", { class: "row-click", onclick: function () { PF.navigate("/projects/" + p.id); } },
            h("td", {}, starBtn),
            h("td", {}, h("div", { style: "display:flex;gap:8px;align-items:center" },
              h("span", { class: "dot", style: "background:" + p.color }),
              h("div", {}, h("b", {}, p.name), h("div", { class: "mono subtle" }, p.key)))),
            h("td", {}, statusChipProject(p)),
            h("td", {}, PF.prioChip(p.priority)),
            h("td", {}, h("div", { style: "display:flex;gap:8px;align-items:center" }, PF.progressBar(prog, prog === 100), h("span", { class: "num muted", style: "font-size:11.5px" }, prog + "%"))),
            h("td", {}, h("span", { class: "avatar-stack" }, p.teamIds.slice(0, 3).map(function (tid) {
              var tm = PF.team(tid);
              var a = h("span", { class: "avatar sm", "data-tip": tm ? tm.name : "" }, tm ? tm.name.slice(0, 2).toUpperCase() : "?");
              a.style.setProperty("--av", "var(--ink-3)");
              return a;
            }))),
            h("td", {}, PF.whoCell(p.leadId)),
            h("td", { class: "nowrap" }, PF.fmtDate(p.targetDate)),
            h("td", {}, riskChip(risk)),
            h("td", { class: "actions-col" }, projectMenuBtn(p)));
          tb.appendChild(row);
        });
        tbl.appendChild(tb);
        holder.appendChild(h("div", { class: "panel" }, h("div", { class: "tbl-wrap" }, tbl)));
      }
      renderList();
    }
  };

  function statusChipProject(p) {
    var map = { active: ["accent", "Ativo"], paused: ["warn", "Pausado"], done: ["ok", "Concluído"], archived: ["", "Arquivado"] };
    var m = map[p.status] || map.active;
    return h("span", { class: "chip " + m[0] }, m[1]);
  }
  function riskChip(risk) {
    var cls = risk.level === "high" ? "danger" : risk.level === "mid" ? "warn" : "ok";
    return h("span", { class: "chip " + cls }, risk.label);
  }
  PF.ui.riskChip = riskChip;

  function projectMenuBtn(p) {
    var btn = h("button", { class: "btn btn-ghost btn-icon btn-sm", "aria-label": "Ações do projeto", onclick: function (e) { e.stopPropagation(); } }, icon("dots", 15));
    btn.addEventListener("click", function () {
      var items = [
        { icon: "external", label: "Abrir projeto", onClick: function () { PF.navigate("/projects/" + p.id); } },
        { icon: "board", label: "Abrir Kanban", onClick: function () { PF.act.setCurrentProject(p.id); PF.navigate("/board"); } }
      ];
      if (PF.can("project.edit")) items.push({ icon: "edit", label: "Editar", onClick: function () { PF.ui.projectModal(p); } });
      if (PF.can("project.archive")) items.push({ icon: "archive", label: "Arquivar", onClick: function () {
        PF.confirm({ title: "Arquivar projeto", msg: "O projeto “" + p.name + "” sai das listagens ativas. É possível restaurá-lo depois (simulação).", confirmLabel: "Arquivar" })
          .then(function (ok) { if (ok) PF.act.archiveProject(p.id); });
      } });
      if (PF.can("project.delete")) {
        items.push("sep");
        items.push({ icon: "trash", label: "Excluir…", danger: true, onClick: function () {
          PF.confirm({ title: "Excluir projeto", msg: "Isso remove “" + p.name + "” e todas as suas tarefas nesta demonstração. Essa ação não pode ser desfeita.", confirmLabel: "Excluir definitivamente", danger: true })
            .then(function (ok) { if (ok) PF.act.deleteProject(p.id); });
        } });
      }
      PF.menu(btn, items);
    });
    return btn;
  }

  PF.ui.projectModal = function (existing) {
    if (!PF.can(existing ? "project.edit" : "project.create")) { PF.deny(existing ? "editar projetos" : "criar projetos"); return; }
    var f = {
      name: h("input", { class: "input", value: existing ? existing.name : "", maxlength: "80" }),
      key: h("input", { class: "input mono", value: existing ? existing.key : "", maxlength: "4", placeholder: "ex.: PCL", disabled: !!existing }),
      desc: h("textarea", { class: "textarea" }, existing ? existing.desc : ""),
      priority: PF.select(PF.PRIORITIES.map(function (p) { return { value: p, label: PF.PRIO_META[p].label }; }), existing ? existing.priority : "medium"),
      lead: PF.select(PF.db.users.filter(function (u) { return ["admin", "pm", "lead"].indexOf(u.roleId) >= 0; }).map(function (u) { return { value: u.id, label: u.name }; }), existing ? existing.leadId : PF.me().id),
      start: h("input", { class: "input", type: "date", value: existing ? existing.startDate : new Date().toISOString().slice(0, 10) }),
      target: h("input", { class: "input", type: "date", value: existing && existing.targetDate ? existing.targetDate : "" }),
      status: PF.select([{ value: "active", label: "Ativo" }, { value: "paused", label: "Pausado" }, { value: "done", label: "Concluído" }], existing ? existing.status : "active")
    };
    var teamBoxes = PF.db.teams.map(function (tm) {
      var cb = h("input", { type: "checkbox" });
      cb.checked = existing ? existing.teamIds.indexOf(tm.id) >= 0 : false;
      cb.dataset.team = tm.id;
      return h("label", { class: "check" }, cb, h("span", {}, tm.name, h("span", { class: "subtle" }, " — " + tm.desc)));
    });

    var form = h("div", { class: "form-grid" },
      PF.field("Nome do projeto", f.name, { span2: true }),
      PF.field("Chave", f.key, { hint: "2 a 4 letras usadas nos identificadores (ex.: PCL-124)" }),
      PF.field("Prioridade", f.priority),
      PF.field("Responsável", f.lead),
      existing ? PF.field("Status", f.status) : h("span"),
      PF.field("Início", f.start),
      PF.field("Entrega prevista", f.target),
      PF.field("Descrição", f.desc, { span2: true }),
      h("div", { class: "field span2" }, h("label", {}, "Equipes associadas"), h("div", {}, teamBoxes))
    );

    PF.modal({
      title: existing ? "Editar projeto" : "Novo projeto",
      wide: true,
      body: form,
      foot: [
        h("button", { class: "btn", onclick: PF.closeOverlays }, "Cancelar"),
        h("button", {
          class: "btn btn-primary", onclick: function () {
            PF.clearInvalid(form);
            var ok = true;
            if (!f.name.value.trim()) { PF.setInvalid(f.name.closest(".field"), "Informe o nome do projeto"); ok = false; }
            var key = f.key.value.trim().toUpperCase();
            if (!existing) {
              if (!/^[A-Z]{2,4}$/.test(key)) { PF.setInvalid(f.key.closest(".field"), "Use 2 a 4 letras"); ok = false; }
              else if (PF.db.projects.some(function (p) { return p.key === key; })) { PF.setInvalid(f.key.closest(".field"), "Chave já usada por outro projeto"); ok = false; }
            }
            var teams = teamBoxes.filter(function (l) { return l.querySelector("input").checked; }).map(function (l) { return l.querySelector("input").dataset.team; });
            if (!ok) return;
            var fields = {
              name: f.name.value.trim(), desc: f.desc.value.trim(), priority: f.priority.value,
              leadId: f.lead.value, startDate: f.start.value, targetDate: f.target.value || null, teamIds: teams
            };
            if (existing) { fields.status = f.status.value; PF.act.updateProject(existing.id, fields); }
            else { fields.key = key; var p = PF.act.createProject(fields); if (p) { PF.closeOverlays(); PF.navigate("/projects/" + p.id); return; } }
            PF.closeOverlays();
          }
        }, existing ? "Salvar alterações" : "Criar projeto")
      ]
    });
  };

  function renderProjectDetail(page, id, tab) {
    var p = PF.project(id);
    if (!p || !PF.canSeeProject(id)) { page.appendChild(PF.ui.noAccess("este projeto")); return; }
    tab = tab || "overview";
    var tasks = PF.projectTasks(id).filter(function (t) { return !t.parentId; });
    var prog = PF.projectProgress(id);
    var risk = PF.projectRisk(p);

    var actions = [
      h("button", { class: "btn", onclick: function () { PF.act.setCurrentProject(p.id); PF.navigate("/board"); } }, icon("board", 14), "Kanban"),
      PF.can("task.create") ? h("button", { class: "btn btn-primary", onclick: function () { PF.ui.taskModal({ projectId: p.id }); } }, icon("plus", 14), "Nova tarefa") : null,
      projectMenuBtn(p)
    ];
    var head = PF.ui.pageHead(p.name, p.desc, actions);
    page.appendChild(head);

    var meta = h("div", { class: "fbar", style: "gap:10px" },
      statusChipProject(p), PF.prioChip(p.priority), riskChip(risk),
      h("span", { class: "chip" }, h("span", { class: "mono" }, p.key)),
      h("span", { class: "muted", style: "font-size:12px" }, "Início " + PF.fmtDate(p.startDate) + " · Entrega " + PF.fmtDate(p.targetDate)),
      h("span", { style: "display:flex;gap:8px;align-items:center" }, PF.progressBar(prog, prog === 100), h("span", { class: "num muted", style: "font-size:12px" }, prog + "%")));
    page.appendChild(meta);

    var tabs = h("div", { class: "tabs", role: "tablist" });
    [["overview", "Visão geral"], ["tasks", "Tarefas (" + tasks.length + ")"], ["members", "Membros"], ["settings", "Configurações"]].forEach(function (tp) {
      tabs.appendChild(h("button", {
        class: "tab" + (tab === tp[0] ? " active" : ""), role: "tab",
        onclick: function () { PF.navigate("/projects/" + id + "/" + tp[0]); }
      }, tp[1]));
    });
    page.appendChild(tabs);

    if (tab === "overview") {
      var grid = h("div", { class: "grid c2" });
      // épicos
      var pe = h("div", { class: "panel" });
      pe.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Épicos"), h("span", { class: "spacer" }),
        PF.can("task.create") ? h("button", { class: "btn btn-sm", onclick: function () { epicModal(p); } }, icon("plus", 12), "Épico") : null));
      var peB = h("div", { class: "panel-body" });
      var eps = PF.epicsOf(id);
      if (!eps.length) peB.appendChild(h("p", { class: "muted" }, "Nenhum épico neste projeto."));
      eps.forEach(function (ep) {
        var epTasks = tasks.filter(function (t) { return t.epicId === ep.id; });
        var epDone = epTasks.filter(function (t) { return t.status === "done"; }).length;
        var pct = epTasks.length ? Math.round(100 * epDone / epTasks.length) : 0;
        peB.appendChild(h("div", { style: "margin-bottom:12px" },
          h("div", { style: "display:flex;gap:7px;align-items:center;margin-bottom:4px" },
            PF.typeIcon("epic"), h("b", {}, ep.name), h("span", { class: "grow" }),
            h("span", { class: "num muted", style: "font-size:11.5px" }, epDone + "/" + epTasks.length)),
          PF.progressBar(pct, pct === 100),
          h("div", { class: "subtle", style: "font-size:11.5px;margin-top:3px" }, ep.desc)));
      });
      pe.appendChild(peB);
      grid.appendChild(pe);

      // marcos + atividade
      var right = h("div", { class: "grid", style: "align-content:start" });
      var pm = h("div", { class: "panel" });
      pm.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Marcos de entrega")));
      var pmB = h("div", { class: "panel-body" });
      var mss = PF.db.milestones.filter(function (m) { return m.projectId === id; });
      if (!mss.length) pmB.appendChild(h("p", { class: "muted" }, "Nenhum marco cadastrado."));
      mss.forEach(function (m) {
        var late = m.status !== "done" && PF.daysLeft(m.date) < 0;
        pmB.appendChild(h("div", { class: "hist-item" },
          h("span", { style: "color:" + (m.status === "done" ? "var(--ok)" : late ? "var(--danger)" : "var(--violet)") }, icon("target", 15)),
          h("span", { class: "grow" }, m.name),
          m.status === "done" ? h("span", { class: "chip ok" }, "entregue") : late ? h("span", { class: "chip danger" }, "atrasado") : null,
          h("time", {}, PF.fmtDate(m.date))));
      });
      pm.appendChild(pmB);
      right.appendChild(pm);

      var pa = h("div", { class: "panel" });
      pa.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Atividade do projeto")));
      var paB = h("div", { class: "panel-body" });
      PF.db.audit.filter(function (a) { return a.projectId === id && a.action !== "denied"; }).slice(0, 7).forEach(function (a) {
        var u = PF.user(a.userId);
        paB.appendChild(h("div", { class: "hist-item" },
          PF.avatarEl(u, "sm"), h("span", {}, h("b", {}, u ? u.name : "?"), " " + a.summary), h("time", {}, PF.rel(a.ts))));
      });
      pa.appendChild(paB);
      right.appendChild(pa);
      grid.appendChild(right);
      page.appendChild(grid);
    }

    if (tab === "tasks") PF.ui.renderTaskTable(page, { projectId: id });

    if (tab === "members") {
      var grid2 = h("div", { class: "grid c2" });
      p.teamIds.forEach(function (tid) {
        var tm = PF.team(tid);
        if (!tm) return;
        var card = h("div", { class: "panel" });
        card.appendChild(h("div", { class: "panel-head" }, h("h3", {}, tm.name), h("span", { class: "spacer" }), h("span", { class: "chip" }, tm.memberIds.length + " pessoas")));
        var cb = h("div", { class: "panel-body" });
        tm.memberIds.forEach(function (uid) {
          var u = PF.user(uid);
          if (!u) return;
          cb.appendChild(h("div", { class: "hist-item" },
            PF.avatarEl(u, "sm"),
            h("span", { class: "grow" }, u.name, h("span", { class: "subtle" }, " — " + u.title)),
            tm.leadId === u.id ? h("span", { class: "chip accent" }, "líder") : null,
            h("span", { class: "chip" }, PF.roleName(u.roleId))));
        });
        card.appendChild(cb);
        grid2.appendChild(card);
      });
      if (!p.teamIds.length) grid2.appendChild(PF.emptyState("users", "Sem equipes associadas", "Edite o projeto para associar equipes."));
      page.appendChild(grid2);
      page.appendChild(h("p", { class: "subtle", style: "margin-top:10px;font-size:12px" },
        "Uma pessoa pode pertencer a mais de uma equipe e ter papéis de acesso diferentes. O papel (coluna à direita) define o que ela pode fazer; o cargo descreve a função."));
    }

    if (tab === "settings") {
      if (!PF.can("project.edit")) { page.appendChild(PF.ui.noAccess("configurações do projeto")); return; }
      var pset = h("div", { class: "panel", style: "max-width:720px" });
      pset.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Configurações do projeto")));
      var pb = h("div", { class: "panel-body" });
      pb.appendChild(h("p", { class: "muted" }, "Edite nome, descrição, datas, prioridade e equipes."));
      pb.appendChild(h("button", { class: "btn", onclick: function () { PF.ui.projectModal(p); } }, icon("edit", 14), "Editar projeto"));
      pset.appendChild(pb);
      page.appendChild(pset);

      var danger = h("div", { class: "panel", style: "max-width:720px;margin-top:14px;border-color:var(--danger)" });
      danger.appendChild(h("div", { class: "panel-head" }, h("h3", { style: "color:var(--danger)" }, "Zona de risco")));
      var db2 = h("div", { class: "panel-body" },
        h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" },
          h("button", { class: "btn", onclick: function () {
            PF.confirm({ title: "Arquivar projeto", msg: "O projeto sai das listagens ativas.", confirmLabel: "Arquivar" }).then(function (ok) { if (ok) PF.act.archiveProject(p.id); });
          } }, icon("archive", 14), "Arquivar projeto"),
          PF.can("project.delete") ? h("button", { class: "btn btn-danger", onclick: function () {
            PF.confirm({ title: "Excluir projeto", msg: "Remove o projeto e todas as tarefas (simulação). Não pode ser desfeito.", confirmLabel: "Excluir definitivamente", danger: true }).then(function (ok) { if (ok) PF.act.deleteProject(p.id); });
          } }, icon("trash", 14), "Excluir projeto") : null));
      danger.appendChild(db2);
      page.appendChild(danger);
    }
  }

  function epicModal(project) {
    var name = h("input", { class: "input", maxlength: "70" });
    var desc = h("textarea", { class: "textarea" });
    var form = h("div", {}, PF.field("Nome do épico", name), PF.field("Descrição", desc));
    PF.modal({
      title: "Novo épico em " + project.name,
      body: form,
      foot: [
        h("button", { class: "btn", onclick: PF.closeOverlays }, "Cancelar"),
        h("button", { class: "btn btn-primary", onclick: function () {
          PF.clearInvalid(form);
          if (!name.value.trim()) { PF.setInvalid(name.closest(".field"), "Informe o nome"); return; }
          PF.act.createEpic(project.id, { name: name.value.trim(), desc: desc.value.trim() });
          PF.closeOverlays(); PF.refresh();
          PF.toast("Épico criado", name.value.trim(), "ok");
        } }, "Criar épico")
      ]
    });
  }

  /* ============================ EQUIPES ============================ */
  PF.routes.teams = {
    title: "Equipes", app: "workspace",
    render: function (page) {
      page.appendChild(PF.ui.pageHead("Equipes", "Organização, liderança e integrantes. Uma pessoa pode estar em várias equipes.",
        PF.can("user.manage") ? h("button", { class: "btn btn-primary", onclick: teamModal }, icon("plus", 14), "Nova equipe") : null));

      var grid = h("div", { class: "grid c3" });
      PF.db.teams.forEach(function (tm) {
        var open = PF.db.tasks.filter(function (t) { return t.teamId === tm.id && t.status !== "done" && !t.parentId; });
        var late = open.filter(PF.isOverdue).length;
        var org = PF.byId("orgs", tm.orgId);
        var card = h("div", { class: "panel" });
        card.appendChild(h("div", { class: "panel-head" },
          h("h3", {}, tm.name), h("span", { class: "spacer" }),
          h("span", { class: "chip" }, org ? org.name : "")));
        var body = h("div", { class: "panel-body" },
          h("p", { class: "muted", style: "font-size:12px" }, tm.desc),
          h("div", { style: "display:flex;gap:8px;align-items:center;margin-bottom:10px" },
            h("span", { class: "avatar-stack" }, tm.memberIds.slice(0, 6).map(function (uid) { return PF.avatarEl(PF.user(uid), "sm"); })),
            h("span", { class: "subtle", style: "font-size:11.5px" }, tm.memberIds.length + " integrantes")),
          h("div", { style: "display:flex;gap:12px;font-size:12px" },
            h("span", { class: "muted" }, h("b", { class: "num" }, String(open.length)), " abertas"),
            late ? h("span", { style: "color:var(--danger)" }, h("b", { class: "num" }, String(late)), " atrasadas") : null),
          h("div", { style: "margin-top:12px" },
            h("button", { class: "btn btn-sm", onclick: function () { teamDrawer(tm.id); } }, "Gerenciar integrantes")));
        card.appendChild(body);
        grid.appendChild(card);
      });
      page.appendChild(grid);
    }
  };

  function teamModal() {
    if (!PF.guard("user.manage", "criar equipes")) return;
    var name = h("input", { class: "input", maxlength: "40" });
    var desc = h("input", { class: "input", maxlength: "90" });
    var lead = PF.select([{ value: "", label: "Sem líder definido" }].concat(PF.db.users.filter(function (u) { return !u.invited; }).map(function (u) { return { value: u.id, label: u.name }; })), "");
    var form = h("div", {}, PF.field("Nome da equipe", name), PF.field("Descrição", desc), PF.field("Líder", lead));
    PF.modal({
      title: "Nova equipe", body: form,
      foot: [
        h("button", { class: "btn", onclick: PF.closeOverlays }, "Cancelar"),
        h("button", { class: "btn btn-primary", onclick: function () {
          PF.clearInvalid(form);
          if (!name.value.trim()) { PF.setInvalid(name.closest(".field"), "Informe o nome"); return; }
          PF.act.createTeam({ name: name.value.trim(), desc: desc.value.trim(), leadId: lead.value || null });
          PF.closeOverlays();
        } }, "Criar equipe")
      ]
    });
  }

  function teamDrawer(teamId) {
    var render = function (body) {
      body.replaceChildren();
      var tm = PF.team(teamId);
      var canManage = PF.can("user.manage") || (PF.can("team.manage") && tm.leadId === PF.me().id);
      body.appendChild(h("p", { class: "muted", style: "font-size:12px" }, tm.desc));
      if (!canManage) body.appendChild(h("p", { class: "subtle", style: "font-size:12px" }, "O seu perfil não pode alterar os integrantes desta equipe."));
      body.appendChild(h("div", { class: "section-h" }, "Integrantes"));
      PF.db.users.filter(function (u) { return !u.invited && u.orgId === tm.orgId; }).forEach(function (u) {
        var isIn = tm.memberIds.indexOf(u.id) >= 0;
        var row = h("div", { class: "hist-item" },
          PF.avatarEl(u, "sm"),
          h("span", { class: "grow" }, u.name, h("span", { class: "subtle" }, " — " + u.title)),
          tm.leadId === u.id ? h("span", { class: "chip accent" }, "líder") : null,
          canManage ? PF.switchEl(isIn, function () { PF.act.toggleTeamMember(tm.id, u.id); }, "Integrante " + u.name) :
            (isIn ? h("span", { class: "chip ok" }, "integrante") : h("span", { class: "chip" }, "fora")));
        body.appendChild(row);
      });
    };
    var tm = PF.team(teamId);
    var dr = PF.drawer({
      label: "Equipe " + tm.name,
      head: h("div", { style: "display:flex;gap:8px;align-items:center" }, icon("users", 16), h("b", {}, tm.name)),
      body: h("div")
    });
    PF._drawerRefresh = function () { render(dr.body); };
    render(dr.body);
  }

  /* ============================ ACESSO (usuários e papéis) ============================ */
  PF.routes.access = {
    title: "Usuários e permissões", app: "workspace",
    render: function (page, params) {
      var tab = params[0] || "users";
      page.appendChild(PF.ui.pageHead("Usuários e permissões",
        "Organização → Equipe → Cargo → Papel de acesso. O papel define capacidades; o cargo descreve a função; a participação em projeto vem das equipes.",
        PF.can("user.manage") ? h("button", { class: "btn btn-primary", onclick: inviteModal }, icon("plus", 14), "Convidar colaborador") : null));

      var tabs = h("div", { class: "tabs" });
      [["users", "Usuários"], ["roles", "Papéis e permissões"]].forEach(function (tp) {
        tabs.appendChild(h("button", { class: "tab" + (tab === tp[0] ? " active" : ""), onclick: function () { PF.navigate("/access/" + tp[0]); } }, tp[1]));
      });
      page.appendChild(tabs);

      if (tab === "users") {
        var tbl = h("table", { class: "tbl" },
          h("thead", {}, h("tr", {},
            h("th", {}, "Colaborador"), h("th", {}, "Cargo"), h("th", {}, "Organização"),
            h("th", {}, "Equipes"), h("th", {}, "Papel de acesso"), h("th", {}, "Situação"))));
        var tb = h("tbody");
        PF.db.users.forEach(function (u) {
          var org = PF.byId("orgs", u.orgId);
          var roleCell;
          if (PF.can("user.manage") && u.id !== PF.me().id) {
            roleCell = PF.select(PF.db.roles.map(function (r) { return { value: r.id, label: r.name }; }), u.roleId,
              function (v) { PF.act.setUserRole(u.id, v); }, { "aria-label": "Papel de " + u.name, style: "min-width:200px" });
          } else roleCell = h("span", { class: "chip" }, PF.roleName(u.roleId));
          tb.appendChild(h("tr", {},
            h("td", {}, h("span", { class: "who-cell" }, PF.avatarEl(u, "sm"), h("span", {}, h("b", {}, u.name), h("div", { class: "subtle", style: "font-size:11px" }, u.email)))),
            h("td", {}, u.title || "—"),
            h("td", {}, org ? org.name : "—"),
            h("td", {}, u.teamIds.map(function (tid) { var tm = PF.team(tid); return tm ? h("span", { class: "chip", style: "margin-right:4px" }, tm.name) : null; })),
            h("td", {}, roleCell),
            h("td", {}, u.invited ? h("span", { class: "chip warn" }, "convite pendente") : h("span", { class: "chip ok" }, "ativo"))));
        });
        tbl.appendChild(tb);
        page.appendChild(h("div", { class: "panel" }, h("div", { class: "tbl-wrap" }, tbl)));
      }

      if (tab === "roles") {
        var CAP_GROUPS = [
          ["Projetos", ["project.view", "project.create", "project.edit", "project.archive", "project.delete"]],
          ["Tarefas", ["task.view", "task.create", "task.edit", "task.move", "task.assign", "task.delete"]],
          ["Sprints e equipes", ["sprint.view", "sprint.manage", "team.manage", "user.manage"]],
          ["Integrações", ["webhook.view", "webhook.manage", "mcp.read", "mcp.write"]],
          ["Análise", ["insights.view", "audit.view", "ai.use", "ai.apply"]]
        ];
        var CAP_LABELS = {
          "project.view": "ver projetos", "project.create": "criar projetos", "project.edit": "editar projetos", "project.archive": "arquivar", "project.delete": "excluir",
          "task.view": "ver tarefas", "task.create": "criar", "task.edit": "editar", "task.move": "mover status", "task.assign": "atribuir", "task.delete": "excluir",
          "sprint.view": "ver sprints", "sprint.manage": "gerenciar sprints", "team.manage": "gerenciar a própria equipe", "user.manage": "gerenciar usuários e equipes",
          "webhook.view": "ver webhooks", "webhook.manage": "gerenciar webhooks", "mcp.read": "MCP: ferramentas de leitura", "mcp.write": "MCP: ferramentas de escrita",
          "insights.view": "acessar Insights", "audit.view": "central de auditoria", "ai.use": "usar assistente de IA", "ai.apply": "aplicar propostas da IA"
        };
        var ROLE_CAPS_VIEW = { admin: null, pm: null, lead: null, dev: null, viewer: null };
        Object.keys(ROLE_CAPS_VIEW).forEach(function (r) {
          ROLE_CAPS_VIEW[r] = {};
        });
        // reconstrói visão a partir de PF.can trocando o papel? usamos a matriz pelo roleId diretamente:
        page.appendChild(h("p", { class: "muted", style: "margin-bottom:12px" },
          "As operações do protótipo validam estas capacidades de fato — esconder o botão não é a única barreira. Tentativas sem permissão são registradas na auditoria."));
        CAP_GROUPS.forEach(function (g) {
          var tblR = h("table", { class: "tbl" },
            h("thead", {}, h("tr", {}, h("th", {}, g[0]),
              PF.db.roles.map(function (r) { return h("th", { style: "text-align:center" }, r.name.split(" ")[0]); }))));
          var tbR = h("tbody");
          g[1].forEach(function (cap) {
            tbR.appendChild(h("tr", {},
              h("td", {}, CAP_LABELS[cap] || cap),
              PF.db.roles.map(function (r) {
                var meBackup = PF.db.settings.currentUserId;
                // avalia a matriz sem trocar o usuário: usa a tabela interna via usuário fictício
                var has = roleHasCap(r.id, cap);
                void meBackup;
                return h("td", { style: "text-align:center" }, has ? h("span", { style: "color:var(--ok);display:inline-flex" }, icon("check", 14)) : h("span", { class: "subtle" }, "—"));
              })));
          });
          tblR.appendChild(tbR);
          page.appendChild(h("div", { class: "panel", style: "margin-bottom:14px" }, h("div", { class: "tbl-wrap" }, tblR)));
        });
      }
    }
  };

  function roleHasCap(roleId, cap) {
    // espelha a matriz do core (ROLE_CAPS é interna; simulamos pelo usuário de referência)
    var ref = PF.db.users.find(function (u) { return u.roleId === roleId; });
    if (!ref) return false;
    var cur = PF.db.settings.currentUserId;
    PF.db.settings.currentUserId = ref.id;
    var ok = PF.can(cap);
    PF.db.settings.currentUserId = cur;
    return ok;
  }

  function inviteModal() {
    if (!PF.guard("user.manage", "convidar usuários")) return;
    var name = h("input", { class: "input", maxlength: "60" });
    var email = h("input", { class: "input", type: "email", placeholder: "nome@empresa.dev" });
    var title = h("input", { class: "input", maxlength: "50", placeholder: "ex.: Engenheira Backend" });
    var role = PF.select(PF.db.roles.map(function (r) { return { value: r.id, label: r.name }; }), "dev");
    var teamBoxes = PF.db.teams.map(function (tm) {
      var cb = h("input", { type: "checkbox" });
      cb.dataset.team = tm.id;
      return h("label", { class: "check" }, cb, h("span", {}, tm.name));
    });
    var form = h("div", { class: "form-grid" },
      PF.field("Nome completo", name, { span2: true }),
      PF.field("E-mail", email), PF.field("Cargo", title),
      PF.field("Papel de acesso", role, { span2: true }),
      h("div", { class: "field span2" }, h("label", {}, "Equipes"), h("div", {}, teamBoxes)));
    PF.modal({
      title: "Convidar colaborador", body: form,
      foot: [
        h("button", { class: "btn", onclick: PF.closeOverlays }, "Cancelar"),
        h("button", { class: "btn btn-primary", onclick: function () {
          PF.clearInvalid(form);
          var ok = true;
          if (!name.value.trim() || name.value.trim().split(" ").length < 2) { PF.setInvalid(name.closest(".field"), "Informe nome e sobrenome"); ok = false; }
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) { PF.setInvalid(email.closest(".field"), "E-mail inválido"); ok = false; }
          if (!ok) return;
          PF.act.inviteUser({
            name: name.value.trim(), email: email.value.trim(), title: title.value.trim(), roleId: role.value,
            teamIds: teamBoxes.filter(function (l) { return l.querySelector("input").checked; }).map(function (l) { return l.querySelector("input").dataset.team; })
          });
          PF.closeOverlays();
        } }, "Enviar convite")
      ]
    });
  }

  /* ============================ CONFIGURAÇÕES ============================ */
  PF.routes.settings = {
    title: "Configurações", app: "workspace",
    render: function (page, params) {
      var tab = params[0] || "general";
      page.appendChild(PF.ui.pageHead("Configurações", "Preferências do workspace e arquitetura simulada do produto."));
      var tabs = h("div", { class: "tabs" });
      [["general", "Geral"], ["arch", "Arquitetura simulada"], ["data", "Dados da demonstração"]].forEach(function (tp) {
        tabs.appendChild(h("button", { class: "tab" + (tab === tp[0] ? " active" : ""), onclick: function () { PF.navigate("/settings/" + tp[0]); } }, tp[1]));
      });
      page.appendChild(tabs);

      if (tab === "general") {
        var org = PF.byId("orgs", PF.me().orgId);
        var pn = h("div", { class: "panel", style: "max-width:640px" });
        pn.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Organização")));
        pn.appendChild(h("div", { class: "panel-body" },
          h("div", { class: "hist-item" }, icon("building", 15), h("span", { class: "grow" }, org.name), h("span", { class: "chip violet" }, "demonstração")),
          h("p", { class: "subtle", style: "font-size:12px;margin-top:8px" }, org.desc + ". Todos os registros são fictícios e vivem apenas no seu navegador.")));
        page.appendChild(pn);

        var pt = h("div", { class: "panel", style: "max-width:640px;margin-top:14px" });
        pt.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Aparência")));
        var seg = h("div", { class: "seg", role: "radiogroup", "aria-label": "Tema" });
        [["light", "Claro"], ["dark", "Escuro"], ["system", "Sistema"]].forEach(function (m) {
          seg.appendChild(h("button", { class: PF.db.settings.theme === m[0] ? "active" : "", onclick: function () { PF.act.setTheme(m[0]); } }, m[1]));
        });
        pt.appendChild(h("div", { class: "panel-body" }, h("div", { class: "field" }, h("label", {}, "Tema da interface"), seg)));
        page.appendChild(pt);
      }

      if (tab === "arch") {
        page.appendChild(h("p", { class: "muted", style: "max-width:720px;margin-bottom:14px" },
          "O protótipo roda inteiramente no navegador, mas os fluxos respeitam as responsabilidades da arquitetura planejada. Cada operação simulada indica qual serviço a executaria no produto final."));
        var MS = [
          ["ms-identity", "Organizações, usuários, equipes, cargos e permissões.", ["Seletor de perfis", "Usuários e permissões", "Equipes"]],
          ["ms-projects", "Projetos, épicos, tarefas, sprints, marcos, comentários e cronogramas (REST + GraphQL).", ["Kanban", "Backlog", "Sprints", "Cronograma"]],
          ["ms-notifications", "Templates, preferências e entrega por e-mail, WhatsApp e SMS.", ["Notificações"]],
          ["ms-webhooks", "Assinaturas, catálogo de eventos, destinos HTTP, tentativas e reenvios.", ["Webhooks"]],
          ["ms-ai", "Planejamento assistido, análises, resumos e execuções de agentes.", ["Assistente de IA"]],
          ["mcp-server", "Ferramentas, resources e prompts para agentes externos autorizados.", ["Agentes MCP"]]
        ];
        var grid = h("div", { class: "grid c3" });
        MS.forEach(function (m) {
          grid.appendChild(h("div", { class: "panel" },
            h("div", { class: "panel-head" }, h("h3", { class: "mono", style: "font-size:12.5px" }, m[0])),
            h("div", { class: "panel-body" },
              h("p", { class: "muted", style: "font-size:12px" }, m[1]),
              h("div", {}, m[2].map(function (x) { return h("span", { class: "chip", style: "margin:0 4px 4px 0" }, x); })))));
        });
        page.appendChild(grid);
        page.appendChild(h("div", { class: "panel", style: "margin-top:14px" },
          h("div", { class: "panel-head" }, h("h3", {}, "Infraestrutura representada")),
          h("div", { class: "panel-body" },
            h("div", {}, ["PostgreSQL", "Amazon SNS", "Amazon SQS", "Dead Letter Queue", "Transactional Outbox", "REST", "GraphQL", "MCP"].map(function (x) {
              return h("span", { class: "chip", style: "margin:0 6px 6px 0" }, x);
            })),
            h("p", { class: "subtle", style: "font-size:12px;margin-top:8px" },
              "Eventos de domínio (ex.: task.status_changed.v1) seriam publicados via outbox → SNS → SQS; entregas com falha iriam para a DLQ com reprocessamento — o histórico de tentativas dos webhooks simula esse comportamento."))));
      }

      if (tab === "data") {
        var pd = h("div", { class: "panel", style: "max-width:640px" });
        pd.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Persistência local")));
        pd.appendChild(h("div", { class: "panel-body" },
          h("p", { class: "muted" }, "As alterações feitas no protótipo ficam salvas no localStorage do seu navegador e sobrevivem ao recarregamento da página."),
          h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin-top:8px" },
            h("button", { class: "btn btn-danger", onclick: function () {
              PF.confirm({ title: "Restaurar dados de demonstração", msg: "Todas as alterações feitas serão descartadas e o cenário inicial volta.", confirmLabel: "Restaurar", danger: true })
                .then(function (ok) { if (ok) PF.resetDemo(); });
            } }, icon("refresh", 14), "Restaurar dados de demonstração"),
            h("button", { class: "btn", onclick: function () {
              var blob = new Blob([JSON.stringify(PF.db, null, 2)], { type: "application/json" });
              var a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "projectflow-demo.json";
              a.click();
              URL.revokeObjectURL(a.href);
            } }, icon("download", 14), "Exportar estado (JSON)"))));
        page.appendChild(pd);
      }
    }
  };
})();
