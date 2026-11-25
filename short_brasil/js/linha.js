// ============================================================================
//  Linha do tempo do Short "E se alguém tentasse invadir o Brasil?" (Projeto E se? #022)
//  Tom de curiosidade e humor (sem violência). Cada cena acontece num "set" 3D separado.
// ============================================================================
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
export const lerp = (a, b, u) => a + (b - a) * u;
export const DUR = 62;
export const CENAS = [
  ['mapa', 0, 8.9], ['europa', 8.9, 13.4], ['litoral', 13.4, 17.9], ['floresta', 17.9, 22.6], ['perdidos', 22.6, 27.2],
  ['transito', 27.2, 31.8], ['povo', 31.8, 36.4], ['fronteira', 36.4, 41.0], ['missao', 41.0, 45.6], ['churrasco', 45.6, 50.2],
  ['torcida', 50.2, 55.0], ['final', 55.0, 62],
];
export const EV = { navios: [0, 4.2], area: 4.6, europa: 9.4, chuva: 22.6, buzina: [28.2, 29.6, 30.8], radar: 36.6, xis: 41.6, voltam: 42.4, espeto: 47.4, gol: 52.4 };
export const cenaAt = (t) => CENAS.find(([, a, b]) => t >= a && t < b) || CENAS[CENAS.length - 1];

// contorno aproximado do Brasil (lon, lat) — só para a animação
export const BRASIL = [[-60.0, 5.2], [-56.5, 1.9], [-51.6, 4.2], [-50.0, 1.8], [-48.5, -1.4], [-44.3, -2.5], [-38.5, -3.7], [-35.2, -5.8], [-34.8, -7.1], [-35.1, -9.0], [-37.0, -11.0], [-38.5, -13.0], [-39.0, -17.7], [-40.3, -20.3], [-42.0, -22.9], [-44.5, -23.3], [-46.3, -24.0], [-48.5, -26.2], [-48.6, -28.5], [-50.0, -30.5], [-53.4, -33.7], [-55.6, -30.9], [-57.6, -30.2], [-53.8, -27.1], [-54.6, -25.5], [-55.0, -24.0], [-57.9, -22.0], [-58.1, -20.0], [-57.5, -18.2], [-60.2, -16.3], [-60.0, -13.5], [-63.3, -12.3], [-65.3, -10.8], [-69.5, -10.9], [-73.0, -9.4], [-73.9, -7.3], [-72.9, -5.2], [-70.0, -4.2], [-69.4, -1.1], [-70.0, 1.0], [-67.0, 1.7], [-63.4, 2.2], [-64.0, 4.0], [-60.7, 5.2]];
export const proj = (lon, lat) => [(lon + 53) * 0.32, -(lat + 14) * 0.32];   // x, z do set do mapa
// vizinhos (pontos aproximados na fronteira)
export const VIZINHOS = [[-61, 6.5, 'VEN'], [-58.5, 4.8, 'GUI'], [-56, 4.3, 'SUR'], [-53, 4.2, 'FRA'], [-71, -1.5, 'COL'], [-74.5, -8.5, 'PER'], [-65, -14.5, 'BOL'], [-58.5, -23.5, 'PAR'], [-58, -33, 'URU'], [-60, -27.5, 'ARG']];

// câmera: [posição, alvo, fov]
export function shot(t) {
  const [nome, a, b] = cenaAt(t), k = smooth(a, b, t);
  const M = (cx, cz, h, back, fov) => [[cx, h, cz + back], [cx, 0, cz - 0.5], fov];
  switch (nome) {
    case 'mapa': { const k2 = smooth(0, 8.9, t); return { nome, cam: [[3 - 2 * k2, 20 + 3 * k2, 15 + 2 * k2], [0.5, 0, -0.5], 50] }; }
    case 'europa': return { nome, cam: M(0, 0.3, 18, 11, 50) };
    case 'litoral': return { nome, cam: [[200 + 6 - 3 * k, 2.2 + 0.4 * k, 10], [200 - 4, 1.0, -6], 52] };
    case 'floresta': return { nome, cam: [[400 - 20 + 30 * k, 9 - 2 * k, 18 - 10 * k], [400 + 6 * k, 0, -10], 55] };
    case 'perdidos': return { nome, cam: [[400 + 3.5, 1.4, 4.5 - 1 * k], [400, 1.1, 0], 50] };
    case 'transito': return { nome, cam: [[600 + 9 - 3 * k, 7 - 2 * k, 14], [600, 0, -2], 50] };
    case 'povo': return { nome, cam: [[800, 6 + 4 * k, 14 + 6 * k], [800, 0, -4], 52] };
    case 'fronteira': return { nome, cam: M(-0.5, 0.3, 19, 11, 52) };
    case 'missao': return { nome, cam: [[7, 14, 12], [1.5, 0, 0.3], 50] };
    case 'churrasco': return { nome, cam: [[1000 + 4.6 - 0.6 * k, 2.4, 6.4 - 0.6 * k], [1000, 0.9, -0.3], 52] };
    case 'torcida': return { nome, cam: [[1200, 3.2 + 0.4 * Math.sin(t * 2), 9 - 2 * k], [1200, 2.2, 0], 52] };
    default: { const k2 = smooth(55, 62, t); return { nome: 'final', cam: [[0.5 + 4 * Math.sin(k2 * 2), 17 - 3 * k2, 11 + 4 * Math.cos(k2 * 2)], [0.5, 0, 0.3], 50] }; }
  }
}
