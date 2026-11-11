// ============================================================================
//  Compilação "7 simulações do Projeto E se?" — compositor 16:9 (1920x1080)
//  Junta o Laboratório + O Interrogador + as 7 simulações + HUD/legendas.
//  renderFrame(T) é função pura do tempo global T ∈ [0, 600) s.
// ============================================================================
import { createInterrogador, moodColor } from './interrogador.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const fmt = (v) => String(Math.max(0, Math.round(v))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const dec = (v, d = 1) => v.toFixed(d).replace('.', ',');
const OLD_OFFSET = 8;   // as simulações antigas (Terra/Sol/Lua) começam no segundo 8 da linha do tempo original

const F_TITLE = '"Anton", "Impact", "Arial Black", "DejaVu Sans", sans-serif';
const F_SERIF = '"Playfair Display", "DejaVu Serif", Georgia, serif';
const F_MONO = '"Roboto Mono", "DejaVu Sans Mono", "Courier New", monospace';

export function blockAt(cfg, T) {
  let s = 0;
  for (let i = 0; i < cfg.blocos.length; i++) { const d = cfg.blocos[i].dur; if (T < s + d || i === cfg.blocos.length - 1) return { b: i, tau: T - s, start: s }; s += d; }
  return { b: 0, tau: 0, start: 0 };
}
export function blockStart(cfg, b) { let s = 0; for (let i = 0; i < b; i++) s += cfg.blocos[i].dur; return s; }

export async function createCompilation({ cfg, base = '.', blocks = null, envelope = null }) {
  const W = cfg.largura || 1920, H = cfg.altura || 1080, INTRO = cfg.intro || 15, Q = cfg.qualidade3d || 1;
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const ctx = comp.getContext('2d');
  const mascot = await createInterrogador({ width: W, height: H, quality: Math.max(Q, 0.75), corner: 520, levels: cfg.blocos });

  // ------------------------------------------------------------ simulações (carregadas sob demanda)
  const sims = {};
  async function loadSim(b) {
    const B = cfg.blocos[b];
    if (!B.hud || sims[b]) return sims[b];
    let app, mod, offset = 0;
    if (B.modulo) {
      mod = await import(`../niveis/${B.modulo}.js`);
      const script = await (await fetch(`${base}/niveis/${B.modulo}.json`)).json();
      app = await mod.createApp({ quality: Q, script, width: W, height: H, fov: 55, overlays: false });
      offset = OLD_OFFSET;
    } else {
      mod = await import('../niveis/cidade.js');
      app = await mod.createApp({ level: B.nivel, width: W, height: H, quality: Q, fov: 55 });
    }
    sims[b] = { app, mod, offset };
    return sims[b];
  }
  const wanted = blocks || cfg.blocos.map((_, i) => i);
  for (const b of wanted) await loadSim(b);

  // ------------------------------------------------------------ envelope da voz (sincroniza lente/LEDs do mascote)
  const fps = cfg.fps || 30;
  function talkAt(T) {
    if (envelope && envelope.length) { const i = Math.floor(T * fps); return clamp(envelope[Math.min(envelope.length - 1, Math.max(0, i))] || 0); }
    const { b, tau } = blockAt(cfg, T);
    for (const f of cfg.blocos[b].frases) if (tau >= f.inicio && tau <= f.fim) return 0.35 + 0.65 * Math.abs(Math.sin(T * 13) * Math.sin(T * 5.3 + 1));
    return 0;
  }
  function moodAt(B, u) {
    const [a, p] = B.humor || [8, 25];
    return smooth(a - 1, a + 1, u) + smooth(p - 1.5, p + 1.5, u);
  }
  function surpriseAt(B, u) {
    let s = 0; for (const t0 of B.sustos || []) { const d = u - t0; if (d > -0.15 && d < 2) s = Math.max(s, d < 0 ? (d + 0.15) / 0.15 : Math.exp(-d * 3)); }
    return s;
  }

  // ------------------------------------------------------------ HUD por nível
  function hudValues(B, sim, u) {
    const t = u + sim.offset, m = sim.mod;
    switch (B.hud) {
      case 'oxigenio': { const o = m.oxygenAt(u), c = m.noO2Clock(u); return [['OXIGÊNIO', `${dec(o)}%`, o < 1], ['TEMPO SEM O₂', `${dec(c)} s / 5,0 s`, c > 0 && c < 5], u > 10 && u < 44 ? 'CÂMERA LENTA 7x' : null]; }
      case 'terra': return [['ROTAÇÃO DA TERRA', `${fmt(m.rotationAt(t))} KM/H`, m.rotationAt(t) < 500], ['VENTO', `${fmt(m.windAt(t))} KM/H`, m.windAt(t) > 1235], m.windAt(t) > 1235 && t < 65 ? 'BARREIRA DO SOM ROMPIDA' : null];
      case 'calor': { const c = m.heatAt(u); return [['TEMPERATURA', `${fmt(c)} °C`, c > 400], ['AQUECIMENTO', `+10 °C/s • ${Math.floor(m.heatClock(u))} s`, false], c > 1000 ? 'AÇO E CONCRETO DERRETENDO' : c > 400 ? 'COMBUSTÃO ESPONTÂNEA' : null]; }
      case 'gravidade': { const g = m.gravityAt(u); return [['GRAVIDADE', `${g < 10 ? dec(g) : fmt(g)} G`, g > 10], ['PESO DE UMA PESSOA (70 KG)', `${fmt(70 * g)} KG`, g > 10], g > 15 ? 'COLAPSO ESTRUTURAL' : null]; }
      case 'sol': { const tl = m.timeLabel(t); return [['TEMPERATURA', `${Math.round(m.tempAt(t))} °C`, m.tempAt(t) < -100], ['TEMPO', tl.value, false], t > 38.4 && t < 44.6 ? 'REDE ELÉTRICA EM COLAPSO' : t > 52 && t < 64.8 ? 'OXIGÊNIO LÍQUIDO CAINDO' : null]; }
      case 'lua': { const d = m.moonDistance(t), br = t >= 39.3; return [['DISTÂNCIA DA LUA', br ? 'LUA EM PEDAÇOS' : `${fmt(d)} KM`, d < 60000], ['MARÉ', m.tideAt(t) < 0.3 ? 'NORMAL' : `+${dec(m.tideAt(t))} M`, m.tideAt(t) > 3], t > 50 ? 'CHUVA DE METEOROS' : t > 37.6 ? 'LIMITE DE ROCHE ATINGIDO' : null]; }
      case 'buraco': { const pull = smooth(44, 61, u), dist = 94 * (1 - Math.pow(pull, 1.6)); return [['BURACO NEGRO', '2 CM | MASSA: 1 TERRA', false], ['DISTÂNCIA DO HORIZONTE', `${fmt(dist)} M`, dist < 50], u > 20 ? 'ESPAGUETIFICAÇÃO' : u > 3 ? 'SINGULARIDADE DETECTADA' : null]; }
      default: return null;
    }
  }

  // ------------------------------------------------------------ desenho 2D
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fitFont(text, weight, size, family, maxW) { let s = size; ctx.font = `${weight} ${s}px ${family}`; while (ctx.measureText(text).width > maxW && s > 14) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; } }
  function wrapLines(text, font, maxW) { ctx.font = font; const out = []; let line = ''; for (const w of String(text).split(' ')) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } out.push(line); return out; }

  function drawBadge(T, b) {
    const B = cfg.blocos[b];
    const right = B.nivel >= 1 && B.nivel <= 7 ? `NÍVEL ${B.nivel}/7` : b === 0 ? 'COMPILAÇÃO • 7 SIMULAÇÕES' : 'ENCERRAMENTO';
    const txt = `${cfg.projeto || 'PROJETO E SE?'}  |  ${right}`;
    ctx.save(); ctx.font = `700 24px ${F_MONO}`;
    const bw = ctx.measureText(txt).width + 72, bh = 46, bx = (W - bw) / 2, by = 24;
    roundRect(bx, by, bw, bh, 23); ctx.fillStyle = 'rgba(8,12,20,0.6)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.stroke();
    ctx.fillStyle = `rgba(255,59,59,${0.55 + 0.45 * Math.abs(Math.sin(T * Math.PI))})`; ctx.beginPath(); ctx.arc(bx + 28, by + bh / 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx + 48, by + bh / 2 + 1);
    ctx.restore();
  }
  function drawProgress(b, mood) {
    const cur = cfg.blocos[b].nivel;
    ctx.save(); const x0 = W - 40 - 7 * 46, y0 = 26;
    for (let i = 1; i <= 7; i++) {
      const x = x0 + (i - 1) * 46, done = cur > i || b === 8, now = cur === i;
      roundRect(x, y0, 38, 42, 9);
      ctx.fillStyle = now ? `#${moodColor(mood).getHexString()}` : done ? 'rgba(255,255,255,0.28)' : 'rgba(8,12,20,0.55)'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke();
      ctx.fillStyle = now ? '#05070c' : '#ffffff'; ctx.font = `800 22px ${F_MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i), x + 19, y0 + 22);
    }
    ctx.restore();
  }
  function drawHUD(B, sim, u, mood) {
    const v = hudValues(B, sim, u); if (!v) return;
    const a = smooth(0.3, 1.2, u) * (1 - smooth(63.5, 64.6, u)); if (a <= 0) return;
    const x = 36, y = 92, w = 640, h = 232;
    ctx.save(); ctx.globalAlpha = a;
    roundRect(x, y, w, h, 20); ctx.fillStyle = 'rgba(5,10,18,0.62)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();
    ctx.fillStyle = `#${moodColor(mood).getHexString()}`; ctx.fillRect(x, y + 14, 6, h - 28);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = `700 20px ${F_MONO}`; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText(`NÍVEL ${B.nivel} • ${B.titulo.toUpperCase()}`, x + 26, y + 34);
    [[v[0], 82], [v[1], 172]].forEach(([[label, val, hot], yy]) => {
      ctx.font = `700 22px ${F_MONO}`; ctx.fillStyle = '#9fe3ff'; ctx.fillText(`${label}:`, x + 26, y + yy - 6);
      fitFont(val, 800, 50, F_MONO, w - 52); ctx.fillStyle = hot ? '#ff5a4a' : '#ffffff'; ctx.fillText(val, x + 26, y + yy + 46);
    });
    if (v[2]) {
      const on = Math.floor(u * 4) % 2 === 0;
      roundRect(x, y + h + 12, w, 50, 12); ctx.fillStyle = on ? 'rgba(220,20,20,0.85)' : 'rgba(120,0,0,0.6)'; ctx.fill();
      fitFont(`! ${v[2]} !`, 800, 26, F_MONO, w - 30); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(`! ${v[2]} !`, x + w / 2, y + h + 46);
    }
    ctx.restore();
  }
  function drawCorner(T, B, u, talk) {
    const mood = moodAt(B, u), panic = clamp(mood - 1), surprise = surpriseAt(B, u);
    const a = smooth(0.2, 1.0, u) * (1 - smooth(64.2, 65, u)); if (a <= 0) return;
    const c = mascot.renderCorner(T, { talk, mood, surprise, panic });
    const cx = W - 250, cy = H - 250, r = 205;
    ctx.save(); ctx.globalAlpha = a;
    const col = `#${moodColor(mood).getHexString()}`;
    const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, r); g.addColorStop(0, 'rgba(10,30,50,0.55)'); g.addColorStop(1, 'rgba(5,10,18,0.15)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(T * 4)); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = a; ctx.setLineDash([10, 14]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r + 12, T * 0.6, T * 0.6 + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.drawImage(c, cx - 260, cy - 285, 520, 520);
    // etiqueta + balão de reação
    roundRect(cx - 120, cy + r - 26, 240, 40, 12); ctx.fillStyle = 'rgba(5,10,18,0.8)'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `800 20px ${F_MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('O INTERROGADOR', cx, cy + r - 5);
    const bubble = surprise > 0.4 ? '?!' : panic > 0.5 ? '!!!' : mood > 0.6 ? '!' : null;
    if (bubble) {
      const bx = cx - 175, by = cy - 175, s = 1 + 0.15 * surprise;
      ctx.save(); ctx.translate(bx, by); ctx.scale(s, s);
      roundRect(-48, -34, 96, 68, 18); ctx.fillStyle = col; ctx.fill();
      ctx.beginPath(); ctx.moveTo(20, 30); ctx.lineTo(40, 58); ctx.lineTo(36, 28); ctx.fill();
      ctx.fillStyle = '#05070c'; ctx.font = `400 46px ${F_TITLE}`; ctx.fillText(bubble, 0, 2); ctx.restore();
    }
    ctx.restore();
  }
  function drawSubtitles(B, tau, inSim) {
    for (const f of B.frases) {
      if (tau < f.inicio - 0.05 || tau > f.fim + 0.05) continue;
      const a = smooth(f.inicio, f.inicio + 0.3, tau) * (1 - smooth(f.fim - 0.3, f.fim, tau)); if (a <= 0) continue;
      const font = `600 46px ${F_SERIF}`, maxW = inSim ? 1120 : 1500, cx = inSim ? 820 : W / 2;
      const lines = wrapLines(f.texto, font, maxW), lh = 60, y0 = H - 70 - (lines.length - 1) * lh;
      ctx.save(); ctx.globalAlpha = a; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      lines.forEach((l, i) => { ctx.strokeText(l, cx, y0 + i * lh); ctx.fillStyle = '#fff'; ctx.fillText(l, cx, y0 + i * lh); });
      ctx.restore();
    }
  }
  function drawLevelCard(B, u) {
    const a = smooth(0, 0.35, u) * (1 - smooth(3.4, 4.2, u)); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const s = 1.1 - 0.1 * smooth(0, 4, u); ctx.translate(W / 2, H * 0.42); ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = '#000';
    ctx.font = `400 130px ${F_TITLE}`; ctx.strokeText(`NÍVEL ${B.nivel}`, 0, -60); ctx.fillStyle = '#ffd23f'; ctx.fillText(`NÍVEL ${B.nivel}`, 0, -60);
    fitFont(B.titulo.toUpperCase(), 400, 84, F_TITLE, 1500); ctx.strokeText(B.titulo.toUpperCase(), 0, 60); ctx.fillStyle = '#fff'; ctx.fillText(B.titulo.toUpperCase(), 0, 60);
    ctx.restore();
  }
  function drawLowerThird(B, tau, b) {
    const a = smooth(0.6, 1.2, tau) * (1 - smooth(5.5, 6.3, tau)); if (a <= 0) return;
    const t1 = b === 0 ? 'LABORATÓRIO • PROJETO E SE?' : b === 8 ? 'FIM DOS TESTES' : `NÍVEL ${B.nivel} DE 7`;
    const t2 = b === 0 ? 'Apresentação: O Interrogador' : b === 8 ? 'Qual nível você aguentaria?' : B.titulo;
    ctx.save(); ctx.globalAlpha = a; const x = 70 - (1 - smooth(0.6, 1.2, tau)) * 60, y = H - 260;
    ctx.fillStyle = 'rgba(58,215,255,0.95)'; ctx.fillRect(x, y, 10, 108);
    roundRect(x + 18, y, 700, 108, 10); ctx.fillStyle = 'rgba(5,10,18,0.72)'; ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#9fe8ff'; ctx.font = `800 26px ${F_MONO}`; ctx.fillText(t1, x + 42, y + 40);
    fitFont(t2, 400, 46, F_TITLE, 660); ctx.fillStyle = '#fff'; ctx.fillText(t2, x + 42, y + 90);
    ctx.restore();
  }
  function drawEndCard(tau) {
    const a = smooth(4.2, 5, tau); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const pulse = 1 + 0.05 * Math.sin(tau * 6);
    ctx.translate(W - 330, 300); ctx.scale(pulse, pulse);
    roundRect(-220, -48, 440, 96, 20); ctx.fillStyle = '#e62117'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `400 50px ${F_TITLE}`; ctx.fillText('INSCREVA-SE', 0, 4);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
    roundRect(W - 560, 400, 460, 120, 18); ctx.fillStyle = 'rgba(5,10,18,0.75)'; ctx.fill(); ctx.strokeStyle = 'rgba(58,215,255,0.9)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#9fe8ff'; ctx.font = `800 24px ${F_MONO}`; ctx.fillText('COMENTE:', W - 330, 446);
    ctx.fillStyle = '#fff'; ctx.font = `400 34px ${F_TITLE}`; ctx.fillText('QUAL NÍVEL VOCÊ AGUENTARIA?', W - 330, 492);
    ctx.restore();
  }
  function glitch(T, k) {
    if (k <= 0) return;
    const f = Math.floor(T * 30);
    ctx.save();
    for (let i = 0; i < 14; i++) {
      const y = hash(f * 7 + i) * H, h = 6 + hash(f * 3 + i) * 60, dx = (hash(f * 11 + i) - 0.5) * 160 * k;
      ctx.drawImage(comp, 0, y, W, h, dx, y, W, h);
      if (i % 3 === 0) { ctx.fillStyle = `rgba(${hash(i + f) > 0.5 ? '58,215,255' : '255,60,90'},${0.25 * k})`; ctx.fillRect(0, y, W, h); }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ quadro final
  function renderFrame(T) {
    const { b, tau } = blockAt(cfg, T);
    const B = cfg.blocos[b];
    const talk = talkAt(T);
    const inSim = !!B.hud && tau >= INTRO;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    let mood = 0;
    if (!inSim) {
      const c = mascot.renderLab(T, { level: b === 0 ? 0 : b === 8 ? 8 : B.nivel, tau, talk, mood: 0, surprise: b === 8 && tau < 0.6 ? 1 - tau / 0.6 : 0 });
      ctx.drawImage(c, 0, 0, W, H);
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.6); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      drawLowerThird(B, tau, b);
      if (b === 8) drawEndCard(tau);
    } else {
      const u = tau - INTRO, sim = sims[b];
      mood = moodAt(B, u);
      const c = sim.app.renderFrame(u + sim.offset);
      ctx.drawImage(c, 0, 0, W, H);
      drawHUD(B, sim, u, mood);
      drawCorner(T, B, u, talk);
      drawLevelCard(B, u);
    }
    drawBadge(T, b);
    drawProgress(b, mood);
    drawSubtitles(B, tau, inSim);
    // transições
    if (B.hud) glitch(T, Math.max(0, 1 - Math.abs(tau - INTRO) / 0.45));
    if (B.hud && Math.abs(tau - INTRO) < 0.2) { ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - Math.abs(tau - INTRO) / 0.2)})`; ctx.fillRect(0, 0, W, H); }
    const fin = smooth(0, 0.45, tau); if (fin < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - fin})`; ctx.fillRect(0, 0, W, H); }
    if (!inSim) { const fo = smooth(B.dur - 0.4, B.dur, tau); if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, W, H); } }
    return comp;
  }
  return { canvas: comp, renderFrame, loadSim, frameJPEG: (T, q = 0.92) => { renderFrame(T); return comp.toDataURL('image/jpeg', q); } };
}
