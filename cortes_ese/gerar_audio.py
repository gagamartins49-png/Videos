#!/usr/bin/env python3
"""
Trilha do piloto "E se a fuga de hidroavião do GTA 6 fosse na vida real?" (62 s, loop):
narração natural (Antonio) do começo ao fim + synthwave procedural (mesmo motor dos Shorts 2D)
+ áudio do jogo BEM baixo só nos trechos do jogo + whooshes nas trocas de cena.

Uso: python cortes_ese/gerar_audio.py --quadros cortes_ese/build [--no-tts]
"""
import argparse, importlib.util, json, subprocess, sys
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "audio")); sys.path.insert(0, str(HERE.parent / "compilacao"))
import generate_audio as ga  # noqa: E402
from generate_audio import SR, Bus, normalize, sos_filter, sfx_whoosh  # noqa: E402
spec = importlib.util.spec_from_file_location("gta2d_audio", HERE.parent / "shorts_gta2d" / "gerar_audio.py")
g2 = importlib.util.module_from_spec(spec); spec.loader.exec_module(g2)


TRILHAS = {
    "hidroaviao": {"estilo": "synth", "ganhos": {"synth": [[0, 0.7], [62, 0.7]], "batida": [[0, 0.5], [8.6, 0.5], [27.6, 0.9], [51.9, 0.4], [62, 0.6]], "cordas": [[0, 0.2], [47, 0.5], [55, 0.3], [62, 0.2]], "piano": [[0, 0], [51.5, 0], [52, 0.5], [62, 0.3]]}},
    # assalto: tensão no começo, peso nas consequências, piano triste no fim
    "assalto": {"estilo": "synth", "ganhos": {"synth": [[0, 0.6], [22.7, 0.8], [36.9, 0.8], [41.3, 0.15], [62, 0.15]], "batida": [[0, 0.6], [13.3, 1.0], [36.9, 1.0], [41.3, 0], [62, 0]], "cordas": [[0, 0.2], [41.3, 0.6], [51.3, 0.8], [62, 0.4]], "piano": [[0, 0], [41.0, 0], [41.5, 0.7], [62, 0.6]]}},
}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--v", required=True); ap.add_argument("--quadros", default=str(HERE / "build")); ap.add_argument("--no-tts", action="store_true"); a = ap.parse_args()
    out = Path(a.quadros) / a.v; out.mkdir(parents=True, exist_ok=True)
    cfg = json.loads((HERE / f"roteiro_{a.v}.json").read_text(encoding="utf-8"))
    ev = json.loads(subprocess.check_output(["node", str(HERE / "eventos.mjs"), a.v]))
    dur = float(cfg["duracao"])
    voice = ga.build_voice(cfg, out, not a.no_tts, dur)
    audio = TRILHAS[a.v]
    mus = normalize(g2.music(dur, audio), 1.0)
    bus = Bus(dur)
    for s in ev["seg"]:
        if s["t0"] > 0.05:
            bus.add(sfx_whoosh(0.6, 400, 5000), s["t0"] - 0.3, 0.35)
        w = out / "audio_jogo" / f"{s['id']}.wav"
        if s["tipo"] == "jogo" and w.exists():
            from scipy.io import wavfile
            sr, x = wavfile.read(w); x = (x.astype(np.float32) / 32768.0).T
            if x.ndim == 1: x = np.stack([x, x])
            n = x.shape[1]; e = np.minimum(1, np.minimum(np.arange(n) / (0.25 * SR), (n - np.arange(n)) / (0.25 * SR))).astype(np.float32)
            bus.add(x * e, s["t0"], 0.45)
    fx = bus.buf
    venv = sos_filter(np.abs(voice), "lowpass", 4, 1); venv = np.clip(venv / (np.max(venv) + 1e-9) * 3, 0, 1)
    bed = mus * 0.45 + fx * 0.6
    mix = normalize(np.tanh((bed * (1 - 0.5 * venv) + np.stack([voice, voice]) * 1.05) * 1.05) / np.tanh(1.05), 0.95)
    nonarr = normalize(np.tanh(bed * 1.05) / np.tanh(1.05), 0.95)
    from scipy.io import wavfile
    wavfile.write(out / "audio_short.wav", SR, (mix.T * 32767).astype(np.int16))
    wavfile.write(out / "audio_short_sem_narracao.wav", SR, (nonarr.T * 32767).astype(np.int16))
    print("OK áudio", flush=True)


if __name__ == "__main__":
    main()
