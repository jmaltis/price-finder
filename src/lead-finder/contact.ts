import * as cheerio from 'cheerio';
import { COMMON_WEBMAIL_DOMAINS, PLACEHOLDER_EMAIL_DOMAINS } from './config.js';
import type { LeadContact, LeadRaw } from '../types/lead-finder.js';
import { fetchHtmlPlaywright } from '../utils/playwright.js';
import { logger } from '../utils/logger.js';
import { searchWeb } from './search.js';
import { dedupeStrings, extractEmails, extractUrls, getDomain, isLikelyBusinessWebsite, isSocialUrl, normalizeUrl, normalizeWhitespace } from './utils.js';

interface ContactProbe {
  url: string;
  origin: 'website' | 'search' | 'social' | 'directory';
}

interface EmailCandidate {
  email: string;
  confidence: LeadContact['confidence'];
  sourceUrl: string;
  origin: ContactProbe['origin'];
}

function extractObfuscatedEmails(text: string): string[] {
  const normalized = text
    .replace(/\s*\[\s*at\s*\]\s*/gi, '@')
    .replace(/\s*\(\s*at\s*\)\s*/gi, '@')
    .replace(/\s+at\s+/gi, '@')
    .replace(/\s*\[\s*dot\s*\]\s*/gi, '.')
    .replace(/\s*\(\s*dot\s*\)\s*/gi, '.')
    .replace(/\s+dot\s+/gi, '.');
  return extractEmails(normalized);
}

function extractSocialSpecificSignals(html: string, pageUrl: string): {
  emails: string[];
  urls: string[];
} {
  const loweredUrl = pageUrl.toLowerCase();
  const $ = cheerio.load(html);
  const metaText = dedupeStrings([
    $('meta[property="og:description"]').attr('content'),
    $('meta[name="description"]').attr('content'),
    $('meta[property="og:title"]').attr('content'),
    $('title').text()
  ]).join(' ');
  const fullText = normalizeWhitespace(`${metaText} ${$.text()}`);
  const embeddedText = $('script')
    .toArray()
    .map(element => $(element).html() ?? '')
    .join(' ');

  const emails = dedupeStrings([
    ...extractObfuscatedEmails(fullText),
    ...extractObfuscatedEmails(embeddedText)
  ]);

  const rawUrls = dedupeStrings([
    ...extractUrls(fullText),
    ...extractUrls(embeddedText),
    $('meta[property="og:url"]').attr('content') ?? '',
    $('link[rel="canonical"]').attr('href') ?? ''
  ]);

  const urls = rawUrls
    .map(url => {
      try {
        return new URL(url, pageUrl).toString();
      } catch {
        return url;
      }
    })
    .map(url => normalizeUrl(url))
    .filter((url): url is string => Boolean(url));

  if (loweredUrl.includes('linktr.ee')) {
    return {
      emails,
      urls
    };
  }

  if (loweredUrl.includes('instagram.com') || loweredUrl.includes('facebook.com')) {
    return {
      emails,
      urls
    };
  }

  return {
    emails: [],
    urls: []
  };
}

function extractContactSignalsFromHtml(html: string, url: string): {
  emails: string[];
  socialLinks: string[];
  phoneNumbers: string[];
  websiteCandidates: string[];
  contactPageCandidates: string[];
} {
  const $ = cheerio.load(html);
  const scriptText = $('script[type="application/ld+json"]')
    .toArray()
    .map(element => $(element).text())
    .join('\n');
  const text = normalizeWhitespace(`${$.text()} ${scriptText}`);
  const socialSignals = extractSocialSpecificSignals(html, url);

  const emails = dedupeStrings([
    ...extractEmails(text),
    ...socialSignals.emails,
    ...$('a[href^="mailto:"]')
      .toArray()
      .map(element => ($(element).attr('href') ?? '').replace(/^mailto:/i, '').split('?')[0])
  ]);

  const socialLinks = dedupeStrings(
    $('a[href]')
      .toArray()
      .map(element => {
        const href = $(element).attr('href') ?? '';
        try {
          return new URL(href, url).toString();
        } catch {
          return href;
        }
      })
      .filter(link => /^https?:\/\//i.test(link) && isSocialUrl(link))
  );

  const websiteCandidates = dedupeStrings(
    [
      ...$('a[href]')
        .toArray()
        .map(element => $(element).attr('href') ?? ''),
      ...socialSignals.urls,
      $('link[rel="canonical"]').attr('href') ?? '',
      $('meta[property="og:url"]').attr('content') ?? '',
      $('meta[name="twitter:url"]').attr('content') ?? ''
    ]
      .filter(Boolean)
      .map(link => {
        try {
          return new URL(link, url).toString();
        } catch {
          return link;
        }
      })
      .filter(link => /^https?:\/\//i.test(link))
      .map(link => normalizeUrl(link))
      .filter((link): link is string => Boolean(link) && isLikelyBusinessWebsite(link))
  );

  const contactPageCandidates = dedupeStrings(
    $('a[href]')
      .toArray()
      .map(element => {
        const href = $(element).attr('href') ?? '';
        const label = normalizeWhitespace($(element).text());
        try {
          const absolute = new URL(href, url).toString();
          return { absolute, label };
        } catch {
          return { absolute: href, label };
        }
      })
      .filter(candidate =>
        /^https?:\/\//i.test(candidate.absolute) &&
        /contact|reservation|réservation|book|about|a-propos|a propos/i.test(`${candidate.absolute} ${candidate.label}`)
      )
      .map(candidate => normalizeUrl(candidate.absolute))
      .filter((link): link is string => Boolean(link))
  );

  const phoneNumbers = dedupeStrings([
    ...Array.from(text.matchAll(/(?:\+33|0)[\s.()-]*\d(?:[\s.()-]*\d){8}/g)).map(match => match[0]),
    ...$('a[href^="tel:"]')
      .toArray()
      .map(element => ($(element).attr('href') ?? '').replace(/^tel:/i, ''))
  ]);

  logger.info(
    `  Contact probe ${getDomain(url) ?? url}: ${emails.length} emails, ${socialLinks.length} sociaux, ${websiteCandidates.length} sites`
  );

  return { emails, socialLinks, phoneNumbers, websiteCandidates, contactPageCandidates };
}

function buildFallbackContact(lead: LeadRaw): LeadContact {
  if (lead.phone) {
    return {
      email: null,
      channel: 'phone',
      confidence: 'medium',
      sourceUrl: lead.sourceUrl,
      fallbackChannels: dedupeStrings([lead.phone, lead.websiteUrl, ...lead.socialLinks]),
      discoveredWebsite: lead.websiteUrl
    };
  }

  if (lead.websiteUrl) {
    return {
      email: null,
      channel: 'website',
      confidence: 'low',
      sourceUrl: lead.websiteUrl,
      fallbackChannels: dedupeStrings([lead.websiteUrl, ...lead.socialLinks]),
      discoveredWebsite: lead.websiteUrl
    };
  }

  if (lead.socialLinks.length > 0) {
    return {
      email: null,
      channel: 'social',
      confidence: 'low',
      sourceUrl: lead.socialLinks[0],
      fallbackChannels: lead.socialLinks,
      discoveredWebsite: null
    };
  }

  return {
    email: null,
    channel: 'none',
    confidence: 'none',
    sourceUrl: null,
    fallbackChannels: [],
    discoveredWebsite: null
  };
}

function isBadMailbox(email: string): boolean {
  const normalized = email.toLowerCase();
  const domain = normalized.split('@')[1] ?? '';
  return (
    /(sentry|wixpress|noreply|no-reply|donotreply|privacy|rgpd|gdpr)/i.test(normalized) ||
    /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(normalized) ||
    PLACEHOLDER_EMAIL_DOMAINS.includes(domain) ||
    /^(online@www\.aaa\.com|flags@\d+x\.(png|jpg|jpeg|webp|gif|svg)|nom@domain\.com)$/i.test(normalized)
  );
}

function tokenizeBusinessIdentity(lead: LeadRaw, preferredWebsite: string | null): string[] {
  const fromName = lead.businessName
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(token => token.length >= 3);

  const fromUrls = dedupeStrings([
    preferredWebsite,
    lead.websiteUrl,
    ...lead.socialLinks
  ])
    .flatMap(url => {
      try {
        const parsed = new URL(url);
        return `${parsed.hostname} ${parsed.pathname}`
          .toLowerCase()
          .split(/[^a-z0-9]+/i)
          .filter(token => token.length >= 3);
      } catch {
        return [];
      }
    });

  return dedupeStrings([...fromName, ...fromUrls]).filter(token =>
    !['www', 'com', 'net', 'linktr', 'instagram', 'facebook', 'restaurant', 'lyon'].includes(token)
  );
}

function isPlausibleLeadEmail(candidate: EmailCandidate, lead: LeadRaw, preferredWebsite: string | null): boolean {
  const email = candidate.email.toLowerCase();
  const [localPart, emailDomain = ''] = email.split('@');
  if (isBadMailbox(email)) return false;

  const sourceDomain = getDomain(candidate.sourceUrl) ?? '';
  const preferredDomain = getDomain(preferredWebsite) ?? '';
  const identityTokens = tokenizeBusinessIdentity(lead, preferredWebsite);
  const identityMatch = identityTokens.some(token => localPart.includes(token) || emailDomain.includes(token));
  const sourceIsSocial = candidate.origin === 'social' || /linktr\.ee|instagram\.com|facebook\.com/i.test(candidate.sourceUrl);
  const sourceIsWebsite = candidate.origin === 'website' || isLikelyBusinessWebsite(candidate.sourceUrl);
  const isWebmail = COMMON_WEBMAIL_DOMAINS.includes(emailDomain);

  if (preferredDomain && emailDomain === preferredDomain) return true;
  if (sourceDomain && emailDomain === sourceDomain) return true;
  if (sourceIsWebsite && identityMatch) return true;
  if (sourceIsSocial && isWebmail && identityMatch) return true;
  if (!sourceIsSocial && isWebmail && identityMatch) return true;
  if (isWebmail && /^(contact|bonjour|hello|info|reservation|resa)/i.test(localPart) && identityMatch) return true;

  return false;
}

function scoreEmailCandidate(candidate: EmailCandidate, preferredWebsite: string | null): number {
  let score = 0;
  const email = candidate.email.toLowerCase();
  const emailDomain = email.split('@')[1] ?? '';
  const sourceDomain = getDomain(candidate.sourceUrl) ?? '';
  const preferredDomain = getDomain(preferredWebsite);

  if (candidate.confidence === 'high') score += 40;
  else if (candidate.confidence === 'medium') score += 24;
  else score += 12;

  if (preferredDomain && emailDomain === preferredDomain) score += 45;
  if (sourceDomain && emailDomain === sourceDomain) score += 20;
  if (isLikelyBusinessWebsite(candidate.sourceUrl)) score += 12;
  if (candidate.origin === 'website') score += 12;
  if (candidate.origin === 'social') score += 6;
  if (/^(contact|hello|bonjour|salut|info|reservation|resa|book|events?)@/i.test(email)) score += 10;
  if (/^(admin|support|privacy|legal|rgpd|gdpr|jobs?)@/i.test(email)) score -= 18;
  if (!isLikelyBusinessWebsite(candidate.sourceUrl) && candidate.origin !== 'social') score -= 20;
  if (isBadMailbox(email)) score -= 50;

  return score;
}

export function selectBestEmailCandidate(
  candidates: EmailCandidate[],
  preferredWebsite: string | null,
  lead?: LeadRaw
): EmailCandidate | null {
  const filtered = candidates.filter(candidate =>
    !isBadMailbox(candidate.email) && (lead ? isPlausibleLeadEmail(candidate, lead, preferredWebsite) : true)
  );
  if (filtered.length === 0) return null;

  return [...filtered].sort((left, right) => {
    const scoreDiff = scoreEmailCandidate(right, preferredWebsite) - scoreEmailCandidate(left, preferredWebsite);
    if (scoreDiff !== 0) return scoreDiff;
    return left.email.localeCompare(right.email);
  })[0] ?? null;
}

export function selectBestWebsiteCandidate(candidates: string[], lead: LeadRaw): string | null {
  const normalized = dedupeStrings(candidates.map(candidate => normalizeUrl(candidate)));
  if (normalized.length === 0) return null;

  const nameTokens = dedupeStrings(
    lead.businessName
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter(token => token.length >= 3)
  );

  const scored = normalized.map(candidate => {
    const domain = getDomain(candidate) ?? '';
    let score = 0;
    if (isLikelyBusinessWebsite(candidate)) score += 60;
    if (/\/contact|\/reservation|\/book/i.test(candidate)) score += 5;
    if (nameTokens.some(token => domain.includes(token))) score += 20;
    if (/linktr\.ee|instagram\.com|facebook\.com/i.test(candidate)) score -= 50;
    return { candidate, score };
  });

  return scored.sort((left, right) => right.score - left.score)[0]?.candidate ?? null;
}

export async function enrichLeadContact(
  lead: LeadRaw,
  brightDataApiToken: string | null
): Promise<{ contact: LeadContact; socialLinks: string[]; websiteUrl: string | null; discoveredWebsiteUrls: string[] }> {
  const probes: ContactProbe[] = [];
  const enqueueProbe = (url: string | null | undefined, origin: ContactProbe['origin']): void => {
    const normalized = normalizeUrl(url ?? null);
    if (!normalized) return;
    probes.push({ url: normalized, origin });
  };

  if (lead.websiteUrl) {
    enqueueProbe(lead.websiteUrl, isSocialUrl(lead.websiteUrl) ? 'social' : 'website');
  }

  for (const socialLink of lead.socialLinks) {
    enqueueProbe(socialLink, 'social');
  }

  if (brightDataApiToken) {
    const searchPlans: Array<{ query: string; origin: ContactProbe['origin'] }> = [
      {
        query: [`"${lead.businessName}"`, lead.address ? `"${lead.address}"` : null, 'contact']
          .filter(Boolean)
          .join(' '),
        origin: 'search'
      },
      {
        query: [`"${lead.businessName}"`, lead.city, 'site:instagram.com OR site:facebook.com']
          .filter(Boolean)
          .join(' '),
        origin: 'social'
      },
      {
        query: [`"${lead.businessName}"`, lead.city, 'site:pagesjaunes.fr OR site:pappers.fr OR site:societe.com']
          .filter(Boolean)
          .join(' '),
        origin: 'directory'
      }
    ];

    for (const searchPlan of searchPlans) {
      try {
        const results = await searchWeb(searchPlan.query, brightDataApiToken, 1);
        for (const result of results.slice(0, 4)) {
          if (result.url.includes('google.com/maps')) continue;
          enqueueProbe(result.url, searchPlan.origin);
        }
      } catch (error) {
        logger.warn(
          `Recherche contact impossible pour ${lead.businessName} (${searchPlan.origin}): ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  const probePriority: Record<ContactProbe['origin'], number> = {
    website: 0,
    social: 1,
    search: 2,
    directory: 3
  };
  const uniqueProbes = Array.from(new Map(probes.map(probe => [probe.url, probe])).values())
    .sort((left, right) => probePriority[left.origin] - probePriority[right.origin])
    .slice(0, 6);

  const emailCandidates: EmailCandidate[] = [];
  const discoveredSocials = [...lead.socialLinks];
  const discoveredWebsites = [...lead.discoveredWebsiteUrls];
  const contactPageCandidates: string[] = [];

  for (const probe of uniqueProbes) {
    const html = await fetchHtmlPlaywright(probe.url, { timeoutMs: 20_000 });
    if (!html) continue;

    const signals = extractContactSignalsFromHtml(html, probe.url);
    for (const email of signals.emails) {
      emailCandidates.push({
        email,
        confidence: probe.origin === 'website' ? 'high' : probe.origin === 'social' ? 'medium' : 'low',
        sourceUrl: probe.url,
        origin: probe.origin
      });
    }
    discoveredSocials.push(...signals.socialLinks);
    discoveredWebsites.push(...signals.websiteCandidates);
    contactPageCandidates.push(...signals.contactPageCandidates);

    if (!lead.phone && signals.phoneNumbers.length > 0) {
      lead.phone = signals.phoneNumbers[0] ?? null;
    }
  }

  const normalizedWebsiteCandidates = dedupeStrings(discoveredWebsites.map(candidate => normalizeUrl(candidate)));
  const selectedWebsite = normalizeUrl(lead.websiteUrl) ?? selectBestWebsiteCandidate(normalizedWebsiteCandidates, lead) ?? null;

  const followUpProbeUrls = dedupeStrings([
    selectedWebsite ? `${selectedWebsite}/contact` : null,
    selectedWebsite ? `${selectedWebsite}/nous-contacter` : null,
    selectedWebsite ? `${selectedWebsite}/contactez-nous` : null,
    ...contactPageCandidates
  ])
    .map(candidate => normalizeUrl(candidate))
    .filter((candidate): candidate is string => Boolean(candidate))
    .filter(candidate => {
      const candidateDomain = getDomain(candidate);
      const selectedDomain = getDomain(selectedWebsite);
      return Boolean(candidateDomain && selectedDomain && candidateDomain === selectedDomain);
    })
    .filter(candidate => !uniqueProbes.some(probe => probe.url === candidate))
    .slice(0, 3);

  for (const followUpUrl of followUpProbeUrls) {
    const html = await fetchHtmlPlaywright(followUpUrl, { timeoutMs: 20_000 });
    if (!html) continue;
    const signals = extractContactSignalsFromHtml(html, followUpUrl);
    for (const email of signals.emails) {
      emailCandidates.push({
        email,
        confidence: 'high',
        sourceUrl: followUpUrl,
        origin: 'website'
      });
    }
    discoveredSocials.push(...signals.socialLinks);
    discoveredWebsites.push(...signals.websiteCandidates);
    if (!lead.phone && signals.phoneNumbers.length > 0) {
      lead.phone = signals.phoneNumbers[0] ?? null;
    }
  }

  const dedupedEmailCandidates = Array.from(
    new Map(
      emailCandidates.map(candidate => [
        `${candidate.email.toLowerCase()}|${candidate.sourceUrl}`,
        { ...candidate, email: candidate.email.toLowerCase() }
      ])
    ).values()
  );

  const selectedCandidate = selectBestEmailCandidate(dedupedEmailCandidates, selectedWebsite, lead);
  if (selectedCandidate) {
    return {
      contact: {
        email: selectedCandidate.email,
        channel: 'email',
        confidence: selectedCandidate.confidence,
        sourceUrl: selectedCandidate.sourceUrl ?? lead.websiteUrl,
        fallbackChannels: dedupeStrings([lead.phone, selectedWebsite, ...discoveredSocials]),
        discoveredWebsite: selectedWebsite
      },
      socialLinks: dedupeStrings(discoveredSocials),
      websiteUrl: selectedWebsite,
      discoveredWebsiteUrls: normalizedWebsiteCandidates
    };
  }

  return {
    contact: {
      ...buildFallbackContact({ ...lead, websiteUrl: selectedWebsite }),
      fallbackChannels: dedupeStrings([lead.phone, selectedWebsite, ...discoveredSocials]),
      discoveredWebsite: selectedWebsite
    },
    socialLinks: dedupeStrings(discoveredSocials),
    websiteUrl: selectedWebsite,
    discoveredWebsiteUrls: normalizedWebsiteCandidates
  };
}
