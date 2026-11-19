// ============================================================================
//  Episódio "E se a fuga de hidroavião do GTA 6 fosse na vida real?" (Projeto E se? #016)
//  Linha do tempo (trechos curtos do jogo + cenas 2D próprias) e as cenas 2D.
// ============================================================================
export const DUR = 62;
export const SEG = [
  { tipo: 'jogo', id: 'g0', t0: 0.0, t1: 4.2, src: 1701.0, congela: true, zoom: [1.0, 1.18] },
  { tipo: 'jogo', id: 'g1', t0: 4.2, t1: 8.6, src: 1678.5, zoom: [1.05, 1.12], rot: 'NO JOGO' },
  { tipo: 'arte', id: 'licenca', t0: 8.6, t1: 13.1 },
  { tipo: 'jogo', id: 'g2', t0: 13.1, t1: 18.2, src: 1697.0, zoom: [1.0, 1.1], rot: '≈ 100 km/h', rot2: '≈ 500 m DE ÁGUA' },
  { tipo: 'arte', id: 'degrau', t0: 18.2, t1: 22.9 },
  { tipo: 'jogo', id: 'g3', t0: 22.9, t1: 27.6, src: 1705.0, zoom: [1.1, 1.0], rot: 'ÁGUA RASA + RAIZ', alerta: true },
  { tipo: 'jogo', id: 'g4', t0: 27.6, t1: 31.8, src: 1713.0, zoom: [1.0, 1.08] },
  { tipo: 'arte', id: 'pousar', t0: 31.8, t1: 37.2 },
  { tipo: 'arte', id: 'policia', t0: 37.2, t1: 42.3 },
  { tipo: 'jogo', id: 'g5', t0: 42.3, t1: 47.0, src: 1721.0, zoom: [1.0, 1.1], rot: 'TODO MUNDO VIU' },
  { tipo: 'arte', id: 'placar', t0: 47.0, t1: 51.9 },
  { tipo: 'jogo', id: 'g6', t0: 51.9, t1: 55.4, src: 1729.0, zoom: [1.0, 1.06] },
  { tipo: 'jogo', id: 'g7', t0: 55.4, t1: 59.6, src: 1733.0, congela: true, zoom: [1.0, 1.05], fundo: true },
  { tipo: 'jogo', id: 'g8', t0: 59.6, t1: 62.0, src: 1701.0, congela: true, zoom: [1.0, 1.0] },
];

export function arte(L) {
  const { W, H, A, smooth, lerp, clamp, bump, hash, rr, F_TITLE, F_UI, F_HAND } = L;
  function ceu(g, t) { L.bg(g, '#7ec8f0', '#d8f0ff'); for (let i = 0; i < 7; i++) { const x = ((hash(i) * W + t * 30 * (0.5 + hash(i + 1))) % (W + 400)) - 200, y = 200 + hash(i + 2) * 700; g.fillStyle = 'rgba(255,255,255,0.85)'; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * 60, y - (k % 2) * 30, 80, 50, 0, 0, 7); g.fill(); } } }
  function aviao(g, x, y, s, t, { rot = 0, flut = 0, spray = 0 } = {}) {   // hidroavião de lado (desenho próprio)
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    const ink = (w = 5) => { g.lineWidth = w; g.strokeStyle = A.INK; g.lineJoin = 'round'; g.stroke(); };
    // flutuadores
    for (const dx of [0]) { g.beginPath(); g.moveTo(-170, 120); g.quadraticCurveTo(-200, 150, -150, 160); g.lineTo(150, 160); g.quadraticCurveTo(210, 150, 200, 125); g.closePath(); g.fillStyle = '#d8dde6'; g.fill(); ink(); g.beginPath(); g.moveTo(0, 125); g.lineTo(0, 160); ink(3); }
    g.strokeStyle = A.INK; g.lineWidth = 8; g.beginPath(); g.moveTo(-90, 60); g.lineTo(-110, 125); g.moveTo(70, 60); g.lineTo(90, 125); g.stroke();
    // fuselagem
    g.beginPath(); g.moveTo(-260, 10); g.quadraticCurveTo(-200, -40, -60, -50); g.lineTo(120, -40); g.quadraticCurveTo(200, -20, 210, 20); g.quadraticCurveTo(200, 60, 120, 60); g.lineTo(-120, 50); g.lineTo(-260, 30); g.closePath(); g.fillStyle = '#f4f4f0'; g.fill(); ink();
    g.fillStyle = '#2a7ad0'; g.fillRect(-250, 14, 440, 12);
    g.beginPath(); g.moveTo(-260, 10); g.lineTo(-300, -70); g.lineTo(-240, -70); g.lineTo(-200, 0); g.closePath(); g.fillStyle = '#f4f4f0'; g.fill(); ink();
    g.beginPath(); g.moveTo(40, -40); g.lineTo(110, -38); g.quadraticCurveTo(150, -20, 150, 0); g.lineTo(40, 0); g.closePath(); g.fillStyle = '#8ac8f0'; g.fill(); ink(4);
    g.fillStyle = '#e8eef4'; g.fillRect(-120, -62, 300, 16); g.beginPath(); g.rect(-120, -62, 300, 16); ink(4);
    g.save(); g.translate(212, 18); g.scale(1, Math.abs(Math.cos(t * 60))); g.fillStyle = 'rgba(60,60,70,0.6)'; g.fillRect(-4, -70, 8, 140); g.restore();
    if (spray > 0) for (let i = 0; i < 18; i++) { const a = Math.PI + 0.4 + hash(i) * 0.9, r = (40 + 120 * hash(i + 1)) * spray; g.fillStyle = `rgba(255,255,255,${0.7 * spray})`; g.beginPath(); g.arc(-150 + Math.cos(a) * r * 1.6, 160 + Math.sin(a) * r * 0.6 - 10, 8 + 10 * hash(i + 2), 0, 7); g.fill(); }
    g.restore();
  }
  const ARTE = {
    licenca(g, t, u) {
      ceu(g, t);
      g.save(); g.translate(540, 900); g.rotate(-0.06 + 0.04 * Math.sin(t)); const s = 0.8 + 0.2 * smooth(0, 0.15, u); g.scale(s, s);
      g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = 30; rr(g, -400, -260, 800, 520, 30); g.fillStyle = '#fbf6ec'; g.fill(); g.shadowBlur = 0; g.lineWidth = 6; g.strokeStyle = A.INK; g.stroke();
      rr(g, -400, -260, 800, 110, 30); g.fillStyle = '#2a5ab0'; g.fill(); g.fillStyle = '#fff'; g.font = `400 64px ${F_TITLE}`; g.textAlign = 'center'; g.fillText('LICENÇA DE PILOTO', 0, -185);
      g.save(); g.beginPath(); rr(g, -360, -120, 260, 320, 16); g.clip(); g.fillStyle = '#c8d8f0'; g.fillRect(-360, -120, 260, 320); A.drawFront(g, -230, 60, 0.75, { age: 1, smile: 0.2 }); g.restore();
      g.textAlign = 'left'; g.fillStyle = '#2a1a16'; g.font = `800 36px ${F_UI}`; ['NOME: VOCÊ', 'HORAS DE VOO: 0', 'CATEGORIA: ???'].forEach((l, i) => g.fillText(l, -60, -60 + i * 70));
      g.restore();
      L.stamp(g, 640, 1230, 'HIDROAVIÃO', smooth(0.45, 0.62, u), '#e8343a', -0.15);
      L.bigText(g, 'PRECISA DE HABILITAÇÃO', 420, smooth(0.05, 0.2, u), { size: 84, col: '#ffffff' });
    },
    degrau(g, t, u) {
      ceu(g, t);
      g.fillStyle = '#2a8ab8'; g.fillRect(0, 1180, W, 740); for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 4; g.beginPath(); for (let x = 0; x <= W; x += 30) g.lineTo(x, 1220 + i * 70 + 8 * Math.sin(x * 0.02 + t * 3 + i)); g.stroke(); }
      const ph = u < 0.33 ? 0 : u < 0.66 ? 1 : 2, k = smooth(0, 1, u);
      const y = 1080 - 60 * smooth(0.33, 0.6, u) - 260 * smooth(0.66, 1, u), rot = -0.12 * smooth(0.66, 0.85, u);
      aviao(g, 300 + 450 * k, y, 1.05, t, { rot, spray: bump(0.15, 0.3, 0.7, 0.85, u) });
      const labels = ['1. ARRASTA NA ÁGUA', '2. SOBE NO "DEGRAU"', '3. DECOLA'];
      labels.forEach((l, i) => { const a = i === ph ? 1 : 0.35; g.save(); g.globalAlpha = a; rr(g, 90, 300 + i * 120, 900, 96, 20); g.fillStyle = i === ph ? '#ff5ab0' : 'rgba(0,0,0,0.35)'; g.fill(); g.fillStyle = '#fff'; g.font = `400 58px ${F_TITLE}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(l, 540, 350 + i * 120); g.restore(); });
      // velocímetro e régua
      g.save(); g.translate(880, 1500); g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(0, 0, 120, Math.PI, 0); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 110, Math.PI, 0); g.stroke(); const a = Math.PI + Math.PI * k; g.strokeStyle = '#ffd36a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 95, Math.sin(a) * 95); g.stroke(); g.fillStyle = '#fff'; g.font = `400 48px ${F_TITLE}`; g.textAlign = 'center'; g.fillText(`${Math.round(100 * k)} km/h`, 0, 60); g.restore();
      rr(g, 80, 1500, 560, 30, 15); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fill(); rr(g, 80, 1500, 560 * k, 30, 15); g.fillStyle = '#ffd36a'; g.fill(); g.fillStyle = '#fff'; g.font = `800 40px ${F_UI}`; g.textAlign = 'left'; g.fillText(`${Math.round(500 * k)} m de água`, 90, 1475);
    },
    pousar(g, t, u) { mapa(g, t, u, false); },
    policia(g, t, u) { mapa(g, t, u, true); },
    placar(g, t, u) {
      L.bg(g, '#1a1030', '#0a0614');
      g.save(); g.translate(540, 960); const s = 0.85 + 0.15 * smooth(0, 0.15, u); g.scale(s, s);
      rr(g, -480, -560, 960, 1120, 40); g.fillStyle = 'rgba(250,244,232,0.97)'; g.fill(); g.lineWidth = 6; g.strokeStyle = A.INK; g.stroke();
      g.textAlign = 'center'; g.font = `400 70px ${F_TITLE}`; g.fillStyle = '#ff5ab0'; g.fillText('GTA 6', -230, -450); g.fillStyle = '#2a5ab0'; g.fillText('VIDA REAL', 230, -450);
      g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -510); g.lineTo(0, 520); g.stroke();
      const rows = [['ESTILO', 5, 5], ['DISCRIÇÃO', 4, 1], ['CHANCE DE DAR CERTO', 5, 1], ['CHANCE DE SER ACHADO', 1, 5]];
      rows.forEach(([n, a, b], i) => { const y = -300 + i * 230, k = smooth(0.12 + i * 0.15, 0.25 + i * 0.15, u); g.globalAlpha = k; g.fillStyle = '#2a1a16'; g.font = `900 40px ${F_UI}`; g.fillText(n, 0, y); estrelas(g, -230, y + 80, a); estrelas(g, 230, y + 80, b); g.globalAlpha = 1; });
      g.restore();
    },
  };
  function estrelas(g, x, y, n) { for (let i = 0; i < 5; i++) { g.save(); g.translate(x + (i - 2) * 64, y); g.beginPath(); for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, r = j % 2 ? 11 : 27; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fillStyle = i < n ? '#ffc83a' : 'rgba(0,0,0,0.12)'; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.4)'; g.stroke(); g.restore(); } }
  function mapa(g, t, u, pol) {
    g.fillStyle = '#9ad08a'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#f4efe6'; g.lineWidth = 26; for (const [a, b, c, d] of [[0, 600, W, 820], [300, 0, 380, H], [0, 1400, W, 1250], [760, 0, 700, H]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(40,90,50,0.35)'; g.beginPath(); g.arc(hash(i) * W, hash(i + 3) * H, 18 + 20 * hash(i + 5), 0, 7); g.fill(); }
    const lagos = [[180, 360, 120, 80], [880, 520, 140, 90], [520, 1100, 170, 110], [200, 1600, 150, 90], [900, 1650, 120, 100]];
    lagos.forEach(([x, y, rx, ry]) => { g.fillStyle = '#4ab0e0'; g.beginPath(); g.ellipse(x, y, rx, ry, 0.3, 0, 7); g.fill(); g.lineWidth = 5; g.strokeStyle = '#2a7ab0'; g.stroke(); });
    g.strokeStyle = '#4ab0e0'; g.lineWidth = 40; g.beginPath(); g.moveTo(-50, 1900); g.bezierCurveTo(400, 1500, 600, 1500, W + 50, 1350); g.stroke();
    // avião (ícone) voando em círculo
    const a = t * 0.9, px = 540 + Math.cos(a) * 300, py = 900 + Math.sin(a) * 420;
    g.save(); g.translate(px, py); g.rotate(a + Math.PI / 2); g.fillStyle = '#fff'; g.strokeStyle = A.INK; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -50); g.lineTo(10, -10); g.lineTo(60, 0); g.lineTo(10, 10); g.lineTo(6, 40); g.lineTo(22, 50); g.lineTo(-22, 50); g.lineTo(-6, 40); g.lineTo(-10, 10); g.lineTo(-60, 0); g.lineTo(-10, -10); g.closePath(); g.fill(); g.stroke(); g.restore();
    if (!pol) {
      lagos.forEach(([x, y], i) => { const k = smooth(0.2 + i * 0.1, 0.3 + i * 0.1, u); if (k <= 0) return; g.save(); g.globalAlpha = k; g.translate(x, y - 70 - 10 * Math.sin(t * 4 + i)); g.fillStyle = '#e8343a'; g.beginPath(); g.arc(0, 0, 28, Math.PI, 0); g.lineTo(0, 50); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill(); g.restore(); });
      L.bigText(g, 'SÓ POUSA NA ÁGUA', 300, smooth(0.05, 0.2, u), { size: 110, col: '#ffffff' });
    } else {
      lagos.forEach(([x, y], i) => { const k = smooth(0.1 + i * 0.08, 0.2 + i * 0.08, u); if (k <= 0) return; g.save(); g.globalAlpha = k; g.translate(x + 40, y); g.fillStyle = '#20263a'; g.beginPath(); g.moveTo(-50, 0); g.lineTo(40, 0); g.lineTo(55, -18); g.lineTo(-50, -18); g.closePath(); g.fill(); g.fillStyle = Math.sin(t * 12 + i) > 0 ? '#ff3a3a' : '#3a6aff'; g.beginPath(); g.arc(0, -28, 9, 0, 7); g.fill(); g.restore(); });
      L.tint(g, Math.sin(t * 10) > 0 ? '#ff2a3a' : '#2a5aff', 0.08, 'screen');
      L.bigText(g, 'A POLÍCIA SÓ ESPERA', 300, smooth(0.05, 0.2, u), { size: 100, col: '#ffffff' });
    }
  }

  return ARTE;
}
export function overlay(ctx, t, L) {
  L.title(ctx, t, 'E SE A FUGA DE HIDROAVIÃO', 'FOSSE NA VIDA REAL?', 3.8, '#5ae8ff');
  L.commentCard(ctx, t, 55.5, 59.5, 'Qual fuga do GTA 6 você', 'quer ver na vida real?', 'COMENTA E SE INSCREVE ⤵');
}
