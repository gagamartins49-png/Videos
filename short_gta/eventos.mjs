// Calcula, a partir da MESMA física do vídeo (js/fisica.js), os instantes dos acontecimentos
// e as curvas de velocidade/câmera lenta quadro a quadro, para o gerar_audio.py sincronizar os sons.
// Uso: node short_gta/eventos.mjs > short_gta/build/eventos.json
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
  if (tk.take === 'jogo') v = F.crashGame(tk.tau - F.TI).v;
  else if (tk.take === 'realidade' || tk.take === 'gancho') v = F.crashReal(tk.tau - F.TI).v;
  else { const c = F.rampCar(tk.tau); v = c.v; air = c.air ? 1 : 0; }
  vel.push(+v.toFixed(3)); taxa.push(+tk.rate.toFixed(4)); ar.push(air); take.push(tk.take);
}
process.stdout.write(JSON.stringify({ fps: FPS, eventos: F.eventTimes(cfg), vel, taxa, ar, take }));
