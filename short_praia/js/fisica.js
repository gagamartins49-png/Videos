// ============================================================================
//  Física do Short "E se você pulasse do helicóptero no mar, igual no GTA 6?" (Projeto E se? #008)
//  Funções PURAS do tempo, sem Three.js (cena, HUD e eventos.mjs usam as mesmas).
//  A ação acontece sobre o mar (z < -345). Água em y = 0. τ = 0 no instante do pulo.
// ============================================================================
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const G0 = 9.81;
export const LANE = 1.8, ZBAR = -226;   // cenário (avenida e barreira ao fundo)

// helicóptero parado no ar
export const HELI = { x: 0, y: 61.4, z: -400 };
export const H = 60;                               // altura do pulo (patim do helicóptero)
const VX = 0.7, VY = 1.0, Y0 = 59.6;
export const TQ = (VY + Math.sqrt(VY * VY + 2 * G0 * Y0)) / G0;   // ~3,6 s até a água
export const VQ = G0 * TQ - VY;                    // ~34 m/s (~123 km/h)
export const D_BARRIGA = 1.0;                      // de barriga: o corpo para em ~1 m de água
export const T_BARRIGA = 2 * D_BARRIGA / VQ;       // ~0,06 s
export const G_BARRIGA = VQ * VQ / (2 * D_BARRIGA) / G0;   // ~60 G

export function fall(tau) {
  const x0 = HELI.x + 1.1, z0 = HELI.z + 0.2;
  if (tau < 0) return null;
  const tt = Math.min(tau, TQ);
  return { x: x0 + VX * tt, y: Y0 + VY * tt - 0.5 * G0 * tt * tt, z: z0, v: Math.abs(VY - G0 * tt), u: tau, water: tau >= TQ, s: tau - TQ };
}

// atleta de salto em altura: plataforma de 27 m, entra de pé
export const PLAT = { x: 42, y: 27, z: -372 };
const VYA = 1.5;
export const TA = (VYA + Math.sqrt(VYA * VYA + 2 * G0 * PLAT.y)) / G0;   // ~2,5 s
export const VA = G0 * TA - VYA;                   // ~23 m/s (~83 km/h)
export const D_PE = 3.5;                           // de pé, o corpo "fura" a água e freia em ~3,5 m
export const G_PE = VA * VA / (2 * D_PE) / G0;     // ~8 G
export function dive(tau) {
  if (tau < 0) return null;
  const tt = Math.min(tau, TA);
  return { x: PLAT.x - 1.2 * tt, y: PLAT.y + 0.95 + VYA * tt - 0.5 * G0 * tt * tt, z: PLAT.z + 0.6, v: Math.abs(VYA - G0 * tt), water: tau >= TA, s: tau - TA, u: tau };
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
  const R = makeMap(T.realidade.taxa, T.realidade.impacto, TQ);
  const A = makeMap(T.atleta.taxa, T.atleta.entrada, TA);
  const hook = (t) => TQ + T.gancho.tau0 + t * T.gancho.taxa;
  return { R, A, hook, T };
}
export function takeAt(cfg, ck, t) {
  const T = ck.T;
  if (t < T.jogo.inicio) return { take: 'gancho', tau: ck.hook(t), rate: T.gancho.taxa };
  if (t < T.realidade.inicio) return { take: 'jogo', tau: t - T.jogo.pulo, rate: 1 };
  if (t < T.atleta.inicio) return { take: 'realidade', tau: ck.R.tau(t), rate: ck.R.rate(t) };
  if (t < T.final.inicio) return { take: 'atleta', tau: ck.A.tau(t), rate: ck.A.rate(t) };
  return { take: 'final', tau: t - T.final.inicio, rate: 1 };
}
export function eventTimes(cfg) {
  const ck = clocks(cfg), T = ck.T, J = T.jogo.pulo;
  return {
    ganchoImpacto: -T.gancho.tau0 / T.gancho.taxa,
    jogoInicio: T.jogo.inicio, jogoPulo: J, jogoAgua: J + TQ, jogoSobe: J + TQ + 1.3,
    realInicio: T.realidade.inicio, realPulo: ck.R.inv(0), realImpacto: T.realidade.impacto,
    atletaInicio: T.atleta.inicio, atletaPulo: ck.A.inv(0), atletaEntrada: T.atleta.entrada, atletaSobe: ck.A.inv(TA + 1.6),
    finalInicio: T.final.inicio,
  };
}
