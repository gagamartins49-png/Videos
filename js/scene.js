// ============================================================================
//  "E se o Sol apagasse de repente?" — cena 3D low-poly (Three.js)
//  Tudo nesta cena é uma FUNÇÃO PURA DO TEMPO t (segundos): renderFrame(t)
//  sempre produz exatamente a mesma imagem. Isso permite gravar frame a frame
//  no GitHub Actions (determinístico) e também tocar em tempo real no celular.
// ============================================================================
import * as THREE from '../vendor/three.module.min.js';

export const W = 1080;
export const H = 1920;
export const DUR = 80;

// ---------------------------------------------------------------- utilidades
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const wrap = (x, a, b) => { const r = b - a; return a + ((((x - a) % r) + r) % r); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mixColor = (a, b, u) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(u));

// ---------------------------------------------------------------- linha do tempo
export const SUN_OFF = 8.0;      // o Sol apaga (mas a luz ainda está a caminho)
export const DARK = 12.5;        // a última luz chega: escuridão total
export const SKIPS = [25.0, 34.5, 45.0, 65.0];
export const END = 73.0;

export function tempAt(t) {                       // °C
  if (t < DARK) return 24;
  if (t < 25) return lerp(24, 2, smooth(DARK, 25, t));
  if (t < 34.5) return lerp(-8, -70, smooth(25, 34.5, t));
  if (t < 45) return lerp(-70, -88, smooth(34.5, 45, t));
  if (t < 65) return lerp(-110, -150, smooth(45, 53, t)) - 12 * smooth(53, 65, t);
  return lerp(-162, -240, smooth(65, 68.5, t));
}
export function timeLabel(t) {
  if (t < SUN_OFF) return { label: 'TEMPO:', value: '8 MINUTOS', note: 'luz do Sol até a Terra' };
  if (t < DARK) {
    const s = Math.max(0, Math.ceil(480 * (1 - (t - SUN_OFF) / (DARK - SUN_OFF))));
    return { label: 'TEMPO:', value: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, note: 'até a última luz', warn: true };
  }
  if (t < 25) {
    const h = 12 * (t - DARK) / (25 - DARK);
    return { label: 'TEMPO:', value: h < 1 ? `+${Math.max(1, Math.round(h * 60))} MIN` : `+${Math.floor(h)} HORA${h >= 2 ? 'S' : ''}`, note: 'sem o Sol' };
  }
  if (t < 45) {
    const d = t < 34.5 ? 1 + Math.floor(6 * smooth(25, 34.5, t) + 0.001) : 7 + Math.floor(23 * smooth(34.5, 45, t));
    return { label: 'TEMPO:', value: `${d} DIA${d > 1 ? 'S' : ''}`, note: 'sem o Sol' };
  }
  if (t < 65) { const y = 1 + Math.floor(9 * smooth(45, 65, t)); return { label: 'TEMPO:', value: `${y} ANO${y > 1 ? 'S' : ''}`, note: 'sem o Sol' }; }
  return { label: 'TEMPO:', value: 'MILHARES DE ANOS', note: 'sem o Sol' };
}
// nível de vento/nevasca 0..1 (também usado pelo áudio de fallback no navegador)
export function windLevel(t) {
  if (t < 25) return 0;
  if (t < 45) return 0.15 + 0.45 * smooth(25, 42, t);
  if (t < 65) return 0.6 + 0.4 * smooth(45, 52, t) - 0.15 * smooth(60, 65, t);
  return 0.25;
}
function snowAmount(t) {
  if (t < 25) return 0;
  if (t < 45) return smooth(25, 29, t) * (0.6 + 0.4 * smooth(32, 40, t));
  if (t < 65) return 0.85;
  return 0.35;
}
// integral do vento (deslocamento lateral da neve)
const DISP_DT = 1 / 120;
const DISP = (() => {
  const n = Math.ceil(DUR / DISP_DT) + 2, arr = new Float32Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) { arr[i] = acc; acc += (0.3 + 16 * windLevel(i * DISP_DT) ** 1.5) * DISP_DT; }
  return arr;
})();
function windDisp(t) {
  const f = clamp(t, 0, DUR) / DISP_DT, i = Math.floor(f);
  return lerp(DISP[i], DISP[Math.min(i + 1, DISP.length - 1)], f - i);
}
function shakeIntensity(t) {
  let s = 0;
  if (t > 45 && t < 65) s = 0.12 + 0.18 * smooth(45, 52, t);
  if (t > 65 && t < 73) s = 0.05;
  if (t > DARK - 0.05 && t < DARK + 0.6) s += 0.25 * (1 - (t - DARK) / 0.6);
  if (t < 0.6) s += 0.45 * (1 - t / 0.6);              // impacto do sub-bass no 0,0 s
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
  g.fillStyle = '#5a6670'; g.fillRect(62, 20, 4, 86); g.fillRect(24, 60, 80, 3);
  g.fillStyle = '#d9d9d9'; g.fillRect(18, 106, 92, 7);
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

// ---------------------------------------------------------------- gelo/neve nos materiais
// Cobre superfícies voltadas para cima com neve (e um pouco das laterais = gelo).
const frostU = { uSnow: { value: 0 }, uOxy: { value: 0 }, uUpView: { value: new THREE.Vector3(0, 1, 0) } };
function frostify(mat, side = 0.12) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    Object.assign(sh.uniforms, frostU);
    sh.fragmentShader = 'uniform float uSnow; uniform float uOxy; uniform vec3 uUpView;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        float upF = dot(normal, uUpView);
        float cover = clamp(uSnow * (smoothstep(0.3, 0.75, upF) + ${side.toFixed(3)}), 0.0, 1.0);
        vec3 snowC = mix(vec3(0.88, 0.92, 0.98), vec3(0.45, 0.78, 1.0), uOxy * smoothstep(0.3, 0.75, upF));
        diffuseColor.rgb = mix(diffuseColor.rgb, snowC, cover);
      }`);
  };
  mat.customProgramCacheKey = () => `frost${side}${prev ? 'w' : ''}`;
  return mat;
}
const std = (color, extra = {}, side = 0.12) => frostify(new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.0, flatShading: true, ...extra }), side);
function shadowed(o) { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }

// ============================================================================
export async function createApp({ quality = 1, script }) {
  const ev = script.eventos || {};
  const rnd = mulberry32(20261109);
  const GW = Math.round(W * quality), GH = Math.round(H * quality);
  const glCanvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(GW, GH, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const camera = new THREE.PerspectiveCamera(72, W / H, 0.3, 1700);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xcfe6ff, 0.0024);

  // ------------------------------------------------------------ céu + Sol (shader)
  const SUN_DIR = new THREE.Vector3(0.0, 0.45, -0.89).normalize();
  const skyU = {
    top: { value: new THREE.Color(0x2f7fd8) }, bottom: { value: new THREE.Color(0xcfe9ff) },
    sunDir: { value: SUN_DIR }, sunCol: { value: new THREE.Color(0xfff6d8) }, sunVis: { value: 1 }, sunSize: { value: 1 },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunVis; uniform float sunSize; varying vec3 vW;
      void main(){ vec3 d = normalize(vW - cameraPosition); float h = clamp(d.y,0.,1.);
        vec3 c = mix(bottom, top, pow(h, 0.55));
        float s = max(dot(d, sunDir), 0.);
        float disk = smoothstep(0.99905 - 0.0008*(sunSize-1.), 0.99945 - 0.0008*(sunSize-1.), s);
        c += sunCol * sunVis * (disk * 9.0 + pow(s, 180.) * 2.2 + pow(s, 12.) * 0.3);
        gl_FragColor = vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -10;
  scene.add(sky);
  // estrelas (aparecem quando escurece)
  const NSTAR = 1800, starPos = new Float32Array(NSTAR * 3);
  for (let i = 0; i < NSTAR; i++) {
    const u = rnd() * 2 * Math.PI, y = 0.04 + rnd() * 0.96, r = 1100, rr = Math.sqrt(1 - y * y);
    starPos.set([Math.cos(u) * rr * r, y * r, Math.sin(u) * rr * r], i * 3);
  }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const DOT = dotTexture();
  const starMat = new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, map: DOT, color: 0xdfe8ff, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const stars = new THREE.Points(starGeo, starMat); stars.frustumCulled = false; stars.renderOrder = -9; scene.add(stars);

  // ------------------------------------------------------------ luzes
  const hemi = new THREE.HemisphereLight(0xd6ecff, 0x8d7b62, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e0, 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 70, bottom: -70, near: 1, far: 360 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  sun.target.position.set(0, 0, -28);
  sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 150);
  scene.add(sun, sun.target);

  // ------------------------------------------------------------ chão, rua, calçadas
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), std(0xb3ad9f, { flatShading: false }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(11, 520), frostify(new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.95 })));
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
    const m = new THREE.Matrix4();
    const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.02, 3.2), std(0xf4d35e, { emissive: 0x332a00 }), 50);
    for (let i = 0; i < 50; i++) { m.makeTranslation(0, 0.08, 30 - i * 9); dash.setMatrixAt(i, m); }
    dash.receiveShadow = true; scene.add(dash);
    const zebra = new THREE.InstancedMesh(new THREE.BoxGeometry(0.75, 0.02, 3.6), std(0xf5f5f5, { emissive: 0x222222 }), 7);
    for (let i = 0; i < 7; i++) { m.makeTranslation(-4.2 + i * 1.4, 0.08, -9); zebra.setMatrixAt(i, m); }
    zebra.receiveShadow = true; scene.add(zebra);
  }

  // ------------------------------------------------------------ prédios (blocos instanciados)
  const PALETTE = ['#f4a259', '#5b8e7d', '#bc4b51', '#f4e285', '#8cb369', '#5fa8d3', '#e07a5f', '#81b29a',
    '#f2cc8f', '#9d8df1', '#ef8fa0', '#62b6cb', '#ffffff', '#c3b299'];
  const buildings = [];
  for (const side of [-1, 1]) {
    let z = side < 0 ? 16 : 11;
    while (z > -290) {
      const far = z < -130;
      const w = 8 + rnd() * 7, d = 9 + rnd() * 8;
      const h = far ? 26 + rnd() * 60 : 12 + rnd() * 34 + (z < -40 ? 12 : 0);
      buildings.push({ side, w, d, h, x: side * (9.6 + w / 2 + rnd() * 1.2), z: z - d / 2, color: PALETTE[(rnd() * PALETTE.length) | 0], cs: far ? 3.6 : 2.5, tc: Infinity, cf: 1 });
      z -= d + 2 + rnd() * 4;
    }
  }
  // estruturas congeladas que desabam (mesmos tempos do áudio)
  const quedas = ev.quedas || [50.6, 53.2, 55.6, 57.9, 60.2, 62.4];
  const nearOrder = buildings.filter((b) => b.z > -120).sort((a, b) => b.z - a.z);
  [2, 3, 5, 6, 8, 10].forEach((k, i) => { const b = nearOrder[k]; if (b) { b.tc = quedas[i % quedas.length]; b.cf = 0.4 + rnd() * 0.25; } });

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
      const falls = hf >= b.cf;
      const ysz = sy * 0.985;
      CH.push({
        x0, y0, z0, sx: sx * 0.985, sy: ysz, sz: sz * 0.985,
        tb: falls ? b.tc + (1 - hf) * 0.9 + r1 * 0.5 : Infinity,
        tland: Math.sqrt(2 * Math.max(0, y0 - ysz * 0.5) / 9.8),
        vx: (1.5 + r2 * 5), vz: (r4 - 0.5) * 3,
        axis: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), spin: 1 + r3 * 2.5,
        tremble: rnd() * 6.28, hf, lit: rnd() < 0.42 ? 0.6 + rnd() * 0.4 : 0,
        color: base.clone().offsetHSL((r1 - 0.5) * 0.02, (r2 - 0.5) * 0.08, (r3 - 0.5) * 0.12),
      });
    }
  }
  const winLightU = { value: 0 };
  const winMat = new THREE.MeshStandardMaterial({ map: windowTexture(), roughness: 0.55, metalness: 0.05, flatShading: true });
  winMat.onBeforeCompile = (sh) => {
    sh.uniforms.uWinLight = winLightU;
    sh.vertexShader = 'attribute float aLit; varying float vLit;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vLit = aLit;');
    sh.fragmentShader = 'uniform float uWinLight; varying float vLit;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `
        float wallMask = 1.0;
        #if defined( USE_COLOR ) && defined( USE_MAP )
          wallMask = smoothstep(0.55, 0.85, sampledDiffuseColor.r);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vColor.rgb, wallMask);
        #elif defined( USE_COLOR )
          diffuseColor.rgb *= vColor.rgb;
        #endif`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += (1.0 - wallMask) * vLit * uWinLight * vec3(1.0, 0.72, 0.38) * 2.2;`);
  };
  frostify(winMat, 0.1);
  const roofMat = std(0xffffff, { roughness: 0.9 }, 0.1);
  const chunkGeo = new THREE.BoxGeometry(1, 1, 1);
  chunkGeo.setAttribute('aLit', new THREE.InstancedBufferAttribute(new Float32Array(CH.map((c) => c.lit)), 1));
  const chunkMesh = new THREE.InstancedMesh(chunkGeo, [winMat, winMat, roofMat, roofMat, winMat, winMat], CH.length);
  chunkMesh.castShadow = true; chunkMesh.receiveShadow = true; chunkMesh.frustumCulled = false;
  CH.forEach((c, i) => chunkMesh.setColorAt(i, c.color));
  chunkMesh.instanceColor.needsUpdate = true;
  scene.add(chunkMesh);

  // ------------------------------------------------------------ árvores (perdem as folhas)
  const trunkMat = std(0x6e5236, {}, 0.35);
  const trees = [];
  for (const side of [-1, 1]) for (let z = side < 0 ? 15 : 7; z > -160; z -= 14 + rnd() * 4) {
    const g = new THREE.Group(), s = 0.85 + rnd() * 0.35;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 4.4, 7), trunkMat); trunk.position.y = 2.2; g.add(trunk);
    for (let k = 0; k < 4; k++) {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 2.4, 5), trunkMat);
      const a = k * 1.6 + rnd();
      br.position.set(Math.cos(a) * 0.55, 4.4, Math.sin(a) * 0.55); br.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); g.add(br);
    }
    const leaves = [];
    for (let k = 0; k < 5; k++) {
      const lm = std(0x4f9a3a, { roughness: 0.9 }, 0.2);
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + rnd() * 0.7, 0), lm);
      const a = k * 1.3 + rnd();
      m.position.set(Math.cos(a) * 1.1 * (k ? 1 : 0), 5.0 + rnd() * 1.4 + (k ? 0 : 0.8), Math.sin(a) * 1.1 * (k ? 1 : 0));
      g.add(m); leaves.push({ m, lm, tl: (ev.folhas ? ev.folhas[0] : 27) + rnd() * 8, base: new THREE.Color().setHSL(0.27 + rnd() * 0.06, 0.55, 0.36 + rnd() * 0.08) });
    }
    shadowed(g); g.position.set(side * (6.4 + rnd() * 0.4), 0.22, z); g.rotation.y = rnd() * 6.28; g.scale.setScalar(s);
    scene.add(g); trees.push({ g, leaves, ph: rnd() * 6.28 });
  }

  // ------------------------------------------------------------ postes de luz
  const lampOnT = ev.postesAcendem || 13.2, fails = ev.falhaEnergia || [38.6, 39.3, 39.9, 40.4, 41, 41.5, 42, 42.6, 43.1];
  const lamps = [];
  const poleMat = std(0x30343a, { metalness: 0.5, roughness: 0.5 }, 0.25);
  const glowMat = new THREE.SpriteMaterial({ map: DOT, color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  let li = 0;
  for (let z = 10; z > -150; z -= 21) for (const side of [-1, 1]) {
    const zz = z - (side > 0 ? 10 : 0);
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 7, 8), poleMat); pole.position.y = 3.5; g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.12), poleMat); arm.position.set(-side * 0.85, 6.95, 0); g.add(arm);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x777777, emissive: 0xffc777, emissiveIntensity: 0, flatShading: true });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.4), headMat); head.position.set(-side * 1.7, 6.82, 0); g.add(head);
    const glow = new THREE.Sprite(glowMat.clone()); glow.scale.set(3.2, 3.2, 1); glow.position.set(-side * 1.7, 6.6, 0); g.add(glow);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 6.6, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xffcf8a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.set(-side * 1.7, 3.45, 0); g.add(cone);
    shadowed(pole); shadowed(arm);
    let light = null;
    if (zz > -75) { light = new THREE.PointLight(0xffc98a, 0, 28, 2); light.position.set(-side * 1.7, 6.4, 0); g.add(light); }
    g.position.set(side * 6.7, 0.22, zz); scene.add(g);
    lamps.push({ g, headMat, glow, cone, light, side, ton: lampOnT + li * 0.11, tf: fails[li % fails.length] + Math.floor(li / fails.length) * 0.23, ph: rnd() * 100, tq: Infinity });
    li++;
  }
  // alguns postes também tombam com o vento congelante
  [1, 4, 6, 9].forEach((k, i) => { if (lamps[k]) lamps[k].tq = quedas[(i * 2 + 1) % quedas.length] + 0.35; });
  function lampLevel(L, t) {
    if (t < L.ton) return 0;
    const on = Math.min(1, (t - L.ton) / 0.25);
    if (t > L.tf) return 0;
    if (t > L.tf - 2.6) return hash(Math.floor(t * 13) + L.ph) > 0.45 ? on * (0.5 + 0.5 * hash(Math.floor(t * 31) + L.ph)) : 0.05;
    return on;
  }

  // ------------------------------------------------------------ semáforos
  const tlights = [];
  const lampOff = [0x3a1010, 0x3a3010, 0x103a18], lampOnC = [0xff2a2a, 0xffc21a, 0x2aff6a];
  [[-1, -4], [1, -30], [-1, -57], [1, -84]].forEach(([side, z], i) => {
    const g = new THREE.Group(), dark = std(0x2b2e33, { metalness: 0.4, roughness: 0.5 }, 0.25);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 5.4, 8), dark); pole.position.y = 2.7; g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 0.14), dark); arm.position.set(-side * 1.35, 5.3, 0); g.add(arm);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.5, 0.45), std(0x1c1e22)); box.position.set(-side * 2.6, 4.7, 0); g.add(box);
    const ls = [0, 1, 2].map((k) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: lampOff[k], emissive: 0x000000 }));
      m.position.set(-side * 2.6, 5.18 - k * 0.46, 0.24); g.add(m); return m;
    });
    shadowed(g); g.position.set(side * 6.0, 0.22, z); scene.add(g);
    tlights.push({ g, ls, x: g.position.x, z, off: i * 3.7, tq: quedas[(i * 2) % quedas.length] + 0.6, tf: fails[(i * 2 + 1) % fails.length] });
  });

  // ------------------------------------------------------------ carros (param e acendem os faróis)
  const CAR_COLORS = [0xe63946, 0x1d3557, 0xf1c40f, 0x2a9d8f, 0xffffff, 0xff7f11, 0x6c5ce7, 0x222222, 0x48cae4, 0xb5179e];
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12); wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = std(0x111111, {}, 0.4), glassMat = std(0x9ec9e6, { metalness: 0.3, roughness: 0.2 }, 0.75);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1cc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const headLMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xfff3c0, emissiveIntensity: 0.1 });
  const tailLMat = new THREE.MeshStandardMaterial({ color: 0x661111, emissive: 0xff2020, emissiveIntensity: 0 });
  const flareMat = new THREE.SpriteMaterial({ map: DOT, color: 0xfff4d6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  function makeCar(color) {
    const g = new THREE.Group(), body = std(color, { metalness: 0.3, roughness: 0.45 }, 0.7);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 4.2), body); b.position.y = 0.72; g.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.62, 2.2), glassMat); c.position.set(0, 1.4, -0.2); g.add(c);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 2.0), body); roof.position.set(0, 1.75, -0.2); g.add(roof);
    for (const [x, z] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) { const w = new THREE.Mesh(wheelGeo, wheelMat); w.position.set(x, 0.38, z); g.add(w); }
    shadowed(g);
    const hl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 0.05), headLMat); hl.position.set(0, 0.85, 2.11); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.05), tailLMat); tl.position.set(0, 0.9, -2.11); g.add(tl);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(2.4, 13, 16, 1, true), beamMat); beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.6, 2.1 + 6.5); g.add(beam);
    for (const x of [-0.6, 0.6]) { const f = new THREE.Sprite(flareMat); f.scale.set(1.6, 1.6, 1); f.position.set(x, 0.85, 2.2); g.add(f); }
    return g;
  }
  const cars = [];
  const carStops = [[1, -14], [-1, -22], [1, -38], [-1, -47], [1, -66], [-1, -74], [1, -95], [-1, -108], [1, -128], [-1, -140], [1, 2], [-1, -6]];
  carStops.forEach(([dir, zf], i) => {
    const g = makeCar(CAR_COLORS[i % CAR_COLORS.length]);
    g.rotation.y = dir > 0 ? 0 : Math.PI; scene.add(g);
    const v = 7 + rnd() * 5;
    cars.push({ g, dir, x: dir > 0 ? 2.6 : -2.6, v, zf, z0: zf - dir * v * 14 });
  });
  const carDisp = (t) => (t < 13 ? t : t < 15 ? 13 + (t - 13) - 0.25 * (t - 13) ** 2 : 14);  // freia entre 13 e 15 s

  // ------------------------------------------------------------ pedestres
  const SKIN = [0xf1c27d, 0xc68642, 0x8d5524, 0xe0ac69, 0xffdbac], SHIRT = [0xe63946, 0x457b9d, 0xf4a261, 0x2a9d8f, 0xffffff, 0x8338ec, 0xffbe0b, 0x3a86ff];
  const people = [];
  for (let i = 0; i < 22; i++) {
    const g = new THREE.Group(), skin = std(SKIN[i % 5]), shirt = std(SHIRT[(i * 3) % 8]), pants = std([0x1d3557, 0x333333, 0x6b4f3a, 0x264653][i % 4]);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.68, 0.3), shirt); torso.position.y = 1.18; g.add(torso);
    const neck = new THREE.Group(); neck.position.y = 1.55; g.add(neck);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), skin); head.position.y = 0.17; neck.add(head);
    const limb = (w, h, mat, x, y) => {
      const p = new THREE.Group(); p.position.set(x, y, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat); m.position.y = -h / 2; p.add(m); g.add(p); return p;
    };
    const lL = limb(0.19, 0.84, pants, -0.12, 0.84), lR = limb(0.19, 0.84, pants, 0.12, 0.84);
    const aL = limb(0.13, 0.64, shirt, -0.33, 1.48), aR = limb(0.13, 0.64, shirt, 0.33, 1.48);
    shadowed(g); scene.add(g);
    const side = i % 2 ? 1 : -1, dir = rnd() > 0.5 ? 1 : -1;
    people.push({ g, neck, lL, lR, aL, aR, side, dir, x: side * (6.4 + rnd() * 1.8), z0: 20 - rnd() * 95, v: 1.1 + rnd() * 0.6, ph: rnd() * 6.28, ts: 13.7 + rnd() * 1.4, turn: (rnd() - 0.5) * 2.4 });
  }

  // ------------------------------------------------------------ neve, folhas e "neve azul" de oxigênio
  const NSNOW = 7000, snowPos = new Float32Array(NSNOW * 3), snowSeed = new Float32Array(NSNOW * 4);
  for (let i = 0; i < NSNOW; i++) snowSeed.set([rnd() * 80 - 40, rnd() * 32, -75 + rnd() * 92, 0.6 + rnd() * 0.8], i * 4);
  const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowMat = new THREE.PointsMaterial({ size: 0.26, map: DOT, color: 0xf2f6ff, transparent: true, opacity: 0, depthWrite: false });
  const snow = new THREE.Points(snowGeo, snowMat); snow.frustumCulled = false; scene.add(snow);
  const NOXY = 2600, oxyPos = new Float32Array(NOXY * 3), oxySeed = new Float32Array(NOXY * 4);
  for (let i = 0; i < NOXY; i++) oxySeed.set([rnd() * 70 - 35, rnd() * 34, -70 + rnd() * 86, 0.7 + rnd() * 0.6], i * 4);
  const oxyGeo = new THREE.BufferGeometry(); oxyGeo.setAttribute('position', new THREE.BufferAttribute(oxyPos, 3));
  const oxyMat = new THREE.PointsMaterial({ size: 0.6, map: DOT, color: 0x8fe0ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const oxy = new THREE.Points(oxyGeo, oxyMat); oxy.frustumCulled = false; scene.add(oxy);
  const NLEAF = 900, leafPos = new Float32Array(NLEAF * 3), leafSeed = new Float32Array(NLEAF * 4);
  for (let i = 0; i < NLEAF; i++) { const tp = trees[(rnd() * trees.length) | 0].g.position; leafSeed.set([tp.x + (rnd() - 0.5) * 4, 3 + rnd() * 4, tp.z + (rnd() - 0.5) * 4, rnd()], i * 4); }
  const leafGeo = new THREE.BufferGeometry(); leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPos, 3));
  const leafPMat = new THREE.PointsMaterial({ size: 0.22, map: DOT, color: 0xb5772f, transparent: true, opacity: 0, depthWrite: false });
  const leafP = new THREE.Points(leafGeo, leafPMat); leafP.frustumCulled = false; scene.add(leafP);

  // ============================================================ 2D: composição + HUD + legendas
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const ctx = comp.getContext('2d');
  const F_TITLE = '"Anton", "Impact", "Arial Black", "DejaVu Sans", sans-serif';
  const F_SERIF = '"Playfair Display", "DejaVu Serif", Georgia, serif';
  const F_MONO = '"Roboto Mono", "DejaVu Sans Mono", "Courier New", monospace';

  // lente congelando: cristais de gelo (dendritos) a partir das bordas + trincas
  const frostLines = [];
  {
    const fr = mulberry32(777);
    const grow = (x, y, a, len, depth, g0) => {
      if (depth > 5 || len < 6) return;
      const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
      frostLines.push({ x, y, x1, y1, g: g0, w: Math.max(0.6, 3.2 - depth * 0.55) });
      const n = 1 + (fr() * 2 | 0);
      for (let k = 0; k < n; k++) {
        const f = 0.3 + fr() * 0.7, bx = x + (x1 - x) * f, by = y + (y1 - y) * f;
        grow(bx, by, a + (fr() < 0.5 ? -1 : 1) * (0.5 + fr() * 0.6), len * (0.45 + fr() * 0.25), depth + 2, g0 + 0.12 + fr() * 0.1);
      }
      grow(x1, y1, a + (fr() - 0.5) * 0.4, len * 0.75, depth + 1, g0 + 0.1);
      if (frostLines.length > 2600) return;
    };
    for (let i = 0; i < 46; i++) {
      const e = i % 4, u = fr();
      const [x, y, a] = e === 0 ? [u * W, 0, Math.PI / 2] : e === 1 ? [u * W, H, -Math.PI / 2] : e === 2 ? [0, u * H, 0] : [W, u * H, Math.PI];
      grow(x, y, a + (fr() - 0.5) * 0.9, 90 + fr() * 140, 0, fr() * 0.25);
    }
  }
  const glassCracks = [];
  const crackRnd = mulberry32(4242);
  function buildGlass(cx, cy, n, R, t0) {
    const lines = [], radial = [];
    for (let i = 0; i < n; i++) {
      let a = (i / n) * Math.PI * 2 + crackRnd() * 0.3, x = cx, y = cy; const pts = [[x, y]], L = R * (0.55 + crackRnd() * 0.6);
      const steps = 10 + (crackRnd() * 6 | 0);
      for (let s = 0; s < steps; s++) { a += (crackRnd() - 0.5) * 0.35; x += Math.cos(a) * L / steps; y += Math.sin(a) * L / steps; pts.push([x, y]); }
      radial.push(pts); lines.push({ pts, w: 2.2 + crackRnd() * 2.2, d: 0 });
    }
    [R * 0.12, R * 0.27, R * 0.5].forEach((rr, k) => {
      for (let i = 0; i < n; i++) {
        if (crackRnd() < 0.3) continue;
        const A = radial[i], B = radial[(i + 1) % n];
        const ia = Math.min(A.length - 1, Math.round((rr / R) * 16)), ib = Math.min(B.length - 1, Math.round((rr / R) * 16 + (crackRnd() - 0.5) * 2));
        const pa = A[ia], pb = B[Math.max(0, ib)];
        lines.push({ pts: [pa, [(pa[0] + pb[0]) / 2 + (crackRnd() - 0.5) * 20, (pa[1] + pb[1]) / 2 + (crackRnd() - 0.5) * 20], pb], w: 1.4 + crackRnd(), d: 0.08 + k * 0.06 });
      }
    });
    glassCracks.push({ cx, cy, lines, t0 });
  }
  const trT = ev.trincas || [66.6, 67.9, 69.2];
  buildGlass(700, 760, 16, 1250, trT[0]);
  buildGlass(280, 1330, 13, 1000, trT[1]);
  buildGlass(820, 1520, 11, 800, trT[2]);

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
  function fitFont(text, weight, size, family, maxW) {
    let s = size; ctx.font = `${weight} ${s}px ${family}`;
    while (ctx.measureText(text).width > maxW && s > 20) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; }
  }

  function drawTitle(t) {
    const a = 1 - smooth(11.6, 12.6, t);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
    const pop = 1 + 0.08 * (1 - smooth(0, 0.6, t));
    ctx.translate(W / 2, 215); ctx.scale(pop, pop);
    ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = '#000';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
    ['E SE O SOL APAGASSE', 'DE REPENTE?'].forEach((l, i) => {
      fitFont(l, 400, 104, F_TITLE, 1000);
      ctx.strokeText(l, 0, i * 118); ctx.fillStyle = i ? '#ffd23f' : '#ffffff'; ctx.fillText(l, 0, i * 118);
    });
    ctx.restore();
  }

  // selo de identidade da série (sempre visível, discreto)
  function drawBadge(t) {
    const txt = `${script.projeto || 'PROJETO E SE?'}  |  EXPERIMENTO #${script.experimento || '001'}`;
    ctx.save();
    ctx.font = `700 25px ${F_MONO}`;
    const tw = ctx.measureText(txt).width, bw = tw + 76, bh = 50, bx = (W - bw) / 2, by = 36;
    roundRect(bx, by, bw, bh, 25); ctx.fillStyle = 'rgba(8,12,20,0.55)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.stroke();
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI));
    ctx.fillStyle = `rgba(255,59,59,${pulse})`; ctx.beginPath(); ctx.arc(bx + 30, by + bh / 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, bx + 50, by + bh / 2 + 1);
    ctx.restore();
  }

  const tempColor = (c) => (c > 0 ? mixColor(0xffffff, 0xffa33b, c / 24) : c > -70 ? mixColor(0xffffff, 0x8fe9ff, -c / 70) : mixColor(0x8fe9ff, 0x5a7dff, (-c - 70) / 170));
  function drawHUD(t) {
    const a = smooth(0.2, 0.8, t) * (1 - smooth(72.6, 73.0, t)) * (1 - 0.75 * smooth(66.6, 67.4, t));
    if (a <= 0) return;
    const x = 34, y = lerp(1380, 120, smooth(11.6, 13, t)), w = 600, h = 318;
    const tl = timeLabel(t), temp = tempAt(t);
    ctx.save(); ctx.globalAlpha = a;
    roundRect(x, y, w, h, 22); ctx.fillStyle = 'rgba(5,10,18,0.58)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = `700 29px ${F_MONO}`; ctx.fillStyle = '#ffe08a'; ctx.fillText(tl.label, x + 28, y + 50);
    ctx.font = `600 21px ${F_MONO}`; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText(tl.note.toUpperCase(), x + 150, y + 49);
    fitFont(tl.value, 800, 64, F_MONO, w - 56);
    ctx.fillStyle = tl.warn && Math.floor(t * 4) % 2 ? '#ff6a4d' : '#ffffff'; ctx.fillText(tl.value, x + 26, y + 118);
    ctx.font = `700 29px ${F_MONO}`; ctx.fillStyle = '#9fe3ff'; ctx.fillText('TEMP:', x + 28, y + 186);
    const tc = tempColor(temp), shown = `${Math.round(temp)}°C`;
    ctx.font = `800 66px ${F_MONO}`; ctx.fillStyle = `#${tc.getHexString()}`; ctx.fillText(shown, x + 26, y + 254);
    const f = clamp((24 - temp) / 264);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 28, y + 272, w - 56, 10);
    const gr = ctx.createLinearGradient(x + 28, 0, x + w - 28, 0); gr.addColorStop(0, '#ffa33b'); gr.addColorStop(0.1, '#ffffff'); gr.addColorStop(0.35, '#8fe9ff'); gr.addColorStop(1, '#5a7dff');
    ctx.fillStyle = gr; ctx.fillRect(x + 28, y + 272, (w - 56) * f, 10);
    ctx.font = `700 17px ${F_MONO}`; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('24°C', x + 28, y + 304); ctx.textAlign = 'right'; ctx.fillText('-240°C', x + w - 28, y + 304);
    const alert = t > 38.4 && t < 44.6 ? 'REDE ELÉTRICA EM COLAPSO' : t > 52 && t < 64.8 ? 'OXIGÊNIO LÍQUIDO CAINDO' : t > SUN_OFF && t < DARK ? 'O SOL APAGOU' : null;
    if (alert) {
      const on = Math.floor(t * 4) % 2 === 0;
      roundRect(x, y + h + 14, w, 58, 14); ctx.fillStyle = on ? 'rgba(220,20,20,0.85)' : 'rgba(120,0,0,0.6)'; ctx.fill();
      ctx.font = `800 30px ${F_MONO}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText(`! ${alert} !`, x + w / 2, y + h + 54);
    }
    ctx.restore();
  }

  const CARDS = [[SKIPS[0], '24 HORAS DEPOIS'], [SKIPS[1], '7 DIAS DEPOIS'], [SKIPS[2], '1 ANO DEPOIS'], [SKIPS[3], 'MILHARES DE ANOS DEPOIS']];
  function drawCards(t) {
    for (const [t0, txt] of CARDS) {
      const a = smooth(t0 - 0.05, t0 + 0.3, t) * (1 - smooth(t0 + 1.9, t0 + 2.4, t));
      if (a <= 0) continue;
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const s = 1.08 - 0.08 * smooth(t0, t0 + 2.4, t);
      ctx.translate(W / 2, 640); ctx.scale(s, s);
      fitFont(txt, 400, 92, F_TITLE, 980);
      ctx.lineWidth = 14; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(txt, 0, 0);
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(140,220,255,0.8)'; ctx.shadowBlur = 30; ctx.fillText(txt, 0, 0);
      ctx.restore();
    }
  }

  function drawSubtitles(t) {
    for (const f of script.frases) {
      if (t < f.inicio - 0.05 || t > f.fim + 0.05) continue;
      const a = (f.inicio <= 0 ? 1 : smooth(f.inicio, f.inicio + 0.4, t)) * (f.fim >= DUR ? 1 : 1 - smooth(f.fim - 0.4, f.fim, t));
      if (a <= 0) continue;
      const ending = f.inicio >= END;
      const size = ending ? 70 : 62, lh = size * 1.28;
      const font = `${ending ? 'italic 600' : '600'} ${size}px ${F_SERIF}`;
      const lines = wrapLines(f.legenda || f.texto, font, ending ? 900 : 940);
      const cy = (ending ? 940 : 960) + (f.inicio <= 0 ? 0 : (1 - smooth(f.inicio, f.inicio + 0.5, t)) * 18);
      ctx.save(); ctx.globalAlpha = a; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 3;
      ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      lines.forEach((l, i) => {
        const yy = cy + (i - (lines.length - 1) / 2) * lh;
        if (!ending) ctx.strokeText(l, W / 2, yy);
        ctx.fillStyle = '#ffffff'; ctx.fillText(l, W / 2, yy);
      });
      ctx.restore();
    }
  }

  function drawFrost(t) {
    const t0 = ev.geloLente || 65.2;
    if (t < t0) return;
    const p = smooth(t0, t0 + 3.4, t);
    ctx.save();
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.62);
    vg.addColorStop(0, 'rgba(200,235,255,0)'); vg.addColorStop(1, `rgba(215,240,255,${0.5 * p})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.lineCap = 'round';
    for (const l of frostLines) {
      const k = clamp((p * 1.15 - l.g) / 0.18); if (k <= 0) continue;
      const x1 = l.x + (l.x1 - l.x) * k, y1 = l.y + (l.y1 - l.y) * k;
      ctx.strokeStyle = 'rgba(30,60,90,0.35)'; ctx.lineWidth = l.w + 2.5; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = 'rgba(235,250,255,0.85)'; ctx.lineWidth = l.w; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(x1, y1); ctx.stroke();
    }
    for (const gc of glassCracks) {
      if (t < gc.t0) continue;
      const dt = t - gc.t0, fl = Math.exp(-dt * 6);
      if (fl > 0.01) { const g = ctx.createRadialGradient(gc.cx, gc.cy, 0, gc.cx, gc.cy, 280); g.addColorStop(0, `rgba(255,255,255,${0.9 * fl})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      ctx.lineJoin = 'round';
      for (const ln of gc.lines) {
        const pr = clamp((dt - ln.d) / 0.22); if (pr <= 0) continue;
        const n = ln.pts.length - 1, upto = pr * n;
        const path = () => {
          ctx.beginPath(); ctx.moveTo(ln.pts[0][0], ln.pts[0][1]);
          for (let i = 1; i <= Math.ceil(upto); i++) { const f = Math.min(1, upto - (i - 1)), A = ln.pts[i - 1], B = ln.pts[i]; ctx.lineTo(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f); }
        };
        path(); ctx.strokeStyle = 'rgba(0,15,30,0.55)'; ctx.lineWidth = ln.w + 3; ctx.stroke();
        path(); ctx.strokeStyle = 'rgba(225,245,255,0.95)'; ctx.lineWidth = ln.w; ctx.stroke();
      }
      ctx.fillStyle = 'rgba(235,250,255,0.9)'; ctx.beginPath(); ctx.arc(gc.cx, gc.cy, 14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawFinalText(t) {
    const a = smooth(67.2, 67.8, t) * (1 - smooth(72.3, 72.9, t));
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const s = 1 + 0.12 * (1 - smooth(67.2, 67.7, t));
    ctx.translate(W / 2, 640); ctx.scale(s, s);
    ctx.font = `400 96px ${F_TITLE}`; ctx.lineJoin = 'round';
    ['APENAS BACTÉRIAS', 'NO FUNDO DO OCEANO', 'SOBREVIVEM'].forEach((l, i) => {
      const yy = (i - 1) * 112;
      ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.lineWidth = 14; ctx.strokeStyle = '#00101c'; ctx.strokeText(l, 0, yy);
      ctx.shadowColor = 'rgba(120,220,255,0.9)'; ctx.shadowBlur = 36; ctx.fillStyle = i === 1 ? '#8fe9ff' : '#ffffff'; ctx.fillText(l, 0, yy);
    });
    ctx.restore();
  }

  function postFX(t) {
    const night = smooth(DARK, DARK + 0.4, t);
    if (night > 0) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(150,175,230,${0.35 * night})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    const oxyT = smooth(52, 60, t) * (1 - smooth(72.5, 73, t));
    if (oxyT > 0) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(60,170,255,${0.45 * oxyT})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.68);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.5 + 0.3 * night})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const so = t - SUN_OFF;
    if (so > 0 && so < 0.8) { ctx.fillStyle = `rgba(255,250,235,${0.35 * Math.exp(-so * 7)})`; ctx.fillRect(0, 0, W, H); }
    const dk = t - DARK;
    if (dk > -0.1 && dk < 0.5) { ctx.fillStyle = `rgba(0,0,0,${0.9 * (1 - smooth(0, 0.5, dk))})`; ctx.fillRect(0, 0, W, H); }
    for (const s of SKIPS) {
      const d = Math.abs(t - s);
      if (d < 0.35) { ctx.fillStyle = `rgba(0,0,0,${0.92 * (1 - d / 0.35)})`; ctx.fillRect(0, 0, W, H); }
    }
  }

  // ============================================================ atualização por tempo
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const brown = new THREE.Color(0xc98a2b);

  function update(t) {
    const dark = smooth(DARK, DARK + 0.18, t), wl = windLevel(t);
    frostU.uSnow.value = smooth(26, 43, t) * 0.95 + 0.05 * smooth(45, 50, t);
    frostU.uOxy.value = smooth(53, 63, t);

    // câmera (cortes leves a cada salto no tempo)
    let cz, cy = 3.3, cx = Math.sin(t * 0.21) * 0.6;
    const look = new THREE.Vector3(0, 8.5, -40);
    if (t < SKIPS[0]) { cz = t < 12 ? 24 - t * 0.3 : 20.4 - (t - 12) * 0.05; if (t > DARK) look.y = 8.5 + 3 * smooth(DARK, DARK + 4, t); }
    else if (t < SKIPS[2]) { cz = 18 - (t - SKIPS[0]) * 0.08; cy = 3.0; look.set(0, 7, -40); }
    else if (t < SKIPS[3]) { cz = 14 - (t - SKIPS[2]) * 0.1; cy = 4.0; look.set(0, 9, -40); cx = 0.8; }
    else { cz = 11 - (t - SKIPS[3]) * 0.25; cy = 3.0; look.set(0, 6, -40); cx = 0; }
    const si = shakeIntensity(t);
    const sx = si * (0.55 * Math.sin(t * 53.1) + 0.3 * Math.sin(t * 31.7 + 1.3) + 0.15 * Math.sin(t * 89.3)) * 0.45;
    const sy = si * (0.5 * Math.sin(t * 47.3 + 0.7) + 0.35 * Math.sin(t * 27.9 + 2.1)) * 0.35;
    camera.position.set(cx + sx, cy + sy, cz);
    camera.lookAt(look.x + sx * 3, look.y + sy * 3, look.z);
    camera.rotateZ(si * 0.02 * Math.sin(t * 41.3));
    camera.updateMatrixWorld();
    frostU.uUpView.value.copy(UP).transformDirection(camera.matrixWorldInverse);
    sky.position.copy(camera.position); stars.position.copy(camera.position);

    // céu, Sol e luz
    skyU.sunVis.value = 1 - smooth(SUN_OFF, SUN_OFF + 0.35, t);
    skyU.sunSize.value = t > SUN_OFF ? 1 + 2.5 * Math.exp(-(t - SUN_OFF) * 8) : 1;
    const skyTop = mixColor(0x2f7fd8, 0x000003, dark).lerp(new THREE.Color(0x05080e), smooth(30, 40, t) * (1 - smooth(46, 52, t)) * 0.6);
    const skyBot = mixColor(0xcfe9ff, 0x050911, dark).lerp(new THREE.Color(0x1a2433), smooth(28, 38, t) * (1 - smooth(45, 52, t)) * 0.7);
    skyU.top.value.copy(skyTop); skyU.bottom.value.copy(skyBot);
    starMat.opacity = dark * (1 - 0.75 * smooth(28, 33, t) * (1 - smooth(45, 50, t)));
    sun.intensity = 3.2 * (1 - dark);
    const coldAmb = dark * (0.05 + 0.32 * smooth(26, 44, t) + 0.1 * smooth(45, 50, t));
    hemi.intensity = lerp(1.0, 0.0, dark) + coldAmb;
    hemi.color.copy(mixColor(0xd6ecff, 0xa4b8ff, dark)); hemi.groundColor.copy(mixColor(0x8d7b62, 0x2a3550, dark));
    scene.fog.color.copy(mixColor(0xcfe6ff, 0x03050a, dark).lerp(new THREE.Color(0x1b2533), smooth(26, 36, t) * (1 - 0.5 * smooth(60, 66, t))));
    scene.fog.density = lerp(0.0024, 0.012, dark) + 0.02 * snowAmount(t) * smooth(26, 40, t);
    renderer.toneMappingExposure = 1.05 + 0.45 * dark;

    // janelas acesas à noite (até a energia acabar)
    winLightU.value = smooth(DARK + 0.4, DARK + 1.2, t) * (1 - smooth(25, 38, t) * 0.5)
      * (t > 38.6 && t < 43.3 ? (hash(Math.floor(t * 9)) > 0.4 ? 1 : 0.1) : 1) * (1 - smooth(43.0, 43.4, t));

    // blocos dos prédios (alguns desabam congelados)
    for (let i = 0; i < CH.length; i++) {
      const c = CH[i];
      let px = c.x0, py = c.y0, pz = c.z0;
      Q.identity();
      if (t >= c.tb) {
        const dt = Math.min(t - c.tb, c.tland);
        px += c.vx * dt; pz += c.vz * dt; py = Math.max(c.sy * 0.5, c.y0 - 4.9 * dt * dt);
        Q.setFromAxisAngle(c.axis, c.spin * dt);
      } else if (t > c.tb - 1.6) {
        const k = smooth(c.tb - 1.6, c.tb, t) * 0.1 * c.hf;
        px += Math.sin(t * 37 + c.tremble) * k; pz += Math.cos(t * 29 + c.tremble) * k * 0.5;
      }
      P.set(px, py, pz); S.set(c.sx, c.sy, c.sz);
      M.compose(P, Q, S); chunkMesh.setMatrixAt(i, M);
    }
    chunkMesh.instanceMatrix.needsUpdate = true;

    // árvores: balançam, folhas amarelam e caem
    for (const tr of trees) {
      tr.g.rotation.z = -(Math.sin(t * 1.6 + tr.ph) * 0.02 * (1 + wl * 4) + wl * 0.06);
      for (const L of tr.leaves) {
        const age = smooth(L.tl - 4, L.tl, t), gone = smooth(L.tl, L.tl + 2.2, t);
        L.lm.color.copy(L.base).lerp(brown, age);
        L.m.scale.setScalar(Math.max(0.0001, 1 - gone));
        L.m.visible = gone < 0.999;
      }
    }
    const lf = ev.folhas || [27, 36];
    leafPMat.opacity = smooth(lf[0] - 2, lf[0], t) * (1 - smooth(lf[1], lf[1] + 2, t));
    leafP.visible = leafPMat.opacity > 0.001;
    if (leafP.visible) {
      const wd = windDisp(t);
      for (let i = 0; i < NLEAF; i++) {
        const s = i * 4, ph = (leafSeed[s + 3] + t * 0.18) % 1;
        leafPos[i * 3] = leafSeed[s] + wd * 0.6 * leafSeed[s + 3] + Math.sin(t * 3 + i) * 0.5;
        leafPos[i * 3 + 1] = leafSeed[s + 1] * (1 - ph) + 0.2;
        leafPos[i * 3 + 2] = leafSeed[s + 2] + Math.cos(t * 2 + i) * 0.5;
      }
      leafGeo.attributes.position.needsUpdate = true;
    }

    // postes
    for (const L of lamps) {
      const lv = lampLevel(L, t);
      L.headMat.emissiveIntensity = lv * 3; L.glow.material.opacity = lv * 0.9; L.cone.material.opacity = lv * 0.07;
      if (L.light) L.light.intensity = lv * 140;
      if (t < L.tq) L.g.rotation.set(0, 0, -wl * 0.02 * Math.sin(t * 7 + L.ph));
      else { const dt = t - L.tq; L.g.rotation.set(0, 0, -Math.min(Math.PI / 2 - 0.05, 0.9 * dt * dt + 0.05)); }
    }
    // semáforos: funcionam, piscam amarelo no escuro, apagam e tombam
    for (const T of tlights) {
      const ph = (t + T.off) % 12, st = ph < 5 ? 2 : ph < 6.5 ? 1 : 0;
      const blinking = t > DARK + 1, dead = t > T.tf;
      T.ls.forEach((m, k) => {
        const on = dead ? false : blinking ? (k === 1 && Math.floor(t * 2) % 2 === 0) : k === st;
        m.material.color.setHex(on ? lampOnC[k] : lampOff[k]); m.material.emissive.setHex(on ? lampOnC[k] : 0); m.material.emissiveIntensity = on ? 1.6 : 0;
      });
      if (t < T.tq) T.g.rotation.set(0, 0, 0);
      else { const dt = t - T.tq; T.g.rotation.set(0, 0, -Math.min(Math.PI / 2 - 0.08, 1.0 * dt * dt + 0.03)); }
    }

    // carros: andam, freiam assustados, faróis acendem e depois congelam
    const fT = ev.farois || 13.7;
    const lightsOn = smooth(fT, fT + 0.2, t) * (1 - smooth(37, 44, t));
    beamMat.opacity = lightsOn * 0.11; flareMat.opacity = lightsOn * 0.95;
    headLMat.emissiveIntensity = 0.1 + lightsOn * 3; tailLMat.emissiveIntensity = lightsOn * 2.5;
    for (const c of cars) {
      c.g.position.set(c.x, 0, wrap(c.z0 + c.dir * c.v * carDisp(t), -170, 34));
      c.g.rotation.set(t > 13 && t < 15.2 ? 0.02 * Math.sin((t - 13) * 6) * (1 - (t - 13) / 2.2) : 0, c.dir > 0 ? 0 : Math.PI, 0);
    }

    // pedestres: andam, param e olham para o céu; depois somem (abrigados)
    for (const p of people) {
      p.g.visible = t < SKIPS[0];
      if (!p.g.visible) continue;
      const stop = smooth(p.ts, p.ts + 0.9, t);
      const walkT = t < p.ts ? t : p.ts + (t - p.ts) * (1 - stop * 0.5);
      const ph = walkT * p.v * 4.2 + p.ph, sw = Math.sin(ph) * 0.55 * (1 - stop);
      p.g.position.set(p.x, Math.abs(Math.cos(ph)) * 0.05 * (1 - stop), wrap(p.z0 + p.dir * p.v * walkT, -85, 22));
      p.g.rotation.set(0, (p.dir > 0 ? 0 : Math.PI) + stop * p.turn, 0);
      p.neck.rotation.x = -0.75 * stop;
      p.lL.rotation.x = sw; p.lR.rotation.x = -sw;
      p.aL.rotation.x = -sw * 0.8 - stop * 1.9; p.aR.rotation.x = sw * 0.8 - stop * 0.4 * (1 + Math.sin(p.ph));
      p.aL.rotation.z = -stop * 0.3; p.aR.rotation.z = stop * 0.3;
    }

    // neve (nevasca) e gotas de oxigênio líquido
    const sa = snowAmount(t), wd = windDisp(t);
    snowMat.opacity = sa; snow.visible = sa > 0.001;
    if (snow.visible) {
      const n = Math.floor(NSNOW * (0.35 + 0.65 * sa));
      snowGeo.setDrawRange(0, n);
      for (let i = 0; i < n; i++) {
        const s = i * 4;
        snowPos[i * 3] = wrap(snowSeed[s] + wd * snowSeed[s + 3] * 1.3 + Math.sin(t * 1.3 + i) * 0.3, -40, 40) + camera.position.x;
        snowPos[i * 3 + 1] = wrap(snowSeed[s + 1] - t * (1.6 + snowSeed[s + 3]) * (1 + wl), 0, 32);
        snowPos[i * 3 + 2] = snowSeed[s + 2] + camera.position.z - 10;
      }
      snowGeo.attributes.position.needsUpdate = true;
    }
    const oT = ev.oxigenio || 52;
    const oa = smooth(oT, oT + 3, t) * (1 - smooth(64.5, 65.5, t));
    oxyMat.opacity = oa * 0.95; oxy.visible = oa > 0.001;
    if (oxy.visible) {
      for (let i = 0; i < NOXY; i++) {
        const s = i * 4;
        oxyPos[i * 3] = wrap(oxySeed[s] + wd * 0.5 * oxySeed[s + 3], -35, 35) + camera.position.x;
        oxyPos[i * 3 + 1] = wrap(oxySeed[s + 1] - t * 6.5 * oxySeed[s + 3], 0, 34);
        oxyPos[i * 3 + 2] = oxySeed[s + 2] + camera.position.z - 8;
      }
      oxyGeo.attributes.position.needsUpdate = true;
    }
  }

  // ============================================================ API pública
  let lastMode = '';
  function renderFrame(t) {
    t = clamp(t, 0, DUR);
    const mode = t < END ? 'city' : 'black';
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (mode === 'city') { update(t); renderer.render(scene, camera); ctx.drawImage(glCanvas, 0, 0, W, H); postFX(t); drawFrost(t); drawFinalText(t); }
    else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    if (t > 72.4 && t < END) { ctx.fillStyle = `rgba(0,0,0,${smooth(72.4, END, t)})`; ctx.fillRect(0, 0, W, H); }
    drawTitle(t);
    drawBadge(t);
    drawHUD(t);
    drawCards(t);
    drawSubtitles(t);
    lastMode = mode;
    return comp;
  }

  renderer.compile(scene, camera);
  renderFrame(0);

  return {
    canvas: comp, renderer, renderFrame,
    frameJPEG(t, q = 0.92) { renderFrame(t); return comp.toDataURL('image/jpeg', q); },
    stats: () => ({ chunks: CH.length, buildings: buildings.length, lamps: lamps.length, mode: lastMode }),
    debug: { scene, camera, chunkMesh },
  };
}
