#!/usr/bin/env python3
"""
Trilha do Short "E se alguém tentasse invadir o Brasil?" (62 s, loop) — Projeto E se? #022

  * narração edge-tts (pt-BR-AntonioNeural, modo natural) e envelope da voz (boca do Interrogador);
  * ambiente de shopping vazio: zumbido do ar-condicionado, reverberação longa (eco), relógio;
  * portas de aço descendo (chacoalhar metálico), grito com eco, passos ecoando no piso;
  * suspense: drone grave e cordas tensas; susto no manequim; bipes do sensor e alarme;
  * barra antipânico (clunk), sirene do prédio, clique da lanterna, despertador tocando;
  * "musiquinha de shopping" leve no começo e na moral (piano + caixinha).

Uso: node short_brasil/eventos.mjs > short_brasil/build/eventos.json
     python short_brasil/gerar_audio.py --out short_brasil/build [--no-tts]
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
from generate_audio import (SR, Bus, bandnoise, brown, env_ad, normalize, reverb, smooth, sos_filter, white,  # noqa: E402
                            sfx_boom, sfx_metal, sfx_siren, sfx_whoosh, sfx_click)
from gerar_audio import envelope_from, sub_drop  # noqa: E402

R = np.random.default_rng(21)


def tone(f, d, a=0.003, dec=0.08):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * env_ad(n, a, dec)).astype(np.float32)


def piano(f, d=1.6):
    n = int(d * SR); t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (2 + k)) for k, a in enumerate([1, 0.5, 0.25, 0.12], start=1))
    return (s * np.clip(t / 0.004, 0, 1) * 0.4).astype(np.float32)


def shutter(d=2.6):
    """Porta de aço descendo: chacoalhar de lâminas + rolamento grave."""
    n = int(d * SR); t = np.arange(n) / SR
    rattle = sos_filter(white(n), "bandpass", [600, 3500], 2) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 22 * t))) * 0.6
    roll = sos_filter(brown(n), "lowpass", 200, 2) * 1.2
    end = np.zeros(n, dtype=np.float32); k = int((d - 0.3) * SR); m = min(int(0.4 * SR), n - k)
    end[k:k + m] = sfx_boom(0.4, 90, 50, 700, 1.0)[:m] * 0.8
    return normalize((rattle + roll) * np.minimum(1, t / 0.2) * (t < d - 0.3) + end, 0.8)


def passo():
    n = int(0.25 * SR); t = np.arange(n) / SR
    return (sos_filter(white(n), "bandpass", [300, 2500], 2) * np.exp(-t * 40) + np.sin(2 * np.pi * 90 * t) * np.exp(-t * 30) * 0.4).astype(np.float32)


def grito(d=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    f = 260 + 40 * np.sin(2 * np.pi * 5 * t)
    v = sos_filter(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), "bandpass", [400, 2200], 2)
    return normalize(v * np.sin(np.pi * t / d) ** 0.5, 0.6)


def despertador(d=3.0):
    n = int(d * SR); t = np.arange(n) / SR
    ring = np.sin(2 * np.pi * 2300 * t) * (np.sin(2 * np.pi * 18 * t) > 0) * (np.sin(2 * np.pi * 1.2 * t) > -0.3)
    return (ring * 0.4).astype(np.float32)


def buzina(f=420, d=0.35):
    return np.asarray(ga.sfx_horn(d, f), dtype=np.float32)


def torcida(d, k=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    out = np.zeros(n, dtype=np.float32)
    for j in range(10):
        out += sos_filter(white(n), "bandpass", [300 + 70 * j, 900 + 90 * j], 2) * (0.6 + 0.4 * np.sin(2 * np.pi * (0.4 + 0.15 * j) * t + j))
    return (out * 0.2 * k * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.6)).astype(np.float32)


def tambor(d):
    """Marcha de tambor (tensão no começo)."""
    n = int(d * SR); out = np.zeros(n, dtype=np.float32); bt = 0.0
    while bt < d - 0.3:
        for o, g in ((0, 1), (0.25, 0.5), (0.375, 0.5)):
            i0 = int((bt + o) * SR); m = min(int(0.3 * SR), n - i0)
            if m > 0:
                tt = np.arange(m) / SR; out[i0:i0 + m] += (sos_filter(white(m), "bandpass", [150, 1500], 2) * np.exp(-tt * 25) * g + np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 18) * g * 0.8)[:m]
        bt += 0.5
    return out


def build(cfg, ev, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    E = ev["eventos"]
    bus = Bus(dur)
    # trilha: tambor + cordas no começo (tensão), samba leve no fim (humor)
    tens = np.interp(t, [0, 8.9, 13.4, 17.9, 27.2, 36.4, 41, 45.6, 62], [1, 0.8, 0.7, 0.9, 0.6, 0.9, 1.0, 0, 0]).astype(np.float32)
    tb = tambor(dur) * tens
    drone = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 82.4 * t) + 0.4 * np.sin(2 * np.pi * 110 * t)) * 0.1 * tens
    bus.add_full(np.stack([tb * 0.5 + drone, tb * 0.5 + drone]))
    samba = np.zeros(n, dtype=np.float32); bt = 45.6
    pad = [1, 0, 0.6, 1, 0, 0.6, 1, 0.6, 1, 0, 0.6, 1, 0.6, 0, 1, 0.6]
    k = 0
    while bt < dur:
        g = pad[k % 16]
        if g:
            i0 = int(bt * SR); m = min(int(0.12 * SR), n - i0)
            if m > 0: samba[i0:i0 + m] += (sos_filter(white(m), "highpass", 4000, 2) * np.exp(-np.arange(m) / SR * 60) * g * 0.5)[:m]
        if k % 4 == 0:
            i0 = int(bt * SR); m = min(int(0.4 * SR), n - i0)
            if m > 0: samba[i0:i0 + m] += (np.sin(2 * np.pi * np.cumsum(60 + 40 * np.exp(-np.arange(m) / SR * 20)) / SR) * np.exp(-np.arange(m) / SR * 8))[:m]
        bt += 0.125; k += 1
    notas = [392.0, 440.0, 493.88, 523.25, 587.33, 523.25, 493.88, 440.0]
    for j in range(int((dur - 45.6) / 0.5)):
        at = 45.6 + j * 0.5; i0 = int(at * SR); p = piano(notas[j % 8], 0.9); m = min(len(p), n - i0)
        if m > 0: samba[i0:i0 + m] += p[:m] * 0.8
    bus.add_full(np.stack([samba, np.roll(samba, 200)]) * 0.5)
    # eventos
    bus.add(np.stack([sub_drop(), sub_drop()]), 0.0, 0.6)
    for i in range(4): bus.add(buzina(110 + 10 * i, 1.2), 0.8 + i * 0.9, 0.18)
    bus.add(sfx_whoosh(1.0, 300, 3000), E["europa"] - 0.3, 0.3)
    ond = bandnoise(int(4.5 * SR), 200, 2500) * (0.4 + 0.6 * np.sin(2 * np.pi * np.arange(int(4.5 * SR)) / SR / 4.0) ** 2)
    bus.add(ond.astype(np.float32), 13.4, 0.35)
    for i in range(6): bus.add(tone(2400 + 300 * (i % 3), 0.25, 0.01, 0.06) * 0.6, 18.3 + i * 0.6, 0.25, float(R.uniform(-0.6, 0.6)))
    chuva = bandnoise(int(4.6 * SR), 1500, 9000).astype(np.float32)
    bus.add(chuva, E["chuva"], 0.25)
    for b in E["buzina"]: bus.add(buzina(420 + 60 * R.random(), 0.4), b, 0.4, float(R.uniform(-0.5, 0.5)))
    bus.add(torcida(4.6, 0.8), 31.8, 0.6)
    for i in range(8): bus.add(tone(1200, 0.12), E["radar"] + i * 0.55, 0.15)
    bus.add(sfx_boom(1.2, 80, 40, 600, 1.0), E["xis"], 0.6)
    chi = sos_filter(white(int(4.6 * SR)), "highpass", 3000, 2) * 0.3
    bus.add(chi.astype(np.float32), 45.6, 0.3)
    bus.add(torcida(4.8, 1.2), 50.2, 0.6)
    bus.add(torcida(2.0, 2.0), E["gol"], 0.6)
    buf = bus.buf
    buf[0] = reverb(buf[0], 1.6, 0.2, seed=1); buf[1] = reverb(buf[1], 1.6, 0.2, seed=2)
    return buf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(HERE / "build"))
    ap.add_argument("--eventos", default=None)
    ap.add_argument("--no-tts", action="store_true")
    args = ap.parse_args()
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    cfg = json.loads((HERE / "roteiro.json").read_text(encoding="utf-8"))
    ev = json.loads(Path(args.eventos or out / "eventos.json").read_text(encoding="utf-8"))
    dur, fps = float(cfg["duracao"]), cfg.get("fps", 30)
    print("Narração (edge-tts)…", flush=True)
    voice = ga.build_voice(cfg, out, not args.no_tts, dur)
    print("Efeitos…", flush=True)
    sfx = build(cfg, ev, dur)
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
