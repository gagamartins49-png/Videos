// ============================================================================
//  Linha do tempo do Short "E se o Naruto fosse parar no mundo de Dragon Ball?" (Projeto E se? #023)
//  Versões low-poly (fan art) dos dois: o ninja chega por um portal, encontra o guerreiro,
//  clones de sombra contra velocidade, esfera giratória contra raio, a transformação dourada,
//  o modo raposa… e o veredito. Funções PURAS do tempo (vídeo, camada 2D e sons).
// ============================================================================
import { POSES, mixPose } from './personagens.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
export const lerp = (a, b, u) => a + (b - a) * u;
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const bump = (a, b, c, d, t) => smooth(a, b, t) * (1 - smooth(c, d, t));

export const DUR = 62;
export const SKY = [0, 14, 0];
export const POLE = [-60, 0, -60], POLE_H = 0.1;
export const GOKU = [0, 0, -3.6];          // o guerreiro (anfitrião)
export const NARUTO = [0, 0, 0];           // o ninja (visitante) cai na origem (cratera)
export const NINJA_HOME = GOKU;            // compatibilidade
const CLONES = 6;
const ATK = Array.from({ length: CLONES }, (_, i) => 21.3 + i * 0.4);
const cloneAng = (i) => (i / CLONES) * Math.PI * 2 + 0.5;
export const EV = {
  choque: 0.64, portal: [4.0, 4.9], queda: [5.0, 6.3], levanta: [8.3, 9.2], joinha: 9.6,
  selo: 18.6, clones: 19.8, ataques: ATK,
  esfera: [24.8, 26.6], carga: [25.2, 26.6], raio: [26.6, 27.6], explosao: 27.6,
  poder: [31.0, 33.8], raposa: [37.8, 39.6], dash: 41.4, clash: 42.5, mao: 46.4,
  veredito: [49.0, 55.4], enquete: [55.7, 59.8], volta: 59.8,
  ilusao: [998, 999], selamento: [998, 999], correntes: [998, 999], vidro: 999, olho: 999, quebraCorrente: 42.5,
  arremesso: 999, kunaiVoo: [998, 999], substitui: 999, reaparece: 999, saiFumaca: 999, pousaNinja: 999,
  impactos: [[0.64, 1.0, 0.9], [6.3, 1.0, 1.2], [27.6, 0.9, 1.0], [42.5, 1.0, 1.2], [31.2, 0.4, 2.6], ...ATK.map((a) => [a, 0.35, 0.3])],
  quadrosImpacto: [0.64, 6.3, 27.6, 42.5],
  whoosh: [0.0, 5.0, 19.8, 21.0, 41.4, 59.8],
};

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
  return { pos, yaw: side < 0 ? -Math.PI / 2 : Math.PI / 2, pose, mood: hit ? 'shout' : 'angry', glow: 0, hairGlow: side < 0 ? 0.9 : 0.6, vis: 1 };
}

// ---------------------------------------------------------------- poder e "modo raposa"
export function power(t) { return smooth(EV.poder[0], EV.poder[1], t) * (1 - smooth(48.2, 49.2, t)); }
export function raposa(t) { return smooth(EV.raposa[0], EV.raposa[1], t) * (1 - smooth(44.0, 45.0, t)); }
export function illusion() { return 0; }
export function sealOn() { return 0; }
const toN = yawTo(GOKU, NARUTO), toG = yawTo(NARUTO, GOKU);
const MID = [0, 0, -1.8];

// ---------------------------------------------------------------- GUERREIRO (cabelo preto → dourado)
export function guerreiro(t) {
  if (t < 3.6 || t >= EV.volta) return skyState(t, -1);
  const P = power(t);
  if (t < 19.8) {
    const p = poseTrack([[3.6, 'idle'], [11.4, { ...POSES.idle, sR: [0.2, 0, 0.2] }, 0.4], [15.6, 'guarda', 0.4]], t);
    return { pos: GOKU, yaw: toN, pose: breathe(p, t), mood: t < 11.4 ? 'smirk' : t < 15.6 ? 'smirk' : 'neutral', vis: 1 };
  }
  if (t < 24.6) {   // derruba os clones um por um
    if (t < 21.0) return { pos: GOKU, yaw: toN + 0.5 * Math.sin((t - 19.8) * 1.4), pose: breathe(POSES.guarda, t), mood: 'smirk', vis: 1 };
    let i = 0; while (i + 1 < CLONES && t >= ATK[i] + 0.2) i++;
    const a = cloneAng(i), dir = [Math.cos(a), 0, Math.sin(a)];
    const pa = cloneAng(Math.max(0, i - 1)), turn = smooth(ATK[i] - 0.25, ATK[i] - 0.08, t);
    const yA = yawTo([0, 0, 0], [Math.cos(pa), 0, Math.sin(pa)]), yB = yawTo([0, 0, 0], dir);
    let dy = yB - yA; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    const yaw = i === 0 ? lerp(toN, yB, turn) : yA + dy * turn;
    const lunge = 0.45 * bump(ATK[i] - 0.2, ATK[i] - 0.03, ATK[i] + 0.1, ATK[i] + 0.3, t);
    const pose = mixPose(POSES.guarda, i % 2 ? POSES.chute : POSES.soco, bump(ATK[i] - 0.14, ATK[i] - 0.02, ATK[i] + 0.12, ATK[i] + 0.24, t));
    return { pos: [GOKU[0] + dir[0] * lunge, 0, GOKU[2] + dir[2] * lunge], yaw, pose, mood: 'smirk', vis: 1 };
  }
  if (t < 31.0) { const p = poseTrack([[24.6, 'guarda'], [EV.carga[0], 'esfera', 0.3], [EV.raio[1] + 0.3, 'guarda', 0.4]], t); return { pos: GOKU, yaw: toN, pose: breathe(p, t), mood: t < 27.6 ? 'shout' : 'smirk', vis: 1 }; }
  if (t < 41.4) { const p = poseTrack([[31.0, 'guarda'], [31.2, { ...POSES.poder, head: 0.15 }, 0.35], [34.2, 'guarda', 0.5]], t); return { pos: [0.012 * P * Math.sin(t * 47), 0.06 * P, GOKU[2]], yaw: toN, pose: p, mood: t < 34 ? 'shout' : 'smirk', hairGlow: P, vis: 1 }; }
  if (t < 46.0) { const d = smooth(EV.dash, EV.clash, t); const p = t < EV.clash + 0.3 ? mixPose(POSES.guarda, POSES.soco, d) : POSES.guarda; return { pos: [0, 0, lerp(GOKU[2], MID[2] - 0.55, d) * (t < EV.clash + 0.3 ? 1 : 1)], yaw: toN, pose: p, mood: 'shout', hairGlow: P, vis: 1 }; }
  if (t < 49.0) { const p = poseTrack([[46.0, 'guarda'], [EV.mao, { ...POSES.idle, sL: [1.4, 0, 0], eL: -0.2 }, 0.4]], t); return { pos: [0, 0, -1.4], yaw: toN, pose: p, mood: 'smirk', hairGlow: P, vis: 1 }; }
  const p = poseTrack([[49, 'idle'], [55.7, { ...POSES.idle, sR: [2.6, 0, 0.3], eR: -0.4 }, 0.5]], t);
  return { pos: [-0.75, 0, -1.2], yaw: -Math.PI + 0.4, pose: breathe(p, t), mood: 'smirk', hairGlow: 0, vis: 1 };
}

// ---------------------------------------------------------------- NINJA (macacão laranja, cabelo loiro)
export function ninja(t) {
  if (t < 3.6 || t >= EV.volta) return skyState(t, +1);
  if (t < EV.queda[0]) return { pos: [0, -50, 0], yaw: 0, pose: POSES.queda, vis: 0 };
  if (t < EV.queda[1]) { const u = (t - EV.queda[0]) / (EV.queda[1] - EV.queda[0]); const pose = mixPose(POSES.queda, POSES.pouso, smooth(0.75, 1, u)); return { pos: [0, 10 * (1 - u * u), 0], yaw: 0.6 * (1 - u) + toG * u, pose: { ...pose, hipsX: (pose.hipsX || 0) + 0.6 * Math.sin(u * 7) * (1 - u) }, mood: 'shout', vis: 1 }; }
  const R = raposa(t);
  if (t < 11.4) { const joinha = { ...POSES.idle, sR: [1.4, 0, 0.2], eR: -1.6 }; const p = poseTrack([[6.3, 'pouso'], [EV.levanta[0], 'idle', 0.9], [EV.joinha, joinha, 0.3]], t); return { pos: NARUTO, yaw: toG, pose: breathe(p, t), mood: t < 8.6 ? 'closed' : 'smirk', vis: 1 }; }
  if (t < 24.6) { const p = poseTrack([[11.4, 'guarda'], [EV.selo - 0.3, 'selo', 0.25], [EV.clones + 0.8, 'guarda', 0.4]], t); return { pos: NARUTO, yaw: toG, pose: breathe(p, t), mood: t < EV.selo ? 'angry' : 'shout', vis: 1 }; }
  if (t < 31.0) {
    if (t < EV.explosao) { const p = poseTrack([[24.6, 'guarda'], [EV.esfera[0], 'esfera', 0.3]], t); return { pos: NARUTO, yaw: toG, pose: p, mood: 'shout', vis: 1 }; }
    const k = smooth(EV.explosao, EV.explosao + 0.5, t);
    const p = t < 29.4 ? POSES.atingido : mixPose(POSES.atingido, POSES.guarda, smooth(29.4, 30.2, t));
    return { pos: [0, 0, 1.4 * k], yaw: toG, pose: p, mood: 'surprise', vis: 1 };
  }
  if (t < EV.dash) { const p = poseTrack([[31.0, 'guarda'], [EV.raposa[0], { ...POSES.poder, head: 0.1 }, 0.35], [39.8, 'guarda', 0.4]], t); return { pos: [0, 0.05 * R, 0.6 * (1 - smooth(31, 33, t)) + 0.8], yaw: toG, pose: breathe(p, t), mood: t < 35.5 ? 'surprise' : 'angry', hairGlow: R, vis: 1 }; }
  if (t < 46.0) {
    if (t < EV.clash + 0.15) { const d = smooth(EV.dash, EV.clash, t); return { pos: [0, 0, lerp(0.8, MID[2] + 0.55, d)], yaw: toG, pose: mixPose(POSES.guarda, mirror(POSES.soco), d), mood: 'shout', hairGlow: R, vis: 1 }; }
    const k = smooth(EV.clash, EV.clash + 0.5, t);
    return { pos: [0, 0, lerp(MID[2] + 0.55, 1.8, k)], yaw: toG, pose: { ...POSES.atingido, hipsX: -1.3 * k, y: -0.7 * k }, mood: 'closed', hairGlow: R, vis: 1 };
  }
  if (t < 49.0) { const up = smooth(EV.mao + 0.2, EV.mao + 1.2, t); return { pos: [0, 0, 1.0 - 0.4 * up], yaw: toG, pose: mixPose({ ...POSES.atingido, hipsX: -1.3, y: -0.7 }, { ...POSES.idle, sR: [1.4, 0, 0], eR: -0.2 }, up), mood: up > 0.5 ? 'smirk' : 'closed', vis: 1 }; }
  const joinha = { ...POSES.idle, sL: [1.4, 0, -0.2], eL: -1.6 };
  const p = poseTrack([[49, 'idle'], [50.5, joinha, 0.4]], t);
  return { pos: [0.75, 0, -0.9], yaw: Math.PI - 0.4, pose: breathe(p, t), mood: 'smirk', vis: 1 };
}

// ---------------------------------------------------------------- clones de sombra (em volta do guerreiro)
export function clones(t) {
  const out = [];
  if (t < EV.clones || t > ATK[CLONES - 1] + 0.1) return out;
  for (let i = 0; i < CLONES; i++) {
    const a = cloneAng(i), atk = ATK[i]; if (t > atk + 0.04) continue;
    const rush = smooth(atk - 0.34, atk - 0.02, t), r = lerp(2.6, 0.95, rush);
    const ring = [GOKU[0] + Math.cos(a) * 2.6, 0, GOKU[2] + Math.sin(a) * 2.6];
    const pos = [GOKU[0] + Math.cos(a) * r, 0.25 * Math.sin(Math.PI * rush), GOKU[2] + Math.sin(a) * r];
    const pose = poseTrack([[EV.clones, 'selo'], [EV.clones + 0.5 + i * 0.05, 'guarda', 0.35], [atk - 0.34, 'voo', 0.12], [atk - 0.1, 'soco', 0.08]], t);
    out.push({ pos, yaw: yawTo(ring, GOKU), pose: breathe(pose, t + i), mood: 'angry', vis: 1 });
  }
  return out;
}
export const PUFFS = [
  { t: EV.clones, pos: [0, 1.0, 0], s: 1.2, kind: 'fumaca' },
  ...Array.from({ length: CLONES }, (_, i) => ({ t: EV.clones + 0.03 * i, pos: [GOKU[0] + Math.cos(cloneAng(i)) * 2.6, 0.9, GOKU[2] + Math.sin(cloneAng(i)) * 2.6], s: 1.0, kind: 'fumaca' })),
  ...ATK.map((a, i) => ({ t: a + 0.04, pos: [GOKU[0] + Math.cos(cloneAng(i)) * 0.95, 1.0, GOKU[2] + Math.sin(cloneAng(i)) * 0.95], s: 0.9, kind: 'fumaca' })),
  ...[0, 1, 2].map((k) => ({ t: EV.explosao + 0.07 * k, pos: [0.3 * (k - 1), 1.2, MID[2] + 0.3 * (k - 1)], s: 2.6, kind: 'explosao' })),
  { t: EV.explosao + 0.25, pos: [0, 0.9, MID[2]], s: 4.0, kind: 'fumacaGrande' },
  { t: EV.clash, pos: [0, 0.2, 0.9], s: 1.6, kind: 'poeira' },
];
export const DUST = [{ t: EV.queda[1], pos: [0, 0.2, 0], s: 3.5, n: 14 }, { t: EV.poder[0] + 0.3, pos: [GOKU[0], 0.1, GOKU[2]], s: 4.5, n: 12 }, { t: EV.clash, pos: [0, 0.2, MID[2]], s: 5.5, n: 16 }];
export const PUFF_LIFE = { fumaca: 0.9, fumacaGrande: 2.0, explosao: 0.75, poeira: 1.2 };
export function kunais() { return []; }
export function tronco() { return null; }
export function orbe(t) { return smooth(EV.esfera[0], EV.esfera[0] + 0.8, t) * (t < EV.explosao ? 1 : 0); }

export function shake(t) {
  let a = 0;
  for (const [t0, amp, d] of EV.impactos) if (t >= t0 && t < t0 + d) a = Math.max(a, amp * (1 - (t - t0) / d) ** 2);
  a = Math.max(a, 0.35 * power(t) * smooth(31.2, 32, t) * (1 - smooth(34, 34.6, t)), 0.3 * raposa(t) * (1 - smooth(39.8, 40.4, t)));
  return a;
}
export function shot(t) {
  const u = (a, b) => smooth(a, b, t);
  if (t < 3.6 || t >= EV.volta) { const tau = skyTau(t), ang = 1.2 + 0.07 * tau, r = 6.2 - 0.6 * smooth(0.6, 3.6, tau) + 1.0 * clamp(-tau / 2.2); return { name: 'ceu', cam: [[SKY[0] - Math.sin(ang) * r, SKY[1] + 1.4 - 0.1 * tau, SKY[2] + Math.cos(ang) * r], [SKY[0] + 0.6, SKY[1] + 1.0, SKY[2]], 46 - 3 * smooth(0.7, 3.6, tau)] }; }
  if (t < 6.1) { const k = u(3.6, 6.1); return { name: 'mundo', cam: [[4.6 - 1.0 * k, 1.6, 8.6 - 1.2 * k], [0, (() => { const fu = clamp((t - EV.queda[0]) / (EV.queda[1] - EV.queda[0])); return t < EV.queda[0] ? lerp(3, 8.5, u(3.6, 4.7)) : Math.max(1.0, 10 * (1 - fu * fu)); })(), 0], 52] }; }
  if (t < 8.4) { const k = u(6.1, 8.4); return { name: 'cratera', cam: [[3.2 + 0.4 * k, 1.0, 4.4 + 0.6 * k], [0, 0.6, 0], 46] }; }
  if (t < 10.0) { const k = u(8.4, 10.0); return { name: 'levanta', cam: [[0.9, 1.25 + 0.2 * k, -2.2 + 0.25 * k], [0, 1.25 + 0.4 * k, 0], 38] }; }
  if (t < 11.4) { const k = u(10, 11.4); return { name: 'guerreiro', cam: [[0.5, 1.6, -1.6 - 0.2 * k], [0, 1.6, -3.6], 36 - 4 * k] }; }
  if (t < 15.6) { const k = u(11.4, 15.6); return { name: 'encarada', cam: [[10 - 1.2 * k, 1.3, -1.8], [0, 1.2, -1.8], 46] }; }
  if (t < 19.8) { const k = u(15.6, 19.8); return { name: 'ninjaBaixo', cam: [[0.9 - 0.2 * k, 0.75, -1.6 - 0.3 * k], [0, 1.45, 0], 44 - 6 * k] }; }
  if (t < 24.6) { const k = u(19.8, 24.6), ang = 0.4 + 1.3 * k; return { name: 'clones', cam: [[GOKU[0] + Math.sin(ang) * 5.6, 3.4 - 1.2 * k, GOKU[2] + Math.cos(ang) * 5.6], [GOKU[0], 0.9, GOKU[2]], 48] }; }
  if (t < 27.6) { const k = u(24.6, 27.6); return { name: 'duelo', cam: [[10.2 - 0.8 * k, 1.5, -1.8], [0, 1.2, -1.8], 50] }; }
  if (t < 31.0) { const k = u(27.6, 31); return { name: 'explosao', cam: [[3.8 - 0.8 * k, 1.3, 3.0 - 0.6 * k], [0, 1.0, -0.6], 48] }; }
  if (t < 34.6) { const k = u(31, 34.6); return { name: 'poder', cam: [[0.25, 0.7 + 0.3 * k, -1.6 + 0.8 * k], [0, 1.35, -3.6], 42 + 8 * k] }; }
  if (t < 37.8) { const k = u(34.6, 37.8); return { name: 'rostoN', cam: [[-0.25, 1.62, -0.25 - 0.2 * k], [0, 1.58, 0.8], 34 - 8 * k] }; }
  if (t < EV.dash) { const k = u(37.8, 41.4); return { name: 'raposa', cam: [[0.25, 0.75 + 0.3 * k, -1.0 - 1.0 * k], [0, 1.3, 0.8], 42 + 6 * k] }; }
  if (t < 43.6) return { name: 'choque', cam: [[5.4, 1.4, -1.0], [0, 1.2, -1.2], 50] };
  if (t < 46.0) { const k = u(43.6, 46); return { name: 'caido', cam: [[2.6, 1.0, 3.0], [0, 0.5, 1.4], 46 - 4 * k] }; }
  if (t < 49.0) { const k = u(46, 49); return { name: 'mao', cam: [[6.2 - 0.5 * k, 1.4, -0.2], [0, 0.9, -0.3], 50] }; }
  if (t < EV.enquete[0]) { const k = u(49, 55.7); return { name: 'veredito', cam: [[3.0 - 0.6 * k, 1.3 + 0.1 * k, 3.4 - 0.5 * k], [0, 1.4, -1.0], 44] }; }
  const k = u(55.7, 59.8); return { name: 'enquete', cam: [[3.6 - 0.5 * k, 1.6, 3.6 - 0.4 * k], [0, 1.3, -1.0], 46] };
}
export function speed(t) {
  const tau = skyTau(t); let s = 0;
  if (t < 3.6 || t >= EV.volta) s = tau < EV.choque ? 1 : 0.5 * Math.exp(-(tau - EV.choque) * 1.5);
  if (t > 5.0 && t < 6.3) s = Math.max(s, smooth(5.0, 6.0, t));
  if (t > 21.0 && t < 23.8) s = Math.max(s, 0.55);
  if (t > EV.raio[0] && t < EV.raio[1]) s = Math.max(s, 1);
  if (t > 31.2 && t < 34) s = Math.max(s, 0.6 * power(t));
  if (t > 38 && t < 40) s = Math.max(s, 0.6 * raposa(t));
  if (t > EV.dash && t < EV.clash + 0.2) s = Math.max(s, 1);
  return s;
}
