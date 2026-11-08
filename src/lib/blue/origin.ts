// Which pages may call the chat. Browsers always send `Origin` on a `fetch` POST, so a
// request from another site is refused here before it can spend the model budget. It does not
// stop a non-browser client (which can send any header); the rate limits do.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export interface OriginContext {
  /** `request.url`: its origin is the deployment that serves the call, Vercel previews included. */
  requestUrl: string;
  /** The production site (`SITE_URL`). */
  siteUrl: string;
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function isAllowed(origin: string, { requestUrl, siteUrl }: OriginContext): boolean {
  if (origin === originOf(siteUrl) || origin === originOf(requestUrl)) return true;
  try {
    const url = new URL(origin);
    return (url.protocol === 'http:' || url.protocol === 'https:') && LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * True when the request comes from the site itself, the deployment that serves it (a preview
 * on `*.vercel.app` included) or a page on localhost. Without `Origin`, only a request the browser
 * marks `Sec-Fetch-Site: same-origin` passes.
 */
export function isAllowedOrigin(headers: Headers, context: OriginContext): boolean {
  const origin = headers.get('origin');
  if (origin !== null) return isAllowed(origin, context);
  return headers.get('sec-fetch-site') === 'same-origin';
}
