import { chromium } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
const font = (
  await readFile(
    "node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2",
  )
).toString("base64");
const shot = (
  await readFile("public/assets/screenshots/kanban-dark@2x.webp")
).toString("base64");
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<html lang="pt-BR"><style>@font-face{font-family:Plex;src:url(data:font/woff2;base64,${font})}*{box-sizing:border-box}body{margin:0;background:#0e1116;color:#e6e8eb;font-family:Plex,sans-serif;padding:48px}header{color:#7fa0f4;font-size:22px;margin-bottom:24px}h1{font-size:48px;font-weight:500;letter-spacing:-1.5px;line-height:1.1;margin:0 0 32px}h1 span{color:#9ba3ae}img{display:block;width:1104px;border:1px solid #333a44;border-radius:8px}</style><header>ProjectFlow AI</header><h1>Sua equipe no fluxo.<br><span>Seus agentes sob controle.</span></h1><img src="data:image/webp;base64,${shot}" alt="Kanban real do ProjectFlow AI"></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
  await mkdir("public/assets", { recursive: true });
  await page.screenshot({ path: "public/assets/og.png" });
} finally {
  await browser.close();
}
