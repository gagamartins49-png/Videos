// ============================================================================
//  Física do Short "E se você pulasse no último segundo de um elevador despencando?"
//  (Projeto E se? #006). Funções PURAS do tempo, sem Three.js: usadas pela cena,
//  pelo HUD e por eventos.mjs (instantes dos sons). Unidades SI; y = altura do piso da cabine.
// ============================================================================
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const G0 = 9.81;

export const ANDAR = 3.0;                       // altura de um andar
export const AND0 = 20;                         // andar onde o cabo arrebenta
export const H0 = AND0 * ANDAR;                 // 60 m
export const TQ = Math.sqrt(2 * H0 / G0);       // tempo de queda livre (~3,5 s)
export const VQ = G0 * TQ;                      // ~34,3 m/s (~124 km/h)
export const CRUSH = 0.6;                       // amortecedor + piso amassando
export const DTI = 2 * CRUSH / VQ;              // duração do impacto (~0,035 s)
export const G_IMPACTO = VQ * VQ / (2 * CRUSH) / G0;   // ~100 G
export const V_PULO = 2.8;                      // pulo de uma pessoa (~10 km/h)
export const V_COM_PULO = VQ - V_PULO;          // ~113 km/h
export const FLOAT_A = 0.32;                    // atrito nos trilhos: a cabine cai um tiquinho mais devagar -> o corpo "sobe"

// queda real (sem freio)
export function fallReal(tau) {
  if (tau <= 0) return { y: H0, v: 0, crush: 0, g: 1, phase: 'parado' };
  if (tau < TQ) return { y: H0 - 0.5 * G0 * tau * tau, v: G0 * tau, crush: 0, g: 0, phase: 'caindo' };
  const s = tau - TQ, sc = Math.min(s, DTI), d = VQ * sc - 0.5 * (VQ / DTI) * sc * sc;
  return { y: -d, v: s < DTI ? VQ * (1 - s / DTI) : 0, crush: d, g: s < DTI ? G_IMPACTO : 1, phase: 'impacto', s };
}
// corpo dentro da cabine: flutua durante a queda e é jogado no piso no impacto
export function bodyReal(tau) {
  if (tau <= 0) return { rel: 0, state: 'em pe' };
  if (tau < TQ) return { rel: Math.min(1.25, 0.5 * FLOAT_A * tau * tau + 0.06 * Math.sin(tau * 2.2) * smooth(0.3, 1.2, tau)), state: 'flutuando', spin: tau };
  const r0 = Math.min(1.25, 0.5 * FLOAT_A * TQ * TQ), s = tau - TQ;
  const fallRel = r0 + 0.9 - VQ * s + 0.5 * (VQ / DTI) * Math.min(s, DTI) ** 2;   // corpo continua a VQ até tocar o piso
  return { rel: Math.max(-0.75, fallRel - 0.9), state: fallRel - 0.9 > -0.7 ? 'flutuando' : 'no chao', spin: TQ, s };
}

// queda com freio de emergência (limitador de velocidade + garras nos trilhos)
export const V_TRIP = 4.0;                      // dispara a ~14 km/h
export const T_TRIP = V_TRIP / G0;
export const DEC_FREIO = 0.6 * G0;
export const T_PARA = T_TRIP + V_TRIP / DEC_FREIO;
export const Y_TRIP = H0 - 0.5 * G0 * T_TRIP * T_TRIP;
export const Y_PARA = Y_TRIP - V_TRIP * V_TRIP / (2 * DEC_FREIO);
export function fallBrake(tau) {
  if (tau <= 0) return { y: H0, v: 0, brake: 0, g: 1, phase: 'parado' };
  if (tau < T_TRIP) return { y: H0 - 0.5 * G0 * tau * tau, v: G0 * tau, brake: 0, g: 0, phase: 'caindo' };
  if (tau < T_PARA) { const s = tau - T_TRIP; return { y: Y_TRIP - V_TRIP * s + 0.5 * DEC_FREIO * s * s, v: V_TRIP - DEC_FREIO * s, brake: 1, g: 1.6, phase: 'freando' }; }
  return { y: Y_PARA, v: 0, brake: Math.max(0, 1 - (tau - T_PARA) * 2), g: 1, phase: 'parado' };
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
  const B = makeMap(T.freio.taxa, T.freio.estalo, 0);
  const hook = (t) => TQ - 0.012 + t * T.gancho.taxa;
  return { R, B, hook, T };
}
export function takeAt(cfg, ck, t) {
  const T = ck.T;
  if (t < T.mito.inicio) return { take: 'gancho', tau: ck.hook(t), rate: T.gancho.taxa };
  if (t < T.realidade.inicio) return { take: 'mito', tau: t - T.mito.estalo, rate: 1 };
  if (t < T.freio.inicio) return { take: 'realidade', tau: ck.R.tau(t), rate: ck.R.rate(t) };
  if (t < T.final.inicio) return { take: 'freio', tau: ck.B.tau(t), rate: ck.B.rate(t) };
  return { take: 'final', tau: t - T.final.inicio, rate: 1 };
}
export function eventTimes(cfg) {
  const ck = clocks(cfg), T = ck.T, M = T.mito.estalo;
  return {
    ganchoImpacto: 0.012 / T.gancho.taxa,
    mitoInicio: T.mito.inicio, mitoEstalo: M, mitoPulo: M + TQ - 0.35, mitoImpacto: M + TQ, mitoPorta: M + TQ + 1.1,
    realInicio: T.realidade.inicio, realEstalo: ck.R.inv(0), realImpacto: T.realidade.impacto,
    freioInicio: T.freio.inicio, freioEstalo: T.freio.estalo, freioTrava: ck.B.inv(T_TRIP), freioPara: ck.B.inv(T_PARA),
    finalInicio: T.final.inicio,
  };
}
