# Projeto E se? — gerador automático de Shorts/TikTok (atual: "E se a Lua caísse na Terra?")

Vídeo vertical **9:16 · 1080×1920 · 30 fps · 80 s** no estilo "What if…", gerado 100% por código:
cena 3D low-poly em **Three.js**, narração neural em **pt-BR** com **edge-tts** (`pt-BR-AntonioNeural`)
e efeitos sonoros procedurais em **Python (numpy/scipy)**. O MP4 final é renderizado automaticamente no **GitHub Actions**.

## 📱 Como baixar o vídeo pelo celular

1. Todo `push` na branch `main` (ou **Actions → Renderizar vídeo → Run workflow**) inicia a renderização.
2. Leva ~20–30 min (8 partes renderizadas em paralelo).
3. Baixe o vídeo de um destes jeitos:
   - **Mais fácil:** aba **Releases** → `video-mais-recente` → toque em **e_se_a_lua_caisse_na_terra_simulacao_3d.mp4** (com narração) ou **e_se_a_lua_caisse_na_terra_simulacao_3d_sem_narracao.mp4** (só efeitos sonoros). O nome vem do campo `arquivo` em `roteiro.json`. Download direto, sem zip.
   - **Actions** → execução mais recente → seção *Artifacts* (vem dentro de um .zip).
   - **GitHub Pages** (se ativado): `https://<seu-usuário>.github.io/<repo>/e_se_a_lua_caisse_na_terra_simulacao_3d.mp4`.

## ▶ Assistir / gravar no navegador (GitHub Pages)

Ative em **Settings → Pages → Build and deployment → Source: GitHub Actions**. Na próxima execução o
workflow publica o site com a trilha final (voz neural + efeitos). Abra a página no celular e toque em:

- **▶ Play** — assiste em tempo real (toque na tela para mostrar os controles / parar).
- **● Gravar Vídeo** — grava a tela + áudio com `MediaRecorder` e baixa o arquivo (MP4 ou WebM, conforme o navegador).
- Qualidade *leve* é recomendada em celulares mais simples.

Sem o Pages pelo Actions (ex.: abrindo o `index.html` direto da branch), a página usa a voz do próprio
navegador e efeitos via Web Audio como alternativa.

## 🎬 Roteiro (80 s) — "E se a Lua caísse na Terra?" (Experimento #003)

| Tempo | Cena |
|---|---|
| 0–12 s | Avenida costeira ao entardecer, Lua no tamanho normal sobre o mar. HUD `DISTÂNCIA DA LUA: 384.400 KM · MARÉ: NORMAL` |
| 12–30 s | A distância cai para 100.000 km: a Lua fica gigante no céu, o mar sobe e invade a avenida, inundando o primeiro andar dos prédios |
| 30–50 s | 18.000 km (limite de Roche): a Lua racha, explode em milhares de fragmentos incandescentes que formam um anel de fogo no céu; carros e destroços flutuam |
| 50–65 s | Chuva de meteoros: impactos derrubam prédios com explosões alaranjadas e ondas de choque (alguns caem no mar) |
| 65–73 s | Impacto gigante no horizonte: a onda de choque de fogo avança e consome a câmera |
| 73–80 s | Tela preta: "A Terra viraria um mundo de fogo." e, de 76 a 80 s, *"Mas tudo isso começa com uma simples pergunta:"* — que emenda no 0,0 s (loop) |

As frases, tempos e eventos sonoros ficam em **`roteiro.json`** — a cena, as legendas e o áudio
leem o mesmo arquivo, então tudo continua sincronizado se você editar o texto ou os tempos.

## 🔁 Retenção e identidade ("Projeto E se?")

- Selo fixo no topo: `PROJETO E SE? | EXPERIMENTO #003` (campos `projeto` e `experimento` em `roteiro.json`).
- 0,0 s: impacto grave (sub-bass drop) junto com a primeira palavra da narração.
- Loop infinito: a última frase termina exatamente aos 80 s e se conecta com a frase do 0,0 s.
- O MP4 é exportado com palavras-chave do tema (campo `arquivo`).

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
ffmpeg -i build/video.mp4 -i build/audio/mix.wav -c:v copy -c:a aac -shortest e_se_a_lua_caisse_na_terra_simulacao_3d.mp4
```
