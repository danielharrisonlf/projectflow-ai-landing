/* ============================================================
   ProjectFlow AI — Insights (visão executiva, análise, auditoria)
   Gráficos em SVG puro, sem bibliotecas. Regras de cor:
   série única por gráfico (magnitude) ou cores de status sempre
   acompanhadas de ícone + rótulo — nunca cor sozinha.
   ============================================================ */
(function () {
  "use strict";
  var h = PF.h, icon = PF.icon;
  var SVG = "http://www.w3.org/2000/svg";

  function s(tag, attrs) {
    var el = document.createElementNS(SVG, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) {
      var kid = arguments[i];
      if (kid != null) el.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    }
    return el;
  }

  var tipEl = null;
  function chartTip(x, y, lines) {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.style.cssText = "position:fixed;z-index:300;pointer-events:none;background:var(--ink);color:var(--bg);font-size:11px;font-weight:500;padding:4px 8px;border-radius:5px;white-space:pre;display:none";
      document.body.appendChild(tipEl);
    }
    if (!lines) { tipEl.style.display = "none"; return; }
    tipEl.textContent = lines.join("\n");
    tipEl.style.display = "block";
    tipEl.style.left = Math.min(x + 12, window.innerWidth - 160) + "px";
    tipEl.style.top = (y - 34) + "px";
  }

  /* gráfico de linha (série única, tom de acento) */
  function lineChart(points, opts) {
    opts = opts || {};
    var W = 640, H = 200, padL = 34, padR = 10, padT = 14, padB = 24;
    var ys = points.map(function (p) { return p.y; });
    var maxY = Math.max(4, Math.max.apply(null, ys));
    var iw = W - padL - padR, ih = H - padT - padB;
    function px(i) { return padL + (points.length < 2 ? iw / 2 : i * iw / (points.length - 1)); }
    function py(v) { return padT + ih - (v / maxY) * ih; }

    var svg = s("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": opts.label || "Gráfico de linha" });
    // grid recessivo
    [0, 0.5, 1].forEach(function (f) {
      var y = padT + ih - f * ih;
      svg.appendChild(s("line", { x1: padL, x2: W - padR, y1: y, y2: y, class: "axis" }));
      svg.appendChild(s("text", { x: padL - 6, y: y + 3, "text-anchor": "end" }, String(Math.round(maxY * f))));
    });
    // rótulos x seletivos
    points.forEach(function (p, i) {
      if (i % Math.ceil(points.length / 6) === 0 || i === points.length - 1) {
        svg.appendChild(s("text", { x: px(i), y: H - 8, "text-anchor": "middle" }, p.label));
      }
    });
    var dLine = points.map(function (p, i) { return (i ? "L" : "M") + px(i).toFixed(1) + " " + py(p.y).toFixed(1); }).join(" ");
    var dArea = dLine + " L" + px(points.length - 1).toFixed(1) + " " + (padT + ih) + " L" + px(0).toFixed(1) + " " + (padT + ih) + " Z";
    var area = s("path", { d: dArea, fill: "currentColor", opacity: "0.10", stroke: "none" });
    area.style.color = "var(--accent)";
    svg.appendChild(area);
    var line = s("path", { d: dLine, fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" });
    line.style.color = "var(--accent)";
    svg.appendChild(line);
    points.forEach(function (p, i) {
      var dot = s("circle", { cx: px(i), cy: py(p.y), r: 3, fill: "var(--surface)", stroke: "currentColor", "stroke-width": "2" });
      dot.style.color = "var(--accent)";
      var hit = s("circle", { cx: px(i), cy: py(p.y), r: 12, fill: "transparent" });
      hit.addEventListener("mousemove", function (e) { chartTip(e.clientX, e.clientY, [p.label, p.y + " " + (opts.unit || "")]); dot.setAttribute("r", 4.5); });
      hit.addEventListener("mouseleave", function () { chartTip(0, 0, null); dot.setAttribute("r", 3); });
      svg.appendChild(dot);
      svg.appendChild(hit);
    });
    return h("div", { class: "chart" }, svg);
  }

  /* barras horizontais (HTML): rótulo + ícone à esquerda, valor em texto */
  function barList(items, opts) {
    opts = opts || {};
    var max = Math.max(1, Math.max.apply(null, items.map(function (i) { return i.value; })));
    var wrap = h("div", { role: "img", "aria-label": opts.label || "Gráfico de barras" });
    items.forEach(function (it) {
      var bar = h("div", { style: "flex:1;height:14px;background:var(--surface-2);border-radius:4px;border:1px solid var(--border);overflow:hidden" },
        h("i", { style: "display:block;height:100%;border-radius:3px;width:" + Math.round(100 * it.value / max) + "%;background:" + (it.color || "var(--accent)") }));
      var row = h("div", { style: "display:flex;align-items:center;gap:10px;padding:5px 0" },
        h("span", { style: "width:" + (opts.labelW || 150) + "px;flex:none;display:inline-flex;gap:6px;align-items:center;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, it.icon || null, it.label),
        bar,
        h("span", { class: "num", style: "width:52px;flex:none;text-align:right;font-size:12px;font-weight:600" }, it.display != null ? it.display : String(it.value)));
      row.addEventListener("mousemove", function (e) { chartTip(e.clientX, e.clientY, [it.label, (it.display != null ? it.display : it.value) + (opts.unit ? " " + opts.unit : "")]); });
      row.addEventListener("mouseleave", function () { chartTip(0, 0, null); });
      wrap.appendChild(row);
    });
    return wrap;
  }

  function onTimeRate(tasks) {
    var withDue = tasks.filter(function (t) { return t.status === "done" && t.dueDate; });
    if (!withDue.length) return null;
    var ok = withDue.filter(function (t) { return t.updatedAt.slice(0, 10) <= t.dueDate; }).length;
    return Math.round(100 * ok / withDue.length);
  }

  /* ---------- filtros compartilhados do Insights ---------- */
  var insF = { orgId: "", projectId: "", teamId: "", period: 90 };

  function insFilterBar(extra) {
    var fbar = h("div", { class: "fbar" });
    fbar.appendChild(PF.select([{ value: "", label: "Todas as organizações" }].concat(PF.db.orgs.map(function (o) { return { value: o.id, label: o.name }; })),
      insF.orgId, function (v) { insF.orgId = v; insF.projectId = ""; PF.refresh(); }, { "aria-label": "Organização" }));
    fbar.appendChild(PF.select([{ value: "", label: "Todos os projetos" }].concat(scopeProjects(true).map(function (p) { return { value: p.id, label: p.name }; })),
      insF.projectId, function (v) { insF.projectId = v; PF.refresh(); }, { "aria-label": "Projeto" }));
    fbar.appendChild(PF.select([{ value: "", label: "Todas as equipes" }].concat(PF.db.teams.map(function (t) { return { value: t.id, label: t.name }; })),
      insF.teamId, function (v) { insF.teamId = v; PF.refresh(); }, { "aria-label": "Equipe" }));
    fbar.appendChild(PF.select([
      { value: "30", label: "Últimos 30 dias" }, { value: "60", label: "Últimos 60 dias" },
      { value: "90", label: "Últimos 90 dias" }, { value: "180", label: "Últimos 180 dias" }
    ], String(insF.period), function (v) { insF.period = +v; PF.refresh(); }, { "aria-label": "Período" }));
    if (insF.orgId || insF.projectId || insF.teamId) {
      fbar.appendChild(h("button", { class: "btn btn-ghost btn-sm", onclick: function () { insF.orgId = insF.projectId = insF.teamId = ""; PF.refresh(); } }, icon("x", 12), "Limpar"));
    }
    if (extra) fbar.appendChild(extra);
    return fbar;
  }

  function scopeProjects(ignoreProject) {
    return PF.visibleProjects().filter(function (p) {
      if (insF.orgId && p.orgId !== insF.orgId) return false;
      if (!ignoreProject && insF.projectId && p.id !== insF.projectId) return false;
      if (insF.teamId && p.teamIds.indexOf(insF.teamId) < 0) return false;
      return true;
    });
  }
  function scopeTasks() {
    var ids = {};
    scopeProjects().forEach(function (p) { ids[p.id] = 1; });
    return PF.db.tasks.filter(function (t) {
      if (!ids[t.projectId] || t.parentId) return false;
      if (insF.teamId && t.teamId !== insF.teamId) return false;
      return true;
    });
  }

  /* ============================ VISÃO EXECUTIVA ============================ */
  PF.routes.insights = {
    title: "Visão executiva", app: "insights", cap: "insights.view",
    render: function (page) {
      page.appendChild(PF.ui.pageHead("Visão executiva",
        "Indicadores calculados sobre o estado atual da demonstração — eles reagem às alterações feitas no Workspace."));
      page.appendChild(insFilterBar());

      var projects = scopeProjects();
      var tasks = scopeTasks();
      var cutoff = Date.now() - insF.period * 86400000;
      var doneP = tasks.filter(function (t) { return t.status === "done" && new Date(t.updatedAt).getTime() >= cutoff; });
      var late = tasks.filter(PF.isOverdue);
      var rate = onTimeRate(tasks);

      var strip = h("div", { class: "stat-strip", style: "margin-bottom:14px" });
      function stat(lbl, val, ctx, cls) {
        strip.appendChild(h("div", { class: "stat" }, h("div", { class: "lbl" }, lbl), h("div", { class: "val" }, String(val)), ctx ? h("div", { class: "ctx " + (cls || "") }, ctx) : null));
      }
      stat("Projetos ativos", projects.filter(function (p) { return p.status === "active"; }).length, projects.length + " no recorte");
      stat("Projetos concluídos", projects.filter(function (p) { return p.status === "done"; }).length);
      var atRisk = projects.filter(function (p) { return p.status === "active" && PF.projectRisk(p).level === "high"; }).length;
      stat("Projetos em risco", atRisk, atRisk ? "exigem atenção" : "nenhum", atRisk ? "bad" : "good");
      stat("Tarefas concluídas", doneP.length, "últimos " + insF.period + " dias", "good");
      stat("Tarefas atrasadas", late.length, "em aberto hoje", late.length ? "bad" : "good");
      stat("Cumprimento de prazos", rate == null ? "—" : rate + "%", "entregas no prazo", rate != null && rate < 70 ? "bad" : "good");
      page.appendChild(strip);

      var grid = h("div", { class: "grid c2" });

      // evolução das entregas (semana a semana)
      var weeks = Math.min(13, Math.max(6, Math.round(insF.period / 7)));
      var buckets = [];
      for (var wgi = weeks - 1; wgi >= 0; wgi--) {
        var start = Date.now() - (wgi + 1) * 7 * 86400000;
        var end = Date.now() - wgi * 7 * 86400000;
        var n = tasks.filter(function (t) {
          var ts = new Date(t.updatedAt).getTime();
          return t.status === "done" && ts >= start && ts < end;
        }).length;
        buckets.push({ label: PF.fmtDate(new Date(end).toISOString()), y: n });
      }
      var p1 = h("div", { class: "panel" },
        h("div", { class: "panel-head" }, h("h3", {}, "Evolução das entregas"), h("span", { class: "spacer" }), h("span", { class: "subtle", style: "font-size:11.5px" }, "tarefas concluídas por semana")),
        h("div", { class: "panel-body" }, lineChart(buckets, { label: "Tarefas concluídas por semana", unit: "concluídas" })));
      grid.appendChild(p1);

      // distribuição por status (série única: magnitude; identidade vem do glifo + rótulo)
      var p2 = h("div", { class: "panel" },
        h("div", { class: "panel-head" }, h("h3", {}, "Tarefas por status")));
      var statusItems = PF.STATUSES.map(function (st) {
        return { label: PF.STATUS_META[st].label, icon: PF.statusIcon(st, 13), value: tasks.filter(function (t) { return t.status === st; }).length };
      });
      p2.appendChild(h("div", { class: "panel-body" }, barList(statusItems, { label: "Distribuição de tarefas por status", labelW: 130, unit: "tarefas" })));
      grid.appendChild(p2);

      // projetos por situação (paleta de status com ícone + rótulo)
      var p3 = h("div", { class: "panel" },
        h("div", { class: "panel-head" }, h("h3", {}, "Projetos por situação")));
      var situ = [
        { label: "Saudáveis", icon: h("span", { style: "color:var(--ok);display:inline-flex" }, icon("check", 13)), color: "var(--ok)", value: 0 },
        { label: "Atenção", icon: h("span", { style: "color:var(--warn);display:inline-flex" }, icon("alert", 13)), color: "var(--warn)", value: 0 },
        { label: "Em risco", icon: h("span", { style: "color:var(--danger);display:inline-flex" }, icon("alert", 13)), color: "var(--danger)", value: 0 },
        { label: "Entregues", icon: h("span", { style: "color:var(--ink-3);display:inline-flex" }, icon("flag", 13)), color: "var(--ink-3)", value: 0 }
      ];
      projects.forEach(function (p) {
        if (p.status === "done") { situ[3].value++; return; }
        var r = PF.projectRisk(p);
        if (r.level === "high") situ[2].value++;
        else if (r.level === "mid") situ[1].value++;
        else situ[0].value++;
      });
      p3.appendChild(h("div", { class: "panel-body" }, barList(situ, { label: "Projetos por situação", labelW: 120, unit: "projetos" })));
      grid.appendChild(p3);

      // cumprimento de prazo por equipe
      var p4 = h("div", { class: "panel" },
        h("div", { class: "panel-head" }, h("h3", {}, "Prazos por equipe"), h("span", { class: "spacer" }), h("span", { class: "subtle", style: "font-size:11.5px" }, "% de entregas no prazo")));
      var teamItems = [];
      PF.db.teams.forEach(function (tm) {
        var tts = tasks.filter(function (t) { return t.teamId === tm.id; });
        var r = onTimeRate(tts);
        if (r != null) teamItems.push({ label: tm.name, value: r, display: r + "%" });
      });
      teamItems.sort(function (a, b) { return b.value - a.value; });
      p4.appendChild(h("div", { class: "panel-body" }, teamItems.length ? barList(teamItems, { label: "Cumprimento de prazos por equipe", labelW: 130 }) : h("p", { class: "muted" }, "Sem entregas com prazo no recorte.")));
      grid.appendChild(p4);
      page.appendChild(grid);

      // resumo por equipe + atividades
      var grid2 = h("div", { class: "grid c2-1", style: "margin-top:14px" });
      var pt = h("div", { class: "panel" });
      pt.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Resumo por equipe")));
      var tbl = h("table", { class: "tbl" },
        h("thead", {}, h("tr", {}, h("th", {}, "Equipe"), h("th", { class: "num" }, "Abertas"), h("th", { class: "num" }, "Concluídas"), h("th", { class: "num" }, "Atrasadas"), h("th", { class: "num" }, "No prazo"))));
      var tb = h("tbody");
      PF.db.teams.forEach(function (tm) {
        var tts = tasks.filter(function (t) { return t.teamId === tm.id; });
        if (!tts.length) return;
        var open = tts.filter(function (t) { return t.status !== "done"; }).length;
        var done = tts.length - open;
        var lateN = tts.filter(PF.isOverdue).length;
        var r = onTimeRate(tts);
        tb.appendChild(h("tr", {},
          h("td", {}, tm.name),
          h("td", { class: "num" }, String(open)),
          h("td", { class: "num" }, String(done)),
          h("td", { class: "num" }, lateN ? h("span", { style: "color:var(--danger);font-weight:600" }, String(lateN)) : "0"),
          h("td", { class: "num" }, r == null ? "—" : r + "%")));
      });
      tbl.appendChild(tb);
      pt.appendChild(h("div", { class: "tbl-wrap" }, tbl));
      grid2.appendChild(pt);

      var pa = h("div", { class: "panel" });
      pa.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Atividades recentes"), h("span", { class: "spacer" }),
        PF.can("audit.view") ? h("button", { class: "btn btn-ghost btn-sm", onclick: function () { PF.navigate("/insights/audit"); } }, "Auditoria", icon("arrowR", 12)) : null));
      var paB = h("div", { class: "panel-body" });
      var ids = {}; projects.forEach(function (p) { ids[p.id] = 1; });
      PF.db.audit.filter(function (a) { return a.action !== "denied" && (!a.projectId || ids[a.projectId]); }).slice(0, 7).forEach(function (a) {
        var u = PF.user(a.userId);
        paB.appendChild(h("div", { class: "hist-item" },
          PF.avatarEl(u, "sm"), h("span", { class: "grow" }, h("b", {}, u ? u.name : "?"), " " + a.summary), h("time", {}, PF.rel(a.ts))));
      });
      pa.appendChild(paB);
      grid2.appendChild(pa);
      page.appendChild(grid2);
    }
  };

  /* ============================ ANÁLISE DE PROJETOS ============================ */
  PF.routes["insights/analytics"] = {
    title: "Análise de projetos", app: "insights", cap: "insights.view",
    render: function (page) {
      page.appendChild(PF.ui.pageHead("Análise de projetos e desempenho",
        "Comparação entre projetos, sprints e equipes, com leitura de gargalos e dependências."));
      page.appendChild(insFilterBar());

      var projects = scopeProjects();
      var tasks = scopeTasks();

      // comparação de projetos
      var pc = h("div", { class: "panel", style: "margin-bottom:14px" });
      pc.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Comparação de projetos")));
      var tbl = h("table", { class: "tbl" },
        h("thead", {}, h("tr", {}, h("th", {}, "Projeto"), h("th", {}, "Progresso"),
          h("th", { class: "num" }, "Tarefas"), h("th", { class: "num" }, "Atrasadas"), h("th", { class: "num" }, "Bloqueadas"),
          h("th", { class: "num" }, "No prazo"), h("th", {}, "Entrega"), h("th", {}, "Situação"))));
      var tb = h("tbody");
      projects.forEach(function (p) {
        var ts = tasks.filter(function (t) { return t.projectId === p.id; });
        var prog = PF.projectProgress(p.id);
        var lateN = ts.filter(PF.isOverdue).length;
        var blockedN = ts.filter(function (t) { return t.blockedBy.length && t.status !== "done"; }).length;
        var r = onTimeRate(ts);
        tb.appendChild(h("tr", { class: "row-click", onclick: function () { PF.navigate("/projects/" + p.id); } },
          h("td", {}, h("b", {}, p.name), h("div", { class: "mono subtle", style: "font-size:10.5px" }, p.key)),
          h("td", {}, h("div", { style: "display:flex;gap:8px;align-items:center" }, PF.progressBar(prog, prog === 100), h("span", { class: "num muted", style: "font-size:11.5px" }, prog + "%"))),
          h("td", { class: "num" }, String(ts.length)),
          h("td", { class: "num" }, lateN ? h("span", { style: "color:var(--danger);font-weight:600" }, String(lateN)) : "0"),
          h("td", { class: "num" }, blockedN ? h("span", { style: "color:var(--warn);font-weight:600" }, String(blockedN)) : "0"),
          h("td", { class: "num" }, r == null ? "—" : r + "%"),
          h("td", { class: "nowrap" }, PF.fmtDate(p.targetDate)),
          h("td", {}, PF.ui.riskChip(PF.projectRisk(p)))));
      });
      tbl.appendChild(tb);
      pc.appendChild(h("div", { class: "tbl-wrap" }, tbl));
      page.appendChild(pc);

      var grid = h("div", { class: "grid c2" });

      // indicadores por sprint
      var ps = h("div", { class: "panel" });
      ps.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Indicadores por sprint")));
      var tbl2 = h("table", { class: "tbl" },
        h("thead", {}, h("tr", {}, h("th", {}, "Sprint"), h("th", {}, "Status"), h("th", { class: "num" }, "Tarefas"), h("th", { class: "num" }, "Concluídas"), h("th", {}, "Conclusão"))));
      var tb2 = h("tbody");
      var pids = {}; projects.forEach(function (p) { pids[p.id] = 1; });
      PF.db.sprints.filter(function (sp) { return pids[sp.projectId]; }).forEach(function (sp) {
        var ts = PF.db.tasks.filter(function (t) { return t.sprintId === sp.id && !t.parentId; });
        var done = ts.filter(function (t) { return t.status === "done"; }).length;
        var pct = ts.length ? Math.round(100 * done / ts.length) : 0;
        tb2.appendChild(h("tr", {},
          h("td", {}, h("b", {}, sp.name), h("div", { class: "subtle", style: "font-size:10.5px" }, PF.project(sp.projectId).name)),
          h("td", {}, sp.status === "active" ? h("span", { class: "chip accent" }, "ativa") : sp.status === "done" ? h("span", { class: "chip ok" }, "concluída") : h("span", { class: "chip" }, "planejada")),
          h("td", { class: "num" }, String(ts.length)),
          h("td", { class: "num" }, String(done)),
          h("td", {}, h("div", { style: "display:flex;gap:8px;align-items:center" }, PF.progressBar(pct, pct === 100), h("span", { class: "num muted", style: "font-size:11.5px" }, pct + "%")))));
      });
      tbl2.appendChild(tb2);
      ps.appendChild(h("div", { class: "tbl-wrap" }, tbl2));
      grid.appendChild(ps);

      // progresso por equipe
      var pt = h("div", { class: "panel" });
      pt.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Progresso por equipe"), h("span", { class: "spacer" }), h("span", { class: "subtle", style: "font-size:11.5px" }, "% de tarefas concluídas")));
      var teamItems = [];
      PF.db.teams.forEach(function (tm) {
        var ts = tasks.filter(function (t) { return t.teamId === tm.id; });
        if (!ts.length) return;
        var pct = Math.round(100 * ts.filter(function (t) { return t.status === "done"; }).length / ts.length);
        teamItems.push({ label: tm.name, value: pct, display: pct + "%" });
      });
      teamItems.sort(function (a, b) { return b.value - a.value; });
      pt.appendChild(h("div", { class: "panel-body" }, barList(teamItems, { label: "Progresso por equipe", labelW: 130 })));
      grid.appendChild(pt);
      page.appendChild(grid);

      var grid2 = h("div", { class: "grid c2", style: "margin-top:14px" });

      // gargalos
      var pg = h("div", { class: "panel" });
      pg.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Gargalos e carga")));
      var pgB = h("div", { class: "panel-body" });
      var wip = tasks.filter(function (t) { return t.status === "in_progress"; });
      var review = tasks.filter(function (t) { return t.status === "in_review"; });
      pgB.appendChild(barList([
        { label: "Em andamento", icon: PF.statusIcon("in_progress", 13), value: wip.length },
        { label: "Em revisão", icon: PF.statusIcon("in_review", 13), value: review.length },
        { label: "Bloqueadas", icon: h("span", { style: "color:var(--warn);display:inline-flex" }, icon("block", 13)), value: tasks.filter(function (t) { return t.blockedBy.length && t.status !== "done"; }).length }
      ], { label: "Trabalho em progresso", labelW: 130, unit: "tarefas" }));
      var load = {};
      wip.forEach(function (t) { if (t.assigneeId) load[t.assigneeId] = (load[t.assigneeId] || 0) + 1; });
      var top = Object.keys(load).sort(function (a, b) { return load[b] - load[a]; }).slice(0, 4);
      if (top.length) {
        pgB.appendChild(h("div", { class: "section-h" }, "Maior carga em andamento"));
        top.forEach(function (uid) {
          pgB.appendChild(h("div", { class: "hist-item" }, PF.avatarEl(PF.user(uid), "sm"),
            h("span", { class: "grow" }, PF.user(uid).name),
            h("span", { class: "num", style: load[uid] >= 3 ? "color:var(--danger);font-weight:600" : "" }, load[uid] + " tarefas")));
        });
      }
      pg.appendChild(pgB);
      grid2.appendChild(pg);

      // dependências críticas
      var pd = h("div", { class: "panel" });
      pd.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Tarefas bloqueadas e dependências críticas")));
      var pdB = h("div", { class: "panel-body" });
      var blocked = tasks.filter(function (t) { return t.blockedBy.length && t.status !== "done"; });
      if (!blocked.length) pdB.appendChild(h("p", { class: "muted" }, "Nenhum bloqueio ativo no recorte."));
      blocked.forEach(function (t) {
        var blockers = t.blockedBy.map(function (id) { return PF.task(id); }).filter(Boolean);
        pdB.appendChild(h("div", { class: "hist-item" },
          h("span", { style: "color:var(--warn)" }, icon("block", 14)),
          h("span", { class: "grow" },
            h("a", { href: "#", class: "mono", onclick: function (e) { e.preventDefault(); PF.ui.openTask(t.id); } }, t.ref),
            " " + t.title,
            h("div", { class: "subtle", style: "font-size:11px" }, "aguarda " + blockers.map(function (b) { return b.ref + " (" + PF.STATUS_META[b.status].label + ")"; }).join(", "))),
          PF.isOverdue(t) ? h("span", { class: "chip danger" }, "atrasada") : null));
      });
      pd.appendChild(pdB);
      grid2.appendChild(pd);
      page.appendChild(grid2);
    }
  };

  /* ============================ CENTRAL DE AUDITORIA ============================ */
  var audF = { userId: "", projectId: "", action: "", source: "", entityType: "", period: 90, page: 0 };
  var ACTION_LABELS = {
    create: "Criação", update: "Atualização", status: "Mudança de status", priority: "Mudança de prioridade",
    assign: "Atribuição", comment: "Comentário", block: "Bloqueio", archive: "Arquivamento", "delete": "Exclusão",
    sprint_start: "Início de sprint", sprint_end: "Encerramento de sprint", test: "Teste de webhook",
    redeliver: "Reenvio de webhook", denied: "Permissão negada", ai_query: "Consulta à IA"
  };
  var ENTITY_LABELS = { task: "Tarefa", project: "Projeto", sprint: "Sprint", epic: "Épico", team: "Equipe", user: "Usuário", webhook: "Webhook", notification: "Notificação", mcp: "Agente MCP", permission: "Permissão", ai: "IA" };

  PF.routes["insights/audit"] = {
    title: "Central de auditoria", app: "insights", cap: "audit.view",
    render: function (page) {
      page.appendChild(PF.ui.pageHead("Central de auditoria",
        "Trilha completa das ações: quem fez, o quê, em qual entidade, com valores anteriores e novos, e a origem (interface, automação, API ou agente MCP)."));

      var fbar = h("div", { class: "fbar" });
      fbar.appendChild(PF.select([{ value: "", label: "Todos os usuários" }].concat(PF.db.users.map(function (u) { return { value: u.id, label: u.name }; })),
        audF.userId, function (v) { audF.userId = v; audF.page = 0; PF.refresh(); }, { "aria-label": "Usuário" }));
      fbar.appendChild(PF.select([{ value: "", label: "Todos os projetos" }].concat(PF.db.projects.map(function (p) { return { value: p.id, label: p.name }; })),
        audF.projectId, function (v) { audF.projectId = v; audF.page = 0; PF.refresh(); }, { "aria-label": "Projeto" }));
      fbar.appendChild(PF.select([{ value: "", label: "Todas as ações" }].concat(Object.keys(ACTION_LABELS).map(function (a) { return { value: a, label: ACTION_LABELS[a] }; })),
        audF.action, function (v) { audF.action = v; audF.page = 0; PF.refresh(); }, { "aria-label": "Ação" }));
      fbar.appendChild(PF.select([{ value: "", label: "Todas as origens" }, { value: "ui", label: "Interface" }, { value: "mcp", label: "Agente MCP" }, { value: "automation", label: "Automação" }, { value: "api", label: "API" }, { value: "ai", label: "IA" }],
        audF.source, function (v) { audF.source = v; audF.page = 0; PF.refresh(); }, { "aria-label": "Origem" }));
      fbar.appendChild(PF.select([{ value: "", label: "Todas as entidades" }].concat(Object.keys(ENTITY_LABELS).map(function (e) { return { value: e, label: ENTITY_LABELS[e] }; })),
        audF.entityType, function (v) { audF.entityType = v; audF.page = 0; PF.refresh(); }, { "aria-label": "Entidade" }));
      fbar.appendChild(PF.select([{ value: "7", label: "7 dias" }, { value: "30", label: "30 dias" }, { value: "90", label: "90 dias" }, { value: "365", label: "1 ano" }],
        String(audF.period), function (v) { audF.period = +v; audF.page = 0; PF.refresh(); }, { "aria-label": "Período" }));
      if (audF.userId || audF.projectId || audF.action || audF.source || audF.entityType) {
        fbar.appendChild(h("button", { class: "btn btn-ghost btn-sm", onclick: function () { audF.userId = audF.projectId = audF.action = audF.source = audF.entityType = ""; audF.page = 0; PF.refresh(); } }, icon("x", 12), "Limpar"));
      }
      page.appendChild(fbar);

      var cutoff = Date.now() - audF.period * 86400000;
      var rows = PF.db.audit.filter(function (a) {
        if (new Date(a.ts).getTime() < cutoff) return false;
        if (audF.userId && a.userId !== audF.userId) return false;
        if (audF.projectId && a.projectId !== audF.projectId) return false;
        if (audF.action && a.action !== audF.action) return false;
        if (audF.source && a.source !== audF.source) return false;
        if (audF.entityType && a.entityType !== audF.entityType) return false;
        return true;
      });

      var PAGE = 20;
      var pages = Math.max(1, Math.ceil(rows.length / PAGE));
      if (audF.page >= pages) audF.page = pages - 1;
      var slice = rows.slice(audF.page * PAGE, audF.page * PAGE + PAGE);

      if (!rows.length) { page.appendChild(PF.emptyState("scroll", "Nenhum registro", "Ajuste os filtros ou realize ações no Workspace.")); return; }

      var tbl = h("table", { class: "tbl" },
        h("thead", {}, h("tr", {}, h("th", {}, "Quando"), h("th", {}, "Usuário"), h("th", {}, "Ação"), h("th", {}, "Entidade"), h("th", {}, "Projeto"), h("th", {}, "Origem"), h("th", {}, "Resumo"))));
      var tb = h("tbody");
      slice.forEach(function (a) {
        var proj = a.projectId ? PF.project(a.projectId) : null;
        tb.appendChild(h("tr", { class: "row-click", onclick: function () { auditDrawer(a.id); } },
          h("td", { class: "nowrap muted", style: "font-size:11.5px" }, PF.fmtDateTime(a.ts)),
          h("td", {}, PF.whoCell(a.userId)),
          h("td", {}, h("span", { class: "chip" + (a.action === "denied" ? " danger" : a.action === "delete" ? " warn" : "") }, ACTION_LABELS[a.action] || a.action)),
          h("td", {}, ENTITY_LABELS[a.entityType] || a.entityType),
          h("td", {}, proj ? proj.name : "—"),
          h("td", {}, h("span", { class: "src-tag " + a.source }, a.source === "ui" ? "interface" : a.source)),
          h("td", { style: "max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, a.summary)));
      });
      tbl.appendChild(tb);
      var panel = h("div", { class: "panel" }, h("div", { class: "tbl-wrap" }, tbl));
      panel.appendChild(h("div", { class: "pager" },
        h("span", { class: "num" }, rows.length + " registros"),
        h("span", { class: "grow" }),
        h("button", { class: "btn btn-sm", disabled: audF.page === 0, onclick: function () { audF.page--; PF.refresh(); } }, icon("chevL", 12), "Anterior"),
        h("span", { class: "num" }, (audF.page + 1) + " / " + pages),
        h("button", { class: "btn btn-sm", disabled: audF.page >= pages - 1, onclick: function () { audF.page++; PF.refresh(); } }, "Próxima", icon("chevR", 12))));
      page.appendChild(panel);
    }
  };

  function fmtVal(key, val) {
    if (val == null) return "—";
    if (key === "assigneeId") { var u = PF.user(val); return u ? u.name : String(val); }
    if (key === "status" && PF.STATUS_META[val]) return PF.STATUS_META[val].label.toUpperCase();
    if (key === "priority" && PF.PRIO_META[val]) return PF.PRIO_META[val].label.toUpperCase();
    if (Array.isArray(val)) return val.length ? val.join(", ") : "—";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  }

  function auditDrawer(id) {
    var a = PF.byId("audit", id);
    if (!a) return;
    var u = PF.user(a.userId);
    var proj = a.projectId ? PF.project(a.projectId) : null;
    var dr = PF.drawer({
      label: "Registro de auditoria",
      head: h("div", { style: "display:flex;gap:8px;align-items:center" }, icon("scroll", 16), h("b", {}, ACTION_LABELS[a.action] || a.action)),
      body: h("div")
    });
    var body = dr.body;
    body.appendChild(h("div", { class: "task-props" },
      h("span", { class: "pl" }, "Usuário"), PF.whoCell(a.userId),
      h("span", { class: "pl" }, "Papel"), h("span", {}, u ? PF.roleName(u.roleId) : "—"),
      h("span", { class: "pl" }, "Entidade"), h("span", {}, (ENTITY_LABELS[a.entityType] || a.entityType) + (a.entityId ? " · " + a.entityId : "")),
      h("span", { class: "pl" }, "Projeto"), proj ? h("a", { href: "#/projects/" + proj.id, onclick: function () { PF.closeOverlays(); } }, proj.name) : h("span", {}, "—"),
      h("span", { class: "pl" }, "Origem"), h("span", {}, h("span", { class: "src-tag " + a.source }, a.source === "ui" ? "ProjectFlow Workspace" : a.source === "mcp" ? "Agente MCP" : a.source === "ai" ? "Assistente de IA" : a.source)),
      h("span", { class: "pl" }, "Data e hora"), h("span", {}, PF.fmtDateTime(a.ts))));

    body.appendChild(h("div", { class: "section-h" }, "O que aconteceu"));
    body.appendChild(h("p", {}, (u ? u.name + " " : "") + a.summary + "."));

    if (a.before || a.after) {
      body.appendChild(h("div", { class: "section-h" }, "Alterações"));
      var keys = {};
      Object.keys(a.before || {}).forEach(function (k) { keys[k] = 1; });
      Object.keys(a.after || {}).forEach(function (k) { keys[k] = 1; });
      var FIELD_PT = { status: "Status", priority: "Prioridade", assigneeId: "Responsável", title: "Título", name: "Nome", desc: "Descrição", dueDate: "Vencimento", archived: "Arquivado", teamIds: "Equipes", labels: "Etiquetas", role: "Papel", active: "Ativo", url: "URL", events: "Eventos", member: "Integrante", blockedBy: "Bloqueada por", targetDate: "Entrega", startDate: "Início", key: "Chave", leadId: "Responsável", fields: "Campos", acceptance: "Critérios", sprintId: "Sprint", epicId: "Épico", channel: "Canal", enabled: "Ligado", goal: "Meta" };
      var tbl = h("table", { class: "diff-table" },
        h("thead", {}, h("tr", {}, h("th", {}, "Campo"), h("th", {}, "Valor anterior"), h("th", {}, "Novo valor"))));
      var tb = h("tbody");
      Object.keys(keys).forEach(function (k) {
        tb.appendChild(h("tr", {},
          h("td", {}, FIELD_PT[k] || k),
          h("td", {}, a.before && k in a.before ? h("span", { class: "diff-old" }, fmtVal(k, a.before[k])) : h("span", { class: "subtle" }, "—")),
          h("td", {}, a.after && k in a.after ? h("span", { class: "diff-new" }, fmtVal(k, a.after[k])) : h("span", { class: "subtle" }, "—"))));
      });
      tbl.appendChild(tb);
      body.appendChild(tbl);
    }

    // evento correlacionado
    var ev = PF.db.events.find(function (e) { return e.entityId === a.entityId && Math.abs(new Date(e.ts) - new Date(a.ts)) < 5000; });
    if (ev) {
      body.appendChild(h("div", { class: "section-h" }, "Evento emitido"));
      body.appendChild(h("pre", { class: "code" }, JSON.stringify({ id: ev.id, type: ev.type, occurredAt: ev.ts, data: ev.payload }, null, 2)));
    }
    if (a.entityType === "task" && PF.task(a.entityId)) {
      body.appendChild(h("div", { style: "margin-top:12px" },
        h("button", { class: "btn btn-sm", onclick: function () { PF.ui.openTask(a.entityId); } }, "Abrir tarefa", icon("arrowR", 12))));
    }
  }
})();
