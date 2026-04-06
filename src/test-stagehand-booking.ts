import 'dotenv/config';
import { Stagehand } from '@browserbasehq/stagehand';

async function main() {
  const url = 'https://www.booking.com/searchresults.fr.html?ss=Sarlat-la-Can%C3%A9da&checkin=2026-05-01&checkout=2026-05-03&group_adults=2&no_rooms=1&selected_currency=EUR';

  console.log('Starting Stagehand (LOCAL mode)...');
  const stagehand = new Stagehand({
    env: 'LOCAL',
    model: 'anthropic/claude-haiku-4-5',
    verbose: 0
  });
  await stagehand.init();

  const page = stagehand.context.pages()[0];
  console.log('Navigating to Booking.com...');

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeoutMs: 30000 });
    await new Promise(r => setTimeout(r, 5000));

    // Dismiss cookie banner
    try {
      const cookieBtn = page.locator('#onetrust-accept-btn-handler');
      if (await cookieBtn.count() > 0) {
        await cookieBtn.click();
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch { /* */ }

    // Scroll down to load results
    // eslint-disable-next-line no-undef
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 2000));

    // Extract via innerText (what user sees)
    const visibleText = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="property-card"]');
      if (cards.length > 0) {
        return Array.from(cards).slice(0, 5).map(c => (c as HTMLElement).innerText).join('\n---\n');
      }
      // Fallback: grab main content
      const main = document.querySelector('[data-component="arp-header"]')?.parentElement
        || document.querySelector('[role="main"]')
        || document.body;
      return (main as HTMLElement)?.innerText?.substring(0, 5000) || '';
    });

    console.log(`\n=== VISIBLE TEXT (${visibleText.length} chars) ===`);
    console.log(visibleText.substring(0, 3000));

    // Also check for structured data
    const jsonLd = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      return Array.from(scripts).map(s => s.textContent).filter(Boolean);
    });
    console.log(`\n=== JSON-LD scripts found: ${jsonLd.length} ===`);
    for (const ld of jsonLd) {
      console.log(ld?.substring(0, 500));
    }

    // Check data-testid elements for prices
    const priceData = await page.evaluate(() => {
      const prices = document.querySelectorAll('[data-testid="price-and-discounted-price"]');
      return Array.from(prices).slice(0, 10).map(p => p.textContent?.trim());
    });
    console.log(`\n=== Price elements: ${priceData.length} ===`);
    priceData.forEach(p => console.log(`  ${p}`));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await stagehand.close();
  }
}

main().catch(console.error);
