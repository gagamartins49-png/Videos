// ============================================================================
//  Linha do tempo do Short "E se você ficasse preso no shopping à noite?" (Projeto E se? #021)
//  Funções PURAS do tempo: boneco de testes (você), segurança, luzes, portas de aço,
//  porta de emergência e câmera. Usado por cena.js, short.js e eventos.mjs (sons).
// ============================================================================
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
export const lerp = (a, b, u) => a + (b - a) * u;
const bump = (a, b, c, d, t) => smooth(a, b, t) * (1 - smooth(c, d, t));
export const DUR = 62;
export const EV = {
  apaga: 3.0, acorda: 3.4, luzes: [4.4, 5.4], portas: [4.6, 7.6], grito: 9.4, manequim: 20.4, ronda: [28.6, 31.0],
  alarme: 33.0, empurra: 41.0, porta: [41.2, 42.0], sirene: [41.2, 49.8], lanterna: 45.4, despertador: 51.0,
};
export const STORES = [   // [x, z, nome, cor] — vitrines dos dois lados do corredor
  [-7, 8, 'MODA', '#ff5ab0'], [7, 8, 'TÊNIS', '#5ae8ff'], [-7, 0, 'GAMES', '#7ad870'], [7, 0, 'VITRINE', '#ffd36a'],
  [-7, -8, 'COLCHÕES', '#c86aff'], [7, -8, 'CAFÉ', '#ff8a3a'], [-7, -16, 'LIVROS', '#5ab0ff'], [7, -16, 'ÓTICA', '#ff5a5a'],
];
// shutter de cada loja: 0 aberto … 1 fechado (vitrine dos manequins e loja de colchões ficam de vidro)
export function shutter(i, t) { if (i === 3 || i === 4) return 0; return smooth(EV.portas[0] + i * 0.25, EV.portas[0] + 1.6 + i * 0.25, t); }
export function luzes(t) {
  const main = t < EV.luzes[0] ? 1 : 1 - smooth(EV.luzes[0], EV.luzes[1], t);
  const provador = t < EV.apaga ? 1 : (t > 49.8 && t < 55.0 ? 1 : 0);
  const alarme = (t > EV.alarme && t < 35.5) || (t > EV.sirene[0] && t < EV.sirene[1]) ? (Math.sin(t * 12) > 0 ? 1 : 0.15) : 0;
  return { main, provador, alarme };
}

// ---------------------------------------------------------------- poses do boneco
const P = {
  pe: {}, sentado: { lL: -1.5, lR: -1.5, kL: 1.5, kR: 1.5, y: -0.45, aLx: -0.4, aRx: -0.4 },
  dormindo: { lL: -1.5, lR: -1.5, kL: 1.5, kR: 1.5, y: -0.45, head: 0.7, torso: 0.3, aLx: -0.2, aRx: -0.2, aLz: 0.2, aRz: -0.2 },
  grito: { aLz: 2.6, aRz: -2.6, head: -0.4, torso: -0.1 }, susto: { aLx: -1.4, aRx: -1.4, aLz: 0.5, aRz: -0.5, torso: -0.25, head: -0.2 },
  empurra: { aLx: -1.5, aRx: -1.5, torso: 0.25 }, maos: { aLz: 2.8, aRz: -2.8, aLx: -0.3, aRx: -0.3 }, olhaCima: { head: -0.6 },
  deitado: { lL: 0, lR: 0, aLz: 0.4, aRz: -0.4 },
};
const mix = (a, b, u) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = lerp(a[k] || 0, b[k] || 0, u); return o; };
const walk = (t, k = 1) => { const s = Math.sin(t * 7) * 0.55 * k; return { lL: s, lR: -s, aLx: -s * 0.8, aRx: s * 0.8, kL: Math.max(0, -s) * 0.8, kR: Math.max(0, s) * 0.8 }; };
const path = (t, a, b, p0, p1) => { const u = smooth(a, b, t); return [lerp(p0[0], p1[0], u), 0, lerp(p0[1], p1[1], u)]; };
const YAW = { px: Math.PI / 2, nx: -Math.PI / 2, pz: 0, nz: Math.PI };   // frente do boneco = +z

export function boneco(t) {
  if (t < 4.2) { const acordado = smooth(EV.acorda, EV.acorda + 0.3, t); return { pos: [-11, 0, 8], yaw: YAW.px, pose: mix(P.dormindo, { ...P.sentado, head: -0.2 }, acordado) }; }
  if (t < 8.8) { const anda = t > 6.4; return { pos: path(t, 6.4, 8.8, [-9.5, 8], [-3.5, 8]), yaw: YAW.px, pose: anda ? walk(t) : P.pe }; }
  if (t < 13.4) return { pos: [0, 0, 11], yaw: YAW.nz, pose: mix(P.pe, P.grito, bump(EV.grito - 0.2, EV.grito, 11.2, 11.8, t)) };
  if (t < 18.0) return { pos: path(t, 13.4, 18, [-1.2, 7], [-1.2, -2]), yaw: YAW.nz, pose: walk(t) };
  if (t < 22.6) { const s = smooth(EV.manequim, EV.manequim + 0.2, t); const back = 0.6 * s; return { pos: [4.3 - back, 0, 1.6], yaw: YAW.px, pose: mix(P.pe, P.susto, s) }; }
  if (t < 26.5) return { pos: [2.6, 0, 6.2], yaw: YAW.pz, pose: P.sentado };
  if (t < 31.0) return { pos: [1.0, 0, 3.0], yaw: YAW.nz + 0.6 * smooth(28.4, 29.2, t), pose: P.olhaCima };
  if (t < 35.5) { const parado = t > EV.alarme; return { pos: path(t, 31, EV.alarme, [0, -12], [0, -20]), yaw: YAW.nz, pose: parado ? mix(P.pe, P.susto, smooth(EV.alarme, EV.alarme + 0.2, t)) : walk(t) }; }
  if (t < 40.5) return { pos: path(t, 35.5, 39.6, [0, -30], [0, -38.4]), yaw: YAW.nz, pose: t < 39.6 ? walk(t) : P.pe };
  if (t < 44.8) return { pos: [0, 0, -38.4], yaw: YAW.nz, pose: mix(P.pe, P.empurra, smooth(EV.empurra - 0.3, EV.empurra, t)) };
  if (t < 49.8) return { pos: [0, 0, -38.0], yaw: YAW.pz, pose: mix(P.pe, P.maos, smooth(EV.lanterna, EV.lanterna + 0.3, t)) };
  if (t < 55.0) return { pos: [-11, 0, 8], yaw: YAW.px, pose: { ...P.sentado, head: -0.1 } };
  return { pos: [-10.2, 0.62, -8], yaw: YAW.px, deitado: true, pose: P.deitado };
}
export function seguranca(t) {
  if (t >= 28.4 && t < 31.0) return { vis: 1, pos: [-5.6, 5, lerp(-12, 0, smooth(28.4, 31, t))], yaw: 0, beam: [-2, 0, 4], pose: walk(t, 0.8) };
  if (t >= 44.8 && t < 49.8) return { vis: 1, pos: [0.3, 0, lerp(-28, -33.5, smooth(44.8, 46.4, t))], yaw: YAW.nz, beam: [0, 1.2, -38], pose: t < 46.4 ? walk(t) : {} };
  return { vis: 0 };
}
export function portaEmergencia(t) { return smooth(EV.porta[0], EV.porta[1], t); }
export function cameraSeg(t) { return 0.7 * Math.sin(t * 0.8); }

// ---------------------------------------------------------------- câmera: [posição, alvo, fov]
export function shot(t) {
  const u = (a, b) => smooth(a, b, t);
  if (t < 4.2) { const k = u(0, 4.2); return { name: 'provador', cam: [[-7.6, 1.5, 8.3 + 0.1 * k], [-11, 0.9, 8], 50 - 6 * k] }; }
  if (t < 8.8) { const k = u(4.2, 8.8); return { name: 'corredor', cam: [[3.5, 6.8 - 1.2 * k, 16], [-1, 1.2, -4], 55] }; }
  if (t < 13.4) { const k = u(8.8, 13.4); return { name: 'eco', cam: [[0.5, 6.5 + 1.5 * k, 18.5 + 1.5 * k], [0, 0.8, 11], 50] }; }
  if (t < 18.0) { const k = u(13.4, 18); return { name: 'escada', cam: [[4.2, 1.7, 5 - 9 * k], [-1.4, 2.2, -8 - 6 * k], 56] }; }
  if (t < 22.6) { const k = u(18, 22.6); return { name: 'manequins', cam: [[2.0 - 0.2 * k, 1.55, 3.6 - 0.2 * k], [7.6, 1.45, 0.2], 46 - 6 * k] }; }
  if (t < 26.5) { const k = u(22.6, 26.5); return { name: 'banco', cam: [[4.6, 1.5, 10.5 - 0.6 * k], [2.4, 0.9, 6], 48] }; }
  if (t < 28.4) { const k = u(26.5, 28.4); return { name: 'cameraSeg', cam: [[3.2, 7.6, -0.6], [5, 8.4, -4], 40 - 6 * k] }; }
  if (t < 31.0) { const k = u(28.4, 31); return { name: 'ronda', cam: [[-2.6, 1.4, 8.2], [-5.6, 5.8, -6 + 5 * k], 52] }; }
  if (t < 35.5) { const k = u(31, 35.5); return { name: 'alarme', cam: [[-3.6, 2.4, -10 - 3 * k], [0.6, 1.3, -20], 52] }; }
  if (t < 40.5) { const k = u(35.5, 40.5); return { name: 'saida', cam: [[1.6, 1.5, -32 - 3 * k], [0, 1.4, -40], 48] }; }
  if (t < 44.8) return { name: 'empurra', cam: [[0.9, 1.75, -35.2], [0, 1.3, -40], 52] };
  if (t < 49.8) { const k = u(44.8, 49.8); return { name: 'lanterna', cam: [[3.4, 1.6, -35.5 + 0.5 * k], [0, 1.3, -37.6], 50] }; }
  if (t < 55.0) { const k = u(49.8, 55); return { name: 'despertador', cam: [[-7.6, 1.5, 8.3], [-11, 0.9, 8], 48 - 6 * k] }; }
  const k = u(55, 62); return { name: 'colchao', cam: [[-3.0, 2.0, -5.2 - 0.4 * k], [-9.8, 0.7, -8], 48 - 4 * k] };
}
export function shake(t) {
  let a = 0;
  if (t > EV.sirene[0] && t < EV.sirene[0] + 1.2) a = 0.6 * (1 - (t - EV.sirene[0]) / 1.2);
  if (t > EV.alarme && t < EV.alarme + 0.8) a = Math.max(a, 0.4 * (1 - (t - EV.alarme) / 0.8));
  if (t > EV.manequim && t < EV.manequim + 0.5) a = Math.max(a, 0.5 * (1 - (t - EV.manequim) / 0.5));
  return a;
}
