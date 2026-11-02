"use client";
import Image from "next/image";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import {
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
  ArrowUpRight,
  Columns3,
  Terminal,
  ChartNoAxesCombined,
  Maximize2,
} from "lucide-react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="theme-switch" role="group" aria-label="Tema da página">
      {[
        { id: "light", label: "Claro", Icon: Sun },
        { id: "dark", label: "Escuro", Icon: Moon },
        { id: "system", label: "Sistema", Icon: Monitor },
      ].map(({ id, label, Icon }) => (
        <button
          key={id}
          aria-label={`Tema ${label}`}
          title={label}
          aria-pressed={mounted && theme === id}
          onClick={() => setTheme(id)}
        >
          <Icon size={16} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
const links = [
  ["#workspace", "Workspace"],
  ["#mcp", "Protocolo MCP"],
  ["#insights", "Insights & Auditoria"],
  ["#seguranca", "Segurança Enterprise"],
];
export function Navigation() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <>
      <nav className="desktop-nav" aria-label="Navegação principal">
        {links.map(([href, label]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </nav>
      <div className="nav-actions">
        <ThemeSwitch />
        <a
          className="button nav-cta"
          href="/demo/index.html#/board"
          target="_blank"
          rel="noopener noreferrer"
        >
          Explorar protótipo <ArrowUpRight size={15} />
        </a>
        <button
          className="menu-toggle"
          ref={button}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav
          className="mobile-nav"
          id="mobile-nav"
          aria-label="Navegação mobile"
        >
          {links.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <a
            href="/demo/index.html#/board"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            Explorar demonstração <ArrowUpRight size={16} />
          </a>
        </nav>
      )}
    </>
  );
}
export function ProductImage({
  screen,
  alt,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 1100px",
}: {
  screen: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
}) {
  // CSS selects the correct source before hydration, including system preference.
  return (
    <div className="product-image">
      <Image
        className="shot-light"
        src={`/assets/screenshots/${screen}-light@2x.webp`}
        alt={`${alt}, modo claro`}
        width={2880}
        height={1800}
        sizes={sizes}
        priority={priority}
      />
      <Image
        className="shot-dark"
        src={`/assets/screenshots/${screen}-dark@2x.webp`}
        alt={`${alt}, modo escuro`}
        width={2880}
        height={1800}
        sizes={sizes}
      />
    </div>
  );
}
const views = [
  {
    id: "kanban",
    label: "Kanban",
    Icon: Columns3,
    route: "board",
    caption:
      "Prioridades, dependências e entregas. O trabalho visível, do backlog à conclusão.",
  },
  {
    id: "mcp",
    label: "Agentes MCP",
    Icon: Terminal,
    route: "mcp/test",
    caption:
      "Ferramentas com argumentos explícitos, resposta JSON e permissões do perfil ativo.",
  },
  {
    id: "insights",
    label: "Insights",
    Icon: ChartNoAxesCombined,
    route: "insights",
    caption:
      "Indicadores calculados sobre o mesmo estado do Workspace. Contexto para decidir.",
  },
];
export function ProductShowcase() {
  const [active, setActive] = useState(0);
  const selected = views[active];
  function move(e: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % views.length;
    else if (e.key === "ArrowLeft")
      next = (i + views.length - 1) % views.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = views.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    document.getElementById(`tab-${views[next].id}`)?.focus();
  }
  return (
    <div className="showcase">
      <div className="showcase-toolbar">
        <div
          className="view-tabs"
          role="tablist"
          aria-label="Visões do produto"
        >
          {views.map(({ id, label, Icon }, i) => (
            <button
              key={id}
              id={`tab-${id}`}
              role="tab"
              aria-selected={active === i}
              aria-controls={`panel-${id}`}
              tabIndex={active === i ? 0 : -1}
              onKeyDown={(e) => move(e, i)}
              onClick={() => setActive(i)}
            >
              <Icon size={15} strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>
        <span className="toolbar-note">
          <span className="status-dot" /> Ambiente de demonstração
        </span>
        <a
          className="expand"
          href={`/demo/index.html#/${selected.route}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir ${selected.label} na demonstração`}
        >
          <Maximize2 size={16} />
        </a>
      </div>
      {views.map((v, i) => (
        <div
          key={v.id}
          id={`panel-${v.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${v.id}`}
          hidden={active !== i}
          tabIndex={0}
        >
          <ProductImage
            screen={v.id}
            alt={`ProjectFlow AI: ${v.label}`}
            priority={i === 0}
          />
        </div>
      ))}
      <div className="showcase-caption">
        <span>{selected.caption}</span>
        <span className="mono">{String(active + 1).padStart(2, "0")} / 03</span>
      </div>
    </div>
  );
}
