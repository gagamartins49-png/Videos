#!/usr/bin/env python3
"""
Trilha do Short "E se todo o oxigênio da Terra sumisse por 5 segundos?" (75 s):

  * narração edge-tts (pt-BR-AntonioNeural) nos tempos de short_oxigenio/roteiro.json,
    com a última frase terminando exatamente em 75 s (loop infinito);
  * sub-bass drop no 0,0 s junto com a primeira palavra;
  * efeitos: ambiente sci-fi contínuo, cidade e pássaros, "silêncio súbito" (estalo
    nos ouvidos + zumbido), batimentos, bipes da contagem regressiva, desmoronamento
    sutil e abafado, retorno do ar e tempestade de pó, riser que emenda no começo;
  * envelope da voz a 30 fps (build/envelope.json) para a lente/LEDs do Interrogador.

Uso: python short_oxigenio/gerar_audio.py --out short_oxigenio/build [--no-tts]
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
                            sfx_boom, sfx_chirp, sfx_crumble, sfx_horn, sfx_riser, sfx_whoosh)
from gerar_audio import envelope_from, sub_drop  # noqa: E402  (da compilação)


def beep(f=1320, d=0.09):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.004) * np.exp(-t * 18)).astype(np.float32)


def build_sfx(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    bus = Bus(dur)
    # ---------------- ambiente sci-fi contínuo (pad + zumbido), mais presente quando a cidade cala
    pad = sum(np.sin(2 * np.pi * f * t + k) for k, f in enumerate((55, 82.4, 110, 164.8))) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.08 * t))
    hum = sos_filter(white(n), "bandpass", [200, 1200], 2) * 0.15
    sci = (0.06 + 0.06 * smooth(12, 14, t) * (1 - smooth(50, 54, t))).astype(np.float32)
    bus.add_full(np.stack([(pad * 0.05 + hum) * sci * 6, (pad * 0.05 + np.roll(hum, 777)) * sci * 6]))
    # ---------------- cidade viva até o céu escurecer (corte seco aos 12 s)
    city = (smooth(0, 0.05, t) * (1 - smooth(11.6, 12.05, t))).astype(np.float32)
    for ch in range(2):
        traffic = sos_filter(white(n), "lowpass", 260, 3) * 0.6
        murmur = bandnoise(n, 300, 1100) * (0.6 + 0.4 * np.sin(2 * np.pi * (3.3 + ch) * t + ch)) * 0.25
        bus.buf[ch] += (traffic + murmur) * city * 0.4
    for at, pan in [(0.8, -0.6), (3.6, 0.5), (6.4, -0.3), (9.2, 0.6)]:
        bus.add(sfx_whoosh(2.2, 120, 1400), at, 0.3, pan)
    bus.add(sfx_horn(0.3, 420), 4.4, 0.15, 0.4); bus.add(sfx_horn(0.3, 420), 4.75, 0.15, 0.4)
    for _ in range(16):
        at = rng.uniform(0.3, 11)
        for k in range(rng.integers(2, 4)):
            bus.add(sfx_chirp(), at + k * 0.12, 0.1, rng.uniform(-0.8, 0.8))
    # ---------------- bipes do oxigênio caindo (3-12 s) e da contagem regressiva (12-50 s)
    for at in np.arange(3.0, 12.0, 1.0):
        bus.add(beep(990), at, 0.25, -0.2)
    for k in range(6):                                  # 5,0 ... 0,0 "segundos reais"
        at = 12 + k * 38 / 5
        bus.add(beep(1568, 0.16), min(at, dur - 0.3), 0.35, 0.2)
    # ---------------- silêncio súbito: estalo nos ouvidos + zumbido + batimentos
    bus.add(sfx_whoosh(1.6, 80, 900), 10.6, 0.5)
    bus.add(sfx_boom(1.2, 90, 50, 300, 0.7), 12.0, 0.8)
    quiet = (smooth(12, 12.6, t) * (1 - smooth(49.6, 50.1, t))).astype(np.float32)
    tinnitus = np.sin(2 * np.pi * 6200 * t) * 0.01 * quiet
    beat = np.zeros(n, np.float32)
    for k in np.arange(12.6, 50, 0.85):
        for off, a in ((0, 1.0), (0.16, 0.7)):
            i = int((k + off) * SR); m = int(0.18 * SR)
            if i + m < n: beat[i:i + m] += np.sin(2 * np.pi * 48 * np.arange(m) / SR) * np.exp(-np.arange(m) / SR * 22) * a
    bus.add_full(np.stack([tinnitus + beat * 0.45, tinnitus + beat * 0.45]))
    # ---------------- desmoronamento sutil e abafado (sem ar, quase sem som)
    rumble = sos_filter(brown(n), "lowpass", 140, 3) * 2.2 * smooth(22, 30, t) * (1 - smooth(48, 50, t))
    bus.add_full(np.stack([rumble, rumble]) * 0.06)
    for _ in range(22):
        bus.add(sos_filter(sfx_crumble(3.0, 200), "lowpass", 600, 2), rng.uniform(24, 48), 0.09, rng.uniform(-0.8, 0.8))
    # ---------------- o oxigênio volta: rajada + estrondo + tempestade de pó
    bus.add(sfx_whoosh(2.6, 60, 3000), 48.0, 0.9)
    bus.add(reverb(sfx_boom(4.0, 50, 22, 400, 1.0), 3.0, 0.4, seed=41), 50.0, 0.9)
    storm = (smooth(50, 51.5, t) * (1 - 0.6 * smooth(58, 72, t))).astype(np.float32)
    for ch in range(2):
        bus.buf[ch] += (sos_filter(white(n), "lowpass", 900, 3) * 1.3 + bandnoise(n, 1500, 6000) * 0.45) * storm * 0.45
    for _ in range(8):
        bus.add(sfx_crumble(2.5, 180), rng.uniform(51, 66), 0.25, rng.uniform(-0.7, 0.7))
    # ---------------- loop: riser que leva de volta ao começo
    bus.add(sfx_riser(4.0), dur - 4.0, 0.45)
    bus.add(np.stack([sub_drop(), sub_drop()]), 0.0, 1.0)            # impacto grave no 0,0 s
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
    sfx = build_sfx(dur)
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
