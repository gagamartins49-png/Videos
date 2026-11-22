// ============================================================================
//  #020 — "E se você fosse um NPC do GTA 6?" (100% 2D, humor)
//  A rotina repetida, o jogador chegando, o carro roubado com você dentro, o caos,
//  as três únicas falas, o mundo resetando… e o jogador voltando amanhã.
// ============================================================================
export const DUR = 62;
export const CENAS = [
  ['gancho', 0, 4.2], ['rotina', 4.2, 8.8], ['jogador', 8.8, 13.0], ['carro', 13.0, 17.6], ['perseguicao', 17.6, 22.2],
  ['caos', 22.2, 26.8], ['frases', 26.8, 31.4], ['reset', 31.4, 36.0], ['volta', 36.0, 40.4], ['amanha', 40.4, 44.8],
  ['resumo', 44.8, 49.6], ['oi', 49.6, 55.0], ['final', 55.0, 62],
];
export const CORTES = ['jogador', 'amanha'];
export const EV = { entrou: 9.4, rouba: 13.6, queda: 23.0, jacare: 24.6, salva: 31.8, reset: 33.2, denovo: 42.6 };
export const AUDIO = {
  estilo: 'synth',
  ganhos: { synth: [[0, 0.3], [8.8, 0.5], [13, 0.9], [31.4, 0.2], [36, 0.4], [40.4, 0.6], [44.8, 0.4], [62, 0.4]], batida: [[0, 0.3], [13, 1.0], [31.4, 0], [36, 0.4], [44.8, 0.5], [62, 0.4]], caixinha: [[0, 0.5], [8.8, 0], [36, 0.5], [40.4, 0], [49.6, 0.5], [62, 0.4]], cordas: [[0, 0.1], [62, 0.2]] },
  abafado: [[0, 0], [62, 0]],
  cues: [
    [0, 'brilho', 0.3], [4.4, 'clique', 0.2], [5.4, 'clique', 0.2], [6.4, 'clique', 0.2], [7.4, 'clique', 0.2], [9.4, 'ping', 0.5], [9.5, 'whoosh', 0.3],
    [13.6, 'porta', 0.5], [13.8, 'motor', 0.4, 0, 3.6], [14.2, 'buzina', 0.4], [17.6, 'sirene', 0.25, 0, 4.6], [17.7, 'motor', 0.3, 0, 4.4],
    [22.2, 'helice', 0.35, 0, 1.0], [23.0, 'carimbo', 0.6], [23.05, 'susto', 0.4], [24.6, 'jacare', 0.4], [27.2, 'bipe', 0.25], [28.7, 'bipe', 0.25], [30.2, 'bipe', 0.25],
    [31.8, 'instalando', 0.25, 0, 1.4], [33.2, 'chime', 0.0], [33.2, 'brilho', 0.6], [36.0, 'brilho', 0.3], [42.6, 'ping', 0.55], [42.65, 'susto', 0.4], [44.8, 'estrela', 0.3], [49.6, 'brilho', 0.3],
  ].filter((c) => c[1] !== 'chime'),
};

export function scenes(L) {
  const { A, W, H, smooth, lerp, clamp, bump, hash, rr, cam, tint, glow, faceShot, gator, bg, sparkle, neonCity, convertible, helicopterSpot, andarilho, F_TITLE, F_UI, F_MONO, F_HAND } = L;
  const ink = (g, w = 5) => { g.lineWidth = w; g.strokeStyle = A.INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };
  const NPC = { age: 1, cloth: '#e86a3a', shirt: 'teen', skin: '#e2a878', hairCol: '#3a2418' };
  function etiquetaNPC(g, x, y, k = 1) { if (k <= 0) return; g.save(); g.globalAlpha = k; rr(g, x - 150, y - 34, 300, 68, 14); g.fillStyle = 'rgba(10,10,20,0.75)'; g.fill(); g.strokeStyle = '#7ad870'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#7ad870'; g.font = `800 34px ${F_MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NPC #4821', x, y + 2); g.restore(); }
  function rua(g, t, scroll = 0, noite = 0) { neonCity(g, -200, 0, W + 400, H, t, { night: noite, scroll }); }
  function casa(g, x, y, s, dano = 0) {
    g.save(); g.translate(x, y); g.scale(s, s);
    rr(g, -260, -300, 520, 300, 8); g.fillStyle = '#f2e2c4'; g.fill(); ink(g, 5);
    g.beginPath(); g.moveTo(-300, -300); g.lineTo(0, -480); g.lineTo(300, -300); g.closePath(); g.fillStyle = '#c84a3a'; g.fill(); ink(g, 5);
    rr(g, -60, -170, 120, 170, 6); g.fillStyle = '#7a5a3a'; g.fill(); ink(g, 4);
    for (const sx of [-1, 1]) { rr(g, sx * 170 - 50, -230, 100, 80, 6); g.fillStyle = '#9ad8f0'; g.fill(); ink(g, 4); }
    if (dano > 0) { g.globalAlpha = dano; g.strokeStyle = '#2a1a16'; g.lineWidth = 6; g.beginPath(); g.moveTo(-200, -300); g.lineTo(-120, -200); g.lineTo(-160, -120); g.moveTo(150, -300); g.lineTo(90, -220); g.lineTo(140, -150); g.stroke(); g.fillStyle = 'rgba(40,30,30,0.4)'; g.beginPath(); g.ellipse(80, -320, 120, 60, 0, 0, 7); g.fill(); }
    g.restore();
  }
  function hudJogo(g, t, k) {   // interface "de jogo" genérica
    if (k <= 0) return;
    g.save(); g.globalAlpha = k;
    g.beginPath(); g.arc(150, 330, 110, 0, 7); g.fillStyle = 'rgba(10,20,30,0.7)'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke();
    g.save(); g.beginPath(); g.arc(150, 330, 105, 0, 7); g.clip(); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 10; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(40 + i * 60, 220); g.lineTo(60 + i * 50, 440); g.stroke(); } g.restore();
    g.fillStyle = '#ffd36a'; g.beginPath(); g.moveTo(150, 310); g.lineTo(165, 350); g.lineTo(135, 350); g.closePath(); g.fill();
    g.restore();
  }
  return {
    gancho(g, t, u) { faceShot(g, t, { bgTop: '#ffd0b0', bgBot: '#ff9a8a', light: '#ffffff', lightA: 0.2, face: { ...NPC, look: [0, 0], blink: bump(2.0, 2.05, 2.1, 2.2, t) } }); etiquetaNPC(g, 540, 560, smooth(0.3, 0.6, t)); },
    rotina(g, t, u) {
      g.save(); cam(g, 540, 1000, 1.0); rua(g, t, 0); g.restore();
      const ciclo = (t - 4.2) % 2.3, x = 300 + 300 * Math.min(1, ciclo / 1.6);
      andarilho(g, x, 1450, 0.85, t, { camisa: '#e86a3a', mochila: false, passo: ciclo < 1.6 ? 1 : 0 });
      if (ciclo > 1.6) { L.bigText(g, '...', 1050, 1, { size: 120, col: '#ffffff' }); }
      etiquetaNPC(g, x + 10, 960);
      g.save(); g.fillStyle = 'rgba(0,0,0,0.6)'; rr(g, 60, 140, 300, 70, 14); g.fill(); g.fillStyle = '#fff'; g.font = `800 34px ${F_MONO}`; g.fillText(`LOOP ${1 + Math.floor((t - 4.2) / 2.3)}/∞`, 90, 186); g.restore();
    },
    jogador(g, t, u) {
      g.save(); cam(g, 540, 1000, 1.0); rua(g, t, 0); g.restore();
      andarilho(g, 480, 1450, 0.85, t, { camisa: '#e86a3a', mochila: false, passo: 0 });
      const k = smooth(EV.entrou, EV.entrou + 0.3, t);
      g.save(); g.globalAlpha = k; rr(g, 140, 300 - 60 * (1 - k), 800, 150, 24); g.fillStyle = 'rgba(10,10,20,0.85)'; g.fill(); g.strokeStyle = '#ff5ab0'; g.lineWidth = 5; g.stroke(); g.fillStyle = '#fff'; g.font = `400 72px ${F_TITLE}`; g.textAlign = 'center'; g.fillText('JOGADOR ENTROU', 540, 400 - 60 * (1 - k)); g.restore();
      hudJogo(g, t, k);
      if (t > EV.entrou + 0.4) L.bigText(g, '3... 2... 1...', 1000, smooth(EV.entrou + 0.4, EV.entrou + 0.6, t), { size: 100, col: '#ffd36a' });
    },
    carro(g, t, u) {
      g.save(); cam(g, 540, 1080, 1.1); rua(g, t, Math.max(0, t - EV.rouba) * 900);
      const go = smooth(EV.rouba, EV.rouba + 0.4, t);
      convertible(g, 560 + 30 * Math.sin(t * 20) * go, 1360, 1.0, t, { driver: true, speed: go, col: '#5ae8ff' });
      g.save(); g.beginPath(); g.rect(-500, -500, 2500, 1790); g.clip(); g.translate(330, 1130); A.drawFront(g, 0, 0, 0.42, { ...NPC, open: 0.8 * go, browUp: go, wonder: 0.3 }); g.restore();
      g.restore();
      hudJogo(g, t, 1);
      L.bigText(g, 'COM VOCÊ DENTRO', 380, smooth(EV.rouba + 0.6, EV.rouba + 0.9, t), { size: 110, col: '#ff5ab0' });
    },
    perseguicao(g, t, u) {
      g.save(); cam(g, 540, 1060, 1.12); rua(g, t, 4000 + (t - 17.6) * 1100, 0.6);
      convertible(g, 640 + 20 * Math.sin(t * 17), 1360, 0.95, t, { driver: true, speed: 1, col: '#5ae8ff' });
      g.save(); g.beginPath(); g.rect(-500, -500, 2500, 1790); g.clip(); g.translate(400, 1150); A.drawFront(g, 0, 0, 0.4, { ...NPC, open: 0.6, browUp: 1 }); g.restore();
      for (let i = 0; i < 2; i++) { const x = 60 - i * 260 + 40 * Math.sin(t * 3 + i); g.save(); g.translate(x, 1400); rr(g, -160, -70, 320, 90, 20); g.fillStyle = '#20263a'; g.fill(); ink(g, 4); g.fillStyle = '#f4f4f0'; g.fillRect(-160, -40, 320, 20); g.fillStyle = Math.sin(t * 14 + i) > 0 ? '#ff3a3a' : '#3a6aff'; g.fillRect(-40, -90, 80, 22); g.restore(); }
      g.restore();
      tint(g, Math.sin(t * 10) > 0 ? '#ff2a3a' : '#2a5aff', 0.12, 'screen'); L.wantedStars(g, 540, 300, 3, 1, t, 0.9);
    },
    caos(g, t, u) {
      bg(g, '#8ac8f0', '#d8f0ff'); g.fillStyle = '#7ad870'; g.fillRect(0, 1250, W, 700); g.fillStyle = '#c8c8c8'; g.fillRect(0, 1500, W, 200);
      const q = smooth(22.2, EV.queda, t);
      casa(g, 540, 1260, 1.2, smooth(EV.queda, EV.queda + 0.3, t));
      if (t < EV.queda + 0.1) helicopterSpot(g, lerp(1200, 600, q), lerp(200, 1000, q * q), 1.2, t);
      else { for (let i = 0; i < 12; i++) { const a = hash(i) * 6.28, r = (t - EV.queda) * 400 * (0.5 + hash(i + 1)); g.fillStyle = `rgba(80,70,70,${Math.max(0, 0.7 - (t - EV.queda) * 0.3)})`; g.beginPath(); g.arc(640 + Math.cos(a) * r, 1000 + Math.sin(a) * r * 0.5 - (t - EV.queda) * 80, 40 + 30 * hash(i + 2), 0, 7); g.fill(); } }
      if (t > EV.jacare - 0.2) gator(g, lerp(-300, 1300, smooth(EV.jacare - 0.2, 26.8, t)), 1600, 0.75, t, t);
      if (t > EV.queda && t < EV.queda + 0.15) tint(g, '#ffffff', 0.6, 'screen');
      L.bigText(g, 'NO SEU QUINTAL.', 300, smooth(EV.queda + 0.2, EV.queda + 0.5, t), { size: 120, col: '#ffffff' });
    },
    frases(g, t, u) {
      faceShot(g, t, { bgTop: '#ffd0b0', bgBot: '#ff9a8a', light: '#ffffff', lightA: 0.2, face: { ...NPC, open: 0.4 * Math.abs(Math.sin(t * 9)), browUp: 0.6, look: [0, 0] } });
      const falas = ['EI!', 'CUIDADO!', 'QUE DIA LINDO!'], i = Math.min(2, Math.floor((t - 26.8) / 1.5));
      L.bubble(g, 540, 380, 760, [falas[i]], 1 - 0.3 * ((t - 26.8) % 1.5 > 1.3), { size: 96 });
      g.save(); g.fillStyle = 'rgba(0,0,0,0.6)'; rr(g, 280, 560, 520, 70, 14); g.fill(); g.fillStyle = '#7ad870'; g.font = `800 32px ${F_MONO}`; g.textAlign = 'center'; g.fillText(`FALA ${i + 1} DE 3`, 540, 606); g.restore();
    },
    reset(g, t, u) {
      bg(g, '#0a0a14', '#14142a');
      const k = smooth(31.8, EV.reset, t);
      g.save(); g.translate(540, 820); g.rotate(t * 6); for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.fillStyle = `rgba(255,255,255,${0.2 + i * 0.1})`; g.beginPath(); g.arc(80, 0, 16, 0, 7); g.fill(); } g.restore();
      g.fillStyle = '#fff'; g.font = `400 80px ${F_TITLE}`; g.textAlign = 'center'; g.fillText(t < EV.reset ? 'SALVANDO…' : 'MUNDO RESETADO', 540, 1060);
      if (t > EV.reset) { const r = smooth(EV.reset, 35.5, t); g.save(); g.globalAlpha = r; casa(g, 540, 1600, 0.8, 0); g.restore(); for (let i = 0; i < 20; i++) sparkle(g, 200 + hash(i) * 680, 1200 + hash(i + 2) * 450, 12, (1 - r) * 0.9 + 0.1); }
    },
    volta(g, t, u) {
      bg(g, '#8ac8f0', '#d8f0ff'); g.fillStyle = '#7ad870'; g.fillRect(0, 1250, W, 700);
      casa(g, 380, 1260, 0.9, 0);
      convertible(g, 820, 1360, 0.6, t, { driver: false, col: '#5ae8ff' });
      g.save(); g.translate(540, 820); A.drawFront(g, 0, 0, 0.8, { ...NPC, smile: 0.8 }); g.restore();
      for (let i = 0; i < 10; i++) sparkle(g, hash(i) * W, 300 + hash(i + 2) * 900, 14, 0.4 + 0.5 * Math.abs(Math.sin(t * 3 + i)));
      L.bigText(g, 'COMO SE NADA', 260, smooth(36.1, 36.4, t), { size: 110, col: '#ffffff' }); L.bigText(g, 'TIVESSE ACONTECIDO', 390, smooth(36.3, 36.6, t), { size: 96, col: '#ffd36a' });
    },
    amanha(g, t, u) {
      faceShot(g, t, { bgTop: '#ffd0b0', bgBot: '#ff9a8a', light: '#ffffff', lightA: 0.2, face: { ...NPC, smile: t < EV.denovo ? 0.5 : 0, open: t > EV.denovo ? 0.8 : 0, browUp: t > EV.denovo ? 1 : 0, look: [0, -0.2] } });
      const k = smooth(EV.denovo, EV.denovo + 0.25, t);
      g.save(); g.globalAlpha = k; rr(g, 140, 260 - 60 * (1 - k), 800, 150, 24); g.fillStyle = 'rgba(10,10,20,0.85)'; g.fill(); g.strokeStyle = '#ff5ab0'; g.lineWidth = 5; g.stroke(); g.fillStyle = '#fff'; g.font = `400 72px ${F_TITLE}`; g.textAlign = 'center'; g.fillText('JOGADOR ENTROU', 540, 360 - 60 * (1 - k)); g.restore();
      if (t > EV.denovo) tint(g, '#ff2030', 0.12 * Math.exp(-(t - EV.denovo) * 2), 'screen');
    },
    resumo(g, t, u) {
      bg(g, '#1a1030', '#0a0614');
      g.save(); g.translate(540, 980); const s = 0.85 + 0.15 * smooth(0, 0.15, u); g.scale(s, s);
      rr(g, -440, -480, 880, 960, 40); g.fillStyle = 'rgba(250,244,232,0.97)'; g.fill(); ink(g, 6);
      g.fillStyle = '#2a1a16'; g.textAlign = 'center'; g.font = `400 76px ${F_TITLE}`; g.fillText('VIDA DE NPC', 0, -360);
      const rows = [['ESCOLHAS', '0', '#e8343a'], ['EXPLOSÕES', '1.000+', '#ff8a3a'], ['CARROS ROUBADOS', '∞', '#ff5ab0'], ['AGRADECIMENTOS', '0', '#e8343a']];
      rows.forEach(([n, v, c], i) => { const k = smooth(0.12 + i * 0.15, 0.22 + i * 0.15, u); g.globalAlpha = k; g.font = `900 44px ${F_UI}`; g.fillStyle = '#2a1a16'; g.textAlign = 'left'; g.fillText(n, -380, -190 + i * 170); g.textAlign = 'right'; g.font = `400 84px ${F_TITLE}`; g.fillStyle = c; g.fillText(v, 380, -180 + i * 170); g.globalAlpha = 1; });
      g.restore();
    },
    oi(g, t, u) {
      faceShot(g, t, { bgTop: '#ffe0b0', bgBot: '#ffb07a', light: '#ffffff', lightA: 0.25, face: { ...NPC, smile: 0.9, look: [0, 0] },
        after: (g2) => { const a = 0.4 * Math.sin(t * 8); g2.save(); g2.translate(860, 1150); g2.rotate(a); g2.beginPath(); g2.ellipse(0, -60, 60, 80, 0, 0, 7); g2.fillStyle = '#e2a878'; g2.fill(); ink(g2, 5); for (let k = 0; k < 4; k++) { rr(g2, -50 + k * 26, -190, 22, 90, 11); g2.fillStyle = '#e2a878'; g2.fill(); ink(g2, 3); } g2.restore(); } });
      L.bubble(g, 540, 380, 560, ['OI! :)'], smooth(50.6, 50.9, t), { size: 110 });
      etiquetaNPC(g, 540, 600);
    },
    final(g, t, u) {
      g.save(); cam(g, 540, 1000, 1.0); rua(g, t, 0); g.restore();
      andarilho(g, 300 + 300 * Math.min(1, ((t - 55) % 2.3) / 1.6), 1450, 0.85, t, { camisa: '#e86a3a', mochila: false });
      tint(g, '#000000', 0.2);
    },
  };
}
export function overlay(ctx, t, L) {
  L.title(ctx, t, 'E SE VOCÊ FOSSE', 'UM NPC DO GTA 6?', 3.9, '#7ad870');
  L.commentCard(ctx, t, 55.2, 59.4, 'Qual a pior coisa que você', 'já fez com um NPC?', 'COMENTA E SE INSCREVE ⤵');
}
