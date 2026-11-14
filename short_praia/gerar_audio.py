#!/usr/bin/env python3
"""
Trilha do Short "E se você pulasse do helicóptero no mar, igual no GTA 6?" (62 s, loop) — Projeto E se? #008

  * narração edge-tts (pt-BR-AntonioNeural, modo natural) nos tempos de short_praia/roteiro.json;
  * sub-bass drop no 0,0 s; rotor do helicóptero, vento na queda (grave na câmera lenta),
    trilha "arcade" no modo jogo, pancada de barriga na água em câmera lenta, mergulho limpo
    do atleta, aplausos, moto aquática, ondas e gaivotas o tempo todo.
  * Instantes vindos de build/eventos.json (gerado por eventos.mjs com a MESMA física do vídeo).

Uso: node short_praia/eventos.mjs > short_praia/build/eventos.json
     python short_praia/gerar_audio.py --out short_praia/build [--no-tts]
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


def square(f, d, duty=0.5):
    n = int(d * SR); t = np.arange(n) / SR
    return np.where((t * f) % 1 < duty, 1.0, -1.0).astype(np.float32)


def blip(f0, f1, d=0.12, vol=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * t / d
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    return (s * np.minimum(1, t / 0.003) * np.exp(-t * 14) * vol).astype(np.float32)


def thump(f=55, d=0.35):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (f + 40 * np.exp(-t * 30)) * t) * env_ad(n, 0.004, 0.09)).astype(np.float32)


def engine(t, ft, vel, taxa, air, mask):
    v = np.interp(t, ft, vel); r = np.interp(t, ft, taxa); a = np.interp(t, ft, air)
    gears = [0, 15, 27, 38, 48, 62]
    rpm = np.full(len(t), 7000.0)
    for g in range(5):
        lo, hi = gears[g], gears[g + 1]
        sel = (v >= lo) & (v < hi)
        rpm[sel] = 1500 + 5500 * (v[sel] - lo) / (hi - lo)
    rpm[v < 0.5] = 900
    rpm = np.minimum(rpm + 2200 * a, 7800)
    rpm = sos_filter(rpm, "lowpass", 12, 1)                        # sem saltos bruscos
    f = rpm / 60 * 3 * np.maximum(r, 0.08)
    ph = np.cumsum(f) / SR
    s = sum(np.sin(2 * np.pi * k * ph) / k for k in range(1, 8)) + 0.5 * np.sin(np.pi * ph)
    s = np.tanh(1.8 * s)
    comb = bandnoise(len(t), 120, 2600) * (0.5 + 0.5 * np.sin(2 * np.pi * ph)) * 0.6
    load = 0.55 + 0.45 * np.clip(np.gradient(v) * SR / 12, 0, 1)   # acelerando = mais alto
    out = sos_filter((s * 0.55 + comb) * load, "lowpass", 3200, 2)
    wind = bandnoise(len(t), 250, 3000) * np.clip(v / 55, 0, 1) ** 2 * 0.5
    wind = wind * r + sos_filter(wind, "lowpass", 400, 2) * (1 - r)
    return ((out + wind) * mask).astype(np.float32)


def arcade(dur, bpm=128):
    n = int(dur * SR); t = np.arange(n) / SR
    beat = 60 / bpm; step = beat / 4
    arp = [220.0, 261.6, 329.6, 392.0, 329.6, 261.6, 440.0, 392.0]
    bass = [55.0, 55.0, 43.65, 49.0]
    out = np.zeros(n, dtype=np.float32)
    k = 0
    while k * step < dur:
        i0 = int(k * step * SR); m = min(int(step * SR), n - i0)
        if m <= 0:
            break
        tt = np.arange(m) / SR
        f = arp[k % 8] * (2 if (k // 16) % 2 else 1)
        out[i0:i0 + m] += (np.where((tt * f) % 1 < 0.25, 1, -1) * np.exp(-tt * 18) * 0.35)[:m]
        if k % 4 == 0:
            fb = bass[(k // 16) % 4]
            mm = min(int(beat * SR), n - i0); tb = np.arange(mm) / SR
            out[i0:i0 + mm] += (np.where((tb * fb) % 1 < 0.5, 1, -1) * np.exp(-tb * 4) * 0.5)
            out[i0:i0 + mm] += np.sin(2 * np.pi * 50 * tb) * np.exp(-tb * 25) * 0.9      # bumbo
        if k % 8 == 4:
            out[i0:i0 + m] += bandnoise(m, 2000, 8000) * np.exp(-tt * 30) * 0.3              # caixa
        k += 1
    return sos_filter(out, "lowpass", 2600, 2)


def tape_stop(x, start, d=0.6):
    """Desacelera o fim como fita parando."""
    n = len(x); t = np.arange(n) / SR
    p = np.where(t < start, t, start + (t - start) - 0.5 * (t - start) ** 2 / d)
    p = np.where(t > start + d, start + d / 2, p)
    y = np.interp(p * SR, np.arange(n), x)
    return (y * (1 - smooth(start + d * 0.7, start + d, t))).astype(np.float32)


def glitch_noise(d, seed):
    r = np.random.default_rng(seed)
    n = int(d * SR); out = np.zeros(n, dtype=np.float32); i = 0
    while i < n:
        L = int(r.uniform(0.015, 0.06) * SR)
        if r.random() < 0.6:
            seg = r.standard_normal(L).astype(np.float32)
            hold = int(r.integers(4, 40)); seg = np.repeat(seg[::hold], hold)[:L]        # bitcrush
            seg += np.sign(np.sin(2 * np.pi * r.uniform(200, 2000) * np.arange(L) / SR)) * 0.5
            out[i:i + L] = seg[: max(0, min(L, n - i))] * r.uniform(0.3, 1.0)
        i += L
    return out


def applause(d):
    n = int(d * SR); out = np.zeros(n, dtype=np.float32)
    for _ in range(int(d * 90)):
        i = int(rng.uniform(0, 1) ** 0.8 * (n - 2000)); L = int(0.012 * SR)
        out[i:i + L] += bandnoise(L, 900, 5000) * np.exp(-np.arange(L) / (L / 4)) * rng.uniform(0.3, 1)
    return (out * (1 - smooth(d * 0.6, d, np.arange(n) / SR))).astype(np.float32)


def rotor(n, t, dist):
    """Helicóptero: batida das pás (~5,5 Hz) + turbina; dist (0 perto .. 1 longe) por amostra."""
    blade = 5.5
    ph = (t * blade) % 1.0
    chop = np.exp(-ph * 9) * sos_filter(white(n), "lowpass", 260, 2) * 3 + np.exp(-ph * 14) * np.sin(2 * np.pi * 55 * t) * 0.6
    turb = bandnoise(n, 2500, 6000) * 0.12 + np.sin(2 * np.pi * 1180 * t) * 0.03
    near = 1 / (1 + 3 * dist)
    return (chop * near + turb * near ** 2).astype(np.float32)


def slap(strength=1.0):
    """Pancada na água (barriga): estalo seco + jato de água + respingos."""
    n = int(2.2 * SR); t = np.arange(n) / SR
    crack = sos_filter(white(n), "bandpass", [600, 5000], 2) * env_ad(n, 0.0005, 0.03) * 2.2
    body = np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 25)) * t) * env_ad(n, 0.002, 0.12) * 1.2
    wash = sos_filter(white(n), "bandpass", [250, 3500], 2) * env_ad(n, 0.03, 0.55) * 0.9
    drops = np.zeros(n, dtype=np.float32)
    for _ in range(140):
        i = int(rng.uniform(0.15, 1.9) * SR); L = int(0.02 * SR)
        if i + L < n:
            f = rng.uniform(600, 2400); tt = np.arange(L) / SR
            drops[i:i + L] += np.sin(2 * np.pi * f * (1 + 4 * tt) * tt) * np.exp(-tt * 160) * rng.uniform(0.1, 0.5)
    return normalize(crack + body + wash + drops, 0.95 * strength)


def plop():
    """Entrada limpa de pé: 'tchum' grave e borbulhas."""
    n = int(1.5 * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(180 * np.exp(-t * 6) + 60) / SR) * env_ad(n, 0.003, 0.2)
    bub = np.zeros(n, dtype=np.float32)
    for _ in range(40):
        i = int(rng.uniform(0.05, 1.2) * SR); L = int(0.03 * SR)
        if i + L < n:
            tt = np.arange(L) / SR; f = rng.uniform(300, 900)
            bub[i:i + L] += np.sin(2 * np.pi * f * (1 + 6 * tt) * tt) * np.exp(-tt * 90) * rng.uniform(0.1, 0.4)
    wash = sos_filter(white(n), "bandpass", [300, 2500], 2) * env_ad(n, 0.02, 0.3) * 0.5
    return normalize(s + bub + wash, 0.85)


def build_sfx(cfg, ev, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    E = ev["eventos"]; fps = ev["fps"]
    ft = np.arange(len(ev["vel"])) / fps
    vel, taxa, air = np.array(ev["vel"]), np.array(ev["taxa"]), np.array(ev["ar"], dtype=float)
    v = np.interp(t, ft, vel); rate = np.interp(t, ft, taxa); a = np.interp(t, ft, air)
    bus = Bus(dur)
    # ---------------- mar o tempo todo
    waves = sos_filter(brown(n), "lowpass", 700, 2) * (0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 6.5)) ** 2)
    bus.add_full(np.stack([waves, np.roll(waves, 4000)]) * 0.55)
    # ---------------- helicóptero: perto nas cenas dele, longe nas outras, indo embora no final
    T = cfg["tempos"]
    dist = np.full(n, 0.9)
    for a0, b0 in [(T["jogo"]["inicio"], E["jogoPulo"] + 1.2), (T["realidade"]["inicio"], E["realPulo"] + 1.0)]:
        dist = np.minimum(dist, 1 - (smooth(a0, a0 + 0.1, t) * (1 - smooth(b0, b0 + 1.5, t))) * 0.9)
    dist = np.where(t > T["atleta"]["inicio"], 1.6, dist)
    dist = np.where(t > T["final"]["inicio"], 1.0 + (t - T["final"]["inicio"]) * 0.4, dist)
    rot = rotor(n, t, dist)
    rot = rot * rate + sos_filter(rot, "lowpass", 300, 2) * (1 - rate)
    bus.add_full(np.stack([rot, np.roll(rot, 120)]) * 0.55)
    # ---------------- vento durante as quedas
    wind = bandnoise(n, 200, 4000) * a * np.clip(v / 34, 0.15, 1) ** 1.3 * 1.4
    wind = wind * rate + sos_filter(wind, "lowpass", 400, 2) * (1 - rate)
    bus.add_full(np.stack([wind, np.roll(wind, 200)]) * 0.55)
    # ---------------- gancho
    bus.add(np.stack([sub_drop(), sub_drop()]), 0.0, 1.0)
    bus.add(stretch(slap(1.0), 4), E["ganchoImpacto"], 0.95)
    drone = (np.sin(2 * np.pi * 41 * t) + 0.5 * np.sin(2 * np.pi * 61.5 * t)) * 0.16
    bus.add_full(np.stack([drone * (1 - smooth(3.2, 3.7, t))] * 2))
    # ---------------- modo jogo
    J0, G1 = E["jogoInicio"], T["glitches"][0][0]
    mus = tape_stop(arcade(G1 - J0 + 0.7), G1 - J0 - 0.05, 0.6) * smooth(0, 0.3, np.arange(int((G1 - J0 + 0.7) * SR)) / SR)
    bus.add(mus, J0, 0.28)
    bus.add(blip(523, 1046, 0.15), E["jogoPulo"], 0.18)
    bus.add(plop(), E["jogoAgua"], 0.45)
    bus.add(blip(988, 988, 0.08), E["jogoSobe"] + 0.3, 0.22); bus.add(blip(1319, 1319, 0.25), E["jogoSobe"] + 0.38, 0.22)
    for k in range(8):
        bus.add(sos_filter(white(int(0.15 * SR)), "bandpass", [400, 2000], 2) * env_ad(int(0.15 * SR), 0.01, 0.05) * 0.5, E["jogoSobe"] + 0.8 + k * 0.42, 0.25, (-1) ** k * 0.3)
    # ---------------- glitches
    for k, (a0, b0) in enumerate(T["glitches"]):
        g = glitch_noise(b0 - a0, 80 + k)
        bus.add(sos_filter(g, "bandpass", [300, 6000], 2), a0, 0.26 if k == 0 else 0.18, (-1) ** k * 0.3)
        bus.add(sfx_zap(0.7), a0 + 0.1, 0.3)
    nd = int(0.9 * SR); td = np.arange(nd) / SR
    bus.add((np.sin(2 * np.pi * np.cumsum(600 * np.exp(-td * 4) + 40) / SR) * env_ad(nd, 0.01, 0.4)).astype(np.float32), G1, 0.35)
    # ---------------- realidade: queda longa em câmera lenta, coração, pancada
    hb = E["realPulo"] + 1.0
    while hb < T["realidade"]["impacto"] - 0.6:
        bus.add(thump(52, 0.3), hb, 0.45); bus.add(thump(48, 0.3), hb + 0.22, 0.32); hb += 0.95
    RI = T["realidade"]["impacto"]
    bus.add(stretch(slap(1.0), 5), RI, 1.0); bus.add(stretch(sfx_boom(1.5, 70, 35, 500, 0.8), 3), RI, 0.55)
    under = sos_filter(brown(n), "lowpass", 150, 3) * 3 * (smooth(RI - 0.1, RI + 0.3, t) * (1 - smooth(29.5, 30.6, t))) * 0.45
    bus.add_full(np.stack([under, under]))
    # ---------------- atleta: salto limpo, aplausos, moto aquática
    AE = T["atleta"]["entrada"]
    bus.add(sfx_whoosh(1.0, 300, 2500), E["atletaPulo"] + 0.2, 0.25)
    bus.add(stretch(plop(), 2.5), AE, 0.7)
    bus.add(applause(4.5), E["atletaSobe"] + 0.3, 0.4, -0.2)
    jm = (smooth(T["atleta"]["inicio"], T["atleta"]["inicio"] + 1, t) * (1 - smooth(51.5, 52.2, t))).astype(np.float32)
    jet = (np.tanh(2 * sum(np.sin(2 * np.pi * f * t) / k for k, f in ((1, 48), (2, 96), (3, 144)))) * 0.5 + bandnoise(n, 300, 1500) * 0.3) * jm * 0.12
    bus.add_full(np.stack([jet * 0.7, jet]))
    # ---------------- final: gaivotas, acorde de pôr do sol, riser para o loop
    for at in (31.5, 34.0, 47.5, 54.5, 57.8):
        bus.add(sfx_gull(), at, 0.18, rng.uniform(-0.6, 0.6))
    pad = sum(np.sin(2 * np.pi * f * t + k) for k, f in enumerate((220.0, 277.2, 329.6, 415.3))) * 0.05
    padm = (smooth(52, 55, t) * (1 - smooth(60.5, 61.8, t))).astype(np.float32)
    bus.add_full(np.stack([sos_filter(pad, "lowpass", 1500, 2) * padm] * 2))
    bus.add(sfx_riser(4.0), dur - 4.0, 0.4)
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
    print("Eventos:", {k: round(v, 2) for k, v in ev["eventos"].items()}, flush=True)
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
