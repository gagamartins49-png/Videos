#!/usr/bin/env python3
"""
Gera a trilha completa do vídeo "E se o Sol apagasse de repente?":

  1. Narração neural pt-BR com edge-tts (voz masculina grave: pt-BR-AntonioNeural),
     cada frase posicionada no tempo exato definido em roteiro.json.
  2. Efeitos sonoros 100% procedurais (numpy/scipy): cidade ao meio-dia, o Sol
     apagando, impacto da escuridão, postes acendendo, multidão assustada,
     nevasca, gelo rangendo, falha elétrica, estruturas congeladas desabando,
     chuva de oxigênio líquido, lente congelando/trincando e o "hit" final.
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
def sfx_click(strength=1.0):
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    c = sos_filter(white(n), "bandpass", [1500, 6000], 2) * np.exp(-t * 180)
    thump = np.sin(2 * np.pi * 140 * t) * np.exp(-t * 60) * 0.4
    return (c + thump).astype(np.float32) * strength


def sfx_zap(dur=0.7):
    """Falha elétrica: zumbido 60 Hz distorcido + estalos."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    buzz = np.sign(np.sin(2 * np.pi * 60 * t)) * 0.5 + np.sin(2 * np.pi * 180 * t) * 0.3
    gate = (rng.random(n // 400 + 1) > 0.35).repeat(400)[:n]
    crack = sos_filter(white(n), "highpass", 2500, 2) * (rng.random(n) > 0.995) * 6
    s = sos_filter(buzz * gate, "lowpass", 3000, 2) + crack
    return normalize(s * env_ad(n, 0.005, dur * 0.4), 0.6)


def sfx_gasp(dur=1.6):
    """Multidão assustada: várias vozes 'ahh' (ruído com formantes)."""
    n = int(dur * SR)
    out = np.zeros(n, dtype=np.float32)
    for _ in range(14):
        f1, f2 = rng.uniform(600, 900), rng.uniform(1000, 1500)
        v = sos_filter(white(n), "bandpass", [f1 * 0.85, f1 * 1.15], 2) + 0.6 * sos_filter(white(n), "bandpass", [f2 * 0.9, f2 * 1.1], 2)
        d = rng.uniform(0, 0.25)
        e = env_ad(n, 0.08 + d, 0.35 + rng.uniform(0, 0.3))
        out += v * e * rng.uniform(0.4, 1.0)
    return normalize(out, 0.7)


def sfx_ice_creak(dur=1.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = rng.uniform(80, 200) * (1 + 0.6 * t / dur)
    grit = (rng.random(n) > 0.92).astype(np.float32) * white(n)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.abs(grit))
    return normalize(sos_filter(s, "bandpass", [60, 1800], 2) * np.sin(np.pi * t / dur) ** 2, 0.6)


def sfx_riser(dur=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n, dtype=np.float32)
    for lo in (300, 800, 2000):
        out += bandnoise(n, lo, lo * 2.5) * (t / dur) ** 2.5
    tone = np.sin(2 * np.pi * np.cumsum(200 + 1400 * (t / dur) ** 2) / SR) * (t / dur) ** 3 * 0.3
    return normalize(out + tone, 0.8)


def build_sfx(script, dur):
    """Trilha de efeitos para "E se o Sol apagasse?" (tempos em roteiro.json)."""
    ev = script["eventos"]
    n = int(dur * SR)
    t = np.arange(n) / SR
    bus = Bus(dur)
    dark, end = ev["escuridao"], ev["telaPreta"]

    def wind_level(tt):  # igual a windLevel() em js/scene.js
        w = np.zeros_like(tt)
        w = np.where((tt >= 25) & (tt < 45), 0.15 + 0.45 * smooth(25, 42, tt), w)
        w = np.where((tt >= 45) & (tt < 65), 0.6 + 0.4 * smooth(45, 52, tt) - 0.15 * smooth(60, 65, tt), w)
        w = np.where(tt >= 65, 0.25, w)
        return w.astype(np.float32)
    wl = wind_level(t) * (1 - smooth(end - 0.6, end, t))

    # ---------------------------------------------------- 1) cidade ao meio-dia (0-12,5 s), corta na escuridão
    amb_g = (smooth(0, 0.8, t) * (1 - smooth(dark - 0.05, dark + 0.25, t))).astype(np.float32)
    for ch in range(2):
        traffic = sos_filter(white(n), "lowpass", 260, 3) * 0.6
        murmur = bandnoise(n, 300, 1100) * (0.6 + 0.4 * np.sin(2 * np.pi * (3.3 + ch) * t + ch)) * 0.25
        bus.buf[ch] += (traffic + murmur) * amb_g * 0.35
    for at, pan in [(0.8, -0.6), (3.6, 0.5), (6.2, -0.3), (8.9, 0.7), (11.2, -0.5)]:
        bus.add(sfx_whoosh(2.2, 120, 1400), at, 0.35, pan)
    for at, f in [(2.6, 410), (2.95, 410), (7.4, 480)]:
        bus.add(sfx_horn(0.32, f), at, 0.2, 0.3)
    for _ in range(28):
        at = rng.uniform(0.3, 12.0)
        for k in range(rng.integers(2, 5)):
            bus.add(sfx_chirp(), at + k * 0.12, 0.12, rng.uniform(-0.8, 0.8))

    # ---------------------------------------------------- 2) o Sol apaga (8 s): "sucção" grave + brilho que some
    so = ev["solApaga"]
    m = int(2.5 * SR)
    tt = np.arange(m) / SR
    shimmer = sum(np.sin(2 * np.pi * f * tt) for f in (1760, 2217, 2637)) * np.exp(-tt * 1.8) * 0.15
    suck = np.sin(2 * np.pi * np.cumsum(90 * np.exp(-tt * 1.2) + 30) / SR) * env_ad(m, 0.05, 0.9)
    bus.add(reverb(normalize(shimmer + suck, 0.7), 2.5, 0.4, seed=21), so, 0.55)
    bus.add(sfx_riser(4.4), dark - 4.4, 0.35)                      # tensão até a última luz

    # ---------------------------------------------------- 3) escuridão total: impacto grave + silêncio
    bus.add(reverb(sfx_boom(4.0, 50, 22, 250, 1.0), 3.5, 0.4, seed=22), dark, 0.95)
    bus.add(sfx_gasp(), ev["pessoasParam"], 0.45)
    # postes acendendo (clique + zumbido elétrico)
    lamp_on = ev["postesAcendem"]
    for i in range(16):
        bus.add(sfx_click(0.6), lamp_on + i * 0.11, 0.35, -0.8 + 0.1 * i)
    fails = ev["falhaEnergia"]
    hum_g = (smooth(lamp_on, lamp_on + 0.6, t) * (1 - smooth(fails[0], ev["blackout"], t))).astype(np.float32)
    hum = (np.sin(2 * np.pi * 60 * t) * 0.5 + np.sin(2 * np.pi * 120 * t) * 0.3 + np.sin(2 * np.pi * 180 * t) * 0.15)
    hum *= 1 + 0.6 * (rng.random(n) > 0.997)
    bus.add_full(np.stack([hum, hum]) * hum_g * 0.05)

    # ---------------------------------------------------- 4) drone frio de tensão (escuridão -> fim)
    dg = (smooth(dark, dark + 3, t) * (0.6 + 0.4 * smooth(40, 64, t)) * (1 - smooth(end, end + 0.2, t))).astype(np.float32)
    drone = (np.sin(2 * np.pi * 49 * t) + 0.6 * np.sin(2 * np.pi * 49.3 * t + 1) + 0.35 * np.sin(2 * np.pi * 73.4 * t)
             + 0.25 * np.sin(2 * np.pi * 98 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t)))
    glass_pad = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate((587.3, 698.5, 880.0))) * 0.05 * smooth(44, 66, t)
    bus.add_full(np.stack([drone + glass_pad, drone + glass_pad * 0.8]) * dg * 0.11)

    # ---------------------------------------------------- 5) saltos no tempo (whoosh "acelerado")
    for s in ev["saltosTempo"]:
        bus.add(sfx_riser(1.4), s - 1.3, 0.5)
        bus.add(sfx_boom(2.0, 70, 35, 300, 0.7), s, 0.45)

    # ---------------------------------------------------- 6) nevasca e ventos congelantes
    gust = (0.7 + 0.3 * np.sin(2 * np.pi * 0.27 * t) * np.sin(2 * np.pi * 0.11 * t + 1)).astype(np.float32)
    for ch in range(2):
        low = sos_filter(white(n), "lowpass", 180, 3) * 2.0
        mid = bandnoise(n, 400, 1800) * 1.0
        hiss = bandnoise(n, 2500, 8000) * 0.6
        wh = bandnoise(n, 700 + ch * 90, 780 + ch * 90, 2) * 2.4
        lfo = 0.5 + 0.5 * np.sin(2 * np.pi * (0.19 + 0.04 * ch) * t + ch)
        bus.buf[ch] += (low * wl ** 1.2 + mid * wl * gust + hiss * wl ** 1.5 * gust + wh * lfo * wl) * 0.55

    # folhas secas
    f0, f1 = ev["folhas"]
    leaves_g = (smooth(f0 - 1, f0 + 1, t) * (1 - smooth(f1, f1 + 2, t))).astype(np.float32)
    rustle = sos_filter((rng.random(n) > 0.985).astype(np.float32) * white(n), "bandpass", [1500, 7000], 2)
    bus.add_full(np.stack([rustle, np.roll(rustle, 777)]) * leaves_g * 0.5)

    # gelo rangendo
    for _ in range(26):
        at = rng.uniform(28, 72)
        bus.add(sfx_ice_creak(rng.uniform(0.6, 1.6)), at, rng.uniform(0.15, 0.35), rng.uniform(-0.8, 0.8))

    # ---------------------------------------------------- 7) rede elétrica entra em colapso
    for i, at in enumerate(fails):
        bus.add(sfx_zap(0.6 + 0.4 * rng.random()), at - 0.5, 0.45, rng.uniform(-0.7, 0.7))
        bus.add(sfx_click(1.0), at, 0.5, rng.uniform(-0.7, 0.7))
    bus.add(reverb(sfx_boom(3.0, 60, 30, 200, 0.8), 2.5, 0.35, seed=23), ev["blackout"], 0.6)

    # ---------------------------------------------------- 8) estruturas congeladas desabando
    for at in ev["quedas"]:
        bus.add(sfx_boom(3.0, 55, 25, 380, 1.0), at + 0.9, 0.7, rng.uniform(-0.4, 0.4))
        bus.add(sfx_crumble(3.0, 260), at + 0.6, 0.45, rng.uniform(-0.6, 0.6))
        bus.add(sfx_glass(1.5), at + 1.0, 0.35, rng.uniform(-0.6, 0.6))   # gelo se estilhaçando
        bus.add(sfx_metal(1.6, rng.uniform(120, 220)), at + 0.4, 0.3, rng.uniform(-0.6, 0.6))

    # ---------------------------------------------------- 9) oxigênio líquido caindo: chuva cristalina
    ox = ev["oxigenio"]
    ox_g = (smooth(ox, ox + 3, t) * (1 - smooth(64.5, 65.5, t))).astype(np.float32)
    drops = np.zeros(n, dtype=np.float32)
    for _ in range(900):
        p = int(rng.uniform(ox, 65.5) * SR)
        L = int(0.05 * SR)
        tt2 = np.arange(L) / SR
        d = np.sin(2 * np.pi * rng.uniform(2500, 6500) * tt2) * np.exp(-tt2 * 90) * rng.uniform(0.2, 1)
        drops[p:p + L] += d[: max(0, min(L, n - p))]
    fizz = bandnoise(n, 4000, 10000) * 0.25
    bus.add_full(np.stack([drops + fizz, np.roll(drops, 1311) + fizz]) * ox_g * 0.35)

    # ---------------------------------------------------- 10) lente congelando + trincas
    gl = ev["geloLente"]
    frost_g = (smooth(gl, gl + 3.5, t) * (1 - smooth(end - 0.5, end, t))).astype(np.float32)
    crackle = sos_filter((rng.random(n) > 0.993).astype(np.float32) * white(n), "highpass", 3000, 2)
    bus.add_full(np.stack([crackle, np.roll(crackle, 501)]) * frost_g * 0.6)
    for at in ev["trincas"]:
        bus.add(sfx_glass(), at, 0.9, rng.uniform(-0.4, 0.4))

    # ---------------------------------------------------- 11) tela preta: hit final + drone que some
    bus.add(reverb(sfx_boom(5.0, 48, 24, 300, 1.0), 4.0, 0.45, seed=9), end, 0.8)
    fin = (smooth(end, end + 0.5, t) * (1 - smooth(end + 4, dur - 0.2, t)))
    tone = (np.sin(2 * np.pi * 49 * t) + 0.5 * np.sin(2 * np.pi * 73.4 * t) + 0.25 * np.sin(2 * np.pi * 98 * t)) * fin * 0.08
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
