import { load } from 'cheerio';

export interface AuchanSession {
  cookies: Record<string, string>;
  consentId: string;
  cartId: string;
}

export interface AuchanProduct {
  productId: string;
  offerId: string;
  sellerId: string;
  sellerType: string;
  name?: string;
  price?: string;
  slug?: string;
}

const BASE_URL = 'https://www.auchan.fr';
const SELLER_ID = 'c37b5c6c-e257-4a77-8592-ebeb0d129e88';

export class AuchanClient {
  private session: AuchanSession | null = null;

  constructor(_email: string, _password: string) {}

  private cookieHeader(): string {
    if (!this.session) throw new Error('Non authentifié');
    return Object.entries(this.session.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  private async get(path: string, headers: Record<string, string> = {}): Promise<Response> {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    return fetch(url, {
      headers: {
        cookie: this.cookieHeader(),
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
        accept: 'text/html,application/json',
        ...headers,
      },
    });
  }

  async getJson(path: string): Promise<unknown> {
    const r = await this.get(path, { accept: 'application/json' });
    return r.json();
  }

  async getHtml(path: string, extraHeaders: Record<string, string> = {}): Promise<ReturnType<typeof load>> {
    const r = await this.get(path, extraHeaders);
    const html = await r.text();
    return load(html);
  }

  async post(path: string, body: unknown): Promise<Response> {
    if (!this.session) throw new Error('Non authentifié');
    const xsrf = this.session.cookies['XSRF-TOKEN'] ?? '';
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        cookie: this.cookieHeader(),
        'content-type': 'application/json',
        accept: 'application/json',
        'x-requested-with': 'XMLHttpRequest',
        'x-xsrf-token': xsrf,
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(body),
    });
  }

  setSession(session: AuchanSession): void {
    this.session = session;
  }

  getSession(): AuchanSession | null {
    return this.session;
  }

  get defaultSellerId(): string {
    return SELLER_ID;
  }

  parseCookies(setCookieHeaders: string[]): Record<string, string> {
    const cookies: Record<string, string> = {};
    for (const header of setCookieHeaders) {
      const [pair] = header.split(';');
      const idx = pair.indexOf('=');
      if (idx > 0) {
        cookies[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
      }
    }
    return cookies;
  }
}
