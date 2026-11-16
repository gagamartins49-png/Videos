// ============================================================================
//  Linha do tempo do Short "E se o seu reflexo parasse de te imitar?" (Projeto E se? #009)
//  Funções PURAS do tempo t (s): pose da pessoa (R), pose do reflexo (M), luz e câmera.
//  Usado pela cena (cena.js), pela camada 2D (short.js) e por eventos.mjs (sons).
// ============================================================================
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const bump = (a, b, c, d, t) => smooth(a, b, t) * (1 - smooth(c, d, t));
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export const DUR = 62;
export const EV = {
  agua: [4.3, 7.3],
  lavar: [4.6, 7.4],
  piscaR: [14.0, 16.2],          // piscadas em que o reflexo atrasa
  piscaM: [14.45, 16.95],
  piscaSo: 50.3,                 // você pisca... ele não
  piscasJuntos: [9.0, 11.4, 34.6, 38.2, 41.6, 55.2],
  inclina: 19.5, inclinaM: 20.25,
  porta: 23.6, volta: 31.0, encaixa: 31.35,
  relogio: 30.0,                 // o relógio do reflexo muda para 03:33
  pisca: [[2.3, 2.75], [43.9, 44.9], [59.2, 60.0]],
  apagao: [45.2, 45.9],
  respiro: [46.6, 50.8],
  sorriso: 45.9,
  final: [61.3, 62.0],
};

const blinkPulse = (t, t0, d = 0.16) => { const u = (t - t0) / d; return u < 0 || u > 1 ? 0 : Math.sin(Math.PI * u); };

// pose de um personagem: lean (tronco p/ frente), head yaw/pitch/roll, gaze ('espelho' | 'camera' | 'porta'),
// blink, smile, open (boca), browUp, browIn (preocupado), wide (olhos arregalados), z (aproxima do vidro)
export function poseR(t) {
  const hook = t < 3.6;
  const lean = 0.55 * bump(4.5, 5.3, 6.6, 7.4, t);
  let blink = 0;
  for (const b of [...EV.piscaR, EV.piscaSo, ...EV.piscasJuntos]) blink = Math.max(blink, blinkPulse(t, b));
  if (t > 4.9 && t < 7.0) blink = 1;                                 // olhos fechados lavando o rosto
  const roll = 0.2 * smooth(19.5, 20.2, t) * (1 - smooth(22.0, 22.6, t));
  const yaw = -0.95 * smooth(EV.porta, EV.porta + 0.6, t) * (1 - smooth(EV.volta, EV.volta + 0.35, t));
  const fear = hook ? 1 : clamp(0.25 * smooth(14.6, 15.5, t) + 0.25 * smooth(20.3, 21, t) + 0.25 * smooth(28, 30, t) + 0.25 * smooth(31.3, 32, t) + 0.3 * smooth(45.9, 46.4, t));
  return {
    lean, pitch: lean * 0.7 + 0.05 * fear, yaw, roll,
    gaze: t >= EV.porta + 0.1 && t < EV.volta + 0.2 ? 'porta' : 'espelho',
    blink, smile: 0, open: 0.12 * fear + 0.15 * smooth(45.9, 46.3, t) * (1 - smooth(52, 54, t)),
    browUp: 0.8 * fear, browIn: 0.6 * fear, wide: 0.7 * fear, z: 0, breath: 0,
  };
}
export function poseM(t) {
  const hook = t < 3.6;
  const r = poseR(t);
  const p = { ...r };
  // piscadas: o reflexo pisca junto nas normais, atrasado nas marcadas e não pisca na última
  let blink = 0;
  for (const b of [...EV.piscaM, ...EV.piscasJuntos]) blink = Math.max(blink, blinkPulse(t, b));
  if (t > 4.9 && t < 7.0) blink = 1;
  p.blink = blink;
  // inclinação atrasada
  p.roll = 0.2 * smooth(EV.inclinaM, EV.inclinaM + 0.9, t) * (1 - smooth(22.4, 23.1, t));
  // você olha para a porta... ele não
  if (t >= EV.porta && t < EV.encaixa) { p.yaw = 0; p.gaze = 'camera'; p.browUp = 0.1; p.browIn = 0; p.wide = 0.25; p.open = 0; }
  // depois do apagão: calmo, sorrindo, mais perto do vidro, olhando para quem assiste
  const calm = smooth(EV.apagao[1] - 0.05, EV.apagao[1], t);
  if (hook || calm > 0) {
    const k = hook ? 1 : calm;
    p.browUp = p.browUp * (1 - k); p.browIn = p.browIn * (1 - k) - 0.25 * k; p.wide = p.wide * (1 - k) + 0.1 * k; p.open = p.open * (1 - k);
    p.smile = hook ? 0.25 + 0.5 * smooth(0.2, 3.2, t) : 0.35 + 0.35 * smooth(52, 60, t);
    p.z = hook ? 0.08 : 0.09 * smooth(46, 49, t);
    p.pitch = -0.04; p.yaw = 0;
    if (hook || t > 47.5) p.gaze = 'camera';
    p.breath = hook ? 0 : bump(EV.respiro[0], EV.respiro[0] + 0.6, EV.respiro[1] - 0.6, EV.respiro[1], t) * (0.5 + 0.5 * Math.sin((t - EV.respiro[0]) * 3.2));
  }
  return p;
}

// luz principal (barra acima do espelho): pisca nas janelas marcadas, apaga no apagão
export function light(t) {
  let L = 1;
  for (const [a, b] of EV.pisca) if (t >= a && t < b) L = hash(Math.floor(t * 18) + a) > 0.45 ? 1 : 0.05;
  if (t >= EV.apagao[0] && t < EV.apagao[1]) L = 0.02;
  if (t >= 58.4) L *= 1 - 0.55 * smooth(58.4, 61, t);
  if (t >= EV.final[0]) L *= 1 - smooth(EV.final[0], EV.final[1], t);
  return L;
}

// câmera: [posição, alvo, fov]
const A = (t, k = 0) => [[0.27 - 0.04 * k, 1.70, 1.62 - 0.25 * k], [-0.02, 1.62, 0.0], 38];
export function shot(t) {
  const u = (a, b) => smooth(a, b, t);
  if (t < 3.6) { const k = u(0, 3.6); return { name: 'H', cam: [[0.17, 1.675, 1.08 - 0.12 * k], [0.0, 1.62, -0.75], 27 - 5 * k] }; }
  if (t < 7.6) return { name: 'B', cam: [[0.95, 1.55, 2.45], [-0.1, 1.3, 0.3], 50] };
  if (t < 12.8) return { name: 'A', cam: A(t, u(7.6, 12.8) * 0.5) };
  if (t < 19.0) { const k = u(12.8, 19); return { name: 'C', cam: [[0.21, 1.665, 0.95 - 0.08 * k], [0, 1.63, -0.75], 30 - 6 * k] }; }
  if (t < 26.5) return { name: 'A', cam: A(t, 0.3 + 0.3 * u(19, 26.5)) };
  if (t < 31.8) { const k = u(26.5, 31.8); return { name: 'C', cam: [[0.2, 1.665, 0.93 - 0.06 * k], [0, 1.635, -0.75], 28 - 9 * k] }; }
  if (t < 35.0) return { name: 'A', cam: A(t, 0.4) };
  if (t < 39.0) { const k = u(35, 39); return { name: 'D', cam: [[0.0, 1.63, -0.12], [0, 1.62, 0.75], 38 - 6 * k] }; }
  if (t < 43.8) { const k = u(39, 43.8); return { name: 'C', cam: [[0.21, 1.665, 0.95], [0, 1.63, -0.75], 30 - 4 * k] }; }
  if (t < 51.6) return { name: 'A', cam: A(t, 0.5 + 0.5 * u(43.8, 51.6)) };
  if (t < 58.4) { const k = u(51.6, 58.4); return { name: 'E', cam: [[0.2, 1.82, 0.95 - 0.1 * k], [0.16, 2.14, -2.69], 22 - 8 * k] }; }
  const k = u(58.4, 62); return { name: 'C', cam: [[0.2, 1.665, 0.93 - 0.08 * k], [0, 1.635, -0.75], 26 - 8 * k] };
}
