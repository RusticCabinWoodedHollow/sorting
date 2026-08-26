// Smoke-тест опубликованной ветки build (корень репо = корень сайта).
// Проверяет:
//  1) все файлы на месте и не пусты
//  2) index.html / registerSW.js используют ОТНОСИТЕЛЬНЫЕ пути (подпуть хостинга)
//  3) manifest PWA с относительными scope/start_url и реальными иконками
//  4) sw.js (workbox) прекаширует ВСЕ файлы ветки — билд консистентный
//  5) файлы с LF-окончаниями (стабильность ревизий workbox между ОС)
//  6) статический сервер отдаёт 200 на все ресурсы (как это делает GitHub Pages)
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = __dirname;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('ok:', msg);
}

// 1. Файлы на месте (бандлы ищем динамически — имена содержат хэш Vite)
const assets = fs.readdirSync(path.join(ROOT, 'assets'));
const jsFiles = assets.filter((f) => f.endsWith('.js'));
const cssFiles = assets.filter((f) => f.endsWith('.css'));
assert(jsFiles.length === 1, `exactly one JS bundle in assets/ (found ${jsFiles.length})`);
assert(cssFiles.length === 1, `exactly one CSS bundle in assets/ (found ${cssFiles.length})`);

const fixedFiles = [
  'index.html',
  'sw.js',
  'workbox-9c191d2f.js',
  'registerSW.js',
  'manifest.webmanifest',
  'vite.svg',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'masked-icon-512.png',
];
for (const f of [...fixedFiles, `assets/${jsFiles[0]}`, `assets/${cssFiles[0]}`]) {
  assert(fs.existsSync(path.join(ROOT, f)), `file exists: ${f}`);
  assert(fs.statSync(path.join(ROOT, f)).size > 0, `file non-empty: ${f}`);
}

// 2. Относительные пути в index.html
const html = read('index.html');
assert(html.includes('<div id="root">'), 'html has #root');
assert(html.includes(`./assets/${jsFiles[0]}`), 'html references relative JS');
assert(html.includes(`./assets/${cssFiles[0]}`), 'html references relative CSS');
assert(html.includes('./registerSW.js'), 'html references relative registerSW.js');
assert(html.includes('./manifest.webmanifest'), 'html references relative manifest');
assert(!/src="\/assets\//.test(html), 'html has no absolute /assets/ src');
assert(!/href="\/assets\//.test(html), 'html has no absolute /assets/ href');
assert(!/src="\/registerSW\.js"/.test(html), 'html has no absolute /registerSW.js');

// registerSW: SW должен регистрироваться В ПОДПАПКЕ (scope ./), а не на корне домена
const reg = read('registerSW.js');
assert(reg.includes("navigator.serviceWorker.register"), 'registerSW.js registers SW');
assert(reg.includes("'./sw.js'"), 'registerSW uses relative ./sw.js');
assert(reg.includes("scope: './'"), 'registerSW scope is relative (./)');
assert(!reg.includes("register('/sw.js'"), 'registerSW does NOT use absolute /sw.js');

// 3. Manifest PWA
const man = JSON.parse(read('manifest.webmanifest'));
assert(man.scope === './', `manifest.scope is './' (got ${man.scope})`);
assert(man.start_url === './', `manifest.start_url is './' (got ${man.start_url})`);
const iconNames = (man.icons || []).map((i) => i.src);
for (const i of iconNames) {
  assert(fs.existsSync(path.join(ROOT, i)), `manifest icon exists: ${i}`);
}
assert(iconNames.some((s) => s.includes('192')), 'manifest has 192 icon');
assert(iconNames.some((s) => s.includes('512')), 'manifest has 512 icon');

// 4. sw.js прекаширует ВСЕ публикуемые файлы -> билд и SW сгенерированы вместе.
// (sw.js и workbox-*.js в precache НЕ бывают штатно в generateSW-режиме:
//  они грузятся при самом запуске/обновлении SW, а не из кэша)
const sw = read('sw.js');
assert(sw.includes('precacheAndRoute'), 'sw.js uses workbox precacheAndRoute');
for (const f of fixedFiles.filter((f) => f !== 'sw.js' && !f.startsWith('workbox-'))
  .concat([`assets/${jsFiles[0]}`, `assets/${cssFiles[0]}`])) {
  assert(sw.includes(`url:"${f}"`), `sw.js precaches ${f}`);
}

// 5. Маркеры содержимого бандлов
const js = read(`assets/${jsFiles[0]}`);
assert(js.length > 50000, 'JS bundle is a real bundle (>50KB)');
assert(js.includes('react'), 'JS bundle contains React');
assert(js.includes('liquid-red'), 'JS bundle contains game class names');
assert(js.includes('Новая игра'), 'JS bundle contains game strings');
const css = read(`assets/${cssFiles[0]}`);
assert(css.includes('game-container'), 'CSS has .game-container');
assert(css.includes('.tube'), 'CSS has .tube');

// 6. LF-окончания в текстовых файлах (CRLF ломает стабильность ревизий workbox)
for (const f of ['index.html', 'registerSW.js', 'sw.js', 'manifest.webmanifest']) {
  const raw = fs.readFileSync(path.join(ROOT, f));
  assert(!raw.includes('\r'), `${f} has LF line endings (no CR)`);
}

// 7. HTTP-тест: отдаём корень репо, как это делает GitHub Pages для ветки build
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

async function testServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const abs = path.join(ROOT, filePath);
    if (!abs.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(abs, (err, data) => {
      if (err) { res.writeHead(404); res.end('404'); return; }
      const ext = path.extname(abs).toLowerCase();
      const types = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json',
        '.webmanifest': 'application/manifest+json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.ico': 'image/x-icon',
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(4199, r));
  console.log('ok: static server up on :4199 (serving repo root, like the host does)');

  const endpoints = [
    '/',
    `./assets/${jsFiles[0]}`,
    `./assets/${cssFiles[0]}`,
    '/sw.js',
    '/workbox-9c191d2f.js',
    '/registerSW.js',
    '/manifest.webmanifest',
    '/vite.svg',
    '/pwa-192x192.png',
    '/pwa-512x512.png',
    '/masked-icon-512.png',
  ];
  for (const ep of endpoints) {
    const r = await httpGet('http://localhost:4199' + (ep.startsWith('./') ? '/' + ep.slice(2) : ep));
    assert(r.status === 200, `GET ${ep} -> 200 (got ${r.status})`);
    assert(r.body.length > 0, `GET ${ep} body non-empty`);
  }

  const home = await httpGet('http://localhost:4199/');
  assert(home.body.includes(`./assets/${jsFiles[0]}`), 'served HTML uses relative JS path');
  assert(!/src="\/assets\//.test(home.body), 'served HTML has no absolute /assets/ paths');

  server.close();
  console.log('\nALL TESTS PASSED');
  process.exit(0);
}

testServer().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
