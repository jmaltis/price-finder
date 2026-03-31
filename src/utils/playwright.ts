import { chromium, type Browser } from 'playwright';
import { logger } from './logger.js';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export async function fetchHtmlPlaywright(
  url: string,
  options?: { timeoutMs?: number }
): Promise<string | null> {
  const timeout = options?.timeoutMs ?? 15_000;

  try {
    const browser = await getBrowser();
    const context = await browser.newContext({
      locale: 'fr-FR',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    // Attendre un peu que le JS s'exécute
    await page.waitForTimeout(2000);

    const html = await page.content();
    await context.close();

    return html;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.warn(`📄 Playwright échoué pour ${url}: ${message}`);
    return null;
  }
}
