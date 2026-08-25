// Быстрый smoke-тест собранного dist/
// 1) Проверяем, что все файлы на месте и не пусты
// 2) Проверяем, что index.html ссылается на относительные пути (работает с подкаталога)
// 3) Проверяем, что JS/CSS/sw.js содержат ожидаемые маркеры
// 4) Поднимаем vite preview и проверяем HTTP 200 на всех ресурсах
const fs = require('fs');
const path = require('path');
const http = require('http');

const DIST = path.join(__dirname, 'dist');

function read(rel) {
  return fs.readFileSync(path.join(DIST, rel), 'utf8');
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('ok:', msg);
}

// 1. Файлы на месте
const files = [
  'index.html',
  'assets/index-BWy7h8Dn.js',
  'assets/index-DKPoAn0R.css',
  'sw.js',
  'workbox-9c191d2f.js',
  'registerSW.js',
  'manifest.webmanifest',
  'vite.svg',
];
for (const f of files) {
  assert(fs.existsSync(path.join(DIST, f)), `file exists: ${f}`);
  assert(fs.statSync(path.join(DIST, f)).size > 0, `file non-empty: ${f}`);
}

// 2. index.html: относительные пути
const html = read('index.html');
assert(html.includes('<div id="root">'), 'html has #root');
assert(html.includes('./assets/index-BWy7h8Dn.js'), 'html references relative JS');
assert(html.includes('./assets/index-DKPoAn0R.css'), 'html references relative CSS');
assert(html.includes('./registerSW.js'), 'html references relative registerSW.js');
assert(html.includes('./manifest.webmanifest'), 'html references relative manifest');
assert(!/src="\/assets\//.test(html), 'html does NOT have absolute /assets/ paths');
assert(!/href="\/assets\//.test(html), 'html does NOT have absolute /assets/ hrefs');
assert(!/src="\/registerSW\.js"/.test(html), 'html does NOT have absolute /registerSW.js');

// 3. JS/CSS/sw.js маркеры
const js = read('assets/index-BWy7h8Dn.js');
assert(js.length > 50000, 'JS bundle is a real bundle (>50KB)');
assert(js.includes('react'), 'JS bundle contains React');
assert(js.includes('liquid-red'), 'JS bundle contains game class names');
assert(js.includes('Water Sort') || js.includes('Новая игра'), 'JS bundle contains game strings');

const css = read('assets/index-DKPoAn0R.css');
assert(css.includes('game-container'), 'CSS has .game-container');
assert(css.includes('liquid-red'), 'CSS has .liquid-red');
assert(css.includes('.tube'), 'CSS has .tube');

const sw = read('sw.js');
assert(sw.includes('precacheAndRoute'), 'sw.js uses workbox precacheAndRoute');
assert(sw.includes('assets/index-BWy7h8Dn.js'), 'sw.js precaches the JS bundle');
assert(sw.includes('assets/index-DKPoAn0R.css'), 'sw.js precaches the CSS bundle');

const wb = read('workbox-9c191d2f.js');
assert(wb.includes('cleanupOutdatedCaches'), 'workbox runtime present');

const reg = read('registerSW.js');
assert(reg.includes("navigator.serviceWorker.register"), 'registerSW.js registers SW');

// 4. HTTP-тест через vite preview
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
  const { spawn } = require('child_process');
  const preview = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'preview', '--port', '4199', '--strictPort'], {
    cwd: __dirname,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  // Ждём, пока сервер поднимется
  let up = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const r = await httpGet('http://localhost:4199/');
      if (r.status === 200) { up = true; break; }
    } catch (_) {}
  }
  if (!up) {
    preview.kill();
    console.error('FAIL: vite preview did not start');
    process.exit(1);
  }
  console.log('ok: vite preview is up on :4199');

  const endpoints = [
    '/',
    '/assets/index-BWy7h8Dn.js',
    '/assets/index-DKPoAn0R.css',
    '/sw.js',
    '/workbox-9c191d2f.js',
    '/registerSW.js',
    '/manifest.webmanifest',
    '/vite.svg',
  ];
  for (const ep of endpoints) {
    const r = await httpGet('http://localhost:4199' + ep);
    assert(r.status === 200, `GET ${ep} -> 200 (got ${r.status})`);
    assert(r.body.length > 0, `GET ${ep} body non-empty (${r.body.length} bytes)`);
  }

  // Проверяем, что HTML, который отдаёт сервер, тоже с относительными путями
  const home = await httpGet('http://localhost:4199/');
  assert(home.body.includes('./assets/index-BWy7h8Dn.js'), 'served HTML uses relative JS path');
  assert(!/src="\/assets\//.test(home.body), 'served HTML has no absolute /assets/ paths');

  preview.kill();
  console.log('\nALL TESTS PASSED');
  process.exit(0);
}

testServer().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
