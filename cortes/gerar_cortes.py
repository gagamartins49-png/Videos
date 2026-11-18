#!/usr/bin/env python3
"""
Cortes verticais (9:16) a partir de um vídeo-fonte que o próprio usuário enviou
(arquivo no repositório ou link direto de arquivo). Não baixa do YouTube.

1. mede cortes de cena e volume por segundo;
2. escolhe N trechos de 30–60 s sem sobreposição, com mais ação (volume + mudanças de cena),
   começando e terminando em cortes de cena quando possível;
3. renderiza cada trecho em 1080x1920: fundo desfocado + vídeo centralizado, selo do canal,
   número do corte, fade de entrada/saída e volume normalizado.

Uso: python cortes/gerar_cortes.py --fonte cortes/fonte.mp4 --n 10 --out cortes/build
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True).stderr


def duration(src):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]).strip())


def analyse(src, dur):
    err = run(["ffmpeg", "-i", src, "-vf", "scale=320:-2,select='gt(scene,0.32)',showinfo", "-an", "-f", "null", "-"])
    scenes = sorted({round(float(x), 2) for x in re.findall(r"pts_time:([0-9.]+)", err)})
    err = run(["ffmpeg", "-i", src, "-vn", "-af", "aresample=8000,asetnsamples=8000,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level", "-f", "null", "-"])
    rms = [float(x) if x not in ("-inf", "inf") else -90.0 for x in re.findall(r"RMS_level=([-0-9.inf]+)", err)]
    n = int(dur) + 1
    rms = (rms + [-90.0] * n)[:n]
    lo, hi = sorted(rms)[int(n * 0.1)], max(rms) or 0
    vol = [min(1, max(0, (r - lo) / (hi - lo + 1e-6))) for r in rms]
    cut = [0.0] * n
    for s in scenes:
        if int(s) < n:
            cut[int(s)] += 1
    return scenes, vol, cut


def choose(dur, scenes, vol, cut, n_clips, lmin=30, lmax=60):
    n = len(vol)
    score = [0.7 * vol[i] + 0.3 * min(1, cut[i]) for i in range(n)]
    starts = sorted(set([0.0] + [s for s in scenes if s < dur - lmin] + [float(t) for t in range(0, int(dur - lmin), 4)]))
    cands = []
    for s in starts:
        for L in (lmax, 52, 45, 38, lmin):
            e = s + L
            if e > dur - 0.5:
                continue
            ends = [x for x in scenes if s + lmin <= x <= s + lmax]
            if ends:
                e = min(ends, key=lambda x: abs(x - (s + L)))
            m = sum(score[int(s):int(e)]) / max(1, int(e) - int(s))
            cands.append((m, s, e))
    cands.sort(reverse=True)
    out = []
    for m, s, e in cands:
        if all(e <= a or s >= b for _, a, b in out):
            out.append((m, s, e))
        if len(out) >= n_clips:
            break
    return sorted(out, key=lambda x: x[1])


def render(src, s, e, k, total, out, canal):
    d = e - s
    label = f"CORTE {k}/{total}"
    vf = (
        "[0:v]split[a][b];"
        "[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:6,eq=brightness=-0.18:saturation=1.2[bg];"
        "[b]scale=1080:-2[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2,"
        f"drawtext=fontfile={FONT}:text='{canal}':x=(w-text_w)/2:y=90:fontsize=40:fontcolor=white@0.85:box=1:boxcolor=black@0.45:boxborderw=18,"
        f"drawtext=fontfile={FONT}:text='{label}':x=(w-text_w)/2:y=h-260:fontsize=56:fontcolor=white:borderw=5:bordercolor=black,"
        f"fade=t=in:st=0:d=0.4,fade=t=out:st={d - 0.5:.2f}:d=0.5,format=yuv420p[v]"
    )
    af = f"loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.3,afade=t=out:st={d - 0.5:.2f}:d=0.5"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{s:.2f}", "-t", f"{d:.2f}", "-i", src, "-filter_complex", vf, "-map", "[v]", "-map", "0:a?",
                    "-af", af, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fonte", required=True)
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--out", default="cortes/build")
    ap.add_argument("--canal", default="PROJETO E SE?")
    ap.add_argument("--trechos", default="", help="opcional: lista manual 'ini-fim,ini-fim' em segundos")
    a = ap.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    dur = duration(a.fonte)
    if a.trechos:
        clips = [(0, float(x.split("-")[0]), float(x.split("-")[1])) for x in a.trechos.split(",")]
    else:
        scenes, vol, cut = analyse(a.fonte, dur)
        clips = choose(dur, scenes, vol, cut, a.n)
    print(f"duração da fonte: {dur:.1f}s, cortes escolhidos: {len(clips)}")
    rel = []
    for k, (m, s, e) in enumerate(clips, 1):
        f = out / f"corte_{k:02d}.mp4"
        render(a.fonte, s, e, k, len(clips), f, a.canal)
        rel.append({"corte": k, "inicio": round(s, 2), "fim": round(e, 2), "duracao": round(e - s, 2), "arquivo": f.name})
        print(f"  corte {k:02d}: {s:7.1f}s – {e:7.1f}s ({e - s:.1f}s)")
    (out / "cortes.json").write_text(json.dumps(rel, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
