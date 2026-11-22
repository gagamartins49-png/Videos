// ============================================================================
//  Short 9:16 "E se você ficasse preso no shopping à noite?" — Projeto E se? • Experimento #021
//  Cena 3D low-poly (cena.js) + camada 2D: título-gancho, avisos estilo "laboratório",
//  relógio da madrugada, mascote O Interrogador no canto (fala com a narração), legendas,
//  cartão de comentário. Função pura de t.
// ============================================================================
import { createScene } from './cena.js';
import { createInterrogador, moodColor } from '../../compilacao/js/interrogador.js';
import * as L from './linha.js';

const { clamp, smooth } = L;
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const F_TITLE = '"Anton", "Impact", "Arial Black", "DejaVu Sans", sans-serif';
const F_SERIF = '"Playfair Display", "DejaVu Serif", Georgia, serif';
const F_MONO = '"Roboto Mono", "DejaVu Sans Mono", "Courier New", monospace';
const interp = (pts, t) => { for (let i = 0; i < pts.length - 1; i++) { const [a, va] = pts[i], [b, vb] = pts[i + 1]; if (t <= b) return va + (vb - va) * smooth(a, b, t); } return pts[pts.length - 1][1]; };

export async function createShort({ cfg, envelope = null }) {
  const W = cfg.largura || 1080, H = cfg.altura || 1920, DUR = cfg.duracao || 62, FPS = cfg.fps || 30;
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const ctx = comp.getContext('2d');
  const scene3d = await createScene({ width: W, height: H, quality: cfg.qualidade3d || 0.8 });
  const mascot = await createInterrogador({ width: 540, height: 960, quality: 0.5, corner: 560, levels: [] });
  const grains = Array.from({ length: 4 }, (_, k) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), im = g.createImageData(256, 256); for (let i = 0; i < 256 * 256; i++) { const v = (hash(i * 0.731 + k * 91.7) * 255) | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); return c; });

  const talkAt = (t) => {
    if (envelope && envelope.length) return clamp(envelope[Math.min(envelope.length - 1, Math.max(0, Math.floor(t * FPS)))] || 0);
    for (const f of cfg.frases) if (t >= f.inicio && t <= f.fim) return 0.35 + 0.65 * Math.abs(Math.sin(t * 13) * Math.sin(t * 5.3 + 1));
    return 0;
  };
  const surpriseAt = (t) => { let s = 0; for (const t0 of cfg.sustos || []) { const d = t - t0; if (d > -0.15 && d < 2) s = Math.max(s, d < 0 ? (d + 0.15) / 0.15 : Math.exp(-d * 3)); } return s; };

  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fitFont(text, weight, size, family, maxW) { let s = size; ctx.font = `${weight} ${s}px ${family}`; while (ctx.measureText(text).width > maxW && s > 14) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; } }
  function wrapLines(text, font, maxW) { ctx.font = font; const out = []; let line = ''; for (const w of String(text).split(' ')) { const tt = line ? line + ' ' + w : w; if (ctx.measureText(tt).width > maxW && line) { out.push(line); line = w; } else line = tt; } out.push(line); return out; }

  function drawBadge(t) {
    const txt = `${cfg.projeto || 'PROJETO E SE?'}  |  EXPERIMENTO #${cfg.experimento || '021'}`;
    ctx.save(); ctx.font = `700 25px ${F_MONO}`;
    const bw = ctx.measureText(txt).width + 76, bh = 50, bx = (W - bw) / 2, by = 36;
    roundRect(bx, by, bw, bh, 25); ctx.fillStyle = 'rgba(8,12,20,0.55)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.stroke();
    ctx.fillStyle = `rgba(255,59,59,${0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI))})`; ctx.beginPath(); ctx.arc(bx + 30, by + bh / 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx + 50, by + bh / 2 + 1);
    ctx.restore();
  }
  function bigLines(lines, y, a, s = 1) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.translate(W / 2, y); ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = '#000'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
    lines.forEach(([l, c, sz], i) => { fitFont(l, 400, sz || 108, F_TITLE, 1000); ctx.strokeText(l, 0, i * 116); ctx.fillStyle = c; ctx.fillText(l, 0, i * 116); });
    ctx.restore();
  }
  function drawTitle(t) { bigLines([['PRESO NO SHOPPING', '#ffffff'], ['À NOITE:', '#ffd23f'], ['E AGORA?', '#ff3fa4']], 200, 1 - smooth(3.7, 4.2, t), 1 + 0.06 * (1 - smooth(0, 0.5, t))); }
  // aviso estilo laboratório
  function aviso(txt, sub, t0, t1, t, cor = '#ffd23f') {
    const a = smooth(t0, t0 + 0.3, t) * (1 - smooth(t1 - 0.3, t1, t)); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; const x = 34, y = 130, w = 640, h = sub ? 150 : 96;
    roundRect(x, y, w, h, 20); ctx.fillStyle = 'rgba(5,10,18,0.72)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke(); ctx.fillStyle = cor; ctx.fillRect(x, y + 16, 6, h - 32);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; fitFont(txt, 800, 40, F_MONO, w - 60); ctx.fillStyle = cor; ctx.fillText(txt, x + 28, y + 60);
    if (sub) { fitFont(sub, 700, 30, F_MONO, w - 60); ctx.fillStyle = '#e8f0ff'; ctx.fillText(sub, x + 28, y + 115); }
    ctx.restore();
  }
  function relogio(t) {
    const a = (t > 4.2 && t < 49.8) ? smooth(4.2, 4.6, t) * (1 - smooth(49.4, 49.8, t)) : 0; if (a <= 0) return;
    const min = Math.floor(((t - 4.2) / 45.6) * 140), hh = Math.floor(min / 60), mm = min % 60;
    ctx.save(); ctx.globalAlpha = a; const txt = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    ctx.font = `800 44px ${F_MONO}`; const w = ctx.measureText(txt).width + 40; roundRect(W - w - 34, 130, w, 66, 14); ctx.fillStyle = 'rgba(5,10,18,0.72)'; ctx.fill();
    ctx.fillStyle = '#ff6a6a'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(txt, W - 54, 164); ctx.restore();
  }
  function drawCards(t) {
    aviso('PORTAS DE AÇO: FECHADAS', 'LUZES: MODO MADRUGADA', 5.6, 8.8, t, '#ff8a3a');
    aviso('ECO: 0 RESPOSTAS', null, 10.4, 13.4, t, '#9fe3ff');
    aviso('ÚNICA LUZ: SAÍDA', 'EMERGÊNCIA = SEMPRE ACESA', 14.6, 18.0, t, '#5dff7a');
    aviso('RONDA + CÂMERAS + SENSOR', 'SHOPPING NUNCA FICA SOZINHO', 26.8, 31.0, t, '#9fe3ff');
    aviso('! MOVIMENTO DETECTADO !', 'ALARME DISPARADO', L.EV.alarme, 35.5, t, '#ff3b3b');
    aviso('BARRA ANTIPÂNICO', 'ABRE POR DENTRO (EMPURRA)', 36.0, 40.5, t, '#5dff7a');
    aviso('! SIRENE NO PRÉDIO INTEIRO !', null, L.EV.empurra + 0.3, 44.8, t, '#ff3b3b');
    // moral e enquete
    bigLines([['NO PROVADOR:', '#ffffff', 96], ['NUNCA SEM', '#ffd23f', 96], ['DESPERTADOR', '#ff3fa4', 110]], 330, smooth(50.4, 50.8, t) * (1 - smooth(54.6, 55.0, t)));
    const c = smooth(55.3, 55.8, t) * (1 - smooth(59.2, 59.6, t));
    if (c > 0) {
      ctx.save(); ctx.globalAlpha = c; ctx.translate(W / 2, 300); const s = 1 + 0.1 * Math.exp(-(t - 55.3) * 7); ctx.scale(s, s); ctx.rotate(-0.02);
      roundRect(-450, -130, 900, 300, 36); ctx.fillStyle = 'rgba(5,10,18,0.85)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#3ad7ff'; ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; fitFont('TENTAVA SAIR OU DORMIA', 400, 74, F_TITLE, 820); ctx.fillText('TENTAVA SAIR OU DORMIA', 0, -30); ctx.fillStyle = '#ffd23f'; fitFont('NA LOJA DE COLCHÃO?', 400, 74, F_TITLE, 820); ctx.fillText('NA LOJA DE COLCHÃO?', 0, 55);
      ctx.font = `800 36px ${F_MONO}`; ctx.fillStyle = '#3ad7ff'; ctx.fillText('COMENTA ⤵', 0, 130); ctx.restore();
    }
  }
  function drawMascot(t) {
    const mood = interp(cfg.humor, t), panic = interp(cfg.panico, t), surprise = surpriseAt(t), talk = talkAt(t);
    const nod = interp(cfg.balanca, t), crouch = interp(cfg.abaixa, t);
    const c = mascot.renderCorner(t, { talk, mood, surprise, panic, nod, crouch });
    const cx = W - 238, cy = H - 600, r = 205;
    const col = `#${moodColor(mood).getHexString()}`;
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, r); g.addColorStop(0, 'rgba(10,30,50,0.55)'); g.addColorStop(1, 'rgba(5,10,18,0.12)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * (4 + 6 * panic)); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1; ctx.setLineDash([10, 14]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r + 12, t * 0.6, t * 0.6 + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.drawImage(c, cx - 280, cy - 305, 560, 560);
    roundRect(cx - 120, cy + r - 26, 240, 40, 12); ctx.fillStyle = 'rgba(5,10,18,0.8)'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `800 20px ${F_MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('O INTERROGADOR', cx, cy + r - 5);
    const bubble = surprise > 0.4 ? '?!' : crouch > 0.6 ? '!!' : nod > 0.5 ? 'UFA' : mood > 1.5 ? '!!!' : mood > 0.6 ? '!' : null;
    if (bubble) {
      const s = 1 + 0.15 * surprise; ctx.save(); ctx.translate(cx - 175, cy - 175); ctx.scale(s, s);
      roundRect(-48, -34, 96, 68, 18); ctx.fillStyle = col; ctx.fill(); ctx.beginPath(); ctx.moveTo(20, 30); ctx.lineTo(40, 58); ctx.lineTo(36, 28); ctx.fill();
      ctx.fillStyle = '#05070c'; ctx.font = `400 46px ${F_TITLE}`; ctx.fillText(bubble, 0, 2); ctx.restore();
    }
    ctx.restore();
  }
  function drawSubtitles(t) {
    for (const f of cfg.frases) {
      if (f.inicio <= 0.01) continue;
      if (t < f.inicio - 0.05 || t > f.fim + 0.05) continue;
      const a = smooth(f.inicio, f.inicio + 0.3, t) * (f.fim >= DUR ? 1 : 1 - smooth(f.fim - 0.3, f.fim, t)); if (a <= 0) continue;
      const font = `600 56px ${F_SERIF}`, lines = wrapLines(f.legenda || f.texto, font, 900), lh = 72;
      const cy = 680 + (1 - smooth(f.inicio, f.inicio + 0.45, t)) * 16;
      ctx.save(); ctx.globalAlpha = a; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 3; ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      lines.forEach((l, i) => { const yy = cy + (i - (lines.length - 1) / 2) * lh; ctx.strokeText(l, W / 2, yy); ctx.fillStyle = '#fff'; ctx.fillText(l, W / 2, yy); });
      ctx.restore();
    }
  }
  function grade(t, info) {
    const vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.66);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (info.luz.alarme > 0.5) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(255,30,40,0.12)'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    const fr = Math.floor(t * FPS), g = grains[fr % 4];
    ctx.save(); ctx.globalAlpha = 0.06; ctx.globalCompositeOperation = 'overlay'; const ox = (hash(fr) * 256) | 0, oy = (hash(fr + 9) * 256) | 0; for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(g, x, y); ctx.restore();
    // apagão no provador (gancho) e fim do loop
    if (t > L.EV.apaga && t < L.EV.apaga + 0.12) { ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H); }
    const lp = smooth(DUR - 0.6, DUR, t); if (lp > 0) { ctx.fillStyle = `rgba(0,0,0,${0.7 * lp})`; ctx.fillRect(0, 0, W, H); }
  }

  function renderFrame(t) {
    t = clamp(t, 0, DUR - 1e-6);
    const { canvas, info } = scene3d.renderFrame(t);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(canvas, 0, 0, W, H);
    grade(t, info);
    drawTitle(t);
    relogio(t);
    drawCards(t);
    drawMascot(t);
    drawBadge(t);
    drawSubtitles(t);
    return comp;
  }
  return { canvas: comp, renderFrame, frameJPEG: (t, q = 0.92) => { renderFrame(t); return comp.toDataURL('image/jpeg', q); } };
}
