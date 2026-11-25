// Instantes da MESMA linha do tempo do vídeo, para o gerar_audio.py.
// Uso: node short_naruto/eventos.mjs > short_naruto/build/eventos.json
import * as L from './js/linha.js';
const FPS = 30, N = Math.round(L.DUR * FPS), poder = [], ilusao = [], vel = [], raposa = [];
for (let i = 0; i < N; i++) { const t = i / FPS; poder.push(+L.power(t).toFixed(3)); ilusao.push(+L.illusion(t).toFixed(3)); vel.push(+L.speed(t).toFixed(3)); raposa.push(+L.raposa(t).toFixed(3)); }
process.stdout.write(JSON.stringify({ fps: FPS, eventos: L.EV, puffs: L.PUFFS, poder, ilusao, vel, raposa }));
