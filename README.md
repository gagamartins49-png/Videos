# E se o Sol apagasse de repente? — gerador automático de Shorts/TikTok

Vídeo vertical **9:16 · 1080×1920 · 30 fps · 80 s** no estilo "What if…", gerado 100% por código:
cena 3D low-poly em **Three.js**, narração neural em **pt-BR** com **edge-tts** (`pt-BR-AntonioNeural`)
e efeitos sonoros procedurais em **Python (numpy/scipy)**. O MP4 final é renderizado automaticamente no **GitHub Actions**.

## 📱 Como baixar o vídeo pelo celular

1. Todo `push` na branch `main` (ou **Actions → Renderizar vídeo → Run workflow**) inicia a renderização.
2. Leva ~20–30 min (8 partes renderizadas em paralelo).
3. Baixe o vídeo de um destes jeitos:
   - **Mais fácil:** aba **Releases** → `video-mais-recente` → toque em **what_if_video.mp4** (com narração) ou **what_if_video_sem_narracao.mp4** (só efeitos sonoros). Download direto, sem zip.
   - **Actions** → execução mais recente → seção *Artifacts* → **what_if_video** (vem dentro de um .zip).
   - **GitHub Pages** (se ativado): `https://<seu-usuário>.github.io/<repo>/what_if_video.mp4`.

## ▶ Assistir / gravar no navegador (GitHub Pages)

Ative em **Settings → Pages → Build and deployment → Source: GitHub Actions**. Na próxima execução o
workflow publica o site com a trilha final (voz neural + efeitos). Abra a página no celular e toque em:

- **▶ Play** — assiste em tempo real (toque na tela para mostrar os controles / parar).
- **● Gravar Vídeo** — grava a tela + áudio com `MediaRecorder` e baixa o arquivo (MP4 ou WebM, conforme o navegador).
- Qualidade *leve* é recomendada em celulares mais simples.

Sem o Pages pelo Actions (ex.: abrindo o `index.html` direto da branch), a página usa a voz do próprio
navegador e efeitos via Web Audio como alternativa.

## 🎬 Roteiro (80 s) — "E se o Sol apagasse de repente?"

| Tempo | Cena |
|---|---|
| 0–12 s | Rua movimentada ao meio-dia. Aos 8 s o Sol some do céu, mas tudo continua claro (a luz leva 8 minutos para chegar). HUD `TEMPO: 8 MINUTOS · TEMP: 24°C` |
| 12–25 s | A última luz chega: céu negro com estrelas. Postes e faróis acendem sozinhos, pessoas param assustadas olhando para o céu |
| 25–45 s | 24 horas → 7 dias: temperatura cai para -70°C, nevasca, árvores perdem as folhas, carros cobertos de gelo, postes piscam e apagam (rede elétrica em colapso) |
| 45–65 s | 1 ano depois: -150°C, ventos congelantes derrubam estruturas, oxigênio liquefeito cai como "neve azulada" |
| 65–73 s | -240°C: a lente da câmera congela e trinca; texto **"APENAS BACTÉRIAS NO FUNDO DO OCEANO SOBREVIVEM"** |
| 73–80 s | Tela preta com a frase final |

As frases, tempos e eventos sonoros ficam em **`roteiro.json`** — a cena, as legendas e o áudio
leem o mesmo arquivo, então tudo continua sincronizado se você editar o texto ou os tempos.

## 🗂 Estrutura

```
index.html                     página + botões Play / Gravar; modo ?capture=1 usado pelo renderizador
js/scene.js                    cena Three.js (função pura do tempo: renderFrame(t)) + HUD + legendas
vendor/three.module.min.js     Three.js r160 (MIT, ver vendor/THREE_LICENSE)
roteiro.json                   narração, legendas e linha do tempo dos eventos
audio/generate_audio.py        edge-tts + efeitos procedurais + mixagem (ducking) -> mix.wav/mix.mp3
render/capture.mjs             Chromium headless (Playwright, WebGL SwiftShader) -> frames JPEG -> FFmpeg H.264
.github/workflows/render-video.yml   pipeline completo (áudio, 8 partes de vídeo, mux, Release, Pages)
```

## 💻 Rodar localmente (opcional)

```bash
pip install edge-tts numpy scipy
python audio/generate_audio.py --out build/audio
cd render && npm install && npx playwright install chromium && cd ..
node render/capture.mjs --out build/video.mp4            # ou --start 0 --end 90 para testar
ffmpeg -i build/video.mp4 -i build/audio/mix.wav -c:v copy -c:a aac -shortest what_if_video.mp4
```
