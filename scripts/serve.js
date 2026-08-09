#!/usr/bin/env node
/* Tiny static dev server (zero dependencies).
 * Usage: npm start            → serves dist/ if it exists, else repo root
 *        PORT=8080 npm start  → custom port
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const base = fs.existsSync(path.join(root, 'dist', 'index.html'))
  ? path.join(root, 'dist')
  : root;
const port = Number(process.env.PORT) || 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(base, p));
  if (!file.startsWith(base)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}).listen(port, '0.0.0.0', () => {
  console.log(`microbots serving ${path.relative(root, base) || '.'} → http://0.0.0.0:${port}`);
});
