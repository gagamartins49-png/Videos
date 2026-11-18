// Exporta a linha do tempo (trechos do jogo e cenas 2D) para o extrator de quadros e para o áudio.
import { SEG, DUR, FPS } from './js/edl.js';
process.stdout.write(JSON.stringify({ dur: DUR, fps: FPS, seg: SEG }));
