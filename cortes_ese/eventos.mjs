// Exporta a linha do tempo do episódio (trechos do jogo e cenas 2D) para o extrator e o áudio.
// Uso: node cortes_ese/eventos.mjs <episodio>
const v = process.argv[2] || 'hidroaviao';
const m = await import(`./js/${v}.js`);
process.stdout.write(JSON.stringify({ v, dur: m.DUR, fps: 30, seg: m.SEG }));
