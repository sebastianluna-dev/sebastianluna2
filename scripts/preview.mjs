// `npm run preview`: serves the static part of the Vercel build (.vercel/output/static).
// @astrojs/vercel has no preview entrypoint, so `astro preview` exits. This server mirrors
// .vercel/output/config.json closely enough for layout and performance checks: 308 to the URL
// without a trailing slash, immutable caching under /_astro, directory index and brotli/gzip.
// The chat function (`/api/chat`) is not served here.
//
// Usage: node scripts/preview.mjs [--port 4321]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const ROOT = fileURLToPath(new URL('../.vercel/output/static', import.meta.url));
const portFlag = process.argv.indexOf('--port');
const PORT = Number(portFlag > -1 ? process.argv[portFlag + 1] : (process.env.PORT ?? 4321));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.xml', '.txt', '.svg']);

if (!fs.existsSync(ROOT)) {
  console.error('No build found: run `npm run build` first.');
  process.exit(1);
}

function resolveFile(pathname) {
  for (const candidate of [pathname, path.join(pathname, 'index.html'), `${pathname}.html`]) {
    const file = path.join(ROOT, candidate);
    if (!file.startsWith(ROOT)) return null;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (pathname.length > 1 && pathname.endsWith('/')) {
      res.writeHead(308, { Location: pathname.slice(0, -1) });
      res.end();
      return;
    }
    let status = 200;
    let file = resolveFile(pathname);
    if (!file) {
      status = 404;
      file = resolveFile('/404.html');
      if (!file) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
    }
    const ext = path.extname(file);
    const headers = {
      'content-type': TYPES[ext] ?? 'application/octet-stream',
      'cache-control': pathname.startsWith('/_astro/')
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=0, must-revalidate',
    };
    let body = fs.readFileSync(file);
    const accept = String(req.headers['accept-encoding'] ?? '');
    if (COMPRESSIBLE.has(ext)) {
      headers.vary = 'Accept-Encoding';
      if (accept.includes('br')) {
        body = zlib.brotliCompressSync(body);
        headers['content-encoding'] = 'br';
      } else if (accept.includes('gzip')) {
        body = zlib.gzipSync(body);
        headers['content-encoding'] = 'gzip';
      }
    }
    headers['content-length'] = body.length;
    res.writeHead(status, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  })
  .listen(PORT, () => console.log(`Preview of the build on http://localhost:${PORT}`));
