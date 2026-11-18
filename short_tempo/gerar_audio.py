#!/usr/bin/env python3
"""
Trilha do Short "E se você pudesse voltar no tempo?" (62 s, loop) — Projeto E se? #012

  * narração edge-tts (pt-BR-AntonioNeural, modo natural, mais lenta e emotiva);
  * piano nostálgico procedural (Am–F–C–G): abafado e esparso no presente (adulto cansado),
    aberto e brilhante em 2013, com caixinha de música, cordas e batida leve; volta a ficar
    abafado e cresce no "play" até o pico emocional da lágrima;
  * ambiente: chuva e relógio (2026), passarinhos à tarde e grilos à noite (2013), mar e cidade
    dentro do jogo, fita rebobinando, papel rasgando, brilho mágico, bipes da contagem, clique do play.

Uso: node short_tempo/eventos.mjs > short_tempo/build/eventos.json
     python short_tempo/gerar_audio.py --out short_tempo/build [--no-tts]
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
from generate_audio import SR, Bus, bandnoise, brown, env_ad, normalize, reverb, smooth, sos_filter, white, sfx_whoosh  # noqa: E402
from gerar_audio import envelope_from  # noqa: E402

R = np.random.default_rng(12)
BPM = 72.0
BEAT = 60.0 / BPM
BAR = BEAT * 4
CHORDS = [  # (baixo, arpejo)
    (110.0, [220.0, 261.63, 329.63, 440.0]),     # Am
    (87.31, [174.61, 220.0, 261.63, 349.23]),    # F
    (130.81, [261.63, 329.63, 392.0, 523.25]),   # C
    (98.0, [196.0, 246.94, 293.66, 392.0]),      # G
]
MELODY = [659.25, 587.33, 523.25, 493.88, 523.25, 440.0, 392.0, 440.0]

_cache = {}


def piano(f, d=2.4, vel=1.0):
    key = (round(f, 2), d)
    if key not in _cache:
        n = int(d * SR); t = np.arange(n) / SR
        s = np.zeros(n, dtype=np.float32)
        for k, a in enumerate([1.0, 0.5, 0.28, 0.16, 0.09, 0.05], start=1):
            fk = f * k * (1 + 0.0004 * k * k)
            s += a * np.sin(2 * np.pi * fk * t) * np.exp(-t * (1.6 + 0.9 * k) * (f / 300) ** 0.3)
        s += 0.2 * np.sin(2 * np.pi * f * 1.002 * t) * np.exp(-t * 1.2)
        ham = sos_filter(white(n), "bandpass", [1000, 5000], 2) * env_ad(n, 0.0005, 0.006) * 0.15
        att = np.clip(t / 0.004, 0, 1)
        _cache[key] = ((s * att + ham) * 0.5).astype(np.float32)
    return _cache[key] * vel


def musicbox(f, d=1.6):
    n = int(d * SR); t = np.arange(n) / SR
    return ((np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6) + 0.15 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 12)) * np.exp(-t * 2.8) * 0.4).astype(np.float32)


def strings(dur, freqs, swell):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.zeros(n, dtype=np.float32)
    for f in freqs:
        for det in (0.997, 1.0, 1.004):
            ph = np.cumsum(f * det * (1 + 0.003 * np.sin(2 * np.pi * 5.2 * t + f))) / SR
            s += (2 * (ph % 1.0) - 1).astype(np.float32)
    return sos_filter(s, "lowpass", 1600, 2) * swell / (len(freqs) * 3)


def chirp_bird():
    d = 0.35; n = int(d * SR); t = np.arange(n) / SR
    f = 3200 + 1400 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 3)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 2 * 0.3).astype(np.float32)


def rip(d=0.7):
    n = int(d * SR); t = np.arange(n) / SR
    grit = (R.random(n) > 0.6).astype(np.float32) * white(n)
    return normalize(sos_filter(grit, "bandpass", [1200, 7000], 2) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 7 * t))) * env_ad(n, 0.01, 0.25), 0.8)


def chime_gliss(d=2.4):
    n = int(d * SR); out = np.zeros(n, dtype=np.float32)
    notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0, 2093.0]
    for k, f in enumerate(notes):
        i0 = int(k * 0.07 * SR); m = musicbox(f, d - k * 0.07)
        out[i0:i0 + len(m)] += m[: n - i0]
    return reverb(out, 2.5, 0.4, seed=3)


def tape_rewind(d):
    n = int(d * SR); t = np.arange(n) / SR
    f = 300 + 2500 * (t / d) ** 0.5 + 200 * np.sin(2 * np.pi * 13 * t)
    whir = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 + bandnoise(n, 800, 6000) * 0.5
    clicks = sos_filter(white(n), "highpass", 3000, 2) * (R.random(n) > 0.998) * 3
    return normalize((whir + clicks) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.6, 0.7)


def beep(f=880, d=0.18):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * env_ad(n, 0.003, 0.06) * 0.6).astype(np.float32)


def music(dur, E):
    n = int(dur * SR); t = np.arange(n) / SR
    bus = Bus(dur)
    kid0, kid1 = 19.9, 42.2
    nb = int(dur / BAR) + 1
    for b in range(nb):
        t0 = b * BAR
        bass, arp = CHORDS[b % 4]
        adult = t0 < 16.9 or 46.6 <= t0 < 50.4 or t0 >= 58.5
        peak = 50.4 <= t0 < 58.5
        # baixo
        bus.add(piano(bass, 3.4, 0.55 if adult else 0.7), t0, 0.8)
        if adult:
            for k, f in enumerate(arp[:3]):
                bus.add(piano(f, 3.0, 0.45), t0 + 0.02 * k, 0.6, -0.2 + 0.2 * k)
            bus.add(piano(arp[3], 2.0, 0.35), t0 + BEAT * 2, 0.5, 0.2)
        else:
            pat = [0, 1, 2, 3, 2, 1, 2, 3]
            for k in range(8):
                f = arp[pat[k]] * (2 if peak and k in (3, 7) else 1)
                bus.add(piano(f, 1.8, 0.5 + 0.15 * (k % 4 == 0)), t0 + k * BEAT / 2, 0.55, -0.3 + 0.08 * k)
        # caixinha de música (infância e pico)
        if (kid0 <= t0 < 31 or peak) and t0 >= kid0 - 0.1:
            for k in range(4):
                bus.add(musicbox(MELODY[(b * 4 + k) % len(MELODY)] * (1 if not peak else 1)), t0 + k * BEAT, 0.45 if peak else 0.35, 0.3)
    buf = bus.buf
    # ---- cordas: na infância (leve) e no pico (forte)
    sw = np.interp(t, [0, 19.9, 22, 30.8, 33, 42, 44, 46.6, 50.5, 52, 56, 58.5, 62], [0, 0, 0.35, 0.35, 0.6, 0.6, 0.8, 0.15, 0.2, 1.0, 1.0, 0.3, 0.0]).astype(np.float32)
    st = strings(dur, [110.0, 164.81, 220.0, 261.63, 329.63], sw)
    buf += np.stack([st, np.roll(st, 300)]) * 0.9
    # ---- batida leve (só nas noites jogando e no crescimento)
    drums = np.zeros(n, dtype=np.float32)
    kick_n = int(0.4 * SR); tk = np.arange(kick_n) / SR
    kick = (np.sin(2 * np.pi * np.cumsum(55 + 80 * np.exp(-tk * 25)) / SR) * env_ad(kick_n, 0.002, 0.12)).astype(np.float32)
    sh_n = int(0.08 * SR); shaker = (sos_filter(white(sh_n), "highpass", 5000, 2) * env_ad(sh_n, 0.003, 0.025)).astype(np.float32)
    bt = 31.0
    while bt < 46.4:
        i0 = int(bt * SR)
        drums[i0:i0 + kick_n] += kick[: max(0, min(kick_n, n - i0))]
        for h in (0.5, 1.0, 1.5):
            j0 = int((bt + h * BEAT / 2 * 2) * SR) if False else int((bt + h * BEAT) * SR)
            drums[j0:j0 + sh_n] += shaker[: max(0, min(sh_n, n - j0))] * 0.4
        bt += BEAT * 2
    buf += np.stack([drums, drums]) * 0.45
    # ---- abafado no presente: passa-baixas variável (2026 abafado, 2013 aberto)
    cutoff = np.interp(t, [0, 16.0, 19.9, 20.5, 46.6, 47.0, 50.5, 51.2, 58.5, 61.5, 62], [900, 900, 2500, 9000, 9000, 1100, 1100, 9000, 9000, 1200, 900])
    lo = np.stack([sos_filter(buf[c], "lowpass", 900, 2) for c in range(2)])
    k = np.clip((cutoff - 900) / 8100, 0, 1).astype(np.float32)
    buf = lo * (1 - k) + buf * k
    vol = np.interp(t, [0, 46.6, 47.0, 49.4, 50.4, 50.6, 62], [1, 1, 0.35, 0.3, 0.3, 1.1, 1]).astype(np.float32)
    buf *= vol
    buf[0] = reverb(buf[0], 2.6, 0.3, seed=1); buf[1] = reverb(buf[1], 2.6, 0.3, seed=2)
    return buf


def build_sfx(dur, E, cenas):
    n = int(dur * SR); t = np.arange(n) / SR
    bus = Bus(dur)
    def win(a, b, f=0.4):
        return (smooth(a - f, a + f, t) * (1 - smooth(b - f, b + f, t))).astype(np.float32)
    adult = np.clip(win(0, 16.9) + win(46.6, 62.5), 0, 1)
    # chuva + relógio (presente)
    rain = (bandnoise(n, 1500, 9000) * 0.5 + sos_filter(brown(n), "lowpass", 400, 2) * 0.6) * adult
    drops = sos_filter(white(n), "bandpass", [2000, 6000], 2) * (R.random(n) > 0.9993) * 2 * adult
    bus.add_full(np.stack([rain * 0.22 + drops * 0.3, np.roll(rain, 5000) * 0.22 + np.roll(drops, 3000) * 0.3]))
    tk = 0.5
    while tk < dur:
        if adult[min(n - 1, int(tk * SR))] > 0.5 and not (50.4 < tk < 56):
            m = int(0.03 * SR); tt = np.arange(m) / SR
            bus.add((sos_filter(white(m), "bandpass", [2500, 7000], 2) * np.exp(-tt * 260)).astype(np.float32), tk, 0.06, 0.4)
        tk += 1.0
    # rebobinar
    r0, r1 = E["rebobina"]
    bus.add(tape_rewind(r1 - r0), r0, 0.55)
    bus.add(chime_gliss(2.0)[::-1].copy(), r1 - 1.6, 0.35)
    # tarde de 2013: passarinhos; noite: grilos
    for k in range(9):
        bus.add(chirp_bird(), 20.3 + k * 0.9 + R.random() * 0.4, 0.12, float(R.uniform(-0.7, 0.7)))
    ni = win(27.5, 30.85) + win(36.4, 42.2) * 0.6
    cr = np.sin(2 * np.pi * 4200 * t) * (np.sin(2 * np.pi * 30 * t) > 0.6) * (np.sin(2 * np.pi * 0.9 * t) > 0) * 0.05 * ni
    bus.add_full(np.stack([cr, np.roll(cr, 900)]))
    # porta / papel / brilho
    m = int(0.5 * SR); tt = np.arange(m) / SR
    bus.add((sos_filter(white(m), "lowpass", 500, 2) * env_ad(m, 0.01, 0.15)).astype(np.float32), E["portaAbre"], 0.3)
    bus.add(rip(0.8), E["rasga"], 0.6, -0.2); bus.add(rip(0.5), E["rasga"] + 0.35, 0.5, 0.3)
    bus.add(chime_gliss(3.0), E["revela"] - 0.1, 0.6)
    # dentro do jogo: mar e cidade
    gw = win(33.6, 36.4)
    waves = bandnoise(n, 200, 2500) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 4.0) ** 2) * gw * 0.35
    bus.add_full(np.stack([waves, np.roll(waves, 4000)]))
    bus.add(sfx_whoosh(1.6, 300, 3000), E["mergulho"] - 0.8, 0.45)
    bus.add(sfx_whoosh(2.5, 200, 2000), 34.6, 0.25, 0.5)   # carro passando
    # risadas -> sininhos alegres
    for r in E["risadas"]:
        for k in range(3):
            bus.add(musicbox([1046.5, 1318.5, 1568.0][k], 0.8), r + 0.08 * k, 0.12, -0.3 + 0.3 * k)
    # crescendo: anos passando
    for k in range(4):
        bus.add(sfx_whoosh(0.9, 400, 4000), 42.9 + k * 0.85, 0.25, -0.4 + 0.25 * k)
    # contagem: bipes e o play
    for s in (46.4, 47.4, 48.4):
        if s >= 46.6:
            bus.add(beep(880), s, 0.25)
    bus.add(beep(1320, 0.4), E["jogar"], 0.3)
    m = int(0.08 * SR)
    click = (sos_filter(white(m), "bandpass", [1500, 6000], 2) * np.exp(-np.arange(m) / SR * 150) + np.sin(2 * np.pi * 160 * np.arange(m) / SR) * np.exp(-np.arange(m) / SR * 60) * 0.5).astype(np.float32)
    bus.add(click, E["aperta"], 0.6)
    bus.add(chime_gliss(3.5), E["aperta"] + 0.05, 0.5)
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
    E = ev["eventos"]
    print("Narração (edge-tts)…", flush=True)
    voice = ga.build_voice(cfg, out, not args.no_tts, dur)
    print("Música…", flush=True)
    mus = normalize(music(dur, E), 1.0)
    print("Efeitos…", flush=True)
    sfx = normalize(build_sfx(dur, E, ev["cenas"]), 1.0)
    venv = sos_filter(np.abs(voice), "lowpass", 4, 1)
    venv = np.clip(venv / (np.max(venv) + 1e-9) * 3, 0, 1)
    bed = mus * 0.55 + sfx * 0.4
    mix = normalize(np.tanh((bed * (1 - 0.4 * venv) + np.stack([voice, voice]) * 1.05) * 1.05) / np.tanh(1.05), 0.95)
    nonarr = normalize(np.tanh(bed * 1.05) / np.tanh(1.05), 0.95)
    from scipy.io import wavfile
    wavfile.write(out / "audio_short.wav", SR, (mix.T * 32767).astype(np.int16))
    wavfile.write(out / "audio_short_sem_narracao.wav", SR, (nonarr.T * 32767).astype(np.int16))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out / "audio_short.wav"), "-c:a", "libmp3lame", "-b:a", "192k", str(out / "audio_short.mp3")], check=True)
    env = envelope_from(voice, fps) if np.max(np.abs(voice)) > 0 else []
    (out / "envelope.json").write_text(json.dumps(env))
    print(f"OK -> {out / 'audio_short.wav'} ({mix.shape[1] / SR:.1f}s)", flush=True)


if __name__ == "__main__":
    main()
