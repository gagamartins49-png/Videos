// ============================================================================
//  Short 9:16 "E se as batidas do GTA 6 fossem reais?" — Projeto E se? • Experimento #005
//  Cena 3D (cena.js) + camada 2D: título-gancho, HUD "modo jogo" x "modo realidade",
//  câmera lenta, glitch de transição, mascote O Interrogador e legendas. Função pura de t.
// ============================================================================
import { createScene } from './cena.js';
import { createInterrogador, moodColor } from '../../compilacao/js/interrogador.js';
import * as F from './fisica.js';

const { clamp, smooth } = F;
const dec = (v, d = 1) => v.toFixed(d).replace('.', ',');
const fmt = (v) => String(Math.max(0, Math.round(v))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const F_TITLE = '"Anton", "Impact", "Arial Black", "DejaVu Sans", sans-serif';
const F_SERIF = '"Playfair Display", "DejaVu Serif", Georgia, serif';
const F_MONO = '"Roboto Mono", "DejaVu Sans Mono", "Courier New", monospace';
const interp = (pts, t) => { for (let i = 0; i < pts.length - 1; i++) { const [a, va] = pts[i], [b, vb] = pts[i + 1]; if (t <= b) return va + (vb - va) * smooth(a, b, t); } return pts[pts.length - 1][1]; };

export async function createShort({ cfg, envelope = null }) {
  const W = cfg.largura || 1080, H = cfg.altura || 1920, DUR = cfg.duracao || 62, FPS = cfg.fps || 30;
  const T = cfg.tempos, EV = F.eventTimes(cfg);
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const ctx = comp.getContext('2d');
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tctx = tmp.getContext('2d');
  const scene3d = await createScene({ cfg, width: W, height: H, quality: cfg.qualidade3d || 0.8 });
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
    const txt = `${cfg.projeto || 'PROJETO E SE?'}  |  EXPERIMENTO #${cfg.experimento || '005'}`;
    ctx.save(); ctx.font = `700 25px ${F_MONO}`;
    const bw = ctx.measureText(txt).width + 76, bh = 50, bx = (W - bw) / 2, by = 36;
    roundRect(bx, by, bw, bh, 25); ctx.fillStyle = 'rgba(8,12,20,0.55)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.stroke();
    ctx.fillStyle = `rgba(255,59,59,${0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI))})`; ctx.beginPath(); ctx.arc(bx + 30, by + bh / 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx + 50, by + bh / 2 + 1);
    ctx.restore();
  }
  // título-gancho (já no 1º quadro)
  function drawTitle(t) {
    const a = 1 - smooth(T.jogo.inicio - 0.4, T.jogo.inicio + 0.1, t); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
    const pop = 1 + 0.06 * (1 - smooth(0, 0.5, t));
    ctx.translate(W / 2, 200); ctx.scale(pop, pop);
    ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = '#000'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
    [['E SE AS BATIDAS', '#ffffff'], ['DO GTA 6', '#ff3fa4'], ['FOSSEM DE VERDADE?', '#ffd23f']].forEach(([l, c], i) => { fitFont(l, 400, 108, F_TITLE, 1000); ctx.strokeText(l, 0, i * 116); ctx.fillStyle = c; ctx.fillText(l, 0, i * 116); });
    ctx.restore();
  }
  function panel(x, y, w, h, accent, alpha) {
    ctx.globalAlpha = alpha; roundRect(x, y, w, h, 22); ctx.fillStyle = 'rgba(5,10,18,0.62)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();
    ctx.fillStyle = accent; ctx.fillRect(x, y + 16, 6, h - 32);
  }
  function label(x, y, txt, color, bg) {
    ctx.font = `800 28px ${F_MONO}`; const w = ctx.measureText(txt).width + 34;
    roundRect(x, y, w, 46, 12); ctx.fillStyle = bg; ctx.fill(); ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x + 17, y + 24); ctx.textBaseline = 'alphabetic';
  }
  function alertBox(x, y, w, txt, t) {
    const on = Math.floor(t * 4) % 2 === 0;
    roundRect(x, y, w, 58, 14); ctx.fillStyle = on ? 'rgba(220,20,20,0.88)' : 'rgba(120,0,0,0.65)'; ctx.fill();
    fitFont(`! ${txt} !`, 800, 30, F_MONO, w - 30); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(`! ${txt} !`, x + w / 2, y + 40); ctx.textAlign = 'left';
  }
  function drawHUD(t, info) {
    const x = 34, y = 120, w = 600;
    ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    if (info.take === 'jogo') {
      const a = smooth(T.jogo.inicio, T.jogo.inicio + 0.4, t) * (1 - smooth(14.3, 14.6, t)); if (a <= 0) { ctx.restore(); return; }
      panel(x, y, w, 250, '#5dff7a', a);
      label(x + 26, y + 22, 'MODO JOGO', '#04120a', '#5dff7a');
      const hit = t - EV.jogoImpacto, life = hit < 0 ? 100 : 100 - 8 * smooth(0, 0.3, hit);
      ctx.font = `700 28px ${F_MONO}`; ctx.fillStyle = '#c9ffd3'; ctx.fillText('VIDA', x + 28, y + 112);
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x + 120, y + 90, w - 160, 26); ctx.fillStyle = '#4dff6e'; ctx.fillRect(x + 120, y + 90, (w - 160) * life / 100, 26);
      ctx.fillStyle = '#fff'; ctx.font = `800 26px ${F_MONO}`; ctx.fillText(`${Math.round(life)}%`, x + w - 120, y + 148);
      ctx.font = `700 28px ${F_MONO}`; ctx.fillStyle = '#c9ffd3'; ctx.fillText('VELOCIDADE:', x + 28, y + 160);
      ctx.font = `800 58px ${F_MONO}`; ctx.fillStyle = '#ffffff'; ctx.fillText(`${fmt(info.speed)} km/h`, x + 26, y + 222);
      if (hit > 0 && hit < 1.6) { const k = hit / 1.6; ctx.globalAlpha = a * (1 - k); ctx.font = `400 64px ${F_TITLE}`; ctx.fillStyle = '#ff4d4d'; ctx.strokeStyle = '#000'; ctx.lineWidth = 8; ctx.strokeText('-8', x + w - 140, y + 60 - k * 50); ctx.fillText('-8', x + w - 140, y + 60 - k * 50); }
      const ok = t - EV.jogoPouso;
      if (ok > 0.2 && t < 14.3) { ctx.globalAlpha = a * smooth(0.2, 0.5, ok); label(x, y + 268, 'MISSÃO CONTINUA ✔', '#04120a', '#ffd23f'); }
    } else if (info.take === 'realidade') {
      const a = smooth(T.realidade.inicio + 0.1, T.realidade.inicio + 0.5, t) * (1 - smooth(34.4, 34.7, t)); if (a <= 0) { ctx.restore(); return; }
      panel(x, y, w, 330, '#ff3b3b', a);
      label(x + 26, y + 22, 'MODO REALIDADE', '#fff', '#d81f2a');
      ctx.font = `700 28px ${F_MONO}`; ctx.fillStyle = '#ffd0d0'; ctx.fillText('VELOCIDADE:', x + 28, y + 112);
      ctx.font = `800 58px ${F_MONO}`; ctx.fillStyle = '#fff'; ctx.fillText(`${fmt(info.speed)} km/h`, x + 26, y + 172);
      const peak = info.s >= 0;
      ctx.font = `700 28px ${F_MONO}`; ctx.fillStyle = '#ffd0d0'; ctx.fillText(info.dist > 0.5 ? 'ARREMESSO DO CORPO:' : 'DESACELERAÇÃO:', x + 28, y + 222);
      const big = info.dist > 0.5 ? `${dec(info.dist, 1)} m` : `${peak ? fmt(info.g > 0 ? info.g : F.G_BATIDA) : 0} G`;
      ctx.font = `800 58px ${F_MONO}`; ctx.fillStyle = info.dist > 0.5 ? '#ffd23f' : peak ? '#ff4d3a' : '#6dff9a'; ctx.fillText(big, x + 26, y + 290);
      if (peak) { ctx.font = `700 24px ${F_MONO}`; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillText(`PICO ${fmt(F.G_BATIDA)} G  •  ${dec(F.DT, 2)} s`, x + 300, y + 112); }
      if (t >= T.realidade.impacto && t < T.realidade.impacto + 2.6) alertBox(x, y + 344, w, 'IMPACTO', t);
    } else if (info.take === 'rampa') {
      const a = smooth(T.rampa.inicio + 0.1, T.rampa.inicio + 0.5, t) * (1 - smooth(51.6, 52, t)); if (a <= 0) { ctx.restore(); return; }
      panel(x, y, w, 330, '#ffb347', a);
      label(x + 26, y + 22, 'SALTO DE RAMPA • REAL', '#1a0e00', '#ffb347');
      ctx.font = `700 28px ${F_MONO}`; ctx.fillStyle = '#ffe2b8'; ctx.fillText('ALTURA:', x + 28, y + 112);
      ctx.font = `800 58px ${F_MONO}`; ctx.fillStyle = '#fff'; ctx.fillText(`${dec(info.height, 1)} m`, x + 26, y + 172);
      const landed = info.sB > 0;
      ctx.font = `700 28px ${F_MONO}`; ctx.fillStyle = '#ffe2b8'; ctx.fillText(landed ? 'IMPACTO NO CHÃO:' : 'VELOCIDADE DE QUEDA:', x + 28, y + 222);
      const fall = info.vy < 0 ? -info.vy * 3.6 : 0;
      ctx.font = `800 58px ${F_MONO}`; ctx.fillStyle = landed ? '#ff4d3a' : '#fff'; ctx.fillText(landed ? `${fmt(F.G_POUSO)} G` : `${fmt(fall)} km/h`, x + 26, y + 290);
      if (landed) { ctx.font = `700 24px ${F_MONO}`; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillText(`QUEDA ${fmt(F.VFALL * 3.6)} km/h`, x + 330, y + 112); }
      if (landed && info.sB < 2.4) alertBox(x, y + 344, w, 'RODAS SOLTAS', t);
    }
    ctx.restore();
  }
  // selo de câmera lenta
  function drawSlowmo(t, info) {
    if (info.rate > 0.6) return;
    const f = Math.round(1 / info.rate), txt = `CÂMERA LENTA ${f}×`;
    ctx.save(); ctx.font = `800 30px ${F_MONO}`; const w = ctx.measureText(txt).width + 80, x = info.take === 'gancho' ? 34 : W - w - 34, y = info.take === 'gancho' ? 1470 : 120;
    roundRect(x, y, w, 56, 16); ctx.fillStyle = 'rgba(5,10,18,0.66)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = Math.floor(t * 2) % 2 ? '#ff3b3b' : '#ff8a8a'; ctx.fillRect(x + 22, y + 16, 8, 24); ctx.fillRect(x + 36, y + 16, 8, 24);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x + 58, y + 29); ctx.restore();
  }
  // texto final
  function drawEnd(t) {
    const a = smooth(53.0, 53.5, t) * (1 - smooth(57.6, 58.2, t)); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = '#000';
    const s = 1 + 0.05 * (1 - smooth(53, 53.6, t)); ctx.translate(W / 2, 330); ctx.scale(s, s);
    [['NA VIDA REAL,', '#ffffff'], ['NÃO EXISTE', '#ffffff'], ['RECOMEÇAR', '#ff3b3b']].forEach(([l, c], i) => { fitFont(l, 400, i === 2 ? 128 : 92, F_TITLE, 980); ctx.strokeText(l, 0, i * 112); ctx.fillStyle = c; ctx.fillText(l, 0, i * 112); });
    ctx.restore();
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
    const bubble = surprise > 0.4 ? '?!' : crouch > 0.6 ? '!!' : nod > 0.5 ? '¬¬' : mood > 1.5 ? '!!!' : mood > 0.6 ? '!' : null;
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
      const a = (f.inicio <= 0 ? 1 : smooth(f.inicio, f.inicio + 0.3, t)) * (f.fim >= DUR ? 1 : 1 - smooth(f.fim - 0.3, f.fim, t)); if (a <= 0) continue;
      const font = `600 58px ${F_SERIF}`, lines = wrapLines(f.legenda || f.texto, font, 940), lh = 74;
      const cy = (t < T.jogo.inicio ? 640 : 650) + (f.inicio <= 0 ? 0 : (1 - smooth(f.inicio, f.inicio + 0.45, t)) * 16);
      ctx.save(); ctx.globalAlpha = a; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 3; ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      lines.forEach((l, i) => { const yy = cy + (i - (lines.length - 1) / 2) * lh; ctx.strokeText(l, W / 2, yy); ctx.fillStyle = '#fff'; ctx.fillText(l, W / 2, yy); });
      ctx.restore();
    }
  }
  // glitch digital nas trocas de "modo" (fatias deslocadas + separação RGB + scanlines)
  function glitch(t) {
    let g = 0; for (const [a, b] of T.glitches || []) if (t >= a && t <= b) g = Math.max(g, Math.sin(Math.PI * (t - a) / (b - a)));
    if (g <= 0.02) return;
    const fr = Math.floor(t * FPS);
    tctx.clearRect(0, 0, W, H); tctx.drawImage(comp, 0, 0);
    const n = 14;
    for (let i = 0; i < n; i++) {
      const y = Math.floor(hash(fr * 31 + i) * H), h = 8 + Math.floor(hash(fr * 17 + i) * 120), dx = (hash(fr * 7 + i) - 0.5) * 160 * g;
      ctx.drawImage(tmp, 0, y, W, h, dx, y, W, h);
    }
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.45 * g;
    ctx.drawImage(tmp, 12 * g, 0); ctx.fillStyle = 'rgba(255,0,80,0.25)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.18 * g; ctx.fillStyle = '#000';
    for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
    ctx.restore();
    if (t > 14 && t < 15.3) { ctx.save(); ctx.globalAlpha = g; ctx.textAlign = 'center'; ctx.font = `800 56px ${F_MONO}`; ctx.fillStyle = '#ff3b3b'; ctx.strokeStyle = '#000'; ctx.lineWidth = 8; const tx = 'MODO REALIDADE: ATIVADO'; fitFont(tx, 800, 56, F_MONO, 1000); ctx.strokeText(tx, W / 2, H * 0.42); ctx.fillText(tx, W / 2, H * 0.42); ctx.restore(); }
  }
  function effects(t, info) {
    // flash no impacto real e no pouso
    for (const [t0, k] of [[T.realidade.impacto, 0.55], [EV.jogoImpacto, 0.25], [T.rampa.pouso, 0.45], [EV.ganchoImpacto, 0.5]]) { const d = t - t0; if (d >= 0 && d < 0.3) { ctx.fillStyle = `rgba(255,255,255,${k * (1 - d / 0.3)})`; ctx.fillRect(0, 0, W, H); } }
    // vinheta dramática em câmera lenta
    const slow = clamp((0.6 - info.rate) / 0.5);
    if (slow > 0) { const vg = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.3, W / 2, H * 0.55, Math.max(W, H) * 0.62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.55 * slow})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); }
    const lp = smooth(DUR - 0.5, DUR, t); if (lp > 0) { ctx.fillStyle = `rgba(0,0,0,${0.55 * lp})`; ctx.fillRect(0, 0, W, H); }
  }

  function renderFrame(t) {
    t = clamp(t, 0, DUR - 1e-6);
    const { canvas, info } = scene3d.renderFrame(t);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(canvas, 0, 0, W, H);
    effects(t, info);
    drawTitle(t);
    drawHUD(t, info);
    drawSlowmo(t, info);
    drawEnd(t);
    drawMascot(t);
    drawBadge(t);
    drawSubtitles(t);
    glitch(t);
    return comp;
  }
  return { canvas: comp, renderFrame, frameJPEG: (t, q = 0.92) => { renderFrame(t); return comp.toDataURL('image/jpeg', q); } };
}
