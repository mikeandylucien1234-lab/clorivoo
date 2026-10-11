// Minimal dependency-free static file server for the Playwright suite.
//
// Why this exists: the prototype's screens are loaded via
// `<script type="text/babel" src="screen-foo.jsx">` tags, and
// babel-standalone fetches each `src` with an internal XHR/fetch to
// transform it. Under `file://` (the suite's original baseURL),
// Chromium blocks that fetch as cross-origin, so every script silently
// fails to load and `window.__navigate` (defined last, in app.jsx)
// never exists — tests fail with "window.__navigate is not a function"
// regardless of anything in the app itself. Serving the same files over
// plain HTTP removes the file:// restriction with no browser flags and
// no new dependency (uses only Node's built-in http/fs/path).
//
// Run: node static-server.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..'); // repo root — Clorivo.html + *.jsx live here
const PORT = Number(process.argv[2] || process.env.STATIC_SERVER_PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.jsx': 'text/babel; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const relPath = urlPath === '/' ? '/Clorivo.html' : urlPath;
  const filePath = path.join(ROOT, relPath);

  // Never serve outside the repo root.
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + relPath);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`[static-server] serving ${ROOT} at http://localhost:${PORT}/`);
});
