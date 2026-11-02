import { chromium } from "@playwright/test";
import sharp from "sharp";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const source = path.resolve(
  process.env.PROTOTYPE_DIR || "../projectflow-ai-prototipo",
);
const target = path.resolve("public/assets/screenshots");
await mkdir(target, { recursive: true });
await mkdir("evidence/raw", { recursive: true });
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
};
const server = createServer(async (req, res) => {
  try {
    const file = path.resolve(
      source,
      "." +
        (decodeURIComponent(req.url.split("?")[0]) === "/"
          ? "/index.html"
          : decodeURIComponent(req.url.split("?")[0])),
    );
    if (!file.startsWith(source + path.sep)) throw new Error("Invalid path");
    res.setHeader(
      "Content-Type",
      mime[path.extname(file)] || "application/octet-stream",
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(4173, "127.0.0.1", r));
const browser = await chromium.launch({ headless: true });
const manifest = {
  sourceRepository:
    "https://github.com/danielharrisonlf/projectflow-ai-prototipo",
  sourceCommit: execFileSync("git", ["-C", source, "rev-parse", "HEAD"])
    .toString()
    .trim(),
  capturedAt: new Date().toISOString(),
  viewport: { width: 1440, height: 900 },
  files: [],
};
try {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({
      viewport: manifest.viewport,
      deviceScaleFactor: 2,
      colorScheme: theme,
    });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/#/board");
    await page.evaluate(async (mode) => {
      PF.act.setTheme(mode);
      await document.fonts.ready;
    }, theme);
    for (const [name, route] of [
      ["kanban", "board"],
      ["mcp", "mcp/test"],
      ["mcp-tools", "mcp/tools"],
      ["mcp-history", "mcp/runs"],
      ["assistant", "assistant"],
      ["insights", "insights"],
      ["audit", "insights/audit"],
    ]) {
      await page.evaluate((route) => {
        PF.closeOverlays();
        PF.navigate("/" + route);
      }, route);
      await page.waitForTimeout(250);
      if (name === "mcp") {
        await page.getByRole("button", { name: "Executar ferramenta" }).click();
        await page.waitForTimeout(600);
        await page.locator(".code").filter({ hasText: '"ok": true' }).waitFor();
      }
      if (name === "assistant") {
        await page
          .getByRole("button", {
            name: "Planejar: portal de parceiros com cadastro, catálogo e pedidos",
            exact: true,
          })
          .click();
        await page.locator(".sim-badge").waitFor();
        await page.locator(".chat-log").evaluate((el) => (el.scrollTop = 0));
      }
      if (name === "audit") {
        const rows = page.locator("tr.row-click");
        // Open a real existing status-change record with a before/after diff.
        const row = rows.filter({ hasText: "Mudança de status" }).first();
        if (await row.count()) await row.click();
        else await rows.first().click();
        await page.locator(".diff-table").waitFor();
      }
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(200);
      const retina = await page.screenshot({ animations: "disabled" });
      await writeFile(`evidence/raw/${name}-${theme}@2x.png`, retina);
      for (const [suffix, width] of [
        ["", 1440],
        ["@2x", 2880],
      ]) {
        const file = `${name}-${theme}${suffix}.webp`;
        const output = await sharp(retina)
          .resize(width)
          .webp({ quality: 87, effort: 6 })
          .toBuffer();
        await writeFile(path.join(target, file), output);
        manifest.files.push({
          file,
          route: "#/" + route,
          theme,
          width,
          height: (width * 900) / 1440,
          bytes: output.length,
        });
      }
      console.log(`Captured ${name} ${theme}`);
    }
    await context.close();
  }
  await writeFile(
    path.join(target, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
