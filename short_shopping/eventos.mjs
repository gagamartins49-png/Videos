// Instantes da MESMA linha do tempo do vídeo, para o gerar_audio.py.
// Uso: node short_shopping/eventos.mjs > short_shopping/build/eventos.json
import * as L from './js/linha.js';
const FPS = 30, N = Math.round(L.DUR * FPS), passos = [], alarme = [];
let last = -1;
for (let i = 0; i < N; i++) {
  const t = i / FPS, b = L.boneco(t), ph = Math.floor((t * 7) / Math.PI);
  const anda = Math.abs((b.pose.lL || 0)) > 0.05 && !b.pose.y && t > 6;
  if (anda && ph !== last) { passos.push(+t.toFixed(3)); last = ph; }
  alarme.push(L.luzes(t).alarme);
}
process.stdout.write(JSON.stringify({ fps: FPS, eventos: L.EV, passos, alarme }));
