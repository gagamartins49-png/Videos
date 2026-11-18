#!/usr/bin/env python3
"""
Cortes verticais (9:16) com narração: no começo apresenta a cena e no fim pede like e inscrição.
Lê cortes/narrados.json e o vídeo-fonte (enviado pelo usuário). Para cada corte:
  * vídeo grande no centro (zoom leve) sobre o mesmo vídeo desfocado ao fundo;
  * título da cena no topo durante a apresentação, legenda da narração embaixo;
  * no final, botões "INSCREVA-SE" e "DEIXA O LIKE" animados;
  * áudio do jogo abaixa enquanto a voz fala (edge-tts, pt-BR-AntonioNeural).

Uso: python cortes/cortes_narrados.py --fonte fonte.mp4 --out cortes/build_narrados [--no-tts]
"""
import argparse
import asyncio
import json
import subprocess
import textwrap
from pathlib import Path

HERE = Path(__file__).resolve().parent
FONT_T = HERE / "fontes" / "Anton-Regular.ttf"
FONT_B = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")


def dur_of(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)]).strip())


async def _tts(text, voz, rate, pitch, out):
    import edge_tts
    await edge_tts.Communicate(text, voz, rate=rate, pitch=pitch).save(str(out))


def tts(text, cfg, out, use):
    if use:
        for k in range(5):
            try:
                asyncio.run(_tts(text, cfg["voz"], cfg["velocidade"], cfg["tom"], out))
                if out.stat().st_size > 1000:
                    break
            except Exception as e:  # rede instável
                print("  tts falhou:", e)
        # corta silêncio no começo e no fim
        tmp = out.with_suffix(".wav")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out), "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,aresample=44100", "-ac", "2", str(tmp)], check=True)
        return tmp
    tmp = out.with_suffix(".wav")   # teste sem rede: silêncio com a duração estimada
    d = max(1.5, len(text) / 15.5)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo", "-t", f"{d:.2f}", str(tmp)], check=True)
    return tmp


def esc(p):
    return str(p).replace("\\", "/").replace(":", "\\:")


def build(src, c, cfg, out, use_tts):
    work = out / c["id"]; work.mkdir(parents=True, exist_ok=True)
    s, e = float(c["inicio"]), float(c["fim"]); D = e - s
    vi = tts(c["intro"], cfg, work / "intro.mp3", use_tts); di = dur_of(vi)
    vo = tts(c["outro"], cfg, work / "outro.mp3", use_tts); do = dur_of(vo)
    i0, i1 = 0.4, 0.4 + di
    o0 = max(i1 + 3, D - do - 0.5); o1 = o0 + do
    # textos em arquivo (evita problemas de escape no drawtext)
    def tf(name, txt):
        p = work / f"{name}.txt"; p.write_text(txt, encoding="utf-8"); return esc(p)
    t1, t2 = tf("titulo1", c["titulo"][0]), tf("titulo2", c["titulo"][1] if len(c["titulo"]) > 1 else "")
    sub_i = "\n".join(textwrap.wrap(c["intro"], 30)); sub_o = "\n".join(textwrap.wrap(c["outro"], 30))
    si, so = tf("sub_intro", sub_i), tf("sub_outro", sub_o)
    bi, bl = tf("btn_inscreva", "INSCREVA-SE"), tf("btn_like", "DEIXA O LIKE")
    canal = tf("canal", "PROJETO E SE? • CORTES GTA 6")
    ft, fb = esc(FONT_T if FONT_T.exists() else FONT_B), esc(FONT_B)
    pop = f"if(lt(t-{o0:.2f},0.25),(t-{o0:.2f})/0.25,1)"
    vf = (
        "[0:v]fps=30,split[a][b];"
        "[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=26:6,eq=brightness=-0.22:saturation=1.25[bg];"
        f"[b]scale=1708:-2,crop=1080:ih,zoompan=z='1+0.0005*on':d=1:s=1080x960:fps=30[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2-40[v0];"
        f"[v0]drawtext=fontfile={fb}:textfile={canal}:x=(w-text_w)/2:y=110:fontsize=34:fontcolor=white@0.85:box=1:boxcolor=black@0.45:boxborderw=16,"
        f"drawtext=fontfile={ft}:textfile={t1}:x=(w-text_w)/2:y=250:fontsize=96:fontcolor=white:borderw=8:bordercolor=black:enable='between(t,0.2,{i1 + 1.2:.2f})',"
        f"drawtext=fontfile={ft}:textfile={t2}:x=(w-text_w)/2:y=360:fontsize=110:fontcolor=0xffd36a:borderw=8:bordercolor=black:enable='between(t,0.2,{i1 + 1.2:.2f})',"
        f"drawtext=fontfile={fb}:textfile={si}:x=(w-text_w)/2:y=1500:fontsize=50:fontcolor=white:borderw=5:bordercolor=black:line_spacing=14:enable='between(t,{i0:.2f},{i1 + 0.2:.2f})',"
        f"drawtext=fontfile={fb}:textfile={so}:x=(w-text_w)/2:y=1500:fontsize=50:fontcolor=white:borderw=5:bordercolor=black:line_spacing=14:enable='between(t,{o0:.2f},{o1 + 0.3:.2f})',"
        f"drawbox=x=150:y=250:w=780:h=150:color=0xe8243a@0.95:t=fill:enable='between(t,{o0:.2f},{D:.2f})',"
        f"drawtext=fontfile={ft}:textfile={bi}:x=(w-text_w)/2:y=275:fontsize=96:fontcolor=white:enable='between(t,{o0:.2f},{D:.2f})',"
        f"drawbox=x=230:y=1290:w=620:h=120:color=0x2a6aff@0.95:t=fill:enable='between(t,{o0 + 0.6:.2f},{D:.2f})',"
        f"drawtext=fontfile={ft}:textfile={bl}:x=(w-text_w)/2:y=1308:fontsize=80:fontcolor=white:enable='between(t,{o0 + 0.6:.2f},{D:.2f})',"
        f"fade=t=in:st=0:d=0.35,fade=t=out:st={D - 0.4:.2f}:d=0.4,format=yuv420p[v]"
    )
    duck = f"volume='if(between(t,{i0 - 0.2:.2f},{i1 + 0.3:.2f})+between(t,{o0 - 0.2:.2f},{o1 + 0.3:.2f}),0.22,1)':eval=frame"
    af = (
        f"[0:a]{duck},afade=t=in:st=0:d=0.3,afade=t=out:st={D - 0.5:.2f}:d=0.5[g];"
        f"[1:a]adelay={int(i0 * 1000)}|{int(i0 * 1000)},volume=1.6[n1];"
        f"[2:a]adelay={int(o0 * 1000)}|{int(o0 * 1000)},volume=1.6[n2];"
        "[g][n1][n2]amix=inputs=3:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]"
    )
    f = out / f"corte_{c['id']}.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{s:.2f}", "-t", f"{D:.2f}", "-i", str(src), "-i", str(vi), "-i", str(vo),
                    "-filter_complex", vf + ";" + af, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-movflags", "+faststart", str(f)], check=True)
    print(f"  {f.name}: {D:.1f}s  intro {i0:.1f}–{i1:.1f}s  outro {o0:.1f}–{o1:.1f}s")
    return f


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fonte", required=True)
    ap.add_argument("--out", default=str(HERE / "build_narrados"))
    ap.add_argument("--no-tts", action="store_true")
    a = ap.parse_args()
    cfg = json.loads((HERE / "narrados.json").read_text(encoding="utf-8"))
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    for c in cfg["cortes"]:
        build(a.fonte, c, cfg, out, not a.no_tts)


if __name__ == "__main__":
    main()
