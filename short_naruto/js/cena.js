// ============================================================================
//  Cena 3D do Short "E se o Goku fosse parar no universo do Naruto?" (Projeto E se? #011)
//  Vila ninja ORIGINAL ao pôr do sol, em cel-shading com contorno. Portal, cratera, clones de
//  fumaça, kunais explosivas, mundo da ilusão (vermelho), círculo de selamento com correntes,
//  aura de poder, pedras flutuando, raio de energia e o tronco da substituição.
//  renderFrame(t) é FUNÇÃO PURA do tempo.
// ============================================================================
import * as THREE from '../../vendor/three.module.min.js';
import * as L from './linha.js';
import { buildFighter, toon } from './personagens.js';

const { clamp, smooth, lerp, hash } = L;

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  if (repeat) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(repeat[0], repeat[1]); }
  return tx;
}
const INK = new THREE.MeshBasicMaterial({ color: 0x0b0710, side: THREE.BackSide });
function inked(mesh, k = 0.03) { const o = new THREE.Mesh(mesh.geometry, INK); o.scale.setScalar(1 + k); mesh.add(o); return mesh; }

// nuvem de fumaça estilo anime (círculos com contorno e sombra chapada)
function puffTex(fill, shade, line, core) {
  return canvasTex(256, 256, (g) => {
    const C = [[128, 140, 70], [80, 150, 50], [176, 150, 52], [110, 96, 52], [156, 100, 48], [128, 176, 46]];
    g.fillStyle = line; for (const [x, y, r] of C) { g.beginPath(); g.arc(x, y, r + 7, 0, 6.29); g.fill(); }
    g.fillStyle = shade; for (const [x, y, r] of C) { g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill(); }
    g.fillStyle = fill; for (const [x, y, r] of C) { g.beginPath(); g.arc(x - r * 0.18, y - r * 0.22, r * 0.78, 0, 6.29); g.fill(); }
    if (core) { g.fillStyle = core; for (const [x, y, r] of C.slice(0, 3)) { g.beginPath(); g.arc(x - r * 0.25, y - r * 0.3, r * 0.42, 0, 6.29); g.fill(); } }
  });
}
const glowTex = (rgb) => canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},0.55)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });

export async function createScene({ width = 1080, height = 1920, quality = 0.8 }) {
  const W = width, H = height;
  const glCanvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(Math.round(W * quality), Math.round(H * quality), false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.05, 600);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe8ff, 50, 220);

  // ------------------------------------------------------------ céu (pôr do sol) e céu da ilusão
  const skyReal = canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a6ad8'); gr.addColorStop(0.4, '#5aa8f0'); gr.addColorStop(0.56, '#bfe6ff'); gr.addColorStop(0.6, '#e8f6ff'); gr.addColorStop(1, '#7ab86a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const skyIll = canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#120006'); gr.addColorStop(0.35, '#5a0010'); gr.addColorStop(0.55, '#d11a22'); gr.addColorStop(0.62, '#ff4a3a'); gr.addColorStop(1, '#1a0004'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const skyGeo = new THREE.SphereGeometry(400, 32, 24);
  const skyM = new THREE.MeshBasicMaterial({ map: skyReal, side: THREE.BackSide, fog: false, depthWrite: false });
  const skyM2 = new THREE.MeshBasicMaterial({ map: skyIll, side: THREE.BackSide, fog: false, depthWrite: false, transparent: true, opacity: 0 });
  const sky = new THREE.Mesh(skyGeo, skyM); sky.renderOrder = -10; scene.add(sky);
  const sky2 = new THREE.Mesh(skyGeo, skyM2); sky2.scale.setScalar(0.99); sky2.renderOrder = -9; scene.add(sky2);
  const SUN_DIR = new THREE.Vector3(-0.6, 0.75, -0.3).normalize();
  const sunTex = glowTex('255,236,190');
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
  sun.position.copy(SUN_DIR).multiplyScalar(330); sun.scale.setScalar(120); scene.add(sun);
  const sunDisk = new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.MeshBasicMaterial({ color: 0xfff1c8, fog: false }));
  sunDisk.position.copy(SUN_DIR).multiplyScalar(340); sunDisk.lookAt(0, 0, 0); scene.add(sunDisk);
  const moonM = new THREE.MeshBasicMaterial({ color: 0xff2030, fog: false, transparent: true, opacity: 0 });
  const moon = new THREE.Mesh(new THREE.CircleGeometry(34, 48), moonM); moon.position.set(-60, 120, -300); moon.lookAt(0, 0, 0); scene.add(moon);
  // nuvens chapadas em camadas
  const cloudTex = canvasTex(512, 160, (g, w, h) => {
    const C = [[90, 100, 50], [170, 80, 66], [260, 90, 60], [340, 100, 52], [420, 108, 40], [210, 115, 50]];
    g.fillStyle = '#ffffff'; for (const [x, y, r] of C) { g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill(); }
    g.fillStyle = '#d8e8f8'; g.fillRect(0, 118, w, 60);
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = '#000'; for (const [x, y, r] of C) { g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill(); }
  });
  const clouds = new THREE.Group(); scene.add(clouds);
  for (let i = 0; i < 18; i++) {
    const a = hash(i) * Math.PI * 2, r = 160 + hash(i + 4) * 120;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.31), new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, fog: false, depthWrite: false, opacity: 0.85 }));
    const s = 50 + hash(i + 8) * 70; m.scale.set(s, s, 1); m.position.set(Math.cos(a) * r, 14 + hash(i + 2) * 70, Math.sin(a) * r); m.lookAt(0, m.position.y * 0.6, 0); m.renderOrder = -8; clouds.add(m);
  }

  // ------------------------------------------------------------ luz
  const hemi = new THREE.HemisphereLight(0xdff0ff, 0x5a7a3a, 1.0); scene.add(hemi);
  const sunL = new THREE.DirectionalLight(0xfff4e0, 2.4);
  sunL.position.copy(SUN_DIR).multiplyScalar(30); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
  const sc = sunL.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 90; sunL.shadow.bias = -0.0008;
  scene.add(sunL); scene.add(sunL.target);
  const rim = new THREE.DirectionalLight(0x9ab8ff, 0.8); rim.position.set(6, 8, 10); scene.add(rim);
  const fxLight = new THREE.PointLight(0xffa040, 0, 14, 1.6); scene.add(fxLight);
  const auraLight = new THREE.PointLight(0xffd86a, 0, 10, 1.4); scene.add(auraLight);

  // ------------------------------------------------------------ mundo (planícies, mesas de pedra, casas-cúpula) — desenho próprio
  const village = new THREE.Group(); scene.add(village);
  const grama = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7ac85a'; g.fillRect(0, 0, w, h); for (let k = 0; k < 300; k++) { g.fillStyle = hash(k) > 0.5 ? 'rgba(90,160,60,0.4)' : 'rgba(150,215,110,0.4)'; g.fillRect(hash(k + 1) * w, hash(k + 2) * h, 4 + hash(k + 3) * 10, 3); } }, [40, 40]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), toon(0xffffff, { map: grama }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; village.add(ground);
  const grassM = toon(0x6ab84a);
  const grass = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.2, 8), grassM); grass.visible = false; village.add(grass);
  const terra = new THREE.Mesh(new THREE.CircleGeometry(9, 9), toon(0xd8b080)); terra.rotation.x = -Math.PI / 2; terra.position.y = 0.01; terra.receiveShadow = true; village.add(terra);
  // mesas de pedra (rochas altas de topo chato)
  const mesaM = [toon(0xd8905a), toon(0xc8784a), toon(0xe0a46a)];
  for (let i = 0; i < 22; i++) {
    const a = hash(i + 7) * Math.PI * 2, r = 30 + hash(i + 17) * 90, h = 10 + hash(i + 27) * 30, rr0 = 5 + hash(i + 37) * 8;
    if (Math.abs(Math.sin(a - 1.6)) < 0.2 && r < 50) continue;
    const m = inked(new THREE.Mesh(new THREE.CylinderGeometry(rr0 * 0.8, rr0, h, 7), mesaM[i % 3]), 0.01); m.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); m.rotation.y = hash(i) * 3; village.add(m);
    const topo = new THREE.Mesh(new THREE.CylinderGeometry(rr0 * 0.82, rr0 * 0.8, 1.2, 7), toon(0x6ab84a)); topo.position.set(m.position.x, h + 0.6, m.position.z); village.add(topo);
  }
  // casas-cúpula brancas com janelas redondas
  const domeM = toon(0xf4f4f0), winM = new THREE.MeshBasicMaterial({ color: 0x5ab0e8 });
  for (let i = 0; i < 7; i++) {
    const a = 1.2 + i * 0.75 + hash(i) * 0.2, r = 14 + hash(i + 3) * 10, s0 = 2.2 + hash(i + 5) * 1.4;
    const g = new THREE.Group(); g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); village.add(g);
    const dome = inked(new THREE.Mesh(new THREE.SphereGeometry(s0, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), domeM), 0.015); dome.castShadow = true; g.add(dome);
    for (let k = 0; k < 3; k++) { const w2 = new THREE.Mesh(new THREE.CircleGeometry(s0 * 0.16, 10), winM); const aa = k * 0.9 - 0.9; w2.position.set(Math.sin(aa) * s0 * 0.92, s0 * 0.4, Math.cos(aa) * s0 * 0.92); w2.lookAt(Math.sin(aa) * 10, s0 * 0.4, Math.cos(aa) * 10); g.add(w2); }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(s0 * 0.35, s0 * 0.5), toon(0x5a6a8a)); door.position.set(0, s0 * 0.25, s0 * 0.99); g.add(door);
    g.lookAt(0, 0, 0);
  }
  // árvores redondas e montanhas ao longe
  const treeM = [toon(0x3a9a3a), toon(0x4ab04a)], woodM = toon(0x8a5a3a), woodD = toon(0x5a3a2a);
  for (let i = 0; i < 40; i++) {
    const a = hash(i + 100) * Math.PI * 2, r = 20 + hash(i + 200) * 50, x = Math.cos(a) * r, z = Math.sin(a) * r, s0 = 1.2 + hash(i + 300) * 1.5;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s0, 0.24 * s0, 1.8 * s0, 6), woodM); tr.position.set(x, 0.9 * s0, z); village.add(tr);
    const c = inked(new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 * s0, 0), treeM[i % 2]), 0.02); c.position.set(x, 2.5 * s0, z); village.add(c);
  }
  const mountM = [toon(0x8ab0d8), toon(0x9ac0e0), toon(0x7aa0c8)];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + hash(i) * 0.3, r = 190 + hash(i + 9) * 50, h = 50 + hash(i + 13) * 60;
    const m = new THREE.Mesh(new THREE.ConeGeometry(30 + hash(i + 3) * 30, h, 5), mountM[i % 3]); m.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r); village.add(m);
  }
  const pole = new THREE.Group(); village.add(pole);   // (sem poste neste mundo)
  // pedras soltas
  const rockM = toon(0xb89a7a);
  for (let i = 0; i < 14; i++) { const r = inked(new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + hash(i + 40) * 0.25), rockM), 0.06); const a = 1.3 + hash(i + 50) * 3.6, R = 4 + hash(i + 60) * 3; r.position.set(Math.cos(a) * R, 0.05, Math.sin(a) * R); r.rotation.set(hash(i), hash(i + 1), 0); village.add(r); }

  // ------------------------------------------------------------ portal
  const swirl = canvasTex(256, 256, (g) => { g.translate(128, 128); for (let k = 0; k < 6; k++) { g.rotate(Math.PI / 3); const gr = g.createLinearGradient(0, 0, 120, 0); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(120,220,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(70, -60, 125, -10); g.quadraticCurveTo(60, -20, 0, 0); g.fill(); } const c = g.createRadialGradient(0, 0, 0, 0, 0, 128); c.addColorStop(0, 'rgba(255,255,255,1)'); c.addColorStop(0.3, 'rgba(150,230,255,0.6)'); c.addColorStop(1, 'rgba(60,120,255,0)'); g.fillStyle = c; g.fillRect(-128, -128, 256, 256); });
  const portal = new THREE.Group(); portal.position.set(0, 10.6, 0); scene.add(portal);
  const portalDisk = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.MeshBasicMaterial({ map: swirl, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); portalDisk.rotation.x = Math.PI / 2; portal.add(portalDisk);
  const portalRing = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.12, 10, 64), new THREE.MeshBasicMaterial({ color: 0xc8f4ff, fog: false })); portalRing.rotation.x = Math.PI / 2; portal.add(portalRing);
  const portalGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('140,220,255'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); portalGlow.scale.setScalar(9); portal.add(portalGlow);

  // ------------------------------------------------------------ cratera
  const craterTex = canvasTex(512, 512, (g) => { const gr = g.createRadialGradient(256, 256, 30, 256, 256, 250); gr.addColorStop(0, 'rgba(60,35,25,0.95)'); gr.addColorStop(0.55, 'rgba(110,70,45,0.85)'); gr.addColorStop(0.8, 'rgba(150,100,65,0.5)'); gr.addColorStop(1, 'rgba(150,100,65,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); g.strokeStyle = 'rgba(30,15,10,0.9)'; g.lineWidth = 5; for (let k = 0; k < 14; k++) { let a = (k / 14) * 6.28 + hash(k) * 0.3, r = 70; g.beginPath(); g.moveTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r); while (r < 245) { r += 20 + hash(k * 9 + r) * 25; a += (hash(k + r) - 0.5) * 0.4; g.lineTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r); } g.stroke(); } });
  const crater = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshBasicMaterial({ map: craterTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); crater.rotation.x = -Math.PI / 2; crater.position.y = 0.02; scene.add(crater);
  const craterRocks = new THREE.Group(); scene.add(craterRocks);
  for (let i = 0; i < 16; i++) { const r = inked(new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + hash(i + 70) * 0.22), toon(0x7a5a44)), 0.06); const a = (i / 16) * 6.28 + hash(i) * 0.3, R = 2.5 + hash(i + 80) * 0.6; r.position.set(Math.cos(a) * R, 0.1, Math.sin(a) * R); r.rotation.set(hash(i + 2) * 3, hash(i + 3) * 3, 0); r.castShadow = true; craterRocks.add(r); }
  // rachaduras brilhantes (poder)
  const crackTex = canvasTex(512, 512, (g) => { g.strokeStyle = '#bff2ff'; g.shadowColor = '#4fc8ff'; g.shadowBlur = 18; g.lineWidth = 7; g.lineCap = 'round'; for (let k = 0; k < 11; k++) { let a = (k / 11) * 6.28 + hash(k + 5) * 0.4, r = 30; g.beginPath(); g.moveTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r); while (r < 250) { r += 18 + hash(k * 3 + r) * 26; a += (hash(k * 7 + r) - 0.5) * 0.5; g.lineTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r); } g.stroke(); } });
  const cracks = new THREE.Mesh(new THREE.CircleGeometry(4.2, 48), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); cracks.rotation.x = -Math.PI / 2; cracks.position.set(0, 0.035, -1.8); scene.add(cracks);

  // ------------------------------------------------------------ lutadores
  const G = buildFighter('guerreiro'); scene.add(G.root);
  const N = buildFighter('ninja'); scene.add(N.root);
  const CL = Array.from({ length: 6 }, () => { const f = buildFighter('ninja'); scene.add(f.root); return f; });
  // imagens residuais (velocidade) do guerreiro
  const ghostM = new THREE.MeshBasicMaterial({ color: 0x8fe2ff, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending });
  const GH = Array.from({ length: 3 }, () => { const f = buildFighter('guerreiro'); f.root.traverse((m) => { if (m.isMesh) { if (m.material === INK || m.material.side === THREE.BackSide) m.visible = false; else m.material = ghostM; m.castShadow = false; } }); scene.add(f.root); return f; });
  const place = (f, s) => {
    f.root.visible = !!s.vis; if (!s.vis) return;
    f.root.position.set(s.pos[0], s.pos[1], s.pos[2]); f.root.rotation.set(0, s.yaw || 0, 0);
    f.set(s.pose, { mood: s.mood || 'neutral', glow: s.glow || 0, hairGlow: s.hairGlow || 0 });
  };

  // ------------------------------------------------------------ fumaça / explosões / poeira (sprites)
  const TEX = {
    fumaca: puffTex('#ffffff', '#c6cad6', '#3a3a4a'),
    fumacaGrande: puffTex('#e8e4e0', '#a8a0a0', '#3a3036'),
    explosao: puffTex('#ffd23a', '#ff6a1a', '#5a1408', '#fff6c0'),
    poeira: puffTex('#e2c49a', '#b08860', '#5a3a28'),
  };
  const spritePool = [];
  const getSprite = (i) => { if (!spritePool[i]) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); scene.add(s); spritePool[i] = s; } return spritePool[i]; };

  // ------------------------------------------------------------ kunais
  const steel = toon(0x8a96a6), wrap = toon(0x2a2a30);
  const tagM = new THREE.MeshBasicMaterial({ map: canvasTex(64, 160, (g) => { g.fillStyle = '#f2e6c8'; g.fillRect(0, 0, 64, 160); g.strokeStyle = '#b01818'; g.lineWidth = 5; g.beginPath(); g.moveTo(32, 20); g.lineTo(32, 140); g.moveTo(14, 60); g.lineTo(50, 60); g.moveTo(18, 100); g.lineTo(46, 112); g.stroke(); }), side: THREE.DoubleSide });
  const KU = Array.from({ length: 3 }, () => {
    const g = new THREE.Group();
    const blade = inked(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 4), steel), 0.1); blade.position.y = 0.1; g.add(blade);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 6), wrap); handle.position.y = -0.06; g.add(handle);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 6, 14), steel); ring.position.y = -0.14; g.add(ring);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.16), tagM); tag.position.set(0, -0.2, 0); g.add(tag);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.03, 1.4, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); tr.position.y = -0.85; g.add(tr);
    scene.add(g); return g;
  });

  // ------------------------------------------------------------ selamento e correntes
  const sealTex = canvasTex(1024, 1024, (g) => {
    g.translate(512, 512); g.strokeStyle = '#ff3a5a'; g.fillStyle = '#ff3a5a'; g.shadowColor = '#ff1030'; g.shadowBlur = 20;
    for (const [r, w] of [[490, 10], [450, 4], [300, 8], [270, 3], [120, 6]]) { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, 6.29); g.stroke(); }
    g.lineWidth = 5; for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28; g.beginPath(); g.moveTo(Math.cos(a) * 120, Math.sin(a) * 120); g.lineTo(Math.cos(a) * 450, Math.sin(a) * 450); g.stroke(); }
    g.font = 'bold 44px "DejaVu Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const glyphs = '封印縛鎖幻術封印縛鎖幻術封印縛鎖幻術封印縛鎖';
    for (let k = 0; k < 24; k++) { const a = (k / 24) * 6.28; g.save(); g.rotate(a); g.translate(0, -375); g.fillText(glyphs[k], 0, 0); g.restore(); }
    for (let k = 0; k < 8; k++) { const a = (k / 8 + 1 / 16) * 6.28; g.save(); g.rotate(a); g.translate(0, -200); g.fillRect(-14, -30, 28, 60); g.restore(); }
  });
  const seal = new THREE.Mesh(new THREE.CircleGeometry(3.4, 64), new THREE.MeshBasicMaterial({ map: sealTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); seal.rotation.x = -Math.PI / 2; seal.position.y = 0.05; scene.add(seal);
  const chainM = toon(0x7a1a2a, { emissive: 0x501020 });
  const chains = [];
  for (let c = 0; c < 4; c++) {
    const a = (c / 4) * 6.28 + 0.4, from = new THREE.Vector3(Math.cos(a) * 2.8, 0.05, Math.sin(a) * 2.8);
    const links = [];
    for (let k = 0; k < 14; k++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 6, 12), chainM); l.scale.set(1, 1.5, 1); scene.add(l); links.push(l); }
    chains.push({ from, links, a });
  }

  // ------------------------------------------------------------ aura, pedras, ondas de choque, raio
  const flameOf = (c0, c1, c2) => canvasTex(256, 512, (g, w, h) => { for (let k = 0; k < 26; k++) { const x = hash(k) * w, bw = 14 + hash(k + 1) * 30; const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, `rgba(${c0},0.9)`); gr.addColorStop(0.5, `rgba(${c1},0.55)`); gr.addColorStop(1, `rgba(${c2},0)`); g.fillStyle = gr; g.beginPath(); g.moveTo(x - bw, h); g.quadraticCurveTo(x - bw * 0.2, h * (0.3 + hash(k + 2) * 0.3), x + (hash(k + 3) - 0.5) * 40, h * hash(k + 4) * 0.3); g.quadraticCurveTo(x + bw * 0.3, h * 0.5, x + bw, h); g.fill(); } }, [2, 1]);
  const flameTex = flameOf('255,250,210', '255,215,80', '255,160,30');
  const auraMats = [0, 1].map(() => new THREE.MeshBasicMaterial({ map: flameTex.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0 }));
  auraMats.forEach((m) => { m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.repeat.set(2, 1); m.map.needsUpdate = true; });
  const aura = new THREE.Group(); scene.add(aura);
  const aura1 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.85, 2.6, 24, 1, true), auraMats[0]); aura1.position.y = 1.2; aura.add(aura1);
  const aura2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.65, 2.3, 24, 1, true), auraMats[1]); aura2.position.y = 1.1; aura.add(aura2);
  const auraGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('255,215,90'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); auraGlow.position.y = 1.1; auraGlow.scale.set(3.4, 4.4, 1); aura.add(auraGlow);
  const sparkM = new THREE.SpriteMaterial({ map: glowTex('255,245,190'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sparks = Array.from({ length: 26 }, () => { const s = new THREE.Sprite(sparkM); s.scale.setScalar(0.12); scene.add(s); return s; });
  const floatRocks = Array.from({ length: 14 }, (_, i) => { const r = inked(new THREE.Mesh(new THREE.DodecahedronGeometry(0.1 + hash(i + 400) * 0.25), toon(0x8a6a54)), 0.06); scene.add(r); return r; });
  const waveM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const waves = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 64), waveM.clone()); scene.add(m); return m; });
  const beamM = new THREE.MeshBasicMaterial({ color: 0xbff0ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1, 20, 1, true), beamM); scene.add(beam);
  const beamCore = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff })); scene.add(beamCore);
  const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('200,245,255'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(orb);
  // modo raposa do ninja: aura laranja + esfera giratória azul na mão
  const foxTex = flameOf('255,235,170', '255,130,30', '230,40,0');
  const foxMats = [0, 1].map(() => new THREE.MeshBasicMaterial({ map: foxTex.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0 }));
  foxMats.forEach((m) => { m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.repeat.set(2, 1); m.map.needsUpdate = true; });
  const fox = new THREE.Group(); scene.add(fox);
  const fox1 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.85, 2.6, 24, 1, true), foxMats[0]); fox1.position.y = 1.2; fox.add(fox1);
  const fox2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.65, 2.3, 24, 1, true), foxMats[1]); fox2.position.y = 1.1; fox.add(fox2);
  const foxGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('255,140,40'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); foxGlow.position.y = 1.1; foxGlow.scale.set(3.4, 4.4, 1); fox.add(foxGlow);
  const foxLight = new THREE.PointLight(0xff7a20, 0, 10, 1.4); scene.add(foxLight);
  const swirlTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 60); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(150,215,255,0.9)'); gr.addColorStop(0.8, 'rgba(60,140,255,0.5)'); gr.addColorStop(1, 'rgba(40,100,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4; for (let k = 0; k < 4; k++) { g.beginPath(); for (let a = 0; a < 5; a += 0.1) { const r = 6 + a * 9; g.lineTo(64 + Math.cos(a + k * 1.57) * r, 64 + Math.sin(a + k * 1.57) * r); } g.stroke(); } });
  const orb2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: swirlTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(orb2);
  const orb2Glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('120,190,255'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(orb2Glow);
  const logM = toon(0x7a5236);
  const log = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.5, 12), logM), 0.06); log.castShadow = true; scene.add(log);
  const stumps = []; for (let k = 0; k < 2; k++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), toon(0xd8b080)); log.add(d); d.position.y = k ? 0.751 : -0.751; d.rotation.x = k ? -Math.PI / 2 : Math.PI / 2; stumps.push(d); }

  // cores para misturar com a ilusão
  const C = { hemiSky: new THREE.Color(0xdff0ff), hemiGnd: new THREE.Color(0x5a7a3a), sun: new THREE.Color(0xfff4e0), fog: new THREE.Color(0xcfe8ff),
    iSky: new THREE.Color(0xff3030), iGnd: new THREE.Color(0x200008), iSun: new THREE.Color(0xff2a20), iFog: new THREE.Color(0x4a0008) };
  const tmpC = new THREE.Color();
  const clockT = { v: 0 };

  function renderFrame(t) {
    const I = L.illusion(t), P = L.power(t);
    // --------------- personagens
    const gs = L.guerreiro(t), ns = L.ninja(t);
    place(G, gs); place(N, ns);
    const cl = L.clones(t); CL.forEach((f, i) => place(f, cl[i] || { vis: 0 }));
    const ghostOn = (t > 21.0 && t < 23.9) || (t > L.EV.dash && t < L.EV.clash) || (t < L.EV.choque && t < 3.6) || t >= L.EV.volta;
    GH.forEach((f, k) => { if (!ghostOn) { f.root.visible = false; return; } const s = L.guerreiro(t - 0.045 * (k + 1)); place(f, s); });
    ghostM.opacity = 0.22;
    // --------------- céu / ilusão
    skyM2.opacity = I; moonM.opacity = I; sun.visible = sunDisk.visible = I < 0.98; clouds.visible = I < 0.98;
    hemi.color.copy(C.hemiSky).lerp(C.iSky, I); hemi.groundColor.copy(C.hemiGnd).lerp(C.iGnd, I); sunL.color.copy(C.sun).lerp(C.iSun, I);
    scene.fog.color.copy(C.fog).lerp(C.iFog, I); scene.fog.near = lerp(40, 10, I); scene.fog.far = lerp(170, 60, I);
    hemi.intensity = lerp(0.9, 0.55, I); sunL.intensity = lerp(2.2, 1.6, I);
    grassM.color.setHex(0x6f9a4a).lerp(tmpC.setHex(0x3a0a0e), I);
    // --------------- portal e cratera
    const po = smooth(L.EV.portal[0], L.EV.portal[1], t) * (1 - smooth(6.6, 7.4, t));
    portal.visible = po > 0.001; portal.scale.setScalar(Math.max(0.001, po)); portalDisk.rotation.z = t * 3; portalGlow.material.opacity = po;
    const cr = t >= L.EV.queda[1] && t < 59 ? 1 : 0;
    crater.visible = craterRocks.visible = !!cr && t >= L.EV.queda[1] && !(t >= L.EV.volta);
    // --------------- fumaça e explosões
    let si = 0;
    for (const p of L.PUFFS) {
      const life = L.PUFF_LIFE[p.kind], u = (t - p.t) / life; if (u < 0 || u > 1) continue;
      const n = p.kind === 'fumacaGrande' ? 10 : 7;
      for (let k = 0; k < n; k++) {
        const s = getSprite(si++); s.visible = true; s.material.map = TEX[p.kind];
        const a = hash(k + p.t * 7) * 6.28, r = (0.15 + 0.5 * hash(k + 3 + p.t)) * p.s * (0.4 + 0.6 * Math.sqrt(u));
        s.position.set(p.pos[0] + Math.cos(a) * r, p.pos[1] + (hash(k + 9 + p.t) - 0.35) * p.s * 0.5 * (0.4 + u) + (p.kind === 'explosao' ? 0.6 * u : 0.15 * u), p.pos[2] + Math.sin(a) * r);
        const sz = p.s * (0.45 + 0.35 * hash(k + 11)) * (0.5 + 0.7 * Math.sqrt(u)) * (p.kind === 'explosao' ? 1.0 + 0.5 * u : 1);
        s.scale.set(sz, sz, 1); s.material.rotation = hash(k + 13) * 6.28 + u * 0.6;
        s.material.opacity = 1 - smooth(0.55, 1, u);
        s.material.color.setHex(p.kind === 'explosao' && u > 0.5 ? 0x777070 : 0xffffff);
      }
    }
    for (const d of L.DUST) {
      const u = (t - d.t) / 1.8; if (u < 0 || u > 1) continue;
      for (let k = 0; k < d.n; k++) {
        const s = getSprite(si++); s.visible = true; s.material.map = TEX.poeira;
        const a = (k / d.n) * 6.28 + hash(k + d.t), r = d.s * (0.3 + 0.7 * Math.sqrt(u)) * (0.8 + 0.3 * hash(k));
        s.position.set(d.pos[0] + Math.cos(a) * r, 0.3 + 0.5 * u * hash(k + 2), d.pos[2] + Math.sin(a) * r);
        const sz = 0.9 + 1.2 * u; s.scale.set(sz, sz, 1); s.material.rotation = hash(k) * 6; s.material.opacity = (1 - u) * 0.95; s.material.color.setHex(I > 0.5 ? 0xaa5555 : 0xffffff);
      }
    }
    for (let k = si; k < spritePool.length; k++) spritePool[k].visible = false;
    // luz das explosões
    const ex = Math.max(0, 1 - Math.abs(t - L.EV.explosao - 0.15) / 0.5);
    const ex2 = Math.max(0, 1 - Math.abs(t - L.EV.clash - 0.1) / 0.5); fxLight.position.set(0, 1.2, -1.8); fxLight.intensity = 30 * ex * ex + 24 * ex2 * ex2;
    // --------------- kunais
    const ks = L.kunais(t);
    KU.forEach((g, k) => { const s = ks[k]; g.visible = !!(s && s.vis); if (!g.visible) return; g.position.set(...s.pos); const d = new THREE.Vector3(...s.dir).normalize(); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.rotateY(t * 30); });
    // --------------- selo e correntes
    const so = L.sealOn(t);
    seal.material.opacity = so * (0.85 + 0.15 * Math.sin(t * 9)); seal.rotation.z = t * 0.5; seal.visible = so > 0.001;
    const ch = t >= L.EV.vidro ? 0 : smooth(L.EV.correntes[0], L.EV.correntes[1], t);
    const broken = t >= L.EV.quebraCorrente;
    const tgt = new THREE.Vector3(gs.pos[0], 1.05, gs.pos[2]);
    for (const c of chains) {
      const n = c.links.length;
      c.links.forEach((l, k) => {
        const u = k / (n - 1), on = ch * n > k;
        l.visible = on && t < L.EV.vidro + 0.01;
        if (!l.visible) return;
        const p = new THREE.Vector3().lerpVectors(c.from, tgt, u); p.y += Math.sin(u * Math.PI) * 0.25;
        if (broken) { const bt = t - L.EV.quebraCorrente; const dir = new THREE.Vector3(Math.cos(c.a + k), 0.6 + hash(k), Math.sin(c.a + k)); p.addScaledVector(dir, bt * (3 + hash(k + 5) * 3)); p.y -= 4.9 * bt * bt; }
        l.position.copy(p); l.lookAt(tgt); l.rotateX(Math.PI / 2); l.rotateY(k % 2 ? Math.PI / 2 : 0);
        if (broken) l.rotation.x += (t - L.EV.quebraCorrente) * 9 * hash(k);
      });
    }
    // --------------- aura e efeitos de poder
    const AU = Math.max(P, t < 3.6 || t >= L.EV.volta ? 0.4 : 0);
    aura.visible = AU > 0.01 && gs.vis; aura.position.set(gs.pos[0], gs.pos[1], gs.pos[2]);
    auraMats[0].opacity = 0.26 * AU; auraMats[1].opacity = 0.3 * AU; auraMats[0].map.offset.set(t * 0.3, -t * 1.6); auraMats[1].map.offset.set(-t * 0.5, -t * 2.2);
    aura1.scale.set(1 + 0.08 * Math.sin(t * 30), 1 + 0.25 * AU, 1 + 0.08 * Math.cos(t * 27)); aura2.scale.set(1, 1 + 0.2 * AU, 1);
    if (t < 3.6 || t >= L.EV.volta) { aura.rotation.set(0, 0, Math.PI / 2 * 0.8); aura.position.x -= 0.5; } else aura.rotation.set(0, 0, 0);
    auraGlow.material.opacity = 0.12 * AU; auraLight.position.set(gs.pos[0], 1.3, gs.pos[2]); auraLight.intensity = 6 * AU;
    sparks.forEach((s, k) => { s.visible = P > 0.05; if (!s.visible) return; const ph = (t * (0.8 + hash(k) * 0.8) + hash(k + 3)) % 1, a = hash(k + 7) * 6.28 + t * 0.6; s.position.set(gs.pos[0] + Math.cos(a) * (0.5 + 0.4 * hash(k + 1)), ph * 2.8, gs.pos[2] + Math.sin(a) * (0.5 + 0.4 * hash(k + 1))); s.material.opacity = P * Math.sin(ph * Math.PI); s.scale.setScalar(0.06 + 0.1 * hash(k + 2)); });
    const rise = smooth(42.6, 44.6, t) * (1 - smooth(45.8, 46.6, t));
    floatRocks.forEach((r, k) => { r.visible = rise > 0.01; if (!r.visible) return; const a = (k / floatRocks.length) * 6.28 + t * 0.4, R = 1.4 + hash(k + 2) * 1.8; r.position.set(Math.cos(a) * R, 0.1 + rise * (0.6 + hash(k + 5) * 2.4) + 0.1 * Math.sin(t * 2 + k), -1.8 + Math.sin(a) * R); r.rotation.set(t * (0.5 + hash(k)), t * 0.7, 0); });
    cracks.material.opacity = smooth(42.5, 44.0, t) * (1 - smooth(48.5, 49.5, t)) * (0.8 + 0.2 * Math.sin(t * 13));
    cracks.visible = cracks.material.opacity > 0.01;
    // ondas de choque
    const W0 = [[L.EV.choque, [L.SKY[0], L.SKY[1] + 0.2, L.SKY[2]], 'x'], [L.EV.queda[1], [0, 0.1, 0], 'y'], [L.EV.quebraCorrente, [0, 0.8, -1.8], 'y'], [L.EV.explosao, [0, 1.2, -1.8], 'x'], [L.EV.vidro, [0, 1.0, 0], 'y']];
    waves.forEach((w) => (w.visible = false));
    let wi = 0;
    for (const [t0, pos, ax] of W0) {
      const tt = t0 < 1 ? L.skyTau(t) : t; const u = (tt - t0) / 0.7; if (u < 0 || u > 1 || wi >= waves.length) continue;
      if (t0 < 1 && !(t < 3.6 || t >= L.EV.volta)) continue;
      const w = waves[wi++]; w.visible = true; w.position.set(...pos); w.rotation.set(ax === 'y' ? Math.PI / 2 : 0, ax === 'x' ? Math.PI / 2 : 0, 0);
      const s = 0.3 + 6 * Math.sqrt(u); w.scale.set(s, s, 1 + 3 * u); w.material.opacity = (1 - u) * 0.9;
    }
    // carga e raio
    const charge = smooth(L.EV.carga[0], L.EV.carga[1], t) * (t < L.EV.raio[1] ? 1 : 0);
    const hand = new THREE.Vector3(); G.arms.L.end.getWorldPosition(hand);
    orb.visible = charge > 0.01; orb.position.copy(hand); orb.scale.setScalar(0.3 + 1.4 * charge * (1 + 0.1 * Math.sin(t * 40))); orb.material.opacity = charge;
    const bOn = t >= L.EV.raio[0] && t < L.EV.raio[1];
    beam.visible = beamCore.visible = bOn;
    if (bOn) {
      G.root.updateMatrixWorld(true); G.arms.L.end.getWorldPosition(hand);
      const u = smooth(L.EV.raio[0], L.EV.raio[0] + 0.15, t), end = new THREE.Vector3(0, 1.2, -1.75 + 0.25 * Math.sin(t * 9)).sub(hand).multiplyScalar(u).add(hand);
      const mid = hand.clone().add(end).multiplyScalar(0.5), len = hand.distanceTo(end);
      for (const b of [beam, beamCore]) { b.position.copy(mid); b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(hand).normalize()); b.scale.set(1 + 0.1 * Math.sin(t * 60), Math.max(0.01, len), 1 + 0.1 * Math.sin(t * 60)); }
      beamM.opacity = 0.7 * (1 - smooth(L.EV.raio[1] - 0.15, L.EV.raio[1], t));
    }
    const FX = L.raposa(t);
    fox.visible = FX > 0.01 && ns.vis; fox.position.set(ns.pos[0], ns.pos[1], ns.pos[2]);
    foxMats[0].opacity = 0.28 * FX; foxMats[1].opacity = 0.32 * FX; foxMats[0].map.offset.set(t * 0.3, -t * 1.7); foxMats[1].map.offset.set(-t * 0.5, -t * 2.3);
    fox1.scale.set(1 + 0.08 * Math.sin(t * 31), 1 + 0.25 * FX, 1 + 0.08 * Math.cos(t * 26)); fox2.scale.set(1, 1 + 0.2 * FX, 1);
    foxGlow.material.opacity = 0.13 * FX; foxLight.position.set(ns.pos[0], 1.3, ns.pos[2]); foxLight.intensity = 6 * FX;
    const O2 = L.orbe(t), h2 = new THREE.Vector3();
    N.root.updateMatrixWorld(true); N.arms.L.end.getWorldPosition(h2);
    orb2.visible = orb2Glow.visible = O2 > 0.01;
    if (O2 > 0.01) { const sz = 0.25 + 0.4 * O2 * (1 + 0.06 * Math.sin(t * 50)); orb2.position.copy(h2); orb2.scale.setScalar(sz); orb2.material.rotation = -t * 18; orb2.material.opacity = O2; orb2Glow.position.copy(h2); orb2Glow.scale.setScalar(sz * 2.6); orb2Glow.material.opacity = 0.6 * O2; }
    const lg = L.tronco(t); log.visible = !!lg; if (lg) { log.position.set(...lg.pos); log.rotation.set(0, 0.3, lg.rot); }

    // --------------- câmera
    const { cam } = L.shot(t);
    const sh = L.shake(t), fr = Math.floor(t * 30);
    const j = (k) => (hash(fr * 1.37 + k) - 0.5) * 2;
    camera.position.set(cam[0][0] + j(1) * 0.08 * sh, cam[0][1] + j(2) * 0.08 * sh, cam[0][2] + j(3) * 0.08 * sh);
    camera.lookAt(cam[1][0] + j(4) * 0.05 * sh, cam[1][1] + j(5) * 0.05 * sh, cam[1][2]);
    camera.rotateZ(j(6) * 0.02 * sh);
    camera.fov = cam[2]; camera.updateProjectionMatrix();
    // sombra acompanha a ação
    const focus = new THREE.Vector3(cam[1][0], 0, cam[1][2]);
    sunL.target.position.copy(focus); sunL.position.copy(focus).addScaledVector(SUN_DIR, 30);
    sky.position.copy(camera.position); sky2.position.copy(camera.position);
    renderer.render(scene, camera);
    return { canvas: glCanvas, info: { illusion: I, power: P, shot: L.shot(t).name, shake: sh, speed: L.speed(t) } };
  }
  return { renderFrame };
}
