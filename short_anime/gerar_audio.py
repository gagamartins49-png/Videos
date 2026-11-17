#!/usr/bin/env python3
"""
Trilha do Short "E se o Goku fosse parar no universo do Naruto?" (62 s, loop) — Projeto E se? #011

  * narração edge-tts (pt-BR-AntonioNeural, modo natural, ritmo animado);
  * música épica estilo anime 100% procedural: taikos, cordas em ostinato, shamisen
    (Karplus-Strong) em escala pentatônica, coral sintético na ilusão, riser na transformação;
  * efeitos: choques, socos, "puf" dos clones, kunais assobiando, explosões, portal, queda,
    correntes, aura (ronco que cresce com a curva de poder do vídeo), vidro, raio de energia;
  * instantes e curvas vindos de build/eventos.json (mesma linha do tempo do vídeo).

Uso: node short_anime/eventos.mjs > short_anime/build/eventos.json
     python short_anime/gerar_audio.py --out short_anime/build [--no-tts]
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
                            sfx_boom, sfx_crack, sfx_crumble, sfx_glass, sfx_metal, sfx_riser, sfx_whoosh)
from gerar_audio import envelope_from, sub_drop  # noqa: E402

R = np.random.default_rng(11)
BPM = 132.0
BEAT = 60.0 / BPM


def stretch(x, k):
    x = np.asarray(x, dtype=np.float32); n = int(len(x) * k)
    return np.interp(np.arange(n) / k, np.arange(len(x)), x).astype(np.float32)


def thump(f=55, d=0.35, drop=40):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(f + drop * np.exp(-t * 30)) / SR) * env_ad(n, 0.003, d * 0.3)).astype(np.float32)


def taiko(big=True):
    d = 0.9 if big else 0.4
    n = int(d * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum((62 if big else 140) + 60 * np.exp(-t * 25)) / SR) * env_ad(n, 0.002, 0.22 if big else 0.08)
    skin = sos_filter(white(n), "bandpass", [150, 1800] if big else [500, 4000], 2) * env_ad(n, 0.001, 0.03)
    return normalize(body + skin * 0.6, 0.9)


def pluck(f, d=0.9, bright=0.6):
    """Shamisen/koto (Karplus-Strong)."""
    n = int(d * SR); p = max(2, int(SR / f))
    buf = R.uniform(-1, 1, p).astype(np.float32)
    out = np.zeros(n, dtype=np.float32)
    for i in range(n):
        out[i] = buf[i % p]
        j = i % p; buf[j] = 0.996 * (bright * buf[j] + (1 - bright) * buf[(j + 1) % p])
    out += sos_filter(white(n), "highpass", 3000, 2) * env_ad(n, 0.0005, 0.01) * 0.4
    return out * env_ad(n, 0.001, d * 0.45)


def saw(f, n, det=(1.0, 1.005, 0.995)):
    t = np.arange(n) / SR
    return sum(2 * ((f * k * t + 0.3 * j) % 1.0) - 1 for j, k in enumerate(det)) / len(det)


def poof(d=0.45):
    n = int(d * SR); t = np.arange(n) / SR
    s = sos_filter(white(n), "bandpass", [250, 2600], 2) * env_ad(n, 0.004, 0.09)
    s += np.sin(2 * np.pi * np.cumsum(300 * np.exp(-t * 9) + 60) / SR) * env_ad(n, 0.002, 0.06) * 0.6
    return normalize(s, 0.8)


def whistle(d=0.6):
    n = int(d * SR); t = np.arange(n) / SR
    f = 2600 - 1200 * t / d
    return normalize((np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + bandnoise(n, 1500, 5000) * 0.6) * np.sin(np.pi * t / d) ** 2, 0.6)


def music(dur, ev, poder, ilus):
    n = int(dur * SR); t = np.arange(n) / SR
    E = ev["eventos"]
    # intensidade por trecho (0..1)
    inten = np.interp(t, [0, 3.6, 4.0, 10.8, 11.4, 19.6, 20.0, 31.0, 31.6, 33.0, 42.0, 45.8, 46.0, 49, 55.6, 59.6, 59.8, 62],
                      [1.0, 1.0, 0.45, 0.6, 0.4, 0.55, 0.9, 0.9, 0.35, 0.2, 0.3, 0.95, 1.0, 0.75, 0.7, 0.5, 0.75, 1.0])
    out = np.zeros((2, n), dtype=np.float32)
    ill = np.interp(t, np.arange(len(ilus)) / ev["fps"], ilus).astype(np.float32)
    pw = np.interp(t, np.arange(len(poder)) / ev["fps"], poder).astype(np.float32)
    # ---------------- cordas (ostinato em semicolcheias), progressão Am F C G (Em na ilusão)
    roots = [110.0, 87.31, 130.81, 98.0]
    nn = int(BEAT / 4 * SR)
    strings = np.zeros(n, dtype=np.float32)
    k = 0
    while k * nn < n:
        bar = int(k // 16) % 4; f = roots[bar] * (2 if k % 4 in (1, 3) else 1) * (1.5 if k % 8 == 6 else 1)
        i0 = k * nn; m = min(nn, n - i0)
        strings[i0:i0 + m] += saw(f, m)[:m] * env_ad(m, 0.004, 0.06)
        k += 1
    strings = sos_filter(strings, "lowpass", 2200, 2)
    pad = np.zeros(n, dtype=np.float32)
    for b in range(int(dur / (BEAT * 4)) + 1):
        i0 = int(b * BEAT * 4 * SR); m = min(int(BEAT * 4 * SR), n - i0)
        if m <= 0: break
        r = roots[b % 4]
        for mul in (1, 1.2 if b % 4 == 0 else 1.25, 1.5, 2):
            pad[i0:i0 + m] += saw(r * mul, m) * 0.25
    pad = sos_filter(pad, "lowpass", 1400, 2)
    # ---------------- taikos
    drums = np.zeros(n, dtype=np.float32)
    big, small = taiko(True), taiko(False)
    nb = int(dur / BEAT) + 1
    for b in range(nb):
        at = b * BEAT; i0 = int(at * SR)
        pat = [1, 0, 0.6, 0, 1, 0.5, 0.6, 0.8]
        g = pat[b % 8]
        if g:
            m = min(len(big), n - i0)
            if m > 0: drums[i0:i0 + m] += big[:m] * g
        for h in (0.5,) if b % 2 else (0.5, 0.75):
            j0 = int((at + h * BEAT) * SR); m = min(len(small), n - j0)
            if m > 0: drums[j0:j0 + m] += small[:m] * 0.35
    # ---------------- shamisen: riff pentatônico
    scale = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33]
    riff = [0, 2, 3, 4, 3, 2, 4, 5, 7, 5, 4, 3, 2, 3, 0, None]
    sham = np.zeros(n, dtype=np.float32)
    cache = {}
    for k in range(int(dur / (BEAT / 2)) + 1):
        idx = riff[k % len(riff)]
        if idx is None: continue
        f = scale[idx]
        if f not in cache: cache[f] = pluck(f, 0.7)
        i0 = int(k * BEAT / 2 * SR); m = min(len(cache[f]), n - i0)
        if m > 0: sham[i0:i0 + m] += cache[f][:m]
    # ---------------- coral sintético dissonante (ilusão)
    choir = np.zeros(n, dtype=np.float32)
    for f in (164.8, 174.6, 246.9, 329.6, 349.2):
        ph = np.cumsum(f * (1 + 0.003 * np.sin(2 * np.pi * 4.5 * t + f))) / SR
        choir += np.sin(2 * np.pi * ph) + 0.3 * np.sin(4 * np.pi * ph)
    choir = sos_filter(choir, "bandpass", [200, 2500], 2) * 0.25
    # ---------------- mistura por seção
    normal = 1 - ill
    s_str = strings * (0.15 + 0.6 * inten) * normal * (1 - 0.6 * (pw > 0.05))
    s_pad = pad * (0.25 + 0.3 * inten) * normal
    s_dr = drums * inten ** 1.5 * normal
    s_sh = sham * np.clip(inten - 0.3, 0, 1) * normal * (1 - 0.8 * (pw > 0.05)) * 0.7
    # na ilusão: coral + batida de coração em taiko grave
    heart = np.zeros(n, dtype=np.float32)
    hb = E["ilusao"][0]
    while hb < E["vidro"]:
        for o, g in ((0, 1), (0.25, 0.6)):
            i0 = int((hb + o) * SR); m = min(len(big), n - i0)
            if m > 0: heart[i0:i0 + m] += big[:m] * g
        hb += max(0.42, 0.95 - 0.05 * (hb - E["ilusao"][0]))
    s_ill = (choir * 0.45 + heart * 0.5) * ill
    # transformação: rufar acelerando + riser
    roll = np.zeros(n, dtype=np.float32)
    rt = E["poder"][0]
    while rt < E["vidro"]:
        i0 = int(rt * SR); m = min(len(small), n - i0)
        if m > 0: roll[i0:i0 + m] += small[:m] * (0.3 + 0.7 * (rt - E["poder"][0]) / (E["vidro"] - E["poder"][0]))
        rt += max(0.06, 0.3 - 0.07 * (rt - E["poder"][0]))
    mono_a = s_str + s_pad * 0.7 + s_sh + s_ill + roll * 0.8
    out[0] = mono_a + s_dr + np.roll(s_sh, 400) * 0.3
    out[1] = np.roll(mono_a, 220) + s_dr
    out[0] = reverb(out[0], 1.8, 0.22, seed=1); out[1] = reverb(out[1], 1.8, 0.22, seed=2)
    return out


def build_sfx(cfg, ev, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    E = ev["eventos"]; fps = ev["fps"]
    poder = np.interp(t, np.arange(len(ev["poder"])) / fps, ev["poder"]).astype(np.float32)
    bus = Bus(dur)
    # ambiente: vento suave
    wind = bandnoise(n, 200, 1200) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 7.0) ** 2) * 0.12
    bus.add_full(np.stack([wind, np.roll(wind, 7000)]))
    # whooshes
    for w in E["whoosh"]:
        bus.add(sfx_whoosh(0.9, 300, 4000), w - 0.1, 0.55)
    bus.add(sfx_whoosh(0.7, 400, 5000), E["choque"] - 0.5, 0.6)
    bus.add(sfx_whoosh(0.7, 400, 5000), E["choque"] - 0.5 + dur, 0.6)
    # choques/impactos
    for (t0, amp, d) in E["impactos"]:
        if amp >= 0.6:
            bus.add(np.stack([sub_drop(), sub_drop()]), t0, 0.55 * amp)
            bus.add(sfx_boom(2.0, 70, 30, 500, 1.0), t0, 0.7 * amp)
        bus.add(sfx_crack(0.6), t0, 0.6 * amp + 0.15)
        bus.add(thump(80, 0.3), t0, 0.7 * amp + 0.2)
    # golpes nos clones (soco) + "puf"
    for a in E["ataques"]:
        bus.add(sfx_whoosh(0.25, 800, 5000), a - 0.18, 0.4)
    for p in ev["puffs"]:
        if p["kind"] in ("fumaca", "poeira"):
            bus.add(poof(), p["t"], 0.45 if p["kind"] == "fumaca" else 0.3, float(R.uniform(-0.4, 0.4)))
    # portal e queda
    p0, p1 = E["portal"]
    bus.add(sfx_riser(p1 - p0 + 0.3), p0 - 0.2, 0.5)
    hum_n = int(2.6 * SR); th = np.arange(hum_n) / SR
    hum = (np.sin(2 * np.pi * 110 * th) * 0.4 + np.sin(2 * np.pi * 165 * th + np.sin(2 * np.pi * 6 * th)) * 0.3) * np.sin(np.pi * th / 2.6)
    bus.add(hum.astype(np.float32), p1, 0.25)
    q0, q1 = E["queda"]
    nq = int((q1 - q0) * SR); tq = np.arange(nq) / SR
    fall = np.sin(2 * np.pi * np.cumsum(1800 - 1300 * tq / (q1 - q0)) / SR) * (tq / (q1 - q0)) ** 2 * 0.3 + bandnoise(nq, 300, 3000) * (tq / (q1 - q0)) ** 2
    bus.add(fall.astype(np.float32), q0, 0.5)
    bus.add(sfx_crumble(2.5), q1 + 0.05, 0.5)
    # selo das mãos (estalo) e clones
    bus.add(sfx_crack(0.3), E["selo"], 0.35)
    # kunais e explosões
    k0, k1 = E["kunaiVoo"]
    for i in range(3):
        bus.add(whistle(k1 - k0 + 0.1), k0 + 0.04 * i, 0.35, -0.3 + 0.3 * i)
    for i in range(3):
        bus.add(sfx_boom(2.2, 60, 28, 900, 1.0), E["explosao"] + 0.07 * i, 0.55)
    bus.add(sfx_crumble(2.0, density=200), E["explosao"] + 0.2, 0.3)
    # virada: olho e ilusão
    ne = int(1.6 * SR); te = np.arange(ne) / SR
    ting = (np.sin(2 * np.pi * 1760 * te) + 0.5 * np.sin(2 * np.pi * 2637 * te)) * np.exp(-te * 2.5)
    bus.add(ting.astype(np.float32), E["olho"], 0.25)
    i0 = E["ilusao"][0]
    bus.add(stretch(sfx_riser(1.0), 1.0)[::-1].copy(), i0 - 0.2, 0.4)
    bus.add(stretch(sfx_boom(2.5, 45, 22, 300, 1.0), 1.4), i0 + 0.5, 0.6)
    # selamento e correntes
    s0 = E["selamento"][0]
    bus.add(sfx_riser(0.6), s0 - 0.3, 0.3)
    c0, c1 = E["correntes"]
    for j in range(8):
        bus.add(sfx_metal(0.8, 300 + 60 * (j % 4)), c0 + j * (c1 - c0) / 8, 0.3, -0.5 + j / 8)
    rt = c1 + 0.4
    while rt < E["poder"][0]:
        bus.add(sfx_metal(0.5, 260 + 40 * R.random()), rt, 0.13, float(R.uniform(-0.6, 0.6))); rt += 0.35 + 0.3 * R.random()
    for j in range(10):
        bus.add(sfx_metal(1.0, 240 + 50 * (j % 5)), E["quebraCorrente"] + 0.04 * j, 0.32, -0.8 + 0.16 * j)
    # aura: ronco + estalos elétricos que crescem com a curva de poder
    rumble = sos_filter(brown(n), "lowpass", 160, 2) * 2.0 + bandnoise(n, 200, 900) * 0.5
    crackle = sos_filter(white(n), "highpass", 2500, 2) * (R.random(n) > 0.997) * 5
    aura = (rumble + crackle) * poder
    bus.add_full(np.stack([aura * 0.3, np.roll(aura, 300) * 0.3]))
    bus.add(sfx_riser(E["vidro"] - E["poder"][0]), E["poder"][0], 0.55)
    bus.add(np.stack([sub_drop(), sub_drop()]), E["poder"][0] + 0.15, 0.5)
    # vidro
    bus.add(sfx_glass(2.2), E["vidro"], 0.9)
    bus.add(sfx_boom(2.5, 60, 25, 600, 1.0), E["vidro"], 0.7)
    # carga e raio
    a0, a1 = E["carga"]
    nc = int((a1 - a0) * SR); tc = np.arange(nc) / SR
    chg = np.sin(2 * np.pi * np.cumsum(300 + 900 * (tc / (a1 - a0)) ** 2) / SR) * (tc / (a1 - a0)) * 0.5 + bandnoise(nc, 2000, 7000) * (tc / (a1 - a0)) ** 2 * 0.4
    bus.add(chg.astype(np.float32), a0, 0.5)
    r0, r1 = E["raio"]
    nr = int((r1 - r0 + 0.5) * SR); tr = np.arange(nr) / SR
    beam = (bandnoise(nr, 300, 6000) + np.sign(np.sin(2 * np.pi * 95 * tr)) * 0.3) * env_ad(nr, 0.01, 0.25)
    bus.add(normalize(beam, 0.8), r0, 0.6)
    # tronco caindo
    bus.add(thump(120, 0.25, 60), E["substitui"] + 0.45, 0.5)
    # final: riser para o loop
    bus.add(sfx_riser(2.0), dur - 2.0, 0.45)
    return bus.buf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(HERE / "build"))
    ap.add_argument("--eventos", default=None)
    ap.add_argument("--no-tts", action="store_true")
    ap.add_argument("--voz", default=None, help="voz do edge-tts (substitui a do roteiro)")
    ap.add_argument("--tag", default="", help="sufixo dos arquivos de saída, ex.: voz_masculina")
    args = ap.parse_args()
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    cfg = json.loads((HERE / "roteiro.json").read_text(encoding="utf-8"))
    ev = json.loads(Path(args.eventos or out / "eventos.json").read_text(encoding="utf-8"))
    dur, fps = float(cfg["duracao"]), cfg.get("fps", 30)
    if args.voz:
        cfg["voz"] = args.voz
    sfx_name = f"_{args.tag}" if args.tag else ""
    vout = out / (args.tag or "voz_padrao"); vout.mkdir(parents=True, exist_ok=True)
    print(f"Narração (edge-tts, {cfg['voz']})…", flush=True)
    voice = ga.build_voice(cfg, vout, not args.no_tts, dur)
    print("Música…", flush=True)
    mus = music(dur, ev, ev["poder"], ev["ilusao"])
    print("Efeitos sonoros…", flush=True)
    sfx = build_sfx(cfg, ev, dur)
    sfx = np.tanh(normalize(sfx, 1.0) * 1.4) / np.tanh(1.4)
    mus = normalize(mus, 1.0)
    venv = sos_filter(np.abs(voice), "lowpass", 4, 1)
    venv = np.clip(venv / (np.max(venv) + 1e-9) * 3, 0, 1)
    bed = sfx * 0.6 + mus * 0.42
    mix = normalize(np.tanh((bed * (1 - 0.45 * venv) + np.stack([voice, voice]) * 1.05) * 1.1) / np.tanh(1.1), 0.97)
    nonarr = normalize(np.tanh(bed * 1.1) / np.tanh(1.1), 0.97)
    from scipy.io import wavfile
    wavfile.write(out / f"audio_short{sfx_name}.wav", SR, (mix.T * 32767).astype(np.int16))
    wavfile.write(out / "audio_short_sem_narracao.wav", SR, (nonarr.T * 32767).astype(np.int16))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out / f"audio_short{sfx_name}.wav"), "-c:a", "libmp3lame", "-b:a", "192k", str(out / f"audio_short{sfx_name}.mp3")], check=True)
    env = envelope_from(voice, fps) if np.max(np.abs(voice)) > 0 else []
    (out / "envelope.json").write_text(json.dumps(env))
    print(f"OK -> {out / f'audio_short{sfx_name}.wav'} ({mix.shape[1] / SR:.1f}s), envelope com {len(env)} quadros", flush=True)


if __name__ == "__main__":
    main()
