#!/usr/bin/env python3
"""Extrai do vídeo-fonte SÓ os quadros dos trechos curtos usados no piloto (1280x720, 30 fps)
e o áudio desses trechos (para ficar baixinho por baixo da narração)."""
import json, subprocess, sys
from pathlib import Path
src, out = sys.argv[1], Path(sys.argv[2])
ev = json.loads(subprocess.check_output(["node", str(Path(__file__).parent / "eventos.mjs")]))
(out / "quadros").mkdir(parents=True, exist_ok=True); (out / "audio_jogo").mkdir(parents=True, exist_ok=True)
for s in ev["seg"]:
    if s["tipo"] != "jogo":
        continue
    d = s["t1"] - s["t0"]; pat = str(out / "quadros" / f"{s['id']}_%05d.jpg")
    if s.get("congela"):
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(s["src"]), "-i", src, "-frames:v", "1", "-vf", "scale=1280:720", "-q:v", "3", pat.replace("%05d", "00001")], check=True)
    else:
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(s["src"]), "-t", f"{d:.3f}", "-i", src, "-vf", "fps=30,scale=1280:720", "-q:v", "3", pat], check=True)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(s["src"]), "-t", f"{d:.3f}", "-i", src, "-vn", "-ac", "2", "-ar", "44100", str(out / "audio_jogo" / f"{s['id']}.wav")], check=True)
    print(s["id"], "ok")
