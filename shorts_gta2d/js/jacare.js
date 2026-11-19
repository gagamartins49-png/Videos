// ============================================================================
//  #018 — "E se um jacaré entrasse na loja onde você trabalha… igual no trailer do GTA 6?"
//  100% animação 2D própria (sem trechos do jogo). Humor + curiosidades reais e seguras
//  sobre jacarés (manter distância, mito do zigue-zague, chamar o controle de animais).
// ============================================================================
export const DUR = 62;
export const CENAS = [
  ['gancho', 0, 4.2], ['caixa', 4.2, 8.6], ['porta', 8.6, 13.0], ['entra', 13.0, 15.6], ['susto', 15.6, 17.6],
  ['fato', 17.6, 22.2], ['regra', 22.2, 26.8], ['mito', 26.8, 31.5], ['salgadinho', 31.5, 36.2], ['balcao', 36.2, 40.8],
  ['especialista', 40.8, 45.6], ['fita', 45.6, 50.2], ['moral', 50.2, 55.0], ['final', 55.0, 62],
];
export const CORTES = ['susto'];
export const EV = { portaAbre: 9.2, focinho: 11.4, bote: 24.0, laco: 43.4, rabo: 59.4 };
export const AUDIO = {
  estilo: 'synth',
  ganhos: { synth: [[0, 0.35], [8.6, 0.25], [13, 0.55], [31.5, 0.7], [50.2, 0.5], [62, 0.35]], batida: [[0, 0], [13, 0], [13.2, 0.6], [22.2, 0.3], [31.5, 0.8], [40.8, 0.6], [50.2, 0.3], [62, 0]], caixinha: [[0, 0], [31.5, 0], [32, 0.5], [36, 0.5], [36.4, 0], [62, 0]], cordas: [[0, 0.3], [8.6, 0.5], [13, 0.1], [62, 0.2]] },
  abafado: [[0, 0], [62, 0]],
  cues: [
    [0, 'jacare', 0.4], [4.2, 'vento', 0.06, 0, 8.6], [9.2, 'porta', 0.5], [9.25, 'whoosh', 0.3], [11.4, 'jacare', 0.5], [13.0, 'whoosh', 0.3],
    [15.6, 'susto', 0.6], [17.6, 'brilho', 0.3], [24.0, 'whoosh', 0.5], [24.05, 'clique', 0.6], [26.8, 'whoosh', 0.3], [29.0, 'erro', 0.35], [30.0, 'estrela', 0.4],
    [32.6, 'chaves', 0.3], [33.8, 'chaves', 0.3], [36.2, 'bipe', 0.2], [36.5, 'bipe', 0.2], [40.8, 'porta', 0.3], [43.4, 'clique', 0.6], [43.45, 'jacare', 0.4],
    [45.6, 'whoosh', 0.3], [49.5, 'porta', 0.4], [50.2, 'brilho', 0.35], [59.4, 'jacare', 0.4],
  ],
};

export function scenes(L) {
  const { A, W, H, smooth, lerp, clamp, bump, hash, rr, cam, tint, glow, faceShot, gator, bg, sparkle, dust, F_TITLE, F_UI, F_HAND } = L;
  const ink = (g, w = 5) => { g.lineWidth = w; g.strokeStyle = A.INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };
  const gatorL = (g, x, y, sc, t, w) => { g.save(); g.translate(x, y); g.scale(-1, 1); gator(g, 0, 0, sc, t, w); g.restore(); };   // olhando para a esquerda
  const UNIF = '#c8442a';   // camisa do uniforme do caixa
  // ---------------- loja de conveniência à noite (genérica, sem marcas)
  function prateleira(g, x, y, w, h, seed) {
    g.fillStyle = '#d8dce4'; g.fillRect(x, y, w, h); g.beginPath(); g.rect(x, y, w, h); ink(g, 4);
    for (let r = 0; r < 4; r++) { const yy = y + 20 + r * (h - 30) / 4; g.fillStyle = '#9aa0ac'; g.fillRect(x, yy + (h - 30) / 4 - 10, w, 8);
      for (let k = 0; k < Math.floor(w / 34); k++) { const c = ['#ff5a5a', '#ffd36a', '#5ab0ff', '#7ad870', '#ff9a3a', '#c86aff'][Math.floor(hash(seed + r * 13 + k) * 6)]; const bh = 40 + 30 * hash(seed + k + r); g.fillStyle = c; g.fillRect(x + 6 + k * 34, yy + (h - 30) / 4 - 10 - bh, 26, bh); } }
  }
  function loja(g, t, { portaK = 0, noite = 1 } = {}) {
    bg(g, '#e8ecf2', '#c8ccd6');
    g.fillStyle = '#b8bcc6'; g.fillRect(-W, 1250, 3 * W, 1000);
    for (let i = -2; i < 14; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#d8dce4' : '#c4c8d2'; g.fillRect(i * 90, 1250 + j * 90, 90, 90); }
    // vitrine e porta automática com o estacionamento escuro lá fora
    g.fillStyle = '#10142a'; g.fillRect(560, 420, 460, 830);
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,220,140,0.6)'; g.beginPath(); g.arc(600 + hash(i) * 400, 900 + hash(i + 3) * 200, 4 + 6 * hash(i + 4), 0, 7); g.fill(); }
    const pw = 230 * portaK;
    g.fillStyle = 'rgba(180,220,255,0.35)'; g.fillRect(560 - pw, 420, 230, 830); g.fillRect(790 + pw, 420, 230, 830);
    g.strokeStyle = '#8a8f9a'; g.lineWidth = 10; g.strokeRect(560 - pw, 420, 230, 830); g.strokeRect(790 + pw, 420, 230, 830);
    g.fillStyle = '#5a5f6a'; g.fillRect(540, 390, 500, 34);
    // letreiro néon genérico
    g.save(); g.font = `400 70px ${F_TITLE}`; g.textAlign = 'center'; g.shadowColor = '#ff5ab0'; g.shadowBlur = 30; g.fillStyle = '#ffd0ec'; g.fillText('ABERTO 24H', 790, 340); g.restore();
    prateleira(g, 40, 560, 470, 600, 3);
    // geladeira iluminada
    g.fillStyle = '#e0f4ff'; g.fillRect(40, 180, 470, 340); g.beginPath(); g.rect(40, 180, 470, 340); ink(g, 4); for (let k = 0; k < 10; k++) { g.fillStyle = ['#ff5a5a', '#5ab0ff', '#7ad870'][k % 3]; g.fillRect(60 + k * 44, 230, 30, 90); g.fillRect(60 + k * 44, 380, 30, 90); }
    A.drawClock(g, 380, 110, 50, 3, 12 + t * 0.2);
  }
  function caixa(g, x, y, s, t, o = {}) {   // atendente atrás do balcão
    A.drawFront(g, x, y, s, { age: 1, shirt: 'teen', cloth: UNIF, ...o });
    g.save(); g.translate(x, y); g.scale(s, s); rr(g, -150, 150, 300, 80, 12); g.fillStyle = '#fff4d8'; g.fill(); ink(g, 4); g.fillStyle = '#2a1a16'; g.font = `900 40px ${F_UI}`; g.textAlign = 'center'; g.fillText('CAIXA', 0, 205); g.restore();
  }
  function balcao(g, y = 1180) { g.fillStyle = '#8a5a3a'; g.fillRect(-W, y, 3 * W, 120); g.beginPath(); g.rect(-W, y, 3 * W, 120); ink(g, 5); g.fillStyle = '#6a4228'; g.fillRect(-W, y + 120, 3 * W, 700); rr(g, 80, y - 110, 180, 110, 10); g.fillStyle = '#2a2a30'; g.fill(); ink(g, 4); }
  function oficial(g, x, y, s, t, laco = 0) {   // especialista em fauna (silhueta com vara de laço)
    A.drawBack(g, x, y, s, { age: 1, rim: '#7ad870', rimK: 0.8, arms: false });
    g.save(); g.strokeStyle = '#3a3a40'; g.lineWidth = 12; g.beginPath(); g.moveTo(x + 60 * s, y + 60 * s); g.lineTo(x - 420 * s, y + 380 * s + 40 * laco); g.stroke(); g.beginPath(); g.ellipse(x - 440 * s, y + 400 * s + 40 * laco, 50 * s * (1 - 0.5 * laco), 30 * s, 0, 0, 7); g.lineWidth = 6; g.strokeStyle = '#d8b04a'; g.stroke(); g.restore();
  }
  return {
    gancho(g, t, u) {
      g.save(); cam(g, 760, 1180, 2.0 + 0.25 * u); loja(g, t, { portaK: 1 }); gatorL(g, 760 + 140 * (1 - smooth(0, 1, u)), 1230, 1.0, t, t); g.restore();
      tint(g, '#3a3a7a', 0.15);
    },
    caixa(g, t, u) {
      g.save(); cam(g, 540, 960, 1.0 + 0.05 * u); loja(g, t); balcao(g);
      caixa(g, 300, 1000, 0.75, t, { tired: 0.8, blink: bump(6.4, 6.45, 6.5, 6.6, t), look: [0.4, 0] });
      g.restore();
    },
    porta(g, t, u) {
      const k = smooth(EV.portaAbre, EV.portaAbre + 0.8, t), down = smooth(10.6, 11.4, t);
      g.save(); cam(g, 790, lerp(830, 1150, down), 1.35 + 0.3 * down); loja(g, t, { portaK: k });
      if (t > EV.focinho - 0.3) { const p = smooth(EV.focinho - 0.3, EV.focinho + 0.8, t); g.save(); g.beginPath(); g.rect(560, 420, 460, 830); g.clip(); gatorL(g, 1250 - 330 * p, 1230, 1.0, t, t * p); g.restore(); }
      g.restore();
      if (t > EV.focinho) L.bigText(g, '?!', 520, smooth(EV.focinho, EV.focinho + 0.2, t) * (1 - smooth(12.6, 13, t)), { size: 200, col: '#ffd36a' });
    },
    entra(g, t, u) {
      g.save(); cam(g, 540, 1180, 1.25); loja(g, t, { portaK: 1 });
      gatorL(g, lerp(1400, 420, u), 1460, 1.7, t, t * 1.5);
      g.restore();
    },
    susto(g, t, u) { faceShot(g, t, { bgTop: '#e8ecf2', bgBot: '#b8bcc6', light: '#ffffff', lightA: 0.2, zoom: 1.1, face: { age: 1, cloth: UNIF, shirt: 'teen', open: 0.9, browUp: 1, wonder: 0.2, look: [0.5, 0.3] } }); },
    fato(g, t, u) {
      bg(g, '#5ac0e8', '#2a8ab8');
      // península estilizada (forma própria)
      g.save(); g.translate(540, 1000); g.fillStyle = '#7ad870'; g.beginPath(); g.moveTo(-420, -520); g.lineTo(120, -520); g.lineTo(150, -440); g.bezierCurveTo(260, -300, 330, -80, 300, 120); g.bezierCurveTo(280, 300, 220, 480, 120, 600); g.bezierCurveTo(60, 640, 0, 560, -20, 470); g.bezierCurveTo(-60, 300, -120, 160, -170, 40); g.bezierCurveTo(-210, -60, -260, -200, -300, -380); g.lineTo(-420, -420); g.closePath(); g.fill(); ink(g, 6); g.restore();
      const n = Math.floor(smooth(0.05, 0.75, u) * 60);
      for (let i = 0; i < n; i++) { const x = 300 + hash(i) * 520, y = 520 + hash(i + 3) * 1000; if (Math.abs(x - 540) > 330 - (y - 500) * 0.12) continue; g.save(); g.translate(x, y); g.scale(0.09, 0.09); gator(g, 0, 0, 1, t, t + i); g.restore(); }
      const val = Math.floor(1300000 * smooth(0.05, 0.75, u));
      g.save(); rr(g, 140, 1580, 800, 0, 0); g.restore();
      L.bigText(g, `${val.toLocaleString('pt-BR')}`, 300, smooth(0.02, 0.1, u), { size: 140, col: '#ffffff' });
      L.bigText(g, 'JACARÉS NA FLÓRIDA', 440, smooth(0.08, 0.18, u), { size: 90, col: '#ffd36a' });
    },
    regra(g, t, u) {
      bg(g, '#f2e2c4', '#d8c09a');
      const bote = bump(0.36, 0.42, 0.5, 0.62, u);
      gator(g, 330 + 260 * bote, 1250, 1.05, t, t * 0.3);
      A.drawBack(g, 880, 1180, 0.55, { age: 1, rim: '#ff8a8a', rimK: 0.6, arms: false });
      g.save(); g.strokeStyle = '#2a1a16'; g.lineWidth = 6; g.setLineDash([20, 14]); g.beginPath(); g.moveTo(680, 1460); g.lineTo(860, 1460); g.stroke(); g.restore();
      if (bote > 0.3) { for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(42,26,22,0.6)'; g.lineWidth = 6; g.beginPath(); g.moveTo(200 - i * 10, 1180 + i * 22); g.lineTo(80 - i * 10, 1180 + i * 22); g.stroke(); } }
      L.bigText(g, 'NÃO CHEGA PERTO', 320, smooth(0.02, 0.12, u), { size: 120, col: '#e8343a' });
      L.bigText(g, 'O BOTE É RAPIDÍSSIMO', 470, smooth(0.36, 0.42, u), { size: 84, col: '#2a1a16' });
    },
    mito(g, t, u) {
      bg(g, '#c8e0a8', '#a8c888');
      const zig = u < 0.5, k = zig ? smooth(0.05, 0.45, u) : smooth(0.55, 0.95, u);
      g.save(); g.strokeStyle = zig ? '#e8343a' : '#2aa84a'; g.lineWidth = 12; g.setLineDash([24, 16]); g.beginPath(); g.moveTo(540, 1500);
      if (zig) { for (let i = 1; i <= 6 * k; i++) g.lineTo(540 + (i % 2 ? 160 : -160), 1500 - i * 140); } else g.lineTo(540, 1500 - 840 * k);
      g.stroke(); g.restore();
      gator(g, 540, 1650, 0.8, t, t);
      { const py = zig ? 1500 - 840 * k : 1500 - 840 * k, px = zig ? 540 + ((Math.floor(6 * k) % 2) ? 160 : -160) * ((6 * k) % 1) : 540; A.drawBack(g, px, py - 200, 0.35, { age: 1, rim: '#ffffff', rimK: 0.5, arms: false }); }
      if (zig && u > 0.4) { g.save(); g.strokeStyle = '#e8343a'; g.lineWidth = 28; g.lineCap = 'round'; const r = 220; g.beginPath(); g.moveTo(540 - r, 1100 - r); g.lineTo(540 + r, 1100 + r); g.moveTo(540 + r, 1100 - r); g.lineTo(540 - r, 1100 + r); g.stroke(); g.restore(); }
      L.bigText(g, zig ? 'ZIGUE-ZAGUE? MITO' : 'CORRE RETO, PRA LONGE', 300, zig ? smooth(0.02, 0.1, u) : smooth(0.52, 0.6, u), { size: 100, col: zig ? '#e8343a' : '#2aa84a' });
    },
    salgadinho(g, t, u) {
      g.save(); cam(g, 540, 1100, 1.1); bg(g, '#e8ecf2', '#c8ccd6'); g.fillStyle = '#b8bcc6'; g.fillRect(-W, 1350, 3 * W, 900);
      prateleira(g, 60, 480, 960, 840, 21);
      // pacotes caindo
      for (let i = 0; i < 6; i++) { const t0 = 32.4 + i * 0.5, p = clamp((t - t0) / 0.7); if (p <= 0) continue; const x = 200 + i * 130, y = 900 + p * p * 520; g.save(); g.translate(x, Math.min(y, 1420)); g.rotate(p * 2 * (i % 2 ? 1 : -1)); rr(g, -40, -55, 80, 110, 10); g.fillStyle = ['#ffd36a', '#ff5a5a', '#5ab0ff'][i % 3]; g.fill(); ink(g, 4); g.restore(); }
      gatorL(g, lerp(1200, 560, smooth(0, 0.4, u)), 1460, 1.2, t, t);
      if (u > 0.55) { g.save(); g.translate(lerp(1200, 560, 1) + 360, 1450); g.rotate(-0.3); rr(g, -50, -60, 100, 120, 10); g.fillStyle = '#ffd36a'; g.fill(); ink(g, 4); g.restore(); }
      for (let i = 0; i < 4; i++) { const ph = (t * 0.7 + i / 4) % 1; g.save(); g.globalAlpha = Math.sin(ph * Math.PI) * smooth(0.5, 0.6, u); g.font = `700 80px ${F_HAND}`; g.fillStyle = '#2a1a16'; g.fillText('♪', 700 + 80 * Math.sin(i * 2 + ph * 3), 1250 - ph * 300); g.restore(); }
      g.restore();
    },
    balcao(g, t, u) {
      faceShot(g, t, { bgTop: '#e8ecf2', bgBot: '#b8bcc6', light: '#ffffff', lightA: 0.15, zoom: 1.0, face: { age: 1, cloth: UNIF, shirt: 'teen', browUp: 0.8, wonder: 0.3, open: 0.3 * Math.abs(Math.sin(t * 9)) * smooth(37.2, 37.4, t), look: [0.6, 0.6] },
        after: (g2) => { g2.save(); g2.translate(780, 900); g2.rotate(0.3); rr(g2, -40, -110, 80, 220, 18); g2.fillStyle = '#20222a'; g2.fill(); ink(g2, 5); g2.restore(); g2.beginPath(); g2.ellipse(760, 1000, 46, 60, 0, 0, 7); g2.fillStyle = '#f0c39e'; g2.fill(); ink(g2, 4); } });
      L.bubble(g, 540, 360, 900, ['Alô? Controle de animais?', 'Tem um cliente… diferente.'], smooth(0.15, 0.25, u), { size: 64 });
    },
    especialista(g, t, u) {
      g.save(); cam(g, 540, 1180, 1.15); loja(g, t, { portaK: 1 });
      gator(g, 380, 1460, 1.15, t, t * 0.2);
      oficial(g, lerp(1250, 860, smooth(0, 0.5, u)), 1080, 0.85, t, smooth(0.5, 0.62, u));
      g.restore();
      L.bigText(g, 'CALMA E DISTÂNCIA', 320, smooth(0.05, 0.15, u), { size: 110, col: '#2aa84a' });
    },
    fita(g, t, u) {
      g.save(); cam(g, 790, 1150, 1.2); loja(g, t, { portaK: 1 - smooth(0.8, 1, u) });
      const x = lerp(560, 1250, smooth(0.15, 0.8, u));
      gator(g, x, 1300, 1.0, t, 0);
      g.save(); g.fillStyle = '#c8ccd6'; g.fillRect(x + 190, 1250, 40, 70); g.beginPath(); g.rect(x + 190, 1250, 40, 70); ink(g, 3); g.restore();   // fita no focinho
      A.drawBack(g, x - 250, 1060, 0.6, { age: 1, rim: '#7ad870', rimK: 0.6, arms: false }); A.drawBack(g, x + 120, 1060, 0.6, { age: 1, rim: '#7ad870', rimK: 0.6, arms: false });
      g.restore();
    },
    moral(g, t, u) {
      faceShot(g, t, { bgTop: '#e8ecf2', bgBot: '#b8bcc6', light: '#ffd8a0', lightA: 0.25, zoom: 1.05 + 0.05 * u, face: { age: 1, cloth: UNIF, shirt: 'teen', tired: 0.6, smile: 0.5 * smooth(51, 52, t), look: [0, 0] } });
      L.bigText(g, 'SÓ MAIS UMA TERÇA', 300, smooth(0.15, 0.25, u), { size: 110, col: '#ffffff' });
      L.bigText(g, 'NA FLÓRIDA', 430, smooth(0.2, 0.3, u), { size: 120, col: '#ff8ad0' });
    },
    final(g, t, u) {
      g.save(); cam(g, 540, 960, 1.0); loja(g, t, { portaK: smooth(EV.rabo - 0.8, EV.rabo, t) }); balcao(g);
      caixa(g, 300, 1000, 0.75, t, { tired: 0.4, smile: 0.2 });
      if (t > EV.rabo - 0.4) { g.save(); g.beginPath(); g.rect(560, 420, 460, 830); g.clip(); gatorL(g, 1250 - 200 * smooth(EV.rabo - 0.4, 61.5, t), 1230, 1.0, t, t); g.restore(); }
      g.restore();
      tint(g, '#100c1e', smooth(61.3, 62, t), 'source-over');
    },
  };
}
export function overlay(ctx, t, L) {
  L.title(ctx, t, 'E SE UM JACARÉ ENTRASSE', 'NA SUA LOJA? (IGUAL NO GTA 6)', 3.9, '#7ad870');
  L.commentCard(ctx, t, 55.3, 59.4, 'Qual cena do trailer você', 'quer ver na vida real?', 'COMENTA E SE INSCREVE ⤵');
}
