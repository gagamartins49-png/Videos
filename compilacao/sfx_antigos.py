"""
Efeitos sonoros procedurais dos 3 vídeos curtos anteriores (Terra parando,
Sol apagando e Lua caindo), reaproveitados na compilação. Cada função gera
80 s de trilha alinhada com a linha do tempo original da simulação; a
compilação usa o trecho de 8 s a 73 s (os mesmos 65 s mostrados na tela).
Gerado a partir do histórico do repositório (audio/generate_audio.py).
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "audio"))
from generate_audio import *  # noqa: F401,F403  (helpers: Bus, smooth, sfx_*, rng, SR...)
import numpy as np  # noqa: E402


def build_sfx_terra(script, dur):
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


def build_sfx_sol(script, dur):
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
    amb_g = (smooth(0, 0.05, t) * (1 - smooth(dark - 0.05, dark + 0.25, t))).astype(np.float32)
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
    fin = smooth(end, end + 0.5, t) * (1 + 0.6 * smooth(76, dur, t))   # cresce até o loop
    tone = (np.sin(2 * np.pi * 49 * t) + 0.5 * np.sin(2 * np.pi * 73.4 * t) + 0.25 * np.sin(2 * np.pi * 98 * t)) * fin * 0.08
    bus.add_full(np.stack([tone, tone]))

    # ---------------------------------------------------- 12) SUB-BASS DROP no 0,0 s (retenção) + riser que leva de volta ao início (loop)
    m = int(2.2 * SR)
    tt = np.arange(m) / SR
    sweep = np.sin(2 * np.pi * np.cumsum(28 + 72 * np.exp(-tt * 3.0)) / SR) * env_ad(m, 0.003, 0.7)
    hit = sos_filter(white(m), "lowpass", 900, 2) * env_ad(m, 0.001, 0.06) * 1.5
    bus.add(normalize(np.tanh((sweep + hit) * 1.6), 1.0), ev.get("subDrop", 0.0), 1.15)
    bus.add(sfx_riser(3.0), dur - 3.0, 0.4)

    return bus.buf


def build_sfx_lua(script, dur):
    """Trilha de efeitos para "E se a Lua caísse na Terra?" (tempos em roteiro.json)."""
    ev = script["eventos"]
    n = int(dur * SR)
    t = np.arange(n) / SR
    bus = Bus(dur)
    end = ev["telaPreta"]
    brk = ev["luaQuebra"]
    f0, f1 = ev["ondaFogo"]
    i0, i1 = ev["inundacao"]

    # ---------------------------------------------------- 1) orla ao entardecer: ondas, gaivotas, trânsito leve
    amb = (smooth(0, 0.05, t) * (1 - smooth(11, 16, t))).astype(np.float32)
    for ch in range(2):
        swell = 0.55 + 0.45 * np.sin(2 * np.pi * (0.11 + 0.02 * ch) * t + ch) ** 2
        surf = sos_filter(white(n), "lowpass", 700, 3) * 1.4 * swell + bandnoise(n, 1500, 5000) * 0.25 * swell
        traffic = sos_filter(white(n), "lowpass", 220, 3) * 0.4
        bus.buf[ch] += (surf + traffic) * amb * 0.35
    for _ in range(9):
        bus.add(sfx_gull(), rng.uniform(0.5, 11), rng.uniform(0.15, 0.3), rng.uniform(-0.8, 0.8))
    for at, pan in [(1.5, -0.5), (4.8, 0.4), (8.1, -0.3), (10.6, 0.5)]:
        bus.add(sfx_whoosh(2.2, 120, 1400), at, 0.25, pan)

    # ---------------------------------------------------- 2) a Lua se aproxima: drone grave crescente + tremores
    dg = (smooth(9, 14, t) * (0.5 + 0.5 * smooth(14, brk, t)) * (1 - smooth(f1, f1 + 0.3, t))).astype(np.float32)
    rise = 40 + 25 * smooth(12, brk, t)
    drone = (np.sin(2 * np.pi * np.cumsum(rise) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(rise * 1.5) / SR)
             + 0.3 * np.sin(2 * np.pi * np.cumsum(rise * 2.02) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.09 * t)))
    bus.add_full(np.stack([drone, drone * 0.95]) * dg * 0.13)
    quake = sos_filter(white(n), "lowpass", 90, 4) * 3 * (smooth(16, brk, t) * (1 - smooth(brk + 1, brk + 4, t)))
    bus.add_full(np.stack([quake, quake]) * 0.5)

    # ---------------------------------------------------- 3) maré invadindo a cidade + sirenes
    flood = (smooth(i0, i0 + 4, t) * (1 - 0.5 * smooth(i1, i1 + 6, t)) * (1 - smooth(f1, f1 + 0.3, t))).astype(np.float32)
    for ch in range(2):
        surge = 0.6 + 0.4 * np.sin(2 * np.pi * (0.17 + 0.03 * ch) * t + ch * 1.7)
        rush = sos_filter(white(n), "lowpass", 1200, 3) * 1.6 + bandnoise(n, 2000, 7000) * 0.4
        bus.buf[ch] += rush * surge * flood * 0.45
    s0, s1 = ev["sirenes"]
    sir = sfx_siren(s1 - s0 + 2) * np.concatenate([smooth(0, 2, np.arange(int((s1 - s0 + 2) * SR)) / SR)])
    sir *= 1 - smooth(s1 - s0, s1 - s0 + 2, np.arange(len(sir)) / SR)
    bus.add(reverb(sir.astype(np.float32), 2.0, 0.5, seed=31), s0, 0.12, -0.5)
    bus.add(reverb(np.roll(sir, 9000).astype(np.float32), 2.0, 0.5, seed=32), s0 + 1.3, 0.08, 0.6)
    for _ in range(14):
        bus.add(sfx_metal(1.2, rng.uniform(150, 300)), rng.uniform(16, 36), rng.uniform(0.08, 0.18), rng.uniform(-0.8, 0.8))
    bus.add(sfx_zap(0.9), ev["apagao"], 0.35)

    # ---------------------------------------------------- 4) limite de Roche: a Lua racha e explode
    for at in ev["rachaduras"]:
        bus.add(reverb(sfx_rock_crack(), 2.5, 0.45, seed=33), at, 0.7, rng.uniform(-0.3, 0.3))
    bus.add(sfx_riser(3.0), brk - 3.0, 0.45)
    bus.add(reverb(sfx_boom(6.0, 45, 18, 220, 1.0), 4.5, 0.5, seed=34), brk, 1.0)
    bus.add(reverb(sfx_crumble(6.0, 220, 900), 4.0, 0.5, seed=35), brk + 0.3, 0.6)

    # ---------------------------------------------------- 5) anel de fogo e gravidade anômala (flutuação)
    ring = (smooth(brk + 0.5, brk + 6, t) * (1 - smooth(f1, f1 + 0.3, t))).astype(np.float32)
    for ch in range(2):
        roar = sos_filter(brown(n), "lowpass", 300, 3) * 2.5 + bandnoise(n, 400, 1600) * 0.4
        bus.buf[ch] += roar * ring * 0.35
    fl0, fl1 = ev["flutuacao"]
    m = int((fl1 - fl0) * SR)
    tt = np.arange(m) / SR
    eerie = sum(np.sin(2 * np.pi * f * (1 + 0.15 * tt / tt[-1]) * tt + k) for k, f in enumerate((220, 277.2, 329.6, 440))) * 0.08
    bus.add(reverb((eerie * smooth(0, 2, tt) * (1 - smooth(m / SR - 1.5, m / SR, tt))).astype(np.float32), 3.0, 0.5, seed=36), fl0, 0.6)
    for _ in range(18):
        bus.add(sfx_ice_creak(rng.uniform(0.8, 1.6)), rng.uniform(fl0, fl1), rng.uniform(0.15, 0.3), rng.uniform(-0.8, 0.8))
    for _ in range(10):
        bus.add(sfx_bubble() * 2, rng.uniform(fl0, fl0 + 3), 0.2, rng.uniform(-0.6, 0.6))   # carros saindo da água

    # ---------------------------------------------------- 6) chuva de meteoros
    for im in ev["impactos"]:
        at = im["t"]
        bus.add(sfx_meteor(1.7), at - 1.7, 0.7, rng.uniform(-0.5, 0.5))
        if im["tipo"] == "mar":
            m2 = int(3.0 * SR)
            spl = sos_filter(white(m2), "lowpass", 2500, 2) * env_ad(m2, 0.01, 0.6)
            bus.add(normalize(spl + sfx_boom(3.0, 55, 25, 400, 1.0)[:m2], 0.9), at, 0.85, rng.uniform(-0.3, 0.6))
        else:
            bus.add(sfx_boom(3.5, 60, 22, 500, 1.0), at, 1.0, rng.uniform(-0.4, 0.4))
            bus.add(sfx_crumble(3.5, 320), at + 0.2, 0.55, rng.uniform(-0.6, 0.6))
            bus.add(sfx_glass(1.4), at + 0.3, 0.25, rng.uniform(-0.6, 0.6))
    burn = (smooth(50.5, 54, t) * (1 - smooth(f1, f1 + 0.3, t))).astype(np.float32)
    crackle = sos_filter((rng.random(n) > 0.985).astype(np.float32) * white(n), "bandpass", [800, 6000], 2) * 1.2
    bus.add_full(np.stack([crackle + sos_filter(brown(n), "lowpass", 250, 2), np.roll(crackle, 917) + sos_filter(brown(n), "lowpass", 250, 2)]) * burn * 0.35)

    # ---------------------------------------------------- 7) impacto gigante + onda de choque de fogo
    bus.add(reverb(sfx_sonic_boom(), 3.5, 0.45, seed=37), f0, 1.0)
    wave = (smooth(f0, f1, t) ** 2 * (1 - smooth(f1 + 0.1, f1 + 0.6, t))).astype(np.float32)
    for ch in range(2):
        r = sos_filter(white(n), "lowpass", 2500, 2) * 1.5 + sos_filter(brown(n), "lowpass", 150, 3) * 3
        bus.buf[ch] += r * wave * 0.9
    after = (smooth(f1 + 0.3, f1 + 0.8, t) * (1 - smooth(71.5, 72.6, t))).astype(np.float32)
    muff = sos_filter(brown(n) * 2, "lowpass", 160, 4)
    bus.add_full(np.stack([muff, muff]) * after * 0.6)

    # ---------------------------------------------------- 8) tela preta: hit final + drone que cresce até o loop
    bus.add(reverb(sfx_boom(5.0, 48, 24, 300, 1.0), 4.0, 0.45, seed=9), end, 0.8)
    fin = smooth(end, end + 0.5, t) * (1 + 0.6 * smooth(76, dur, t))
    tone = (np.sin(2 * np.pi * 41 * t) + 0.5 * np.sin(2 * np.pi * 61.7 * t) + 0.25 * np.sin(2 * np.pi * 82 * t)) * fin * 0.08
    bus.add_full(np.stack([tone, tone]))

    # ---------------------------------------------------- 9) SUB-BASS DROP no 0,0 s (retenção) + riser que leva de volta ao início (loop)
    m = int(2.2 * SR)
    tt = np.arange(m) / SR
    sweep = np.sin(2 * np.pi * np.cumsum(28 + 72 * np.exp(-tt * 3.0)) / SR) * env_ad(m, 0.003, 0.7)
    hit = sos_filter(white(m), "lowpass", 900, 2) * env_ad(m, 0.001, 0.06) * 1.5
    bus.add(normalize(np.tanh((sweep + hit) * 1.6), 1.0), ev.get("subDrop", 0.0), 1.15)
    bus.add(sfx_riser(3.0), dur - 3.0, 0.4)

    return bus.buf
