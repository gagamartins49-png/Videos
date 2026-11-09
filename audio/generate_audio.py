#!/usr/bin/env python3
"""
Gera a trilha completa do vídeo "E se a Terra parasse de girar?":

  1. Narração neural pt-BR com edge-tts (voz masculina grave: pt-BR-AntonioNeural),
     cada frase posicionada no tempo exato definido em roteiro.json.
  2. Efeitos sonoros 100% procedurais (numpy/scipy): cidade, vento crescente,
     rachaduras, estrondos de destruição, estrondo sônico, tsunami, impacto,
     ambiente subaquático abafado, vidro trincando e o "hit" final.
  3. Mixagem com ducking (efeitos abaixam quando a voz fala) -> mix.wav / mix.mp3

Uso:
    pip install edge-tts numpy scipy
    python audio/generate_audio.py --out build/audio
    python audio/generate_audio.py --out build/audio --no-tts   # só efeitos (teste offline)
"""
import argparse
import asyncio
import json
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
ROOT = Path(__file__).resolve().parent.parent
rng = np.random.default_rng(1670)


# ============================================================================ utilidades
def smooth(e0, e1, x):
    u = np.clip((np.asarray(x, dtype=np.float64) - e0) / (e1 - e0), 0, 1)
    return u * u * (3 - 2 * u)


def white(n):
    return rng.standard_normal(n).astype(np.float32)


def sos_filter(x, kind, freq, order=4):
    sos = signal.butter(order, freq, btype=kind, fs=SR, output="sos")
    return signal.sosfilt(sos, x).astype(np.float32)


def brown(n):
    b = np.cumsum(white(n)) * 0.02
    return sos_filter(b, "highpass", 20, 2)


def bandnoise(n, lo, hi, order=3):
    return sos_filter(white(n), "bandpass", [lo, hi], order)


def env_ad(n, attack, decay_tau):
    """Envelope ataque linear + decaimento exponencial (segundos)."""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return (a * np.exp(-np.maximum(t - attack, 0) / decay_tau)).astype(np.float32)


def normalize(x, peak=0.9):
    m = np.max(np.abs(x)) + 1e-9
    return (x / m * peak).astype(np.float32)


class Bus:
    """Barramento estéreo com helper para posicionar sons no tempo."""

    def __init__(self, dur):
        self.n = int(dur * SR)
        self.buf = np.zeros((2, self.n), dtype=np.float32)

    def add(self, sig, at, gain=1.0, pan=0.0):
        sig = np.asarray(sig, dtype=np.float32)
        if sig.ndim == 1:
            l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
            sig = np.stack([sig * l * 1.414, sig * r * 1.414])
        i0 = int(round(at * SR))
        if i0 >= self.n:
            return
        s0 = max(0, -i0)
        i0 = max(0, i0)
        m = min(sig.shape[1] - s0, self.n - i0)
        if m > 0:
            self.buf[:, i0:i0 + m] += sig[:, s0:s0 + m] * gain

    def add_full(self, sig_stereo, gain=1.0):
        self.buf += sig_stereo[:, : self.n] * gain


def reverb(x, seconds=2.2, wet=0.25, seed=0):
    """Reverb simples por convolução com ruído decaindo exponencialmente."""
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t * 6.9 / seconds)
    ir = sos_filter(ir, "lowpass", 5000, 2)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    y = signal.fftconvolve(x, ir)[: len(x)]
    return ((1 - wet) * x + wet * y * 0.6).astype(np.float32)


# ============================================================================ sons individuais
def sfx_boom(dur=3.0, f0=55, f1=28, noise_cut=380, strength=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    freq = f1 + (f0 - f1) * np.exp(-t * 2.5)
    sub = np.sin(2 * np.pi * np.cumsum(freq) / SR) * env_ad(n, 0.008, dur * 0.28)
    rumble = sos_filter(white(n), "lowpass", noise_cut, 4) * env_ad(n, 0.02, dur * 0.35) * 3.0
    crack = sos_filter(white(n), "highpass", 900, 2) * env_ad(n, 0.002, 0.05) * 0.5
    return normalize(sub * 1.0 + rumble + crack, 0.95 * strength)


def sfx_crumble(dur=3.0, density=260, cut=2600):
    """Detritos caindo: grãos curtos aleatórios (blocos de concreto)."""
    n = int(dur * SR)
    out = np.zeros(n, dtype=np.float32)
    count = int(density * dur)
    for _ in range(count):
        p = int(rng.uniform(0, 1) ** 1.6 * (n - 2000))
        L = int(rng.uniform(0.004, 0.03) * SR)
        g = white(L) * np.exp(-np.arange(L) / (L / 4)) * rng.uniform(0.2, 1.0)
        out[p:p + L] += g
    out = sos_filter(out, "lowpass", cut, 2)
    return normalize(out * env_ad(n, 0.05, dur * 0.4), 0.7)


def sfx_crack(dur=0.9):
    n = int(dur * SR)
    snap = sos_filter(white(n), "highpass", 1500, 2) * env_ad(n, 0.001, 0.018)
    thump = np.sin(2 * np.pi * 70 * np.arange(n) / SR) * env_ad(n, 0.003, 0.12)
    tail = sfx_crumble(dur, density=120, cut=3500)[:n] * 0.5
    return normalize(snap * 1.2 + thump * 0.8 + tail, 0.9)


def sfx_whoosh(dur=1.4, lo=300, hi=2500):
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = np.exp(-((t - dur * 0.45) ** 2) / (2 * (dur * 0.18) ** 2))
    return normalize(bandnoise(n, lo, hi) * e, 0.8)


def sfx_metal(dur=1.6, base=180):
    n = int(dur * SR)
    t = np.arange(n) / SR
    ratios = [1.0, 2.76, 5.40, 8.93, 13.34]
    s = sum(np.sin(2 * np.pi * base * r * t + rng.uniform(0, 6)) * np.exp(-t * (3 + i * 2.5)) / (i + 1)
            for i, r in enumerate(ratios))
    hit = sos_filter(white(n), "highpass", 2000, 2) * env_ad(n, 0.001, 0.02)
    return normalize(s + hit * 0.6, 0.8)


def sfx_horn(dur=0.42, f=420):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 8)) + sum(np.sin(2 * np.pi * f * 1.26 * k * t) / k for k in range(1, 8))
    e = np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.04, 0, 1)
    return normalize(sos_filter(s * e, "lowpass", 2500, 2), 0.5)


def sfx_chirp():
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    f = 2800 + 2200 * t / 0.09
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.09) ** 2 * 0.5).astype(np.float32)


def sfx_sonic_boom():
    n = int(4.0 * SR)
    out = np.zeros(n, dtype=np.float32)
    L = int(0.11 * SR)
    nwave = np.linspace(1, -1, L).astype(np.float32)
    for off in (0.0, 0.16):  # "BUM-BUM" duplo característico
        i = int(off * SR)
        out[i:i + L] += nwave
    out = sos_filter(out, "lowpass", 900, 2) * 2.0
    out += sfx_boom(4.0, 60, 25, 300, 1.0)[:n] * 0.9
    return reverb(normalize(out, 1.0), 3.0, 0.35, seed=3)


def sfx_glass(dur=1.8):
    n = int(dur * SR)
    t = np.arange(n) / SR
    crack = sos_filter(white(n), "highpass", 2500, 2) * env_ad(n, 0.0005, 0.012) * 1.5
    tinkle = np.zeros(n, dtype=np.float32)
    for _ in range(45):
        p = int(rng.uniform(0, 0.7) ** 1.5 * SR)
        f = rng.uniform(3500, 9000)
        L = int(0.06 * SR)
        tt = np.arange(L) / SR
        g = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 70) * rng.uniform(0.1, 0.5)
        tinkle[p:p + L] += g[: max(0, min(L, n - p))]
    creak = sos_filter(white(n), "bandpass", [1200, 4000], 2) * env_ad(n, 0.01, 0.25) * 0.4
    thump = np.sin(2 * np.pi * 85 * t) * env_ad(n, 0.002, 0.1) * 0.6
    return reverb(normalize(crack + tinkle + creak + thump, 0.9), 1.5, 0.25, seed=5)


def sfx_bubble():
    d = rng.uniform(0.04, 0.12)
    n = int(d * SR)
    t = np.arange(n) / SR
    f0 = rng.uniform(250, 700)
    f = f0 * (1 + 2.5 * t / d)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d * 0.4))).astype(np.float32)


# ============================================================================ narração
async def tts_line(text, voice, rate, pitch, path):
    import edge_tts
    com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await com.save(str(path))


def decode_mono(path, tempo=1.0):
    af = ["-af", f"atempo={tempo:.4f}"] if abs(tempo - 1) > 1e-3 else []
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), *af, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def trim_silence(x, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    return x[max(0, idx[0] - int(0.02 * SR)): idx[-1] + int(0.08 * SR)]


def build_voice(script, outdir, use_tts, dur):
    voice = np.zeros(int(dur * SR), dtype=np.float32)
    vdir = outdir / "voz"
    vdir.mkdir(parents=True, exist_ok=True)
    report = []
    for i, f in enumerate(script["frases"]):
        slot = f["fim"] - f["inicio"]
        if not use_tts:
            continue
        mp3 = vdir / f"{i:02d}.mp3"
        for attempt in range(6):
            try:
                asyncio.run(tts_line(f["texto"], script.get("voz", "pt-BR-AntonioNeural"),
                                     script.get("velocidade", "-6%"), script.get("tom", "-7Hz"), mp3))
                if mp3.stat().st_size > 1000:
                    break
            except Exception as e:  # rede instável no runner: tenta de novo
                print(f"  edge-tts falhou ({e}); tentativa {attempt + 1}/6", flush=True)
                time.sleep(2 + attempt * 3)
        else:
            sys.exit(f"ERRO: edge-tts não conseguiu gerar a frase {i}: {f['texto']}")
        x = trim_silence(decode_mono(mp3))
        d = len(x) / SR
        tempo = 1.0
        if d > slot:  # acelera (sem mudar o tom) para caber exatamente no tempo do roteiro
            tempo = min(1.45, d / slot)
            x = trim_silence(decode_mono(mp3, tempo))
        report.append({"frase": i, "inicio": f["inicio"], "fim": f["fim"], "dur_original": round(d, 2), "atempo": round(tempo, 3), "dur_final": round(len(x) / SR, 2)})
        print(f"  [{i:02d}] {f['inicio']:5.1f}s  {d:5.2f}s -> {len(x) / SR:5.2f}s (slot {slot:.2f}s)  {f['texto'][:50]}", flush=True)
        i0 = int(f["inicio"] * SR)
        m = min(len(x), len(voice) - i0)
        voice[i0:i0 + m] += x[:m]
    (outdir / "narracao_tempos.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    if np.max(np.abs(voice)) > 0:
        voice = sos_filter(voice, "highpass", 70, 2)
        # leve realce de graves (voz "de trailer") + compressão suave + reverb curto
        low = sos_filter(voice, "lowpass", 220, 2)
        voice = voice + low * 0.5
        voice = np.tanh(normalize(voice, 1.0) * 1.8) / np.tanh(1.8)
        voice = reverb(voice, 1.2, 0.12, seed=11)
        voice = normalize(voice, 0.85)
    return voice


# ============================================================================ trilha de efeitos
def build_sfx(script, dur):
    ev = script["eventos"]
    n = int(dur * SR)
    t = np.arange(n) / SR
    bus = Bus(dur)

    # timeline física (igual a js/scene.js)
    rot = np.where(t < 12, 1670, np.where(t < 30, 1670 - 500 * np.clip((t - 12) / 18, 0, 1) ** 1.3,
                                          np.where(t < 55, 1170 * (1 - (t - 30) / 25), 0)))
    windN = ((1670 - rot) / 1670).astype(np.float32)
    hit = ev["impactoTsunami"]
    under = (t >= hit) & (t < ev["telaPreta"])
    city_mask = (t < hit).astype(np.float32)

    # ---------------------------------------------------- 1) ambiente de cidade (0-20 s)
    amb_g = (smooth(0, 0.8, t) * (1 - smooth(12, 22, t))).astype(np.float32)
    for ch in range(2):
        traffic = sos_filter(white(n), "lowpass", 260, 3) * 0.6
        murmur = bandnoise(n, 300, 1100) * (0.6 + 0.4 * np.sin(2 * np.pi * (3.3 + ch) * t + ch)) * 0.25
        bus.buf[ch] += (traffic + murmur) * amb_g * 0.35
    for at, pan in [(0.8, -0.6), (3.6, 0.5), (6.2, -0.3), (8.9, 0.7), (11.2, -0.5), (13.8, 0.4)]:
        bus.add(sfx_whoosh(2.2, 120, 1400), at, 0.35, pan)          # carros passando
    for at, f in [(2.6, 410), (2.95, 410), (7.8, 480), (9.9, 380)]:
        bus.add(sfx_horn(0.32, f), at, 0.22, 0.3)                    # buzinas
    for _ in range(26):                                              # passarinhos
        at = rng.uniform(0.3, 11.5)
        for k in range(rng.integers(2, 5)):
            bus.add(sfx_chirp(), at + k * 0.12, 0.12, rng.uniform(-0.8, 0.8))

    # ---------------------------------------------------- 2) vento crescente (12-64,6 s)
    gust = (0.72 + 0.28 * np.sin(2 * np.pi * 0.31 * t) * np.sin(2 * np.pi * 0.13 * t + 1)).astype(np.float32)
    for ch in range(2):
        low = sos_filter(white(n), "lowpass", 160, 3) * 2.2
        mid = bandnoise(n, 350, 1600) * 1.1
        hiss = bandnoise(n, 2200, 7000) * 0.7
        wh1 = bandnoise(n, 820 + ch * 60, 900 + ch * 60, 2) * 2.5
        wh2 = bandnoise(n, 1350, 1450, 2) * 2.0
        lfo = 0.5 + 0.5 * np.sin(2 * np.pi * (0.21 + 0.05 * ch) * t + ch * 2)
        w = (low * windN ** 1.1 + mid * windN * gust + hiss * windN ** 2 * gust
             + (wh1 * lfo + wh2 * (1 - lfo)) * windN * smooth(14, 30, t))
        bus.buf[ch] += w * city_mask * 0.5

    # ---------------------------------------------------- 3) tensão (drone grave + riser)
    drone_g = (smooth(11, 20, t) * 0.5 + smooth(30, 60, t) * 0.5) * city_mask
    riser_f = 40 + 45 * smooth(44, hit, t)
    drone = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 55.4 * t + 1) + 0.4 * np.sin(2 * np.pi * 82.4 * t)
             + 0.5 * np.sin(2 * np.pi * np.cumsum(riser_f) / SR) * smooth(44, 50, t))
    drone *= 0.7 + 0.3 * np.sin(2 * np.pi * 0.5 * t)
    bus.add_full(np.stack([drone, drone]) * drone_g * 0.12)

    # ---------------------------------------------------- 4) rachaduras no asfalto
    for at in ev["rachaduras"]:
        for j in range(3):
            bus.add(sfx_crack(), at + j * 0.25, 0.55, rng.uniform(-0.5, 0.5))
        bus.add(sfx_boom(1.6, 70, 35, 250, 0.6), at, 0.35)

    # ---------------------------------------------------- 5) arremessos (carros/pessoas), semáforos, árvores
    for at in ev["arremessos"]:
        bus.add(sfx_whoosh(1.2, 400, 3500), at, 0.4, rng.uniform(-0.4, 0.8))
        bus.add(sfx_metal(1.4, rng.uniform(140, 260)), at + 1.1, 0.3, rng.uniform(0.2, 0.9))
    for at in ev["semaforos"]:
        bus.add(sfx_metal(2.0, rng.uniform(300, 420)), at + 1.0, 0.3, rng.uniform(-0.5, 0.5))
    for _ in range(9):
        at = rng.uniform(*ev["arvores"])
        bus.add(sfx_crack(0.7), at, 0.4, rng.uniform(-0.6, 0.6))

    # ---------------------------------------------------- 6) prédios se despedaçando
    for at in ev["desabamentos"]:
        bus.add(sfx_boom(3.2, 58, 26, 420, 1.0), at, 0.75, rng.uniform(-0.3, 0.3))
        bus.add(sfx_crumble(4.0, 320), at + 0.15, 0.5, rng.uniform(-0.6, 0.6))

    # ---------------------------------------------------- 7) estrondo sônico
    bus.add(sfx_sonic_boom(), ev["barreiraSom"], 1.0)

    # ---------------------------------------------------- 8) tsunami se aproximando
    ts = (smooth(55, hit, t) ** 1.6) * city_mask
    for ch in range(2):
        roar = brown(n) * 0.5 + sos_filter(white(n), "lowpass", 600, 3) * 1.5
        spray = bandnoise(n, 1500, 6000) * 0.5
        bus.buf[ch] += (roar + spray * smooth(59, hit, t)) * ts * 0.8
    sub = np.sin(2 * np.pi * 32 * t) * ts * 0.5
    bus.add_full(np.stack([sub, sub]))

    # ---------------------------------------------------- 9) impacto da água
    imp_n = int(3.5 * SR)
    splash = sos_filter(white(imp_n), "lowpass", 3000, 2) * env_ad(imp_n, 0.01, 0.5)
    bus.add(normalize(splash + sfx_boom(3.5, 50, 22, 500, 1.0) * 1.2, 1.0), hit - 0.05, 1.0)

    # ---------------------------------------------------- 10) subaquático abafado
    uw_g = (smooth(hit, hit + 0.6, t) * (1 - smooth(72.3, 73.0, t))).astype(np.float32) * under
    for ch in range(2):
        muff = sos_filter(brown(n) * 2 + white(n) * 0.2, "lowpass", 220, 4)
        swell = 0.7 + 0.3 * np.sin(2 * np.pi * 0.17 * t + ch)
        bus.buf[ch] += muff * swell * uw_g * 0.6
    for _ in range(140):
        at = hit + rng.uniform(0, 8) ** 1.3 / 8 ** 0.3
        if at < 72.8:
            bus.add(sos_filter(sfx_bubble(), "lowpass", 1800, 2), at, rng.uniform(0.05, 0.2), rng.uniform(-0.8, 0.8))
    for at in (67.0, 68.8, 70.6):
        bus.add(sos_filter(sfx_boom(2.5, 45, 25, 200, 0.7), "lowpass", 200, 2), at, 0.35)
    for at in ev["vidro"]:
        bus.add(sfx_glass(), at, 0.8, -0.1 if at == ev["vidro"][0] else 0.3)

    # ---------------------------------------------------- 11) tela preta: hit final + drone que some
    end = ev["telaPreta"]
    bus.add(reverb(sfx_boom(5.0, 48, 24, 300, 1.0), 4.0, 0.45, seed=9), end, 0.8)
    fin = (smooth(end, end + 0.5, t) * (1 - smooth(end + 4, dur - 0.2, t)))
    tone = (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 82.4 * t) + 0.25 * np.sin(2 * np.pi * 110 * t)) * fin * 0.08
    bus.add_full(np.stack([tone, tone]))

    return bus.buf


# ============================================================================ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "build" / "audio"))
    ap.add_argument("--no-tts", action="store_true", help="não gera narração (teste offline)")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    script = json.loads((ROOT / "roteiro.json").read_text(encoding="utf-8"))
    dur = float(script["duracao"])

    print("Narração (edge-tts)…", flush=True)
    voice = build_voice(script, out, not args.no_tts, dur)
    print("Efeitos sonoros procedurais…", flush=True)
    sfx = build_sfx(script, dur)
    sfx = np.tanh(normalize(sfx, 1.0) * 1.6) / np.tanh(1.6)

    # ducking: efeitos abaixam ~6 dB enquanto a voz fala
    venv = np.abs(voice)
    venv = sos_filter(venv, "lowpass", 4, 1)
    venv = np.clip(venv / (np.max(venv) + 1e-9) * 3, 0, 1)
    duck = 1 - 0.5 * venv
    mix = sfx * duck * 0.62 + np.stack([voice, voice]) * 1.0
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    mix = normalize(mix, 0.97)
    fade = np.ones(mix.shape[1], dtype=np.float32)
    fade[-int(0.3 * SR):] = np.linspace(1, 0, int(0.3 * SR))
    mix *= fade

    # versão SEM narração: só efeitos sonoros (sem ducking)
    nonarr = normalize(np.tanh(sfx * 0.62 * 1.1) / np.tanh(1.1), 0.97) * fade
    wavfile.write(out / "mix_sem_narracao.wav", SR, (nonarr.T * 32767).astype(np.int16))

    wav = out / "mix.wav"
    wavfile.write(wav, SR, (mix.T * 32767).astype(np.int16))
    wavfile.write(out / "sfx.wav", SR, (normalize(sfx, 0.9).T * 32767).astype(np.int16))
    if np.max(np.abs(voice)) > 0:
        wavfile.write(out / "voz.wav", SR, (voice * 32767).astype(np.int16))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", "192k", str(out / "mix.mp3")], check=True)
    print(f"OK -> {wav} ({mix.shape[1] / SR:.1f}s) e mix.mp3", flush=True)


if __name__ == "__main__":
    main()
