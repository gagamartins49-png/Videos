#!/usr/bin/env python3
"""
Trilha do Short "E se o seu reflexo parasse de te imitar?" (62 s, loop) — Projeto E se? #009

  * narração edge-tts (pt-BR-AntonioNeural, modo natural, mais lenta e grave) — tom de suspense;
  * desenho de som de terror sem susto barato: zumbido do banheiro, lâmpada chiando e falhando junto
    com a luz do vídeo, relógio tiquetaqueando (que trava quando o relógio do reflexo muda),
    drone grave crescendo, cordas dissonantes nos momentos em que o reflexo desobedece, coração,
    apagão, respiração no vidro, caixinha de música desafinada no desafio do relógio;
  * instantes e curva de luz vindos de build/eventos.json (mesma linha do tempo do vídeo).

Uso: node short_reflexo/eventos.mjs > short_reflexo/build/eventos.json
     python short_reflexo/gerar_audio.py --out short_reflexo/build [--no-tts]
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
                            sfx_boom, sfx_crack, sfx_crumble, sfx_glass, sfx_gull, sfx_metal, sfx_riser, sfx_whoosh, sfx_zap)
from gerar_audio import envelope_from, sub_drop  # noqa: E402  (da compilação)


def stretch(x, k):
    """Câmera lenta no som: estica k vezes (tom mais grave)."""
    x = np.asarray(x, dtype=np.float32)
    n = int(len(x) * k)
    return np.interp(np.arange(n) / k, np.arange(len(x)), x).astype(np.float32)


def thump(f=55, d=0.35):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (f + 40 * np.exp(-t * 30)) * t) * env_ad(n, 0.004, 0.09)).astype(np.float32)


def cluster(d, base=220.0, spread=(1.0, 1.06, 1.19, 1.41, 1.5), seed=0):
    """Cordas dissonantes (cluster) que crescem e somem."""
    r = np.random.default_rng(seed)
    n = int(d * SR); t = np.arange(n) / SR
    s = np.zeros(n, dtype=np.float32)
    for k, m in enumerate(spread):
        f = base * m * (1 + 0.004 * np.sin(2 * np.pi * (5 + r.random()) * t + k))
        ph = np.cumsum(f) / SR
        s += (np.sin(2 * np.pi * ph) + 0.4 * np.sin(4 * np.pi * ph) + 0.2 * np.sin(6 * np.pi * ph)).astype(np.float32)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return normalize(sos_filter(s * env, "lowpass", 2500, 2), 0.7)


def whoosh_rev(d=1.6):
    n = int(d * SR); t = np.arange(n) / SR
    s = bandnoise(n, 400, 6000) * (t / d) ** 3
    return normalize(s, 0.7)


def breath(d=0.9):
    n = int(d * SR); t = np.arange(n) / SR
    s = sos_filter(white(n), "bandpass", [300, 2200], 2) * np.sin(np.pi * t / d) ** 2
    return normalize(s, 0.6)


def music_box(d, seed=3):
    """Caixinha de música desafinada (bem baixinha)."""
    notes = [659.3, 587.3, 523.3, 493.9, 523.3, 440.0, 392.0, 349.2]
    n = int(d * SR); out = np.zeros(n, dtype=np.float32); step = 0.42
    for k in range(int(d / step)):
        i0 = int(k * step * SR); m = min(int(1.2 * SR), n - i0)
        if m <= 0:
            break
        tt = np.arange(m) / SR; f = notes[k % len(notes)] * (1 - 0.012 * np.sin(k * 1.7))
        out[i0:i0 + m] += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.76 * tt)) * np.exp(-tt * 3.5) * 0.35
    return out


def build_sfx(cfg, ev, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    E = ev["eventos"]; fps = ev["fps"]
    ft = np.arange(len(ev["luz"])) / fps
    luz = np.interp(t, ft, np.array(ev["luz"]))
    bus = Bus(dur)
    # ---------------- ambiente: zumbido do prédio, ar, vento distante
    room = (np.sin(2 * np.pi * 60 * t) * 0.05 + np.sin(2 * np.pi * 120 * t) * 0.02 + sos_filter(brown(n), "lowpass", 200, 2) * 0.5).astype(np.float32)
    wind = bandnoise(n, 150, 700) * (0.4 + 0.6 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 9.0)) ** 2) * 0.25
    bus.add_full(np.stack([room + wind, room + np.roll(wind, 9000)]) * 0.6)
    # ---------------- lâmpada: chiado proporcional à luz + estalos quando falha
    buzz = (np.sign(np.sin(2 * np.pi * 120 * t)) * 0.3 + bandnoise(n, 2000, 6000) * 0.4) * luz
    dl = np.abs(np.diff(luz, prepend=luz[0]))
    crack = sos_filter(white(n), "highpass", 1500, 2) * np.clip(dl * 40, 0, 1)
    bus.add_full(np.stack([buzz * 0.06 + crack * 0.35, buzz * 0.06 + crack * 0.35]))
    # ---------------- relógio: tique-taque o tempo todo; trava e volta quando o relógio do reflexo muda
    tk = 0.5
    while tk < dur:
        if not (E["relogio"] - 0.6 < tk < E["relogio"] + 0.9):
            m = int(0.03 * SR); tt = np.arange(m) / SR
            tick = (sos_filter(white(m), "bandpass", [2500, 7000], 2) * np.exp(-tt * 260)).astype(np.float32)
            bus.add(tick, tk, 0.10 if int(tk * 2) % 2 else 0.07, 0.4)
        tk += 0.5
    # ---------------- gancho: drone + batida grave
    bus.add(np.stack([sub_drop(), sub_drop()]), 0.0, 0.8)
    drone = np.sin(2 * np.pi * 55 * t) + np.sin(2 * np.pi * 55.7 * t) + 0.5 * np.sin(2 * np.pi * 82.4 * t)
    tension = (0.25 + 0.75 * np.interp(t, [0, 3.6, 4, 12, 14, 23, 31, 44, 45.2, 45.9, 52, 58, 61.3, 62], [0.9, 0.9, 0.15, 0.2, 0.4, 0.55, 0.7, 0.75, 0.0, 1.0, 0.8, 0.9, 1.0, 0.0])).astype(np.float32)
    swell = sos_filter(white(n), "lowpass", 400, 2) * 0.6
    bus.add_full(np.stack([(drone * 0.12 + swell * 0.5) * tension, (np.roll(drone, 50) * 0.12 + swell * 0.5) * tension]))
    bus.add(cluster(3.6, 196, seed=1), 0.0, 0.35)
    # ---------------- água
    a0, a1 = E["agua"]
    wm = (smooth(a0, a0 + 0.15, t) * (1 - smooth(a1 - 0.2, a1, t))).astype(np.float32)
    water = sos_filter(white(n), "bandpass", [500, 5000], 2) * (0.7 + 0.3 * np.sin(2 * np.pi * 7 * t)) * wm
    bus.add_full(np.stack([water * 0.35, np.roll(water, 300) * 0.35]))
    # ---------------- desobediências do reflexo: cordas dissonantes, batidas graves
    for k, at in enumerate(E["piscaM"]):
        bus.add(thump(48, 0.4), at, 0.45); bus.add(cluster(3.0, 233 + 10 * k, seed=10 + k), at - 0.2, 0.22)
    bus.add(whoosh_rev(1.2), E["inclinaM"] - 1.1, 0.3); bus.add(thump(44, 0.4), E["inclinaM"], 0.4)
    bus.add(cluster(7.0, 185, seed=20), E["porta"] + 0.2, 0.3)
    hb = 26.6
    while hb < E["encaixa"] - 0.1:
        bus.add(thump(52, 0.3), hb, 0.4); bus.add(thump(48, 0.3), hb + 0.22, 0.28); hb += 0.85
    bus.add(sfx_whoosh(0.5, 400, 5000), E["encaixa"] - 0.15, 0.4); bus.add(thump(60, 0.3), E["encaixa"], 0.6)
    # fato real: um tom puro e frio, quase silêncio
    tone = np.sin(2 * np.pi * 880 * t) * 0.02 * (smooth(35.2, 36, t) * (1 - smooth(42.5, 43.5, t)))
    bus.add_full(np.stack([tone, tone]))
    # ---------------- apagão e o sorriso
    A0, A1 = E["apagao"]
    nd = int(0.7 * SR); td = np.arange(nd) / SR
    bus.add((np.sin(2 * np.pi * np.cumsum(120 * np.exp(-td * 4) + 20) / SR) * env_ad(nd, 0.005, 0.3)).astype(np.float32), A0, 0.4)
    bus.add(stretch(sfx_boom(2.0, 50, 25, 400, 0.8), 1.5), A1, 0.7)
    bus.add(cluster(4.0, 247, (1.0, 1.06, 1.12, 1.41, 1.5, 2.12), seed=30), A1 - 0.05, 0.4)
    r0, r1 = E["respiro"]
    bt = r0
    while bt < r1 - 0.4:
        bus.add(breath(0.9), bt, 0.28, -0.1); bt += 2 * np.pi / 3.2
    # "não pisca": silêncio repentino (só o relógio) e depois a caixinha de música desafinada
    bus.add(music_box(6.5), 51.8, 0.16, 0.2)
    # ---------------- final: riser e corte seco para o loop
    bus.add(whoosh_rev(3.0), dur - 3.0, 0.35)
    bus.add(cluster(4.0, 196, seed=40), dur - 4.0, 0.3)
    mute = (1 - 0.85 * (smooth(50.2, 50.35, t) * (1 - smooth(51.4, 52.2, t)))).astype(np.float32)
    bus.buf *= mute
    return bus.buf


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
    print("Eventos:", json.dumps(ev["eventos"]), flush=True)
    print("Narração (edge-tts)…", flush=True)
    voice = ga.build_voice(cfg, out, not args.no_tts, dur)
    print("Efeitos sonoros…", flush=True)
    sfx = build_sfx(cfg, ev, dur)
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
