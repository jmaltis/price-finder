import path from 'node:path';
import type { LeadQualified, LeadReview, WebsiteDraft } from '../types/lead-finder.js';
import { getEnvOptional } from '../utils/env.js';
import { INTERNAL_PRODUCT_NAME } from './config.js';
import { LeadFinderStore } from './store.js';
import { isoNow, normalizeWhitespace, slugify, toFileHref } from './utils.js';

function renderInfoList(items: string[]): string {
  return items.map(item => `<li>${escapeHtml(item)}</li>`).join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderGallery(images: string[]): string {
  if (images.length === 0) {
    return `
      <div class="gallery-card fallback">
        <div>
          <span>Preview visuelle</span>
          <strong>Une galerie photo premium peut être ajoutée ici</strong>
        </div>
      </div>
      <div class="gallery-card accent"></div>
      <div class="gallery-card neutral"></div>
    `;
  }

  return images.slice(0, 9).map((imageUrl, index) => {
    const cssClass = index === 0 ? 'gallery-card large' : index > 5 ? 'gallery-card compact' : 'gallery-card';
    return `<figure class="${cssClass}"><img src="${escapeHtml(imageUrl)}" alt="Aperçu ${index + 1}" loading="lazy" /></figure>`;
  }).join('\n');
}

function renderReviews(reviews: LeadReview[], fallbackHighlights: string[]): string {
  if (reviews.length === 0) {
    return fallbackHighlights.map(highlight => `<div class="review-card"><strong>${escapeHtml(highlight)}</strong></div>`).join('\n');
  }

  return reviews.slice(0, 6).map(review => {
    const rating = review.rating ? `${review.rating.toFixed(1)}/5` : 'Avis client';
    const relativeTime = review.relativeTime ? ` · ${review.relativeTime}` : '';
    return `<article class="review-card quote">
      <strong>${escapeHtml(rating)}${escapeHtml(relativeTime)}</strong>
      <p>${escapeHtml(review.text)}</p>
    </article>`;
  }).join('\n');
}

function renderPills(items: string[]): string {
  if (items.length === 0) return '<span class="pill muted">À enrichir avec le prospect</span>';
  return items.slice(0, 14).map(item => `<span class="pill">${escapeHtml(item)}</span>`).join('\n');
}

function buildDraftSections(lead: LeadQualified): WebsiteDraft['sections'] {
  const neighborhood = lead.address?.split(',')[0] ?? 'Lyon';
  const reviewLine = lead.reviewCount != null
    ? `${lead.reviewCount} avis publics visibles sur Google Maps`
    : 'Une réputation locale déjà perceptible sur Google Maps';

  const details = lead.businessDetails ?? {
    priceRange: null,
    serviceOptions: [],
    diningOptions: [],
    offerings: [],
    atmosphere: [],
    rawAttributes: []
  };
  const detailHighlights = [
    details.priceRange ? `Budget indicatif: ${details.priceRange}` : null,
    ...details.serviceOptions.slice(0, 3),
    ...details.diningOptions.slice(0, 3),
    ...details.offerings.slice(0, 3),
    ...details.atmosphere.slice(0, 2)
  ].filter((item): item is string => Boolean(item));

  return {
    heroTitle: `${lead.businessName}, une adresse qui mérite un vrai site`,
    heroSubtitle: normalizeWhitespace(
      `${lead.category ?? 'Commerce food'} à ${lead.city}. ${lead.rating ? `${lead.rating.toFixed(1)}/5` : 'Bien noté'} ` +
      `avec une présence locale déjà forte. Cette démo montre ce que votre vitrine web pourrait raconter en 5 secondes.`
    ),
    aboutTitle: `Présenter ${lead.businessName} comme une vraie destination locale`,
    aboutBody: normalizeWhitespace(
      `${lead.businessName} possède déjà les bons signaux de confiance: ${reviewLine.toLowerCase()}, une adresse claire${lead.openingHours ? ', des horaires visibles' : ''}` +
      `${lead.phone ? ', et un point de contact direct' : ''}. ` +
      `Le site proposé met en avant l'identité du lieu, simplifie la découverte sur mobile et transforme l'intérêt local en réservations ou visites.`
    ),
    practicalTitle: 'Infos utiles à afficher sans friction',
    practicalItems: [
      lead.address ? `Adresse: ${lead.address}` : 'Adresse à confirmer',
      lead.openingHours ? `Horaires: ${lead.openingHours}` : 'Horaires modulables selon votre service',
      lead.phone ? `Contact: ${lead.phone}` : 'Contact à connecter',
      details.priceRange ? `Prix: ${details.priceRange}` : null,
      lead.websiteStatus === 'no_domain' ? 'Aucun site propriétaire détecté: opportunité forte' : 'Présence sociale sans site propriétaire'
    ].filter((item): item is string => Boolean(item)),
    reviewsTitle: 'Ce que la confiance locale raconte déjà',
    reviewHighlights: [
      lead.rating ? `Note visible: ${lead.rating.toFixed(1)}/5` : 'Réputation locale déjà détectée',
      reviewLine,
      `Positionnement: ${lead.category ?? 'food business'} à ${neighborhood}`
    ],
    detailHighlights
  };
}

function renderHtml(lead: LeadQualified, draft: WebsiteDraft): string {
  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${draft.title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      :root {
        --bg: #f6efe4;
        --paper: rgba(255, 251, 246, 0.88);
        --ink: #1d1a17;
        --muted: #66584d;
        --accent: #bb5a3c;
        --accent-soft: #ebc8b1;
        --line: rgba(29, 26, 23, 0.12);
        --shadow: 0 20px 60px rgba(63, 40, 18, 0.12);
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Manrope", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top right, rgba(187, 90, 60, 0.18), transparent 32%),
          radial-gradient(circle at 0% 30%, rgba(238, 197, 153, 0.34), transparent 28%),
          linear-gradient(180deg, #fbf6ef 0%, #f2e8d8 100%);
      }

      .shell {
        width: min(1120px, calc(100% - 32px));
        margin: 0 auto;
        padding: 32px 0 64px;
      }

      .hero, .panel {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 28px;
        box-shadow: var(--shadow);
      }

      .hero {
        overflow: hidden;
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
      }

      .hero-copy {
        padding: 48px;
      }

      .eyebrow {
        display: inline-flex;
        gap: 10px;
        align-items: center;
        background: rgba(29, 26, 23, 0.06);
        border-radius: 999px;
        padding: 8px 14px;
        font-size: 13px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      h1, h2 {
        font-family: "Fraunces", serif;
        line-height: 0.96;
        margin: 0;
      }

      h1 {
        font-size: clamp(3rem, 8vw, 5.6rem);
        margin-top: 18px;
        max-width: 10ch;
      }

      .hero-copy p {
        color: var(--muted);
        font-size: 1.05rem;
        line-height: 1.7;
        max-width: 58ch;
      }

      .hero-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 28px;
      }

      .hero-stat {
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 18px;
        background: rgba(255,255,255,0.62);
      }

      .hero-stat strong {
        display: block;
        font-size: 1.2rem;
        margin-bottom: 6px;
      }

      .hero-aside {
        background: linear-gradient(180deg, rgba(187, 90, 60, 0.92), rgba(120, 48, 29, 0.94));
        color: #fff5ef;
        padding: 34px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }

      .hero-aside .cta {
        background: #fff6f1;
        color: #652b18;
        text-decoration: none;
        display: inline-flex;
        width: fit-content;
        padding: 14px 18px;
        border-radius: 999px;
        font-weight: 700;
        margin-top: 18px;
      }

      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
        margin-top: 18px;
      }

      .panel {
        padding: 28px;
      }

      .panel h2 {
        font-size: clamp(2rem, 4vw, 2.8rem);
        margin-bottom: 16px;
      }

      .panel p, .panel li {
        color: var(--muted);
        line-height: 1.7;
      }

      .reviews {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .review-card {
        border-radius: 22px;
        padding: 20px;
        background: linear-gradient(180deg, rgba(255,255,255,0.78), rgba(235, 200, 177, 0.42));
        border: 1px solid rgba(187, 90, 60, 0.16);
      }

      .review-card.quote p {
        margin: 10px 0 0;
        color: var(--muted);
        line-height: 1.65;
      }

      .gallery {
        display: grid;
        grid-template-columns: 1.3fr 1fr 1fr;
        gap: 14px;
      }

      .gallery-card {
        border-radius: 22px;
        min-height: 210px;
        overflow: hidden;
        background: linear-gradient(135deg, rgba(187, 90, 60, 0.15), rgba(82, 44, 36, 0.08));
      }

      .gallery-card img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .gallery-card.large {
        grid-row: span 2;
      }

      .gallery-card.compact {
        min-height: 150px;
      }

      .pills {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .pill {
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255,255,255,0.68);
        padding: 10px 13px;
        color: var(--muted);
        font-weight: 600;
        font-size: 0.92rem;
      }

      .pill.muted {
        opacity: 0.7;
      }

      .gallery-card.fallback,
      .gallery-card.accent,
      .gallery-card.neutral {
        display: grid;
        place-items: center;
      }

      .gallery-card.fallback { padding: 28px; }
      .gallery-card.accent { background: linear-gradient(135deg, rgba(187, 90, 60, 0.34), rgba(240, 216, 189, 0.5)); }
      .gallery-card.neutral { background: linear-gradient(135deg, rgba(60, 41, 33, 0.12), rgba(255,255,255,0.85)); }

      .footer {
        text-align: center;
        color: var(--muted);
        padding: 18px 0 0;
        font-size: 0.95rem;
      }

      @media (max-width: 880px) {
        .hero, .grid, .reviews, .gallery {
          grid-template-columns: 1fr;
        }

        .hero-copy, .hero-aside, .panel {
          padding: 24px;
        }

        .hero-stats {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">Preview premium • ${escapeHtml(INTERNAL_PRODUCT_NAME)} Lyon</div>
          <h1>${escapeHtml(draft.sections.heroTitle)}</h1>
          <p>${escapeHtml(draft.sections.heroSubtitle)}</p>
          <div class="hero-stats">
            <div class="hero-stat">
              <strong>${lead.rating ? lead.rating.toFixed(1) : '4.4+'}/5</strong>
              <span>Réputation locale visible</span>
            </div>
            <div class="hero-stat">
              <strong>${lead.reviewCount ?? 'n/a'}</strong>
              <span>Avis publics détectés</span>
            </div>
            <div class="hero-stat">
              <strong>${lead.websiteStatus === 'no_domain' ? '0' : 'social'}</strong>
              <span>Présence web propriétaire</span>
            </div>
          </div>
        </div>
        <aside class="hero-aside">
          <div>
            <strong style="display:block;font-size:1.1rem;margin-bottom:8px;">Une démo pensée pour convertir plus vite</strong>
            <p style="color:rgba(255,245,239,0.86);line-height:1.7;">Horaires, carte, contact, rassurance locale, mobile first: les points qui doivent apparaître avant même que le visiteur réfléchisse.</p>
            <a class="cta" href="${escapeHtml(lead.source.mapsUrl)}">Voir la fiche Google Maps</a>
          </div>
        </aside>
      </section>

      <section class="grid">
        <article class="panel">
          <h2>${escapeHtml(draft.sections.aboutTitle)}</h2>
          <p>${escapeHtml(draft.sections.aboutBody)}</p>
        </article>
        <article class="panel">
          <h2>${escapeHtml(draft.sections.practicalTitle)}</h2>
          <ul>${renderInfoList(draft.sections.practicalItems)}</ul>
        </article>
      </section>

      <section class="panel" style="margin-top:18px;">
        <h2>${escapeHtml(draft.sections.reviewsTitle)}</h2>
        <div class="reviews">
          ${renderReviews(lead.reviews ?? [], draft.sections.reviewHighlights)}
        </div>
      </section>

      <section class="panel" style="margin-top:18px;">
        <h2>Preuves et détails à transformer en contenu</h2>
        <div class="pills">
          ${renderPills(draft.sections.detailHighlights.length ? draft.sections.detailHighlights : (lead.businessDetails?.rawAttributes ?? []))}
        </div>
      </section>

      <section class="panel" style="margin-top:18px;">
        <h2>Galerie et ambiance</h2>
        <div class="gallery">
          ${renderGallery(draft.assets)}
        </div>
      </section>

      <p class="footer">Démo générée automatiquement le ${new Date(draft.generatedAt).toLocaleDateString('fr-FR')} pour ${escapeHtml(lead.businessName)}. Sources: fiche Google Maps, images publiques et signaux publics visibles.</p>
    </main>
  </body>
</html>`;
}

export async function generateWebsiteDraft(
  lead: LeadQualified,
  store: LeadFinderStore
): Promise<WebsiteDraft> {
  const slug = slugify(lead.businessName || lead.leadId);
  const previewBaseUrl = getEnvOptional('leadPreviewBaseUrl');
  const htmlPath = path.join(store.previewRootDir, slug, 'index.html');
  const previewUrl = previewBaseUrl
    ? `${previewBaseUrl.replace(/\/$/, '')}/${slug}/`
    : toFileHref(htmlPath);

  const draft: WebsiteDraft = {
    leadId: lead.leadId,
    slug,
    title: `${lead.businessName} — preview site vitrine`,
    previewUrl,
    outputDir: path.join(store.previewRootDir, slug),
    generatedAt: isoNow(),
    sections: buildDraftSections(lead),
    assets: lead.imageUrls.slice(0, 9)
  };

  const html = renderHtml(lead, draft);
  await store.writePreview(slug, html, draft);
  return draft;
}
