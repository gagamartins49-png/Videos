// ============================================================================
//  Cena 3D do Short "E se as batidas do GTA 6 fossem reais?" (Projeto E se? #005)
//  Avenida litorânea low-poly ao pôr do sol (estilo próprio do canal, sem nada do jogo):
//  carro esportivo, boneco de testes, barreira de concreto no fim da avenida, rampa.
//  renderFrame(t) é uma FUNÇÃO PURA do tempo do vídeo (determinística, sem estado).
// ============================================================================
import * as THREE from '../../vendor/three.module.min.js';
import * as F from './fisica.js';

const { clamp, smooth } = F;
const lerp = (a, b, u) => a + (b - a) * u;
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function mulberry32(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const G0 = 9.81;

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  if (repeat) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(repeat[0], repeat[1]); }
  return tx;
}
const dotTexture = () => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); };

export async function createScene({ cfg, width = 1080, height = 1920, quality = 0.8 }) {
  const W = width, H = height;
  const ck = F.clocks(cfg), T = ck.T;
  const rnd = mulberry32(2026);
  const glCanvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(Math.round(W * quality), Math.round(H * quality), false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 3000);
  camera.setViewOffset(W, H, Math.round(W * 0.11), 0, W, H);   // ação um pouco à esquerda (o Interrogador fica no canto direito)
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf0a07a, 0.0021);
  const DOT = dotTexture();

  // ------------------------------------------------------------ céu de pôr do sol + oceano com reflexo
  const SUN_DIR = new THREE.Vector3(0.12, 0.075, -1).normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16), new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: SUN_DIR } }, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform vec3 sunDir; varying vec3 vW;
      void main(){ vec3 d = normalize(vW - cameraPosition); float h = d.y;
        vec3 top = vec3(0.13,0.10,0.33), mid = vec3(0.92,0.42,0.45), hor = vec3(1.0,0.70,0.42);
        vec3 c = mix(mix(hor, mid, smoothstep(0.0, 0.13, h)), top, smoothstep(0.08, 0.62, h));
        if (h < 0.0) c = hor * 0.95;
        float az = atan(d.x, -d.z);
        float band = exp(-pow((h - 0.085) / 0.03, 2.0)) * smoothstep(0.35, 0.9, sin(az * 7.0 + sin(az * 19.0) * 0.8) * 0.5 + 0.5)
                   + exp(-pow((h - 0.16) / 0.025, 2.0)) * smoothstep(0.5, 0.95, sin(az * 4.0 + 1.3 + sin(az * 13.0)) * 0.5 + 0.5) * 0.7;
        float s = max(dot(d, sunDir), 0.0);
        c = mix(c, vec3(0.78, 0.32, 0.42) + vec3(1.0, 0.55, 0.25) * pow(s, 6.0), clamp(band, 0.0, 1.0) * 0.75);
        c += vec3(1.0, 0.5, 0.2) * pow(s, 7.0) * 0.55 + vec3(1.0, 0.75, 0.45) * pow(s, 70.0) * 0.9;
        c = mix(c, vec3(3.2, 2.4, 1.5), smoothstep(0.99935, 0.99955, s));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -10; scene.add(sky);
  const oceanU = { sunDir: { value: SUN_DIR }, uT: { value: 0 } };
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(6000, 3000), new THREE.ShaderMaterial({
    uniforms: oceanU, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform vec3 sunDir; uniform float uT; varying vec3 vW;
      void main(){ vec3 d = normalize(vW - cameraPosition); float dist = length(vW.xz - cameraPosition.xz);
        vec3 c = mix(vec3(0.16, 0.24, 0.42), vec3(0.20, 0.13, 0.30), smoothstep(40.0, 900.0, dist));
        float w = sin(vW.x * 0.9 + uT * 1.3) * sin(vW.z * 0.7 - uT * 0.9) + 0.5 * sin(vW.x * 2.7 - vW.z * 1.3 - uT * 2.1);
        vec3 n = normalize(vec3(w * 0.07, 1.0, w * 0.05));
        vec3 r = reflect(d, n); float s = max(dot(r, sunDir), 0.0);
        float fres = pow(1.0 - max(-d.y, 0.0), 5.0);
        c = mix(c, vec3(1.0, 0.58, 0.40), fres * 0.85);
        c += vec3(1.0, 0.68, 0.38) * (pow(s, 260.0) * 7.0 + pow(s, 30.0) * 0.45);
        c = mix(c, vec3(1.0, 0.70, 0.42) * 0.95, smoothstep(700.0, 2400.0, dist));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, -0.05, -345 - 1500); scene.add(ocean);

  // ------------------------------------------------------------ luzes (sol baixo e quente)
  scene.add(new THREE.HemisphereLight(0xffc2a8, 0x6a4a6a, 1.2));
  const sun = new THREE.DirectionalLight(0xffc89a, 3.0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 400 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  const L_DIR = new THREE.Vector3(0.6, 0.78, -0.3).normalize();
  scene.add(sun, sun.target);
  const fireLight = new THREE.PointLight(0xff7a2a, 0, 30, 1.6); scene.add(fireLight);

  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, flatShading: true, ...extra });
  const shadowed = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  // ------------------------------------------------------------ chão, avenida, calçadas, areia
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 640), std(0xcdb08a, { flatShading: false }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -25); ground.receiveShadow = true; scene.add(ground);
  const asphalt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3d3f47'; g.fillRect(0, 0, w, h); const r = mulberry32(3); for (let i = 0; i < 9000; i++) { const v = 45 + r() * 50 | 0; g.fillStyle = `rgb(${v},${v},${v + 6})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }, [3, 70]);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(12, 272), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.9 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, -90); road.receiveShadow = true; scene.add(road);
  const lineMat = std(0xf2f2f2, { emissive: 0x2a2a2a }), yel = std(0xf6c445, { emissive: 0x3a2800 });
  for (const x of [-0.14, 0.14]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 272), yel); m.position.set(x, 0.035, -90); m.receiveShadow = true; scene.add(m); }
  for (const x of [-5.75, 5.75]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 272), lineMat); m.position.set(x, 0.035, -90); scene.add(m); }
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.02, 3), lineMat, 80);
  { const m = new THREE.Matrix4(); let k = 0; for (const x of [-3, 3]) for (let i = 0; i < 40; i++) { m.makeTranslation(x, 0.035, 44 - i * 6.8); dashes.setMatrixAt(k++, m); } }
  scene.add(dashes);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 266), std(0xd9c9b3)); w.position.set(s * 7.8, 0.1, -93); w.receiveShadow = true; scene.add(w); const curb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.24, 266), std(0xe8e0d4)); curb.position.set(s * 6.05, 0.12, -93); scene.add(curb); }
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(900, 118), std(0xe9c999, { flatShading: false }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.015, -286); sand.receiveShadow = true; scene.add(sand);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(900, 3), new THREE.MeshBasicMaterial({ color: 0xfff1e0, transparent: true, opacity: 0.75, fog: false }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.03, -345); scene.add(foam);

  // ------------------------------------------------------------ prédios pastel com neon (art déco genérico)
  const winTex = canvasTex(128, 128, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
    const gr = g.createLinearGradient(0, 22, 0, 100); gr.addColorStop(0, '#9fc6e0'); gr.addColorStop(1, '#2d4a66'); g.fillStyle = gr; g.fillRect(20, 22, 88, 72);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(26, 28); g.lineTo(60, 28); g.lineTo(26, 70); g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(62, 22, 4, 72); g.fillStyle = '#e9e2d8'; g.fillRect(14, 96, 100, 8);
  });
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  const PASTEL = ['#f7c6d9', '#a8e6e2', '#fff1c1', '#f9d3b4', '#c8b6ff', '#b8f2c8', '#ffffff', '#ffd6a5', '#9ad1f5', '#f4b6c2'];
  const NEON = [0xff3fa4, 0x2ff3ff, 0xffe14d, 0xb26bff];
  const neonMats = NEON.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2.2 }));
  for (const side of [-1, 1]) {
    let z = 42;
    while (z > -209) {
      const w = 8 + rnd() * 7, d = Math.min(11 + rnd() * 9, z + 220), h = (rnd() < 0.3 ? 30 + rnd() * 26 : 9 + rnd() * 18) * (z < -150 ? 0.8 : 1);
      const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
      for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
        const i = f * 4 + k; let su, sv;
        if (f < 2) { su = d / 3.6; sv = h / 3.4; } else if (f < 4) { su = 0; sv = 0; } else { su = w / 3.6; sv = h / 3.4; }
        uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
      }
      const b = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: winTex, color: PASTEL[(rnd() * PASTEL.length) | 0], roughness: 0.7, flatShading: true }));
      const x = side * (10.2 + w / 2 + rnd() * 1.5); b.position.set(x, h / 2, z - d / 2); shadowed(b); scene.add(b);
      const nm = neonMats[(rnd() * NEON.length) | 0], face = x - side * w / 2 - side * 0.06;
      for (const yy of [h - 0.6, ...(h > 20 ? [h * 0.55] : [])]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, d * 0.96), nm); s.position.set(face, yy, z - d / 2); scene.add(s); }
      if (rnd() < 0.6) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.12, h * 0.8, 0.22), nm); v.position.set(face, h * 0.45, z - d * (rnd() < 0.5 ? 0.15 : 0.85)); scene.add(v); }
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.6 + rnd() * 2, d * 0.4), std(PASTEL[(rnd() * PASTEL.length) | 0])); cap.position.set(x, h + 0.9, z - d / 2); shadowed(cap); scene.add(cap);
      const awn = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, d * 0.8), std([0xff5f7e, 0x2bb3b1, 0xffb347][(rnd() * 3) | 0])); awn.position.set(face - side * 0.7, 3.4, z - d / 2); awn.rotation.z = side * 0.2; shadowed(awn); scene.add(awn);
      z -= d + 1.5 + rnd() * 3;
    }
  }

  // ------------------------------------------------------------ coqueiros (instanciados)
  const palms = [];
  for (const s of [-1, 1]) for (let z = 40 - (s > 0 ? 6 : 0); z > -214; z -= 13) palms.push([s * (7.6 + rnd() * 0.5), z + rnd() * 2, 7 + rnd() * 3]);
  for (let i = 0; i < 16; i++) palms.push([(rnd() < 0.5 ? -1 : 1) * (11 + rnd() * 40), -232 - rnd() * 90, 7 + rnd() * 4]);
  const SEG = 6, FR = 9;
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.21, 1, 6), std(0x8a6a48), palms.length * SEG);
  const leafGeo = (() => { const g = new THREE.PlaneGeometry(1, 0.7, 8, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i) + 0.5, v = p.getY(i); const L = 3.4 * u; p.setXYZ(i, L, -0.32 * L * L * 0.35, v * (1 - u * 0.85)); } g.computeVertexNormals(); return g; })();
  const leafMesh = new THREE.InstancedMesh(leafGeo, std(0x2f8a3d, { side: THREE.DoubleSide, roughness: 0.85 }), palms.length * FR);
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(); let ti = 0, li = 0;
    palms.forEach(([x, z, h], k) => {
      const lean = (hash(k) - 0.5) * 0.5, dir = hash(k + 7) * Math.PI * 2;
      let px = x, py = 0, pz = z;
      for (let i = 0; i < SEG; i++) { const a = lean * (i / SEG); const seg = h / SEG; const dx = Math.sin(a) * Math.cos(dir) * seg, dz = Math.sin(a) * Math.sin(dir) * seg, dy = Math.cos(a) * seg;
        e.set(Math.sin(dir) * a, 0, -Math.cos(dir) * a); q.setFromEuler(e); p.set(px + dx / 2, py + dy / 2, pz + dz / 2); sc.set(1 - i * 0.07, seg, 1 - i * 0.07); m.compose(p, q, sc); trunkMesh.setMatrixAt(ti++, m); px += dx; py += dy; pz += dz; }
      for (let i = 0; i < FR; i++) { e.set((hash(k * 9 + i) - 0.5) * 0.4, (i / FR) * Math.PI * 2 + hash(k), -0.15 - hash(k * 3 + i) * 0.35, 'YXZ'); q.setFromEuler(e); p.set(px, py, pz); sc.setScalar(0.85 + hash(k + i) * 0.35); m.compose(p, q, sc); leafMesh.setMatrixAt(li++, m); }
    }); }
  trunkMesh.castShadow = leafMesh.castShadow = true; scene.add(trunkMesh, leafMesh);

  // ------------------------------------------------------------ barreira no fim da avenida + placas de fim de pista
  const concrete = std(0xbdb7ad);
  const barrier = new THREE.Group();
  { const base = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.4, 0.9), concrete); base.position.set(0, 0.2, F.ZBAR - 0.45); barrier.add(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.75, 0.42), concrete); top.position.set(0, 0.77, F.ZBAR - 0.45); barrier.add(top);
    const stripeMat = std(0xffffff, { emissive: 0x333333 }), redMat = std(0xe0303a, { emissive: 0x300000 });
    for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.02), i % 2 ? stripeMat : redMat); s.position.set(-5.8 + i * 1.05, 0.95, F.ZBAR - 0.23); barrier.add(s); } }
  const chevTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#ffd400'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; for (let i = -2; i < 8; i++) { g.beginPath(); g.moveTo(i * 40, 0); g.lineTo(i * 40 + 20, 0); g.lineTo(i * 40 + 40, h / 2); g.lineTo(i * 40 + 20, h); g.lineTo(i * 40, h); g.lineTo(i * 40 + 20, h / 2); g.fill(); } });
  for (const x of [-4.6, 4.6]) { const sg = new THREE.Group(); const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 0.06), new THREE.MeshStandardMaterial({ map: chevTex, roughness: 0.6 })); board.position.y = 2.2; sg.add(board); for (const px of [-0.9, 0.9]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), std(0x777777, { metalness: 0.5 })); post.position.set(px, 1.1, -0.05); sg.add(post); } sg.position.set(x, 0, F.ZBAR - 1.6); barrier.add(sg); }
  shadowed(barrier); scene.add(barrier);

  // ------------------------------------------------------------ rampa (take 3)
  const ramp = new THREE.Group();
  { const g = new THREE.BufferGeometry(), w = 1.4, L = F.RL, Hh = F.RH;
    const v = [-w, 0, 0, w, 0, 0, w, Hh, -L, -w, Hh, -L, -w, 0, -L, w, 0, -L];
    const idx = [0, 1, 2, 0, 2, 3, 0, 3, 4, 1, 5, 2, 3, 2, 5, 3, 5, 4, 0, 4, 5, 0, 5, 1];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals();
    const rt = canvasTex(64, 256, (c, ww, hh) => { c.fillStyle = '#ff8a1f'; c.fillRect(0, 0, ww, hh); c.fillStyle = '#222'; for (let i = 0; i < 16; i++) c.fillRect(0, i * 16, ww, 3); });
    const m = new THREE.Mesh(g.toNonIndexed(), new THREE.MeshStandardMaterial({ color: 0xff9a3a, map: rt, roughness: 0.6, metalness: 0.3, flatShading: true }));
    m.geometry.computeVertexNormals(); ramp.add(m);
    for (const sx of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, Math.hypot(L, Hh)), std(0xeeeeee, { metalness: 0.6 })); rail.position.set(sx * w, Hh / 2 + 0.06, -L / 2); rail.rotation.x = Math.atan2(Hh, L); ramp.add(rail); }
    ramp.position.set(F.LANE, 0, F.ZR0); shadowed(ramp); scene.add(ramp); }

  // ------------------------------------------------------------ carro esportivo low-poly (com frente que amassa)
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 14); wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.BoxGeometry(0.32, 0.5, 0.09);
  function buildCar(color, stripe) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const paint = std(color, { metalness: 0.45, roughness: 0.35 }), dark = std(0x15171c, { roughness: 0.6 }), white = std(stripe, { metalness: 0.2, roughness: 0.4 });
    const rear = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.55, 2.9), paint); rear.position.set(0, 0.62, 0.75); body.add(rear);
    const front = new THREE.Group(); front.position.set(0, 0, -0.7); body.add(front);
    const fb = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.46, 1.5), paint); fb.position.set(0, 0.59, -0.75); front.add(fb);
    const hood = new THREE.Group(); hood.position.set(0, 0.83, 0); front.add(hood);
    const hp = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.06, 1.42), paint); hp.position.z = -0.71; hood.add(hp);
    const hs = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.065, 1.42), white); hs.position.z = -0.71; hood.add(hs);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.2), dark); bumper.position.set(0, 0.42, -1.52); front.add(bumper);
    const lightsMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3d0, emissiveIntensity: 1.6 });
    const heads = []; for (const x of [-0.62, 0.62]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.06), lightsMat); l.position.set(x, 0.69, -1.5); front.add(l); heads.push(l); }
    const cabGeo = new THREE.BoxGeometry(1.66, 0.52, 2.1); { const p = cabGeo.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setZ(i, p.getZ(i) * 0.7 + 0.15); cabGeo.computeVertexNormals(); }
    const cab = new THREE.Mesh(cabGeo, std(0x1b2030, { metalness: 0.7, roughness: 0.15 })); cab.position.set(0, 1.15, 0.45); body.add(cab);
    const wsLen = Math.hypot(0.52, 0.315 + 0.15 - 0.0), ws = new THREE.Mesh(new THREE.PlaneGeometry(1.58, wsLen), new THREE.MeshStandardMaterial({ color: 0x8fb4d8, emissive: 0x3a2a30, metalness: 0.8, roughness: 0.08, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    ws.position.set(0, 1.17, -0.38); ws.rotation.x = Math.atan2(0.465, 0.52); body.add(ws);
    for (const x of [-0.99, 0.99]) { const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 2.9), white); s1.position.set(x, 0.66, 0.75); body.add(s1); const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 1.5), white); s2.position.set(x, 0.66, -0.75); front.add(s2); }
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.38), dark); spoiler.position.set(0, 1.2, 2.0); body.add(spoiler);
    for (const x of [-0.6, 0.6]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.1), dark); st.position.set(x, 1.03, 2.0); body.add(st); }
    const tail = new THREE.MeshStandardMaterial({ color: 0xff2030, emissive: 0xff1020, emissiveIntensity: 1.4 });
    for (const x of [-0.65, 0.65]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.05), tail); l.position.set(x, 0.74, 2.21); body.add(l); }
    const wheels = [];
    for (const [x, z, fr] of [[-0.92, -1.35, 1], [0.92, -1.35, 1], [-0.92, 1.4, 0], [0.92, 1.4, 0]]) {
      const w = new THREE.Group(); const tire = new THREE.Mesh(wheelGeo, dark); w.add(tire); const hub = new THREE.Mesh(hubGeo, std(0xd8d8d8, { metalness: 0.8, roughness: 0.3 })); hub.position.x = x > 0 ? 0.11 : -0.11; w.add(hub);
      w.position.set(x, 0.36, z); body.add(w); wheels.push({ w, x, z, fr });
    }
    shadowed(g); scene.add(g);
    return { g, body, front, hood, bumper, heads, ws, wheels, paint };
  }
  const carA = buildCar(0xff2e88, 0xffffff);   // takes jogo/realidade
  const carB = buildCar(0x18b8c4, 0xfff0a0);   // take da rampa

  // carros estacionados (decoração)
  [[-4.6, -30, 0x6c5ce7], [-4.6, -64, 0xffffff], [4.6, -88, 0xf1c40f], [-4.6, -112, 0x2a9d8f], [4.6, -20, 0x1d3557], [-4.6, -168, 0xe63946], [4.6, -140, 0xff7f11]].forEach(([x, z, c], i) => {
    const p = new THREE.Group(), m = std(c, { metalness: 0.3, roughness: 0.45 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.72, 4.2), m); b.position.y = 0.72; p.add(b);
    const cb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.2), std(0x22283a, { metalness: 0.5, roughness: 0.2 })); cb.position.set(0, 1.38, 0.1); p.add(cb);
    for (const [wx, wz] of [[-0.9, 1.35], [0.9, 1.35], [-0.9, -1.35], [0.9, -1.35]]) { const w = new THREE.Mesh(wheelGeo, std(0x111111)); w.position.set(wx, 0.36, wz); p.add(w); }
    p.position.set(x, 0, z); p.rotation.y = i % 2 ? Math.PI : 0; shadowed(p); scene.add(p);
  });

  // ------------------------------------------------------------ boneco de testes
  function buildDummy() {
    const Y = std(0xf2c200, { roughness: 0.55 }), K = std(0x1a1a1a);
    const headTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#f2c200'; g.fillRect(0, 0, w, h); for (const cx of [64, 192]) { g.fillStyle = '#111'; g.beginPath(); g.arc(cx, 64, 30, 0, Math.PI * 2); g.fill(); g.fillStyle = '#f2c200'; g.beginPath(); g.moveTo(cx, 64); g.arc(cx, 64, 30, 0, Math.PI / 2); g.closePath(); g.fill(); g.beginPath(); g.moveTo(cx, 64); g.arc(cx, 64, 30, Math.PI, Math.PI * 1.5); g.closePath(); g.fill(); } });
    const root = new THREE.Group();
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.24), Y); root.add(pelvis);
    const torso = new THREE.Group(); torso.position.y = 0.09; root.add(torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.25), Y); chest.position.y = 0.27; torso.add(chest);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.06, 0.26), K); band.position.y = 0.3; torso.add(band);
    const head = new THREE.Group(); head.position.y = 0.58; torso.add(head);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), K); neck.position.y = 0.04; head.add(neck);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 12), new THREE.MeshStandardMaterial({ map: headTex, roughness: 0.5 })); skull.position.y = 0.17; skull.rotation.y = Math.PI / 2; head.add(skull);
    const limb = (parent, x, y, len, wd, mat) => { const p = new THREE.Group(); p.position.set(x, y, 0); const m = new THREE.Mesh(new THREE.BoxGeometry(wd, len, wd), mat); m.position.y = -len / 2; p.add(m); const j = new THREE.Mesh(new THREE.SphereGeometry(wd * 0.62, 8, 6), K); p.add(j); parent.add(p); return p; };
    const armL = limb(torso, -0.27, 0.48, 0.56, 0.11, Y), armR = limb(torso, 0.27, 0.48, 0.56, 0.11, Y);
    const legL = limb(root, -0.1, -0.06, 0.42, 0.15, Y), legR = limb(root, 0.1, -0.06, 0.42, 0.15, Y);
    const kneeL = limb(legL, 0, -0.42, 0.42, 0.13, Y), kneeR = limb(legR, 0, -0.42, 0.42, 0.13, Y);
    shadowed(root); scene.add(root);
    const pose = (p) => { torso.rotation.x = p.torso || 0; head.rotation.x = p.head || 0; armL.rotation.set(p.aLx || 0, 0, p.aLz || 0); armR.rotation.set(p.aRx || 0, 0, p.aRz || 0); legL.rotation.set(p.lL || 0, 0, p.lLz || 0); legR.rotation.set(p.lR || 0, 0, p.lRz || 0); kneeL.rotation.x = p.kL || 0; kneeR.rotation.x = p.kR || 0; };
    return { root, pose };
  }
  const dummy = buildDummy();
  const SEATED = { lL: 1.45, lR: 1.45, kL: -1.35, kR: -1.35, aLx: 1.15, aRx: 1.15, torso: -0.12 };

  // ------------------------------------------------------------ partículas: estilhaços, destroços, faíscas, fumaça
  const sh = (i, k) => hash(i * 13.37 + k * 101.9);
  // estilhaços do para-brisa
  const NG = 170, glassMesh = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.05), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, emissive: 0x506070, metalness: 0.9, roughness: 0.05, flatShading: true }), NG);
  glassMesh.frustumCulled = false; scene.add(glassMesh);
  const glassP = Array.from({ length: NG }, (_, i) => ({ x: (sh(i, 1) - 0.5) * 1.5, y: 0.95 + sh(i, 2) * 0.45, vz: -(36 + sh(i, 3) * 16), vy: 0.5 + sh(i, 4) * 6, vx: (sh(i, 5) - 0.5) * 12, sp: 5 + sh(i, 6) * 20, s: 0.6 + sh(i, 7) * 1.4 }));
  // destroços do carro (plástico/lataria) e lascas de concreto
  const ND = 90, debMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.3, flatShading: true }), ND);
  debMesh.frustumCulled = false; debMesh.castShadow = true; scene.add(debMesh);
  const debP = Array.from({ length: ND }, (_, i) => { const conc = i >= 55; return { conc, x: (sh(i, 11) - 0.5) * (conc ? 2.4 : 2.0), y: conc ? 0.4 + sh(i, 12) * 0.7 : 0.4 + sh(i, 12) * 0.5,
    vx: (sh(i, 13) - 0.5) * (conc ? 14 : 22), vy: 1.5 + sh(i, 14) * (conc ? 6 : 9), vz: conc ? -(2 + sh(i, 15) * 10) : (sh(i, 15) - 0.6) * 16, sp: 4 + sh(i, 16) * 14,
    sz: conc ? [0.1 + sh(i, 17) * 0.2, 0.08 + sh(i, 18) * 0.15, 0.1 + sh(i, 19) * 0.2] : [0.08 + sh(i, 17) * 0.35, 0.03 + sh(i, 18) * 0.06, 0.06 + sh(i, 19) * 0.3] }; });
  debP.forEach((d, i) => debMesh.setColorAt(i, new THREE.Color(d.conc ? 0xb9b3a8 : i % 3 === 0 ? 0x15171c : i % 3 === 1 ? 0xff2e88 : 0xd8d8d8)));
  const bumperPiece = carA.bumper;
  // faíscas (pontos aditivos)
  const NS = 420, sPos = new Float32Array(NS * 3), sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const sparks = new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.13, map: DOT, color: 0xffb347, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sparks.frustumCulled = false; scene.add(sparks);
  const sparkP = Array.from({ length: NS }, (_, i) => ({ a: sh(i, 21), b: sh(i, 22), c: sh(i, 23), d: sh(i, 24), e: sh(i, 25) }));
  // fumaça/poeira (sprites)
  const smokeMat = (c) => new THREE.SpriteMaterial({ map: DOT, color: c, transparent: true, depthWrite: false, opacity: 0 });
  const NSM = 46, smokes = Array.from({ length: NSM }, (_, i) => { const s = new THREE.Sprite(smokeMat(i < 30 ? 0x5a5a60 : 0xd8c4a0)); scene.add(s); return s; });
  const fire = Array.from({ length: 6 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: 0xff8a2a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); scene.add(s); return s; });

  // ------------------------------------------------------------ helpers de pose do carro
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
  function placeCar(car, { x = F.LANE, y = 0, z, yaw = 0, pitch = 0, crush = 0, hoodUp = 0, roll = 0, dist = 0, broken = false, wheelsOff = false, visible = true }) {
    car.g.visible = visible; if (!visible) return;
    car.g.position.set(x, y, z); car.g.rotation.set(0, yaw, 0);
    car.body.rotation.set(pitch, 0, roll); car.body.position.y = pitch < 0 ? 2.2 * Math.sin(-pitch) * 0.9 : 0;
    const cz = clamp(crush / 1.5, 0, 0.8); car.front.scale.set(1 + cz * 0.06, 1 - cz * 0.18, 1 - cz);
    car.hood.rotation.x = hoodUp; car.hood.position.y = 0.83 + hoodUp * 0.25;
    car.heads.forEach((h) => { h.visible = !broken; });
    car.wheels.forEach((wh) => { wh.w.visible = !wheelsOff; wh.w.rotation.set(-dist / 0.36, wh.fr ? cz * 0.5 * (wh.x > 0 ? 1 : -1) : 0, 0); wh.w.position.z = wh.z + (wh.fr ? cz * 0.9 : 0); });
  }
  // distância rodada (para girar as rodas) na corrida
  const runDist = (tau) => -F.runZ(tau);

  // ------------------------------------------------------------ estado do take "batida real" (carro A + boneco + destroços)
  function stateReal(s, tag) {
    const c = F.crashReal(s), broken = s > 0.004;
    placeCar(carA, { z: c.z, pitch: c.pitch, crush: c.crush, hoodUp: 0.75 * smooth(0.005, 0.06, s), dist: s < 0 ? runDist(F.TI + s) : runDist(F.TI) + c.crush, broken });
    carA.ws.visible = s < 0.022;
    carA.bumper.visible = s < 0.006;
    // boneco
    const d = F.dummyReal(s);
    if (d.seated) {
      carA.body.add(dummy.root); dummy.root.position.set(F.SEAT.x, F.SEAT.y + Math.min(d.rel, 1) * 0.35, F.SEAT.z - d.rel); dummy.root.rotation.set(-0.5 * clamp(d.rel), 0, 0);
      dummy.pose({ ...SEATED, aLx: 1.15 + 1.2 * clamp(d.rel), aRx: 1.15 + 1.2 * clamp(d.rel), head: 0.4 * clamp(d.rel) });
    } else {
      scene.add(dummy.root); dummy.root.position.set(d.x, d.y, d.z); dummy.root.rotation.set(d.rx, d.ry, d.rz);
      const f = d.flail, w = d.u;
      dummy.pose({ aLx: 2.6 * f + Math.sin(w * 9) * 0.8 * f, aLz: -0.4 - 0.9 * f, aRx: 2.3 * f + Math.sin(w * 8 + 1) * 0.8 * f, aRz: 0.4 + 0.9 * f, lL: 0.6 * f + Math.sin(w * 7) * 0.5 * f, lR: -0.3 * f + Math.sin(w * 6 + 2) * 0.5 * f, kL: -0.6 * f, kR: -0.3 * f, lLz: -0.25 * (1 - f), lRz: 0.25 * (1 - f), aLz2: 0, head: 0.3 * f });
      if (d.phase === 'parado') dummy.pose({ aLx: 0.2, aLz: -1.2, aRx: -0.3, aRz: 1.1, lLz: -0.3, lRz: 0.25, kL: -0.2, head: 0.25 });
    }
    // estilhaços
    const sg = s - 0.022;
    glassP.forEach((p, i) => {
      if (sg < 0) { tmpM.makeScale(0, 0, 0); glassMesh.setMatrixAt(i, tmpM); return; }
      const z0 = F.crashReal(0.022).z - 0.45;
      const tg = (p.vy + Math.sqrt(p.vy * p.vy + 2 * G0 * p.y)) / G0;
      let x, y, z, rot;
      if (sg < tg) { x = F.LANE + p.x + p.vx * sg; y = p.y + p.vy * sg - 0.5 * G0 * sg * sg; z = z0 + p.vz * sg; rot = p.sp * sg; }
      else { const w = sg - tg, v = Math.hypot(p.vx, p.vz), tr = Math.min(w, v / 22), dd = v * tr - 11 * tr * tr, k = dd / v; x = F.LANE + p.x + p.vx * (tg + k); y = 0.03; z = z0 + p.vz * (tg + k); rot = p.sp * (tg + tr * 0.5); }
      tmpE.set(rot, rot * 0.7, rot * 0.3); tmpQ.setFromEuler(tmpE); tmpP.set(x, y, z); tmpS.setScalar(p.s); tmpM.compose(tmpP, tmpQ, tmpS); glassMesh.setMatrixAt(i, tmpM);
    });
    glassMesh.instanceMatrix.needsUpdate = true; glassMesh.visible = true;
    // destroços
    debP.forEach((p, i) => {
      if (s < 0) { tmpM.makeScale(0, 0, 0); debMesh.setMatrixAt(i, tmpM); return; }
      const x0 = F.LANE + p.x, z0 = p.conc ? F.ZBAR - 0.1 : F.ZBAR + 0.3;
      const tg = (p.vy + Math.sqrt(p.vy * p.vy + 2 * G0 * p.y)) / G0;
      let x, y, z, rot;
      if (s < tg) { x = x0 + p.vx * s; y = p.y + p.vy * s - 0.5 * G0 * s * s; z = z0 + p.vz * s; rot = p.sp * s; }
      else { const w = s - tg, v = Math.hypot(p.vx, p.vz) + 1e-6, tr = Math.min(w, v / 9), dd = v * tr - 4.5 * tr * tr, k = dd / v; x = x0 + p.vx * (tg + k); y = p.sz[1] / 2; z = z0 + p.vz * (tg + k); rot = p.sp * tg; }
      tmpE.set(rot, rot * 1.3, rot * 0.4); tmpQ.setFromEuler(tmpE); tmpP.set(x, y, z); tmpS.set(...p.sz); tmpM.compose(tmpP, tmpQ, tmpS); debMesh.setMatrixAt(i, tmpM);
    });
    debMesh.instanceMatrix.needsUpdate = true; debMesh.visible = true;
    return { c, d };
  }
  function hideDebris() { glassMesh.visible = false; debMesh.visible = false; }

  // faíscas: batida (A) e arrasto (B)
  function setSparks(sA, sB, carBz, carBx) {
    let k = 0;
    for (let i = 0; i < NS; i++) {
      const p = sparkP[i]; let x = 0, y = -100, z = 0;
      if (i < 140 && sA !== null) {                          // batida na barreira: leque de faíscas
        const age = sA - p.a * 0.03, life = 0.25 + p.b * 0.45;
        if (age > 0 && age < life) { const sp = 10 + p.c * 18, th = (p.d - 0.5) * 2.6, ph = 0.2 + p.e * 1.1; x = F.LANE + (p.d - 0.5) * 1.8 + Math.sin(th) * Math.cos(ph) * sp * age; y = 0.4 + Math.sin(ph) * sp * age - 4.9 * age * age; z = F.ZBAR + 0.1 + Math.abs(Math.cos(th)) * Math.cos(ph) * sp * age * 0.5; }
      } else if (i >= 140 && sB !== null) {                   // chassi arrastando no asfalto
        const tb = 0.03 + Math.pow(p.a, 1.6) * F.TSTOP * 0.92, age = sB - tb, life = 0.2 + p.b * 0.35;
        if (age > 0 && age < life) { const cb = F.rampCar(F.TL + tb); const vv = Math.max(4, cb.v); x = cb.x + (p.c - 0.5) * 1.8 + (p.d - 0.5) * 7 * age; y = 0.05 + (1 + p.e * 4) * age - 4.9 * age * age; z = cb.z + 1.2 + (p.e - 0.5) * 2.4 - vv * 0.55 * age; }
      }
      if (y < 0) y = -100;
      sPos[k++] = x; sPos[k++] = y; sPos[k++] = z;
    }
    sGeo.attributes.position.needsUpdate = true;
  }
  // fumaça do motor, poeira do impacto, poeira de areia, fogo
  function setSmoke(sA, sB, carB, t) {
    smokes.forEach((sp, i) => { sp.material.opacity = 0; });
    if (sA !== null && sA > 0) {
      for (let i = 0; i < 14; i++) {                         // nuvem de poeira/concreto no impacto
        const sp = smokes[i], age = sA, k = clamp(age / 1.2);
        sp.position.set(F.LANE + (hash(i) - 0.5) * 3.5 * (0.4 + k), 0.6 + hash(i + 3) * 1.2 + k * 1.2, F.ZBAR + (hash(i + 5) - 0.6) * 2.5);
        sp.scale.setScalar(1 + 4 * Math.sqrt(k)); sp.material.color.setHex(0xb8b0a4); sp.material.opacity = 0.55 * (1 - k) * smooth(0, 0.02, age);
      }
      for (let i = 14; i < 30; i++) {                        // vapor/fumaça saindo do motor
        const sp = smokes[i], born = 0.08 + (i - 14) * 0.25, age = sA - born; if (age < 0) continue;
        const life = 3.6, k = (age % life) / life;
        sp.position.set(F.LANE + Math.sin(i * 1.7 + k * 3) * 0.4, 0.9 + k * 4.5, F.ZBAR + 1.1 - k * 0.6); sp.scale.setScalar(0.8 + k * 3.2); sp.material.color.setHex(0x6d6d75); sp.material.opacity = 0.42 * Math.sin(Math.PI * k);
      }
    }
    if (sB !== null && sB > 0) {
      for (let i = 30; i < 38; i++) {                        // poeira do pouso
        const sp = smokes[i], k = clamp(sB / 1.6);
        sp.position.set(F.LANE + (hash(i) - 0.5) * 4 * (0.5 + k), 0.4 + k * 1.5, F.ZLAND + (hash(i + 2) - 0.5) * 4); sp.scale.setScalar(1.5 + 4 * Math.sqrt(k)); sp.material.color.setHex(0xa89c8a); sp.material.opacity = 0.5 * (1 - k);
      }
      for (let i = 38; i < 46; i++) {                        // fumaça escura do carro destruído
        const sp = smokes[i], born = 0.4 + (i - 38) * 0.5, age = sB - born; if (age < 0) continue;
        const life = 4.0, k = (age % life) / life;
        sp.position.set(carB.x + Math.sin(i + k * 2) * 0.5, 0.8 + k * 6, carB.z - 1.2 + k * 1.5); sp.scale.setScalar(1 + k * 4); sp.material.color.setHex(0x3a3a40); sp.material.opacity = 0.55 * Math.sin(Math.PI * k) * smooth(0.4, 2.5, sB);
      }
      const fl = smooth(1.5, 3.5, sB);
      fire.forEach((f, i) => { const fk = 0.5 + 0.5 * Math.sin(t * (7 + i) + i * 2); f.position.set(carB.x + (i - 2.5) * 0.18, 0.7 + fk * 0.3 + i * 0.08, carB.z - 1.6); f.scale.setScalar((0.7 + 0.5 * fk) * fl); f.material.opacity = 0.9 * fl; });
      fireLight.position.set(carB.x, 1.5, carB.z - 1.6); fireLight.intensity = 60 * fl * (0.8 + 0.2 * Math.sin(t * 11));
    } else { fire.forEach((f) => { f.material.opacity = 0; }); fireLight.intensity = 0; }
  }

  // ------------------------------------------------------------ câmera
  const camLook = (px, py, pz, lx, ly, lz, fov = 60, roll = 0) => { camera.position.set(px, py, pz); camera.lookAt(lx, ly, lz); camera.rotateX(0.03); if (roll) camera.rotateZ(roll); camera.fov = fov; camera.updateProjectionMatrix(); };
  const shakeAt = (t, t0, amp) => { const d = t - t0; if (d < 0 || d > 1.5) return [0, 0]; const a = amp * Math.exp(-d * 3.2); return [a * Math.sin(d * 10.5), a * Math.cos(d * 8.3)]; };

  // ------------------------------------------------------------ quadro
  function renderFrame(t) {
    const tk = F.takeAt(cfg, ck, t), info = { take: tk.take, rate: tk.rate };
    oceanU.uT.value = t;
    let focus = new THREE.Vector3(F.LANE, 0, F.ZBAR);
    carB.g.visible = false; if (carB.free) carB.free.forEach((m) => { m.visible = false; });
    ramp.visible = tk.take === 'rampa' || tk.take === 'final';
    let sA = null, sB = null, carBst = null;

    if (tk.take === 'gancho' || tk.take === 'realidade') {
      const s = tk.tau - F.TI; sA = s;
      const { c, d } = stateReal(s);
      info.speed = c.v * 3.6; info.g = c.g; info.s = s; info.dist = d.seated ? 0 : Math.max(0, F.ZBAR - d.z); info.dummyPhase = d.seated ? 'carro' : d.phase;
      focus.set(F.LANE, 0, c.z);
      if (tk.take === 'gancho') {
        const u = t / T.jogo.inicio, dz = d.seated ? c.z - 0.5 : Math.max(d.z, c.z - 6);
        camLook(F.LANE + 9.6 - u * 0.8, 1.7, c.z - 1.0 + u * 0.3, F.LANE - 0.2, 1.0, lerp(c.z - 1.4, dz, 0.5), 62);
      } else if (t < 16.95) {                               // perseguição em alta velocidade
        const k = t - T.realidade.inicio;
        camLook(F.LANE - 0.9, 1.1, c.z + 6.2, F.LANE, 1.0, c.z - 14, 76, Math.sin(k * 1.3) * 0.015);
      } else if (t < 24.6) {                                // lateral em câmera lenta, acompanhando o boneco
        const fd = d.seated ? 0 : clamp((c.z - 0.5 - d.z) / 9);
        const lz = d.seated ? c.z - 0.6 : lerp(c.z - 0.6, d.z, smooth(0, 1, fd)), ly = d.seated ? 1.05 : lerp(1.05, d.y + 0.2, fd);
        const [sx, sy] = shakeAt(t, T.realidade.impacto, 0.05);
        camLook(F.LANE + 9.6 + (t - 17) * 0.06 + sx, 1.7 + sy, lerp(c.z - 0.9, lz + 2, fd), F.LANE - 0.2, ly, lz, 64);
      } else if (t < 30.2) {                                // voo do boneco
        const dz = d.seated ? c.z : d.z;
        camLook(F.LANE + 11, 2.6 + (d.y || 0) * 0.4, dz + 8.5, F.LANE, (d.y || 0.5) + 0.3, dz - 1.5, 56);
        focus.set(F.LANE, 0, dz);
      } else {                                              // boneco caído na areia, carro destruído ao fundo
        const k = smooth(30.2, 35, t), dz = d.z;
        camLook(d.x - 1.0 - k * 0.8, 1.6 + k * 2.6, dz - 4.8 - k * 3.5, d.x - 0.1, 0.05 + k * 0.5, lerp(dz + 3, F.ZBAR, 0.12 * k), 58);
        focus.set(F.LANE, 0, (dz + F.ZBAR) / 2);
      }
    } else if (tk.take === 'jogo') {
      const s = tk.tau - F.TI, c = F.crashGame(s);
      placeCar(carA, { z: c.z, yaw: c.yaw, pitch: c.pitch, crush: c.crush, hoodUp: 0.15 * smooth(0, 0.1, s), dist: s < 0 ? runDist(tk.tau) : runDist(F.TI) - (c.z - F.ZI) });
      carA.ws.visible = true; carA.bumper.visible = true; hideDebris();
      info.speed = c.v * 3.6; info.s = s;
      const dg = F.dummyGame(s);
      if (dg.seated) { carA.body.add(dummy.root); dummy.root.position.set(F.SEAT.x, F.SEAT.y, F.SEAT.z); dummy.root.rotation.set(0, 0, 0); dummy.pose(SEATED); }
      else {
        scene.add(dummy.root);
        const k = dg.k, x = lerp(dg.x0, dg.x1, k), z = lerp(dg.z0, dg.z1, k), y = lerp(dg.y0, 0.86, k) + dg.arc * 4 * k * (1 - k);
        const bob = dg.landed ? 0.04 * Math.abs(Math.sin(dg.t * 5)) : 0;
        dummy.root.position.set(x, y + bob, z); dummy.root.rotation.set(dg.landed ? 0 : -k * Math.PI * 2, dg.landed ? -0.9 * smooth(0, 0.4, dg.t) : 0, 0);
        if (dg.landed) { const up = smooth(0.25, 0.6, dg.t); dummy.pose({ aLz: -2.6 * up, aRz: 2.6 * up + Math.sin(dg.t * 8) * 0.2 * up, kL: -0.2 * (1 - up), kR: -0.2 * (1 - up) }); }
        else dummy.pose({ lL: 1.0, lR: 1.0, kL: -1.8, kR: -1.8, aLx: 2.8, aRx: 2.8 });
      }
      focus.set(F.LANE, 0, c.z);
      if (t < 9.7) {                                        // perseguição: câmera atrás do carro, sol no fim da avenida
        const sp = clamp(c.v / F.V), k = t - T.jogo.inicio;
        camLook(F.LANE + 0.5, 2.5 - sp * 0.6, c.z + 8.5 - sp * 1.6, F.LANE, 1.2, c.z - 18, 62 + sp * 14, Math.sin(k * 1.1) * 0.01 * sp);
      } else {                                              // lateral na barreira: carro quica, boneco pula e comemora
        const [sx, sy] = shakeAt(t, T.jogo.inicio + F.TI, 0.04), k = smooth(10.3, 15, t);
        camLook(F.LANE + 8.6 - k * 1.2 + sx, 1.9 + sy, F.ZBAR + 9.5 - k * 1.5, F.LANE + 0.6, 1.1, F.ZBAR + 3.2, 52);
      }
      sA = null;
    } else {
      // take da rampa e final: carro A (e boneco) ficam no estado final da batida real
      const sFinal = 30;
      stateReal(sFinal);
      const s = tk.tau, cb = F.rampCar(s); carBst = cb; sB = s - F.TL; sA = sFinal;
      const off = sB > 0.015;
      placeCar(carB, { x: cb.x, y: cb.y, z: cb.z, yaw: cb.yaw, pitch: cb.pitch, crush: cb.crush, hoodUp: off ? 0.9 * smooth(0.015, 0.2, sB) : 0, dist: Math.max(0, -cb.z + 40), broken: off, wheelsOff: off });
      carB.ws.visible = !off || sB < 0.03;
      // rodas soltas
      if (off) {
        if (!carB.free) { carB.free = carB.wheels.map((wh) => { const m = new THREE.Group(); const tire = wh.w.children[0].clone(), hub = wh.w.children[1].clone(); m.add(tire, hub); shadowed(m); scene.add(m); return m; }); }
        carB.free.forEach((m, i) => {
          const wh = carB.wheels[i], vz = -30.6 * (0.55 + 0.12 * i), side = wh.x > 0 ? 1 : -1;
          const p = F.wheelFree([F.LANE + wh.x * 1.1, 0.45, F.ZLAND + wh.z], [side * (3 + 2.5 * hash(i + 40)), 4 + 4 * hash(i + 41), vz], sB - 0.015);
          m.visible = true; m.position.set(p.x, p.y, p.z); m.rotation.set(-p.spin, side * 0.3 + hash(i) * 0.4, hash(i + 3) * 0.5 * Math.min(1, (sB - 0.015) * 0.5));
        });
      }
      info.speed = cb.v * 3.6; info.height = Math.max(0, cb.y); info.vy = cb.vy; info.phase = cb.phase; info.sB = sB;
      focus.set(cb.x, 0, cb.z);
      if (tk.take === 'final') {                            // grua: sobe mostrando os dois destroços e o pôr do sol
        const k = smooth(T.final.inicio, cfg.duracao - 0.3, t);
        camLook(cb.x + 4 - k * 5.5, 1.8 + k * 22, cb.z + 9 + k * 22, lerp(cb.x, F.LANE, k), 1 + k * 1.5, lerp(cb.z, F.ZBAR - 12, k), 60);
        focus.set(F.LANE, 0, (cb.z + F.ZBAR) / 2);
      } else if (t < 37.35) {                              // aproximação: rampa à frente
        camLook(cb.x - 1.2, 1.6, cb.z + 8, cb.x - 0.3, 1.1, cb.z - 14, 68);
      } else if (t < 40.45) {                              // salto: câmera lateral larga
        camLook(F.LANE - 4.5, Math.max(4, cb.y + 2.8), cb.z + 15, cb.x - 0.6, cb.y + 0.4, cb.z, 62);
      } else if (t < 46.6) {                               // pouso em câmera lenta
        const [sx, sy] = shakeAt(t, T.rampa.pouso, 0.05), lz = lerp(F.ZLAND - 1, cb.z, smooth(42.5, 46.6, t));
        camLook(F.LANE + 9.5 + sx, 1.9 + sy, F.ZLAND + 6.5 - smooth(42, 46.6, t) * 12, cb.x, 0.9, lz, 62);
      } else {                                             // arrasto e parada
        const k = smooth(46.6, 52, t);
        camLook(cb.x + 5 + k * 2, 2.2 + k * 0.8, cb.z + 9 - k * 2, cb.x, 0.9, cb.z - 1, 56);
      }
    }

    setSparks(sA !== null ? sA : null, sB !== null ? sB : null);
    setSmoke(sA, sB, carBst || { x: 0, z: 0 }, t);
    // sol / sombra seguem o foco da ação
    sun.target.position.copy(focus); sun.position.copy(focus).addScaledVector(L_DIR, 150); sun.target.updateMatrixWorld();
    renderer.render(scene, camera);
    return { canvas: glCanvas, info };
  }
  return { renderFrame };
}
