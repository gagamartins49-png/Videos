// Linha do tempo + trilha (curvas e efeitos) do vídeo escolhido, para o gerar_audio.py.
// Uso: node shorts_gta2d/eventos.mjs adiado > shorts_gta2d/build/adiado/eventos.json
const v = process.argv[2] || 'adiado';
const m = await import(`./js/${v}.js`);
process.stdout.write(JSON.stringify({ v, dur: m.DUR, eventos: m.EV, cenas: m.CENAS, audio: m.AUDIO }));
