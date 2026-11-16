// ============================================================================
//  Cena 3D do Short "E se o seu reflexo parasse de te imitar?" (Projeto E se? #009)
//  Banheiro de madrugada. O espelho é uma "janela" para um mundo espelhado (escala z = -1)
//  com uma segunda pessoa — assim o reflexo pode desobedecer. Rosto com olhos, pálpebras,
//  sobrancelhas e boca animados. renderFrame(t) é FUNÇÃO PURA do tempo.
// ============================================================================
import * as THREE from '../../vendor/three.module.min.js';
import * as L from './linha.js';

const { clamp, smooth } = L;
const lerp = (a, b, u) => a + (b - a) * u;
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  if (repeat) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(repeat[0], repeat[1]); }
  return tx;
}
const dotTexture = () => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); };

const ROOM = { w: 2.4, d: 2.7, h: 2.6 }, MIR = { x0: -0.6, x1: 0.6, y0: 0.94, y1: 2.3 }, PZ = 0.78;

export async function createScene({ width = 1080, height = 1920, quality = 0.8 }) {
  const W = width, H = height;
  const glCanvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(Math.round(W * quality), Math.round(H * quality), false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.02, 50);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);
  scene.fog = new THREE.FogExp2(0x0a0e14, 0.18);
  const DOT = dotTexture();

  // ------------------------------------------------------------ materiais
  const tileTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9fb2b8'; g.fillRect(0, 0, w, h); const r = 4, cw = w / 4, ch = h / 8; for (let j = 0; j < 8; j++) for (let i = -1; i < 5; i++) { const x = i * cw + (j % 2 ? cw / 2 : 0); const gr = g.createLinearGradient(0, j * ch, 0, (j + 1) * ch); gr.addColorStop(0, '#e9eef0'); gr.addColorStop(1, '#cfd8db'); g.fillStyle = gr; g.fillRect(x + 2, j * ch + 2, cw - 4, ch - 4); } g.globalAlpha = 0.25; for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(90,80,60,${0.1 + hash(k) * 0.2})`; g.beginPath(); g.arc(hash(k + 3) * w, hash(k + 7) * h, 2 + hash(k + 9) * 10, 0, 6.28); g.fill(); } }, [3, 3]);
  const floorTex = canvasTex(256, 256, (g, w, h) => { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = (i + j) % 2 ? '#2a2c30' : '#3b3e44'; g.fillRect(i * 64, j * 64, 64, 64); } }, [4, 4]);
  const tile = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.35, metalness: 0.05 });
  const paintM = new THREE.MeshStandardMaterial({ color: 0x5d6a70, roughness: 0.9 });
  const floorM = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5 });
  const porcelain = new THREE.MeshStandardMaterial({ color: 0xf2f2ef, roughness: 0.2, metalness: 0.05 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde0, roughness: 0.15, metalness: 1.0 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.7 });
  const counterM = new THREE.MeshStandardMaterial({ color: 0x2f3236, roughness: 0.3, metalness: 0.1 });

  // relógio digital da pia (o do reflexo muda para 03:33 no meio do vídeo)
  const clockTex = (txt) => canvasTex(256, 100, (g, w, h) => { g.fillStyle = '#050607'; g.fillRect(0, 0, w, h); g.shadowColor = '#ff3030'; g.shadowBlur = 14; g.fillStyle = '#ff3a2a'; g.font = 'bold 74px "DejaVu Sans Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 4); });
  const CLK = { real: clockTex('03:00'), mir0: clockTex('03:00'), mir1: clockTex('03:33') };

  function buildRoom(group, mirror) {
    const box = (w, h, d, m, x, y, z, rs = true) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.receiveShadow = rs; b.castShadow = true; group.add(b); return b; };
    const { w, d, h } = ROOM;
    // parede do espelho com abertura
    box(w / 2 + MIR.x0, h, 0.05, tile, (-w / 2 + MIR.x0) / 2, h / 2, -0.025);
    box(w / 2 - MIR.x1, h, 0.05, tile, (w / 2 + MIR.x1) / 2, h / 2, -0.025);
    box(MIR.x1 - MIR.x0, MIR.y0, 0.05, tile, 0, MIR.y0 / 2, -0.025);
    box(MIR.x1 - MIR.x0, h - MIR.y1, 0.05, tile, 0, (h + MIR.y1) / 2, -0.025);
    box(0.05, h, d, tile, -w / 2 - 0.025, h / 2, d / 2);
    box(0.05, h, d, tile, w / 2 + 0.025, h / 2, d / 2);
    box(w, h, 0.05, paintM, 0, h / 2, d + 0.025);
    box(w, 0.05, d, floorM, 0, -0.025, d / 2);
    box(w, 0.05, d, paintM, 0, h + 0.025, d / 2);
    // moldura do espelho
    const fr = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.4, metalness: 0.6 });
    box(MIR.x1 - MIR.x0 + 0.06, 0.03, 0.03, fr, 0, MIR.y0 - 0.015, 0.012); box(MIR.x1 - MIR.x0 + 0.06, 0.03, 0.03, fr, 0, MIR.y1 + 0.015, 0.012);
    box(0.03, MIR.y1 - MIR.y0, 0.03, fr, MIR.x0 - 0.015, (MIR.y0 + MIR.y1) / 2, 0.012); box(0.03, MIR.y1 - MIR.y0, 0.03, fr, MIR.x1 + 0.015, (MIR.y0 + MIR.y1) / 2, 0.012);
    // luminária acima do espelho
    const lampM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfeaff, emissiveIntensity: 2.2 });
    const lamp = box(0.8, 0.05, 0.07, lampM, 0, 2.4, 0.06, false); lamp.castShadow = false;
    // bancada e pia
    box(1.3, 0.06, 0.55, counterM, 0, 0.88, 0.275);
    box(1.26, 0.82, 0.5, wood, 0, 0.44, 0.25);
    const basin = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), porcelain); basin.scale.set(1.15, 0.45, 0.85); basin.position.set(0, 0.92, 0.27); basin.material.side = THREE.DoubleSide; group.add(basin);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 12, 40), porcelain); rim.rotation.x = Math.PI / 2; rim.scale.set(1.15, 0.85, 1); rim.position.set(0, 0.92, 0.27); group.add(rim);
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.16, 16), chrome); tap.position.set(0, 1.0, 0.07); group.add(tap);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.13, 16), chrome); spout.rotation.x = Math.PI / 2; spout.position.set(0, 1.07, 0.13); group.add(spout);
    // relógio digital na parede de trás (de frente para o espelho): só aparece no reflexo, com os números invertidos
    const ck = new THREE.Group(); ck.position.set(0.16, 2.14, ROOM.d - 0.01); ck.rotation.y = Math.PI; group.add(ck);
    const cb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.17, 0.04), new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.5 })); ck.add(cb);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.15), new THREE.MeshBasicMaterial({ map: mirror ? CLK.mir0 : CLK.real })); face.position.z = 0.021; ck.add(face);
    const glow = new THREE.PointLight(0xff3020, 0.25, 1.4, 2); glow.position.set(0, 0, 0.25); ck.add(glow);
    // copo e escova, toalha
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.1, 20), new THREE.MeshStandardMaterial({ color: 0x9ccad6, roughness: 0.1, transparent: true, opacity: 0.7 })); cup.position.set(0.42, 0.96, 0.12); group.add(cup);
    const brush = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.17, 8), new THREE.MeshStandardMaterial({ color: 0x2ab3a6 })); brush.position.set(0.43, 1.03, 0.12); brush.rotation.z = 0.25; group.add(brush);
    const towel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.32), new THREE.MeshStandardMaterial({ color: 0x8a2f3a, roughness: 1 })); towel.position.set(-1.17, 1.25, 0.8); group.add(towel);
    // porta entreaberta (parede direita)
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.05, 0.82), wood); door.position.set(1.18, 1.025, 1.9); door.rotation.y = 0.12; group.add(door);
    const gap = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 2.0), new THREE.MeshBasicMaterial({ color: 0x000000 })); gap.rotation.y = -Math.PI / 2; gap.position.set(1.17, 1.0, 1.47); group.add(gap);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), chrome); knob.position.set(1.13, 1.0, 1.6); group.add(knob);
    // luzes
    const spot = new THREE.SpotLight(0xe6efff, 0, 6, 0.95, 0.6, 1.4); spot.position.set(0, 2.38, 0.22); spot.target.position.set(0, 1.35, 1.0);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0005; spot.shadow.normalBias = 0.01;
    group.add(spot, spot.target);
    const fill = new THREE.PointLight(0x8fb0ff, 0, 5, 1.6); fill.position.set(0.9, 1.9, 2.0); group.add(fill);
    return { lamp, lampM, spot, fill, face, glow };
  }

  // ------------------------------------------------------------ pessoa com rosto
  function buildPerson(mirrorName) {
    const skin = new THREE.MeshStandardMaterial({ color: 0xc89277, roughness: 0.6, metalness: 0, emissive: 0x120603 });
    const lipM = new THREE.MeshStandardMaterial({ color: 0xa4675b, roughness: 0.5 });
    const hairM = new THREE.MeshStandardMaterial({ color: 0x2e2118, roughness: 0.8, metalness: 0 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a0d0d, roughness: 0.9 });
    const teethM = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.35 });
    const eyeTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#f2ece6'; g.fillRect(0, 0, w, h); const cx = w * 0.25, cy = h / 2; const gr = g.createRadialGradient(cx, cy, 2, cx, cy, 26); gr.addColorStop(0, '#2b1a0e'); gr.addColorStop(0.35, '#4a2f18'); gr.addColorStop(0.8, '#6b4a2a'); gr.addColorStop(1, '#2a1c10'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 26, 0, 6.28); g.fill(); g.fillStyle = '#050505'; g.beginPath(); g.arc(cx, cy, 10, 0, 6.28); g.fill(); g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(cx + 6, cy - 7, 4, 0, 6.28); g.fill(); g.strokeStyle = 'rgba(180,60,60,0.25)'; g.lineWidth = 1; for (let k = 0; k < 14; k++) { g.beginPath(); const a = hash(k) * 6.28; g.moveTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40); g.lineTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 45 + (hash(k + 1) - 0.5) * 20); g.stroke(); } });
    const eyeM = new THREE.MeshStandardMaterial({ map: eyeTex, roughness: 0.12, metalness: 0 });

    const root = new THREE.Group();
    const torso = new THREE.Group(); torso.position.y = 1.05; root.add(torso);
    // tronco e braços apoiados na pia
    const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.32, 8, 24), shirt); chest.scale.set(1.25, 1, 0.7); chest.position.y = 0.2; torso.add(chest);
    const shoulders = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 8, 16), shirt); shoulders.rotation.z = Math.PI / 2; shoulders.position.y = 0.37; torso.add(shoulders);
    const arms = [];
    for (const s of [-1, 1]) {
      const up = new THREE.Group(); up.position.set(s * 0.22, 0.36, 0); torso.add(up);
      const ua = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.24, 8, 16), shirt); ua.position.y = -0.15; up.add(ua);
      const el = new THREE.Group(); el.position.y = -0.3; up.add(el);
      const fa = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.24, 8, 16), skin); fa.position.y = -0.14; el.add(fa);
      const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.06, 6, 12), skin); hand.scale.set(1.3, 1, 0.7); hand.position.y = -0.3; el.add(hand);
      arms.push({ up, el, s });
    }
    const neckG = new THREE.Group(); neckG.position.y = 0.43; torso.add(neckG);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.12, 20), skin); neck.position.y = 0.05; neckG.add(neck);
    const head = new THREE.Group(); head.position.y = 0.17; neckG.add(head);
    // ---- cabeça esculpida: uma esfera deformada (órbitas, arco das sobrancelhas, maçãs, nariz, mandíbula, queixo)
    const E = { x: 0.074, y: 0.098, z: 0.09 };
    const gauss = (dx, dy, sx, sy) => Math.exp(-(dx * dx) / sx - (dy * dy) / sy);
    function sculpt(x, y, z) {                       // (x,y,z) direção unitária; frente = -z
      const fx = x, fy = y, fz = -z, front = smooth(0.15, 0.85, fz);
      let d = 0;
      for (const sd of [-1, 1]) {
        d -= 0.0085 * gauss(fx - sd * 0.35, fy - 0.12, 0.02, 0.012) * front;            // órbitas
        d += 0.0035 * gauss(fx - sd * 0.47, fy + 0.05, 0.02, 0.02) * front;             // maçãs do rosto
        d -= 0.004 * gauss(fx - sd * 0.62, fy - 0.25, 0.02, 0.05) * smooth(-0.2, 0.5, fz); // têmporas
      }
      d += 0.0045 * gauss(fx, fy - 0.29, 0.22, 0.006) * front;                          // arco das sobrancelhas
      d += 0.0075 * gauss(fx, fy - 0.03, 0.005, 0.07) * front;                          // dorso do nariz
      d += 0.0055 * gauss(fx, fy + 0.43, 0.05, 0.016) * front;                          // região da boca
      d += 0.006 * gauss(fx, fy + 0.8, 0.05, 0.03) * front;                             // queixo
      let X = E.x * x, Y = E.y * y + 0.006, Z = E.z * z;
      X += x * d; Y += y * d; Z += z * d;
      const jaw = smooth(0.2, -0.95, fy);                                                // afina a mandíbula
      X *= 1 - 0.42 * jaw; Z = Z < 0 ? Z * (1 - 0.06 * jaw) - 0.006 * jaw * front : Z * (1 - 0.35 * jaw);
      if (fz > 0) Z *= 1 - 0.05 * smooth(-0.2, 0.4, fy);                                  // testa um pouco mais reta
      return new THREE.Vector3(X, Y, Z);
    }
    const headGeo = new THREE.SphereGeometry(1, 120, 90);
    { const pa = headGeo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).normalize(); const q = sculpt(v.x, v.y, v.z); pa.setXYZ(i, q.x, q.y, q.z); } headGeo.computeVertexNormals(); }
    const cranium = new THREE.Mesh(headGeo, skin); head.add(cranium);
    const surf = (fx, fy) => { const fz = Math.sqrt(Math.max(0, 1 - fx * fx - fy * fy)); return sculpt(fx, fy, -fz); };
    // nariz: ponta e asas
    const tipP = surf(0, -0.13);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), skin); tip.scale.set(0.011, 0.0095, 0.0105); tip.position.set(0, tipP.y + 0.001, tipP.z - 0.006); head.add(tip);
    for (const sd of [-1, 1]) { const al = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), skin); al.scale.set(0.0062, 0.006, 0.0075); al.position.set(sd * 0.0105, tipP.y - 0.003, tipP.z - 0.0005); head.add(al);
      const ns = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3a1c16, roughness: 1 })); ns.scale.set(0.0035, 0.002, 0.0035); ns.position.set(sd * 0.0052, tipP.y - 0.0085, tipP.z - 0.003); head.add(ns); }
    for (const sd of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), skin); ear.scale.set(0.009, 0.025, 0.016); ear.position.set(sd * 0.073, 0.006, 0.01); head.add(ear); }
    // cabelo: casca com volume e linha do cabelo (atrás desce até a nuca, na frente fica na testa)
    const hairGeo = new THREE.SphereGeometry(1, 96, 64);
    { const pa = hairGeo.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i).normalize(); const fx = v.x, fy = v.y, fz = -v.z;
        const line = (fz >= 0 ? 0.15 + 0.47 * fz - 0.08 * Math.abs(fx) * fz : 0.15 - 0.6 * (-fz)) + 0.035 * Math.sin(fx * 11 + 1.3) * smooth(0.3, 0.9, fz) - 0.06 * smooth(0.6, 0.95, fz) * gauss(fx + 0.25, 0, 0.02, 1);
        const k = smooth(line - 0.05, line + 0.05, fy);
        const n = 0.5 + 0.5 * Math.sin(fx * 8 + fy * 3) * Math.sin(fy * 6 - fz * 4);
        const r = 0.96 + k * (0.065 + 0.028 * smooth(0.5, 1, fy) + 0.012 * n + 0.018 * smooth(0.55, 0.75, fy) * smooth(0.2, 0.8, fz) * (0.5 + 0.5 * Math.sin(fx * 9)));
        const q = sculpt(v.x, v.y, v.z).multiplyScalar(r); pa.setXYZ(i, q.x, q.y + 0.004 * k, q.z + 0.003 * k);
      }
      hairGeo.computeVertexNormals(); }
    const hair = new THREE.Mesh(hairGeo, hairM); head.add(hair);
    // olhos (globo + pálpebras finas) encaixados nas órbitas, sobrancelhas
    const eyes = [];
    for (const s of [-1, 1]) {
      const S = surf(s * 0.35, 0.12);
      const eg = new THREE.Group(); eg.position.set(S.x, S.y, S.z + 0.0118 - 0.0042); head.add(eg);
      // a textura tem a íris em u = 0,25 (lado +z da esfera) -> gira 180° para a íris ficar na frente (-z)
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0118, 32, 24), eyeM); ball.rotation.y = Math.PI;
      const ballG = new THREE.Group(); eg.add(ballG); ballG.add(ball);
      const lidU = new THREE.Mesh(new THREE.SphereGeometry(0.0123, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), skin); eg.add(lidU);
      const lidL = new THREE.Mesh(new THREE.SphereGeometry(0.0122, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), skin); lidL.rotation.x = Math.PI; eg.add(lidL);
      const lash = new THREE.Mesh(new THREE.TorusGeometry(0.0123, 0.0006, 6, 32, Math.PI), new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 1 })); lash.rotation.y = Math.PI / 2; lidU.add(lash);
      const Bp = surf(s * 0.36, 0.3);
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0017, 0.024, 4, 10), new THREE.MeshStandardMaterial({ color: 0x241a13, roughness: 0.9 })); brow.rotation.z = Math.PI / 2; brow.position.set(Bp.x - eg.position.x, Bp.y - eg.position.y + 0.002, Bp.z - eg.position.z - 0.002); eg.add(brow);
      eyes.push({ eg, ballG, lidU, lidL, brow, s, by: brow.position.y });
    }
    // boca: lábios como tubos ao longo de curvas que mudam (sorriso / abrir)
    const MP = surf(0, -0.47);
    const mouth = new THREE.Group(); mouth.position.set(0, MP.y, MP.z - 0.002); head.add(mouth);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(1, 28), dark); inner.scale.set(0.021, 0.004, 1); inner.position.z = 0.003; inner.rotation.y = Math.PI; mouth.add(inner);
    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.004), teethM); teeth.position.set(0, 0.002, 0.001); mouth.add(teeth);
    let lipU = null, lipL = null;
    function setMouth(smile, open) {
      const w = 0.023 + 0.006 * smile, cz = 0.006 * smile;
      const up = (k) => new THREE.Vector3(k * w, 0.0025 + open * 0.004 + Math.abs(k) ** 2 * (0.007 * smile - 0.003) - (1 - Math.abs(k)) * 0.0005, Math.abs(k) ** 2 * cz);
      const lo = (k) => new THREE.Vector3(k * w * 0.96, -0.003 - open * 0.014 + Math.abs(k) ** 2 * (0.009 * smile + 0.003 + open * 0.01), Math.abs(k) ** 2 * cz);
      const ks = [-1, -0.6, -0.25, 0, 0.25, 0.6, 1];
      if (lipU) { mouth.remove(lipU); lipU.geometry.dispose(); mouth.remove(lipL); lipL.geometry.dispose(); }
      lipU = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ks.map(up)), 20, 0.0024, 8, false), lipM);
      lipL = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ks.map(lo)), 20, 0.0032, 8, false), lipM);
      mouth.add(lipU, lipL);
      inner.scale.set(w * 0.92, 0.0008 + open * 0.009 + smile * 0.002, 1); inner.position.y = -open * 0.005;
      teeth.visible = smile > 0.45 || open > 0.3; teeth.scale.x = 0.8 + 0.4 * smile; teeth.position.y = 0.001 - open * 0.002 + smile * 0.002;
    }
    setMouth(0, 0);
    root.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

    const tmpV = new THREE.Vector3();
    function set(p, camPos, t) {
      root.position.z = PZ - (p.z || 0);
      torso.rotation.x = -p.lean; torso.position.y = 1.05 - 0.05 * p.lean;
      for (const a of arms) { a.up.rotation.set(0.55 + 0.4 * p.lean, 0, -a.s * 0.15); a.el.rotation.set(0.25 - 0.3 * p.lean, 0, 0); }
      neckG.rotation.set(-p.pitch * 0.4, p.yaw * 0.35, p.roll * 0.3);
      head.rotation.set(-p.pitch * 0.6, p.yaw * 0.65, p.roll * 0.7);
      // respiração leve
      chest.scale.y = 1 + 0.015 * Math.sin(t * 1.6);
      root.updateMatrixWorld(true);
      for (const e of eyes) {
        // olhar: espelho (em frente), porta (lado) ou câmera (quem assiste)
        let yaw = 0, pitch = 0;
        if (p.gaze === 'porta') { yaw = -0.35; pitch = 0; }
        else if (p.gaze === 'camera' && camPos) { e.eg.worldToLocal(tmpV.copy(camPos)); yaw = Math.atan2(-tmpV.x, -tmpV.z); pitch = Math.atan2(tmpV.y, Math.hypot(tmpV.x, tmpV.z)); yaw = clamp(yaw, -0.6, 0.6); pitch = clamp(pitch, -0.4, 0.4); }
        else { yaw = 0.04 * Math.sin(t * 0.7 + e.s); pitch = -0.02; }
        e.ballG.rotation.set(pitch, -yaw, 0);
        const open = 1 - clamp(p.blink);
        const wide = p.wide || 0;
        e.lidU.rotation.x = lerp(0.35 + 0.35 * wide, -1.45, 1 - open);                    // pálpebra de cima desce
        e.lidL.rotation.x = Math.PI - lerp(0.62 + 0.15 * wide, 0.3, 1 - open);
        const inn = (p.browIn || 0) * 0.35, upv = (p.browUp || 0) * 0.008;
        e.brow.position.y = e.by + upv - 0.002 * (p.smile || 0); e.brow.rotation.z = Math.PI / 2 + e.s * (0.12 - inn);
        e.brow.rotation.x = 0;
      }
      setMouth(p.smile || 0, p.open || 0);
      cheekLift(p.smile || 0);
    }
    function cheekLift() {}
    return { root, set, head };
  }

  // ------------------------------------------------------------ mundo real e mundo do espelho
  const real = new THREE.Group(); scene.add(real);
  const mirror = new THREE.Group(); mirror.scale.set(1, 1, -1); scene.add(mirror);
  const roomR = buildRoom(real, false), roomM = buildRoom(mirror, true);
  const R = buildPerson(), M = buildPerson();
  real.add(R.root); mirror.add(M.root);
  scene.add(new THREE.HemisphereLight(0x3a4a66, 0x0a0a0c, 0.35));

  // vidro: sujeira leve + vapor da respiração (do lado de dentro do reflexo)
  const smudge = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); for (let k = 0; k < 60; k++) { g.strokeStyle = `rgba(255,255,255,${0.02 + hash(k) * 0.05})`; g.lineWidth = 2 + hash(k + 2) * 8; g.beginPath(); const x = hash(k + 4) * w, y = hash(k + 5) * h; g.moveTo(x, y); g.quadraticCurveTo(x + (hash(k + 6) - 0.5) * 120, y + 40, x + (hash(k + 7) - 0.5) * 160, y + 90); g.stroke(); } for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(255,255,255,${0.03 + hash(k + 50) * 0.05})`; g.beginPath(); g.arc(hash(k + 60) * w, hash(k + 70) * h, 2 + hash(k + 80) * 6, 0, 6.28); g.fill(); } });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(MIR.x1 - MIR.x0, MIR.y1 - MIR.y0), new THREE.MeshBasicMaterial({ map: smudge, transparent: true, opacity: 0.55, depthWrite: false, color: 0xcfe0ee }));
  glass.position.set(0, (MIR.y0 + MIR.y1) / 2, 0.002); scene.add(glass);
  const fog = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.13), new THREE.MeshBasicMaterial({ map: DOT, transparent: true, opacity: 0, depthWrite: false, color: 0xe8f2fa }));
  fog.position.set(0, 1.55, 0.003); scene.add(fog);
  const tint = new THREE.Mesh(new THREE.PlaneGeometry(MIR.x1 - MIR.x0, MIR.y1 - MIR.y0), new THREE.MeshBasicMaterial({ color: 0x8fb3c8, transparent: true, opacity: 0.06, depthWrite: false }));
  tint.position.set(0, (MIR.y0 + MIR.y1) / 2, 0.0015); scene.add(tint);

  // água da torneira
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0xcfe6f2, roughness: 0.05, transparent: true, opacity: 0.75 }));
  stream.position.set(0, 1.0, 0.195); scene.add(stream);
  const NW = 80, wPos = new Float32Array(NW * 3), wGeo = new THREE.BufferGeometry(); wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
  const drops = new THREE.Points(wGeo, new THREE.PointsMaterial({ size: 0.012, map: DOT, color: 0xdff0ff, transparent: true, depthWrite: false })); drops.frustumCulled = false; scene.add(drops);

  const camLook = ([p, l, fov], shake = [0, 0]) => { camera.position.set(p[0] + shake[0], p[1] + shake[1], p[2]); camera.lookAt(l[0], l[1], l[2]); camera.fov = fov; camera.updateProjectionMatrix(); };

  function renderFrame(t) {
    const sh = L.shot(t), info = { shot: sh.name };
    // tremor de mão (respiração da câmera), lento
    const shake = [0.0025 * Math.sin(t * 0.9) + 0.0012 * Math.sin(t * 2.3), 0.002 * Math.sin(t * 1.1 + 1)];
    camLook(sh.cam, shake);
    const lt = L.light(t);
    for (const rm of [roomR, roomM]) { rm.spot.intensity = 9 * lt; rm.lampM.emissiveIntensity = 2.2 * lt + 0.02; rm.fill.intensity = 0.6 + 0.4 * (1 - lt); }
    roomM.face.material.map = t >= L.EV.relogio ? CLK.mir1 : CLK.mir0;
    const pR = L.poseR(t), pM = L.poseM(t);
    R.set(pR, camera.position, t); M.set(pM, camera.position, t);
    // vapor do lado de dentro do vidro, na altura da boca do reflexo
    fog.material.opacity = 0.55 * (pM.breath || 0) + 0.25 * smooth(L.EV.respiro[0], L.EV.respiro[0] + 1, t) * (1 - smooth(52, 54, t));
    // vapor no ponto do vidro entre a câmera e a boca do reflexo (assim aparece sobre a boca)
    const mouthM = new THREE.Vector3(0, 1.615, -(PZ - (pM.z || 0)) + 0.09);
    const cp = camera.position, f = cp.z / (cp.z - mouthM.z);
    fog.position.set(cp.x + (mouthM.x - cp.x) * f, cp.y + (mouthM.y - cp.y) * f, 0.003);
    // água
    const wOn = smooth(L.EV.agua[0], L.EV.agua[0] + 0.1, t) * (1 - smooth(L.EV.agua[1] - 0.1, L.EV.agua[1], t));
    stream.visible = wOn > 0.01; stream.scale.set(1, 1, 1);
    let k = 0; for (let i = 0; i < NW; i++) { const age = ((t * 2 + hash(i)) % 1) * 0.35; const on = wOn > 0.01; const a = hash(i + 7) * 6.28, v = 0.2 + hash(i + 3) * 0.4; wPos[k++] = on ? Math.cos(a) * v * age : 0; wPos[k++] = on ? 0.93 + 1.2 * age - 6 * age * age : -9; wPos[k++] = on ? 0.2 + Math.sin(a) * v * age * 0.6 : 0; }
    wGeo.attributes.position.needsUpdate = true;
    info.light = lt; info.t = t;
    renderer.render(scene, camera);
    return { canvas: glCanvas, info };
  }
  return { renderFrame };
}
