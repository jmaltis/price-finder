import 'dotenv/config';
import { Stagehand } from '@browserbasehq/stagehand';

async function main() {
  const url = 'https://www.airbnb.fr/s/Sarlat-la-Can%C3%A9da--France/homes?checkin=2026-05-01&checkout=2026-05-03&adults=2&currency_code=EUR';

  console.log('Starting Stagehand (LOCAL mode)...');
  const stagehand = new Stagehand({
    env: 'LOCAL',
    model: 'anthropic/claude-haiku-4-5',
    verbose: 0
  });
  await stagehand.init();

  const page = stagehand.context.pages()[0];
  console.log('Navigating to Airbnb...');

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeoutMs: 30000 });
    await new Promise(r => setTimeout(r, 5000));

    // Dismiss cookie banner if present
    try {
      const cookieBtn = page.locator('button[data-testid="accept-btn"]');
      if (await cookieBtn.count() > 0) {
        await cookieBtn.click();
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch { /* */ }

    // Scroll to load results
    // eslint-disable-next-line no-undef
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 2000));

    // Check page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Check if we got blocked or redirected
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Try Airbnb's card selectors
    const cardData = await page.evaluate(() => {
      // Airbnb uses itemprop="itemListElement" for listings
      const cards = document.querySelectorAll('[itemprop="itemListElement"]');
      if (cards.length > 0) {
        return { method: 'itemListElement', count: cards.length, text: Array.from(cards).slice(0, 5).map(c => (c as HTMLElement).innerText).join('\n---\n') };
      }

      // Alternative: data-testid selectors
      const cardAlt = document.querySelectorAll('[data-testid="card-container"]');
      if (cardAlt.length > 0) {
        return { method: 'card-container', count: cardAlt.length, text: Array.from(cardAlt).slice(0, 5).map(c => (c as HTMLElement).innerText).join('\n---\n') };
      }

      // Alternative: listing cards via class patterns
      const listingCards = document.querySelectorAll('[id^="listing-card"]');
      if (listingCards.length > 0) {
        return { method: 'listing-card', count: listingCards.length, text: Array.from(listingCards).slice(0, 5).map(c => (c as HTMLElement).innerText).join('\n---\n') };
      }

      return { method: 'none', count: 0, text: '' };
    });

    console.log(`\n=== CARDS: ${cardData.count} via "${cardData.method}" ===`);
    console.log(cardData.text.substring(0, 3000));

    // Fallback: grab visible text from main content
    if (cardData.count === 0) {
      const mainText = await page.evaluate(() => {
        const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
        return (main as HTMLElement).innerText?.substring(0, 5000) || '';
      });
      console.log(`\n=== MAIN TEXT (${mainText.length} chars) ===`);
      console.log(mainText.substring(0, 3000));
    }

    // Check for structured data
    const jsonLd = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      return Array.from(scripts).map(s => s.textContent).filter(Boolean);
    });
    console.log(`\n=== JSON-LD scripts found: ${jsonLd.length} ===`);
    for (const ld of jsonLd) {
      console.log(ld?.substring(0, 500));
    }

    // Try to find price elements
    const prices = await page.evaluate(() => {
      // Airbnb often uses spans with price content
      const priceSpans = document.querySelectorAll('span');
      const priceTexts: string[] = [];
      priceSpans.forEach(span => {
        const text = span.textContent?.trim() || '';
        if (/\d+\s*€|€\s*\d+/.test(text) && text.length < 30) {
          priceTexts.push(text);
        }
      });
      return [...new Set(priceTexts)].slice(0, 20);
    });
    console.log(`\n=== Price-like elements: ${prices.length} ===`);
    prices.forEach(p => console.log(`  ${p}`));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await stagehand.close();
  }
}

main().catch(console.error);
