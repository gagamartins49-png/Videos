#!/usr/bin/env python3
"""
Trilha completa (600 s) da compilação "7 simulações do Projeto E se?":

  * narração neural pt-BR (edge-tts, pt-BR-AntonioNeural) de todos os blocos,
    posicionada nos tempos de compilacao/roteiro.json;
  * efeitos procedurais: ambiente sci-fi do laboratório, transições com glitch,
    e a trilha de cada simulação (níveis 2, 5 e 6 reaproveitam os efeitos dos
    vídeos curtos; níveis 1, 3, 4 e 7 têm efeitos novos);
  * envelope da voz a 30 fps (build/envelope.json) — faz a lente e os LEDs do
    mascote "O Interrogador" pulsarem em sincronia com a fala.

Uso:
    python compilacao/gerar_audio.py --out compilacao/build
    python compilacao/gerar_audio.py --out compilacao/build --no-tts   # teste offline
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "audio"))
sys.path.insert(0, str(HERE))
import generate_audio as ga  # noqa: E402
from generate_audio import (SR, Bus, bandnoise, brown, env_ad, normalize, reverb, rng, smooth, sos_filter, white,  # noqa: E402
                            sfx_boom, sfx_crack, sfx_crumble, sfx_glass, sfx_metal, sfx_whoosh, sfx_chirp, sfx_horn,
                            sfx_riser, sfx_ice_creak, sfx_bubble, sfx_zap)
import sfx_antigos  # noqa: E402

SIM = 65.0


def stereo(x, spread=0):
    return np.stack([x, np.roll(x, spread) if spread else x]).astype(np.float32)


# ============================================================================ laboratório e transições
def sfx_lab(dur, seed=0, sparks=False):
    n = int(dur * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(100 + seed)
    hum = (np.sin(2 * np.pi * 50 * t) * 0.5 + np.sin(2 * np.pi * 100 * t) * 0.25 + np.sin(2 * np.pi * 150.5 * t) * 0.1)
    air = sos_filter(r.standard_normal(n).astype(np.float32), "bandpass", [300, 2500], 2) * 0.12
    pad = sum(np.sin(2 * np.pi * f * t + k) for k, f in enumerate((110, 164.8, 220, 329.6))) * 0.04 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.1 * t))
    out = np.stack([hum + air + pad, hum + np.roll(air, 999) + pad]) * 0.5
    bus = Bus(dur)
    bus.add_full(out)
    for _ in range(int(dur * 1.2)):                     # bipes de computador
        at = r.uniform(0, dur - 0.2)
        f = r.choice([880, 1175, 1568, 2093])
        m = int(0.07 * SR); tt = np.arange(m) / SR
        bus.add((np.sin(2 * np.pi * f * tt) * np.exp(-tt * 40)).astype(np.float32), at, 0.06, r.uniform(-0.7, 0.7))
    if sparks:
        for _ in range(40):
            bus.add(sfx_zap(0.3 + r.random() * 0.4), r.uniform(0, dur - 0.5), 0.12, r.uniform(-0.8, 0.8))
    fade = np.minimum(1, np.minimum(t / 0.4, (dur - t) / 0.4))
    return bus.buf * fade


def sfx_transicao():
    dur = 2.4
    bus = Bus(dur)
    bus.add(sfx_riser(1.2), 0.0, 0.6)
    n = int(0.6 * SR)
    gl = white(n) * (np.random.default_rng(7).random(n // 300 + 1) > 0.5).repeat(300)[:n]
    bus.add(sos_filter(gl, "bandpass", [800, 7000], 2) * 0.8, 1.0, 0.5)
    bus.add(sfx_boom(1.4, 70, 35, 400, 0.8), 1.2, 0.6)
    return bus.buf


def sub_drop():
    m = int(2.2 * SR); tt = np.arange(m) / SR
    sweep = np.sin(2 * np.pi * np.cumsum(28 + 72 * np.exp(-tt * 3.0)) / SR) * env_ad(m, 0.003, 0.7)
    hit = sos_filter(white(m), "lowpass", 900, 2) * env_ad(m, 0.001, 0.06) * 1.5
    return normalize(np.tanh((sweep + hit) * 1.6), 1.0)


def city_amb(n, t, until):
    g = (1 - smooth(until - 2, until, t)).astype(np.float32)
    out = []
    for ch in range(2):
        traffic = sos_filter(white(n), "lowpass", 260, 3) * 0.6
        murmur = bandnoise(n, 300, 1100) * (0.6 + 0.4 * np.sin(2 * np.pi * (3.3 + ch) * t + ch)) * 0.25
        out.append((traffic + murmur) * g * 0.35)
    return np.stack(out)


# ============================================================================ níveis novos (65 s cada)
def sfx_oxigenio():
    n = int(SIM * SR); t = np.arange(n) / SR; bus = Bus(SIM)
    bus.add_full(city_amb(n, t, 10))
    for _ in range(14):
        at = rng.uniform(0.3, 8)
        for k in range(rng.integers(2, 4)):
            bus.add(sfx_chirp(), at + k * 0.12, 0.1, rng.uniform(-0.8, 0.8))
    bus.add(sfx_whoosh(4.0, 80, 900), 6.0, 0.6)                                 # o ar se vai
    bus.add(sfx_boom(1.2, 90, 50, 300, 0.6), 10.0, 0.7)                         # "pop" nos ouvidos
    quiet = (smooth(10, 11, t) * (1 - smooth(44, 44.6, t))).astype(np.float32)
    tinnitus = np.sin(2 * np.pi * 6200 * t) * 0.012 * quiet
    beat = np.zeros(n, np.float32)
    for k in np.arange(10.5, 44, 0.9):                                          # batimentos cardíacos
        for off, a in ((0, 1.0), (0.16, 0.7)):
            i = int((k + off) * SR); m = int(0.18 * SR)
            if i + m < n: beat[i:i + m] += np.sin(2 * np.pi * 48 * np.arange(m) / SR) * np.exp(-np.arange(m) / SR * 22) * a
    bus.add_full(stereo(tinnitus + beat * 0.5))
    rumble = sos_filter(brown(n), "lowpass", 160, 3) * 2.5 * smooth(17, 30, t) * (1 - smooth(44, 46, t))
    bus.add_full(stereo(rumble * 0.6))
    for _ in range(18):                                                         # concreto virando pó (abafado)
        at = rng.uniform(18, 43)
        bus.add(sos_filter(sfx_crumble(3.0, 200), "lowpass", 700, 2), at, 0.35, rng.uniform(-0.7, 0.7))
    bus.add(sfx_whoosh(3.0, 60, 3000), 43.2, 1.0)                               # o oxigênio volta de uma vez
    bus.add(reverb(sfx_boom(4.0, 50, 22, 400, 1.0), 3.0, 0.4, seed=41), 44.5, 1.0)
    storm = (smooth(44.5, 46, t) * (1 - 0.6 * smooth(52, 65, t))).astype(np.float32)
    for ch in range(2):
        bus.buf[ch] += (sos_filter(white(n), "lowpass", 900, 3) * 1.4 + bandnoise(n, 1500, 6000) * 0.5) * storm * 0.5
    return bus.buf


def sfx_calor():
    n = int(SIM * SR); t = np.arange(n) / SR; bus = Bus(SIM)
    bus.add_full(city_amb(n, t, 3))
    sizzle = (smooth(3, 20, t)).astype(np.float32)
    for ch in range(2):
        bus.buf[ch] += bandnoise(n, 3000, 9000) * 0.25 * sizzle
    blub = np.zeros(n, np.float32)
    for _ in range(500):                                                        # asfalto borbulhando
        i = int(rng.uniform(9, SIM - 1) * SR); s = sos_filter(sfx_bubble(), "lowpass", 900, 2) * rng.uniform(0.3, 1)
        blub[i:i + len(s)] += s[: max(0, min(len(s), n - i))]
    bus.add_full(stereo(blub * 0.5, 333))
    fire = (smooth(12, 20, t) * (0.6 + 0.4 * smooth(20, 45, t))).astype(np.float32)
    crackle = sos_filter((rng.random(n) > 0.985).astype(np.float32) * white(n), "bandpass", [800, 6000], 2) * 1.4
    roar = sos_filter(brown(n), "lowpass", 300, 3) * 2.0
    bus.add_full(np.stack([crackle + roar, np.roll(crackle, 917) + roar]) * fire * 0.45)
    for at in np.linspace(12.5, 16, 7):                                         # árvores pegando fogo
        bus.add(sfx_whoosh(1.4, 200, 2500), at + rng.uniform(-0.3, 0.3), 0.35, rng.uniform(-0.8, 0.8))
    for at in np.linspace(22.5, 27.5, 7):                                       # carros explodindo
        bus.add(sfx_boom(3.0, 60, 25, 500, 1.0), at + rng.uniform(-0.3, 0.3), 0.75, rng.uniform(-0.6, 0.6))
        bus.add(sfx_glass(1.0), at + 0.1, 0.2, rng.uniform(-0.6, 0.6))
    for _ in range(14):
        bus.add(sfx_metal(1.8, rng.uniform(80, 160)), rng.uniform(36, 62), 0.2, rng.uniform(-0.8, 0.8))
    lava = (smooth(44, 52, t)).astype(np.float32)
    glug = sos_filter(brown(n) * 3, "lowpass", 120, 3) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.4 * t))
    bus.add_full(stereo(glug * lava * 0.7))
    for _ in range(10):
        bus.add(sfx_crumble(3.0, 220), rng.uniform(44, 62), 0.35, rng.uniform(-0.7, 0.7))
    return bus.buf


def sfx_gravidade():
    n = int(SIM * SR); t = np.arange(n) / SR; bus = Bus(SIM)
    bus.add_full(city_amb(n, t, 8))
    # gravidade em "G": 1 -> 100 (mesma curva do js)
    gk = [(0, 1), (8, 2), (18, 5), (26, 10), (34, 20), (45, 50), (55, 100), (99, 100)]
    G = np.interp(t, [a for a, _ in gk], np.log([g for _, g in gk]))
    gn = (G / np.log(100)).astype(np.float32)
    f = 28 + 30 * gn
    drone = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)) * gn
    bus.add_full(stereo(drone * 0.35))
    press = sos_filter(white(n), "lowpass", 120, 4) * 3 * gn
    bus.add_full(stereo(press * 0.4))
    for _ in range(22):
        bus.add(sfx_ice_creak(rng.uniform(0.8, 1.8)), rng.uniform(6, 60), rng.uniform(0.2, 0.35), rng.uniform(-0.8, 0.8))   # rangidos
    for at in np.linspace(19, 26, 10):                                          # árvores e postes estalando
        bus.add(sfx_crack(0.8), at + rng.uniform(-0.4, 0.4), 0.4, rng.uniform(-0.8, 0.8))
        bus.add(sfx_metal(1.4, rng.uniform(90, 180)), at + 0.2, 0.25, rng.uniform(-0.8, 0.8))
    for at in np.linspace(26, 33, 8):                                           # carros esmagados
        bus.add(sfx_crumble(1.5, 300, 2200), at, 0.4, rng.uniform(-0.6, 0.6))
        bus.add(sfx_metal(1.0, rng.uniform(60, 120)), at, 0.3, rng.uniform(-0.6, 0.6))
    sink = (smooth(28, 40, t) * (1 - 0.5 * smooth(50, 65, t))).astype(np.float32)
    bus.add_full(stereo(sos_filter(brown(n), "lowpass", 90, 4) * 4 * sink * 0.5))
    for _ in range(12):                                                         # prédios desabando
        at = rng.uniform(34, 60)
        bus.add(sfx_boom(3.0, 50, 20, 400, 1.0), at, 0.8, rng.uniform(-0.5, 0.5))
        bus.add(sfx_crumble(3.0, 320), at + 0.1, 0.5, rng.uniform(-0.6, 0.6))
    return bus.buf


def sfx_buraco():
    n = int(SIM * SR); t = np.arange(n) / SR; bus = Bus(SIM)
    bus.add_full(city_amb(n, t, 6))
    bus.add(reverb(sfx_boom(3.0, 120, 40, 200, 0.8), 3.0, 0.5, seed=71), 3.0, 0.7)
    k = (smooth(4, 60, t) ** 1.4).astype(np.float32)
    eerie = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate((440, 466.2, 622.3))) * 0.03 * smooth(3, 6, t) * (1 - smooth(60, 62, t))
    f = 80 - 55 * smooth(25, 62, t)
    bass = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR)) * smooth(20, 35, t)
    bus.add_full(stereo((eerie + bass * 0.4) * (1 - smooth(62.5, 63.2, t))))
    for ch in range(2):                                                         # vórtice de vento crescente
        lfo = 0.6 + 0.4 * np.sin(2 * np.pi * (0.5 + 1.5 * k) * t + ch)
        vort = (sos_filter(white(n), "lowpass", 600, 3) * 1.5 + bandnoise(n, 800, 3000) * 0.8 * k) * lfo
        bus.buf[ch] += vort * k * 0.7 * (1 - smooth(62.5, 63.2, t))
    for _ in range(12):                                                         # metal sendo arrastado
        at = rng.uniform(13, 26); m = int(1.6 * SR); tt = np.arange(m) / SR
        scr = np.sin(2 * np.pi * np.cumsum(rng.uniform(1500, 2600) * (1 - 0.4 * tt / 1.6)) / SR) * env_ad(m, 0.05, 0.5) * 0.3
        bus.add((scr + sos_filter(white(m), "bandpass", [1000, 5000], 2) * env_ad(m, 0.02, 0.4) * 0.4).astype(np.float32), at, 0.3, rng.uniform(-0.7, 0.7))
    for _ in range(16):
        bus.add(sfx_crumble(3.0, 260), rng.uniform(20, 58), 0.4, rng.uniform(-0.7, 0.7))
    bus.add(sfx_riser(3.0), 59.5, 0.8)
    bus.add(reverb(sfx_boom(4.0, 40, 15, 200, 1.0), 2.5, 0.5, seed=72), 62.5, 1.0)
    return bus.buf


# ============================================================================ montagem
def level_sfx(B):
    hud = B.get("hud")
    if B.get("modulo"):
        script = json.loads((HERE / "niveis" / f"{B['modulo']}.json").read_text(encoding="utf-8"))
        fn = {"terra": sfx_antigos.build_sfx_terra, "sol": sfx_antigos.build_sfx_sol, "lua": sfx_antigos.build_sfx_lua}[B["modulo"]]
        buf = fn(script, 80.0)
        return buf[:, int(8 * SR): int(8 * SR) + int(SIM * SR)]
    return {"oxigenio": sfx_oxigenio, "calor": sfx_calor, "gravidade": sfx_gravidade, "buraco": sfx_buraco}[hud]()


def envelope_from(voice, fps):
    hop = SR // fps
    nfr = len(voice) // hop
    rms = np.sqrt(np.mean(voice[: nfr * hop].reshape(nfr, hop) ** 2, axis=1) + 1e-12)
    ref = np.percentile(rms[rms > 1e-4], 95) if np.any(rms > 1e-4) else 1
    e = np.clip(rms / ref, 0, 1)
    out = np.zeros_like(e)
    for i in range(1, len(e)):                                                  # ataque rápido, soltura suave
        out[i] = e[i] if e[i] > out[i - 1] else out[i - 1] * 0.82 + e[i] * 0.18
    return [round(float(x), 3) for x in out]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(HERE / "build"))
    ap.add_argument("--no-tts", action="store_true")
    args = ap.parse_args()
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    cfg = json.loads((HERE / "roteiro.json").read_text(encoding="utf-8"))
    fps, intro = cfg.get("fps", 30), cfg.get("intro", 15)
    total = float(sum(b["dur"] for b in cfg["blocos"]))

    # ---------------- narração
    frases, start = [], 0.0
    for B in cfg["blocos"]:
        for f in B["frases"]:
            frases.append({"inicio": round(start + f["inicio"], 3), "fim": round(start + f["fim"], 3), "texto": f["texto"]})
        start += B["dur"]
    print(f"Narração: {len(frases)} frases…", flush=True)
    voice = ga.build_voice({"voz": cfg.get("voz"), "velocidade": cfg.get("velocidade", "-4%"), "tom": cfg.get("tom", "-7Hz"), "frases": frases}, out, not args.no_tts, total)

    # ---------------- efeitos
    print("Efeitos sonoros…", flush=True)
    sfx = np.zeros((2, int(total * SR)), np.float32)

    def put(buf, at, gain=1.0):
        i0 = int(at * SR); m = min(buf.shape[1], sfx.shape[1] - i0)
        if m > 0: sfx[:, i0:i0 + m] += buf[:, :m] * gain

    start = 0.0
    for bi, B in enumerate(cfg["blocos"]):
        if not B.get("hud"):
            put(sfx_lab(B["dur"], bi, sparks=bi == len(cfg["blocos"]) - 1), start, 0.9)
        else:
            put(sfx_lab(intro + 0.3, bi), start, 0.9)
            put(sfx_transicao(), start + intro - 1.2, 0.8)
            lv = level_sfx(B)
            lv = np.tanh(normalize(lv, 1.0) * 1.4) / np.tanh(1.4)
            put(lv * 0.9, start + intro)
            print(f"  bloco {bi}: nível {B['nivel']} ({B['titulo']})", flush=True)
        start += B["dur"]
    put(np.stack([sub_drop(), sub_drop()]), 0.0, 0.9)                           # impacto grave no 0,0 s
    sfx = np.tanh(normalize(sfx, 1.0) * 1.3) / np.tanh(1.3)

    # ---------------- mixagem (ducking quando a voz fala)
    venv = sos_filter(np.abs(voice), "lowpass", 4, 1)
    venv = np.clip(venv / (np.max(venv) + 1e-9) * 3, 0, 1)
    mix = sfx * (1 - 0.5 * venv) * 0.6 + np.stack([voice, voice])
    mix = normalize(np.tanh(mix * 1.1) / np.tanh(1.1), 0.97)

    from scipy.io import wavfile
    wav = out / "audio_compilacao.wav"
    wavfile.write(wav, SR, (mix.T * 32767).astype(np.int16))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", "160k", str(out / "audio_compilacao.mp3")], check=True)
    env = envelope_from(voice, fps) if np.max(np.abs(voice)) > 0 else []
    (out / "envelope.json").write_text(json.dumps(env))
    print(f"OK -> {wav} ({mix.shape[1] / SR:.1f}s), envelope com {len(env)} quadros", flush=True)


if __name__ == "__main__":
    main()
