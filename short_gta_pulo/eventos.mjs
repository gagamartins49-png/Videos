// Calcula, a partir da MESMA física do vídeo (js/fisica.js), os instantes dos acontecimentos
// e as curvas de velocidade/câmera lenta quadro a quadro, para o gerar_audio.py sincronizar os sons.
// Uso: node short_gta_pulo/eventos.mjs > short_gta_pulo/build/eventos.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as F from './js/fisica.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, 'roteiro.json'), 'utf8'));
const ck = F.clocks(cfg), FPS = cfg.fps || 30, N = Math.round(cfg.duracao * FPS);
const vel = [], taxa = [], ar = [], take = [];
for (let i = 0; i < N; i++) {
  const t = i / FPS, tk = F.takeAt(cfg, ck, t);
  let v = 0, air = 0;
  if (tk.take === 'jogo' || tk.take === 'realidade' || tk.take === 'gancho') { let tc = tk.tau; if (tk.take === 'realidade' && t >= 30.9) tc = F.TC - (cfg.tempos.realidade.batida - t); v = F.car(tc, tk.take !== 'jogo').v; air = tk.tau >= 0 && tk.tau < F.TG ? 1 : 0; }
  else if (tk.take === 'duble') { v = F.VD; air = tk.tau >= 0 && tk.tau < F.TGD ? 1 : 0; }
  vel.push(+v.toFixed(3)); taxa.push(+tk.rate.toFixed(4)); ar.push(air); take.push(tk.take);
}
process.stdout.write(JSON.stringify({ fps: FPS, eventos: F.eventTimes(cfg), vel, taxa, ar, take }));
