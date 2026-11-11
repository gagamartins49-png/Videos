// ============================================================================
//  "E se a Terra parasse de girar?" — cena 3D low-poly (Three.js)
//  Tudo nesta cena é uma FUNÇÃO PURA DO TEMPO t (segundos): renderFrame(t)
//  sempre produz exatamente a mesma imagem. Isso permite gravar frame a frame
//  no GitHub Actions (determinístico) e também tocar em tempo real no celular.
// ============================================================================
import * as THREE from '../../vendor/three.module.min.js';

export let W = 1080;
export let H = 1920;
export const DUR = 80;

// ---------------------------------------------------------------- utilidades
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const wrap = (x, a, b) => { const r = b - a; return a + ((((x - a) % r) + r) % r); };
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const fmt = (v) => String(Math.max(0, Math.round(v))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const mixColor = (a, b, u) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(u));

// ---------------------------------------------------------------- timeline física
export function rotationAt(t) {
  if (t < 12) return 1670;
  if (t < 30) return 1670 - 500 * Math.pow((t - 12) / 18, 1.3);   // 1670 -> 1170
  if (t < 55) return 1170 * (1 - (t - 30) / 25);                  // 1170 -> 0 (som em ~45,7 s)
  return 0;
}
export const windAt = (t) => 1670 - rotationAt(t);
export const SOUND_KMH = 1235;
export const SONIC_T = 30 + 25 * ((SOUND_KMH - 500) / 1170);       // ~45,7 s
export const WAVE_START = 55, WAVE_HIT = 64.6;
const WAVE_Z0 = -470, WAVE_Z1 = 24, WAVE_POW = 1.8;
export function waveZ(t) {
  const u = clamp((t - WAVE_START) / (WAVE_HIT - WAVE_START));
  return WAVE_Z0 + (WAVE_Z1 - WAVE_Z0) * Math.pow(u, WAVE_POW);
}
function waveSpeed(t) { // eslint-disable-line no-unused-vars
  const u = clamp((t - WAVE_START) / (WAVE_HIT - WAVE_START), 0.02, 1);
  return (WAVE_Z1 - WAVE_Z0) * WAVE_POW * Math.pow(u, WAVE_POW - 1) / (WAVE_HIT - WAVE_START);
}
function waveTimeAt(z) {
  const u = clamp((z - WAVE_Z0) / (WAVE_Z1 - WAVE_Z0));
  return WAVE_START + (WAVE_HIT - WAVE_START) * Math.pow(u, 1 / WAVE_POW);
}
function waveHeight(t) { return 70 + 95 * smooth(WAVE_START, WAVE_HIT - 1, t); }

// deslocamento acumulado pelo vento (integral da velocidade) p/ partículas
const DISP_DT = 1 / 120;
const DISP = (() => {
  const n = Math.ceil(DUR / DISP_DT) + 2, arr = new Float32Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const t = i * DISP_DT;
    arr[i] = acc;
    acc += (1.2 + (windAt(t) / 3.6) * 0.16) * DISP_DT;
  }
  return arr;
})();
function windDisp(t) {
  const f = clamp(t, 0, DUR) / DISP_DT, i = Math.floor(f);
  return lerp(DISP[i], DISP[Math.min(i + 1, DISP.length - 1)], f - i);
}

function shakeIntensity(t) {
  let s = 0;
  if (t > 13) s = 0.04 + 0.10 * smooth(13, 30, t);
  if (t > 30) s += 0.45 * smooth(30, 54, t);
  s += 0.9 * Math.exp(-Math.abs(t - SONIC_T) * 3.5) * (t > SONIC_T - 0.05 ? 1 : 0);
  if (t > 55) s = 0.4 + 1.3 * smooth(57, WAVE_HIT, t);
  return s;
}

// ---------------------------------------------------------------- texturas procedurais
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(repeat[0], repeat[1]); }
  tx.anisotropy = 16;
  return tx;
}
const windowTexture = () => canvasTex(128, 128, (g) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  const gr = g.createLinearGradient(0, 20, 0, 108);
  gr.addColorStop(0, '#8fb9d9'); gr.addColorStop(0.5, '#3f6585'); gr.addColorStop(1, '#2a465e');
  g.fillStyle = gr; g.fillRect(24, 20, 80, 86);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(30, 26); g.lineTo(62, 26); g.lineTo(30, 70); g.fill();
  g.fillStyle = '#5a6670'; g.fillRect(62, 20, 4, 86); g.fillRect(24, 60, 80, 3); // caixilhos (r<0.8)
  g.fillStyle = '#d9d9d9'; g.fillRect(18, 106, 92, 7);                              // peitoril
});
const asphaltTexture = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#4a4d52'; g.fillRect(0, 0, w, h);
  const r = mulberry32(7);
  for (let i = 0; i < 9000; i++) {
    const v = 50 + r() * 60 | 0; g.fillStyle = `rgb(${v},${v},${v + 4})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}, [2, 60]);
const dotTexture = () => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
};

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.0, flatShading: true, ...extra });
function shadowed(o) { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }

// ============================================================================
export async function createApp({ quality = 1, script, width, height, fov, overlays = true }) {
  if (width) { W = width; H = height; }
  const rnd = mulberry32(20241109);
  const GW = Math.round(W * quality), GH = Math.round(H * quality);
  const glCanvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(GW, GH, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const camera = new THREE.PerspectiveCamera(fov || 72, W / H, 0.3, 1700);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xcfe6ff, 0.0025);

  // ------------------------------------------------------------ céu (shader)
  const skyU = {
    top: { value: new THREE.Color(0x2f7fd8) }, bottom: { value: new THREE.Color(0xcfe9ff) },
    sunDir: { value: new THREE.Vector3(-0.3, 0.5, -0.8).normalize() }, sunCol: { value: new THREE.Color(0xfff2c0) },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vW;
      void main(){ vec3 d = normalize(vW - cameraPosition); float h = clamp(d.y,0.,1.);
        vec3 c = mix(bottom, top, pow(h, 0.55));
        float s = max(dot(d, sunDir), 0.); c += sunCol*(pow(s, 900.)*6. + pow(s, 12.)*0.25);
        gl_FragColor = vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -10;
  scene.add(sky);

  // ------------------------------------------------------------ luzes
  const hemi = new THREE.HemisphereLight(0xd6ecff, 0x8d7b62, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 70, bottom: -70, near: 1, far: 320 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  // ------------------------------------------------------------ chão, rua, calçadas
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), std(0xb3ad9f, { flatShading: false }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(11, 520), new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.95 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.04, -220); road.receiveShadow = true; scene.add(road);
  for (const s of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.22, 520), std(0xcfc8bb));
    walk.position.set(s * 7.3, 0.11, -220); walk.receiveShadow = true; scene.add(walk);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.26, 520), std(0xe9e4da));
    curb.position.set(s * 5.5, 0.13, -220); curb.receiveShadow = true; scene.add(curb);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 520), std(0xf2f2f2, { emissive: 0x222222 }));
    edge.position.set(s * 5.05, 0.08, -220); scene.add(edge);
  }
  {
    const dashG = new THREE.BoxGeometry(0.2, 0.02, 3.2), dashM = std(0xf4d35e, { emissive: 0x332a00 });
    const n = 50, dash = new THREE.InstancedMesh(dashG, dashM, n), m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { m.makeTranslation(0, 0.08, 30 - i * 9); dash.setMatrixAt(i, m); }
    dash.receiveShadow = true; scene.add(dash);
    const zebra = new THREE.InstancedMesh(new THREE.BoxGeometry(0.75, 0.02, 3.6), std(0xf5f5f5, { emissive: 0x222222 }), 7);
    for (let i = 0; i < 7; i++) { m.makeTranslation(-4.2 + i * 1.4, 0.08, -9); zebra.setMatrixAt(i, m); }
    zebra.receiveShadow = true; scene.add(zebra);
  }

  // ------------------------------------------------------------ rachaduras no asfalto
  const cracks = [];
  {
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x0b0b0c, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const times = (script.eventos && script.eventos.rachaduras) || [13.5, 16, 19, 22.5, 26];
    const r = mulberry32(99);
    const makeCrack = (x, z, ang, segs, width, t0, dur) => {
      const pts = []; let a = ang;
      for (let i = 0; i <= segs; i++) {
        pts.push([x, z]); a += (r() - 0.5) * 1.1;
        const L = 0.5 + r() * 0.7; x += Math.cos(a) * L; z += Math.sin(a) * L;
        x = clamp(x, -5.3, 5.3);
      }
      const pos = [];
      for (let i = 0; i < segs; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1;
        const w0 = width * (1 - i / segs * 0.85), w1 = width * (1 - (i + 1) / segs * 0.85);
        const nx = -dz / l, nz = dx / l;
        pos.push(x0 + nx * w0, 0.12, z0 + nz * w0, x0 - nx * w0, 0.12, z0 - nz * w0, x1 + nx * w1, 0.12, z1 + nz * w1);
        pos.push(x0 - nx * w0, 0.12, z0 - nz * w0, x1 - nx * w1, 0.12, z1 - nz * w1, x1 + nx * w1, 0.12, z1 + nz * w1);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const mesh = new THREE.Mesh(g, crackMat); mesh.frustumCulled = false; scene.add(mesh);
      cracks.push({ mesh, total: segs * 6, t0, dur });
      return pts;
    };
    times.forEach((t0, k) => {
      for (let j = 0; j < 3; j++) {
        const z = 14 - k * 9 - r() * 14, x = (r() - 0.5) * 8;
        const pts = makeCrack(x, z, r() * Math.PI * 2, 22 + (r() * 16 | 0), 0.16 + r() * 0.16, t0 + j * 0.25, 1.2 + r());
        const b = pts[(pts.length / 2) | 0];
        makeCrack(b[0], b[1], r() * Math.PI * 2, 10, 0.09, t0 + j * 0.25 + 0.5, 0.8);
      }
    });
  }

  // ------------------------------------------------------------ prédios (feitos de blocos!)
  const PALETTE = ['#f4a259', '#5b8e7d', '#bc4b51', '#f4e285', '#8cb369', '#5fa8d3', '#e07a5f', '#81b29a',
    '#f2cc8f', '#9d8df1', '#ef8fa0', '#62b6cb', '#ffffff', '#c3b299'];
  const buildings = [];
  for (const side of [-1, 1]) {
    let z = side < 0 ? 16 : 11;
    while (z > -290) {
      const far = z < -130;
      const w = 8 + rnd() * 7, d = 9 + rnd() * 8;
      const h = far ? 26 + rnd() * 60 : 12 + rnd() * 34 + (z < -40 ? 12 : 0);
      buildings.push({ side, w, d, h, x: side * (9.6 + w / 2 + rnd() * 1.2), z: z - d / 2, color: PALETTE[(rnd() * PALETTE.length) | 0], cs: far ? 3.6 : 2.5 });
      z -= d + 2 + rnd() * 4;
    }
  }
  // agenda de desabamentos (mesmos tempos usados pelo som em generate_audio.py)
  const collapse = (script.eventos && script.eventos.desabamentos) || [38.5, 40, 41.3, 42.6, 44, 46.2, 47.6, 49, 50.5, 52, 53.4];
  const nearOrder = buildings.filter((b) => b.z > -135).sort((a, b) => b.z - a.z);
  nearOrder.forEach((b, i) => {
    b.tb = collapse[i % collapse.length] + Math.floor(i / collapse.length) * 0.7 + (b.side > 0 ? 0.25 : 0);
    b.stump = 0.08 + rnd() * 0.25;
  });
  buildings.filter((b) => b.z <= -135).forEach((b) => { b.tb = 44 + rnd() * 10; b.stump = 0.45 + rnd() * 0.4; });

  // gera blocos (casca externa do prédio)
  const CH = [];
  for (const b of buildings) {
    const nx = Math.max(2, Math.round(b.w / b.cs)), nz = Math.max(2, Math.round(b.d / b.cs)), ny = Math.max(3, Math.round(b.h / (b.cs * 1.05)));
    const sx = b.w / nx, sz = b.d / nz, sy = b.h / ny;
    const base = new THREE.Color(b.color);
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
      const shell = ix === 0 || iz === 0 || ix === nx - 1 || iz === nz - 1 || iy === ny - 1;
      if (!shell) continue;
      const x0 = b.x - b.w / 2 + sx * (ix + 0.5), y0 = sy * (iy + 0.5), z0 = b.z - b.d / 2 + sz * (iz + 0.5);
      const hf = iy / (ny - 1);
      const r1 = rnd(), r2 = rnd(), r3 = rnd(), r4 = rnd();
      const wind = hf >= b.stump;
      const ax = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      CH.push({
        x0, y0, z0, sx: sx * 0.985, sy: sy * 0.985, sz: sz * 0.985,
        tb: wind ? b.tb + (1 - hf) * 1.6 + r1 * 0.7 + (b.side * (x0 - b.x) < 0 ? 0.25 : 0) : Infinity,
        tw: waveTimeAt(z0 + 4) - 0.15,
        vx: 6 + r2 * 20, vy: 2 + r3 * 11 * (0.5 + hf), vz: (r4 - 0.5) * 10, ax: 16 + r1 * 26,
        wvx: (r2 - 0.5) * 12, wvy: 1 + r3 * 5,
        axis: ax, spin: 1.5 + r4 * 5, tremble: rnd() * 6.28, hf,
        color: base.clone().offsetHSL((r1 - 0.5) * 0.02, (r2 - 0.5) * 0.08, (r3 - 0.5) * 0.12),
      });
    }
  }
  const winMat = new THREE.MeshStandardMaterial({ map: windowTexture(), roughness: 0.55, metalness: 0.05, flatShading: true });
  winMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `
      #if defined( USE_COLOR ) && defined( USE_MAP )
        float wallMask = smoothstep(0.55, 0.85, sampledDiffuseColor.r);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vColor.rgb, wallMask);
      #elif defined( USE_COLOR )
        diffuseColor.rgb *= vColor.rgb;
      #endif`);
  };
  const roofMat = std(0xffffff, { roughness: 0.9 });
  const chunkMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), [winMat, winMat, roofMat, roofMat, winMat, winMat], CH.length);
  chunkMesh.castShadow = true; chunkMesh.receiveShadow = true; chunkMesh.frustumCulled = false;
  CH.forEach((c, i) => chunkMesh.setColorAt(i, c.color));
  chunkMesh.instanceColor.needsUpdate = true;
  scene.add(chunkMesh);

  // ------------------------------------------------------------ palmeiras
  const frondGeo = (() => {
    const pos = [], col = [], L = 4.6, segs = 7, n = 8, c1 = new THREE.Color(0x2f8f3a), c2 = new THREE.Color(0x79c24a);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (k % 2) * 0.2, ca = Math.cos(a), sa = Math.sin(a);
      const P = (s, side) => {
        const d = s * L, w = Math.sin(Math.PI * Math.min(1, s * 1.15)) * 0.75 * side;
        return [ca * d - sa * w, d * 0.55 - d * d * 0.17 - Math.abs(w) * 0.18, sa * d + ca * w];
      };
      for (let i = 0; i < segs; i++) {
        const s0 = i / segs, s1 = (i + 1) / segs, A = P(s0, 0), B = P(s1, 0), C = P(s0, 1), D = P(s1, 1), E = P(s0, -1), F = P(s1, -1);
        pos.push(...A, ...C, ...B, ...C, ...D, ...B, ...A, ...B, ...E, ...E, ...B, ...F);
        const cc = c1.clone().lerp(c2, s0); for (let q = 0; q < 12; q++) col.push(cc.r, cc.g, cc.b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  })();
  const trunkGeo = (() => {
    const g = new THREE.CylinderGeometry(0.2, 0.36, 9, 7, 9); g.translate(0, 4.5, 0);
    const p = g.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i); p.setX(i, p.getX(i) + 0.012 * y * y);
      const c = new THREE.Color(Math.floor(y * 1.6) % 2 ? 0x8a6a45 : 0x6e5236); col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    return g;
  })();
  const trunkMat = std(0xffffff, { vertexColors: true }), frondMat = std(0xffffff, { vertexColors: true, side: THREE.DoubleSide });
  const trees = [];
  for (const side of [-1, 1]) for (let z = side < 0 ? 15 : 8; z > -170; z -= 15 + rnd() * 4) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(trunkGeo, trunkMat));
    const fr = new THREE.Mesh(frondGeo, frondMat); fr.position.set(0.97, 9, 0); fr.rotation.y = rnd() * 6; g.add(fr);
    shadowed(g); g.position.set(side * (6.4 + rnd() * 0.4), 0.22, z); g.rotation.y = rnd() * 6.28;
    g.scale.setScalar(0.85 + rnd() * 0.35);
    scene.add(g);
    trees.push({ g, x: g.position.x, z, ph: rnd() * 6.28, tu: 39 + rnd() * 9 + (z < -60 ? 3 : 0), vx: 10 + rnd() * 10, vy: 3 + rnd() * 6, sp: 1 + rnd() * 2, ry: g.rotation.y });
  }

  // ------------------------------------------------------------ semáforos
  const lights = [];
  const lampOff = [0x3a1010, 0x3a3010, 0x103a18], lampOn = [0xff2a2a, 0xffc21a, 0x2aff6a];
  [[-1, -4], [1, -30], [-1, -57], [1, -84], [-1, -112]].forEach(([side, z], i) => {
    const g = new THREE.Group(), dark = std(0x2b2e33, { metalness: 0.4, roughness: 0.5 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 5.4, 8), dark); pole.position.y = 2.7; g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 0.14), dark); arm.position.set(-side * 1.35, 5.3, 0); g.add(arm);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.5, 0.45), std(0x1c1e22)); box.position.set(-side * 2.6, 4.7, 0); g.add(box);
    const lamps = [0, 1, 2].map((k) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: lampOff[k], emissive: 0x000000 }));
      m.position.set(-side * 2.6, 5.18 - k * 0.46, 0.24); g.add(m); return m;
    });
    shadowed(g); g.position.set(side * 6.0, 0.22, z); scene.add(g);
    lights.push({ g, lamps, x: g.position.x, z, off: i * 3.7, tl: 33.5 + i * 1.7, side });
  });

  // ------------------------------------------------------------ carros
  const CAR_COLORS = [0xe63946, 0x1d3557, 0xf1c40f, 0x2a9d8f, 0xffffff, 0xff7f11, 0x6c5ce7, 0x222222, 0x48cae4, 0xb5179e];
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12); wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = std(0x111111), glassMat = std(0x9ec9e6, { metalness: 0.3, roughness: 0.2, flatShading: true });
  function makeCar(color) {
    const g = new THREE.Group(), body = std(color, { metalness: 0.3, roughness: 0.45 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 4.2), body); b.position.y = 0.72; g.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.62, 2.2), glassMat); c.position.set(0, 1.4, -0.2); g.add(c);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 2.0), body); roof.position.set(0, 1.75, -0.2); g.add(roof);
    for (const [x, z] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat); w.position.set(x, 0.38, z); g.add(w);
    }
    const hl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 0.05), std(0xfff6c8, { emissive: 0x777755 })); hl.position.set(0, 0.85, 2.11); g.add(hl);
    return shadowed(g);
  }
  const cars = [];
  for (let i = 0; i < 12; i++) {
    const dir = i % 2 ? 1 : -1, g = makeCar(CAR_COLORS[i % CAR_COLORS.length]);
    g.rotation.y = dir > 0 ? 0 : Math.PI; scene.add(g);
    cars.push({ g, dir, x: dir > 0 ? 2.6 : -2.6, z0: 30 - rnd() * 190, v: 7 + rnd() * 5, tc: 19 + rnd() * 9, a: 7 + rnd() * 7, sp: 1.2 + rnd() * 2.2, lift: 0.8 + rnd() * 1.6 });
  }

  // ------------------------------------------------------------ pedestres
  const SKIN = [0xf1c27d, 0xc68642, 0x8d5524, 0xe0ac69, 0xffdbac], SHIRT = [0xe63946, 0x457b9d, 0xf4a261, 0x2a9d8f, 0xffffff, 0x8338ec, 0xffbe0b, 0x3a86ff];
  const people = [];
  for (let i = 0; i < 22; i++) {
    const g = new THREE.Group(), skin = std(SKIN[i % 5]), shirt = std(SHIRT[(i * 3) % 8]), pants = std([0x1d3557, 0x333333, 0x6b4f3a, 0x264653][i % 4]);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.68, 0.3), shirt); torso.position.y = 1.18; g.add(torso);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), skin); head.position.y = 1.72; g.add(head);
    const limb = (w, h, mat, x, y) => {
      const p = new THREE.Group(); p.position.set(x, y, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat); m.position.y = -h / 2; p.add(m); g.add(p); return p;
    };
    const lL = limb(0.19, 0.84, pants, -0.12, 0.84), lR = limb(0.19, 0.84, pants, 0.12, 0.84);
    const aL = limb(0.13, 0.64, shirt, -0.33, 1.48), aR = limb(0.13, 0.64, shirt, 0.33, 1.48);
    shadowed(g); scene.add(g);
    const side = i % 2 ? 1 : -1, dir = rnd() > 0.5 ? 1 : -1;
    people.push({ g, lL, lR, aL, aR, side, dir, x: side * (6.6 + rnd() * 1.6), z0: 20 - rnd() * 100, v: 1.1 + rnd() * 0.6, ph: rnd() * 6.28,
      tp: 18.6 + rnd() * 8.5, a: 9 + rnd() * 9, vy: 3 + rnd() * 5, sp: 3 + rnd() * 5 });
  }

  // ------------------------------------------------------------ nuvens
  const clouds = [];
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, fog: false, emissive: 0x555555 });
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(12 + rnd() * 14, 0), cloudMat);
      m.position.set((k - 2) * 16 + rnd() * 6, rnd() * 8, rnd() * 10); m.scale.y = 0.6; g.add(m);
    }
    g.position.set(-500 + rnd() * 1000, 150 + rnd() * 90, -350 - rnd() * 450); scene.add(g);
    clouds.push({ g, x0: g.position.x, k: 0.6 + rnd() * 0.6 });
  }

  // ------------------------------------------------------------ poeira e rajadas de vento
  const DOT = dotTexture();
  const NDUST = 2600, dustPos = new Float32Array(NDUST * 3), dustSeed = new Float32Array(NDUST * 4);
  for (let i = 0; i < NDUST; i++) dustSeed.set([rnd() * 120 - 60, 0.2 + Math.pow(rnd(), 1.6) * 34, -95 + rnd() * 115, 0.6 + rnd() * 0.8], i * 4);
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ size: 0.45, map: DOT, color: 0xd9a066, transparent: true, opacity: 0, depthWrite: false });
  const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false; scene.add(dust);
  const NSTREAK = 650, streakPos = new Float32Array(NSTREAK * 6), streakSeed = new Float32Array(NSTREAK * 4);
  for (let i = 0; i < NSTREAK; i++) streakSeed.set([rnd() * 120 - 60, 0.3 + rnd() * 26, -80 + rnd() * 100, 0.5 + rnd()], i * 4);
  const streakGeo = new THREE.BufferGeometry(); streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  const streakMat = new THREE.LineBasicMaterial({ color: 0xf6dcb0, transparent: true, opacity: 0, depthWrite: false });
  const streaks = new THREE.LineSegments(streakGeo, streakMat); streaks.frustumCulled = false; scene.add(streaks);

  // ------------------------------------------------------------ mega-tsunami
  const WX = 160, WY = 46;
  const waveGeo = new THREE.PlaneGeometry(1, 1, WX, WY);
  {
    const col = [], cDeep = new THREE.Color(0x06222f), cMid = new THREE.Color(0x14707f), cHi = new THREE.Color(0x6fd3d6), cFoam = new THREE.Color(0xf2fbff);
    for (let iy = 0; iy <= WY; iy++) for (let ix = 0; ix <= WX; ix++) {
      const v = 1 - iy / WY; // PlaneGeometry: linhas de cima p/ baixo
      let c = v < 0.55 ? cDeep.clone().lerp(cMid, v / 0.55) : cMid.clone().lerp(cHi, (v - 0.55) / 0.33);
      const foam = smooth(0.84, 0.95, v + Math.sin(ix * 0.9) * 0.02 + Math.sin(ix * 0.37) * 0.025);
      c.lerp(cFoam, foam);
      c.lerp(cFoam, 0.35 * v * Math.max(0, Math.sin(ix * 1.7) * Math.sin(ix * 0.31 + iy * 0.05 + 1))); // listras de espuma
      if (v < 0.08) c.lerp(cFoam, (0.08 - v) / 0.08 * 0.8); // espuma na base
      col.push(c.r, c.g, c.b);
    }
    waveGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  }
  const wave = new THREE.Mesh(waveGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.1, side: THREE.DoubleSide, emissive: 0x0b4a55, emissiveIntensity: 0.9, flatShading: false, fog: false, transparent: true, opacity: 0 }));
  wave.frustumCulled = false; wave.visible = false; scene.add(wave);
  const NSPRAY = 3200, sprayPos = new Float32Array(NSPRAY * 3), spraySeed = new Float32Array(NSPRAY * 4);
  for (let i = 0; i < NSPRAY; i++) spraySeed.set([rnd() * 2 - 1, rnd(), rnd(), rnd()], i * 4);
  const sprayGeo = new THREE.BufferGeometry(); sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ size: 3.2, map: DOT, color: 0xeaf8ff, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  spray.frustumCulled = false; spray.visible = false; scene.add(spray);

  // ============================================================ cena subaquática
  const uScene = new THREE.Scene();
  uScene.background = new THREE.Color(0x021a26);
  uScene.fog = new THREE.FogExp2(0x03344a, 0.045);
  uScene.add(new THREE.HemisphereLight(0x3aa6c8, 0x01080c, 1.4));
  const uSun = new THREE.DirectionalLight(0x9fe8ff, 1.6); uSun.position.set(0, 50, 10); uScene.add(uSun);
  const rays = [];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(2 + rnd() * 2.5, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.position.set(-16 + i * 5 + rnd() * 3, 14, -14 - rnd() * 18); m.rotation.z = 0.25 + rnd() * 0.15; uScene.add(m); rays.push({ m, ph: rnd() * 6 });
  }
  const NUD = 320, uDebris = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), [winMat, winMat, roofMat, roofMat, winMat, winMat], NUD);
  const uD = [];
  for (let i = 0; i < NUD; i++) {
    uD.push({ x: rnd() * 50 - 25, y: rnd() * 30 - 15, z: -12 - rnd() * 45, s: 0.6 + rnd() * 2.2, ax: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), sp: 0.2 + rnd() * 0.8, dr: rnd() * 0.6 });
    uDebris.setColorAt(i, new THREE.Color(PALETTE[(rnd() * PALETTE.length) | 0]).multiplyScalar(0.8));
  }
  uDebris.instanceColor.needsUpdate = true; uScene.add(uDebris);
  const uCars = [0, 1, 2].map((k) => { const c = makeCar(CAR_COLORS[k * 3]); uScene.add(c); return c; });
  const uTree = new THREE.Group(); uTree.add(new THREE.Mesh(trunkGeo, trunkMat)); { const f = new THREE.Mesh(frondGeo, frondMat); f.position.set(0.97, 9, 0); uTree.add(f); } uScene.add(uTree);
  const NBUB = 900, bubPos = new Float32Array(NBUB * 3), bubSeed = new Float32Array(NBUB * 4);
  for (let i = 0; i < NBUB; i++) bubSeed.set([rnd() * 30 - 15, rnd(), -rnd() * 30 + 3, 0.5 + rnd() * 1.5], i * 4);
  const bubGeo = new THREE.BufferGeometry(); bubGeo.setAttribute('position', new THREE.BufferAttribute(bubPos, 3));
  const bubbles = new THREE.Points(bubGeo, new THREE.PointsMaterial({ size: 0.35, map: DOT, color: 0xcff6ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  bubbles.frustumCulled = false; uScene.add(bubbles);
  const uSurface = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 30, 30), new THREE.MeshBasicMaterial({ color: 0x4fc3e0, side: THREE.DoubleSide, transparent: true, opacity: 0.5, fog: false }));
  uSurface.rotation.x = Math.PI / 2; uSurface.position.y = 34; uScene.add(uSurface);

  // ============================================================ 2D: composição + HUD + legendas
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const ctx = comp.getContext('2d');
  const F_TITLE = '"Anton", "Impact", "Arial Black", "DejaVu Sans", sans-serif';
  const F_SERIF = '"Playfair Display", "DejaVu Serif", Georgia, serif';
  const F_MONO = '"Roboto Mono", "DejaVu Sans Mono", "Courier New", monospace';

  // vidro trincado (pré-calculado)
  const glassCracks = [];
  const crackRnd = mulberry32(4242);
  function buildGlass(cx, cy, n, R, t0) {
    const lines = [], ringR = [R * 0.12, R * 0.27, R * 0.5];
    const radial = [];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + crackRnd() * 0.3; let a = a0, x = cx, y = cy; const pts = [[x, y]], L = R * (0.55 + crackRnd() * 0.6);
      const steps = 10 + (crackRnd() * 6 | 0);
      for (let s = 0; s < steps; s++) { a += (crackRnd() - 0.5) * 0.35; const l = L / steps; x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push([x, y]); }
      radial.push(pts); lines.push({ pts, w: 2.2 + crackRnd() * 2.2, d: 0 });
    }
    ringR.forEach((rr, k) => {
      for (let i = 0; i < n; i++) {
        if (crackRnd() < 0.3) continue;
        const A = radial[i], B = radial[(i + 1) % n];
        const ia = Math.min(A.length - 1, Math.round((rr / R) * 16)), ib = Math.min(B.length - 1, Math.round((rr / R) * 16 + (crackRnd() - 0.5) * 2));
        const pa = A[ia], pb = B[Math.max(0, ib)], mx = (pa[0] + pb[0]) / 2 + (crackRnd() - 0.5) * 20, my = (pa[1] + pb[1]) / 2 + (crackRnd() - 0.5) * 20;
        lines.push({ pts: [pa, [mx, my], pb], w: 1.4 + crackRnd(), d: 0.08 + k * 0.06 });
      }
    });
    glassCracks.push({ cx, cy, lines, t0, R });
  }
  const glassT = (script.eventos && script.eventos.vidro) || [66.0, 67.4];
  buildGlass(W * 0.593, H * 0.427, 15, 1150, glassT[0]);
  buildGlass(W * 0.278, H * 0.719, 11, 700, glassT[1]);

  function wrapLines(text, font, maxW) {
    ctx.font = font; const out = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const w of para.split(' ')) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
      }
      out.push(line);
    }
    return out;
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function drawTitle(t) {
    const a = t < 0.3 ? smooth(0, 0.3, t) : 1 - smooth(12, 13.2, t);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const pop = 1 + 0.08 * (1 - smooth(0, 0.6, t));
    ctx.translate(W / 2, 175); ctx.scale(pop, pop);
    ctx.font = `400 104px ${F_TITLE}`;
    ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = '#000';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
    ['E SE A TERRA PARASSE', 'DE GIRAR?'].forEach((l, i) => {
      ctx.strokeText(l, 0, i * 118); ctx.fillStyle = i ? '#ffd23f' : '#ffffff'; ctx.fillText(l, 0, i * 118);
    });
    ctx.restore();
  }

  function drawHUD(t) {
    const a = smooth(0.2, 0.8, t) * (1 - smooth(72.6, 73.0, t));
    if (a <= 0) return;
    const rot = rotationAt(t), wind = windAt(t), rotN = rot / 1670, windN = wind / 1670;
    const x = 34, y = t < 13.2 ? 390 : lerp(390, 120, smooth(12.6, 14, t)), w = 560, h = 318;
    ctx.save(); ctx.globalAlpha = a;
    roundRect(x, y, w, h, 22); ctx.fillStyle = 'rgba(5,10,18,0.55)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    // linha 1
    ctx.font = `700 29px ${F_MONO}`; ctx.fillStyle = '#9fe3ff'; ctx.fillText('ROTAÇÃO DA TERRA:', x + 28, y + 50);
    const rc = mixColor(0xff3b3b, 0x6dff9a, rotN), blinkZero = rot <= 0 && Math.floor(t * 3) % 2 === 0;
    ctx.font = `800 66px ${F_MONO}`; ctx.fillStyle = blinkZero ? '#ffffff' : `#${rc.getHexString()}`;
    ctx.fillText(`${fmt(rot)} km/h`, x + 26, y + 116);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 28, y + 130, w - 56, 10);
    ctx.fillStyle = `#${rc.getHexString()}`; ctx.fillRect(x + 28, y + 130, (w - 56) * rotN, 10);
    // linha 2
    ctx.font = `700 29px ${F_MONO}`; ctx.fillStyle = '#ffd9a0'; ctx.fillText('VENTO:', x + 28, y + 192);
    const wc = windN < 0.5 ? mixColor(0xffffff, 0xffa53b, windN * 2) : mixColor(0xffa53b, 0xff2d2d, (windN - 0.5) * 2);
    ctx.font = `800 66px ${F_MONO}`; ctx.fillStyle = `#${wc.getHexString()}`;
    const jit = windN > 0.3 ? Math.sin(t * 90) * 2 * windN : 0;
    ctx.fillText(`${fmt(wind)} km/h`, x + 26 + jit, y + 258);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 28, y + 272, w - 56, 10);
    ctx.fillStyle = `#${wc.getHexString()}`; ctx.fillRect(x + 28, y + 272, (w - 56) * windN, 10);
    const sx = x + 28 + (w - 56) * (SOUND_KMH / 1670);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 1.5, y + 268, 3, 18);
    ctx.font = `700 17px ${F_MONO}`; ctx.textAlign = 'center'; ctx.fillText('VELOC. DO SOM', sx, y + 306); ctx.textAlign = 'left';
    if (wind >= SOUND_KMH && t < 65) {
      const on = Math.floor(t * 4) % 2 === 0;
      roundRect(x, y + h + 14, w, 58, 14); ctx.fillStyle = on ? 'rgba(220,20,20,0.85)' : 'rgba(120,0,0,0.6)'; ctx.fill();
      ctx.font = `800 30px ${F_MONO}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText('! BARREIRA DO SOM ROMPIDA !', x + w / 2, y + h + 54);
    }
    ctx.restore();
  }

  function drawSubtitles(t) {
    for (const f of script.frases) {
      if (t < f.inicio - 0.05 || t > f.fim + 0.05) continue;
      const a = smooth(f.inicio, f.inicio + 0.4, t) * (1 - smooth(f.fim - 0.4, f.fim, t));
      if (a <= 0) continue;
      const ending = f.inicio >= 73;
      const size = ending ? 70 : 62, lh = size * 1.28;
      const font = `${ending ? 'italic 600' : '600'} ${size}px ${F_SERIF}`;
      const lines = wrapLines(f.legenda || f.texto, font, ending ? 900 : 940);
      const cy = (ending ? 940 : 960) + (1 - smooth(f.inicio, f.inicio + 0.5, t)) * 18;
      ctx.save(); ctx.globalAlpha = a; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 3;
      ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      lines.forEach((l, i) => {
        const yy = cy + (i - (lines.length - 1) / 2) * lh;
        if (!ending) ctx.strokeText(l, W / 2, yy);
        ctx.fillStyle = '#ffffff'; ctx.fillText(l, W / 2, yy);
      });
      ctx.restore();
    }
  }

  function drawGlass(t) {
    for (const gc of glassCracks) {
      if (t < gc.t0) continue;
      const dt = t - gc.t0;
      ctx.save();
      // brilho do impacto
      const fl = Math.exp(-dt * 6);
      if (fl > 0.01) { const g = ctx.createRadialGradient(gc.cx, gc.cy, 0, gc.cx, gc.cy, 260); g.addColorStop(0, `rgba(255,255,255,${0.9 * fl})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const ln of gc.lines) {
        const p = clamp((dt - ln.d) / 0.22); if (p <= 0) continue;
        const n = ln.pts.length - 1, upto = p * n;
        const path = () => {
          ctx.beginPath(); ctx.moveTo(ln.pts[0][0], ln.pts[0][1]);
          for (let i = 1; i <= Math.ceil(upto); i++) {
            const f = Math.min(1, upto - (i - 1)), A = ln.pts[i - 1], B = ln.pts[i];
            ctx.lineTo(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f);
          }
        };
        path(); ctx.strokeStyle = 'rgba(0,10,20,0.55)'; ctx.lineWidth = ln.w + 3; ctx.stroke();
        path(); ctx.strokeStyle = 'rgba(225,245,255,0.92)'; ctx.lineWidth = ln.w; ctx.stroke();
      }
      ctx.fillStyle = 'rgba(235,250,255,0.9)'; ctx.beginPath(); ctx.arc(gc.cx, gc.cy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function drawOceanText(t) {
    const a = smooth(66.3, 66.9, t) * (1 - smooth(72.3, 72.9, t));
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const s = 1 + 0.15 * (1 - smooth(66.3, 66.8, t)), shake = Math.sin(t * 70) * 4 * (1 - smooth(66.3, 67.6, t));
    ctx.translate(W / 2 + shake, 600); ctx.scale(s, s);
    ctx.font = `400 118px ${F_TITLE}`;
    ctx.shadowColor = 'rgba(0,200,255,0.9)'; ctx.shadowBlur = 40;
    ctx.lineWidth = 14; ctx.strokeStyle = '#001018'; ctx.lineJoin = 'round';
    ['O OCEANO AGORA', 'ESTÁ AQUI'].forEach((l, i) => { const yy = (i - 0.5) * 132; ctx.strokeText(l, 0, yy); ctx.fillStyle = i ? '#7fe6ff' : '#ffffff'; ctx.fillText(l, 0, yy); });
    ctx.restore();
  }

  function postFX(t, mode) {
    // gradação de cor
    if (mode === 'city') {
      const dust = smooth(24, 46, t) * (1 - 0.85 * smooth(55, 61, t));
      if (dust > 0) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(255,120,30,${0.55 * dust})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      if (t > 54) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(120,140,160,${0.35 * smooth(54, 62, t)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
    if (mode === 'under') {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(40,150,190,0.55)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    // vinheta
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.68);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${mode === 'under' ? 0.85 : 0.5})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // flash e onda de choque da barreira do som
    const sb = t - SONIC_T;
    if (sb > 0 && sb < 1.2) {
      ctx.save();
      ctx.fillStyle = `rgba(255,245,230,${0.75 * Math.exp(-sb * 7)})`; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - sb / 1.2)})`; ctx.lineWidth = 30 * (1 - sb / 1.2) + 4;
      ctx.beginPath(); ctx.arc(W / 2, H * 0.45, sb * 1800, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    // impacto da água
    const ih = t - WAVE_HIT;
    if (ih > -0.35 && ih < 1.2) {
      const a = ih < 0 ? smooth(-0.35, 0, ih) : 1 - smooth(0.05, 1.2, ih);
      ctx.fillStyle = `rgba(215,245,255,${a})`; ctx.fillRect(0, 0, W, H);
    }
  }

  // ============================================================ atualização por tempo
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler();

  function updateCity(t) {
    const windN = windAt(t) / 1670, dust = smooth(24, 46, t), storm = smooth(WAVE_START, 62, t);
    // câmera
    const camZ = t < 12 ? 24 - t * 0.35 : 19.8 - (t - 12) * 0.07;
    const look = new THREE.Vector3(0, 8.5 + 30 * smooth(58, WAVE_HIT, t), -40);
    const si = shakeIntensity(t);
    const sx = si * (0.55 * Math.sin(t * 53.1) + 0.3 * Math.sin(t * 31.7 + 1.3) + 0.15 * Math.sin(t * 89.3)) * 0.45;
    const sy = si * (0.5 * Math.sin(t * 47.3 + 0.7) + 0.35 * Math.sin(t * 27.9 + 2.1) + 0.15 * Math.sin(t * 97.1)) * 0.35;
    camera.position.set(Math.sin(t * 0.21) * 0.6 + sx, 3.3 + sy, camZ);
    camera.lookAt(look.x + sx * 3, look.y + sy * 3, look.z);
    camera.rotateZ(si * 0.018 * Math.sin(t * 41.3));
    camera.fov = (fov || 72) + 6 * smooth(57, WAVE_HIT, t); camera.updateProjectionMatrix();
    sky.position.copy(camera.position);

    // atmosfera
    const top = mixColor(0x2f7fd8, 0x8a4a1c, dust).lerp(new THREE.Color(0x30343c), storm);
    const bot = mixColor(0xcfe9ff, 0xe8954a, dust).lerp(new THREE.Color(0x7d7c78), storm);
    skyU.top.value.copy(top); skyU.bottom.value.copy(bot);
    skyU.sunCol.value.copy(mixColor(0xfff2c0, 0xff8a3a, dust)).multiplyScalar(1 - storm * 0.9);
    scene.fog.color.copy(mixColor(0xcfe6ff, 0xd88a45, dust).lerp(new THREE.Color(0x6f706e), storm));
    scene.fog.density = 0.0024 + 0.0105 * dust - 0.0085 * storm + 0.0012 * smooth(62, WAVE_HIT, t);
    sun.intensity = 2.9 * (1 - 0.5 * dust) * (1 - 0.55 * storm);
    sun.color.copy(mixColor(0xfff0d8, 0xffa060, dust));
    hemi.intensity = 1.0 - 0.25 * dust;
    hemi.color.copy(mixColor(0xd6ecff, 0xffc08a, dust));
    renderer.toneMappingExposure = 1.05 - 0.1 * storm;
    // sol FIXO (não acompanha a câmera) -> sombras não "tremem" de um frame para o outro
    sun.target.position.set(0, 0, -22);
    sun.position.set(-45, 85, 48);

    // rachaduras
    for (const c of cracks) {
      const p = smooth(c.t0, c.t0 + c.dur, t);
      c.mesh.visible = p > 0;
      c.mesh.geometry.setDrawRange(0, Math.floor((p * c.total) / 3) * 3);
    }

    // blocos dos prédios
    for (let i = 0; i < CH.length; i++) {
      const c = CH[i];
      let px = c.x0, py = c.y0, pz = c.z0;
      Q.identity();
      if (t >= c.tb) {
        const dt = t - c.tb;
        px += c.vx * dt + 0.5 * c.ax * dt * dt;
        py = Math.max(c.sy * 0.5, c.y0 + c.vy * dt - 0.5 * 7 * dt * dt);
        pz += c.vz * dt;
        Q.setFromAxisAngle(c.axis, c.spin * dt);
      } else if (t >= c.tw) {
        const dt = t - c.tw;
        px += c.wvx * dt; py = Math.max(c.sy * 0.5, c.y0 + c.wvy * dt * 2 - 1.0 * dt * dt);
        pz = Math.min(c.z0 + 30 * dt, waveZ(t) - 0.32 * py - 1.5 - c.tremble * 1.4); // engolido pela onda
        Q.setFromAxisAngle(c.axis, c.spin * 0.6 * dt);
      } else if (t > c.tb - 2.5 || t > 30) {
        const k = (t > c.tb - 2.5 ? smooth(c.tb - 2.5, c.tb, t) * 0.12 : 0) + 0.015 * windN;
        px += Math.sin(t * 37 + c.tremble) * k * c.hf; pz += Math.cos(t * 29 + c.tremble) * k * c.hf * 0.5;
      }
      P.set(px, py, pz); S.set(c.sx, c.sy, c.sz);
      M.compose(P, Q, S); chunkMesh.setMatrixAt(i, M);
    }
    chunkMesh.instanceMatrix.needsUpdate = true;

    // palmeiras
    for (const tr of trees) {
      const sway = Math.sin(t * 1.6 + tr.ph) * 0.025 * (1 + windN * 6) + Math.sin(t * 7.3 + tr.ph) * 0.03 * windN;
      if (t < tr.tu) {
        tr.g.position.set(tr.x, 0.22, tr.z);
        tr.g.rotation.set(0, tr.ry, 0); tr.g.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -(windN * 0.55 + sway));
      } else {
        const dt = t - tr.tu;
        tr.g.position.set(tr.x + tr.vx * dt + 0.5 * 24 * dt * dt, 0.22 + Math.max(0, tr.vy * dt + 0.5 * 2 * dt * dt), tr.z);
        tr.g.rotation.set(0, tr.ry + dt * 0.7, 0); tr.g.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -(windN * 0.55 + tr.sp * dt));
      }
    }

    // semáforos
    for (const L of lights) {
      const ph = (t + L.off) % 12, st = ph < 5 ? 2 : ph < 6.5 ? 1 : 0;
      const dead = t > L.tl - 3 ? Math.floor(t * 7) % 2 : -1; // pisca amarelo antes de cair
      L.lamps.forEach((m, k) => {
        const on = dead >= 0 ? (k === 1 && dead === 1) : k === st;
        m.material.color.setHex(on ? lampOn[k] : lampOff[k]); m.material.emissive.setHex(on ? lampOn[k] : 0);
        m.material.emissiveIntensity = on ? 1.6 : 0;
      });
      if (t < L.tl) {
        L.g.position.set(L.x, 0.22, L.z); L.g.rotation.set(0, 0, -windN * 0.06 * Math.sin(t * 9));
      } else {
        const dt = t - L.tl, tilt = Math.min(1.45, 1.4 * dt * dt);
        if (dt < 1.0) { L.g.position.set(L.x, 0.22, L.z); L.g.rotation.set(0, 0, -tilt); }
        else { const d = dt - 1; L.g.position.set(L.x + 6 * d + 14 * d * d, 0.22 + Math.max(0, 5 * d - 3 * d * d), L.z); L.g.rotation.set(d * 1.3, 0, -tilt - d * 3); }
      }
    }

    // carros
    for (const c of cars) {
      const zAt = (tt) => wrap(c.z0 + c.dir * c.v * tt, -170, 32);
      if (t < c.tc) {
        const pre = smooth(14, c.tc, t);
        c.g.position.set(c.x + pre * 0.6 * Math.sin(t * 3 + c.z0), 0, zAt(t));
        c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, -pre * 0.04);
      } else {
        const dt = t - c.tc, zc = zAt(c.tc);
        const x = c.x + 0.5 * c.a * dt * dt + 2 * dt;
        const y = Math.abs(Math.sin(dt * 2.4)) * c.lift * Math.min(1, dt) * (1 + dt * 0.4);
        c.g.position.set(x, y, zc + c.dir * c.v * (1 - Math.exp(-dt)) * 1.2);
        c.g.rotation.set(dt * 0.3, (c.dir > 0 ? 0 : Math.PI) + dt * 0.5, -c.sp * dt);
      }
    }

    // pedestres
    for (const p of people) {
      const zAt = (tt) => wrap(p.z0 + p.dir * p.v * tt, -90, 22);
      if (t < p.tp) {
        const lean = smooth(13, p.tp, t);
        const ph = t * p.v * 4.2 + p.ph, sw = Math.sin(ph) * 0.55 * (1 - lean * 0.5);
        p.g.position.set(p.x + lean * 0.8 * Math.sin(t * 2 + p.ph) * 0.5, Math.abs(Math.cos(ph)) * 0.05, zAt(t));
        p.g.rotation.set(0, p.dir > 0 ? 0 : Math.PI, -lean * 0.35);
        p.lL.rotation.x = sw; p.lR.rotation.x = -sw; p.aL.rotation.x = -sw * 0.8; p.aR.rotation.x = sw * 0.8;
        p.aL.rotation.z = -lean * 1.2; p.aR.rotation.z = lean * 1.2;
      } else {
        const dt = t - p.tp;
        p.g.position.set(p.x + 3 * dt + 0.5 * p.a * dt * dt, Math.max(0, p.vy * dt - 0.5 * 6 * dt * dt) + 0.3 * Math.min(1, dt * 3), zAt(p.tp));
        p.g.rotation.set(dt * 2.1, dt * 1.3, -p.sp * dt);
        const fl = Math.sin(dt * 14) * 0.9;
        p.lL.rotation.x = fl; p.lR.rotation.x = -fl; p.aL.rotation.z = -2.4; p.aR.rotation.z = 2.4 + fl * 0.3;
      }
    }

    // nuvens
    for (const c of clouds) c.g.position.x = wrap(c.x0 + windDisp(t) * 2.2 * c.k + t * 1.5, -700, 700);

    // poeira + rajadas
    const wd = windDisp(t);
    for (let i = 0; i < NDUST; i++) {
      const s = i * 4;
      dustPos[i * 3] = wrap(dustSeed[s] + wd * dustSeed[s + 3] * 2.2, -60, 60) + 0 * camZ;
      dustPos[i * 3 + 1] = dustSeed[s + 1] + Math.sin(t * 2 + i) * 0.3;
      dustPos[i * 3 + 2] = dustSeed[s + 2] - 20 + camZ;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustMat.opacity = 0.9 * smooth(22, 40, t) * (1 - 0.6 * storm);
    dustMat.color.copy(mixColor(0xd9a066, 0x9a8f80, storm));
    const len = 0.5 + windN * windN * 9;
    for (let i = 0; i < NSTREAK; i++) {
      const s = i * 4, x = wrap(streakSeed[s] + wd * streakSeed[s + 3] * 3.2, -60, 60), y = streakSeed[s + 1], z = streakSeed[s + 2] - 20 + camZ;
      streakPos.set([x, y, z, x - len * streakSeed[s + 3], y + 0.05, z], i * 6);
    }
    streakGeo.attributes.position.needsUpdate = true;
    streakMat.opacity = 0.55 * smooth(27, 42, t) * (1 - storm);

    // tsunami
    const wOn = t >= WAVE_START - 0.5;
    wave.visible = spray.visible = wOn;
    if (wOn) {
      const zf = waveZ(t), Hh = waveHeight(t), p = waveGeo.attributes.position;
      let idx = 0;
      for (let iy = 0; iy <= WY; iy++) {
        const v = 1 - iy / WY;
        for (let ix = 0; ix <= WX; ix++, idx++) {
          const u = ix / WX, X = (u - 0.5) * 1100;
          const hv = Hh * (1 + 0.07 * Math.sin(X * 0.013 + t * 0.9) + 0.04 * Math.sin(X * 0.041 - t * 1.7));
          const curl = v > 0.7 ? Math.pow((v - 0.7) / 0.3, 2) : 0;
          const Y = v * hv - curl * curl * hv * 0.12;
          const Z = zf - v * hv * 0.32 + curl * hv * 0.26 + Math.sin(X * 0.06 + v * 9 - t * 5) * 1.4 * v;
          p.setXYZ(idx, X, Y, Z);
        }
      }
      p.needsUpdate = true; waveGeo.computeVertexNormals();
      const wa = smooth(WAVE_START - 0.5, WAVE_START + 1.5, t);
      wave.material.opacity = wa; wave.material.transparent = wa < 0.999; wave.material.depthWrite = wa > 0.5;
      spray.material.opacity = 0.85 * wa;
      for (let i = 0; i < NSPRAY; i++) {
        const s = i * 4, X = spraySeed[s] * 550, ph = (t * (0.5 + spraySeed[s + 3]) + spraySeed[s + 1]) % 1;
        let x, y, z;
        if (i % 3 === 0) { x = X; y = ph * 30 * spraySeed[s + 2]; z = zf + 4 + ph * 22; }
        else { const hv = Hh * (1 + 0.07 * Math.sin(X * 0.013 + t * 0.9)); x = X + ph * 15; y = hv * 0.87 + ph * 16 * spraySeed[s + 2]; z = zf - hv * 0.08 + ph * 12; }
        sprayPos[i * 3] = x; sprayPos[i * 3 + 1] = y; sprayPos[i * 3 + 2] = z;
      }
      sprayGeo.attributes.position.needsUpdate = true;
    }
  }

  function updateUnder(t) {
    const u = t - WAVE_HIT;
    const turb = Math.exp(-u * 0.8);
    camera.fov = (fov || 72) - 2; camera.updateProjectionMatrix();
    const sx = Math.sin(t * 13) * 0.25 * turb + Math.sin(t * 0.7) * 0.4, sy = Math.cos(t * 11) * 0.2 * turb + Math.sin(t * 0.5) * 0.3;
    camera.position.set(sx, sy - u * 0.25, 6 - u * 0.6);
    camera.lookAt(Math.sin(t * 0.3) * 3, 2 + Math.sin(t * 0.4), -30 - u * 1.2);
    camera.rotateZ(Math.sin(t * 0.6) * 0.06 + turb * 0.2 * Math.sin(t * 9));
    for (let i = 0; i < NUD; i++) {
      const d = uD[i], dt = u;
      P.set(d.x + Math.sin(t * 0.3 + i) * 0.8 + turb * 6 * Math.sin(i), d.y - dt * d.dr + Math.sin(t * 0.5 + i * 1.7) * 0.6, d.z);
      Q.setFromAxisAngle(d.ax, d.sp * t + i);
      S.set(d.s, d.s * (0.8 + (i % 3) * 0.2), d.s);
      M.compose(P, Q, S); uDebris.setMatrixAt(i, M);
    }
    uDebris.instanceMatrix.needsUpdate = true;
    uCars.forEach((c, k) => { c.position.set(-8 + k * 8, -2 + k * 3 - u * 0.4, -14 - k * 6); c.rotation.set(t * 0.15 + k, t * 0.2 + k * 2, t * 0.1 + k); });
    uTree.position.set(6, 6 - u * 0.5, -20); uTree.rotation.set(1.2 + t * 0.05, t * 0.1, 0.4);
    for (let i = 0; i < NBUB; i++) {
      const s = i * 4, ph = (bubSeed[s + 1] + t * 0.12 * bubSeed[s + 3]) % 1;
      bubPos[i * 3] = bubSeed[s] + Math.sin(t * 3 + i) * 0.15 + camera.position.x;
      bubPos[i * 3 + 1] = -14 + ph * 30 + camera.position.y;
      bubPos[i * 3 + 2] = bubSeed[s + 2] + camera.position.z - 5;
    }
    bubGeo.attributes.position.needsUpdate = true;
    rays.forEach((r) => { r.m.material.opacity = 0.05 + 0.04 * Math.sin(t * 1.3 + r.ph); });
    uScene.fog.density = 0.05 + 0.06 * turb;
  }

  // ============================================================ API pública
  let lastMode = '';
  function renderFrame(t) {
    t = clamp(t, 0, DUR);
    let mode = t < WAVE_HIT ? 'city' : t < 73 ? 'under' : 'black';
    if (mode === 'city') { updateCity(t); renderer.render(scene, camera); }
    else if (mode === 'under') { updateUnder(t); renderer.render(uScene, camera); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (mode === 'black') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    else ctx.drawImage(glCanvas, 0, 0, W, H);
    if (mode !== 'black') postFX(t, mode);
    if (mode === 'under') { drawGlass(t); if (overlays) drawOceanText(t); }
    if (t > 72.4 && t < 73) { ctx.fillStyle = `rgba(0,0,0,${smooth(72.4, 73, t)})`; ctx.fillRect(0, 0, W, H); }
    if (overlays) drawTitle(t);
    if (overlays) drawHUD(t);
    if (overlays) drawSubtitles(t);
    lastMode = mode;
    return comp;
  }

  // compila shaders das duas cenas antes do primeiro frame
  renderer.compile(scene, camera); renderer.compile(uScene, camera);
  renderFrame(0);

  return {
    canvas: comp, renderer, renderFrame,
    frameJPEG(t, q = 0.92) { renderFrame(t); return comp.toDataURL('image/jpeg', q); },
    stats: () => ({ chunks: CH.length, buildings: buildings.length, mode: lastMode }),
    debug: { scene, uScene, camera, wave, spray, chunkMesh },
  };
}
