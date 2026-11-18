// ============================================================================
//  Shorts 2D "E se…" tema GTA 6 (Projeto E se? #013–#015). Escolhe o vídeo por ?v=
//  (adiado | dentro | primeiro) e compõe: cena desenhada + textos + papel/grão + legendas.
// ============================================================================
import * as L from './comum.js';

export async function createShort({ cfg, v }) {
  const mod = await import(`./${v}.js`);
  const { W, H, clamp, smooth } = L;
  const DUR = cfg.duracao || 62, FPS = cfg.fps || 30;
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H; const ctx = comp.getContext('2d');
  const layer = document.createElement('canvas'); layer.width = W; layer.height = H; const lctx = layer.getContext('2d');
  const S = mod.scenes(L), CENAS = mod.CENAS, finish = L.makeFinisher();
  const XF = 0.3, CUT = new Set(mod.CORTES || []);
  const draw = (g, name, t, a, b) => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; S[name](g, t, clamp((t - a) / (b - a))); g.restore(); };
  function renderFrame(t) {
    t = clamp(t, 0, DUR - 1e-6);
    let i = CENAS.findIndex(([, a, b]) => t >= a && t < b); if (i < 0) i = CENAS.length - 1;
    const [name, a, b] = CENAS[i];
    draw(ctx, name, t, a, b);
    const nx = CENAS[i + 1];
    if (nx && t > b - XF && !CUT.has(nx[0])) { lctx.clearRect(0, 0, W, H); draw(lctx, nx[0], t, nx[1], nx[2]); ctx.save(); ctx.globalAlpha = smooth(b - XF, b, t); ctx.drawImage(layer, 0, 0); ctx.restore(); }
    mod.overlay(ctx, t, L, cfg);
    finish(ctx, t, FPS);
    L.badge(ctx, t, cfg); L.subtitles(ctx, t, cfg.frases, DUR);
    return comp;
  }
  return { canvas: comp, renderFrame, frameJPEG: (t, q = 0.92) => { renderFrame(t); return comp.toDataURL('image/jpeg', q); } };
}
