#!/usr/bin/env python3
"""
Trilha do Short "E se você me seguisse agora?" / "E se você se inscrevesse agora?" (40 s, loop) — Projeto E se? #010

  * narração edge-tts (pt-BR-AntonioNeural, modo natural) nos tempos de roteiro_<versao>.json;
  * música eletrônica leve (house a 118 bpm) que some no glitch e volta mais cheia;
  * clique do botão, onda de choque, "zip" do sinal dando a volta na Terra, odômetro + moedinha +
    confete, passagem dos cartões, cadeados, "pop" das opções da enquete, destaque do CTA e riser do loop.

Uso: python short_seguir/gerar_audio.py --versao tiktok|youtube --out short_seguir/build [--no-tts]
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


def kick():
    m = int(0.35 * SR); t = np.arange(m) / SR
    return (np.sin(2 * np.pi * (48 + 110 * np.exp(-t * 28)) * t) * np.exp(-t * 9) * 1.0).astype(np.float32)


def hat(open_=False):
    m = int((0.12 if open_ else 0.04) * SR); t = np.arange(m) / SR
    return (sos_filter(white(m), "highpass", 7000, 2) * np.exp(-t * (18 if open_ else 70)) * 0.35).astype(np.float32)


def clap():
    m = int(0.2 * SR); t = np.arange(m) / SR
    s = sos_filter(white(m), "bandpass", [900, 3500], 2) * (np.exp(-t * 30) + 0.6 * np.exp(-np.maximum(0, t - 0.012) * 30) * (t > 0.012))
    return (s * 0.45).astype(np.float32)


def music(dur, bpm=118):
    """House leve: bumbo 4x4, chimbal, palmas, baixo e acordes com sidechain."""
    n = int(dur * SR); t = np.arange(n) / SR; beat = 60 / bpm
    out = np.zeros(n, dtype=np.float32)
    def put(sig, at, g=1.0):
        i = int(at * SR)
        if i >= n:
            return
        m = min(len(sig), n - i); out[i:i + m] += sig[:m] * g
    k_, h_, ho, c_ = kick(), hat(), hat(True), clap()
    nb = int(dur / beat) + 1
    for b in range(nb):
        put(k_, b * beat, 0.9); put(h_, b * beat + beat / 2, 0.8)
        if b % 2 == 1:
            put(c_, b * beat, 0.8)
        if b % 4 == 3:
            put(ho, b * beat + beat / 2, 0.5)
    chords = [[220.0, 261.6, 329.6, 392.0], [174.6, 220.0, 261.6, 329.6], [196.0, 246.9, 293.7, 392.0], [164.8, 207.7, 246.9, 329.6]]
    roots = [55.0, 43.65, 49.0, 41.2]
    pad = np.zeros(n, dtype=np.float32); bass = np.zeros(n, dtype=np.float32)
    bar = 4 * beat
    for i in range(int(dur / bar) + 1):
        a0 = int(i * bar * SR); a1 = min(n, int((i + 1) * bar * SR))
        if a0 >= n:
            break
        tt = np.arange(a1 - a0) / SR
        pad[a0:a1] = sum(np.sin(2 * np.pi * f * tt + k) + 0.3 * np.sin(4 * np.pi * f * tt) for k, f in enumerate(chords[i % 4])) * 0.08
        for q in range(8):
            q0 = int((i * bar + q * beat / 2) * SR)
            if q0 >= n:
                break
            m = min(int(beat / 2 * SR * 0.9), n - q0); tb = np.arange(m) / SR
            bass[q0:q0 + m] += np.tanh(2 * np.sin(2 * np.pi * roots[i % 4] * (2 if q % 2 else 1) * tb)) * np.exp(-tb * 6) * 0.35
    side = 0.35 + 0.65 * np.clip(((t % beat) / beat) * 3, 0, 1)
    out += sos_filter(pad, "lowpass", 2400, 2) * side + bass * side
    return out


def pop(f=880, d=0.12):
    m = int(d * SR); t = np.arange(m) / SR
    return (np.sin(2 * np.pi * f * (1 + 1.5 * np.exp(-t * 40)) * t) * np.exp(-t * 30)).astype(np.float32)


def coin():
    m = int(0.5 * SR); t = np.arange(m) / SR
    f = np.where(t < 0.08, 988, 1319)
    return (np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 6) * 0.3).astype(np.float32)


def zip_(d=1.2):
    m = int(d * SR); t = np.arange(m) / SR
    f = 300 + 2600 * (t / d) ** 1.5
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + bandnoise(m, 2000, 8000) * 0.4
    return (s * np.sin(np.pi * t / d) ** 0.5).astype(np.float32)


def build_sfx(cfg, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    T = cfg["tempos"]; bus = Bus(dur)
    # música: começa já no gancho, some no glitch, volta cheia; abaixa no CTA para a voz e volta no loop
    mus = music(dur)
    g0, g1 = T["glitch"][0]
    env = (0.7 * (1 - smooth(g0, g0 + 0.15, t)) + smooth(g1, g1 + 0.6, t) * (0.9 - 0.35 * smooth(T["cta"][0], T["cta"][0] + 0.5, t) * (1 - smooth(T["cta"][1], T["cta"][1] + 0.5, t))))
    bus.add_full(np.stack([mus * env, np.roll(mus, 200) * env]) * 0.55)
    bus.add(np.stack([sub_drop(), sub_drop()]), 0.0, 0.7)
    bus.add(pop(1200), 0.05, 0.35)
    # glitch
    bus.add(sfx_zap(0.7), g0, 0.35)
    m = int((g1 - g0) * SR); gl = np.repeat(white(m // 20 + 1), 20)[:m] * 0.4
    bus.add(sos_filter(gl.astype(np.float32), "bandpass", [400, 5000], 2), g0, 0.4)
    # toque no botão
    tq = T["toque"]
    bus.add(sfx_whoosh(0.5, 600, 4000), tq - 0.45, 0.25)
    m = int(0.08 * SR); click = (sos_filter(white(m), "bandpass", [1500, 6000], 2) * np.exp(-np.arange(m) / SR * 80)).astype(np.float32)
    bus.add(click, tq, 0.9); bus.add(thump(70, 0.35), tq, 0.6); bus.add(pop(660, 0.2), tq + 0.05, 0.3)
    for k in range(3):
        bus.add(sfx_whoosh(0.8, 200, 1200), tq + 0.05 + k * 0.12, 0.15)
    # sinal dando a volta na Terra
    s0, s1 = T["sinal"]
    bus.add(zip_(1.4), s0, 0.4)
    m = int((s1 - s0 - 1.2) * SR); tt = np.arange(m) / SR
    orbit = (np.sin(2 * np.pi * np.cumsum(900 + 300 * np.sin(2 * np.pi * tt / (s1 - s0 - 1.2))) / SR) * 0.15 * np.sin(np.pi * tt / (tt[-1] + 1e-6))).astype(np.float32)
    bus.add(orbit, s0 + 1.2, 0.5)
    bus.add(pop(1568, 0.3), s1 - 0.1, 0.3)
    # contador
    tc = T["contador"]
    bus.add(sfx_whoosh(0.5, 300, 3000), tc - 1.3, 0.25)
    for k in range(5):
        bus.add(pop(1400 + 120 * k, 0.05), tc + k * 0.1, 0.2)
    bus.add(coin(), tc + 0.55, 0.45)
    for k in range(40):
        bus.add(pop(1800 + 1500 * rng.random(), 0.04), tc + 0.6 + rng.random() * 1.2, 0.06, rng.uniform(-0.8, 0.8))
    bus.add(sfx_crumble(0.8, 400, 6000), tc + 0.6, 0.15)
    # vitrine: passagem dos cartões e cadeados
    v0, v1 = T["vitrine"]
    for k in range(6):
        bus.add(sfx_whoosh(0.5, 500, 5000), v0 + 0.3 + k * 1.0, 0.18, (-1) ** k * 0.5)
    for k in range(3):
        bus.add(thump(90, 0.2), 24.6 + k * 0.18, 0.35); bus.add(pop(520 - 40 * k, 0.15), 24.6 + k * 0.18, 0.25)
    # enquete
    e0, e1 = T["enquete"]
    bus.add(sfx_whoosh(0.6, 300, 3000), e0 - 0.2, 0.25)
    for k in range(3):
        bus.add(pop(700 + 200 * k, 0.15), e0 + 0.15 * k + 0.2, 0.35)
    # CTA
    c0, c1 = T["cta"]
    bus.add(sfx_whoosh(0.9, 200, 2500), c0 - 0.3, 0.3)
    for k in range(4):
        bus.add(pop(1047, 0.25), c0 + 0.9 + k * 0.85, 0.18)
    # loop
    bus.add(sfx_riser(1.8), dur - 1.8, 0.4)
    return bus.buf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--versao", default="tiktok", choices=["tiktok", "youtube"])
    ap.add_argument("--out", default=str(HERE / "build"))
    ap.add_argument("--no-tts", action="store_true")
    args = ap.parse_args()
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    cfg = json.loads((HERE / f"roteiro_{args.versao}.json").read_text(encoding="utf-8"))
    dur, fps = float(cfg["duracao"]), cfg.get("fps", 30)
    vdir = out / f"voz_{args.versao}"; vdir.mkdir(parents=True, exist_ok=True)
    print("Narração (edge-tts)…", flush=True)
    voice = ga.build_voice(cfg, vdir, not args.no_tts, dur)
    print("Efeitos e música…", flush=True)
    sfx = build_sfx(cfg, dur)
    sfx = np.tanh(normalize(sfx, 1.0) * 1.3) / np.tanh(1.3)
    venv = sos_filter(np.abs(voice), "lowpass", 4, 1)
    venv = np.clip(venv / (np.max(venv) + 1e-9) * 3, 0, 1)
    mix = normalize(np.tanh((sfx * (1 - 0.5 * venv) * 0.6 + np.stack([voice, voice])) * 1.1) / np.tanh(1.1), 0.97)
    nonarr = normalize(np.tanh(sfx * 0.62 * 1.1) / np.tanh(1.1), 0.97)
    from scipy.io import wavfile
    v = args.versao
    wavfile.write(out / f"audio_{v}.wav", SR, (mix.T * 32767).astype(np.int16))
    wavfile.write(out / f"audio_{v}_sem_narracao.wav", SR, (nonarr.T * 32767).astype(np.int16))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out / f"audio_{v}.wav"), "-c:a", "libmp3lame", "-b:a", "192k", str(out / f"audio_{v}.mp3")], check=True)
    env = envelope_from(voice, fps) if np.max(np.abs(voice)) > 0 else []
    (out / f"envelope_{v}.json").write_text(json.dumps(env))
    print(f"OK -> {out / f'audio_{v}.wav'} ({mix.shape[1] / SR:.1f}s), envelope com {len(env)} quadros", flush=True)


if __name__ == "__main__":
    main()
