---
name: ai-news-video
description: 把中文 AI 日报 / 每日资讯 Markdown 文件转成 1920×1080 视频版日报（封面 + N 张要点卡片 + 中文口播 + BGM，输出 final.mp4）。**Use this skill whenever the user mentions** 把日报转成视频、生成视频日报、video briefing、视频版资讯、video summary of daily news、AI 日报视频化、做一个 AI 资讯视频、make a video from this news markdown，**或者**给出一份每日 AI 资讯 Markdown 并问"做成视频""配口播""出视频版""短视频"——即便没出现"日报"二字也应触发。输入是一个 Markdown 文件路径，输出是 mp4 文件路径。
---

# AI 日报视频化 Skill

输入一份中文 AI 日报 Markdown，输出 1920×1080 的 `final.mp4`（封面 + N 张要点卡片 + 中文口播 + BGM）。你负责内容理解与文案；本地脚本负责 TTS / 录制 / 合成。

---

## Step 0 · 解析参数

从用户消息或上下文提取：

| 参数 | 说明 | 默认 |
|---|---|---|
| `INPUT_MD` | 输入 Markdown 绝对路径 | （必填） |
| `OUT_DIR` | 输出目录 | `<INPUT_MD 同目录>/out/<basename>/` |
| `THEME` | `linen` 或 `glass-dark` | `linen` |
| `TTS_PROVIDER` | `mmx` 或 `custom` | `mmx` |
| `VOICE` | voice id | `Podcast_girl` |
| `BGM` | BGM mp3 路径 | `<SKILL_DIR>/assets/bgm/default.mp3` |

`SKILL_DIR` = 本文件所在目录。先 `mkdir -p <OUT_DIR>/audio`。

**`TTS_PROVIDER=custom` 时**：用户必须 `export TTS_CUSTOM_CMD` 和 `TTS_CUSTOM_ARGS`（参数模板含 `{text}` `{voice}` `{out}` 三个占位符），且该 CLI 必须输出 mp3。模板示例和坑见 [references/troubleshooting.md](./references/troubleshooting.md) 的 "Custom TTS provider" 一节。

---

## Step 1 · 预检

```bash
tsx <SKILL_DIR>/scripts/doctor.ts --provider <TTS_PROVIDER>
```

按退出码处理。**装包或登录前都必须先跟用户确认**：

| 退出码 | 状态 | 处理 |
|---|---|---|
| **0** | 全部就绪 | 进 Step 2 |
| **2** | `MISSING_MINIMAX`（provider=mmx） | 征得用户同意后代跑 `npm install -g mmx-cli`，再让用户跑 `mmx auth login`（交互式 OAuth；或 `mmx auth login --api-key sk-xxxxx` 免交互）。完成后重跑 doctor |
| **2** | `MISSING_CUSTOM_TTS`（provider=custom） | doctor stderr 指明三种成因之一：**缺 env**（让用户 `export TTS_CUSTOM_CMD` / `TTS_CUSTOM_ARGS`）/ **模板少占位符**（补齐 `{text}` `{voice}` `{out}`）/ **二进制不在 PATH**（装它，或让 `TTS_CUSTOM_CMD` 写绝对路径）。修完重跑 doctor |
| **3** | `UNAUTHENTICATED_MINIMAX` | mmx 已装但未登录。让用户跑 `mmx auth login`（或带 `--api-key`）。**绝不**替用户 spawn 交互登录——会卡死 |
| **4** | `MISSING_FFMPEG` | macOS：代跑 `brew install ffmpeg`；Ubuntu：让用户自跑 `sudo apt install ffmpeg`（需 sudo，不代跑） |
| **5** | `MISSING_PLAYWRIGHT` | 在 `<SKILL_DIR>` 下跑 `npx playwright install chromium`（首次 ~130MB，告知用户耗时） |
| 其它非 0 | 未知错误 | stderr 原样转给用户，停止 |

doctor 一次只报第一个失败：**解决一项就重跑确认下一项**。用户拒绝任何一项依赖 → 停止整条流程并说明无该依赖跑不通。

---

## Step 2 · 读原文

用 Read 工具读取 `INPUT_MD` 全文。

## Step 3 · 写 `keypoints.json`

完整 schema、字段约束、图标白名单见 **[references/schemas.md](./references/schemas.md)**；取舍策略、subtitle 字数感、术语保留规则见 **[references/extraction-guide.md](./references/extraction-guide.md)**。

要点：
- 2–8 个 keypoint，按重要性挑，不必覆盖原文全部
- 如果只有 4–5 条真正强的新闻，就做 4–5 条；不要为了凑数量加入弱新闻、会议预热、泛泛观点或用户已排除主题
- 每 keypoint 含 3–8 个 element
- subtitle 2–6 汉字（**标签**而非短语）
- brief 20–60 个中文汉字量级，忠于原文；英文模型名、公司名、代码、数字不按字母逐个计数，可因保留关键专名和数字略超
- brief 要优先承载具体事实、数字、对象或机制，不要只做泛泛总结；优先从文字日报的“关键细节”提取，不要把“为什么重要/今日洞察”里的判断改写成卡片事实；若原文细节充分，每个 keypoint 可用 5–8 个 element 展开
- **element 只写“已经知道了什么”**：`subtitle` / `brief` 禁止以“截至截稿/采集时”“未披露/未公布”“没有给出”“尚待确认”或未知字段清单充当信息点。证据边界留在日报或口播归因中，不能占用卡片网格；一条新闻凑不出至少 3 个正向、可核验事实时，不选为 keypoint。
- 人名 / 公司 / 产品 / 术语 / 缩写保持原文
- icon 必须来自白名单
- `sourceTitle` **14–24 字**完整新闻标题——主语+动词+关键数字/对象，**不要**写成 "X IPO"、"Y 调查" 这种关键词标签
- `overview` 与 keypoints 顺序对齐的数组；每条 **10–18 字**，是 sourceTitle 的精炼版（保留主体+1 个关键数字或动作词），用作封面 chip 一行扫读
- **`title` 是发布到 B 站的标题**（视频里不显示）：写成“AI 圈战报”，不是资讯摘要。优先使用 **情绪判词 + 硬事实 + 戏剧化解读/悬念**：先用“危！”“一夜失控！”“大塌方！”“终于来了！”等抛出情绪，再塞模型名、公司、版本、参数、额度或发布日期等具体事实，最后用“是在憋大招？”“这回要麻烦了？”等圈内聊天式追问收住。当天有单点爆发就围绕一条写；没有绝对头条时，允许用 2–3 条事实写“连爆”式合集，不能硬凑单点。可使用“鸽王”“下凡”“偷吃额度”“练废了”等圈内黑话，但不得改写发布、取消、下架、价格、参数等实际状态；传闻必须带“传/疑/或/？”等不确定标记。统一以 `｜M.D AI 日报` 形式收尾，其中 `M.D` 是月.日占位符，必须替换成当天日期，如 `7.10`，绝不能字面写成 `M.D`。
- **`coverTitle` 固定写 "今日 AI 资讯"**，用作视频封面 H1，不按天改

### 一手信源截图浮层（可选）

当 keypoint 有高价值的一手社区信号或官方页面时，可在原有卡片上叠加 1–2 张证据截图。截图不是独立幻灯片，也不改变卡片网格。

社区一手信号只能作为对应新闻的证据层：`sourceTitle`、卡片内容和口播仍以该新闻本身为主，**不得**新建“社区资讯”keypoint、独立章节或单独口播段。

- 只截原始帖子、官方公告、论文页、GitHub Release 或模型卡；不得截搜索结果、转述媒体或无关评论。
- 截图须保留足以识别来源的账号/机构和关键原文；裁掉浏览器地址栏、个人通知和无关内容。
- 截图应尽量按浮层图片区的 `4:3` 比例裁切，让有效内容同时撑满宽度和高度，避免可消除的大块上下或左右留白。优先调整精确 `selector` 或在捕获后裁图；不得拉伸变形，也不得为填满区域裁掉来源身份或关键原文。
- 图片保存到 `<OUT_DIR>/evidence/`，并在对应 keypoint 的 `evidenceOverlays` 填入相对路径、来源标签、原始 URL、说明及触发的口播句号。完整 schema 见 `references/schemas.md`。
- 每个 keypoint 最多 2 张截图；不同截图的句子范围不得重叠。没有可靠一手截图时省略该字段，不得为填充画面使用二手截图。

写入 `<OUT_DIR>/keypoints.json`，按 schemas.md 的"校验自检清单"过一遍。

**强制验证**：写完后必须用脚本解析 JSON，并检查视频画面用字段（`title`、`overview`、`sourceTitle`、`brief`、`coverHook` 如存在）没有中文直接贴英文/数字的混排错误；中文与英文/数字之间要有空格。存在 `evidenceOverlays` 时，还要检查相对图片路径存在、来源 URL 指向原始信源、来源标签与截图可见归属一致。该检查未通过不得进入 pipeline。

---

## Step 4 · 写 `script.json`

完整 schema + 示例见 [references/schemas.md](./references/schemas.md)；语气、长度配比、段落过渡见 [references/extraction-guide.md](./references/extraction-guide.md)。

`script.json` 是视频的**逐句口播稿**，也是 TTS 的唯一文本来源，不是编辑批注、解读提纲或给观众的操作建议。它只能自然说出来源已证实的事实，以及明确归因的影响说明；不得出现“解读时要看……”“团队应……”“不能只看……”等指导性或验收性措辞。

要点：
- 总字数 ≤ 750（≈ 3 分 45 秒）
- `cover` 段 ≤ 50 字，引入不预告
- 每个 `kp-N` 对应第 N 个 keypoint（0-indexed），**50–100 字**，只讲最核心的 1–2 个事实
- **最后必须加固定收尾句**：在最后一个 `kp-N` 段末尾追加一句结束语，固定写 `"以上就是今天的 AI 日报，我们明天见。"`——`slideId` 沿用最后一个 `kp-N`（挂在最后一张卡片上，不额外加画面），该句不计入该 kp 的 50–100 字，也不加停顿标记
- **`cover` 段的第一句开头加 `<#0.5#>`**——0.5 秒开场留白，让观众在语音开始前有一瞬进入状态
- **每个 `kp-N` 的第一句开头加 `<#0.3#>` 停顿标记**——MiniMax TTS 识别为 0.3 秒静音，让条目切换更自然。同一个 `kp-N` 的第 2、3 句不加；`cover` 除了首句外的其它句子也不加
- 每句 10–40 字（停顿标记不计入字数），必须以 。?! 结尾
- 数字用阿拉伯，年份"2026 年"
- 术语保持原文（同 Step 3）
- **严格控制总长度**：写完后默数总汉字数，超过 750 字必须删减，优先缩短字数多的 kp 段落

写入 `<OUT_DIR>/script.json`。

若本期使用截图浮层，此时回填 `keypoints.json` 的 `showFromSentence` 和 `showThroughSentence`：按对应 `kp-N` 内的最终句序从 1 计数。改动口播句序后必须一并复核这些范围。

### Step 4.5 · 截取一手证据图（仅选中的 keypoint）

为要进入视频的社区一手信号创建 `<OUT_DIR>/evidence-manifest.json`，schema 见 [references/schemas.md](./references/schemas.md)。每项对应已有 `kp-N`，不新建任何视频内容。

```bash
tsx <SKILL_DIR>/scripts/capture-evidence.ts \
  --keypoints <OUT_DIR>/keypoints.json \
  --manifest  <OUT_DIR>/evidence-manifest.json \
  --out-dir   <OUT_DIR>/evidence
```

脚本只访问公开的 HTTP(S) 原始页面，截取页面内容而非浏览器界面，并回填同一 keypoint 的 `evidenceOverlays`。默认截取唯一的 `main` 区域；只有能准确定位原帖且选择器唯一时才填写 `selector`。若页面被登录墙遮挡、截图不是原帖/原始页面、文字无法辨识或包含无关隐私信息，删除该候选，不要以搜索结果或二手转述替代。

运行后重新解析 `keypoints.json`，确认截图数量、来源 URL 和句子范围正确；逐张检查实际图片比例与构图，必要时将捕获结果裁成接近 `4:3` 比例，确认有效内容尽量撑满图片区且来源身份、关键原文完整，再进入 pipeline。

---

## Step 5 · 跑机械流程

```bash
tsx <SKILL_DIR>/scripts/run-pipeline.ts \
  --out          <OUT_DIR> \
  --theme        <THEME> \
  --voice        <VOICE> \
  --bgm          <BGM> \
  --tts-provider <TTS_PROVIDER>
```

`TTS_PROVIDER=custom` 时，确保跑这条命令的 shell 里已 `export TTS_CUSTOM_CMD` 和 `TTS_CUSTOM_ARGS`（子进程继承）。

单步失败：每个脚本单独可用，或用 `--start-from <tokens|tts|merge|record|compose>` 从指定步骤接着跑，避免重跑昂贵的 TTS。详见 [references/troubleshooting.md](./references/troubleshooting.md)。

`merge` 步会把章节信息提前写入 `timeline.json` 的 `chapters` 字段，并同步进 `player.json`：
- 封面段标题固定为 `概览`
- 后续 `kp-N` 段标题使用 `keypoints.json` 里的对应 `overview[N]`
- 每章包含 `slideId` / `title` / `startSec` / `durSec`，可供播放器底部章节条和后续发布文档复用

### Step 5.5 · 成片验证（投稿前必做）

生成 `final.mp4` 后必须做 QA，不能只看命令成功：

1. 用 `ffprobe` 检查视频为 1920×1080、含音频流，视频/音频时长与 `timeline.json.totalSec` 接近。
2. 抽取封面段和每个 keypoint 章节开始后 1–2 秒的帧，拼成 contact sheet。
3. 视觉检查 contact sheet：日期是本期日期；封面和每张卡片内容与 `keypoints.json` / `timeline.chapters` 对应；不是上一期旧内容；文字没有明显溢出、重叠、裁切。
4. 如果画面显示旧内容，先检查 `<SKILL_DIR>/dist-renderer/player.json` 是否还是上一期数据；把 `OUT/player.json` 复制到该路径后，从 `--start-from record` 重录。
5. 若有 `evidenceOverlays`，在每个截图触发句期间额外抽帧：确认截图是当期素材、来源标签和说明正确、有效内容尽量撑满浮层图片区且没有可消除的大块留白。
6. 验证失败时不得交付为可发布成片，更不得执行任何上传/投稿命令。先定位原因，修复 `keypoints.json`、`script.json`、`player.json`、录制脚本或封面/元数据，再从对应步骤续跑并重新验证；全部通过后再继续交付或投稿。

推荐抽帧方式：

```bash
ffmpeg -y -ss <chapter_start+1> -i <OUT_DIR>/final.mp4 -frames:v 1 <OUT_DIR>/qa-frame-<n>.jpg
```

---

## Step 6 · 报告

- `final.mp4` 绝对路径
- **B 站发布标题**：照搬 `keypoints.json` 的 `title` 字段，单独成行方便用户直接复制粘贴到 B 站上传表
- 关键统计：keypoint 数 / 口播字数 / 视频时长（`timeline.json` 的 `totalSec`）
- 成片 QA 结果：说明已抽帧核对哪些章节，以及是否发现旧内容/错位/溢出
- 中间产物保留在 `<OUT_DIR>` 下方便排查

出错查 **[references/troubleshooting.md](./references/troubleshooting.md)**。
