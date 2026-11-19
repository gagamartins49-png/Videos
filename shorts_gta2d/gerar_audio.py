#!/usr/bin/env python3
"""
Trilha dos Shorts 2D "E se…" tema GTA 6 (Projeto E se? #013–#015), 62 s, loop.

  * narração edge-tts (pt-BR-AntonioNeural, modo natural);
  * música procedural em camadas (piano nostálgico, caixinha de música, cordas, batida leve e
    synthwave anos 80), com o volume de cada camada e o "abafado" seguindo curvas definidas no
    módulo de cada vídeo (js/<video>.js → AUDIO), exportadas por eventos.mjs;
  * efeitos sonoros posicionados pelos "cues" do mesmo módulo (mesma linha do tempo do vídeo).

Uso: node shorts_gta2d/eventos.mjs adiado > shorts_gta2d/build/adiado/eventos.json
     python shorts_gta2d/gerar_audio.py --v adiado [--no-tts]
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
from generate_audio import (SR, Bus, bandnoise, brown, env_ad, normalize, reverb, sos_filter, white,  # noqa: E402
                            sfx_boom, sfx_crack, sfx_gull, sfx_metal, sfx_riser, sfx_siren, sfx_whoosh)
from gerar_audio import envelope_from  # noqa: E402

R = np.random.default_rng(13)
CHORDS = [(110.0, [220.0, 261.63, 329.63, 440.0]), (87.31, [174.61, 220.0, 261.63, 349.23]), (130.81, [261.63, 329.63, 392.0, 523.25]), (98.0, [196.0, 246.94, 293.66, 392.0])]
MELODY = [659.25, 587.33, 523.25, 493.88, 523.25, 440.0, 392.0, 440.0]
_cache = {}


def curve(points, t):
    p = np.array(points, dtype=np.float64)
    return np.interp(t, p[:, 0], p[:, 1]).astype(np.float32)


def piano(f, d=2.2, vel=1.0):
    key = (round(f, 2), d)
    if key not in _cache:
        n = int(d * SR); t = np.arange(n) / SR
        s = np.zeros(n, dtype=np.float32)
        for k, a in enumerate([1.0, 0.5, 0.28, 0.16, 0.09, 0.05], start=1):
            s += a * np.sin(2 * np.pi * f * k * (1 + 0.0004 * k * k) * t) * np.exp(-t * (1.6 + 0.9 * k) * (f / 300) ** 0.3)
        ham = sos_filter(white(n), "bandpass", [1000, 5000], 2) * env_ad(n, 0.0005, 0.006) * 0.15
        _cache[key] = ((s * np.clip(t / 0.004, 0, 1) + ham) * 0.5).astype(np.float32)
    return _cache[key] * vel


def musicbox(f, d=1.4):
    n = int(d * SR); t = np.arange(n) / SR
    return ((np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)) * np.exp(-t * 2.8) * 0.4).astype(np.float32)


def place(buf, sig, at):
    i0 = int(at * SR)
    if i0 >= len(buf):
        return
    m = min(len(sig), len(buf) - i0)
    buf[i0:i0 + m] += sig[:m]


def stems(dur, estilo):
    n = int(dur * SR); t = np.arange(n) / SR
    bpm = 100.0 if estilo == "synth" else 76.0
    beat = 60.0 / bpm; bar = beat * 4
    S = {k: np.zeros(n, dtype=np.float32) for k in ("piano", "caixinha", "cordas", "batida", "synth")}
    for b in range(int(dur / bar) + 1):
        t0 = b * bar; bass, arp = CHORDS[b % 4]
        place(S["piano"], piano(bass, 3.0, 0.7), t0)
        for k, idx in enumerate([0, 1, 2, 3, 2, 1, 2, 3]):
            place(S["piano"], piano(arp[idx], 1.6, 0.5 + 0.12 * (k % 4 == 0)), t0 + k * beat / 2)
        for k in range(4):
            place(S["caixinha"], musicbox(MELODY[(b * 4 + k) % 8]), t0 + k * beat)
        # synthwave: baixo em colcheias, arpejo em semicolcheias e pad
        for k in range(8):
            m = int(beat / 2 * SR); tt = np.arange(m) / SR
            place(S["synth"], ((2 * ((bass * tt) % 1) - 1) * env_ad(m, 0.005, 0.12) * 0.6).astype(np.float32), t0 + k * beat / 2)
        for k in range(16):
            m = int(beat / 4 * SR); tt = np.arange(m) / SR; f = arp[[0, 2, 3, 1][k % 4]] * 2
            place(S["synth"], (np.sign(np.sin(2 * np.pi * f * tt)) * env_ad(m, 0.002, 0.05) * 0.12).astype(np.float32), t0 + k * beat / 4)
        m = int(bar * SR); tt = np.arange(m) / SR
        pad = sum(2 * ((f * d * tt) % 1) - 1 for f in arp[:3] for d in (0.996, 1.004)) / 6
        place(S["synth"], (pad * np.minimum(1, tt / 0.3) * np.minimum(1, (bar - tt) / 0.3) * 0.35).astype(np.float32), t0)
        # batida
        kick_n = int(0.35 * SR); tk = np.arange(kick_n) / SR
        kick = (np.sin(2 * np.pi * np.cumsum(50 + 90 * np.exp(-tk * 25)) / SR) * env_ad(kick_n, 0.002, 0.11)).astype(np.float32)
        sn_n = int(0.25 * SR)
        snare = (sos_filter(white(sn_n), "bandpass", [1200, 6000], 2) * env_ad(sn_n, 0.002, 0.07) * (0.9 if estilo == "synth" else 0.4)).astype(np.float32)
        hh_n = int(0.06 * SR); hat = (sos_filter(white(hh_n), "highpass", 6000, 2) * env_ad(hh_n, 0.001, 0.02) * 0.35).astype(np.float32)
        for k in range(4):
            if k in (0, 2) or estilo == "synth":
                place(S["batida"], kick, t0 + k * beat)
            if k in (1, 3):
                place(S["batida"], snare, t0 + k * beat)
            place(S["batida"], hat, t0 + k * beat + beat / 2)
    for f in (110.0, 164.81, 220.0, 261.63, 329.63):
        for d in (0.997, 1.0, 1.004):
            ph = np.cumsum(f * d * (1 + 0.003 * np.sin(2 * np.pi * 5.2 * t + f))) / SR
            S["cordas"] += (2 * (ph % 1.0) - 1).astype(np.float32)
    S["cordas"] = sos_filter(S["cordas"], "lowpass", 1600, 2) / 15
    S["synth"] = sos_filter(S["synth"], "lowpass", 3500, 2)
    return S


def music(dur, audio):
    n = int(dur * SR); t = np.arange(n) / SR
    S = stems(dur, audio.get("estilo", "piano"))
    mix = np.zeros(n, dtype=np.float32)
    lv = {"piano": 0.55, "caixinha": 0.3, "cordas": 0.5, "batida": 0.45, "synth": 0.6}
    for k, pts in audio["ganhos"].items():
        mix += S[k] * curve(pts, t) * lv[k]
    ab = curve(audio.get("abafado", [[0, 0], [dur, 0]]), t)
    lo = sos_filter(mix, "lowpass", 900, 2)
    mix = lo * ab + mix * (1 - ab)
    out = np.stack([mix, np.roll(mix, 260)])
    out[0] = reverb(out[0], 2.2, 0.25, seed=1); out[1] = reverb(out[1], 2.2, 0.25, seed=2)
    return out


# ------------------------------------------------------------------ efeitos
def tone(f, d, env=(0.003, 0.08), kind="sin"):
    n = int(d * SR); tt = np.arange(n) / SR
    w = np.sin(2 * np.pi * f * tt) if kind == "sin" else np.sign(np.sin(2 * np.pi * f * tt)) * 0.5
    return (w * env_ad(n, *env)).astype(np.float32)


def chime(d=2.0):
    n = int(d * SR); out = np.zeros(n, dtype=np.float32)
    for k, f in enumerate([523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0]):
        place(out, musicbox(f, d - k * 0.07), k * 0.07)
    return reverb(out, 2.0, 0.4, seed=3)


def sfx(kind, d):
    n = int(max(d, 0.05) * SR); tt = np.arange(n) / SR
    if kind == "brilho": return chime(2.2)
    if kind == "chuva": return ((bandnoise(n, 1500, 9000) * 0.5 + sos_filter(brown(n), "lowpass", 400, 2) * 0.6) * np.minimum(1, tt / 0.5) * np.minimum(1, (d - tt) / 0.5)).astype(np.float32)
    if kind == "bipe": return tone(880, 0.2)
    if kind == "buzina": return np.asarray(ga.sfx_horn(0.45, 420), dtype=np.float32)
    if kind == "carimbo":
        boom = sfx_boom(1.0, 80, 40, 600, 1.0); cr = sfx_crack(0.4); boom[: len(cr)] += cr * 0.6
        return normalize(boom, 0.9)
    if kind == "fracasso":   # "uó uó uó uóóó" (trombone triste)
        out = np.zeros(int(2.6 * SR), dtype=np.float32)
        for k, f in enumerate([233.08, 220.0, 207.65, 196.0]):
            dd = 0.45 if k < 3 else 1.2; m = int(dd * SR); t2 = np.arange(m) / SR
            fv = f * (1 + (0.02 * np.sin(2 * np.pi * 6 * t2) if k == 3 else 0))
            w = sum(np.sin(2 * np.pi * np.cumsum(fv * h) / SR) / h for h in (1, 2, 3, 4))
            place(out, (w * env_ad(m, 0.04, dd * 0.5) * 0.4).astype(np.float32), k * 0.5)
        return sos_filter(out, "lowpass", 1800, 2)
    if kind == "whoosh": return sfx_whoosh(0.9, 300, 4000)
    if kind == "relogioRapido":
        out = np.zeros(n, dtype=np.float32); k = 0.0
        while k < d:
            m = int(0.03 * SR); place(out, (sos_filter(white(m), "bandpass", [2500, 7000], 2) * np.exp(-np.arange(m) / SR * 260)).astype(np.float32), k); k += max(0.06, 0.4 - 0.08 * k)
        return out
    if kind == "vento": return (bandnoise(n, 200, 1500) * (0.5 + 0.5 * np.sin(2 * np.pi * tt / 3) ** 2) * np.minimum(1, tt / 0.8) * np.minimum(1, (d - tt) / 0.8)).astype(np.float32)
    if kind == "crianca": return chime(1.4) * 0.6
    if kind == "ligaTv": return normalize(sos_filter(white(int(0.4 * SR)), "highpass", 3000, 2) * env_ad(int(0.4 * SR), 0.001, 0.05) + tone(15700, 0.4, (0.01, 0.3)) * 0.2 + tone(60, 0.4, (0.01, 0.2)) * 0.5, 0.8)
    if kind == "tremor": return (sos_filter(brown(n), "lowpass", 120, 2) * 0.8).astype(np.float32)
    if kind == "clique": return normalize(sos_filter(white(int(0.08 * SR)), "bandpass", [1500, 6000], 2) * np.exp(-np.arange(int(0.08 * SR)) / SR * 150), 0.8)
    if kind == "erro": return np.concatenate([tone(220, 0.25, (0.005, 0.15), "sq"), tone(165, 0.45, (0.005, 0.25), "sq")])
    if kind == "grilo":
        out = np.zeros(int(1.6 * SR), dtype=np.float32)
        for k in range(4): place(out, (np.sin(2 * np.pi * 4300 * np.arange(int(0.12 * SR)) / SR) * (np.sin(2 * np.pi * 40 * np.arange(int(0.12 * SR)) / SR) > 0) * 0.3).astype(np.float32), k * 0.35)
        return out
    if kind == "sugar": return sfx_riser(1.0)
    if kind == "mar": return (bandnoise(n, 200, 2500) * (0.4 + 0.6 * np.sin(2 * np.pi * tt / 4.0) ** 2) * np.minimum(1, tt / 0.5) * np.minimum(1, (d - tt) / 0.6)).astype(np.float32)
    if kind == "gaivota": return sfx_gull()
    if kind == "flamingo":
        m = int(0.5 * SR); t2 = np.arange(m) / SR
        return sos_filter((np.sign(np.sin(2 * np.pi * np.cumsum(420 + 80 * np.sin(2 * np.pi * 7 * t2)) / SR)) * env_ad(m, 0.01, 0.15)).astype(np.float32), "bandpass", [500, 3000], 2)
    if kind == "chaves":
        out = np.zeros(int(0.8 * SR), dtype=np.float32)
        for k in range(6): place(out, tone(3000 + 1500 * R.random(), 0.15, (0.001, 0.04)), 0.05 + 0.1 * k * R.random())
        return out
    if kind == "porta": return normalize(sfx_boom(0.5, 90, 50, 700, 1.0), 0.8)
    if kind == "motor":
        f = 55 + 20 * np.minimum(1, tt / 1.0) + 3 * np.sin(2 * np.pi * 7 * tt)
        return (sos_filter(2 * ((np.cumsum(f) / SR) % 1) - 1, "lowpass", 600, 2) * np.minimum(1, tt / 0.2) * np.minimum(1, (d - tt) / 0.4) * 0.8).astype(np.float32)
    if kind == "freio": return normalize(sos_filter(white(int(0.9 * SR)), "bandpass", [2500, 4500], 2) * env_ad(int(0.9 * SR), 0.02, 0.4), 0.7)
    if kind == "jacare": return normalize(sos_filter(white(int(1.0 * SR)), "bandpass", [200, 1200], 2) * env_ad(int(1.0 * SR), 0.1, 0.35), 0.7)
    if kind == "estrela": return tone(1200, 0.25) + tone(1800, 0.25) * 0.5
    if kind == "sirene": return sfx_siren(d)
    if kind == "helice": return (sos_filter(white(n), "lowpass", 500, 2) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * tt))) * np.minimum(1, tt / 0.5) * np.minimum(1, (d - tt) / 0.3) * 1.2).astype(np.float32)
    if kind == "susto":
        boom = sfx_boom(1.2, 70, 35, 500, 1.0); wh = sfx_whoosh(0.6, 500, 5000); boom[: len(wh)] += wh * 0.5
        return normalize(boom, 0.9)
    if kind == "multidao":
        out = np.zeros(n, dtype=np.float32)
        for k in range(8): out += sos_filter(white(n), "bandpass", [300 + 60 * k, 900 + 80 * k], 2) * (0.5 + 0.5 * np.sin(2 * np.pi * (0.3 + 0.2 * R.random()) * tt + k))
        return (out * 0.25 * np.minimum(1, tt / 0.5) * np.minimum(1, (d - tt) / 0.5)).astype(np.float32)
    if kind == "aplausos":
        out = np.zeros(n, dtype=np.float32)
        for _ in range(int(d * 60)):
            m = int(0.02 * SR); place(out, (sos_filter(white(m), "bandpass", [800, 5000], 2) * np.exp(-np.arange(m) / SR * 200) * R.uniform(0.3, 1)).astype(np.float32), R.uniform(0, d))
        return out * np.minimum(1, (d - tt) / 1.0)
    if kind == "flash": return normalize(sos_filter(white(int(0.3 * SR)), "highpass", 2000, 2) * env_ad(int(0.3 * SR), 0.001, 0.02) + tone(3000, 0.3, (0.05, 0.1)) * 0.2, 0.6)
    if kind == "coracao":
        out = np.zeros(n, dtype=np.float32); k = 0.0
        while k < d:
            for o, g in ((0, 1), (0.22, 0.7)): place(out, tone(55, 0.25, (0.004, 0.06)) * g, k + o)
            k += 0.55
        return out
    if kind == "instalando":
        out = np.zeros(n, dtype=np.float32); k = 0.0
        while k < d: place(out, tone(1500 + 300 * (int(k * 4) % 3), 0.06, (0.002, 0.02)) * 0.3, k); k += 0.25
        return out
    if kind == "ping": return tone(1318.5, 0.3, (0.002, 0.1)) + tone(1975.5, 0.3, (0.002, 0.08)) * 0.5
    if kind == "chatPings":
        out = np.zeros(n, dtype=np.float32)
        for k in range(int(d / 0.55)): place(out, tone(1568 + 200 * (k % 3), 0.2, (0.002, 0.06)) * 0.5, k * 0.55 + 0.2)
        return out
    if kind == "cidade":
        out = np.zeros(n, dtype=np.float32)
        for k in range(int(d * 6)): place(out, musicbox(R.choice([1046.5, 1318.5, 1568.0, 2093.0]), 1.0) * 0.3, k / 6 * (1 + 0.1 * R.random()))
        return reverb(out, 2.5, 0.4, seed=7)
    raise ValueError(kind)


def build_sfx(dur, cues):
    bus = Bus(dur)
    for c in cues:
        at, kind, gain = c[0], c[1], c[2]
        pan = c[3] if len(c) > 3 else 0.0
        d = c[4] if len(c) > 4 else 1.0
        bus.add(np.asarray(sfx(kind, d), dtype=np.float32), at, gain, pan)
    return bus.buf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--v", required=True)
    ap.add_argument("--out", default=None)
    ap.add_argument("--no-tts", action="store_true")
    args = ap.parse_args()
    out = Path(args.out or HERE / "build" / args.v); out.mkdir(parents=True, exist_ok=True)
    cfg = json.loads((HERE / f"roteiro_{args.v}.json").read_text(encoding="utf-8"))
    ev = json.loads((out / "eventos.json").read_text(encoding="utf-8"))
    dur, fps = float(cfg["duracao"]), cfg.get("fps", 30)
    print("Narração (edge-tts)…", flush=True)
    voice = ga.build_voice(cfg, out, not args.no_tts, dur)
    print("Música…", flush=True)
    mus = normalize(music(dur, ev["audio"]), 1.0)
    print("Efeitos…", flush=True)
    fx = normalize(build_sfx(dur, ev["audio"]["cues"]), 1.0)
    venv = sos_filter(np.abs(voice), "lowpass", 4, 1)
    venv = np.clip(venv / (np.max(venv) + 1e-9) * 3, 0, 1)
    bed = mus * 0.5 + fx * 0.45
    mix = normalize(np.tanh((bed * (1 - 0.4 * venv) + np.stack([voice, voice]) * 1.05) * 1.05) / np.tanh(1.05), 0.95)
    nonarr = normalize(np.tanh(bed * 1.05) / np.tanh(1.05), 0.95)
    from scipy.io import wavfile
    wavfile.write(out / "audio_short.wav", SR, (mix.T * 32767).astype(np.int16))
    wavfile.write(out / "audio_short_sem_narracao.wav", SR, (nonarr.T * 32767).astype(np.int16))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out / "audio_short.wav"), "-c:a", "libmp3lame", "-b:a", "192k", str(out / "audio_short.mp3")], check=True)
    (out / "envelope.json").write_text(json.dumps(envelope_from(voice, fps) if np.max(np.abs(voice)) > 0 else []))
    print(f"OK -> {out / 'audio_short.wav'} ({mix.shape[1] / SR:.1f}s)", flush=True)


if __name__ == "__main__":
    main()
