// Renderiza UM bloco (ou uma parte de um bloco) da compilação, frame a frame,
// sem salvar imagens no disco: cada quadro JPEG vai direto (pipe/stdin) para o FFmpeg.
// Uso:
//   node compilacao/render_bloco.mjs --bloco 3 [--parte 0 --partes 4] [--out compilacao/build/bloco_3.mp4]
//   node compilacao/render_bloco.mjs --todos          (renderiza os 9 blocos em sequência e concatena tudo)
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']); return acc; }, []));
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, 'roteiro.json'), 'utf8'));
const FPS = cfg.fps || 30, CRF = args.crf || '20', BUILD = path.join(HERE, 'build');
fs.mkdirSync(BUILD, { recursive: true });

// ---------------------------------------------------------------- servidor estático (raiz do repositório)
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

async function renderPart(bloco, parte, partes, out) {
  const dur = cfg.blocos[bloco].dur, total = Math.round(dur * FPS), per = Math.ceil(total / partes);
  const f0 = parte * per, f1 = Math.min(total, (parte + 1) * per);
  // um navegador novo por parte: toda a memória (WebGL, texturas) é liberada ao final
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts|404/.test(m.text())) console.log('[browser]', m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/compilacao/index.html?capture=1&bloco=${bloco}`);
  await page.waitForFunction(() => window.APP && window.APP.ready === true, null, { timeout: 300000 });
  const { start, hasEnvelope } = await page.evaluate(() => ({ start: window.APP.start, hasEnvelope: window.APP.hasEnvelope }));
  console.log(`Bloco ${bloco} parte ${parte + 1}/${partes}: quadros ${f0}..${f1 - 1} (${f1 - f0}) -> ${out}  [envelope da voz: ${hasEnvelope ? 'sim' : 'NÃO'}]`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', args.preset || 'medium', '-crf', CRF, '-pix_fmt', 'yuv420p', '-r', String(FPS), '-g', String(FPS * 2), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg saiu com código ' + c)))));
  const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const url = await page.evaluate(([T]) => window.APP.frameJPEG(T, 0.93), [start + f / FPS]);
    await write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    const k = f - f0 + 1;
    if (k % 60 === 0 || f === f1 - 1) { const el = (Date.now() - t0) / 1000; console.log(`  quadro ${f + 1}/${total}  ${(el / k).toFixed(2)} s/quadro  ETA ${Math.round((el / k) * (f1 - f0 - k))} s`); }
  }
  ff.stdin.end(); await done; await browser.close();
}

function concat(files, out) {
  const list = path.join(BUILD, `lista_${path.basename(out)}.txt`);
  fs.writeFileSync(list, files.map((f) => `file '${path.resolve(f)}'`).join('\n'));
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('falha ao concatenar ' + out);
}

if (args.todos) {
  const blocos = [];
  for (let b = 0; b < cfg.blocos.length; b++) { const out = path.join(BUILD, `bloco_${b}.mp4`); await renderPart(b, 0, 1, out); blocos.push(out); }
  const mudo = path.join(BUILD, 'compilacao_sem_audio.mp4'); concat(blocos, mudo);
  const audio = path.join(BUILD, 'audio_compilacao.wav'), final = path.join(BUILD, `${cfg.arquivo}.mp4`);
  if (fs.existsSync(audio)) spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mudo, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final], { stdio: 'inherit' });
  console.log('OK ->', fs.existsSync(final) ? final : mudo);
} else {
  const b = +(args.bloco || 0), partes = +(args.partes || 1), parte = +(args.parte || 0);
  const out = path.resolve(args.out || path.join(BUILD, partes > 1 ? `bloco_${b}_parte_${parte}.mp4` : `bloco_${b}.mp4`));
  await renderPart(b, parte, partes, out);
  console.log('OK ->', out);
}
server.close();
