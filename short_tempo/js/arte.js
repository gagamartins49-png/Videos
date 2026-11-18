// ============================================================================
//  Arte 2D desenhada à mão (Canvas 2D) — Projeto E se? #012 "E se você pudesse voltar no tempo?"
//  Personagem com idade contínua (0 = criança, 0.5 = adolescente, 1 = adulto), visto de frente
//  (iluminado pela tela) ou de costas (silhueta com luz de recorte). Objetos: controle, capa do
//  jogo (arte própria em painéis), presente, telas (contagem regressiva e mundo do jogo).
// ============================================================================
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
export const lerp = (a, b, u) => a + (b - a) * u;
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
export const mix = (a, b, u) => { const A = hex(a), B = hex(b); return '#' + A.map((x, i) => Math.round(lerp(x, B[i], clamp(u))).toString(16).padStart(2, '0')).join(''); };
export const rgba = (c, a) => { const A = hex(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; };

export const INK = '#2a1a16';
const SKIN = '#f0c39e', SKIN_SH = '#d39577', HAIR = '#2f221c', HAIR_HI = '#5a4234';

export function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function inkStroke(g, w = 4.5) { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = w; g.stroke(); }
function shadeSide(g, pathFn, col, x0, x1, a = 0.55) { g.save(); pathFn(); g.clip(); const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(col, a)); g.fillStyle = gr; g.fillRect(-400, -400, 800, 900); g.restore(); }

// ---------------------------------------------------------------- rosto de frente
// o: { age, look:[x,y], blink, tired, smile, open, wonder, tear, browUp, refl (cor da tela no olho), shirt }
export function drawFront(g, x, y, s, o = {}) {
  const A = o.age ?? 1, tired = o.tired || 0, smile = o.smile || 0, open = o.open || 0, wonder = o.wonder || 0;
  g.save(); g.translate(x, y); g.scale(s, s); if (o.tilt) g.rotate(o.tilt);
  const W = lerp(122, 114, A), C = lerp(108, 98, A), JY = lerp(102, 132, A), CW = lerp(54, 44, A), BY = lerp(122, 152, A), T = -150;
  const head = () => { g.beginPath(); g.moveTo(0, T); g.bezierCurveTo(W * 0.78, T, W, -92, W, -30); g.bezierCurveTo(W, 12, C, JY - 40, CW + 30, JY); g.quadraticCurveTo(CW - 10, BY, 0, BY); g.quadraticCurveTo(-(CW - 10), BY, -(CW + 30), JY); g.bezierCurveTo(-C, JY - 40, -W, 12, -W, -30); g.bezierCurveTo(-W, -92, -W * 0.78, T, 0, T); g.closePath(); };
  // ---- roupa (atrás da cabeça)
  const shirt = o.shirt || (A > 0.75 ? 'hoodie' : A > 0.35 ? 'teen' : 'kid');
  const SW = lerp(205, 262, A), top = BY + lerp(18, 26, A);
  const torso = () => { g.beginPath(); g.moveTo(-SW, 520); g.bezierCurveTo(-SW, top + 60, -SW * 0.75, top + 6, -60, top); g.lineTo(60, top); g.bezierCurveTo(SW * 0.75, top + 6, SW, top + 60, SW, 520); g.closePath(); };
  const cloth = shirt === 'hoodie' ? '#5c6472' : shirt === 'teen' ? '#3f6b55' : '#cf4a3c';
  if (shirt === 'hoodie' || shirt === 'teen') { g.beginPath(); g.ellipse(0, BY + 8, lerp(150, 170, A), 70, 0, Math.PI, 0); g.fillStyle = mix(cloth, '#000000', 0.25); g.fill(); inkStroke(g); }
  torso(); g.fillStyle = cloth; g.fill();
  if (shirt === 'kid') { g.save(); torso(); g.clip(); g.fillStyle = '#f3ead8'; g.fillRect(-400, top + 120, 800, 34); g.fillRect(-400, top + 196, 800, 18); g.restore(); }
  shadeSide(g, torso, '#1a1020', -SW * 0.2, SW, 0.5); torso(); inkStroke(g);
  // pescoço
  const NW = lerp(36, 46, A);
  g.beginPath(); g.moveTo(-NW, BY - 40); g.lineTo(-NW, top + 8); g.quadraticCurveTo(0, top + 34, NW, top + 8); g.lineTo(NW, BY - 40); g.closePath(); g.fillStyle = SKIN_SH; g.fill(); inkStroke(g, 3.5);
  if (shirt === 'hoodie' || shirt === 'teen') {   // gola e cordões
    g.beginPath(); g.moveTo(-70, top + 2); g.quadraticCurveTo(0, top + 70, 70, top + 2); g.strokeStyle = mix(cloth, '#000000', 0.35); g.lineWidth = 14; g.stroke();
    g.beginPath(); g.moveTo(-70, top + 2); g.quadraticCurveTo(0, top + 70, 70, top + 2); inkStroke(g, 3.5);
    if (shirt === 'hoodie') for (const sx of [-28, 28]) { g.beginPath(); g.moveTo(sx, top + 40); g.quadraticCurveTo(sx + 4, top + 110, sx - 2, top + 150); g.strokeStyle = '#e8e2d6'; g.lineWidth = 6; g.stroke(); }
  } else { g.beginPath(); g.moveTo(-58, top + 2); g.quadraticCurveTo(0, top + 48, 58, top + 2); inkStroke(g, 4); }
  // ---- orelhas
  const EY = lerp(6, -8, A);
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * (W - 2), EY + 22, 17, 27, sx * 0.15, 0, Math.PI * 2); g.fillStyle = SKIN; g.fill(); inkStroke(g, 3.5); g.beginPath(); g.ellipse(sx * (W - 2), EY + 24, 7, 14, 0, 0, Math.PI * 2); g.fillStyle = SKIN_SH; g.fill(); }
  // ---- cabeça
  head(); g.fillStyle = SKIN; g.fill();
  shadeSide(g, head, SKIN_SH, -20, W, 0.7);
  g.save(); head(); g.clip(); g.fillStyle = rgba(SKIN_SH, 0.6); g.beginPath(); g.ellipse(0, T + 40, W * 1.1, 70, 0, 0, Math.PI * 2); g.fill();   // sombra do cabelo
  // bochechas
  g.fillStyle = `rgba(232,110,100,${0.32 * (1 - A) + 0.12 + 0.18 * smile + 0.15 * wonder})`; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 62, EY + 54, 26, 15, 0, 0, Math.PI * 2); g.fill(); }
  // barba por fazer
  const st = clamp((A - 0.78) / 0.22);
  if (st > 0) { g.fillStyle = `rgba(70,60,70,${0.22 * st})`; g.beginPath(); g.moveTo(-C + 6, 30); g.bezierCurveTo(-C, JY - 30, -CW, BY, 0, BY); g.bezierCurveTo(CW, BY, C, JY - 30, C - 6, 30); g.quadraticCurveTo(70, 120, 0, 116); g.quadraticCurveTo(-70, 120, -C + 6, 30); g.fill();
    g.fillStyle = `rgba(50,40,45,${0.35 * st})`; for (let i = 0; i < 90; i++) { const a = hash(i) * Math.PI, r = 60 + hash(i + 3) * 50; g.fillRect(Math.cos(a) * r * 0.9, 60 + Math.sin(a) * r * 0.75, 2.2, 2.2); } }
  g.restore();
  head(); inkStroke(g, 5);
  // ---- olhos
  const ex = lerp(48, 46, A), rx = lerp(31, 26, A), ry = lerp(25, 16, A) + 4 * wonder, ir = lerp(18, 13.5, A) + 2 * wonder;
  const [lx, ly] = o.look || [0, 0];
  const lid = clamp((o.blink || 0) + tired * 0.38 - wonder * 0.2);
  for (const sx of [-1, 1]) {
    const cx = sx * ex;
    g.save(); g.translate(cx, EY);
    const eye = () => { g.beginPath(); g.moveTo(-rx, 2); g.bezierCurveTo(-rx * 0.6, -ry * 1.25, rx * 0.6, -ry * 1.25, rx, 0); g.bezierCurveTo(rx * 0.55, ry * 1.05, -rx * 0.55, ry * 1.05, -rx, 2); g.closePath(); };
    // olheiras
    if (tired > 0) { g.beginPath(); g.moveTo(-rx * 0.8, ry + 6); g.quadraticCurveTo(0, ry + 20, rx * 0.8, ry + 4); g.strokeStyle = `rgba(110,70,110,${0.5 * tired})`; g.lineWidth = 5; g.stroke(); g.beginPath(); g.moveTo(-rx * 0.6, ry + 14); g.quadraticCurveTo(0, ry + 26, rx * 0.6, ry + 12); g.strokeStyle = `rgba(110,70,110,${0.3 * tired})`; g.lineWidth = 3; g.stroke(); }
    eye(); g.fillStyle = '#fbf6ee'; g.fill();
    g.save(); eye(); g.clip();
    const ix = lx * rx * 0.35, iy = ly * ry * 0.35 + 2;
    const gr = g.createRadialGradient(ix, iy + 4, 2, ix, iy, ir); gr.addColorStop(0, '#8a5a32'); gr.addColorStop(0.7, '#5a3820'); gr.addColorStop(1, '#2a1a10');
    g.fillStyle = gr; g.beginPath(); g.arc(ix, iy, ir, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#120a08'; g.beginPath(); g.arc(ix, iy, ir * (0.45 - 0.08 * wonder), 0, Math.PI * 2); g.fill();
    if (o.refl) { g.fillStyle = rgba(o.refl, 0.55); g.beginPath(); g.ellipse(ix + ir * 0.25, iy + ir * 0.35, ir * 0.55, ir * 0.32, -0.3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ix - ir * 0.35, iy - ir * 0.38, ir * (0.32 + 0.1 * (1 - A)), ir * (0.26 + 0.1 * (1 - A)), -0.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(ix + ir * 0.38, iy + ir * 0.3, ir * 0.13, 0, Math.PI * 2); g.fill();
    if (wonder > 0.05) { g.save(); g.translate(ix - ir * 0.1, iy - ir * 0.05); g.fillStyle = `rgba(255,255,255,${wonder})`; const k = ir * 0.42 * wonder; g.beginPath(); for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4, r = j % 2 ? k * 0.25 : k; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); g.restore(); }
    // pálpebra superior (cansaço / piscada)
    if (lid > 0) { const yl = -ry * 1.2 + (ry * 2.3) * lid; g.fillStyle = SKIN; g.fillRect(-rx - 5, -ry * 1.6, rx * 2 + 10, yl + ry * 1.6); g.beginPath(); g.moveTo(-rx, yl + 2); g.quadraticCurveTo(0, yl + 6 * (1 - lid), rx, yl); inkStroke(g, 4); }
    g.restore();
    // contorno + cílios
    g.beginPath(); g.moveTo(-rx - 2, 3); g.bezierCurveTo(-rx * 0.6, -ry * 1.3 + ry * 2.3 * lid * 0.9, rx * 0.6, -ry * 1.3 + ry * 2.3 * lid * 0.9, rx + 3, -1); inkStroke(g, lerp(6, 6.5, A));
    g.beginPath(); g.moveTo(sx * (rx + 1), -1); g.lineTo(sx * (rx + 9), -7); inkStroke(g, 4);
    g.beginPath(); g.moveTo(-rx * 0.5, ry * 0.95); g.quadraticCurveTo(0, ry * 1.12, rx * 0.5, ry * 0.9); g.strokeStyle = rgba(INK, 0.45); g.lineWidth = 2.5; g.stroke();
    g.restore();
  }
  // ---- sobrancelhas
  const bu = o.browUp || 0;
  for (const sx of [-1, 1]) { g.beginPath(); const by = EY - lerp(40, 36, A) - 6 * wonder; g.moveTo(sx * (ex - 30), by + 2 - 12 * bu + 5 * tired); g.quadraticCurveTo(sx * ex, by - 10 - 4 * bu, sx * (ex + 32), by + 2 + 6 * bu); inkStroke(g, lerp(7, 9, A)); }
  // ---- nariz
  const NY = lerp(42, 50, A), nk = lerp(0.8, 1.1, A);
  g.beginPath(); g.moveTo(6 * nk, NY - 26 * nk); g.quadraticCurveTo(14 * nk, NY - 2, 6 * nk, NY + 6); g.strokeStyle = rgba(INK, 0.6); g.lineWidth = 3.5; g.stroke();
  g.fillStyle = rgba(SKIN_SH, 0.9); g.beginPath(); g.ellipse(-2, NY + 8, 12 * nk, 5, 0, 0, Math.PI * 2); g.fill();
  // ---- boca
  const MY = lerp(76, 96, A), mw = lerp(22, 28, A) + 6 * smile;
  if (open > 0.05) { g.beginPath(); g.ellipse(0, MY + 4, mw * 0.55 + 4 * open, 6 + 16 * open, 0, 0, Math.PI * 2); g.fillStyle = '#6a2a2a'; g.fill(); g.save(); g.clip(); g.fillStyle = '#d96a6a'; g.beginPath(); g.ellipse(0, MY + 16 * open, mw * 0.4, 8, 0, 0, Math.PI * 2); g.fill(); g.restore(); g.beginPath(); g.ellipse(0, MY + 4, mw * 0.55 + 4 * open, 6 + 16 * open, 0, 0, Math.PI * 2); inkStroke(g, 4); }
  else { g.beginPath(); g.moveTo(-mw, MY - 2 * smile + 2 * tired); g.quadraticCurveTo(0, MY + 14 * smile - 5 * tired, mw, MY - 4 * smile + 2 * tired); inkStroke(g, 4.5); }
  // ---- cabelo (mesmo corte desarrumado em todas as idades)
  const FY = lerp(-58, -78, A);
  const hairP = () => {
    g.beginPath(); g.moveTo(-W - 8, -8); g.bezierCurveTo(-W - 16, -150, -70, -196, 0, -188); g.bezierCurveTo(78, -198, W + 22, -150, W + 8, -8);
    g.quadraticCurveTo(W - 4, -60, W - 18, FY + 10);
    const n = 7; for (let i = 0; i < n; i++) { const x0 = W - 18 - (i * (2 * W - 36)) / n, x1 = W - 18 - ((i + 1) * (2 * W - 36)) / n, tipY = FY + (i % 2 ? 26 : 10) + 6 * hash(i + 2), dip = FY - 22 - 8 * hash(i); g.quadraticCurveTo((x0 + x1) / 2 + 6, dip, x1 + (i % 2 ? 4 : -4), tipY); }
    g.quadraticCurveTo(-W + 4, -60, -W - 8, -8); g.closePath();
  };
  hairP(); g.fillStyle = HAIR; g.fill();
  g.save(); hairP(); g.clip(); g.strokeStyle = rgba(HAIR_HI, 0.9); g.lineWidth = 10; g.beginPath(); g.arc(-10, -40, 140, -2.6, -1.9); g.stroke(); g.lineWidth = 5; g.beginPath(); g.arc(-10, -40, 120, -2.4, -2.0); g.stroke(); g.restore();
  hairP(); inkStroke(g, 5);
  // tufos no topo
  for (const [tx, ty, a] of [[-30, -186, -0.5], [20, -192, 0.3], [60, -176, 0.9]]) { g.beginPath(); g.moveTo(tx - 14, ty + 10); g.quadraticCurveTo(tx + 2, ty - 26, tx + 26 * Math.cos(a), ty - 30); g.quadraticCurveTo(tx + 6, ty - 4, tx + 16, ty + 10); g.closePath(); g.fillStyle = HAIR; g.fill(); inkStroke(g, 4); }
  // ---- lágrima
  const tr = o.tear || 0;
  if (tr > 0) {
    const tx = -ex + 6, ty0 = EY + ry * 0.9;
    const form = smooth(0, 0.35, tr), slide = smooth(0.35, 1, tr);
    const ty = ty0 + slide * 120, r = 4 + 6 * form;
    if (slide > 0) { g.beginPath(); g.moveTo(tx, ty0 + 4); g.quadraticCurveTo(tx - 6, (ty0 + ty) / 2, tx - 3, ty); g.strokeStyle = 'rgba(210,235,255,0.55)'; g.lineWidth = 5; g.stroke(); }
    g.save(); g.translate(tx - 3 * slide, ty); g.beginPath(); g.moveTo(0, -r * 1.8); g.bezierCurveTo(r, -r * 0.4, r, r, 0, r); g.bezierCurveTo(-r, r, -r, -r * 0.4, 0, -r * 1.8); g.fillStyle = 'rgba(200,232,255,0.85)'; g.fill(); g.strokeStyle = 'rgba(80,120,160,0.6)'; g.lineWidth = 1.6; g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-r * 0.35, -r * 0.1, r * 0.3, 0, 7); g.fill(); g.restore();
    g.beginPath(); g.moveTo(-ex - rx * 0.6, EY + ry * 0.8); g.quadraticCurveTo(-ex, EY + ry * 1.25, -ex + rx * 0.6, EY + ry * 0.75); g.strokeStyle = `rgba(200,232,255,${0.7 * form})`; g.lineWidth = 3; g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- silhueta de costas
export function drawBack(g, x, y, s, { age = 1, rim = '#7fa8ff', rimK = 1, sway = 0, arms = true } = {}) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(sway * 0.03);
  const A = age, R = lerp(112, 104, A), SW = lerp(190, 250, A);
  const shape = () => {
    g.beginPath(); g.moveTo(-SW, 420); g.bezierCurveTo(-SW, 230, -SW * 0.7, 175, -50, 160); g.lineTo(-44, 92);
    g.bezierCurveTo(-R * 1.05, 70, -R * 1.1, -40, -R * 0.9, -90);
    const tufts = [[-R * 0.75, -150], [-R * 0.35, -175], [0, -185], [R * 0.4, -172], [R * 0.78, -146], [R * 0.95, -90]];
    let px = -R * 0.9, py = -90; for (const [tx, ty] of tufts) { g.quadraticCurveTo((px + tx) / 2 - 6, Math.min(py, ty) - 22, tx, ty); px = tx; py = ty; }
    g.bezierCurveTo(R * 1.12, -40, R * 1.05, 70, 44, 92); g.lineTo(50, 160); g.bezierCurveTo(SW * 0.7, 175, SW, 230, SW, 420); g.closePath();
  };
  shape(); g.fillStyle = '#0c0a12'; g.fill();
  g.save(); shape(); g.clip(); g.globalCompositeOperation = 'source-over';
  g.strokeStyle = rgba(rim, 0.9 * rimK); g.lineWidth = 16; g.shadowColor = rim; g.shadowBlur = 30 * rimK; shape(); g.stroke(); g.restore();
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * (R * 0.98), 10, 14, 26, 0, 0, Math.PI * 2); g.fillStyle = '#0c0a12'; g.fill(); g.strokeStyle = rgba(rim, 0.7 * rimK); g.lineWidth = 4; g.stroke(); }
  if (arms) for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * (SW - 10), 240); g.quadraticCurveTo(sx * (SW - 30), 330, sx * 70, 330); g.strokeStyle = '#0c0a12'; g.lineWidth = 60; g.lineCap = 'round'; g.stroke(); }
  g.restore();
}

// ---------------------------------------------------------------- controle genérico (de cima)
export function drawController(g, x, y, s, { press = 0, hands = false, glow = '#ff7ac8', age = 1 } = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const body = () => { g.beginPath(); g.moveTo(-190, -40); g.bezierCurveTo(-120, -90, 120, -90, 190, -40); g.bezierCurveTo(260, 10, 280, 140, 230, 170); g.bezierCurveTo(190, 195, 150, 150, 120, 90); g.lineTo(-120, 90); g.bezierCurveTo(-150, 150, -190, 195, -230, 170); g.bezierCurveTo(-280, 140, -260, 10, -190, -40); g.closePath(); };
  body(); const gr = g.createLinearGradient(0, -90, 0, 190); gr.addColorStop(0, '#3a3d48'); gr.addColorStop(1, '#16171d'); g.fillStyle = gr; g.fill(); inkStroke(g, 5);
  g.save(); body(); g.clip(); g.strokeStyle = rgba(glow, 0.5); g.lineWidth = 6; g.beginPath(); g.moveTo(-180, -48); g.bezierCurveTo(-110, -94, 110, -94, 180, -48); g.stroke(); g.restore();
  // direcional
  g.fillStyle = '#0e0f13'; g.fillRect(-170, -18, 60, 20); g.fillRect(-150, -38, 20, 60);
  // analógicos
  for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 70, 40, 34, 0, 7); g.fillStyle = '#0c0d10'; g.fill(); g.beginPath(); g.arc(sx * 70, 40, 24, 0, 7); g.fillStyle = '#2b2d35'; g.fill(); }
  // botões (cores neutras)
  const B = [[140, -40, '#e8c34a'], [110, -10, '#5aa0e8'], [170, -10, '#e85a5a'], [140, 20, '#5ac88a']];
  B.forEach(([bx, by, c], i) => { const p = i === 3 ? press : 0; g.beginPath(); g.arc(bx, by + 2 * p, 15, 0, 7); g.fillStyle = mix(c, '#000000', 0.25 + 0.2 * p); g.fill(); g.beginPath(); g.arc(bx, by - 2 + 2 * p, 13, 0, 7); g.fillStyle = c; g.fill(); if (p > 0.5) { g.shadowColor = c; g.shadowBlur = 30; g.fill(); g.shadowBlur = 0; } });
  if (hands) {
    const skin = age < 0.5 ? '#f2c6a0' : SKIN;
    // dedos por baixo das alças (aparecem nas laterais) e polegares por cima
    for (const sx of [-1, 1]) { for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(sx * (262 - k * 10), 70 + k * 42, 26, 20, sx * 0.5, 0, 7); g.fillStyle = skin; g.fill(); inkStroke(g, 4); } }
    const thumb = (x0, y0, x1, y1) => { const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0); g.save(); g.translate(x0, y0); g.rotate(a); rr(g, -30, -27, L + 30, 54, 27); g.fillStyle = skin; g.fill(); inkStroke(g, 4.5); g.beginPath(); g.ellipse(L - 10, 0, 14, 17, 0, 0, 7); g.fillStyle = 'rgba(255,232,222,0.9)'; g.fill(); g.strokeStyle = rgba(INK, 0.5); g.lineWidth = 2; g.stroke(); g.restore(); };
    g.save(); g.beginPath(); g.moveTo(-300, 260); g.bezierCurveTo(-320, 100, -260, 30, -205, 60); g.bezierCurveTo(-170, 120, -180, 200, -200, 260); g.closePath(); g.fillStyle = skin; g.fill(); inkStroke(g, 4.5); g.restore();
    g.save(); g.beginPath(); g.moveTo(300, 260); g.bezierCurveTo(320, 100, 260, 30, 205, 60); g.bezierCurveTo(170, 120, 180, 200, 200, 260); g.closePath(); g.fillStyle = skin; g.fill(); inkStroke(g, 4.5); g.restore();
    thumb(-215, 95, -148, -6);
    thumb(215, 95, 146, 24 - 8 * (1 - press));
  }
  g.restore();
}

// ---------------------------------------------------------------- capa do jogo (arte própria em painéis, com "V")
export function drawCover(g, x, y, w, h, { glow = 0, rot = 0 } = {}) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (glow > 0) { g.shadowColor = `rgba(255,220,150,${glow})`; g.shadowBlur = 80 * glow; }
  rr(g, -w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 10); g.fillStyle = '#121214'; g.fill(); g.shadowBlur = 0;
  rr(g, -w / 2, -h / 2, w, h, 4); g.fillStyle = '#f4efe6'; g.fill();
  const gap = w * 0.025, cols = [[0, 0.5], [0.5, 1]];
  const panels = [[0, 0, 0.5, 0.3], [0.5, 0, 1, 0.22], [0, 0.3, 0.42, 0.62], [0.58, 0.22, 1, 0.58], [0, 0.62, 0.55, 1], [0.55, 0.58, 1, 1]];
  const art = [
    (W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ff9a4a'); gr.addColorStop(1, '#ffd36a'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = '#fff3c0'; g.beginPath(); g.arc(W * 0.6, H * 0.55, H * 0.25, 0, 7); g.fill(); palm(g, W * 0.25, H, H * 0.9, '#3a1a2a'); palm(g, W * 0.85, H, H * 0.7, '#3a1a2a'); },
    (W, H) => { g.fillStyle = '#7ec8e8'; g.fillRect(0, 0, W, H); g.fillStyle = '#2a4a6a'; g.fillRect(0, H * 0.7, W, H * 0.3); heli(g, W * 0.55, H * 0.4, H * 0.5, '#20222a'); },
    (W, H) => { g.fillStyle = '#e8506a'; g.fillRect(0, 0, W, H); bust(g, W * 0.5, H * 1.02, H * 0.85, '#2a1620', true); },
    (W, H) => { g.fillStyle = '#6a4ac8'; g.fillRect(0, 0, W, H); for (let i = 0; i < 9; i++) { const bw = W / 9; g.fillStyle = '#2a1a4a'; g.fillRect(i * bw, H * (0.35 + 0.4 * hash(i + 5)), bw - 2, H); } g.fillStyle = '#ffd36a'; for (let i = 0; i < 30; i++) g.fillRect(hash(i) * W, H * (0.5 + 0.45 * hash(i + 9)), 3, 4); },
    (W, H) => { g.fillStyle = '#ffb84a'; g.fillRect(0, 0, W, H); car(g, W * 0.5, H * 0.72, W * 0.85, '#1a1418'); },
    (W, H) => { g.fillStyle = '#4ac8a8'; g.fillRect(0, 0, W, H); bike(g, W * 0.5, H * 0.75, H * 0.6, '#14201e'); },
  ];
  panels.forEach(([a, b, c, d], i) => {
    const px = -w / 2 + a * w + gap / 2, py = -h / 2 + b * h + gap / 2, pw = (c - a) * w - gap, ph = (d - b) * h - gap;
    g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip(); g.translate(px, py); art[i](pw, ph); g.restore();
    g.strokeStyle = '#121214'; g.lineWidth = 3; g.strokeRect(px, py, pw, ph);
  });
  // "V" grande no centro
  g.save(); g.translate(0, h * 0.04); const V = h * 0.3;
  g.beginPath(); g.moveTo(-V * 0.55, -V * 0.5); g.lineTo(-V * 0.2, -V * 0.5); g.lineTo(0, V * 0.15); g.lineTo(V * 0.2, -V * 0.5); g.lineTo(V * 0.55, -V * 0.5); g.lineTo(V * 0.12, V * 0.55); g.lineTo(-V * 0.12, V * 0.55); g.closePath();
  g.fillStyle = '#ffffff'; g.fill(); g.lineJoin = 'miter'; g.lineWidth = V * 0.07; g.strokeStyle = '#121214'; g.stroke();
  g.restore();
  g.restore();
}
export function palm(g, x, y, h, col) {
  g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round';
  g.lineWidth = h * 0.05; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(h * 0.12, -h * 0.5, h * 0.05, -h); g.stroke();
  g.translate(h * 0.05, -h);
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.5; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a) * h * 0.3, Math.sin(a) * h * 0.3 - h * 0.08, Math.cos(a) * h * 0.42, Math.sin(a) * h * 0.42 + h * 0.12); g.quadraticCurveTo(Math.cos(a) * h * 0.25, Math.sin(a) * h * 0.25, 0, 0); g.lineWidth = h * 0.012; g.fill(); }
  g.restore();
}
export function heli(g, x, y, s, col) { g.save(); g.translate(x, y); g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, s * 0.35, s * 0.17, 0, 0, 7); g.fill(); g.fillRect(s * 0.25, -s * 0.04, s * 0.5, s * 0.06); g.fillRect(-s * 0.6, -s * 0.24, s * 1.2, s * 0.025); g.fillRect(-s * 0.02, -s * 0.24, s * 0.04, s * 0.1); g.fillRect(-s * 0.3, s * 0.2, s * 0.5, s * 0.025); g.restore(); }
export function car(g, x, y, w, col, lights = 0) {
  g.save(); g.translate(x, y); g.fillStyle = col;
  g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -w * 0.08); g.quadraticCurveTo(-w * 0.35, -w * 0.12, -w * 0.18, -w * 0.13); g.quadraticCurveTo(-w * 0.05, -w * 0.24, w * 0.14, -w * 0.22); g.quadraticCurveTo(w * 0.28, -w * 0.13, w * 0.48, -w * 0.09); g.lineTo(w / 2, 0); g.closePath(); g.fill();
  for (const sx of [-0.3, 0.3]) { g.beginPath(); g.arc(sx * w, 0, w * 0.075, 0, 7); g.fill(); }
  if (lights) { g.fillStyle = `rgba(255,240,180,${lights})`; g.beginPath(); g.ellipse(w * 0.49, -w * 0.06, w * 0.02, w * 0.012, 0, 0, 7); g.fill(); g.fillStyle = `rgba(255,60,60,${lights})`; g.fillRect(-w * 0.5, -w * 0.07, w * 0.02, w * 0.02); }
  g.restore();
}
function bike(g, x, y, s, col) { g.save(); g.translate(x, y); g.rotate(-0.4); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = s * 0.05; for (const sx of [-0.45, 0.45]) { g.beginPath(); g.arc(sx * s, 0, s * 0.2, 0, 7); g.stroke(); } g.beginPath(); g.moveTo(-s * 0.45, 0); g.lineTo(-s * 0.05, -s * 0.25); g.lineTo(s * 0.45, 0); g.stroke(); g.beginPath(); g.arc(-s * 0.02, -s * 0.5, s * 0.1, 0, 7); g.fill(); g.fillRect(-s * 0.1, -s * 0.42, s * 0.16, s * 0.2); g.restore(); }
function bust(g, x, y, h, col, glasses) { g.save(); g.translate(x, y); g.fillStyle = col; g.beginPath(); g.arc(0, -h * 0.68, h * 0.18, 0, 7); g.fill(); g.beginPath(); g.moveTo(-h * 0.4, 0); g.quadraticCurveTo(-h * 0.38, -h * 0.42, 0, -h * 0.46); g.quadraticCurveTo(h * 0.38, -h * 0.42, h * 0.4, 0); g.fill(); if (glasses) { g.fillStyle = '#ffd36a'; g.fillRect(-h * 0.13, -h * 0.72, h * 0.26, h * 0.05); } g.restore(); }

// ---------------------------------------------------------------- presente embrulhado (meio torto)
export function drawGift(g, x, y, w, h, { rip = 0, rot = 0 } = {}) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (rip < 1) {
    g.save(); g.globalAlpha = 1 - smooth(0.6, 1, rip);
    rr(g, -w / 2, -h / 2, w, h, 8); g.fillStyle = '#3f74c8'; g.fill();
    g.save(); rr(g, -w / 2, -h / 2, w, h, 8); g.clip(); g.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = -6; i < 10; i++) { g.beginPath(); g.arc(-w / 2 + i * 40, -h / 2 + ((i * 37) % h), 9, 0, 7); g.fill(); }
    g.fillStyle = '#d83a3a'; g.fillRect(-w * 0.07 + 6, -h / 2, w * 0.14, h); g.fillRect(-w / 2, -h * 0.1 - 4, w, h * 0.2);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(w * 0.25, h * 0.2, 50, 22); g.restore();
    rr(g, -w / 2, -h / 2, w, h, 8); inkStroke(g, 5);
    // laço torto
    g.save(); g.translate(10, -h / 2 - 6); g.rotate(0.25); g.fillStyle = '#e04646';
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(sx * 70, -60, sx * 90, 20, 0, 0); g.fill(); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(sx * 70, -60, sx * 90, 20, 0, 0); inkStroke(g, 4); }
    g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fill(); inkStroke(g, 4); g.restore();
    g.restore();
  }
  // pedaços de papel voando
  if (rip > 0) for (let i = 0; i < 14; i++) {
    const a = hash(i) * 6.28, v = 300 + hash(i + 3) * 500, k = rip;
    const px = Math.cos(a) * v * k, py = Math.sin(a) * v * k * 0.6 + 600 * k * k - 60;
    g.save(); g.translate(px, py); g.rotate(k * 6 * (hash(i + 7) - 0.5)); g.globalAlpha = 1 - smooth(0.7, 1, k);
    g.beginPath(); g.moveTo(-30, -20); g.lineTo(26, -26); g.lineTo(34, 18); g.lineTo(-8, 28); g.lineTo(-26, 10); g.closePath(); g.fillStyle = i % 4 ? '#3f74c8' : '#d83a3a'; g.fill(); inkStroke(g, 3);
    g.restore();
  }
  g.restore();
}

// ---------------------------------------------------------------- telas
// contagem regressiva do lançamento (estilo néon, sem logos)
export function drawNeonScreen(g, x, y, w, h, t, { mode = 'count', secs = 107, press = 0 } = {}) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.translate(x, y);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a1450'); gr.addColorStop(0.45, '#b03a8a'); gr.addColorStop(0.62, '#ff7a6a'); gr.addColorStop(0.64, '#ffb36a'); gr.addColorStop(1, '#3a1440'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // sol com faixas
  g.save(); g.beginPath(); g.arc(w * 0.5, h * 0.6, h * 0.24, Math.PI, 0); g.closePath(); g.clip(); const sg = g.createLinearGradient(0, h * 0.36, 0, h * 0.6); sg.addColorStop(0, '#fff2a0'); sg.addColorStop(1, '#ff6a8a'); g.fillStyle = sg; g.fillRect(0, 0, w, h);
  g.fillStyle = '#b03a8a'; for (let i = 0; i < 6; i++) { const yy = h * (0.46 + i * 0.025) + ((t * 10) % (h * 0.025)); g.fillRect(0, yy, w, h * 0.006 * (1 + i * 0.6)); } g.restore();
  // mar e reflexos
  g.fillStyle = '#3a1446'; g.fillRect(0, h * 0.6, w, h * 0.4);
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(255,170,140,${0.5 - i * 0.03})`; const ww = w * 0.3 * (1 - i * 0.05) * (0.8 + 0.2 * Math.sin(t * 2 + i)); g.fillRect(w * 0.5 - ww / 2, h * (0.62 + i * 0.025), ww, h * 0.008); }
  palm(g, w * 0.12, h * 0.66, h * 0.55, '#1a0a20'); palm(g, w * 0.9, h * 0.68, h * 0.45, '#1a0a20'); palm(g, w * 0.78, h * 0.66, h * 0.32, '#1a0a20');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (mode === 'count') {
    g.font = `800 ${h * 0.05}px "Nunito", sans-serif`; g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillText('LANÇAMENTO EM', w / 2, h * 0.17);
    const s = Math.max(0, Math.floor(secs)); const txt = `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    g.font = `400 ${h * 0.14}px "Anton", sans-serif`; g.shadowColor = '#ff5ab0'; g.shadowBlur = h * 0.05; g.fillStyle = '#ffffff'; g.fillText(txt, w / 2, h * 0.29); g.shadowBlur = 0;
  } else {
    const k = 1 + 0.04 * Math.sin(t * 5) - 0.06 * press;
    g.save(); g.translate(w / 2, h * 0.25); g.scale(k, k);
    rr(g, -w * 0.22, -h * 0.07, w * 0.44, h * 0.14, h * 0.07); g.fillStyle = press > 0.5 ? '#ffffff' : 'rgba(255,255,255,0.15)'; g.fill(); g.lineWidth = h * 0.008; g.strokeStyle = '#fff'; g.shadowColor = '#ff5ab0'; g.shadowBlur = h * 0.06; g.stroke(); g.shadowBlur = 0;
    g.font = `900 ${h * 0.07}px "Nunito", sans-serif`; g.fillStyle = press > 0.5 ? '#b03a8a' : '#ffffff'; g.fillText('▶  JOGAR', 0, h * 0.005);
    g.restore();
  }
  // linhas de varredura leves
  g.fillStyle = 'rgba(0,0,0,0.08)'; for (let yy = 0; yy < h; yy += 4) g.fillRect(0, yy, w, 1.5);
  g.restore();
}

// mundo do jogo de 2013 (pôr do sol alaranjado, cidade, praia, estrada)
export function drawGameWorld(g, x, y, w, h, t, { crt = true, night = 0 } = {}) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.translate(x, y);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, mix('#ff8a4a', '#1a1a4a', night)); gr.addColorStop(0.5, mix('#ffc06a', '#4a2a6a', night)); gr.addColorStop(0.62, mix('#ffe2a0', '#ff8a6a', night)); gr.addColorStop(1, mix('#d06a4a', '#1a1030', night));
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = mix('#fff4c8', '#ffd0a0', night); g.beginPath(); g.arc(w * 0.68, h * 0.5, h * 0.1, 0, 7); g.fill();
  // montanhas
  g.fillStyle = mix('#c86a5a', '#3a2050', night); g.beginPath(); g.moveTo(0, h * 0.55); for (let i = 0; i <= 10; i++) g.lineTo(w * i / 10, h * (0.44 + 0.08 * hash(i + 1))); g.lineTo(w, h * 0.6); g.lineTo(0, h * 0.6); g.fill();
  // prédios (paralaxe)
  const off = (t * 20) % (w / 8);
  for (let i = -1; i < 12; i++) { const bw = w / 10, bh = h * (0.12 + 0.2 * hash(i + 30)), bx = i * bw - off * 0.4; g.fillStyle = mix('#7a3a4a', '#20143a', night); g.fillRect(bx, h * 0.62 - bh, bw * 0.85, bh + 2);
    g.fillStyle = `rgba(255,220,140,${0.25 + 0.6 * night})`; for (let k = 0; k < 6; k++) g.fillRect(bx + bw * (0.12 + 0.25 * (k % 3)), h * 0.62 - bh + bh * (0.15 + 0.25 * Math.floor(k / 3)), bw * 0.12, bh * 0.08); }
  // mar e píer com roda-gigante
  g.fillStyle = mix('#e88a6a', '#2a1a4a', night); g.fillRect(0, h * 0.62, w, h * 0.12);
  g.fillStyle = mix('#5a2a3a', '#120a20', night); g.fillRect(w * 0.05, h * 0.64, w * 0.3, h * 0.012);
  g.save(); g.translate(w * 0.2, h * 0.6); g.rotate(t * 0.3); g.strokeStyle = mix('#5a2a3a', '#ff6ab0', night); g.lineWidth = h * 0.006; g.beginPath(); g.arc(0, 0, h * 0.06, 0, 7); g.stroke(); for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(k * 0.785) * h * 0.06, Math.sin(k * 0.785) * h * 0.06); g.stroke(); } g.restore();
  // estrada e carro
  g.fillStyle = mix('#3a2a30', '#141020', night); g.fillRect(0, h * 0.74, w, h * 0.26);
  g.fillStyle = 'rgba(255,230,160,0.7)'; for (let i = 0; i < 10; i++) g.fillRect(((i * w / 5 - t * 160) % (w * 2) + w * 2) % (w * 2) - w * 0.2, h * 0.86, w * 0.08, h * 0.008);
  car(g, w * 0.55 + Math.sin(t * 0.8) * w * 0.05, h * 0.85, w * 0.32, '#1a1014', 0.4 + 0.6 * night);
  palm(g, w * 0.08, h * 0.8, h * 0.45, mix('#3a1a20', '#0a0612', night)); palm(g, w * 0.93, h * 0.82, h * 0.5, mix('#3a1a20', '#0a0612', night));
  heli(g, w * (0.3 + 0.1 * Math.sin(t * 0.4)), h * 0.22, h * 0.08, mix('#3a1a20', '#0a0612', night));
  if (crt) { g.fillStyle = 'rgba(0,0,0,0.12)'; for (let yy = 0; yy < h; yy += 3) g.fillRect(0, yy, w, 1.2); const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)'); g.fillStyle = v; g.fillRect(0, 0, w, h); }
  g.restore();
}

// TV de tubo (2013) e TV fina (hoje)
export function drawCRT(g, x, y, w, h, drawScreen) {
  rr(g, x - w * 0.08, y - h * 0.1, w * 1.16, h * 1.3, 18); g.fillStyle = '#2a2a2e'; g.fill(); inkStroke(g, 5);
  rr(g, x - w * 0.02, y - h * 0.03, w * 1.04, h * 1.06, 26); g.fillStyle = '#111114'; g.fill();
  g.save(); rr(g, x, y, w, h, 30); g.clip(); drawScreen(x, y, w, h); g.restore();
  g.save(); rr(g, x, y, w, h, 30); g.clip(); const sh = g.createLinearGradient(x, y, x + w, y + h); sh.addColorStop(0, 'rgba(255,255,255,0.18)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(x, y, w, h); g.restore();
  g.fillStyle = '#c84040'; g.beginPath(); g.arc(x + w * 0.95, y + h * 1.13, 5, 0, 7); g.fill();
}
export function drawFlatTV(g, x, y, w, h, drawScreen) {
  rr(g, x - 10, y - 10, w + 20, h + 20, 8); g.fillStyle = '#0a0a0c'; g.fill();
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); drawScreen(x, y, w, h); g.restore();
  g.fillStyle = '#0a0a0c'; g.fillRect(x + w * 0.45, y + h + 10, w * 0.1, 40); g.fillRect(x + w * 0.35, y + h + 46, w * 0.3, 10);
}
// relógio de parede
export function drawClock(g, x, y, r, hours, mins, { glow = 0 } = {}) {
  g.save(); g.translate(x, y);
  g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = '#f3ead8'; g.fill(); g.lineWidth = r * 0.12; g.strokeStyle = '#3a2a24'; g.stroke();
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.fillStyle = '#3a2a24'; g.fillRect(Math.cos(a) * r * 0.78 - 2, Math.sin(a) * r * 0.78 - 2, 4, 4); }
  const ha = ((hours % 12) + mins / 60) * Math.PI / 6 - Math.PI / 2, ma = mins * Math.PI / 30 - Math.PI / 2;
  g.strokeStyle = '#2a1a16'; g.lineCap = 'round'; g.lineWidth = r * 0.09; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(ha) * r * 0.5, Math.sin(ha) * r * 0.5); g.stroke();
  g.lineWidth = r * 0.06; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(ma) * r * 0.75, Math.sin(ma) * r * 0.75); g.stroke();
  g.restore();
}
