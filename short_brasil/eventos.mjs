// Instantes da MESMA linha do tempo do vídeo, para o gerar_audio.py.
// Uso: node short_brasil/eventos.mjs > short_brasil/build/eventos.json
import * as L from './js/linha.js';
process.stdout.write(JSON.stringify({ fps: 30, eventos: L.EV, cenas: L.CENAS }));
