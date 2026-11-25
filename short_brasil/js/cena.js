// ============================================================================
//  Cena 3D low-poly do Short "E se alguém tentasse invadir o Brasil?" (Projeto E se? #022)
//  Sets separados: mapa estratégico (Brasil extrudado, navios, Europa, vizinhos, radar),
//  litoral com ondas, Amazônia com rio e chuva, trânsito de São Paulo (genérico), multidão,
//  churrasco e arquibancada. Bonecos low-poly: brasileiros (verde/amarelo) e "invasores" cinza.
//  Nada de violência: o invasor só se perde, fica no trânsito e vira torcedor.
// ============================================================================
import * as THREE from '../../vendor/three.module.min.js';
import * as L from './linha.js';

const { clamp, smooth, lerp } = L;
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  if (repeat) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(repeat[0], repeat[1]); }
  return tx;
}
const dotTex = () => canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });

export async function createScene({ width = 1080, height = 1920, quality = 0.8 }) {
  const W = width, H = height;
  const glCanvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(Math.round(W * quality), Math.round(H * quality), false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 600);
  camera.setViewOffset(W, H, Math.round(W * 0.08), 0, W, H);
  const scene = new THREE.Scene();
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, flatShading: true, ...extra });
  const mesh = (geo, mat, x, y, z, par = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; par.add(m); return m; };
  const DOT = dotTex();

  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x3a4a2a, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d8, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 120 }); scene.add(sun, sun.target);

  // ------------------------------------------------------------ boneco low-poly
  function boneco(cor, { capacete = false, camisa = null, cachecol = false } = {}) {
    const Y = std(cor), K = std(0x1a1a1a), C = camisa ? std(camisa) : Y;
    const root = new THREE.Group(), hips = new THREE.Group(); hips.position.y = 0.93; root.add(hips);
    hips.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.24), K));
    const torso = new THREE.Group(); torso.position.y = 0.09; hips.add(torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.25), C); chest.position.y = 0.27; torso.add(chest);
    const head = new THREE.Group(); head.position.y = 0.58; torso.add(head);
    const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), std(0xe2b088)); skull.position.y = 0.17; head.add(skull);
    if (capacete) { const hm = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), std(0x5a6068)); hm.position.y = 0.2; head.add(hm); }
    if (cachecol) { const sc = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 6, 12), std(0x2aa84a)); sc.rotation.x = Math.PI / 2; sc.position.y = 0.04; head.add(sc); const sc2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.04), std(0xffd23a)); sc2.position.set(0.08, -0.15, 0.14); head.add(sc2); }
    const limb = (parent, x, y, len, wd, mat) => { const p = new THREE.Group(); p.position.set(x, y, 0); const m = new THREE.Mesh(new THREE.BoxGeometry(wd, len, wd), mat); m.position.y = -len / 2; p.add(m); parent.add(p); return p; };
    const armL = limb(torso, -0.27, 0.48, 0.56, 0.11, C), armR = limb(torso, 0.27, 0.48, 0.56, 0.11, C);
    const legL = limb(hips, -0.1, -0.06, 0.84, 0.15, Y), legR = limb(hips, 0.1, -0.06, 0.84, 0.15, Y);
    root.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    const pose = (p) => { hips.position.y = 0.93 + (p.y || 0); torso.rotation.x = p.torso || 0; head.rotation.set(p.head || 0, p.headY || 0, 0); armL.rotation.set(p.aLx || 0, 0, p.aLz || 0); armR.rotation.set(p.aRx || 0, 0, p.aRz || 0); legL.rotation.x = p.lL || 0; legR.rotation.x = p.lR || 0; };
    return { root, pose, armR };
  }
  const walk = (t, k = 1, ph = 0) => { const s = Math.sin(t * 7 + ph) * 0.5 * k; return { lL: s, lR: -s, aLx: -s * 0.8, aRx: s * 0.8 }; };
  const pular = (t, ph = 0) => { const j = Math.abs(Math.sin(t * 6 + ph)); return { y: 0.25 * j, aLz: 2.4 + 0.3 * j, aRz: -2.4 - 0.3 * j }; };

  // ============================================================ SET 1: mapa estratégico (origem)
  const mapa = new THREE.Group(); scene.add(mapa);
  const oceano = mesh(new THREE.PlaneGeometry(60, 60, 30, 30), std(0x0e2a4a, { roughness: 0.4, metalness: 0.2 }), 0, -0.02, 0, mapa); oceano.rotation.x = -Math.PI / 2;
  const grade = new THREE.GridHelper(60, 60, 0x1f5a8a, 0x143a5a); grade.position.y = 0.0; grade.material.transparent = true; grade.material.opacity = 0.35; mapa.add(grade);
  const shapeBR = new THREE.Shape(); L.BRASIL.forEach(([lon, lat], i) => { const [x, z] = L.proj(lon, lat); i ? shapeBR.lineTo(x, -z) : shapeBR.moveTo(x, -z); });
  const geoBR = new THREE.ExtrudeGeometry(shapeBR, { depth: 0.35, bevelEnabled: false }); geoBR.rotateX(-Math.PI / 2);
  const br = mesh(geoBR, std(0x2aa84a), 0, 0, 0, mapa);
  const borda = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(L.BRASIL.map(([lon, lat]) => { const [x, z] = L.proj(lon, lat); return new THREE.Vector3(x, 0.37, z); })), new THREE.LineBasicMaterial({ color: 0xffd23a })); mapa.add(borda);
  // relevo low-poly: morrinhos e "Amazônia" mais escura
  for (let i = 0; i < 40; i++) { const lon = -70 + hash(i) * 30, lat = -12 + hash(i + 3) * 14; const [x, z] = L.proj(lon, lat); if (x < -6 || x > 4 || z < -5) continue; mesh(new THREE.ConeGeometry(0.25 + 0.2 * hash(i + 5), 0.5, 5), std(lat > -8 ? 0x1a7a3a : 0x4a9a4a), x, 0.55, z, mapa); }
  // navios (invasores genéricos)
  const navios = Array.from({ length: 5 }, (_, i) => { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(0.9, 0.18, 0.3), std(0x6a7078), 0, 0.09, 0, g); mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), std(0x8a9098), -0.1, 0.28, 0, g); mapa.add(g); return g; });
  // Europa (forma estilizada) que "cabe" no Brasil
  const EU = [[-9, 37], [-9, 43], [-2, 44], [-4, 48], [2, 51], [8, 54], [10, 57], [5, 62], [15, 68], [25, 70], [30, 66], [28, 60], [40, 58], [45, 50], [40, 46], [30, 45], [28, 41], [22, 37], [16, 38], [12, 44], [8, 44], [3, 42], [-2, 36]];
  const shapeEU = new THREE.Shape(); EU.forEach(([lo, la], i) => { const x = lo * 0.32 * 0.75, z = -(la - 52) * 0.32 * 0.75; i ? shapeEU.lineTo(x, -z) : shapeEU.moveTo(x, -z); });
  const geoEU = new THREE.ExtrudeGeometry(shapeEU, { depth: 0.05, bevelEnabled: false }); geoEU.rotateX(-Math.PI / 2);
  const europa = new THREE.Mesh(geoEU, new THREE.MeshBasicMaterial({ color: 0x7ac8ff, transparent: true, opacity: 0.65, depthWrite: false })); mapa.add(europa);
  // vizinhos (pinos) e radar
  const pinos = L.VIZINHOS.map(([lon, lat]) => { const [x, z] = L.proj(lon, lat); const p = mesh(new THREE.ConeGeometry(0.4, 1.1, 6), std(0xff8a3a, { emissive: 0x401800 }), x, 0.6, z, mapa); p.rotation.x = Math.PI; return p; });
  const radar = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.25, 48), new THREE.MeshBasicMaterial({ color: 0x5aff8a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })); radar.rotation.x = -Math.PI / 2; radar.position.set(0, 0.45, 0); mapa.add(radar);

  // ============================================================ SET 2: litoral (x = 200)
  const litoral = new THREE.Group(); litoral.position.x = 200; scene.add(litoral);
  mesh(new THREE.PlaneGeometry(60, 30), std(0xf2dcae), 0, 0, 14, litoral).rotation.x = -Math.PI / 2;
  const marGeo = new THREE.PlaneGeometry(80, 60, 40, 30); marGeo.rotateX(-Math.PI / 2);
  const mar = mesh(marGeo, std(0x2a9ac8, { roughness: 0.3, metalness: 0.1 }), 0, -0.1, -29, litoral); mar.receiveShadow = true;
  const marBase = Float32Array.from(marGeo.attributes.position.array);
  const palmeira = (x, z, h) => { const g = new THREE.Group(); g.position.set(x, 0, z); litoral.add(g); for (let k = 0; k < 6; k++) { const s = mesh(new THREE.CylinderGeometry(0.14, 0.18, h / 6, 6), std(0x8a6a4a), Math.sin(k * 0.3) * 0.2 * k, h / 12 + k * h / 6, 0, g); s.rotation.z = 0.05 * k; } for (let k = 0; k < 6; k++) { const f = mesh(new THREE.ConeGeometry(0.4, 2.4, 4), std(0x3a9a4a), 0, h, 0, g); f.rotation.set(Math.PI / 2 - 0.5, (k / 6) * Math.PI * 2, 0); f.translateY(1.0); } };
  palmeira(-3.5, 3, 5); palmeira(-6.5, 6, 6); palmeira(4.5, 2.5, 5.5); palmeira(7.5, 5.5, 4.5);
  const navios2 = Array.from({ length: 3 }, (_, i) => { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(5, 1, 1.4), std(0x6a7078), 0, 0.5, 0, g); mesh(new THREE.BoxGeometry(1.4, 1.4, 1), std(0x8a9098), -0.6, 1.6, 0, g); litoral.add(g); g.position.set(-14 + i * 12, 0, -40 - i * 6); return g; });

  // ============================================================ SET 3: Amazônia (x = 400)
  const flor = new THREE.Group(); flor.position.x = 400; scene.add(flor);
  mesh(new THREE.PlaneGeometry(120, 120), std(0x2a5a2a), 0, 0, -20, flor).rotation.x = -Math.PI / 2;
  const rioPts = []; for (let i = 0; i <= 30; i++) rioPts.push(new THREE.Vector2(Math.sin(i * 0.4) * 6 + 2, 20 - i * 3));
  for (let i = 0; i < 30; i++) { const a = rioPts[i], b = rioPts[i + 1]; const seg = mesh(new THREE.PlaneGeometry(4.5, Math.hypot(b.x - a.x, b.y - a.y) + 0.6), std(0x6a9aa8, { roughness: 0.2, metalness: 0.2 }), (a.x + b.x) / 2, 0.03, (a.y + b.y) / 2, flor); seg.rotation.x = -Math.PI / 2; seg.rotation.z = Math.atan2(b.x - a.x, b.y - a.y); }
  const NT = 420, copaGeo = new THREE.IcosahedronGeometry(1, 0), troncoGeo = new THREE.CylinderGeometry(0.15, 0.22, 1, 5);
  const copas = new THREE.InstancedMesh(copaGeo, std(0x2a7a3a), NT), troncos = new THREE.InstancedMesh(troncoGeo, std(0x5a3a2a), NT);
  const dm = new THREE.Object3D(), corC = new THREE.Color();
  let ti = 0;
  for (let i = 0; i < 3000 && ti < NT; i++) { const x = (hash(i) - 0.5) * 90, z = 15 - hash(i + 7) * 80; const rx = Math.sin(((20 - z) / 3) * 0.4) * 6 + 2; if (Math.abs(x - rx) < 3.8) continue; if (Math.abs(x) < 3 && Math.abs(z) < 4) continue; const s = 1.2 + hash(i + 3) * 1.8;
    dm.position.set(x, s * 1.2 + 1.3, z); dm.scale.set(s, s * 0.9, s); dm.rotation.set(0, hash(i) * 6, 0); dm.updateMatrix(); copas.setMatrixAt(ti, dm.matrix); copas.setColorAt(ti, corC.setHSL(0.3 + 0.06 * hash(i + 9), 0.55, 0.22 + 0.12 * hash(i + 11)));
    dm.position.set(x, s * 0.7, z); dm.scale.set(1, s * 1.4 + 1, 1); dm.updateMatrix(); troncos.setMatrixAt(ti, dm.matrix); ti++; }
  copas.count = troncos.count = ti; copas.castShadow = true; flor.add(copas, troncos);
  const invasores = Array.from({ length: 3 }, () => { const b = boneco(0x5a6068, { capacete: true }); flor.add(b.root); return b; });
  const interrog = invasores.map(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.font = '900 110px Anton, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 10; g.strokeStyle = '#000'; g.strokeText('?', 64, 70); g.fillStyle = '#ffd23a'; g.fillText('?', 64, 70); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true })); s.scale.setScalar(0.45); flor.add(s); return s; });
  const NR = 900, rPos = new Float32Array(NR * 3), rGeo = new THREE.BufferGeometry(); rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
  const chuva = new THREE.Points(rGeo, new THREE.PointsMaterial({ color: 0xbfd8ff, size: 0.05, transparent: true, opacity: 0.7 })); chuva.frustumCulled = false; flor.add(chuva);

  // ============================================================ SET 4: trânsito (x = 600)
  const city = new THREE.Group(); city.position.x = 600; scene.add(city);
  mesh(new THREE.PlaneGeometry(120, 120), std(0x5a5a62), 0, 0, -20, city).rotation.x = -Math.PI / 2;
  const janelas = canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#7a8090'; g.fillRect(0, 0, w, h); for (let y = 6; y < h; y += 14) for (let x = 6; x < w; x += 14) { g.fillStyle = hash(x * 3 + y) > 0.4 ? '#cfe6ff' : '#3a4050'; g.fillRect(x, y, 8, 9); } }, [1, 2]);
  for (let i = 0; i < 60; i++) { const gx = (i % 10) - 5, gz = Math.floor(i / 10); const x = gx * 9 + 4.5 * (gx >= 0 ? 1 : -1) * 0, z = -gz * 9 - 6; if (Math.abs(x) < 5) continue; const h = 6 + hash(i) * 22; const b = mesh(new THREE.BoxGeometry(6, h, 6), new THREE.MeshStandardMaterial({ map: janelas, roughness: 0.6, flatShading: true }), x + (hash(i + 3) - 0.5) * 2, h / 2, z, city); }
  const NC = 70, carros = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.55, 1.8), std(0xffffff), NC);
  for (let i = 0; i < NC; i++) { const lane = i % 3, z = 8 - Math.floor(i / 3) * 2.3; dm.position.set(-2 + lane * 2, 0.35, z); dm.scale.set(1, 1, 1); dm.rotation.set(0, 0, 0); dm.updateMatrix(); carros.setMatrixAt(i, dm.matrix); carros.setColorAt(i, corC.setHSL(hash(i * 3), 0.6, 0.5)); }
  carros.castShadow = true; city.add(carros);
  const tanque = new THREE.Group(); mesh(new THREE.BoxGeometry(2.2, 0.8, 3.4), std(0x6a7078), 0, 0.5, 0, tanque); mesh(new THREE.BoxGeometry(1.4, 0.6, 1.6), std(0x7a8088), 0, 1.15, -0.1, tanque); const cano = mesh(new THREE.CylinderGeometry(0.1, 0.1, 2, 8), std(0x5a6068), 0, 1.2, -1.6, tanque); cano.rotation.x = Math.PI / 2; tanque.position.set(0, 0, 2.6); city.add(tanque);
  for (let k = 0; k < 3; k++) for (let i = 0; i < 2; i++) mesh(new THREE.BoxGeometry(1.4, 0.06, 0.3), std(0xffffff), -3 + i * 6, 0.02, 10 - k * 6, city);

  // ============================================================ SET 5: multidão (x = 800)
  const povo = new THREE.Group(); povo.position.x = 800; scene.add(povo);
  mesh(new THREE.PlaneGeometry(140, 140), std(0x8a8a8a), 0, 0, -20, povo).rotation.x = -Math.PI / 2;
  const NP = 1600, corpos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.25, 1.1, 6), std(0xffffff), NP), cabecas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.17, 0), std(0xe2b088), NP);
  const pessoas = []; for (let i = 0; i < NP; i++) { const x = (hash(i) - 0.5) * 70, z = 6 - hash(i + 5) * 70; pessoas.push([x, z, hash(i + 9) * 6]); corpos.setColorAt(i, corC.set(hash(i + 2) > 0.5 ? 0xffd23a : 0x2aa84a)); }
  povo.add(corpos, cabecas);
  const bandeira = new THREE.Group(); povo.add(bandeira); bandeira.position.set(0, 0, -6);
  const bTex = canvasTex(300, 210, (g, w, h) => { g.fillStyle = '#1a9a4a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd23a'; g.beginPath(); g.moveTo(w / 2, 18); g.lineTo(w - 22, h / 2); g.lineTo(w / 2, h - 18); g.lineTo(22, h / 2); g.closePath(); g.fill(); g.fillStyle = '#1a3a8a'; g.beginPath(); g.arc(w / 2, h / 2, 52, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.arc(w / 2, h / 2 + 70, 100, -2.2, -0.95); g.stroke(); });
  const pano = mesh(new THREE.PlaneGeometry(6, 4.2, 12, 4), new THREE.MeshStandardMaterial({ map: bTex, side: THREE.DoubleSide, roughness: 0.8 }), 3, 8, 0, bandeira); const panoBase = Float32Array.from(pano.geometry.attributes.position.array);
  mesh(new THREE.CylinderGeometry(0.08, 0.08, 10, 6), std(0xd8d8d8), 0, 5, 0, bandeira);

  // ============================================================ SET 6: churrasco (x = 1000)
  const chur = new THREE.Group(); chur.position.x = 1000; scene.add(chur);
  mesh(new THREE.PlaneGeometry(40, 40), std(0x6aa84a), 0, 0, -6, chur).rotation.x = -Math.PI / 2;
  mesh(new THREE.BoxGeometry(1.6, 0.9, 0.7), std(0x8a3a2a), -0.8, 0.45, -1.4, chur);
  mesh(new THREE.BoxGeometry(1.5, 0.05, 0.6), std(0x3a3a3a, { metalness: 0.6 }), -0.8, 0.93, -1.4, chur);
  for (let k = 0; k < 4; k++) { mesh(new THREE.BoxGeometry(1.2, 0.08, 0.1), std(0x8a3a1a), -0.8, 1.0, -1.6 + k * 0.13, chur); }
  mesh(new THREE.BoxGeometry(2.4, 0.08, 1.2), std(0x9a6a3a), 1.4, 0.8, -0.6, chur); mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8), std(0xd8402a), 1.0, 0.99, -0.6, chur);
  const brs = [[0.2, -0.2, 0xffd23a, 0x2aa84a], [2.4, 0.3, 0x2aa84a, 0x2a4aa8], [-2.0, 0.2, 0xffd23a, 0x2aa84a]].map(([x, z, c, s]) => { const b = boneco(0x3a4a8a, { camisa: c }); b.root.position.set(x, 0, z); chur.add(b.root); return b; });
  const invChur = boneco(0x5a6068, { capacete: true }); invChur.root.position.set(1.0, 0, 0.6); chur.add(invChur.root);
  const espeto = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 4), std(0xd8d8d8), 0, 0, 0, espeto); for (let k = 0; k < 3; k++) mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), std(0x8a3a1a), 0, -0.15 + k * 0.12, 0, espeto); chur.add(espeto);
  const fumaca = Array.from({ length: 14 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: 0xd8d8d8, transparent: true, depthWrite: false })); chur.add(s); return s; });

  // ============================================================ SET 7: arquibancada (x = 1200)
  const est = new THREE.Group(); est.position.x = 1200; scene.add(est);
  mesh(new THREE.PlaneGeometry(60, 40), std(0x3aa84a), 0, 0, 10, est).rotation.x = -Math.PI / 2;
  for (let k = 0; k < 8; k++) mesh(new THREE.BoxGeometry(30, 0.6, 1.2), std(0xd8d8d8), 0, 0.3 + k * 0.6, -1 - k * 1.2, est);
  const NS = 300, torc = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.25, 0.9, 6), std(0xffffff), NS), torcC = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 0), std(0xe2b088), NS);
  for (let i = 0; i < NS; i++) torc.setColorAt(i, corC.set(hash(i + 4) > 0.5 ? 0xffd23a : 0x2aa84a)); est.add(torc, torcC);
  const invTorc = boneco(0x5a6068, { capacete: true, cachecol: true }); invTorc.root.position.set(0, 0.6, -1); est.add(invTorc.root);

  const sets = { mapa, litoral, flor, city, povo, chur, est };
  const fundo = { mapa: [0x05080f, 0.0], litoral: [0x8ad0f8, 0.006], flor: [0x8aa898, 0.03], city: [0xb8c8d8, 0.012], povo: [0x9ad0f0, 0.008], chur: [0x9ad8ff, 0.01], est: [0x6a9ad8, 0.01] };
  const setDe = { mapa: 'mapa', europa: 'mapa', fronteira: 'mapa', missao: 'mapa', final: 'mapa', litoral: 'litoral', floresta: 'flor', perdidos: 'flor', transito: 'city', povo: 'povo', churrasco: 'chur', torcida: 'est' };

  function renderFrame(t) {
    const { nome, cam } = L.shot(t), sname = setDe[nome];
    for (const [k, g] of Object.entries(sets)) g.visible = k === sname;
    const [bgc, fd] = fundo[sname]; scene.background = new THREE.Color(bgc); scene.fog = fd ? new THREE.FogExp2(bgc, fd) : null;
    hemi.intensity = sname === 'mapa' ? 0.5 : 0.9; sun.intensity = sname === 'mapa' ? 1.2 : (sname === 'flor' ? 1.2 : 2.2);
    // ---- mapa
    if (sname === 'mapa') {
      const ida = smooth(0, 6, t), volta = smooth(L.EV.voltam, 45.6, t);
      navios.forEach((n, i) => { const z0 = -4 + i * 2.2, x = lerp(16 + i, 7.5 + 0.4 * Math.sin(i), ida) + 12 * volta; n.position.set(x, 0, z0 + 0.3 * Math.sin(t + i)); n.rotation.y = volta > 0.2 ? Math.PI : 0; n.visible = nome !== 'europa' && nome !== 'fronteira' && nome !== 'final'; });
      europa.visible = nome === 'europa'; const ek = smooth(L.EV.europa, L.EV.europa + 1.2, t); europa.position.set(lerp(18, 0.6, ek), 0.42, lerp(-8, 1.2, ek));
      pinos.forEach((p, i) => { p.visible = nome === 'fronteira'; p.position.y = 0.6 + 0.4 * (1 - smooth(L.EV.radar + i * 0.15, L.EV.radar + 0.3 + i * 0.15, t)) + 0.08 * Math.sin(t * 4 + i); });
      radar.visible = nome === 'fronteira'; const rr = ((t - L.EV.radar) % 1.6) / 1.6; radar.scale.setScalar(1 + 40 * rr); radar.material.opacity = 0.6 * (1 - rr);
      br.material.emissive.setHex(nome === 'missao' ? 0x103a10 : 0x000000);
    }
    // ---- litoral: ondas
    if (sname === 'litoral') {
      const p = marGeo.attributes.position.array; for (let i = 0; i < p.length; i += 3) p[i + 1] = marBase[i + 1] + 0.25 * Math.sin(p[i] * 0.35 + t * 1.6) + 0.15 * Math.sin(p[i + 2] * 0.5 + t * 1.1); marGeo.attributes.position.needsUpdate = true; marGeo.computeVertexNormals();
      navios2.forEach((n, i) => { n.position.z = -40 - i * 6 + (t - 13.4) * 1.2; n.position.y = 0.1 * Math.sin(t * 1.5 + i); });
    }
    // ---- floresta
    if (sname === 'flor') {
      invasores.forEach((b, i) => { const a = t * 0.6 + i * 2.1, r = 1.2 + 0.4 * i; b.root.position.set(Math.cos(a) * r, 0, Math.sin(a) * r * 0.6 - 0.5); b.root.rotation.y = -a + (i % 2 ? Math.PI : 0); b.pose({ ...walk(t, 0.7, i), head: 0.3 * Math.sin(t * 2 + i), headY: 0.6 * Math.sin(t * 1.3 + i) }); interrog[i].position.set(b.root.position.x, 2.3 + 0.08 * Math.sin(t * 5 + i), b.root.position.z); interrog[i].visible = nome === 'perdidos'; });
      const ch = nome === 'perdidos' ? 1 : 0; chuva.visible = !!ch;
      for (let i = 0; i < NR; i++) { rPos[i * 3] = (hash(i) - 0.5) * 14; rPos[i * 3 + 1] = 8 - ((hash(i + 3) * 8 + t * 9) % 8); rPos[i * 3 + 2] = 2 - hash(i + 7) * 10; } rGeo.attributes.position.needsUpdate = true;
    }
    // ---- cidade
    if (sname === 'city') { tanque.position.y = 0.02 * Math.sin(t * 30); }
    // ---- multidão
    if (sname === 'povo') {
      const k = smooth(31.8, 34.5, t);
      pessoas.forEach(([x, z, ph], i) => { const on = hash(i + 13) < 0.15 + 0.85 * k; const j = 0.15 * Math.abs(Math.sin(t * 5 + ph)); dm.rotation.set(0, 0, 0); dm.scale.setScalar(on ? 1 : 0.0001); dm.position.set(x, 0.55 + j, z); dm.updateMatrix(); corpos.setMatrixAt(i, dm.matrix); dm.position.set(x, 1.28 + j, z); dm.updateMatrix(); cabecas.setMatrixAt(i, dm.matrix); });
      corpos.instanceMatrix.needsUpdate = cabecas.instanceMatrix.needsUpdate = true;
      const pp = pano.geometry.attributes.position.array; for (let i = 0; i < pp.length; i += 3) pp[i + 2] = panoBase[i + 2] + 0.3 * Math.sin(pp[i] * 1.2 + t * 4) * ((pp[i] + 3) / 6); pano.geometry.attributes.position.needsUpdate = true; pano.geometry.computeVertexNormals();
    }
    // ---- churrasco
    if (sname === 'chur') {
      brs.forEach((b, i) => { b.root.rotation.y = i === 1 ? -0.8 : 0.6; b.pose({ aRx: -0.5 - 0.3 * Math.abs(Math.sin(t * 2 + i)), aLx: 0.1, head: 0.05 * Math.sin(t * 3 + i) }); });
      const pega = smooth(L.EV.espeto, L.EV.espeto + 0.4, t);
      invChur.root.rotation.y = -0.4; invChur.pose({ aRx: -1.4 * pega, aRz: 0.2, head: -0.1 + 0.1 * Math.sin(t * 2) });
      const mao = new THREE.Vector3(); invChur.armR.updateWorldMatrix(true, false); invChur.armR.localToWorld(mao.set(0, -0.56, 0));
      espeto.position.copy(chur.worldToLocal(mao)); espeto.position.y += 0.2; espeto.visible = pega > 0.05;
      fumaca.forEach((s, i) => { const ph = (t * 0.4 + i / 14) % 1; s.position.set(-0.8 + 0.3 * Math.sin(i + t), 1.0 + ph * 3, -1.4 + 0.2 * Math.cos(i)); s.scale.setScalar(0.4 + ph * 1.4); s.material.opacity = 0.5 * (1 - ph); });
    }
    // ---- torcida
    if (sname === 'est') {
      for (let i = 0; i < NS; i++) { const row = i % 8, col = Math.floor(i / 8), x = -14 + col * 0.75 + (row % 2) * 0.3, y = 0.6 + row * 0.6, z = -1 - row * 1.2; const gol = t > L.EV.gol ? 1 : 0.3; const j = gol * 0.3 * Math.abs(Math.sin(t * 7 + i)); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.position.set(x, y + 0.45 + j, z); dm.updateMatrix(); torc.setMatrixAt(i, dm.matrix); dm.position.set(x, y + 1.05 + j, z); dm.updateMatrix(); torcC.setMatrixAt(i, dm.matrix); }
      torc.instanceMatrix.needsUpdate = torcC.instanceMatrix.needsUpdate = true;
      invTorc.pose(t > L.EV.gol ? pular(t) : { aLz: 0.3, aRz: -0.3 });
    }
    // câmera
    camera.position.set(...cam[0]); camera.lookAt(...cam[1]); camera.fov = cam[2]; camera.updateProjectionMatrix();
    sun.position.set(cam[1][0] + 10, 25, cam[1][2] + 12); sun.target.position.set(cam[1][0], 0, cam[1][2]);
    renderer.render(scene, camera);
    return { canvas: glCanvas, info: { nome, set: sname, luz: { alarme: 0 } } };
  }
  return { renderFrame };
}
