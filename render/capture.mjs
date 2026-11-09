// Grava a animação de index.html frame a frame (determinístico) e gera um MP4.
// Uso: node render/capture.mjs [--out build/video.mp4] [--start 0] [--end 2400]
//                              [--shard 0 --shards 6] [--fps 30] [--crf 17]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
  return acc;
}, []));
const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'roteiro.json'), 'utf8'));
const FPS = +(args.fps || script.fps || 30);
const TOTAL = Math.round((script.duracao || 80) * FPS);
let start = +(args.start || 0), end = +(args.end || TOTAL);
if (args.shards) {
  const n = +args.shards, k = +(args.shard || 0), per = Math.ceil(TOTAL / n);
  start = k * per; end = Math.min(TOTAL, (k + 1) * per);
}
const OUT = path.resolve(args.out || path.join(ROOT, 'build', 'video.mp4'));
const CRF = args.crf || '17';
fs.mkdirSync(path.dirname(OUT), { recursive: true });

// ---------------------------------------------------------------- servidor estático
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.png': 'image/png', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

// ---------------------------------------------------------------- navegador com WebGL por software
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--enable-webgl', '--disable-gpu-sandbox', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[browser:${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?capture=1`);
await page.waitForFunction(() => window.APP && window.APP.ready === true, null, { timeout: 180000 });
console.log('Cena pronta:', JSON.stringify(await page.evaluate(() => window.APP.stats())));
console.log(`Gravando frames ${start}..${end - 1} (${end - start} frames @ ${FPS}fps) -> ${OUT}`);

// ---------------------------------------------------------------- FFmpeg (JPEG pipe -> H.264)
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', args.preset || 'medium', '-crf', CRF, '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-g', String(FPS * 2), '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg saiu com código ' + c)))));
const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));

const t0 = Date.now();
for (let f = start; f < end; f++) {
  const url = await page.evaluate(([t, q]) => window.APP.frameJPEG(t, q), [f / FPS, 0.95]);
  await write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  const done = f - start + 1;
  if (done % 30 === 0 || f === end - 1) {
    const el = (Date.now() - t0) / 1000, eta = (el / done) * (end - start - done);
    console.log(`frame ${f + 1}/${TOTAL}  ${(el / done).toFixed(2)} s/frame  ETA ${Math.round(eta)} s`);
  }
}
ff.stdin.end();
await ffDone;
await browser.close();
server.close();
console.log('OK ->', OUT);
