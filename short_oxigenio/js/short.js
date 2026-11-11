// ============================================================================
//  Short 9:16 "E se todo o oxigênio da Terra sumisse por 5 segundos?"
//  Projeto E se? • Experimento #001 • protagonista: O Interrogador
//  Reaproveita a cidade do nível 1 da compilação (compilacao/niveis/cidade.js)
//  e o mesmo mascote (compilacao/js/interrogador.js). Função pura do tempo t.
// ============================================================================
import { createApp as createCity } from '../../compilacao/niveis/cidade.js';
import { createInterrogador, moodColor } from '../../compilacao/js/interrogador.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const dec = (v, d = 1) => v.toFixed(d).replace('.', ',');
const F_TITLE = '"Anton", "Impact", "Arial Black", "DejaVu Sans", sans-serif';
const F_SERIF = '"Playfair Display", "DejaVu Serif", Georgia, serif';
const F_MONO = '"Roboto Mono", "DejaVu Sans Mono", "Courier New", monospace';

// tempo do vídeo (0-75 s) -> tempo da simulação da cidade (0-63 s)
//  0-11 s cidade normal / oxigênio caindo  •  11-12,5 s o céu escurece "de repente"
//  12,5-25 s caos (céu negro, motores param)  •  25-50 s prédios viram pó (câmera lenta)
//  50 s o oxigênio volta  •  50-75 s ruínas e tempestade de pó
const KEYS = [[0, 0], [11, 9.6], [12.5, 14], [25, 19.5], [50, 44], [75, 63]];
export function simTime(t) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [t0, u0] = KEYS[i], [t1, u1] = KEYS[i + 1];
    if (t <= t1) return u0 + (u1 - u0) * clamp((t - t0) / (t1 - t0));
  }
  return KEYS[KEYS.length - 1][1];
}
const interp = (pts, t) => { for (let i = 0; i < pts.length - 1; i++) { const [a, va] = pts[i], [b, vb] = pts[i + 1]; if (t <= b) return va + (vb - va) * smooth(a, b, t); } return pts[pts.length - 1][1]; };
export const oxygenAt = (t) => (t < 3 ? 21 : t < 12 ? 21 * (1 - smooth(3, 12, t)) : t < 50 ? 0 : 21 * smooth(50, 52.5, t));
export const remainingAt = (t) => 5 * (1 - clamp((t - 12) / 38));

export async function createShort({ cfg, envelope = null }) {
  const W = cfg.largura || 1080, H = cfg.altura || 1920, DUR = cfg.duracao || 75, FPS = cfg.fps || 30;
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const ctx = comp.getContext('2d');
  const city = await createCity({ level: 1, width: W, height: H, quality: cfg.qualidade3d || 0.8, fov: 72 });
  const mascot = await createInterrogador({ width: 540, height: 960, quality: 0.5, corner: 560, levels: [] });

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
    const txt = `${cfg.projeto || 'PROJETO E SE?'}  |  EXPERIMENTO #${cfg.experimento || '001'}`;
    ctx.save(); ctx.font = `700 25px ${F_MONO}`;
    const bw = ctx.measureText(txt).width + 76, bh = 50, bx = (W - bw) / 2, by = 36;
    roundRect(bx, by, bw, bh, 25); ctx.fillStyle = 'rgba(8,12,20,0.55)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.stroke();
    ctx.fillStyle = `rgba(255,59,59,${0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI))})`; ctx.beginPath(); ctx.arc(bx + 30, by + bh / 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx + 50, by + bh / 2 + 1);
    ctx.restore();
  }
  function drawTitle(t) {
    const a = 1 - smooth(11.2, 12.2, t); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
    const pop = 1 + 0.08 * (1 - smooth(0, 0.6, t));
    ctx.translate(W / 2, 215); ctx.scale(pop, pop);
    ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = '#000'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
    ['E SE O OXIGÊNIO SUMISSE', 'POR 5 SEGUNDOS?'].forEach((l, i) => { fitFont(l, 400, 104, F_TITLE, 1000); ctx.strokeText(l, 0, i * 118); ctx.fillStyle = i ? '#ffd23f' : '#ffffff'; ctx.fillText(l, 0, i * 118); });
    ctx.restore();
  }
  function drawHUD(t, mood) {
    const o2 = oxygenAt(t), rem = remainingAt(t);
    const x = 34, y = 390 + (120 - 390) * smooth(11.4, 12.8, t), w = 600, h = 300;
    ctx.save(); ctx.globalAlpha = smooth(0.1, 0.6, t);
    roundRect(x, y, w, h, 22); ctx.fillStyle = 'rgba(5,10,18,0.6)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();
    ctx.fillStyle = `#${moodColor(mood).getHexString()}`; ctx.fillRect(x, y + 16, 6, h - 32);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = `700 29px ${F_MONO}`; ctx.fillStyle = '#9fe3ff'; ctx.fillText('OXIGÊNIO:', x + 28, y + 50);
    const oc = o2 > 15 ? '#6dff9a' : o2 > 5 ? '#ffb347' : '#ff4d3a';
    ctx.font = `800 70px ${F_MONO}`; ctx.fillStyle = o2 < 1 && Math.floor(t * 3) % 2 ? '#ffffff' : oc; ctx.fillText(`${dec(o2)}%`, x + 26, y + 120);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 28, y + 136, w - 56, 10); ctx.fillStyle = oc; ctx.fillRect(x + 28, y + 136, (w - 56) * o2 / 21, 10);
    ctx.font = `700 29px ${F_MONO}`; ctx.fillStyle = '#ffd9a0'; ctx.fillText(t < 50 ? 'SEM OXIGÊNIO — RESTAM:' : 'CRONÔMETRO:', x + 28, y + 200);
    ctx.font = `800 64px ${F_MONO}`; ctx.fillStyle = t >= 12 && t < 50 ? '#ffffff' : 'rgba(255,255,255,0.75)'; ctx.fillText(`${dec(rem)} s`, x + 26, y + 268);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 28, y + 280, w - 56, 8); ctx.fillStyle = '#ffd9a0'; ctx.fillRect(x + 28, y + 280, (w - 56) * rem / 5, 8);
    const alert = t >= 12 && t < 50 ? 'CÂMERA LENTA: 5 s = 38 s' : t >= 50 && t < 62 ? 'OXIGÊNIO RESTAURADO' : t > 3 && t < 12 ? 'OXIGÊNIO CAINDO' : null;
    if (alert) {
      const on = Math.floor(t * 4) % 2 === 0, good = t >= 50;
      roundRect(x, y + h + 14, w, 58, 14); ctx.fillStyle = good ? (on ? 'rgba(30,160,90,0.85)' : 'rgba(10,90,50,0.6)') : on ? 'rgba(220,20,20,0.85)' : 'rgba(120,0,0,0.6)'; ctx.fill();
      fitFont(`! ${alert} !`, 800, 30, F_MONO, w - 30); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(`! ${alert} !`, x + w / 2, y + h + 54);
    }
    ctx.restore();
  }
  function drawMascot(t) {
    const mood = interp(cfg.humor, t), panic = interp(cfg.panico, t), surprise = surpriseAt(t), talk = talkAt(t);
    const c = mascot.renderCorner(t, { talk, mood, surprise, panic });
    const cx = W - 238, cy = H - 600, r = 205;           // canto inferior direito, acima da área de botões do app
    const col = `#${moodColor(mood).getHexString()}`;
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, r); g.addColorStop(0, 'rgba(10,30,50,0.55)'); g.addColorStop(1, 'rgba(5,10,18,0.12)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * (4 + 6 * panic)); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1; ctx.setLineDash([10, 14]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r + 12, t * 0.6, t * 0.6 + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.drawImage(c, cx - 280, cy - 305, 560, 560);
    roundRect(cx - 120, cy + r - 26, 240, 40, 12); ctx.fillStyle = 'rgba(5,10,18,0.8)'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `800 20px ${F_MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('O INTERROGADOR', cx, cy + r - 5);
    const bubble = surprise > 0.4 ? '?!' : mood > 1.5 ? '!!!' : mood > 0.6 ? '!' : null;
    if (bubble) {
      const s = 1 + 0.15 * surprise; ctx.save(); ctx.translate(cx - 175, cy - 175); ctx.scale(s, s);
      roundRect(-48, -34, 96, 68, 18); ctx.fillStyle = col; ctx.fill(); ctx.beginPath(); ctx.moveTo(20, 30); ctx.lineTo(40, 58); ctx.lineTo(36, 28); ctx.fill();
      ctx.fillStyle = '#05070c'; ctx.font = `400 46px ${F_TITLE}`; ctx.fillText(bubble, 0, 2); ctx.restore();
    }
    ctx.restore();
  }
  function drawSubtitles(t) {
    for (const f of cfg.frases) {
      if (t < f.inicio - 0.05 || t > f.fim + 0.05) continue;
      const a = (f.inicio <= 0 ? 1 : smooth(f.inicio, f.inicio + 0.35, t)) * (f.fim >= DUR ? 1 : 1 - smooth(f.fim - 0.35, f.fim, t)); if (a <= 0) continue;
      const font = `600 62px ${F_SERIF}`, lines = wrapLines(f.legenda || f.texto, font, 940), lh = 79;
      const cy = 900 + (f.inicio <= 0 ? 0 : (1 - smooth(f.inicio, f.inicio + 0.5, t)) * 18);
      ctx.save(); ctx.globalAlpha = a; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 3; ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      lines.forEach((l, i) => { const yy = cy + (i - (lines.length - 1) / 2) * lh; ctx.strokeText(l, W / 2, yy); ctx.fillStyle = '#fff'; ctx.fillText(l, W / 2, yy); });
      ctx.restore();
    }
  }
  function effects(t) {
    // corte seco quando o céu escurece + "pulso" quando o oxigênio volta
    const d = t - 12; if (d > -0.05 && d < 0.6) { ctx.fillStyle = `rgba(0,0,0,${0.85 * (1 - smooth(0, 0.6, d))})`; ctx.fillRect(0, 0, W, H); }
    const r = t - 50; if (r > 0 && r < 1.2) { ctx.fillStyle = `rgba(235,240,255,${0.55 * Math.exp(-r * 3.5)})`; ctx.fillRect(0, 0, W, H); }
    // contagem regressiva gigante (últimos 5 "segundos reais")
    if (t > 12.5 && t < 50) {
      const n = Math.ceil(remainingAt(t)), ph = (remainingAt(t) % 1);
      ctx.save(); ctx.globalAlpha = 0.18 + 0.12 * ph; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `400 ${300 + 60 * ph}px ${F_TITLE}`; ctx.fillStyle = '#ffffff'; ctx.fillText(String(n), W / 2, 640); ctx.restore();
    }
    // loop: leve escurecimento no fim para emendar com o começo
    const lp = smooth(74.4, 75, t); if (lp > 0) { ctx.fillStyle = `rgba(0,0,0,${0.6 * lp})`; ctx.fillRect(0, 0, W, H); }
  }

  function renderFrame(t) {
    t = clamp(t, 0, DUR - 1e-6);
    const mood = interp(cfg.humor, t);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(city.renderFrame(simTime(t)), 0, 0, W, H);
    effects(t);
    drawTitle(t);
    drawHUD(t, mood);
    drawMascot(t);
    drawBadge(t);
    drawSubtitles(t);
    return comp;
  }
  return { canvas: comp, renderFrame, frameJPEG: (t, q = 0.92) => { renderFrame(t); return comp.toDataURL('image/jpeg', q); } };
}
