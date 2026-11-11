// ============================================================================
//  Simulações novas da compilação "Projeto E se?" (cidade low-poly compartilhada)
//    nível 1: sem oxigênio por 5 s       nível 3: temperatura +10 °C por segundo
//    nível 4: gravidade dobrando         nível 7: buraco negro de 2 cm na rua
//  renderFrame(u) é uma FUNÇÃO PURA do tempo local u ∈ [0, 65] s.
// ============================================================================
import * as THREE from '../../vendor/three.module.min.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const wrap = (x, a, b) => { const r = b - a; return a + ((((x - a) % r) + r) % r); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const mixColor = (a, b, u) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(u));
export const SIM = 65;

// ---------------------------------------------------------------- grandezas exibidas no HUD
export function oxygenAt(u) { return u < 6 ? 21 : u < 10 ? lerp(21, 0, (u - 6) / 4) : u < 44 ? 0 : lerp(0, 21, smooth(44, 46.5, u)); }
export function noO2Clock(u) { return 5 * clamp((u - 10) / 34); }
export function heatAt(u) { return 25 + 18 * u; }              // °C (1,8 s simulados por segundo de vídeo, +10 °C/s)
export function heatClock(u) { return 1.8 * u; }
const GK = [[0, 1], [8, 2], [18, 5], [26, 10], [34, 20], [45, 50], [55, 100], [99, 100]];
export function gravityAt(u) {
  for (let i = 0; i < GK.length - 1; i++) {
    const [u0, g0] = GK[i], [u1, g1] = GK[i + 1];
    if (u <= u1) return Math.exp(lerp(Math.log(g0), Math.log(g1), clamp((u - u0) / (u1 - u0))));
  }
  return 100;
}
const timeAtG = (g) => { for (let u = 0; u <= 65; u += 0.05) if (gravityAt(u) >= g) return u; return Infinity; };
export const BH = new THREE.Vector3(0, 2.6, -72);

// ---------------------------------------------------------------- texturas
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 16;
  if (repeat) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(repeat[0], repeat[1]); }
  return tx;
}
const windowTexture = () => canvasTex(128, 128, (g) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  const gr = g.createLinearGradient(0, 20, 0, 108); gr.addColorStop(0, '#8fb9d9'); gr.addColorStop(0.5, '#3f6585'); gr.addColorStop(1, '#2a465e');
  g.fillStyle = gr; g.fillRect(24, 20, 80, 86);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(30, 26); g.lineTo(62, 26); g.lineTo(30, 70); g.fill();
  g.fillStyle = '#5a6670'; g.fillRect(62, 20, 4, 86); g.fillRect(24, 60, 80, 3); g.fillStyle = '#d9d9d9'; g.fillRect(18, 106, 92, 7);
});
const asphaltTexture = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#4a4d52'; g.fillRect(0, 0, w, h);
  const r = mulberry32(7);
  for (let i = 0; i < 9000; i++) { const v = 50 + r() * 60 | 0; g.fillStyle = `rgb(${v},${v},${v + 4})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
}, [2, 60]);
const dotTexture = () => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); };
const fireTexture = () => canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.2, 'rgba(255,220,120,0.95)'); gr.addColorStop(0.5, 'rgba(255,110,20,0.6)'); gr.addColorStop(0.8, 'rgba(150,20,0,0.2)'); gr.addColorStop(1, 'rgba(60,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const lavaTexture = () => canvasTex(512, 512, (g, w, h) => {
  const r = mulberry32(99); g.fillStyle = '#7a1200'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h, rad = 6 + r() * 34, k = r(); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, k > 0.55 ? 'rgba(255,230,120,0.95)' : 'rgba(255,120,20,0.85)'); gr.addColorStop(1, 'rgba(120,10,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.strokeStyle = 'rgba(40,5,0,0.6)'; g.lineWidth = 3; for (let i = 0; i < 60; i++) { g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
}, [4, 30]);
const diskTexture = () => canvasTex(512, 512, (g, w) => {
  const c = w / 2, r = mulberry32(5);
  const gr = g.createRadialGradient(c, c, c * 0.3, c, c, c);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.08, 'rgba(255,250,230,1)'); gr.addColorStop(0.3, 'rgba(255,190,90,0.95)'); gr.addColorStop(0.65, 'rgba(230,90,20,0.6)'); gr.addColorStop(1, 'rgba(120,20,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 220; i++) { const a = r() * Math.PI * 2, rr = c * (0.35 + r() * 0.6); g.strokeStyle = `rgba(0,0,0,${0.15 + r() * 0.35})`; g.lineWidth = 2 + r() * 6; g.beginPath(); g.arc(c, c, rr, a, a + 0.4 + r() * 1.4); g.stroke(); }
});

// ============================================================================
export async function createApp({ level, width = 1920, height = 1080, quality = 1, fov = 55 }) {
  const W = width, H = height;
  const rnd = mulberry32(777 + level * 31);
  const glCanvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(Math.round(W * quality), Math.round(H * quality), false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const camera = new THREE.PerspectiveCamera(fov, W / H, 0.3, 2000);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xcfe6ff, 0.0026);
  const DOT = dotTexture(), FIRE = fireTexture();

  // ------------------------------------------------------------ céu
  const SUN_DIR = new THREE.Vector3(-0.35, 0.55, -0.76).normalize();
  const skyU = { top: { value: new THREE.Color(0x2f7fd8) }, bottom: { value: new THREE.Color(0xcfe9ff) }, sunDir: { value: SUN_DIR }, sunCol: { value: new THREE.Color(0xfff2c0) }, sunVis: { value: 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunVis; varying vec3 vW;
      void main(){ vec3 d = normalize(vW - cameraPosition); float h = clamp(d.y,0.,1.); vec3 c = mix(bottom, top, pow(h, 0.55));
        float s = max(dot(d, sunDir), 0.); c += sunCol * sunVis * (smoothstep(0.9994, 0.9997, s) * 8. + pow(s, 200.) * 1.4 + pow(s, 12.) * 0.25);
        gl_FragColor = vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -10; scene.add(sky);

  // ------------------------------------------------------------ luzes
  const hemi = new THREE.HemisphereLight(0xd6ecff, 0x8d7b62, 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.8);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 400 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  sun.target.position.set(0, 0, -30); sun.position.set(-60, 110, 60); scene.add(sun, sun.target);
  const glowLight = new THREE.PointLight(0xff8a3a, 0, 200, 1.5); glowLight.position.copy(BH); scene.add(glowLight);

  // ------------------------------------------------------------ curvatura do espaço-tempo (nível 7): o chão "afunda" em direção ao buraco negro
  const warpU = { uBH: { value: BH.clone() }, uK: { value: 0 } };
  const warp = (mat) => {
    if (level !== 7) return mat;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      Object.assign(sh.uniforms, warpU);
      sh.vertexShader = 'uniform vec3 uBH; uniform float uK;\n' + sh.vertexShader.replace('#include <project_vertex>', `
        vec4 wpos = modelMatrix * vec4(transformed, 1.0);
        vec3 toH = uBH - wpos.xyz; float dist = length(toH);
        wpos.xyz += toH * uK * 1.0 / (1.0 + pow(dist / 26.0, 2.0));
        vec4 mvPosition = viewMatrix * wpos; gl_Position = projectionMatrix * mvPosition;`);
    };
    mat.customProgramCacheKey = () => 'warp' + (prev ? 'w' : '');
    return mat;
  };
  const std = (color, extra = {}) => warp(new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, flatShading: true, ...extra }));
  const shadowed = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  // ------------------------------------------------------------ chão e rua
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000, 60, 60), std(0xb3ad9f, { flatShading: false }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const roadMat = warp(new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.95, emissive: 0x000000 }));
  const road = new THREE.Mesh(new THREE.PlaneGeometry(11, 520, 4, 120), roadMat);
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.04, -220); road.receiveShadow = true; scene.add(road);
  const walks = [];
  for (const s of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.22, 520, 1, 1, 120), std(0xcfc8bb)); walk.position.set(s * 7.3, 0.11, -220); walk.receiveShadow = true; scene.add(walk); walks.push(walk);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 520, 1, 1, 60), std(0xf2f2f2, { emissive: 0x222222 })); edge.position.set(s * 5.05, 0.08, -220); scene.add(edge); walks.push(edge);
  }
  const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.02, 3.2), std(0xf4d35e, { emissive: 0x332a00 }), 50);
  { const m = new THREE.Matrix4(); for (let i = 0; i < 50; i++) { m.makeTranslation(0, 0.08, 30 - i * 9); dash.setMatrixAt(i, m); } }
  scene.add(dash); walks.push(dash);
  walks.forEach((w) => { w.userData.y0 = w.position.y; });
  // rachaduras/afundamento do asfalto (nível 4)
  const cracks = new THREE.Group(); scene.add(cracks);
  if (level === 4) {
    const cm = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    for (let i = 0; i < 26; i++) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.25 + rnd() * 0.4, 6 + rnd() * 14), cm);
      c.rotation.x = -Math.PI / 2; c.rotation.z = (rnd() - 0.5) * 1.4; c.position.set((rnd() - 0.5) * 9, 0.1, 10 - rnd() * 90); c.userData.t = 30 + rnd() * 12; cracks.add(c);
    }
  }

  // ------------------------------------------------------------ prédios (blocos instanciados)
  const PALETTE = ['#f4a259', '#5b8e7d', '#bc4b51', '#f4e285', '#8cb369', '#5fa8d3', '#e07a5f', '#81b29a', '#f2cc8f', '#9d8df1', '#ef8fa0', '#62b6cb', '#ffffff', '#c3b299'];
  const buildings = [];
  for (const side of [-1, 1]) {
    let z = side < 0 ? 16 : 11;
    while (z > -290) {
      const far = z < -130, w = 8 + rnd() * 7, d = 9 + rnd() * 8;
      const h = far ? 26 + rnd() * 60 : 12 + rnd() * 34 + (z < -40 ? 12 : 0);
      buildings.push({ side, w, d, h, x: side * (9.6 + w / 2 + rnd() * 1.2), z: z - d / 2, color: PALETTE[(rnd() * PALETTE.length) | 0], cs: far ? 3.6 : 2.5, r: rnd() });
      z -= d + 2 + rnd() * 4;
    }
  }
  buildings.forEach((b, i) => {
    b.i = i;
    if (level === 1) b.tc = 18 + b.r * 18 + clamp(-b.z / 300) * 6;                       // vira pó
    if (level === 3) b.tm = 44 + b.r * 8;                                                // derrete
    if (level === 4) b.tc = timeAtG(12 + (1 - clamp((b.h - 12) / 70)) * 45 + b.r * 6);  // desaba (mais altos primeiro)
  });
  const CH = [];
  for (const b of buildings) {
    const nx = Math.max(2, Math.round(b.w / b.cs)), nz = Math.max(2, Math.round(b.d / b.cs)), ny = Math.max(3, Math.round(b.h / (b.cs * 1.05)));
    const sx = b.w / nx, sz = b.d / nz, sy = b.h / ny, base = new THREE.Color(b.color);
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
      if (!(ix === 0 || iz === 0 || ix === nx - 1 || iz === nz - 1 || iy === ny - 1)) continue;
      const x0 = b.x - b.w / 2 + sx * (ix + 0.5), y0 = sy * (iy + 0.5), z0 = b.z - b.d / 2 + sz * (iz + 0.5);
      const r1 = rnd(), r2 = rnd(), r3 = rnd();
      const c = { b, iy, ny, x0, y0, z0, sx: sx * 0.985, sy: sy * 0.985, sz: sz * 0.985, hf: iy / (ny - 1), r1, r2, r3,
        axis: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), color: base.clone().offsetHSL((r1 - 0.5) * 0.02, (r2 - 0.5) * 0.08, (r3 - 0.5) * 0.12) };
      if (level === 7) {
        const rel = new THREE.Vector3(x0, y0, z0).sub(BH), d0 = rel.length();
        c.d0 = d0; c.ts = 21 + Math.min(d0 / 130, 1.6) * 24 + r1 * 4; c.T = 4 + r2 * 4; c.th0 = Math.atan2(rel.z, rel.x); c.rel = rel;
      }
      CH.push(c);
    }
  }
  const fxU = { uMode: { value: level === 1 ? 1 : level === 3 ? 2 : 0 } };
  const winMat = new THREE.MeshStandardMaterial({ map: windowTexture(), roughness: 0.55, metalness: 0.05, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  const fxPatch = (mat, withMap) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uMode = fxU.uMode;
      sh.vertexShader = 'attribute float aFx; varying float vFx;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vFx = aFx;');
      sh.fragmentShader = 'uniform float uMode; varying float vFx;\n' + sh.fragmentShader
        .replace('#include <color_fragment>', withMap ? `
          float wallMask = smoothstep(0.55, 0.85, sampledDiffuseColor.r);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vColor.rgb, wallMask);` : '#include <color_fragment>')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          if (uMode > 0.5 && uMode < 1.5) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.52, 0.5, 0.48), vFx);
          if (uMode > 1.5) { diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.08, 0.03, 0.02), clamp(vFx * 1.4, 0., 1.)); totalEmissiveRadiance += vec3(1.0, 0.32, 0.05) * pow(vFx, 1.5) * 3.0; }`);
    };
    return warp(mat);
  };
  fxPatch(winMat, true); fxPatch(roofMat, false);
  const chunkGeo = new THREE.BoxGeometry(1, 1, 1);
  const fxArr = new Float32Array(CH.length), fxAttr = new THREE.InstancedBufferAttribute(fxArr, 1); fxAttr.setUsage(THREE.DynamicDrawUsage);
  chunkGeo.setAttribute('aFx', fxAttr);
  const chunkMesh = new THREE.InstancedMesh(chunkGeo, [winMat, winMat, roofMat, roofMat, winMat, winMat], CH.length);
  chunkMesh.castShadow = true; chunkMesh.receiveShadow = true; chunkMesh.frustumCulled = false;
  CH.forEach((c, i) => chunkMesh.setColorAt(i, c.color)); chunkMesh.instanceColor.needsUpdate = true; scene.add(chunkMesh);

  // ------------------------------------------------------------ árvores
  const trunkMat = std(0x6e5236);
  const trees = [];
  for (const side of [-1, 1]) for (let z = side < 0 ? 15 : 7; z > -160; z -= 14 + rnd() * 4) {
    const g = new THREE.Group(), crown = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 4.4, 7), trunkMat); trunk.position.y = 2.2; g.add(trunk);
    const lm = std(0x4f9a3a, { roughness: 0.9 });
    for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + rnd() * 0.7, 0), lm); const a = k * 1.3 + rnd(); m.position.set(Math.cos(a) * 1.1 * (k ? 1 : 0), 0.6 + rnd() * 1.4 + (k ? 0 : 0.8), Math.sin(a) * 1.1 * (k ? 1 : 0)); crown.add(m); }
    crown.position.y = 4.4; g.add(crown);
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: FIRE, color: 0xffa040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    fire.position.y = 6; g.add(fire);
    shadowed(g); g.position.set(side * (6.4 + rnd() * 0.4), 0.22, z); g.rotation.y = rnd() * 6.28; g.scale.setScalar(0.85 + rnd() * 0.35);
    scene.add(g);
    trees.push({ g, p0: g.position.clone(), s0: g.scale.x, crown, lm, fire, side, ph: rnd() * 6.28, base: new THREE.Color().setHSL(0.27 + rnd() * 0.06, 0.55, 0.36 + rnd() * 0.08), tIgn: 12.5 + rnd() * 3.5, gSnap: 6 + rnd() * 4, ts: 30 + rnd() * 16 });
  }
  // ------------------------------------------------------------ postes (com junta no meio para dobrar)
  const poleMat = std(0x30343a, { metalness: 0.5, roughness: 0.5 });
  const lamps = [];
  for (let z = 10; z > -150; z -= 21) for (const side of [-1, 1]) {
    const zz = z - (side > 0 ? 10 : 0), g = new THREE.Group();
    const low = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 3.5, 8), poleMat); low.position.y = 1.75; g.add(low);
    const top = new THREE.Group(); top.position.y = 3.5; g.add(top);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.5, 8), poleMat); up.position.y = 1.75; top.add(up);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.12), poleMat); arm.position.set(-side * 0.85, 3.45, 0); top.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.4), new THREE.MeshStandardMaterial({ color: 0x777777, emissive: 0xffc777, emissiveIntensity: 0 })); head.position.set(-side * 1.7, 3.32, 0); top.add(head);
    shadowed(g); g.position.set(side * 6.7, 0.22, zz); scene.add(g);
    lamps.push({ g, top, head, side, x: g.position.x, z: zz, gb: 6 + rnd() * 6, ph: rnd() * 6.28, ts: 26 + rnd() * 18, r: rnd() });
  }
  // ------------------------------------------------------------ carros
  const CAR_COLORS = [0xe63946, 0x1d3557, 0xf1c40f, 0x2a9d8f, 0xffffff, 0xff7f11, 0x6c5ce7, 0x222222, 0x48cae4, 0xb5179e];
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12); wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = std(0x111111), glassMat = std(0x9ec9e6, { metalness: 0.3, roughness: 0.2 });
  const cars = [];
  [[1, -14], [-1, -22], [1, -38], [-1, -47], [1, -62], [-1, -76], [1, -95], [-1, -108], [1, -128], [-1, -140], [1, 2], [-1, -6]].forEach(([dir, zf], i) => {
    const g = new THREE.Group(), body = std(CAR_COLORS[i % CAR_COLORS.length], { metalness: 0.3, roughness: 0.45 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 4.2), body); b.position.y = 0.72; g.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.62, 2.2), glassMat); c.position.set(0, 1.4, -0.2); g.add(c);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 2.0), body); roof.position.set(0, 1.75, -0.2); g.add(roof);
    for (const [x, z] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) { const w = new THREE.Mesh(wheelGeo, wheelMat); w.position.set(x, 0.38, z); g.add(w); }
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: FIRE, color: 0xffa040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); fire.position.y = 2; g.add(fire);
    const boom = new THREE.Sprite(new THREE.SpriteMaterial({ map: FIRE, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); boom.position.y = 1.5; g.add(boom);
    shadowed(g); scene.add(g);
    const v = 7 + rnd() * 5;
    cars.push({ g, body, dir, x: dir > 0 ? 2.6 : -2.6, v, z0: zf - dir * v * 11, zf, fire, boom, tIgn: 21 + rnd() * 5, gFlat: 8 + rnd() * 6, tp: 13 + rnd() * 9, sp: (rnd() - 0.5) * 3, ph: rnd() * 6.28, baseColor: body.color.clone() });
  });
  const carStopT = level === 1 ? 10 : level === 3 ? 3 : level === 4 ? 8 : 6;
  const carDisp = (u) => (u < carStopT ? u : u < carStopT + 2 ? carStopT + (u - carStopT) - 0.25 * (u - carStopT) ** 2 : carStopT + 1);
  cars.forEach((c) => { c.z0 = c.zf - c.dir * c.v * (carStopT + 1); });
  // ------------------------------------------------------------ pedestres
  const SKIN = [0xf1c27d, 0xc68642, 0x8d5524, 0xe0ac69, 0xffdbac], SHIRT = [0xe63946, 0x457b9d, 0xf4a261, 0x2a9d8f, 0xffffff, 0x8338ec, 0xffbe0b, 0x3a86ff];
  const people = [];
  for (let i = 0; i < 20; i++) {
    const g = new THREE.Group(), skin = std(SKIN[i % 5]), shirt = std(SHIRT[(i * 3) % 8]), pants = std([0x1d3557, 0x333333, 0x6b4f3a, 0x264653][i % 4]);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.68, 0.3), shirt); torso.position.y = 1.18; g.add(torso);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), skin); head.position.y = 1.72; g.add(head);
    const limb = (w, h, mat, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat); m.position.y = -h / 2; p.add(m); g.add(p); return p; };
    const lL = limb(0.19, 0.84, pants, -0.12, 0.84), lR = limb(0.19, 0.84, pants, 0.12, 0.84), aL = limb(0.13, 0.64, shirt, -0.33, 1.48), aR = limb(0.13, 0.64, shirt, 0.33, 1.48);
    shadowed(g); scene.add(g);
    const side = i % 2 ? 1 : -1;
    people.push({ g, lL, lR, aL, aR, side, dir: rnd() > 0.5 ? 1 : -1, x: side * (6.4 + rnd() * 1.8), z0: 20 - rnd() * 90, v: 1.1 + rnd() * 0.6, ph: rnd() * 6.28, r: rnd() });
  }

  // ------------------------------------------------------------ partículas (poeira / bolhas / brasas / fluxo para o buraco negro)
  const NP = 6000, pPos = new Float32Array(NP * 3), pSeed = [];
  for (let i = 0; i < NP; i++) pSeed.push({ b: buildings[(rnd() * buildings.length) | 0], x: rnd(), y: rnd(), z: rnd(), s: rnd(), a: rnd() * Math.PI * 2 });
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ size: level === 1 ? 2.2 : level === 7 ? 0.35 : 0.5, map: DOT, color: 0xbfb8ae, transparent: true, opacity: 0, depthWrite: false, blending: level === 7 || level === 3 ? THREE.AdditiveBlending : THREE.NormalBlending });
  const parts = new THREE.Points(pGeo, pMat); parts.frustumCulled = false; scene.add(parts);
  // montes de pó (nível 1)
  const piles = [];
  if (level === 1) for (const b of buildings) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 9), std(0x8c8780)); m.position.set(b.x, 0, b.z); m.scale.set(0.001, 0.001, 0.001); m.receiveShadow = true; scene.add(m); piles.push({ m, b });
  }
  // lava (nível 3)
  const lavaTx = lavaTexture();
  const lava = new THREE.Mesh(new THREE.PlaneGeometry(60, 520), new THREE.MeshBasicMaterial({ map: lavaTx, color: 0xffffff, fog: false }));
  lava.rotation.x = -Math.PI / 2; lava.position.set(0, -1, -220); lava.visible = false; scene.add(lava);
  const lavaGlow = new THREE.PointLight(0xff5a10, 0, 120, 1.2); lavaGlow.position.set(0, 6, -10); scene.add(lavaGlow);
  // buraco negro (nível 7)
  const bh = new THREE.Group(); bh.position.copy(BH); bh.visible = false; scene.add(bh);
  const bhCore = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })); bh.add(bhCore);
  const diskTx = diskTexture();
  const disk = new THREE.Mesh(new THREE.RingGeometry(1.4, 6, 96, 1), new THREE.MeshBasicMaterial({ map: diskTx, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  { const uv = disk.geometry.attributes.uv, p = disk.geometry.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 12 + 0.5, p.getY(i) / 12 + 0.5); }
  disk.rotation.x = -Math.PI / 2 + 0.32; bh.add(disk);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: FIRE, color: 0xffb070, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); bh.add(halo);
  const ringTx = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 40, 128, 128, 128); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.42, 'rgba(255,230,190,0)'); gr.addColorStop(0.5, 'rgba(255,230,190,1)'); gr.addColorStop(0.6, 'rgba(255,150,60,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
  const photon = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTx, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); bh.add(photon);

  // ============================================================ composição 2D (pós-processamento leve)
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const ctx = comp.getContext('2d');
  function post(u) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (level === 1) {
      const d = smooth(10, 14, u) * (1 - 0.6 * smooth(44, 50, u)); if (d > 0) { ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${0.75 * d})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      const ret = u - 44.5; if (ret > 0 && ret < 1.5) { ctx.fillStyle = `rgba(230,225,215,${0.5 * Math.exp(-ret * 3)})`; ctx.fillRect(0, 0, W, H); }
    }
    if (level === 3) {
      const h = smooth(2, 40, u); ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(255,90,20,${0.55 * h})`; ctx.fillRect(0, 0, W, H); ctx.restore();
      // ondas de calor (deslocamento de faixas horizontais na metade de baixo)
      const hz = smooth(6, 30, u); if (hz > 0) { for (let i = 0; i < 18; i++) { const y = H * 0.5 + i * (H * 0.5 / 18), dx = Math.sin(u * 9 + i * 1.7) * 6 * hz; ctx.drawImage(comp, 0, y, W, H * 0.5 / 18, dx, y, W, H * 0.5 / 18); } }
    }
    if (level === 4) { const k = smooth(20, 60, u); if (k > 0) { ctx.fillStyle = `rgba(20,25,40,${0.35 * k})`; ctx.fillRect(0, 0, W, H); } }
    if (level === 7) {
      // "lente gravitacional": zoom radial em direção ao buraco negro
      const k = smooth(14, 58, u);
      const p = BH.clone().project(camera), sx = (p.x * 0.5 + 0.5) * W, sy = (-p.y * 0.5 + 0.5) * H;
      if (k > 0.02) { ctx.save(); for (let i = 1; i <= 3; i++) { const s = 1 + 0.025 * i * k; ctx.globalAlpha = 0.22 * k; ctx.drawImage(comp, sx - sx * s, sy - sy * s, W * s, H * s); } ctx.restore(); }
      const app = u - 3; if (app > 0 && app < 1.2) { ctx.fillStyle = `rgba(255,240,220,${0.7 * Math.exp(-app * 4)})`; ctx.fillRect(0, 0, W, H); }
      const end = smooth(60.5, 63.5, u); if (end > 0) { ctx.fillStyle = `rgba(0,0,0,${end})`; ctx.fillRect(0, 0, W, H); }
    }
    const fade = smooth(63.8, 64.9, u); if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
  }

  // ============================================================ atualização por tempo
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), V = new THREE.Vector3();
  const ZAX = new THREE.Vector3(0, 0, 1), UPV = new THREE.Vector3(0, 1, 0);
  let shake = 0;

  function update(u) {
    shake = 0;
    const G = level === 4 ? gravityAt(u) : 1;
    const bhK = level === 7 ? Math.pow(smooth(4, 60, u), 1.4) : 0;
    // ---------------- céu e luz por nível
    let top = new THREE.Color(0x2f7fd8), bot = new THREE.Color(0xcfe9ff), fogC = new THREE.Color(0xcfe6ff), fogD = 0.0026, hemiI = 1.0, sunI = 2.8, sunVis = 1;
    if (level === 1) {
      const d = smooth(10, 15, u) * (1 - 0.55 * smooth(44, 50, u)), dust = smooth(22, 40, u);
      top.lerp(new THREE.Color(0x03050b), d); bot.lerp(new THREE.Color(0x1e2230), d); bot.lerp(new THREE.Color(0x8a857c), dust * 0.6);
      fogC.lerp(new THREE.Color(0x2a2c32), d).lerp(new THREE.Color(0x9a958c), dust); fogD += 0.012 * dust + 0.01 * smooth(44, 48, u);
      hemiI = 1 - 0.7 * d;
    }
    if (level === 3) {
      const h = smooth(6, 34, u), s = smooth(30, 60, u);
      top.lerp(new THREE.Color(0x8a1a08), h).lerp(new THREE.Color(0x2a0503), s); bot.lerp(new THREE.Color(0xff7a2a), h).lerp(new THREE.Color(0xc22a08), s);
      fogC.lerp(new THREE.Color(0xd8642a), h).lerp(new THREE.Color(0x5a1a08), s); fogD += 0.006 * h + 0.008 * s; sunI = 2.8 + 1.2 * h; hemiI = 1 + 0.4 * h;
    }
    if (level === 4) {
      const k = smooth(18, 60, u);
      top.lerp(new THREE.Color(0x0e1a3a), k); bot.lerp(new THREE.Color(0x7a8aa0), k); fogC.lerp(new THREE.Color(0x56607a), k); fogD += 0.01 * k; hemiI = 1 - 0.4 * k;
    }
    if (level === 7) {
      const k = smooth(5, 50, u);
      top.lerp(new THREE.Color(0x0a0a1a), k); bot.lerp(new THREE.Color(0x4a3a5a), k); fogC.lerp(new THREE.Color(0x1a1420), k); hemiI = 1 - 0.55 * k; sunI = 2.8 * (1 - 0.6 * k);
    }
    skyU.top.value.copy(top); skyU.bottom.value.copy(bot); skyU.sunVis.value = sunVis;
    scene.fog.color.copy(fogC); scene.fog.density = fogD; hemi.intensity = hemiI; sun.intensity = sunI;
    if (level === 3) { sun.color.copy(mixColor(0xfff0d8, 0xff8a40, smooth(6, 30, u))); hemi.color.copy(mixColor(0xd6ecff, 0xff9a60, smooth(6, 30, u))); }

    // ---------------- câmera
    let cy = 3.6, cz = 22 - u * 0.08, look = new THREE.Vector3(0, 7, -40), fv = fov, roll = 0;
    if (level === 4) { cy = lerp(3.6, 1.3, smooth(10, 50, u)); look.y = lerp(7, 4, smooth(20, 55, u)); }
    if (level === 7) {
      const pull = smooth(44, 61, u);
      cz = lerp(22 - u * 0.08, BH.z + 6, Math.pow(pull, 1.6)); cy = lerp(3.6, BH.y, pull); look.copy(BH); fv = fov + 25 * pull; roll = pull * pull * 1.6;
      shake += 0.15 * smooth(10, 40, u) + 0.6 * pull;
    }

    // ---------------- prédios
    let maxFall = 0;
    for (let i = 0; i < CH.length; i++) {
      const c = CH[i], b = c.b;
      let px = c.x0, py = c.y0, pz = c.z0, sx = c.sx, sy = c.sy, sz = c.sz, fx = 0;
      Q.identity();
      if (level === 1) {
        const gray = smooth(b.tc - 6, b.tc - 0.5, u); fx = gray;
        const tb = b.tc + c.r1 * 1.8 + c.hf * 0.6, dt = u - tb;
        if (dt > 0) { const fall = 0.5 * 14 * dt * dt; py = Math.max(c.sy * 0.3, c.y0 - fall); const k = smooth(0, 1.4 + c.hf * 0.8, dt); sx *= 1 - k; sy *= 1 - k; sz *= 1 - k; px += (c.r2 - 0.5) * k * 2; pz += (c.r3 - 0.5) * k * 2; maxFall = Math.max(maxFall, Math.exp(-dt * 2)); }
        if (u > 44 && dt > 0) px += (u - 44) * 3 * c.r1;
      } else if (level === 3) {
        fx = 0.25 * smooth(30, 40, u) * c.r1;
        const m = smooth(b.tm + c.hf * -3, b.tm + 10 + c.r2 * 4, u);
        if (m > 0) { fx = Math.max(fx, 0.3 + 0.7 * m); py = c.y0 * (1 - 0.88 * m) + c.sy * 0.2 * m; sy *= 1 - 0.6 * m; px = lerp(c.x0, c.x0 * (1 - 0.35 * m), m); sx *= 1 + 0.4 * m; sz *= 1 + 0.3 * m; Q.setFromAxisAngle(c.axis, m * 0.4); }
      } else if (level === 4) {
        const dt = u - (b.tc + (1 - c.hf) * 0.15 + c.r1 * 0.2);
        if (dt > 0) {
          const a = 9.8 * Math.min(G, 60), finalY = c.sy * 0.12 * (c.iy + 0.5) * 0.35 + 0.1, fall = 0.5 * a * dt * dt;
          py = Math.max(finalY, c.y0 - fall); const landed = py <= finalY + 1e-3;
          if (landed) { sy *= 0.3; px += (c.r2 - 0.5) * 1.5; pz += (c.r3 - 0.5) * 1.5; Q.setFromAxisAngle(c.axis, 0.3 * c.r1); }
          maxFall = Math.max(maxFall, Math.exp(-dt * 3));
        }
      } else if (level === 7) {
        const dt = u - c.ts;
        if (dt > 0) {
          const k = smooth(0, c.T, dt), r = c.d0 * (1 - Math.pow(k, 0.75));
          const th = c.th0 + (1 - r / c.d0) * Math.PI * 2.4;
          const yRel = c.rel.y * (r / c.d0);
          px = BH.x + Math.cos(th) * r * (Math.hypot(c.rel.x, c.rel.z) / c.d0); pz = BH.z + Math.sin(th) * r * (Math.hypot(c.rel.x, c.rel.z) / c.d0); py = BH.y + yRel;
          V.set(BH.x - px, BH.y - py, BH.z - pz).normalize(); Q.setFromUnitVectors(ZAX, V);
          const st = 1 + 5 * k, sh = 1 / Math.sqrt(st) * (1 - smooth(0.85, 1, k));
          sx = c.sx * sh; sy = c.sy * sh; sz = Math.max(c.sx, c.sz) * st * (1 - smooth(0.9, 1, k));
          fx = 0;
        }
      }
      fxArr[i] = fx;
      P.set(px, py, pz); S.set(Math.max(sx, 1e-4), Math.max(sy, 1e-4), Math.max(sz, 1e-4)); M.compose(P, Q, S); chunkMesh.setMatrixAt(i, M);
    }
    chunkMesh.instanceMatrix.needsUpdate = true; fxAttr.needsUpdate = true;
    shake += 0.4 * maxFall;

    // ---------------- montes de pó (nível 1)
    for (const p of piles) { const k = smooth(p.b.tc, p.b.tc + 4, u); const s = Math.max(0.001, k); p.m.scale.set(p.b.w * 0.55 * s, p.b.h * 0.14 * s, p.b.d * 0.55 * s); p.m.position.y = p.b.h * 0.07 * s; }

    // ---------------- asfalto (nível 3 ferve / nível 4 afunda)
    if (level === 3) { const boil = smooth(9, 20, u); roadMat.emissive.setRGB(0.5 * boil, 0.12 * boil, 0.02 * boil); roadMat.emissiveIntensity = 0.6 + 0.4 * Math.sin(u * 6); roadMat.color.copy(mixColor(0xffffff, 0x2a1a14, boil)); }
    if (level === 4) {
      const sink = -1.6 * smooth(28, 48, u);
      road.position.y = 0.04 + sink; for (const w of walks) w.position.y = w.userData.y0 + sink;
      cracks.children.forEach((c) => { c.visible = u > c.userData.t; c.position.y = 0.1 + sink; c.scale.y = smooth(c.userData.t, c.userData.t + 2, u) + 0.001; });
    }
    // lava (nível 3)
    lava.visible = level === 3 && u > 44;
    if (lava.visible) { lava.position.y = lerp(-0.5, 3.2, smooth(45, 63, u)); lavaTx.offset.set(u * 0.01, -u * 0.04); }
    lavaGlow.intensity = level === 3 ? 900 * smooth(44, 56, u) : 0;

    // ---------------- árvores
    for (const tr of trees) {
      tr.g.visible = true; tr.g.position.copy(tr.p0); tr.g.scale.setScalar(tr.s0); tr.g.rotation.x = 0; tr.g.rotation.z = 0; tr.crown.scale.setScalar(1); tr.crown.position.y = 4.4; tr.fire.material.opacity = 0;
      tr.lm.color.copy(tr.base);
      if (level === 3) {
        const ign = smooth(tr.tIgn - 0.5, tr.tIgn + 0.5, u), burnt = smooth(tr.tIgn + 2, tr.tIgn + 14, u);
        tr.lm.color.copy(tr.base).lerp(new THREE.Color(0x140c08), smooth(tr.tIgn - 3, tr.tIgn + 3, u));
        tr.crown.scale.setScalar(Math.max(0.001, 1 - 0.85 * burnt));
        tr.fire.material.opacity = ign * (1 - 0.6 * burnt) * (0.75 + 0.25 * Math.sin(u * 17 + tr.ph)); tr.fire.scale.setScalar(7 * (0.8 + 0.2 * Math.sin(u * 11 + tr.ph)));
      }
      if (level === 4) {
        const bend = smooth(Math.log(3), Math.log(tr.gSnap), Math.log(G)); tr.crown.position.y = 4.4 - 1.2 * bend; tr.crown.scale.set(1 + 0.2 * bend, 1 - 0.5 * bend, 1 + 0.2 * bend);
        const snap = smooth(timeAtG(tr.gSnap), timeAtG(tr.gSnap) + 0.8, u); tr.g.rotation.z = -tr.side * 1.45 * snap; tr.g.rotation.x = 0.1 * bend; if (snap > 0) tr.crown.scale.multiplyScalar(1 - 0.45 * snap);
      }
      if (level === 7) {
        const lean = bhK * 0.4; V.copy(BH).sub(tr.g.position); tr.g.rotation.x = -lean * Math.sign(V.z) * 0.6; tr.g.rotation.z = lean * -Math.sign(V.x) * 0.3;
        const dt = u - tr.ts;
        if (dt > 0) { const k = smooth(0, 3.5, dt); tr.g.position.lerp(BH, Math.pow(k, 1.5)); tr.g.scale.setScalar(Math.max(0.001, (1 - k) * tr.s0)); tr.g.rotation.y = k * 6; }
      }
    }
    // ---------------- postes
    for (const L of lamps) {
      L.top.rotation.set(0, 0, 0); L.g.rotation.set(0, 0, 0); L.g.position.set(L.x, 0.22, L.z); L.g.scale.setScalar(1);
      L.head.material.emissiveIntensity = 0;
      if (level === 3) L.head.material.emissiveIntensity = 0;
      if (level === 4) { const b = smooth(timeAtG(L.gb), timeAtG(L.gb) + 1.4, u); L.top.rotation.z = L.side * 1.7 * b; L.g.position.y = 0.22 - 1.6 * smooth(28, 48, u) * 0.6; }
      if (level === 7) {
        V.copy(BH).sub(L.g.position).normalize(); L.g.rotation.x = -V.z * 0.35 * bhK; L.g.rotation.z = V.x * 0.35 * bhK;
        const dt = u - L.ts; if (dt > 0) { const k = smooth(0, 3, dt); L.g.position.lerp(BH, Math.pow(k, 1.5)); L.g.scale.setScalar(Math.max(0.001, 1 - k)); L.g.rotation.y = k * 8; }
      }
    }
    // ---------------- carros
    for (const c of cars) {
      const z = wrap(c.z0 + c.dir * c.v * carDisp(u), -175, 34);
      c.g.position.set(c.x, 0, z); c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0); c.g.scale.set(1, 1, 1); c.g.visible = true;
      c.body.color.copy(c.baseColor); c.fire.material.opacity = 0; c.boom.material.opacity = 0;
      if (level === 3) {
        const ign = smooth(c.tIgn, c.tIgn + 0.6, u), ex = u - (c.tIgn + 1.5);
        c.body.color.copy(c.baseColor).lerp(new THREE.Color(0x150f0c), smooth(c.tIgn, c.tIgn + 4, u));
        c.fire.material.opacity = ign * (0.7 + 0.3 * Math.sin(u * 15 + c.ph)); c.fire.scale.setScalar(5 + Math.sin(u * 9 + c.ph));
        if (ex > 0 && ex < 2) { c.boom.material.opacity = Math.exp(-ex * 2.2); c.boom.scale.setScalar(4 + 22 * Math.pow(smooth(0, 0.6, ex), 0.6)); shake = Math.max(shake, 0.35 * Math.exp(-ex * 3)); c.g.position.y = Math.max(0, 3 * ex - 6 * ex * ex); }
        if (u > 50) c.g.position.y = -smooth(50, 62, u) * 1.2;
      }
      if (level === 4) { const k = smooth(Math.log(c.gFlat), Math.log(c.gFlat * 3), Math.log(G)); c.g.scale.set(1 + 0.15 * k, 1 - 0.75 * k, 1 + 0.08 * k); c.g.position.y = -1.6 * smooth(28, 48, u) * 0.9; }
      if (level === 7) {
        const dt = u - c.tp;
        if (dt > 0) {
          const zz = z - 0.5 * (2 + 6 * bhK) * dt * dt;
          const d = zz - BH.z, k = clamp(1 - d / (z - BH.z));
          c.g.position.set(lerp(c.x, BH.x, k * k), lerp(0, BH.y, k * k), Math.max(BH.z, zz));
          c.g.rotation.set(0, (c.dir > 0 ? 0 : Math.PI) + c.sp * dt * k, c.sp * dt * 0.5 * k);
          c.g.scale.set(Math.max(0.001, 1 - k * 0.8), Math.max(0.001, 1 - k * 0.8), 1 + 4 * k * k);
          c.g.visible = k < 0.98;
        }
      }
    }
    // ---------------- pedestres
    for (const p of people) {
      const zz = wrap(p.z0 + p.dir * p.v * Math.min(u, 30), -85, 22);
      let vis = true, crouch = 0, walk = 1;
      if (level === 1) { walk = 1 - smooth(10, 12, u); crouch = smooth(13 + p.r * 3, 16 + p.r * 3, u); vis = u < 30; }
      if (level === 3) { vis = u < 2 + p.r * 1.5; }
      if (level === 4) { walk = 1 - smooth(4, 7, u); crouch = smooth(5 + p.r * 2, 9 + p.r * 2, u); vis = u < 18; }
      if (level === 7) { vis = u < 10 + p.r * 2; walk = 1 + smooth(5, 8, u); }
      p.g.visible = vis; if (!vis) continue;
      const ph = u * p.v * 4.2 * walk + p.ph, sw = Math.sin(ph) * 0.55 * Math.min(1, walk);
      p.g.position.set(p.x, Math.abs(Math.cos(ph)) * 0.05 * walk - crouch * 0.55, zz);
      p.g.rotation.set(-crouch * 0.4, p.dir > 0 ? 0 : Math.PI, 0);
      p.lL.rotation.x = sw + crouch * 1.4; p.lR.rotation.x = -sw + crouch * 1.4; p.aL.rotation.x = -sw * 0.8 - crouch * 0.6; p.aR.rotation.x = sw * 0.8 - crouch * 0.6;
    }
    // ---------------- partículas
    let op = 0;
    if (level === 1) {
      op = 0.75 * smooth(18, 24, u) * (1 - 0.4 * smooth(52, 64, u)); pMat.color.setHex(0xa7a29a);
      for (let i = 0; i < NP; i++) {
        const s = pSeed[i], b = s.b, age = u - b.tc - s.s * 2;
        if (age < 0) { pPos[i * 3 + 1] = -50; continue; }
        const rr = (b.w * 0.5 + age * 2.2 * (0.5 + s.x));
        pPos[i * 3] = b.x + Math.cos(s.a) * rr + (u > 44 ? (u - 44) * 8 * s.y : 0);
        pPos[i * 3 + 1] = Math.min(b.h * 1.1, s.y * (2 + age * 3.5));
        pPos[i * 3 + 2] = b.z + Math.sin(s.a) * rr;
      }
    }
    if (level === 3) {
      op = 0.85 * smooth(9, 14, u); pMat.color.setHex(0xff8a30);
      for (let i = 0; i < NP; i++) {
        const s = pSeed[i];
        if (i % 2 === 0) { pPos[i * 3] = (s.x - 0.5) * 10; pPos[i * 3 + 2] = 18 - s.z * 120; pPos[i * 3 + 1] = 0.1 + Math.abs(Math.sin(u * (3 + s.s * 4) + s.a)) * 0.25; }        // bolhas do asfalto
        else { const ph = (s.s + u * 0.12 * (0.5 + s.y)) % 1; pPos[i * 3] = (s.x - 0.5) * 60; pPos[i * 3 + 1] = ph * 40; pPos[i * 3 + 2] = 18 - s.z * 120 + Math.sin(u + s.a); } // brasas
      }
    }
    if (level === 4) {
      op = 0.6 * maxFall; pMat.color.setHex(0x9a958c);
      for (let i = 0; i < NP; i++) { const s = pSeed[i], b = s.b, age = u - b.tc; if (age < 0 || age > 6) { pPos[i * 3 + 1] = -50; continue; } const rr = b.w * 0.5 + age * 6 * s.x; pPos[i * 3] = b.x + Math.cos(s.a) * rr; pPos[i * 3 + 1] = s.y * 6 * Math.min(1, age); pPos[i * 3 + 2] = b.z + Math.sin(s.a) * rr; }
      op = 0.7 * smooth(14, 18, u);
    }
    if (level === 7) {
      op = 0.9 * smooth(4, 10, u); pMat.color.setHex(0xffc890);
      for (let i = 0; i < NP; i++) {
        const s = pSeed[i], f = (s.s + u * (0.08 + 0.12 * s.y) * (0.5 + bhK)) % 1, r0 = 6 + s.x * 80, r = r0 * (1 - f) + 1.2;
        const th = s.a + (r0 / r) * 0.6 + u * 0.3;
        pPos[i * 3] = BH.x + Math.cos(th) * r; pPos[i * 3 + 1] = BH.y + (s.z - 0.5) * r * 0.25; pPos[i * 3 + 2] = BH.z + Math.sin(th) * r;
      }
    }
    pMat.opacity = op; parts.visible = op > 0.01; if (parts.visible) pGeo.attributes.position.needsUpdate = true;

    // ---------------- buraco negro
    bh.visible = level === 7 && u > 2.8;
    if (bh.visible) {
      const grow = smooth(2.8, 4, u) * (0.8 + 1.2 * smooth(4, 45, u)) + 50 * Math.pow(smooth(56, 62, u), 2);
      bhCore.scale.setScalar(grow); disk.scale.setScalar(grow * (1 + 0.6 * bhK)); disk.rotation.z = -u * 1.6;
      halo.scale.setScalar(grow * 14 * (1 + bhK)); halo.material.opacity = 0.55 + 0.3 * bhK;
      photon.scale.setScalar(grow * 3.4); photon.material.opacity = 0.9;
      glowLight.intensity = 400 * smooth(3, 10, u) * (1 + 2 * bhK);
      warpU.uK.value = 0.7 * bhK;
    }
    // ---------------- câmera final
    const si = shake;
    const sx = si * (0.55 * Math.sin(u * 53.1) + 0.3 * Math.sin(u * 31.7 + 1.3) + 0.15 * Math.sin(u * 89.3)) * 0.4;
    const sy = si * (0.5 * Math.sin(u * 47.3 + 0.7) + 0.35 * Math.sin(u * 27.9 + 2.1)) * 0.3;
    camera.position.set(Math.sin(u * 0.21) * 0.5 + sx, cy + sy, cz);
    camera.lookAt(look.x + sx * 2, look.y + sy * 2, look.z);
    camera.rotateZ(roll + si * 0.015 * Math.sin(u * 41.3));
    if (camera.fov !== fv) { camera.fov = fv; camera.updateProjectionMatrix(); }
    sky.position.copy(camera.position);
  }

  function renderFrame(u) {
    u = clamp(u, 0, SIM);
    update(u);
    renderer.render(scene, camera);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(glCanvas, 0, 0, W, H);
    post(u);
    return comp;
  }
  renderer.compile(scene, camera);
  renderFrame(0);
  return { canvas: comp, renderer, renderFrame, stats: () => ({ level, chunks: CH.length }) };
}
