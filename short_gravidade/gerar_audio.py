#!/usr/bin/env python3
"""
Trilha do Short "E se a gravidade dobrasse a cada 10 segundos?" (75 s, loop):

  * narração edge-tts (pt-BR-AntonioNeural) nos tempos de short_gravidade/roteiro.json
    (a última frase termina exatamente em 75 s e emenda no começo);
  * sub-bass drop no 0,0 s junto com a primeira palavra;
  * efeitos: zumbido gravitacional que engrossa com a gravidade, pressão grave,
    rangidos de metal, baques dos pedestres, suspensões estourando, postes
    entortando, asfalto rachando, estrondos de desabamento e bipes sci-fi a cada marco (2G, 5G...);
  * envelope da voz a 30 fps (build/envelope.json) para a lente/LEDs do Interrogador.

Uso: python short_gravidade/gerar_audio.py --out short_gravidade/build [--no-tts]
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "audio"))
sys.path.insert(0, str(HERE.parent / "compilacao"))
import generate_audio as ga  # noqa: E402
from generate_audio import (SR, Bus, bandnoise, brown, env_ad, normalize, reverb, rng, smooth, sos_filter, white,  # noqa: E402
                            sfx_boom, sfx_chirp, sfx_crack, sfx_crumble, sfx_horn, sfx_ice_creak, sfx_metal, sfx_riser, sfx_whoosh)
from gerar_audio import envelope_from, sub_drop  # noqa: E402  (da compilação)


def beep(f=1320, d=0.09):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.004) * np.exp(-t * 18)).astype(np.float32)


def gravity_curve(keys, t):
    ks = np.array(keys, dtype=float)
    return np.exp(np.interp(t, ks[:, 0], np.log(ks[:, 1])))


def build_sfx(cfg, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    G = gravity_curve(cfg["gravidade"], t)
    gn = (np.log(G) / np.log(100)).astype(np.float32)          # 0 (1G) .. 1 (100G)
    tg = lambda g: float(np.interp(np.log(g), np.log(G[::441]), t[::441]))  # instante em que a gravidade atinge g
    bus = Bus(dur)
    # ---------------- cidade (some conforme o peso aumenta)
    city = (smooth(0, 0.05, t) * (1 - smooth(12, 22, t))).astype(np.float32)
    for ch in range(2):
        traffic = sos_filter(white(n), "lowpass", 260, 3) * 0.6
        murmur = bandnoise(n, 300, 1100) * (0.6 + 0.4 * np.sin(2 * np.pi * (3.3 + ch) * t + ch)) * 0.25
        bus.buf[ch] += (traffic + murmur) * city * 0.4
    for at, pan in [(1.0, -0.6), (4.0, 0.5), (7.2, -0.3), (10.0, 0.6)]:
        bus.add(sfx_whoosh(2.2, 120, 1400), at, 0.3, pan)
    bus.add(sfx_horn(0.3, 440), 5.2, 0.14, 0.4)
    for _ in range(12):
        at = rng.uniform(0.3, 11)
        for k in range(rng.integers(2, 4)):
            bus.add(sfx_chirp(), at + k * 0.12, 0.09, rng.uniform(-0.8, 0.8))
    # ---------------- zumbido gravitacional + pressão grave (crescem com G)
    f = 32 + 34 * gn
    hum = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
           + 0.25 * np.sin(2 * np.pi * np.cumsum(f * 2.02) / SR)) * (0.15 + 0.85 * gn)
    sci = sum(np.sin(2 * np.pi * fr * t + k) for k, fr in enumerate((220, 277.2, 329.6))) * 0.02 * (0.3 + gn)
    press = sos_filter(white(n), "lowpass", 110, 4) * 3.0 * gn ** 1.3
    fade_loop = (1 - 0.7 * smooth(70, 74, t)).astype(np.float32)
    bus.add_full(np.stack([(hum * 0.3 + sci + press * 0.4) * fade_loop, (hum * 0.3 + np.roll(sci, 999) + press * 0.4) * fade_loop]))
    # ---------------- bipes sci-fi em cada marco de gravidade (tom sobe a cada marco)
    for i, m in enumerate(cfg.get("marcos", [2, 5, 10, 20, 40, 100])):
        at = tg(m)
        if at < dur - 0.5:
            for k in range(3):
                bus.add(beep(880 * 2 ** (i / 6), 0.08), at + k * 0.12, 0.3, 0.1)
            bus.add(sfx_boom(1.5, 80, 40, 300, 0.6), at, 0.35)
    # ---------------- pedestres caindo (baques) e suspensões estourando
    for _ in range(10):
        at = rng.uniform(tg(1.7), tg(3.5))
        m = int(0.25 * SR); tt = np.arange(m) / SR
        thud = sos_filter(white(m), "lowpass", 300, 2) * env_ad(m, 0.003, 0.05) + np.sin(2 * np.pi * 70 * tt) * env_ad(m, 0.003, 0.08)
        bus.add(normalize(thud, 0.6), at, 0.35, rng.uniform(-0.7, 0.7))
    for _ in range(10):
        at = rng.uniform(tg(2.6), tg(5))
        bus.add(sfx_metal(0.9, rng.uniform(70, 140)), at, 0.3, rng.uniform(-0.7, 0.7))
        bus.add(sfx_crack(0.4), at, 0.2, rng.uniform(-0.7, 0.7))
    # ---------------- rangidos de metal (densidade cresce com G)
    for _ in range(34):
        at = rng.uniform(tg(2), min(dur - 4, tg(100) + 6))
        bus.add(sfx_ice_creak(rng.uniform(0.8, 1.8)), at, rng.uniform(0.15, 0.32), rng.uniform(-0.8, 0.8))
    # ---------------- postes dobrando e asfalto rachando
    for _ in range(8):
        at = rng.uniform(tg(6), tg(12))
        m = int(1.4 * SR); tt = np.arange(m) / SR
        groan = np.sin(2 * np.pi * np.cumsum(220 - 120 * tt / 1.4) / SR) * env_ad(m, 0.05, 0.5)
        bus.add((groan * 0.5 + sfx_metal(1.4, rng.uniform(150, 260))[:m] * 0.5).astype(np.float32), at, 0.3, rng.uniform(-0.8, 0.8))
    for _ in range(9):
        bus.add(sfx_crack(0.9), rng.uniform(tg(12), tg(30)), 0.4, rng.uniform(-0.6, 0.6))
    sink = (smooth(tg(15), tg(60), t) * (1 - 0.5 * smooth(62, 70, t))).astype(np.float32)
    bus.add_full(np.stack([sos_filter(brown(n), "lowpass", 90, 4) * 4 * sink * 0.45] * 2))
    # ---------------- prédios desabando verticalmente (estrondos + escombros)
    for _ in range(14):
        at = rng.uniform(tg(12), min(tg(100) + 1, dur - 6))
        bus.add(sfx_boom(3.0, 50, 20, 400, 1.0), at, 0.75, rng.uniform(-0.5, 0.5))
        bus.add(sfx_crumble(3.0, 320), at + 0.1, 0.45, rng.uniform(-0.6, 0.6))
    bus.add(reverb(sfx_boom(4.5, 45, 18, 300, 1.0), 3.0, 0.45, seed=44), tg(100), 0.9)
    # ---------------- loop: riser de volta ao começo + impacto no 0,0 s
    bus.add(sfx_riser(4.0), dur - 4.0, 0.45)
    bus.add(np.stack([sub_drop(), sub_drop()]), 0.0, 1.0)
    return bus.buf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(HERE / "build"))
    ap.add_argument("--no-tts", action="store_true")
    args = ap.parse_args()
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    cfg = json.loads((HERE / "roteiro.json").read_text(encoding="utf-8"))
    dur, fps = float(cfg["duracao"]), cfg.get("fps", 30)
    print("Narração (edge-tts)…", flush=True)
    voice = ga.build_voice(cfg, out, not args.no_tts, dur)
    print("Efeitos sonoros…", flush=True)
    sfx = build_sfx(cfg, dur)
    sfx = np.tanh(normalize(sfx, 1.0) * 1.3) / np.tanh(1.3)
    venv = sos_filter(np.abs(voice), "lowpass", 4, 1)
    venv = np.clip(venv / (np.max(venv) + 1e-9) * 3, 0, 1)
    mix = normalize(np.tanh((sfx * (1 - 0.5 * venv) * 0.62 + np.stack([voice, voice])) * 1.1) / np.tanh(1.1), 0.97)
    nonarr = normalize(np.tanh(sfx * 0.62 * 1.1) / np.tanh(1.1), 0.97)
    from scipy.io import wavfile
    wavfile.write(out / "audio_short.wav", SR, (mix.T * 32767).astype(np.int16))
    wavfile.write(out / "audio_short_sem_narracao.wav", SR, (nonarr.T * 32767).astype(np.int16))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out / "audio_short.wav"), "-c:a", "libmp3lame", "-b:a", "192k", str(out / "audio_short.mp3")], check=True)
    env = envelope_from(voice, fps) if np.max(np.abs(voice)) > 0 else []
    (out / "envelope.json").write_text(json.dumps(env))
    print(f"OK -> {out / 'audio_short.wav'} ({mix.shape[1] / SR:.1f}s), envelope com {len(env)} quadros", flush=True)


if __name__ == "__main__":
    main()
