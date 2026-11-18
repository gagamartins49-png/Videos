// ============================================================================
//  #014 — "E se você acordasse dentro do GTA 6?" (aventura): dorme jogando, acorda numa
//  praia rosa com um flamingo te encarando, pega um conversível, um jacaré atravessa a rua,
//  vê a cidade do alto, cinco estrelas, helicóptero… e acorda no sofá. Ou não?
// ============================================================================
export const DUR = 62;
export const CENAS = [
  ['gancho', 0, 4.2], ['sofa', 4.2, 9.0], ['acorda', 9.0, 12.6], ['praia', 12.6, 17.6], ['sonho', 17.6, 21.6],
  ['carro', 21.6, 26.8], ['dirige', 26.8, 32.2], ['jacare', 32.2, 36.8], ['topo', 36.8, 41.8], ['estrelas', 41.8, 46.6],
  ['heli', 46.6, 51.2], ['volta', 51.2, 55.2], ['final', 55.2, 62],
];
export const CORTES = ['volta'];
export const EV = { suga: 8.2, abreOlho: 10.0, entra: 25.2, freia: 33.0, estrelas: [42.3, 42.7, 43.1, 43.5, 43.9], heli: 46.8, acorda: 51.2, flamingoJanela: 59.6 };
export const AUDIO = {
  estilo: 'synth',
  ganhos: { piano: [[0, 0.6], [9, 0.6], [9.2, 0], [51.2, 0], [51.4, 0.6], [62, 0.6]], synth: [[0, 0], [8.6, 0], [9.6, 0.5], [21.6, 0.7], [26.8, 1], [41.8, 1], [42, 0.4], [51.2, 0.4], [51.3, 0], [62, 0]], batida: [[0, 0], [21.6, 0], [26.8, 1], [32.3, 1], [32.5, 0.3], [36.8, 0.6], [41.8, 1], [51.2, 1], [51.3, 0], [62, 0]], cordas: [[0, 0.2], [36.8, 0.5], [41.6, 0.7], [51.2, 0.2], [62, 0.2]] },
  abafado: [[0, 1], [8.9, 1], [9.4, 0], [51.2, 0], [51.3, 1], [62, 1]],
  cues: [
    [0, 'chuva', 0.12, 0, 9.0], [8.2, 'sugar', 0.6], [9.0, 'mar', 0.35, 0, 12.6], [9.4, 'gaivota', 0.3], [13.5, 'gaivota', 0.25], [15.2, 'flamingo', 0.4],
    [21.6, 'chaves', 0.4], [25.2, 'porta', 0.5], [25.6, 'motor', 0.5, 0, 1.5], [26.8, 'motor', 0.22, 0, 5.4], [26.9, 'whoosh', 0.3],
    [32.9, 'freio', 0.6], [33.4, 'jacare', 0.5], [36.8, 'vento', 0.3, 0, 5.0], [42.3, 'estrela', 0.4], [42.7, 'estrela', 0.42], [43.1, 'estrela', 0.44], [43.5, 'estrela', 0.46], [43.9, 'estrela', 0.5],
    [44.0, 'sirene', 0.18, 0, 7.2], [46.6, 'helice', 0.3, 0, 4.6], [51.2, 'susto', 0.7], [51.3, 'chuva', 0.12, 0, 10.7], [59.6, 'flamingo', 0.45],
  ],
};

export function scenes(L) {
  const { A, W, H, smooth, lerp, clamp, bump, hash, cam, tint, glow, faceShot, adultRoom, neonCity, beach, flamingo, gator, convertible, helicopterSpot, wantedStars, sparkle, dust, bg } = L;
  const city = (g, t, o = {}) => (x, y, w, h) => neonCity(g, x, y, w, h, t, o);
  const sirens = (g, t, k) => { if (k <= 0) return; tint(g, Math.sin(t * 10) > 0 ? '#ff2a3a' : '#2a5aff', 0.22 * k, 'screen'); };
  return {
    gancho(g, t, u) { faceShot(g, t, { zoom: 1.05 + 0.08 * u, light: '#ff5ab0', face: { age: 1, blink: 1, smile: 0.25, tired: 0 } }); tint(g, '#5a4aa8', 0.35); for (let i = 0; i < 16; i++) sparkle(g, 200 + hash(i) * 680, 1500 - ((t * 140 + hash(i + 1) * 900) % 1100), 8 + 10 * hash(i + 2), 0.6, '255,180,230'); },
    sofa(g, t, u) {
      const z = 1 + 2.2 * smooth(EV.suga, 9.0, t) ** 2;
      g.save(); cam(g, 540, lerp(1040, 930, smooth(EV.suga, 9, t)), z); adultRoom(g, t, { sleep: true, hours: 3, mins: 12, light: '#ff7ab8', screen: city(g, t, { scroll: t * 60 }) }); g.restore();
      tint(g, '#3a3a7a', 0.25 * (1 - smooth(EV.suga, 9, t)));
      if (t > EV.suga) { for (let i = 0; i < 26; i++) sparkle(g, 540 + Math.cos(i) * (600 - 600 * u), 930 + Math.sin(i * 1.7) * (600 - 600 * u), 10 + 10 * hash(i), smooth(EV.suga, 8.6, t), '255,200,240'); tint(g, '#ffd0f0', smooth(8.6, 9.0, t) * 0.8, 'screen'); }
    },
    acorda(g, t, u) {
      faceShot(g, t, { bgTop: '#ff9ac8', bgBot: '#ffd0a0', light: '#fff0c0', lightA: 0.5, face: { age: 1, blink: 1 - smooth(EV.abreOlho, EV.abreOlho + 0.5, t), wonder: smooth(10.4, 11.2, t) * 0.6, browUp: smooth(10.3, 11, t) * 0.7, look: [0.3 * Math.sin(t * 2), -0.2] }, zoom: 1.12 });
      tint(g, '#ffb090', 0.12, 'soft-light'); if (t < 9.4) tint(g, '#ffffff', 1 - smooth(9.0, 9.4, t), 'source-over');
    },
    praia(g, t, u) {
      g.save(); cam(g, 540, 960, 1.0 + 0.06 * u); beach(g, t);
      A.drawBack(g, 300, 1700, 0.9, { age: 1, rim: '#fff0d0', rimK: 0.6, arms: false });
      flamingo(g, 790, 1560 + 4 * Math.sin(t * 2), 1.45, t, 0.4 + 0.3 * Math.sin(t * 0.8));
      g.restore();
      if (t > 15.0) { const k = smooth(15.0, 15.3, t) * (1 - smooth(17.0, 17.4, t)); L.bigText(g, '?', 900, k, { size: 200, col: '#ffffff' }); }
      tint(g, '#ff9ac8', 0.08, 'soft-light');
    },
    sonho(g, t, u) {
      faceShot(g, t, { bgTop: '#ff9ac8', bgBot: '#ffb07a', light: '#fff0c0', lightA: 0.5, zoom: 1.05 + 0.08 * u, face: { age: 1, smile: 0.4 + 0.5 * smooth(18.6, 20, t), wonder: 0.7, browUp: 0.4, look: [0, -0.3] } });
      for (let i = 0; i < 20; i++) sparkle(g, hash(i) * W, 300 + hash(i + 2) * 1300, 8 + 12 * hash(i + 3), 0.4 + 0.5 * Math.abs(Math.sin(t * 3 + i)));
      tint(g, '#ffb090', 0.1, 'soft-light');
    },
    carro(g, t, u) {
      g.save(); cam(g, lerp(500, 600, u), 1100, 1.15 + 0.15 * u);
      neonCity(g, -200, 0, W + 400, H * 1.05, t, { scroll: 0 });
      const inCar = t > EV.entra;
      convertible(g, 600, 1360, 1.0, t, { driver: inCar });
      if (!inCar) { A.drawBack(g, lerp(150, 520, smooth(23.5, EV.entra, t)), 1500, 0.75, { age: 1, rim: '#ffd0e0', rimK: 0.7, arms: false }); sparkle(g, 700, 1320, 22, 0.5 + 0.5 * Math.abs(Math.sin(t * 5))); }
      g.restore();
    },
    dirige(g, t, u) {
      const sp = 1;
      g.save(); cam(g, 540, 1060, 1.12);
      neonCity(g, -200, 0, W + 400, H * 1.05, t, { scroll: (t - 26.8) * 700 });
      convertible(g, 560 + 10 * Math.sin(t * 3), 1360 + 4 * Math.sin(t * 17), 1.0, t, { driver: true, speed: sp });
      for (let i = 0; i < 5; i++) { const y = 1100 + i * 50, x = ((t * 1400 + i * 300) % 1600) - 300; g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 4; g.beginPath(); g.moveTo(W - x, y); g.lineTo(W - x + 220, y); g.stroke(); }
      for (let i = 0; i < 6; i++) { const ph = (t * 0.8 + i / 6) % 1; g.save(); g.globalAlpha = Math.sin(ph * Math.PI); g.font = `700 70px ${L.F_HAND}`; g.fillStyle = ['#ff8ad0', '#5ae8ff', '#ffd36a'][i % 3]; g.fillText(i % 2 ? '♪' : '♫', 520 + 140 * Math.sin(i * 2 + ph * 3), 1150 - ph * 500); g.restore(); }
      g.restore(); tint(g, '#ff8ab0', 0.08, 'soft-light');
    },
    jacare(g, t, u) {
      const stop = smooth(32.2, EV.freia, t);
      g.save(); cam(g, 540, 1180, 1.25);
      neonCity(g, -200, 0, W + 400, H * 1.05, t, { scroll: (32.2 - 26.8) * 700 + 700 * (EV.freia - 32.2) * smooth(32.2, EV.freia, t) * 0.5 });
      convertible(g, 300, 1380 + 6 * (1 - stop) * Math.sin(t * 17), 0.85, t, { driver: true, speed: 1 - stop });
      const gx = lerp(1050, -150, smooth(33.1, 36.6, t));
      gator(g, gx, 1560, 1.15, t, t);
      g.restore();
      if (t > 33.0) L.bigText(g, '!', 650, smooth(33.0, 33.2, t) * (1 - smooth(34.4, 34.8, t)), { size: 220, col: '#ffd36a' });
    },
    topo(g, t, u) {
      g.save(); cam(g, 540, 960, 1.0 + 0.05 * u);
      neonCity(g, -100, 0, W + 200, H, t, { night: 0.35 + 0.2 * u, road: false, scroll: 40 * t });
      g.fillStyle = '#120a1a'; g.fillRect(-100, 1450, W + 200, 600); g.fillRect(-100, 1440, W + 200, 14);
      for (let i = 0; i < 6; i++) { g.fillStyle = '#1a1024'; g.fillRect(80 + i * 170, 1380, 18, 70); }
      A.drawBack(g, 540, 1420, 0.85, { age: 1, rim: '#ff9ad0', rimK: 1, arms: false, sway: Math.sin(t * 1.2) });
      g.restore(); dust(g, t, 30, '#ffd0f0');
    },
    estrelas(g, t, u) {
      g.save(); cam(g, 540, 960, 1.05);
      neonCity(g, -100, 0, W + 200, H, t, { night: 0.6 + 0.4 * u, road: false, scroll: 40 * t });
      g.fillStyle = '#120a1a'; g.fillRect(-100, 1450, W + 200, 600);
      A.drawBack(g, 540, 1420, 0.85, { age: 1, rim: Math.sin(t * 10) > 0 ? '#ff4a5a' : '#5a7aff', rimK: 1, arms: false });
      g.restore();
      sirens(g, t, smooth(44, 45, t));
      const n = EV.estrelas.filter((a) => t >= a).length;
      wantedStars(g, 540, 560, n, smooth(42.2, 42.5, t), t, 1.1);
    },
    heli(g, t, u) {
      g.save(); cam(g, 540, 1000, 1.08 + 0.06 * Math.sin(t * 2)); g.translate(Math.sin(t * 31) * 4, Math.cos(t * 27) * 4);
      neonCity(g, -100, 0, W + 200, H, t, { night: 1, road: false, scroll: 40 * t, sun: false });
      g.fillStyle = '#120a1a'; g.fillRect(-100, 1450, W + 200, 600);
      helicopterSpot(g, 300 + 160 * Math.sin(t * 0.7), 420 + 30 * Math.sin(t * 1.3), 1.4, t, [540, 1330]);
      A.drawBack(g, 540, 1420, 0.85, { age: 1, rim: '#fffff0', rimK: 1.4, arms: false });
      g.restore();
      sirens(g, t, 1); wantedStars(g, 540, 560, 5, 1, t, 1.1);
    },
    volta(g, t, u) {
      faceShot(g, t, { light: '#ff5ab0', zoom: 1.1, face: { age: 1, wonder: 0.5 * (1 - u), open: 0.7 * (1 - smooth(52.3, 53.3, t)), browUp: 1 - 0.6 * u, look: [0.6 * Math.sin(t * 3) * (1 - u), 0] } });
      tint(g, '#5a4aa8', 0.35); tint(g, '#ffffff', 1 - smooth(51.2, 51.5, t), 'screen');
    },
    final(g, t, u) {
      g.save(); cam(g, 540, 1020, 1.0 + 0.04 * u);
      adultRoom(g, t, { hours: 3, mins: 14, light: '#ff7ab8', screen: city(g, t, { scroll: t * 60 }) });
      const k = smooth(EV.flamingoJanela - 0.6, EV.flamingoJanela, t);
      if (k > 0) { g.save(); g.beginPath(); g.rect(40, 260, 270, 520); g.clip(); flamingo(g, 175, 900 - 260 * k, 0.9, t, 0.6); g.restore(); }
      g.restore();
      tint(g, '#3a3a7a', 0.28); tint(g, '#100c1e', smooth(61.0, 62, t), 'source-over');
    },
  };
}
export function overlay(ctx, t, L, cfg) {
  L.title(ctx, t, 'E SE VOCÊ ACORDASSE', 'DENTRO DO GTA 6?', 3.9, '#ff8ad0');
  L.bigText(ctx, 'PROCURADO', 760, L.smooth(44.0, 44.3, t) * (1 - L.smooth(46.2, 46.6, t)), { col: '#ff4a5a', size: 140 });
  L.commentCard(ctx, t, 55.4, 59.3, 'O que você faria', 'primeiro lá dentro?');
}
