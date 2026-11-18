// Instantes da MESMA linha do tempo do vídeo, para o gerar_audio.py.
// Uso: node short_tempo/eventos.mjs > short_tempo/build/eventos.json
import { EV, CENAS, DUR } from './js/tempo.js';
process.stdout.write(JSON.stringify({ dur: DUR, eventos: EV, cenas: CENAS }));
