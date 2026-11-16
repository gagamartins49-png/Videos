// ============================================================================
//  Short 9:16 "E se o seu reflexo parasse de te imitar?" — Projeto E se? • Experimento #009
//  Cena 3D (cena.js) + camada 2D: título-gancho, legendas, granulado de filme, vinheta,
//  o fato real (~0,1 s) e o desafio do relógio (token de engajamento). Função pura de t.
// ============================================================================
import { createScene } from './cena.js';
import * as L from './linha.js';

const { clamp, smooth } = L;
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const F_TITLE = '"Anton", "Impact", "Arial Black", "DejaVu Sans", sans-serif';
const F_SERIF = '"Playfair Display", "DejaVu Serif", Georgia, serif';
const F_MONO = '"Roboto Mono", "DejaVu Sans Mono", "Courier New", monospace';

export async function createShort({ cfg }) {
  const W = cfg.largura || 1080, H = cfg.altura || 1920, DUR = cfg.duracao || 62, FPS = cfg.fps || 30;
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const ctx = comp.getContext('2d');
  const scene3d = await createScene({ width: W, height: H, quality: cfg.qualidade3d || 0.8 });
  // granulado: 4 telas de ruído pré-geradas, sorteadas por quadro (determinístico)
  const grains = Array.from({ length: 4 }, (_, k) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), im = g.createImageData(256, 256); for (let i = 0; i < 256 * 256; i++) { const v = (hash(i * 0.731 + k * 91.7) * 255) | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); return c; });

  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fitFont(text, weight, size, family, maxW) { let s = size; ctx.font = `${weight} ${s}px ${family}`; while (ctx.measureText(text).width > maxW && s > 14) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; } }
  function wrapLines(text, font, maxW) { ctx.font = font; const out = []; let line = ''; for (const w of String(text).split(' ')) { const tt = line ? line + ' ' + w : w; if (ctx.measureText(tt).width > maxW && line) { out.push(line); line = w; } else line = tt; } out.push(line); return out; }

  function drawBadge(t) {
    const txt = `${cfg.projeto || 'PROJETO E SE?'}  |  EXPERIMENTO #${cfg.experimento || '009'}`;
    ctx.save(); ctx.globalAlpha = 0.8; ctx.font = `700 25px ${F_MONO}`;
    const bw = ctx.measureText(txt).width + 76, bh = 50, bx = (W - bw) / 2, by = 36;
    roundRect(bx, by, bw, bh, 25); ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke();
    ctx.fillStyle = `rgba(255,40,40,${0.5 + 0.5 * Math.abs(Math.sin(t * Math.PI))})`; ctx.beginPath(); ctx.arc(bx + 30, by + bh / 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx + 50, by + bh / 2 + 1);
    ctx.restore();
  }
  function bigText(lines, y, a, sizes, colors, jitter = 0) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = '#000'; ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 24;
    lines.forEach((l, i) => { fitFont(l, 400, sizes[i], F_TITLE, 990); const dx = jitter * (hash(i + Math.floor(Date.now() * 0)) - 0.5); ctx.strokeText(l, W / 2 + dx, y + i * (sizes[i] * 1.08)); ctx.fillStyle = colors[i]; ctx.fillText(l, W / 2 + dx, y + i * (sizes[i] * 1.08)); });
    ctx.restore();
  }
  function drawTitle(t) {
    const a = 1 - smooth(3.2, 3.7, t);
    bigText(['E SE O SEU REFLEXO', 'PARASSE DE', 'TE IMITAR?'], 210, a, [92, 92, 120], ['#ffffff', '#ffffff', '#ff3b3b']);
  }
  function drawFact(t) {
    const a = smooth(35.3, 35.8, t) * (1 - smooth(42.6, 43.2, t)); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
    ctx.font = `700 30px ${F_MONO}`; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillText('ATRASO DO SEU CÉREBRO', W / 2, 1180);
    ctx.font = `400 150px ${F_TITLE}`; ctx.lineWidth = 12; ctx.strokeStyle = '#000'; ctx.strokeText('≈ 0,1 s', W / 2, 1340); ctx.fillStyle = '#e8f1ff'; ctx.fillText('≈ 0,1 s', W / 2, 1340);
    ctx.restore();
  }
  function drawToken(t) {
    const a = smooth(54.2, 54.8, t) * (1 - smooth(58.2, 58.7, t)); if (a <= 0) return;
    const pulse = 1 + 0.03 * Math.sin(t * 6);
    ctx.save(); ctx.translate(W / 2, 300); ctx.scale(pulse, pulse); ctx.translate(-W / 2, -300);
    bigText(['QUE HORAS SÃO', 'NO REFLEXO?'], 300, a, [100, 120], ['#ffffff', '#ff3b3b']);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = `800 36px ${F_MONO}`; ctx.fillStyle = '#ffd23f'; ctx.fillText('COMENTA ⤵', W / 2, 590); ctx.restore();
  }
  function drawSubtitles(t) {
    for (const f of cfg.frases) {
      if (t < f.inicio - 0.05 || t > f.fim + 0.05) continue;
      const a = (f.inicio <= 0 ? 1 : smooth(f.inicio, f.inicio + 0.3, t)) * (f.fim >= DUR ? 1 : 1 - smooth(f.fim - 0.3, f.fim, t)); if (a <= 0) continue;
      const font = `600 56px ${F_SERIF}`, lines = wrapLines(f.legenda || f.texto, font, 920), lh = 72;
      const cy = (t < 3.6 ? 660 : 1500);
      ctx.save(); ctx.globalAlpha = a; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 3; ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      lines.forEach((l, i) => { const yy = cy + (i - (lines.length - 1) / 2) * lh; ctx.strokeText(l, W / 2, yy); ctx.fillStyle = '#f2f2f2'; ctx.fillText(l, W / 2, yy); });
      ctx.restore();
    }
  }
  function grade(t, info) {
    // vinheta forte + tom frio
    const vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.28, W / 2, H * 0.5, Math.max(W, H) * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.78)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(40,70,110,0.35)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    // granulado
    const fr = Math.floor(t * FPS), g = grains[fr % 4];
    ctx.save(); ctx.globalAlpha = 0.075; ctx.globalCompositeOperation = 'overlay';
    const ox = (hash(fr) * 256) | 0, oy = (hash(fr + 9) * 256) | 0;
    for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(g, x, y);
    ctx.restore();
    // linhas de interferência quando a luz pisca
    if (info.light < 0.5 && info.light > 0.03) { ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) ctx.fillRect(0, hash(fr * 3 + i) * H, W, 2 + hash(i + fr) * 4); ctx.restore(); }
  }

  function renderFrame(t) {
    t = clamp(t, 0, DUR - 1e-6);
    const { canvas, info } = scene3d.renderFrame(t);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(canvas, 0, 0, W, H);
    grade(t, info);
    drawTitle(t);
    drawFact(t);
    drawToken(t);
    drawBadge(t);
    drawSubtitles(t);
    return comp;
  }
  return { canvas: comp, renderFrame, frameJPEG: (t, q = 0.92) => { renderFrame(t); return comp.toDataURL('image/jpeg', q); } };
}
