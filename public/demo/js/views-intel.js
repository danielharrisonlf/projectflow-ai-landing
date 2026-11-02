/* ============================================================
   ProjectFlow AI — assistente de IA, MCP, webhooks, notificações
   ============================================================ */
(function () {
  "use strict";
  var h = PF.h, icon = PF.icon;

  var EVENT_CATALOG = [
    "project.created.v1", "project.updated.v1",
    "task.created.v1", "task.assigned.v1", "task.status_changed.v1", "task.completed.v1",
    "sprint.started.v1", "sprint.completed.v1"
  ];

  /* ============================ ASSISTENTE DE IA ============================ */
  var chatLog = []; // sessão em memória

  PF.routes.assistant = {
    title: "Assistente de IA", app: "workspace", cap: "ai.use",
    render: function (page) {
      page.appendChild(PF.ui.pageHead("Assistente de IA",
        "Planejamento assistido e análise dos dados do workspace. As respostas são simuladas no protótipo (serviço ms-ai no produto final), mas calculadas sobre os dados reais da demonstração."));

      var panel = h("div", { class: "panel", style: "display:flex;flex-direction:column;height:calc(100vh - 230px);min-height:420px" });
      var chat = h("div", { class: "chat panel-body", style: "flex:1;min-height:0;display:flex;flex-direction:column" });
      var log = h("div", { class: "chat-log" });
      chat.appendChild(log);

      var suggest = h("div", { class: "chat-suggest" });
      ["Quais tarefas estão atrasadas?", "Quais projetos apresentam riscos?", "Quais tarefas estão bloqueadas?",
        "Resuma a sprint atual", "Identifique possíveis gargalos",
        "Planejar: portal de parceiros com cadastro, catálogo e pedidos"].forEach(function (s) {
        suggest.appendChild(h("button", { class: "btn btn-sm", onclick: function () { send(s); } }, s));
      });

      var input = h("textarea", { class: "textarea", style: "min-height:40px;max-height:120px", placeholder: "Pergunte sobre os projetos ou descreva um briefing para planejar…", "aria-label": "Mensagem para o assistente" });
      var sendBtn = h("button", { class: "btn btn-primary", "aria-label": "Enviar" }, icon("send", 14), "Enviar");
      sendBtn.addEventListener("click", function () { if (input.value.trim()) send(input.value.trim()); });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.value.trim()) send(input.value.trim()); }
      });
      chat.appendChild(suggest);
      chat.appendChild(h("div", { class: "chat-input" }, input, sendBtn));
      panel.appendChild(chat);
      page.appendChild(panel);

      function draw() {
        log.replaceChildren();
        if (!chatLog.length) {
          log.appendChild(h("div", { class: "empty", style: "margin:auto" },
            h("div", { class: "e-ic" }, icon("sparkle", 20)),
            h("b", {}, "Como posso ajudar?"),
            h("p", {}, "Analiso atrasos, riscos, bloqueios e gargalos dos projetos visíveis para o seu perfil, e transformo briefings em propostas de backlog revisáveis.")));
        }
        chatLog.forEach(function (m) {
          var msg = h("div", { class: "msg" + (m.role === "me" ? " me" : "") });
          if (m.role === "me") msg.appendChild(h("div", { class: "bubble" }, m.text));
          else {
            var b = h("div", { class: "bubble" });
            b.appendChild(h("div", {}, h("span", { class: "sim-badge" }, icon("sparkle", 11), "resposta simulada")));
            if (m.node) b.appendChild(m.node);
            msg.appendChild(b);
          }
          log.appendChild(msg);
        });
        log.scrollTop = log.scrollHeight;
      }
      draw();

      function send(text) {
        input.value = "";
        chatLog.push({ role: "me", text: text });
        draw();
        var typing = h("div", { class: "msg" }, h("div", { class: "bubble" }, h("span", { class: "typing" }, h("i"), h("i"), h("i"))));
        log.appendChild(typing);
        log.scrollTop = log.scrollHeight;
        setTimeout(function () {
          typing.remove();
          chatLog.push({ role: "ai", node: answer(text) });
          PF.auditPush("ai_query", "ai", null, null, null, { prompt: text.slice(0, 80) }, "consultou o assistente de IA", "ai");
          PF.save();
          draw();
        }, 650);
      }
    }
  };

  function aiTaskList(tasks, note) {
    var wrap = h("div");
    if (note) wrap.appendChild(h("p", {}, note));
    var ul = h("ul");
    tasks.slice(0, 8).forEach(function (t) {
      var li = h("li", {},
        h("a", { href: "#", class: "mono", onclick: function (e) { e.preventDefault(); PF.ui.openTask(t.id); } }, t.ref),
        " " + t.title + " — " + PF.project(t.projectId).name);
      if (PF.isOverdue(t)) li.appendChild(h("b", { style: "color:var(--danger)" }, " (" + (-PF.daysLeft(t.dueDate)) + "d de atraso)"));
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    if (tasks.length > 8) wrap.appendChild(h("p", { class: "subtle", style: "font-size:12px" }, "… e mais " + (tasks.length - 8) + "."));
    return wrap;
  }

  function answer(text) {
    var q = text.toLowerCase();
    var tasks = PF.visibleTasks().filter(function (t) { return !t.parentId; });

    if (/atrasad/.test(q)) {
      var late = tasks.filter(PF.isOverdue).sort(function (a, b) { return a.dueDate < b.dueDate ? -1 : 1; });
      if (!late.length) return h("div", {}, h("p", {}, "Nenhuma tarefa atrasada nos projetos visíveis. Bom sinal."));
      return aiTaskList(late, "Encontrei " + late.length + " tarefa(s) atrasada(s):");
    }

    if (/risco/.test(q)) {
      var wrap = h("div", {}, h("p", {}, "Avaliação de risco dos projetos ativos (atraso, bloqueios e proximidade da entrega):"));
      var ul = h("ul");
      PF.visibleProjects().filter(function (p) { return p.status === "active"; }).forEach(function (p) {
        var r = PF.projectRisk(p);
        if (r.level === "ok") return;
        ul.appendChild(h("li", {}, h("b", {}, p.name), " — " + r.label.toLowerCase() +
          (r.late ? "; " + r.late + " tarefa(s) atrasada(s)" : "") +
          (r.blocked ? "; " + r.blocked + " bloqueada(s)" : "") +
          (p.targetDate ? "; entrega em " + PF.daysLeft(p.targetDate) + " dias com " + PF.projectProgress(p.id) + "% concluído" : "") + "."));
      });
      if (!ul.children.length) ul.appendChild(h("li", {}, "Nenhum projeto em risco relevante no momento."));
      wrap.appendChild(ul);
      wrap.appendChild(h("p", { class: "subtle", style: "font-size:12px" }, "Detalhes em Insights → Análise de projetos."));
      return wrap;
    }

    if (/bloquead/.test(q)) {
      var blocked = tasks.filter(function (t) { return t.blockedBy.length && t.status !== "done"; });
      if (!blocked.length) return h("div", {}, h("p", {}, "Nenhuma tarefa bloqueada no momento."));
      var w2 = h("div", {}, h("p", {}, blocked.length + " tarefa(s) bloqueada(s):"));
      var ul2 = h("ul");
      blocked.forEach(function (t) {
        var names = t.blockedBy.map(function (id) { var bt = PF.task(id); return bt ? bt.ref : "?"; }).join(", ");
        ul2.appendChild(h("li", {},
          h("a", { href: "#", class: "mono", onclick: function (e) { e.preventDefault(); PF.ui.openTask(t.id); } }, t.ref),
          " " + t.title + " — aguardando " + names));
      });
      w2.appendChild(ul2);
      return w2;
    }

    if (/sprint/.test(q)) {
      var active = PF.db.sprints.filter(function (s) { return s.status === "active" && PF.canSeeProject(s.projectId); });
      if (!active.length) return h("div", {}, h("p", {}, "Não há sprints ativas nos projetos visíveis."));
      var w3 = h("div");
      active.forEach(function (s) {
        var st = PF.db.tasks.filter(function (t) { return t.sprintId === s.id && !t.parentId; });
        var done = st.filter(function (t) { return t.status === "done"; }).length;
        var lateN = st.filter(PF.isOverdue).length;
        var days = PF.daysLeft(s.endDate);
        w3.appendChild(h("p", {}, h("b", {}, s.name + " (" + PF.project(s.projectId).name + ")"),
          " — " + done + " de " + st.length + " tarefas concluídas (" + (st.length ? Math.round(100 * done / st.length) : 0) + "%), " +
          (days >= 0 ? days + " dia(s) restantes" : "estourou o prazo em " + (-days) + " dia(s)") +
          (lateN ? "; " + lateN + " tarefa(s) atrasada(s) dentro da sprint" : "") +
          ". Meta: " + (s.goal || "não definida") + "."));
      });
      return w3;
    }

    if (/gargalo/.test(q)) {
      var byStatus = {};
      PF.STATUSES.forEach(function (s) { byStatus[s] = tasks.filter(function (t) { return t.status === s; }).length; });
      var review = tasks.filter(function (t) { return t.status === "in_review"; });
      var wip = tasks.filter(function (t) { return t.status === "in_progress"; });
      var blocked2 = tasks.filter(function (t) { return t.blockedBy.length && t.status !== "done"; });
      var w4 = h("div", {}, h("p", {}, "Leitura do fluxo atual:"));
      var ul4 = h("ul");
      ul4.appendChild(h("li", {}, "Em revisão: " + review.length + " tarefa(s)" + (review.length > wip.length * 0.6 ? " — a coluna de revisão está acumulando; considere limitar WIP ou reservar horário de revisão." : ".")));
      ul4.appendChild(h("li", {}, "Em andamento: " + wip.length + " tarefa(s) para " + PF.db.users.filter(function (u) { return !u.invited && u.roleId !== "viewer"; }).length + " pessoas."));
      if (blocked2.length) ul4.appendChild(h("li", {}, blocked2.length + " tarefa(s) bloqueada(s) — dependências são o gargalo mais provável."));
      var over = {};
      wip.forEach(function (t) { if (t.assigneeId) over[t.assigneeId] = (over[t.assigneeId] || 0) + 1; });
      var busiest = Object.keys(over).sort(function (a, b) { return over[b] - over[a]; })[0];
      if (busiest && over[busiest] >= 3) ul4.appendChild(h("li", {}, PF.user(busiest).name + " concentra " + over[busiest] + " tarefas em andamento — risco de sobrecarga."));
      w4.appendChild(ul4);
      return w4;
    }

    if (/planej|briefing|proposta|backlog/.test(q) || text.length > 60) {
      return buildProposal(text);
    }

    return h("div", {},
      h("p", {}, "Posso ajudar com análises e planejamento. Experimente:"),
      h("ul", {},
        h("li", {}, "“Quais tarefas estão atrasadas?”"),
        h("li", {}, "“Quais projetos apresentam riscos?”"),
        h("li", {}, "“Resuma a sprint atual”"),
        h("li", {}, "“Planejar: <descreva o escopo de um projeto>” — gero uma proposta de épicos e tarefas para revisão.")));
  }

  function buildProposal(briefing) {
    var subject = briefing.replace(/^planejar[:\s]*/i, "").trim() || "novo módulo";
    var short = subject.length > 46 ? subject.slice(0, 46) + "…" : subject;
    var items = [
      { kind: "epic", title: "Fundação — " + short, desc: "Modelagem, contratos de API e esqueleto das telas." },
      { kind: "task", title: "Especificar requisitos e critérios de aceite de " + short, prio: "high", accept: ["Documento revisado pelo time", "Casos de borda mapeados"] },
      { kind: "task", title: "Modelar dados e migrações para " + short, prio: "high", accept: ["Esquema revisado", "Migração reversível"] },
      { kind: "task", title: "API: endpoints principais de " + short, prio: "medium", accept: ["Contrato documentado", "Testes de integração"] },
      { kind: "subtask", title: "Tratamento de erros e validação de entrada", prio: "medium" },
      { kind: "epic", title: "Experiência — " + short, desc: "Fluxo principal navegável de ponta a ponta." },
      { kind: "task", title: "Interface do fluxo principal de " + short, prio: "medium", accept: ["Estados vazio, erro e carregando", "Acessível por teclado"] },
      { kind: "task", title: "Testes de ponta a ponta do fluxo de " + short, prio: "medium", accept: ["Cenário feliz e dois de falha"] },
      { kind: "task", title: "Observabilidade: métricas e alertas de " + short, prio: "low", accept: ["Dashboard com latência e erros"] }
    ];

    var wrap = h("div");
    wrap.appendChild(h("p", {}, "Proposta de backlog para ", h("b", {}, "“" + short + "”"), ". Revise, desmarque o que não fizer sentido e escolha o projeto de destino. Dependência sugerida: a API precisa da modelagem de dados."));
    var box = h("div", { class: "proposal" });
    var checks = [];
    items.forEach(function (it) {
      var cb = h("input", { type: "checkbox", "aria-label": it.title });
      cb.checked = true;
      checks.push({ cb: cb, item: it });
      var row = h("label", { class: "prop-item" + (it.kind === "subtask" ? " sub" : "") }, cb,
        PF.typeIcon(it.kind === "epic" ? "epic" : it.kind === "subtask" ? "subtask" : "task"),
        h("span", { class: "grow" }, it.title,
          h("span", { class: "pi-meta" }, it.kind === "epic" ? "Épico — " + (it.desc || "") :
            (PF.PRIO_META[it.prio].label + (it.accept ? " · " + it.accept.length + " critérios de aceite" : "")))));
      box.appendChild(row);
    });

    var projects = PF.visibleProjects().filter(function (p) { return p.status === "active"; });
    var target = PF.select(projects.map(function (p) { return { value: p.id, label: p.name }; }),
      PF.db.settings.currentProjectId, null, { "aria-label": "Projeto de destino" });
    var foot = h("div", { class: "prop-foot" });
    foot.appendChild(target);
    var applyBtn = h("button", { class: "btn btn-primary btn-sm" }, icon("check", 13), "Adicionar selecionadas");
    applyBtn.addEventListener("click", function () {
      if (!PF.can("ai.apply")) { PF.deny("aplicar propostas da IA"); return; }
      var projectId = target.value;
      var selected = checks.filter(function (c) { return c.cb.checked; });
      if (!selected.length) { PF.toast("Nada selecionado", "Marque ao menos um item.", "warn"); return; }
      applyBtn.classList.add("is-loading");
      setTimeout(function () {
        var currentEpic = null, lastTask = null, created = 0;
        selected.forEach(function (c) {
          var it = c.item;
          if (it.kind === "epic") {
            currentEpic = PF.act.createEpic(projectId, { name: it.title, desc: it.desc || "" }, "ai");
          } else if (it.kind === "subtask" && lastTask) {
            PF.act.createTask({ projectId: projectId, parentId: lastTask.id, type: "subtask", title: it.title, priority: it.prio, epicId: currentEpic ? currentEpic.id : null, silent: true }, "ai");
            created++;
          } else {
            lastTask = PF.act.createTask({
              projectId: projectId, title: it.title, priority: it.prio || "medium",
              epicId: currentEpic ? currentEpic.id : null, status: "backlog", silent: true,
              acceptance: (it.accept || []).map(function (a) { return { text: a, done: false }; })
            }, "ai");
            if (lastTask) created++;
          }
        });
        applyBtn.classList.remove("is-loading");
        if (created) {
          PF.toast("Backlog criado pela IA", created + " tarefa(s) adicionadas a " + PF.project(projectId).name + ". Veja no Kanban (coluna Backlog).", "ok");
          box.replaceChildren(h("div", { class: "prop-item" }, icon("check", 14), h("span", {}, created + " itens criados em " + PF.project(projectId).name + " — registrados na auditoria com origem “ai”.")));
          foot.remove();
        }
      }, 500);
    });
    foot.appendChild(applyBtn);
    wrap.appendChild(box);
    wrap.appendChild(foot);
    return wrap;
  }

  /* ============================ MCP ============================ */
  PF.routes.mcp = {
    title: "Agentes MCP", app: "workspace", cap: "mcp.view",
    render: function (page, params) {
      var tab = params[0] || "tools";
      page.appendChild(PF.ui.pageHead("Agentes e integração MCP",
        "O mcp-server expõe as operações da plataforma para agentes de IA autorizados. Estado e execuções abaixo são ilustrativos, mas as ferramentas de escrita alteram de fato os dados desta demonstração."));

      // status do servidor
      var strip = h("div", { class: "stat-strip", style: "margin-bottom:14px" },
        h("div", { class: "stat" }, h("div", { class: "lbl" }, icon("plug", 13), "Servidor MCP"), h("div", { class: "val", style: "font-size:15px;color:var(--ok)" }, "Online (ilustrativo)"), h("div", { class: "ctx" }, "mcp-server v0.4.2")),
        h("div", { class: "stat" }, h("div", { class: "lbl" }, "Endpoint"), h("div", { class: "val mono", style: "font-size:12.5px" }, "https://mcp.projectflow.local/sse"), h("div", { class: "ctx" }, "transporte SSE · autenticação por token")),
        h("div", { class: "stat" }, h("div", { class: "lbl" }, "Ferramentas"), h("div", { class: "val" }, String(PF.db.mcpTools.length)), h("div", { class: "ctx" }, PF.db.mcpTools.filter(function (t) { return t.kind === "write"; }).length + " de escrita")),
        h("div", { class: "stat" }, h("div", { class: "lbl" }, "Execuções registradas"), h("div", { class: "val" }, String(PF.db.mcpExecutions.length)), h("div", { class: "ctx" }, "histórico simulado")));
      page.appendChild(strip);

      var tabs = h("div", { class: "tabs" });
      [["tools", "Ferramentas"], ["test", "Testar ferramenta"], ["agents", "Agentes e integrações"], ["runs", "Histórico de execuções"]].forEach(function (tp) {
        tabs.appendChild(h("button", { class: "tab" + (tab === tp[0] ? " active" : ""), onclick: function () { PF.navigate("/mcp/" + tp[0]); } }, tp[1]));
      });
      page.appendChild(tabs);

      if (tab === "tools") {
        var tbl = h("table", { class: "tbl" },
          h("thead", {}, h("tr", {}, h("th", {}, "Ferramenta"), h("th", {}, "Tipo"), h("th", {}, "Descrição"), h("th", {}, "Permissão exigida"), h("th", {}, "Parâmetros"))));
        var tb = h("tbody");
        PF.db.mcpTools.forEach(function (t) {
          tb.appendChild(h("tr", {},
            h("td", { class: "mono nowrap" }, t.name),
            h("td", {}, h("span", { class: "chip " + (t.kind === "write" ? "warn" : "info") }, t.kind === "write" ? "escrita" : "leitura")),
            h("td", {}, t.desc),
            h("td", { class: "mono", style: "font-size:11.5px" }, t.perms),
            h("td", { class: "mono", style: "font-size:11px;color:var(--ink-2)" }, Object.keys(t.params).map(function (k) { return k + ": " + t.params[k]; }).join("\n") || "—")));
        });
        tbl.appendChild(tb);
        page.appendChild(h("div", { class: "panel" }, h("div", { class: "tbl-wrap" }, tbl)));
      }

      if (tab === "test") renderMcpTester(page);

      if (tab === "agents") {
        var grid = h("div", { class: "grid c3" });
        PF.db.mcpAgents.forEach(function (ag) {
          var card = h("div", { class: "panel" });
          card.appendChild(h("div", { class: "panel-head" }, h("h3", {}, ag.name), h("span", { class: "spacer" }),
            PF.can("mcp.write") ? PF.switchEl(ag.active, function (v) {
              ag.active = v;
              PF.auditPush("update", "mcp", ag.id, null, { active: !v }, { active: v }, (v ? "ativou" : "desativou") + " o agente " + ag.name, "ui");
              PF.save(); PF.refresh();
            }, "Ativar " + ag.name) : h("span", { class: "chip " + (ag.active ? "ok" : "") }, ag.active ? "ativo" : "inativo")));
          card.appendChild(h("div", { class: "panel-body" },
            h("span", { class: "chip violet", style: "margin-bottom:8px" }, ag.kind),
            h("p", { class: "muted", style: "font-size:12px" }, ag.desc),
            h("div", { class: "subtle", style: "font-size:11.5px;margin-bottom:6px" }, "Última execução " + PF.rel(ag.lastRun)),
            h("div", {}, ag.scopes.map(function (s) { return h("span", { class: "chip", style: "margin:0 4px 4px 0;font-family:var(--mono);font-size:10.5px" }, s); }))));
          grid.appendChild(card);
        });
        page.appendChild(grid);
      }

      if (tab === "runs") {
        var tbl2 = h("table", { class: "tbl" },
          h("thead", {}, h("tr", {}, h("th", {}, "Quando"), h("th", {}, "Agente"), h("th", {}, "Ferramenta"), h("th", {}, "Argumentos"), h("th", {}, "Resultado"))));
        var tb2 = h("tbody");
        PF.db.mcpExecutions.forEach(function (x) {
          var ag = PF.byId("mcpAgents", x.agentId);
          tb2.appendChild(h("tr", {},
            h("td", { class: "nowrap muted", style: "font-size:11.5px" }, PF.fmtDateTime(x.ts)),
            h("td", {}, ag ? ag.name : "Console de teste"),
            h("td", { class: "mono nowrap" }, x.tool),
            h("td", { class: "mono", style: "font-size:11px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, JSON.stringify(x.args)),
            h("td", {}, x.ok ? h("span", { class: "deliv-status success" }, icon("check", 13), x.summary) : h("span", { class: "deliv-status failed" }, icon("x", 13), x.summary))));
        });
        tbl2.appendChild(tb2);
        page.appendChild(h("div", { class: "panel" }, h("div", { class: "tbl-wrap" }, tbl2)));
      }
    }
  };

  var EXAMPLES = {
    projects_list: { status: "active" },
    projects_get: { project: "PCL" },
    projects_create: { name: "Portal de Parceiros", key: "PRT", description: "Cadastro e pedidos de parceiros" },
    tasks_list: { project: "PCL", status: "in_progress" },
    tasks_get: { ref: "PCL-101" },
    tasks_create: { project: "PCL", title: "Validar fluxo de contestação com 3 clientes piloto", priority: "high" },
    tasks_update: { ref: "PCL-101", fields: { priority: "urgent" } },
    tasks_assign: { ref: "PCL-101", assignee: "Camila Freitas" },
    tasks_move: { ref: "PCL-101", status: "in_review" },
    sprints_list: { project: "PCL" },
    teams_list: {}
  };

  var testerState = { tool: "tasks_list", args: JSON.stringify(EXAMPLES.tasks_list, null, 2), result: null };

  function renderMcpTester(page) {
    var grid = h("div", { class: "grid c2" });
    var left = h("div", { class: "panel" });
    left.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Console de teste")));
    var lb = h("div", { class: "panel-body" });
    var toolSel = PF.select(PF.db.mcpTools.map(function (t) { return { value: t.name, label: t.name + (t.kind === "write" ? "  (escrita)" : "") }; }), testerState.tool, function (v) {
      testerState.tool = v;
      testerState.args = JSON.stringify(EXAMPLES[v] || {}, null, 2);
      argsIn.value = testerState.args;
      descEl.textContent = PF.byId2(PF.db.mcpTools, "name", v).desc;
    });
    var descEl = h("p", { class: "muted", style: "font-size:12px" }, PF.byId2(PF.db.mcpTools, "name", testerState.tool).desc);
    var argsIn = h("textarea", { class: "textarea mono", style: "min-height:120px;font-size:12px", "aria-label": "Argumentos JSON" }, testerState.args);
    argsIn.addEventListener("input", function () { testerState.args = argsIn.value; });
    var runBtn = h("button", { class: "btn btn-primary" }, icon("play", 14), "Executar ferramenta");
    lb.appendChild(PF.field("Ferramenta", toolSel));
    lb.appendChild(descEl);
    lb.appendChild(PF.field("Argumentos (JSON)", argsIn));
    lb.appendChild(h("p", { class: "subtle", style: "font-size:11.5px" },
      "A execução respeita as permissões do perfil ativo (" + PF.roleName(PF.me().roleId) + "). Ferramentas de escrita alteram os dados do protótipo e registram auditoria com origem “mcp”."));
    lb.appendChild(runBtn);
    left.appendChild(lb);

    var right = h("div", { class: "panel" });
    right.appendChild(h("div", { class: "panel-head" }, h("h3", {}, "Resposta")));
    var out = h("pre", { class: "code", style: "min-height:200px;margin:14px" },
      testerState.result ? JSON.stringify(testerState.result, null, 2) : "// Execute uma ferramenta para ver a resposta JSON");
    right.appendChild(out);

    runBtn.addEventListener("click", function () {
      var args;
      try { args = argsIn.value.trim() ? JSON.parse(argsIn.value) : {}; }
      catch (e) {
        testerState.result = { ok: false, error: "JSON inválido: " + e.message };
        out.textContent = JSON.stringify(testerState.result, null, 2);
        return;
      }
      runBtn.classList.add("is-loading");
      setTimeout(function () {
        var res = PF.mcpExecute(toolSel.value, args); // mcpExecute redesenha a página;
        testerState.result = res;                      // o estado persistido devolve a resposta
        PF.refresh();
      }, 350);
    });

    grid.append(left, right);
    page.appendChild(grid);
  }

  PF.byId2 = function (coll, key, val) { return coll.find(function (x) { return x[key] === val; }); };

  PF.mcpExecute = function (toolName, args) {
    var tool = PF.byId2(PF.db.mcpTools, "name", toolName);
    var res;
    function logRun(ok, summary) {
      PF.db.mcpExecutions.unshift({ id: PF.uid("mx"), ts: new Date().toISOString(), agentId: null, tool: toolName, args: args, ok: ok, summary: summary });
      PF.save();
    }
    if (!tool) return { ok: false, error: "Ferramenta desconhecida: " + toolName };
    var capNeeded = tool.kind === "write" ? "mcp.write" : "mcp.read";
    if (!PF.can(capNeeded)) {
      logRun(false, "Negado: perfil sem " + capNeeded);
      PF.deny("executar ferramentas MCP de " + (tool.kind === "write" ? "escrita" : "leitura"));
      return { ok: false, error: "permission_denied", detail: "O papel “" + PF.roleName(PF.me().roleId) + "” não possui a capacidade " + capNeeded + "." };
    }
    function findProject(ref) {
      if (!ref) return null;
      return PF.db.projects.find(function (p) { return p.key === String(ref).toUpperCase() || p.id === ref; }) || null;
    }
    function findTask(ref) {
      return PF.db.tasks.find(function (t) { return t.ref === String(ref).toUpperCase() || t.id === ref; }) || null;
    }
    function tjson(t) {
      return { ref: t.ref, title: t.title, type: t.type, status: t.status, priority: t.priority,
        assignee: t.assigneeId ? PF.user(t.assigneeId).name : null, project: PF.project(t.projectId).key,
        sprint: t.sprintId ? (PF.byId("sprints", t.sprintId) || {}).name : null, dueDate: t.dueDate };
    }

    try {
      switch (toolName) {
        case "projects_list": {
          var list = PF.visibleProjects().filter(function (p) { return !args.status || p.status === args.status; })
            .map(function (p) { return { key: p.key, name: p.name, status: p.status, priority: p.priority, progress: PF.projectProgress(p.id) + "%", targetDate: p.targetDate }; });
          res = { ok: true, count: list.length, projects: list };
          logRun(true, list.length + " projetos retornados");
          break;
        }
        case "projects_get": {
          var p = findProject(args.project);
          if (!p || !PF.canSeeProject(p.id)) { res = { ok: false, error: "not_found", detail: "Projeto não encontrado ou sem acesso." }; logRun(false, "Projeto não encontrado"); break; }
          res = { ok: true, project: { key: p.key, name: p.name, description: p.desc, status: p.status, progress: PF.projectProgress(p.id) + "%",
            epics: PF.epicsOf(p.id).map(function (e) { return e.name; }),
            milestones: PF.db.milestones.filter(function (m) { return m.projectId === p.id; }).map(function (m) { return { name: m.name, date: m.date, status: m.status }; }) } };
          logRun(true, "Projeto " + p.key + " retornado");
          break;
        }
        case "projects_create": {
          if (!args.name || !args.key) { res = { ok: false, error: "invalid_args", detail: "name e key são obrigatórios." }; logRun(false, "Argumentos inválidos"); break; }
          if (!PF.can("project.create")) { res = { ok: false, error: "permission_denied", detail: "Papel sem project.create." }; logRun(false, "Negado: project.create"); break; }
          if (PF.db.projects.some(function (px) { return px.key === String(args.key).toUpperCase(); })) { res = { ok: false, error: "conflict", detail: "Chave já em uso." }; logRun(false, "Chave duplicada"); break; }
          var np = PF.act.createProject({ name: args.name, key: args.key, desc: args.description || "", source: "mcp" });
          res = np ? { ok: true, project: { key: np.key, name: np.name } } : { ok: false, error: "denied" };
          logRun(!!np, np ? "Projeto " + np.key + " criado" : "Negado");
          break;
        }
        case "tasks_list": {
          var tp = findProject(args.project);
          var ts = PF.visibleTasks().filter(function (t) {
            if (t.parentId) return false;
            if (tp && t.projectId !== tp.id) return false;
            if (args.status && t.status !== args.status) return false;
            if (args.assignee) {
              var u = PF.db.users.find(function (x) { return x.name.toLowerCase() === String(args.assignee).toLowerCase() || x.id === args.assignee; });
              if (!u || t.assigneeId !== u.id) return false;
            }
            if (args.sprint) {
              var sp = PF.db.sprints.find(function (x) { return x.name.toLowerCase() === String(args.sprint).toLowerCase() || x.id === args.sprint; });
              if (!sp || t.sprintId !== sp.id) return false;
            }
            return true;
          }).slice(0, 25).map(tjson);
          res = { ok: true, count: ts.length, tasks: ts };
          logRun(true, ts.length + " tarefas retornadas");
          break;
        }
        case "tasks_get": {
          var tg = findTask(args.ref);
          if (!tg || !PF.canSeeProject(tg.projectId)) { res = { ok: false, error: "not_found" }; logRun(false, "Tarefa não encontrada"); break; }
          var full = tjson(tg);
          full.description = tg.desc;
          full.labels = tg.labels;
          full.acceptance = tg.acceptance;
          full.comments = PF.db.comments.filter(function (c) { return c.taskId === tg.id; }).length;
          res = { ok: true, task: full };
          logRun(true, "Tarefa " + tg.ref + " retornada");
          break;
        }
        case "tasks_create": {
          var pc = findProject(args.project);
          if (!pc) { res = { ok: false, error: "not_found", detail: "Projeto não encontrado." }; logRun(false, "Projeto não encontrado"); break; }
          if (!args.title) { res = { ok: false, error: "invalid_args", detail: "title é obrigatório." }; logRun(false, "Argumentos inválidos"); break; }
          var assg = null;
          if (args.assignee) { var au = PF.db.users.find(function (x) { return x.name.toLowerCase() === String(args.assignee).toLowerCase() || x.id === args.assignee; }); assg = au ? au.id : null; }
          var nt = PF.act.createTask({ projectId: pc.id, title: args.title, type: args.type || "task", priority: args.priority || "medium", assigneeId: assg, silent: true }, "mcp");
          res = nt ? { ok: true, task: tjson(nt) } : { ok: false, error: "denied" };
          logRun(!!nt, nt ? "Tarefa " + nt.ref + " criada" : "Negado");
          if (nt) PF.toast("MCP criou uma tarefa", nt.ref + " — " + nt.title, "ok");
          break;
        }
        case "tasks_update": {
          var tu = findTask(args.ref);
          if (!tu) { res = { ok: false, error: "not_found" }; logRun(false, "Tarefa não encontrada"); break; }
          var allowed = ["title", "desc", "description", "priority", "dueDate"];
          var fields = {};
          Object.keys(args.fields || {}).forEach(function (k) {
            var kk = k === "description" ? "desc" : k;
            if (allowed.indexOf(k) >= 0 || allowed.indexOf(kk) >= 0) fields[kk] = args.fields[k];
          });
          if (!Object.keys(fields).length) { res = { ok: false, error: "invalid_args", detail: "fields deve conter title, description, priority ou dueDate." }; logRun(false, "Campos inválidos"); break; }
          var before = tu.priority;
          PF.act.updateTask(tu.id, fields, "mcp");
          res = { ok: true, task: tjson(PF.task(tu.id)) };
          logRun(true, "Tarefa " + tu.ref + " atualizada");
          void before;
          break;
        }
        case "tasks_assign": {
          var ta = findTask(args.ref);
          var uu = PF.db.users.find(function (x) { return x.name.toLowerCase() === String(args.assignee || "").toLowerCase() || x.id === args.assignee; });
          if (!ta) { res = { ok: false, error: "not_found", detail: "Tarefa não encontrada." }; logRun(false, "Tarefa não encontrada"); break; }
          if (!uu) { res = { ok: false, error: "not_found", detail: "Usuário não encontrado — use o nome completo." }; logRun(false, "Usuário não encontrado"); break; }
          if (!PF.can("task.assign")) { res = { ok: false, error: "permission_denied", detail: "Papel sem task.assign." }; logRun(false, "Negado: task.assign"); break; }
          PF.act.updateTask(ta.id, { assigneeId: uu.id }, "mcp");
          res = { ok: true, task: tjson(PF.task(ta.id)) };
          logRun(true, ta.ref + " atribuída a " + uu.name);
          break;
        }
        case "tasks_move": {
          var tm = findTask(args.ref);
          if (!tm) { res = { ok: false, error: "not_found" }; logRun(false, "Tarefa não encontrada"); break; }
          if (PF.STATUSES.indexOf(args.status) < 0) { res = { ok: false, error: "invalid_args", detail: "status deve ser um de: " + PF.STATUSES.join(", ") }; logRun(false, "Status inválido"); break; }
          PF.act.moveTask(tm.id, args.status, "mcp");
          res = { ok: true, task: tjson(PF.task(tm.id)) };
          logRun(true, tm.ref + " movida para " + args.status);
          break;
        }
        case "sprints_list": {
          var ps = findProject(args.project);
          var sps = PF.db.sprints.filter(function (s) { return (!ps || s.projectId === ps.id) && PF.canSeeProject(s.projectId); })
            .map(function (s) {
              var stt = PF.db.tasks.filter(function (t) { return t.sprintId === s.id && !t.parentId; });
              return { name: s.name, project: PF.project(s.projectId).key, status: s.status, start: s.startDate, end: s.endDate,
                tasks: stt.length, done: stt.filter(function (t) { return t.status === "done"; }).length, goal: s.goal };
            });
          res = { ok: true, count: sps.length, sprints: sps };
          logRun(true, sps.length + " sprints retornadas");
          break;
        }
        case "teams_list": {
          var tms = PF.db.teams.map(function (t) {
            return { name: t.name, org: (PF.byId("orgs", t.orgId) || {}).name, lead: t.leadId ? PF.user(t.leadId).name : null,
              members: t.memberIds.map(function (m) { return PF.user(m) ? PF.user(m).name : m; }) };
          });
          res = { ok: true, count: tms.length, teams: tms };
          logRun(true, tms.length + " equipes retornadas");
          break;
        }
        default:
          res = { ok: false, error: "not_implemented" };
          logRun(false, "Não implementada");
      }
    } catch (e) {
      res = { ok: false, error: "internal_error", detail: String(e && e.message || e) };
      logRun(false, "Erro interno");
    }
    PF.refresh();
    return res;
  };

  /* ============================ WEBHOOKS ============================ */
  PF.routes.webhooks = {
    title: "Webhooks", app: "workspace", cap: "webhook.view",
    render: function (page, params) {
      var tab = params[0] || "subs";
      page.appendChild(PF.ui.pageHead("Webhooks e integrações",
        "Assinaturas HTTP notificadas quando eventos acontecem (ms-webhooks). Entregas são simuladas localmente — nenhuma requisição externa é feita.",
        PF.can("webhook.manage") ? h("button", { class: "btn btn-primary", onclick: function () { webhookModal(); } }, icon("plus", 14), "Nova assinatura") : null));

      var tabs = h("div", { class: "tabs" });
      [["subs", "Assinaturas (" + PF.db.webhooks.length + ")"], ["deliveries", "Histórico de entregas (" + PF.db.deliveries.length + ")"], ["catalog", "Catálogo de eventos"]].forEach(function (tp) {
        tabs.appendChild(h("button", { class: "tab" + (tab === tp[0] ? " active" : ""), onclick: function () { PF.navigate("/webhooks/" + tp[0]); } }, tp[1]));
      });
      page.appendChild(tabs);

      if (tab === "subs") {
        if (!PF.db.webhooks.length) { page.appendChild(PF.emptyState("webhook", "Nenhuma assinatura", "Cadastre um endpoint para receber eventos da plataforma.")); return; }
        PF.db.webhooks.forEach(function (wh) {
          var panel = h("div", { class: "panel", style: "margin-bottom:12px" });
          var fails = PF.db.deliveries.filter(function (d) { return d.webhookId === wh.id && d.status === "failed"; }).length;
          panel.appendChild(h("div", { class: "panel-head" },
            h("h3", {}, wh.name),
            wh.active ? h("span", { class: "chip ok" }, "ativa") : h("span", { class: "chip" }, "inativa"),
            wh.health === "failing" ? h("span", { class: "chip danger" }, "endpoint com falhas") : null,
            h("span", { class: "spacer" }),
            PF.can("webhook.manage") ? [
              h("button", { class: "btn btn-sm", onclick: function () { PF.act.testWebhook(wh.id); } }, icon("play", 12), "Testar"),
              h("button", { class: "btn btn-sm", onclick: function () { webhookModal(wh); } }, icon("edit", 12), "Editar"),
              PF.switchEl(wh.active, function (v) { PF.act.updateWebhook(wh.id, { active: v }); }, "Ativar " + wh.name),
              h("button", { class: "btn btn-ghost btn-icon btn-sm", "aria-label": "Excluir " + wh.name, onclick: function () {
                PF.confirm({ title: "Excluir webhook", msg: "Remove a assinatura “" + wh.name + "”. O histórico de entregas é mantido.", confirmLabel: "Excluir", danger: true })
                  .then(function (ok) { if (ok) PF.act.deleteWebhook(wh.id); });
              } }, icon("trash", 13))
            ] : null));
          var body = h("div", { class: "panel-body" });
          body.appendChild(h("div", { class: "hist-item" }, icon("link", 14), h("span", { class: "mono grow", style: "font-size:12px" }, wh.url)));
          // segredo
          var secretCode = h("code", { class: "code", style: "padding:4px 8px;display:inline-block" }, "whsec_••••••••••••••••");
          var revealed = false;
          var eyeBtn = h("button", { class: "btn btn-ghost btn-icon btn-sm", "aria-label": "Revelar segredo" }, icon("eye", 13));
          eyeBtn.addEventListener("click", function () {
            revealed = !revealed;
            secretCode.textContent = revealed ? wh.secret : "whsec_••••••••••••••••";
            eyeBtn.replaceChildren(icon(revealed ? "eyeOff" : "eye", 13));
          });
          body.appendChild(h("div", { class: "secret-box", style: "margin:8px 0" },
            h("span", { class: "subtle", style: "font-size:11.5px" }, "Segredo de assinatura (HMAC):"), secretCode, eyeBtn,
            h("button", { class: "btn btn-ghost btn-icon btn-sm", "aria-label": "Copiar segredo", onclick: function () {
              try { navigator.clipboard.writeText(wh.secret); PF.toast("Segredo copiado", "", "ok"); } catch (e) { PF.toast("Não foi possível copiar", "", "warn"); }
            } }, icon("copy", 13))));
          body.appendChild(h("div", {}, wh.events.map(function (ev) { return h("span", { class: "chip", style: "margin:0 4px 4px 0;font-family:var(--mono);font-size:10.5px" }, ev); })));
          if (fails) body.appendChild(h("p", { class: "subtle", style: "font-size:11.5px;margin-top:6px;color:var(--danger)" }, fails + " entrega(s) com falha — veja o histórico para reenviar."));
          panel.appendChild(body);
          page.appendChild(panel);
        });
      }

      if (tab === "deliveries") {
        if (!PF.db.deliveries.length) { page.appendChild(PF.emptyState("inbox", "Nenhuma entrega registrada", "Movimente uma tarefa no Kanban para gerar eventos.")); return; }
        var tbl = h("table", { class: "tbl" },
          h("thead", {}, h("tr", {}, h("th", {}, "Status"), h("th", {}, "Evento"), h("th", {}, "Assinatura"), h("th", { class: "num" }, "HTTP"), h("th", { class: "num" }, "Tentativas"), h("th", {}, "Quando"))));
        var tb = h("tbody");
        PF.db.deliveries.slice(0, 40).forEach(function (d) {
          var wh = PF.byId("webhooks", d.webhookId);
          tb.appendChild(h("tr", { class: "row-click", onclick: function () { deliveryDrawer(d.id); } },
            h("td", {}, h("span", { class: "deliv-status " + d.status }, icon(d.status === "success" ? "check" : "alert", 13), d.status === "success" ? "entregue" : "falhou")),
            h("td", { class: "mono", style: "font-size:11.5px" }, d.eventType),
            h("td", {}, wh ? wh.name : "—"),
            h("td", { class: "num mono" }, String(d.httpStatus)),
            h("td", { class: "num" }, String(d.attempts.length)),
            h("td", { class: "nowrap muted", style: "font-size:11.5px" }, PF.rel(d.ts))));
        });
        tbl.appendChild(tb);
        page.appendChild(h("div", { class: "panel" }, h("div", { class: "tbl-wrap" }, tbl)));
      }

      if (tab === "catalog") {
        var tblC = h("table", { class: "tbl" },
          h("thead", {}, h("tr", {}, h("th", {}, "Evento"), h("th", {}, "Disparado quando"), h("th", { class: "num" }, "Ocorrências"))));
        var tbC = h("tbody");
        var DESC = {
          "project.created.v1": "um projeto é criado", "project.updated.v1": "um projeto é editado",
          "task.created.v1": "uma tarefa é criada", "task.assigned.v1": "uma tarefa muda de responsável",
          "task.status_changed.v1": "uma tarefa muda de status (Kanban ou drawer)", "task.completed.v1": "uma tarefa chega a Concluído",
          "sprint.started.v1": "uma sprint é iniciada", "sprint.completed.v1": "uma sprint é encerrada"
        };
        EVENT_CATALOG.forEach(function (evt) {
          var n = PF.db.events.filter(function (e) { return e.type === evt; }).length;
          tbC.appendChild(h("tr", {}, h("td", { class: "mono", style: "font-size:12px" }, evt), h("td", {}, DESC[evt]), h("td", { class: "num" }, String(n))));
        });
        tblC.appendChild(tbC);
        page.appendChild(h("div", { class: "panel" }, h("div", { class: "tbl-wrap" }, tblC)));
        page.appendChild(h("p", { class: "subtle", style: "font-size:12px;margin-top:10px" },
          "No produto final, os eventos saem por transactional outbox → SNS → SQS; falhas de entrega vão para a DLQ com retentativa exponencial. O protótipo simula as tentativas no histórico."));
      }
    }
  };

  function webhookModal(existing) {
    if (!PF.guard("webhook.manage", "gerenciar webhooks")) return;
    var name = h("input", { class: "input", maxlength: "60", value: existing ? existing.name : "", placeholder: "ex.: Canal #ops no Slack" });
    var url = h("input", { class: "input mono", value: existing ? existing.url : "", placeholder: "https://exemplo.dev/webhooks/projectflow" });
    var evBoxes = EVENT_CATALOG.map(function (evt) {
      var cb = h("input", { type: "checkbox" });
      cb.checked = existing ? existing.events.indexOf(evt) >= 0 : evt === "task.status_changed.v1";
      cb.dataset.ev = evt;
      return h("label", { class: "check" }, cb, h("span", { class: "mono", style: "font-size:12px" }, evt));
    });
    var form = h("div", {},
      PF.field("Nome", name),
      PF.field("Endpoint HTTP", url, { hint: "Nenhuma requisição real é feita — URLs contendo “fail” ou “.local” simulam um endpoint com falhas." }),
      h("div", { class: "field" }, h("label", {}, "Eventos assinados"), h("div", {}, evBoxes)));
    PF.modal({
      title: existing ? "Editar assinatura" : "Nova assinatura de webhook", body: form,
      foot: [
        h("button", { class: "btn", onclick: PF.closeOverlays }, "Cancelar"),
        h("button", { class: "btn btn-primary", onclick: function () {
          PF.clearInvalid(form);
          var ok = true;
          if (!name.value.trim()) { PF.setInvalid(name.closest(".field"), "Informe um nome"); ok = false; }
          if (!/^https:\/\/[^\s]+\.[^\s]+/.test(url.value.trim())) { PF.setInvalid(url.closest(".field"), "Informe uma URL https válida"); ok = false; }
          var evs = evBoxes.filter(function (l) { return l.querySelector("input").checked; }).map(function (l) { return l.querySelector("input").dataset.ev; });
          if (!evs.length) { PF.setInvalid(evBoxes[0].closest(".field"), "Selecione ao menos um evento"); ok = false; }
          if (!ok) return;
          if (existing) PF.act.updateWebhook(existing.id, { name: name.value.trim(), url: url.value.trim(), events: evs });
          else PF.act.createWebhook({ name: name.value.trim(), url: url.value.trim(), events: evs });
          PF.closeOverlays();
        } }, existing ? "Salvar" : "Cadastrar assinatura")
      ]
    });
  }

  function deliveryDrawer(deliveryId) {
    var render = function (dr) {
      var d = PF.byId("deliveries", deliveryId);
      if (!d) { PF.closeOverlays(); return; }
      var wh = PF.byId("webhooks", d.webhookId);
      var body = dr.body;
      body.replaceChildren();
      body.appendChild(h("div", { class: "task-props" },
        h("span", { class: "pl" }, "Status"), h("span", { class: "deliv-status " + d.status }, icon(d.status === "success" ? "check" : "alert", 13), d.status === "success" ? "Entregue" : "Falhou"),
        h("span", { class: "pl" }, "Evento"), h("span", { class: "mono", style: "font-size:12px" }, d.eventType),
        h("span", { class: "pl" }, "Assinatura"), h("span", {}, wh ? wh.name : "—"),
        h("span", { class: "pl" }, "Endpoint"), h("span", { class: "mono", style: "font-size:11.5px;word-break:break-all" }, wh ? wh.url : "—"),
        h("span", { class: "pl" }, "Quando"), h("span", {}, PF.fmtDateTime(d.ts))));

      body.appendChild(h("div", { class: "section-h" }, "Tentativas (" + d.attempts.length + ")"));
      d.attempts.forEach(function (a, i) {
        body.appendChild(h("div", { class: "attempt-row" },
          h("span", { class: "num", style: "width:20px;color:var(--ink-3)" }, "#" + (i + 1)),
          h("span", { class: "mono", style: "color:" + (a.ok ? "var(--ok)" : "var(--danger)") }, "HTTP " + a.httpStatus),
          h("span", { class: "num muted" }, a.durationMs + " ms"),
          a.manual ? h("span", { class: "chip accent" }, "reenvio manual") : null,
          h("span", { class: "grow" }),
          h("span", { class: "muted", style: "font-size:11px" }, PF.fmtDateTime(a.ts))));
      });
      if (d.status === "failed" && PF.can("webhook.manage")) {
        body.appendChild(h("div", { style: "margin-top:10px" },
          h("button", { class: "btn btn-primary btn-sm", onclick: function () { PF.act.redeliver(d.id); } }, icon("refresh", 13), "Reenviar evento")));
      }
      body.appendChild(h("div", { class: "section-h" }, "Payload"));
      body.appendChild(h("pre", { class: "code" }, JSON.stringify(d.payload, null, 2)));
    };
    var dr = PF.drawer({
      label: "Entrega de webhook",
      head: h("div", { style: "display:flex;gap:8px;align-items:center" }, icon("webhook", 16), h("b", {}, "Entrega de webhook")),
      body: h("div")
    });
    PF._drawerRefresh = function () { render(dr); };
    render(dr);
  }

  /* ============================ NOTIFICAÇÕES ============================ */
  PF.routes.notifications = {
    title: "Notificações", app: "workspace", cap: "notif.view",
    render: function (page, params) {
      var tab = params[0] || "history";
      page.appendChild(PF.ui.pageHead("Notificações multicanal",
        "Entregas por e-mail, WhatsApp e SMS (ms-notifications). Envios são simulados — nenhuma mensagem real sai do navegador."));

      var tabs = h("div", { class: "tabs" });
      [["history", "Histórico de envio (" + PF.db.notifications.length + ")"], ["prefs", "Preferências"], ["templates", "Templates"], ["providers", "Provedores"]].forEach(function (tp) {
        tabs.appendChild(h("button", { class: "tab" + (tab === tp[0] ? " active" : ""), onclick: function () { PF.navigate("/notifications/" + tp[0]); } }, tp[1]));
      });
      page.appendChild(tabs);

      var CH_ICON = { email: "mail", whatsapp: "wapp", sms: "sms" };
      var CH_LABEL = { email: "E-mail", whatsapp: "WhatsApp", sms: "SMS" };

      if (tab === "history") {
        var mine = PF.db.notifications.filter(function (n) { return PF.can("user.manage") || PF.can("webhook.view") || n.toUserId === PF.me().id; });
        if (!mine.length) { page.appendChild(PF.emptyState("bell", "Nenhuma notificação", "Atribua tarefas ou inicie sprints para gerar notificações.")); return; }
        var tbl = h("table", { class: "tbl" },
          h("thead", {}, h("tr", {}, h("th", {}, "Canal"), h("th", {}, "Assunto"), h("th", {}, "Destinatário"), h("th", {}, "Status"), h("th", { class: "num" }, "Tentativas"), h("th", {}, "Quando"), h("th", { class: "actions-col" }))));
        var tb = h("tbody");
        mine.slice(0, 40).forEach(function (n) {
          tb.appendChild(h("tr", { class: "row-click", onclick: function () { notifDrawer(n.id); } },
            h("td", {}, h("span", { style: "display:inline-flex;gap:6px;align-items:center" }, icon(CH_ICON[n.channel], 14), CH_LABEL[n.channel])),
            h("td", {}, n.subject),
            h("td", {}, PF.whoCell(n.toUserId)),
            h("td", {}, n.status === "delivered" ? h("span", { class: "deliv-status success" }, icon("check", 13), "entregue") : h("span", { class: "deliv-status failed" }, icon("alert", 13), "falhou")),
            h("td", { class: "num" }, String(n.attempts)),
            h("td", { class: "nowrap muted", style: "font-size:11.5px" }, PF.rel(n.ts)),
            h("td", { class: "actions-col" }, n.status === "failed" ? h("button", {
              class: "btn btn-sm", onclick: function (e) { e.stopPropagation(); PF.act.resendNotification(n.id); }
            }, icon("refresh", 12), "Reenviar") : null)));
        });
        tbl.appendChild(tb);
        page.appendChild(h("div", { class: "panel" }, h("div", { class: "tbl-wrap" }, tbl)));
      }

      if (tab === "prefs") {
        var canManage = PF.can("notif.manage");
        if (!canManage) page.appendChild(h("p", { class: "subtle", style: "font-size:12px;margin-bottom:10px" }, "Seu perfil pode visualizar, mas não alterar as preferências."));
        var tblP = h("table", { class: "tbl" },
          h("thead", {}, h("tr", {}, h("th", {}, "Evento"), h("th", {}, "E-mail"), h("th", {}, "WhatsApp"), h("th", {}, "SMS"))));
        var tbP = h("tbody");
        PF.db.notifTemplates.forEach(function (tpl) {
          var prefs = PF.db.notifPrefs[tpl.event] || { email: false, whatsapp: false, sms: false };
          tbP.appendChild(h("tr", {},
            h("td", {}, h("b", {}, tpl.name), h("div", { class: "mono subtle", style: "font-size:10.5px" }, tpl.event)),
            ["email", "whatsapp", "sms"].map(function (ch) {
              return h("td", {}, canManage
                ? PF.switchEl(prefs[ch], function (v) { PF.act.setNotifPref(tpl.event, ch, v); }, tpl.name + " via " + ch)
                : (prefs[ch] ? h("span", { class: "chip ok" }, "ligado") : h("span", { class: "chip" }, "desligado")));
            })));
        });
        tblP.appendChild(tbP);
        page.appendChild(h("div", { class: "panel" }, h("div", { class: "tbl-wrap" }, tblP)));
      }

      if (tab === "templates") {
        var grid = h("div", { class: "grid c2" });
        PF.db.notifTemplates.forEach(function (tpl) {
          grid.appendChild(h("div", { class: "panel" },
            h("div", { class: "panel-head" }, h("h3", {}, tpl.name), h("span", { class: "spacer" }), h("span", { class: "chip mono", style: "font-size:10.5px" }, tpl.event)),
            h("div", { class: "panel-body" },
              h("div", { class: "field" }, h("label", {}, "Assunto"), h("code", { class: "code", style: "white-space:normal" }, tpl.subject)),
              h("div", { class: "field", style: "margin-bottom:0" }, h("label", {}, "Corpo"), h("code", { class: "code", style: "white-space:normal" }, tpl.body)))));
        });
        page.appendChild(grid);
        page.appendChild(h("p", { class: "subtle", style: "font-size:12px;margin-top:10px" }, "Variáveis entre chaves ({ref}, {nome}, {projeto}…) são substituídas no envio."));
      }

      if (tab === "providers") {
        var grid2 = h("div", { class: "grid c3" });
        Object.keys(PF.db.providers).forEach(function (ch) {
          var pv = PF.db.providers[ch];
          var card = h("div", { class: "panel" });
          card.appendChild(h("div", { class: "panel-head" },
            icon(CH_ICON[ch], 15), h("h3", {}, CH_LABEL[ch]), h("span", { class: "spacer" }),
            pv.configured ? h("span", { class: "chip ok" }, "configurado") : h("span", { class: "chip danger" }, "não configurado")));
          card.appendChild(h("div", { class: "panel-body" },
            h("p", { class: "muted", style: "font-size:12px" }, pv.name),
            pv.configured ? h("div", { class: "mono subtle", style: "font-size:11.5px" }, "remetente: " + pv.from) : h("p", { class: "subtle", style: "font-size:12px" }, "Envios por este canal falham até a configuração."),
            PF.can("webhook.manage") ? h("div", { style: "margin-top:10px" },
              h("button", { class: "btn btn-sm", onclick: function () { providerModal(ch); } }, icon("settings", 12), "Configurar")) : null));
          grid2.appendChild(card);
        });
        page.appendChild(grid2);
      }
    }
  };

  function notifDrawer(id) {
    var n = PF.byId("notifications", id);
    var CH_LABEL = { email: "E-mail", whatsapp: "WhatsApp", sms: "SMS" };
    var dr = PF.drawer({
      label: "Notificação",
      head: h("div", { style: "display:flex;gap:8px;align-items:center" }, icon("bell", 16), h("b", {}, "Notificação — " + CH_LABEL[n.channel])),
      body: h("div")
    });
    var body = dr.body;
    body.appendChild(h("div", { class: "task-props" },
      h("span", { class: "pl" }, "Status"), n.status === "delivered" ? h("span", { class: "deliv-status success" }, icon("check", 13), "Entregue") : h("span", { class: "deliv-status failed" }, icon("alert", 13), n.failReason || "Falhou"),
      h("span", { class: "pl" }, "Destinatário"), PF.whoCell(n.toUserId),
      h("span", { class: "pl" }, "Evento"), h("span", { class: "mono", style: "font-size:11.5px" }, n.eventType),
      h("span", { class: "pl" }, "Tentativas"), h("span", { class: "num" }, String(n.attempts)),
      h("span", { class: "pl" }, "Quando"), h("span", {}, PF.fmtDateTime(n.ts))));
    body.appendChild(h("div", { class: "section-h" }, "Assunto"));
    body.appendChild(h("p", {}, n.subject));
    body.appendChild(h("div", { class: "section-h" }, "Mensagem"));
    body.appendChild(h("p", { style: "white-space:pre-wrap" }, n.body));
    if (n.status === "failed") {
      body.appendChild(h("div", { style: "margin-top:12px" },
        h("button", { class: "btn btn-primary btn-sm", onclick: function () { PF.act.resendNotification(n.id); PF.closeOverlays(); } }, icon("refresh", 13), "Reenviar notificação")));
    }
  }

  function providerModal(ch) {
    var pv = PF.db.providers[ch];
    var from = h("input", { class: "input", value: pv.from, placeholder: ch === "email" ? "noreply@empresa.dev" : "+55 11 90000-0000" });
    var host = h("input", { class: "input mono", value: pv.host, placeholder: ch === "email" ? "smtp.empresa.dev" : "api.gateway.exemplo" });
    var form = h("div", {},
      h("p", { class: "muted", style: "font-size:12px" }, "Configuração simulada — nenhuma credencial é usada nem armazenada fora do navegador."),
      PF.field("Remetente", from), PF.field("Servidor / gateway", host));
    PF.modal({
      title: "Configurar " + pv.name, body: form,
      foot: [
        h("button", { class: "btn", onclick: PF.closeOverlays }, "Cancelar"),
        h("button", { class: "btn btn-primary", onclick: function () {
          PF.clearInvalid(form);
          if (!from.value.trim()) { PF.setInvalid(from.closest(".field"), "Informe o remetente"); return; }
          PF.act.setProvider(ch, { from: from.value.trim(), host: host.value.trim(), configured: true });
          PF.closeOverlays();
        } }, "Salvar configuração")
      ]
    });
  }
})();
