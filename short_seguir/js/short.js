// ============================================================================
//  Short 9:16 "E se você me seguisse agora?" (TikTok) / "E se você se inscrevesse agora?" (YouTube)
//  Projeto E se? • Experimento #010 — o "seguir" como experimento do Interrogador.
//  Fundo: laboratório 3D com o mascote (compilacao/js/interrogador.js). Por cima, motion design
//  2D: botão gigante, toque, pulso de luz dando a volta na Terra, odômetro, vitrine dos experimentos,
//  enquete A/B/C (token de comentário) e seta para o botão real de cada app. Função pura do tempo.
// ============================================================================
import { createInterrogador, moodColor } from '../../compilacao/js/interrogador.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const lerp = (a, b, u) => a + (b - a) * u;
const easeOutBack = (u) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const interp = (pts, t) => { for (let i = 0; i < pts.length - 1; i++) { const [a, va] = pts[i], [b, vb] = pts[i + 1]; if (t <= b) return va + (vb - va) * smooth(a, b, t); } return pts[pts.length - 1][1]; };
const F_TITLE = '"Anton", "Impact", "Arial Black", "DejaVu Sans", sans-serif';
const F_SERIF = '"Playfair Display", "DejaVu Serif", Georgia, serif';
const F_MONO = '"Roboto Mono", "DejaVu Sans Mono", "Courier New", monospace';
const PINK = '#ff2e63', CYAN = '#3ad7ff', GOLD = '#ffd23f';

export async function createShort({ cfg, envelope = null, imgs = {} }) {
  const W = cfg.largura || 1080, H = cfg.altura || 1920, DUR = cfg.duracao || 40, FPS = cfg.fps || 30, T = cfg.tempos;
  const YT = cfg.plataforma === 'youtube';
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const ctx = comp.getContext('2d');
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tctx = tmp.getContext('2d');
  const lab = await createInterrogador({ width: W, height: H, quality: cfg.qualidade3d || 0.8, corner: 400, levels: [] });

  const talkAt = (t) => { if (envelope && envelope.length) return clamp(envelope[Math.min(envelope.length - 1, Math.max(0, Math.floor(t * FPS)))] || 0); for (const f of cfg.frases) if (t >= f.inicio && t <= f.fim) return 0.35 + 0.65 * Math.abs(Math.sin(t * 13) * Math.sin(t * 5.3 + 1)); return 0; };
  const surpriseAt = (t) => { let s = 0; for (const t0 of cfg.sustos || []) { const d = t - t0; if (d > -0.15 && d < 2) s = Math.max(s, d < 0 ? (d + 0.15) / 0.15 : Math.exp(-d * 3)); } return s; };

  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fitFont(text, weight, size, family, maxW) { let s = size; ctx.font = `${weight} ${s}px ${family}`; while (ctx.measureText(text).width > maxW && s > 14) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; } return s; }
  function wrapLines(text, font, maxW) { ctx.font = font; const out = []; let line = ''; for (const w of String(text).split(' ')) { const tt = line ? line + ' ' + w : w; if (ctx.measureText(tt).width > maxW && line) { out.push(line); line = w; } else line = tt; } out.push(line); return out; }
  function title(lines, y, a, sizes, colors, scale = 1) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, y); ctx.scale(scale, scale); ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = '#000'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
    let yy = 0; lines.forEach((l, i) => { fitFont(l, 400, sizes[i], F_TITLE, 990); ctx.strokeText(l, 0, yy); ctx.fillStyle = colors[i]; ctx.fillText(l, 0, yy); yy += sizes[i] * 1.1; });
    ctx.restore();
  }

  function drawBadge(t) {
    const txt = `${cfg.projeto}  |  EXPERIMENTO #${cfg.experimento}`;
    ctx.save(); ctx.font = `700 25px ${F_MONO}`;
    const bw = ctx.measureText(txt).width + 76, bh = 50, bx = (W - bw) / 2, by = 36;
    roundRect(bx, by, bw, bh, 25); ctx.fillStyle = 'rgba(8,12,20,0.55)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.stroke();
    ctx.fillStyle = `rgba(255,59,59,${0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI))})`; ctx.beginPath(); ctx.arc(bx + 30, by + bh / 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx + 50, by + bh / 2 + 1);
    ctx.restore();
  }

  // ---------------------------------------------------------------- botão gigante + dedo
  const BTN = { x: W / 2, y: 1260, w: YT ? 680 : 600, h: 150 };
  function drawButton(t) {
    const show = smooth(0, 0.35, t) * (1 - smooth(T.sinal[0] - 0.2, T.sinal[0] + 0.2, t)) + smooth(DUR - 1.4, DUR - 0.9, t);
    if (show <= 0.01) return;
    const pressed = t >= T.toque && t < DUR - 1.5;
    const press = Math.exp(-Math.max(0, t - T.toque) * 9) * (t >= T.toque ? 1 : 0);
    const pop = easeOutBack(clamp(t / 0.45)) * (t < 1 ? 1 : 1) ;
    const pulse = pressed ? 1 : 1 + 0.035 * Math.sin(t * 7);
    const s = (t < 1 ? pop : 1) * pulse * (1 - 0.1 * press) * (t > DUR - 1.4 ? easeOutBack(clamp((t - (DUR - 1.4)) / 0.45)) : 1);
    ctx.save(); ctx.globalAlpha = clamp(show); ctx.translate(BTN.x, BTN.y); ctx.scale(s, s);
    // sombra / profundidade
    const depth = 16 * (1 - press);
    roundRect(-BTN.w / 2, -BTN.h / 2 + depth, BTN.w, BTN.h, 75); ctx.fillStyle = pressed ? '#1f5f38' : (YT ? '#8a0f16' : '#8a0f2e'); ctx.fill();
    const g = ctx.createLinearGradient(0, -BTN.h / 2, 0, BTN.h / 2);
    if (pressed) { g.addColorStop(0, '#46e08a'); g.addColorStop(1, '#22a85c'); } else if (YT) { g.addColorStop(0, '#ff4a4a'); g.addColorStop(1, '#d81f26'); } else { g.addColorStop(0, '#ff5a86'); g.addColorStop(1, PINK); }
    roundRect(-BTN.w / 2, -BTN.h / 2 + 16 - depth * 0 - 16 + (16 - depth), BTN.w, BTN.h, 75); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke();
    // brilho correndo
    if (!pressed) { const sx = ((t * 0.7) % 1.6 - 0.3) * BTN.w - BTN.w / 2; ctx.save(); roundRect(-BTN.w / 2, -BTN.h / 2 + (16 - depth), BTN.w, BTN.h, 75); ctx.clip(); const sh = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.45)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sh; ctx.fillRect(-BTN.w / 2, -BTN.h / 2, BTN.w, BTN.h + 20); ctx.restore(); }
    const label = pressed ? cfg.botao_ok : cfg.botao;
    fitFont(label, 400, 84, F_TITLE, BTN.w - 120); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 8; ctx.fillText(label, YT && !pressed ? 34 : 0, 8 + (16 - depth));
    if (YT && !pressed) drawBell(-BTN.w / 2 + 92, 8 + (16 - depth), 36, '#fff');
    ctx.restore();
    // ondas de choque no toque
    if (t >= T.toque && t < T.toque + 1.2) for (let k = 0; k < 3; k++) { const d = t - T.toque - k * 0.12; if (d <= 0) continue; const r = 80 + 900 * d * (1 - 0.3 * d); ctx.save(); ctx.globalAlpha = 0.5 * Math.max(0, 1 - d / 1.0); ctx.strokeStyle = pressed ? '#46e08a' : PINK; ctx.lineWidth = 10 - 3 * k; ctx.beginPath(); ctx.ellipse(BTN.x, BTN.y, r, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  }
  function drawBell(x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-s * 0.45, s * 0.35); ctx.quadraticCurveTo(-s * 0.45, -s * 0.45, 0, -s * 0.5); ctx.quadraticCurveTo(s * 0.45, -s * 0.45, s * 0.45, s * 0.35); ctx.lineTo(s * 0.55, s * 0.45); ctx.lineTo(-s * 0.55, s * 0.45); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(0, s * 0.55, s * 0.13, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function drawHand(x, y, s, a, tap) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s * (1 - 0.08 * tap), s * (1 - 0.08 * tap)); ctx.rotate(-0.35);
    ctx.fillStyle = '#ffd9c2'; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-18, 110); ctx.quadraticCurveTo(-60, 100, -62, 140); ctx.quadraticCurveTo(-40, 200, 0, 250); ctx.lineTo(95, 250); ctx.quadraticCurveTo(120, 190, 118, 140); ctx.lineTo(118, 115); ctx.quadraticCurveTo(116, 95, 96, 96); ctx.quadraticCurveTo(92, 78, 70, 82); ctx.quadraticCurveTo(64, 66, 42, 72); ctx.lineTo(42, 0); ctx.quadraticCurveTo(42, -30, 12, -30); ctx.quadraticCurveTo(-18, -30, -18, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(42, 72); ctx.lineTo(42, 120); ctx.moveTo(70, 82); ctx.lineTo(70, 122); ctx.moveTo(96, 96); ctx.lineTo(96, 128); ctx.stroke();
    ctx.restore();
  }
  function drawFinger(t) {
    if (t > T.toque + 1.0 && t < DUR - 1.4) return;
    let k, x, y, a, tap = 0;
    if (t < T.toque + 1.0) {
      const hover = smooth(0.3, 0.9, t) * (1 - smooth(T.toque + 0.5, T.toque + 1.0, t));
      const go = smooth(T.toque - 0.8, T.toque, t);
      x = lerp(BTN.x + 230 + 14 * Math.sin(t * 2.4), BTN.x + 40, go); y = lerp(BTN.y + 160 + 12 * Math.sin(t * 3.1), BTN.y + 20, go) + (t > T.toque ? 60 * smooth(T.toque + 0.15, T.toque + 0.7, t) : 0);
      tap = Math.exp(-Math.abs(t - T.toque) * 14); a = hover;
    } else { k = smooth(DUR - 1.3, DUR - 0.6, t); x = BTN.x + 230 + 14 * Math.sin(t * 2.4); y = BTN.y + 160; a = k; }
    drawHand(x, y, 0.9, a, tap);
    if (tap > 0.2) { ctx.save(); ctx.globalAlpha = tap * 0.8; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 6, y - 26, 30 * (1.5 - tap), 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }

  // ---------------------------------------------------------------- pulso de luz até a Terra (holograma)
  const EARTH = { x: W / 2, y: 520, r: 300 };
  function drawSignal(t) {
    const [a, b] = T.sinal; if (t < a - 0.1 || t > b + 0.4) return;
    const k = clamp((t - a) / (b - a)), fade = 1 - smooth(b, b + 0.4, t);
    // trajeto: sobe do botão até a Terra e dá uma volta em elipse
    const pt = (u) => {
      if (u < 0.3) { const v = u / 0.3; const x = lerp(BTN.x, EARTH.x + EARTH.r, v) + 120 * Math.sin(Math.PI * v); const y = lerp(BTN.y, EARTH.y, v * v * (3 - 2 * v)); return [x, y]; }
      const v = (u - 0.3) / 0.7, ang = v * Math.PI * 2; return [EARTH.x + Math.cos(ang) * EARTH.r, EARTH.y - Math.sin(ang) * EARTH.r * 0.38];
    };
    ctx.save(); ctx.globalAlpha = fade; ctx.globalCompositeOperation = 'lighter';
    const head = smooth(0, 1, k);
    for (let i = 60; i >= 0; i--) { const u = Math.max(0, head - i * 0.006); const [x, y] = pt(u); const al = (1 - i / 60) ** 2; ctx.fillStyle = `rgba(90,220,255,${0.6 * al})`; ctx.beginPath(); ctx.arc(x, y, 14 * al + 3, 0, Math.PI * 2); ctx.fill(); }
    const [hx, hy] = pt(head); const gl = ctx.createRadialGradient(hx, hy, 0, hx, hy, 70); gl.addColorStop(0, 'rgba(255,255,255,1)'); gl.addColorStop(0.3, 'rgba(120,230,255,0.8)'); gl.addColorStop(1, 'rgba(58,215,255,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(hx, hy, 70, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // cronômetro do sinal: em tempo real seria ~0,1 s (mostramos em câmera lenta)
    ctx.save(); ctx.globalAlpha = fade * smooth(a, a + 0.4, t);
    const ms = Math.round(100 * head);
    roundRect(W / 2 - 250, 980, 500, 170, 26); ctx.fillStyle = 'rgba(5,12,22,0.72)'; ctx.fill(); ctx.strokeStyle = 'rgba(58,215,255,0.6)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#9fe8ff'; ctx.font = `700 28px ${F_MONO}`; ctx.fillText('VOLTA AO MUNDO • CÂMERA LENTA', W / 2, 1025);
    ctx.font = `800 80px ${F_MONO}`; ctx.fillStyle = '#fff'; ctx.fillText(`0,${String(ms).padStart(3, '0')} s`, W / 2, 1115);
    ctx.font = `700 24px ${F_MONO}`; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText('LUZ NA FIBRA ÓPTICA ≈ 200.000 km/s', W / 2, 1185);
    ctx.restore();
  }

  // ---------------------------------------------------------------- odômetro + confete
  function drawCounter(t) {
    const t0 = T.contador; const a = smooth(13.3, 13.7, t) * (1 - smooth(17.7, 18.1, t)); if (a <= 0) return;
    const s = easeOutBack(clamp((t - 13.3) / 0.45));
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, 1210); ctx.scale(s, s);
    roundRect(-380, -150, 760, 300, 40); ctx.fillStyle = 'rgba(5,12,22,0.82)'; ctx.fill(); ctx.strokeStyle = YT ? '#ff4a4a' : PINK; ctx.lineWidth = 5; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `800 34px ${F_MONO}`; ctx.fillText(cfg.contador_rotulo, 0, -95);
    const roll = smooth(t0, t0 + 0.6, t);
    if (cfg.contador_de != null) {
      const from = String(cfg.contador_de), to = String(cfg.contador_de + 1), n = Math.max(from.length, to.length), cw = 120;
      ctx.save(); roundRect(-n * cw / 2 - 10, -60, n * cw + 20, 170, 20); ctx.clip();
      for (let i = 0; i < n; i++) {
        const d0 = from.padStart(n)[i], d1 = to.padStart(n)[i], x = (i - (n - 1) / 2) * cw;
        roundRect(x - cw / 2 + 6, -55, cw - 12, 160, 16); ctx.fillStyle = '#121a26'; ctx.fill();
        ctx.font = `400 140px ${F_TITLE}`; ctx.fillStyle = '#fff';
        if (d0 === d1) ctx.fillText(d0, x, 75); else { const off = -roll * 170; ctx.fillText(d0, x, 75 + off); ctx.fillStyle = GOLD; ctx.fillText(d1, x, 75 + 170 + off); }
      }
      ctx.restore();
    } else {
      const k = easeOutBack(clamp((t - t0) / 0.5)); ctx.save(); ctx.scale(k, k); ctx.font = `400 170px ${F_TITLE}`; ctx.fillStyle = GOLD; ctx.lineWidth = 12; ctx.strokeStyle = '#000'; ctx.strokeText('+1', 0, 80); ctx.fillText('+1', 0, 80); ctx.restore();
    }
    ctx.restore();
    // confete
    const d = t - t0; if (d > 0 && d < 3) {
      ctx.save();
      for (let i = 0; i < 160; i++) {
        const ang = -Math.PI / 2 + (hash(i) - 0.5) * 2.4, v = 700 + 900 * hash(i + 1), x = W / 2 + Math.cos(ang) * v * d * 0.8, y = 1210 + Math.sin(ang) * v * d + 900 * d * d;
        if (y > H + 40) continue;
        ctx.save(); ctx.translate(x, y); ctx.rotate(d * (4 + 8 * hash(i + 2)) + i); ctx.globalAlpha = 1 - smooth(2.2, 3, d);
        ctx.fillStyle = [PINK, CYAN, GOLD, '#46e08a', '#b26bff'][i % 5]; ctx.fillRect(-9, -5, 18, 10); ctx.restore();
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- vitrine dos experimentos
  function drawCard(x, y, w, img, label, locked, a, tilt = 0, icon = null) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.transform(1, tilt * 0.12, 0, 1, 0, 0); ctx.scale(1 - Math.abs(tilt) * 0.08, 1 - Math.abs(tilt) * 0.08);
    const h = w * 1.3;
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; roundRect(-w / 2, -h / 2, w, h, 28); ctx.fillStyle = '#0d1520'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.save(); roundRect(-w / 2 + 12, -h / 2 + 12, w - 24, w - 24, 20); ctx.clip();
    if (img && !locked) ctx.drawImage(img, -w / 2 + 12, -h / 2 + 12, w - 24, w - 24);
    else { const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2 - w * 0.3); g.addColorStop(0, '#1b2a44'); g.addColorStop(1, '#0a121e'); ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, w); if (icon) icon(0, -h / 2 + 12 + (w - 24) / 2, (w - 24) * 0.32); }
    if (locked) { ctx.fillStyle = 'rgba(5,10,18,0.55)'; ctx.fillRect(-w / 2, -h / 2, w, w); drawLock(0, -h / 2 + w * 0.47, w * 0.16); }
    ctx.restore();
    ctx.strokeStyle = locked ? 'rgba(255,210,63,0.8)' : 'rgba(58,215,255,0.7)'; ctx.lineWidth = 4; roundRect(-w / 2, -h / 2, w, h, 28); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; const lines = wrapLines(label, `400 ${Math.round(w * 0.11)}px ${F_TITLE}`, w - 40);
    lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, 0, h / 2 - w * 0.28 + 8 + i * w * 0.12));
    ctx.font = `800 ${Math.round(w * 0.065)}px ${F_MONO}`; ctx.fillStyle = locked ? GOLD : '#46e08a'; ctx.fillText(locked ? 'EM BREVE' : 'JÁ NO PERFIL ✓', 0, h / 2 - 22);
    ctx.restore();
  }
  function drawLock(x, y, s) { ctx.save(); ctx.translate(x, y); ctx.strokeStyle = GOLD; ctx.lineWidth = s * 0.22; ctx.beginPath(); ctx.arc(0, -s * 0.35, s * 0.55, Math.PI, 0); ctx.stroke(); roundRect(-s * 0.8, -s * 0.3, s * 1.6, s * 1.2, s * 0.2); ctx.fillStyle = GOLD; ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, s * 0.25, s * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  const ICON = {
    aneis: (x, y, s) => { ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#4aa3ff'; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#5dcf6b'; ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.2, s * 0.35, s * 0.22, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#f2d39b'; ctx.lineWidth = s * 0.16; ctx.beginPath(); ctx.ellipse(0, 0, s * 1.75, s * 0.42, -0.3, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); },
    buraco: (x, y, s) => { ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#4aa3ff'; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = s * 0.28; ctx.beginPath(); ctx.moveTo(0, -s * 1.15); ctx.lineTo(0, s * 1.15); ctx.stroke(); ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(0, -s * 0.35, s * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.restore(); },
    tunel: (x, y, s) => { ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#8aa'; ctx.lineWidth = s * 0.14; ctx.beginPath(); ctx.arc(0, s * 0.5, s * 1.3, Math.PI, 0); ctx.stroke(); ctx.rotate(Math.PI); ctx.translate(0, s * 0.35); ctx.fillStyle = PINK; roundRect(-s * 0.8, -s * 0.2, s * 1.6, s * 0.4, s * 0.1); ctx.fill(); ctx.fillStyle = '#111'; for (const dx of [-0.5, 0.5]) { ctx.beginPath(); ctx.arc(dx * s, s * 0.25, s * 0.17, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); },
  };
  function drawShowcase(t) {
    const [a, b] = T.vitrine; if (t < a - 0.2 || t > b + 0.2) return;
    const fade = smooth(a - 0.2, a + 0.3, t) * (1 - smooth(b - 0.3, b + 0.1, t));
    const past = cfg.passados, w = 360, gap = 390;
    // passados: esteira para a esquerda (18,2 → 24,4); depois os bloqueados entram
    const k = smooth(a, 24.4, t), sx = lerp(W + w / 2, -(past.length) * gap + W / 2, k);
    past.forEach(([key, label], i) => { const x = sx + i * gap; if (x < -w || x > W + w) return; const tilt = (x - W / 2) / W; drawCard(x, 1150, w, imgs[key], label, false, fade, tilt); });
    const k2 = smooth(24.5, 25.4, t);
    if (k2 > 0) cfg.enquete.forEach(([, label, ic], i) => { const x = W / 2 + (i - 1) * 330, y = 1150 + 40 * Math.sin(t * 2 + i); drawCard(lerp(W + 400, x, easeOutBack(clamp(k2 * 1.2 - i * 0.15))), y, 300, null, label, true, fade, (i - 1) * 0.3, ICON[ic]); });
    title(k2 > 0 ? ['PRÓXIMOS', 'EXPERIMENTOS'] : ['EXPERIMENTOS', 'NO PERFIL'], 300, fade, [86, 86], ['#ffffff', k2 > 0 ? GOLD : CYAN]);
  }

  // ---------------------------------------------------------------- enquete A/B/C (token de comentário)
  function drawPoll(t) {
    const [a, b] = T.enquete; if (t < a - 0.2 || t > b + 0.2) return;
    const fade = smooth(a - 0.2, a + 0.2, t) * (1 - smooth(b - 0.3, b + 0.1, t));
    title(['COMENTA', 'A, B OU C'], 280, fade, [110, 130], ['#ffffff', GOLD], 1 + 0.03 * Math.sin(t * 6));
    cfg.enquete.forEach(([L, label, ic], i) => {
      const y = 1000 + i * 190, k = easeOutBack(clamp((t - a - 0.15 * i) / 0.5));
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(lerp(-600, 0, k), 0);
      roundRect(70, y - 75, W - 140, 150, 32); ctx.fillStyle = 'rgba(5,12,22,0.8)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3; ctx.stroke();
      const fill = (0.35 + 0.25 * hash(i + 3)) * smooth(a + 0.6 + 0.2 * i, a + 3.0, t) + 0.04 * Math.sin(t * 3 + i);
      ctx.save(); roundRect(70, y - 75, W - 140, 150, 32); ctx.clip(); ctx.fillStyle = ['rgba(74,163,255,0.28)', 'rgba(255,210,63,0.25)', 'rgba(255,46,99,0.25)'][i]; ctx.fillRect(70, y - 75, (W - 140) * fill, 150); ctx.restore();
      ctx.beginPath(); ctx.arc(160, y, 50, 0, Math.PI * 2); ctx.fillStyle = ['#4aa3ff', GOLD, PINK][i]; ctx.fill();
      ctx.fillStyle = '#05070c'; ctx.font = `400 64px ${F_TITLE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(L, 160, y + 4);
      ICON[ic](W - 170, y, 34);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; fitFont(label, 400, 52, F_TITLE, W - 520); ctx.fillText(label, 240, y + 4);
      ctx.restore();
    });
  }

  // ---------------------------------------------------------------- CTA: seta até o botão real do app
  function drawCTA(t) {
    const [a, b] = T.cta; if (t < a - 0.2 || t > b + 0.2) return;
    const fade = smooth(a - 0.2, a + 0.3, t) * (1 - smooth(b - 0.3, b + 0.1, t));
    const [tx, ty] = cfg.alvo;
    // escurece tudo menos o alvo (holofote)
    ctx.save(); ctx.globalAlpha = 0.6 * fade; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(tx, ty, 110 + 10 * Math.sin(t * 6), 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.restore();
    // anéis pulsando no alvo
    for (let k = 0; k < 3; k++) { const ph = ((t - a) * 1.2 + k / 3) % 1; ctx.save(); ctx.globalAlpha = fade * (1 - ph); ctx.strokeStyle = YT ? '#ff4a4a' : PINK; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(tx, ty, 70 + 120 * ph, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    // seta curva desenhando-se até o alvo
    const sx = W / 2 + (YT ? 60 : -40), sy = YT ? 1150 : 760, draw = smooth(a, a + 0.8, t);
    const cx = YT ? 120 : W - 120, cy = YT ? 1350 : 780;
    ctx.save(); ctx.globalAlpha = fade; ctx.strokeStyle = '#fff'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 16;
    const N = 40, ex = tx + (YT ? 0 : -90), ey = ty - (YT ? 120 : 30);
    ctx.beginPath(); for (let i = 0; i <= N * draw; i++) { const u = i / N, x = (1 - u) ** 2 * sx + 2 * (1 - u) * u * cx + u * u * ex, y = (1 - u) ** 2 * sy + 2 * (1 - u) * u * cy + u * u * ey; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
    if (draw > 0.98) { const ang = Math.atan2(ey - cy, ex - cx); ctx.translate(ex, ey); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-45, -32); ctx.moveTo(10, 0); ctx.lineTo(-45, 32); ctx.stroke(); }
    ctx.restore();
    // rótulo
    const lab = YT ? 'INSCREVA-SE AQUI' : 'SEGUE AQUI';
    ctx.save(); ctx.globalAlpha = fade; ctx.font = `400 92px ${F_TITLE}`; ctx.textAlign = 'center'; ctx.lineWidth = 14; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round';
    const lx = YT ? W / 2 + 80 : W / 2 - 60, ly = YT ? 1080 : 680, bob = 8 * Math.sin(t * 5);
    ctx.strokeText(lab, lx, ly + bob); ctx.fillStyle = YT ? '#ff4a4a' : PINK; ctx.fillText(lab, lx, ly + bob);
    if (YT) { ctx.font = `800 40px ${F_MONO}`; ctx.fillStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeText('+ ATIVA O SININHO', lx, ly + 70 + bob); ctx.fillText('+ ATIVA O SININHO', lx, ly + 70 + bob); drawBell(lx + 250, ly + 56 + bob, 40, GOLD); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- título-gancho, glitch, legendas
  function drawHook(t) {
    const a = 1 - smooth(2.8, 3.2, t), b = smooth(DUR - 1.3, DUR - 0.8, t);
    title(YT ? ['E SE VOCÊ SE', 'INSCREVESSE', 'AGORA?'] : ['E SE VOCÊ', 'ME SEGUISSE', 'AGORA?'], 200, Math.max(a, b), [100, 120, 120], ['#ffffff', YT ? '#ff4a4a' : PINK, GOLD], 1 + 0.06 * (1 - smooth(0, 0.5, t)));
    const s = smooth(3.4, 3.8, t) * (1 - smooth(5.6, 6.0, t));
    if (s > 0) title(['SIMULAÇÃO', 'EM ANDAMENTO'], 260, s, [70, 70], [CYAN, '#ffffff']);
  }
  function glitch(t) {
    let g = 0; for (const [a, b] of T.glitch) if (t >= a && t <= b) g = Math.max(g, Math.sin(Math.PI * (t - a) / (b - a)));
    if (g <= 0.02) return;
    const fr = Math.floor(t * FPS);
    tctx.clearRect(0, 0, W, H); tctx.drawImage(comp, 0, 0);
    for (let i = 0; i < 14; i++) { const y = Math.floor(hash(fr * 31 + i) * H), h = 8 + Math.floor(hash(fr * 17 + i) * 120), dx = (hash(fr * 7 + i) - 0.5) * 160 * g; ctx.drawImage(tmp, 0, y, W, h, dx, y, W, h); }
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.45 * g; ctx.drawImage(tmp, 12 * g, 0); ctx.fillStyle = 'rgba(58,215,255,0.2)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  function drawSubtitles(t) {
    for (const f of cfg.frases) {
      if (t < f.inicio - 0.05 || t > f.fim + 0.05) continue;
      const a = (f.inicio <= 0 ? 1 : smooth(f.inicio, f.inicio + 0.25, t)) * (f.fim >= DUR ? 1 : 1 - smooth(f.fim - 0.25, f.fim, t)); if (a <= 0) continue;
      const font = `600 54px ${F_SERIF}`, lines = wrapLines(f.legenda || f.texto, font, 900), lh = 70;
      const cy = t < 3 ? 640 : (YT && t >= T.cta[0] - 0.3 && t < T.cta[1] + 0.3) ? 560 : 1520;
      ctx.save(); ctx.globalAlpha = a; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 3; ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      lines.forEach((l, i) => { const yy = cy + (i - (lines.length - 1) / 2) * lh; ctx.strokeText(l, W / 2, yy); ctx.fillStyle = '#fff'; ctx.fillText(l, W / 2, yy); });
      ctx.restore();
    }
  }

  function renderFrame(t) {
    t = clamp(t, 0, DUR - 1e-6);
    const mood = interp(cfg.humor, t), talk = talkAt(t), surprise = surpriseAt(t);
    const bg = lab.renderLab(t, { level: 99, tau: t, talk, mood, surprise });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(bg, 0, 0, W, H);
    // véu para dar contraste aos gráficos
    const vg = ctx.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, 'rgba(0,0,0,0.35)'); vg.addColorStop(0.35, 'rgba(0,0,0,0)'); vg.addColorStop(0.6, 'rgba(0,0,0,0.1)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    drawSignal(t);
    drawButton(t);
    drawFinger(t);
    drawCounter(t);
    drawShowcase(t);
    drawPoll(t);
    drawCTA(t);
    drawHook(t);
    drawBadge(t);
    drawSubtitles(t);
    glitch(t);
    const lp = smooth(DUR - 0.25, DUR, t); if (lp > 0) { ctx.fillStyle = `rgba(0,0,0,${0.4 * lp})`; ctx.fillRect(0, 0, W, H); }
    return comp;
  }
  return { canvas: comp, renderFrame, frameJPEG: (t, q = 0.92) => { renderFrame(t); return comp.toDataURL('image/jpeg', q); } };
}
