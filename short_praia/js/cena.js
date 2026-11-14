// ============================================================================
//  Cena 3D do Short "E se você pulasse do helicóptero no mar, igual no GTA 6?" (Projeto E se? #008)
//  Mar em frente à mesma cidade litorânea low-poly ao pôr do sol (estilo próprio do canal):
//  helicóptero, boneco de testes, espirros d'água, rochedo com plataforma de 27 m e resgate.
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
  const ck = F.clocks(cfg), T = ck.T, EV = F.eventTimes(cfg);
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
        vec3 c = mix(vec3(0.04, 0.24, 0.36), vec3(0.14, 0.12, 0.28), smoothstep(40.0, 900.0, dist));
        float w = sin(vW.x * 0.9 + uT * 1.3) * sin(vW.z * 0.7 - uT * 0.9) + 0.5 * sin(vW.x * 2.7 - vW.z * 1.3 - uT * 2.1);
        vec3 n = normalize(vec3(w * 0.07, 1.0, w * 0.05));
        vec3 r = reflect(d, n); float s = max(dot(r, sunDir), 0.0);
        float fres = pow(1.0 - max(-d.y, 0.0), 5.0);
        c = mix(c, vec3(1.0, 0.58, 0.40), fres * 0.5);
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
  { const g = new THREE.BufferGeometry(), w = 1.4, L = 7, Hh = 3;
    const v = [-w, 0, 0, w, 0, 0, w, Hh, -L, -w, Hh, -L, -w, 0, -L, w, 0, -L];
    const idx = [0, 1, 2, 0, 2, 3, 0, 3, 4, 1, 5, 2, 3, 2, 5, 3, 5, 4, 0, 4, 5, 0, 5, 1];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals();
    const rt = canvasTex(64, 256, (c, ww, hh) => { c.fillStyle = '#ff8a1f'; c.fillRect(0, 0, ww, hh); c.fillStyle = '#222'; for (let i = 0; i < 16; i++) c.fillRect(0, i * 16, ww, 3); });
    const m = new THREE.Mesh(g.toNonIndexed(), new THREE.MeshStandardMaterial({ color: 0xff9a3a, map: rt, roughness: 0.6, metalness: 0.3, flatShading: true }));
    m.geometry.computeVertexNormals(); ramp.add(m);
    for (const sx of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, Math.hypot(L, Hh)), std(0xeeeeee, { metalness: 0.6 })); rail.position.set(sx * w, Hh / 2 + 0.06, -L / 2); rail.rotation.x = Math.atan2(Hh, L); ramp.add(rail); }
    ramp.position.set(F.LANE, 0, 9999); ramp.visible = false; shadowed(ramp); scene.add(ramp); }

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
    // porta do motorista (lado esquerdo), dobradiça na frente
    const door = new THREE.Group(); door.position.set(-0.99, 0, -0.55); body.add(door);
    const dp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 1.15), paint); dp.position.set(0, 0.64, 0.575); door.add(dp);
    const dw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 1.0), std(0x1b2030, { metalness: 0.7, roughness: 0.15 })); dw.position.set(-0.01, 1.12, 0.62); door.add(dw);
    const ds = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 1.15), white); ds.position.set(-0.035, 0.66, 0.575); door.add(ds);
    shadowed(door);
    return { g, body, front, hood, bumper, heads, ws, wheels, paint, door };
  }
  const carA = buildCar(0xff2e88, 0xffffff);   // takes jogo/realidade
  const carB = buildCar(0x18b8c4, 0xfff0a0);   // take da rampa

  // carros estacionados (decoração)
  [[-4.6, -30, 0x6c5ce7], [4.6, -88, 0xf1c40f], [4.6, -20, 0x1d3557], [-4.6, -200, 0xe63946], [4.6, -140, 0xff7f11]].forEach(([x, z, c], i) => {
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
    return { root, pose, torso, head };
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

  // ------------------------------------------------------------ helicóptero (design próprio)
  const heli = new THREE.Group(); scene.add(heli);
  const rotor = new THREE.Group(), tailRotor = new THREE.Group();
  { const paint = std(0x2f6fd8, { metalness: 0.1, roughness: 0.4 }), white = std(0xf2f2f2, { metalness: 0.2, roughness: 0.4 }), dark = std(0x15171c), glass = std(0x1b2030, { metalness: 0.8, roughness: 0.1 });
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), paint); body.scale.set(1.25, 1.15, 2.2); heli.add(body);
    const belly = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), white); belly.scale.set(1.2, 0.5, 2.0); belly.position.y = -0.55; heli.add(belly);
    const nose = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), glass); nose.scale.set(1.0, 0.85, 1.1); nose.position.set(0, 0.15, -1.45); heli.add(nose);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 1.2), dark); door.position.set(1.22, 0.0, 0.1); heli.add(door);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.26, 4.8, 10), paint); boom.rotation.x = Math.PI / 2; boom.position.set(0, 0.35, 3.9); heli.add(boom);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.7), paint); fin.position.set(0, 0.95, 6.1); fin.rotation.x = -0.35; heli.add(fin);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.45), white); stab.position.set(0, 0.4, 5.6); heli.add(stab);
    tailRotor.position.set(0.18, 1.0, 6.25); heli.add(tailRotor);
    for (let k = 0; k < 2; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.2, 0.12), dark); b.rotation.x = k * Math.PI / 2; tailRotor.add(b); }
    for (const x of [-0.95, 0.95]) { const sk = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.4), dark); sk.position.set(x, -1.35, 0.1); heli.add(sk); for (const z of [-0.8, 0.9]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.6, 0.07), dark); st.position.set(x * 0.9, -1.05, z); st.rotation.z = -Math.sign(x) * 0.25; heli.add(st); } }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.6, 8), dark); mast.position.y = 1.35; heli.add(mast);
    rotor.position.y = 1.62; heli.add(rotor);
    for (let k = 0; k < 2; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.05, 0.34), dark); b.rotation.y = k * Math.PI / 2; rotor.add(b); }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(4.6, 32), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })); disc.rotation.x = -Math.PI / 2; rotor.add(disc);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 2.6), new THREE.MeshStandardMaterial({ color: 0xff3fa4, emissive: 0x551030 })); stripe.position.set(1.26, -0.35, 0.1); heli.add(stripe);
    shadowed(heli); }
  function placeHeli(t, away = 0) {
    const u = Math.max(0, away);
    heli.position.set(F.HELI.x + 0.25 * Math.sin(t * 0.7) + u * u * 1.2, F.HELI.y + 0.18 * Math.sin(t * 1.3) + u * 1.5, F.HELI.z + 0.15 * Math.cos(t * 0.9) - u * 2);
    heli.rotation.set(0.04 * Math.sin(t * 0.8) - 0.06 * Math.min(u, 2), 0, 0.03 * Math.sin(t * 1.1) - 0.08 * Math.min(u, 2));
    rotor.rotation.y = t * 11; tailRotor.rotation.x = t * 13;
  }

  // ------------------------------------------------------------ rochedo com plataforma de 27 m e moto aquática de resgate
  const cliff = new THREE.Group();
  { const rock = std(0xa08a72, { roughness: 0.95 }), rock2 = std(0x8c7660, { roughness: 0.95 });
    for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4 - i * 0.12, 0), i % 2 ? rock : rock2); r.scale.set(1, 1.15, 0.9); r.position.set(F.PLAT.x + 2.6 + Math.sin(i * 1.7) * 0.5, 1.2 + i * 3.0, F.PLAT.z - 1.0 + Math.cos(i * 2.3) * 0.5); r.rotation.set(i, i * 0.7, i * 1.3); cliff.add(r); }
    for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1 + hash(i) * 1.5, 0), rock2); r.position.set(F.PLAT.x + 3 + Math.cos(i * 1.1) * 4, 0, F.PLAT.z - 1 + Math.sin(i * 1.1) * 4); cliff.add(r); }
    const plat = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.25, 2.2), std(0xe8e2d6)); plat.position.set(F.PLAT.x + 0.4, F.PLAT.y - 0.12, F.PLAT.z); cliff.add(plat);
    const rail = std(0xd0d0d0, { metalness: 0.6 });
    for (const [x, z, w, d] of [[F.PLAT.x + 1.8, F.PLAT.z, 0.05, 2.2], [F.PLAT.x + 0.4, F.PLAT.z - 1.1, 2.8, 0.05], [F.PLAT.x + 0.4, F.PLAT.z + 1.1, 2.8, 0.05]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), rail); r.position.set(x, F.PLAT.y + 1.0, z); cliff.add(r); }
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshStandardMaterial({ color: 0xffd23f, side: THREE.DoubleSide })); flag.position.set(F.PLAT.x + 1.8, F.PLAT.y + 2.2, F.PLAT.z - 1.1); cliff.add(flag);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), rail); pole.position.set(F.PLAT.x + 1.8, F.PLAT.y + 1.2, F.PLAT.z - 1.4); cliff.add(pole);
    shadowed(cliff); scene.add(cliff); }
  const jetski = new THREE.Group();
  { const hull = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 2.6), std(0xffffff, { roughness: 0.4 })); hull.position.y = 0.15; jetski.add(hull);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 4), std(0xe0303a)); nose.rotation.x = -Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.position.set(0, 0.2, -1.65); jetski.add(nose);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 1.1), std(0x15171c)); seat.position.set(0, 0.5, 0.35); jetski.add(seat);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), std(0x333333)); bar.position.set(0, 0.85, -0.45); jetski.add(bar);
    const tag = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#e0303a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RESGATE', w / 2, h / 2 + 2); });
    for (const s of [-1, 1]) { const tg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.35), new THREE.MeshBasicMaterial({ map: tag })); tg.position.set(s * 0.46, 0.2, 0.1); tg.rotation.y = s * Math.PI / 2; jetski.add(tg); }
    jetski.position.set(F.PLAT.x - 7, 0, F.PLAT.z - 3); jetski.rotation.y = 0.5; shadowed(jetski); scene.add(jetski); }
  const buoy = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), std(0xff7a1a)); buoy.position.set(F.PLAT.x - 8, 0.1, F.PLAT.z - 2); scene.add(buoy);

  // ------------------------------------------------------------ água: espirros, anéis, espuma, névoa
  const NSP = 520, spPos = new Float32Array(NSP * 3), spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const spray = new THREE.Points(spGeo, new THREE.PointsMaterial({ size: 0.38, map: DOT, color: 0xf4fbff, transparent: true, depthWrite: false, opacity: 0.95 })); spray.frustumCulled = false; scene.add(spray);
  const spr = Array.from({ length: NSP }, (_, i) => [hash(i * 1.37), hash(i * 2.11 + 4), hash(i * 3.7 + 9), hash(i * 5.3 + 2), hash(i * 7.9 + 1)]);
  const ringMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const rings = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 48), ringMat()); m.rotation.x = -Math.PI / 2; scene.add(m); return m; });
  const foams = Array.from({ length: 3 }, () => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; scene.add(m); return m; });
  // splashes: lista de { x, z, s (idade), power, kind: 'barriga' | 'pe' | 'jogo' }
  function setWater(list, t) {
    let k = 0, ri = 0, fi = 0;
    const share = Math.floor(NSP / Math.max(1, list.length));
    list.forEach((sp, li) => {
      const n0 = li * share, n1 = n0 + share;
      for (let i = n0; i < n1; i++) {
        const p = spr[i]; let x = 0, y = -500, z = 0;
        if (sp.s > 0) {
          const jet = sp.kind === 'pe' && p[4] < 0.35, age = sp.s - p[3] * 0.08;
          if (age > 0) {
            const th = p[0] * Math.PI * 2, vr = jet ? 0.5 * p[1] : (1.2 + 5 * p[1]) * sp.power, vy = jet ? (7 + 7 * p[2]) * sp.power : (3 + 12 * p[2]) * sp.power * (sp.kind === 'barriga' ? 1 : 0.7);
            const r = (jet ? 0.1 : 0.4 + 0.5 * p[4]) + vr * age, yy = vy * age - 4.9 * age * age;
            if (yy > -0.05) { x = sp.x + Math.cos(th) * r; y = yy; z = sp.z + Math.sin(th) * r; }
          }
        }
        spPos[k++] = x; spPos[k++] = y; spPos[k++] = z;
      }
      for (let j = 0; j < 3 && ri < rings.length; j++, ri++) {
        const m = rings[ri], age = sp.s - j * 0.25;
        if (age <= 0 || age > 5) { m.material.opacity = 0; continue; }
        const r = 0.8 + (2.2 + j) * Math.sqrt(age) * sp.power; m.position.set(sp.x, 0.04, sp.z); m.scale.setScalar(r); m.material.opacity = 0.55 * (1 - age / 5);
      }
      if (fi < foams.length) { const m = foams[fi++], age = sp.s; if (age > 0 && age < 6) { m.position.set(sp.x, 0.03, sp.z); m.scale.setScalar((0.8 + 2.2 * Math.sqrt(Math.min(age, 3))) * sp.power); m.material.opacity = 0.7 * (1 - age / 6); } else m.material.opacity = 0; }
    });
    for (; k < NSP * 3;) { spPos[k++] = 0; spPos[k++] = -500; spPos[k++] = 0; }
    for (; ri < rings.length; ri++) rings[ri].material.opacity = 0;
    for (; fi < foams.length; fi++) foams[fi].material.opacity = 0;
    spGeo.attributes.position.needsUpdate = true;
    // névoa
    smokes.forEach((m) => { m.material.opacity = 0; });
    list.forEach((sp, li) => { if (sp.s <= 0) return; for (let i = 0; i < 12; i++) { const m = smokes[li * 12 + i]; if (!m) continue; const age = sp.s - i * 0.03, kk = clamp(age / 2.2); if (age <= 0 || kk >= 1) continue; const a = hash(i + li * 7) * Math.PI * 2; m.position.set(sp.x + Math.cos(a) * (0.5 + 2 * kk) * sp.power, 0.5 + 2.5 * kk * sp.power, sp.z + Math.sin(a) * (0.5 + 2 * kk) * sp.power); m.scale.setScalar((1 + 3 * kk) * sp.power); m.material.color.setHex(0xf0f6fa); m.material.opacity = 0.45 * (1 - kk); } });
    // vento do rotor marcando a água
    for (let j = 0; j < 2; j++) { const m = rings[rings.length - 1 - j]; if (m.material.opacity > 0) continue; const ph = ((t * 0.6 + j * 0.5) % 1); m.position.set(heli.position.x, 0.05, heli.position.z); m.scale.setScalar(2 + 9 * ph); m.material.opacity = heli.position.y < 80 ? 0.25 * (1 - ph) : 0; }
  }

  // ------------------------------------------------------------ helpers
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  function dummyAt(p, rx, ry, rz, pose) { scene.add(dummy.root); dummy.root.position.copy(p); dummy.root.rotation.set(rx, ry, rz || 0); dummy.pose(pose); }
  const FLAIL = (w, f) => ({ aLx: 2.4 * f + Math.sin(w * 9) * 0.9 * f, aLz: -0.4 - 1.1 * f, aRx: 2.1 * f + Math.sin(w * 8 + 1) * 0.9 * f, aRz: 0.4 + 1.1 * f, lL: 0.6 * f + Math.sin(w * 7) * 0.6 * f, lR: -0.3 * f + Math.sin(w * 6 + 2) * 0.6 * f, kL: -0.6 * f, kR: -0.3 * f, head: 0.3 * f });
  const DIVE = { aLz: -3.0, aRz: 3.0 }, PENCIL = { aLz: -0.08, aRz: 0.08 };
  const FLOAT = (t) => ({ aLz: -1.3 + 0.1 * Math.sin(t), aRz: 1.2 + 0.1 * Math.sin(t + 1), lLz: -0.3, lRz: 0.3, head: 0.2 });
  const SWIM = (w) => ({ aLx: 3.14 * (0.5 + 0.5 * Math.sin(w)), aRx: 3.14 * (0.5 - 0.5 * Math.sin(w)), lL: 0.2 * Math.sin(w * 2), lR: -0.2 * Math.sin(w * 2) });
  const atDoor = (t, k) => dummyAt(V3(heli.position.x + 1.05 + 0.15 * k, heli.position.y - 0.95, heli.position.z + 0.15), 0, -Math.PI / 2 * (0.4 + 0.6 * k), 0, { aRz: 1.2, aLz: -0.6 * k, kL: -0.25 * k, kR: -0.25 * k, torso: 0.2 * k });
  const camLook = (px, py, pz, lx, ly, lz, fov = 60) => { camera.position.set(px, py, pz); camera.lookAt(lx, ly, lz); camera.rotateX(0.03); camera.fov = fov; camera.updateProjectionMatrix(); };
  const shakeAt = (t, t0, amp) => { const d = t - t0; if (d < 0 || d > 1.5) return [0, 0]; const a = amp * Math.exp(-d * 3.2); return [a * Math.sin(d * 10.5), a * Math.cos(d * 8.3)]; };
  carA.g.visible = false; carB.g.visible = false; ramp.visible = false;
  glassMesh.visible = false; debMesh.visible = false; sparks.visible = false;

  // ------------------------------------------------------------ quadro
  function renderFrame(t) {
    const tk = F.takeAt(cfg, ck, t), info = { take: tk.take, rate: tk.rate };
    oceanU.uT.value = t;
    carA.g.visible = carB.g.visible = false; fire.forEach((f) => { f.material.opacity = 0; }); fireLight.intensity = 0;
    const focus = V3(4, 0, -395);
    placeHeli(t, tk.take === 'final' ? tk.tau - 1.5 : 0);
    const IMP = V3(F.fall(F.TQ).x, 0, F.fall(F.TQ).z);
    const splashes = [];

    if (tk.take === 'gancho' || tk.take === 'jogo' || tk.take === 'realidade') {
      const game = tk.take === 'jogo', tau = tk.tau, b = F.fall(tau);
      info.height = b ? Math.max(0, b.y) : F.H; info.speed = b && !b.water ? b.v * 3.6 : 0; info.tau = tau; info.s = b ? b.s : -1;
      if (!b) atDoor(t, smooth(-1.2, -0.1, tau));
      else if (!b.water) {
        if (game) { const k = smooth(0.1, 1.6, b.u); dummyAt(V3(b.x, b.y, b.z), -Math.PI * k, -Math.PI / 2, 0, { ...DIVE, aLz: -3.0 * k - 0.6 * (1 - k), aRz: 3.0 * k + 0.6 * (1 - k) }); }
        else { const k = smooth(0.4, 3.0, b.u); dummyAt(V3(b.x, b.y, b.z), -Math.PI / 2 * k + 0.25 * Math.sin(b.u * 2.3) * (1 - k * 0.6), -Math.PI / 2 + 0.4 * Math.sin(b.u * 0.9), 0.3 * Math.sin(b.u * 1.7), FLAIL(b.u, 1)); }
      } else {
        const s = b.s;
        if (game) {
          splashes.push({ x: b.x, z: b.z, s, power: 0.7, kind: 'jogo' });
          const up = s - 1.3;
          if (up < 0) dummyAt(V3(b.x, -2.5, b.z), -Math.PI, -Math.PI / 2, 0, DIVE);
          else { const zz = b.z + 1.3 * Math.max(0, up - 0.6); dummyAt(V3(b.x + 0.5, -0.22 + 0.05 * Math.sin(t * 3), zz), up < 0.6 ? -Math.PI / 2 * (up / 0.6) : -Math.PI / 2, Math.PI, 0, up < 0.6 ? { aLz: -2.4, aRz: 2.4 } : SWIM(t * 5)); }
          info.height = 0;
        } else {
          splashes.push({ x: b.x, z: b.z, s, power: 1.35, kind: 'barriga' });
          const pen = Math.min(s, F.T_BARRIGA) / F.T_BARRIGA, yy = s < F.T_BARRIGA ? -0.35 * pen : -0.35 + 0.3 * smooth(0.5, 3, s);
          dummyAt(V3(b.x, yy + 0.04 * Math.sin(t * 1.4) * smooth(1, 3, s), b.z), -Math.PI / 2, -Math.PI / 2 + 0.3, 0.1, FLOAT(t * 0.6));
          info.g = s < F.T_BARRIGA ? F.G_BARRIGA : 0;
        }
      }
      focus.set(b ? b.x : 1, 0, b ? b.z : -400);
      const bx = b ? b.x : IMP.x, by = b ? Math.max(0.3, b.y) : F.HELI.y - 1, bz = b ? b.z : IMP.z;
      if (tk.take === 'gancho' || (t >= 26.4 && t < 30.5)) {             // nível da água: o impacto
        const [sx, sy] = shakeAt(t, tk.take === 'gancho' ? EV.ganchoImpacto : T.realidade.impacto, 0.05);
        camLook(IMP.x + 7.5 + sx, 1.3 + sy, IMP.z + 8.5, IMP.x, 1.2, IMP.z, 54);
      } else if (game) {
        if (t < 5.5) camLook(F.HELI.x + 9, F.HELI.y + 1.2, F.HELI.z + 9, F.HELI.x + 1, F.HELI.y - 0.8, F.HELI.z, 54);
        else if (t < 9.0) camLook(bx + 7, by + 2.2, bz + 10, bx, by - 0.5, bz, 56);
        else { const sw = b && b.water ? Math.max(0, b.s - 1.9) * 1.3 : 0; camLook(IMP.x + 8, 1.6, IMP.z + 9 + sw, IMP.x + 0.5, 0.7, IMP.z + sw * 0.8, 54); }
      } else if (t < 16.6) camLook(F.HELI.x + 7.5, F.HELI.y + 0.6, F.HELI.z + 6.5, F.HELI.x + 1.2, F.HELI.y - 0.9, F.HELI.z, 54);
      else if (t < 24.8) camLook(bx + 8, by + 1.6, bz + 9, bx, by - 0.6, bz, 58);
      else if (t < 26.4) camLook(IMP.x + 5.5, 0.8, IMP.z + 6, bx, by, bz, 70);
      else { const k = smooth(30.5, 36.7, t); camLook(IMP.x + 10 + k * 6, 2.5 + k * 5, IMP.z + 12 + k * 8, IMP.x, 1 + k * 4, IMP.z, 54); }
    } else if (tk.take === 'atleta') {
      const tau = tk.tau, b = F.dive(tau);
      info.height = b ? Math.max(0, b.y - 0.95) : F.PLAT.y; info.speed = b && !b.water ? b.v * 3.6 : 0; info.tau = tau; info.s = b ? b.s : -1;
      // a queda de barriga continua flutuando lá longe; aqui só o atleta
      if (!b) { const k = smooth(-1.5, -0.2, tau); dummyAt(V3(F.PLAT.x, F.PLAT.y + 0.86 + 0.15 * k * Math.sin(t * 6), F.PLAT.z + 0.6), 0, -Math.PI / 2 - 0.3, 0, { aLz: -2.8 * k - 0.2, aRz: 2.8 * k + 0.2, kL: -0.5 * k, kR: -0.5 * k }); }
      else if (!b.water) { const flip = smooth(0.05, 1.35, b.u); dummyAt(V3(b.x, b.y, b.z), -Math.PI * 2 * flip, -Math.PI / 2, 0, flip < 1 ? { aLz: -2.6 * (1 - flip) - 0.1, aRz: 2.6 * (1 - flip) + 0.1, lL: 1.2 * Math.sin(Math.PI * flip), lR: 1.2 * Math.sin(Math.PI * flip), kL: -1.5 * Math.sin(Math.PI * flip), kR: -1.5 * Math.sin(Math.PI * flip) } : PENCIL); }
      else { const s = b.s; splashes.push({ x: b.x, z: b.z, s, power: 0.75, kind: 'pe' }); const up = s - 1.6; if (up < 0) dummyAt(V3(b.x, -3, b.z), 0, -Math.PI / 2, 0, PENCIL); else { const k = smooth(0, 0.6, up); dummyAt(V3(b.x, lerp(-1.5, -0.45, k) + 0.05 * Math.sin(t * 2.5), b.z), 0, -0.4, 0, { aRz: 2.6 * smooth(0.8, 1.3, up) + 0.1 * Math.sin(t * 6), aLz: -0.9 - 0.3 * Math.sin(t * 3), lL: 0.4 * Math.sin(t * 3), lR: -0.4 * Math.sin(t * 3) }); } }
      if (b && b.water) info.g = b.s < 2 * F.D_PE / F.VA ? F.G_PE : 0;
      const bx = b ? b.x : F.PLAT.x, by = b ? Math.max(0.3, b.y) : F.PLAT.y + 1, bz = b ? b.z : F.PLAT.z;
      focus.set(bx, 0, bz);
      if (t < 39.0) camLook(F.PLAT.x - 5.5, F.PLAT.y + 2.2, F.PLAT.z + 8, F.PLAT.x, F.PLAT.y + 1.0, F.PLAT.z, 56);
      else if (t < 42.8) camLook(bx - 8, by + 1, bz + 10, bx, by - 0.4, bz, 58);
      else if (t < 46.0) { const [sx, sy] = shakeAt(t, T.atleta.entrada, 0.03); camLook(bx - 2.5 + sx, 1.3 + sy, bz + 9.5, bx + 1.2, 1.2, bz - 1, 54); }
      else camLook(bx - 2.0, 2.2, bz + 8.5, bx + 1.2, -0.9, bz - 1, 52);
    } else {
      // final: drone se afasta mostrando a praia e a cidade; helicóptero vai embora
      const b = F.fall(99); dummyAt(V3(b.x, -0.05 + 0.04 * Math.sin(t * 1.4), b.z), -Math.PI / 2, -Math.PI / 2 + 0.3, 0.1, FLOAT(t * 0.6));
      splashes.push({ x: b.x, z: b.z, s: 4.5, power: 1, kind: 'barriga' });
      const u = tk.tau, k = smooth(0, 9.8, u), kk = Math.pow(k, 1.3);
      camLook(lerp(IMP.x + 9, 22, k), lerp(1.8, 34, kk), lerp(IMP.z + 9, -452, k), lerp(IMP.x, 0, k), lerp(1.2, 10, k), lerp(IMP.z, -250, k), 58);
      focus.set(0, 0, lerp(-395, -300, k)); info.height = 0;
    }
    setWater(splashes, t);
    sun.target.position.copy(focus); sun.position.copy(focus).addScaledVector(L_DIR, 150); sun.target.updateMatrixWorld();
    renderer.render(scene, camera);
    return { canvas: glCanvas, info };
  }
  return { renderFrame };
}
