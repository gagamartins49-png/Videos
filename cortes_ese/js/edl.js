// Linha do tempo do piloto "E se a fuga de hidroavião do GTA 6 fosse na vida real?" (Projeto E se? • Cortes)
// Trechos CURTOS do jogo (src em segundos do vídeo-fonte) intercalados com animações 2D próprias.
export const DUR = 62;
export const SEG = [
  { tipo: 'jogo', id: 'g0', t0: 0.0, t1: 4.2, src: 1701.0, congela: true, zoom: [1.0, 1.18] },
  { tipo: 'jogo', id: 'g1', t0: 4.2, t1: 8.6, src: 1678.5, zoom: [1.05, 1.12], rot: 'NO JOGO' },
  { tipo: 'arte', id: 'licenca', t0: 8.6, t1: 13.1 },
  { tipo: 'jogo', id: 'g2', t0: 13.1, t1: 18.2, src: 1697.0, zoom: [1.0, 1.1], rot: '≈ 100 km/h', rot2: '≈ 500 m DE ÁGUA' },
  { tipo: 'arte', id: 'degrau', t0: 18.2, t1: 22.9 },
  { tipo: 'jogo', id: 'g3', t0: 22.9, t1: 27.6, src: 1705.0, zoom: [1.1, 1.0], rot: 'ÁGUA RASA + RAIZ', alerta: true },
  { tipo: 'jogo', id: 'g4', t0: 27.6, t1: 31.8, src: 1713.0, zoom: [1.0, 1.08] },
  { tipo: 'arte', id: 'pousar', t0: 31.8, t1: 37.2 },
  { tipo: 'arte', id: 'policia', t0: 37.2, t1: 42.3 },
  { tipo: 'jogo', id: 'g5', t0: 42.3, t1: 47.0, src: 1721.0, zoom: [1.0, 1.1], rot: 'TODO MUNDO VIU' },
  { tipo: 'arte', id: 'placar', t0: 47.0, t1: 51.9 },
  { tipo: 'jogo', id: 'g6', t0: 51.9, t1: 55.4, src: 1729.0, zoom: [1.0, 1.06] },
  { tipo: 'jogo', id: 'g7', t0: 55.4, t1: 59.6, src: 1733.0, congela: true, zoom: [1.0, 1.05], fundo: true },
  { tipo: 'jogo', id: 'g8', t0: 59.6, t1: 62.0, src: 1701.0, congela: true, zoom: [1.0, 1.0] },
];
export const segAt = (t) => SEG.find((s) => t >= s.t0 && t < s.t1) || SEG[SEG.length - 1];
// quadro do vídeo-fonte usado no instante t (para extrair só o necessário)
export const FPS = 30;
export function srcFrame(s, t) { return s.congela ? 0 : Math.min(Math.floor((t - s.t0) * FPS), Math.floor((s.t1 - s.t0) * FPS) - 1); }
