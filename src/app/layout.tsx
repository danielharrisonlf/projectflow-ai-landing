import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./globals.css";
import { Providers } from "@/components/interactive";

const site =
  process.env.NEXT_PUBLIC_SITE_URL || "https://projectflow-ai.vercel.app";
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "ProjectFlow AI | Projetos, agentes e governança",
  description:
    "Do planejamento por IA à auditoria com diffs. Explore o ProjectFlow AI: Kanban, agentes MCP, Insights e permissões em uma demonstração interativa.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "ProjectFlow AI",
    title: "Sua equipe no fluxo. Seus agentes sob controle.",
    description:
      "Workspace, agentes MCP e Insights. Uma visão conectada da operação à decisão.",
    images: [
      {
        url: "/assets/og.png",
        width: 1200,
        height: 630,
        alt: "ProjectFlow AI: gestão de projetos com agentes e governança",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProjectFlow AI | Projetos, agentes e governança",
    description: "Da decomposição por IA à auditoria com diffs.",
    images: ["/assets/og.png"],
  },
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
