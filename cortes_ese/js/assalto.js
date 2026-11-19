// ============================================================================
//  Episódio "E se o primeiro assalto da Lucia no GTA 6 fosse na vida real?" (Projeto E se? #017)
//  Foco nas CONSEQUÊNCIAS (câmeras, botão de pânico, rastreio, prisão) — nada de "como fazer".
//  Trechos curtos do jogo intercalados com cenas 2D próprias.
// ============================================================================
export const DUR = 62;
export const SEG = [
  { tipo: 'jogo', id: 'g0', t0: 0.0, t1: 4.2, src: 560.0, congela: true, zoom: [1.0, 1.15] },
  { tipo: 'jogo', id: 'g1', t0: 4.2, t1: 8.6, src: 556.0, zoom: [1.05, 1.15], rot: 'DISFARCE: ÓCULOS' },
  { tipo: 'arte', id: 'cameras', t0: 8.6, t1: 13.2 },
  { tipo: 'jogo', id: 'g2', t0: 13.2, t1: 17.8, src: 588.0, zoom: [1.0, 1.1], rot: 'SAIU DO CONTROLE', alerta: false },
  { tipo: 'arte', id: 'alarme', t0: 17.8, t1: 22.6 },
  { tipo: 'jogo', id: 'g3', t0: 22.6, t1: 27.2, src: 628.0, zoom: [1.0, 1.08], rot: 'NO JOGO: DESPISTOU' },
  { tipo: 'arte', id: 'rastreio', t0: 27.2, t1: 32.0 },
  { tipo: 'jogo', id: 'g4', t0: 32.0, t1: 36.8, src: 752.0, zoom: [1.0, 1.12], rot: 'FIM DA FUGA', alerta: true },
  { tipo: 'jogo', id: 'g5', t0: 36.8, t1: 41.2, src: 772.0, zoom: [1.05, 1.15] },
  { tipo: 'arte', id: 'sentenca', t0: 41.2, t1: 46.4 },
  { tipo: 'jogo', id: 'g6', t0: 46.4, t1: 51.2, src: 302.0, zoom: [1.0, 1.1], rot: 'NO JOGO TAMBÉM' },
  { tipo: 'arte', id: 'checkpoint', t0: 51.2, t1: 55.4 },
  { tipo: 'jogo', id: 'g7', t0: 55.4, t1: 59.6, src: 300.0, congela: true, zoom: [1.0, 1.05], fundo: true },
  { tipo: 'jogo', id: 'g8', t0: 59.6, t1: 62.0, src: 560.0, congela: true, zoom: [1.0, 1.0] },
];

export function arte(L) {
  const { W, H, A, smooth, lerp, clamp, bump, hash, rr, F_TITLE, F_UI, F_MONO } = L;
  const ink = (g, w = 5) => { g.lineWidth = w; g.strokeStyle = A.INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };
  // rosto "disfarçado" (capuz + óculos escuros) — personagem genérico desenhado
  function suspeito(g, x, y, s, t) {
    A.drawFront(g, x, y, s, { age: 1, shirt: 'teen', smile: 0, tired: 0.2 });
    g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.moveTo(-150, 140); g.bezierCurveTo(-190, -40, -150, -230, 0, -235); g.bezierCurveTo(150, -230, 190, -40, 150, 140); g.lineTo(118, 140); g.bezierCurveTo(140, -20, 110, -190, 0, -192); g.bezierCurveTo(-110, -190, -140, -20, -118, 140); g.closePath(); g.fillStyle = '#8a8f9a'; g.fill(); ink(g, 5);
    for (const sx of [-1, 1]) { rr(g, sx * 46 - 40, -32, 80, 46, 18); g.fillStyle = '#14121a'; g.fill(); }
    g.fillStyle = '#14121a'; g.fillRect(-8, -20, 16, 8);
    g.restore();
  }
  function camera(g, x, y, s, t, ang = 0.4) {
    g.save(); g.translate(x, y); g.scale(s, s); g.rotate(ang);
    g.fillStyle = '#d8dce4'; g.fillRect(-12, -40, 24, 40); g.beginPath(); g.rect(-12, -40, 24, 40); ink(g, 3);
    rr(g, -20, 0, 110, 50, 10); g.fillStyle = '#eef0f4'; g.fill(); ink(g, 4);
    g.beginPath(); g.arc(90, 25, 18, 0, 7); g.fillStyle = '#20222a'; g.fill(); ink(g, 3);
    g.beginPath(); g.arc(6, 14, 7, 0, 7); g.fillStyle = Math.sin(t * 6) > 0 ? '#ff2a2a' : '#5a1010'; g.fill();
    g.restore();
  }
  function mapaBase(g) {
    g.fillStyle = '#c8d0b8'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 14; j++) { g.fillStyle = (i + j) % 3 ? '#b8c0a8' : '#a8b898'; g.fillRect(40 + i * 120, 40 + j * 135, 90, 100); }
    g.fillStyle = '#f4efe6'; for (let i = 0; i < 10; i++) g.fillRect(i * 120 + 5, 0, 30, H); for (let j = 0; j < 15; j++) g.fillRect(0, j * 135 + 5, W, 30);
  }
  return {
    cameras(g, t, u) {
      L.bg(g, '#f2e2c4', '#d8c09a');
      g.fillStyle = '#7a5a3a'; g.fillRect(0, 1250, W, 700); g.fillStyle = '#5a8a6a'; g.fillRect(0, 1180, W, 80);
      const cams = [[120, 160, 0.5], [960, 180, 2.6], [140, 760, 0.2], [940, 820, 2.9]];
      cams.forEach(([x, y, a], i) => { const k = smooth(i * 0.06, 0.1 + i * 0.06, u); if (k > 0) { g.save(); g.globalAlpha = k; camera(g, x, y, 1.3, t, a); g.restore(); } });
      // monitores com a mesma cara em todos
      const m = smooth(0.4, 0.55, u);
      if (m > 0) {
        g.save(); g.globalAlpha = m;
        for (let i = 0; i < 6; i++) { const x = 90 + (i % 2) * 470, y = 330 + Math.floor(i / 2) * 330, w = 430, h = 290;
          rr(g, x, y, w, h, 14); g.fillStyle = '#16181e'; g.fill(); ink(g, 5);
          g.save(); g.beginPath(); g.rect(x + 14, y + 14, w - 28, h - 28); g.clip(); g.fillStyle = '#2a3a34'; g.fillRect(x, y, w, h); suspeito(g, x + w / 2 + (i - 2.5) * 6, y + h * 0.72, 0.62, t); g.fillStyle = 'rgba(160,255,190,0.12)'; for (let yy = y; yy < y + h; yy += 5) g.fillRect(x, yy, w, 2); g.restore();
          g.fillStyle = '#ff3a3a'; g.font = `800 26px ${F_MONO}`; g.fillText(`● REC CAM ${i + 1}`, x + 26, y + 46); }
        g.restore();
      }
      L.bigText(g, 'CÂMERA EM TODO CANTO', 200, smooth(0.02, 0.15, u), { size: 96 });
    },
    alarme(g, t, u) {
      L.bg(g, '#2a1a24', '#120a12');
      // mão apertando o botão debaixo do balcão
      g.fillStyle = '#5a3a2a'; g.fillRect(0, 900, W, 60); g.fillStyle = '#3a261c'; g.fillRect(0, 960, W, 980);
      const press = smooth(0.1, 0.2, u);
      g.save(); g.translate(540, 1150); rr(g, -110, -40, 220, 80, 14); g.fillStyle = '#2a2a30'; g.fill(); ink(g, 5);
      g.beginPath(); g.ellipse(0, -40 + 10 * press, 70, 26, 0, 0, 7); g.fillStyle = '#e8243a'; g.fill(); ink(g, 4);
      g.beginPath(); g.moveTo(260, 260); g.quadraticCurveTo(120, 120, 40, -40 + 10 * press - 40); g.lineTo(-10, -50 + 10 * press - 20); g.quadraticCurveTo(60, 160, 200, 300); g.closePath(); g.fillStyle = '#d9a37e'; g.fill(); ink(g, 5);
      g.restore();
      // ondas de sinal até a delegacia
      for (let i = 0; i < 4; i++) { const p = ((t * 0.9 + i / 4) % 1) * smooth(0.2, 0.3, u); if (p <= 0) continue; g.strokeStyle = `rgba(255,80,90,${1 - p})`; g.lineWidth = 8; g.beginPath(); g.arc(540, 1110, 80 + p * 700, -Math.PI * 0.85, -Math.PI * 0.15); g.stroke(); }
      const k = smooth(0.4, 0.55, u);
      g.save(); g.globalAlpha = k; g.translate(540, 470); rr(g, -230, -140, 460, 230, 16); g.fillStyle = '#e8ecf4'; g.fill(); ink(g, 5); g.fillStyle = '#2a3a6a'; g.beginPath(); g.moveTo(-260, -140); g.lineTo(0, -260); g.lineTo(260, -140); g.closePath(); g.fill(); ink(g, 5); g.fillStyle = '#2a3a6a'; g.font = `400 70px ${F_TITLE}`; g.textAlign = 'center'; g.fillText('POLÍCIA', 0, 0); g.fillStyle = Math.sin(t * 10) > 0 ? '#ff3a3a' : '#3a6aff'; g.beginPath(); g.arc(0, -180, 22, 0, 7); g.fill(); g.restore();
      L.bigText(g, 'BOTÃO DE PÂNICO', 200, smooth(0.02, 0.15, u), { size: 110, col: '#ff6a6a' });
      g.save(); g.fillStyle = '#fff'; g.font = `700 64px ${F_MONO}`; g.textAlign = 'center'; g.globalAlpha = smooth(0.3, 0.4, u); g.fillText(`00:00:${String(Math.floor(u * 12)).padStart(2, '0')}`, 540, 780); g.restore();
    },
    rastreio(g, t, u) {
      mapaBase(g);
      const path = [[60, 1700], [140, 1700], [140, 1300], [500, 1300], [500, 900], [860, 900], [860, 420], [1000, 420]];
      const total = path.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);
      let dist = total * smooth(0.05, 0.9, u), pos = path[0], seen = 0;
      g.strokeStyle = 'rgba(232,36,58,0.6)'; g.lineWidth = 10; g.setLineDash([20, 16]); g.beginPath(); g.moveTo(...path[0]);
      for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); if (dist >= d) { g.lineTo(...path[i]); dist -= d; pos = path[i]; } else { pos = [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * dist / d, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * dist / d]; g.lineTo(...pos); break; } }
      g.stroke(); g.setLineDash([]);
      const cams = [[170, 1500], [320, 1270], [530, 1100], [700, 870], [890, 650], [960, 390]];
      cams.forEach(([x, y]) => { const near = Math.hypot(pos[0] - x, pos[1] - y) < 260 || (seen += 0, false); camera(g, x, y, 0.55, t, 0.6); if (near) { g.save(); g.globalCompositeOperation = 'screen'; L.glow(g, x, y, 140, '#ff3a3a', 0.6); g.restore(); } });
      g.beginPath(); g.arc(pos[0], pos[1], 26, 0, 7); g.fillStyle = '#e8243a'; g.fill(); ink(g, 5);
      // reconhecimento facial
      const k = smooth(0.35, 0.5, u);
      if (k > 0) { g.save(); g.globalAlpha = k; rr(g, 560, 980, 440, 440, 20); g.fillStyle = '#10141c'; g.fill(); ink(g, 5); g.save(); g.beginPath(); g.rect(574, 994, 412, 412); g.clip(); suspeito(g, 780, 1290, 0.95, t); g.restore();
        const sc = 994 + ((t * 300) % 412); g.fillStyle = 'rgba(90,232,255,0.5)'; g.fillRect(574, sc, 412, 6);
        g.strokeStyle = '#5ae8ff'; g.lineWidth = 6; g.strokeRect(650, 1060, 260, 280);
        g.fillStyle = '#5ae8ff'; g.font = `800 34px ${F_MONO}`; g.fillText(`MATCH ${Math.min(97, Math.floor(40 + u * 70))}%`, 620, 1460); g.restore(); }
      L.bigText(g, 'RECONHECIMENTO FACIAL', 200, smooth(0.02, 0.15, u), { size: 96, col: '#ffffff' });
    },
    sentenca(g, t, u) {
      L.bg(g, '#2a1e18', '#120c0a');
      // martelo do juiz
      const hit = bump(0.1, 0.16, 0.2, 0.3, u);
      g.save(); g.translate(540, 760); g.rotate(-0.6 + 0.6 * hit);
      g.fillStyle = '#7a4a2a'; g.fillRect(-20, -20, 300, 40); g.beginPath(); g.rect(-20, -20, 300, 40); ink(g, 5);
      rr(g, -100, -70, 120, 140, 14); g.fillStyle = '#8a5a34'; g.fill(); ink(g, 5); g.restore();
      g.fillStyle = '#6a4024'; rr(g, 340, 860, 340, 60, 12); g.fill(); ink(g, 5);
      if (u > 0.16) L.tint(g, '#ffffff', 0.25 * (1 - smooth(0.16, 0.3, u)), 'screen');
      const anos = Math.min(10, Math.floor(smooth(0.25, 0.85, u) * 10.99));
      L.calendar(g, 540, 1250, 1.1, 'ANOS', anos >= 10 ? '10+' : String(anos), -0.04);
      // grades descendo
      const gr = smooth(0.7, 0.95, u);
      if (gr > 0) { g.save(); g.fillStyle = '#3a3a44'; for (let i = 0; i < 9; i++) { g.fillRect(40 + i * 125, -H + gr * H, 26, H); g.beginPath(); g.rect(40 + i * 125, -H + gr * H, 26, H); ink(g, 4); } g.restore(); }
      L.bigText(g, 'ROUBO COM ARMA', 200, smooth(0.02, 0.15, u), { size: 110, col: '#ffd36a' });
    },
    checkpoint(g, t, u) {
      L.bg(g, '#3a0a14', '#0a0206');
      g.save(); g.textAlign = 'center'; g.font = `400 150px ${F_TITLE}`; g.lineWidth = 14; g.strokeStyle = '#000'; g.fillStyle = '#ff3a4a'; const s = 1 + 0.2 * (1 - smooth(0, 0.15, u)); g.translate(540, 720); g.scale(s, s); g.strokeText('MISSÃO FALHOU', 0, 0); g.fillText('MISSÃO FALHOU', 0, 0); g.restore();
      const k = smooth(0.25, 0.4, u);
      g.save(); g.globalAlpha = k; rr(g, 190, 900, 700, 130, 24); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = '#fff'; g.font = `900 56px ${F_UI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TENTAR NOVAMENTE', 540, 966); g.restore();
      const x = smooth(0.5, 0.62, u);
      if (x > 0) { g.save(); g.strokeStyle = '#ff3a4a'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(170, 966); g.lineTo(170 + 740 * x, 966); g.stroke(); g.restore(); L.stamp(g, 540, 1240, 'SEM CHECKPOINT', smooth(0.6, 0.75, u), '#ffd36a', -0.08); }
    },
  };
}
export function overlay(ctx, t, L) {
  L.title(ctx, t, 'E SE O PRIMEIRO ASSALTO DA LUCIA', 'FOSSE NA VIDA REAL?', 3.8, '#ff6a6a');
  L.commentCard(ctx, t, 55.5, 59.5, 'Qual missão do GTA 6 você', 'quer ver na vida real?', 'COMENTA E SE INSCREVE ⤵');
}
