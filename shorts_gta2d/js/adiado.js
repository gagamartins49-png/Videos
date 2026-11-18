// ============================================================================
//  #013 — "E se o GTA 6 fosse adiado de novo?" (humor): o adulto espera, adiam, adiam de
//  novo… a barba cresce, o cabelo fica branco, o neto pergunta o que é GTA, e quando
//  finalmente dá play… atualização de 150 GB.
// ============================================================================
export const DUR = 62;
export const CENAS = [
  ['gancho', 0, 4.2], ['sala', 4.2, 8.8], ['contagem', 8.8, 12.2], ['carimbo', 12.2, 13.8], ['choque', 13.8, 15.5],
  ['espera', 15.5, 20.6], ['deNovo', 20.6, 25.8], ['velho', 25.8, 28.6], ['museu', 28.6, 31.2], ['neto', 31.2, 36.0],
  ['resposta', 36.0, 41.6], ['acende', 41.6, 45.8], ['aperta', 45.8, 50.6], ['update', 50.6, 52.8], ['cara', 52.8, 55.2], ['final', 55.2, 62],
];
export const EV = { bipes: [8.9, 9.9, 10.9], adiado: 12.25, adiados: [21.2, 22.6, 23.9, 25.0], tvAcende: 43.8, aperta: 49.6, update: 50.7, piscada: 53.6, ultimo: 59.6 };
export const AUDIO = {
  estilo: 'piano',
  ganhos: { piano: [[0, 0.9], [12.2, 0.9], [12.3, 0], [15.5, 0.6], [41.6, 0.4], [45.8, 0.7], [50.6, 0], [55.2, 0.6], [62, 0.6]], caixinha: [[0, 0], [25.8, 0], [26.5, 0.6], [41.5, 0.6], [42, 0], [62, 0]], cordas: [[0, 0.2], [36, 0.3], [41.6, 0.6], [49.6, 1.0], [50.6, 0], [62, 0]], batida: [[0, 0], [4.2, 0.5], [12.2, 0.5], [12.3, 0], [62, 0]] },
  abafado: [[0, 1], [62, 1]],
  cues: [
    [0.0, 'brilho', 0.3], [4.2, 'chuva', 0.15, 0, 8.0], [8.9, 'bipe', 0.3], [9.9, 'bipe', 0.3], [10.9, 'bipe', 0.3],
    [12.25, 'carimbo', 0.8], [12.3, 'fracasso', 0.6], [13.8, 'whoosh', 0.3],
    [15.6, 'relogioRapido', 0.25, 0, 5.0], [21.2, 'carimbo', 0.5], [22.6, 'carimbo', 0.5], [23.9, 'carimbo', 0.55], [25.0, 'carimbo', 0.6],
    [20.6, 'vento', 0.12, 0, 11.0], [28.6, 'brilho', 0.25], [31.4, 'crianca', 0.25], [36.1, 'whoosh', 0.2],
    [41.6, 'chuva', 0.12, 0, 4.0], [43.8, 'ligaTv', 0.6], [45.8, 'tremor', 0.2, 0, 3.8], [49.6, 'clique', 0.7], [49.65, 'brilho', 0.5],
    [50.7, 'erro', 0.5], [53.6, 'grilo', 0.4], [55.2, 'chuva', 0.15, 0, 6.8], [59.6, 'carimbo', 0.7], [59.7, 'fracasso', 0.35],
  ],
};

export function scenes(L) {
  const { A, W, H, smooth, lerp, clamp, bump, hash, cam, tint, glow, faceShot, adultRoom, stamp, calendar, museum, progressScreen, sparkle, dust } = L;
  const neon = (g, t, o) => (x, y, w, h) => A.drawNeonScreen(g, x, y, w, h, t, o);
  const adiadoScreen = (g, t, year, k) => (x, y, w, h) => { A.drawNeonScreen(g, x, y, w, h, t, { mode: 'count', secs: 0 }); g.save(); g.fillStyle = 'rgba(30,0,10,0.5)'; g.fillRect(x, y, w, h); g.restore(); stamp(g, x + w / 2, y + h * 0.52, 'ADIADO', k); g.save(); g.font = `400 ${h * 0.16}px ${L.F_TITLE}`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.globalAlpha = k; g.fillText(`PARA ${year}`, x + w / 2, y + h * 0.88); g.restore(); };
  // barba e envelhecimento ao longo do vídeo
  const beardAt = (t) => 0.12 * smooth(15.6, 20.4, t) + 0.88 * smooth(20.8, 26, t);
  const grayAt = (t) => smooth(25.9, 28.4, t);
  const oldFace = (t, extra = {}) => ({ age: 1, beard: Math.min(0.75, beardAt(t)), gray: grayAt(t), wrinkles: grayAt(t), glasses: t > 27.2, tired: 0.3, ...extra });
  return {
    gancho(g, t, u) { faceShot(g, t, { zoom: 1 + 0.1 * u, light: '#ff5ab0', face: { age: 1, smile: 0.7, wonder: 0.7, refl: '#ff6ab0', look: [0, -0.1] } }); tint(g, '#5a4aa8', 0.35); },
    sala(g, t, u) { g.save(); cam(g, 540, 1010, 1.0 + 0.05 * u); adultRoom(g, t, { pizza: true, hours: 23, mins: 59, screen: neon(g, t, { mode: 'count', secs: 12 - t + 4 }) }); g.restore(); tint(g, '#3a3a7a', 0.28); },
    contagem(g, t, u) { const secs = Math.max(0, Math.ceil(11.95 - t)); g.save(); cam(g, 540, 930, 1.4 + 0.7 * u); adultRoom(g, t, { pizza: true, mins: 59, screen: neon(g, t, { mode: 'count', secs }) }); g.restore(); tint(g, '#3a3a7a', 0.15); },
    carimbo(g, t, u) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); A.drawFlatTV(g, 30, 640, 1020, 600, adiadoScreen(g, t, 2027, smooth(EV.adiado, EV.adiado + 0.25, t))); const sh = Math.exp(-(t - EV.adiado) * 6) * 14; g.translate(0, 0); if (sh > 0.5) tint(g, '#ff2030', 0.15 * sh / 14, 'screen'); },
    choque(g, t, u) { faceShot(g, t, { zoom: 1.08 + 0.05 * u, light: '#ff3a4a', face: { age: 1, open: 0.9, browUp: 1, wonder: 0.15, look: [0, 0] } }); tint(g, '#5a3a6a', 0.3); },
    espera(g, t, u) {
      faceShot(g, t, { light: '#6a4ab0', face: { age: 1, beard: beardAt(t), tired: 0.55, browUp: 0.2, smile: 0.1 } }); tint(g, '#4a4a9a', 0.35);
      const meses = ['JAN', 'MAR', 'MAI', 'JUL', 'SET', 'NOV']; const k = Math.floor(u * 12);
      for (let i = 0; i < 3; i++) { const p = (u * 6 + i / 3) % 1; L.calendar(g, 140 + 800 * p, 380 - 160 * Math.sin(p * Math.PI), 0.45, meses[(k + i) % 6], '2027', -0.6 + 1.2 * p); }
    },
    deNovo(g, t, u) {
      const idx = EV.adiados.filter((a) => t >= a).length, year = 2028 + idx;
      g.save(); cam(g, 540, 1080, 1.0); adultRoom(g, t, { webs: smooth(21, 25.5, t), plant: 0.3 + 0.7 * u, mins: 0, clock: true, screen: adiadoScreen(g, t, year, idx ? smooth(EV.adiados[idx - 1], EV.adiados[idx - 1] + 0.2, t) : 1), light: '#c04a6a' }); g.restore();
      tint(g, '#3a3a7a', 0.28);
    },
    velho(g, t, u) { faceShot(g, t, { light: '#7a6ab0', face: oldFace(t, { tired: 0.4 }) }); tint(g, '#4a4a8a', 0.3); },
    museu(g, t, u) { L.bg(g, '#e8dcc8', '#b8a688'); g.fillStyle = '#c8b898'; g.fillRect(0, 1350, W, 600); for (let i = 0; i < 4; i++) { g.save(); g.globalCompositeOperation = 'screen'; glow(g, 200 + i * 230, 120, 260, '#fff6e0', 0.35); g.restore(); } g.save(); cam(g, 540, 1050, 1 + 0.1 * u); museum(g, t, 540, 1050, 1.3); g.restore(); dust(g, t, 30, '#fff6e0'); },
    neto(g, t, u) {
      L.bg(g, '#f2d6a8', '#d8a06a');
      g.save(); cam(g, 540, 1000, 1.0 + 0.06 * u);
      A.drawFront(g, 540, 1180, 1.6, { age: 0, look: [0.2, -0.6], smile: 0.2, browUp: 0.6, open: 0.35 * bump(0.1, 0.2, 0.75, 0.85, u) * Math.abs(Math.sin(t * 14)), shirt: 'teen' });
      g.restore(); tint(g, '#ffb070', 0.1, 'soft-light');
    },
    resposta(g, t, u) {
      faceShot(g, t, { light: '#8a7ac0', zoom: 1 + 0.06 * u, face: { ...oldFace(t), smile: 0.4, wonder: 0.3, tired: 0.2, open: 0.25 * bump(0.05, 0.12, 0.85, 0.95, u) * Math.abs(Math.sin(t * 11)) } });
      tint(g, '#4a4a8a', 0.25);
    },
    acende(g, t, u) {
      const on = smooth(EV.tvAcende, EV.tvAcende + 0.25, t);
      g.save(); cam(g, 540, 1050, 1.02 + 0.05 * u);
      adultRoom(g, t, { webs: 1, plant: 1, mins: 0, screen: (x, y, w, h) => { g.fillStyle = '#060508'; g.fillRect(x, y, w, h); if (on > 0) { g.save(); g.globalAlpha = on; A.drawNeonScreen(g, x, y, w, h, t, { mode: 'play' }); g.restore(); } }, light: on > 0.5 ? '#ff8ab0' : '#2a2a50', slump: 30 });
      g.restore(); tint(g, '#2a2a5a', 0.45 - 0.2 * on);
      if (on > 0 && on < 1) tint(g, '#ffffff', 0.4 * (1 - on), 'screen');
    },
    aperta(g, t, u) {
      const press = bump(EV.aperta - 0.08, EV.aperta, EV.aperta + 0.2, EV.aperta + 0.35, t);
      L.bg(g, '#3a1a3a', '#0c0814');
      const tr = t < EV.aperta ? 5 : 1;
      g.save(); g.translate(Math.sin(t * 37) * tr, Math.cos(t * 41) * tr);
      A.drawController(g, 540, 1000, 1.85, { press, hands: true, glow: '#ff8ab0' });
      g.restore();
      dust(g, t, 40, '#ffe8d0', [0, 300, W, 1400], 0.8);
      if (t > EV.aperta) tint(g, '#ffd0e0', 0.6 * Math.exp(-(t - EV.aperta) * 4), 'screen');
    },
    update(g, t, u) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); A.drawFlatTV(g, 30, 640, 1020, 600, (x, y, w, h) => progressScreen(g, x, y, w, h, t, { label: 'ATUALIZAÇÃO OBRIGATÓRIA', pct: 0.001 + 0.002 * u, sub: '150 GB • tempo restante: 9 anos' })); },
    cara(g, t, u) { faceShot(g, t, { light: '#6a4ab0', zoom: 1.1 + 0.08 * u, face: { ...oldFace(t), smile: 0, tired: 0.75, blink: bump(EV.piscada, EV.piscada + 0.06, EV.piscada + 0.1, EV.piscada + 0.2, t) } }); tint(g, '#4a4a8a', 0.3); },
    final(g, t, u) {
      g.save(); cam(g, 540, 1040, 1.0); adultRoom(g, t, { webs: 1, plant: 1, mins: 0, screen: t > EV.ultimo ? adiadoScreen(g, t, 2099, smooth(EV.ultimo, EV.ultimo + 0.25, t)) : (x, y, w, h) => progressScreen(g, x, y, w, h, t, { label: 'ATUALIZANDO…', pct: 0.003, sub: '150 GB • tempo restante: 9 anos' }), light: '#8a6ab0' }); g.restore();
      tint(g, '#3a3a7a', 0.3); tint(g, '#100c1e', smooth(60.8, 62, t), 'source-over');
    },
  };
}
export function overlay(ctx, t, L, cfg) {
  L.title(ctx, t, 'E SE O GTA 6 FOSSE', 'ADIADO DE NOVO?');
  L.bubble(ctx, 540, 520, 820, ['Vô, o que é GTA?'], L.smooth(31.6, 32.0, t) * (1 - L.smooth(35.6, 36.0, t)), { size: 84 });
  L.bubble(ctx, 540, 420, 900, ['É o jogo que eu tô', 'esperando desde 2013.'], L.smooth(36.4, 36.8, t) * (1 - L.smooth(41.2, 41.6, t)), { size: 70 });
  L.bigText(ctx, 'DE NOVO.', 360, L.smooth(22.0, 22.3, t) * (1 - L.smooth(25.4, 25.8, t)), { col: '#ff5a5a' });
  L.bigText(ctx, '150 GB', 380, L.smooth(51.0, 51.3, t) * (1 - L.smooth(52.6, 52.8, t)), { col: '#ffd36a', size: 160 });
  L.commentCard(ctx, t, 55.4, 59.3, 'Quantos anos você', 'esperaria?');
}
