// Grava o Short quadro a quadro e envia cada JPEG direto (pipe/stdin) para o FFmpeg.
// Nenhum quadro é salvo em disco. Uso:
//   node short_oxigenio/render.mjs [--parte 0 --partes 8] [--out short_oxigenio/build/video.mp4]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']); return acc; }, []));
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, 'roteiro.json'), 'utf8'));
const FPS = cfg.fps || 30, TOTAL = Math.round(cfg.duracao * FPS);
const partes = +(args.partes || 1), parte = +(args.parte || 0), per = Math.ceil(TOTAL / partes);
const f0 = parte * per, f1 = Math.min(TOTAL, (parte + 1) * per);
const OUT = path.resolve(args.out || path.join(HERE, 'build', partes > 1 ? `parte_${parte}.mp4` : 'video.mp4'));
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts|404/.test(m.text())) console.log('[browser]', m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/short_oxigenio/index.html?capture=1`);
await page.waitForFunction(() => window.APP && window.APP.ready === true, null, { timeout: 300000 });
console.log(`Quadros ${f0}..${f1 - 1} (${f1 - f0}) -> ${OUT}  [envelope da voz: ${(await page.evaluate(() => window.APP.hasEnvelope)) ? 'sim' : 'NÃO'}]`);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', args.crf || '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-g', String(FPS * 2), OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg saiu com código ' + c)))));
const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));
const t0 = Date.now();
for (let f = f0; f < f1; f++) {
  const url = await page.evaluate(([t]) => window.APP.frameJPEG(t, 0.94), [f / FPS]);
  await write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  const k = f - f0 + 1;
  if (k % 60 === 0 || f === f1 - 1) { const el = (Date.now() - t0) / 1000; console.log(`  quadro ${f + 1}/${TOTAL}  ${(el / k).toFixed(2)} s/quadro  ETA ${Math.round((el / k) * (f1 - f0 - k))} s`); }
}
ff.stdin.end(); await done; await browser.close(); server.close();
console.log('OK ->', OUT);
