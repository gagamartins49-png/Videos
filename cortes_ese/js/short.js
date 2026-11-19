// ============================================================================
//  Piloto "E se a fuga de hidroavião do GTA 6 fosse na vida real?" (Projeto E se? • Cortes)
//  Trechos curtos do jogo (quadros extraídos) + animações 2D próprias + anotações, legendas,
//  título-gancho e cartão de comentário. Função (assíncrona) do tempo t.
// ============================================================================
import * as L from '../../shorts_gta2d/js/comum.js';

const { W, H, A, smooth, lerp, clamp, bump, hash, rr, F_TITLE, F_UI, F_HAND } = L;

export async function createShort({ cfg, v }) {
  const M = await import(`./${v}.js`);
  const SEG = M.SEG, DUR = M.DUR, ARTE = M.arte(L);
  const segAt = (t) => SEG.find((s) => t >= s.t0 && t < s.t1) || SEG[SEG.length - 1];
  const srcFrame = (s, t) => (s.congela ? 0 : Math.min(Math.floor((t - s.t0) * 30), Math.floor((s.t1 - s.t0) * 30) - 1));
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H; const ctx = comp.getContext('2d');
  const finish = L.makeFinisher();
  const cache = new Map();
  const load = (url) => { if (!cache.has(url)) cache.set(url, new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; })); if (cache.size > 60) cache.delete(cache.keys().next().value); return cache.get(url); };
  const frameUrl = (s, t) => `build/${v}/quadros/${s.id}_${String(srcFrame(s, t) + 1).padStart(5, '0')}.jpg`;

  // ---------------- jogo: fundo desfocado + quadro grande no centro (com zoom lento)
  async function jogo(g, s, t) {
    const im = await load(frameUrl(s, t));
    const u = clamp((t - s.t0) / (s.t1 - s.t0)), z = lerp(s.zoom[0], s.zoom[1], smooth(0, 1, u));
    g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H);
    if (!im) return;
    g.save(); g.filter = 'blur(28px) brightness(0.55) saturate(1.3)'; const bh = H * 1.1, bw = bh * 16 / 9; g.drawImage(im, (W - bw) / 2, (H - bh) / 2, bw, bh); g.restore();
    const fh = s.fundo ? H : 1010, fw = fh * 16 / 9, cy = s.fundo ? H / 2 : 900;
    g.save(); g.beginPath(); g.rect(0, cy - fh / 2, W, fh); g.clip();
    g.translate(W / 2, cy); g.scale(z, z); g.drawImage(im, -fw / 2, -fh / 2, fw, fh); g.restore();
    if (s.fundo) { g.save(); g.filter = 'blur(10px) brightness(0.6)'; g.drawImage(comp, 0, 0); g.restore(); }
    if (!s.fundo) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, cy - fh / 2 - 6, W, 6); g.fillRect(0, cy + fh / 2, W, 6); }
    // selo "GTA 6 (JOGO)" para deixar claro o que é imagem do jogo
    if (!s.congela || s.id === 'g0') { g.save(); g.globalAlpha = 0.8; rr(g, 36, cy - fh / 2 + 24, 250, 52, 12); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fill(); g.fillStyle = '#fff'; g.font = `800 28px ${F_UI}`; g.textBaseline = 'middle'; g.fillText('GTA 6 • jogo', 56, cy - fh / 2 + 51); g.restore(); }
    // anotações
    const k = smooth(s.t0 + 0.3, s.t0 + 0.7, t) * (1 - smooth(s.t1 - 0.3, s.t1, t));
    if (s.rot) etiqueta(g, s.rot, 540, cy + fh / 2 - 120, k, s.alerta ? '#e8343a' : '#ff5ab0');
    if (s.rot2) etiqueta(g, s.rot2, 540, cy - fh / 2 + 150, smooth(s.t0 + 1.4, s.t0 + 1.8, t) * (1 - smooth(s.t1 - 0.3, s.t1, t)), '#2a8aff');
    if (s.alerta && k > 0) { g.save(); g.globalAlpha = k; g.strokeStyle = '#e8343a'; g.lineWidth = 22; g.lineCap = 'round'; const r = 170 * smooth(s.t0 + 1.2, s.t0 + 1.6, t); g.beginPath(); g.moveTo(540 - r, cy - r * 0.8); g.lineTo(540 + r, cy + r * 0.8); g.moveTo(540 + r, cy - r * 0.8); g.lineTo(540 - r, cy + r * 0.8); g.stroke(); g.restore(); }
  }
  function etiqueta(g, txt, x, y, k, col) {
    if (k <= 0) return;
    g.save(); g.globalAlpha = k; g.translate(x, y); g.rotate(-0.03); const s = 0.8 + 0.2 * k; g.scale(s, s);
    g.font = `400 72px ${F_TITLE}`; const w = g.measureText(txt).width + 60;
    rr(g, -w / 2, -52, w, 104, 18); g.fillStyle = col; g.fill(); g.lineWidth = 6; g.strokeStyle = '#120a14'; g.stroke();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 4); g.restore();
  }

  async function renderFrame(t) {
    t = clamp(t, 0, DUR - 1e-6);
    const s = segAt(t);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
    if (s.tipo === 'jogo') await jogo(ctx, s, t); else ARTE[s.id](ctx, t, clamp((t - s.t0) / (s.t1 - s.t0)));
    ctx.restore();
    // flash curto nas trocas de cena
    const nxt = SEG.find((q) => q.t0 > t - 1e-6 && q.t0 - t < 0.12), prv = SEG.find((q) => t - q.t0 >= 0 && t - q.t0 < 0.12 && q.t0 > 0);
    if (prv) L.tint(ctx, '#ffffff', 0.35 * (1 - (t - prv.t0) / 0.12), 'screen');
    M.overlay(ctx, t, L, cfg);
    finish(ctx, t, 30);
    L.badge(ctx, t, cfg); L.subtitles(ctx, t, cfg.frases, DUR);
    return comp;
  }
  return { canvas: comp, renderFrame, frameJPEG: async (t, q = 0.92) => { await renderFrame(t); return comp.toDataURL('image/jpeg', q); } };
}
