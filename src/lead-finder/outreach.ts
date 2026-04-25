import type { LeadQualified, OutreachDraft } from '../types/lead-finder.js';
import { getEnv, getEnvOptional, validateEnv, ENV_REQUIREMENTS } from '../utils/env.js';
import { isoNow } from './utils.js';

export function buildOutreachDraft(lead: Pick<LeadQualified, 'leadId' | 'businessName' | 'category' | 'city' | 'contact' | 'previewUrl'>): OutreachDraft {
  const previewUrl = lead.previewUrl;
  const recipientEmail = lead.contact.email;
  const readyToSend = Boolean(recipientEmail && previewUrl);
  const skippedReason = !recipientEmail
    ? 'email de contact manquant'
    : !previewUrl
      ? 'preview du site manquante'
      : null;

  const subject = `${lead.businessName}: j'ai préparé une démo de site pour vous`;
  const textBody = [
    `Bonjour,`,
    ``,
    `Je me suis permis de préparer une démo de site pour ${lead.businessName}, afin de montrer ce qu'une présence web plus premium pourrait donner pour votre adresse à ${lead.city}.`,
    ``,
    previewUrl ? `Preview: ${previewUrl}` : `La preview sera envoyée dès qu'elle est prête.`,
    ``,
    `L'idée: mettre en avant vos horaires, votre localisation, vos signaux de confiance et une expérience mobile beaucoup plus claire pour les futurs clients.`,
    ``,
    `Si le sujet vous intéresse, je peux vous montrer comment transformer cette démo en vrai site opérationnel très rapidement.`,
    ``,
    `Bien à vous`
  ].join('\n');

  const htmlBody = `<p>Bonjour,</p>
<p>Je me suis permis de préparer une démo de site pour <strong>${lead.businessName}</strong>, afin de montrer ce qu'une présence web plus premium pourrait donner pour votre adresse à ${lead.city}.</p>
<p>${previewUrl ? `Preview: <a href="${previewUrl}">${previewUrl}</a>` : `La preview sera envoyée dès qu'elle est prête.`}</p>
<p>L'idée: mettre en avant vos horaires, votre localisation, vos signaux de confiance et une expérience mobile beaucoup plus claire pour les futurs clients.</p>
<p>Si le sujet vous intéresse, je peux vous montrer comment transformer cette démo en vrai site opérationnel très rapidement.</p>
<p>Bien à vous</p>`;

  return {
    leadId: lead.leadId,
    recipientEmail,
    subject,
    textBody,
    htmlBody,
    readyToSend,
    skippedReason,
    previewUrl
  };
}

export async function sendOutreachEmail(draft: OutreachDraft): Promise<{ sentAt: string; providerId: string }> {
  if (!draft.readyToSend || !draft.recipientEmail) {
    throw new Error(draft.skippedReason ?? 'Draft non envoyable');
  }

  validateEnv(ENV_REQUIREMENTS.outreach);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getEnv('resendApiKey')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: getEnv('outreachFromEmail'),
      to: [draft.recipientEmail],
      reply_to: getEnvOptional('outreachReplyTo') || undefined,
      subject: draft.subject,
      html: draft.htmlBody,
      text: draft.textBody
    })
  });

  if (!response.ok) {
    throw new Error(`Resend failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as { id?: string };
  return {
    sentAt: isoNow(),
    providerId: payload.id ?? 'unknown'
  };
}
