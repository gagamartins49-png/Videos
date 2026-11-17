// ============================================================================
//  Linha do tempo do Short "E se o Goku fosse parar no universo do Naruto?" (Projeto E se? #011)
//  Paródia com personagens ORIGINAIS. Funções PURAS do tempo t (s): estado dos lutadores, clones,
//  kunais, fumaça, ilusão, poder, câmera. Usado pela cena (cena.js), pela camada 2D (short.js)
//  e por eventos.mjs (sons no instante exato).
// ============================================================================
import { POSES, mixPose } from './personagens.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
export const lerp = (a, b, u) => a + (b - a) * u;
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const bump = (a, b, c, d, t) => smooth(a, b, t) * (1 - smooth(c, d, t));
const V = (a, b, u) => a.map((x, i) => lerp(x, b[i], u));

export const DUR = 62;
export const SKY = [0, 14, 0];              // centro do choque no céu (gancho e loop)
export const POLE = [-2.6, 0, -6.4];        // poste de madeira onde o ninja observa
export const POLE_H = 3.0;
export const NINJA_HOME = [0, 0, -3.6];

const CLONES = 6;
const ATK = Array.from({ length: CLONES }, (_, i) => 22.3 + i * 0.42);   // instante de cada golpe nos clones
const cloneAng = (i) => (i / CLONES) * Math.PI * 2 + 0.5;

export const EV = {
  choque: 0.64,                  // os dois se chocam no ar
  portal: [4.0, 4.9],
  queda: [5.0, 6.3],             // o guerreiro cai do portal
  levanta: [8.5, 9.5],
  selo: 18.8,
  clones: 20.05,
  ataques: ATK,
  arremesso: 25.6, kunaiVoo: [25.75, 26.35], explosao: 26.4,
  saiFumaca: 28.4,
  pousaNinja: 31.0,
  olho: 32.4,
  ilusao: [32.9, 33.4],
  selamento: [36.7, 37.3],
  correntes: [37.2, 37.8],
  poder: [42.0, 44.6],
  quebraCorrente: 44.8,
  vidro: 45.8,                   // a ilusão quebra como vidro
  carga: [46.3, 47.0], raio: [47.0, 47.5], substitui: 47.25, reaparece: 47.8,
  veredito: [49.0, 55.4],
  enquete: [55.7, 59.8],
  volta: 59.8,                   // corte para o céu: loop
  impactos: [[0.64, 1.0, 0.9], [6.3, 1.0, 1.2], [26.4, 0.8, 1.0], [44.8, 0.7, 1.4], [45.8, 1.0, 0.8], [47.25, 0.6, 0.6], ...ATK.map((a) => [a, 0.35, 0.3])],
  quadrosImpacto: [0.64, 6.3, 26.4, 45.8, 47.25, ATK[CLONES - 1]],
  whoosh: [0.0, 5.0, 11.4, 22.0, 25.75, 31.0, 47.0, 59.8],
};

// ---------------------------------------------------------------- utilidades
const yawTo = (from, to) => Math.atan2(-(to[0] - from[0]), -(to[2] - from[2]));
export function mirror(p) {
  const o = { ...p };
  const sw = (a, b) => { const A = p[a], B = p[b]; o[a] = B; o[b] = A; };
  sw('sL', 'sR'); sw('eL', 'eR'); sw('tL', 'tR'); sw('kL', 'kR');
  for (const k of ['sL', 'sR', 'tL', 'tR']) if (o[k]) o[k] = [o[k][0], -o[k][1], -o[k][2]];
  if (o.hipsY) o.hipsY = -o.hipsY; if (o.hipsZ) o.hipsZ = -o.hipsZ; if (o.headY) o.headY = -o.headY;
  return o;
}
// trilha de poses: [[t, 'nome' | objeto, duraçãoDaTransição?], ...]
function poseTrack(keys, t) {
  let k = 0; while (k + 1 < keys.length && keys[k + 1][0] <= t) k++;
  const P = (x) => (typeof x === 'string' ? POSES[x] : x);
  if (k === 0 || t < keys[0][0]) return P(keys[0][1]);
  const [t1, p1, d = 0.18] = keys[k];
  return mixPose(P(keys[k - 1][1]), P(p1), smooth(t1, t1 + d, t));
}
const breathe = (p, t, a = 1) => ({ ...p, spine: (p.spine || 0) + 0.025 * a * Math.sin(t * 2.4), head: (p.head || 0) + 0.015 * a * Math.sin(t * 2.4 + 1) });

// ---------------------------------------------------------------- tempo do céu (gancho e loop usam o MESMO relógio)
export const skyTau = (t) => (t >= EV.volta ? t - DUR : t);
const RUSH = 5.0;   // m/s de aproximação
function skyState(t, side) {         // side -1 = guerreiro (esquerda), +1 = ninja
  const tau = skyTau(t);
  const d = Math.max(0.8, 4 - RUSH * tau);
  const hit = tau >= EV.choque;
  const push = hit ? 0.04 * Math.sin((tau - EV.choque) * 40) * Math.exp(-(tau - EV.choque) * 3) : 0;
  const bob = 0.05 * Math.sin(tau * 3 + side);
  const pos = [SKY[0] + side * (d + push), SKY[1] + bob - (hit ? 0 : 0.25), SKY[2] + (side > 0 ? 0.0 : 0)];
  let pose = hit ? mixPose(POSES.voo, POSES.soco, smooth(EV.choque - 0.08, EV.choque + 0.05, tau)) : POSES.voo;
  if (side > 0) pose = mirror(pose);
  return { pos, yaw: side < 0 ? -Math.PI / 2 : Math.PI / 2, pose, mood: hit ? 'shout' : 'angry', glow: 0, hairGlow: side < 0 ? 0.35 : 0, vis: 1 };
}

// ---------------------------------------------------------------- GUERREIRO
export function power(t) { return smooth(EV.poder[0], EV.poder[1], t) * (1 - smooth(48.2, 49.2, t)) + 0.0; }
export function illusion(t) { return t >= EV.vidro ? 0 : smooth(EV.ilusao[0], EV.ilusao[1], t); }
export function sealOn(t) { return t >= EV.vidro ? 0 : smooth(EV.selamento[0], EV.selamento[1], t); }

export function guerreiro(t) {
  if (t < 3.6 || t >= EV.volta) return skyState(t, -1);
  const home = [0, 0, 0];
  const faceN = yawTo(home, NINJA_HOME);
  // chegada
  if (t < EV.queda[0]) return { pos: [0, -50, 0], yaw: 0, pose: POSES.queda, vis: 0 };
  if (t < EV.queda[1]) {
    const u = (t - EV.queda[0]) / (EV.queda[1] - EV.queda[0]);
    const pose = mixPose(POSES.queda, POSES.pouso, smooth(0.75, 1, u));
    return { pos: [0, 10 * (1 - u * u), 0], yaw: 0.4 * (1 - u) + faceN * u, pose: { ...pose, hipsX: (pose.hipsX || 0) + 0.6 * Math.sin(u * 7) * (1 - u) }, mood: 'shout', vis: 1 };
  }
  if (t < 11.4) {
    const p = poseTrack([[6.3, 'pouso'], [EV.levanta[0], 'idle', 0.9], [9.9, { ...POSES.idle, head: -0.05, headY: 0.5 }, 0.5]], t);
    return { pos: home, yaw: faceN, pose: breathe(p, t), mood: t < 8.8 ? 'closed' : 'smirk', vis: 1 };
  }
  // ficha de poder / encarada
  if (t < 20.0) return { pos: home, yaw: faceN, pose: breathe(poseTrack([[11.4, 'idle'], [15.6, 'guarda', 0.4]], t), t), mood: t < 15.6 ? 'smirk' : 'neutral', vis: 1 };
  // clones
  if (t < 25.2) {
    if (t < 22.0) return { pos: home, yaw: faceN + 0.6 * Math.sin((t - 20) * 1.4), pose: breathe(POSES.guarda, t), mood: t < 20.6 ? 'surprise' : 'smirk', vis: 1 };
    // golpe i
    let i = 0; while (i + 1 < CLONES && t >= ATK[i] + 0.21) i++;
    const a = cloneAng(i), dir = [Math.cos(a), 0, Math.sin(a)];
    const prevA = cloneAng(Math.max(0, i - 1));
    const turn = smooth(ATK[i] - 0.25, ATK[i] - 0.08, t);
    const yawA = yawTo(home, [Math.cos(prevA), 0, Math.sin(prevA)]), yawB = yawTo(home, dir);
    let dy = yawB - yawA; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    const yaw = i === 0 ? lerp(faceN, yawB, turn) : yawA + dy * turn;
    const lunge = 0.45 * bump(ATK[i] - 0.2, ATK[i] - 0.03, ATK[i] + 0.1, ATK[i] + 0.3, t);
    const atk = i % 2 ? POSES.chute : POSES.soco;
    const pose = mixPose(POSES.guarda, atk, bump(ATK[i] - 0.14, ATK[i] - 0.02, ATK[i] + 0.12, ATK[i] + 0.24, t));
    const after = t > ATK[CLONES - 1] + 0.3;
    return { pos: [dir[0] * lunge, 0, dir[2] * lunge], yaw: after ? lerp(yaw, faceN, smooth(ATK[CLONES - 1] + 0.3, 25.1, t)) : yaw, pose: after ? mixPose(pose, POSES.idle, smooth(ATK[CLONES - 1] + 0.3, 25.0, t)) : pose, mood: 'smirk', vis: 1 };
  }
  // kunais
  const facePole = yawTo(home, POLE);
  if (t < 31.0) {
    const p = poseTrack([[25.2, 'idle'], [25.8, 'guarda', 0.25], [EV.saiFumaca, 'idle', 0.8], [29.4, { ...POSES.idle, sL: [0.2, 0, -0.3], eL: -1.2 }, 0.4], [30.1, 'idle', 0.4]], t);
    return { pos: home, yaw: lerp(faceN, facePole, smooth(25.2, 25.7, t)), pose: breathe(p, t), mood: t < EV.saiFumaca ? 'neutral' : 'smirk', vis: 1 };
  }
  // virada: ilusão e selamento
  if (t < EV.poder[0]) {
    const look = t > 33.4 && t < 36.7 ? 0.9 * Math.sin((t - 33.4) * 1.7) : 0;
    const struggle = sealOn(t) > 0.5 ? 0.06 * Math.sin(t * 23) * (0.5 + 0.5 * Math.sin(t * 3.1)) : 0;
    const p = poseTrack([[31.0, 'guarda'], [37.3, 'preso', 0.35]], t);
    return { pos: [struggle * 0.3, 0, 0], yaw: faceN + look * 0.4, pose: { ...p, headY: look * 0.6, spine: (p.spine || 0) + struggle }, mood: t < 33.4 ? 'neutral' : t < 37.3 ? 'surprise' : 'angry', vis: 1 };
  }
  // poder e fuga
  if (t < 49.0) {
    const P = power(t);
    const shake = 0.012 * P * Math.sin(t * 47);
    const p = poseTrack([[42.0, 'preso'], [42.25, 'poder', 0.35], [EV.carga[0], 'esfera', 0.3], [48.3, 'guarda', 0.5]], t);
    return { pos: [shake, 0.08 * P, 0], yaw: faceN, pose: p, mood: t < 46.0 ? 'shout' : t < 47.6 ? 'angry' : 'surprise', hairGlow: P, glow: 0, vis: 1 };
  }
  // veredito e enquete
  const p = poseTrack([[49, 'guarda'], [55.7, { ...POSES.guarda, head: -0.2 }, 0.5]], t);
  return { pos: home, yaw: faceN, pose: breathe(p, t), mood: t < 52.5 ? 'angry' : 'smirk', hairGlow: 0.25 * smooth(52, 53, t), vis: 1 };
}

// ---------------------------------------------------------------- NINJA (o verdadeiro)
const poleTop = [POLE[0], POLE_H, POLE[2]];
export function ninja(t) {
  if (t < 3.6 || t >= EV.volta) return skyState(t, +1);
  const toG = (from) => yawTo(from, [0, 0, 0]);
  if (t < 10.0) return { pos: poleTop, yaw: toG(poleTop), pose: POSES.idle, vis: t >= 9.95 ? 1 : 1 };
  if (t < 11.4) return { pos: poleTop, yaw: toG(poleTop), pose: breathe({ ...POSES.idle, sL: [0.05, 0, -0.1], head: -0.15 }, t), mood: 'neutral', vis: 1 };
  if (t < EV.clones) {
    const p = poseTrack([[11.4, 'guarda'], [EV.selo - 0.4, 'selo', 0.3]], t);
    return { pos: NINJA_HOME, yaw: toG(NINJA_HOME), pose: breathe(p, t), mood: t < EV.selo - 0.4 ? 'neutral' : 'angry', vis: 1 };
  }
  // observa os clones do poste, arremessa as kunais
  if (t < EV.pousaNinja) {
    const p = poseTrack([[EV.clones, 'selo'], [21.0, 'idle', 0.4], [EV.arremesso - 0.25, { ...POSES.arremesso, sL: [-0.6, -0.3, -0.2], eL: -1.6 }, 0.2], [EV.arremesso, 'arremesso', 0.12], [26.6, 'idle', 0.6]], t);
    return { pos: poleTop, yaw: toG(poleTop), pose: breathe(p, t), mood: t > 28.6 ? 'surprise' : 'angry', vis: 1 };
  }
  const front = [0, 0, -3.2];
  if (t < EV.substitui) {
    const land = smooth(EV.pousaNinja, EV.pousaNinja + 0.25, t);
    const p = poseTrack([[EV.pousaNinja, 'pouso'], [31.4, 'guarda', 0.4], [EV.olho - 0.4, 'selo', 0.25], [34.0, 'guarda', 0.5], [EV.selamento[0] - 0.3, 'selo', 0.2], [38.5, 'guarda', 0.5], [44.0, 'esquiva', 0.4]], t);
    return { pos: [front[0], (1 - land) * 1.5, front[2]], yaw: toG(front), pose: breathe(p, t), mood: t > 44 ? 'surprise' : 'angry', glow: t > EV.olho && t < EV.vidro ? 1 : 0, vis: 1 };
  }
  if (t < EV.reaparece) return { pos: front, yaw: 0, pose: POSES.idle, vis: 0 };   // virou tronco
  if (t < 49.0) return { pos: poleTop, yaw: toG(poleTop), pose: breathe({ ...POSES.idle, sL: [0.2, 0, -0.2] }, t), mood: 'smirk', vis: 1 };
  const p = poseTrack([[49, 'guarda'], [55.7, 'selo', 0.5]], t);
  return { pos: NINJA_HOME, yaw: toG(NINJA_HOME), pose: breathe(p, t), mood: t < 52.5 ? 'angry' : 'smirk', vis: 1 };
}

// ---------------------------------------------------------------- clones de fumaça
export function clones(t) {
  const out = [];
  if (t < EV.clones || t > 25.2) return out;
  for (let i = 0; i < CLONES; i++) {
    const a = cloneAng(i), ring = [Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6];
    const atk = ATK[i];
    if (t > atk + 0.04) continue;
    const rush = smooth(atk - 0.34, atk - 0.02, t);
    const r = lerp(2.6, 0.95, rush);
    const pos = [Math.cos(a) * r, 0.25 * Math.sin(Math.PI * rush), Math.sin(a) * r];
    const pose = poseTrack([[EV.clones, 'selo'], [EV.clones + 0.5 + i * 0.05, 'guarda', 0.35], [atk - 0.34, 'voo', 0.12], [atk - 0.1, 'soco', 0.08]], t);
    out.push({ pos, yaw: yawTo(ring, [0, 0, 0]), pose: breathe(pose, t + i), mood: 'angry', vis: 1 });
  }
  return out;
}

// ---------------------------------------------------------------- fumaça, poeira e explosões (lista de eventos)
const KUNAI_AIM = [[0.0, 1.25, 0.0], [-0.5, 0.4, 0.3], [0.55, 0.6, -0.2]];
export const PUFFS = [
  { t: EV.clones, pos: NINJA_HOME, s: 2.2, kind: 'fumaca' },
  { t: EV.clones + 0.05, pos: [poleTop[0], poleTop[1] + 0.8, poleTop[2]], s: 1.4, kind: 'fumaca' },
  ...Array.from({ length: CLONES }, (_, i) => ({ t: EV.clones + 0.03 * i, pos: [Math.cos(cloneAng(i)) * 2.6, 0.9, Math.sin(cloneAng(i)) * 2.6], s: 1.6, kind: 'fumaca' })),
  ...ATK.map((a, i) => ({ t: a + 0.04, pos: [Math.cos(cloneAng(i)) * 0.95, 1.0, Math.sin(cloneAng(i)) * 0.95], s: 1.8, kind: 'fumaca' })),
  ...KUNAI_AIM.map((p, k) => ({ t: EV.explosao + 0.07 * k, pos: p, s: 2.6, kind: 'explosao' })),
  { t: EV.explosao + 0.25, pos: [0, 0.9, 0], s: 4.2, kind: 'fumacaGrande' },
  { t: EV.pousaNinja + 0.2, pos: [0, 0.1, -3.2], s: 1.4, kind: 'poeira' },
  { t: EV.substitui, pos: [0, 1.0, -3.2], s: 2.2, kind: 'fumaca' },
  { t: EV.reaparece - 0.05, pos: [poleTop[0], poleTop[1] + 0.8, poleTop[2]], s: 1.3, kind: 'fumaca' },
];
export const DUST = [{ t: EV.queda[1], pos: [0, 0.2, 0], s: 3.5, n: 14 }, { t: EV.poder[0] + 0.3, pos: [0, 0.1, 0], s: 4.5, n: 12 }, { t: EV.quebraCorrente, pos: [0, 0.2, 0], s: 5.5, n: 16 }];
export const PUFF_LIFE = { fumaca: 0.9, fumacaGrande: 2.0, explosao: 0.75, poeira: 1.2 };

export function kunais(t) {
  const [a, b] = EV.kunaiVoo; if (t < a || t > EV.explosao) return [];
  const from = [poleTop[0] + 0.3, poleTop[1] + 1.4, poleTop[2] + 0.3];
  return KUNAI_AIM.map((to, k) => {
    const u = clamp((t - a - 0.04 * k) / (b - a));
    const pos = V(from, to, u); pos[1] += 0.6 * Math.sin(Math.PI * u);
    return { pos, dir: [to[0] - from[0], to[1] - from[1], to[2] - from[2]], vis: u > 0 && u < 1.01 ? 1 : 0 };
  });
}

// tronco da substituição
export function tronco(t) {
  if (t < EV.substitui || t > 49) return null;
  const u = t - EV.substitui;
  const y = Math.max(0.18, 1.0 - 4.9 * u * u);
  return { pos: [0.1, y, -3.2], rot: Math.min(1.5, u * 4.2) };
}

// ---------------------------------------------------------------- tremor de câmera
export function shake(t) {
  let a = 0;
  for (const [t0, amp, d] of EV.impactos) { const tt = skyTau(t) >= 0 && t < 3.6 ? t : t; if (tt >= t0 && tt < t0 + d) a = Math.max(a, amp * (1 - (tt - t0) / d) ** 2); }
  a = Math.max(a, 0.35 * power(t) * smooth(42.2, 43, t) * (1 - smooth(45.8, 46.2, t)));
  if (t > 37.3 && t < 42) a = Math.max(a, 0.06);
  return a;
}

// ---------------------------------------------------------------- câmera: [posição, alvo, fov]
export function shot(t) {
  const u = (a, b) => smooth(a, b, t);
  if (t < 3.6 || t >= EV.volta) {
    const tau = skyTau(t), ang = 1.2 + 0.07 * tau, r = 6.2 - 0.6 * smooth(0.6, 3.6, tau) + 1.0 * clamp(-tau / 2.2);
    return { name: 'ceu', cam: [[SKY[0] - Math.sin(ang) * r, SKY[1] + 1.4 - 0.1 * tau, SKY[2] + Math.cos(ang) * r], [SKY[0] + 0.6, SKY[1] + 1.0, SKY[2]], 46 - 3 * smooth(0.7, 3.6, tau)] };
  }
  if (t < 6.1) { const k = u(3.6, 6.1); return { name: 'vila', cam: [[5.5 - 1.2 * k, 1.4, 10.5 - 1.5 * k], [0, 5.5 - 2.0 * u(5.0, 6.1), 0], 52] }; }
  if (t < 8.4) { const k = u(6.1, 8.4); return { name: 'cratera', cam: [[3.2 + 0.4 * k, 0.55, 4.4 + 0.6 * k], [0, 0.6, 0], 46] }; }
  if (t < 10.0) { const k = u(8.4, 10.0); return { name: 'levanta', cam: [[0.9, 1.25 + 0.2 * k, -2.2 + 0.25 * k], [0, 1.25 + 0.4 * k, 0], 38] }; }
  if (t < 11.4) { const k = u(10, 11.4); return { name: 'poste', cam: [[POLE[0] + 1.6 - 0.4 * k, 2.6, POLE[2] + 2.6 - 0.4 * k], [POLE[0], POLE_H + 1.45, POLE[2]], 40] }; }
  if (t < 15.6) { const k = u(11.4, 15.6); return { name: 'encarada', cam: [[5.4 - 0.9 * k, 1.25, -1.8], [0, 1.3, -1.8], 42] }; }
  if (t < 20.0) { const k = u(15.6, 20); return { name: 'ninjaBaixo', cam: [[0.9 - 0.2 * k, 0.75, -1.6 - 0.3 * k], [0, 1.45, -3.6], 44 - 6 * k] }; }
  if (t < 25.2) { const k = u(20, 25.2), ang = 0.4 + 1.3 * k; return { name: 'clones', cam: [[Math.sin(ang) * 5.6, 3.4 - 1.2 * k, Math.cos(ang) * 5.6], [0, 0.9, 0], 48] }; }
  if (t < 26.3) return { name: 'arremesso', cam: [[POLE[0] + 1.3, POLE_H + 1.0, POLE[2] - 1.4], [POLE[0] * 0.3, 1.6, POLE[2] * 0.3], 46] };
  if (t < 29.6) { const k = u(26.3, 29.6); return { name: 'explosao', cam: [[3.8 - 0.8 * k, 1.3, 3.6 - 0.8 * k], [0, 1.1, 0], 46] }; }
  if (t < 31.0) { const k = u(29.6, 31); return { name: 'rostoG', cam: [[0.32, 1.72, -1.05 + 0.15 * k], [0, 1.68, 0], 30 - 4 * k] }; }
  if (t < EV.ilusao[0]) { const k = u(31, 32.9); return { name: 'rostoN', cam: [[-0.25, 1.6, -1.75 - 0.2 * k], [0, 1.55, -3.2], 36 - 10 * k] }; }
  if (t < 36.7) { const k = u(32.9, 36.7), ang = 1.2 + 0.9 * k; return { name: 'ilusao', cam: [[Math.sin(ang) * 6.5, 2.3, -1.6 + Math.cos(ang) * 6.5], [0, 1.3, -1.6], 46] }; }
  if (t < 39.6) { const k = u(36.7, 39.6); return { name: 'preso', cam: [[1.3 - 0.3 * k, 0.5, -1.7 + 0.2 * k], [0, 1.2, 0], 44] }; }
  if (t < EV.poder[0]) { const k = u(39.6, 42); return { name: 'circulo', cam: [[0.6, 6.5 - 1.0 * k, 1.6], [0, 0, 0], 50] }; }
  if (t < EV.vidro) { const k = u(42, 45.8); return { name: 'poder', cam: [[0.25, 0.7 + 0.3 * k, -2.0 - 1.6 * k], [0, 1.35, 0], 42 + 8 * k] }; }
  if (t < 47.15) { const k = u(45.8, 47.15); return { name: 'carga', cam: [[2.2, 1.3, 0.8 - 0.4 * k], [0, 1.3, -1.6], 44] }; }
  if (t < 47.8) return { name: 'raio', cam: [[2.6, 1.6, -4.6], [0, 1.1, -2.4], 50] };
  if (t < EV.veredito[0]) { const k = u(47.8, 49); return { name: 'posteSorriso', cam: [[POLE[0] + 1.1, POLE_H + 1.5, POLE[2] + 1.6 - 0.2 * k], [POLE[0], POLE_H + 1.6, POLE[2]], 34] }; }
  if (t < EV.enquete[0]) { const k = u(49, 55.7); return { name: 'veredito', cam: [[5.2 - 0.8 * k, 0.9 + 0.2 * k, 3.6 - 0.5 * k], [-0.3, 1.4, -1.8], 44] }; }
  const k = u(55.7, 59.8); return { name: 'enquete', cam: [[4.2 - 0.5 * k, 1.6, 3.0 - 0.4 * k], [0, 1.3, -1.8], 46] };
}

// velocidade percebida (linhas de velocidade na camada 2D)
export function speed(t) {
  const tau = skyTau(t);
  let s = 0;
  if (t < 3.6 || t >= EV.volta) s = tau < EV.choque ? 1 : 0.5 * Math.exp(-(tau - EV.choque) * 1.5);
  if (t > 5.0 && t < 6.3) s = Math.max(s, smooth(5.0, 6.0, t));
  if (t > 22.0 && t < 25.0) s = Math.max(s, 0.55);
  if (t > 42.2 && t < 45.8) s = Math.max(s, 0.6 * power(t));
  if (t > 47.0 && t < 47.5) s = Math.max(s, 1);
  return s;
}
