// ============================================================================
//  Short 9:16 "E se você pudesse voltar no tempo?" — Projeto E se? • Experimento #012
//  Animação 2D desenhada à mão (Canvas 2D): o adulto cansado esperando o lançamento,
//  a volta para 2013 (o presente, a capa, as noites jogando), o crescimento e o play com
//  uma lágrima. Função pura de t.
// ============================================================================
import * as A from './arte.js';
import { CENAS, EV, DUR } from './tempo.js';

const { clamp, smooth, lerp, hash, mix, rgba, rr } = A;
const F_TITLE = '"Anton", "Impact", "Arial Black", sans-serif';
const F_HAND = '"Caveat", "Comic Sans MS", cursive';
const F_UI = '"Nunito", "Arial Rounded MT Bold", sans-serif';
const F_MONO = '"Roboto Mono", "DejaVu Sans Mono", monospace';
const bump = (a, b, c, d, t) => smooth(a, b, t) * (1 - smooth(c, d, t));

export async function createShort({ cfg }) {
  const W = cfg.largura || 1080, H = cfg.altura || 1920, FPS = cfg.fps || 30;
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const ctx = comp.getContext('2d');
  const layer = document.createElement('canvas'); layer.width = W; layer.height = H; const lctx = layer.getContext('2d');
  // papel + granulado (pré-gerados)
  const paper = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); const im = g.createImageData(512, 512); for (let i = 0; i < 512 * 512; i++) { const x = i % 512, y = (i / 512) | 0; const v = 200 + 40 * hash(i * 0.37) + 15 * Math.sin(x * 0.05 + hash(y) * 3) * Math.sin(y * 0.031); im.data[i * 4] = v; im.data[i * 4 + 1] = v * 0.97; im.data[i * 4 + 2] = v * 0.9; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); return c; })();
  const grains = Array.from({ length: 4 }, (_, k) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), im = g.createImageData(256, 256); for (let i = 0; i < 256 * 256; i++) { const v = (hash(i * 0.731 + k * 91.7) * 255) | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); return c; });

  // ------------------------------------------------------------ ajudantes de cena
  const cam = (g, cx, cy, z) => { g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-cx, -cy); };
  const glow = (g, x, y, r, col, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); };
  const tint = (g, col, a, op = 'multiply') => { g.save(); g.globalCompositeOperation = op; g.globalAlpha = a; g.fillStyle = col; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); };
  const dust = (g, t, n, col, area = [0, 0, W, H], k = 1) => { for (let i = 0; i < n; i++) { const x = area[0] + ((hash(i) * area[2] + t * (8 + 12 * hash(i + 1))) % area[2]), y = area[1] + ((hash(i + 2) * area[3] - t * (6 + 10 * hash(i + 3)) + area[3] * 10) % area[3]); g.fillStyle = rgba(col, (0.25 + 0.5 * hash(i + 4)) * (0.5 + 0.5 * Math.sin(t * 2 + i)) * k); g.beginPath(); g.arc(x, y, 1.5 + 3 * hash(i + 5), 0, 7); g.fill(); } };
  const sparkle = (g, x, y, r, a) => { g.save(); g.translate(x, y); g.fillStyle = `rgba(255,248,220,${a})`; g.beginPath(); for (let j = 0; j < 8; j++) { const ang = j * Math.PI / 4, rr2 = j % 2 ? r * 0.22 : r; g.lineTo(Math.cos(ang) * rr2, Math.sin(ang) * rr2); } g.fill(); g.restore(); };

  // ---------------- sala do adulto (de costas para a câmera, TV na frente)
  function rain(g, x, y, w, h, t) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#0e1430'); gr.addColorStop(1, '#1e2450'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    for (let i = 0; i < 26; i++) { g.fillStyle = rgba(['#ffcf7a', '#ff7ab0', '#7ac8ff'][i % 3], 0.35); g.beginPath(); g.arc(x + hash(i) * w, y + h * (0.45 + 0.5 * hash(i + 1)), 6 + 14 * hash(i + 2), 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(180,200,255,0.35)'; g.lineWidth = 1.5;
    for (let i = 0; i < 60; i++) { const sx = x + hash(i * 3) * w, sp = 900 + 400 * hash(i), sy = y + ((hash(i * 7) * h + t * sp) % (h + 60)) - 30; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 3, sy + 22); g.stroke(); }
    for (let i = 0; i < 18; i++) { const sx = x + hash(i + 50) * w, sy = y + ((hash(i + 60) * h + t * 25 * hash(i + 70)) % h); g.fillStyle = 'rgba(200,220,255,0.45)'; g.beginPath(); g.ellipse(sx, sy, 3, 5, 0, 0, 7); g.fill(); }
    g.restore();
    g.strokeStyle = '#151025'; g.lineWidth = 18; g.strokeRect(x, y, w, h); g.lineWidth = 8; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
  }
  function adultRoom(g, t, { screen = 'count', secs = 107, press = 0, game = false, worldT = 0, light = '#b04aa0', sway = 0 } = {}) {
    const wall = g.createLinearGradient(0, 0, 0, 1300); wall.addColorStop(0, '#120f22'); wall.addColorStop(1, '#1d1832'); g.fillStyle = wall; g.fillRect(-200, -200, W + 400, 1500);
    g.fillStyle = '#100c18'; g.fillRect(-200, 1300, W + 400, 900);
    rain(g, 40, 260, 270, 520, t);
    A.drawClock(g, 920, 330, 62, 23, 58 + Math.min(1.9, t / 30));
    // estante com a capa antiga e o porta-retrato
    g.fillStyle = '#2a1e2a'; g.fillRect(790, 660, 270, 22);
    A.drawCover(g, 870, 600, 78, 104, { rot: -0.06 });
    rr(g, 935, 560, 90, 100, 6); g.fillStyle = '#d8c8a8'; g.fill(); g.fillStyle = '#e9a86a'; g.fillRect(945, 570, 70, 66); A.drawFront(g, 980, 620, 0.17, { age: 0, smile: 0.8 });
    // TV
    const tv = [210, 740, 660, 380];
    A.drawFlatTV(g, ...tv, (x, y, w, h) => (game ? A.drawGameWorld(g, x, y, w, h, worldT, { crt: false, night: 0.55 }) : A.drawNeonScreen(g, x, y, w, h, t, { mode: screen, secs, press })));
    g.fillStyle = '#1a1424'; g.fillRect(150, 1186, 780, 40);
    // luz da TV
    g.save(); g.globalCompositeOperation = 'screen'; glow(g, 540, 930, 900, light, 0.38); g.restore();
    // sofá e o adulto de costas
    g.fillStyle = '#16121e'; rr(g, -60, 1560, W + 120, 500, 60); g.fill(); g.strokeStyle = rgba(light, 0.35); g.lineWidth = 6; g.stroke();
    A.drawBack(g, 540, 1400, 1.12, { age: 1, rim: light, rimK: 0.9, sway });
  }

  // ---------------- sala de 2013 (tarde quente)
  function warmWall(g, t, k = 1) {
    const wall = g.createLinearGradient(0, 0, 0, H); wall.addColorStop(0, '#f2d6a8'); wall.addColorStop(1, '#e0b07a'); g.fillStyle = wall; g.fillRect(-200, -200, W + 400, H + 400);
    // janela e feixes de sol
    g.fillStyle = '#fff4d8'; g.fillRect(60, 180, 360, 520); g.strokeStyle = '#c08a5a'; g.lineWidth = 16; g.strokeRect(60, 180, 360, 520); g.beginPath(); g.moveTo(240, 180); g.lineTo(240, 700); g.stroke();
    g.save(); g.globalCompositeOperation = 'screen'; for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(255,236,190,${0.18 * k})`; g.beginPath(); g.moveTo(80 + i * 110, 200); g.lineTo(180 + i * 110, 200); g.lineTo(900 + i * 140, H); g.lineTo(600 + i * 140, H); g.fill(); } g.restore();
    // quadros
    rr(g, 640, 260, 220, 170, 8); g.fillStyle = '#7a5a3a'; g.fill(); g.fillStyle = '#9ac8a0'; g.fillRect(656, 276, 188, 138); g.fillStyle = '#5a8a6a'; g.beginPath(); g.moveTo(656, 414); g.lineTo(720, 330); g.lineTo(780, 380); g.lineTo(844, 320); g.lineTo(844, 414); g.fill();
    dust(g, t, 40, '#fff2c8', [0, 150, W, 1300]);
  }
  // pais: só ombros, braços e mãos (rostos fora do quadro), segurando o presente pelas laterais
  function parents(g, gx, gy, gw, t, layer) {
    const M = { x: gx - 250, y: gy - 360, w: 170, col: '#d8a23a' }, D = { x: gx + 250, y: gy - 400, w: 190, col: '#4a6aa8' };
    const handL = [gx - gw / 2 - 6, gy + 10], handR = [gx + gw / 2 + 6, gy - 4];
    if (layer === 'back') {
      for (const P of [M, D]) {
        g.beginPath(); g.moveTo(P.x - P.w, P.y - 700); g.lineTo(P.x - P.w, P.y - 40); g.quadraticCurveTo(P.x - P.w, P.y + 60, P.x - P.w * 0.6, P.y + 70); g.lineTo(P.x + P.w * 0.6, P.y + 70); g.quadraticCurveTo(P.x + P.w, P.y + 60, P.x + P.w, P.y - 40); g.lineTo(P.x + P.w, P.y - 700); g.closePath();
        g.fillStyle = P.col; g.fill(); g.lineWidth = 5; g.strokeStyle = A.INK; g.stroke();
        if (P === D) { g.save(); g.clip(); g.strokeStyle = 'rgba(25,35,80,0.3)'; g.lineWidth = 9; for (let i = -12; i < 12; i++) { g.beginPath(); g.moveTo(P.x + i * 36, P.y - 700); g.lineTo(P.x + i * 36, P.y + 80); g.stroke(); g.beginPath(); g.moveTo(P.x - 300, P.y - 700 + (i + 12) * 40); g.lineTo(P.x + 300, P.y - 700 + (i + 12) * 40); g.stroke(); } g.restore(); }
        else { g.save(); g.clip(); g.strokeStyle = 'rgba(120,80,20,0.25)'; g.lineWidth = 5; for (let i = -10; i < 10; i++) { g.beginPath(); g.moveTo(P.x + i * 26, P.y - 700); g.lineTo(P.x + i * 26, P.y + 80); g.stroke(); } g.restore(); }
      }
      // braços que vão até o presente
      const arm = (sx, sy, hx, hy, col) => { g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo((sx + hx) / 2 + (hx < sx ? 40 : -40), sy + 160, hx, hy - 20); g.lineCap = 'round'; g.strokeStyle = A.INK; g.lineWidth = 80; g.stroke(); g.strokeStyle = col; g.lineWidth = 70; g.stroke(); };
      arm(M.x - M.w * 0.7, M.y - 20, ...handL, M.col); arm(D.x + D.w * 0.7, D.y - 20, ...handR, D.col);
      for (const P of [M, D]) { g.beginPath(); g.moveTo(P.x + (P === M ? 1 : -1) * P.w * 0.8, P.y - 10); g.lineTo(P.x + (P === M ? 1 : -1) * P.w * 0.9, P.y + 260); g.strokeStyle = A.INK; g.lineWidth = 74; g.stroke(); g.strokeStyle = P.col; g.lineWidth = 64; g.stroke(); }
    } else {
      for (const [hx, hy, sx] of [[...handL, -1], [...handR, 1]]) { g.save(); g.translate(hx, hy); g.beginPath(); g.ellipse(0, 0, 34, 46, sx * 0.3, 0, 7); g.fillStyle = '#f0c39e'; g.fill(); g.lineWidth = 4.5; g.strokeStyle = A.INK; g.stroke(); for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-sx * 8, -20 + k * 16); g.lineTo(-sx * 26, -18 + k * 16); g.lineWidth = 3; g.stroke(); } g.restore(); }
    }
  }

  // ---------------- cenas
  const S = {
    gancho(g, t, u) {
      g.fillStyle = '#100c1e'; g.fillRect(0, 0, W, H);
      g.save(); cam(g, 540, 980, 1.0 + 0.12 * u);
      g.save(); g.globalCompositeOperation = 'screen'; glow(g, 540, 900, 1100, '#6a4ab0', 0.4); g.restore();
      A.drawFront(g, 540, 1050, 2.35, { age: 1, tired: 1, blink: bump(EV.piscaGancho, EV.piscaGancho + 0.08, EV.piscaGancho + 0.12, EV.piscaGancho + 0.22, t), browUp: 0.3, refl: '#ff6ab0', look: [0, -0.1] });
      g.restore();
      tint(g, '#5a5aa8', 0.55); tint(g, '#ff6ab0', 0.12 + 0.05 * Math.sin(t * 9) * Math.sin(t * 3.1), 'screen');
    },
    sala(g, t, u) { g.save(); cam(g, 540, 1010, 1.0 + 0.06 * u); adultRoom(g, t, { secs: 107 - (t - 4.5) }); g.restore(); tint(g, '#3a3a7a', 0.3); },
    contagem(g, t, u) { g.save(); cam(g, 540, 930 + 20 * u, 1.35 + 0.55 * smooth(0, 1, u)); adultRoom(g, t, { secs: 107 - (t - 4.5) }); g.restore(); tint(g, '#3a3a7a', 0.2); },
    estante(g, t, u) {
      if (t < EV.olhaEstante + 1.3) {   // ele desvia o olhar para a estante
        g.fillStyle = '#100c1e'; g.fillRect(0, 0, W, H);
        g.save(); cam(g, 540, 980, 1.15); g.save(); g.globalCompositeOperation = 'screen'; glow(g, 540, 900, 1100, '#6a4ab0', 0.4); g.restore();
        A.drawFront(g, 540, 1050, 2.35, { age: 1, tired: 0.7, look: [-1 * smooth(EV.olhaEstante, EV.olhaEstante + 0.4, t), 0.1], browUp: 0.6 * smooth(EV.olhaEstante, EV.olhaEstante + 0.6, t), refl: '#ff6ab0' });
        g.restore(); tint(g, '#5a5aa8', 0.55);
      } else {
        const k = smooth(EV.olhaEstante + 1.3, 16.9, t);
        g.save(); cam(g, 900, 600, 4.2 + 1.2 * k); adultRoom(g, t, { secs: 107 - (t - 4.5) });
        g.save(); g.globalCompositeOperation = 'screen'; glow(g, 870, 600, 110, '#ffd890', 0.35 + 0.3 * k); g.restore();
        g.restore(); tint(g, '#3a3a7a', 0.25 - 0.1 * k); dust(g, t, 24, '#ffe8b0', [0, 0, W, H], 0.6);
      }
    },
    volta(g, t, u) {
      // rebobinando: a capa antiga gira, os anos voltam, a cor esquenta
      const warm = smooth(0.35, 1, u);
      const gr = g.createRadialGradient(540, 900, 0, 540, 900, 1300); gr.addColorStop(0, mix('#3a2a5a', '#ffd89a', warm)); gr.addColorStop(1, mix('#0e0a1a', '#c0702a', warm)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.save(); g.translate(540, 900); g.rotate(-t * 4 * (1 - warm * 0.8));
      for (let i = 0; i < 24; i++) { g.rotate(Math.PI / 12); g.fillStyle = `rgba(255,240,210,${0.06 + 0.06 * (i % 2)})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(1400, -60); g.lineTo(1400, 60); g.fill(); }
      g.restore();
      A.drawClock(g, 540, 640, 150, 23 - u * 90, -u * 1400);
      const yr = Math.round(lerp(2026, 2013, smooth(0.15, 0.85, u)));
      g.save(); g.textAlign = 'center'; g.font = `400 220px ${F_TITLE}`; g.lineWidth = 16; g.strokeStyle = 'rgba(20,10,20,0.85)'; g.lineJoin = 'round'; g.strokeText(String(yr), 540, 1180); g.fillStyle = mix('#ffffff', '#fff1c0', warm); g.fillText(String(yr), 540, 1180); g.restore();
      A.drawCover(g, 540, 1460, 200 + 60 * warm, 270 + 80 * warm, { rot: Math.sin(t * 6) * 0.2 * (1 - warm), glow: warm });
      // fitas VHS rebobinando
      for (let i = 0; i < 7; i++) { const yy = ((hash(i) * H + t * 2400 * (1 + hash(i + 2))) % H); g.fillStyle = `rgba(255,255,255,${0.12 + 0.2 * hash(i + Math.floor(t * 30))})`; g.fillRect(0, yy, W, 4 + 18 * hash(i + 4)); }
      g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.25 * (1 - warm); g.drawImage(comp, 8, 0); g.restore();
    },
    presente(g, t, u) {
      warmWall(g, t);
      const gy = lerp(560, 880, smooth(0.05, 0.85, u)), gx = lerp(820, 660, smooth(0.05, 0.85, u));
      parents(g, gx, gy, 380, t, 'back');
      A.drawGift(g, gx, gy, 380, 250, { rot: -0.04 });
      parents(g, gx, gy, 380, t, 'front');
      A.drawFront(g, 380, 1300, 1.55, { age: 0, look: [0.6, -0.9], smile: 0.4 + 0.4 * u, wonder: 0.4 * u, open: 0.3 * bump(0.5, 0.7, 0.85, 1, u), browUp: 0.3 });
      tint(g, '#ffb070', 0.12, 'soft-light');
    },
    abre(g, t, u) {
      warmWall(g, t);
      const rip = smooth(EV.rasga, EV.rasga + 0.75, t), rev = smooth(EV.revela - 0.2, EV.revela + 0.5, t);
      // raios de luz saindo da capa
      if (rev > 0) { g.save(); g.translate(540, 1330); g.rotate(t * 0.2); g.globalCompositeOperation = 'screen'; for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); g.fillStyle = `rgba(255,230,160,${0.18 * rev})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(1300, -90); g.lineTo(1300, 90); g.fill(); } g.restore(); }
      A.drawFront(g, 540, 700, 1.7, { age: 0, look: [0, 1], smile: 0.3 + 0.5 * rev, open: 0.25 * rip + 0.6 * rev * (1 - smooth(26.6, 27.3, t)), wonder: rev, browUp: 0.5 * rev });
      if (rev > 0) A.drawCover(g, 540, 1340 - 40 * rev, 400 + 40 * rev, 540 + 50 * rev, { glow: rev, rot: 0.03 * Math.sin(t * 2) });
      if (rip < 1) A.drawGift(g, 540, 1340, 520, 360, { rip, rot: 0.04 });
      for (let i = 0; i < 18; i++) { const a = hash(i) * 6.28, r = 280 + 260 * hash(i + 1) + 40 * Math.sin(t * 2 + i); sparkle(g, 540 + Math.cos(a) * r, 1300 + Math.sin(a) * r * 0.9, 10 + 20 * hash(i + 2), rev * (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i)))); }
      tint(g, '#ffb070', 0.12, 'soft-light');
    },
    noite(g, t, u) {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#16224a'); gr.addColorStop(1, '#0c1430'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2a4070'; g.fillRect(640, 160, 360, 420); g.strokeStyle = '#0a1024'; g.lineWidth = 16; g.strokeRect(640, 160, 360, 420);
      g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(880, 280, 46, 0, 7); g.fill(); g.fillStyle = '#2a4070'; g.beginPath(); g.arc(900, 266, 40, 0, 7); g.fill();
      for (let i = 0; i < 20; i++) sparkle(g, 650 + hash(i) * 340, 170 + hash(i + 9) * 380, 3 + 5 * hash(i + 3), 0.4 + 0.5 * Math.abs(Math.sin(t * 2 + i)));
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(160,190,255,0.12)'; g.beginPath(); g.moveTo(640, 160); g.lineTo(1000, 160); g.lineTo(700, H); g.lineTo(100, H); g.fill(); g.restore();
      A.drawClock(g, 230, 300, 70, 1, 12 + u * 4);
      // travesseiro, criança, capa abraçada e cobertor
      rr(g, 160, 760, 760, 360, 160); g.fillStyle = '#d8dcef'; g.fill(); g.lineWidth = 5; g.strokeStyle = A.INK; g.stroke();
      A.drawFront(g, 540, 1020, 1.4, { age: 0, tilt: -0.1, smile: 0.7, wonder: 0.3, look: [0.3 + 0.2 * Math.sin(t * 0.7), -0.4], blink: bump(28.9, 28.97, 29.02, 29.1, t) });
      A.drawCover(g, 560, 1380, 300, 400, { rot: 0.12, glow: 0.25 });
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(540 + sx * 230, 1330); g.quadraticCurveTo(540 + sx * 140, 1260, 540 + sx * 40, 1320); g.strokeStyle = '#cf4a3c'; g.lineWidth = 60; g.lineCap = 'round'; g.stroke(); g.beginPath(); g.arc(540 + sx * 40, 1320, 30, 0, 7); g.fillStyle = '#f0c39e'; g.fill(); g.lineWidth = 4; g.strokeStyle = A.INK; g.stroke(); }
      g.beginPath(); g.moveTo(-40, 1500); g.bezierCurveTo(300, 1420, 760, 1440, 1120, 1480); g.lineTo(1120, H + 40); g.lineTo(-40, H + 40); g.closePath(); g.fillStyle = '#3a5a9a'; g.fill(); g.lineWidth = 5; g.strokeStyle = A.INK; g.stroke();
      g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) { g.fillRect(i * 130 + (j % 2) * 65, 1540 + j * 100, 50, 50); } g.restore();
      tint(g, '#4a5aa8', 0.25);
    },
    mundo(g, t, u) {
      const dive = smooth(0.25, 0.62, u);
      if (u < 0.62) {
        g.save(); cam(g, 540, lerp(1000, 890, dive), 1 + 1.9 * dive * dive);
        warmWall(g, t, 0.6); tint(g, '#c06a3a', 0.35);
        g.fillStyle = '#8a5a3a'; g.fillRect(200, 1090, 680, 40); g.fillRect(230, 1130, 30, 260); g.fillRect(820, 1130, 30, 260);
        rr(g, 420, 1150, 240, 60, 10); g.fillStyle = '#1a1a1e'; g.fill();
        A.drawCRT(g, 290, 700, 500, 380, (x, y, w, h) => A.drawGameWorld(g, x, y, w, h, t));
        g.save(); g.globalCompositeOperation = 'screen'; glow(g, 540, 900, 800, '#ffb070', 0.35); g.restore();
        g.fillStyle = '#7a3a2a'; g.fillRect(-100, 1400, W + 200, 700);
        A.drawBack(g, 540, 1530, 0.95, { age: 0, rim: '#ffc080', rimK: 1, sway: Math.sin(t * 1.5) });
        g.restore();
      }
      if (u > 0.5) {   // dentro do mundo do jogo
        const k = smooth(0.5, 0.65, u);
        g.save(); g.globalAlpha = k; A.drawGameWorld(g, -120 - 60 * u, 0, W + 300, H, t * 1.2, { crt: false }); g.restore();
        for (let i = 0; i < 30; i++) { const y = H - ((t * 120 * (0.5 + hash(i)) + hash(i + 1) * H) % H); sparkle(g, hash(i + 2) * W, y, 6 + 14 * hash(i + 3), k * (0.3 + 0.6 * Math.abs(Math.sin(t * 2 + i)))); }
        g.save(); g.globalCompositeOperation = 'screen'; glow(g, 760, 950, 900, '#ffcf8a', 0.35 * k); g.restore();
      }
    },
    amigos(g, t, u) {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1a1430'); gr.addColorStop(1, '#2a1c2a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.save(); cam(g, 540, 1000, 1.05 + 0.08 * u);
      A.drawClock(g, 900, 330, 60, 2, 13 + u * 30);
      g.fillStyle = '#3a2418'; g.fillRect(200, 1090, 680, 40);
      A.drawCRT(g, 290, 700, 500, 380, (x, y, w, h) => A.drawGameWorld(g, x, y, w, h, t, { night: 1 }));
      g.save(); g.globalCompositeOperation = 'screen'; glow(g, 540, 900, 900, '#ff9ad0', 0.32); g.restore();
      // caixa de pizza e latinhas
      g.save(); g.translate(170, 1330); g.rotate(-0.1); rr(g, -110, -30, 220, 60, 6); g.fillStyle = '#d8a86a'; g.fill(); g.lineWidth = 4; g.strokeStyle = A.INK; g.stroke(); g.restore();
      for (const [cx, c] of [[880, '#c83a3a'], [930, '#3a8ac8']]) { rr(g, cx, 1280, 34, 60, 6); g.fillStyle = c; g.fill(); g.stroke(); }
      g.fillStyle = '#2a1e30'; rr(g, -60, 1580, W + 120, 500, 60); g.fill();
      const laugh = (k) => Math.max(...EV.risadas.map((r) => bump(r, r + 0.1, r + 0.7, r + 1.1, t))) * Math.abs(Math.sin(t * 22 + k)) * 14;
      A.drawBack(g, 290, 1500 - laugh(0), 0.85, { age: 0.1, rim: '#ff9ad0', sway: Math.sin(t * 2) });
      A.drawBack(g, 790, 1510 - laugh(1), 0.8, { age: 0, rim: '#ff9ad0', sway: -Math.sin(t * 2.3) });
      A.drawBack(g, 540, 1470 - laugh(2), 0.95, { age: 0, rim: '#ffc0e0', rimK: 1.2, sway: Math.sin(t * 1.7) });
      g.restore();
      tint(g, '#5a3a7a', 0.2);
    },
    cresce(g, t, u) {
      const age = smooth(EV.idade[0], EV.idade[1], t);
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, mix(mix('#f2d6a8', '#6a4a8a', smooth(0, 0.55, age)), '#1a1630', smooth(0.55, 1, age))); bg.addColorStop(1, mix(mix('#d8a06a', '#3a2a5a', smooth(0, 0.55, age)), '#0e0c1a', smooth(0.55, 1, age))); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // polaroids antigas espalhadas
      const yrs = [2013, 2016, 2019, 2022, 2026];
      yrs.forEach((y, i) => { const shown = age * 4.4 - i; if (shown < -0.5 || i === 4) return; g.save(); g.translate(540 + (i - 2) * 120 + 60 * hash(i), 900 + 30 * hash(i + 3)); g.rotate((hash(i + 7) - 0.5) * 0.5); g.globalAlpha = 0.35; rr(g, -260, -330, 520, 640, 8); g.fillStyle = '#f4efe6'; g.fill(); g.restore(); });
      // polaroid principal com o rosto
      g.save(); g.translate(540, 900); g.rotate(-0.05 + 0.07 * Math.sin(age * 6));
      g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 40; rr(g, -380, -470, 760, 940, 10); g.fillStyle = '#f6f1e6'; g.fill(); g.shadowBlur = 0;
      g.save(); g.beginPath(); g.rect(-340, -430, 680, 700); g.clip();
      g.fillStyle = mix(mix('#e9b07a', '#7a5aa8', smooth(0, 0.55, age)), '#2a2a4a', smooth(0.55, 1, age)); g.fillRect(-340, -430, 680, 700);
      A.drawFront(g, 0, -40, 1.45, { age, tired: smooth(0.7, 1, age) * 0.7, smile: 0.7 * (1 - age) + 0.1, look: [0, 0] });
      g.restore();
      const yi = Math.min(4, Math.floor(age * 4.999));
      g.fillStyle = '#2a2a3a'; g.font = `700 92px ${F_HAND}`; g.textAlign = 'center'; g.fillText(String(yrs[yi]), 0, 380);
      g.restore();
    },
    play(g, t, u) {
      const secs = Math.max(0, EV.jogar - t);
      g.save(); cam(g, 540, 1000, 1.08 - 0.06 * u);
      adultRoom(g, t, { screen: t < EV.jogar ? 'count' : 'play', secs: Math.ceil(secs), light: t < EV.jogar ? '#b04aa0' : '#ff8ab0' });
      g.restore(); tint(g, '#3a3a7a', 0.25);
    },
    controle(g, t, u) {
      const press = bump(EV.aperta - 0.08, EV.aperta, EV.aperta + 0.2, EV.aperta + 0.35, t);
      const gr = g.createRadialGradient(540, 700, 0, 540, 900, 1100); gr.addColorStop(0, '#5a2a5a'); gr.addColorStop(1, '#0c0814'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      A.drawController(g, 540, 1000, 1.85 + 0.1 * u, { press, hands: true, glow: '#ff8ab0' });
      if (t > EV.aperta) { const k = Math.exp(-(t - EV.aperta) * 4); tint(g, '#ffd0e0', 0.6 * k, 'screen'); }
    },
    lagrima(g, t, u) {
      const bg = g.createRadialGradient(540, 700, 0, 540, 900, 1300); bg.addColorStop(0, '#5a2a4a'); bg.addColorStop(1, '#120a1a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.save(); cam(g, 540, 960, 1.0 + 0.18 * u);
      g.save(); g.globalCompositeOperation = 'screen'; glow(g, 540, 900, 1000, '#ff9a7a', 0.45); g.restore();
      const tear = smooth(EV.lagrima[0], EV.lagrima[1], t);
      A.drawFront(g, 540, 1050, 2.35, { age: 1, tired: 0.25, wonder: 0.35, smile: 0.15 + 0.45 * smooth(52.5, 54.5, t), tear, refl: '#ffb07a', browUp: 0.5, look: [0, -0.15] });
      g.restore();
      tint(g, '#ff8a7a', 0.15, 'soft-light'); tint(g, '#ffb07a', 0.08, 'screen');
    },
    final(g, t, u) {
      const out = smooth(59.4, 61.6, t);
      g.save(); cam(g, lerp(540, 870, out), lerp(1000, 600, out), lerp(1.0, 3.6, out * out));
      adultRoom(g, t, { game: true, worldT: t, light: '#ff9a8a', sway: Math.sin(t * 1.3) });
      g.save(); g.globalCompositeOperation = 'screen'; glow(g, 870, 600, 120, '#ffd890', 0.3 + 0.4 * out); g.restore();
      g.restore();
      tint(g, '#3a3a7a', 0.2);
      tint(g, '#100c1e', smooth(60.6, 62, t), 'source-over');
    },
  };

  // ------------------------------------------------------------ camada 2D por cima
  function drawTitle(t) {
    const a = smooth(0.15, 0.6, t) * (1 - smooth(3.9, 4.4, t)); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24;
    ctx.font = `400 104px ${F_TITLE}`; ctx.lineWidth = 16; ctx.strokeStyle = '#120a18'; ctx.strokeText('E SE VOCÊ PUDESSE', W / 2, 300); ctx.fillStyle = '#ffffff'; ctx.fillText('E SE VOCÊ PUDESSE', W / 2, 300);
    ctx.font = `400 138px ${F_TITLE}`; ctx.strokeText('VOLTAR NO TEMPO?', W / 2, 440); ctx.fillStyle = '#ffd36a'; ctx.fillText('VOLTAR NO TEMPO?', W / 2, 440);
    ctx.restore();
  }
  function drawCamcorder(t) {   // carimbo de data de filmadora nas cenas de 2013
    const a = (t > 19.9 && t < 42.2) ? smooth(19.9, 20.3, t) * (1 - smooth(41.8, 42.2, t)) : 0; if (a <= 0) return;
    const night = t > 27.5;
    ctx.save(); ctx.globalAlpha = a * 0.9; ctx.font = `700 40px ${F_MONO}`; ctx.fillStyle = '#ffb030'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6;
    ctx.textAlign = 'left'; ctx.fillText('▶ PLAY', 70, 200);
    ctx.textAlign = 'right'; ctx.fillText(night ? (t > 36.4 ? '19 SET 2013' : '17 SET 2013') : '17 SET 2013', W - 70, 200);
    ctx.fillText(night ? (t > 36.4 ? '02:13' : '01:12') : '16:40', W - 70, 250);
    ctx.restore();
  }
  function drawComment(t) {
    const a = smooth(55.6, 56.1, t) * (1 - smooth(58.9, 59.4, t)); if (a <= 0) return;
    const y = 300, pop = 1 + 0.12 * Math.exp(-Math.max(0, t - 55.6) * 7);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, y); ctx.scale(pop, pop); ctx.rotate(-0.025);
    rr(ctx, -440, -120, 880, 290, 40); ctx.fillStyle = 'rgba(250,244,232,0.96)'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#2a1a16'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#2a1a16'; ctx.font = `700 74px ${F_HAND}`; ctx.fillText('Qual jogo marcou', 0, -20); ctx.fillText('a sua infância?', 0, 60);
    ctx.font = `900 40px ${F_UI}`; ctx.fillStyle = '#d0402a'; ctx.fillText('COMENTA ⤵', 0, 135);
    ctx.restore();
  }
  function drawSubtitles(t) {
    for (const f of cfg.frases) {
      if (f.inicio <= 0.01) continue;
      if (t < f.inicio - 0.05 || t > f.fim + 0.05) continue;
      const a = smooth(f.inicio, f.inicio + 0.25, t) * (1 - smooth(f.fim - 0.25, f.fim, t)); if (a <= 0) continue;
      ctx.save(); ctx.globalAlpha = a; ctx.font = `800 54px ${F_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const words = f.texto.split(' '), lines = []; let line = '';
      for (const w of words) { const tt = line ? line + ' ' + w : w; if (ctx.measureText(tt).width > 900 && line) { lines.push(line); line = w; } else line = tt; } lines.push(line);
      const cy = 1640;
      lines.forEach((l, i) => { const yy = cy + (i - (lines.length - 1) / 2) * 68; ctx.lineJoin = 'round'; ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(15,8,20,0.85)'; ctx.strokeText(l, W / 2, yy); ctx.fillStyle = '#fff8ec'; ctx.fillText(l, W / 2, yy); });
      ctx.restore();
    }
  }
  function drawBadge(t) {
    const txt = `${cfg.projeto || 'PROJETO E SE?'}  |  EXPERIMENTO #${cfg.experimento || '012'}`;
    ctx.save(); ctx.globalAlpha = 0.75; ctx.font = `700 25px ${F_MONO}`;
    const bw = ctx.measureText(txt).width + 76, bh = 50, bx = (W - bw) / 2, by = 36;
    rr(ctx, bx, by, bw, bh, 25); ctx.fillStyle = 'rgba(8,10,14,0.5)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke();
    ctx.fillStyle = `rgba(255,170,60,${0.5 + 0.5 * Math.abs(Math.sin(t * Math.PI))})`; ctx.beginPath(); ctx.arc(bx + 30, by + bh / 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx + 50, by + bh / 2 + 1);
    ctx.restore();
  }
  function finish(t) {
    // papel, granulado e vinheta (dá o toque feito à mão)
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.16; for (let y = 0; y < H; y += 512) for (let x = 0; x < W; x += 512) ctx.drawImage(paper, x, y); ctx.restore();
    const fr = Math.floor(t * FPS), gimg = grains[fr % 4];
    ctx.save(); ctx.globalAlpha = 0.06; ctx.globalCompositeOperation = 'overlay'; const ox = (hash(fr) * 256) | 0, oy = (hash(fr + 9) * 256) | 0; for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(gimg, x, y); ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, H * 0.47, Math.min(W, H) * 0.38, W / 2, H * 0.5, Math.max(W, H) * 0.68); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,5,15,0.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  const XF = 0.35;   // duração dos cortes suaves
  function renderFrame(t) {
    t = clamp(t, 0, DUR - 1e-6);
    let i = CENAS.findIndex(([, a, b]) => t >= a && t < b); if (i < 0) i = CENAS.length - 1;
    const [name, a, b] = CENAS[i];
    ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    S[name](ctx, t, clamp((t - a) / (b - a)));
    ctx.restore();
    // dissolve para a próxima cena
    const nx = CENAS[i + 1];
    if (nx && t > b - XF && !['controle', 'play'].includes(nx[0])) {
      lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.globalAlpha = 1; lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, W, H);
      S[nx[0]](lctx, t, 0);
      ctx.save(); ctx.globalAlpha = smooth(b - XF, b, t); ctx.drawImage(layer, 0, 0); ctx.restore();
    }
    drawTitle(t); drawCamcorder(t); drawComment(t);
    finish(t);
    drawBadge(t); drawSubtitles(t);
    return comp;
  }
  return { canvas: comp, renderFrame, frameJPEG: (t, q = 0.92) => { renderFrame(t); return comp.toDataURL('image/jpeg', q); } };
}
