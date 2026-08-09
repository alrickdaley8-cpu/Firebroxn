#!/usr/bin/env node
/* Firebroxn MICROBOTS build — dependency-free.
 * Stamps build metadata, cache-busts asset URLs, copies the static site to
 * dist/, writes build-info.json and a 404.html fallback for Pages hosting.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const pkg = require(path.join(root, 'package.json'));

let sha = process.env.GITHUB_SHA || '';
if (!sha) {
  try { sha = cp.execSync('git rev-parse HEAD', { cwd: root }).toString().trim(); }
  catch (e) { sha = 'local'; }
}
const short = sha.slice(0, 7);
const builtAt = new Date().toISOString();

const meta =
  `<meta name="build:version" content="${pkg.version}" />\n` +
  `<meta name="build:commit" content="${short}" />\n` +
  `<meta name="build:date" content="${builtAt}" />`;

/* clean dist */
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

/* copy with substitutions */
function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  let data = fs.readFileSync(src);
  if (src.endsWith('index.html')) {
    let html = data.toString('utf8');
    html = html.replace('<!--BUILD_META-->', meta);
    html = html.replaceAll('__BUILD__', short);
    fs.writeFileSync(dst, html);
    return;
  }
  fs.writeFileSync(dst, data);
}
function copyDir(srcDir, dstDir) {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(dstDir, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else copyFile(s, d);
  }
}

copyFile(path.join(root, 'index.html'), path.join(dist, 'index.html'));
copyDir(path.join(root, 'css'), path.join(dist, 'css'));
copyDir(path.join(root, 'js'), path.join(dist, 'js'));
copyDir(path.join(root, 'assets'), path.join(dist, 'assets'));

/* Pages fallback + metadata */
fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
fs.writeFileSync(
  path.join(dist, 'build-info.json'),
  JSON.stringify({ name: pkg.name, version: pkg.version, commit: sha, builtAt }, null, 2) + '\n'
);

let files = 0;
(function count(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) count(path.join(d, e.name));
    else files++;
  }
})(dist);

console.log(`✔ microbots v${pkg.version} @ ${short}`);
console.log(`  built ${builtAt}`);
console.log(`  dist/ ready — ${files} files`);
