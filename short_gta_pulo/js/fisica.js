// ============================================================================
//  Física do Short "E se você pulasse do carro andando, igual no GTA 6?" (Projeto E se? #007)
//  Funções PURAS do tempo, sem Three.js (cena, HUD e eventos.mjs usam as mesmas).
//  τ = 0 no instante do pulo. O carro anda no sentido -z, faixa da direita (x = +1,8 m).
// ============================================================================
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const G0 = 9.81;

export const LANE = 1.8, ZBAR = -226, FRONT = 2.2, ZI = ZBAR + FRONT;
export const V = 100 / 3.6;                     // 100 km/h
export const VD = 30 / 3.6;                     // dublê: 30 km/h
export const H_EQ = V * V / (2 * G0);           // ~39 m
export const H_EQD = VD * VD / (2 * G0);        // ~3,5 m
export const ANDARES = H_EQ / 3, ANDARES_D = H_EQD / 3;
export const RAZAO = (V / VD) ** 2;             // ~11x
export const ZJ = -95;                          // onde o motorista pula
export const SEAT = { x: -0.4, y: 0.62, z: 0.55 };
const DEC_CARRO = 1.0;                          // carro sem motorista perdendo velocidade

// ---------------------------------------------------------------- carro (sem motorista depois do pulo)
export const TC = (V - Math.sqrt(V * V - 2 * DEC_CARRO * (ZJ - ZI))) / DEC_CARRO;   // até bater na barreira
export const VC = V - DEC_CARRO * TC;
export const DTC = 0.05;
export function car(tau, real = true) {
  if (tau < 0) return { z: ZJ - V * tau, v: V, crush: 0, pitch: 0, yaw: 0, door: smooth(-0.9, -0.5, tau) };
  if (tau < TC) return { z: ZJ - (V * tau - 0.5 * DEC_CARRO * tau * tau), v: V - DEC_CARRO * tau, crush: 0, pitch: 0, yaw: 0.02 * Math.sin(tau * 1.3), door: 1 - 0.5 * smooth(0.3, 2, tau) };
  const s = tau - TC;
  if (!real) return { z: ZI + 3 * (1 - Math.exp(-s * 4)), v: 0, crush: 0.15 * smooth(0, 0.06, s), pitch: 0.06 * Math.exp(-s * 5) * Math.sin(s * 16), yaw: 0.4 * (1 - Math.exp(-s * 3)), door: 0.5 };
  const sc = Math.min(s, DTC), d = VC * sc - 0.5 * (VC / DTC) * sc * sc;
  return { z: ZI - d + (s > DTC ? 0.3 * (1 - Math.exp(-(s - DTC) * 6)) : 0), v: s < DTC ? VC * (1 - s / DTC) : 0, crush: d, pitch: s > 0.005 ? -0.15 * Math.sin(Math.PI * clamp((s - 0.005) / 0.6)) : 0, yaw: 0, door: 0.5 + 0.5 * smooth(0, 0.1, s) };
}

// ---------------------------------------------------------------- corpo saltando (realidade)
const VX = -3.0, VY = 1.6, Y0 = 0.95, YG = 0.16, MU = 0.7;
export const TG = (VY + Math.sqrt(VY * VY + 2 * G0 * (Y0 - YG))) / G0;      // até tocar o asfalto
export const TS = V / (MU * G0);                                             // rolando até parar
export const DIST = V * TG + V * V / (2 * MU * G0);                          // ~60 m
export function body(tau, v0 = V, game = false) {
  const x0 = LANE + SEAT.x - 0.4, z0 = ZJ + SEAT.z;
  if (tau < 0) return null;
  if (tau < TG) {
    const k = tau / TG;
    return { x: x0 + VX * tau, y: Y0 + VY * tau - 0.5 * G0 * tau * tau, z: z0 - v0 * tau, rx: -0.6 * k, ry: 0.4, rz: 0.5 * k, phase: 'ar', u: tau };
  }
  const w = tau - TG;
  if (game) {   // no jogo: duas cambalhotas e já fica de pé
    const L = 1.3, k = clamp(w / L), zg = z0 - v0 * TG - 7 * (1 - Math.pow(1 - k, 2));
    return { x: x0 + VX * TG - 0.6 * k, y: k < 1 ? 0.35 + 0.5 * Math.abs(Math.sin(k * Math.PI * 2)) : 0.86, z: zg, rx: k < 1 ? -k * Math.PI * 4 : 0, ry: k < 1 ? 0.4 : 1.2, rz: 0, phase: k < 1 ? 'rolando' : 'de pe', u: tau, w: w - L };
  }
  const ts = v0 / (MU * G0), ww = Math.min(w, ts), dist = v0 * ww - 0.5 * MU * G0 * ww * ww, e = dist / (v0 * ts / 2 || 1);
  const hop = 0.75 * Math.exp(-ww * 1.4) * Math.abs(Math.sin(ww * 6.5));
  const T = ts, f = clamp(ww / T), turns = 6 * (1 - Math.pow(1 - f, 2.5));
  return { x: x0 + VX * TG - 2.2 * clamp(e), y: YG + hop, z: z0 - v0 * TG - dist, rx: -0.6 - turns * Math.PI * 2 + (f >= 1 ? 0 : 0) , ry: 0.4 + 0.6 * f, rz: 0.5 * Math.sin(f * 9) * (1 - f), phase: w < ts ? 'rolando' : 'parado', u: tau, f };
}

// ---------------------------------------------------------------- dublê (30 km/h, com proteção, colchão)
export const ZJD = -60;
export function carD(tau) { return { z: ZJD - VD * tau, v: VD, door: smooth(-0.9, -0.5, tau) * (1 - 0.6 * smooth(1, 2.5, tau)) }; }
export const TGD = 0.42;
export function stunt(tau) {
  const x0 = LANE + SEAT.x - 0.4, z0 = ZJD + SEAT.z;
  if (tau < 0) return null;
  if (tau < TGD) { const k = tau / TGD; return { x: x0 - 5.0 * tau, y: Y0 + 1.2 * tau - 4.9 * tau * tau, z: z0 - VD * tau, rx: -0.5 * k, ry: 0.4, phase: 'ar' }; }
  const w = tau - TGD, L = 1.4, k = clamp(w / L);
  return { x: x0 - 5.0 * TGD - 1.0 * k, y: k < 1 ? 0.45 + 0.35 * Math.abs(Math.sin(k * Math.PI * 1.5)) : 0.98, z: z0 - VD * TGD - 4.5 * (1 - Math.pow(1 - k, 2)), rx: k < 1 ? -k * Math.PI * 3 : 0, ry: k < 1 ? 0.4 : 1.1, phase: k < 1 ? 'rolando' : 'de pe', w: w - L };
}

// ---------------------------------------------------------------- relógios (câmera lenta)
export function makeMap(keys, tA, tauA) {
  const t0 = keys[0][0], t1 = keys[keys.length - 1][0], dt = 1 / 600, n = Math.ceil((t1 - t0) / dt) + 1;
  const rate = (t) => { if (t <= t0) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const [a, ra] = keys[i], [b, rb] = keys[i + 1]; if (t <= b) return ra + (rb - ra) * clamp((t - a) / (b - a)); } return keys[keys.length - 1][1]; };
  const I = new Float64Array(n);
  for (let i = 1; i < n; i++) I[i] = I[i - 1] + 0.5 * (rate(t0 + (i - 1) * dt) + rate(t0 + i * dt)) * dt;
  const at = (t) => { if (t <= t0) return (t - t0) * keys[0][1]; const f = (t - t0) / dt; if (f >= n - 1) return I[n - 1] + (t - t0 - (n - 1) * dt) * keys[keys.length - 1][1]; const i = Math.floor(f); return I[i] + (I[i + 1] - I[i]) * (f - i); };
  const off = tauA - at(tA);
  const tau = (t) => off + at(t);
  const inv = (target) => { let lo = t0 - 60, hi = t1 + 60; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (tau(m) < target) lo = m; else hi = m; } return (lo + hi) / 2; };
  return { tau, rate, inv };
}
export function clocks(cfg) {
  const T = cfg.tempos;
  const R = makeMap(T.realidade.taxa, T.realidade.pulo, 0);
  const D = makeMap(T.duble.taxa, T.duble.pulo, 0);
  const hook = (t) => T.gancho.tau0 + t * T.gancho.taxa;
  return { R, D, hook, T };
}
export function takeAt(cfg, ck, t) {
  const T = ck.T;
  if (t < T.jogo.inicio) return { take: 'gancho', tau: ck.hook(t), rate: T.gancho.taxa };
  if (t < T.realidade.inicio) return { take: 'jogo', tau: t - T.jogo.pulo, rate: 1 };
  if (t < T.duble.inicio) return { take: 'realidade', tau: ck.R.tau(t), rate: ck.R.rate(t) };
  if (t < T.final.inicio) return { take: 'duble', tau: ck.D.tau(t), rate: ck.D.rate(t) };
  return { take: 'final', tau: t - T.final.inicio, rate: 1 };
}
export function eventTimes(cfg) {
  const ck = clocks(cfg), T = ck.T, J = T.jogo.pulo;
  return {
    ganchoPorta: (-0.7 - T.gancho.tau0) / T.gancho.taxa, ganchoPulo: -T.gancho.tau0 / T.gancho.taxa, ganchoChao: (TG - T.gancho.tau0) / T.gancho.taxa,
    jogoInicio: T.jogo.inicio, jogoPorta: J - 0.7, jogoPulo: J, jogoChao: J + TG, jogoDePe: J + TG + 1.3, jogoBatida: J + TC,
    realInicio: T.realidade.inicio, realPorta: ck.R.inv(-0.7), realPulo: T.realidade.pulo, realChao: ck.R.inv(TG), realPara: ck.R.inv(TG + TS), realBatida: T.realidade.batida,
    dubleInicio: T.duble.inicio, dublePorta: ck.D.inv(-0.7), dublePulo: T.duble.pulo, dubleChao: ck.D.inv(TGD), dubleDePe: ck.D.inv(TGD + 1.4),
    finalInicio: T.final.inicio,
  };
}
