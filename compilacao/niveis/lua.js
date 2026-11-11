// ============================================================================
//  "E se a Lua caísse na Terra?" — cena 3D low-poly (Three.js)
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
const fmt = (v) => String(Math.max(0, Math.round(v))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ---------------------------------------------------------------- linha do tempo
export const BREAK = 39.0;      // a Lua se despedaça (limite de Roche)
export const RAIN = 50.0;       // chuva de meteoros
export const FIRE = 64.8;       // impacto gigante -> onda de choque de fogo
export const FIRE_HIT = 69.6;   // a onda de fogo atinge a câmera
export const END = 73.0;

export function moonDistance(t) {                 // km
  if (t < 11) return 384400;
  if (t < 30) return lerp(384400, 100000, Math.pow(smooth(11, 30, t), 0.8));
  if (t < 38) return lerp(100000, 18000, smooth(30, 38, t));
  return 18000;
}
function moonAngle(t) {                           // diâmetro aparente (graus, exagerado p/ celular)
  if (t < 11) return 2.2;
  if (t < 30) return lerp(2.2, 24, Math.pow(smooth(11, 30, t), 1.6));
  return lerp(24, 50, smooth(30, 38.5, t));
}
export function tideAt(t) {                       // nível do mar (m)
  if (t < 12) return -0.35;
  if (t < 30) return lerp(-0.35, 4.6, Math.pow(smooth(12, 30, t), 1.3));
  if (t < 50) return lerp(4.6, 6.2, smooth(30, 46, t));
  return 6.2;
}
// intensidade geral (usada pelo áudio de fallback do navegador)
export function windLevel(t) {
  if (t < 12) return 0.05;
  if (t < 39) return 0.1 + 0.4 * smooth(12, 38, t);
  if (t < 50) return 0.55;
  if (t < FIRE) return 0.8;
  return t < END ? 1 : 0;
}
function shakeIntensity(t, impacts) {
  let s = 0;
  if (t < 0.6) s += 0.45 * (1 - t / 0.6);                       // impacto do sub-bass no 0,0 s
  if (t > 12 && t < 39) s += 0.05 + 0.12 * smooth(20, 38, t);    // tremores de maré
  if (t > 35.8 && t < 40) s += 0.25 * smooth(35.8, 39, t);
  if (t > BREAK && t < BREAK + 1.5) s += 0.5 * (1 - (t - BREAK) / 1.5);
  for (const im of impacts) if (t > im.t && t < im.t + 2) s += (im.tipo === 'mar' ? 0.4 : 0.7) * Math.exp(-(t - im.t) * 2.5);
  if (t > FIRE) s += 0.3 + 1.1 * smooth(FIRE, FIRE_HIT, t);
  return s;
}

// ---------------------------------------------------------------- texturas procedurais
function canvasTex(w, h, draw, repeat, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c);
  if (srgb) tx.colorSpace = THREE.SRGBColorSpace;
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
const fireTexture = () => canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.18, 'rgba(255,230,140,0.95)');
  gr.addColorStop(0.45, 'rgba(255,120,30,0.6)'); gr.addColorStop(0.75, 'rgba(160,30,0,0.2)'); gr.addColorStop(1, 'rgba(60,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
// superfície da Lua (equiretangular): mares escuros + crateras
const moonTexture = () => canvasTex(1024, 512, (g, w, h) => {
  const r = mulberry32(1969);
  g.fillStyle = '#b9b5ab'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {
    const x = r() * w, y = h * (0.25 + r() * 0.5), rad = 40 + r() * 110;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(70,72,78,0.55)'); gr.addColorStop(1, 'rgba(70,72,78,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 420; i++) {
    const x = r() * w, y = r() * h, rad = 2 + Math.pow(r(), 3) * 30;
    g.fillStyle = 'rgba(60,60,64,0.35)'; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(235,232,225,0.45)'; g.lineWidth = Math.max(1, rad * 0.18); g.beginPath(); g.arc(x - rad * 0.12, y - rad * 0.12, rad, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
  }
  for (let i = 0; i < 9000; i++) { const v = 150 + r() * 70 | 0; g.fillStyle = `rgba(${v},${v},${v - 6},0.25)`; g.fillRect(r() * w, r() * h, 2, 2); }
});
// rachaduras incandescentes (mapa de emissão da Lua antes de quebrar)
const crackTexture = () => canvasTex(1024, 512, (g, w, h) => {
  const r = mulberry32(3838);
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    let x = r() * w, y = h * (0.1 + r() * 0.8), a = r() * Math.PI * 2;
    const n = 20 + (r() * 40 | 0), lw = 1.5 + r() * 4;
    g.strokeStyle = `rgba(255,${120 + (r() * 100 | 0)},40,1)`; g.lineWidth = lw; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < n; k++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); }
    g.stroke();
  }
});
const fireNoiseTexture = () => canvasTex(512, 256, (g, w, h) => {
  const r = mulberry32(555);
  g.fillStyle = '#5a0f00'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) {
    const x = r() * w, y = r() * h, rad = 6 + r() * 40, k = r();
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, k > 0.6 ? 'rgba(255,240,170,0.9)' : k > 0.3 ? 'rgba(255,150,40,0.8)' : 'rgba(220,60,10,0.7)');
    gr.addColorStop(1, 'rgba(120,20,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}, [3, 2]);

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.0, flatShading: true, ...extra });
function shadowed(o) { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }

// ============================================================================
export async function createApp({ quality = 1, script, width, height, fov, overlays = true }) {
  if (width) { W = width; H = height; }
  const ev = script.eventos || {};
  const IMPACTS = (ev.impactos || []).map((x) => ({ ...x }));
  const rnd = mulberry32(20261110);
  const GW = Math.round(W * quality), GH = Math.round(H * quality);
  const glCanvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(GW, GH, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const camera = new THREE.PerspectiveCamera(fov || 72, W / H, 0.3, 2400);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x6d5a78, 0.0028);

  // ------------------------------------------------------------ céu (shader de crepúsculo)
  const skyU = {
    top: { value: new THREE.Color(0x1b2a5a) }, bottom: { value: new THREE.Color(0xf08a5d) },
    sunDir: { value: new THREE.Vector3(-0.85, 0.08, -0.5).normalize() }, sunCol: { value: new THREE.Color(0xffb070) },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vW;
      void main(){ vec3 d = normalize(vW - cameraPosition); float h = clamp(d.y,0.,1.);
        vec3 c = mix(bottom, top, pow(h, 0.5));
        float s = max(dot(d, sunDir), 0.); c += sunCol * (pow(s, 8.) * 0.45 + pow(s, 200.) * 1.5);
        gl_FragColor = vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -10; scene.add(sky);
  const DOT = dotTexture(), FIRE_TX = fireTexture();
  const NSTAR = 1200, starPos = new Float32Array(NSTAR * 3);
  for (let i = 0; i < NSTAR; i++) { const u = rnd() * Math.PI * 2, y = 0.15 + rnd() * 0.85, rr = Math.sqrt(1 - y * y); starPos.set([Math.cos(u) * rr * 1700, y * 1700, Math.sin(u) * rr * 1700], i * 3); }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, map: DOT, color: 0xdfe8ff, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const stars = new THREE.Points(starGeo, starMat); stars.frustumCulled = false; stars.renderOrder = -9; scene.add(stars);

  // ------------------------------------------------------------ luzes
  const hemi = new THREE.HemisphereLight(0xb7c4ff, 0x6b4a3a, 0.7); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffa868, 1.8);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 400 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  sun.target.position.set(0, 0, -30); sun.position.set(-150, 40, -90);
  scene.add(sun, sun.target);
  const moonLight = new THREE.DirectionalLight(0xbcd2ff, 0.2); scene.add(moonLight, moonLight.target);
  const flash = new THREE.PointLight(0xff8a3a, 0, 260, 1.4); scene.add(flash);

  // ------------------------------------------------------------ terreno: avenida + calçadão + praia + mar
  const land = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), std(0x8f8a80, { flatShading: false }));
  land.rotation.x = -Math.PI / 2; land.position.set(-1000 + 9, 0, -400); land.receiveShadow = true; scene.add(land);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(11, 560), new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.95 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.04, -240); road.receiveShadow = true; scene.add(road);
  {
    const walkL = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.22, 560), std(0xcfc8bb)); walkL.position.set(-7.3, 0.11, -240); walkL.receiveShadow = true; scene.add(walkL);
    const walkR = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.3, 560), std(0xd8b48a)); walkR.position.set(7.5, 0.15, -240); walkR.receiveShadow = true; scene.add(walkR); // calçadão
    for (const x of [-5.5, 5.5]) { const curb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 560), std(0xe9e4da)); curb.position.set(x, 0.15, -240); scene.add(curb); }
    const m = new THREE.Matrix4();
    const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.02, 3.2), std(0xf4d35e, { emissive: 0x332a00 }), 60);
    for (let i = 0; i < 60; i++) { m.makeTranslation(0, 0.08, 30 - i * 9); dash.setMatrixAt(i, m); }
    scene.add(dash);
    // areia em rampa até o mar
    const beach = new THREE.Mesh(new THREE.PlaneGeometry(40, 2000), std(0xe2c792, { flatShading: false }));
    beach.rotation.x = -Math.PI / 2; beach.rotation.y = -Math.atan2(3.4, 40);
    beach.position.set(9.5 + 20, -1.6, -400); beach.receiveShadow = true; scene.add(beach);
    const seabed = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), std(0x2d4a4a, { flatShading: false }));
    seabed.rotation.x = -Math.PI / 2; seabed.position.set(49 + 1500, -3.4, -400); scene.add(seabed);
  }
  // mar (ondas no vertex shader; a maré sobe e invade a avenida)
  const waterU = { uTime: { value: 0 }, uAmp: { value: 0.25 } };
  const waterGeo = new THREE.PlaneGeometry(1400, 1400, 170, 170); waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x1d6f8a, roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.9 });
  waterMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, waterU);
    sh.vertexShader = 'uniform float uTime; uniform float uAmp;\n'
      + 'float wH(vec2 p){ return uAmp*(0.55*sin(p.x*0.09 + uTime*1.3) + 0.3*sin(dot(p, vec2(0.05,0.07))*1.7 + uTime*1.9) + 0.15*sin(dot(p, vec2(-0.11,0.04))*2.3 + uTime*2.7)); }\n'
      + sh.vertexShader
        .replace('#include <beginnormal_vertex>', `vec2 wp = (modelMatrix*vec4(position,1.)).xz; float hx = (wH(wp+vec2(0.5,0.))-wH(wp-vec2(0.5,0.))); float hz = (wH(wp+vec2(0.,0.5))-wH(wp-vec2(0.,0.5))); vec3 objectNormal = normalize(vec3(-hx,1.,-hz));`)
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position); transformed.y += wH(wp);');
  };
  const water = new THREE.Mesh(waterGeo, waterMat); water.receiveShadow = true; water.frustumCulled = false; scene.add(water);

  // ------------------------------------------------------------ prédios da orla (blocos instanciados)
  const PALETTE = ['#f4a259', '#5b8e7d', '#bc4b51', '#f4e285', '#8cb369', '#5fa8d3', '#e07a5f', '#81b29a',
    '#f2cc8f', '#9d8df1', '#ef8fa0', '#62b6cb', '#ffffff', '#c3b299'];
  const buildings = [];
  {
    let z = 18;
    while (z > -300) {
      const far = z < -140, w = 9 + rnd() * 8, d = 9 + rnd() * 8;
      const h = far ? 30 + rnd() * 60 : 14 + rnd() * 36 + (z < -40 ? 10 : 0);
      buildings.push({ w, d, h, x: -(9.6 + w / 2 + rnd() * 1.2), z: z - d / 2, color: PALETTE[(rnd() * PALETTE.length) | 0], cs: far ? 3.6 : 2.5 });
      z -= d + 2 + rnd() * 4;
    }
    // segunda fileira (mais alta, ao fundo)
    for (let z2 = 0; z2 > -280; z2 -= 26 + rnd() * 10) {
      const w = 12 + rnd() * 8, d = 12 + rnd() * 8;
      buildings.push({ w, d, h: 40 + rnd() * 55, x: -(36 + w / 2 + rnd() * 8), z: z2, color: PALETTE[(rnd() * PALETTE.length) | 0], cs: 3.6 });
    }
  }
  // alvos dos meteoros: prédios (alternando próximos/distantes) e pontos no mar
  {
    const tb = buildings.filter((b) => b.z < -8 && b.z > -170).sort((a, b) => b.z - a.z);
    let bi = 0, si = 0;
    for (const im of IMPACTS) {
      if (im.tipo === 'mar') { im.x = 70 + (si % 3) * 70 + rnd() * 40; im.z = -40 - si * 45 - rnd() * 30; im.y = 0; si++; }
      else { const b = tb[(bi * 3 + 1) % tb.length]; im.x = b.x + (rnd() - 0.5) * 4; im.z = b.z + (rnd() - 0.5) * 4; im.y = 0; bi++; }
    }
  }
  const FIRE_C = new THREE.Vector3(-120, 0, -1100);
  const fireRadius = (t) => (t < FIRE ? 0 : 1180 * Math.pow(smooth(FIRE, FIRE_HIT + 0.3, t), 1.25));
  const fireTimeAt = (dist) => { // inverso aproximado de fireRadius
    for (let k = 0; k <= 200; k++) { const tt = FIRE + (FIRE_HIT + 0.3 - FIRE) * k / 200; if (fireRadius(tt) >= dist) return tt; }
    return Infinity;
  };

  const CH = [];
  for (const b of buildings) {
    const nx = Math.max(2, Math.round(b.w / b.cs)), nz = Math.max(2, Math.round(b.d / b.cs)), ny = Math.max(3, Math.round(b.h / (b.cs * 1.05)));
    const sx = b.w / nx, sz = b.d / nz, sy = b.h / ny, base = new THREE.Color(b.color);
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
      if (!(ix === 0 || iz === 0 || ix === nx - 1 || iz === nz - 1 || iy === ny - 1)) continue;
      const x0 = b.x - b.w / 2 + sx * (ix + 0.5), y0 = sy * (iy + 0.5), z0 = b.z - b.d / 2 + sz * (iz + 0.5);
      const r1 = rnd(), r2 = rnd(), r3 = rnd();
      const c = {
        x0, y0, z0, sx: sx * 0.985, sy: sy * 0.985, sz: sz * 0.985, tb: Infinity, vx: 0, vy: 0, vz: 0,
        axis: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), spin: 1 + r3 * 4,
        lit: rnd() < 0.5 ? 0.6 + rnd() * 0.4 : 0, color: base.clone().offsetHSL((r1 - 0.5) * 0.02, (r2 - 0.5) * 0.08, (r3 - 0.5) * 0.12),
      };
      // destruído por meteoro?
      for (const im of IMPACTS) {
        if (im.tipo !== 'predio') continue;
        const dx = x0 - im.x, dz = z0 - im.z, dist = Math.hypot(dx, dz, y0 * 0.5);
        if (dist < 34 && im.t + dist / 90 < c.tb) {
          const f = 1 - dist / 40, n = Math.hypot(dx, dz) || 1, sp = (20 + rnd() * 40) * f;
          c.tb = im.t + dist / 90 + rnd() * 0.1; c.vx = dx / n * sp; c.vz = dz / n * sp; c.vy = (8 + rnd() * 22) * f + 4;
        }
      }
      // senão, varrido pela onda de fogo
      if (c.tb === Infinity) {
        const dd = Math.hypot(x0 - FIRE_C.x, z0 - FIRE_C.z), tw = fireTimeAt(dd);
        if (tw < DUR) { c.tb = tw; const n = dd || 1; c.vx = (x0 - FIRE_C.x) / n * (60 + rnd() * 40); c.vz = (z0 - FIRE_C.z) / n * (60 + rnd() * 40); c.vy = 6 + rnd() * 18; }
      }
      CH.push(c);
    }
  }
  const winLightU = { value: 1 };
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
        totalEmissiveRadiance += (1.0 - wallMask) * vLit * uWinLight * vec3(1.0, 0.72, 0.38) * 1.8;`);
  };
  const roofMat = std(0xffffff, { roughness: 0.9 });
  const chunkGeo = new THREE.BoxGeometry(1, 1, 1);
  chunkGeo.setAttribute('aLit', new THREE.InstancedBufferAttribute(new Float32Array(CH.map((c) => c.lit)), 1));
  const chunkMesh = new THREE.InstancedMesh(chunkGeo, [winMat, winMat, roofMat, roofMat, winMat, winMat], CH.length);
  chunkMesh.castShadow = true; chunkMesh.receiveShadow = true; chunkMesh.frustumCulled = false;
  CH.forEach((c, i) => chunkMesh.setColorAt(i, c.color));
  chunkMesh.instanceColor.needsUpdate = true; scene.add(chunkMesh);

  // ------------------------------------------------------------ palmeiras e postes do calçadão
  const frondGeo = (() => {
    const pos = [], col = [], L = 4.6, segs = 7, n = 8, c1 = new THREE.Color(0x2f8f3a), c2 = new THREE.Color(0x79c24a);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (k % 2) * 0.2, ca = Math.cos(a), sa = Math.sin(a);
      const P = (s, side) => { const d = s * L, w = Math.sin(Math.PI * Math.min(1, s * 1.15)) * 0.75 * side; return [ca * d - sa * w, d * 0.55 - d * d * 0.17 - Math.abs(w) * 0.18, sa * d + ca * w]; };
      for (let i = 0; i < segs; i++) {
        const s0 = i / segs, s1 = (i + 1) / segs, A = P(s0, 0), B = P(s1, 0), C = P(s0, 1), D = P(s1, 1), E = P(s0, -1), F = P(s1, -1);
        pos.push(...A, ...C, ...B, ...C, ...D, ...B, ...A, ...B, ...E, ...E, ...B, ...F);
        const cc = c1.clone().lerp(c2, s0); for (let q = 0; q < 12; q++) col.push(cc.r, cc.g, cc.b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals(); return g;
  })();
  const trunkGeo = (() => {
    const g = new THREE.CylinderGeometry(0.2, 0.36, 9, 7, 9); g.translate(0, 4.5, 0);
    const p = g.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + 0.012 * y * y); const c = new THREE.Color(Math.floor(y * 1.6) % 2 ? 0x8a6a45 : 0x6e5236); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  })();
  const trunkMat = std(0xffffff, { vertexColors: true }), frondMat = std(0xffffff, { vertexColors: true, side: THREE.DoubleSide });
  const palms = [];
  for (let z = 14; z > -200; z -= 13 + rnd() * 5) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(trunkGeo, trunkMat));
    const fr = new THREE.Mesh(frondGeo, frondMat); fr.position.set(0.97, 9, 0); fr.rotation.y = rnd() * 6; g.add(fr);
    shadowed(g); g.position.set(8.2 + rnd() * 0.8, 0.3, z); g.rotation.y = rnd() * 6.28; g.scale.setScalar(0.8 + rnd() * 0.35);
    scene.add(g); palms.push({ g, ph: rnd() * 6.28, ry: g.rotation.y, tq: Infinity });
  }
  palms.forEach((p) => { const dd = Math.hypot(p.g.position.x - FIRE_C.x, p.g.position.z - FIRE_C.z); p.tq = fireTimeAt(dd); });
  const lamps = [];
  const glowMat = new THREE.SpriteMaterial({ map: DOT, color: 0xffd9a0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const poleMat = std(0x30343a, { metalness: 0.5, roughness: 0.5 });
  for (let z = 6; z > -180; z -= 22) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 7, 8), poleMat); pole.position.y = 3.5; g.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.4), new THREE.MeshStandardMaterial({ color: 0x888888, emissive: 0xffc777, emissiveIntensity: 2 })); head.position.set(-1.2, 6.9, 0); g.add(head);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), poleMat); arm.position.set(-0.6, 6.95, 0); g.add(arm);
    const glow = new THREE.Sprite(glowMat.clone()); glow.scale.set(3, 3, 1); glow.position.set(-1.2, 6.7, 0); g.add(glow);
    shadowed(pole); g.position.set(6.2, 0.3, z); scene.add(g);
    lamps.push({ g, head, glow, ph: rnd() * 100, toff: (ev.apagao || 27.5) + rnd() * 1.2 });
  }

  // ------------------------------------------------------------ carros (trânsito -> abandonados -> boiam -> flutuam no ar)
  const CAR_COLORS = [0xe63946, 0x1d3557, 0xf1c40f, 0x2a9d8f, 0xffffff, 0xff7f11, 0x6c5ce7, 0x222222, 0x48cae4, 0xb5179e];
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12); wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = std(0x111111), glassMat = std(0x9ec9e6, { metalness: 0.3, roughness: 0.2 });
  const headLMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xfff3c0, emissiveIntensity: 2 });
  const tailLMat = new THREE.MeshStandardMaterial({ color: 0x661111, emissive: 0xff2020, emissiveIntensity: 2 });
  function makeCar(color) {
    const g = new THREE.Group(), body = std(color, { metalness: 0.3, roughness: 0.45 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 4.2), body); b.position.y = 0.72; g.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.62, 2.2), glassMat); c.position.set(0, 1.4, -0.2); g.add(c);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 2.0), body); roof.position.set(0, 1.75, -0.2); g.add(roof);
    for (const [x, z] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) { const w = new THREE.Mesh(wheelGeo, wheelMat); w.position.set(x, 0.38, z); g.add(w); }
    shadowed(g);
    const hl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 0.05), headLMat); hl.position.set(0, 0.85, 2.11); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.05), tailLMat); tl.position.set(0, 0.9, -2.11); g.add(tl);
    return g;
  }
  const cars = [];
  [[1, -12], [-1, -20], [1, -34], [-1, -44], [1, -60], [-1, -71], [1, -88], [-1, -100], [1, -120], [-1, -133], [1, 0], [-1, -4], [1, -150], [-1, -165]].forEach(([dir, zf], i) => {
    const g = makeCar(CAR_COLORS[i % CAR_COLORS.length]); scene.add(g);
    const v = 7 + rnd() * 5;
    cars.push({ g, dir, x: dir > 0 ? 2.6 : -2.6, v, z0: zf - dir * v * 14, lift: 14 + rnd() * 22, sp: 0.3 + rnd() * 0.8, ph: rnd() * 6.28, tq: Infinity });
  });
  const carDisp = (t) => (t < 13 ? t : t < 15 ? 13 + (t - 13) - 0.25 * (t - 13) ** 2 : 14);
  // destroços boiando
  const NDEB = 160, debMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std(0xffffff), NDEB), deb = [];
  for (let i = 0; i < NDEB; i++) {
    deb.push({ x: -8 + rnd() * 18, z: 12 - rnd() * 120, s: 0.3 + rnd() * 1.1, sy: 0.15 + rnd() * 0.5, ax: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), sp: 0.3 + rnd(), lift: 6 + rnd() * 30, ph: rnd() * 6.28 });
    debMesh.setColorAt(i, new THREE.Color([0x8a6a45, 0x6b6b6b, 0x3a5a8a, 0xb5522e, 0xd9d2c0][i % 5]));
  }
  debMesh.instanceColor.needsUpdate = true; debMesh.castShadow = true; debMesh.frustumCulled = false; scene.add(debMesh);

  // ------------------------------------------------------------ pedestres
  const SKIN = [0xf1c27d, 0xc68642, 0x8d5524, 0xe0ac69, 0xffdbac], SHIRT = [0xe63946, 0x457b9d, 0xf4a261, 0x2a9d8f, 0xffffff, 0x8338ec, 0xffbe0b, 0x3a86ff];
  const people = [];
  for (let i = 0; i < 20; i++) {
    const g = new THREE.Group(), skin = std(SKIN[i % 5]), shirt = std(SHIRT[(i * 3) % 8]), pants = std([0x1d3557, 0x333333, 0x6b4f3a, 0x264653][i % 4]);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.68, 0.3), shirt); torso.position.y = 1.18; g.add(torso);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), skin); head.position.y = 1.72; g.add(head);
    const limb = (w, h, mat, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat); m.position.y = -h / 2; p.add(m); g.add(p); return p; };
    const lL = limb(0.19, 0.84, pants, -0.12, 0.84), lR = limb(0.19, 0.84, pants, 0.12, 0.84);
    const aL = limb(0.13, 0.64, shirt, -0.33, 1.48), aR = limb(0.13, 0.64, shirt, 0.33, 1.48);
    shadowed(g); scene.add(g);
    const side = i % 2 ? 1 : -1;
    people.push({ g, lL, lR, aL, aR, side, dir: rnd() > 0.5 ? 1 : -1, x: side > 0 ? 7 + rnd() * 1.4 : -(6.4 + rnd() * 1.8), z0: 18 - rnd() * 90, v: 1.1 + rnd() * 0.6, ph: rnd() * 6.28, tr: 12.6 + rnd() * 1.6 });
  }

  // ------------------------------------------------------------ a Lua (esfera -> rachaduras -> milhares de fragmentos -> anel de fogo)
  const MOON_DIR = new THREE.Vector3(0.36, 0.36, -0.86).normalize();
  const MOON_D = 1500;
  const moonU = { uCrack: { value: 0 } };
  const moonMat = new THREE.MeshStandardMaterial({ map: moonTexture(), emissive: 0xffffff, emissiveIntensity: 0.32, roughness: 1, fog: false });
  moonMat.emissiveMap = moonMat.map;
  const crackTx = crackTexture();
  moonMat.onBeforeCompile = (sh) => {
    sh.uniforms.uCrack = moonU.uCrack; sh.uniforms.crackMap = { value: crackTx };
    sh.fragmentShader = 'uniform float uCrack; uniform sampler2D crackMap;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n totalEmissiveRadiance += texture2D(crackMap, vMapUv).rgb * uCrack * 3.5;\n totalEmissiveRadiance += vec3(1.0,0.35,0.08) * uCrack * uCrack * 0.35;');
  };
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), moonMat);
  moon.rotation.set(0.3, -1.2, 0.1); moon.renderOrder = -5; scene.add(moon);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: 0xcfe0ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  moonGlow.renderOrder = -6; scene.add(moonGlow);
  // arco do anel no céu: grande círculo que passa pela Lua
  const RING_T = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), MOON_DIR).normalize().applyAxisAngle(MOON_DIR, 0.22);
  const RING_B = new THREE.Vector3().crossVectors(MOON_DIR, RING_T).normalize();
  const ringDir = (phi, out) => out.copy(MOON_DIR).multiplyScalar(Math.cos(phi)).addScaledVector(RING_T, Math.sin(phi));
  const NFRAG = 1500;
  const fragMat = new THREE.MeshStandardMaterial({ color: 0x8f8a84, emissive: 0xff4a10, emissiveIntensity: 0, flatShading: true, roughness: 1, fog: false });
  const fragMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), fragMat, NFRAG);
  fragMesh.frustumCulled = false; fragMesh.visible = false; fragMesh.renderOrder = -4; scene.add(fragMesh);
  const frags = [];
  for (let i = 0; i < NFRAG; i++) {
    const d = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1); if (d.lengthSq() < 1e-4) d.set(1, 0, 0); d.normalize();
    frags.push({ o: d.multiplyScalar(0.72 + 0.28 * Math.pow(rnd(), 0.3)), s: 0.05 + rnd() * 0.09, phi: (rnd() - 0.5) * Math.PI * 1.9, b: (rnd() - 0.5) * 70 * (0.3 + rnd()), dist: MOON_D * (0.85 + rnd() * 0.3), om: (0.004 + rnd() * 0.01) * (rnd() > 0.5 ? 1 : -1), ax: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), sp: rnd() * 2 });
    fragMesh.setColorAt(i, new THREE.Color().setHSL(0.07, 0.08, 0.35 + rnd() * 0.3));
  }
  fragMesh.instanceColor.needsUpdate = true;
  const NRD = 5000, rdPos = new Float32Array(NRD * 3), rdSeed = [];
  for (let i = 0; i < NRD; i++) rdSeed.push({ phi: (rnd() - 0.5) * Math.PI * 1.95, b: (rnd() - 0.5) * 120 * Math.pow(rnd(), 0.6), dist: MOON_D * (0.9 + rnd() * 0.25), om: 0.003 + rnd() * 0.008 });
  const rdGeo = new THREE.BufferGeometry(); rdGeo.setAttribute('position', new THREE.BufferAttribute(rdPos, 3));
  const rdMat = new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, map: DOT, color: 0xff8a3a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const ringDust = new THREE.Points(rdGeo, rdMat); ringDust.frustumCulled = false; ringDust.renderOrder = -3; scene.add(ringDust);
  // reflexo da Lua no mar
  const glintTx = canvasTex(64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); const g2 = g.createLinearGradient(0, 0, 64, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = g2; g.fillRect(0, 0, 64, 256); });
  const glint = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glintTx, color: 0xcfe0ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  glint.rotation.order = 'YXZ'; scene.add(glint);

  // ------------------------------------------------------------ meteoros, explosões e ondas de choque
  const meteors = IMPACTS.map((im, i) => {
    const r = mulberry32(900 + i);
    const from = MOON_DIR.clone().multiplyScalar(0.6).add(new THREE.Vector3((r() - 0.5) * 0.8, 0.9, (r() - 0.3) * 0.4)).normalize();
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x5a4a40, emissive: 0xff6a20, emissiveIntensity: 2.5, flatShading: true, fog: false }));
    rock.scale.setScalar(im.tipo === 'mar' ? 10 : 6 + r() * 4);
    const trail = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 16, 1, true), new THREE.MeshBasicMaterial({ map: FIRE_TX, color: 0xffa040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: FIRE_TX, color: 0xffe0a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const boom = new THREE.Sprite(new THREE.SpriteMaterial({ map: FIRE_TX, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: FIRE_TX, color: 0xff7a2a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(rock, trail, head, boom, ring, fire);
    return { im, from, rock, trail, head, boom, ring, fire, T: new THREE.Vector3(im.x, im.y, im.z), ph: r() * 10 };
  });
  // borrifo das quedas no mar
  const NSPL = 2400, splPos = new Float32Array(NSPL * 3), splSeed = [];
  for (let i = 0; i < NSPL; i++) splSeed.push({ k: i % Math.max(1, meteors.length), a: rnd() * Math.PI * 2, v: 20 + rnd() * 45, up: 40 + rnd() * 60 });
  const splGeo = new THREE.BufferGeometry(); splGeo.setAttribute('position', new THREE.BufferAttribute(splPos, 3));
  const splMat = new THREE.PointsMaterial({ size: 2.2, map: DOT, color: 0xe6f4ff, transparent: true, opacity: 0.9, depthWrite: false });
  const splash = new THREE.Points(splGeo, splMat); splash.frustumCulled = false; scene.add(splash);
  // onda de choque de fogo (domo que cresce a partir do horizonte)
  const fireTx = fireNoiseTexture();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: fireTx, color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  dome.position.copy(FIRE_C); dome.visible = false; scene.add(dome);
  const domeCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: FIRE_TX, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  domeCore.position.copy(FIRE_C).add(new THREE.Vector3(0, 60, 0)); scene.add(domeCore);
  // brasas no ar
  const NEMB = 2500, embPos = new Float32Array(NEMB * 3), embSeed = new Float32Array(NEMB * 4);
  for (let i = 0; i < NEMB; i++) embSeed.set([rnd() * 120 - 60, rnd() * 50, -110 + rnd() * 130, 0.5 + rnd()], i * 4);
  const embGeo = new THREE.BufferGeometry(); embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
  const embMat = new THREE.PointsMaterial({ size: 0.5, map: DOT, color: 0xff9a40, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const embers = new THREE.Points(embGeo, embMat); embers.frustumCulled = false; scene.add(embers);

  // ============================================================ 2D: composição + HUD + legendas
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const ctx = comp.getContext('2d');
  const F_TITLE = '"Anton", "Impact", "Arial Black", "DejaVu Sans", sans-serif';
  const F_SERIF = '"Playfair Display", "DejaVu Serif", Georgia, serif';
  const F_MONO = '"Roboto Mono", "DejaVu Sans Mono", "Courier New", monospace';

  function wrapLines(text, font, maxW) {
    ctx.font = font; const out = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const w of para.split(' ')) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test; }
      out.push(line);
    }
    return out;
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fitFont(text, weight, size, family, maxW) { let s = size; ctx.font = `${weight} ${s}px ${family}`; while (ctx.measureText(text).width > maxW && s > 20) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; } }

  function drawTitle(t) {
    const a = 1 - smooth(11.6, 12.6, t);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
    const pop = 1 + 0.08 * (1 - smooth(0, 0.6, t));
    ctx.translate(W / 2, 215); ctx.scale(pop, pop);
    ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = '#000'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
    ['E SE A LUA CAÍSSE', 'NA TERRA?'].forEach((l, i) => { fitFont(l, 400, 112, F_TITLE, 1000); ctx.strokeText(l, 0, i * 124); ctx.fillStyle = i ? '#ffd23f' : '#ffffff'; ctx.fillText(l, 0, i * 124); });
    ctx.restore();
  }
  function drawBadge(t) {
    const txt = `${script.projeto || 'PROJETO E SE?'}  |  EXPERIMENTO #${script.experimento || '001'}`;
    ctx.save(); ctx.font = `700 25px ${F_MONO}`;
    const bw = ctx.measureText(txt).width + 76, bh = 50, bx = (W - bw) / 2, by = 36;
    roundRect(bx, by, bw, bh, 25); ctx.fillStyle = 'rgba(8,12,20,0.55)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.stroke();
    ctx.fillStyle = `rgba(255,59,59,${0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI))})`; ctx.beginPath(); ctx.arc(bx + 30, by + bh / 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx + 50, by + bh / 2 + 1);
    ctx.restore();
  }
  function drawHUD(t) {
    const a = smooth(0.2, 0.8, t) * (1 - smooth(68.5, 69.5, t));
    if (a <= 0) return;
    const x = 34, y = lerp(1380, 120, smooth(11.6, 13, t)), w = 640, h = 318;
    const d = moonDistance(t), tide = tideAt(t);
    ctx.save(); ctx.globalAlpha = a;
    roundRect(x, y, w, h, 22); ctx.fillStyle = 'rgba(5,10,18,0.58)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = `700 29px ${F_MONO}`; ctx.fillStyle = '#cfe0ff'; ctx.fillText('DISTÂNCIA DA LUA:', x + 28, y + 50);
    const broken = t >= BREAK + 0.3, dv = broken ? 'LUA EM PEDAÇOS' : `${fmt(d)} KM`;
    fitFont(dv, 800, 64, F_MONO, w - 56);
    const dc = mixColor(0xffffff, 0xff4d3a, smooth(100000, 18000, d) * 1 + (broken ? 1 : 0));
    ctx.fillStyle = broken && Math.floor(t * 3) % 2 ? '#ffffff' : `#${dc.getHexString()}`; ctx.fillText(dv, x + 26, y + 118);
    const df = clamp(1 - (d - 18000) / (384400 - 18000));
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 28, y + 132, w - 56, 10);
    ctx.fillStyle = `#${dc.getHexString()}`; ctx.fillRect(x + 28, y + 132, (w - 56) * df, 10);
    ctx.font = `700 29px ${F_MONO}`; ctx.fillStyle = '#9fe3ff'; ctx.fillText('MARÉ:', x + 28, y + 192);
    const tv = tide < 0.3 ? 'NORMAL' : `+${tide.toFixed(1).replace('.', ',')} M`;
    const tc = mixColor(0xffffff, 0x3aa8ff, smooth(0, 3, tide)).lerp(new THREE.Color(0xff4d3a), smooth(3, 6, tide) * 0.6);
    ctx.font = `800 66px ${F_MONO}`; ctx.fillStyle = `#${tc.getHexString()}`; ctx.fillText(tv, x + 26, y + 258);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 28, y + 272, w - 56, 10);
    ctx.fillStyle = `#${tc.getHexString()}`; ctx.fillRect(x + 28, y + 272, (w - 56) * clamp((tide + 0.35) / 7), 10);
    ctx.font = `700 17px ${F_MONO}`; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText('NÍVEL DO MAR', x + 28, y + 304); ctx.textAlign = 'right'; ctx.fillText('+7 M', x + w - 28, y + 304);
    const alert = t > 50 ? 'CHUVA DE METEOROS' : t > 42 ? 'GRAVIDADE ANÔMALA' : t > 37.6 ? 'LIMITE DE ROCHE ATINGIDO' : t > 30.5 ? 'APROXIMANDO-SE DO LIMITE DE ROCHE' : t > 14 ? 'ALERTA DE INUNDAÇÃO' : null;
    if (alert && t < FIRE + 2) {
      const on = Math.floor(t * 4) % 2 === 0;
      roundRect(x, y + h + 14, w, 58, 14); ctx.fillStyle = on ? 'rgba(220,20,20,0.85)' : 'rgba(120,0,0,0.6)'; ctx.fill();
      fitFont(`! ${alert} !`, 800, 30, F_MONO, w - 30); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(`! ${alert} !`, x + w / 2, y + h + 54);
    }
    ctx.restore();
  }
  function drawSubtitles(t) {
    for (const f of script.frases) {
      if (t < f.inicio - 0.05 || t > f.fim + 0.05) continue;
      const a = (f.inicio <= 0 ? 1 : smooth(f.inicio, f.inicio + 0.4, t)) * (f.fim >= DUR ? 1 : 1 - smooth(f.fim - 0.4, f.fim, t));
      if (a <= 0) continue;
      const ending = f.inicio >= END, size = ending ? 70 : 62, lh = size * 1.28;
      const font = `${ending ? 'italic 600' : '600'} ${size}px ${F_SERIF}`;
      const lines = wrapLines(f.legenda || f.texto, font, ending ? 900 : 940);
      const cy = (ending ? 940 : 960) + (f.inicio <= 0 ? 0 : (1 - smooth(f.inicio, f.inicio + 0.5, t)) * 18);
      ctx.save(); ctx.globalAlpha = a; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 3; ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      lines.forEach((l, i) => { const yy = cy + (i - (lines.length - 1) / 2) * lh; if (!ending) ctx.strokeText(l, W / 2, yy); ctx.fillStyle = '#ffffff'; ctx.fillText(l, W / 2, yy); });
      ctx.restore();
    }
  }
  // fogo cobrindo a tela (a onda de choque atinge a câmera)
  const blobs = []; { const r = mulberry32(31337); for (let i = 0; i < 70; i++) blobs.push({ x: r() * W, y: r() * H, r: 120 + r() * 380, sp: 0.5 + r() * 1.5, ph: r() * 6.28, k: r() }); }
  function drawFireFill(t) {
    const a = smooth(FIRE_HIT - 0.9, FIRE_HIT, t) * (1 - smooth(71.6, 72.6, t));
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = '#5a0c00'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      const x = b.x + Math.sin(t * b.sp + b.ph) * 120, y = b.y - ((t - FIRE_HIT) * 500 * b.sp) % (H + 400) + 200;
      const yy = wrap(y, -300, H + 300);
      const g = ctx.createRadialGradient(x, yy, 0, x, yy, b.r);
      g.addColorStop(0, b.k > 0.6 ? 'rgba(255,245,200,0.75)' : 'rgba(255,150,40,0.6)'); g.addColorStop(0.5, 'rgba(230,70,10,0.35)'); g.addColorStop(1, 'rgba(120,10,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - b.r, yy - b.r, b.r * 2, b.r * 2);
    }
    const w0 = 1 - smooth(FIRE_HIT, FIRE_HIT + 0.6, t);
    if (w0 > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(255,250,235,${0.9 * w0})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }
  function postFX(t) {
    const heat = smooth(BREAK, 46, t) * 0.5 + smooth(RAIN, 58, t) * 0.5;
    if (heat > 0) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(255,100,30,${0.5 * heat})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.68);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const bk = t - BREAK;
    if (bk > 0 && bk < 1.2) { ctx.fillStyle = `rgba(255,220,180,${0.6 * Math.exp(-bk * 5)})`; ctx.fillRect(0, 0, W, H); }
    for (const im of IMPACTS) {
      const d = t - im.t;
      if (d > 0 && d < 1.5) { ctx.fillStyle = `rgba(255,190,110,${(im.tipo === 'mar' ? 0.35 : 0.6) * Math.exp(-d * 4)})`; ctx.fillRect(0, 0, W, H); }
    }
    const fd = t - FIRE;
    if (fd > 0 && fd < 1.5) { ctx.fillStyle = `rgba(255,245,225,${0.85 * Math.exp(-fd * 3)})`; ctx.fillRect(0, 0, W, H); }
  }

  // ============================================================ atualização por tempo
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), V = new THREE.Vector3(), V2 = new THREE.Vector3();
  const UPV = new THREE.Vector3(0, 1, 0);

  function update(t) {
    const tide = tideAt(t);
    // câmera: mirante elevado na orla, olhando a avenida e o mar
    const si = shakeIntensity(t, IMPACTS);
    const sx = si * (0.55 * Math.sin(t * 53.1) + 0.3 * Math.sin(t * 31.7 + 1.3) + 0.15 * Math.sin(t * 89.3)) * 0.45;
    const sy = si * (0.5 * Math.sin(t * 47.3 + 0.7) + 0.35 * Math.sin(t * 27.9 + 2.1)) * 0.35;
    const cz = 26 - Math.min(t, 40) * 0.12 - Math.max(0, t - 40) * 0.05;
    const lookY = 9 + 10 * smooth(12, 38, t) - 4 * smooth(RAIN, 54, t) + 6 * smooth(FIRE, FIRE_HIT, t);
    camera.position.set(-2.2 + sx, 7.5 + 1.5 * smooth(14, 30, t) + sy, cz);
    camera.lookAt(4.5 + sx * 3, lookY + sy * 3, -40);
    camera.rotateZ(si * 0.02 * Math.sin(t * 41.3));
    camera.updateMatrixWorld();
    sky.position.copy(camera.position); stars.position.copy(camera.position);

    // céu e luz: crepúsculo -> noite iluminada pela Lua -> céu de fogo
    const night = smooth(10, 30, t), fireSky = smooth(BREAK, 47, t), burn = smooth(RAIN, 60, t), inferno = smooth(FIRE, FIRE_HIT, t);
    skyU.top.value.copy(mixColor(0x1b2a5a, 0x070b1e, night).lerp(new THREE.Color(0x2a0a0c), fireSky).lerp(new THREE.Color(0x3a0d05), burn).lerp(new THREE.Color(0xff6a1a), inferno));
    skyU.bottom.value.copy(mixColor(0xf08a5d, 0x2a2a48, night).lerp(new THREE.Color(0xa83a18), fireSky).lerp(new THREE.Color(0xff6a2a), burn).lerp(new THREE.Color(0xffd27a), inferno));
    skyU.sunCol.value.copy(mixColor(0xffb070, 0x000000, night));
    starMat.opacity = smooth(14, 26, t) * (1 - fireSky);
    sun.intensity = lerp(1.8, 0.05, night);
    const ang = moonAngle(t) * Math.PI / 180;
    moonLight.intensity = (0.2 + 1.6 * smooth(11, 36, t)) * (1 - smooth(BREAK, BREAK + 1, t));
    moonLight.position.copy(camera.position).addScaledVector(MOON_DIR, 100); moonLight.target.position.copy(camera.position);
    hemi.intensity = 0.7 - 0.25 * night + 0.6 * fireSky + 0.5 * burn + 2 * inferno;
    hemi.color.copy(mixColor(0xb7c4ff, 0xff9a5a, fireSky));
    hemi.groundColor.copy(mixColor(0x6b4a3a, 0x8a2a0a, fireSky));
    scene.fog.color.copy(mixColor(0x6d5a78, 0x1a1c30, night).lerp(new THREE.Color(0x5a1e10), fireSky).lerp(new THREE.Color(0x7a2a0a), burn).lerp(new THREE.Color(0xffa040), inferno));
    scene.fog.density = 0.0028 + 0.002 * burn + 0.004 * inferno;
    renderer.toneMappingExposure = 1.1 + 0.25 * night;

    // Lua
    const R = MOON_D * Math.tan(ang / 2);
    const C = V.copy(camera.position).addScaledVector(MOON_DIR, MOON_D);
    const wob = t > 37.5 && t < BREAK ? Math.sin(t * 60) * R * 0.004 * smooth(37.5, BREAK, t) : 0;
    moon.visible = t < BREAK;
    moon.position.copy(C).x += wob; moon.scale.setScalar(R); moon.rotation.y = -1.2 + t * 0.004;
    moonU.uCrack.value = smooth(35.6, BREAK, t);
    moonMat.emissiveIntensity = 0.32 + 0.1 * smooth(11, 30, t);
    moonGlow.visible = t < BREAK + 0.5; moonGlow.position.copy(C); moonGlow.scale.setScalar(R * 3.2);
    moonGlow.material.opacity = 0.32 * (1 - smooth(BREAK, BREAK + 0.5, t)); moonGlow.material.color.copy(mixColor(0xcfe0ff, 0xff7a3a, moonU.uCrack.value));
    // fragmentos: explosão -> espalham ao longo do arco -> anel de fogo e rochas
    fragMesh.visible = t >= BREAK && t < FIRE_HIT;
    if (fragMesh.visible) {
      const ex = smooth(BREAK, BREAK + 1.6, t), spread = Math.pow(smooth(BREAK + 0.3, 47, t), 0.7);
      const RB = MOON_D * Math.tan((moonAngle(BREAK) * Math.PI / 180) / 2);
      fragMat.emissiveIntensity = 0.5 + 1.1 * smooth(BREAK, BREAK + 1.5, t);
      for (let i = 0; i < NFRAG; i++) {
        const f = frags[i];
        P.copy(C).addScaledVector(f.o, RB * (1 + 0.9 * ex));
        ringDir(f.phi * spread + f.om * Math.max(0, t - BREAK) * 6, V2).multiplyScalar(f.dist).add(camera.position).addScaledVector(RING_B, f.b);
        P.lerp(V2, spread);
        Q.setFromAxisAngle(f.ax, f.sp * t * 0.3 + i);
        const sc = RB * f.s * (1 - 0.35 * ex - 0.35 * spread); S.set(sc, sc * 0.8, sc);
        M.compose(P, Q, S); fragMesh.setMatrixAt(i, M);
      }
      fragMesh.instanceMatrix.needsUpdate = true;
    }
    rdMat.opacity = smooth(BREAK + 0.3, 44, t) * (1 - smooth(FIRE_HIT - 1, FIRE_HIT, t)) * 0.9;
    ringDust.visible = rdMat.opacity > 0.001;
    if (ringDust.visible) {
      const spread = smooth(BREAK + 0.5, 48, t);
      for (let i = 0; i < NRD; i++) {
        const s = rdSeed[i];
        ringDir(s.phi * spread + s.om * (t - BREAK) * 6, V2).multiplyScalar(s.dist).add(camera.position).addScaledVector(RING_B, s.b);
        rdPos[i * 3] = V2.x; rdPos[i * 3 + 1] = V2.y; rdPos[i * 3 + 2] = V2.z;
      }
      rdGeo.attributes.position.needsUpdate = true;
    }
    // reflexo da Lua no mar
    glint.visible = t < BREAK + 1;
    const az = Math.atan2(MOON_DIR.x, -MOON_DIR.z);
    glint.position.set(camera.position.x + Math.sin(az) * 330, tide + 0.35, camera.position.z - Math.cos(az) * 330);
    glint.rotation.set(-Math.PI / 2, 0, 0); glint.rotation.y = -az; glint.rotation.x = -Math.PI / 2;
    glint.scale.set(Math.max(8, R * 1.3), 600, 1);
    glint.material.opacity = 0.45 * (1 - smooth(BREAK, BREAK + 1, t)) * (0.5 + 0.5 * smooth(11, 30, t));

    // mar subindo
    waterU.uTime.value = t; waterU.uAmp.value = 0.25 + 0.9 * smooth(12, 30, t) + 0.4 * smooth(RAIN, 56, t);
    water.position.set(camera.position.x, tide, camera.position.z - 300);
    waterMat.color.copy(mixColor(0x1d6f8a, 0x10304a, night).lerp(new THREE.Color(0x5a2a1a), burn * 0.6));

    // janelas acesas até o apagão (a água invade os prédios)
    const off = ev.apagao || 27.5;
    winLightU.value = (1 - smooth(off, off + 1.5, t)) * (t > off - 2 && t < off + 1.5 ? (hash(Math.floor(t * 11)) > 0.35 ? 1 : 0.15) : 1);
    for (const L of lamps) {
      const on = t < L.toff ? 1 : t < L.toff + 1.2 ? (hash(Math.floor(t * 14) + L.ph) > 0.5 ? 1 : 0) : 0;
      L.head.material.emissiveIntensity = 2 * on; L.glow.material.opacity = 0.8 * on;
    }

    // blocos dos prédios (meteoros e onda de fogo)
    for (let i = 0; i < CH.length; i++) {
      const c = CH[i];
      let px = c.x0, py = c.y0, pz = c.z0;
      Q.identity();
      if (t >= c.tb) {
        const dt = t - c.tb;
        px += c.vx * dt; pz += c.vz * dt; py = Math.max(c.sy * 0.5, c.y0 + c.vy * dt - 4.9 * dt * dt);
        Q.setFromAxisAngle(c.axis, c.spin * dt);
      } else if (t > 50 && t < c.tb && c.tb < DUR) {
        const k = 0.03 * smooth(c.tb - 1.2, c.tb, t);
        px += Math.sin(t * 37 + i) * k * c.y0 * 0.1;
      }
      P.set(px, py, pz); S.set(c.sx, c.sy, c.sz);
      M.compose(P, Q, S); chunkMesh.setMatrixAt(i, M);
    }
    chunkMesh.instanceMatrix.needsUpdate = true;

    // palmeiras
    for (const p of palms) {
      const sw = Math.sin(t * 1.5 + p.ph) * (0.02 + 0.05 * smooth(12, 30, t));
      if (t < p.tq) { p.g.rotation.set(0, p.ry, 0); p.g.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), sw); p.g.position.y = 0.3; }
      else { const dt = t - p.tq; p.g.rotation.set(dt * 2, p.ry, dt * 3); p.g.position.y = 0.3 + 12 * dt; }
    }

    // carros: trânsito, param, boiam com a maré e depois flutuam no ar (gravidade lunar)
    const [fl0, fl1] = ev.flutuacao || [42, 50];
    for (const c of cars) {
      const z = wrap(c.z0 + c.dir * c.v * carDisp(t), -175, 34);
      const floatY = Math.max(0, tide - 0.55) + (tide > 0.6 ? Math.sin(t * 1.7 + c.ph) * 0.25 : 0);
      const lift = c.lift * Math.pow(smooth(fl0 + c.ph * 0.4, fl1, t), 1.4);
      const drift = tide > 0.6 ? (tide - 0.6) * 0.6 : 0;
      c.g.position.set(c.x - drift + Math.sin(t * 0.3 + c.ph) * 0.3 * (tide > 0.6 ? 1 : 0), floatY + lift, z);
      const tumble = smooth(fl0, fl1, t);
      c.g.rotation.set(Math.sin(t * 0.9 + c.ph) * 0.06 * (tide > 0.6 ? 1 : 0) + tumble * c.sp * (t - fl0) * 0.4, (c.dir > 0 ? 0 : Math.PI) + tumble * c.sp * (t - fl0) * 0.2, tumble * c.sp * (t - fl0) * 0.3);
      if (t > RAIN) c.g.position.y += 0;
    }
    headLMat.emissiveIntensity = tailLMat.emissiveIntensity = 2 * (1 - smooth(18, 26, t));
    // destroços
    debMesh.visible = t > 14;
    if (debMesh.visible) {
      const vis = smooth(14, 20, t);
      for (let i = 0; i < NDEB; i++) {
        const d = deb[i], lift = d.lift * Math.pow(smooth(fl0 + d.ph * 0.5, fl1 + 1, t), 1.3);
        P.set(d.x + Math.sin(t * 0.4 + d.ph) * 1.5, Math.max(0.2, tide) + Math.sin(t * 1.5 + d.ph) * 0.2 + lift, d.z + Math.cos(t * 0.3 + d.ph) * 1.5);
        Q.setFromAxisAngle(d.ax, d.sp * t * (0.3 + smooth(fl0, fl1, t)));
        S.set(d.s * vis, d.sy * vis, d.s * 1.4 * vis);
        M.compose(P, Q, S); debMesh.setMatrixAt(i, M);
      }
      debMesh.instanceMatrix.needsUpdate = true;
    }

    // pedestres: passeiam, correm assustados e somem
    for (const p of people) {
      p.g.visible = t < p.tr + 4.5;
      if (!p.g.visible) continue;
      const run = smooth(p.tr, p.tr + 0.6, t);
      const zz = wrap(p.z0 + p.dir * p.v * Math.min(t, p.tr), -75, 20);
      const rx = p.x - run * Math.pow(t - p.tr > 0 ? t - p.tr : 0, 1.2) * 4.2 * (p.side > 0 ? 1.4 : 0.6);
      const ph = t * (p.v * 4.2 + run * 7) + p.ph, sw = Math.sin(ph) * (0.55 + run * 0.4);
      p.g.position.set(rx, Math.abs(Math.cos(ph)) * (0.05 + run * 0.1), zz);
      p.g.rotation.set(run * 0.25, lerp(p.dir > 0 ? 0 : Math.PI, -Math.PI / 2, run), 0);
      p.lL.rotation.x = sw; p.lR.rotation.x = -sw; p.aL.rotation.x = -sw * 0.9 - run * 0.4; p.aR.rotation.x = sw * 0.9 - run * 0.4;
    }

    // meteoros
    let fl = 0;
    flash.intensity = 0;
    for (const m of meteors) {
      const dt = t - m.im.t, travel = 1.7;
      const inAir = dt > -travel && dt < 0;
      m.rock.visible = m.trail.visible = m.head.visible = inAir;
      if (inAir) {
        const u = (dt + travel) / travel;
        const S0 = V2.copy(m.T).addScaledVector(m.from, 900);
        P.copy(S0).lerp(m.T, u);
        m.rock.position.copy(P); m.rock.rotation.set(t * 3, t * 2, 0);
        const sz = m.rock.scale.x;
        m.head.position.copy(P); m.head.scale.setScalar(sz * 7);
        m.trail.scale.set(sz * 1.6, sz * 30, sz * 1.6);
        m.trail.quaternion.setFromUnitVectors(UPV, m.from);
        m.trail.position.copy(P).addScaledVector(m.from, sz * 15);
      }
      const boomA = dt > 0 ? Math.exp(-dt * 1.4) : 0;
      m.boom.visible = dt > 0 && dt < 4;
      if (m.boom.visible) {
        const big = m.im.tipo === 'mar' ? 1.2 : 1;
        m.boom.position.set(m.T.x, 12 + dt * 10, m.T.z); m.boom.scale.setScalar((25 + 90 * Math.pow(smooth(0, 0.8, dt), 0.6)) * big);
        m.boom.material.opacity = boomA; m.boom.material.color.copy(mixColor(0xffffff, 0xff6a20, smooth(0, 1.2, dt)));
        fl = Math.max(fl, boomA);
        if (boomA > 0.05) { flash.position.set(m.T.x, 30, m.T.z); }
      }
      m.ring.visible = dt > 0 && dt < 2.5;
      if (m.ring.visible) { const r = 10 + 220 * smooth(0, 2.2, dt); m.ring.position.set(m.T.x, Math.max(0.5, tide) + 0.6, m.T.z); m.ring.scale.set(r, r, r); m.ring.material.opacity = 0.8 * (1 - dt / 2.5); }
      m.fire.visible = m.im.tipo !== 'mar' && dt > 0.4 && t < FIRE_HIT;
      if (m.fire.visible) { const fk = 0.75 + 0.25 * Math.sin(t * 13 + m.ph) * Math.sin(t * 7.1 + m.ph); m.fire.position.set(m.T.x, 10, m.T.z); m.fire.scale.setScalar(38 * fk); m.fire.material.opacity = 0.7 * smooth(0.4, 1.5, dt); }
    }
    flash.intensity = fl * 9000;
    // borrifos das quedas no mar
    const seaM = meteors.filter((m) => m.im.tipo === 'mar');
    splash.visible = seaM.some((m) => t > m.im.t && t < m.im.t + 6);
    if (splash.visible) {
      for (let i = 0; i < NSPL; i++) {
        const s = splSeed[i], m = seaM[s.k % seaM.length], dt = t - m.im.t;
        if (dt < 0 || dt > 6) { splPos[i * 3 + 1] = -100; continue; }
        splPos[i * 3] = m.T.x + Math.cos(s.a) * s.v * dt; splPos[i * 3 + 2] = m.T.z + Math.sin(s.a) * s.v * dt;
        splPos[i * 3 + 1] = Math.max(tide, tide + s.up * dt - 9.8 * dt * dt);
      }
      splGeo.attributes.position.needsUpdate = true;
    }
    // domo de fogo
    const fr = fireRadius(t);
    dome.visible = t >= FIRE && t < FIRE_HIT + 1;
    if (dome.visible) { dome.scale.set(fr, fr * 0.55, fr); fireTx.offset.set(t * 0.05, -t * 0.12); dome.material.opacity = 0.95; }
    domeCore.material.opacity = t > FIRE ? 0.9 * smooth(FIRE, FIRE + 0.4, t) : 0;
    domeCore.scale.setScalar(200 + fr * 1.2);
    // brasas
    embMat.opacity = smooth(BREAK + 1, 48, t) * 0.4 + smooth(RAIN, 56, t) * 0.5;
    embers.visible = embMat.opacity > 0.01;
    if (embers.visible) {
      for (let i = 0; i < NEMB; i++) {
        const s = i * 4;
        embPos[i * 3] = wrap(embSeed[s] + t * 3 * embSeed[s + 3] + (t > FIRE ? (t - FIRE) * 30 : 0), -60, 60) + camera.position.x;
        embPos[i * 3 + 1] = wrap(embSeed[s + 1] + t * 2.5 * embSeed[s + 3], 0, 50);
        embPos[i * 3 + 2] = embSeed[s + 2] + camera.position.z - 20;
      }
      embGeo.attributes.position.needsUpdate = true;
    }
  }

  // ============================================================ API pública
  let lastMode = '';
  function renderFrame(t) {
    t = clamp(t, 0, DUR);
    const mode = t < END ? 'city' : 'black';
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (mode === 'city' && t < 72.6) { update(t); renderer.render(scene, camera); ctx.drawImage(glCanvas, 0, 0, W, H); postFX(t); drawFireFill(t); }
    else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    if (t > 71.6 && t < END) { ctx.fillStyle = `rgba(0,0,0,${smooth(71.6, 72.6, t)})`; ctx.fillRect(0, 0, W, H); }
    if (overlays) drawTitle(t);
    if (overlays) drawBadge(t);
    if (overlays) drawHUD(t);
    if (overlays) drawSubtitles(t);
    lastMode = mode;
    return comp;
  }

  renderer.compile(scene, camera);
  renderFrame(0);

  return {
    canvas: comp, renderer, renderFrame,
    frameJPEG(t, q = 0.92) { renderFrame(t); return comp.toDataURL('image/jpeg', q); },
    stats: () => ({ chunks: CH.length, buildings: buildings.length, impacts: IMPACTS.length, mode: lastMode }),
    debug: { scene, camera, chunkMesh },
  };
}
