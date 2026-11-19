// ============================================================================
//  #019 — "E se você tivesse que atravessar o mapa do GTA 6 inteiro… a pé?" (100% 2D)
//  Humor + contas reais (5 km/h, 8 h por dia, ~50 mil passos, Flórida real ~700 km)
//  e o plot twist do carro com a chave o tempo todo.
// ============================================================================
export const DUR = 62;
export const CENAS = [
  ['gancho', 0, 4.2], ['chinelo', 4.2, 8.8], ['cidade', 8.8, 13.4], ['conta', 13.4, 17.9], ['passos', 17.9, 22.3],
  ['pantano', 22.3, 26.8], ['jacare', 26.8, 31.0], ['pontes', 31.0, 35.4], ['florida', 35.4, 40.2], ['semanas', 40.2, 44.8],
  ['chegada', 44.8, 49.4], ['carro', 49.4, 54.9], ['final', 54.9, 62],
];
export const CORTES = ['carro'];
export const EV = { buzina: [9.6, 10.4, 11.8], olhos: 24.6, desvio: 28.2, cai: 46.6, chave: 50.4 };
export const AUDIO = {
  estilo: 'piano',
  ganhos: { piano: [[0, 0.5], [8.8, 0.6], [22.3, 0.3], [31, 0.6], [44.8, 0.3], [49.4, 0], [55, 0.5], [62, 0.5]], caixinha: [[0, 0.3], [4.2, 0.5], [22.3, 0], [31, 0.4], [44.8, 0.2], [62, 0.3]], batida: [[0, 0.4], [8.8, 0.7], [22.3, 0.3], [31, 0.7], [44.8, 0], [55, 0.4], [62, 0.4]], cordas: [[0, 0.1], [22.3, 0.5], [31, 0.2], [44.8, 0.6], [62, 0.2]] },
  abafado: [[0, 0], [62, 0]],
  cues: [
    [0, 'brilho', 0.3], [4.3, 'clique', 0.25], [4.8, 'clique', 0.25], [5.3, 'clique', 0.25], [5.8, 'clique', 0.25], [6.3, 'clique', 0.25], [6.8, 'clique', 0.25],
    [9.6, 'buzina', 0.35], [10.4, 'buzina', 0.3], [11.8, 'buzina', 0.35], [8.8, 'vento', 0.1, 0, 4.6], [13.4, 'bipe', 0.2], [17.9, 'instalando', 0.25, 0, 3.6],
    [22.3, 'grilo', 0.3], [23.4, 'grilo', 0.25], [24.6, 'jacare', 0.45], [26.8, 'whoosh', 0.3], [28.2, 'erro', 0.3], [31.0, 'mar', 0.3, 0, 4.4], [31.6, 'gaivota', 0.25],
    [35.4, 'brilho', 0.25], [40.2, 'relogioRapido', 0.2, 0, 4.4], [46.6, 'carimbo', 0.4], [49.4, 'susto', 0.5], [50.4, 'chaves', 0.5], [54.9, 'brilho', 0.25],
  ],
};

export function scenes(L) {
  const { A, W, H, smooth, lerp, clamp, bump, hash, rr, cam, tint, glow, faceShot, gator, bg, sparkle, dust, neonCity, F_TITLE, F_UI, F_MONO, F_HAND } = L;
  const ink = (g, w = 5) => { g.lineWidth = w; g.strokeStyle = A.INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };
  const EU = { age: 1, cloth: '#3a8ac8', shirt: 'teen' };
  // ---------------- o andarilho de perfil (desenho próprio, anda para a direita)
  function andarilho(g, x, y, s, t, { passo = 1, cansado = 0 } = {}) {
    g.save(); g.translate(x, y); g.scale(s, s);
    const ph = t * 7 * passo, sw = Math.sin(ph) * 0.5, bob = Math.abs(Math.cos(ph)) * 8;
    g.translate(0, -bob); g.rotate(0.05 + 0.15 * cansado);
    const leg = (a, col) => { g.save(); g.translate(0, -150); g.rotate(a); g.fillStyle = col; rr(g, -18, 0, 36, 150, 16); g.fill(); ink(g, 4); g.fillStyle = '#e8c04a'; rr(g, -14, 140, 56, 16, 6); g.fill(); ink(g, 3); g.restore(); };
    const arm = (a, col) => { g.save(); g.translate(0, -300); g.rotate(a); g.fillStyle = col; rr(g, -14, 0, 28, 120, 14); g.fill(); ink(g, 4); g.beginPath(); g.arc(0, 128, 16, 0, 7); g.fillStyle = '#f0c39e'; g.fill(); ink(g, 3); g.restore(); };
    leg(-sw, '#2a3a5a'); arm(sw, '#2a6aa8');
    rr(g, -45, -330, 90, 190, 30); g.fillStyle = '#3a8ac8'; g.fill(); ink(g, 5);
    g.fillStyle = '#e8d8b0'; g.fillRect(-48, -380 + 2, 0, 0);
    // mochila
    rr(g, -95, -320, 60, 120, 18); g.fillStyle = '#d8743a'; g.fill(); ink(g, 4);
    leg(sw, '#34466a'); arm(-sw, '#3a8ac8');
    // cabeça de perfil
    g.beginPath(); g.arc(8, -385, 58, 0, 7); g.fillStyle = '#f0c39e'; g.fill(); ink(g, 5);
    g.beginPath(); g.moveTo(-50, -400); g.quadraticCurveTo(-30, -460, 30, -448); g.quadraticCurveTo(70, -440, 64, -410); for (let k = 0; k < 4; k++) g.lineTo(40 - k * 22, -420 + (k % 2 ? 10 : -6)); g.closePath(); g.fillStyle = '#2f221c'; g.fill(); ink(g, 4);
    g.beginPath(); g.arc(36, -392, 6, 0, 7); g.fillStyle = '#120a08'; g.fill();
    g.beginPath(); g.moveTo(62, -385); g.lineTo(74, -372); g.lineTo(60, -368); ink(g, 3);
    g.beginPath(); g.moveTo(40, -355); g.quadraticCurveTo(50, -350 + 8 * cansado, 58, -356); ink(g, 3);
    if (cansado > 0.3) for (let i = 0; i < 3; i++) { const p = (t * 1.5 + i / 3) % 1; g.fillStyle = `rgba(120,190,255,${1 - p})`; g.beginPath(); g.ellipse(-20 + i * 20, -420 + p * 60, 6, 9, 0, 0, 7); g.fill(); }
    g.restore();
  }
  // ---------------- mapa estilizado (continente + ilhas), trajeto pontilhado
  const ROTA = [[300, 380], [420, 620], [520, 860], [620, 1080], [700, 1300], [760, 1420], [820, 1520], [900, 1600], [980, 1660]];
  function mapa(g, t, k, { pin = true } = {}) {
    bg(g, '#5ac0e8', '#2a8ab8');
    for (let i = 0; i < 8; i++) { g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= W; x += 30) g.lineTo(x, 200 + i * 220 + 10 * Math.sin(x * 0.02 + t + i)); g.stroke(); }
    g.fillStyle = '#9ad08a'; g.beginPath(); g.moveTo(-20, 150); g.lineTo(720, 150); g.bezierCurveTo(820, 500, 860, 900, 800, 1250); g.bezierCurveTo(760, 1400, 680, 1430, 600, 1330); g.bezierCurveTo(500, 1180, 380, 900, 300, 700); g.bezierCurveTo(240, 560, 160, 420, -20, 420); g.closePath(); g.fill(); ink(g, 6);
    g.fillStyle = '#5a8a4a'; g.beginPath(); g.ellipse(560, 1050, 150, 200, 0.2, 0, 7); g.fill();   // pântano
    for (let i = 0; i < 9; i++) { g.fillStyle = '#e8d8a0'; g.beginPath(); g.ellipse(760 + i * 34, 1460 + i * 26, 30 - i * 1.5, 14, 0.5, 0, 7); g.fill(); ink(g, 3); }
    // cidade
    for (let i = 0; i < 7; i++) { g.fillStyle = '#c86aa8'; g.fillRect(660 + i * 18, 1140 - 30 - 40 * hash(i), 14, 30 + 40 * hash(i)); }
    // trajeto
    const tot = ROTA.length - 1, upTo = k * tot;
    g.save(); g.strokeStyle = '#e8343a'; g.lineWidth = 10; g.setLineDash([22, 16]); g.beginPath(); g.moveTo(...ROTA[0]);
    let pos = ROTA[0];
    for (let i = 1; i <= tot; i++) { if (upTo >= i) { g.lineTo(...ROTA[i]); pos = ROTA[i]; } else { const f = upTo - (i - 1); if (f > 0) { pos = [lerp(ROTA[i - 1][0], ROTA[i][0], f), lerp(ROTA[i - 1][1], ROTA[i][1], f)]; g.lineTo(...pos); } break; } }
    g.stroke(); g.restore();
    if (pin) { g.beginPath(); g.arc(pos[0], pos[1], 24, 0, 7); g.fillStyle = '#fff'; g.fill(); ink(g, 5); g.beginPath(); g.arc(pos[0], pos[1], 12, 0, 7); g.fillStyle = '#e8343a'; g.fill(); }
    g.fillStyle = '#2a1a16'; g.font = `700 54px ${F_HAND}`; g.fillText('início', ROTA[0][0] - 40, ROTA[0][1] - 40); g.fillText('fim', ROTA[tot][0] - 60, ROTA[tot][1] + 70);
  }
  function calor(g, t, k) { if (k <= 0) return; g.save(); g.globalAlpha = 0.15 * k; g.strokeStyle = '#ffffff'; g.lineWidth = 4; for (let i = 0; i < 10; i++) { g.beginPath(); for (let y = 0; y < H; y += 20) g.lineTo(i * 110 + 20 * Math.sin(y * 0.02 + t * 3 + i), y); g.stroke(); } g.restore(); }
  return {
    gancho(g, t, u) { mapa(g, t, 0.15 * u); tint(g, '#000000', 0.1); },
    chinelo(g, t, u) {
      bg(g, '#ffe0b0', '#e8b07a'); g.fillStyle = '#c8b090'; g.fillRect(0, 1100, W, 900);
      for (let i = 0; i < 2; i++) { const ph = t * 4 + i * Math.PI, up = Math.max(0, Math.sin(ph)) * 120, x = 380 + i * 320 + ((t * 120) % 60);
        g.save(); g.translate(x, 1300 - up); rr(g, -70, 0, 220, 70, 30); g.fillStyle = '#ffd36a'; g.fill(); ink(g, 5); g.beginPath(); g.moveTo(-20, 10); g.lineTo(40, 40); g.lineTo(100, 10); g.strokeStyle = '#3a8ac8'; g.lineWidth = 12; g.stroke();
        g.beginPath(); g.ellipse(45, -10, 100, 42, 0, 0, 7); g.fillStyle = '#f0c39e'; g.fill(); ink(g, 5); for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(120 + k * 2, -30 + k * 10, 12 - k, 0, 7); g.fillStyle = '#f0c39e'; g.fill(); ink(g, 3); } g.restore(); }
      L.bigText(g, 'SEM CARRO. SEM MOTO.', 300, smooth(0.02, 0.1, u), { size: 100 });
      L.bigText(g, 'SÓ UM CHINELO.', 430, smooth(0.35, 0.45, u), { size: 120, col: '#3a8ac8' });
    },
    cidade(g, t, u) {
      g.save(); cam(g, 540, 1000, 1.05);
      neonCity(g, -200, 0, W + 400, H, t, { night: 0, scroll: (t - 8.8) * 160 });
      g.restore();
      andarilho(g, 420, 1470, 0.9, t, {});
      for (const b of EV.buzina) { const k = bump(b, b + 0.05, b + 0.4, b + 0.6, t); if (k > 0) L.bigText(g, 'BIII!', 700 + 200 * hash(b), 760, k, { size: 110, col: '#ffd36a', rot: 0.1 }); }
      calor(g, t, 1);
      g.save(); g.translate(930, 300); rr(g, -40, -140, 80, 260, 40); g.fillStyle = '#fff'; g.fill(); ink(g, 5); rr(g, -18, -80 + 80 * (1 - smooth(0, 0.6, u)), 36, 170 - 80 * (1 - smooth(0, 0.6, u)), 18); g.fillStyle = '#e8343a'; g.fill(); g.beginPath(); g.arc(0, 120, 40, 0, 7); g.fill(); ink(g, 5); g.fillStyle = '#2a1a16'; g.font = `400 70px ${F_TITLE}`; g.textAlign = 'center'; g.fillText('40°C', 0, -170); g.restore();
    },
    conta(g, t, u) {
      bg(g, '#1a2a4a', '#0e1630');
      const row = (y, txt, k, col = '#fff') => { if (k <= 0) return; g.save(); g.globalAlpha = k; g.translate(540, y); const s = 0.8 + 0.2 * k; g.scale(s, s); rr(g, -420, -80, 840, 160, 30); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill(); g.fillStyle = col; g.font = `400 100px ${F_TITLE}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 6); g.restore(); };
      row(560, '5 km/h', smooth(0.02, 0.12, u)); row(760, '×  8 HORAS', smooth(0.3, 0.4, u)); row(1000, '= 40 km/DIA', smooth(0.6, 0.7, u), '#ffd36a');
      andarilho(g, lerp(-100, 1180, u), 1420, 0.6, t, {});
    },
    passos(g, t, u) {
      faceShot(g, t, { bgTop: '#ffe0b0', bgBot: '#e8a87a', light: '#ffd8a0', lightA: 0.2, zoom: 1.05, face: { ...EU, tired: 0.8, browUp: 0.4, open: 0.2 } });
      for (let i = 0; i < 5; i++) { const p = (t * 0.8 + i / 5) % 1; g.fillStyle = `rgba(120,190,255,${0.8 * (1 - p)})`; g.beginPath(); g.ellipse(330 + i * 110, 700 + p * 400, 12, 18, 0, 0, 7); g.fill(); }
      const n = Math.floor(52000 * smooth(0.02, 0.85, u));
      g.save(); g.translate(540, 360); rr(g, -360, -110, 720, 220, 40); g.fillStyle = '#16181e'; g.fill(); ink(g, 6); g.fillStyle = '#7ad870'; g.font = `700 120px ${F_MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n.toLocaleString('pt-BR'), 0, 0); g.fillStyle = '#fff'; g.font = `800 34px ${F_UI}`; g.fillText('PASSOS HOJE', 0, 150); g.restore();
    },
    pantano(g, t, u) {
      bg(g, '#7a9a6a', '#2a4a3a');
      g.fillStyle = '#3a5a3a'; for (let i = 0; i < 9; i++) { const x = i * 130; g.fillRect(x + 40, 300, 30, 900); g.beginPath(); g.ellipse(x + 55, 320, 120, 90, 0, 0, 7); g.fill(); for (let k = 0; k < 4; k++) { g.strokeStyle = '#3a5a3a'; g.lineWidth = 10; g.beginPath(); g.moveTo(x + 55, 1100); g.quadraticCurveTo(x + 55 + (k - 1.5) * 50, 1180, x + 55 + (k - 1.5) * 70, 1260); g.stroke(); } }
      g.fillStyle = '#4a6a4a'; g.fillRect(0, 1250, W, 700); for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 4; g.beginPath(); for (let x = 0; x <= W; x += 30) g.lineTo(x, 1300 + i * 80 + 6 * Math.sin(x * 0.03 + t * 2 + i)); g.stroke(); }
      andarilho(g, lerp(100, 600, u), 1500, 0.8, t, { passo: 0.6, cansado: 0.5 });
      g.fillStyle = 'rgba(90,60,40,0.6)'; g.fillRect(0, 1430, W, 120);
      const k = smooth(EV.olhos, EV.olhos + 0.3, t);
      if (k > 0) for (const ox of [0, 60]) { g.save(); g.globalAlpha = k; g.beginPath(); g.ellipse(840 + ox, 1520, 22, 14, 0, 0, 7); g.fillStyle = '#ffd36a'; g.fill(); ink(g, 3); g.fillStyle = '#120a08'; g.fillRect(836 + ox, 1508, 8, 24); g.restore(); }
      for (let i = 0; i < 14; i++) { const x = 200 + hash(i) * 700 + 40 * Math.sin(t * 9 + i), y = 700 + hash(i + 3) * 500 + 30 * Math.cos(t * 11 + i); g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.strokeStyle = 'rgba(30,30,30,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 10, y - 6); g.lineTo(x, y); g.lineTo(x + 10, y - 6); g.stroke(); }
      L.bigText(g, 'DIA 2: O PÂNTANO', 300, smooth(0.02, 0.12, u), { size: 110, col: '#ffffff' });
    },
    jacare(g, t, u) {
      bg(g, '#5a8a5a', '#3a6a4a');
      g.fillStyle = '#4ab0c0'; g.beginPath(); g.moveTo(-50, 900); g.bezierCurveTo(300, 820, 700, 1000, W + 50, 900); g.lineTo(W + 50, 1200); g.bezierCurveTo(700, 1300, 300, 1120, -50, 1200); g.closePath(); g.fill(); ink(g, 5);
      gator(g, 540, 1060, 1.1, t, 0);
      const k1 = smooth(0.05, 0.3, u), k2 = smooth(0.45, 0.85, u);
      g.save(); g.strokeStyle = '#e8343a'; g.lineWidth = 12; g.setLineDash([20, 14]); g.beginPath(); g.moveTo(540, 1600); g.lineTo(540, 1600 - 450 * k1); g.stroke(); g.restore();
      if (u > 0.3 && u < 0.5) { g.save(); g.strokeStyle = '#e8343a'; g.lineWidth = 26; g.lineCap = 'round'; g.beginPath(); g.moveTo(420, 1030); g.lineTo(660, 1270); g.moveTo(660, 1030); g.lineTo(420, 1270); g.stroke(); g.restore(); }
      if (k2 > 0) { g.save(); g.strokeStyle = '#2aa84a'; g.lineWidth = 12; g.setLineDash([20, 14]); g.beginPath(); g.moveTo(540, 1600); g.bezierCurveTo(-150, 1400, -150, 700, 540 * k2 + 40, 600); g.stroke(); g.restore(); }
      L.bigText(g, 'JACARÉ NÃO É PONTE', 300, smooth(0.02, 0.12, u), { size: 110, col: '#e8343a' });
      L.bigText(g, 'DÁ A VOLTA', 440, smooth(0.45, 0.55, u), { size: 110, col: '#2aa84a' });
    },
    pontes(g, t, u) {
      bg(g, '#9ad8f0', '#e8f8ff');
      g.fillStyle = '#fff3c0'; g.beginPath(); g.arc(860, 300, 110, 0, 7); g.fill(); g.save(); g.globalCompositeOperation = 'screen'; glow(g, 860, 300, 400, '#fff6d0', 0.6); g.restore();
      g.fillStyle = '#3ac0d0'; g.fillRect(0, 900, W, 1100); for (let i = 0; i < 8; i++) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 4; g.beginPath(); for (let x = 0; x <= W; x += 30) g.lineTo(x, 980 + i * 110 + 8 * Math.sin(x * 0.02 + t * 2 + i)); g.stroke(); }
      // ponte longa em perspectiva
      g.fillStyle = '#d8d8d8'; g.beginPath(); g.moveTo(-100, 1500); g.lineTo(W + 100, 1350); g.lineTo(W + 100, 1390); g.lineTo(-100, 1560); g.closePath(); g.fill(); ink(g, 4);
      for (let i = 0; i < 12; i++) { const x = -60 + i * 100; g.fillStyle = '#b8b8b8'; g.fillRect(x, 1530 - i * 14, 24, 300); }
      andarilho(g, lerp(150, 560, u), 1490 - lerp(150, 560, u) * 0.14, 0.5, t, { cansado: 0.8, passo: 0.7 });
      calor(g, t, 1);
      L.bigText(g, 'DIA 3: NENHUMA SOMBRA', 300, smooth(0.02, 0.12, u), { size: 96, col: '#ffffff' });
    },
    florida(g, t, u) {
      bg(g, '#5ac0e8', '#2a8ab8');
      g.save(); g.translate(540, 1000); g.fillStyle = '#7ad870'; g.beginPath(); g.moveTo(-420, -520); g.lineTo(120, -520); g.lineTo(150, -440); g.bezierCurveTo(260, -300, 330, -80, 300, 120); g.bezierCurveTo(280, 300, 220, 480, 120, 600); g.bezierCurveTo(60, 640, 0, 560, -20, 470); g.bezierCurveTo(-60, 300, -120, 160, -170, 40); g.bezierCurveTo(-210, -60, -260, -200, -300, -380); g.lineTo(-420, -420); g.closePath(); g.fill(); ink(g, 6);
      const k = smooth(0.1, 0.6, u); g.strokeStyle = '#e8343a'; g.lineWidth = 12; g.beginPath(); g.moveTo(-60, -480); g.lineTo(-60 + 200 * k, -480 + 1080 * k); g.stroke(); g.restore();
      L.bigText(g, 'FLÓRIDA DE VERDADE', 300, smooth(0.02, 0.12, u), { size: 100, col: '#ffffff' });
      L.bigText(g, '≈ 700 km', 1250, smooth(0.5, 0.6, u), { size: 150, col: '#ffd36a' });
    },
    semanas(g, t, u) {
      bg(g, '#f2e2c4', '#d8c09a');
      const d = Math.min(18, 1 + Math.floor(smooth(0.02, 0.8, u) * 18));
      L.calendar(g, 540, 820, 1.5, 'DIA', String(d), -0.04 + 0.03 * Math.sin(t * 3));
      // pé com curativos
      g.save(); g.translate(540, 1420); g.beginPath(); g.ellipse(0, 0, 230, 90, 0, 0, 7); g.fillStyle = '#f0c39e'; g.fill(); ink(g, 5); for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(200 - k * 6, -60 + k * 30, 30 - k * 3, 0, 7); g.fillStyle = '#f0c39e'; g.fill(); ink(g, 4); }
      for (let k = 0; k < 3; k++) { if (u < 0.3 + k * 0.15) continue; g.save(); g.translate(-100 + k * 90, -10); g.rotate(-0.3 + k * 0.3); rr(g, -60, -20, 120, 40, 10); g.fillStyle = '#f2d8b8'; g.fill(); ink(g, 3); g.restore(); }
      g.restore();
      L.bigText(g, 'QUASE 3 SEMANAS', 300, smooth(0.02, 0.12, u), { size: 110, col: '#e8343a' });
    },
    chegada(g, t, u) {
      bg(g, '#ffb07a', '#ff7a8a');
      g.fillStyle = '#f6dcb0'; g.fillRect(0, 1350, W, 600); g.fillStyle = '#3ac0d0'; g.fillRect(0, 1200, W, 160);
      g.save(); g.translate(860, 1350); g.fillStyle = '#7a5a3a'; g.fillRect(-12, -300, 24, 300); rr(g, -140, -380, 280, 110, 12); g.fillStyle = '#fbf6ec'; g.fill(); ink(g, 5); g.fillStyle = '#2a1a16'; g.font = `400 64px ${F_TITLE}`; g.textAlign = 'center'; g.fillText('FIM DO MAPA', 0, -305); g.restore();
      const fall = smooth(EV.cai - 0.3, EV.cai + 0.2, t);
      if (fall < 1) andarilho(g, lerp(100, 560, smooth(0, 0.35, u)), 1560, 0.85, t, { cansado: 1, passo: 0.5 });
      if (fall > 0) { g.save(); g.translate(560, 1560); g.rotate(-Math.PI / 2 * fall); andarilho(g, 0, 0, 0.85, 0, { cansado: 1, passo: 0 }); g.restore(); L.bigText(g, 'CHEGOU.', 400, smooth(EV.cai, EV.cai + 0.2, t), { size: 140, col: '#ffffff' }); }
    },
    carro(g, t, u) {
      bg(g, '#ffb07a', '#ff8a8a');
      A.drawFront(g, 540, 820, 1.05, { ...EU, open: 0.9 * smooth(49.6, 50, t), browUp: 1, wonder: 0.4, look: [0.3, 0.8] });
      g.fillStyle = '#6a6a72'; g.fillRect(0, 1380, W, 700); L.convertible(g, 560, 1400, 0.95, t, { driver: false, col: '#ffd36a' });
      const k = smooth(EV.chave - 0.2, EV.chave + 0.2, t);
      g.save(); g.translate(700, 1290); g.globalAlpha = k; g.fillStyle = '#e8c04a'; g.beginPath(); g.arc(0, 0, 26, 0, 7); g.fill(); ink(g, 4); g.fillRect(20, -8, 70, 16); g.restore();
      sparkle(g, 740, 1270, 40 * k, k * (0.6 + 0.4 * Math.sin(t * 8)));
      L.bigText(g, 'COM A CHAVE.', 250, smooth(51, 51.3, t), { size: 120, col: '#ffffff' });
      L.bigText(g, 'O TEMPO TODO.', 380, smooth(52.6, 52.9, t), { size: 110, col: '#e8343a' });
    },
    final(g, t, u) { mapa(g, t, 1 - smooth(59.5, 62, t)); tint(g, '#000000', 0.15); },
  };
}
export function overlay(ctx, t, L) {
  L.title(ctx, t, 'E SE VOCÊ ATRAVESSASSE', 'O MAPA DO GTA 6 A PÉ?', 3.9, '#ffd36a');
  L.commentCard(ctx, t, 55.2, 59.4, 'Quanto tempo você levaria', 'pra atravessar a pé?', 'COMENTA E SE INSCREVE ⤵');
}
