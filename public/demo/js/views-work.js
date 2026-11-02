/* ============================================================
   ProjectFlow AI — tarefas, kanban, backlog, sprints, cronograma
   ============================================================ */
(function () {
  "use strict";
  var h = PF.h, icon = PF.icon;
  var LABELS = ["backend", "frontend", "mobile", "infra", "dados", "ux", "seguranca", "performance", "documentacao", "cliente"];

  /* ============================ MODAL DE TAREFA ============================ */
  PF.ui.taskModal = function (defaults) {
    defaults = defaults || {};
    if (!PF.can("task.create")) { PF.deny("criar tarefas"); return; }
    var projects = PF.visibleProjects().filter(function (p) { return p.status !== "done"; });
    if (!projects.length) { PF.toast("Sem projetos", "Não há projetos disponíveis para o seu perfil.", "warn"); return; }
    var projectId = defaults.projectId && projects.some(function (p) { return p.id === defaults.projectId; }) ? defaults.projectId : projects[0].id;

    var f = {
      project: PF.select(projects.map(function (p) { return { value: p.id, label: p.name }; }), projectId, function (v) { projectId = v; syncDependent(); }),
      title: h("input", { class: "input", maxlength: "120", placeholder: "O que precisa ser feito?" }),
      type: PF.select([{ value: "task", label: "Tarefa" }, { value: "bug", label: "Bug" }], defaults.type || "task"),
      priority: PF.select(PF.PRIORITIES.map(function (p) { return { value: p, label: PF.PRIO_META[p].label }; }), defaults.priority || "medium"),
      assignee: h("select", { class: "select" }),
      epic: h("select", { class: "select" }),
      sprint: h("select", { class: "select" }),
      due: h("input", { class: "input", type: "date", value: defaults.dueDate || "" }),
      desc: h("textarea", { class: "textarea", placeholder: "Contexto, requisitos, links…" }),
      accept: h("textarea", { class: "textarea", placeholder: "Um critério de aceite por linha" })
    };
    var labelBoxes = LABELS.map(function (l) {
      var cb = h("input", { type: "checkbox" });
      cb.dataset.label = l;
      return h("label", { class: "check", style: "display:inline-flex;margin-right:10px;padding:2px 0" }, cb, PF.labelChip(l));
    });

    function fillSelect(sel, options, value) {
      sel.replaceChildren();
      options.forEach(function (o) {
        var opt = h("option", { value: o.value }, o.label);
        if (o.value === value) opt.selected = true;
        sel.appendChild(opt);
      });
    }
    function syncDependent() {
      var p = PF.project(projectId);
      var memberIds = {};
      p.teamIds.forEach(function (tid) { var tm = PF.team(tid); if (tm) tm.memberIds.forEach(function (m) { memberIds[m] = 1; }); });
      var members = PF.db.users.filter(function (u) { return memberIds[u.id] && !u.invited; });
      fillSelect(f.assignee, [{ value: "", label: "Sem responsável" }].concat(members.map(function (u) { return { value: u.id, label: u.name }; })), defaults.assigneeId || "");
      fillSelect(f.epic, [{ value: "", label: "Sem épico" }].concat(PF.epicsOf(projectId).map(function (e) { return { value: e.id, label: e.name }; })), defaults.epicId || "");
      fillSelect(f.sprint, [{ value: "", label: "Sem sprint (backlog)" }].concat(PF.sprintsOf(projectId).filter(function (s) { return s.status !== "done"; }).map(function (s) { return { value: s.id, label: s.name + (s.status === "active" ? " (ativa)" : "") }; })), defaults.sprintId || "");
    }
    syncDependent();

    var form = h("div", { class: "form-grid" },
      PF.field("Projeto", f.project, { span2: true }),
      PF.field("Título", f.title, { span2: true }),
      PF.field("Tipo", f.type), PF.field("Prioridade", f.priority),
      PF.field("Responsável", f.assignee), PF.field("Épico", f.epic),
      PF.field("Sprint", f.sprint), PF.field("Vencimento", f.due),
      h("div", { class: "field span2" }, h("label", {}, "Etiquetas"), h("div", {}, labelBoxes)),
      PF.field("Descrição", f.desc, { span2: true }),
      PF.field("Critérios de aceite", f.accept, { span2: true })
    );

    PF.modal({
      title: "Nova tarefa", wide: true, body: form,
      foot: [
        h("button", { class: "btn", onclick: PF.closeOverlays }, "Cancelar"),
        h("button", { class: "btn btn-primary", onclick: function () {
          PF.clearInvalid(form);
          if (!f.title.value.trim()) { PF.setInvalid(f.title.closest(".field"), "Informe o título da tarefa"); return; }
          var acceptance = f.accept.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean)
            .map(function (s) { return { text: s, done: false }; });
          var t = PF.act.createTask({
            projectId: projectId, title: f.title.value.trim(), type: f.type.value,
            priority: f.priority.value, assigneeId: f.assignee.value || null,
            epicId: f.epic.value || null, sprintId: f.sprint.value || null,
            dueDate: f.due.value || null, desc: f.desc.value.trim(),
            labels: labelBoxes.filter(function (l) { return l.querySelector("input").checked; }).map(function (l) { return l.querySelector("input").dataset.label; }),
            acceptance: acceptance, status: defaults.status || "todo"
          });
          if (t) PF.closeOverlays();
        } }, "Criar tarefa")
      ]
    });
  };

  /* ============================ DRAWER DE TAREFA ============================ */
  PF.ui.openTask = function (taskId) {
    var t0 = PF.task(taskId);
    if (!t0) return;
    if (!PF.canSeeProject(t0.projectId)) { PF.deny("ver esta tarefa"); return; }

    var dr = PF.drawer({
      label: "Tarefa " + t0.ref,
      head: h("div", { style: "display:flex;gap:8px;align-items:center" },
        PF.typeIcon(t0.type, 16),
        h("span", { class: "mono", style: "color:var(--ink-2)" }, t0.ref)),
      headActions: taskMenuBtn(taskId),
      body: h("div")
    });
    function render() {
      var t = PF.task(taskId);
      if (!t) { PF.closeOverlays(); return; }
      var body = dr.body;
      body.replaceChildren();
      var canEdit = PF.canTouchTask(t);
      var p = PF.project(t.projectId);

      // título
      var titleIn = h("textarea", {
        class: "textarea", style: "font-size:15px;font-weight:600;min-height:40px;resize:none",
        "aria-label": "Título da tarefa", disabled: !canEdit
      }, t.title);
      titleIn.addEventListener("change", function () {
        if (titleIn.value.trim() && titleIn.value.trim() !== t.title) PF.act.updateTask(t.id, { title: titleIn.value.trim() });
      });
      body.appendChild(titleIn);
      if (!canEdit) body.appendChild(h("p", { class: "subtle", style: "font-size:11.5px;margin:4px 0 0" },
        icon("block", 11), " Somente leitura para o perfil atual."));

      // bloqueios
      if (t.blockedBy.length) {
        var bl = h("div", { class: "chip warn", style: "margin-top:8px" }, icon("block", 12), "Bloqueada por ");
        t.blockedBy.forEach(function (bid) {
          var bt = PF.task(bid);
          if (bt) bl.appendChild(h("a", { href: "#", class: "mono", style: "color:inherit;margin-left:4px", onclick: function (e) { e.preventDefault(); PF.ui.openTask(bid); } }, bt.ref));
        });
        body.appendChild(bl);
      }

      // propriedades
      var props = h("div", { class: "task-props" });
      function prop(label, control) { props.appendChild(h("span", { class: "pl" }, label)); props.appendChild(control); }

      prop("Status", canEdit ? PF.select(PF.STATUSES.map(function (s) { return { value: s, label: PF.STATUS_META[s].label }; }), t.status,
        function (v) { PF.act.moveTask(t.id, v); }) : PF.statusChip(t.status));
      prop("Prioridade", canEdit ? PF.select(PF.PRIORITIES.map(function (pr) { return { value: pr, label: PF.PRIO_META[pr].label }; }), t.priority,
        function (v) { PF.act.updateTask(t.id, { priority: v }); }) : PF.prioChip(t.priority));

      var memberIds = {};
      p.teamIds.forEach(function (tid) { var tm = PF.team(tid); if (tm) tm.memberIds.forEach(function (m) { memberIds[m] = 1; }); });
      var members = PF.db.users.filter(function (u) { return memberIds[u.id] && !u.invited; });
      var canAssign = canEdit && (PF.can("task.assign") || !t.assigneeId);
      prop("Responsável", canAssign ? PF.select([{ value: "", label: "Sem responsável" }].concat(members.map(function (u) { return { value: u.id, label: u.name }; })), t.assigneeId || "",
        function (v) { PF.act.updateTask(t.id, { assigneeId: v || null }); }) : PF.whoCell(t.assigneeId));

      prop("Equipe", canEdit ? PF.select(p.teamIds.map(function (tid) { var tm = PF.team(tid); return { value: tid, label: tm ? tm.name : tid }; }), t.teamId,
        function (v) { PF.act.updateTask(t.id, { teamId: v }); }) : h("span", {}, (PF.team(t.teamId) || {}).name || "—"));

      prop("Épico", canEdit ? PF.select([{ value: "", label: "Sem épico" }].concat(PF.epicsOf(p.id).map(function (e) { return { value: e.id, label: e.name }; })), t.epicId || "",
        function (v) { PF.act.updateTask(t.id, { epicId: v || null }); }) : h("span", {}, (PF.byId("epics", t.epicId) || { name: "—" }).name));

      prop("Sprint", canEdit ? PF.select([{ value: "", label: "Sem sprint" }].concat(PF.sprintsOf(p.id).map(function (s) { return { value: s.id, label: s.name }; })), t.sprintId || "",
        function (v) { PF.act.updateTask(t.id, { sprintId: v || null }); }) : h("span", {}, (PF.byId("sprints", t.sprintId) || { name: "—" }).name));

      var dueIn = h("input", { class: "input", type: "date", value: t.dueDate || "", disabled: !canEdit });
      dueIn.addEventListener("change", function () { PF.act.updateTask(t.id, { dueDate: dueIn.value || null }); });
      var dueWrap = h("div", { style: "display:flex;gap:8px;align-items:center" }, dueIn);
      if (PF.isOverdue(t)) dueWrap.appendChild(h("span", { class: "chip danger" }, "atrasada"));
      prop("Vencimento", dueWrap);

      prop("Projeto", h("a", { href: "#/projects/" + p.id, onclick: function () { PF.closeOverlays(); } }, p.name));
      props.appendChild(h("span", { class: "pl" }, "Criada"));
      props.appendChild(h("span", { class: "muted", style: "font-size:12px" }, PF.fmtDateTime(t.createdAt) + " · atualizada " + PF.rel(t.updatedAt)));
      body.appendChild(props);

      // etiquetas
      var labRow = h("div", { style: "display:flex;gap:6px;flex-wrap:wrap;align-items:center" });
      t.labels.forEach(function (l) { labRow.appendChild(PF.labelChip(l)); });
      if (canEdit) {
        var addLab = h("button", { class: "btn btn-ghost btn-sm", "aria-label": "Editar etiquetas" }, icon("tag", 13), "Etiquetas");
        addLab.addEventListener("click", function () {
          PF.menu(addLab, LABELS.map(function (l) {
            return {
              label: l, checked: t.labels.indexOf(l) >= 0,
              onClick: function () {
                var ls = t.labels.slice();
                var i = ls.indexOf(l);
                if (i >= 0) ls.splice(i, 1); else ls.push(l);
                PF.act.updateTask(t.id, { labels: ls });
              }
            };
          }));
        });
        labRow.appendChild(addLab);
        var blockBtn = h("button", { class: "btn btn-ghost btn-sm" }, icon("block", 13), "Dependência");
        blockBtn.addEventListener("click", function () {
          var candidates = PF.projectTasks(p.id).filter(function (x) { return x.id !== t.id && !x.parentId && x.status !== "done"; }).slice(0, 12);
          PF.menu(blockBtn, [{ head: "Bloqueada por…" }].concat(candidates.map(function (x) {
            return {
              label: x.ref + " — " + x.title.slice(0, 40), checked: t.blockedBy.indexOf(x.id) >= 0,
              onClick: function () {
                var bb = t.blockedBy.slice();
                var i = bb.indexOf(x.id);
                if (i >= 0) bb.splice(i, 1); else bb.push(x.id);
                PF.act.updateTask(t.id, { blockedBy: bb });
              }
            };
          })));
        });
        labRow.appendChild(blockBtn);
      }
      body.appendChild(labRow);

      // descrição
      body.appendChild(h("div", { class: "section-h" }, "Descrição"));
      var descIn = h("textarea", { class: "textarea", placeholder: "Sem descrição.", disabled: !canEdit }, t.desc || "");
      descIn.addEventListener("change", function () { PF.act.updateTask(t.id, { desc: descIn.value.trim() }); });
      body.appendChild(descIn);

      // critérios de aceite
      body.appendChild(h("div", { class: "section-h" }, "Critérios de aceite"));
      if (!t.acceptance.length) body.appendChild(h("p", { class: "subtle", style: "font-size:12px" }, "Nenhum critério definido."));
      t.acceptance.forEach(function (a, idx) {
        var cb = h("input", { type: "checkbox", disabled: !canEdit, "aria-label": a.text });
        cb.checked = a.done;
        cb.addEventListener("change", function () {
          var acc = t.acceptance.map(function (x, i) { return i === idx ? { text: x.text, done: cb.checked } : x; });
          PF.act.updateTask(t.id, { acceptance: acc });
        });
        body.appendChild(h("div", { class: "acc-item" + (a.done ? " done" : "") }, cb, h("span", {}, a.text)));
      });
      if (canEdit) {
        var accIn = h("input", { class: "input", placeholder: "Adicionar critério e Enter…", "aria-label": "Novo critério" });
        accIn.addEventListener("keydown", function (e) {
          if (e.key === "Enter" && accIn.value.trim()) {
            PF.act.updateTask(t.id, { acceptance: t.acceptance.concat([{ text: accIn.value.trim(), done: false }]) });
          }
        });
        body.appendChild(h("div", { style: "margin-top:6px" }, accIn));
      }

      // subtarefas
      var subs = PF.db.tasks.filter(function (x) { return x.parentId === t.id; });
      if (subs.length || (canEdit && !t.parentId)) {
        body.appendChild(h("div", { class: "section-h" }, "Subtarefas (" + subs.length + ")"));
        subs.forEach(function (s) {
          body.appendChild(h("button", { class: "menu-item", style: "width:100%", onclick: function () { PF.ui.openTask(s.id); } },
            PF.statusIcon(s.status), h("span", { class: "mono", style: "font-size:11px;color:var(--ink-3)" }, s.ref),
            h("span", { class: "grow" }, s.title), PF.avatarEl(PF.user(s.assigneeId), "sm")));
        });
        if (canEdit && !t.parentId) {
          var subIn = h("input", { class: "input", placeholder: "Nova subtarefa e Enter…", "aria-label": "Nova subtarefa" });
          subIn.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && subIn.value.trim()) {
              PF.act.createTask({ projectId: t.projectId, parentId: t.id, type: "subtask", title: subIn.value.trim(), epicId: t.epicId, sprintId: t.sprintId, teamId: t.teamId, silent: true });
            }
          });
          body.appendChild(h("div", { style: "margin-top:6px" }, subIn));
        }
      }

      // comentários
      var cms = PF.db.comments.filter(function (c) { return c.taskId === t.id; }).sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });
      body.appendChild(h("div", { class: "section-h" }, "Comentários (" + cms.length + ")"));
      cms.forEach(function (c) {
        var u = PF.user(c.userId);
        body.appendChild(h("div", { class: "comment" },
          PF.avatarEl(u, "sm"),
          h("div", { class: "grow" },
            h("div", { class: "c-head" }, h("b", {}, u ? u.name : "?"), h("time", {}, PF.rel(c.createdAt))),
            h("div", { class: "c-body" }, c.text))));
      });
      var cmIn = h("textarea", { class: "textarea", placeholder: "Escreva um comentário… use @Nome Sobrenome para mencionar", style: "min-height:52px" });
      var cmBtn = h("button", { class: "btn btn-primary btn-sm", onclick: function () {
        if (!cmIn.value.trim()) return;
        PF.act.addComment(t.id, cmIn.value.trim());
      } }, icon("send", 13), "Comentar");
      body.appendChild(h("div", { style: "margin-top:8px" }, cmIn, h("div", { style: "margin-top:6px;display:flex;justify-content:flex-end" }, cmBtn)));

      // histórico
      var hist = PF.db.audit.filter(function (a) { return a.entityType === "task" && a.entityId === t.id; }).slice(0, 12);
      body.appendChild(h("div", { class: "section-h" }, "Histórico"));
      if (!hist.length) body.appendChild(h("p", { class: "subtle", style: "font-size:12px" }, "Sem registros ainda."));
      hist.forEach(function (a) {
        var u = PF.user(a.userId);
        body.appendChild(h("div", { class: "hist-item" },
          h("span", { class: "src-tag " + a.source }, a.source),
          h("span", { class: "grow" }, h("b", {}, u ? u.name : "?"), " " + a.summary),
          h("time", {}, PF.rel(a.ts))));
      });
    }
    PF._drawerRefresh = render;
    render();
  };

  function taskMenuBtn(taskId) {
    var btn = h("button", { class: "btn btn-ghost btn-icon", "aria-label": "Ações da tarefa" }, icon("dots", 15));
    btn.addEventListener("click", function () {
      var t = PF.task(taskId);
      var items = [];
      PF.STATUSES.forEach(function (s) {
        if (s !== t.status) items.push({ label: "Mover para " + PF.STATUS_META[s].label, onClick: function () { PF.act.moveTask(taskId, s); } });
      });
      items.push("sep");
      items.push({ icon: "copy", label: "Copiar referência (" + t.ref + ")", onClick: function () {
        try { navigator.clipboard.writeText(t.ref); PF.toast("Copiado", t.ref, "ok"); } catch (e) { PF.toast("Não foi possível copiar", "", "warn"); }
      } });
      if (PF.can("task.delete")) items.push({ icon: "trash", label: "Excluir tarefa…", danger: true, onClick: function () {
        PF.confirm({ title: "Excluir tarefa", msg: "Remove " + t.ref + " e suas subtarefas (simulação). Não pode ser desfeito.", confirmLabel: "Excluir", danger: true })
          .then(function (ok) { if (ok) { PF.closeOverlays(); PF.act.deleteTask(taskId); } });
      } });
      PF.menu(btn, items);
    });
    return btn;
  }

  /* ============================ TABELA DE TAREFAS ============================ */
  var tblState = { q: "", status: "", priority: "", assignee: "", sort: "due", dir: 1, page: 0 };

  PF.ui.renderTaskTable = function (container, opts) {
    opts = opts || {};
    var holder = h("div");
    container.appendChild(holder);
    var st = opts.state || tblState;

    function draw() {
      holder.replaceChildren();
      var tasks = PF.visibleTasks().filter(function (t) {
        if (t.parentId) return false;
        if (opts.projectId && t.projectId !== opts.projectId) return false;
        if (opts.assigneeId && t.assigneeId !== opts.assigneeId) return false;
        if (opts.backlogMode && (t.sprintId || t.status === "done")) return false;
        if (st.status && t.status !== st.status) return false;
        if (st.priority && t.priority !== st.priority) return false;
        if (st.assignee && t.assigneeId !== st.assignee) return false;
        var q = st.q.trim().toLowerCase();
        if (q && t.title.toLowerCase().indexOf(q) < 0 && t.ref.toLowerCase().indexOf(q) < 0) return false;
        return true;
      });

      var fbar = h("div", { class: "fbar" });
      var qIn = h("input", { class: "input search", type: "search", placeholder: "Buscar título ou identificador…", value: st.q, "aria-label": "Buscar tarefas" });
      qIn.addEventListener("input", function () { st.q = qIn.value; st.page = 0; draw(); });
      fbar.appendChild(qIn);
      fbar.appendChild(PF.select([{ value: "", label: "Todos os status" }].concat(PF.STATUSES.map(function (s) { return { value: s, label: PF.STATUS_META[s].label }; })), st.status, function (v) { st.status = v; st.page = 0; draw(); }, { "aria-label": "Status" }));
      fbar.appendChild(PF.select([{ value: "", label: "Todas as prioridades" }].concat(PF.PRIORITIES.map(function (p) { return { value: p, label: PF.PRIO_META[p].label }; })), st.priority, function (v) { st.priority = v; st.page = 0; draw(); }, { "aria-label": "Prioridade" }));
      if (!opts.assigneeId) fbar.appendChild(PF.select([{ value: "", label: "Todos os responsáveis" }].concat(PF.db.users.filter(function (u) { return !u.invited; }).map(function (u) { return { value: u.id, label: u.name }; })), st.assignee, function (v) { st.assignee = v; st.page = 0; draw(); }, { "aria-label": "Responsável" }));
      if (st.q || st.status || st.priority || st.assignee) fbar.appendChild(h("button", { class: "btn btn-ghost btn-sm", onclick: function () { st.q = st.status = st.priority = st.assignee = ""; st.page = 0; draw(); } }, icon("x", 12), "Limpar"));
      holder.appendChild(fbar);

      // ordenação
      var sorters = {
        ref: function (t) { return t.ref; },
        title: function (t) { return t.title.toLowerCase(); },
        status: function (t) { return PF.STATUSES.indexOf(t.status); },
        priority: function (t) { return PF.PRIORITIES.indexOf(t.priority); },
        due: function (t) { return t.dueDate || "9999"; },
        updated: function (t) { return t.updatedAt; }
      };
      tasks.sort(function (a, b) {
        var ka = sorters[st.sort](a), kb = sorters[st.sort](b);
        return (ka < kb ? -1 : ka > kb ? 1 : 0) * st.dir;
      });

      var PAGE = 15;
      var pages = Math.max(1, Math.ceil(tasks.length / PAGE));
      if (st.page >= pages) st.page = pages - 1;
      var slice = tasks.slice(st.page * PAGE, st.page * PAGE + PAGE);

      if (!tasks.length) {
        holder.appendChild(PF.emptyState("tasks", "Nenhuma tarefa encontrada", "Ajuste os filtros ou crie uma nova tarefa.",
          PF.can("task.create") ? h("button", { class: "btn btn-primary", onclick: function () { PF.ui.taskModal({ projectId: opts.projectId }); } }, icon("plus", 14), "Nova tarefa") : null));
        return;
      }

      function th(key, label, cls) {
        var el = h("th", { class: "sortable " + (cls || ""), onclick: function () {
          if (st.sort === key) st.dir = -st.dir; else { st.sort = key; st.dir = 1; }
          draw();
        } }, label);
        if (st.sort === key) el.appendChild(h("span", { class: "arr" }, st.dir > 0 ? "▲" : "▼"));
        return el;
      }

      var tbl = h("table", { class: "tbl" },
        h("thead", {}, h("tr", {},
          h("th", { style: "width:34px" }, ""),
          th("ref", "Ref"), th("title", "Título"), th("status", "Status"),
          th("priority", "Prioridade"), h("th", {}, "Responsável"),
          opts.projectId ? h("th", {}, "Sprint") : h("th", {}, "Projeto"),
          th("due", "Vencimento"), th("updated", "Atualizada"))));
      var tb = h("tbody");
      slice.forEach(function (t) {
        var late = PF.isOverdue(t);
        tb.appendChild(h("tr", { class: "row-click", onclick: function () { PF.ui.openTask(t.id); } },
          h("td", {}, PF.typeIcon(t.type)),
          h("td", { class: "mono nowrap" }, t.ref),
          h("td", {}, h("div", {}, t.title,
            t.blockedBy.length ? h("span", { class: "chip warn", style: "margin-left:6px" }, "bloqueada") : null,
            h("div", {}, t.labels.map(function (l) { var c = PF.labelChip(l); c.style.marginRight = "4px"; return c; })))),
          h("td", {}, PF.statusChip(t.status)),
          h("td", {}, PF.prioChip(t.priority)),
          h("td", {}, PF.whoCell(t.assigneeId)),
          opts.projectId
            ? h("td", {}, (PF.byId("sprints", t.sprintId) || { name: "—" }).name)
            : h("td", {}, PF.project(t.projectId).name),
          h("td", { class: "nowrap" }, t.dueDate ? h("span", { style: late ? "color:var(--danger);font-weight:600" : "" }, PF.fmtDate(t.dueDate)) : h("span", { class: "subtle" }, "—")),
          h("td", { class: "nowrap muted", style: "font-size:11.5px" }, PF.rel(t.updatedAt))));
      });
      tbl.appendChild(tb);

      var panel = h("div", { class: "panel" }, h("div", { class: "tbl-wrap" }, tbl));
      if (pages > 1) {
        panel.appendChild(h("div", { class: "pager" },
          h("span", { class: "num" }, tasks.length + " tarefas"),
          h("span", { class: "grow" }),
          h("button", { class: "btn btn-sm", disabled: st.page === 0, onclick: function () { st.page--; draw(); } }, icon("chevL", 12), "Anterior"),
          h("span", { class: "num" }, (st.page + 1) + " / " + pages),
          h("button", { class: "btn btn-sm", disabled: st.page >= pages - 1, onclick: function () { st.page++; draw(); } }, "Próxima", icon("chevR", 12))));
      } else {
        panel.appendChild(h("div", { class: "pager" }, h("span", { class: "num" }, tasks.length + " tarefas")));
      }
      holder.appendChild(panel);
    }
    draw();
  };

  /* ============================ MINHAS TAREFAS ============================ */
  var myState = { q: "", status: "", priority: "", assignee: "", sort: "due", dir: 1, page: 0 };
  PF.routes["my-tasks"] = {
    title: "Minhas tarefas", app: "workspace",
    render: function (page) {
      var me = PF.me();
      page.appendChild(PF.ui.pageHead("Minhas tarefas", "Tudo o que está atribuído a " + me.name + ".",
        PF.can("task.create") ? h("button", { class: "btn btn-primary", onclick: function () { PF.ui.taskModal({ assigneeId: me.id }); } }, icon("plus", 14), "Nova tarefa") : null));
      PF.ui.renderTaskTable(page, { assigneeId: me.id, state: myState });
    }
  };

  /* ============================ SELETOR DE PROJETO ============================ */
  function projectPicker() {
    var projects = PF.visibleProjects().filter(function (p) { return p.status !== "done"; });
    var cur = PF.project(PF.db.settings.currentProjectId);
    if (!cur || !projects.some(function (p) { return p.id === cur.id; })) {
      cur = projects[0] || null;
      if (cur) PF.db.settings.currentProjectId = cur.id;
    }
    if (!cur) return { el: h("span", { class: "muted" }, "Nenhum projeto disponível"), project: null };
    var sel = PF.select(projects.map(function (p) { return { value: p.id, label: p.name + " (" + p.key + ")" }; }), cur.id,
      function (v) { PF.act.setCurrentProject(v); }, { "aria-label": "Projeto atual", style: "min-width:220px;font-weight:600" });
    return { el: sel, project: cur };
  }

  /* ============================ KANBAN ============================ */
  var boardF = { q: "", assignee: "", priority: "", label: "", sprint: "", group: "none" };

  PF.routes.board = {
    title: "Kanban", app: "workspace", wide: true,
    render: function (page) {
      var pick = projectPicker();
      if (!pick.project) { page.appendChild(PF.emptyState("board", "Nenhum projeto", "Crie um projeto para usar o Kanban.")); return; }
      var p = pick.project;

      page.appendChild(PF.ui.pageHead("Kanban", null, [
        PF.can("task.create") ? h("button", { class: "btn btn-primary", onclick: function () { PF.ui.taskModal({ projectId: p.id }); } }, icon("plus", 14), "Nova tarefa") : null
      ]));

      var fbar = h("div", { class: "fbar" });
      fbar.appendChild(pick.el);
      var qIn = h("input", { class: "input search", type: "search", placeholder: "Buscar título ou ref…", value: boardF.q, "aria-label": "Buscar no quadro" });
      var deb = null;
      qIn.addEventListener("input", function () { clearTimeout(deb); deb = setTimeout(function () { boardF.q = qIn.value; PF.refresh(); }, 180); });
      fbar.appendChild(qIn);
      var members = {};
      p.teamIds.forEach(function (tid) { var tm = PF.team(tid); if (tm) tm.memberIds.forEach(function (m) { members[m] = 1; }); });
      fbar.appendChild(PF.select([{ value: "", label: "Responsável: todos" }].concat(Object.keys(members).map(function (uid) { return { value: uid, label: PF.user(uid).name }; })), boardF.assignee, function (v) { boardF.assignee = v; PF.refresh(); }, { "aria-label": "Responsável" }));
      fbar.appendChild(PF.select([{ value: "", label: "Prioridade: todas" }].concat(PF.PRIORITIES.map(function (pr) { return { value: pr, label: PF.PRIO_META[pr].label }; })), boardF.priority, function (v) { boardF.priority = v; PF.refresh(); }, { "aria-label": "Prioridade" }));
      fbar.appendChild(PF.select([{ value: "", label: "Sprint: todas" }].concat(PF.sprintsOf(p.id).map(function (s) { return { value: s.id, label: s.name }; })), boardF.sprint, function (v) { boardF.sprint = v; PF.refresh(); }, { "aria-label": "Sprint" }));
      fbar.appendChild(PF.select([{ value: "", label: "Etiqueta: todas" }].concat(LABELS.map(function (l) { return { value: l, label: l }; })), boardF.label, function (v) { boardF.label = v; PF.refresh(); }, { "aria-label": "Etiqueta" }));
      fbar.appendChild(PF.select([{ value: "none", label: "Ordenar: padrão" }, { value: "priority", label: "Ordenar: prioridade" }, { value: "due", label: "Ordenar: vencimento" }], boardF.group, function (v) { boardF.group = v; PF.refresh(); }, { "aria-label": "Ordenação" }));
      if (boardF.q || boardF.assignee || boardF.priority || boardF.sprint || boardF.label) {
        fbar.appendChild(h("button", { class: "btn btn-ghost btn-sm", onclick: function () { boardF.q = boardF.assignee = boardF.priority = boardF.sprint = boardF.label = ""; qIn.value = ""; PF.refresh(); } }, icon("x", 12), "Limpar"));
      }
      page.appendChild(fbar);

      var tasks = PF.projectTasks(p.id).filter(function (t) {
        if (t.parentId) return false;
        if (boardF.assignee && t.assigneeId !== boardF.assignee) return false;
        if (boardF.priority && t.priority !== boardF.priority) return false;
        if (boardF.sprint && t.sprintId !== boardF.sprint) return false;
        if (boardF.label && t.labels.indexOf(boardF.label) < 0) return false;
        var q = boardF.q.trim().toLowerCase();
        if (q && t.title.toLowerCase().indexOf(q) < 0 && t.ref.toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      if (boardF.group === "priority") tasks.sort(function (a, b) { return PF.PRIORITIES.indexOf(a.priority) - PF.PRIORITIES.indexOf(b.priority); });
      if (boardF.group === "due") tasks.sort(function (a, b) { return (a.dueDate || "9999") < (b.dueDate || "9999") ? -1 : 1; });

      var board = h("div", { class: "board" });
      PF.STATUSES.forEach(function (status) {
        var colTasks = tasks.filter(function (t) { return t.status === status; });
        var lateN = colTasks.filter(PF.isOverdue).length;
        var col = h("div", { class: "col", dataset: { status: status } });
        var head = h("div", { class: "col-head" },
          PF.statusIcon(status),
          h("b", {}, PF.STATUS_META[status].label),
          h("span", { class: "cnt" }, String(colTasks.length)),
          lateN ? h("span", { class: "chip danger", style: "font-size:10.5px" }, lateN + " atrasada" + (lateN > 1 ? "s" : "")) : null);
        if (PF.can("task.create")) {
          head.appendChild(h("button", {
            class: "btn btn-ghost btn-icon btn-sm", "aria-label": "Criação rápida em " + PF.STATUS_META[status].label,
            onclick: function () { quickAdd(col, p, status); }
          }, icon("plus", 13)));
        }
        col.appendChild(head);
        var bodyEl = h("div", { class: "col-body" });
        colTasks.forEach(function (t) { bodyEl.appendChild(kanbanCard(t)); });
        if (!colTasks.length) bodyEl.appendChild(h("div", { class: "subtle", style: "text-align:center;padding:14px;font-size:11.5px;border:1px dashed var(--border);border-radius:6px" }, "Arraste cards para cá"));
        col.appendChild(bodyEl);

        // drag & drop
        col.addEventListener("dragover", function (e) { e.preventDefault(); col.classList.add("drop-over"); });
        col.addEventListener("dragleave", function () { col.classList.remove("drop-over"); });
        col.addEventListener("drop", function (e) {
          e.preventDefault();
          col.classList.remove("drop-over");
          var id = e.dataTransfer.getData("text/task-id");
          if (!id) return;
          var t = PF.task(id);
          if (t && t.status !== status) PF.act.moveTask(id, status);
        });
        board.appendChild(col);
      });
      page.appendChild(board);
    }
  };

  function kanbanCard(t) {
    var canDrag = PF.canTouchTask(t) && PF.can("task.move");
    var card = h("div", {
      class: "kcard", tabindex: "0", role: "button",
      "aria-label": t.ref + " " + t.title,
      draggable: canDrag ? "true" : null
    });
    var subs = PF.db.tasks.filter(function (x) { return x.parentId === t.id; });
    card.appendChild(h("div", { class: "kc-top" },
      PF.typeIcon(t.type, 13),
      h("span", { class: "ref" }, t.ref),
      h("span", { class: "grow" }),
      PF.prioChip(t.priority, true)));
    card.appendChild(h("div", { class: "kc-title" }, t.title));
    if (t.labels.length) card.appendChild(h("div", { style: "display:flex;gap:4px;flex-wrap:wrap;margin-bottom:7px" }, t.labels.map(PF.labelChip)));
    var due = PF.daysLeft(t.dueDate);
    card.appendChild(h("div", { class: "kc-foot" },
      t.blockedBy.length ? h("span", { class: "blocked-flag" }, icon("block", 11), "bloqueada") : null,
      t.dueDate ? h("span", { class: "due" + (PF.isOverdue(t) ? " late" : "") }, icon("timer", 11), due < 0 ? (-due) + "d atrasada" : due === 0 ? "hoje" : PF.fmtDate(t.dueDate)) : null,
      subs.length ? h("span", { class: "due" }, icon("subtask", 11), subs.filter(function (s) { return s.status === "done"; }).length + "/" + subs.length) : null,
      h("span", { class: "sp" }),
      PF.avatarEl(PF.user(t.assigneeId), "sm")));

    card.addEventListener("click", function () { PF.ui.openTask(t.id); });
    card.addEventListener("keydown", function (e) { if (e.key === "Enter") PF.ui.openTask(t.id); });
    if (canDrag) {
      card.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/task-id", t.id);
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", function () { card.classList.remove("dragging"); });
    }
    return card;
  }

  function quickAdd(col, project, status) {
    if (col.querySelector(".quick-add")) return;
    var input = h("input", { class: "input", placeholder: "Título e Enter…", "aria-label": "Nova tarefa" });
    var wrap = h("div", { class: "quick-add col-add" }, input);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") wrap.remove();
      if (e.key === "Enter" && input.value.trim()) {
        PF.act.createTask({ projectId: project.id, title: input.value.trim(), status: status, sprintId: boardF.sprint || null });
      }
    });
    input.addEventListener("blur", function () { setTimeout(function () { wrap.remove(); }, 150); });
    col.insertBefore(wrap, col.querySelector(".col-body"));
    input.focus();
  }

  /* ============================ BACKLOG ============================ */
  var backlogState = { q: "", status: "", priority: "", assignee: "", sort: "priority", dir: 1, page: 0 };
  PF.routes.backlog = {
    title: "Backlog", app: "workspace",
    render: function (page) {
      var pick = projectPicker();
      if (!pick.project) { page.appendChild(PF.emptyState("backlog", "Nenhum projeto", "Crie um projeto para planejar o backlog.")); return; }
      page.appendChild(PF.ui.pageHead("Backlog", "Tarefas de " + pick.project.name + " ainda fora de sprint.", [
        pick.el,
        PF.can("task.create") ? h("button", { class: "btn btn-primary", onclick: function () { PF.ui.taskModal({ projectId: pick.project.id, status: "backlog" }); } }, icon("plus", 14), "Nova tarefa") : null
      ]));
      PF.ui.renderTaskTable(page, { projectId: pick.project.id, backlogMode: true, state: backlogState });
    }
  };

  /* ============================ SPRINTS ============================ */
  PF.routes.sprints = {
    title: "Sprints", app: "workspace",
    render: function (page) {
      var pick = projectPicker();
      if (!pick.project) { page.appendChild(PF.emptyState("sprint", "Nenhum projeto", "Crie um projeto para planejar sprints.")); return; }
      var p = pick.project;
      page.appendChild(PF.ui.pageHead("Sprints", "Planejamento e histórico de " + p.name + ".", [
        pick.el,
        PF.can("sprint.manage") ? h("button", { class: "btn btn-primary", onclick: function () { sprintModal(p); } }, icon("plus", 14), "Nova sprint") : null
      ]));

      var sprints = PF.sprintsOf(p.id);
      var order = { active: 0, planned: 1, done: 2 };
      sprints.sort(function (a, b) { return order[a.status] - order[b.status] || (a.startDate < b.startDate ? 1 : -1); });
      if (!sprints.length) {
        page.appendChild(PF.emptyState("sprint", "Nenhuma sprint", "Crie a primeira sprint para organizar o trabalho em ciclos.",
          PF.can("sprint.manage") ? h("button", { class: "btn btn-primary", onclick: function () { sprintModal(p); } }, icon("plus", 14), "Nova sprint") : null));
        return;
      }

      sprints.forEach(function (s) {
        var ts = PF.db.tasks.filter(function (t) { return t.sprintId === s.id && !t.parentId; });
        var done = ts.filter(function (t) { return t.status === "done"; }).length;
        var pct = ts.length ? Math.round(100 * done / ts.length) : 0;
        var panel = h("div", { class: "panel", style: "margin-bottom:14px" });
        var stChip = s.status === "active" ? h("span", { class: "chip accent" }, "ativa")
          : s.status === "planned" ? h("span", { class: "chip" }, "planejada")
          : h("span", { class: "chip ok" }, "concluída");
        var headActions = [];
        if (PF.can("sprint.manage")) {
          if (s.status === "planned") headActions.push(h("button", { class: "btn btn-sm btn-primary", onclick: function () { PF.act.startSprint(s.id); } }, icon("play", 12), "Iniciar sprint"));
          if (s.status === "active") headActions.push(h("button", { class: "btn btn-sm", onclick: function () {
            PF.confirm({ title: "Encerrar " + s.name, msg: "Tarefas não concluídas voltam para o backlog do projeto.", confirmLabel: "Encerrar sprint" })
              .then(function (ok) { if (ok) PF.act.completeSprint(s.id); });
          } }, "Encerrar sprint"));
          if (s.status !== "done") {
            var addBtn = h("button", { class: "btn btn-sm" }, icon("plus", 12), "Adicionar do backlog");
            addBtn.addEventListener("click", function () {
              var backlog = PF.projectTasks(p.id).filter(function (t) { return !t.sprintId && !t.parentId && t.status !== "done"; }).slice(0, 14);
              if (!backlog.length) { PF.toast("Backlog vazio", "Não há tarefas fora de sprint neste projeto.", "info"); return; }
              PF.menu(addBtn, [{ head: "Associar à " + s.name }].concat(backlog.map(function (t) {
                return { label: t.ref + " — " + t.title.slice(0, 44), onClick: function () { PF.act.updateTask(t.id, { sprintId: s.id }); } };
              })));
            });
            headActions.push(addBtn);
          }
        }
        panel.appendChild(h("div", { class: "panel-head" },
          h("h3", {}, s.name), stChip,
          h("span", { class: "muted", style: "font-size:12px" }, PF.fmtDate(s.startDate) + " → " + PF.fmtDate(s.endDate)),
          h("span", { class: "spacer" }), headActions));
        var body = h("div", { class: "panel-body" });
        if (s.goal) body.appendChild(h("p", { class: "muted", style: "font-size:12.5px" }, icon("flag", 12), " Meta: " + s.goal));
        body.appendChild(h("div", { style: "display:flex;gap:10px;align-items:center;margin:8px 0" },
          PF.progressBar(pct, pct === 100),
          h("span", { class: "num muted", style: "font-size:12px" }, done + "/" + ts.length + " concluídas (" + pct + "%)")));
        if (ts.length) {
          var list = h("div");
          ts.sort(function (a, b) { return PF.STATUSES.indexOf(a.status) - PF.STATUSES.indexOf(b.status); }).slice(0, 8).forEach(function (t) {
            list.appendChild(PF.ui.taskRow(t));
          });
          if (ts.length > 8) list.appendChild(h("p", { class: "subtle", style: "font-size:11.5px;padding:6px 14px" }, "+ " + (ts.length - 8) + " tarefas — veja no Kanban filtrando por esta sprint."));
          body.appendChild(list);
        } else body.appendChild(h("p", { class: "subtle", style: "font-size:12px" }, "Nenhuma tarefa associada ainda."));
        panel.appendChild(body);
        page.appendChild(panel);
      });
    }
  };

  function sprintModal(project) {
    if (!PF.guard("sprint.manage", "criar sprints")) return;
    var existing = PF.sprintsOf(project.id);
    var nextN = existing.length + 1;
    var m = existing.map(function (s) { return parseInt((s.name.match(/\d+/) || [0])[0], 10); });
    if (m.length) nextN = Math.max.apply(null, m) + 1;
    var name = h("input", { class: "input", value: "Sprint " + nextN, maxlength: "40" });
    var goal = h("input", { class: "input", maxlength: "90", placeholder: "Qual o objetivo desta sprint?" });
    var start = h("input", { class: "input", type: "date", value: new Date().toISOString().slice(0, 10) });
    var end = h("input", { class: "input", type: "date", value: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) });
    var form = h("div", { class: "form-grid" },
      PF.field("Nome", name, { span2: true }), PF.field("Meta", goal, { span2: true }),
      PF.field("Início", start), PF.field("Término", end));
    PF.modal({
      title: "Nova sprint em " + project.name, body: form,
      foot: [
        h("button", { class: "btn", onclick: PF.closeOverlays }, "Cancelar"),
        h("button", { class: "btn btn-primary", onclick: function () {
          PF.clearInvalid(form);
          var ok = true;
          if (!name.value.trim()) { PF.setInvalid(name.closest(".field"), "Informe o nome"); ok = false; }
          if (!start.value || !end.value || end.value <= start.value) { PF.setInvalid(end.closest(".field"), "Término deve ser depois do início"); ok = false; }
          if (!ok) return;
          PF.act.createSprint(project.id, { name: name.value.trim(), goal: goal.value.trim(), startDate: start.value, endDate: end.value });
          PF.closeOverlays();
        } }, "Criar sprint")
      ]
    });
  }

  /* ============================ CRONOGRAMA ============================ */
  var tlF = { span: 180, teamId: "" };
  PF.routes.timeline = {
    title: "Cronograma", app: "workspace", wide: true,
    render: function (page) {
      page.appendChild(PF.ui.pageHead("Cronograma", "Janelas dos projetos e marcos de entrega."));
      var fbar = h("div", { class: "fbar" });
      fbar.appendChild(PF.select([
        { value: "90", label: "Janela de 3 meses" }, { value: "180", label: "Janela de 6 meses" }, { value: "365", label: "Janela de 12 meses" }
      ], String(tlF.span), function (v) { tlF.span = +v; PF.refresh(); }, { "aria-label": "Janela" }));
      fbar.appendChild(PF.select([{ value: "", label: "Todas as equipes" }].concat(PF.db.teams.map(function (t) { return { value: t.id, label: t.name }; })),
        tlF.teamId, function (v) { tlF.teamId = v; PF.refresh(); }, { "aria-label": "Equipe" }));
      page.appendChild(fbar);

      var DAY = 86400000;
      var from = Date.now() - Math.round(tlF.span * 0.35) * DAY;
      var to = Date.now() + Math.round(tlF.span * 0.65) * DAY;
      var total = to - from;
      function pos(dateStr) {
        var tms = new Date(dateStr + (dateStr.length === 10 ? "T12:00:00" : "")).getTime();
        return Math.max(0, Math.min(100, 100 * (tms - from) / total));
      }

      var projs = PF.visibleProjects().filter(function (p) {
        if (tlF.teamId && p.teamIds.indexOf(tlF.teamId) < 0) return false;
        return p.startDate && p.targetDate;
      });

      var panel = h("div", { class: "panel" });
      var gantt = h("div", { class: "gantt" });
      var grid = h("div", { class: "g-grid" });

      // cabeçalho de meses
      var months = h("div", { class: "g-months" }, h("div", { style: "width:220px;flex:none;border-left:0" }, "Projeto"));
      var cur = new Date(from);
      cur.setDate(1);
      var track = h("div", { style: "display:flex;flex:1" });
      while (cur.getTime() < to) {
        var mStart = Math.max(cur.getTime(), from);
        var next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1).getTime();
        var mEnd = Math.min(next, to);
        var w = 100 * (mEnd - mStart) / total;
        if (w > 5) track.appendChild(h("div", { style: "width:" + w + "%" },
          ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][cur.getMonth()] + (cur.getMonth() === 0 ? " " + cur.getFullYear() : "")));
        cur = new Date(next);
      }
      months.appendChild(track);
      grid.appendChild(months);

      projs.forEach(function (p) {
        var row = h("div", { class: "g-row" });
        row.appendChild(h("div", { class: "g-label" }, p.name));
        var tr = h("div", { class: "g-track" });
        var x1 = pos(p.startDate), x2 = pos(p.targetDate);
        var prog = PF.projectProgress(p.id);
        var late = p.status !== "done" && PF.daysLeft(p.targetDate) < 0;
        var cls = p.status === "done" ? "done" : late ? "late" : "";
        var bar = h("div", {
          class: "g-bar " + cls, style: "left:" + x1 + "%;width:" + Math.max(3, x2 - x1) + "%",
          "data-tip": p.name + " · " + prog + "%",
          onclick: function () { PF.navigate("/projects/" + p.id); }
        }, p.key + " · " + prog + "%");
        tr.appendChild(bar);
        PF.db.milestones.filter(function (m) { return m.projectId === p.id; }).forEach(function (m) {
          tr.appendChild(h("div", {
            class: "g-ms" + (m.status === "done" ? " done" : ""),
            style: "left:calc(" + pos(m.date) + "% - 7px)",
            "data-tip": m.name + " · " + PF.fmtDate(m.date),
            role: "img", "aria-label": "Marco: " + m.name
          }));
        });
        // linha de hoje
        tr.appendChild(h("div", { class: "g-today", style: "left:" + pos(new Date().toISOString()) + "%" }));
        row.appendChild(tr);
        grid.appendChild(row);
      });
      if (!projs.length) grid.appendChild(h("div", { class: "empty" }, "Nenhum projeto com datas na janela atual."));

      gantt.appendChild(grid);
      panel.appendChild(gantt);
      page.appendChild(panel);
      page.appendChild(h("div", { class: "legend" },
        h("span", {}, h("i", { style: "background:var(--accent-soft);border:1px solid var(--accent)" }), "Em andamento"),
        h("span", {}, h("i", { style: "background:var(--ok-soft);border:1px solid var(--ok)" }), "Concluído"),
        h("span", {}, h("i", { style: "background:var(--danger-soft);border:1px solid var(--danger)" }), "Prazo estourado"),
        h("span", {}, h("i", { style: "background:var(--violet);rotate:45deg;border-radius:2px" }), "Marco"),
        h("span", {}, h("i", { style: "background:var(--danger)" }), "Hoje")));
    }
  };
})();
