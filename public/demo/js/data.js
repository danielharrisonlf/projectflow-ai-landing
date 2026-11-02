/* ============================================================
   ProjectFlow AI — dados simulados (seed determinístico)
   Nenhum dado real. Datas relativas ao momento do seed.
   ============================================================ */
(function () {
  "use strict";

  var SEED_VERSION = 7;

  // PRNG determinístico (mulberry32)
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedDb() {
    var rnd = mulberry32(420042);
    function rint(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
    function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
    function chance(p) { return rnd() < p; }

    var NOW = Date.now();
    var DAY = 86400000;
    function dIso(offsetDays, hour) {
      var d = new Date(NOW + offsetDays * DAY);
      d.setHours(hour != null ? hour : rint(8, 18), rint(0, 59), rint(0, 59), 0);
      return d.toISOString();
    }
    function dateOnly(offsetDays) {
      return new Date(NOW + offsetDays * DAY).toISOString().slice(0, 10);
    }

    var AV_COLORS = ["#2B5FD9", "#6D4FC4", "#0E7490", "#1D7A4C", "#9A5B00", "#BE3030", "#B23A78", "#4A6572", "#7A5C2E", "#3D7068"];

    // ---------- organizações ----------
    var orgs = [
      { id: "org-vetor", name: "Vetor Labs", slug: "vetor-labs", desc: "Produto e engenharia de software", demo: true },
      { id: "org-atlas", name: "Atlas Engenharia & Consultoria", slug: "atlas", desc: "Consultoria em operações industriais", demo: true }
    ];

    // ---------- papéis de acesso ----------
    var roles = [
      { id: "admin", name: "Administrador da organização", desc: "Configuração organizacional, usuários, integrações e auditoria." },
      { id: "pm", name: "Gestor de projetos", desc: "Gerencia projetos, sprints, tarefas e indicadores." },
      { id: "lead", name: "Líder de equipe", desc: "Gerencia atividades e integrantes da própria equipe." },
      { id: "dev", name: "Desenvolvedor / Colaborador", desc: "Vê projetos autorizados e trabalha nas próprias tarefas." },
      { id: "viewer", name: "Visualizador / Auditor", desc: "Acesso de leitura a relatórios e histórico." }
    ];

    // ---------- usuários ----------
    function mkUser(i, name, title, roleId, orgId, teamIds) {
      var parts = name.split(" ");
      return {
        id: "u" + i, name: name,
        email: name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ /g, ".") + "@" + (orgId === "org-atlas" ? "atlas.eng.br" : "vetorlabs.dev"),
        initials: (parts[0][0] + parts[parts.length - 1][0]).toUpperCase(),
        color: AV_COLORS[i % AV_COLORS.length],
        title: title, roleId: roleId, orgId: orgId, teamIds: teamIds, active: true
      };
    }
    var users = [
      mkUser(1, "Helena Costa", "Head de Operações", "admin", "org-vetor", ["tm-plat"]),
      mkUser(2, "Ricardo Nogueira", "Gerente de Projetos", "pm", "org-vetor", ["tm-plat", "tm-web"]),
      mkUser(3, "Marina Duarte", "Gerente de Projetos", "pm", "org-vetor", ["tm-mob", "tm-dados"]),
      mkUser(4, "Ana Souza", "Tech Lead — Plataforma", "lead", "org-vetor", ["tm-plat"]),
      mkUser(5, "Felipe Ramos", "Tech Lead — Mobile", "lead", "org-vetor", ["tm-mob"]),
      mkUser(6, "Juliana Pires", "Lead de Dados", "lead", "org-vetor", ["tm-dados"]),
      mkUser(7, "Bruno Carvalho", "Engenheiro Backend Sr.", "dev", "org-vetor", ["tm-plat"]),
      mkUser(8, "Camila Freitas", "Engenheira Frontend", "dev", "org-vetor", ["tm-web"]),
      mkUser(9, "Diego Martins", "Engenheiro Backend", "dev", "org-vetor", ["tm-plat", "tm-infra"]),
      mkUser(10, "Eduarda Lopes", "Engenheira Mobile", "dev", "org-vetor", ["tm-mob"]),
      mkUser(11, "Gustavo Henrique", "Engenheiro de Dados", "dev", "org-vetor", ["tm-dados"]),
      mkUser(12, "Isabela Rocha", "Engenheira Frontend Sr.", "dev", "org-vetor", ["tm-web"]),
      mkUser(13, "João Pedro Alves", "SRE", "dev", "org-vetor", ["tm-infra"]),
      mkUser(14, "Larissa Mendes", "Analista de QA", "dev", "org-vetor", ["tm-qa"]),
      mkUser(15, "Otávio Ferreira", "Engenheiro Mobile", "dev", "org-vetor", ["tm-mob"]),
      mkUser(16, "Renata Siqueira", "Consultora de Processos", "dev", "org-atlas", ["tm-consult"]),
      mkUser(17, "Thiago Barbosa", "Consultor Industrial", "dev", "org-atlas", ["tm-consult"]),
      mkUser(18, "Sérgio Tavares", "Auditor Interno", "viewer", "org-vetor", [])
    ];

    // ---------- equipes ----------
    var teams = [
      { id: "tm-plat", orgId: "org-vetor", name: "Plataforma", desc: "APIs core, serviços e integrações", leadId: "u4", memberIds: ["u1", "u2", "u4", "u7", "u9"] },
      { id: "tm-web", orgId: "org-vetor", name: "Produto & Web", desc: "Frontends web e experiência do cliente", leadId: "u12", memberIds: ["u2", "u8", "u12"] },
      { id: "tm-mob", orgId: "org-vetor", name: "Mobile", desc: "Aplicativos iOS e Android", leadId: "u5", memberIds: ["u3", "u5", "u10", "u15"] },
      { id: "tm-dados", orgId: "org-vetor", name: "Dados & IA", desc: "Pipelines, analytics e modelos", leadId: "u6", memberIds: ["u3", "u6", "u11"] },
      { id: "tm-infra", orgId: "org-vetor", name: "Infra & SRE", desc: "Nuvem, observabilidade e confiabilidade", leadId: "u13", memberIds: ["u9", "u13"] },
      { id: "tm-qa", orgId: "org-vetor", name: "Qualidade", desc: "Testes, automação e release", leadId: "u14", memberIds: ["u14"] },
      { id: "tm-consult", orgId: "org-atlas", name: "Consultoria", desc: "Projetos de consultoria Atlas", leadId: "u16", memberIds: ["u16", "u17"] }
    ];

    // ---------- projetos ----------
    function mkProject(o) {
      return Object.assign({
        status: "active", priority: "medium", favorite: false, archived: false,
        createdAt: dIso(-o.age, 10), progressNote: ""
      }, o);
    }
    var projects = [
      mkProject({ id: "prj-pcl", orgId: "org-vetor", key: "PCL", name: "Portal do Cliente 2.0", desc: "Reconstrução do portal de autoatendimento com nova central de faturas, contratos e suporte.", teamIds: ["tm-web", "tm-plat"], leadId: "u2", priority: "high", startDate: dateOnly(-95), targetDate: dateOnly(34), favorite: true, age: 95, color: "#2B5FD9" }),
      mkProject({ id: "prj-pag", orgId: "org-vetor", key: "PAG", name: "Plataforma de Pagamentos", desc: "Gateway interno de cobrança: Pix, cartão e conciliação automática com o financeiro.", teamIds: ["tm-plat", "tm-qa"], leadId: "u2", priority: "urgent", startDate: dateOnly(-120), targetDate: dateOnly(18), favorite: true, age: 120, color: "#1D7A4C" }),
      mkProject({ id: "prj-apc", orgId: "org-vetor", key: "APC", name: "Aplicativo de Campo", desc: "App offline-first para técnicos em campo: ordens de serviço, fotos e assinatura digital.", teamIds: ["tm-mob", "tm-qa"], leadId: "u3", priority: "high", startDate: dateOnly(-80), targetDate: dateOnly(45), favorite: false, age: 80, color: "#6D4FC4" }),
      mkProject({ id: "prj-nuv", orgId: "org-vetor", key: "NUV", name: "Migração para Nuvem", desc: "Migração dos serviços legados do datacenter para AWS com IaC e esteira de deploy.", teamIds: ["tm-infra", "tm-plat"], leadId: "u13", priority: "medium", startDate: dateOnly(-140), targetDate: dateOnly(60), favorite: false, age: 140, color: "#0E7490" }),
      mkProject({ id: "prj-dlk", orgId: "org-vetor", key: "DLK", name: "Data Lake Corporativo", desc: "Ingestão unificada de dados de produto e financeiro para analytics e relatórios executivos.", teamIds: ["tm-dados"], leadId: "u6", priority: "medium", startDate: dateOnly(-70), targetDate: dateOnly(75), favorite: false, age: 70, color: "#9A5B00" }),
      mkProject({ id: "prj-obs", orgId: "org-vetor", key: "OBS", name: "Observabilidade & SRE", desc: "Padronização de métricas, tracing distribuído e alertas acionáveis para todos os serviços.", teamIds: ["tm-infra"], leadId: "u13", priority: "high", startDate: dateOnly(-55), targetDate: dateOnly(28), favorite: false, age: 55, color: "#BE3030" }),
      mkProject({ id: "prj-fat", orgId: "org-vetor", key: "FAT", name: "Automação de Faturamento", desc: "Robôs de emissão de notas e régua de cobrança integrada ao ERP.", teamIds: ["tm-plat"], leadId: "u4", priority: "medium", status: "paused", startDate: dateOnly(-160), targetDate: dateOnly(90), favorite: false, age: 160, color: "#4A6572" }),
      mkProject({ id: "prj-onb", orgId: "org-vetor", key: "ONB", name: "Onboarding Digital", desc: "Fluxo de cadastro e ativação de novos clientes com verificação de identidade.", teamIds: ["tm-web"], leadId: "u12", priority: "medium", status: "done", startDate: dateOnly(-210), targetDate: dateOnly(-25), favorite: false, age: 210, color: "#3D7068" }),
      mkProject({ id: "prj-web", orgId: "org-vetor", key: "WEB", name: "Website Institucional", desc: "Novo site institucional com blog, carreiras e páginas de produto.", teamIds: ["tm-web"], leadId: "u12", priority: "low", startDate: dateOnly(-40), targetDate: dateOnly(50), favorite: false, age: 40, color: "#B23A78" }),
      mkProject({ id: "prj-cma", orgId: "org-atlas", key: "CMA", name: "Diagnóstico Industrial Andrade", desc: "Mapeamento de processos e plano de eficiência operacional para a Metalúrgica Andrade.", teamIds: ["tm-consult"], leadId: "u16", priority: "high", startDate: dateOnly(-50), targetDate: dateOnly(22), favorite: false, age: 50, color: "#7A5C2E" }),
      mkProject({ id: "prj-erp", orgId: "org-atlas", key: "ERP", name: "Integração ERP Protheus", desc: "Integração de pedidos e estoque entre o chão de fábrica e o ERP Protheus.", teamIds: ["tm-consult"], leadId: "u16", priority: "medium", startDate: dateOnly(-30), targetDate: dateOnly(70), favorite: false, age: 30, color: "#2B5FD9" })
    ];

    // ---------- épicos ----------
    var epics = [
      { id: "ep-pcl-1", projectId: "prj-pcl", name: "Central de faturas", desc: "Consulta, download e contestação de faturas.", status: "active", ownerId: "u12" },
      { id: "ep-pcl-2", projectId: "prj-pcl", name: "Área de contratos", desc: "Visualização e aditivos de contratos.", status: "active", ownerId: "u8" },
      { id: "ep-pag-1", projectId: "prj-pag", name: "Pix e QR dinâmico", desc: "Cobranças instantâneas com conciliação.", status: "active", ownerId: "u4" },
      { id: "ep-pag-2", projectId: "prj-pag", name: "Conciliação financeira", desc: "Baixa automática e relatório de divergências.", status: "active", ownerId: "u7" },
      { id: "ep-apc-1", projectId: "prj-apc", name: "Modo offline", desc: "Sincronização resiliente e fila local.", status: "active", ownerId: "u5" },
      { id: "ep-apc-2", projectId: "prj-apc", name: "Ordens de serviço", desc: "Ciclo completo da OS no app.", status: "active", ownerId: "u10" },
      { id: "ep-nuv-1", projectId: "prj-nuv", name: "Fundação AWS", desc: "Landing zone, redes e IAM.", status: "done", ownerId: "u13" },
      { id: "ep-nuv-2", projectId: "prj-nuv", name: "Migração de serviços", desc: "Containers e banco gerenciado.", status: "active", ownerId: "u9" },
      { id: "ep-dlk-1", projectId: "prj-dlk", name: "Ingestão de fontes", desc: "Conectores de produto e financeiro.", status: "active", ownerId: "u11" },
      { id: "ep-obs-1", projectId: "prj-obs", name: "Tracing distribuído", desc: "OpenTelemetry nos serviços core.", status: "active", ownerId: "u13" },
      { id: "ep-obs-2", projectId: "prj-obs", name: "Alertas acionáveis", desc: "Revisão de alertas e runbooks.", status: "active", ownerId: "u9" },
      { id: "ep-cma-1", projectId: "prj-cma", name: "Mapeamento de processos", desc: "AS-IS das linhas de produção.", status: "active", ownerId: "u16" },
      { id: "ep-erp-1", projectId: "prj-erp", name: "Pedidos e estoque", desc: "Fluxos de integração com o Protheus.", status: "active", ownerId: "u17" },
      { id: "ep-web-1", projectId: "prj-web", name: "Lançamento do site", desc: "Home, produto e blog.", status: "active", ownerId: "u8" }
    ];

    // ---------- sprints ----------
    var sprints = [
      { id: "sp-pcl-14", projectId: "prj-pcl", name: "Sprint 14", goal: "Fechar fluxo de download de faturas", status: "done", startDate: dateOnly(-28), endDate: dateOnly(-14) },
      { id: "sp-pcl-15", projectId: "prj-pcl", name: "Sprint 15", goal: "Contestação de faturas de ponta a ponta", status: "active", startDate: dateOnly(-13), endDate: dateOnly(1) },
      { id: "sp-pcl-16", projectId: "prj-pcl", name: "Sprint 16", goal: "Área de contratos navegável", status: "planned", startDate: dateOnly(2), endDate: dateOnly(16) },
      { id: "sp-pag-8", projectId: "prj-pag", name: "Sprint 8", goal: "Pix em produção para piloto", status: "done", startDate: dateOnly(-30), endDate: dateOnly(-16) },
      { id: "sp-pag-9", projectId: "prj-pag", name: "Sprint 9", goal: "Conciliação automática do Pix", status: "active", startDate: dateOnly(-15), endDate: dateOnly(-1) },
      { id: "sp-apc-5", projectId: "prj-apc", name: "Sprint 5", goal: "Sincronização offline estável", status: "active", startDate: dateOnly(-10), endDate: dateOnly(4) },
      { id: "sp-dlk-3", projectId: "prj-dlk", name: "Sprint 3", goal: "Conector do financeiro ingerindo", status: "planned", startDate: dateOnly(3), endDate: dateOnly(17) }
    ];

    // ---------- marcos ----------
    var milestones = [
      { id: "ms-pcl-1", projectId: "prj-pcl", name: "Beta fechado com 10 clientes", date: dateOnly(12), status: "open" },
      { id: "ms-pcl-2", projectId: "prj-pcl", name: "GA do portal", date: dateOnly(34), status: "open" },
      { id: "ms-pag-1", projectId: "prj-pag", name: "Pix piloto em produção", date: dateOnly(-12), status: "done" },
      { id: "ms-pag-2", projectId: "prj-pag", name: "Go-live cartão", date: dateOnly(18), status: "open" },
      { id: "ms-apc-1", projectId: "prj-apc", name: "Piloto com equipe de campo SP", date: dateOnly(20), status: "open" },
      { id: "ms-nuv-1", projectId: "prj-nuv", name: "Landing zone aprovada", date: dateOnly(-60), status: "done" },
      { id: "ms-nuv-2", projectId: "prj-nuv", name: "50% dos serviços migrados", date: dateOnly(25), status: "open" },
      { id: "ms-obs-1", projectId: "prj-obs", name: "Tracing nos serviços core", date: dateOnly(14), status: "open" },
      { id: "ms-cma-1", projectId: "prj-cma", name: "Entrega do diagnóstico AS-IS", date: dateOnly(8), status: "open" },
      { id: "ms-erp-1", projectId: "prj-erp", name: "Homologação pedidos", date: dateOnly(40), status: "open" }
    ];

    // ---------- tarefas ----------
    var TITLES = {
      "prj-pcl": [
        ["Implementar listagem de faturas com filtros por período", "ep-pcl-1"],
        ["Download de fatura em PDF com código de barras", "ep-pcl-1"],
        ["Fluxo de contestação de fatura com anexos", "ep-pcl-1"],
        ["Tela de detalhe do contrato com histórico de aditivos", "ep-pcl-2"],
        ["Autenticação com verificação em duas etapas", null],
        ["Página de suporte com abertura de chamado", null],
        ["Corrigir quebra de layout na tabela de faturas no Safari", "ep-pcl-1"],
        ["Notificar cliente quando fatura é gerada", "ep-pcl-1"],
        ["Assinatura eletrônica de aditivo contratual", "ep-pcl-2"],
        ["Dashboard inicial do cliente com resumo financeiro", null],
        ["Exportação de contratos em lote", "ep-pcl-2"],
        ["Bug: sessão expira sem aviso durante preenchimento", null],
        ["Acessibilidade: navegação por teclado na central de faturas", "ep-pcl-1"],
        ["Testes e2e do fluxo de contestação", "ep-pcl-1"]
      ],
      "prj-pag": [
        ["Gerar cobrança Pix com QR dinâmico", "ep-pag-1"],
        ["Webhook de confirmação de pagamento Pix", "ep-pag-1"],
        ["Conciliação automática de recebimentos Pix", "ep-pag-2"],
        ["Relatório diário de divergências de conciliação", "ep-pag-2"],
        ["Tokenização de cartão com gateway parceiro", null],
        ["Retentativa de cobrança para cartões recusados", null],
        ["Bug: valor duplicado na baixa de pagamentos simultâneos", "ep-pag-2"],
        ["Idempotência na API de criação de cobranças", "ep-pag-1"],
        ["Monitorar fila de conciliação com alerta de atraso", "ep-pag-2"],
        ["Antifraude: regras de velocidade por CPF", null],
        ["Estorno parcial de transações de cartão", null],
        ["Documentar API de cobranças para parceiros", null]
      ],
      "prj-apc": [
        ["Fila local de sincronização com retry exponencial", "ep-apc-1"],
        ["Resolver conflitos de edição offline na OS", "ep-apc-1"],
        ["Captura de fotos com compressão no dispositivo", "ep-apc-2"],
        ["Assinatura do cliente na conclusão da OS", "ep-apc-2"],
        ["Checklist dinâmico por tipo de serviço", "ep-apc-2"],
        ["Bug: app trava ao sincronizar 200+ fotos", "ep-apc-1"],
        ["Mapa com roteirização das OS do dia", null],
        ["Modo escuro no aplicativo", null],
        ["Notificação push de nova OS atribuída", null],
        ["Telemetria de uso offline para produto", "ep-apc-1"],
        ["Reduzir tamanho do bundle Android em 30%", null]
      ],
      "prj-nuv": [
        ["Provisionar VPC e sub-redes com Terraform", "ep-nuv-1"],
        ["Pipeline de deploy com aprovação por ambiente", "ep-nuv-1"],
        ["Migrar serviço de autenticação para ECS", "ep-nuv-2"],
        ["Migrar banco do faturamento para RDS", "ep-nuv-2"],
        ["Plano de rollback da migração do core", "ep-nuv-2"],
        ["Bug: DNS interno intermitente após cutover", "ep-nuv-2"],
        ["Política de backups e retenção no S3", "ep-nuv-1"],
        ["Teste de carga pós-migração do serviço de pedidos", "ep-nuv-2"],
        ["Reduzir custo de instâncias subutilizadas", null]
      ],
      "prj-dlk": [
        ["Conector de ingestão do banco de produto", "ep-dlk-1"],
        ["Conector de ingestão do ERP financeiro", "ep-dlk-1"],
        ["Modelagem da camada silver de clientes", null],
        ["Catálogo de dados com dicionário de métricas", null],
        ["Qualidade de dados: alertas de schema drift", "ep-dlk-1"],
        ["Bug: duplicidade na ingestão incremental de pedidos", "ep-dlk-1"],
        ["Dashboard de receita recorrente para diretoria", null],
        ["Anonimização de dados pessoais na camada bronze", null],
        ["Orquestração dos pipelines com retentativa", "ep-dlk-1"]
      ],
      "prj-obs": [
        ["Instrumentar serviço de pagamentos com OpenTelemetry", "ep-obs-1"],
        ["Instrumentar portal do cliente com RUM", "ep-obs-1"],
        ["Dashboards padrão de latência e erro por serviço", null],
        ["Revisar alertas: eliminar os não acionáveis", "ep-obs-2"],
        ["Runbook de incidente para fila de conciliação", "ep-obs-2"],
        ["SLO de disponibilidade do checkout", "ep-obs-2"],
        ["Bug: traces órfãos sem contexto de requisição", "ep-obs-1"],
        ["Rotação automática de API keys do coletor", null]
      ],
      "prj-fat": [
        ["Emissão automática de NF-e no fechamento", null],
        ["Régua de cobrança por e-mail com escalonamento", null],
        ["Integração com ERP para baixa de títulos", null],
        ["Painel de inadimplência por carteira", null],
        ["Validação fiscal por UF antes da emissão", null]
      ],
      "prj-onb": [
        ["Formulário de cadastro com validação de CNPJ", null],
        ["Verificação de identidade com documento e selfie", null],
        ["E-mail de boas-vindas com primeiros passos", null],
        ["Aprovação manual para casos de risco", null],
        ["Métricas de conversão do funil de ativação", null],
        ["Bug: upload de documento falha em conexões lentas", null]
      ],
      "prj-web": [
        ["Home com seções de produto e prova social", "ep-web-1"],
        ["Página de carreiras integrada ao ATS", "ep-web-1"],
        ["Blog com CMS headless", "ep-web-1"],
        ["SEO técnico: sitemap, meta tags e dados estruturados", "ep-web-1"],
        ["Formulário de contato com proteção anti-spam", null],
        ["Otimizar LCP das páginas de produto", null]
      ],
      "prj-cma": [
        ["Entrevistas com líderes das linhas de produção", "ep-cma-1"],
        ["Mapear fluxo AS-IS da expedição", "ep-cma-1"],
        ["Cronoanálise da linha de usinagem", "ep-cma-1"],
        ["Matriz de desperdícios por processo", "ep-cma-1"],
        ["Plano de ação de eficiência priorizado", null],
        ["Apresentação executiva do diagnóstico", null],
        ["Levantamento de indicadores atuais de OEE", "ep-cma-1"]
      ],
      "prj-erp": [
        ["Especificar contrato de integração de pedidos", "ep-erp-1"],
        ["Sincronização de estoque a cada 15 minutos", "ep-erp-1"],
        ["Tratamento de erros e fila de reprocessamento", "ep-erp-1"],
        ["Homologação com massa de dados do cliente", null],
        ["Deduplicação de pedidos reenviados pelo chão de fábrica", "ep-erp-1"],
        ["Monitoramento da integração com alertas", null]
      ]
    };

    var LABELS = ["backend", "frontend", "mobile", "infra", "dados", "ux", "seguranca", "performance", "documentacao", "cliente"];
    var LABEL_COLORS = { backend: "#2B5FD9", frontend: "#B23A78", mobile: "#6D4FC4", infra: "#0E7490", dados: "#9A5B00", ux: "#3D7068", seguranca: "#BE3030", performance: "#7A5C2E", documentacao: "#4A6572", cliente: "#1D7A4C" };

    var ACCEPT_POOL = [
      "Comportamento coberto por testes automatizados",
      "Funciona nos navegadores suportados (Chrome, Firefox, Safari, Edge)",
      "Erros apresentam mensagem clara e caminho de recuperação",
      "Logs e métricas registrados para o fluxo",
      "Revisado por outro membro da equipe",
      "Documentação atualizada no espaço do projeto",
      "Sem regressão nos fluxos existentes",
      "Validado com dados próximos do volume real",
      "Aprovado pelo responsável do projeto em homologação"
    ];

    var COMMENT_POOL = [
      "Subi uma primeira versão em homologação, podem validar?",
      "Encontrei um caso de borda quando o usuário não tem permissão — tratando.",
      "Dependemos da resposta do time de infra para seguir aqui.",
      "Repliquei o problema localmente, é condição de corrida na fila.",
      "Combinei com o cliente que essa entrega fica para a próxima sprint.",
      "A especificação está no documento do projeto, seção 3.2.",
      "Teste de carga passou com folga, latência p95 em 180ms.",
      "Precisamos alinhar o texto desse e-mail com o time de produto.",
      "Ajustei conforme a revisão, pronto para nova olhada.",
      "Bloqueada até sair a credencial do ambiente de homologação."
    ];

    var STATUSES = ["backlog", "todo", "in_progress", "in_review", "done"];

    function teamMembers(project) {
      var ids = {};
      project.teamIds.forEach(function (tid) {
        var t = teams.find(function (x) { return x.id === tid; });
        if (t) t.memberIds.forEach(function (m) { ids[m] = 1; });
      });
      return Object.keys(ids);
    }

    var tasks = [];
    var comments = [];
    var audit = [];
    var events = [];
    var taskCounters = {};
    var tseq = 0;

    function pushAudit(offsetDays, userId, action, entityType, entityId, projectId, before, after, summary, source) {
      audit.push({
        id: "au" + (audit.length + 1), ts: dIso(offsetDays), userId: userId,
        action: action, entityType: entityType, entityId: entityId, projectId: projectId,
        before: before || null, after: after || null, summary: summary, source: source || "ui"
      });
    }

    projects.forEach(function (p) {
      taskCounters[p.id] = 0;
      pushAudit(-p.age, p.leadId, "create", "project", p.id, p.id, null, { name: p.name, status: p.status }, "criou o projeto " + p.name, "ui");
    });

    projects.forEach(function (p) {
      var pool = TITLES[p.id] || [];
      var members = teamMembers(p);
      var projSprints = sprints.filter(function (s) { return s.projectId === p.id; });
      var isDone = p.status === "done";
      var isPaused = p.status === "paused";

      pool.forEach(function (entry) {
        tseq++;
        taskCounters[p.id]++;
        var title = entry[0];
        var isBug = /^Bug:|Corrigir|falha|trava|duplicad|duplicidade|órfãos|intermitente/i.test(title);
        var status;
        if (isDone) status = "done";
        else if (isPaused) status = pick(["backlog", "backlog", "todo", "done"]);
        else {
          var r = rnd();
          status = r < 0.32 ? "done" : r < 0.42 ? "in_review" : r < 0.60 ? "in_progress" : r < 0.80 ? "todo" : "backlog";
        }
        var createdOff = -rint(6, Math.max(10, p.age - 4));
        var due = null;
        if (status === "done") due = dateOnly(createdOff + rint(4, 18));
        else if (rnd() < 0.82) due = dateOnly(rint(-9, 28));
        var assignee = (status === "backlog" && chance(0.5)) ? null : pick(members);
        var sprintId = null;
        if (projSprints.length && status !== "backlog" && chance(0.75)) {
          var act = projSprints.find(function (s) { return s.status === "active"; });
          var doneS = projSprints.filter(function (s) { return s.status === "done"; });
          if (status === "done" && doneS.length && chance(0.6)) sprintId = pick(doneS).id;
          else if (act) sprintId = act.id;
        }
        var labels = [];
        var nl = rint(0, 2);
        while (labels.length < nl) { var L = pick(LABELS); if (labels.indexOf(L) < 0) labels.push(L); }
        var acceptance = [];
        if (chance(0.45)) {
          var na = rint(2, 4), usedA = [];
          while (acceptance.length < na) {
            var a = pick(ACCEPT_POOL);
            if (usedA.indexOf(a) < 0) { usedA.push(a); acceptance.push({ text: a, done: status === "done" ? true : chance(0.3) }); }
          }
        }
        var t = {
          id: "tsk" + tseq,
          ref: p.key + "-" + (100 + taskCounters[p.id]),
          projectId: p.id, epicId: entry[1], parentId: null,
          type: isBug ? "bug" : "task",
          title: title,
          desc: "",
          status: status,
          priority: isBug ? pick(["high", "urgent", "medium"]) : pick(["medium", "medium", "high", "low", "low", "urgent"]),
          assigneeId: assignee,
          teamId: p.teamIds[0],
          sprintId: sprintId,
          labels: labels,
          acceptance: acceptance,
          blockedBy: [],
          createdAt: dIso(createdOff),
          updatedAt: dIso(Math.min(-1, createdOff + rint(1, 10))),
          dueDate: due,
          createdBy: p.leadId
        };
        tasks.push(t);
      });
    });

    // subtarefas
    var withSubs = tasks.filter(function (t) { return t.status !== "done" && t.type === "task"; }).slice(0, 24);
    [withSubs[1], withSubs[4], withSubs[7], withSubs[10], withSubs[14], withSubs[18], withSubs[21]].forEach(function (parent) {
      if (!parent) return;
      var n = rint(2, 3);
      for (var i = 0; i < n; i++) {
        tseq++;
        var p = projects.find(function (x) { return x.id === parent.projectId; });
        taskCounters[p.id]++;
        tasks.push({
          id: "tsk" + tseq, ref: p.key + "-" + (100 + taskCounters[p.id]),
          projectId: p.id, epicId: parent.epicId, parentId: parent.id, type: "subtask",
          title: pick(["Escrever testes automatizados", "Revisar com design", "Atualizar documentação", "Validar em homologação", "Tratar casos de erro", "Ajustes de acessibilidade"]) + " — " + parent.ref,
          desc: "", status: pick(["todo", "in_progress", "done"]),
          priority: parent.priority, assigneeId: parent.assigneeId, teamId: parent.teamId,
          sprintId: parent.sprintId, labels: [], acceptance: [], blockedBy: [],
          createdAt: parent.createdAt, updatedAt: dIso(-rint(0, 5)), dueDate: parent.dueDate, createdBy: parent.assigneeId || "u2"
        });
      }
    });

    // bloqueios
    var open = tasks.filter(function (t) { return ["todo", "in_progress"].indexOf(t.status) >= 0 && !t.parentId; });
    for (var b = 0; b < 6 && b * 7 + 3 < open.length; b++) {
      var blocked = open[b * 7 + 3];
      var blocker = open[b * 7];
      if (blocked && blocker && blocked.projectId === blocker.projectId && blocked.id !== blocker.id) blocked.blockedBy.push(blocker.id);
    }
    // garante alguns bloqueios mesmo entre projetos distintos de mesma lista
    if (!tasks.some(function (t) { return t.blockedBy.length; })) {
      open[3].blockedBy.push(open[0].id);
      open[9].blockedBy.push(open[6].id);
    }

    // comentários
    var commented = tasks.filter(function (t) { return !t.parentId; });
    for (var c = 0; c < 34; c++) {
      var ct = pick(commented);
      var author = ct.assigneeId || pick(users.filter(function (u) { return u.roleId !== "viewer"; })).id;
      var txt = pick(COMMENT_POOL);
      if (c % 6 === 0) {
        var mentioned = pick(users.slice(0, 15));
        txt = "@" + mentioned.name + " " + pick(["consegue olhar isso hoje?", "podemos alinhar amanhã cedo?", "esse ponto é com você, certo?"]);
      }
      comments.push({ id: "cm" + (c + 1), taskId: ct.id, userId: author, text: txt, createdAt: dIso(-rint(0, 14)) });
    }

    // auditoria e eventos recentes de tarefas
    var recent = tasks.filter(function (t) { return !t.parentId; });
    for (var i = 0; i < recent.length; i++) {
      var t2 = recent[i];
      if (i % 3 === 0) {
        pushAudit(-rint(0, 20), t2.createdBy, "create", "task", t2.id, t2.projectId, null, { title: t2.title, status: "backlog" }, "criou a tarefa " + t2.ref, chance(0.12) ? "mcp" : "ui");
      }
      if (t2.status === "done" && chance(0.5)) {
        var who = t2.assigneeId || t2.createdBy;
        pushAudit(-rint(0, 12), who, "status", "task", t2.id, t2.projectId, { status: "in_review" }, { status: "done" }, "concluiu " + t2.ref, "ui");
        events.push({ id: "ev" + (events.length + 1), ts: dIso(-rint(0, 12)), type: "task.completed.v1", entityId: t2.id, projectId: t2.projectId, actorId: who, payload: { task: t2.ref, to: "done" } });
      } else if (t2.status === "in_progress" && chance(0.6)) {
        var who2 = t2.assigneeId || t2.createdBy;
        pushAudit(-rint(0, 8), who2, "status", "task", t2.id, t2.projectId, { status: "todo" }, { status: "in_progress" }, "moveu " + t2.ref + " para Em andamento", chance(0.15) ? "automation" : "ui");
        events.push({ id: "ev" + (events.length + 1), ts: dIso(-rint(0, 8)), type: "task.status_changed.v1", entityId: t2.id, projectId: t2.projectId, actorId: who2, payload: { task: t2.ref, from: "todo", to: "in_progress" } });
      }
      if (i % 11 === 0 && t2.priority === "urgent") {
        pushAudit(-rint(0, 10), "u2", "priority", "task", t2.id, t2.projectId, { priority: "high" }, { priority: "urgent" }, "elevou prioridade de " + t2.ref, "ui");
      }
      if (i % 9 === 0 && t2.assigneeId) {
        pushAudit(-rint(0, 15), "u2", "assign", "task", t2.id, t2.projectId, { assigneeId: null }, { assigneeId: t2.assigneeId }, "atribuiu " + t2.ref, chance(0.2) ? "mcp" : "ui");
        events.push({ id: "ev" + (events.length + 1), ts: dIso(-rint(0, 15)), type: "task.assigned.v1", entityId: t2.id, projectId: t2.projectId, actorId: "u2", payload: { task: t2.ref, assignee: t2.assigneeId } });
      }
    }
    sprints.filter(function (s) { return s.status === "active"; }).forEach(function (s) {
      events.push({ id: "ev" + (events.length + 1), ts: s.startDate + "T09:00:00.000Z", type: "sprint.started.v1", entityId: s.id, projectId: s.projectId, actorId: "u2", payload: { sprint: s.name } });
      pushAudit(-10, "u2", "sprint_start", "sprint", s.id, s.projectId, { status: "planned" }, { status: "active" }, "iniciou a " + s.name, "ui");
    });

    // ---------- webhooks ----------
    var webhooks = [
      { id: "wh1", name: "Canal #ops no Slack", url: "https://hooks.exemplo-ops.dev/T0X/projectflow", secret: "whsec_9f27c1ab44e0d8b2a1c5", events: ["task.status_changed.v1", "task.completed.v1", "sprint.started.v1", "sprint.completed.v1"], active: true, health: "ok", createdAt: dIso(-60) },
      { id: "wh2", name: "ERP Financeiro (interno)", url: "https://erp.interno.local/webhooks/projectflow", secret: "whsec_55aa01dd73b9e4c6f210", events: ["project.created.v1", "project.updated.v1", "task.created.v1"], active: true, health: "failing", createdAt: dIso(-45) },
      { id: "wh3", name: "Data Warehouse", url: "https://dw.vetorlabs.dev/ingest/pf-events", secret: "whsec_c3e8f7a2910bd45e66aa", events: ["task.created.v1", "task.status_changed.v1", "task.completed.v1", "task.assigned.v1", "project.created.v1", "sprint.started.v1", "sprint.completed.v1"], active: false, health: "ok", createdAt: dIso(-30) }
    ];

    var deliveries = [];
    function seedDelivery(wh, ev, ok, offset) {
      var attempts = [];
      if (ok) attempts.push({ ts: dIso(offset), httpStatus: 200, ok: true, durationMs: rint(80, 420) });
      else {
        attempts.push({ ts: dIso(offset), httpStatus: 503, ok: false, durationMs: rint(800, 3000) });
        attempts.push({ ts: dIso(offset, 12), httpStatus: 503, ok: false, durationMs: rint(800, 3000) });
        attempts.push({ ts: dIso(offset, 16), httpStatus: 503, ok: false, durationMs: rint(800, 3000) });
      }
      deliveries.push({
        id: "dl" + (deliveries.length + 1), webhookId: wh.id, eventId: ev.id, eventType: ev.type,
        ts: dIso(offset), status: ok ? "success" : "failed", httpStatus: ok ? 200 : 503, attempts: attempts,
        payload: { id: ev.id, type: ev.type, occurredAt: ev.ts, data: ev.payload }
      });
    }
    events.slice(-10).forEach(function (ev, idx) {
      webhooks.forEach(function (wh) {
        if (!wh.active || wh.events.indexOf(ev.type) < 0) return;
        seedDelivery(wh, ev, wh.health !== "failing" || idx % 3 === 0 ? true : false, -rint(0, 6));
      });
    });

    // ---------- notificações ----------
    var notifTemplates = [
      { id: "nt-assigned", event: "task.assigned.v1", name: "Tarefa atribuída", subject: "[{ref}] Tarefa atribuída a você", body: "Olá {nome}, a tarefa {ref} — {titulo} foi atribuída a você no projeto {projeto}." },
      { id: "nt-due", event: "task.due_soon.v1", name: "Prazo próximo", subject: "[{ref}] Vence em breve", body: "A tarefa {ref} — {titulo} vence em {dias} dia(s)." },
      { id: "nt-mention", event: "comment.mention.v1", name: "Menção em comentário", subject: "[{ref}] Você foi mencionado", body: "{autor} mencionou você em um comentário na tarefa {ref}." },
      { id: "nt-sprint-start", event: "sprint.started.v1", name: "Sprint iniciada", subject: "Sprint {sprint} iniciada", body: "A {sprint} do projeto {projeto} começou. Meta: {meta}." },
      { id: "nt-sprint-end", event: "sprint.completed.v1", name: "Sprint concluída", subject: "Sprint {sprint} concluída", body: "A {sprint} foi encerrada com {feitas} tarefas concluídas." },
      { id: "nt-blocked", event: "task.blocked.v1", name: "Tarefa bloqueada", subject: "[{ref}] Tarefa bloqueada", body: "A tarefa {ref} está bloqueada por {bloqueio}." }
    ];

    var providers = {
      email: { name: "E-mail (SMTP corporativo)", configured: true, from: "noreply@vetorlabs.dev", host: "smtp.vetorlabs.dev" },
      whatsapp: { name: "WhatsApp Business (simulado)", configured: true, from: "+55 11 90000-0001", host: "api.whatsapp.exemplo" },
      sms: { name: "SMS (gateway simulado)", configured: false, from: "", host: "" }
    };

    var notifPrefs = {
      "task.assigned.v1": { email: true, whatsapp: true, sms: false },
      "task.due_soon.v1": { email: true, whatsapp: false, sms: true },
      "comment.mention.v1": { email: true, whatsapp: true, sms: false },
      "sprint.started.v1": { email: true, whatsapp: false, sms: false },
      "sprint.completed.v1": { email: true, whatsapp: false, sms: false },
      "task.blocked.v1": { email: true, whatsapp: true, sms: false }
    };

    var notifications = [];
    function seedNotif(off, channel, tplId, toUserId, vars, status) {
      var tpl = notifTemplates.find(function (x) { return x.id === tplId; });
      var subj = tpl.subject, body = tpl.body;
      Object.keys(vars).forEach(function (k) { subj = subj.split("{" + k + "}").join(vars[k]); body = body.split("{" + k + "}").join(vars[k]); });
      notifications.push({
        id: "nf" + (notifications.length + 1), ts: dIso(off), channel: channel, templateId: tplId,
        eventType: tpl.event, toUserId: toUserId, subject: subj, body: body,
        status: status, attempts: status === "failed" ? 3 : 1
      });
    }
    var assignedTasks = tasks.filter(function (t) { return t.assigneeId && !t.parentId; });
    for (var n = 0; n < 16; n++) {
      var nt = assignedTasks[(n * 5) % assignedTasks.length];
      var proj = projects.find(function (x) { return x.id === nt.projectId; });
      var usr = users.find(function (x) { return x.id === nt.assigneeId; });
      seedNotif(-rint(0, 10), n % 4 === 0 ? "whatsapp" : "email", "nt-assigned", usr.id,
        { ref: nt.ref, nome: usr.name.split(" ")[0], titulo: nt.title, projeto: proj.name },
        n === 5 ? "failed" : "delivered");
    }
    seedNotif(-2, "sms", "nt-due", "u8", { ref: "PCL-104", titulo: "Detalhe do contrato", dias: "2" }, "failed");
    seedNotif(-1, "email", "nt-sprint-start", "u2", { sprint: "Sprint 15", projeto: "Portal do Cliente 2.0", meta: "Contestação de faturas de ponta a ponta" }, "delivered");
    seedNotif(-4, "whatsapp", "nt-mention", "u7", { ref: "PAG-107", autor: "Ana Souza" }, "delivered");
    seedNotif(-3, "email", "nt-blocked", "u9", { ref: "NUV-103", bloqueio: "NUV-101" }, "delivered");

    // ---------- MCP ----------
    var mcpTools = [
      { name: "projects_list", kind: "read", desc: "Lista projetos visíveis para o agente, com status e progresso.", perms: "project.view", params: { status: "string? (active|paused|done|archived)" } },
      { name: "projects_get", kind: "read", desc: "Retorna um projeto pelo id ou chave, com épicos e marcos.", perms: "project.view", params: { project: "string (id ou chave, ex.: PCL)" } },
      { name: "projects_create", kind: "write", desc: "Cria um projeto. Requer papel com project.create.", perms: "project.create", params: { name: "string", key: "string", description: "string?" } },
      { name: "tasks_list", kind: "read", desc: "Lista tarefas com filtros por projeto, status, responsável e sprint.", perms: "task.view", params: { project: "string?", status: "string?", assignee: "string?", sprint: "string?" } },
      { name: "tasks_get", kind: "read", desc: "Retorna uma tarefa pelo ref (ex.: PCL-124) com comentários e histórico.", perms: "task.view", params: { ref: "string" } },
      { name: "tasks_create", kind: "write", desc: "Cria uma tarefa em um projeto.", perms: "task.create", params: { project: "string", title: "string", type: "string?", priority: "string?", assignee: "string?" } },
      { name: "tasks_update", kind: "write", desc: "Atualiza campos de uma tarefa (título, descrição, prioridade, prazo).", perms: "task.edit", params: { ref: "string", fields: "object" } },
      { name: "tasks_assign", kind: "write", desc: "Atribui uma tarefa a um usuário.", perms: "task.assign", params: { ref: "string", assignee: "string (nome ou id)" } },
      { name: "tasks_move", kind: "write", desc: "Move uma tarefa de status (backlog|todo|in_progress|in_review|done).", perms: "task.move", params: { ref: "string", status: "string" } },
      { name: "sprints_list", kind: "read", desc: "Lista sprints de um projeto com progresso.", perms: "sprint.view", params: { project: "string?" } },
      { name: "teams_list", kind: "read", desc: "Lista equipes e integrantes da organização.", perms: "team.view", params: {} }
    ];

    var mcpAgents = [
      { id: "ag1", name: "Assistente de Planejamento (Claude)", kind: "Agente MCP", desc: "Gera propostas de backlog e refina descrições de tarefas.", scopes: ["tasks_list", "tasks_get", "tasks_create", "tasks_update", "projects_list"], active: true, lastRun: dIso(-1) },
      { id: "ag2", name: "Sincronizador ERP", kind: "Integração", desc: "Cria tarefas de faturamento a partir de pendências do ERP.", scopes: ["tasks_create", "tasks_list"], active: true, lastRun: dIso(-2) },
      { id: "ag3", name: "Relator de Status", kind: "Automação", desc: "Publica resumo semanal das sprints ativas.", scopes: ["projects_list", "sprints_list", "tasks_list"], active: false, lastRun: dIso(-9) }
    ];

    var mcpExecutions = [
      { id: "mx1", ts: dIso(-1), agentId: "ag1", tool: "tasks_list", args: { project: "PCL", status: "in_progress" }, ok: true, summary: "8 tarefas retornadas" },
      { id: "mx2", ts: dIso(-1), agentId: "ag1", tool: "tasks_update", args: { ref: "PCL-103", fields: { description: "…" } }, ok: true, summary: "Descrição refinada" },
      { id: "mx3", ts: dIso(-2), agentId: "ag2", tool: "tasks_create", args: { project: "FAT", title: "Reprocessar NF-e rejeitadas do lote 2210" }, ok: true, summary: "Tarefa FAT-105 criada" },
      { id: "mx4", ts: dIso(-2), agentId: "ag2", tool: "tasks_create", args: { project: "PAG", title: "Divergência de conciliação 18/10" }, ok: false, summary: "Negado: escopo não inclui o projeto PAG" },
      { id: "mx5", ts: dIso(-6), agentId: "ag3", tool: "sprints_list", args: { project: "PCL" }, ok: true, summary: "3 sprints retornadas" },
      { id: "mx6", ts: dIso(-9), agentId: "ag3", tool: "tasks_list", args: { sprint: "Sprint 14" }, ok: true, summary: "12 tarefas retornadas" }
    ];

    audit.sort(function (a, b) { return a.ts < b.ts ? 1 : -1; });
    events.sort(function (a, b) { return a.ts < b.ts ? 1 : -1; });

    return {
      meta: { seedVersion: SEED_VERSION, seededAt: new Date(NOW).toISOString() },
      settings: {
        theme: "system", activeApp: "workspace",
        currentUserId: "u1", currentProjectId: "prj-pcl",
        navCollapsed: false
      },
      orgs: orgs, roles: roles, users: users, teams: teams,
      projects: projects, epics: epics, sprints: sprints, milestones: milestones,
      tasks: tasks, comments: comments,
      audit: audit, events: events,
      webhooks: webhooks, deliveries: deliveries,
      notifications: notifications, notifTemplates: notifTemplates, notifPrefs: notifPrefs, providers: providers,
      mcpTools: mcpTools, mcpAgents: mcpAgents, mcpExecutions: mcpExecutions,
      taskCounters: taskCounters
    };
  }

  window.PFSeed = { build: seedDb, VERSION: SEED_VERSION };
})();
