#!/usr/bin/env python3
"""
Trilha do Short "E se você pulasse no último segundo de um elevador despencando?" (62 s, loop) — Projeto E se? #006

  * narração edge-tts (pt-BR-AntonioNeural, modo natural) nos tempos de short_elevador/roteiro.json;
  * sub-bass drop no 0,0 s; musiquinha de elevador no "modo mito" (apito de desenho, boing, moedinha);
  * estalo do cabo, vento crescendo com a velocidade (grave na câmera lenta), coração, impacto em
    câmera lenta com vidro, campainha de alarme; garras do freio rangendo nos trilhos; passos na escada.
  * Instantes vindos de build/eventos.json (gerado por eventos.mjs com a MESMA física do vídeo).

Uso: node short_elevador/eventos.mjs > short_elevador/build/eventos.json
     python short_elevador/gerar_audio.py --out short_elevador/build [--no-tts]
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


def muzak(dur, bpm=96):
    """Musiquinha de elevador: acordes suaves de piano elétrico + baixo de bossa."""
    n = int(dur * SR); t = np.arange(n) / SR
    beat = 60 / bpm
    chords = [[261.6, 329.6, 392.0, 493.9], [220.0, 277.2, 329.6, 415.3], [293.7, 349.2, 440.0, 523.3], [196.0, 246.9, 293.7, 370.0]]
    bass = [65.4, 55.0, 73.4, 49.0]
    out = np.zeros(n, dtype=np.float32)
    bar = 4 * beat
    for b in range(int(dur / bar) + 1):
        ch, bs = chords[b % 4], bass[b % 4]
        for hit in (0, 1.5, 2.5):
            i0 = int((b * bar + hit * beat) * SR)
            if i0 >= n:
                continue
            m = min(int(1.4 * beat * SR), n - i0); tt = np.arange(m) / SR
            tone = sum(np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt) for f in ch) * np.exp(-tt * 2.5) * 0.12
            out[i0:i0 + m] += tone.astype(np.float32)
        for k, hit in enumerate((0, 1.5, 2, 3.5)):
            i0 = int((b * bar + hit * beat) * SR)
            if i0 >= n:
                continue
            m = min(int(0.45 * beat * SR), n - i0); tt = np.arange(m) / SR
            out[i0:i0 + m] += (np.sin(2 * np.pi * bs * (1.5 if k == 2 else 1) * tt) * np.exp(-tt * 6) * 0.35).astype(np.float32)
        for k in range(8):
            i0 = int((b * bar + k * beat / 2) * SR); m = min(int(0.05 * SR), n - i0)
            if m > 0:
                out[i0:i0 + m] += bandnoise(m, 4000, 9000) * np.exp(-np.arange(m) / SR * 80) * 0.05
    return sos_filter(out, "lowpass", 5000, 2)


def ding():
    n = int(1.6 * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((1318.5, 2.2), (2637, 4), (987.8, 2.6)))
    return (s * np.minimum(1, t / 0.003) * 0.4).astype(np.float32)


def twang(f=95, d=1.6):
    n = int(d * SR); t = np.arange(n) / SR
    f_t = f * (1 + 0.6 * np.exp(-t * 6)) * (1 + 0.03 * np.sin(2 * np.pi * 7 * t))
    s = sum(np.sin(2 * np.pi * np.cumsum(f_t * k) / SR) / k for k in range(1, 7))
    return normalize(s * env_ad(n, 0.002, d * 0.3), 0.9)


def slide_whistle(d, f0=2200, f1=380):
    n = int(d * SR); t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / d) * (1 + 0.02 * np.sin(2 * np.pi * 6 * t))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.1) * 0.6).astype(np.float32)


def boing(f0=160, f1=700, d=0.4):
    n = int(d * SR); tb = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(f0 + (f1 - f0) * tb / d + 60 * np.sin(2 * np.pi * 18 * tb)) / SR) * env_ad(n, 0.005, d * 0.5)).astype(np.float32)


def bell(d):
    """Campainha de alarme de elevador (martelinho batendo rápido)."""
    n = int(d * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 1960 * t) + 0.6 * np.sin(2 * np.pi * 2730 * t) + 0.3 * np.sin(2 * np.pi * 4100 * t)
    am = (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 22 * t))) * (0.6 + 0.4 * (np.sin(2 * np.pi * 0.7 * t) > -0.6))
    return (tone * am * 0.25).astype(np.float32)


def step(strength=1.0):
    m = int(0.12 * SR); tt = np.arange(m) / SR
    return ((sos_filter(white(m), "lowpass", 900, 2) * 0.8 + np.sin(2 * np.pi * 90 * tt)) * env_ad(m, 0.002, 0.03) * strength).astype(np.float32)


def build_sfx(cfg, ev, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    E = ev["eventos"]; fps = ev["fps"]
    ft = np.arange(len(ev["vel"])) / fps
    v = np.interp(t, ft, np.array(ev["vel"])); rate = np.interp(t, ft, np.array(ev["taxa"]))
    bus = Bus(dur)
    # ---------------- ambiente de cidade bem baixinho o tempo todo
    amb = sos_filter(white(n), "lowpass", 300, 3) * 0.5 + bandnoise(n, 400, 1200) * 0.12
    bus.add_full(np.stack([amb, np.roll(amb, 7000)]) * 0.25)
    # ---------------- gancho: impacto em câmera lenta
    bus.add(np.stack([sub_drop(), sub_drop()]), 0.0, 1.0)
    GI = E["ganchoImpacto"]
    bus.add(stretch(sfx_boom(3.0, 55, 22, 600, 1.0), 4), GI, 0.95)
    bus.add(stretch(sfx_metal(2.0, 150), 4), GI, 0.5)
    bus.add(stretch(sfx_glass(1.6), 3.5), GI + 0.3, 0.45)
    bus.add(stretch(boing(90, 50, 0.5), 3), GI, 0.35)
    drone = (np.sin(2 * np.pi * 41 * t) + 0.5 * np.sin(2 * np.pi * 61.5 * t)) * 0.16
    bus.add_full(np.stack([drone * (1 - smooth(3.2, 3.7, t))] * 2))
    # ---------------- modo mito: musiquinha, cabo de desenho, apito, pulo, moedinha
    M0, G1 = E["mitoInicio"], cfg["tempos"]["glitches"][0][0]
    mz = tape_stop(muzak(G1 - M0 + 0.7), G1 - M0 - 0.05, 0.6) * smooth(0, 0.3, np.arange(int((G1 - M0 + 0.7) * SR)) / SR)
    bus.add(mz, M0, 0.45)
    bus.add(ding(), M0 + 0.1, 0.3)
    bus.add(twang(220, 0.6), E["mitoEstalo"], 0.35); bus.add(blip(600, 200, 0.2), E["mitoEstalo"], 0.15)
    bus.add(slide_whistle(E["mitoImpacto"] - E["mitoEstalo"] - 0.1), E["mitoEstalo"] + 0.1, 0.3)
    bus.add(blip(523, 1046, 0.15), E["mitoPulo"], 0.2)
    bus.add(sfx_boom(0.8, 90, 50, 700, 0.5), E["mitoImpacto"], 0.35)
    for k in range(3):
        bus.add(boing(160 + 40 * k, 600 + 100 * k, 0.3), E["mitoImpacto"] + 0.05 + k * 0.3, 0.25 - 0.06 * k)
    bus.add(blip(988, 988, 0.08), E["mitoImpacto"] + 0.6, 0.22); bus.add(blip(1319, 1319, 0.25), E["mitoImpacto"] + 0.68, 0.22)
    for k in range(6):
        bus.add(step(0.6), E["mitoPorta"] + 0.1 + k * 0.35, 0.25, 0.2)
    # ---------------- glitches
    for k, (a, b) in enumerate(cfg["tempos"]["glitches"]):
        g = glitch_noise(b - a, 60 + k)
        bus.add(sos_filter(g, "bandpass", [300, 6000], 2), a, 0.26, (-1) ** k * 0.3)
        bus.add(sfx_zap(0.7), a + 0.1, 0.3)
    # ---------------- motor/zumbido do elevador antes do estalo (realidade e freio)
    for a, b in [(E["realInicio"], E["realEstalo"]), (E["freioInicio"], E["freioEstalo"])]:
        hm = (smooth(a, a + 0.3, t) * (1 - smooth(b - 0.02, b + 0.05, t))).astype(np.float32)
        hum = (np.sin(2 * np.pi * 100 * t) * 0.5 + np.sin(2 * np.pi * 200 * t) * 0.2 + bandnoise(n, 200, 900) * 0.3) * hm * 0.35
        bus.add_full(np.stack([hum, hum]))
    # ---------------- estalos do cabo (real e com freio)
    for at in (E["realEstalo"], E["freioEstalo"]):
        bus.add(twang(70, 2.2), at, 0.7); bus.add(sfx_crack(0.9), at, 0.6); bus.add(sfx_metal(1.4, 160), at + 0.03, 0.45)
        bus.add(sfx_whoosh(0.8, 400, 3000), at + 0.05, 0.3, 0.4)
    # ---------------- vento e trilhos durante as quedas (grave em câmera lenta)
    wind = bandnoise(n, 150, 3500) * np.clip(v / 34, 0, 1) ** 1.6 * 1.4
    wind = wind * rate + sos_filter(wind, "lowpass", 350, 2) * (1 - rate)
    rail = bandnoise(n, 2500, 7000) * np.clip(v / 34, 0, 1) * 0.35 * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * t) ** 2)
    rail = rail * rate + sos_filter(rail, "lowpass", 900, 2) * (1 - rate)
    falling = ((t > E["realEstalo"]) & (t < E["realImpacto"])) | ((t > E["freioEstalo"]) & (t < E["freioTrava"])) | ((t > E["mitoEstalo"]) & (t < E["mitoImpacto"]))
    fm = sos_filter(falling.astype(np.float32), "lowpass", 20, 1)
    bus.add_full(np.stack([(wind + rail) * fm, (np.roll(wind, 300) + rail) * fm]) * 0.7)
    # coração enquanto flutua
    hb = 19.0
    while hb < 27.6:
        bus.add(thump(52, 0.3), hb, 0.5); bus.add(thump(48, 0.3), hb + 0.22, 0.36); hb += 0.9
    # ---------------- impacto real em câmera lenta + alarme
    RI = E["realImpacto"]
    bus.add(stretch(sfx_boom(3.0, 55, 22, 600, 1.0), 5), RI, 1.0)
    bus.add(stretch(sfx_metal(2.0, 120), 5), RI, 0.6)
    bus.add(stretch(sfx_crumble(2.5, 320, 2000), 3), RI + 0.1, 0.5)
    bus.add(stretch(sfx_glass(1.8), 4), RI + 0.15, 0.5, -0.2)
    under = sos_filter(brown(n), "lowpass", 160, 3) * 3 * (smooth(RI - 0.1, RI + 0.3, t) * (1 - smooth(33.0, 34.0, t))) * 0.45
    bus.add_full(np.stack([under, under]))
    bus.add(bell(36.6 - 33.8), 33.8, 0.35, 0.3)
    bus.add(sos_filter(bell(33.8 - (RI + 0.5)), "lowpass", 700, 2), RI + 0.5, 0.25, 0.3)
    # ---------------- freio: garras travando e rangendo
    BT, BP = E["freioTrava"], E["freioPara"]
    bus.add(sfx_metal(0.8, 300), BT, 0.5); bus.add(thump(70, 0.3), BT, 0.5)
    sc = (smooth(BT, BT + 0.1, t) * (1 - smooth(BP - 0.2, BP + 0.05, t))).astype(np.float32)
    grind = bandnoise(n, 1200, 7000) * 0.7 + sum(np.sin(2 * np.pi * f * t + k) for k, f in enumerate((1730, 2390, 3110))) * 0.08
    rg = np.maximum(rate, 0.55)
    grind = grind * rg + sos_filter(grind, "lowpass", 1200, 2) * (1 - rg)
    bus.add_full(np.stack([grind * sc * 2.0, np.roll(grind, 200) * sc * 2.0]))
    for _ in range(90):
        bus.add(ga.sfx_click(rng.uniform(0.2, 0.7)), rng.uniform(BT, BP), 0.08, rng.uniform(-0.7, 0.7))
    bus.add(sfx_boom(0.9, 70, 40, 500, 0.6), BP, 0.4); bus.add(ga.sfx_ice_creak(1.2), BP + 0.2, 0.25)
    buzz = (np.sin(2 * np.pi * 120 * t) + 0.3 * np.sign(np.sin(2 * np.pi * 120 * t))) * 0.03 * (smooth(BP, BP + 0.5, t) * (1 - smooth(51.6, 52, t)))
    bus.add_full(np.stack([buzz, buzz]))
    # ---------------- final: porta da escada, passos, acorde calmo e riser para o loop
    FI = E["finalInicio"]
    bus.add(ga.sfx_ice_creak(0.9), FI + 0.2, 0.25)
    for k in range(9):
        bus.add(step(0.8), FI + 0.7 + k * 0.36, 0.3, -0.2 + 0.05 * k)
    pad = sum(np.sin(2 * np.pi * f * t + k) for k, f in enumerate((261.6, 329.6, 392.0, 493.9))) * 0.05
    padm = (smooth(52, 54, t) * (1 - smooth(60.4, 61.8, t))).astype(np.float32)
    bus.add_full(np.stack([sos_filter(pad, "lowpass", 1500, 2) * padm] * 2))
    bus.add(ding(), 52.2, 0.18)
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
