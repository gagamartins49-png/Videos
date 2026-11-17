// ============================================================================
//  Personagens em estilo anime (cel-shading + contorno) — Projeto E se? #011
//  Dois lutadores ORIGINAIS que só lembram arquétipos de anime (paródia, sem copiar designs):
//    • "guerreiro": cabelo espetado prateado que fica elétrico na transformação, quimono vinho.
//    • "ninja": cabelo escuro, faixa na testa com símbolo de onda, cachecol vermelho, olhos roxos na ilusão.
//  Esqueleto simples com poses nomeadas; tudo controlado por set(pose, opções).
// ============================================================================
import * as THREE from '../../vendor/three.module.min.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;

// rampa de 3 tons (cel-shading)
let RAMP = null;
function ramp() {
  if (RAMP) return RAMP;
  const d = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  RAMP = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); RAMP.minFilter = RAMP.magFilter = THREE.NearestFilter; RAMP.needsUpdate = true;
  return RAMP;
}
export const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: ramp(), ...extra });
const INK = new THREE.MeshBasicMaterial({ color: 0x0b0710, side: THREE.BackSide });

// adiciona contorno (casca invertida) a uma malha
function outline(mesh, k = 0.045) {
  const o = new THREE.Mesh(mesh.geometry, INK); o.scale.setScalar(1 + k); o.userData.outline = true; mesh.add(o); return mesh;
}
function part(geo, mat, k) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; outline(m, k); return m; }
const cap = (r, l, mat, k = 0.05) => part(new THREE.CapsuleGeometry(r, l, 6, 14), mat, k);
const ball = (r, mat, k = 0.04) => part(new THREE.SphereGeometry(r, 24, 16), mat, k);

// ---------------------------------------------------------------- rosto (textura com expressões)
function faceTextures(kind) {
  const make = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.clearRect(0, 0, 512, 512); draw(g); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const eyeCol = kind === 'guerreiro' ? '#1e2a55' : '#2a6fd0';
  const eye = (g, x, y, mood, glow) => {
    g.save(); g.translate(x, y);
    if (mood === 'closed') { g.strokeStyle = '#140c10'; g.lineWidth = 12; g.beginPath(); g.moveTo(-50, 0); g.quadraticCurveTo(0, 18, 50, 0); g.stroke(); g.restore(); return; }
    const h = mood === 'shout' || mood === 'surprise' ? 70 : mood === 'angry' ? 46 : 58;
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 6, 48, h, 0, 0, Math.PI * 2); g.fill();
    const ic = glow ? '#b44dff' : eyeCol;
    const gr = g.createLinearGradient(0, -40, 0, 50); gr.addColorStop(0, '#0a0a14'); gr.addColorStop(0.5, ic); gr.addColorStop(1, glow ? '#ffd6ff' : '#9fd0ff');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 10, mood === 'surprise' ? 20 : 30, h * 0.72, 0, 0, Math.PI * 2); g.fill();
    if (glow) { g.strokeStyle = '#1a0024'; g.lineWidth = 4; for (const r of [10, 18]) { g.beginPath(); g.arc(0, 10, r, 0, Math.PI * 2); g.stroke(); } }
    else { g.fillStyle = '#05050a'; g.beginPath(); g.ellipse(0, 10, 12, 22, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-12, -14, 10, 14, -0.3, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(12, 30, 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#140c10'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.ellipse(0, 6, 50, h + 2, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    g.restore();
  };
  const brows = (g, mood, s) => { g.strokeStyle = '#140c10'; g.lineWidth = 14; g.lineCap = 'round'; const tilt = mood === 'angry' || mood === 'shout' ? 26 : mood === 'surprise' ? -14 : 6; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(256 + sd * 40, 150 + (mood === 'surprise' ? -20 : 0) + tilt); g.lineTo(256 + sd * 130, 140 + (mood === 'surprise' ? -26 : 0) - tilt * 0.4); g.stroke(); } };
  const mouth = (g, mood) => {
    g.strokeStyle = '#140c10'; g.lineWidth = 9; g.lineCap = 'round'; g.fillStyle = '#5a1018';
    if (mood === 'shout') { g.beginPath(); g.moveTo(206, 380); g.quadraticCurveTo(256, 470, 306, 380); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.fillRect(222, 382, 68, 12); }
    else if (mood === 'surprise') { g.beginPath(); g.ellipse(256, 395, 18, 26, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
    else if (mood === 'smirk') { g.beginPath(); g.moveTo(226, 392); g.quadraticCurveTo(262, 402, 292, 380); g.stroke(); }
    else if (mood === 'angry') { g.beginPath(); g.moveTo(224, 398); g.lineTo(288, 392); g.stroke(); }
    else { g.beginPath(); g.moveTo(232, 392); g.quadraticCurveTo(256, 400, 280, 392); g.stroke(); }
  };
  const extras = (g) => { if (kind === 'guerreiro') { g.strokeStyle = 'rgba(140,40,40,0.5)'; g.lineWidth = 5; g.beginPath(); g.moveTo(330, 300); g.lineTo(350, 330); g.stroke(); } };
  const moods = ['neutral', 'angry', 'shout', 'surprise', 'closed', 'smirk', 'glow'];
  const out = {};
  for (const m of moods) out[m] = make((g) => { brows(g, m === 'glow' ? 'angry' : m, 0); for (const sd of [-1, 1]) eye(g, 256 + sd * 88, 250, m === 'glow' ? 'angry' : m, m === 'glow'); mouth(g, m === 'glow' ? 'smirk' : m); extras(g); g.strokeStyle = 'rgba(20,12,16,0.6)'; g.lineWidth = 6; g.beginPath(); g.moveTo(256, 300); g.lineTo(248, 330); g.lineTo(258, 332); g.stroke(); });
  return out;
}

// ---------------------------------------------------------------- poses (ângulos em radianos)
// chaves: hips(x,y,z rot), spine, chest, head, sL/sR (ombro: x frente, z abre), eL/eR (cotovelo), tL/tR (coxa), kL/kR (joelho), y (altura do quadril extra)
export const POSES = {
  idle:    { spine: 0.05, head: 0, sL: [0.1, 0, -0.15], sR: [0.1, 0, 0.15], eL: -0.25, eR: -0.25, tL: [0, 0, 0.05], tR: [0, 0, -0.05], kL: 0.05, kR: 0.05 },
  guarda:  { spine: 0.18, head: -0.12, sL: [1.0, 0.3, -0.25], sR: [0.7, -0.3, 0.35], eL: -1.6, eR: -1.9, tL: [-0.35, 0, 0.18], tR: [0.45, 0, -0.18], kL: 0.55, kR: 0.4, y: -0.1 },
  soco:    { spine: 0.25, hipsY: -0.5, head: -0.1, sL: [1.55, 0, -0.1], sR: [0.6, -0.3, 0.45], eL: -0.05, eR: -2.0, tL: [-0.6, 0, 0.15], tR: [0.6, 0, -0.15], kL: 0.4, kR: 0.2, y: -0.12 },
  chute:   { spine: -0.35, head: 0.1, sL: [0.3, 0, -0.9], sR: [0.4, 0, 0.9], eL: -0.6, eR: -0.6, tL: [1.55, 0, 0.1], tR: [-0.2, 0, -0.05], kL: 0.1, kR: 0.3 },
  voo:     { hipsX: -1.3, spine: 0.1, head: 0.9, sL: [2.9, 0, -0.1], sR: [0.2, 0, 0.3], eL: -0.1, eR: -0.4, tL: [0.1, 0, 0.05], tR: [-0.2, 0, -0.05], kL: 0.3, kR: 0.6 },
  queda:   { hipsX: 0.2, spine: 0.1, head: -0.2, sL: [-0.4, 0, -1.2], sR: [-0.4, 0, 1.2], eL: -0.4, eR: -0.4, tL: [0.5, 0, 0.2], tR: [0.2, 0, -0.2], kL: 1.0, kR: 0.6 },
  pouso:   { spine: 0.7, head: -0.55, sL: [0.4, 0, -0.9], sR: [1.2, 0, 0.4], eL: -0.2, eR: -0.6, tL: [1.6, 0, 0.2], tR: [-0.3, 0, -0.25], kL: 2.2, kR: 2.0, y: -0.55 },
  esquiva: { hipsZ: 0.5, spine: 0.3, head: 0.2, sL: [0.9, 0, -0.6], sR: [0.6, 0, 0.9], eL: -1.2, eR: -1.4, tL: [0.4, 0, 0.4], tR: [-0.2, 0, -0.3], kL: 0.9, kR: 0.5, y: -0.2 },
  selo:    { spine: 0.1, head: -0.15, sL: [1.2, 0.6, -0.1], sR: [1.2, -0.6, 0.1], eL: -1.7, eR: -1.7, tL: [-0.2, 0, 0.25], tR: [0.2, 0, -0.25], kL: 0.35, kR: 0.35, y: -0.08 },
  arremesso: { spine: -0.2, head: 0.05, sL: [2.6, -0.3, -0.2], sR: [0.6, 0, 0.6], eL: -0.3, eR: -1.2, tL: [-0.5, 0, 0.2], tR: [0.6, 0, -0.2], kL: 0.4, kR: 0.3 },
  preso:   { spine: 0.05, head: 0.35, sL: [-0.2, 0, -0.5], sR: [-0.2, 0, 0.5], eL: -0.2, eR: -0.2, tL: [0, 0, 0.12], tR: [0, 0, -0.12], kL: 0.1, kR: 0.1 },
  poder:   { spine: -0.25, head: 0.55, sL: [0.4, 0, -0.7], sR: [0.4, 0, 0.7], eL: -1.9, eR: -1.9, tL: [-0.3, 0, 0.45], tR: [-0.3, 0, -0.45], kL: 0.7, kR: 0.7, y: -0.18 },
  esfera:  { spine: 0.2, head: -0.15, sL: [1.5, 0, -0.1], sR: [0.8, 0, 0.6], eL: -0.2, eR: -1.6, tL: [-0.7, 0, 0.1], tR: [0.6, 0, -0.1], kL: 0.2, kR: 0.4 },
  atingido: { hipsX: 0.3, spine: -0.6, head: 0.6, sL: [-0.6, 0, -1.3], sR: [-0.6, 0, 1.3], eL: -0.3, eR: -0.3, tL: [0.6, 0, 0.2], tR: [0.3, 0, -0.2], kL: 0.9, kR: 0.5 },
};
export function mixPose(a, b, u) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[k] ?? (Array.isArray(b[k]) ? [0, 0, 0] : 0), vb = b[k] ?? (Array.isArray(a[k]) ? [0, 0, 0] : 0);
    out[k] = Array.isArray(va) ? va.map((x, i) => lerp(x, vb[i], u)) : lerp(va, vb, u);
  }
  return out;
}

// ---------------------------------------------------------------- construtor
export function buildFighter(kind) {
  const G = kind === 'guerreiro';
  const skin = toon(0xf6c9a4);
  const top = toon(G ? 0x8c1c2c : 0x1d2a3a), under = toon(G ? 0x1a1f3a : 0x3c4654), pants = toon(G ? 0x8c1c2c : 0x232c38);
  const belt = toon(G ? 0x2b54c8 : 0x5a6470), boots = toon(G ? 0x2a1d17 : 0x1a1d22), hairC = G ? 0xd7dde8 : 0x17181e;
  const hair = toon(hairC, { emissive: 0x000000 });
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
  hips.add(cap(0.16, 0.1, pants).translateY(0.0));
  const beltM = part(new THREE.CylinderGeometry(0.165, 0.17, 0.07, 20), belt, 0.04); beltM.position.y = 0.07; hips.add(beltM);
  const spine = new THREE.Group(); spine.position.y = 0.1; hips.add(spine);
  const chest = new THREE.Group(); chest.position.y = 0.22; spine.add(chest);
  const torso = cap(0.19, 0.22, top); torso.scale.set(1.15, 1, 0.78); torso.position.y = 0.05; chest.add(torso);
  const v = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 3), under); v.rotation.x = Math.PI; v.position.set(0, 0.17, -0.13); v.scale.z = 0.3; chest.add(v);
  if (!G) { const vest = cap(0.2, 0.16, toon(0x56616d)); vest.scale.set(1.18, 1, 0.82); vest.position.y = 0.06; chest.add(vest); }
  const neck = new THREE.Group(); neck.position.y = 0.3; chest.add(neck);
  neck.add(cap(0.06, 0.06, skin).translateY(0.04));
  const head = new THREE.Group(); head.position.y = 0.17; neck.add(head);
  const skull = ball(0.15, skin); skull.scale.set(0.95, 1.05, 1); head.add(skull);
  const jaw = ball(0.11, skin, 0.03); jaw.scale.set(1, 0.9, 0.95); jaw.position.set(0, -0.07, -0.025); head.add(jaw);
  for (const s of [-1, 1]) { const ear = ball(0.035, skin, 0.05); ear.scale.set(0.5, 1, 0.8); ear.position.set(s * 0.145, -0.01, 0.01); head.add(ear); }
  // rosto (decalque na frente)
  const faces = faceTextures(kind);
  const faceMat = new THREE.MeshBasicMaterial({ map: faces.neutral, transparent: true, depthWrite: false });
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.152, 32, 24, Math.PI * 1.12, Math.PI * 0.76, Math.PI * 0.25, Math.PI * 0.5), faceMat);   // centrado em -z (frente)
  face.scale.set(0.96, 1.06, 1.01); head.add(face);
  // cabelo: espinhos
  const hairG = new THREE.Group(); head.add(hairG);
  const spikes = [];
  const spike = (len, r, rx, ry, rz, px, py, pz) => { const m = part(new THREE.ConeGeometry(r, len, 6), hair, 0.06); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); m.translateY(len / 2); hairG.add(m); spikes.push(m); };
  const cap0 = ball(0.158, hair, 0.04); cap0.scale.set(1, 0.9, 1.04); cap0.position.set(0, 0.04, 0.02); hairG.add(cap0);
  const ring = (len, r, rx, rzs, lift = 0) => { for (const rz of rzs) { const d = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(rx, 0, rz)); spike(len * (0.9 + 0.2 * Math.abs(Math.sin(rz * 7 + rx * 3))), r, rx, 0, rz, d.x * 0.1, 0.04 + d.y * 0.1 + lift, 0.02 + d.z * 0.1); } };
  if (G) {
    ring(0.2, 0.055, -0.95, [-0.55, 0, 0.55]);            // franja
    ring(0.4, 0.075, -0.25, [-0.7, -0.25, 0.25, 0.7]);    // topo
    ring(0.36, 0.075, 0.55, [-0.85, -0.3, 0.3, 0.85]);    // trás
    ring(0.3, 0.07, 1.25, [-0.5, 0, 0.5]);               // nuca
    ring(0.26, 0.06, 0.15, [-1.35, 1.35]);               // laterais
  } else {
    ring(0.24, 0.06, 0.45, [-0.55, 0, 0.55]);           // topo, para trás
    ring(0.26, 0.065, 1.05, [-0.9, -0.3, 0.3, 0.9]);     // trás
    ring(0.22, 0.06, 1.6, [-0.4, 0.4]);                 // nuca
    ring(0.2, 0.055, 0.5, [-1.25, 1.25]);               // laterais
    ring(0.13, 0.045, -1.05, [-0.45, 0.1, 0.5]);        // franja (sobre a faixa)
    // faixa na testa com placa e símbolo de onda
    const band = part(new THREE.TorusGeometry(0.152, 0.018, 8, 40), toon(0x1a2a5a), 0.05); band.rotation.x = Math.PI / 2 - 0.15; band.position.set(0, 0.06, 0); band.scale.set(1, 1.04, 1); head.add(band);
    const plateTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#dfe6ee'); gr.addColorStop(1, '#8e9aa8'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#2a3040'; g.lineWidth = 9; g.beginPath(); for (let x = 30; x <= 226; x += 4) { const y = 64 + 20 * Math.sin((x - 30) / 196 * Math.PI * 2); x === 30 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); g.fillStyle = '#2a3040'; for (const x of [16, 240]) { g.beginPath(); g.arc(x, 64, 6, 0, 6.28); g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.07, 0.015), [toon(0x9aa6b4), toon(0x9aa6b4), toon(0x9aa6b4), toon(0x9aa6b4), new THREE.MeshToonMaterial({ map: plateTex, gradientMap: ramp() }), toon(0x9aa6b4)]);
    plate.position.set(0, 0.075, -0.15); plate.rotation.x = -0.15; outline(plate, 0.08); head.add(plate);
    // cachecol
    const scarf = part(new THREE.TorusGeometry(0.085, 0.035, 8, 24), toon(0xc8202c), 0.06); scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.28; chest.add(scarf);
  }
  // braços e pernas
  const limb = (parent, x, y, r1, l1, r2, l2, m1, m2, endMat, endR) => {
    const sh = new THREE.Group(); sh.position.set(x, y, 0); parent.add(sh);
    const up = cap(r1, l1, m1); up.position.y = -l1 / 2 - r1 * 0.5; sh.add(up);
    const el = new THREE.Group(); el.position.y = -l1 - r1; sh.add(el);
    const lo = cap(r2, l2, m2); lo.position.y = -l2 / 2 - r2 * 0.5; el.add(lo);
    const end = ball(endR, endMat); end.position.y = -l2 - r2 * 1.4; el.add(end);
    return { sh, el, end };
  };
  const arms = { L: limb(chest, -0.27, 0.2, 0.065, 0.2, 0.055, 0.18, G ? skin : top, skin, skin, 0.06), R: limb(chest, 0.27, 0.2, 0.065, 0.2, 0.055, 0.18, G ? skin : top, skin, skin, 0.06) };
  if (G) for (const s of ['L', 'R']) { const wb = part(new THREE.CylinderGeometry(0.063, 0.063, 0.08, 16), belt, 0.05); wb.position.y = -0.2; arms[s].el.add(wb); }
  const legs = { L: limb(hips, -0.1, -0.04, 0.085, 0.32, 0.07, 0.3, pants, pants, boots, 0.085), R: limb(hips, 0.1, -0.04, 0.085, 0.32, 0.07, 0.3, pants, pants, boots, 0.085) };
  for (const s of ['L', 'R']) { legs[s].end.scale.set(1, 0.7, 1.6); legs[s].end.position.z = -0.04; }
  root.traverse((m) => { if (m.isMesh && !m.userData.outline) m.castShadow = true; });

  function set(p, { mood = 'neutral', glow = 0, hairGlow = 0 } = {}) {
    hips.rotation.set(p.hipsX || 0, p.hipsY || 0, p.hipsZ || 0); hips.position.y = 0.95 + (p.y || 0);
    spine.rotation.x = -(p.spine || 0); chest.rotation.x = -(p.spine || 0) * 0.4; head.rotation.set(p.head || 0, p.headY || 0, 0);
    const A = (o, s) => o ? s.rotation.set(o[0], o[1], o[2]) : s.rotation.set(0, 0, 0);   // x>0: membro vai para a frente (-z)
    A(p.sL, arms.L.sh); A(p.sR, arms.R.sh);
    arms.L.el.rotation.set(-(p.eL || 0), 0, 0); arms.R.el.rotation.set(-(p.eR || 0), 0, 0);   // cotovelo dobra para a frente
    A(p.tL, legs.L.sh); A(p.tR, legs.R.sh); legs.L.el.rotation.x = -(p.kL || 0); legs.R.el.rotation.x = -(p.kR || 0);   // joelho dobra para trás
    faceMat.map = faces[glow > 0.5 ? 'glow' : mood] || faces.neutral;
    hair.emissive.setHex(G ? 0x7fd8ff : 0x000000); hair.emissiveIntensity = hairGlow * 1.4;
    hair.color.setHex(G ? (hairGlow > 0.3 ? 0xe8fbff : hairC) : hairC);
  }
  set(POSES.idle);
  return { root, set, hips, head, chest, arms, legs, spikes };
}
