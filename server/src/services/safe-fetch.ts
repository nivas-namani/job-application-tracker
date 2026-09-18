import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { HttpError } from '../http.js';

const MAX_REDIRECTS = 4;
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 9_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; TrackifyBot/2.0; +https://github.com/trackify)';

/** Blocks loopback, link-local, private, carrier-grade NAT, and unique-local ranges. */
export function isPrivateAddress(address: string): boolean {
  if (address.includes(':')) {
    const value = address.toLowerCase();
    if (value === '::' || value === '::1') return true;
    if (value.startsWith('fe80') || value.startsWith('fc') || value.startsWith('fd')) return true;
    const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const [a, b] = address.split('.').map(Number);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return a >= 224;
}

async function assertPublicHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new HttpError(400, 'That link points to a private address.');
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => {
    throw new HttpError(400, 'We could not resolve that link.');
  });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new HttpError(400, 'That link points to a private address.');
  }
}

/** Fetches a public web page as text, following redirects while re-checking every hop. */
export async function fetchPublicPage(rawUrl: string) {
  let current: URL;
  try { current = new URL(rawUrl); } catch { throw new HttpError(400, 'Use a complete URL, such as https://example.com/jobs/123.'); }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (current.protocol !== 'http:' && current.protocol !== 'https:') throw new HttpError(400, 'Only http and https links can be read.');
    await assertPublicHost(current.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml', 'accept-language': 'en-US,en;q=0.9' }
      });
    } catch {
      throw new HttpError(502, 'That job page did not respond in time.');
    } finally {
      clearTimeout(timer);
    }

    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) { current = new URL(location, current); continue; }
    if (response.status === 403 || response.status === 401 || response.status === 429) {
      throw new HttpError(422, 'This site blocks automatic reading. Paste the details manually.');
    }
    if (!response.ok) throw new HttpError(502, `That job page returned ${response.status}.`);

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType && !/text\/html|application\/xhtml|text\/plain|application\/json/.test(contentType)) {
      throw new HttpError(422, 'That link is not a readable job page.');
    }
    const buffer = await response.arrayBuffer();
    return { url: current, html: Buffer.from(buffer.byteLength > MAX_BYTES ? buffer.slice(0, MAX_BYTES) : buffer).toString('utf8') };
  }
  throw new HttpError(502, 'That link redirected too many times.');
}
