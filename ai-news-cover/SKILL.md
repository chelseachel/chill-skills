---
name: ai-news-cover
description: 为「AI 日报视频」生成发布用的封面图（视频网站缩略图），与视频本身相互独立。输入是 ai-news-video 产出的 keypoints.json（或任意含 coverTitle/date/overview 的 JSON），每次生成两种比例的封面：1920×1080 (16:9) 与 1440×1080 (4:3) 各一张 png+jpg。每期封面风格一致，仅当期文案与要点不同。**Use this skill whenever the user mentions** 生成视频封面、做封面图、封面缩略图、video cover、thumbnail、B 站封面、换张封面，尤其在已经用 ai-news-video 出过视频之后。
---

# AI 日报封面 Skill

输入一份 `keypoints.json`（ai-news-video 的产物），每次输出两种比例的发布封面：
- `cover.png` / `cover.jpg` —— **1920×1080 (16:9)**，B 站等视频网站主封面
- `cover-4x3.png` / `cover-4x3.jpg` —— **1440×1080 (4:3)**，适合按 4:3 裁切显示的平台

封面**独立于视频**，仅用于上传到视频网站时作缩略图。视觉风格固定（linen 缩略图变体），每期只换当天文案。

你（Claude）负责写/补封面爆点标题 `coverHook`；本地脚本负责截图与压图。

---

## Step 0 · 解析参数

| 参数 | 说明 | 默认 |
|---|---|---|
| `INPUT` | `keypoints.json` 绝对路径 | （必填） |
| `OUT_DIR` | 输出目录 | `<INPUT 同目录>` |

`SKILL_DIR` = 本文件所在目录。

封面只读取 INPUT 的这几个字段：`coverTitle`、`date`、`overview[]`、可选 `coverHook`。其余字段忽略，所以一般直接把 ai-news-video 的 `out/<basename>/keypoints.json` 喂进来即可。

---

## Step 1 · 预检

```bash
cd <SKILL_DIR> && pnpm exec tsx scripts/doctor.ts
```

| 退出码 | 状态 | 处理 |
|---|---|---|
| **0** | 全部就绪 | 进 Step 2 |
| **5** | `MISSING_PLAYWRIGHT` | 在 `<SKILL_DIR>` 下跑 `npx playwright install chromium`（首次 ~130MB，告知用户耗时） |
| **4** | `MISSING_FFMPEG` | 仅影响 `cover.jpg` 压缩，PNG 不受影响。macOS 可代跑 `brew install ffmpeg`（先征得同意）；不想装就跳过，只产出 PNG |
| 其它非 0 | 未知错误 | stderr 原样转给用户，停止 |

首次还需在 `<SKILL_DIR>` 下 `pnpm install`（装 React/Vite/Playwright）。

---

## Step 2 · 确保有 `coverHook`（含高亮关键词）

读取 INPUT。检查是否已有 `coverHook` / `coverHookHighlight` 字段：

- **已有**：直接用，进 Step 3。
- **没有**：你来写，并写回 `keypoints.json`（新增字段，additive，不影响 ai-news-video）。

`coverHook` 规则——它是封面上那行**超大情绪判词**，决定缩略图的点击率：

- **4–10 个汉字**，封面比标题更短，只负责先把人拉住
- 可以取当天最重要的一条新闻，也可以概括当天 2–3 条强新闻共同形成的气氛；具体模型名、数字和状态交给 B 站标题承载
- 使用战报感和圈内聊天式措辞：`突然降价`、`价格战来了`、`今天有点乱`、`又出事了`、`龙王归来`、`大厦将倾`
- 情绪可以夸张，但不能独立制造原文没有的事件；必须能由对应视频标题和前 30 秒新闻事实支撑
- 不要 emoji、不要感叹号堆砌、不要书名号
- ✅ "价格战来了"
- ✅ "今天有点乱"
- ✅ "代码小偷"
- ❌ "今日 AI 大事件"（太空泛）
- ❌ "彻底完蛋"（无事实支撑的结论）

`coverHookHighlight` 规则——`coverHook` 里**最具爆点的一个关键词**，封面会给它加靛墨荧光笔底色，作为唯一的视觉焦点：

- 必须是 `coverHook` 的**精确子串**（含空格/大小写一致），否则不生效、整句回退到固定下划线
- 选**产品名 / 关键数字 / 强动词 / 核心情绪词**之一，通常是观众一眼要捕捉的那个词
- 只选**一个**，别贪多——多个高亮会稀释焦点
- 例：`coverHook: "价格战来了"` → `coverHookHighlight: "价格战"`；`coverHook: "今天有点乱"` → `coverHookHighlight: "有点乱"`

封面只承载一句情绪化钩子；`overview` 仅用于底部"今日 N 条"的计数（`overview.length`），无需另写次要文案。

---

## Step 3 · 生成封面

```bash
cd <SKILL_DIR> && pnpm exec tsx scripts/cover.ts --input <INPUT> --out <OUT_DIR>
```

产出 4 个文件（ffmpeg 不可用时只出 PNG）：
- `<OUT_DIR>/cover.png` + `cover.jpg`（**1920×1080**，16:9）
- `<OUT_DIR>/cover-4x3.png` + `cover-4x3.jpg`（**1440×1080**，4:3）

两张封面用同一份 `coverHook` / `coverHookHighlight`，只是画布宽度不同——布局用了 flex + auto-fit 字号，所以窄一点的 4:3 里主标题会自动稍微缩小或换行，不需要人工重排。

单跑失败查脚本 stderr；多为 Playwright 未装（重跑 doctor）或端口 5178 被占用（关掉占用进程再跑）。

---

## Step 4 · 报告

- 两组封面文件的绝对路径：`cover.png` / `cover.jpg`（16:9）+ `cover-4x3.png` / `cover-4x3.jpg`（4:3）
- 用到的 `coverHook` 文案（方便用户确认/微调后重跑 Step 3）
- 提示：上传时按平台要求选比例——B 站主封面选 `cover.jpg`（16:9，体积小、≤2MB），4:3 裁切平台选 `cover-4x3.jpg`；要无损就用对应 PNG

---

## 设计约定（封面视觉一致性）

封面用一套**自有**的 linen 缩略图主题，刻意与视频主题解耦——封面只需每期之间一致，不必跟视频统一。视觉风格集中在两个文件：`renderer/src/theme/cover.css`（配色/字体 tokens）和 `renderer/src/Thumbnail.css`（版式）。

**核心理念**：封面在 App 列表页会被缩成小图，所以只承载**一句**情绪钩子——当天最值得聊的爆点或整体气氛（`coverHook`），大到指甲盖尺寸也读得清。具体事实由标题与视频承载，封面不堆会糊成噪点的小字。

**配色**（linen & ink）：
- 暖亚麻底 `#f7f2e8` + 冷墨字 `#1a1b26` + 单色靛墨 accent `#3f38b0`
- 想整体换强调色：只改 `cover.css` 里的 `--cover-accent` 一个变量，书脊 / 荧光笔 / 「AI」字标 / 方块 / pill 会一起变

**版式**（固定四区，每期只换数据）：
- **左侧书脊**：14px 靛墨竖条，编辑刊物的结构锚点
- **顶栏**：刊头「AI 日报 · DAILY AI BRIEFING」(36/28px) ｜ 日期 (36px 静谧灰)，下方一根发际线
- **主体**：`coverHook` 超大标题（字号自动适配，最大 252px，最多 2 行，长则缩小不裁切），略偏上对齐留出有意的下方负空间
- **关键词焦点**：`coverHookHighlight` 命中的子串加靛墨荧光笔底色（盖住下半部），是全图唯一的色彩焦点笔触；**没有命中时**回退到整句左下方的固定 260px 靛墨下划线，保证总有一笔 accent
- **底栏**：发际线上方，左为 N 个靛墨方块（32px，一条新闻一个，图形化表达"几条"），右为「今日 N 条」填充 pill（40px），靠左成组

**每期变化只来自数据**：`coverHook`(大标题)、`coverHookHighlight`(高亮词)、`date`(日期)、`overview.length`(方块数/N 条)。频道名「AI 日报」固定写死在 `Thumbnail.tsx`，改名在那里改。

**字号自适应**：标题在 `Thumbnail.tsx` 用 `useLayoutEffect` 从 224px 起逐步缩到塞进 2 行为止——短 hook 单行超大，长 hook 收两行，都保证可读且不溢出。
