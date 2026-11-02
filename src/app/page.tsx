import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Minus,
  ShieldCheck,
  GitBranch,
  Terminal,
  Workflow,
  ScanLine,
  LockKeyhole,
  Layers3,
  Code2,
} from "lucide-react";
import {
  Navigation,
  ProductImage,
  ProductShowcase,
} from "@/components/interactive";

const repo = "https://github.com/danielharrisonlf/projectflow-ai-prototipo";
const docs = `${repo}/blob/main/docs/mapeamento-implementacao.md`;
function Brand() {
  return (
    <a href="#" className="brand" aria-label="ProjectFlow AI, início">
      <span className="brand-symbol">
        <Layers3 size={22} strokeWidth={1.5} />
      </span>
      <span>
        ProjectFlow<span className="brand-ai"> AI</span>
      </span>
      <span className="status-dot" />
    </a>
  );
}
function DemoLink({
  children = "Ver demonstração interativa",
  secondary = false,
}: {
  children?: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <a
      className={`button ${secondary ? "button-secondary" : "button-primary"}`}
      href="/demo/index.html#/board"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={17} strokeWidth={1.5} />
    </a>
  );
}
const permissions = [
  { name: "Administrar organização", vals: ["all", "no", "no", "no", "no"] },
  {
    name: "Gerenciar projetos e sprints",
    vals: ["all", "all", "no", "no", "no"],
  },
  { name: "Editar tarefas", vals: ["all", "all", "team", "own", "no"] },
  {
    name: "Aprovar planejamento de IA",
    vals: ["all", "all", "all", "no", "no"],
  },
  { name: "Executar escrita via MCP", vals: ["all", "all", "no", "no", "no"] },
  { name: "Consultar Insights", vals: ["all", "all", "all", "no", "all"] },
  { name: "Consultar auditoria", vals: ["all", "all", "no", "no", "all"] },
];
export default function Home() {
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="header">
        <div className="nav-shell">
          <Brand />
          <Navigation />
        </div>
      </header>
      <main id="conteudo">
        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">
              Sua equipe no fluxo.
              <br />
              <span>Seus agentes sob controle.</span>
            </h1>
            <div className="hero-detail">
              <p>
                Gestão de projetos na era dos agentes. Do planejamento por IA à
                auditoria enterprise, com a engenharia no comando.
              </p>
              <div className="hero-actions">
                <DemoLink />
                <a className="text-link" href="#mcp">
                  Conheça o protocolo MCP <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </div>
          <ProductShowcase />
          <div className="hero-footnote">
            <span>Capturas reais do ProjectFlow AI.</span>
            <span>Protótipo navegável · Dados simulados · Sem cadastro</span>
          </div>
        </section>

        <section
          className="principles container"
          aria-label="Fundamentos da plataforma"
        >
          <div>
            <span className="mono">01</span>
            <b>Contexto para executar.</b>
            <p>Workspace para quem constrói.</p>
          </div>
          <div>
            <span className="mono">02</span>
            <b>Limites para automatizar.</b>
            <p>MCP com permissões explícitas.</p>
          </div>
          <div>
            <span className="mono">03</span>
            <b>Evidência para decidir.</b>
            <p>Insights para quem responde pela entrega.</p>
          </div>
        </section>

        <section
          id="workspace"
          className="section container"
          aria-labelledby="workspace-title"
        >
          <div className="section-heading">
            <h2 id="workspace-title">
              Menos troca de contexto.
              <br />
              Mais clareza para entregar.
            </h2>
            <p>
              O trabalho da equipe e a atuação dos agentes compartilham o mesmo
              contexto. Cada proposta pode ser revisada. Cada mudança deixa um
              rastro.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature feature-mcp">
              <Terminal className="feature-icon" strokeWidth={1.5} />
              <h3>
                Agentes que conhecem
                <br />
                as regras da casa.
              </h3>
              <p>
                11 ferramentas MCP para consultar projetos, criar tarefas e
                mover o trabalho. Escrita sujeita às capacidades do perfil
                ativo.
              </p>
              <div className="tool-list mono">
                <span>
                  <Code2 size={14} /> tasks_create <small>escrita</small>
                </span>
                <span>
                  <GitBranch size={14} /> tasks_move <small>escrita</small>
                </span>
                <span>
                  <ScanLine size={14} /> projects_get <small>leitura</small>
                </span>
              </div>
              <a href="#mcp" className="text-link">
                Explorar MCP <ArrowRight size={16} />
              </a>
            </article>
            <article className="feature feature-ai">
              <Workflow className="feature-icon" strokeWidth={1.5} />
              <h3>
                A IA propõe.
                <br />
                Sua equipe decide.
              </h3>
              <p>
                Transforme um briefing em épicos, tarefas e critérios de aceite.
                Revise a proposta antes de adicionar qualquer item ao backlog.
              </p>
              <div className="feature-capture">
                <ProductImage
                  screen="assistant"
                  alt="Assistente de IA com proposta de planejamento revisável"
                  sizes="(max-width: 768px) 90vw, 600px"
                />
              </div>
              <div className="process mono">
                <span>Briefing</span>
                <ArrowRight size={13} />
                <span>Proposta</span>
                <ArrowRight size={13} />
                <span>Revisão humana</span>
              </div>
            </article>
            <article className="feature feature-audit">
              <ScanLine className="feature-icon" strokeWidth={1.5} />
              <h3>A mudança tem contexto.</h3>
              <p>
                Quem alterou, de onde veio e o que mudou. Auditoria com valores
                anteriores e novos, ligada ao evento de origem.
              </p>
              <div
                className="diff-preview mono"
                aria-label="Exemplo ilustrativo de diff"
              >
                <span>task.status_changed.v1</span>
                <div>
                  <span>anterior</span>
                  <del>in_progress</del>
                </div>
                <div>
                  <span>novo</span>
                  <b>in_review</b>
                </div>
              </div>
              <a href="#insights" className="text-link">
                Investigar uma alteração <ArrowRight size={16} />
              </a>
            </article>
            <article className="feature feature-webhook">
              <GitBranch className="feature-icon" strokeWidth={1.5} />
              <h3>Integrações com caminho de volta.</h3>
              <p>
                Webhooks com assinatura HMAC na arquitetura proposta. Explore o
                fluxo de entrega, retentativas e reenvio manual na demonstração.
              </p>
              <div className="delivery-flow mono">
                <span>Outbox</span>
                <ArrowRight size={15} />
                <span>Entrega</span>
                <ArrowRight size={15} />
                <span>Retry / DLQ</span>
              </div>
              <a
                href={`${docs}`}
                className="text-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ler arquitetura <ArrowUpRight size={16} />
              </a>
            </article>
          </div>
        </section>

        <section id="mcp" className="section mcp-section">
          <div className="container mcp-layout">
            <div className="mcp-copy">
              <h2>
                Automatize o trabalho.
                <br />
                Preserve o controle.
              </h2>
              <p>
                O Model Context Protocol conecta agentes ao contexto do projeto
                por ferramentas explícitas. A permissão acompanha a operação,
                inclusive quando a origem é um agente.
              </p>
              <ul className="check-list">
                <li>
                  <Check />
                  11 ferramentas locais de leitura e escrita
                </li>
                <li>
                  <Check />
                  Argumentos e respostas em JSON
                </li>
                <li>
                  <Check />
                  Histórico de chamadas e origem registrada
                </li>
                <li>
                  <Check />
                  Validação de RBAC em cada execução
                </li>
              </ul>
              <a
                className="button button-secondary"
                href="/demo/index.html#/mcp/test"
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir console MCP <ArrowUpRight size={17} />
              </a>
              <p className="fine-print">
                No protótipo, as ferramentas operam sobre dados locais. O
                endpoint MCP remoto é ilustrativo.
              </p>
            </div>
            <div className="mcp-visual">
              <div className="mini-toolbar">
                <Terminal size={15} />
                <span className="mono">MCP / Console de execução</span>
                <span className="status-dot" />
              </div>
              <ProductImage
                screen="mcp"
                alt="Console MCP executando tasks_list com resposta JSON real sobre dados locais"
                sizes="(max-width: 900px) 100vw, 800px"
              />
              <div className="visual-foot mono">
                <span>tasks_list</span>
                <span>
                  <Check size={13} /> execução registrada
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="insights" className="section container">
          <div className="section-heading">
            <h2>
              Do detalhe da tarefa
              <br />à decisão executiva.
            </h2>
            <p>
              Workspace e Insights são duas perspectivas da mesma operação. O
              time acompanha o fluxo. A liderança enxerga riscos, gargalos e o
              histórico das decisões.
            </p>
          </div>
          <div className="insights-grid">
            <article>
              <div className="insight-title">
                <h3>Insights executivo</h3>
                <span className="mono">VISÃO DO TODO</span>
              </div>
              <div className="image-frame">
                <ProductImage
                  screen="insights"
                  alt="Dashboard executivo com KPIs de projetos, entregas e distribuição por status"
                  sizes="(max-width: 768px) 95vw, 600px"
                />
              </div>
              <p>
                Indicadores de entrega, distribuição por status e projetos em
                risco, calculados sobre o estado atual do Workspace.
              </p>
            </article>
            <article>
              <div className="insight-title">
                <h3>Central de auditoria</h3>
                <span className="mono">ORIGEM E DIFF</span>
              </div>
              <div className="image-frame">
                <ProductImage
                  screen="audit"
                  alt="Central de auditoria com registro aberto e diff de valores anteriores e novos"
                  sizes="(max-width: 768px) 95vw, 600px"
                />
              </div>
              <p>
                Investigue por usuário, projeto, entidade ou origem. Abra um
                evento para comparar os valores anteriores e novos.
              </p>
            </article>
          </div>
          <div className="section-note">
            <ScanLine size={16} />
            <p>
              Rastreabilidade demonstrada com registros locais. Armazenamento
              imutável no servidor faz parte da arquitetura proposta.
            </p>
          </div>
        </section>

        <section id="seguranca" className="section governance container">
          <div className="governance-intro">
            <ShieldCheck size={32} strokeWidth={1.5} />
            <h2>
              Autonomia na medida
              <br />
              da responsabilidade.
            </h2>
            <p>
              Cinco perfis, capacidades explícitas e escopo por equipe. Explore
              como a governança enterprise se traduz nas operações do dia a dia.
            </p>
            <div className="governance-detail">
              <LockKeyhole size={18} />
              <span>
                A interface orienta.
                <br />A operação valida a permissão.
              </span>
            </div>
          </div>
          <div
            className="matrix-wrap"
            role="region"
            aria-label="Matriz de permissões, role para ver todos os perfis"
            tabIndex={0}
          >
            <table className="matrix">
              <caption>Capacidades demonstradas por perfil</caption>
              <thead>
                <tr>
                  <th scope="col">Capacidade</th>
                  {["Admin", "Gestor", "Líder técnico", "Dev", "Auditor"].map(
                    (p) => (
                      <th key={p} scope="col">
                        {p}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {permissions.map((row) => (
                  <tr key={row.name}>
                    <th scope="row">{row.name}</th>
                    {row.vals.map((v, i) => (
                      <td key={i}>
                        {v === "all" ? (
                          <>
                            <Check size={16} aria-hidden="true" />
                            <span className="sr-only">Permitido</span>
                          </>
                        ) : v === "no" ? (
                          <>
                            <Minus size={14} aria-hidden="true" />
                            <span className="sr-only">Não permitido</span>
                          </>
                        ) : (
                          <span className="scope-label">
                            {v === "team" ? "Equipe" : "Próprias"}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="matrix-note">
              Permissões do protótipo, sujeitas ao escopo de projetos e equipes.
              Dev edita tarefas atribuídas a si, criadas por si ou sem
              responsável. Líder também edita tarefas atribuídas a si fora da
              equipe.
            </p>
          </div>
        </section>

        <section className="final-cta container">
          <div>
            <h2>
              Veja o fluxo completo.
              <br />
              <span>Da intenção à evidência.</span>
            </h2>
            <p>
              Abra o Workspace, execute uma ferramenta e acompanhe o resultado
              nos Insights.
            </p>
          </div>
          <div className="final-actions">
            <DemoLink>Explorar ProjectFlow AI</DemoLink>
            <span>Sem cadastro. Com contexto.</span>
          </div>
        </section>
      </main>
      <footer className="footer container">
        <div className="footer-top">
          <Brand />
          <div className="footer-links">
            <a href={repo} target="_blank" rel="noopener noreferrer">
              Código do protótipo <ArrowUpRight size={14} />
            </a>
            <a href={docs} target="_blank" rel="noopener noreferrer">
              Arquitetura <ArrowUpRight size={14} />
            </a>
            <a
              href={`${repo}/blob/main/DESIGN.md`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Design system <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            ProjectFlow AI · Protótipo de produto por Daniel Lima.
            <br />
            IA e serviços externos simulados. Dados persistidos apenas neste
            navegador.
          </p>
          <div className="stack mono">
            <span>Next.js 15</span>
            <span>React 19</span>
            <span>TypeScript</span>
          </div>
        </div>
      </footer>
    </>
  );
}
