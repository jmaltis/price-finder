import { AuchanClient, type AuchanSession } from './client.js';

const BASE_URL = 'https://www.auchan.fr';

export async function login(client: AuchanClient, email: string, password: string): Promise<AuchanSession> {
  // Étape 1 : récupérer la page d'accueil pour initier la session
  const initRes = await fetch(`${BASE_URL}/`, {
    redirect: 'manual',
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' },
  });
  const cookies: Record<string, string> = {};
  const setCookies = initRes.headers.getSetCookie?.() ?? [];
  Object.assign(cookies, client.parseCookies(setCookies));

  // Étape 2 : récupérer l'URL de login Keycloak
  const loginPageRes = await fetch(`${BASE_URL}/auth/login`, {
    redirect: 'manual',
    headers: {
      cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    },
  });
  Object.assign(cookies, client.parseCookies(loginPageRes.headers.getSetCookie?.() ?? []));

  // Suivre les redirects jusqu'au formulaire Keycloak
  let keycloakUrl = loginPageRes.headers.get('location') ?? '';
  let keycloakCookies: Record<string, string> = {};
  let actionUrl = '';

  for (let i = 0; i < 5 && keycloakUrl; i++) {
    const res = await fetch(keycloakUrl, {
      redirect: 'manual',
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' },
    });
    Object.assign(keycloakCookies, client.parseCookies(res.headers.getSetCookie?.() ?? []));
    const next = res.headers.get('location');
    if (!next) {
      // On est sur le formulaire HTML
      const html = await res.text();
      const match = html.match(/action="([^"]+)"/);
      actionUrl = match?.[1]?.replace(/&amp;/g, '&') ?? '';
      break;
    }
    keycloakUrl = next.startsWith('http') ? next : new URL(next, keycloakUrl).href;
  }

  if (!actionUrl) throw new Error('Impossible de trouver le formulaire de login Keycloak');

  // Étape 3 : soumettre les credentials
  const formData = new URLSearchParams({ username: email, password, credentialId: '' });
  const authRes = await fetch(actionUrl, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: Object.entries(keycloakCookies).map(([k, v]) => `${k}=${v}`).join('; '),
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    },
    body: formData.toString(),
  });

  Object.assign(keycloakCookies, client.parseCookies(authRes.headers.getSetCookie?.() ?? []));
  let redirectUrl = authRes.headers.get('location') ?? '';
  if (!redirectUrl) throw new Error('Login échoué — vérifiez email/password');

  // Étape 4 : suivre les redirects retour vers auchan.fr
  for (let i = 0; i < 5 && redirectUrl; i++) {
    const isAuchan = redirectUrl.includes('auchan.fr') && !redirectUrl.includes('compte.auchan.fr');
    const res = await fetch(redirectUrl, {
      redirect: 'manual',
      headers: {
        cookie: isAuchan
          ? Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
          : Object.entries(keycloakCookies).map(([k, v]) => `${k}=${v}`).join('; '),
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
      },
    });
    if (isAuchan) Object.assign(cookies, client.parseCookies(res.headers.getSetCookie?.() ?? []));
    const next = res.headers.get('location');
    if (!next) break;
    redirectUrl = next.startsWith('http') ? next : new URL(next, redirectUrl).href;
  }

  // Étape 5 : récupérer consentId et cartId
  const consentId = cookies['lark-consentId'] ?? '';
  const cartCookie = cookies['lark-cart'] ?? '';

  const userInfoRes = await fetch(`${BASE_URL}/auth/user-info`, {
    headers: {
      cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
      accept: 'application/json',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    },
  });
  const userInfo = await userInfoRes.json() as { authenticated?: boolean };
  if (!userInfo.authenticated) throw new Error('Session non authentifiée après login');

  // Récupérer le cartId depuis l'API
  const cartRes = await fetch(`${BASE_URL}/cart?consentId=${consentId}`, {
    headers: {
      cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
      accept: 'application/json',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    },
  });
  const cartData = await cartRes.json() as { cart?: { cart?: { id?: string } } };
  const cartId = cartData?.cart?.cart?.id ?? cartCookie;

  const session: AuchanSession = { cookies, consentId, cartId };
  client.setSession(session);
  return session;
}
