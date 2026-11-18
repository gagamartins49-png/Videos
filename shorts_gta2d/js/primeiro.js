// ============================================================================
//  #015 — "E se você fosse o primeiro do mundo a jogar GTA 6?" (emocionante): fila da loja,
//  a primeira cópia, a multidão filmando, a corrida pra casa, a instalação, a live explodindo…
//  e o play que o mundo inteiro aperta junto (janelas da cidade acendendo).
// ============================================================================
export const DUR = 62;
export const CENAS = [
  ['gancho', 0, 4.2], ['fila', 4.2, 9.0], ['porta', 9.0, 11.2], ['copia', 11.2, 13.2], ['grito', 13.2, 17.4],
  ['corre', 17.4, 21.8], ['instala', 21.8, 26.6], ['live', 26.6, 31.2], ['chat', 31.2, 36.1], ['parado', 36.1, 41.0],
  ['chegar', 41.0, 45.8], ['play', 45.8, 47.6], ['mundo', 47.6, 55.2], ['final', 55.2, 62],
];
export const CORTES = ['play'];
export const EV = { abre: 9.5, entrega: 11.6, aperta: 47.25, cem: 27.4, mil: 28.6, cemMil: 29.8 };
export const AUDIO = {
  estilo: 'piano',
  ganhos: { piano: [[0, 0.8], [4.2, 0.5], [13.2, 0.8], [17.4, 0.6], [26.6, 0.8], [36.1, 0.5], [41, 0.9], [45.8, 0.3], [47.3, 1.0], [55.2, 0.7], [62, 0.8]], caixinha: [[0, 0], [36.1, 0], [36.6, 0.5], [45.8, 0.5], [47.3, 0.8], [55.2, 0.4], [62, 0]], cordas: [[0, 0.3], [13.2, 0.6], [17.4, 0.7], [36.1, 0.4], [41, 0.8], [47.3, 1.0], [55.2, 0.5], [62, 0.3]], batida: [[0, 0], [13.2, 0], [13.3, 0.7], [26.6, 0.7], [31.2, 0.7], [36.1, 0], [47.3, 0], [47.4, 0.8], [55.2, 0.8], [55.4, 0], [62, 0]] },
  abafado: [[0, 0], [62, 0]],
  cues: [
    [0, 'brilho', 0.3], [4.2, 'multidao', 0.3, 0, 9.0], [9.5, 'porta', 0.5], [11.6, 'brilho', 0.5], [13.2, 'aplausos', 0.7, 0, 4.2], [13.3, 'flash', 0.4], [14.4, 'flash', 0.35], [15.6, 'flash', 0.35],
    [17.4, 'chuva', 0.25, 0, 4.4], [17.4, 'coracao', 0.6, 0, 4.4], [21.9, 'bipe', 0.2], [22.6, 'instalando', 0.25, 0, 3.8], [26.7, 'ping', 0.3], [27.4, 'ping', 0.35], [28.6, 'ping', 0.4], [29.8, 'ping', 0.45],
    [31.3, 'chatPings', 0.3, 0, 4.6], [47.25, 'clique', 0.7], [47.3, 'brilho', 0.6], [47.6, 'cidade', 0.3, 0, 7.6],
  ],
};

export function scenes(L) {
  const { A, W, H, smooth, lerp, clamp, bump, hash, cam, tint, glow, faceShot, adultRoom, storeFront, drawCover6, progressScreen, liveUI, cityWindows, neonCity, sparkle, dust, bg } = L;
  const city = (g, t) => (x, y, w, h) => neonCity(g, x, y, w, h, t, { scroll: t * 60 });
  return {
    gancho(g, t, u) {
      faceShot(g, t, { zoom: 1.0 + 0.08 * u, light: '#ff5ab0', face: { age: 1, smile: 0.6, wonder: 0.8, browUp: 0.4, refl: '#ff8ad0', look: [0, 0.4] } });
      drawCover6(g, 540, 1560, 360, 470, { glow: 0.8, rot: -0.06 + 0.03 * Math.sin(t * 2) });
      tint(g, '#5a4aa8', 0.3);
    },
    fila(g, t, u) { g.save(); cam(g, lerp(380, 540, u), 1050, 1.08); storeFront(g, t, { open: 0 }); g.restore(); for (let i = 0; i < 8; i++) { const p = (t * 0.4 + i / 8) % 1; g.fillStyle = `rgba(255,255,255,${0.15 * Math.sin(p * Math.PI)})`; g.beginPath(); g.ellipse(380 + 30 * i, 1150 - 200 * p, 30 + 30 * p, 18 + 18 * p, 0, 0, 7); g.fill(); } tint(g, '#3a3a8a', 0.2); },
    porta(g, t, u) { g.save(); cam(g, 700, 1080, 1.25 + 0.15 * u); storeFront(g, t, { open: smooth(EV.abre, EV.abre + 0.9, t) }); g.restore(); },
    copia(g, t, u) {
      bg(g, '#ffe8c0', '#d8a06a'); g.save(); g.globalCompositeOperation = 'screen'; glow(g, 540, 900, 900, '#fff6e0', 0.6); g.restore();
      const k = smooth(11.2, EV.entrega, t);
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(540 + sx * 560, 2000); g.quadraticCurveTo(540 + sx * 380, 1500, 540 + sx * 250, 1050 - 100 * (1 - k) + 260 * smooth(12.2, 13.2, t)); g.strokeStyle = '#5c6472'; g.lineWidth = 90; g.lineCap = 'round'; g.stroke(); g.beginPath(); g.arc(540 + sx * 245, 1050 - 100 * (1 - k) + 260 * smooth(12.2, 13.2, t), 48, 0, 7); g.fillStyle = '#f0c39e'; g.fill(); g.lineWidth = 4.5; g.strokeStyle = A.INK; g.stroke(); }
      drawCover6(g, 540, 1000 - 100 * (1 - k) + 260 * smooth(12.2, 13.2, t), 480, 630, { glow: 0.7 + 0.3 * k, rot: 0.04 * Math.sin(t * 2) });
      for (let i = 0; i < 20; i++) { const a = hash(i) * 6.28, r = 380 + 120 * hash(i + 1); sparkle(g, 540 + Math.cos(a) * r, 1000 + Math.sin(a) * r, 10 + 18 * hash(i + 2), k * (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i)))); }
    },
    grito(g, t, u) { g.save(); cam(g, 640, 1100, 1.15 + 0.06 * Math.sin(t * 2)); storeFront(g, t, { open: 1, flashes: 1 }); g.restore(); for (let i = 0; i < 6; i++) { const ph = (t * 1.5 + i / 6) % 1; if (ph < 0.12) tint(g, '#ffffff', 0.25 * (1 - ph / 0.12), 'screen'); } },
    corre(g, t, u) {
      bg(g, '#0e0a22', '#1a1030');
      for (let i = 0; i < 40; i++) { const y = 200 + hash(i) * 1500, x = W - ((t * 1600 * (0.5 + hash(i + 1)) + hash(i + 2) * W * 2) % (W * 2)) + W * 0.5; g.fillStyle = L.rgba(['#ff5ab0', '#5ae8ff', '#ffd36a', '#ff9a7a'][i % 4], 0.5); g.beginPath(); g.ellipse(x, y, 90 + 120 * hash(i + 3), 14 + 20 * hash(i + 4), 0, 0, 7); g.fill(); }
      g.save(); g.translate(8 * Math.sin(t * 18), 14 * Math.abs(Math.sin(t * 9)));
      faceShot(g, t, { bgTop: 'rgba(0,0,0,0)', bgBot: 'rgba(0,0,0,0)', light: '#ff8ad0', lightA: 0.25, zoom: 1.05, face: { age: 1, smile: 0.7, wonder: 0.5, open: 0.3 + 0.2 * Math.abs(Math.sin(t * 9)), browUp: 0.5, look: [0.4, 0] } });
      drawCover6(g, 760, 1560, 300, 400, { glow: 0.5, rot: 0.2 + 0.05 * Math.sin(t * 9) });
      g.restore();
      g.strokeStyle = 'rgba(190,210,255,0.4)'; g.lineWidth = 2; for (let i = 0; i < 70; i++) { const sx = hash(i * 3) * W, sy = (hash(i * 7) * H + t * 1800) % H; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 10, sy + 40); g.stroke(); }
    },
    instala(g, t, u) {
      const pct = Math.min(0.99, smooth(22.4, 25.4, t));
      g.save(); cam(g, 540, 960, 1.35 + 0.25 * u); adultRoom(g, t, { hours: 0, mins: 41, light: '#9a6ad0', screen: (x, y, w, h) => progressScreen(g, x, y, w, h, t, { label: 'INSTALANDO…', pct, sub: pct >= 0.99 ? '99% … 99% … 99%' : `${Math.floor(pct * 100)}%` }) }); g.restore();
      tint(g, '#3a3a7a', 0.25);
    },
    live(g, t, u) { g.save(); cam(g, 540, 1020, 1.0); adultRoom(g, t, { hours: 0, mins: 52, light: '#ff7ab8', screen: city(g, t) }); g.restore(); tint(g, '#3a3a7a', 0.25); },
    chat(g, t, u) { faceShot(g, t, { light: '#ff7ab8', zoom: 1.0 + 0.05 * u, face: { age: 1, smile: 0.6, wonder: 0.6, refl: '#ff8ad0', look: [0.2 * Math.sin(t * 2), 0] } }); tint(g, '#5a4aa8', 0.3); },
    parado(g, t, u) { faceShot(g, t, { light: '#ff8a9a', zoom: 1.08 + 0.1 * u, face: { age: 1, smile: 0.15, wonder: 0.45, browUp: 0.5, tear: 0.3 * smooth(38.5, 40.8, t), refl: '#ffb07a' } }); tint(g, '#5a4aa8', 0.28); },
    chegar(g, t, u) { faceShot(g, t, { light: '#ffa07a', zoom: 1.18 + 0.08 * u, face: { age: 1, smile: 0.2 + 0.5 * smooth(42.5, 44.5, t), wonder: 0.45, browUp: 0.5, tear: 0.3 + 0.7 * smooth(41.2, 45.0, t), refl: '#ffb07a' } }); tint(g, '#ff8a7a', 0.12, 'soft-light'); },
    play(g, t, u) { const press = bump(EV.aperta - 0.08, EV.aperta, EV.aperta + 0.2, EV.aperta + 0.35, t); bg(g, '#5a2a5a', '#0c0814'); A.drawController(g, 540, 1000, 1.85, { press, hands: true, glow: '#ff8ab0' }); if (t > EV.aperta) tint(g, '#ffd0e0', 0.7 * Math.exp(-(t - EV.aperta) * 5), 'screen'); },
    mundo(g, t, u) {
      g.save(); cam(g, 540, lerp(1300, 1100, u), lerp(1.6, 1.0, smooth(0, 1, u)));
      cityWindows(g, t, smooth(47.6, 52.5, t));
      g.restore();
      for (let i = 0; i < 24; i++) sparkle(g, hash(i) * W, 200 + hash(i + 3) * 700, 6 + 10 * hash(i + 4), u * (0.3 + 0.5 * Math.abs(Math.sin(t * 2 + i))), '255,190,230');
    },
    final(g, t, u) {
      g.save(); cam(g, 540, 1020, 1.0 + 0.03 * u); adultRoom(g, t, { hours: 1, mins: 7, light: '#ff8ab0', screen: city(g, t), sway: Math.sin(t * 1.3) }); g.restore();
      tint(g, '#3a3a7a', 0.25); tint(g, '#100c1e', smooth(61.0, 62, t), 'source-over');
    },
  };
}
const CHAT = [['lucas_gamer', 'COMO É O MAPA??'], ['bia.rp', 'MOSTRA A PRAIA!!'], ['zé_do_corsa', 'é grande mesmo?'], ['naty', 'tô chorando aqui'], ['pedrão', 'é bonito???'], ['kauã09', 'PRIMEIRO DO MUNDO'], ['mari_vice', 'liga o rádio!!'], ['gui', 'que dia histórico']];
export function overlay(ctx, t, L, cfg) {
  L.title(ctx, t, 'E SE VOCÊ FOSSE O PRIMEIRO', 'A JOGAR GTA 6?', 3.9, '#ff8ad0');
  // manchete
  const n = L.smooth(13.6, 14.0, t) * (1 - L.smooth(17.0, 17.4, t));
  if (n > 0) { ctx.save(); ctx.globalAlpha = n; L.rr(ctx, 40, 1300, 1000, 150, 16); ctx.fillStyle = '#e8243a'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `900 40px ${L.F_UI}`; ctx.textAlign = 'left'; ctx.fillText('URGENTE', 80, 1352); ctx.font = `800 44px ${L.F_UI}`; ctx.fillText('Primeira cópia do mundo é vendida', 80, 1412); ctx.restore(); }
  // live
  if (t > 26.6 && t < 36.1) {
    const v = t < EV.cem ? 3 : t < EV.mil ? Math.round(100 + (t - EV.cem) * 400) : t < EV.cemMil ? Math.round(1000 * Math.pow(100, (t - EV.mil) / 1.2)) : Math.round(100000 + (t - EV.cemMil) * 4300);
    const chat = t > 31.2 ? CHAT.map((c, i) => [...c, t - (31.4 + i * 0.55)]).filter((c) => c[2] > 0).slice(-6).reverse() : [];
    L.liveUI(ctx, t, v, chat, L.smooth(26.7, 27.0, t) * (1 - L.smooth(35.8, 36.1, t)));
  }
  L.bigText(ctx, 'O MUNDO INTEIRO', 330, L.smooth(48.4, 48.8, t) * (1 - L.smooth(54.8, 55.2, t)), { col: '#ffffff', size: 120 });
  L.bigText(ctx, 'APERTOU JUNTO', 470, L.smooth(49.0, 49.4, t) * (1 - L.smooth(54.8, 55.2, t)), { col: '#ff8ad0', size: 120 });
  L.commentCard(ctx, t, 55.4, 59.3, 'Jogaria na hora', 'ou dormiria antes?');
}
