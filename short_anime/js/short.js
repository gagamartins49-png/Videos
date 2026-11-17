// ============================================================================
//  Short 9:16 "E se o Goku fosse parar no universo do Naruto?" — Projeto E se? • Experimento #011
//  Cena 3D (cena.js) + camada 2D estilo anime: título-gancho, quadros de impacto, linhas de
//  velocidade, ficha de poder, tom da ilusão, vidro quebrando, veredito, enquete, legendas.
//  Função pura de t.
// ============================================================================
import { createScene } from './cena.js';
import * as L from './linha.js';

const { clamp, smooth, hash } = L;
const F_TITLE = '"Anton", "Impact", "Arial Black", "DejaVu Sans", sans-serif';
const F_MONO = '"Roboto Mono", "DejaVu Sans Mono", "Courier New", monospace';

export async function createShort({ cfg }) {
  const W = cfg.largura || 1080, H = cfg.altura || 1920, DUR = cfg.duracao || 62, FPS = cfg.fps || 30;
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const ctx = comp.getContext('2d');
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tctx = tmp.getContext('2d');
  const scene3d = await createScene({ width: W, height: H, quality: cfg.qualidade3d || 0.8 });
  // vidro: fragmentos (triângulos de uma grade irregular, determinística)
  const SH = [];
  { const cols = 6, rows = 10, pts = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const ed = i === 0 || j === 0 || i === cols || j === rows; pts.push([(i + (ed ? 0 : (hash(i * 13 + j) - 0.5) * 0.7)) * W / cols, (j + (ed ? 0 : (hash(i * 7 + j * 3) - 0.5) * 0.7)) * H / rows]); }
    const P = (i, j) => pts[j * (cols + 1) + i];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const fl = hash(i + j * 9) > 0.5; SH.push(fl ? [P(i, j), P(i + 1, j), P(i + 1, j + 1)] : [P(i, j), P(i + 1, j), P(i, j + 1)]); SH.push(fl ? [P(i, j), P(i + 1, j + 1), P(i, j + 1)] : [P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)]); } }

  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fitFont(text, weight, size, family, maxW) { let s = size; ctx.font = `${weight} ${s}px ${family}`; while (ctx.measureText(text).width > maxW && s > 14) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; } return s; }
  function wrapLines(text, font, maxW) { ctx.font = font; const out = []; let line = ''; for (const w of String(text).split(' ')) { const tt = line ? line + ' ' + w : w; if (ctx.measureText(tt).width > maxW && line) { out.push(line); line = w; } else line = tt; } out.push(line); return out; }
  function stroked(text, x, y, fill, lw = 14, stroke = '#000') { ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y); }

  function drawBadge(t) {
    const txt = `${cfg.projeto || 'PROJETO E SE?'}  |  EXPERIMENTO #${cfg.experimento || '011'}`;
    ctx.save(); ctx.globalAlpha = 0.8; ctx.font = `700 25px ${F_MONO}`;
    const bw = ctx.measureText(txt).width + 76, bh = 50, bx = (W - bw) / 2, by = 36;
    roundRect(bx, by, bw, bh, 25); ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke();
    ctx.fillStyle = `rgba(255,60,40,${0.5 + 0.5 * Math.abs(Math.sin(t * Math.PI))})`; ctx.beginPath(); ctx.arc(bx + 30, by + bh / 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx + 50, by + bh / 2 + 1);
    ctx.restore();
  }
  // linhas de velocidade radiais (mangá)
  function speedLines(k, t, cx = W / 2, cy = H * 0.45, col = '255,255,255') {
    if (k <= 0.02) return;
    const fr = Math.floor(t * FPS);
    ctx.save(); ctx.globalAlpha = Math.min(1, k);
    for (let i = 0; i < 110; i++) {
      const a = hash(i * 3.1 + fr * 0.7) * Math.PI * 2, w = 0.004 + hash(i + fr) * 0.012;
      const r0 = 360 + hash(i * 5 + fr) * 380, r1 = 1500;
      ctx.fillStyle = `rgba(${col},${0.25 + 0.5 * hash(i + 2 * fr)})`;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1); ctx.lineTo(cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // quadro de impacto: 3 quadros alternando negativo e alto contraste
  function impactFrame(t) {
    const tau = t < 3.6 || t >= L.EV.volta ? L.skyTau(t) : t;
    for (const t0 of L.EV.quadrosImpacto) {
      const dt = tau - t0; if (dt < 0 || dt >= 0.13) continue;
      if (t0 < 1 && !(t < 3.6 || t >= L.EV.volta)) continue;
      const f = Math.floor(dt * FPS);
      tctx.drawImage(comp, 0, 0);
      ctx.save(); ctx.filter = f === 1 ? 'grayscale(1) contrast(6)' : 'grayscale(1) contrast(5) invert(1)'; ctx.drawImage(tmp, 0, 0); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = f === 1 ? '#ffffff' : '#ff4a4a'; ctx.globalAlpha = f === 1 ? 0 : 0.35; ctx.fillRect(0, 0, W, H); ctx.restore();
      speedLines(1, t + 5, W / 2, H * 0.45, f === 1 ? '0,0,0' : '255,255,255');
      return true;
    }
    return false;
  }
  function drawTitle(t) {
    const tau = t; if (tau > 3.7) return;
    const a = 1 - smooth(3.2, 3.7, t), pop = 1 + 0.25 * Math.exp(-Math.max(0, t - L.EV.choque) * 8) * (t > L.EV.choque ? 1 : 0);
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.translate(W / 2, 330); ctx.scale(pop, pop); ctx.rotate(-0.04);
    const lines = [['E SE O GOKU', 108, '#ffffff'], ['FOSSE PARAR NO', 92, '#ffffff'], ['UNIVERSO DO', 92, '#ffffff'], ['NARUTO?', 150, '#ffb21a']];
    let y = -120;
    lines.forEach(([l, s, c], i) => { fitFont(l, 400, s, F_TITLE, 980); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20; stroked(l, 0, y, c, 18); y += (lines[i + 1] ? lines[i + 1][1] : s) * 1.0; });
    ctx.restore();
  }
  // ficha de poder (barras)
  function drawStats(t) {
    const a = smooth(11.8, 12.3, t) * (1 - smooth(19.2, 19.7, t)); if (a <= 0) return;
    const rows = [['FORÇA BRUTA', 100, 38, 12.2], ['VELOCIDADE', 95, 62, 13.4], ['RESISTÊNCIA', 96, 55, 14.6], ['TÉCNICAS ESTRANHAS', 15, 96, 16.4], ['ESTRATÉGIA', 35, 92, 17.6]];
    const x0 = 70, w = W - 140, y0 = 1040;
    ctx.save(); ctx.globalAlpha = a;
    roundRect(x0 - 20, y0 - 120, w + 40, 120 + rows.length * 96 + 20, 30); ctx.fillStyle = 'rgba(10,8,20,0.72)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
    ctx.textBaseline = 'middle'; ctx.font = `400 46px ${F_TITLE}`;
    ctx.textAlign = 'left'; stroked('GUERREIRO', x0 + 10, y0 - 66, '#7fd8ff', 8);
    ctx.textAlign = 'right'; stroked('NINJAS', x0 + w - 10, y0 - 66, '#ff6a4a', 8);
    ctx.textAlign = 'center'; ctx.font = `400 40px ${F_TITLE}`; stroked('VS', W / 2, y0 - 66, '#ffd23f', 8);
    rows.forEach(([name, g, n, t0], i) => {
      const y = y0 + 20 + i * 96, k = smooth(t0, t0 + 0.6, t);
      ctx.globalAlpha = a * smooth(t0 - 0.2, t0, t);
      ctx.font = `700 26px ${F_MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(name, W / 2, y);
      const bw = (w - 40) / 2, by = y + 32;
      roundRect(x0, by - 13, bw, 26, 13); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
      roundRect(x0 + w - bw, by - 13, bw, 26, 13); ctx.fill();
      const gw = bw * g / 100 * k, nw = bw * n / 100 * k;
      if (gw > 4) { roundRect(x0 + bw - gw, by - 13, gw, 26, 13); ctx.fillStyle = '#4fc8ff'; ctx.fill(); }
      if (nw > 4) { roundRect(x0 + w - bw, by - 13, nw, 26, 13); ctx.fillStyle = '#ff5a3a'; ctx.fill(); }
      const win = g > n ? 'L' : 'R';
      if (k > 0.95) { ctx.font = `400 30px ${F_TITLE}`; ctx.textAlign = win === 'L' ? 'left' : 'right'; stroked(win === 'L' ? '▲' : '▲', win === 'L' ? x0 - 6 : x0 + w + 6, by - 30, '#ffd23f', 5); }
    });
    ctx.restore();
  }
  function caption(lines, y, a, sizes, colors, rot = -0.03, scale = 1) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.translate(W / 2, y); ctx.rotate(rot); ctx.scale(scale, scale);
    let yy = 0; lines.forEach((l, i) => { fitFont(l, 400, sizes[i], F_TITLE, 980); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18; stroked(l, 0, yy, colors[i], 16); yy += sizes[i] * 1.05; });
    ctx.restore();
  }
  function drawCallouts(t) {
    // "chakra" / técnicas que não dependem de força
    caption(['ILUSÃO'], 420, smooth(33.4, 33.7, t) * (1 - smooth(36.2, 36.6, t)), [150], ['#ff3a4a'], -0.05, 1 + 0.1 * Math.exp(-(t - 33.4) * 6));
    caption(['SELAMENTO'], 420, smooth(37.3, 37.6, t) * (1 - smooth(40.6, 41.0, t)), [140], ['#ff3a4a'], 0.04, 1 + 0.1 * Math.exp(-(t - 37.3) * 6));
    caption(['FORÇA NÃO', 'RESOLVE ISSO'], 1250, smooth(39.4, 39.7, t) * (1 - smooth(41.7, 42.0, t)), [96, 96], ['#ffffff', '#ffd23f']);
    caption(['NEM PISCA.'], 420, smooth(29.8, 30.0, t) * (1 - smooth(30.8, 31.0, t)), [130], ['#ffffff']);
    caption(['×50'], 430, smooth(21.5, 21.7, t) * (1 - smooth(24.6, 25.0, t)), [170], ['#ffd23f'], -0.06, 1 + 0.15 * Math.exp(-(t - 21.5) * 6));
    caption(['SUBSTITUIÇÃO!'], 440, smooth(47.5, 47.7, t) * (1 - smooth(48.7, 49.0, t)), [120], ['#ff6a4a'], 0.04);
  }
  function drawVerdict(t) {
    const a = smooth(49.6, 50.0, t) * (1 - smooth(55.2, 55.6, t)); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = `700 34px ${F_MONO}`; ctx.fillStyle = '#ffd23f'; ctx.fillText('— VEREDITO —', W / 2, 250); ctx.restore();
    caption(['VENCERIA', 'QUASE TODOS'], 380, a, [120, 120], ['#ffffff', '#7fd8ff'], -0.03);
    const b = smooth(52.2, 52.5, t) * (1 - smooth(55.2, 55.6, t));
    caption(['...MAS NÃO', 'DE PRIMEIRA'], 680, b, [100, 110], ['#ffffff', '#ff5a3a'], 0.03, 1 + 0.12 * Math.exp(-(t - 52.2) * 7));
  }
  function drawPoll(t) {
    const a = smooth(55.8, 56.2, t) * (1 - smooth(59.5, 59.8, t)); if (a <= 0) return;
    const pulse = 1 + 0.035 * Math.sin(t * 7);
    caption(['QUEM GANHA?'], 330, a, [150], ['#ffd23f'], -0.03, pulse);
    const y = 470, bw = 430, bh = 150;
    for (const [i, name, col, sub] of [[0, 'GUERREIRO', '#2aa8ff', 'comenta "1"'], [1, 'NINJA', '#ff4a2a', 'comenta "2"']]) {
      const x = i === 0 ? W / 2 - bw - 20 : W / 2 + 20, k = smooth(56.1 + i * 0.25, 56.5 + i * 0.25, t);
      ctx.save(); ctx.globalAlpha = a * k; ctx.translate(x + bw / 2, y + bh / 2); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); ctx.translate(-(x + bw / 2), -(y + bh / 2));
      roundRect(x, y, bw, bh, 30); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = '#000'; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `400 64px ${F_TITLE}`; stroked(name, x + bw / 2, y + 58, '#fff', 10);
      ctx.font = `700 28px ${F_MONO}`; ctx.fillStyle = '#fff'; ctx.fillText(sub, x + bw / 2, y + 118);
      ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = a * smooth(56.8, 57.2, t); ctx.textAlign = 'center'; ctx.font = `400 56px ${F_TITLE}`; stroked('VS', W / 2, y + bh / 2 + 18, '#ffd23f', 10);
    ctx.font = `800 36px ${F_MONO}`; ctx.fillStyle = '#fff'; ctx.fillText('COMENTA ⤵', W / 2, y + bh + 70); ctx.restore();
  }
  function drawSubtitles(t) {
    for (const f of cfg.frases) {
      if (t < f.inicio - 0.05 || t > f.fim + 0.05) continue;
      if (f.inicio <= 0.01) continue;      // o gancho já está no título
      const a = smooth(f.inicio, f.inicio + 0.2, t) * (f.fim >= DUR ? 1 : 1 - smooth(f.fim - 0.2, f.fim, t)); if (a <= 0) continue;
      const font = `400 60px ${F_TITLE}`, lines = wrapLines((f.legenda || f.texto).toUpperCase(), font, 900), lh = 74;
      const cy = 1520;
      ctx.save(); ctx.globalAlpha = a; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 16;
      lines.forEach((l, i) => { const yy = cy + (i - (lines.length - 1) / 2) * lh; stroked(l, W / 2, yy, '#ffffff', 12); });
      ctx.restore();
    }
  }
  function grade(t, info) {
    const I = info.illusion;
    if (I > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.55 * I; ctx.fillStyle = '#ff3040'; ctx.fillRect(0, 0, W, H); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.12 * I; ctx.fillStyle = '#ff0020'; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    if (info.power > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.1 * info.power; const g = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, H * 0.6); g.addColorStop(0, '#9fe6ff'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    const vg = ctx.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.65);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(${I > 0.5 ? '30,0,5' : '20,5,25'},0.6)`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // brilho do olho na virada
    const eye = Math.exp(-Math.abs(t - L.EV.olho - 0.25) * 7) * (t > L.EV.olho - 0.2 && t < 33.2 ? 1 : 0);
    if (eye > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = eye; const g = ctx.createRadialGradient(W / 2, H * 0.47, 0, W / 2, H * 0.47, 700); g.addColorStop(0, '#e0a0ff'); g.addColorStop(0.3, 'rgba(180,60,255,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  function shatter(t) {
    const dt = t - L.EV.vidro; if (dt < 0 || dt > 1.1) return;
    // os fragmentos mostram o mundo da ilusão (versão vermelha do mesmo quadro) voando para fora
    tctx.globalCompositeOperation = 'source-over'; tctx.drawImage(comp, 0, 0);
    tctx.globalCompositeOperation = 'multiply'; tctx.fillStyle = '#ff2a36'; tctx.fillRect(0, 0, W, H);
    tctx.globalCompositeOperation = 'source-over';
    if (dt < 0.07) { ctx.drawImage(tmp, 0, 0); ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; for (const s of SH) { ctx.beginPath(); ctx.moveTo(...s[0]); ctx.lineTo(...s[1]); ctx.lineTo(...s[2]); ctx.closePath(); ctx.stroke(); } ctx.restore(); return; }
    const u = dt - 0.07;
    SH.forEach((s, i) => {
      const cx = (s[0][0] + s[1][0] + s[2][0]) / 3, cy = (s[0][1] + s[1][1] + s[2][1]) / 3;
      const dx = cx - W / 2, dy = cy - H * 0.5, d = Math.hypot(dx, dy) + 1;
      const v = 900 + hash(i) * 900, delay = (1 - d / 1100) * 0.12;
      const k = Math.max(0, u - Math.max(0, delay));
      const ox = dx / d * v * k, oy = dy / d * v * k + 1400 * k * k, rot = (hash(i + 3) - 0.5) * 6 * k;
      ctx.save(); ctx.translate(cx + ox, cy + oy); ctx.rotate(rot); ctx.translate(-cx, -cy);
      ctx.beginPath(); ctx.moveTo(...s[0]); ctx.lineTo(...s[1]); ctx.lineTo(...s[2]); ctx.closePath(); ctx.save(); ctx.clip(); ctx.drawImage(tmp, 0, 0); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    });
  }
  function flash(t) {
    let a = 0;
    a = Math.max(a, Math.exp(-Math.max(0, t - L.EV.vidro) * 10) * (t >= L.EV.vidro && t < L.EV.vidro + 0.5 ? 0.8 : 0));
    a = Math.max(a, (t >= L.EV.queda[1] && t < L.EV.queda[1] + 0.3) ? 0.6 * (1 - (t - L.EV.queda[1]) / 0.3) : 0);
    a = Math.max(a, (t >= L.EV.raio[0] && t < L.EV.raio[1]) ? 0.25 : 0);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  function renderFrame(t) {
    t = clamp(t, 0, DUR - 1e-6);
    const { canvas, info } = scene3d.renderFrame(t);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.drawImage(canvas, 0, 0, W, H);
    grade(t, info);
    speedLines(info.speed * 0.8, t);
    shatter(t);
    const imp = impactFrame(t);
    flash(t);
    if (!imp) { drawTitle(t); drawStats(t); drawCallouts(t); drawVerdict(t); drawPoll(t); drawSubtitles(t); }
    drawBadge(t);
    return comp;
  }
  return { canvas: comp, renderFrame, frameJPEG: (t, q = 0.92) => { renderFrame(t); return comp.toDataURL('image/jpeg', q); } };
}
