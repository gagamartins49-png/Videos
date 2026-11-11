// ============================================================================
//  "O Interrogador" — mascote 3D low-poly do Projeto E se? + Laboratório
//  Robô em forma de "?" metálico: lente azul neon no topo, painel de LED
//  lateral, dois braços articulados, raios de energia e a esfera da base
//  flutuando de forma independente. Tudo é função pura do tempo.
// ============================================================================
import * as THREE from '../../vendor/three.module.min.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const MOOD_COLORS = [new THREE.Color(0x3ad7ff), new THREE.Color(0xff9a2a), new THREE.Color(0xff2a2a)];
export const moodColor = (m) => (m <= 1 ? MOOD_COLORS[0].clone().lerp(MOOD_COLORS[1], clamp(m)) : MOOD_COLORS[1].clone().lerp(MOOD_COLORS[2], clamp(m - 1)));

function envMap(renderer) {
  // ambiente simples para reflexos metálicos (sem arquivos externos)
  const env = new THREE.Scene();
  const g = new THREE.SphereGeometry(10, 32, 16), col = [];
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; const c = new THREE.Color(0x0a1220).lerp(new THREE.Color(0x9fdcff), clamp((y + 0.2) / 1.2) ** 1.5); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  env.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  for (const [x, y, z, c] of [[6, 5, 4, 0xffffff], [-7, 3, 2, 0x3ad7ff], [0, -4, 6, 0x223344]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.2), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(env, 0.02); pm.dispose();
  return rt.texture;
}

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

// ---------------------------------------------------------------- o mascote
function buildMascot() {
  const root = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xc9d2dc, metalness: 0.85, roughness: 0.28, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x252b33, metalness: 0.6, roughness: 0.45, flatShading: true });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x0a1a24, emissive: 0x3ad7ff, emissiveIntensity: 2, roughness: 0.2 });

  // esfera da base (o "ponto" do ?) — flutua sozinha
  const dot = new THREE.Group(); root.add(dot);
  const dotBall = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), metal); dot.add(dotBall);
  const dotRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 32), glowMat); dotRing.rotation.x = Math.PI / 2; dot.add(dotRing);

  // corpo: haste + gancho do ponto de interrogação
  const body = new THREE.Group(); root.add(body);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.85, 7), metal); stem.position.y = 0.42; body.add(stem);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.05, 6, 16), dark); collar.rotation.x = Math.PI / 2; collar.position.y = 0.08; body.add(collar);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.23, 7, 18, Math.PI * 1.42), metal);
  hook.position.y = 1.5; hook.rotation.z = -Math.PI / 2; body.add(hook);
  const hookEnd = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), metal);
  { const a = -Math.PI / 2 + Math.PI * 1.42; hookEnd.position.set(Math.cos(a) * 0.62, 1.5 + Math.sin(a) * 0.62, 0); } body.add(hookEnd);
  // lente circular no topo
  const lensG = new THREE.Group(); lensG.position.set(0, 1.5 + 0.62, 0.2); body.add(lensG);
  const lensRim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 24), dark); lensG.add(lensRim);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x08141c, emissive: 0x3ad7ff, emissiveIntensity: 3, roughness: 0.1, metalness: 0.2 });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), lensMat); lens.position.z = 0.02; lensG.add(lens);
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), new THREE.MeshBasicMaterial({ color: 0xffffff })); pupil.position.z = 0.03; lensG.add(pupil);
  const lensGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: 0x3ad7ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); lensGlow.scale.setScalar(1.1); lensG.add(lensGlow);
  // painel de LED lateral (barras que pulsam com a voz)
  const panel = new THREE.Group(); panel.position.set(0.86, 1.45, 0.05); panel.rotation.y = 0.5; body.add(panel);
  const panelBase = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.4), dark); panel.add(panelBase);
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x051018, emissive: 0x3ad7ff, emissiveIntensity: 2 });
  const leds = [];
  for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.055), ledMat); l.position.set(0.06, 0, -0.14 + i * 0.07); panel.add(l); leds.push(l); }
  // braços articulados
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.27, 0.78, 0.05); body.add(sh);
    const j0 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), dark); sh.add(j0);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.5, 6), metal); up.position.y = -0.25; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.5; sh.add(el);
    const j1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), dark); el.add(j1);
    const fo = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.42, 6), metal); fo.position.y = -0.21; el.add(fo);
    const claw = new THREE.Group(); claw.position.y = -0.44; el.add(claw);
    for (const c of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.05), dark); f.position.set(c * 0.04, -0.06, 0); f.rotation.z = c * 0.35; claw.add(f); }
    const tip = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), glowMat); tip.position.y = -0.05; claw.add(tip);
    arms.push({ s, sh, el, claw });
  }
  // raios de energia
  const rayMat = new THREE.LineBasicMaterial({ color: 0x8fe8ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const rays = [];
  for (let i = 0; i < 6; i++) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9 * 3), 3)); const l = new THREE.Line(g, rayMat); body.add(l); rays.push(l); }
  root.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  function update(T, { talk = 0, mood = 0, surprise = 0, panic = 0, gesture = 1, look = 0 } = {}) {
    const col = moodColor(mood);
    const shakeA = panic * 0.05;
    const jx = shakeA * Math.sin(T * 47), jy = shakeA * Math.sin(T * 53 + 1);
    body.position.set(jx, 1.0 + 0.08 * Math.sin(T * 2.1) + 0.35 * surprise + jy, 0);
    body.rotation.set(0.04 * Math.sin(T * 1.3) - 0.15 * surprise, look + 0.12 * Math.sin(T * 0.7), 0.05 * Math.sin(T * 1.7) + panic * 0.06 * Math.sin(T * 31));
    dot.position.set(0.05 * Math.sin(T * 1.1), 0.32 + 0.07 * Math.sin(T * 2.9 + 1.3), 0.05 * Math.cos(T * 1.4));
    dot.rotation.y = T * 0.9; dotRing.rotation.z = T * 2;
    // lente e LEDs pulsando com a voz
    const e = clamp(talk);
    lensMat.emissive.copy(col); lensMat.emissiveIntensity = 2 + 5 * e + 1.5 * surprise;
    lensG.scale.setScalar(1 + 0.14 * e + 0.35 * surprise);
    pupil.scale.setScalar(1 - 0.5 * surprise + 0.3 * e);
    lensGlow.material.color.copy(col); lensGlow.material.opacity = 0.5 + 0.5 * e;
    glowMat.emissive.copy(col); ledMat.emissive.copy(col); ledMat.emissiveIntensity = 1.5 + 4 * e;
    leds.forEach((l, i) => { const h = 0.08 + 0.5 * e * (0.4 + 0.6 * hash(Math.floor(T * 15) * 7 + i)) + 0.04 * Math.sin(T * 3 + i); l.scale.y = h; });
    // braços: gestos ao falar, braços para cima em pânico
    for (const a of arms) {
      const g = gesture * (0.25 * Math.sin(T * 1.6 + a.s) + 0.6 * e * Math.sin(T * 4.3 + a.s * 2));
      a.sh.rotation.set(-0.35 + g * 0.6 - panic * 2.2, 0, a.s * (1.05 + 0.3 * e * gesture + panic * 0.5));
      a.el.rotation.set(-0.9 - 0.6 * e * gesture - panic * 0.6 + 0.1 * Math.sin(T * 2 + a.s), 0, -a.s * 0.5);
      a.claw.rotation.y = T * 1.5 * (1 + panic * 6);
      if (panic > 0) a.sh.rotation.z += a.s * 0.25 * panic * Math.sin(T * 25 + a.s);
    }
    // raios de energia (zigue-zague que muda 15x por segundo)
    rayMat.color.copy(col).lerp(new THREE.Color(0xffffff), 0.3); rayMat.opacity = 0.35 + 0.45 * e + 0.3 * panic;
    const fr = Math.floor(T * 15);
    rays.forEach((l, i) => {
      const p = l.geometry.attributes.position, a0 = hash(fr * 3 + i) * Math.PI * 2, r = 0.95 + 0.25 * hash(fr + i * 11), y0 = 0.3 + hash(fr * 5 + i) * 2.0;
      for (let k = 0; k < 9; k++) { const a = a0 + k * 0.22; p.setXYZ(k, Math.cos(a) * r + (hash(fr + k + i * 9) - 0.5) * 0.15, y0 + (hash(fr * 2 + k + i) - 0.5) * 0.35 + k * 0.05, Math.sin(a) * r * 0.6); }
      p.needsUpdate = true; l.visible = hash(fr * 13 + i) < 0.35 + 0.5 * e + 0.5 * panic;
    });
  }
  return { root, update };
}
function dotTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }

// ---------------------------------------------------------------- holograma da Terra (textura procedural)
const earthTexture = () => canvasTex(1024, 512, (g, w, h) => {
  const r = mulberry32(2024); g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(20,90,140,0.18)'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { const x = r() * w, y = h * (0.15 + r() * 0.7), rad = 20 + r() * 80; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(140,240,255,0.95)'); gr.addColorStop(0.7, 'rgba(90,210,255,0.6)'); gr.addColorStop(1, 'rgba(90,210,255,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.strokeStyle = 'rgba(160,240,255,0.35)'; g.lineWidth = 1; for (let i = 1; i < 12; i++) { g.beginPath(); g.moveTo(0, i * h / 12); g.lineTo(w, i * h / 12); g.stroke(); } for (let i = 1; i < 24; i++) { g.beginPath(); g.moveTo(i * w / 24, 0); g.lineTo(i * w / 24, h); g.stroke(); }
});

export async function createInterrogador({ width = 1920, height = 1080, quality = 1, corner = 520, levels = [] }) {
  const W = width, H = height;
  // ------------------------------------------------------------ renderizador do laboratório
  const labCanvas = document.createElement('canvas');
  const labR = new THREE.WebGLRenderer({ canvas: labCanvas, antialias: true, preserveDrawingBuffer: true });
  labR.setPixelRatio(1); labR.setSize(Math.round(W * quality), Math.round(H * quality), false);
  labR.toneMapping = THREE.ACESFilmicToneMapping; labR.toneMappingExposure = 1.1; labR.shadowMap.enabled = true;
  const lab = new THREE.Scene(); lab.background = new THREE.Color(0x03060c); lab.environment = envMap(labR); lab.fog = new THREE.Fog(0x03060c, 14, 40);
  const labCam = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
  lab.add(new THREE.HemisphereLight(0x5a8cff, 0x05070c, 0.6));
  const key = new THREE.SpotLight(0xffffff, 60, 30, 0.6, 0.5); key.position.set(-4, 6, 6); key.target.position.set(0, 1.5, 1); key.castShadow = true; lab.add(key, key.target);
  const rim = new THREE.PointLight(0x3ad7ff, 25, 15); rim.position.set(2.5, 3.5, -2); lab.add(rim);
  const moodLight = new THREE.PointLight(0x3ad7ff, 8, 12); moodLight.position.set(0, 2.5, 3); lab.add(moodLight);
  // piso, grade, paredes
  const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshStandardMaterial({ color: 0x0b1220, metalness: 0.6, roughness: 0.35 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; lab.add(floor);
  const grid = new THREE.GridHelper(32, 40, 0x1f6f9a, 0x123248); grid.material.transparent = true; grid.material.opacity = 0.35; grid.position.y = 0.01; lab.add(grid);
  const pad = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 48), new THREE.MeshBasicMaterial({ color: 0x3ad7ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.02, 1.2); lab.add(pad);
  const wallTx = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#060b14'; g.fillRect(0, 0, w, h); const r = mulberry32(8); for (let i = 0; i < 70; i++) { const x = r() * w; g.fillStyle = `rgba(58,215,255,${0.08 + r() * 0.35})`; g.fillRect(x, 0, 1 + r() * 3, h); } for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(58,215,255,${0.1 + r() * 0.3})`; g.fillRect(r() * w, r() * h, 20 + r() * 80, 3); } });
  wallTx.wrapS = THREE.RepeatWrapping; wallTx.repeat.set(3, 1);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 9, 48, 1, true), new THREE.MeshStandardMaterial({ map: wallTx, emissiveMap: wallTx, emissive: 0xffffff, emissiveIntensity: 0.7, side: THREE.BackSide, roughness: 0.8 }));
  wall.position.y = 4.4; lab.add(wall);
  // holograma da Terra + projetor
  const holo = new THREE.Group(); holo.position.set(0, 3.15, -3.2); lab.add(holo);
  const earthMat = new THREE.MeshBasicMaterial({ map: earthTexture(), transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(2.3, 48, 24), earthMat); holo.add(earth);
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2.36, 2)), new THREE.LineBasicMaterial({ color: 0x3ad7ff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })); holo.add(wire);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(2.6, 32, 16), new THREE.MeshBasicMaterial({ color: 0x6fd8ff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide })); holo.add(atmo);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.015, 4, 96), new THREE.MeshBasicMaterial({ color: 0x3ad7ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })); orbit.rotation.x = Math.PI / 2.3; holo.add(orbit);
  const sat = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })); holo.add(sat);
  const satDisk = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.0, 48), new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })); sat.add(satDisk); satDisk.rotation.x = 1.2;
  const projector = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 0.35, 24), new THREE.MeshStandardMaterial({ color: 0x1a2430, metalness: 0.8, roughness: 0.3, emissive: 0x0a3a50 })); projector.position.set(0, 0.18, -3.2); lab.add(projector);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 0.8, 1.6, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x3ad7ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.set(0, 1.1, -3.2); lab.add(beam);
  // painel holográfico com o nível
  const panelC = document.createElement('canvas'); panelC.width = 1024; panelC.height = 640;
  const panelTx = new THREE.CanvasTexture(panelC); panelTx.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.25), new THREE.MeshBasicMaterial({ map: panelTx, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  panel.position.set(4.3, 2.9, -1.2); panel.rotation.y = -0.45; lab.add(panel);
  let panelKey = '';
  function drawPanel(level) {
    const k = String(level); if (k === panelKey) return; panelKey = k;
    const g = panelC.getContext('2d'), w = panelC.width, h = panelC.height;
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(58,215,255,0.9)'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = 'rgba(58,215,255,0.12)'; g.fillRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#9fe8ff'; g.font = '700 54px "Roboto Mono", "DejaVu Sans Mono", monospace'; g.textAlign = 'left';
    const L = levels[level];
    if (level === 0 || level === 8) {
      g.fillText(level === 0 ? 'PROTOCOLO DE TESTE' : 'FIM DOS TESTES', 50, 100);
      g.font = '400 150px "Anton", "Impact", sans-serif'; g.fillStyle = '#ffffff'; g.fillText(level === 0 ? '7 NÍVEIS' : '?', 50, 300);
      g.font = '700 40px "Roboto Mono", monospace'; g.fillStyle = '#9fe8ff';
      for (let i = 1; i <= 7; i++) { g.fillStyle = `rgba(${Math.round(58 + i * 28)},${Math.round(215 - i * 25)},${Math.round(255 - i * 32)},1)`; g.fillRect(50 + (i - 1) * 130, 380, 110, 26 + i * 18); }
      g.fillStyle = '#9fe8ff'; g.fillText('SILENCIOSO  →  ESPAÇO-TEMPO', 50, 580);
    } else if (L) {
      g.fillText(`NÍVEL ${level} DE 7`, 50, 100);
      g.font = '400 92px "Anton", "Impact", sans-serif'; g.fillStyle = '#ffffff';
      const words = L.titulo.toUpperCase().split(' '); let line = '', y = 230;
      for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w - 100 && line) { g.fillText(line, 50, y); line = wd; y += 100; } else line = t; }
      g.fillText(line, 50, y);
      g.font = '700 40px "Roboto Mono", monospace'; g.fillStyle = '#9fe8ff'; g.fillText('PERIGO:', 50, 560);
      for (let i = 0; i < 7; i++) { g.fillStyle = i < level ? (i < 3 ? '#ffd23f' : i < 5 ? '#ff9a2a' : '#ff3b3b') : 'rgba(255,255,255,0.15)'; g.fillRect(260 + i * 95, 520, 80, 50); }
    }
    panelTx.needsUpdate = true;
  }
  // faíscas (encerramento) e poeira de luz
  const NSP = 700, spPos = new Float32Array(NSP * 3), spSeed = [];
  { const r = mulberry32(55); for (let i = 0; i < NSP; i++) spSeed.push({ a: r() * Math.PI * 2, v: 2 + r() * 5, up: 2 + r() * 6, t0: r() * 3, k: r() }); }
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const spMat = new THREE.PointsMaterial({ size: 0.06, color: 0xffb060, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const sparks = new THREE.Points(spGeo, spMat); sparks.frustumCulled = false; lab.add(sparks);

  const mascot = buildMascot();
  mascot.root.position.set(0, 0, 1.2);
  lab.add(mascot.root);

  // ------------------------------------------------------------ renderizador do canto (mascote reagindo à simulação)
  const cornerCanvas = document.createElement('canvas');
  const cornerR = new THREE.WebGLRenderer({ canvas: cornerCanvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  cornerR.setPixelRatio(1); cornerR.setSize(corner, corner, false); cornerR.setClearColor(0x000000, 0);
  cornerR.toneMapping = THREE.ACESFilmicToneMapping; cornerR.toneMappingExposure = 1.15;
  const cs = new THREE.Scene(); cs.environment = envMap(cornerR);
  cs.add(new THREE.HemisphereLight(0x9fd0ff, 0x101820, 1.2));
  const ck = new THREE.DirectionalLight(0xffffff, 2.5); ck.position.set(-3, 5, 5); cs.add(ck);
  const cMood = new THREE.PointLight(0x3ad7ff, 6, 8); cMood.position.set(0, 2.2, 2.5); cs.add(cMood);
  const cCam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cCam.position.set(1.4, 2.0, 7.4); cCam.lookAt(0, 1.6, 0);

  // ------------------------------------------------------------ API
  function renderLab(T, { level = 0, tau = 0, talk = 0, mood = 0, surprise = 0 } = {}) {
    if (mascot.root.parent !== lab) { lab.add(mascot.root); mascot.root.position.set(0, 0, 1.2); mascot.root.rotation.set(0, 0, 0); }
    drawPanel(level);
    mascot.update(T, { talk, mood, surprise, panic: 0, gesture: 1, look: 0.15 * Math.sin(T * 0.5) });
    const col = MOOD_COLORS[0].clone().lerp(new THREE.Color(0xff9a2a), clamp(mood));
    moodLight.color.copy(col); rim.color.copy(col); pad.material.color.copy(col);
    // câmera: leve "dolly" dentro de cada visita ao laboratório
    labCam.position.set(Math.sin(T * 0.13) * 0.6, 2.35 + 0.1 * Math.sin(T * 0.2), 8.6 - Math.min(tau, 15) * 0.06);
    labCam.lookAt(0, 2.15, 0);
    // holograma: Terra girando + destaque do nível atual
    const rotSpeed = level === 2 ? 0.5 * (1 - smooth(6, 13, tau)) : 0.5;
    earth.rotation.y = level === 2 ? T * 0.5 * (tau < 6 ? 1 : 0) + (tau < 6 ? 0 : 3 + (tau - 6) * rotSpeed) : T * 0.5;
    wire.rotation.y = earth.rotation.y * 0.5;
    earthMat.color.copy(new THREE.Color(0xffffff).lerp(new THREE.Color(0xff5a30), level === 3 ? smooth(4, 13, tau) : 0).lerp(new THREE.Color(0x9fb8ff), level === 5 ? smooth(8, 12, tau) * 0.6 : 0));
    atmo.material.opacity = level === 1 ? 0.08 * (1 - smooth(6, 12, tau)) : 0.08;
    const sq = level === 4 ? 1 - 0.18 * smooth(5, 13, tau) * (0.6 + 0.4 * Math.sin(T * 6)) : 1; earth.scale.set(1, sq, 1);
    sat.visible = level === 5 || level === 6 || level === 7;
    satDisk.material.opacity = 0;
    if (level === 5) { sat.position.set(-4.6, 1.2, 0); sat.material.color.setHex(0xffd060); sat.material.opacity = 1 - smooth(8, 9.5, tau); sat.scale.setScalar(1.6); }
    if (level === 6) { const r = lerp(3.4, 2.7, smooth(5, 14, tau)), a = T * 0.8; sat.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.35, Math.sin(a) * r); sat.material.color.setHex(0xdfe6ee); sat.material.opacity = 0.95; sat.scale.setScalar(0.8 + 0.5 * smooth(5, 14, tau)); }
    if (level === 7) { sat.position.set(3.2, 0.3, 0.6); sat.material.color.setHex(0x000000); sat.material.opacity = 1; sat.scale.setScalar(0.4 + 0.8 * smooth(6, 14, tau)); satDisk.material.opacity = 0.9; satDisk.rotation.z = T * 3; }
    holo.rotation.y = 0.15 * Math.sin(T * 0.3);
    beam.material.opacity = 0.08 + 0.04 * Math.sin(T * 3);
    // faíscas no encerramento
    spMat.opacity = level === 8 ? 0.95 : 0;
    if (level === 8) {
      for (let i = 0; i < NSP; i++) { const s = spSeed[i], dt = (tau + s.t0) % 3; spPos[i * 3] = Math.cos(s.a) * s.v * dt * 0.4; spPos[i * 3 + 1] = 2 + s.up * dt * 0.5 - 4.9 * dt * dt * 0.3; spPos[i * 3 + 2] = 1.2 + Math.sin(s.a) * s.v * dt * 0.3; }
      spGeo.attributes.position.needsUpdate = true;
    }
    labR.render(lab, labCam);
    return labCanvas;
  }
  function renderCorner(T, { talk = 0, mood = 0, surprise = 0, panic = 0 } = {}) {
    if (mascot.root.parent !== cs) { cs.add(mascot.root); mascot.root.position.set(0, 0, 0); mascot.root.rotation.set(0, -0.45, 0); }
    mascot.update(T, { talk, mood, surprise, panic, gesture: 0.6, look: -0.2 });
    cMood.color.copy(moodColor(mood)); cMood.intensity = 6 + 6 * panic;
    cornerR.render(cs, cCam);
    return cornerCanvas;
  }
  // compila os shaders das duas cenas
  renderLab(0, {}); renderCorner(0, {});
  return { renderLab, renderCorner, labCanvas, cornerCanvas };
}
