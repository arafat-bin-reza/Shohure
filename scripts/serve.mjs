// Zero-dependency static server for local development.
// Run: npm run serve   (then open http://localhost:5173/)
// Needed because browsers block fetch() over file:// — the JSON data won't load
// if you double-click index.html.

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { createGzip } from 'node:zlib';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT ?? process.argv[2] ?? 5173);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json',
};
// gzip text like GitHub Pages does, so local Lighthouse numbers are representative
const COMPRESSIBLE = /^(text\/|image\/svg|application\/(json|xml|manifest))/;

createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(root, path));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  let st;
  try { st = statSync(file); } catch { res.writeHead(404, { 'content-type': 'text/plain' }).end('404 ' + path); return; }
  if (st.isDirectory()) { res.writeHead(301, { location: path + '/' }).end(); return; }
  const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  const gzip = COMPRESSIBLE.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  res.writeHead(200, {
    'content-type': type,
    'cache-control': 'no-cache',
    ...(gzip ? { 'content-encoding': 'gzip', vary: 'accept-encoding' } : { 'content-length': st.size }),
  });
  const stream = createReadStream(file);
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
}).listen(port, () => console.log(`serving ${root} at http://localhost:${port}/`));
