// ============================================================================
//  Física do Short "E se as batidas do GTA 6 fossem reais?" (Projeto E se? #005)
//  Funções PURAS do tempo, sem Three.js: usadas pela cena (cena.js), pelo HUD
//  (short.js) e por eventos.mjs (que entrega os instantes dos sons ao gerar_audio.py).
//  Unidades SI. O carro anda no sentido -z, na faixa da direita (x = +1,8 m).
// ============================================================================
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const G0 = 9.81;

// ---------------------------------------------------------------- corrida até a barreira (takes "jogo" e "realidade")
export const V = 200 / 3.6;            // 200 km/h
export const ACC = V / 5;              // 0 -> 200 km/h em 5 s
export const LANE = 1.8;               // faixa da direita
export const ZBAR = -226;              // face da barreira de concreto
export const FRONT = 2.2;              // centro do carro -> para-choque dianteiro
export const ZI = ZBAR + FRONT;        // centro do carro no instante do impacto
export const TI = 5 + (-0.5 * ACC * 25 - ZI) / V;   // instante do impacto (s de corrida)
export const DT = 0.04;                // duração da batida real (frente amassa ~1,1 m)
export const G_BATIDA = V / DT / G0;   // desaceleração média (~142 G)

export function runZ(tau) { const t = Math.max(0, tau); return t < 5 ? -0.5 * ACC * t * t : -0.5 * ACC * 25 - V * (t - 5); }
export function runV(tau) { return tau <= 0 ? 0 : tau < 5 ? ACC * tau : V; }

// batida "de videogame": o carro quica para trás, quase sem dano
export function crashGame(s) {
  if (s < 0) return { z: runZ(TI + s), v: runV(TI + s), crush: 0, yaw: 0, pitch: 0 };
  return { z: ZI + 3.2 * (1 - Math.exp(-s * 4)), v: 0, crush: 0.14 * smooth(0, 0.06, s), yaw: 0.45 * (1 - Math.exp(-s * 3.5)), pitch: 0.07 * Math.exp(-s * 5) * Math.sin(s * 16) };
}
// batida real: para em DT segundos, a frente absorve o deslocamento, a traseira levanta
export function crashReal(s) {
  if (s < 0) return { z: runZ(TI + s), v: runV(TI + s), crush: 0, pitch: 0, g: 0 };
  const sc = Math.min(s, DT), d = V * sc - 0.5 * (V / DT) * sc * sc;
  let z = ZI - d;
  if (s > DT) z += 0.35 * (1 - Math.exp(-(s - DT) * 6));                       // rebote
  const pitch = s > 0.008 ? -0.2 * Math.sin(Math.PI * clamp((s - 0.008) / 0.6)) : 0; // nariz para baixo
  return { z, v: s < DT ? V * (1 - s / DT) : 0, crush: d, pitch, g: s < DT ? G_BATIDA : 0 };
}

// ---------------------------------------------------------------- boneco de testes (sem cinto) na batida real
export const SEAT = { x: -0.4, y: 0.62, z: 0.55 };   // quadril, no referencial do carro
export const SL = Math.sqrt(2 * DT * 1.0 / V);       // instante em que atravessa o para-brisa (~0,038 s)
const DVZ = -46, DVY = 4.5, Y0 = 1.05, YL = 0.16;
export const UL = (DVY + Math.sqrt(DVY * DVY + 2 * G0 * (Y0 - YL))) / G0;   // tempo de voo (~1,09 s)
const DEC_B = 28, VS = -DVZ;
export const TSB = VS / DEC_B;                       // tempo rolando no chão
export function dummyReal(s) {
  if (s < SL) return { seated: true, rel: s <= 0 ? 0 : s <= DT ? 0.5 * (V / DT) * s * s : V * s - 0.5 * V * DT };
  const c = crashReal(SL), z0 = c.z + SEAT.z - 1.0, x0 = LANE + SEAT.x, u = s - SL;
  let x, y, z, phase;
  if (u < UL) { y = Y0 + DVY * u - 0.5 * G0 * u * u; z = z0 + DVZ * u; x = x0 + 1.2 * u; phase = 'voo'; }
  else {
    const w = Math.min(u - UL, TSB);
    z = z0 + DVZ * UL - (VS * w - 0.5 * DEC_B * w * w);
    y = YL + 0.55 * Math.exp(-w * 2.5) * Math.abs(Math.sin(w * 7)); x = x0 + 1.2 * UL + 0.8 * w;
    phase = u - UL >= TSB ? 'parado' : 'rolando';
  }
  const T = UL + TSB, e = 1 - Math.pow(1 - clamp(u / T), 2.2);
  return { seated: false, x, y, z, rx: -(Math.PI / 2 + 4 * Math.PI) * e, ry: 0.9 * e, rz: 0.5 * Math.sin(Math.PI * e), u, phase, flail: 1 - smooth(UL * 0.7, T, u) };
}
// no modo jogo: sai pulando por cima do capô e fica de pé
export const HOP = 1.45, HOPD = 0.7;
export function dummyGame(s) {
  if (s < HOP) return { seated: true, rel: 0 };
  const k = clamp((s - HOP) / HOPD), c = crashGame(s);
  return { seated: false, k, landed: k >= 1, x0: LANE + SEAT.x, y0: SEAT.y + 0.4, z0: c.z + SEAT.z, x1: LANE + 2.7, z1: c.z - 0.6, arc: 1.9, t: s - HOP - HOPD };
}

// ---------------------------------------------------------------- salto de rampa (take 3)
export const V2 = 120 / 3.6, ZR0 = -60, RL = 7, RH = 3;
export const TH = Math.atan2(RH, RL);
const VZ2 = V2 * Math.cos(TH), VY2 = V2 * Math.sin(TH);
export const TR = RL / VZ2;                                              // tempo subindo a rampa
export const UF = (VY2 + Math.sqrt(VY2 * VY2 + 2 * G0 * RH)) / G0;      // tempo de voo
export const TL = TR + UF;                                               // instante do pouso
export const ZLAND = ZR0 - RL - VZ2 * UF;
export const HMAX = RH + VY2 * VY2 / (2 * G0);                          // ~11,8 m
export const VFALL = G0 * UF - VY2;                                      // ~15 m/s (~55 km/h)
export const G_POUSO = VFALL / DT / G0;                                  // ~39 G
const DEC2 = 12;
export const TSTOP = VZ2 / DEC2;
export function rampCar(tau) {
  if (tau < 0) return { x: LANE, y: 0, z: ZR0 - V2 * tau, pitch: 0, yaw: 0, v: V2, vy: 0, crush: 0, phase: 'aprox', air: false };
  if (tau < TR) return { x: LANE, y: VY2 * tau, z: ZR0 - VZ2 * tau, pitch: TH, yaw: 0, v: V2, vy: VY2, crush: 0, phase: 'rampa', air: false };
  if (tau < TL) {
    const u = tau - TR;
    return { x: LANE, y: RH + VY2 * u - 0.5 * G0 * u * u, z: ZR0 - RL - VZ2 * u, pitch: TH + (-0.14 - TH) * (u / UF), yaw: 0, v: V2, vy: VY2 - G0 * u, crush: 0, phase: 'voo', air: true };
  }
  const s = tau - TL, w = Math.min(s, TSTOP), e = 1 - Math.pow(1 - w / TSTOP, 2);
  return {
    x: LANE + 1.5 * e, y: -0.32 * smooth(0, 0.04, s) + 0.4 * Math.exp(-s * 5) * Math.abs(Math.sin(s * 11)), z: ZLAND - (VZ2 * w - 0.5 * DEC2 * w * w),
    pitch: -0.14 * Math.exp(-s * 25) + 0.05 * Math.exp(-s * 3) * Math.sin(s * 12), yaw: 0.9 * e, v: s < TSTOP ? VZ2 - DEC2 * s : 0, vy: 0,
    crush: 0.5 * smooth(0, 0.05, s), phase: s < TSTOP ? 'arrastando' : 'parado', air: false, s,
  };
}
// rodas que se soltam no pouso: quicam com perda de energia e depois rolam até parar
export function wheelFree(p0, v0, age, r = 0.36) {
  let px = p0[0], py = p0[1], pz = p0[2], vx = v0[0], vy = v0[1], vz = v0[2], t = age, spin = 0;
  for (let b = 0; b < 7 && t > 0; b++) {
    const tg = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * G0 * (py - r)))) / G0;   // até tocar o chão
    if (t < tg) { return { x: px + vx * t, y: py + vy * t - 0.5 * G0 * t * t, z: pz + vz * t, spin: spin + Math.hypot(vx, vz) * t / r }; }
    px += vx * tg; pz += vz * tg; py = r; spin += Math.hypot(vx, vz) * tg / r; t -= tg;
    vy = Math.abs(vy - G0 * tg) * 0.42; vx *= 0.8; vz *= 0.8;
    if (vy < 1) break;
  }
  const sp = Math.hypot(vx, vz), tr = Math.min(t, sp / 5), d = sp * tr - 2.5 * tr * tr, k = sp > 1e-6 ? d / sp : 0;
  return { x: px + vx * k, y: r, z: pz + vz * k, spin: spin + d / r };
}

// ---------------------------------------------------------------- relógios: tempo do vídeo -> tempo simulado (câmera lenta)
// keys = [[t_video, taxa], ...] (taxa interpolada linearmente); tau(tA) = tauA
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

// relógios de cada take a partir do roteiro
export function clocks(cfg) {
  const T = cfg.tempos;
  const C = makeMap(T.realidade.taxa, T.realidade.impacto, TI);
  const D = makeMap(T.rampa.taxa, T.rampa.pouso, TL);
  const hook = (t) => TI - 0.004 + t * T.gancho.taxa;
  return { C, D, hook, T };
}

// em qual take está o instante t do vídeo, e qual o tempo simulado dele
export function takeAt(cfg, ck, t) {
  const T = ck.T;
  if (t < T.jogo.inicio) return { take: 'gancho', tau: ck.hook(t), rate: T.gancho.taxa };
  if (t < T.realidade.inicio) return { take: 'jogo', tau: t - T.jogo.inicio, rate: 1 };
  if (t < T.rampa.inicio) return { take: 'realidade', tau: ck.C.tau(t), rate: ck.C.rate(t) };
  return { take: t < T.final.inicio ? 'rampa' : 'final', tau: ck.D.tau(t), rate: ck.D.rate(t) };
}

// instantes (no vídeo) dos acontecimentos, para sincronizar os sons
export function eventTimes(cfg) {
  const ck = clocks(cfg), T = ck.T, J = T.jogo.inicio;
  return {
    ganchoImpacto: 0.004 / T.gancho.taxa, ganchoVidro: (0.004 + 0.022) / T.gancho.taxa, ganchoBoneco: (0.004 + SL) / T.gancho.taxa,
    jogoInicio: J, jogoImpacto: J + TI, jogoPulo: J + TI + HOP, jogoPouso: J + TI + HOP + HOPD,
    realInicio: T.realidade.inicio, realImpacto: T.realidade.impacto, realVidro: ck.C.inv(TI + 0.022), realBoneco: ck.C.inv(TI + SL),
    realPousoBoneco: ck.C.inv(TI + SL + UL), realBonecoPara: ck.C.inv(TI + SL + UL + TSB),
    rampaInicio: T.rampa.inicio, rampaSubida: ck.D.inv(0), rampaDecola: ck.D.inv(TR), rampaPouso: T.rampa.pouso, rampaPara: ck.D.inv(TL + TSTOP),
    finalInicio: T.final.inicio,
  };
}
