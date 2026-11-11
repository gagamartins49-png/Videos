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


---

# 🎬 Compilação 16:9 (YouTube, 10 min): "7 simulações do Projeto E se?"

Vídeo horizontal **1920×1080 · 30 fps · 600 s (18.000 quadros)** apresentado pelo mascote 3D **O Interrogador**
(um robô metálico em forma de "?", com lente azul neon, painel de LED, braços articulados, raios de energia e a
esfera da base flutuando). A lente e os LEDs pulsam junto com a voz narrada.

**Baixar pelo celular:** aba **Releases** → `compilacao-mais-recente` → `compilacao_7_simulacoes_projeto_e_se.mp4`
(ou em Actions → *Renderizar compilação* → Artifacts).

| Bloco | Duração | Conteúdo |
|---|---|---|
| 0 | 30 s | Boas-vindas no laboratório (holograma da Terra, painel "7 níveis") |
| 1 | 80 s | Nível 1 — sem oxigênio por 5 s (céu negro, motores param, concreto vira pó) |
| 2 | 80 s | Nível 2 — a Terra para de girar (inércia, ventos supersônicos, mega-tsunami) |
| 3 | 80 s | Nível 3 — +10 °C por segundo (asfalto ferve, árvores em chamas, rio de lava) |
| 4 | 80 s | Nível 4 — gravidade de 1 G a 100 G (carros esmagados, postes dobrando, prédios desabando) |
| 5 | 80 s | Nível 5 — o Sol apaga (escuridão, nevasca, oxigênio líquido, lente congelada) |
| 6 | 80 s | Nível 6 — a Lua cai (marés, limite de Roche, anel de fogo, meteoros) |
| 7 | 80 s | Nível 7 — buraco negro de 2 cm (espaguetificação, disco de acreção, tudo é engolido) |
| 8 | 10 s | Encerramento: "Qual nível você aguentaria?" + inscreva-se |

Em cada nível, o Interrogador apresenta o teste no laboratório (0–15 s) e depois vai para o canto inferior
direito da simulação, reagindo em azul (calmo), laranja (alerta) e vermelho (pânico).

**Arquitetura anti-travamento:** os 9 blocos (`bloco_0.mp4` … `bloco_8.mp4`) são renderizados em partes paralelas
no GitHub Actions. Cada parte abre um navegador próprio e manda cada quadro JPEG **direto para o FFmpeg via stdin**
(nenhum quadro é salvo em disco); no fim, o navegador é fechado e a memória é liberada. Os blocos são unidos com
`ffmpeg -f concat` e recebem a trilha completa (voz + efeitos).

Arquivos: `compilacao/roteiro.json` (blocos, falas e reações), `compilacao/js/interrogador.js` (mascote e
laboratório), `compilacao/js/compilacao.js` (compositor, HUD e legendas), `compilacao/niveis/` (as 7 simulações),
`compilacao/gerar_audio.py` (narração, efeitos e envelope da voz), `compilacao/render_bloco.mjs` e
`.github/workflows/render-compilation.yml`.

Rodar localmente: `python compilacao/gerar_audio.py` e depois `node compilacao/render_bloco.mjs --todos`.
Para gastar menos minutos do Actions, diminua `qualidade3d` em `compilacao/roteiro.json` (0,75 por padrão).
