// ============================================================================
//  Biblioteca comum dos Shorts 2D "E se…" com tema GTA 6 (Projeto E se? #013–#015).
//  Reaproveita a arte desenhada do #012 (short_tempo/js/arte.js) e adiciona cenários e
//  objetos novos: sala do adulto, cidade néon à beira-mar, praia, flamingo, jacaré,
//  conversível, helicóptero com holofote, loja com fila, multidão com celulares, live,
//  barra de instalação, carimbo, calendário, teias, além da camada final (papel, grão,
//  vinheta, legendas, selo, cartão de comentário). Nada aqui usa logos ou artes oficiais.
// ============================================================================
import * as A from '../../short_tempo/js/arte.js';
export { A };
export const { clamp, smooth, lerp, hash, mix, rgba, rr } = A;
export const bump = (a, b, c, d, t) => smooth(a, b, t) * (1 - smooth(c, d, t));
export const W = 1080, H = 1920;
export const F_TITLE = '"Anton", "Impact", "Arial Black", sans-serif';
export const F_HAND = '"Caveat", "Comic Sans MS", cursive';
export const F_UI = '"Nunito", "Arial Rounded MT Bold", sans-serif';
export const F_MONO = '"Roboto Mono", "DejaVu Sans Mono", monospace';
const INK = A.INK;
const ink = (g, w = 4.5) => { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = w; g.stroke(); };

export const cam = (g, cx, cy, z, rot = 0) => { g.translate(W / 2, H / 2); g.scale(z, z); g.rotate(rot); g.translate(-cx, -cy); };
export const glow = (g, x, y, r, col, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); };
export const tint = (g, col, a, op = 'multiply') => { if (a <= 0) return; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = op; g.globalAlpha = Math.min(1, a); g.fillStyle = col; g.fillRect(0, 0, W, H); g.restore(); };
export const sparkle = (g, x, y, r, a, col = '255,248,220') => { if (a <= 0) return; g.save(); g.translate(x, y); g.fillStyle = `rgba(${col},${a})`; g.beginPath(); for (let j = 0; j < 8; j++) { const ang = j * Math.PI / 4, q = j % 2 ? r * 0.22 : r; g.lineTo(Math.cos(ang) * q, Math.sin(ang) * q); } g.fill(); g.restore(); };
export const dust = (g, t, n, col, area = [0, 0, W, H], k = 1) => { for (let i = 0; i < n; i++) { const x = area[0] + ((hash(i) * area[2] + t * (8 + 12 * hash(i + 1))) % area[2]), y = area[1] + ((hash(i + 2) * area[3] - t * (6 + 10 * hash(i + 3)) + area[3] * 10) % area[3]); g.fillStyle = rgba(col, (0.25 + 0.5 * hash(i + 4)) * (0.5 + 0.5 * Math.sin(t * 2 + i)) * k); g.beginPath(); g.arc(x, y, 1.5 + 3 * hash(i + 5), 0, 7); g.fill(); } };
export const bg = (g, top, bottom) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(-W, -H, 3 * W, 3 * H); };

// ---------------------------------------------------------------- chuva na janela
export function rain(g, x, y, w, h, t, k = 1) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#0e1430'); gr.addColorStop(1, '#1e2450'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  for (let i = 0; i < 26; i++) { g.fillStyle = rgba(['#ffcf7a', '#ff7ab0', '#7ac8ff'][i % 3], 0.35); g.beginPath(); g.arc(x + hash(i) * w, y + h * (0.45 + 0.5 * hash(i + 1)), 6 + 14 * hash(i + 2), 0, 7); g.fill(); }
  if (k > 0) { g.strokeStyle = `rgba(180,200,255,${0.35 * k})`; g.lineWidth = 1.5; for (let i = 0; i < 60; i++) { const sx = x + hash(i * 3) * w, sp = 900 + 400 * hash(i), sy = y + ((hash(i * 7) * h + t * sp) % (h + 60)) - 30; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 3, sy + 22); g.stroke(); } }
  g.restore();
  g.strokeStyle = '#151025'; g.lineWidth = 18; g.strokeRect(x, y, w, h); g.lineWidth = 8; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
}

// ---------------------------------------------------------------- sala do adulto (de costas, TV na frente)
// o: { screen(x,y,w,h) desenha a tela, light, age, beard (silhueta com barba), webs, plant, pizza, sleep }
export function adultRoom(g, t, o = {}) {
  const light = o.light || '#b04aa0';
  const wall = g.createLinearGradient(0, 0, 0, 1300); wall.addColorStop(0, '#120f22'); wall.addColorStop(1, '#1d1832'); g.fillStyle = wall; g.fillRect(-300, -300, W + 600, 1600);
  g.fillStyle = '#100c18'; g.fillRect(-300, 1300, W + 600, 1000);
  rain(g, 40, 260, 270, 520, t, o.rain ?? 1);
  if (o.clock !== false) A.drawClock(g, 920, 330, 62, o.hours ?? 23, o.mins ?? 58);
  g.fillStyle = '#2a1e2a'; g.fillRect(790, 660, 270, 22);
  A.drawCover(g, 870, 600, 78, 104, { rot: -0.06 });
  if (o.plant != null) { const p = o.plant; g.fillStyle = '#6a3a2a'; g.fillRect(970, 600, 60, 60); g.strokeStyle = '#3a8a4a'; g.lineWidth = 6; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(1000, 600); g.quadraticCurveTo(1000 + (k - 2.5) * 30 * p, 600 - 120 * p, 1000 + (k - 2.5) * 70 * p, 600 - (200 + 80 * hash(k)) * p); g.stroke(); } }
  const tv = [210, 740, 660, 380];
  A.drawFlatTV(g, ...tv, (x, y, w, h) => (o.screen ? o.screen(x, y, w, h) : A.drawNeonScreen(g, x, y, w, h, t, { mode: 'count', secs: 107 })));
  g.fillStyle = '#1a1424'; g.fillRect(150, 1186, 780, 40);
  if (o.pizza) { g.save(); g.translate(250, 1170); rr(g, -90, -24, 180, 30, 5); g.fillStyle = '#d8a86a'; g.fill(); ink(g, 4); g.restore(); }
  g.save(); g.globalCompositeOperation = 'screen'; glow(g, 540, 930, 900, light, 0.38); g.restore();
  if (o.webs) webs(g, o.webs);
  g.fillStyle = '#16121e'; rr(g, -60, 1560, W + 120, 500, 60); g.fill(); g.strokeStyle = rgba(light, 0.35); g.lineWidth = 6; g.stroke();
  if (o.person !== false) {
    if (o.sleep) { g.save(); g.translate(540, 1460); g.rotate(-0.5); A.drawBack(g, 0, 0, 1.0, { age: 1, rim: light, rimK: 0.8, arms: false }); g.restore(); }
    else A.drawBack(g, 540, 1400 + (o.slump || 0), 1.12, { age: 1, rim: light, rimK: 0.9, sway: o.sway || 0 });
    if (o.beard) { const b = o.beard; g.save(); g.beginPath(); g.moveTo(470, 1500); g.quadraticCurveTo(440, 1500 + 600 * b, 540, 1520 + 640 * b); g.quadraticCurveTo(640, 1500 + 600 * b, 610, 1500); g.fillStyle = mix('#2f221c', '#e9e6df', o.gray || 0); g.fill(); g.restore(); }
  }
}
export function webs(g, k) {
  g.save(); g.globalAlpha = k * 0.7; g.strokeStyle = '#d8d8e8'; g.lineWidth = 1.6;
  for (const [x, y, s, r] of [[0, 0, 260, 0], [W, 0, 220, Math.PI / 2], [210, 740, 120, 0], [870, 740, 120, Math.PI / 2]]) {
    g.save(); g.translate(x, y); g.rotate(r);
    for (let k2 = 0; k2 < 6; k2++) { const a = (k2 / 5) * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * s, Math.sin(a) * s); g.stroke(); }
    for (let rr2 = 0.25; rr2 <= 1; rr2 += 0.2) { g.beginPath(); for (let k2 = 0; k2 < 6; k2++) { const a = (k2 / 5) * Math.PI / 2; const px = Math.cos(a) * s * rr2, py = Math.sin(a) * s * rr2; k2 ? g.quadraticCurveTo(Math.cos(a - 0.15) * s * rr2 * 0.85, Math.sin(a - 0.15) * s * rr2 * 0.85, px, py) : g.moveTo(px, py); } g.stroke(); }
    g.restore();
  }
  g.restore();
}

// rosto em close iluminado pela tela
export function faceShot(g, t, o = {}) {
  bg(g, o.bgTop || '#140e24', o.bgBot || '#0c0814');
  g.save(); cam(g, 540, o.cy ?? 980, o.zoom ?? 1.0);
  g.save(); g.globalCompositeOperation = 'screen'; glow(g, 540, 900, 1100, o.light || '#6a4ab0', o.lightA ?? 0.4); g.restore();
  A.drawFront(g, 540, 1050, o.s ?? 2.35, o.face || {});
  if (o.after) o.after(g);
  g.restore();
}

// ---------------------------------------------------------------- telas e interface
export function stamp(g, x, y, text, k, col = '#e8343a', rot = -0.18) {
  if (k <= 0) return;
  const s = 1 + 2.2 * (1 - smooth(0, 1, k));
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.globalAlpha = Math.min(1, k * 1.5);
  g.font = `400 150px ${F_TITLE}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(text).width + 70;
  rr(g, -w / 2, -95, w, 190, 18); g.lineWidth = 16; g.strokeStyle = col; g.stroke();
  g.fillStyle = col; g.fillText(text, 0, 6);
  g.restore();
}
export function progressScreen(g, x, y, w, h, t, { label = 'ATUALIZANDO…', pct = 0.01, sub = '' } = {}) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.translate(x, y);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a1030'); gr.addColorStop(1, '#2a1440'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = `800 ${h * 0.09}px ${F_UI}`; g.fillText(label, w / 2, h * 0.35);
  rr(g, w * 0.12, h * 0.5, w * 0.76, h * 0.08, h * 0.04); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fill();
  rr(g, w * 0.12, h * 0.5, Math.max(h * 0.08, w * 0.76 * pct), h * 0.08, h * 0.04); const bgr = g.createLinearGradient(0, 0, w, 0); bgr.addColorStop(0, '#ff5ab0'); bgr.addColorStop(1, '#ffb36a'); g.fillStyle = bgr; g.fill();
  g.font = `700 ${h * 0.06}px ${F_MONO}`; g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillText(sub || `${Math.floor(pct * 100)}%`, w / 2, h * 0.72);
  g.restore();
}
export function wantedStars(g, x, y, n, k, t, s = 1) {
  if (k <= 0) return;
  g.save(); g.translate(x, y); g.scale(s, s);
  for (let i = 0; i < 5; i++) {
    const on = i < n, a = clamp(k * 5 - i), blink = on ? 0.6 + 0.4 * Math.abs(Math.sin(t * 6 + i)) : 0.25;
    g.save(); g.translate((i - 2) * 120, 0); g.scale(0.4 + 0.6 * a, 0.4 + 0.6 * a); g.globalAlpha = a;
    g.beginPath(); for (let j = 0; j < 10; j++) { const ang = -Math.PI / 2 + j * Math.PI / 5, r = j % 2 ? 22 : 52; g.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); } g.closePath();
    g.fillStyle = on ? `rgba(255,255,255,${blink})` : 'rgba(255,255,255,0.2)'; g.fill(); g.lineWidth = 7; g.strokeStyle = '#120a14'; g.stroke();
    g.restore();
  }
  g.restore();
}

// ---------------------------------------------------------------- cidade néon à beira-mar (pôr do sol rosa)
export function neonCity(g, x, y, w, h, t, { night = 0, scroll = 0, road = true, sun = true } = {}) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.translate(x, y);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, mix('#3a1a6a', '#0e0a2a', night)); gr.addColorStop(0.38, mix('#c0408a', '#3a1a5a', night)); gr.addColorStop(0.55, mix('#ff8a6a', '#a03a7a', night)); gr.addColorStop(0.6, mix('#ffc07a', '#ff6a8a', night)); gr.addColorStop(1, mix('#3a1440', '#0a0614', night));
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  if (sun) { g.save(); g.beginPath(); g.arc(w * 0.6, h * 0.55, h * 0.14, Math.PI, 0); g.closePath(); g.clip(); const sg = g.createLinearGradient(0, h * 0.41, 0, h * 0.55); sg.addColorStop(0, '#fff2a0'); sg.addColorStop(1, '#ff6a8a'); g.fillStyle = sg; g.globalAlpha = 1 - 0.7 * night; g.fillRect(0, 0, w, h); g.fillStyle = '#c0408a'; for (let i = 0; i < 5; i++) g.fillRect(0, h * (0.48 + i * 0.015), w, h * 0.004 * (1 + i)); g.restore(); }
  for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(255,220,240,${0.35 - 0.04 * i})`; g.beginPath(); g.ellipse(w * (0.15 + 0.11 * i) - (scroll * 0.05 % w), h * (0.12 + 0.05 * hash(i)), w * 0.08, h * 0.012, 0, 0, 7); g.fill(); }
  // prédios com néon
  const bw = w / 9, off = (scroll * 0.4) % bw;
  for (let i = -1; i < 11; i++) {
    const j = i + Math.floor(scroll * 0.4 / bw), bh = h * (0.12 + 0.24 * hash(j * 3.1 + 7)), bx = i * bw - off;
    g.fillStyle = mix('#5a2050', '#140a24', night); g.fillRect(bx, h * 0.56 - bh, bw * 0.86, bh + 2);
    if (hash(j + 2) > 0.55) { g.strokeStyle = [`#ff5ab0`, `#5ae8ff`, `#ffd36a`][j % 3]; g.lineWidth = Math.max(2, w * 0.004); g.shadowColor = g.strokeStyle; g.shadowBlur = 12; g.strokeRect(bx + bw * 0.12, h * 0.56 - bh + bh * 0.12, bw * 0.6, h * 0.02); g.shadowBlur = 0; }
    g.fillStyle = `rgba(255,220,160,${0.2 + 0.6 * night})`; for (let k = 0; k < 8; k++) if (hash(j * 7 + k) > 0.4) g.fillRect(bx + bw * (0.12 + 0.22 * (k % 3)), h * 0.56 - bh * (0.8 - 0.12 * Math.floor(k / 3)), bw * 0.12, h * 0.01);
  }
  // mar com reflexo
  g.fillStyle = mix('#a04a8a', '#1a0a30', night); g.fillRect(0, h * 0.56, w, h * 0.16);
  for (let i = 0; i < 10; i++) { g.fillStyle = `rgba(255,190,170,${0.45 - i * 0.04})`; const ww = w * 0.22 * (1 - i * 0.06) * (0.8 + 0.2 * Math.sin(t * 2 + i)); g.fillRect(w * 0.6 - ww / 2, h * (0.57 + i * 0.014), ww, h * 0.005); }
  if (road) {
    g.fillStyle = mix('#3a1a3a', '#0e0818', night); g.fillRect(0, h * 0.72, w, h * 0.28);
    g.fillStyle = 'rgba(255,220,240,0.7)'; for (let i = 0; i < 12; i++) g.fillRect(((i * w / 5 - scroll) % (w * 1.4) + w * 1.4) % (w * 1.4) - w * 0.2, h * 0.85, w * 0.08, h * 0.006);
  }
  const P = (px, py, s) => A.palm(g, ((px * w - scroll * 0.9) % (w * 1.3) + w * 1.3) % (w * 1.3) - w * 0.15, py, s, mix('#2a0a24', '#06030c', night));
  P(0.05, h * 0.74, h * 0.42); P(0.4, h * 0.74, h * 0.34); P(0.78, h * 0.75, h * 0.46); P(1.1, h * 0.74, h * 0.3);
  g.restore();
}
// praia de manhã/pôr do sol (cena cheia)
export function beach(g, t, { warm = 0 } = {}) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, mix('#ff9ac8', '#ff7a8a', warm)); gr.addColorStop(0.42, mix('#ffd0b0', '#ffb07a', warm)); gr.addColorStop(0.43, '#4ac0d8'); gr.addColorStop(0.6, '#2a8ab8'); gr.addColorStop(0.61, '#f6dcb0'); gr.addColorStop(1, '#e8c08a'); g.fillStyle = gr; g.fillRect(-W, -H, 3 * W, 3 * H);
  g.fillStyle = '#fff3d0'; g.beginPath(); g.arc(760, 640, 90, 0, 7); g.fill();
  // ondas chegando
  for (let i = 0; i < 4; i++) { const y0 = 1150 + i * 18 + 10 * Math.sin(t * 1.2 + i); g.strokeStyle = `rgba(255,255,255,${0.7 - i * 0.15})`; g.lineWidth = 6; g.beginPath(); for (let x = -20; x <= W + 20; x += 30) g.lineTo(x, y0 + 8 * Math.sin(x * 0.02 + t * 2 + i)); g.stroke(); }
  // prédios distantes à esquerda
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(160,90,140,0.55)'; g.fillRect(i * 70, 800 - 120 - 160 * hash(i + 3), 60, 300); }
  A.palm(g, 120, 1500, 900, '#3a1a30'); A.palm(g, 1000, 1420, 700, '#3a1a30');
}

// ---------------------------------------------------------------- personagens e objetos novos
export function flamingo(g, x, y, s, t, look = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.strokeStyle = '#e86a8a'; g.lineWidth = 8; g.beginPath(); g.moveTo(-10, 0); g.lineTo(-10, -180); g.moveTo(10, 0); g.lineTo(14, -90); g.lineTo(-10, -120); g.stroke();
  g.beginPath(); g.ellipse(0, -220, 80, 50, -0.15, 0, 7); g.fillStyle = '#ff8ab0'; g.fill(); ink(g, 4);
  g.beginPath(); g.moveTo(-40, -230); g.quadraticCurveTo(-70, -200, -20, -190); g.fillStyle = '#e86a8a'; g.fill();
  g.beginPath(); g.moveTo(60, -240); g.bezierCurveTo(110, -300, 30, -360, 50, -420); g.strokeStyle = INK; g.lineWidth = 26; g.stroke(); g.strokeStyle = '#ff8ab0'; g.lineWidth = 18; g.stroke();
  g.save(); g.translate(50, -440); g.rotate(look * 0.3);
  g.beginPath(); g.arc(0, 0, 28, 0, 7); g.fillStyle = '#ff8ab0'; g.fill(); ink(g, 4);
  g.beginPath(); g.moveTo(-10, 4); g.quadraticCurveTo(-50, 10, -48, 44); g.lineTo(-30, 30); g.closePath(); g.fillStyle = '#f2ead8'; g.fill(); ink(g, 3); g.beginPath(); g.moveTo(-48, 44); g.lineTo(-38, 32); g.lineTo(-30, 30); g.fillStyle = '#1a1014'; g.fill();
  g.beginPath(); g.arc(4, -6, 7, 0, 7); g.fillStyle = '#fff'; g.fill(); g.beginPath(); g.arc(2 - 2 * look, -6, 3.5, 0, 7); g.fillStyle = '#120a08'; g.fill();
  g.beginPath(); g.moveTo(-6, -16); g.lineTo(12, -12); ink(g, 3);
  g.restore(); g.restore();
}
export function gator(g, x, y, s, t, walk = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const leg = (lx, ph) => { const k = Math.sin(walk * 8 + ph) * 14; g.beginPath(); g.moveTo(lx, -20); g.lineTo(lx + k, 18); g.lineTo(lx + k + 18, 22); g.strokeStyle = '#3a5a2a'; g.lineWidth = 18; g.stroke(); };
  leg(-120, 0); leg(60, Math.PI); leg(-90, Math.PI); leg(90, 0);
  g.beginPath(); g.moveTo(-380, -10 + 10 * Math.sin(walk * 4)); g.quadraticCurveTo(-260, -40, -160, -50); g.quadraticCurveTo(0, -80, 150, -50); g.lineTo(300, -40); g.lineTo(330, -20); g.lineTo(300, 0); g.quadraticCurveTo(0, 20, -160, 10); g.quadraticCurveTo(-260, 10, -380, -10 + 10 * Math.sin(walk * 4)); g.closePath();
  g.fillStyle = '#5a8a3a'; g.fill(); ink(g, 4.5);
  g.fillStyle = '#3a6a2a'; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(-300 + i * 55, -45 + Math.abs(i - 4) * 3); g.lineTo(-285 + i * 55, -65 + Math.abs(i - 4) * 3); g.lineTo(-270 + i * 55, -45 + Math.abs(i - 4) * 3); g.fill(); }
  g.fillStyle = '#f4efe6'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(170 + i * 22, -6); g.lineTo(180 + i * 22, 6); g.lineTo(190 + i * 22, -6); g.fill(); }
  g.beginPath(); g.arc(160, -62, 16, 0, 7); g.fillStyle = '#5a8a3a'; g.fill(); ink(g, 3); g.beginPath(); g.arc(162, -64, 9, 0, 7); g.fillStyle = '#ffd36a'; g.fill(); g.fillStyle = '#120a08'; g.fillRect(160, -72, 4, 16);
  g.restore();
}
// conversível de lado (o personagem dirigindo, cabelo ao vento)
export function convertible(g, x, y, s, t, { driver = true, speed = 0, col = '#ff4a8a' } = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.save(); g.globalAlpha = 0.25; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 70, 380, 24, 0, 0, 7); g.fill(); g.restore();
  if (driver) {
    g.save(); g.translate(30, -110);
    g.beginPath(); g.arc(0, -60, 50, 0, 7); g.fillStyle = '#f0c39e'; g.fill(); ink(g, 4);
    g.beginPath(); g.moveTo(-52, -70); g.quadraticCurveTo(-30, -130, 30, -112); g.quadraticCurveTo(60, -100, 50, -80); for (let k = 0; k < 4; k++) g.lineTo(-60 - 30 * speed - 10 * k - 8 * Math.sin(t * 20 + k), -95 + k * 12); g.closePath(); g.fillStyle = '#2f221c'; g.fill(); ink(g, 4);
    g.fillStyle = '#120a14'; g.fillRect(14, -72, 44, 14); g.fillRect(-2, -68, 18, 5);   // óculos escuros
    g.beginPath(); g.moveTo(40, -36); g.quadraticCurveTo(28, -26, 16, -32); ink(g, 3);
    g.beginPath(); g.moveTo(-50, 0); g.quadraticCurveTo(0, -20, 50, 0); g.lineTo(60, 80); g.lineTo(-60, 80); g.closePath(); g.fillStyle = '#f4f0e6'; g.fill(); ink(g, 4);
    g.beginPath(); g.moveTo(40, 10); g.quadraticCurveTo(110, 20, 140, 40); g.strokeStyle = '#f0c39e'; g.lineWidth = 22; g.stroke();
    g.restore();
  }
  // carroceria
  g.beginPath(); g.moveTo(-360, 30); g.lineTo(-350, -40); g.quadraticCurveTo(-300, -70, -180, -70); g.lineTo(100, -70); g.lineTo(150, -120); g.lineTo(170, -118); g.lineTo(140, -66); g.quadraticCurveTo(300, -60, 350, -30); g.lineTo(370, 30); g.closePath();
  const cg = g.createLinearGradient(0, -120, 0, 40); cg.addColorStop(0, mix(col, '#ffffff', 0.3)); cg.addColorStop(1, mix(col, '#000000', 0.25)); g.fillStyle = cg; g.fill(); ink(g, 5);
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 6; g.beginPath(); g.moveTo(-320, -40); g.lineTo(300, -36); g.stroke();
  g.fillStyle = '#ffe9a0'; g.beginPath(); g.ellipse(352, -18, 14, 9, 0, 0, 7); g.fill();
  for (const wx of [-220, 230]) { g.save(); g.translate(wx, 30); g.rotate(t * 10 * speed); g.beginPath(); g.arc(0, 0, 60, 0, 7); g.fillStyle = '#16121a'; g.fill(); ink(g, 4); g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fillStyle = '#c8ccd8'; g.fill(); for (let k = 0; k < 5; k++) { g.rotate(1.2566); g.fillStyle = '#7a7e8a'; g.fillRect(-4, 6, 8, 22); } g.restore(); }
  g.restore();
}
export function helicopterSpot(g, x, y, s, t, beamTo = null) {
  if (beamTo) { g.save(); g.globalCompositeOperation = 'screen'; const gr = g.createLinearGradient(x, y, beamTo[0], beamTo[1]); gr.addColorStop(0, 'rgba(255,255,230,0.55)'); gr.addColorStop(1, 'rgba(255,255,230,0.12)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 10 * s, y + 20 * s); g.lineTo(beamTo[0] - 260, beamTo[1] + 40); g.lineTo(beamTo[0] + 260, beamTo[1] + 40); g.lineTo(x + 10 * s, y + 20 * s); g.fill(); glow(g, beamTo[0], beamTo[1], 320, '#fffff0', 0.35); g.restore(); }
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#14121a'; g.beginPath(); g.ellipse(0, 0, 90, 46, 0, 0, 7); g.fill(); g.fillRect(60, -12, 150, 18); g.fillRect(200, -40, 14, 50);
  g.fillStyle = 'rgba(140,200,255,0.6)'; g.beginPath(); g.ellipse(-36, -8, 40, 24, 0, 0, 7); g.fill();
  const r = 230 * Math.abs(Math.cos(t * 40)); g.fillStyle = '#14121a'; g.fillRect(-r, -62, 2 * r, 8); g.fillRect(-4, -62, 8, 20);
  g.fillRect(-60, 46, 120, 6); g.fillRect(-40, 36, 6, 14); g.fillRect(34, 36, 6, 14);
  g.fillStyle = Math.sin(t * 12) > 0 ? '#ff3a3a' : '#3a6aff'; g.beginPath(); g.arc(0, -50, 8, 0, 7); g.fill();
  g.restore();
}
// loja de games à noite com fila
export function storeFront(g, t, { open = 0, queue = 1, flashes = 0 } = {}) {
  bg(g, '#0e0a22', '#1a1230');
  for (let i = 0; i < 40; i++) sparkle(g, hash(i) * W, hash(i + 3) * 500, 2 + 3 * hash(i + 5), 0.3 + 0.4 * Math.abs(Math.sin(t + i)));
  g.fillStyle = '#2a2440'; g.fillRect(80, 420, 920, 980);
  // letreiro genérico
  g.save(); g.font = `400 120px ${F_TITLE}`; g.textAlign = 'center'; g.shadowColor = '#ff5ab0'; g.shadowBlur = 40; g.fillStyle = '#ffd0ec'; g.fillText('GAMES', 540, 560); g.restore();
  g.save(); g.strokeStyle = '#5ae8ff'; g.lineWidth = 6; g.shadowColor = '#5ae8ff'; g.shadowBlur = 20; rr(g, 280, 450, 520, 150, 20); g.stroke(); g.restore();
  // vitrine e porta
  rr(g, 150, 680, 330, 520, 10); g.fillStyle = '#3a2a5a'; g.fill(); g.save(); g.clip(); A.drawNeonScreen(g, 160, 760, 310, 200, t, { mode: 'play' }); g.restore();
  const dw = 330 * open;
  rr(g, 600, 680, 330, 720, 10); g.fillStyle = open > 0 ? '#ffe8c0' : '#20182e'; g.fill();
  g.save(); g.globalCompositeOperation = 'screen'; glow(g, 765, 1040, 520 * open + 1, '#ffe0b0', 0.6 * open); g.restore();
  g.fillStyle = '#20182e'; g.fillRect(600 + dw / 2, 680, 165 - dw / 2, 720); g.fillRect(765, 680, 165 - dw / 2, 720);
  g.fillStyle = '#100c18'; g.fillRect(-W, 1400, 3 * W, 1000);
  // fila (silhuetas), do fundo para a frente
  for (let i = 9; i >= 0; i--) { const k = i / 9, xx = 300 - 520 * k + 30 * Math.sin(i * 1.7), yy = 1380 - 230 * k, sc = 0.55 - 0.3 * k; if (k > queue) continue; A.drawBack(g, xx, yy, sc, { age: 0.6 + 0.4 * hash(i), rim: '#ff8ad0', rimK: 0.6, arms: false });
    if (flashes > 0 && hash(i + Math.floor(t * 6)) > 0.7) { g.save(); g.globalCompositeOperation = 'screen'; glow(g, xx + 40, yy - 40 * sc * 4, 120, '#ffffff', 0.8 * flashes); g.restore(); } }
}
// câmera de celular / live: interface por cima
export function liveUI(g, t, viewers, chat = [], k = 1) {
  if (k <= 0) return;
  g.save(); g.globalAlpha = k;
  rr(g, 60, 150, 190, 60, 12); g.fillStyle = '#e8243a'; g.fill(); g.fillStyle = '#fff'; g.font = `900 36px ${F_UI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AO VIVO', 155, 182);
  rr(g, 270, 150, 300, 60, 12); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fill(); g.fillStyle = '#fff'; g.font = `800 36px ${F_UI}`; g.font = `800 32px ${F_UI}`; g.fillText(`${viewers.toLocaleString('pt-BR')} assistindo`, 420, 182);
  chat.forEach(([name, msg, age], i) => { const a = clamp(age * 3) * (1 - clamp((age - 3) * 2)); if (a <= 0) return; const yy = 1380 - i * 92 - 20 * clamp(age); g.globalAlpha = k * a; rr(g, 60, yy - 36, 760, 76, 20); g.fillStyle = 'rgba(10,6,20,0.65)'; g.fill(); g.textAlign = 'left'; g.font = `900 32px ${F_UI}`; g.fillStyle = ['#ff8ad0', '#5ae8ff', '#ffd36a', '#8aff9a'][i % 4]; g.fillText(name, 84, yy + 2); const nw = g.measureText(name + '  ').width; g.font = `700 32px ${F_UI}`; g.fillStyle = '#fff'; g.fillText(msg, 84 + nw, yy + 2); });
  g.restore();
}
// cidade à noite com janelas acendendo (milhões apertando play)
export function cityWindows(g, t, k, { seed = 0 } = {}) {
  bg(g, '#0a0820', '#1a0e2a');
  for (let i = 0; i < 60; i++) sparkle(g, hash(i + seed) * W, hash(i + 7) * 600, 2 + 2 * hash(i + 2), 0.2 + 0.3 * Math.abs(Math.sin(t + i)));
  const rows = [[1300, 0.5, 260, 18], [1500, 0.75, 360, 14], [1750, 1, 480, 10]];
  rows.forEach(([base, sc, maxH, n], r) => {
    for (let i = 0; i < n; i++) {
      const bw = W / n, bx = i * bw, bh = maxH * (0.5 + 0.5 * hash(i * 3 + r * 17));
      g.fillStyle = mix('#140c28', '#241640', r / 2); g.fillRect(bx + 2, base - bh, bw - 4, bh + 400);
      const cols = Math.max(2, Math.floor(bw / (26 * sc))), rowsW = Math.floor(bh / (40 * sc));
      for (let cx = 0; cx < cols; cx++) for (let ry = 0; ry < rowsW; ry++) {
        const id = i * 97 + cx * 13 + ry * 7 + r * 1000, on = k > hash(id) ? 1 : 0, wx = bx + 8 * sc + cx * (bw - 12 * sc) / cols, wy = base - bh + 14 * sc + ry * 40 * sc;
        g.fillStyle = on ? ['#ff6ab8', '#ff9a7a', '#c86aff', '#ffb36a'][id % 4] : 'rgba(255,220,160,0.08)';
        g.fillRect(wx, wy, 12 * sc, 18 * sc);
        if (on && hash(id + 1) > 0.85) { g.save(); g.globalCompositeOperation = 'screen'; glow(g, wx + 6 * sc, wy + 9 * sc, 40 * sc, '#ff6ab8', 0.3); g.restore(); }
      }
    }
  });
}

// ---------------------------------------------------------------- camada final e textos
export function makeFinisher() {
  const paper = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); const im = g.createImageData(512, 512); for (let i = 0; i < 512 * 512; i++) { const x = i % 512, y = (i / 512) | 0; const v = 200 + 40 * hash(i * 0.37) + 15 * Math.sin(x * 0.05 + hash(y) * 3) * Math.sin(y * 0.031); im.data[i * 4] = v; im.data[i * 4 + 1] = v * 0.97; im.data[i * 4 + 2] = v * 0.9; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); return c; })();
  const grains = Array.from({ length: 4 }, (_, k) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), im = g.createImageData(256, 256); for (let i = 0; i < 256 * 256; i++) { const v = (hash(i * 0.731 + k * 91.7) * 255) | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); return c; });
  return (ctx, t, fps = 30) => {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.16; for (let y = 0; y < H; y += 512) for (let x = 0; x < W; x += 512) ctx.drawImage(paper, x, y); ctx.restore();
    const fr = Math.floor(t * fps), gimg = grains[fr % 4];
    ctx.save(); ctx.globalAlpha = 0.06; ctx.globalCompositeOperation = 'overlay'; const ox = (hash(fr) * 256) | 0, oy = (hash(fr + 9) * 256) | 0; for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(gimg, x, y); ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, H * 0.47, Math.min(W, H) * 0.38, W / 2, H * 0.5, Math.max(W, H) * 0.68); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,5,15,0.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  };
}
export function title(ctx, t, l1, l2, t1 = 3.9, col2 = '#ffd36a') {
  const a = smooth(0.1, 0.5, t) * (1 - smooth(t1, t1 + 0.5, t)); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24;
  const fit = (txt, size) => { let s = size; ctx.font = `400 ${s}px ${F_TITLE}`; while (ctx.measureText(txt).width > 980) { s -= 4; ctx.font = `400 ${s}px ${F_TITLE}`; } return s; };
  fit(l1, 100); ctx.lineWidth = 16; ctx.strokeStyle = '#120a18'; ctx.strokeText(l1, W / 2, 300); ctx.fillStyle = '#ffffff'; ctx.fillText(l1, W / 2, 300);
  fit(l2, 134); ctx.strokeText(l2, W / 2, 440); ctx.fillStyle = col2; ctx.fillText(l2, W / 2, 440);
  ctx.restore();
}
export function commentCard(ctx, t, t0, t1, l1, l2, cta = 'COMENTA ⤵') {
  const a = smooth(t0, t0 + 0.5, t) * (1 - smooth(t1 - 0.5, t1, t)); if (a <= 0) return;
  const pop = 1 + 0.12 * Math.exp(-Math.max(0, t - t0) * 7);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, 300); ctx.scale(pop, pop); ctx.rotate(-0.025);
  rr(ctx, -440, -120, 880, 290, 40); ctx.fillStyle = 'rgba(250,244,232,0.96)'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#2a1a16'; ctx.stroke();
  ctx.textAlign = 'center'; ctx.fillStyle = '#2a1a16'; ctx.font = `700 74px ${F_HAND}`; ctx.fillText(l1, 0, -20); ctx.fillText(l2, 0, 60);
  ctx.font = `900 40px ${F_UI}`; ctx.fillStyle = '#d0402a'; ctx.fillText(cta, 0, 135);
  ctx.restore();
}
export function subtitles(ctx, t, frases, DUR) {
  for (const f of frases) {
    if (f.inicio <= 0.01) continue;
    if (t < f.inicio - 0.05 || t > f.fim + 0.05) continue;
    const a = smooth(f.inicio, f.inicio + 0.25, t) * (f.fim >= DUR ? 1 : 1 - smooth(f.fim - 0.25, f.fim, t)); if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha = a; ctx.font = `800 54px ${F_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const words = (f.legenda || f.texto).split(' '), lines = []; let line = '';
    for (const w of words) { const tt = line ? line + ' ' + w : w; if (ctx.measureText(tt).width > 900 && line) { lines.push(line); line = w; } else line = tt; } lines.push(line);
    lines.forEach((l, i) => { const yy = 1640 + (i - (lines.length - 1) / 2) * 68; ctx.lineJoin = 'round'; ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(15,8,20,0.85)'; ctx.strokeText(l, W / 2, yy); ctx.fillStyle = '#fff8ec'; ctx.fillText(l, W / 2, yy); });
    ctx.restore();
  }
}
export function badge(ctx, t, cfg) {
  const txt = `${cfg.projeto || 'PROJETO E SE?'}  |  EXPERIMENTO #${cfg.experimento}`;
  ctx.save(); ctx.globalAlpha = 0.75; ctx.font = `700 25px ${F_MONO}`;
  const bw = ctx.measureText(txt).width + 76, bh = 50, bx = (W - bw) / 2, by = 36;
  rr(ctx, bx, by, bw, bh, 25); ctx.fillStyle = 'rgba(8,10,14,0.5)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke();
  ctx.fillStyle = `rgba(255,90,170,${0.5 + 0.5 * Math.abs(Math.sin(t * Math.PI))})`; ctx.beginPath(); ctx.arc(bx + 30, by + bh / 2, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx + 50, by + bh / 2 + 1);
  ctx.restore();
}
export function bigText(ctx, text, y, k, { size = 130, col = '#ffffff', rot = -0.03 } = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, k); ctx.translate(W / 2, y); ctx.rotate(rot); const s = 1 + 0.15 * (1 - smooth(0, 1, k)); ctx.scale(s, s);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; let fs = size; ctx.font = `400 ${fs}px ${F_TITLE}`; while (ctx.measureText(text).width > 980) { fs -= 4; ctx.font = `400 ${fs}px ${F_TITLE}`; }
  ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = '#120a18'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20; ctx.strokeText(text, 0, 0); ctx.fillStyle = col; ctx.fillText(text, 0, 0);
  ctx.restore();
}

// capa própria do "novo jogo" (painéis néon com um 6 grande, sem logo oficial)
export function drawCover6(g, x, y, w, h, { glow: gl = 0, rot = 0 } = {}) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (gl > 0) { g.shadowColor = `rgba(255,120,200,${gl})`; g.shadowBlur = 90 * gl; }
  rr(g, -w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 10); g.fillStyle = '#121214'; g.fill(); g.shadowBlur = 0;
  rr(g, -w / 2, -h / 2, w, h, 4); g.fillStyle = '#f4efe6'; g.fill();
  const gap = w * 0.025;
  const panels = [[0, 0, 0.55, 0.28], [0.55, 0, 1, 0.34], [0, 0.28, 0.4, 0.64], [0.6, 0.34, 1, 0.66], [0, 0.64, 0.5, 1], [0.5, 0.66, 1, 1]];
  const art = [
    (P, Q) => { neonCity(g, 0, 0, P, Q, 3, { road: false }); },
    (P, Q) => { const gr = g.createLinearGradient(0, 0, 0, Q); gr.addColorStop(0, '#ff9ac8'); gr.addColorStop(1, '#ffd0a0'); g.fillStyle = gr; g.fillRect(0, 0, P, Q); flamingo(g, P * 0.5, Q * 1.05, Q / 520, 0, 0.5); },
    (P, Q) => { g.fillStyle = '#5ae8ff'; g.fillRect(0, 0, P, Q); A.palm(g, P * 0.5, Q, Q * 0.9, '#1a3a4a'); },
    (P, Q) => { g.fillStyle = '#c86aff'; g.fillRect(0, 0, P, Q); helicopterSpot(g, P * 0.5, Q * 0.35, Q / 300, 0); },
    (P, Q) => { g.fillStyle = '#ff6a8a'; g.fillRect(0, 0, P, Q); convertible(g, P * 0.5, Q * 0.7, P / 850, 0, { driver: true, col: '#5ae8ff' }); },
    (P, Q) => { g.fillStyle = '#8ad86a'; g.fillRect(0, 0, P, Q); gator(g, P * 0.5, Q * 0.65, P / 800, 0); },
  ];
  panels.forEach(([a, b, c, d], i) => { const px = -w / 2 + a * w + gap / 2, py = -h / 2 + b * h + gap / 2, pw = (c - a) * w - gap, ph = (d - b) * h - gap; g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip(); g.translate(px, py); art[i](pw, ph); g.restore(); g.strokeStyle = '#121214'; g.lineWidth = 3; g.strokeRect(px, py, pw, ph); });
  g.save(); g.font = `400 ${h * 0.42}px ${F_TITLE}`; g.textAlign = 'center'; g.textBaseline = 'middle'; const gr = g.createLinearGradient(0, -h * 0.2, 0, h * 0.2); gr.addColorStop(0, '#ffd36a'); gr.addColorStop(1, '#ff5ab0'); g.lineJoin = 'round'; g.lineWidth = h * 0.04; g.strokeStyle = '#121214'; g.strokeText('6', 0, h * 0.04); g.fillStyle = gr; g.fillText('6', 0, h * 0.04); g.restore();
  g.restore();
}
export function bubble(ctx, x, y, w, lines, k, { tail = 'down', size = 64, col = '#2a1a16', tx = 0 } = {}) {
  if (k <= 0) return;
  const h = lines.length * size * 1.05 + 70, s = 0.6 + 0.4 * smooth(0, 1, k);
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.5); ctx.translate(x, y); ctx.scale(s, s);
  rr(ctx, -w / 2, -h / 2, w, h, 40); ctx.fillStyle = '#fbf6ec'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#2a1a16'; ctx.stroke();
  ctx.beginPath(); if (tail === 'down') { ctx.moveTo(tx - 30, h / 2 - 3); ctx.lineTo(tx - 10, h / 2 + 60); ctx.lineTo(tx + 30, h / 2 - 3); } else { ctx.moveTo(tx - 30, -h / 2 + 3); ctx.lineTo(tx - 10, -h / 2 - 60); ctx.lineTo(tx + 30, -h / 2 + 3); } ctx.fillStyle = '#fbf6ec'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fbf6ec'; ctx.fillRect(tx - 27, tail === 'down' ? h / 2 - 8 : -h / 2 - 2, 54, 10);
  ctx.fillStyle = col; ctx.font = `700 ${size}px ${F_HAND}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * size * 1.05 + 4));
  ctx.restore();
}
export function calendar(g, x, y, s, top, big, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  rr(g, -150, -170, 300, 340, 16); g.fillStyle = '#fbf6ec'; g.fill(); ink(g, 5);
  rr(g, -150, -170, 300, 90, 16); g.fillStyle = '#e04a4a'; g.fill(); ink(g, 5);
  g.fillStyle = '#fff'; g.font = `900 46px ${F_UI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(top, 0, -124);
  g.fillStyle = '#2a1a16'; g.font = `400 150px ${F_TITLE}`; g.fillText(big, 0, 40);
  g.restore();
}
export function museum(g, t, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#e8dcc8'; g.fillRect(-200, 0, 400, 520); ink(g, 5); g.strokeRect(-200, 0, 400, 520);
  g.fillStyle = '#d8ccb6'; g.fillRect(-230, -20, 460, 40); g.strokeRect(-230, -20, 460, 40);
  A.drawController(g, 0, -120, 0.62, {});
  g.beginPath(); g.moveTo(-220, -20); g.lineTo(-220, -260); g.quadraticCurveTo(-220, -360, 0, -360); g.quadraticCurveTo(220, -360, 220, -260); g.lineTo(220, -20); g.fillStyle = 'rgba(200,230,255,0.18)'; g.fill(); g.strokeStyle = 'rgba(220,240,255,0.8)'; g.lineWidth = 5; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 10; g.beginPath(); g.moveTo(-170, -240); g.quadraticCurveTo(-160, -320, -80, -330); g.stroke();
  rr(g, -150, 120, 300, 120, 8); g.fillStyle = '#b08a4a'; g.fill(); ink(g, 4);
  g.fillStyle = '#2a1a10'; g.font = `800 34px ${F_UI}`; g.textAlign = 'center'; g.fillText('CONTROLE', 0, 168); g.font = `700 28px ${F_UI}`; g.fillText('Século XXI', 0, 210);
  g.restore();
}

// ---------------------------------------------------------------- pessoa andando de perfil (para a direita)
export function andarilho(g, x, y, s, t, { passo = 1, cansado = 0, camisa = '#3a8ac8', mochila = true } = {}) {
const ink = (g, w = 5) => { g.lineWidth = w; g.strokeStyle = A.INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };
  g.save(); g.translate(x, y); g.scale(s, s);
  const ph = t * 7 * passo, sw = Math.sin(ph) * 0.5, bob = Math.abs(Math.cos(ph)) * 8;
  g.translate(0, -bob); g.rotate(0.05 + 0.15 * cansado);
  const leg = (a, col) => { g.save(); g.translate(0, -150); g.rotate(a); g.fillStyle = col; rr(g, -18, 0, 36, 150, 16); g.fill(); ink(g, 4); g.fillStyle = '#e8c04a'; rr(g, -14, 140, 56, 16, 6); g.fill(); ink(g, 3); g.restore(); };
  const arm = (a, col) => { g.save(); g.translate(0, -300); g.rotate(a); g.fillStyle = col; rr(g, -14, 0, 28, 120, 14); g.fill(); ink(g, 4); g.beginPath(); g.arc(0, 128, 16, 0, 7); g.fillStyle = '#f0c39e'; g.fill(); ink(g, 3); g.restore(); };
  leg(-sw, '#2a3a5a'); arm(sw, mix(camisa, '#000000', 0.2));
  rr(g, -45, -330, 90, 190, 30); g.fillStyle = camisa; g.fill(); ink(g, 5);
  g.fillStyle = '#e8d8b0'; g.fillRect(-48, -380 + 2, 0, 0);
  // mochila
  if (mochila) { rr(g, -95, -320, 60, 120, 18); g.fillStyle = '#d8743a'; g.fill(); ink(g, 4); }
  leg(sw, '#34466a'); arm(-sw, camisa);
  // cabeça de perfil
  g.beginPath(); g.arc(8, -385, 58, 0, 7); g.fillStyle = '#f0c39e'; g.fill(); ink(g, 5);
  g.beginPath(); g.moveTo(-50, -400); g.quadraticCurveTo(-30, -460, 30, -448); g.quadraticCurveTo(70, -440, 64, -410); for (let k = 0; k < 4; k++) g.lineTo(40 - k * 22, -420 + (k % 2 ? 10 : -6)); g.closePath(); g.fillStyle = '#2f221c'; g.fill(); ink(g, 4);
  g.beginPath(); g.arc(36, -392, 6, 0, 7); g.fillStyle = '#120a08'; g.fill();
  g.beginPath(); g.moveTo(62, -385); g.lineTo(74, -372); g.lineTo(60, -368); ink(g, 3);
  g.beginPath(); g.moveTo(40, -355); g.quadraticCurveTo(50, -350 + 8 * cansado, 58, -356); ink(g, 3);
  if (cansado > 0.3) for (let i = 0; i < 3; i++) { const p = (t * 1.5 + i / 3) % 1; g.fillStyle = `rgba(120,190,255,${1 - p})`; g.beginPath(); g.ellipse(-20 + i * 20, -420 + p * 60, 6, 9, 0, 0, 7); g.fill(); }
  g.restore();
}
