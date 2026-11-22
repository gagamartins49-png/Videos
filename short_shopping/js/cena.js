// ============================================================================
//  Cena 3D low-poly do Short "E se você ficasse preso no shopping à noite?" (Projeto E se? #021)
//  Shopping genérico (sem marcas reais): corredor com lojas dos dois lados, portas de aço,
//  segundo piso com guarda-corpo de vidro, escada rolante, fonte, clarabóia com luar,
//  vitrine com manequins, praça de alimentação, sensor de movimento, câmera de segurança,
//  porta de emergência com barra antipânico, provador e loja de colchões.
//  O boneco de testes amarelo é "você". renderFrame(t) é função pura do tempo.
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

export async function createScene({ width = 1080, height = 1920, quality = 0.8 }) {
  const W = width, H = height;
  const glCanvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(Math.round(W * quality), Math.round(H * quality), false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 300);
  camera.setViewOffset(W, H, Math.round(W * 0.08), 0, W, H);   // ação um pouco à esquerda (o Interrogador fica no canto direito)
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);
  scene.fog = new THREE.FogExp2(0x070a14, 0.022);
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, flatShading: true, ...extra });
  const box = (w, h, d, m, x, y, z, par = scene) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; par.add(b); return b; };

  // ------------------------------------------------------------ luzes
  const hemi = new THREE.HemisphereLight(0xbcd0ff, 0x1a1420, 0.35); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x8fb0ff, 1.2); moon.position.set(-6, 20, 4); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -16, right: 16, top: 30, bottom: -30, near: 1, far: 60 }); scene.add(moon, moon.target);
  const mainLights = [];
  for (let z = 10; z >= -34; z -= 11) { const p = new THREE.PointLight(0xfff0d8, 0, 22, 1.6); p.position.set(0, 9.5, z); scene.add(p); mainLights.push(p); }
  const exitLight = new THREE.PointLight(0x2aff7a, 6, 14, 1.8); exitLight.position.set(0, 3.4, -39); scene.add(exitLight);
  const alarmLights = [new THREE.PointLight(0xff2030, 0, 26, 1.5), new THREE.PointLight(0xff2030, 0, 26, 1.5)];
  alarmLights[0].position.set(0, 4, -20); alarmLights[1].position.set(0, 4, -36); scene.add(...alarmLights);
  const provLight = new THREE.PointLight(0xfff2d8, 0, 8, 1.5); provLight.position.set(-10.5, 2.6, 8); scene.add(provLight);
  const colchaoLight = new THREE.PointLight(0xffc890, 10, 9, 1.5); colchaoLight.position.set(-9.5, 3.2, -8); scene.add(colchaoLight);
  const camSegLight = new THREE.PointLight(0x9fd0ff, 6, 6, 1.5); camSegLight.position.set(4, 8, -2.5); scene.add(camSegLight);
  for (let z = 12; z >= -36; z -= 12) { const n = new THREE.PointLight(0x6a8aff, 5, 14, 1.6); n.position.set(0, 3.5, z); scene.add(n); }
  const lanterna = new THREE.SpotLight(0xfffff0, 0, 30, 0.32, 0.4, 1.2); lanterna.castShadow = true; scene.add(lanterna, lanterna.target);

  // ------------------------------------------------------------ piso, paredes, segundo piso, clarabóia
  const floorTex = canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#d8d4cc' : '#c4beb4'; g.fillRect(i * 64, j * 64, 64, 64); } g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }, [10, 40]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 120), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.25, metalness: 0.15 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -15; floor.receiveShadow = true; scene.add(floor);
  const wallM = std(0xe8e2d8), darkM = std(0x2a2a32), metal = std(0x9aa0aa, { metalness: 0.6, roughness: 0.35 });
  for (const sx of [-1, 1]) {
    box(0.4, 11, 70, wallM, sx * 14, 5.5, -15);
    // laje do segundo piso e guarda-corpo de vidro
    box(10, 0.4, 70, wallM, sx * 9, 5, -15);
    box(0.08, 1.1, 70, new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.2 }), sx * 4.05, 5.75, -15);
    box(0.12, 0.08, 70, metal, sx * 4.05, 6.32, -15);
  }
  box(28, 0.4, 0.4, darkM, 0, 11, -15);
  for (let z = 18; z >= -48; z -= 4) { box(9, 0.25, 0.25, darkM, 0, 11, z); }
  box(0.25, 0.25, 70, darkM, -4, 11, -15); box(0.25, 0.25, 70, darkM, 4, 11, -15);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(8, 70), new THREE.MeshBasicMaterial({ color: 0x1a2850, fog: false })); sky.rotation.x = Math.PI / 2; sky.position.set(0, 11.3, -15); scene.add(sky);
  const lua = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), new THREE.MeshBasicMaterial({ color: 0xf4f0d8, fog: false })); lua.position.set(1.5, 11.25, -2); lua.rotation.x = Math.PI / 2; scene.add(lua);
  box(30, 11, 0.4, wallM, 0, 5.5, 20);

  // ------------------------------------------------------------ lojas (vitrine + letreiro + porta de aço)
  const shutterTex = canvasTex(64, 256, (g, w, h) => { for (let y = 0; y < h; y += 16) { const gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, '#b8bcc4'); gr.addColorStop(0.5, '#8a8f98'); gr.addColorStop(1, '#6a6e76'); g.fillStyle = gr; g.fillRect(0, y, w, 16); } }, [3, 1]);
  const shutters = [], signs = [];
  L.STORES.forEach(([x, z, nome, cor], i) => {
    const sx = Math.sign(x), g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    // interior (caixa escura) e balcão
    box(6, 4.2, 0.2, wallM, sx * 3, 2.1, -3.1, g); box(6, 4.2, 0.2, wallM, sx * 3, 2.1, 3.1, g); box(0.2, 4.2, 6.2, std(0x3a3440), sx * 6, 2.1, 0, g);
    box(6, 0.2, 6.2, darkM, sx * 3, 4.3, 0, g);
    box(2.2, 1.0, 0.8, std(new THREE.Color(cor).multiplyScalar(0.5).getHex()), sx * 4.2, 0.5, -1.5, g);
    for (let k = 0; k < 6; k++) box(0.5, 0.6 + hash(i * 7 + k) * 0.8, 0.5, std(new THREE.Color(cor).offsetHSL(hash(k + i) * 0.2, 0, -0.1).getHex()), sx * (1.5 + (k % 3) * 1.3), 0.4, 1.5 + Math.floor(k / 3) * 0.8 - 0.4, g);
    // letreiro (desliga com as luzes)
    const signTex = canvasTex(512, 128, (c2, w, h) => { c2.fillStyle = '#10121a'; c2.fillRect(0, 0, w, h); c2.font = '900 80px "Anton", "Impact", sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.shadowColor = cor; c2.shadowBlur = 20; c2.fillStyle = cor; c2.fillText(nome, w / 2, h / 2 + 4); });
    const signM = new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 1 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 3.6), [signM, signM, darkM, darkM, darkM, darkM]); sign.position.set(-sx * 0.05, 4.7, 0); g.add(sign); signs.push(signM);
    // porta de aço
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.2), new THREE.MeshStandardMaterial({ map: shutterTex, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }));
    sh.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; sh.position.set(-sx * 0.02, 2.1, 0); g.add(sh); shutters.push(sh);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.2), new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.12, roughness: 0.05 })); glass.rotation.y = sh.rotation.y; glass.position.set(-sx * 0.06, 2.1, 0); g.add(glass);
  });
  // ------------------------------------------------------------ boneco de testes (você), manequins e segurança
  function boneco(cor, { alvo = true } = {}) {
    const Y = std(cor, { roughness: 0.55 }), K = std(0x1a1a1a);
    const headTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#' + new THREE.Color(cor).getHexString(); g.fillRect(0, 0, w, h); if (alvo) for (const cx of [64, 192]) { g.fillStyle = '#111'; g.beginPath(); g.arc(cx, 64, 30, 0, Math.PI * 2); g.fill(); g.fillStyle = '#' + new THREE.Color(cor).getHexString(); g.beginPath(); g.moveTo(cx, 64); g.arc(cx, 64, 30, 0, Math.PI / 2); g.closePath(); g.fill(); g.beginPath(); g.moveTo(cx, 64); g.arc(cx, 64, 30, Math.PI, Math.PI * 1.5); g.closePath(); g.fill(); } });
    const root = new THREE.Group(), hips = new THREE.Group(); hips.position.y = 0.93; root.add(hips);
    hips.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.24), Y));
    const torso = new THREE.Group(); torso.position.y = 0.09; hips.add(torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.25), Y); chest.position.y = 0.27; torso.add(chest);
    if (alvo) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.06, 0.26), K); band.position.y = 0.3; torso.add(band); }
    const head = new THREE.Group(); head.position.y = 0.58; torso.add(head);
    head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), K));
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 12), new THREE.MeshStandardMaterial({ map: headTex, roughness: 0.5 })); skull.position.y = 0.17; skull.rotation.y = Math.PI / 2; head.add(skull);
    const limb = (parent, x, y, len, wd, mat) => { const p = new THREE.Group(); p.position.set(x, y, 0); const m = new THREE.Mesh(new THREE.BoxGeometry(wd, len, wd), mat); m.position.y = -len / 2; p.add(m); const j = new THREE.Mesh(new THREE.SphereGeometry(wd * 0.62, 8, 6), K); p.add(j); parent.add(p); return p; };
    const armL = limb(torso, -0.27, 0.48, 0.56, 0.11, Y), armR = limb(torso, 0.27, 0.48, 0.56, 0.11, Y);
    const legL = limb(hips, -0.1, -0.06, 0.42, 0.15, Y), legR = limb(hips, 0.1, -0.06, 0.42, 0.15, Y);
    const kneeL = limb(legL, 0, -0.42, 0.42, 0.13, Y), kneeR = limb(legR, 0, -0.42, 0.42, 0.13, Y);
    root.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(root);
    // frente = +z; braço/perna com x NEGATIVO vai para a frente
    const pose = (p) => { hips.position.y = 0.93 + (p.y || 0); torso.rotation.x = p.torso || 0; head.rotation.set(p.head || 0, p.headY || 0, 0); armL.rotation.set(p.aLx || 0, 0, p.aLz || 0); armR.rotation.set(p.aRx || 0, 0, p.aRz || 0); legL.rotation.set(p.lL || 0, 0, 0); legR.rotation.set(p.lR || 0, 0, 0); kneeL.rotation.x = p.kL || 0; kneeR.rotation.x = p.kR || 0; };
    return { root, pose, head };
  }
  const eu = boneco(0xf2c200);
  const guarda = boneco(0x24304a, { alvo: false });
  const quepe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12), std(0x141a2a)); quepe.position.y = 0.28; guarda.head.add(quepe);
  const manequins = [-1.3, 0, 1.3].map((dz) => { const m = boneco(0xeeeeec, { alvo: false }); m.root.position.set(8.6, 0.15, dz); m.root.rotation.y = -Math.PI / 2; m.pose({ aLz: 0.25, aRz: -0.25 }); return m; });
  box(2.6, 0.15, 4.5, std(0xd8d0c0), 8.7, 0.075, 0);

  // ------------------------------------------------------------ fonte, bancos, plantas, escada rolante
  const fonte = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.7, 16), std(0xd8d4cc)); fonte.position.set(0, 0.35, 3.5); fonte.castShadow = fonte.receiveShadow = true; scene.add(fonte);
  const agua = new THREE.Mesh(new THREE.CircleGeometry(2.4, 16), new THREE.MeshStandardMaterial({ color: 0x1a3a5a, roughness: 0.05, metalness: 0.4 })); agua.rotation.x = -Math.PI / 2; agua.position.set(0, 0.62, 3.5); scene.add(agua);
  box(0.4, 1.2, 0.4, std(0xd8d4cc), 0, 1.2, 3.5);
  for (const [x, z] of [[2.6, 6.2], [-2.6, 6.2]]) { box(2.0, 0.12, 0.6, std(0x7a5a3a), x, 0.45, z); box(0.12, 0.45, 0.5, metal, x - 0.8, 0.22, z); box(0.12, 0.45, 0.5, metal, x + 0.8, 0.22, z); }
  for (const [x, z] of [[3.2, 12], [-3.2, 12]]) { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.8, 8), std(0x8a6a4a)); v.position.set(x, 0.4, z); scene.add(v); const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 0), std(0x3a7a4a)); f.position.set(x, 1.4, z); f.castShadow = true; scene.add(f); }
  const esc = new THREE.Group(); esc.position.set(2.2, 0, -9); scene.add(esc);
  const stepsTex = canvasTex(64, 256, (g, w, h) => { for (let y = 0; y < h; y += 16) { g.fillStyle = '#5a5f68'; g.fillRect(0, y, w, 12); g.fillStyle = '#2a2d33'; g.fillRect(0, y + 12, w, 4); } }, [1, 8]);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 9.4), new THREE.MeshStandardMaterial({ map: stepsTex, roughness: 0.6 })); ramp.rotation.x = Math.atan2(5, 8); ramp.position.set(0, 2.5, -4); ramp.castShadow = true; esc.add(ramp);
  for (const sx of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.0, 9.6), std(0x20232a)); rail.rotation.x = ramp.rotation.x; rail.position.set(sx * 0.8, 3.0, -4); esc.add(rail); }

  // ------------------------------------------------------------ praça de alimentação, sensor, câmera de segurança
  for (let i = 0; i < 6; i++) { const x = -3 + (i % 3) * 3, z = -24 - Math.floor(i / 3) * 3.5; box(1.2, 0.08, 1.2, std(0xe8e2d8), x, 0.78, z); box(0.1, 0.78, 0.1, metal, x, 0.39, z); for (const d of [-0.9, 0.9]) box(0.5, 0.45, 0.5, std(0xff8a3a), x + d, 0.22, z); }
  box(0.6, 6, 0.6, wallM, 3.4, 3, -20);
  const sensor = box(0.3, 0.3, 0.2, std(0xf0f0f0), 3.4, 2.6, -20.4);
  const sensorLed = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0x40ff60 })); sensorLed.position.set(3.4, 2.6, -20.55); scene.add(sensorLed);
  const leque = new THREE.Mesh(new THREE.ConeGeometry(3.2, 6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  leque.position.set(1.6, 1.3, -23.2); leque.rotation.set(-0.3, 0, 0.55); scene.add(leque);
  const camSeg = new THREE.Group(); camSeg.position.set(5, 8.6, -4); scene.add(camSeg);
  box(0.12, 0.4, 0.12, darkM, 0, 0.2, 0, camSeg);
  const camBody = new THREE.Group(); camSeg.add(camBody);
  box(0.36, 0.3, 0.7, std(0xeeeeee), 0, -0.1, 0.25, camBody); const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 12), darkM); lens.rotation.x = Math.PI / 2; lens.position.set(0, -0.1, 0.62); camBody.add(lens);
  const recLed = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 })); recLed.position.set(0.12, 0.02, 0.5); camBody.add(recLed);

  // ------------------------------------------------------------ porta de emergência (barra antipânico) e placa SAÍDA
  box(14, 11, 0.4, wallM, 0, 5.5, -40.4);
  const saidaTex = canvasTex(512, 160, (g, w, h) => { g.fillStyle = '#0a8a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 86px "Anton", "Impact", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SAÍDA', w / 2 + 50, h / 2 + 4); g.beginPath(); g.arc(90, 50, 16, 0, 7); g.fill(); g.lineWidth = 12; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(88, 66); g.lineTo(78, 110); g.moveTo(84, 80); g.lineTo(110, 92); g.moveTo(78, 110); g.lineTo(100, 140); g.moveTo(78, 110); g.lineTo(60, 140); g.stroke(); });
  const placa = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.56), new THREE.MeshBasicMaterial({ map: saidaTex })); placa.position.set(0, 3.2, -40.15); scene.add(placa);
  const portaPiv = new THREE.Group(); portaPiv.position.set(-0.9, 0, -40.1); scene.add(portaPiv);
  const portaM = box(1.8, 2.4, 0.1, std(0xb8bcc4, { metalness: 0.5, roughness: 0.4 }), 0.9, 1.2, 0, portaPiv);
  box(1.4, 0.1, 0.12, std(0xd8302a), 0.9, 1.05, 0.12, portaPiv);
  const strobes = [-1.6, 1.6].map((x) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0x401010 })); m.position.set(x, 2.7, -40.1); scene.add(m); return m; });
  const fora = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.4), new THREE.MeshBasicMaterial({ color: 0x1a2440 })); fora.position.set(0, 1.2, -40.6); scene.add(fora);

  // ------------------------------------------------------------ provador (cabine com cortina) + despertador
  const prov = new THREE.Group(); prov.position.set(-11, 0, 8); scene.add(prov);
  box(0.1, 2.4, 2, std(0xe8d8c8), -0.9, 1.2, 0, prov); box(1.8, 2.4, 0.1, std(0xe8d8c8), 0, 1.2, -1, prov); box(1.8, 2.4, 0.1, std(0xe8d8c8), 0, 1.2, 1, prov);
  const espelho = box(0.05, 1.6, 0.8, new THREE.MeshStandardMaterial({ color: 0xd8eeff, metalness: 0.9, roughness: 0.05 }), -0.84, 1.4, 0, prov);
  box(0.6, 0.45, 0.6, std(0x7a5a3a), 0, 0.22, 0, prov);
  const cortinaTex = canvasTex(256, 64, (g, w, h) => { for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, '#8a1a2a'); gr.addColorStop(0.5, '#c83a4a'); gr.addColorStop(1, '#8a1a2a'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); } });
  const cortina = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.3), new THREE.MeshStandardMaterial({ map: cortinaTex, side: THREE.DoubleSide })); cortina.rotation.y = Math.PI / 2; cortina.position.set(0.9, 1.25, -0.5); prov.add(cortina);
  const relogio = new THREE.Group(); relogio.position.set(0.35, 0.55, 0.65); prov.add(relogio);
  const rcorpo = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 20), std(0xe8343a)); rcorpo.rotation.x = Math.PI / 2; relogio.add(rcorpo);
  const rface = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20), new THREE.MeshBasicMaterial({ color: 0xffffff })); rface.position.z = 0.051; relogio.add(rface);
  for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), std(0xd8d8d8, { metalness: 0.6 })); b.position.set(sx * 0.11, 0.15, 0); relogio.add(b); }
  relogio.rotation.y = -Math.PI / 2;

  // ------------------------------------------------------------ loja de colchões: cama
  box(2.2, 0.5, 1.6, std(0xe8eef8), -10.2, 0.25, -8); box(2.2, 0.15, 1.6, std(0x5a7ab8), -10.2, 0.55, -8); box(0.5, 0.2, 1.2, std(0xffffff), -11.1, 0.7, -8);

  // ------------------------------------------------------------ eco (anéis no grito)
  const ecos = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 6, 48), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.x = Math.PI / 2; scene.add(m); return m; });

  function place(f, s) { f.root.visible = s.vis !== 0; if (!f.root.visible) return; f.root.position.set(...s.pos); f.root.rotation.set(s.deitado ? -Math.PI / 2 : 0, s.yaw || 0, 0); if (s.deitado) { f.root.rotation.set(0, s.yaw || 0, 0); f.root.rotateX(-Math.PI / 2); f.root.position.y += 0.2; } f.pose(s.pose || {}); }

  function renderFrame(t) {
    const lz = L.luzes(t);
    // luzes do shopping, letreiros, provador, alarme
    mainLights.forEach((p) => (p.intensity = 8 + 34 * lz.main));
    hemi.intensity = 0.7 + 0.4 * lz.main; moon.intensity = 1.8;
    signs.forEach((m) => (m.emissiveIntensity = 0.15 + 0.85 * lz.main));
    provLight.intensity = 14 * lz.provador;
    alarmLights.forEach((p) => (p.intensity = 60 * lz.alarme));
    const sirene = t > L.EV.sirene[0] && t < L.EV.sirene[1];
    strobes.forEach((m, i) => m.material.color.setHex(sirene && Math.sin(t * 14 + i * 3) > 0 ? 0xff2020 : 0x401010));
    exitLight.intensity = 5 + 1.5 * Math.sin(t * 2);
    // portas de aço
    shutters.forEach((sh, i) => { const k = L.shutter(i, t); sh.scale.y = Math.max(0.001, k); sh.position.y = 4.2 - 2.1 * k; sh.visible = k > 0.002; });
    // personagens
    place(eu, L.boneco(t));
    const sg = L.seguranca(t); place(guarda, sg);
    if (sg.vis) { lanterna.intensity = 120; lanterna.position.set(sg.pos[0], sg.pos[1] + 1.3, sg.pos[2]); lanterna.target.position.set(...sg.beam); } else lanterna.intensity = 0;
    // manequim que vira a cabeça
    const vira = smooth(L.EV.manequim, L.EV.manequim + 0.12, t) * (t < 24 ? 1 : 0);
    manequins[1].head.rotation.y = -1.1 * vira;
    // sensor e leque vermelho
    const al = t > L.EV.alarme && t < 35.5;
    sensorLed.material.color.setHex(al && Math.sin(t * 16) > 0 ? 0xff2020 : 0x40ff60);
    leque.material.opacity = al ? 0.18 + 0.1 * Math.sin(t * 16) : (t > 31 && t < L.EV.alarme ? 0.05 : 0);
    // câmera de segurança girando
    camBody.rotation.set(0.5, L.cameraSeg(t), 0); recLed.visible = Math.sin(t * 6) > 0;
    // porta de emergência
    portaPiv.rotation.y = 1.3 * L.portaEmergencia(t);
    // despertador (cena da moral)
    relogio.visible = t > 49.8 && t < 55; relogio.rotation.z = t > L.EV.despertador && t < 54 ? 0.15 * Math.sin(t * 60) : 0;
    // eco
    ecos.forEach((m, i) => { const u = (t - L.EV.grito - i * 0.35) / 1.6; m.visible = u > 0 && u < 1 && t < 13.4; if (!m.visible) return; m.position.set(0, 1.6 + i * 0.2, 11); m.scale.setScalar(1 + 14 * u); m.material.opacity = 0.6 * (1 - u); });
    // câmera
    const { cam } = L.shot(t), sh = L.shake(t), fr = Math.floor(t * 30), j = (k) => (hash(fr * 1.37 + k) - 0.5) * 2;
    camera.position.set(cam[0][0] + j(1) * 0.06 * sh, cam[0][1] + j(2) * 0.06 * sh, cam[0][2]);
    camera.lookAt(cam[1][0] + j(3) * 0.04 * sh, cam[1][1] + j(4) * 0.04 * sh, cam[1][2]);
    camera.fov = cam[2]; camera.updateProjectionMatrix();
    moon.target.position.set(cam[1][0], 0, cam[1][2]); moon.position.set(cam[1][0] - 6, 20, cam[1][2] + 4);
    renderer.render(scene, camera);
    return { canvas: glCanvas, info: { shot: L.shot(t).name, luz: lz } };
  }
  return { renderFrame };
}
