#!/usr/bin/env python3
"""
Trilha do Short "E se as batidas do GTA 6 fossem reais?" (62 s, loop) — Projeto E se? #005

  * narração edge-tts (pt-BR-AntonioNeural, modo natural) nos tempos de short_gta/roteiro.json
    (a última frase termina exatamente em 62 s e emenda na pergunta do começo);
  * sub-bass drop no 0,0 s junto com a primeira palavra;
  * motor com trocas de marcha (rotação pela velocidade real do carro, grave na câmera lenta),
    trilha "arcade" no modo jogo com parada de fita, glitch digital na troca de modo;
  * batida real em câmera lenta (estrondo, lataria, vidro estilhaçando), coração batendo,
    boneco caindo na areia; rampa, pouso, rodas soltas, arrasto com faíscas, fogo; mar e gaivotas.
  * Os instantes vêm de build/eventos.json (gerado por eventos.mjs com a MESMA física do vídeo).

Uso: node short_gta/eventos.mjs > short_gta/build/eventos.json
     python short_gta/gerar_audio.py --out short_gta/build [--no-tts]
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


def build_sfx(cfg, ev, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    E = ev["eventos"]; fps = ev["fps"]
    ft = np.arange(len(ev["vel"])) / fps
    bus = Bus(dur)
    # ---------------- motor (liga só onde o carro está andando)
    m = np.zeros(n, dtype=np.float32)
    for a, b in [(E["jogoInicio"], E["jogoImpacto"]), (E["realInicio"], E["realImpacto"] + 0.05), (E["rampaInicio"], E["rampaPouso"])]:
        m += (smooth(a, a + 0.08, t) * (1 - smooth(b - 0.01, b + 0.04, t))).astype(np.float32)
    eng = engine(t, ft, np.array(ev["vel"]), np.array(ev["taxa"]), np.array(ev["ar"], dtype=float), m)
    bus.add_full(np.stack([eng, np.roll(eng, 60)]), 0.55)
    # ---------------- gancho: batida real em câmera lenta
    bus.add(np.stack([sub_drop(), sub_drop()]), 0.0, 1.0)
    bus.add(stretch(sfx_boom(3.0, 50, 22, 500, 1.0), 3), E["ganchoImpacto"], 0.85)
    bus.add(stretch(sfx_metal(2.0, 140), 3.5), E["ganchoImpacto"], 0.45)
    bus.add(stretch(sfx_crumble(2.0, 300, 1800), 3), E["ganchoImpacto"] + 0.05, 0.35)
    bus.add(stretch(sfx_glass(1.6), 3), E["ganchoVidro"], 0.5)
    bus.add(stretch(sfx_whoosh(1.0, 200, 1800), 2.5), E["ganchoBoneco"] - 0.4, 0.4)
    drone = (np.sin(2 * np.pi * 41 * t) + 0.5 * np.sin(2 * np.pi * 61.5 * t)) * 0.18
    bus.add_full(np.stack([drone * (1 - smooth(3.2, 3.7, t))] * 2))
    # ---------------- modo jogo: trilha arcade, batida "de brinquedo", pulo e moedinha
    J0, J1 = E["jogoInicio"], cfg["tempos"]["glitches"][0][0]
    mus = tape_stop(arcade(J1 - J0 + 0.7), J1 - J0 - 0.05, 0.6) * smooth(0, 0.3, np.arange(int((J1 - J0 + 0.7) * SR)) / SR)
    bus.add(mus, J0, 0.32)
    bus.add(sfx_boom(1.2, 90, 45, 800, 0.6), E["jogoImpacto"], 0.45)
    bus.add(sfx_metal(0.8, 300), E["jogoImpacto"], 0.3)
    bus.add(blip(330, 110, 0.25), E["jogoImpacto"] + 0.02, 0.25)
    bus.add(blip(880, 880, 0.08), E["jogoImpacto"] + 0.18, 0.18); bus.add(blip(660, 660, 0.12), E["jogoImpacto"] + 0.27, 0.18)
    nb = int(0.35 * SR); tb = np.arange(nb) / SR
    boing = np.sin(2 * np.pi * np.cumsum(200 + 900 * tb / 0.35 + 60 * np.sin(2 * np.pi * 18 * tb)) / SR) * env_ad(nb, 0.005, 0.2)
    bus.add(boing.astype(np.float32), E["jogoPulo"], 0.3)
    bus.add(blip(988, 988, 0.08), E["jogoPouso"], 0.22); bus.add(blip(1319, 1319, 0.25), E["jogoPouso"] + 0.08, 0.22)
    # ---------------- glitches de troca de modo
    for k, (a, b) in enumerate(cfg["tempos"]["glitches"]):
        g = glitch_noise(b - a, 30 + k)
        bus.add(sos_filter(g, "bandpass", [300, 6000], 2), a, 0.28 if k == 0 else 0.18, (-1) ** k * 0.3)
        bus.add(sfx_zap(0.7), a + 0.1, 0.3)
    nd = int(0.9 * SR); td = np.arange(nd) / SR
    bus.add((np.sin(2 * np.pi * np.cumsum(600 * np.exp(-td * 4) + 40) / SR) * env_ad(nd, 0.01, 0.4)).astype(np.float32), J1, 0.35)
    # ---------------- batida real (câmera lenta): estrondo, lataria, vidro, coração, boneco
    RI = E["realImpacto"]
    bus.add(stretch(sfx_boom(3.0, 55, 22, 600, 1.0), 4), RI, 1.0)
    bus.add(stretch(sfx_metal(2.0, 120), 4), RI, 0.6)
    bus.add(stretch(sfx_crumble(2.5, 320, 2000), 3), RI + 0.05, 0.5)
    bus.add(stretch(sfx_crack(0.9), 3), RI, 0.4)
    bus.add(stretch(sfx_glass(1.8), 4), E["realVidro"], 0.55, -0.2)
    bus.add(stretch(sfx_whoosh(1.2, 150, 1600), 3), E["realBoneco"] - 0.6, 0.45, 0.3)
    slow = (smooth(RI - 0.1, RI + 0.3, t) * (1 - smooth(24.0, 24.8, t))).astype(np.float32)
    under = (sos_filter(brown(n), "lowpass", 160, 3) * 3 + np.sin(2 * np.pi * 38 * t) * 0.4) * slow * 0.5
    bus.add_full(np.stack([under, under]))
    hb = RI + 0.6
    while hb < 24.2:
        bus.add(thump(52, 0.3), hb, 0.55); bus.add(thump(48, 0.3), hb + 0.22, 0.4); hb += 0.95
    bus.add(sfx_whoosh(2.6, 200, 2600), 24.4, 0.45)
    LB = E["realPousoBoneco"]
    bus.add(stretch(thump(70, 0.4), 2), LB, 0.7); bus.add(sfx_crumble(1.6, 200, 1200), LB, 0.35)
    for k, dt in enumerate([0.45, 0.9, 1.4, 1.9, 2.4]):
        if LB + dt < E["realBonecoPara"]:
            bus.add(thump(80 - k * 4, 0.25), LB + dt, 0.35 - k * 0.05); bus.add(sfx_crumble(0.6, 150, 1000), LB + dt, 0.15)
    hiss = sos_filter(white(n), "highpass", 3000, 2) * (smooth(RI + 1, RI + 3, t) * (1 - smooth(34.6, 35, t))) * 0.05
    bus.add_full(np.stack([hiss, hiss]))
    # ---------------- rampa: subida, voo, pouso, rodas, arrasto com faíscas, fogo
    bus.add(sfx_whoosh(1.0, 300, 3000), 34.75, 0.35)
    bus.add(sfx_metal(0.6, 220), E["rampaSubida"], 0.35); bus.add(thump(60, 0.3), E["rampaSubida"], 0.5)
    bus.add(sfx_whoosh(3.0, 200, 2200), E["rampaDecola"], 0.4)
    LP = E["rampaPouso"]
    bus.add(stretch(sfx_boom(3.0, 60, 24, 600, 1.0), 3), LP, 1.0)
    bus.add(stretch(sfx_metal(2.0, 110), 3), LP, 0.65)
    bus.add(stretch(sfx_crack(0.9), 2.5), LP + 0.02, 0.45)
    for k, dt in enumerate([0.3, 0.75, 1.3, 2.0, 2.9]):
        bus.add(stretch(sfx_metal(0.5, 380 + 60 * k), 2.0 if dt < 3 else 1.0), LP + dt, 0.22, (-1) ** k * 0.6)
    stop = E["rampaPara"]
    scr = (smooth(LP, LP + 0.4, t) * (1 - smooth(stop - 1.2, stop, t))).astype(np.float32)
    rate = np.interp(t, ft, np.array(ev["taxa"]))
    grind = bandnoise(n, 900, 6000) * 0.6 + sum(np.sin(2 * np.pi * f * t + k) for k, f in enumerate((733, 1187, 1610))) * 0.06
    grind = grind * rate + sos_filter(grind, "lowpass", 500, 2) * (1 - rate)
    bus.add_full(np.stack([grind * scr * 0.95, np.roll(grind, 300) * scr * 0.95]))
    for _ in range(140):
        at = rng.uniform(LP + 0.1, stop - 0.3)
        bus.add(ga.sfx_click(rng.uniform(0.2, 0.7)), at, 0.08, rng.uniform(-0.7, 0.7))
    bus.add(ga.sfx_ice_creak(1.4), stop - 0.2, 0.3)
    fire = (smooth(stop - 2, stop + 2, t)).astype(np.float32)
    crackle = np.zeros(n, dtype=np.float32)
    for _ in range(900):
        i = int(rng.uniform(stop - 2, dur) * SR); L = int(0.004 * SR)
        if i + L < n:
            crackle[i:i + L] += white(L) * rng.uniform(0.1, 0.6)
    roar = sos_filter(white(n), "lowpass", 300, 2) * 0.6
    bus.add_full(np.stack([(sos_filter(crackle, "bandpass", [800, 5000], 2) + roar) * fire * 0.55] * 2))
    # ---------------- praia: ondas e gaivotas; acorde de pôr do sol no final
    waves = sos_filter(brown(n), "lowpass", 700, 2) * (0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 6.5)) ** 2)
    beach = (smooth(24.5, 27, t) * (1 - smooth(34.6, 35.2, t)) + smooth(51.5, 54, t) * 1.3).astype(np.float32)
    bus.add_full(np.stack([waves * beach * 1.1, np.roll(waves, 4000) * beach * 1.1]))
    for at in (31.2, 33.4, 54.5, 57.8):
        bus.add(sfx_gull(), at, 0.18, rng.uniform(-0.6, 0.6))
    pad = sum(np.sin(2 * np.pi * f * t + k) for k, f in enumerate((220.0, 277.2, 329.6, 415.3))) * 0.05
    padm = (smooth(52, 55, t) * (1 - smooth(60.5, 61.8, t))).astype(np.float32)
    bus.add_full(np.stack([sos_filter(pad, "lowpass", 1500, 2) * padm] * 2))
    # ---------------- loop: riser de volta ao começo
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
