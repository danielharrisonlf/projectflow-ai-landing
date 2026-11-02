import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function openLanding(page: Page) {
  const response = await page.goto('/', { waitUntil: 'networkidle' });
  expect(response?.ok(), 'landing page should return a successful response').toBeTruthy();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function loadThemeImages(page: Page, theme: 'light' | 'dark') {
  return page.evaluate(async (activeTheme) => {
    const images = [...document.querySelectorAll<HTMLImageElement>(`main img.shot-${activeTheme}`)];
    await Promise.all(images.map(async (image) => {
      image.loading = 'eager';
      try {
        await image.decode();
      } catch {
        // Return the failed source below so the assertion includes a useful locator.
      }
    }));
    return images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.currentSrc || image.src);
  }, theme);
}

test.describe('landing interactions', () => {
  test('supports light, dark, and system themes, and persists explicit choices', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.getByRole('button', { name: 'Tema Escuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: 'Tema Escuro' })).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'Tema Sistema' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('button', { name: 'Tema Sistema' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('hero tabs support keyboard navigation and swap product screenshots with the theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await openLanding(page);

    const kanbanTab = page.getByRole('tab', { name: 'Kanban' });
    const mcpTab = page.getByRole('tab', { name: 'Agentes MCP' });
    const insightsTab = page.getByRole('tab', { name: 'Insights' });
    await expect(kanbanTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-kanban .shot-light')).toBeVisible();
    await expect(page.locator('#panel-kanban .shot-dark')).toBeHidden();

    await kanbanTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(mcpTab).toBeFocused();
    await expect(mcpTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-mcp')).toBeVisible();
    await expect(page.locator('#panel-mcp .shot-light')).toHaveAttribute('alt', /Agentes MCP, modo claro/);

    await page.keyboard.press('End');
    await expect(insightsTab).toBeFocused();
    await expect(insightsTab).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(mcpTab).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('button', { name: 'Tema Escuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#panel-mcp .shot-dark')).toBeVisible();
    await expect(page.locator('#panel-mcp .shot-dark')).toHaveAttribute('alt', /Agentes MCP, modo escuro/);
    await expect(page.locator('#panel-mcp .shot-light')).toBeHidden();
  });

  test('mobile navigation closes on Escape and returns focus to its trigger', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openLanding(page);
    const trigger = page.locator('.menu-toggle');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('navigation', { name: 'Navegação mobile' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('navigation', { name: 'Navegação mobile' })).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('the MCP CTA opens a functional local demo console', async ({ page }) => {
    await openLanding(page);
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Abrir console MCP' }).click();
    const demo = await popupPromise;
    await demo.waitForLoadState('domcontentloaded');
    await expect(demo).toHaveURL(/\/demo\/index\.html#\/mcp\/test$/);
    await expect(demo.getByRole('heading', { name: 'Agentes e integração MCP' })).toBeVisible();
    await expect(demo.getByText('Console de teste')).toBeVisible();
    await expect(demo.getByLabel('Argumentos JSON')).toHaveValue(/"project": "PCL"/);
    await demo.getByRole('button', { name: 'Executar ferramenta' }).click();
    await expect(demo.locator('pre.code').last()).toContainText('"ok": true', { timeout: 5000 });
    await expect(demo.locator('pre.code').last()).toContainText('"tasks"');
  });

  test('publishes title, description, canonical, Open Graph metadata, and a reachable OG image', async ({ page, request }) => {
    await openLanding(page);
    await expect(page).toHaveTitle(/ProjectFlow AI/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /ProjectFlow AI/);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical, 'canonical URL should be present').toBeTruthy();
    expect(new URL(canonical!).pathname).toBe('/');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Sua equipe no fluxo/);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'ProjectFlow AI');
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /Workspace/);
    const ogPath = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogPath, 'Open Graph image metadata should be present').toBeTruthy();
    const ogUrl = new URL(ogPath!);
    const ogResponse = await request.get(new URL(`${ogUrl.pathname}${ogUrl.search}`, page.url()).toString());
    expect(ogResponse.ok(), `Open Graph image should load: ${ogPath}`).toBeTruthy();
    expect(ogResponse.headers()['content-type']).toMatch(/^image\//);
  });
});

test('no horizontal overflow at supported desktop, tablet, and mobile widths', async ({ page }) => {
  await openLanding(page);
  const widths = [360, 390, 768, 1440, 1920];
  const overflow: Array<{ width: number; scrollWidth: number }> = [];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(80);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    if (scrollWidth > width) overflow.push({ width, scrollWidth });
  }

  expect(overflow, `document-level horizontal overflow by viewport: ${JSON.stringify(overflow)}`).toEqual([]);
});

test('loads all landing images and local IBM Plex fonts without browser errors', async ({ page }) => {
  const failedRequests: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} (${request.failure()?.errorText})`));
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await openLanding(page);

  const count = await page.locator('main img').count();
  expect(count).toBeGreaterThan(0);
  for (const theme of ['light', 'dark'] as const) {
    await page.getByRole('button', { name: theme === 'light' ? 'Tema Claro' : 'Tema Escuro' }).click();
    const failedImages = await loadThemeImages(page, theme);
    expect(failedImages, `${theme} screenshots that failed to decode`).toEqual([]);
  }

  const fontStatus = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 16px "IBM Plex Sans"'),
      document.fonts.load('500 12px "IBM Plex Mono"'),
    ]);
    return {
      sans: document.fonts.check('400 16px "IBM Plex Sans"'),
      mono: document.fonts.check('500 12px "IBM Plex Mono"'),
      loaded: [...document.fonts].filter(font => font.status === 'loaded').map(font => font.family),
    };
  });
  expect(fontStatus.sans, JSON.stringify(fontStatus)).toBe(true);
  expect(fontStatus.mono, JSON.stringify(fontStatus)).toBe(true);
  expect(failedRequests, 'failed network requests').toEqual([]);
  expect(pageErrors, 'uncaught browser errors').toEqual([]);
  expect(consoleErrors, 'console errors').toEqual([]);
});

for (const theme of ['light', 'dark'] as const) {
  test(`passes axe WCAG AA checks in ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await openLanding(page);
    await page.getByRole('button', { name: theme === 'light' ? 'Tema Claro' : 'Tema Escuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const results = await new AxeBuilder({ page }).withTags(AA_TAGS).analyze();
    expect(results.violations.map(({ id, impact, description, nodes }) => ({
      id,
      impact,
      description,
      elements: nodes.map(node => ({ target: node.target, summary: node.failureSummary })),
    }))).toEqual([]);
  });
}

test('captures full-page desktop and mobile evidence in both themes', async ({ page }) => {
  await openLanding(page);
  await page.evaluate(() => document.fonts.ready);

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const theme of ['light', 'dark'] as const) {
      await page.getByRole('button', { name: theme === 'light' ? 'Tema Claro' : 'Tema Escuro' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const failedImages = await loadThemeImages(page, theme);
      expect(failedImages, `${theme} screenshots that failed before evidence capture`).toEqual([]);
      await page.screenshot({
        path: `evidence/landing-${viewport.name}-${theme}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
});
