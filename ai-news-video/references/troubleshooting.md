# Troubleshooting

Read this when something in the pipeline fails. Most issues fall into a few categories.

---

## Doctor 报错

### `mmx CLI not found`

`scripts/tts.ts` 依赖本机 `mmx` CLI（MiniMax 官方 CLI，npm 包名 `mmx-cli`）。安装后需要登录：
```bash
npm install -g mmx-cli                    # 全局安装
mmx auth login                            # 交互式 OAuth 登录
# 或非交互式：mmx auth login --api-key sk-xxxxxxxxxxxx
mmx auth status                           # 确认已登录（doctor 用这条探测）
mmx speech synthesize --help              # 确认子命令 + flag 名
```

参考：
- 仓库 <https://github.com/MiniMax-AI/cli>
- 文档 <https://platform.minimaxi.com/docs/token-plan/minimax-cli>

如果 CLI 的实际子命令不是 `mmx speech synthesize` 而是其它，改 `scripts/tts.ts` 顶部：
```ts
const MMX_TTS_SUBCOMMANDS = ['speech', 'synthesize'];  // 改成实际子命令链
```
flag 名（`--text` / `--voice` / `--out`）也对照 `--help` 调整 `buildArgs()`。

注意 mmx **没有** per-invocation `--model` flag——要换 TTS 模型（如 `speech-2.8-hd`、`speech-2.8-turbo`、`speech-02-hd`）走 `mmx config`，一次设置全局生效：

```bash
mmx config set --key default_speech_model --value speech-2.8-hd
mmx config show | grep default_speech_model   # 确认
```

skill 默认推荐 `speech-2.8-hd`（音质优先）；要更快出 mp3 / 节省成本可换 `speech-2.8-turbo`。

可设的 key 跑 `mmx config set --help` 看清单（`default_speech_model` / `default_text_model` / `default_video_model` / `default_music_model` 等）。

### 高级 voice 参数（pitch / volume / sample-rate / bitrate / channels / format / emotion）

`mmx speech synthesize --help`（mmx 1.0.15）列出的真实 flag：`--pitch / --volume / --sample-rate / --bitrate / --channels / --format / --language / --subtitles / --pronunciation`（注意 `--channels` 是复数）。在 `scripts/tts.ts` 顶部的 `MMX_DEFAULT_FLAGS` 数组里加一行就生效。

特别注意 **`--emotion`** ——`--help` 里不列，但实测会透传到 voice_setting.emotion（A/B 合成同一句、不同 emotion 值，输出 mp3 哈希和时长都不同）。所以它是"未文档化但有效"的 flag。

要完全绕开 CLI 直接发 HTTP payload（所有字段都能控制）：用 `--tts-provider custom` 包一个 `curl` 脚本调 MiniMax `/v1/t2a_v2`，TTS_CUSTOM_CMD 指向那个脚本即可。

### `MISSING_CUSTOM_TTS`（用了 `--provider custom`）

不想用 mmx、改用本机已有的 TTS CLI 时，通过两条环境变量配置（不是 CLI flag）：

```bash
export TTS_CUSTOM_CMD='edge-tts'
export TTS_CUSTOM_ARGS='--text {text} --voice {voice} --write-media {out}'
```

占位符 `{text}` `{voice}` `{out}` **三个都必须出现**，运行时分别替换成"句子文本 / voice id / 输出 mp3 路径"，按 argv 传入（不走 shell）。

doctor 的 `MISSING_CUSTOM_TTS` 有三种触发：

1. **缺 env** — `TTS_CUSTOM_CMD` 或 `TTS_CUSTOM_ARGS` 没 export → 两条都设上
2. **模板少占位符** — `TTS_CUSTOM_ARGS` 没包含某个 `{...}` → 补齐缺的那个
3. **二进制不在 PATH** — `TTS_CUSTOM_CMD` 指的命令找不到 → 装它，或把 `TTS_CUSTOM_CMD` 改成绝对路径

更多模板示例（含常见坑）见下方 "Custom TTS provider" 一节。

### `ffmpeg not found`

```bash
brew install ffmpeg      # macOS
sudo apt install ffmpeg  # Ubuntu
```

### `Playwright chromium not found`

```bash
cd <SKILL_DIR>
npx playwright install chromium
```

---

## TTS 阶段失败

**症状**：`tts.ts` 在某句报错退出。

排查顺序：
1. 复制报错前一句的 text 手动跑：`mmx speech synthesize --text "<text>" --voice Podcast_girl --out /tmp/test.mp3`
2. 若 CLI 报"text too long"，回到 step 4 把对应句拆短再重跑
3. 若 CLI 报 auth 错误，重 `mmx auth login`（或 `mmx auth login --api-key sk-...`）
4. 若是网络间歇错误，整个 `tts.ts` 重跑即可（已生成的 mp3 会被覆盖）

custom provider 的手动复现：把模板里的占位符替成实际值跑一遍，例如
`edge-tts --text "你好" --voice zh-CN-YunxiNeural --write-media /tmp/test.mp3`。

---

## Custom TTS provider（自带 CLI）

默认 TTS 是 mmx。不想用 mmx 时，`--tts-provider custom` 让你接任意本机 TTS CLI，靠两条 env 配置：

| env | 含义 |
|---|---|
| `TTS_CUSTOM_CMD` | 要 spawn 的二进制（或绝对路径） |
| `TTS_CUSTOM_ARGS` | 参数模板，必须含占位符 `{text}` `{voice}` `{out}` |

模板示例：

```bash
# edge-tts（微软，免费，需 pip install edge-tts）
export TTS_CUSTOM_CMD='edge-tts'
export TTS_CUSTOM_ARGS='--text {text} --voice zh-CN-YunxiNeural --write-media {out}'
#                                       ↑ voice 写死在模板里也行，此时 --voice/{voice} 可省略 voice 占位符
# 但 doctor 要求 {voice} 必须出现；最省事是保留 {voice} 让 skill 的 --voice 生效：
export TTS_CUSTOM_ARGS='--text {text} --voice {voice} --write-media {out}'

# OpenAI CLI 之类自研脚本
export TTS_CUSTOM_CMD='my-tts'
export TTS_CUSTOM_ARGS='speak --in {text} --voice {voice} --out {out}'
```

机制与常见坑：

- 模板按**空格切成 argv tokens**，再逐 token 替换占位符。所以**句子文本里有空格不会**把参数撑开——`{text}` 整体作为一个 argv 元素传入。
- **不走 shell**，因此模板里不要加引号包占位符（`"{text}"` 的引号会被当字面量）；也因此没有命令注入风险。
- 三个占位符 `{text}` `{voice}` `{out}` **都必须出现**，否则 doctor / tts 直接报错。voice 用不上时也保留 `{voice}`，把无关 voice 值丢给 CLI 通常无害。
- 你的 CLI **必须输出 mp3** 到 `{out}` 路径。输出别的格式（aiff/wav/ogg）会让后续 `music-metadata` 的时长探测失败、报 `0-duration mp3`。需要的话在模板里加格式参数，或包一层转 mp3 的脚本当 `TTS_CUSTOM_CMD`。
- auth（API key、登录态）完全由你的 CLI 自理，doctor 不探测——若鉴权没配好，会在 TTS 第一句失败时暴露真实错误。

---

## 录制阶段失败

### `vite preview did not start within 20s`

通常是端口 5176 被占。排查：
```bash
lsof -i :5176   # 看谁占了
kill <pid>      # 干掉
```

### `waitForFunction(window.__playerReady) timeout`

播放器 JS 没加载完。本地手动开浏览器看：
```bash
cd <SKILL_DIR>
pnpm preview &
open "http://127.0.0.1:5176/?theme=linen&data=/player.json&autoplay=1"
```
（先把 `out/<date>/player.json` 复制到 `renderer/public/player.json`）

如果浏览器里也空白，看 DevTools console：通常是 `player.json` 没复制到 `renderer/public/`，或 schema 字段名错了。

### 录到一半切到下一张

`timeline.json` 里 `totalSec` 和实际播放时长有偏差。检查每个 slide 的 `durSec` 是否 > 0；多半是 TTS 阶段某句没生成、duration 为 0 导致。

### silent.webm 已写出但 record.ts 卡住不退出

`record.ts` 写完 silent.webm 后在 `browser.close()` / vite preview 清理阶段挂死。已加防御：`browser.close()` 8s 超时打 warning 继续；vite preview spawn 用 `detached:true` + 杀整个进程组（pnpm → node → vite）。脚本 main 在成功路径上显式 `process.exit(0)` 兜底。

如果还是挂死：手动 `kill` 掉脚本进程后用 `tsx scripts/run-pipeline.ts --start-from compose --out <OUT_DIR>` 续跑，silent.webm 已在 `<OUT_DIR>/silent.webm`。同时 `lsof -i :5176` 看下端口有没有残留 vite。

---

## ffmpeg 合成失败

### `Output file is empty / 0 bytes`

最常见是 silent.webm 时长 < voice 时长，被 `-shortest` 截断到 0。回到录制阶段检查 webm 是否完整：
```bash
ffprobe out/<date>/silent.webm 2>&1 | grep -i duration
```

### BGM 缺失或为空

`compose.ts` 在 BGM 路径为空文件 / 不存在时会打印
`⚠ BGM at <path> is missing or empty — composing without background music`
然后走"无 BGM"分支，不再 fail。要加 BGM：把真实 mp3 放到 `assets/bgm/default.mp3`（默认路径），或 `--bgm <other-path>` 指别处。

仍报 `aloop atrim` 之类的硬错通常是 BGM 文件存在但内容损坏（非 mp3 / 时长 0），换文件即可。

---

## 字体显示为方块

视频里中文显示为豆腐块意味着 Google Fonts 没加载到，CJK 又没回退到本机字体。

1. **网络**：录制环境能访问 `fonts.googleapis.com`？不能的话，把字体本地化（在 `renderer/src/themes/<theme>/theme.css` 顶部把 `@import` 改成本地 `@font-face`）。
2. **回退**：默认已经回退到 `PingFang SC` / `Source Han Sans SC`，确认录制机器装了这两个字体之一。

---

## 主题切换后样式乱掉

每次改了 `renderer/src/themes/<theme>/design.md` 都要重跑：
```bash
cd <SKILL_DIR> && pnpm build:tokens
```
这条会重新生成 `tokens.ts` / `theme.css` / `themes/index.ts`。改完没 build 直接录，等于用旧 token。

---

## 重跑单步而不是从头来

skill 的脚本都接受标准 flag，可以单独重跑：

```bash
# 只重跑 TTS（保留之前的 keypoints/script）
tsx scripts/tts.ts --script out/<date>/script.json --audio-dir out/<date>/audio \
  --timeline out/<date>/timeline.json --voice Podcast_girl --theme linen

# 只重录视频（保留 audio + timeline）
tsx scripts/record.ts --player out/<date>/player.json \
  --out out/<date>/silent.webm --theme linen

# 只重合成
tsx scripts/compose.ts --silent out/<date>/silent.webm \
  --audio-dir out/<date>/audio --timeline out/<date>/timeline.json \
  --bgm assets/bgm/default.mp3 --out out/<date>/final.mp4
```

或者用 `scripts/run-pipeline.ts --start-from <step>` 从指定步骤接着跑（见脚本 `--help`）。
