import 'dotenv/config';
import { z } from 'zod';
import { getStagehand, dismissCookies, closeStagehand, robustExtract } from './pipeline/extractors/stagehand.js';
import { logger } from './utils/logger.js';

const CHECKIN = '2026-08-07';
const CHECKOUT = '2026-08-15';
const NIGHTS = 8;
const MAX_BUDGET = 1800;

const HotelSchema = z.object({
  hotels: z.array(z.object({
    name: z.string().describe('Nom de l\'hôtel ou du logement'),
    priceTotal: z.number().nullable().describe('Prix total du séjour en EUR (toutes les nuits)'),
    pricePerNight: z.number().nullable().describe('Prix par nuit en EUR si affiché'),
    rating: z.string().nullable().describe('Note / score (ex: 8.5/10, 4.2/5, Superbe)'),
    location: z.string().nullable().describe('Emplacement / quartier / ville'),
    hasPool: z.boolean().nullable().describe('Piscine mentionnée ou visible'),
    url: z.string().nullable().describe('URL / lien href vers la fiche du logement'),
  }))
});

interface HotelResult {
  name: string;
  priceTotal: number;
  pricePerNight: number;
  rating: string;
  location: string;
  url: string;
  source: string;
  area: string;
}

const SEARCHES = [
  {
    source: 'Booking',
    area: 'Sud',
    url: `https://www.booking.com/searchresults.fr.html?ss=Sardaigne+du+Sud%2C+Italie&checkin=${CHECKIN}&checkout=${CHECKOUT}&group_adults=2&group_children=2&age=8&age=12&no_rooms=1&nflt=hotelfacility%3D433&selected_currency=EUR`,
  },
  {
    source: 'Booking',
    area: 'Est',
    url: `https://www.booking.com/searchresults.fr.html?ss=Costa+Rei%2C+Sardaigne%2C+Italie&checkin=${CHECKIN}&checkout=${CHECKOUT}&group_adults=2&group_children=2&age=8&age=12&no_rooms=1&nflt=hotelfacility%3D433&selected_currency=EUR`,
  },
  {
    source: 'Airbnb',
    area: 'Sud',
    url: `https://www.airbnb.fr/s/Sardaigne-du-Sud--Italie/homes?checkin=${CHECKIN}&checkout=${CHECKOUT}&adults=2&children=2&amenities%5B%5D=7&price_max=${Math.floor(MAX_BUDGET / NIGHTS)}&currency=EUR`,
  },
  {
    source: 'Airbnb',
    area: 'Est',
    url: `https://www.airbnb.fr/s/Costa-Rei--Sardaigne--Italie/homes?checkin=${CHECKIN}&checkout=${CHECKOUT}&adults=2&children=2&amenities%5B%5D=7&price_max=${Math.floor(MAX_BUDGET / NIGHTS)}&currency=EUR`,
  },
  {
    source: 'Google Hotels',
    area: 'Sud',
    url: `https://www.google.com/travel/hotels?q=hotel+piscine+sardaigne+du+sud&dates=${CHECKIN},${CHECKOUT}&hl=fr&gl=fr`,
  },
  {
    source: 'Google Hotels',
    area: 'Est',
    url: `https://www.google.com/travel/hotels?q=hotel+piscine+sardaigne+est+costa+rei&dates=${CHECKIN},${CHECKOUT}&hl=fr&gl=fr`,
  },
];

async function searchHotels(source: string, area: string, url: string): Promise<HotelResult[]> {
  logger.info(`\n🔍 [${source} - ${area}] Recherche en cours...`);
  logger.info(`  URL: ${url.substring(0, 120)}`);

  const stagehand = await getStagehand();
  const page = stagehand.context.pages()[0];

  await page.goto(url, { waitUntil: 'domcontentloaded', timeoutMs: 30_000 });
  await dismissCookies(page);
  await new Promise(r => setTimeout(r, 4000));

  // Scroll pour charger les résultats
  // eslint-disable-next-line no-undef
  await page.evaluate(() => window.scrollBy(0, 1500));
  await new Promise(r => setTimeout(r, 2000));

  const instruction =
    `Extrais les 5 premiers hôtels/logements de cette page de résultats de recherche. ` +
    `Séjour du ${CHECKIN} au ${CHECKOUT} (${NIGHTS} nuits), 2 adultes + 2 enfants. ` +
    `Pour chaque résultat: nom, prix total du séjour en EUR, prix par nuit si affiché, ` +
    `note/score, emplacement, et si une piscine est mentionnée. ` +
    `Si le prix est affiché par nuit, calcule le total (× ${NIGHTS}). ` +
    `EXCLURE: campings, emplacements de tente, mobile-homes en camping. ` +
    `Ignore publicités et suggestions "vous aimerez aussi".`;

  const result = await robustExtract(stagehand, instruction, HotelSchema);

  // URLs fiables depuis le DOM (le LLM ne les extrait pas bien)
  const listingUrls = await page.evaluate(() => {
    const urls: string[] = [];
    const seen = new Set<string>();
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (/\/rooms\/|\/hotel\/|\/property\//.test(href)) {
        const clean = href.split('?')[0];
        if (!seen.has(clean)) {
          seen.add(clean);
          // eslint-disable-next-line no-undef
        urls.push(href.startsWith('http') ? href : `${window.location.origin}${href}`);
        }
      }
    });
    return urls;
  });

  const hotels: HotelResult[] = (result?.hotels ?? [])
    .filter(h => h.name && (h.priceTotal || h.pricePerNight))
    .map((h, i) => {
      const priceTotal = h.priceTotal ?? (h.pricePerNight ? h.pricePerNight * NIGHTS : 0);
      const pricePerNight = h.pricePerNight ?? (h.priceTotal ? Math.round(h.priceTotal / NIGHTS) : 0);
      return {
        name: h.name,
        priceTotal,
        pricePerNight,
        rating: h.rating ?? '-',
        location: h.location ?? '-',
        url: i < listingUrls.length ? listingUrls[i] : '',
        source,
        area,
      };
    })
    .filter(h => h.priceTotal > 0)
    .filter(h => !/camping|tente|glamping|mobile.?home/i.test(h.name))
    .sort((a, b) => a.priceTotal - b.priceTotal)
    .slice(0, 3);

  logger.info(`  → ${hotels.length} résultats (hors campings)`);
  for (const h of hotels) {
    logger.info(`    ${h.name} — ${h.priceTotal}€ (${h.pricePerNight}€/nuit) — ${h.rating}`);
  }

  return hotels;
}

function displayResults(results: HotelResult[], title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TOP 3 — ${title}`);
  console.log('='.repeat(60));

  if (results.length === 0) {
    console.log('  Aucun résultat sous budget avec piscine.');
    return;
  }

  results.forEach((h, i) => {
    console.log(`\n  ${i + 1}. ${h.name}`);
    console.log(`     Total    : ${h.priceTotal}€ (${h.pricePerNight}€/nuit)`);
    console.log(`     Note     : ${h.rating}`);
    console.log(`     Lieu     : ${h.location}`);
    console.log(`     Source   : ${h.source} (${h.area})`);
    if (h.url) console.log(`     Lien     : ${h.url}`);
  });
}

async function main() {
  console.log('=== Recherche hôtels Sardaigne ===');
  console.log(`Dates     : ${CHECKIN} → ${CHECKOUT} (${NIGHTS} nuits)`);
  console.log(`Voyageurs : 2 adultes + 2 enfants (8 et 12 ans)`);
  console.log(`Budget    : ${MAX_BUDGET}€ total | Piscine requise`);
  console.log(`Zones     : Sud et Est de la Sardaigne`);
  console.log(`Sources   : Booking.com, Airbnb, Google Hotels\n`);

  const sourceFilter = process.argv.find(a => a.startsWith('--source='))?.split('=')[1]?.toLowerCase();
  const searches = sourceFilter
    ? SEARCHES.filter(s => s.source.toLowerCase().includes(sourceFilter))
    : SEARCHES;

  if (sourceFilter) logger.info(`Filtre source: ${sourceFilter} (${searches.length} recherches)\n`);

  const allResults: HotelResult[] = [];

  for (const search of searches) {
    try {
      const results = await searchHotels(search.source, search.area, search.url);
      allResults.push(...results);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[${search.source} - ${search.area}] Erreur: ${msg}`);
      // Reset l'instance après un crash browser pour que la recherche suivante reparte
      try { await closeStagehand(); } catch { /* ignore */ }
    }
  }

  // Top 3 par source
  const bySource = new Map<string, HotelResult[]>();
  for (const r of allResults) {
    if (!bySource.has(r.source)) bySource.set(r.source, []);
    bySource.get(r.source)!.push(r);
  }

  for (const [source, results] of bySource) {
    const top3 = results.sort((a, b) => a.priceTotal - b.priceTotal);
    displayResults(top3, `${source} (piscine, 2A+2E, hors campings)`);
  }

  // Top 3 tous confondus
  const overallTop3 = allResults.sort((a, b) => a.priceTotal - b.priceTotal);
  displayResults(overallTop3, 'TOUS CONFONDUS');

  await closeStagehand();
}

main().catch(err => {
  logger.error(`Erreur fatale: ${err instanceof Error ? err.message : err}`);
  closeStagehand().catch(() => { /* ignore */ });
  process.exit(1);
});
