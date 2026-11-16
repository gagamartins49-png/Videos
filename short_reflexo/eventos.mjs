// Instantes e curvas (luz quadro a quadro) da MESMA linha do tempo do vídeo, para o gerar_audio.py.
// Uso: node short_reflexo/eventos.mjs > short_reflexo/build/eventos.json
import * as L from './js/linha.js';
const FPS = 30, N = Math.round(L.DUR * FPS), luz = [];
for (let i = 0; i < N; i++) luz.push(+L.light(i / FPS).toFixed(3));
process.stdout.write(JSON.stringify({ fps: FPS, eventos: L.EV, luz }));
