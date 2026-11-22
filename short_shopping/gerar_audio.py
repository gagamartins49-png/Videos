#!/usr/bin/env python3
"""
Trilha do Short "E se você ficasse preso no shopping à noite?" (62 s, loop) — Projeto E se? #021

  * narração edge-tts (pt-BR-AntonioNeural, modo natural) e envelope da voz (boca do Interrogador);
  * ambiente de shopping vazio: zumbido do ar-condicionado, reverberação longa (eco), relógio;
  * portas de aço descendo (chacoalhar metálico), grito com eco, passos ecoando no piso;
  * suspense: drone grave e cordas tensas; susto no manequim; bipes do sensor e alarme;
  * barra antipânico (clunk), sirene do prédio, clique da lanterna, despertador tocando;
  * "musiquinha de shopping" leve no começo e na moral (piano + caixinha).

Uso: node short_shopping/eventos.mjs > short_shopping/build/eventos.json
     python short_shopping/gerar_audio.py --out short_shopping/build [--no-tts]
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


def build(cfg, ev, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    E = ev["eventos"]; fps = ev["fps"]
    alarme = np.interp(t, np.arange(len(ev["alarme"])) / fps, ev["alarme"]).astype(np.float32)
    bus = Bus(dur)
    # ----- ambiente: ar-condicionado + vazio
    hvac = (sos_filter(brown(n), "lowpass", 180, 2) * 0.7 + np.sin(2 * np.pi * 60 * t) * 0.03 + bandnoise(n, 400, 1200) * 0.08)
    bus.add_full(np.stack([hvac, np.roll(hvac, 4000)]) * 0.5)
    # ----- musiquinha de shopping (começo e moral)
    notas = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 698.46]
    mus = np.zeros(n, dtype=np.float32)
    for k in range(int(dur / 0.4)):
        at = k * 0.4; i0 = int(at * SR); p = piano(notas[k % 8] * (0.5 if k % 4 == 0 else 1)); m = min(len(p), n - i0)
        if m > 0: mus[i0:i0 + m] += p[:m]
    vol = np.interp(t, [0, 2.9, 3.0, 49.8, 50.4, 54.8, 55.4, 62], [0.5, 0.5, 0, 0, 0.45, 0.45, 0.25, 0.2]).astype(np.float32)
    mus = reverb(mus * vol, 1.6, 0.3, seed=3)
    bus.add_full(np.stack([mus, np.roll(mus, 300)]) * 0.6)
    # ----- drone de suspense
    drone = (np.sin(2 * np.pi * 55 * t) + np.sin(2 * np.pi * 55.6 * t) + 0.5 * np.sin(2 * np.pi * 82.4 * t) + 0.3 * np.sin(2 * np.pi * 116.5 * t)) * 0.12
    tens = np.interp(t, [0, 3, 3.4, 9, 13, 18, 20.4, 22.6, 26.5, 31, 33, 35.5, 40.5, 41.2, 49.8, 50, 62], [0, 0, 0.6, 0.7, 0.6, 0.8, 1.0, 0.3, 0.4, 0.6, 1.0, 0.6, 0.8, 1.0, 0.6, 0, 0]).astype(np.float32)
    bus.add_full(np.stack([drone * tens, np.roll(drone, 80) * tens]))
    # ----- eventos
    bus.add(sfx_click(1.0) * 1.5, E["apaga"], 0.6)
    bus.add(np.stack([sub_drop(), sub_drop()]), E["apaga"], 0.6)
    for i in range(6):
        bus.add(shutter(2.6), E["portas"][0] + i * 0.25, 0.25, -0.8 + 0.3 * i)
    bus.add(reverb(np.pad(grito(1.1), (0, int(3 * SR))), 3.0, 0.6, seed=4), E["grito"], 0.6)
    for p in ev["passos"]:
        bus.add(reverb(np.pad(passo(), (0, int(0.8 * SR))), 1.2, 0.5, seed=int(p * 10) % 7), p, 0.35, float(R.uniform(-0.2, 0.2)))
    # manequim: susto
    bus.add(sfx_boom(1.4, 70, 35, 500, 1.0), E["manequim"], 0.7)
    bus.add(sfx_whoosh(0.5, 2000, 8000), E["manequim"] - 0.1, 0.4)
    # câmera de segurança (servo) e lanterna
    for k in range(3):
        m = int(0.4 * SR); tt = np.arange(m) / SR
        bus.add((np.sign(np.sin(2 * np.pi * (300 + 200 * tt) * tt)) * 0.15 * np.sin(np.pi * tt / 0.4)).astype(np.float32), 26.8 + k * 0.6, 0.3)
    bus.add(sfx_click(1.0), E["ronda"][0], 0.4)
    # alarme: bipes rápidos
    tk = E["alarme"]
    while tk < 35.5:
        bus.add(tone(1800, 0.12), tk, 0.25); tk += 0.25
    # barra antipânico + sirene
    bus.add(sfx_metal(0.8, 160), E["empurra"], 0.6)
    bus.add(sfx_boom(0.6, 100, 60, 800, 1.0), E["empurra"] + 0.05, 0.4)
    s0, s1 = E["sirene"]
    sir = sfx_siren(s1 - s0)
    bus.add(sir, s0, 0.14)
    bus.add(sfx_click(1.0), E["lanterna"], 0.5)
    # despertador
    bus.add(despertador(3.0), E["despertador"], 0.35)
    # relógio (tique-taque)
    tk = 4.5
    while tk < 49.8:
        m = int(0.03 * SR); tt = np.arange(m) / SR
        bus.add((sos_filter(white(m), "bandpass", [2500, 7000], 2) * np.exp(-tt * 260)).astype(np.float32), tk, 0.05)
        tk += 1.0
    buf = bus.buf
    buf[0] = reverb(buf[0], 2.0, 0.25, seed=1); buf[1] = reverb(buf[1], 2.0, 0.25, seed=2)
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
