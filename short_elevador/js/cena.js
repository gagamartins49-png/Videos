// ============================================================================
//  Cena 3D do Short "E se você pulasse no último segundo de um elevador despencando?"
//  (Projeto E se? #006). Torre com elevador panorâmico de vidro, poço com amortecedores,
//  cabos, garras de freio nos trilhos e o boneco de testes. Visual low-poly próprio do canal.
//  renderFrame(t) é uma FUNÇÃO PURA do tempo do vídeo (determinística).
// ============================================================================
import * as THREE from '../../vendor/three.module.min.js';
import * as F from './fisica.js';

const { clamp, smooth } = F;
const lerp = (a, b, u) => a + (b - a) * u;
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function mulberry32(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const G0 = 9.81;
const SZ = 1.9;                 // centro do poço em z
const TOP = 74;                 // polia no topo

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
  const rnd = mulberry32(606);
  const glCanvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(Math.round(W * quality), Math.round(H * quality), false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const camera = new THREE.PerspectiveCamera(60, W / H, 0.05, 3000);
  camera.setViewOffset(W, H, Math.round(W * 0.11), 0, W, H);   // ação um pouco à esquerda (o Interrogador fica no canto direito)
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xbcd3ea, 0.0024);
  const DOT = dotTexture();

  // ------------------------------------------------------------ céu de fim de tarde
  const SUN_DIR = new THREE.Vector3(-0.55, 0.22, -0.8).normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16), new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: SUN_DIR } }, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform vec3 sunDir; varying vec3 vW;
      void main(){ vec3 d = normalize(vW - cameraPosition); float h = d.y;
        vec3 top = vec3(0.16,0.34,0.70), mid = vec3(0.50,0.68,0.90), hor = vec3(0.98,0.80,0.62);
        vec3 c = mix(mix(hor, mid, smoothstep(0.0, 0.18, h)), top, smoothstep(0.12, 0.75, h));
        if (h < 0.0) c = hor * 0.9;
        float az = atan(d.x, -d.z);
        float cl = exp(-pow((h - 0.14) / 0.05, 2.0)) * smoothstep(0.45, 0.95, sin(az * 5.0 + sin(az * 17.0) * 0.7) * 0.5 + 0.5);
        float s = max(dot(d, sunDir), 0.0);
        c = mix(c, vec3(1.0, 0.92, 0.85) + vec3(1.0, 0.6, 0.3) * pow(s, 4.0) * 0.6, cl * 0.6);
        c += vec3(1.0, 0.65, 0.35) * pow(s, 8.0) * 0.45 + vec3(1.0, 0.85, 0.6) * pow(s, 90.0) * 0.8;
        c = mix(c, vec3(3.0, 2.6, 2.0), smoothstep(0.9993, 0.9996, s));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -10; scene.add(sky);

  // ------------------------------------------------------------ luzes (sol baixo pela frente-direita, ilumina a fachada)
  scene.add(new THREE.HemisphereLight(0xd8e8ff, 0x8a7a68, 1.25));
  const sun = new THREE.DirectionalLight(0xffe0c0, 2.9);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 300 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  const L_DIR = new THREE.Vector3(0.55, 0.6, 0.58).normalize();
  scene.add(sun, sun.target);
  const cabLight = new THREE.PointLight(0xfff4dd, 6, 6, 1.5); scene.add(cabLight);
  const alarmLight = new THREE.PointLight(0xff2a2a, 0, 25, 1.4); scene.add(alarmLight);

  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, flatShading: true, ...extra });
  const shadowed = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  // ------------------------------------------------------------ chão da praça (com o buraco do poço)
  const tiles = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#d6cfc4'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b9b1a4'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); } }, [1, 1]);
  const groundMat = new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.85 });
  const gpiece = (x0, x1, z0, z1) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / 3, uv.getY(i) * (z1 - z0) / 3); const m = new THREE.Mesh(g, groundMat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); };
  gpiece(-300, -1.75, -300, 300); gpiece(1.75, 300, -300, 300); gpiece(-1.75, 1.75, -300, 0.3); gpiece(-1.75, 1.75, 3.5, 300);
  // poço
  const pitMat = std(0x8d8a84);
  { const pf = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 3.2), pitMat); pf.position.set(0, -2.3, SZ); pf.receiveShadow = true; scene.add(pf);
    for (const [x, z, w, d] of [[-1.75, SZ, 0.1, 3.2], [1.75, SZ, 0.1, 3.2], [0, 0.3, 3.5, 0.1], [0, 3.5, 3.5, 0.1]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2.3, d), pitMat); m.position.set(x, -1.15, z); m.receiveShadow = true; scene.add(m); } }
  const bufMat = std(0xffc61a, { metalness: 0.3, roughness: 0.4 }), bufDark = std(0x222222);
  const buffers = [-0.6, 0.6].map((x) => { const g = new THREE.Group(); const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.2, 12), bufDark); base.position.y = 0.1; g.add(base);
    const coil = new THREE.Group(); for (let k = 0; k < 8; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 14), bufMat); r.rotation.x = Math.PI / 2; r.position.y = 0.25 + k * 0.2; coil.add(r); } g.add(coil);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12), bufDark); cap.position.y = 1.86; g.add(cap);
    g.position.set(x, -2.2, SZ); shadowed(g); scene.add(g); return { g, coil, cap }; });

  // ------------------------------------------------------------ torre com fachada de vidro + portas dos andares
  const winTex = canvasTex(128, 128, (g) => { g.fillStyle = '#e9edf2'; g.fillRect(0, 0, 128, 128); const gr = g.createLinearGradient(0, 10, 0, 118); gr.addColorStop(0, '#9cc4e4'); gr.addColorStop(1, '#3b5a7a'); g.fillStyle = gr; g.fillRect(8, 10, 112, 104); g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.moveTo(14, 16); g.lineTo(60, 16); g.lineTo(14, 80); g.fill(); g.fillStyle = '#e9edf2'; g.fillRect(62, 10, 4, 104); });
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  const tower = (() => { const w = 18, h = 75, d = 18, geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; const su = f < 2 ? d / 3 : f < 4 ? 0 : w / 3, sv = f < 2 || f >= 4 ? h / 3 : 0; uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); }
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: winTex, color: 0xdfe6ee, roughness: 0.35, metalness: 0.2, flatShading: true })); m.position.set(0, h / 2, -d / 2); shadowed(m); scene.add(m); return m; })();
  const crown = new THREE.Mesh(new THREE.BoxGeometry(18.6, 1.2, 18.6), std(0x56606c)); crown.position.set(0, 75.6, -9); shadowed(crown); scene.add(crown);
  // faixa de fundo atrás do elevador (parede sólida para as portas)
  const core = new THREE.Mesh(new THREE.BoxGeometry(4.2, 76, 0.4), std(0xcfd4da)); core.position.set(0, 38, 0.15); shadowed(core); scene.add(core);
  const doorMat = std(0xb8c0c8, { metalness: 0.7, roughness: 0.3 }), frameMat = std(0x3a4048, { metalness: 0.5 });
  const numTex = (n) => canvasTex(96, 48, (g, w, h) => { g.fillStyle = '#10151c'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffcf3a'; g.font = 'bold 34px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n === 0 ? 'T' : String(n), w / 2, h / 2 + 2); });
  const landings = [];
  for (let k = 0; k <= 24; k++) {
    const y = k * F.ANDAR, g = new THREE.Group();
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.4, 0.08), frameMat); fr.position.set(0, 1.2, 0.38); g.add(fr);
    const dl = new THREE.Mesh(new THREE.BoxGeometry(0.82, 2.2, 0.06), doorMat); dl.position.set(-0.42, 1.1, 0.44); g.add(dl);
    const dr = new THREE.Mesh(new THREE.BoxGeometry(0.82, 2.2, 0.06), doorMat); dr.position.set(0.42, 1.1, 0.44); g.add(dr);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map: numTex(k) })); sign.position.set(0, 2.62, 0.43); g.add(sign);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.35), frameMat); sill.position.set(0, -0.06, 0.52); g.add(sill);
    g.position.set(0, y, 0); shadowed(g); scene.add(g); landings.push({ g, dl, dr });
  }
  // porta da escada no térreo
  const stair = new THREE.Group();
  { const fr = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.5, 0.1), frameMat); fr.position.set(0, 1.25, 0.05); stair.add(fr);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.08), std(0x2f7d4f, { roughness: 0.5 })); door.position.set(0, 1.1, 0.12); stair.add(door); stair.userData.door = door;
    const sTex = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#1f8a4c'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 50px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ESCADA', w / 2 + 28, h / 2 + 2); g.lineWidth = 6; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(20, 78); g.lineTo(36, 78); g.lineTo(36, 62); g.lineTo(52, 62); g.lineTo(52, 46); g.lineTo(68, 46); g.lineTo(68, 30); g.stroke(); });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.52), new THREE.MeshBasicMaterial({ map: sTex })); sg.position.set(0, 2.85, 0.12); stair.add(sg);
    stair.position.set(-5.5, 0, 0.02); shadowed(stair); scene.add(stair); }

  // ------------------------------------------------------------ estrutura do poço panorâmico (aço + vidro)
  const steel = std(0x2b3138, { metalness: 0.6, roughness: 0.4 });
  for (const [x, z] of [[-1.75, 0.35], [1.75, 0.35], [-1.75, 3.5], [1.75, 3.5]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 78, 0.16), steel); p.position.set(x, 36.5, z); shadowed(p); scene.add(p); }
  const ringGeo = new THREE.BoxGeometry(1, 1, 1), NR = 26 * 3;
  const rings = new THREE.InstancedMesh(ringGeo, steel, NR); { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(); let i = 0;
    for (let k = 0; k < 26; k++) { const y = k * F.ANDAR + 2.85; for (const [px, pz, sx, sz] of [[0, 3.5, 3.5, 0.12], [-1.75, SZ, 0.12, 3.2], [1.75, SZ, 0.12, 3.2]]) { p.set(px, y, pz); s.set(sx, 0.14, sz); m.compose(p, q, s); rings.setMatrixAt(i++, m); } } }
  rings.castShadow = true; scene.add(rings);
  const shaftGlass = new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.12, metalness: 0.6, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  for (const x of [-1.76, 1.76]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(3.15, 77), shaftGlass); g.rotation.y = Math.PI / 2; g.position.set(x, 38.5, SZ); scene.add(g); }
  const railMat = std(0x9aa3ad, { metalness: 0.8, roughness: 0.3 });
  for (const x of [-1.5, 1.5]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, 80, 0.16), railMat); r.position.set(x, 37, SZ); scene.add(r); }
  // casa de máquinas e polia no topo
  const mroom = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3, 3.8), std(0x5c6670)); mroom.position.set(0, 77.5, SZ); shadowed(mroom); scene.add(mroom);
  const sheave = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.4, 20), std(0x30353b, { metalness: 0.7 })); sheave.rotation.z = Math.PI / 2; sheave.position.set(0, TOP, SZ); scene.add(sheave);

  // ------------------------------------------------------------ cabine panorâmica
  const cab = new THREE.Group(); scene.add(cab);
  const cabBody = new THREE.Group(); cab.add(cabBody);               // parte que amassa
  const cabSteel = std(0xd9dde2, { metalness: 0.75, roughness: 0.25 });
  const floorM = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 2.4), std(0x5b4636)); floorM.position.y = -0.06; cabBody.add(floorM);
  const under = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.22, 2.3), steel); under.position.y = -0.23; cabBody.add(under);
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 2.4), cabSteel); ceil.position.y = 2.62; cabBody.add(ceil);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 1.0), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 1.6 })); lamp.position.y = 2.54; cabBody.add(lamp);
  for (const [x, z] of [[-1.17, -1.17], [1.17, -1.17], [-1.17, 1.17], [1.17, 1.17]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.08), cabSteel); p.position.set(x, 1.3, z); cabBody.add(p); }
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.06), cabSteel); back.position.set(0, 1.3, -1.18); cabBody.add(back);
  const indTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return { c, tx, last: null }; })();
  const ind = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: indTex.tx })); ind.position.set(0, 2.25, -1.14); cabBody.add(ind);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.04), std(0x222831)); panel.position.set(0.85, 1.2, -1.14); cabBody.add(panel);
  const cabGlassMat = new THREE.MeshStandardMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.16, metalness: 0.7, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  for (const x of [-1.19, 1.19]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.5), cabGlassMat); g.rotation.y = Math.PI / 2; g.position.set(x, 1.3, 0); cabBody.add(g); }
  const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.5), cabGlassMat); frontGlass.position.set(0, 1.3, 1.19); cabBody.add(frontGlass);
  for (const x of [-1.12, 1.12]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 2.1), cabSteel); r.position.set(x, 0.95, 0); cabBody.add(r); }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.3), steel); cross.position.set(0, 2.95, 0); cab.add(cross);
  const gears = [-1.36, 1.36].map((x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.36), new THREE.MeshStandardMaterial({ color: 0x8a1c1c, emissive: 0xff5a10, emissiveIntensity: 0, metalness: 0.5, roughness: 0.4 })); m.position.set(x, -0.15, 0); cab.add(m); return m; });
  const alarm = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ color: 0x661111, emissive: 0xff2020, emissiveIntensity: 0 })); alarm.position.set(0.9, 3.12, 0.5); cab.add(alarm);
  shadowed(cab);
  frontGlass.castShadow = false;

  // cabos (4 cordoalhas em segmentos, para poderem chicotear quando arrebentam)
  const NSEG = 14, cableMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 5), std(0x3a3a3a, { metalness: 0.7 }), 4 * NSEG * 2);
  cableMesh.frustumCulled = false; scene.add(cableMesh);
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  function seg(i, a, b) { dir.subVectors(b, a); const L = dir.length(); tmpQ.setFromUnitVectors(up, dir.normalize()); tmpP.addVectors(a, b).multiplyScalar(0.5); tmpS.set(1, L, 1); tmpM.compose(tmpP, tmpQ, tmpS); cableMesh.setMatrixAt(i, tmpM); }
  const pa = new THREE.Vector3(), pb = new THREE.Vector3();
  function setCables(yCab, snapAge, visible = true) {
    let i = 0; const yTop = yCab + 3.05;
    for (let c = 0; c < 4; c++) {
      const x = -0.3 + c * 0.2;
      for (let k = 0; k < NSEG; k++) {
        const f0 = k / NSEG, f1 = (k + 1) / NSEG;
        const point = (f, out) => {
          if (snapAge === null || snapAge < 0) return out.set(x, lerp(yTop, TOP, f), SZ);
          // cabo solto caindo junto com a cabine: comprimento original acima dela, chicoteando
          const L0 = TOP - (F.H0 + 3.05), a = Math.min(1, snapAge * 1.5), sway = a * (0.4 + 1.6 * f) * Math.sin(f * 7 + snapAge * 6 + c);
          return out.set(x + sway * 0.6, yTop + f * L0 * (1 - 0.25 * a) , SZ + sway * 0.4 * Math.cos(c + f * 5));
        };
        point(f0, pa); point(f1, pb); seg(i++, pa, pb);
      }
    }
    // pedaço que fica pendurado na polia
    for (let c = 0; c < 4; c++) for (let k = 0; k < NSEG; k++) {
      if (snapAge === null || snapAge < 0) { tmpM.makeScale(0, 0, 0); cableMesh.setMatrixAt(i++, tmpM); continue; }
      const x = -0.3 + c * 0.2, L = 2.2, sw = Math.exp(-snapAge * 1.2) * Math.sin(snapAge * 9 + c);
      pa.set(x + sw * (k / NSEG) * 0.8, TOP - L * k / NSEG, SZ + 0.2); pb.set(x + sw * ((k + 1) / NSEG) * 0.8, TOP - L * (k + 1) / NSEG, SZ + 0.2); seg(i++, pa, pb);
    }
    cableMesh.instanceMatrix.needsUpdate = true; cableMesh.visible = visible;
  }

  // ------------------------------------------------------------ prédios vizinhos, árvores
  const PASTEL = ['#f2e3c9', '#cfe0ee', '#e8c9b5', '#d9d2e9', '#f5f0e6', '#c9dccb', '#e0d6c8', '#b8cbe0'];
  for (let i = 0; i < 46; i++) {
    let x, z; do { x = (rnd() - 0.5) * 260; z = -20 - rnd() * 220 + (rnd() < 0.35 ? 200 : 0); } while (Math.abs(x) < 26 && z > -40 && z < 40 || (z > 8 && Math.abs(x) < 40));
    const w = 10 + rnd() * 14, d = 10 + rnd() * 14, h = 12 + rnd() * (rnd() < 0.3 ? 70 : 30);
    const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const j = f * 4 + k; const su = f < 2 ? d / 3.4 : f < 4 ? 0 : w / 3.4, sv = f < 2 || f >= 4 ? h / 3.2 : 0; uv.setXY(j, uv.getX(j) * su, uv.getY(j) * sv); }
    const b = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: winTex, color: PASTEL[(rnd() * PASTEL.length) | 0], roughness: 0.6, flatShading: true })); b.position.set(x, h / 2, z); b.castShadow = true; b.receiveShadow = true; scene.add(b);
  }
  const treeMat = std(0x4f9a3a, { roughness: 0.9 }), trunkMat = std(0x6e5236);
  for (const [x, z] of [[-9, 8], [9, 8], [-14, 14], [14, 14], [-6, 18], [7, 20], [-18, 4], [18, 4], [-12, 26], [12, 28]]) {
    const g = new THREE.Group(); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 3, 6), trunkMat); tr.position.y = 1.5; g.add(tr);
    for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 + hash(x * 3 + k) * 0.6, 0), treeMat); m.position.set(Math.cos(k * 1.7) * 0.8 * (k ? 1 : 0), 3.4 + hash(z + k) * 1.1, Math.sin(k * 1.7) * 0.8 * (k ? 1 : 0)); g.add(m); }
    g.position.set(x, 0, z); shadowed(g); scene.add(g);
  }
  const benchMat = std(0x7a5a3a);
  for (const x of [-9, 9]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2, 0.45, 0.6), benchMat); b.position.set(x, 0.23, 17); shadowed(b); scene.add(b); }

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

  // ------------------------------------------------------------ partículas
  const sh = (i, k) => hash(i * 13.37 + k * 101.9);
  const NG = 150, glassMesh = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.05), new THREE.MeshStandardMaterial({ color: 0xd8efff, emissive: 0x405060, metalness: 0.9, roughness: 0.05, flatShading: true }), NG);
  glassMesh.frustumCulled = false; scene.add(glassMesh);
  const glassP = Array.from({ length: NG }, (_, i) => ({ x: (sh(i, 1) - 0.5) * 2.2, y: 0.1 + sh(i, 2) * 2.4, vz: 1.5 + sh(i, 3) * 6, vy: -2 + sh(i, 4) * 5, vx: (sh(i, 5) - 0.5) * 6, sp: 5 + sh(i, 6) * 20, s: 0.6 + sh(i, 7) * 1.5 }));
  const NS = 360, sPos = new Float32Array(NS * 3), sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const sparks = new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.09, map: DOT, color: 0xffb347, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sparks.frustumCulled = false; scene.add(sparks);
  const sp = Array.from({ length: NS }, (_, i) => [sh(i, 21), sh(i, 22), sh(i, 23), sh(i, 24), sh(i, 25)]);
  const NSM = 22, smokes = Array.from({ length: NSM }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: 0xc8c0b4, transparent: true, depthWrite: false, opacity: 0 })); scene.add(s); return s; });

  // ------------------------------------------------------------ helpers
  function setIndicator(floor, arrowDown, alert) {
    const key = `${floor}|${arrowDown}|${alert}`; if (indTex.last === key) return; indTex.last = key;
    const g = indTex.c.getContext('2d'); g.fillStyle = '#05080c'; g.fillRect(0, 0, 128, 64);
    g.fillStyle = alert ? '#ff3030' : '#ffcf3a'; g.font = 'bold 40px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(alert ? '!!' : floor <= 0 ? 'T' : String(floor), 78, 34);
    if (arrowDown) { g.beginPath(); g.moveTo(14, 20); g.lineTo(38, 20); g.lineTo(26, 46); g.fill(); }
    indTex.tx.needsUpdate = true;
  }
  function placeCab(y, crush = 0, glassBroken = false, gear = 0, alarmOn = 0, t = 0) {
    cab.position.set(0, y, SZ);
    const c = clamp(crush / F.CRUSH);
    cabBody.scale.set(1 + 0.04 * c, 1 - 0.12 * c, 1 + 0.04 * c); cabBody.rotation.z = 0.04 * c; cabBody.position.y = 0;
    frontGlass.visible = !glassBroken;
    gears.forEach((m) => { m.material.emissiveIntensity = gear * 2.5; });
    alarm.material.emissiveIntensity = alarmOn * (Math.sin(t * 9) > 0 ? 3 : 0.2);
    alarmLight.position.set(0.9, y + 3.2, SZ + 1.5); alarmLight.intensity = alarmOn * (Math.sin(t * 9) > 0 ? 40 : 0);
    cabLight.position.set(0, y + 2.3, SZ);
    const fl = Math.round(y / F.ANDAR); setIndicator(Math.max(0, fl), false, alarmOn > 0.5);
    // amortecedores comprimidos pela cabine
    const comp = clamp((-0.3 - (y - 0.3)) / 1.6, 0, 0.6);
    buffers.forEach((b) => { b.coil.scale.y = 1 - comp; b.cap.position.y = 1.86 - comp * 1.6; });
  }
  const STAND = {}, FLOAT = (k, w) => ({ aLz: -1.6 - 0.4 * Math.sin(w * 1.3), aRz: 1.5 + 0.4 * Math.sin(w * 1.1 + 1), aLx: 0.3 * Math.sin(w), aRx: 0.3 * Math.sin(w + 2), lL: 0.35 + 0.25 * Math.sin(w * 0.9), lR: -0.2 + 0.25 * Math.sin(w * 1.2 + 1), kL: -0.5, kR: -0.3, head: 0.2 * Math.sin(w * 0.7), lLz: -0.15, lRz: 0.15 });
  function dummyIn(local, rotX, rotY, pose) { cab.add(dummy.root); dummy.root.position.copy(local); dummy.root.rotation.set(rotX, rotY, 0); dummy.pose(pose); }
  function dummyWorld(p, rx, ry, pose) { scene.add(dummy.root); dummy.root.position.copy(p); dummy.root.rotation.set(rx, ry, 0); dummy.pose(pose); }
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const walkPose = (w) => ({ lL: 0.5 * Math.sin(w), lR: -0.5 * Math.sin(w), kL: -0.3 * Math.max(0, -Math.sin(w)), kR: -0.3 * Math.max(0, Math.sin(w)), aLx: -0.4 * Math.sin(w), aRx: 0.4 * Math.sin(w) });

  function setSparks(list) {   // list: [{x,y,z, t (idade do emissor), n0, n1, spread, up, life, rate}]
    let k = 0;
    for (let i = 0; i < NS; i++) {
      const p = sp[i]; let x = 0, y = -500, z = 0;
      for (const e of list) {
        if (i < e.n0 || i >= e.n1) continue;
        const born = p[0] * e.dur, age = e.t - born, life = e.life * (0.6 + 0.8 * p[1]);
        if (age > 0 && age < life) { const th = p[2] * Math.PI * 2, s = e.spread * (0.4 + p[3]); x = e.x + Math.cos(th) * s * age + (e.dx || 0) * age; z = e.z + Math.sin(th) * s * age * 0.6 + 0.3; y = e.y + (e.up * p[4] - 4.9 * age) * age + (e.dy || 0) * age; }
      }
      sPos[k++] = x; sPos[k++] = y; sPos[k++] = z;
    }
    sGeo.attributes.position.needsUpdate = true;
  }
  function setGlass(s, yCab) {
    glassP.forEach((p, i) => {
      if (s === null || s < 0) { tmpM.makeScale(0, 0, 0); glassMesh.setMatrixAt(i, tmpM); return; }
      const y0 = yCab + p.y, tg = (p.vy + Math.sqrt(Math.max(0, p.vy * p.vy + 2 * G0 * Math.max(0.01, y0)))) / G0;
      let x, y, z, rot;
      if (s < tg) { x = p.x + p.vx * s; y = y0 + p.vy * s - 0.5 * G0 * s * s; z = SZ + 1.2 + p.vz * s; rot = p.sp * s; }
      else { const w = Math.min(s - tg, 0.4); x = p.x + p.vx * (tg + w * 0.5); y = 0.02; z = SZ + 1.2 + p.vz * (tg + w * 0.5); rot = p.sp * tg; }
      tmpE.set(rot, rot * 0.7, rot * 0.3); tmpQ.setFromEuler(tmpE); tmpP.set(x, y, z); tmpS.setScalar(p.s); tmpM.compose(tmpP, tmpQ, tmpS); glassMesh.setMatrixAt(i, tmpM);
    });
    glassMesh.instanceMatrix.needsUpdate = true;
  }
  function setDust(s) {
    smokes.forEach((m, i) => {
      if (s === null || s < 0) { m.material.opacity = 0; return; }
      const k = clamp(s / (2.5 + hash(i) * 2)), a = hash(i + 4) * Math.PI * 2;
      m.position.set(Math.cos(a) * (1 + 4 * Math.sqrt(k)), 0.3 + k * 2.5 + hash(i + 9) * 0.8, SZ + Math.sin(a) * (1 + 3 * Math.sqrt(k)) + 0.8);
      m.scale.setScalar(1 + 3.5 * Math.sqrt(k)); m.material.opacity = 0.5 * (1 - k) * smooth(0, 0.05, s);
    });
  }

  const camLook = (px, py, pz, lx, ly, lz, fov = 60, roll = 0) => { camera.position.set(px, py, pz); camera.lookAt(lx, ly, lz); if (roll) camera.rotateZ(roll); camera.fov = fov; camera.updateProjectionMatrix(); };
  const shakeAt = (t, t0, amp) => { const d = t - t0; if (d < 0 || d > 1.5) return [0, 0]; const a = amp * Math.exp(-d * 3); return [a * Math.sin(d * 10.5), a * Math.cos(d * 8.3)]; };

  // estado da queda real (gancho e take "realidade")
  function stateReal(tau, t) {
    const f = F.fallReal(tau), b = F.bodyReal(tau), s = tau - F.TQ;
    const broken = s > 0.004;
    placeCab(f.y, f.crush, broken, 0, s > 0.2 ? 1 : 0, t);
    if (tau > 0 && tau < F.TQ) setIndicator(Math.max(0, Math.round(f.y / F.ANDAR)), true, false);
    setCables(f.y, tau > 0 ? tau : null);
    if (b.state === 'flutuando') { const w = (b.spin || 0) * 1.4; dummyIn(V3(-0.2, 0.86 + b.rel, -0.1), 0.25 * Math.sin(w * 0.5) + (tau > 0 ? 0.15 : 0), 0.4 + 0.3 * Math.sin(w * 0.4), tau > 0.15 ? FLOAT(0, w + 2) : STAND); }
    else dummyIn(V3(-0.1, 0.16, 0.05), -Math.PI / 2, 0.5, { aLz: -1.2, aRz: 1.0, aRx: 0.4, lLz: -0.3, lRz: 0.25, kL: -0.4, head: 0.3 });
    setGlass(broken ? s - 0.004 : null, f.y);
    setDust(s > 0 ? s : null);
    const em = [];
    if (tau > 0 && tau < F.TQ) for (const x of [-1.45, 1.45]) em.push({ x, y: f.y - 0.1, z: SZ, t: tau % 0.5 + 0.25, dur: 0.5, life: 0.35, spread: 2, up: 3, dy: 2 + f.v * 0.4, n0: x < 0 ? 0 : 60, n1: x < 0 ? 60 : 120 });
    if (tau > 0 && tau < 1.2) em.push({ x: 0, y: TOP - 0.4, z: SZ + 0.3, t: tau, dur: 0.08, life: 0.9, spread: 6, up: 4, n0: 120, n1: 220 });
    if (s > 0) em.push({ x: 0, y: -0.1, z: SZ + 1.1, t: s, dur: 0.05, life: 0.8, spread: 7, up: 6, n0: 220, n1: 360 });
    setSparks(em);
    return { f, b };
  }

  function renderFrame(t) {
    const tk = F.takeAt(cfg, ck, t), info = { take: tk.take, rate: tk.rate };
    let focusY = 30;
    stair.userData.door.rotation.y = 0; stair.userData.door.position.x = 0;
    landings.forEach((l) => { l.dl.position.x = -0.42; l.dr.position.x = 0.42; });

    if (tk.take === 'gancho' || tk.take === 'realidade') {
      const tau = tk.tau, { f, b } = stateReal(tau, t), s = tau - F.TQ;
      info.floor = f.y / F.ANDAR; info.speed = f.v * 3.6; info.g = f.g; info.phase = f.phase; info.s = s; info.tau = tau;
      focusY = Math.max(5, f.y);
      if (tk.take === 'gancho' || (t >= 27.4 && t < 31)) {                    // poço: impacto em câmera lenta
        const [sx, sy] = shakeAt(t, tk.take === 'gancho' ? EV.ganchoImpacto : T.realidade.impacto, 0.05);
        camLook(5.6 + sx, 1.7 + sy, 10.5, -0.2, 1.0, SZ, 54);
      } else if (t < 16.25) {                                                // topo: o cabo arrebenta
        camLook(4.6, TOP - 2.2, SZ + 7.5, 0, TOP - 1.4, SZ, 58);
      } else if (t < 19) {                                                   // de fora, acompanhando a queda
        camLook(12.5, f.y + 5.5, 22, 0, f.y + 1.4, SZ, 52);
      } else if (t < 24.3) {                                                 // dentro: você flutua
        camLook(1.1, f.y + 2.1, SZ + 3.2, -0.2, f.y + 1.55 + b.rel * 0.6, SZ - 0.3, 70);
      } else if (t < 27.4) {                                                 // de cima, olhando o poço lá embaixo
        camLook(9.5, f.y + 1.2, SZ + 13, 0, f.y - 2.2, SZ, 60);
      } else if (t < 34) {                                                   // depois do impacto, dentro
        camLook(1.0, 1.35, SZ + 2.4, -0.2, 0.25, SZ - 0.2, 66);
      } else {                                                               // poeira e alarme
        const k = smooth(34, 37, t); camLook(7 + k * 3, 2.4 + k * 4, 12 + k * 6, 0, 2 + k * 3, SZ, 56);
      }
    } else if (tk.take === 'mito') {
      const tau = tk.tau; let y = F.H0, crush = 0;
      if (tau > 0 && tau < F.TQ) y = F.H0 - 0.5 * G0 * tau * tau;
      else if (tau >= F.TQ) { const s = tau - F.TQ; y = 0.9 * Math.exp(-s * 3) * Math.abs(Math.sin(s * 8)); crush = 0.25 * Math.exp(-s * 6); }
      placeCab(y, crush, tau > F.TQ + 1.0, 0, 0, t);
      if (tau > 0 && tau < F.TQ) setIndicator(Math.max(0, Math.round(y / F.ANDAR)), true, false);
      setCables(y, tau > 0 ? tau : null); setGlass(null, 0); setDust(null);
      setSparks(tau > 0 && tau < 0.6 ? [{ x: 0, y: TOP - 0.4, z: SZ + 0.3, t: tau, dur: 0.05, life: 0.5, spread: 5, up: 3, n0: 0, n1: 80 }] : []);
      info.floor = y / F.ANDAR; info.speed = tau > 0 && tau < F.TQ ? G0 * tau * 3.6 : 0; info.tau = tau;
      const jumpT = F.TQ - 0.35, sJ = tau - jumpT;
      if (tau < 0) dummyIn(V3(-0.2, 0.86, 0), 0, 0.35, { aRz: 2.4 + 0.3 * Math.sin(t * 8), aLz: -0.1 });
      else if (sJ < 0) dummyIn(V3(-0.2, 0.86 + Math.min(0.15, tau * 0.05), 0), 0, 0.35, { aLz: -0.6, aRz: 0.6, kL: -0.6, kR: -0.6, lL: 0.4, lR: 0.4, torso: 0.2 });
      else if (tau < F.TQ + 1.1) { const k = clamp(sJ / 0.6); dummyIn(V3(-0.2, 0.86 + 0.9 * Math.sin(Math.PI * k) - y * 0 , 0), 0, 0.35, { aLz: -2.5, aRz: 2.5, kL: -1.2 * (1 - k), kR: -1.2 * (1 - k), lL: 0.6 * (1 - k), lR: 0.6 * (1 - k) }); }
      else { const w = tau - F.TQ - 1.1, k = clamp(w / 1.4); dummyWorld(V3(-0.2, y + 0.86 + 0.06 * Math.abs(Math.sin(w * 9)) * (1 - k), SZ + k * 4.2), 0, lerp(0.35, 0, k), k < 1 ? walkPose(w * 9) : { aLz: -2.6, aRz: 2.6 + 0.2 * Math.sin(t * 8) }); }
      focusY = Math.max(5, y);
      if (t < T.mito.estalo + 0.1) camLook(4.2, F.H0 + 1.5, SZ + 7.5, -0.2, F.H0 + 1.2, SZ, 56);
      else if (t < EV.mitoImpacto - 0.45) camLook(5.5, y + 2.6, SZ + 11, 0, y + 1.0, SZ, 56);
      else { const k = smooth(EV.mitoImpacto, 14, t); camLook(5.2 - k * 1.2, 1.6, SZ + 10 - k * 1.5, 0, 1.3, SZ + 1.6 * k, 56); }
    } else if (tk.take === 'freio') {
      const tau = tk.tau, f = F.fallBrake(tau);
      placeCab(f.y, 0, false, f.brake, 0, t); setCables(f.y, tau > 0 ? tau : null); setGlass(null, 0); setDust(null);
      if (tau > 0 && f.phase !== 'parado') setIndicator(Math.round(f.y / F.ANDAR), true, false);
      const sb = tau - F.T_TRIP;
      const em = [];
      if (tau > 0 && tau < 0.6) em.push({ x: 0, y: TOP - 0.4, z: SZ + 0.3, t: tau, dur: 0.06, life: 0.7, spread: 5, up: 3, n0: 0, n1: 80 });
      if (f.brake > 0 && sb > 0) for (const x of [-1.45, 1.45]) em.push({ x, y: f.y - 0.15, z: SZ, t: (sb % 0.4) + 0.25, dur: 0.4, life: 0.5, spread: 3.5, up: 4, n0: x < 0 ? 100 : 230, n1: x < 0 ? 230 : 360 });
      setSparks(em);
      const rel = tau > 0 && tau < F.T_PARA ? 0.12 * Math.sin(Math.PI * clamp(tau / F.T_PARA)) : 0;
      dummyIn(V3(-0.2, 0.86 + rel, 0), 0, 0.35, tau > 0.05 && tau < F.T_PARA + 0.3 ? { aLz: -1.2, aRz: 1.2, kL: -0.3, kR: -0.3 } : { aLz: -0.35, aRz: 0.9, aRx: 0.2 });
      info.floor = f.y / F.ANDAR; info.speed = f.v * 3.6; info.phase = f.phase; info.brake = f.brake; info.drop = F.H0 - f.y; info.tau = tau;
      focusY = f.y;
      if (t < T.freio.estalo + 0.1) camLook(4.2, F.H0 + 1.5, SZ + 7.5, -0.2, F.H0 + 1.2, SZ, 56);
      else if (t < 43.4) camLook(3.4, f.y + 0.7, SZ + 3.6, 1.2, f.y - 0.1, SZ, 62);
      else if (t < 47.6) camLook(1.1, f.y + 1.9, SZ + 3.0, -0.2, f.y + 1.2, SZ - 0.3, 64);
      else { const k = smooth(47.6, 52, t); camLook(6 + k * 8, f.y + 2 + k * 4, SZ + 9 + k * 16, 0, f.y + 1, SZ, 54); }
    } else {
      // final: cabine presa (parada segura), boneco sai pela escada
      const f = F.fallBrake(99); placeCab(f.y, 0, false, 0, 0, t); setCables(f.y, 3); setGlass(null, 0); setDust(null); setSparks([]);
      const u = tk.tau, door = smooth(0.2, 0.8, u);
      stair.userData.door.rotation.y = -1.3 * door * (1 - smooth(4.5, 5.2, u)); stair.userData.door.position.x = 0.5 * door * (1 - smooth(4.5, 5.2, u));
      const k = clamp((u - 0.6) / 3.0), x = lerp(-5.5, -2.6, k), z = lerp(0.2, 5.5, k);
      if (u < 0.6) dummyWorld(V3(-5.5, -5, 0), 0, 0, STAND);
      else if (k < 1) dummyWorld(V3(x, 0.86 + 0.04 * Math.abs(Math.sin(u * 9)), z), 0, Math.atan2(2.9, 5.3) * 0 + 0.5, walkPose(u * 9));
      else dummyWorld(V3(x, 0.86, z), 0, 0.2, { aRz: 2.5 + 0.3 * Math.sin(t * 8), aLz: -0.15, aRx: 0 });
      info.floor = f.y / F.ANDAR; info.speed = 0;
      const c = smooth(4.8, 9.9, u), cf = Math.pow(c, 1.6);   // grua mais lenta e afastada do poço (sem borrão)
      camLook(lerp(1.5, 16, c), lerp(1.6, 40, cf), lerp(11, 34, c), lerp(-3.5, 0, c), lerp(1.2, f.y - 6, cf), lerp(2.5, SZ, c), 58);
      focusY = lerp(2, f.y, c);
    }

    sun.target.position.set(0, focusY, SZ); sun.position.copy(sun.target.position).addScaledVector(L_DIR, 120); sun.target.updateMatrixWorld();
    renderer.render(scene, camera);
    return { canvas: glCanvas, info };
  }
  return { renderFrame };
}
