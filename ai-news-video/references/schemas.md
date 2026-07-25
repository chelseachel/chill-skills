# JSON Schemas — keypoints.json & script.json

This file is the source of truth for the two JSON files Claude writes during steps 3 and 4 of the pipeline. Read this whenever you're about to write either file.

---

## 1. `keypoints.json` (from step 3)

The structured representation of the source article. This drives the visual frames.

```typescript
type KeypointElement = {
  icon: string;       // Lucide icon name — must come from ICON_WHITELIST below
  subtitle: string;   // 2–6 个汉字。短而准——它是元素的标签，不是一句话
  brief: string;      // 20–60 个中文汉字量级。忠于原文，一句话讲清楚这个元素。
                      // 只承载可核验事实：主体、动作、数字、范围、机制、受影响对象、官方/报道表述。
                      // 不把"为什么重要/今日洞察"里的判断改写成卡片事实。
                      // 英文模型名、公司名、代码、漏洞编号、数字和单位不按字母逐个计数；
                      // 为保留关键专名或数字可略超，但不应把卡片撑成段落。
};

type Keypoint = {
  sourceTitle: string;          // **完整新闻标题**，14–24 汉字。不必照搬原文标题——可提炼核心词，但不能歪曲事实。
                                // 必须说出"谁做了什么 / 什么发生了"——含主语 + 动词 + 关键数字/对象。
                                // 人名 / 公司名 / 产品名 / 缩写保持原文。
                                // ❌ "SpaceX IPO 押注 AI"（关键词标签）
                                // ✅ "SpaceX 完成 750 亿 IPO，签 AI 算力大单"
                                // ❌ "Mistral 传闻30亿欧"
                                // ✅ "Mistral 洽谈 30 亿欧融资，估值或翻倍至 200 亿"
  elements: KeypointElement[];  // 3–8 个要点元素
  evidenceOverlays?: EvidenceOverlay[]; // 可选：一手截图浮层，最多 2 张
};

type EvidenceOverlay = {
  asset: string;                // 相对 keypoints.json 的图片路径；仅 .jpg/.jpeg/.png/.webp，例如 evidence/kp-0-openai-x.png
  sourceLabel: string;          // 画面归属，如 "OpenAI @OpenAI · X" 或 "Qwen 官方 GitHub"
  sourceUrl: string;            // 原始帖子、公告、论文、Release 或模型卡 URL，供审计，不在画面中显示
  caption: string;              // 8–28 字，说明截图佐证的事实；不添加新判断。X 原帖的中文解释只写在此处，截图本身保留原文
  showFromSentence: number;     // 对应 kp-N 的第几句口播开始展示，1 起算
  showThroughSentence: number;  // 展示到对应 kp-N 的第几句结束，含本句；不得与同条其他截图范围重叠
};

type ExtractResult = {
  title: string;        // **发布到 B 站的战报式标题**（视频里不显示，纯发布元数据）
                        //   结构：情绪判词 + 硬事实 + 戏剧化解读/悬念。可围绕一个大事件，
                        //   也可在没有绝对头条时串联 2–3 条强新闻做“连爆”叙事。
                        //   情绪可夸张、可用圈内黑话，但模型状态、公司、数字和消息归因必须准确；
                        //   传闻必须带“传/疑/或/？”等不确定标记。统一以 `｜M.D AI 日报` 收尾，
                        //   其中 M.D 必须替换为当天月.日，例如：
                        //   `危！DeepSeek V4 正式版深陷时空裂缝！鸽王登基还是正在憋终极核技？｜7.20 AI 日报`
                        //   `AI 圈一夜失控！Fable 5 下架、Codex 限额清零、Grok 2T 开始苏醒？｜7.18 AI 日报`
  coverTitle: string;   // **视频封面 H1**，固定写 "今日 AI 资讯概览"，不要按天改
  date: string;         // 日期，从原文或文件名提取（中英文写法均可）
  overview: string[];   // 封面概览，每条 **10–18 汉字**。同 sourceTitle 顺序对齐，但措辞可独立。
                        // 比 sourceTitle 稍短的"精炼版"——必须含主体 + 1 个关键数字或动作词，
                        // 而不只是名词标签。封面 chip 一行扫读级别。
                        // ❌ "SpaceX IPO"（只是名词）
                        // ✅ "SpaceX 750 亿 IPO 押注 AI 算力"
                        // ❌ "Anthropic 模型下架"
                        // ✅ "Anthropic 强令下架 Fable 5"
  keypoints: Keypoint[]; // 2–8 个，按重要性排序（最重要在前）
};
```

### Why 3–8 elements per keypoint?

视觉网格目前支持：3×1（3 个）、2×2（4 个）、3×2 留空（5 个）、3×2（6 个）、4×2 留空（7 个）、4×2（8 个）。超出 8 个会破网格，少于 3 个看起来空旷。挑要点时按"该新闻最有信息量的几条事实"取舍，不必凑数。

### Example

```json
{
  "title": "AI 圈大地震！GPT-5 推理快 3 倍、价格砍 6 成，开发者要起飞了？｜5.10 AI 日报",
  "coverTitle": "今日 AI 资讯概览",
  "date": "2026-05-10",
  "overview": [
    "GPT-5 正式发布，推理快 3 倍",
    "Meta 开源新一代基础模型",
    "Google DeepMind 数学推理突破"
  ],
  "keypoints": [
    {
      "sourceTitle": "OpenAI 正式发布 GPT-5，推理速度提升 3 倍",
      "elements": [
        { "icon": "Sparkles", "subtitle": "多模态增强", "brief": "GPT-5 支持图片、音频、视频联合理解，MMMU 基准 92.3 分超过人类平均。" },
        { "icon": "Zap",      "subtitle": "推理提速",   "brief": "链式思维速度提升 3 倍，复杂数学题解答时间从 45 秒降至 15 秒。" },
        { "icon": "DollarSign","subtitle": "定价下调",  "brief": "API 价格相比 GPT-4 Turbo 下调 60%，同时支持 128K 上下文窗口。" }
      ],
      "evidenceOverlays": [
        {
          "asset": "evidence/kp-0-openai-x.png",
          "sourceLabel": "OpenAI @OpenAI · X",
          "sourceUrl": "https://x.com/OpenAI/status/1234567890",
          "caption": "官方帖同步公布 GPT-5 发布信息",
          "showFromSentence": 1,
          "showThroughSentence": 2
        }
      ]
    }
  ]
}
```

---

## 2. `evidence-manifest.json` (from step 4.5)

Only create this file for selected keypoints that have public, first-hand evidence. The capture script saves PNGs to `evidence/` and writes the resulting `evidenceOverlays` back into `keypoints.json`; it does not create a slide or a chapter.

```typescript
type EvidenceCapture = {
  keypointIndex: number;        // Existing keypoint index, zero-based
  sourceLabel: string;          // Visible attribution, e.g. "OpenAI @OpenAI · X"
  sourceUrl: string;            // Public original post/page URL
  caption: string;              // What this source corroborates, not a new claim
  showFromSentence: number;     // 1-based sentence within the matching kp-N
  showThroughSentence: number;  // Inclusive 1-based sentence within the matching kp-N
  selector?: string;            // Optional, only when one page element uniquely identifies the source post
  settleMs?: number;            // Optional 0–10000 ms render wait; default 1400
};

type EvidenceManifest = { captures: EvidenceCapture[] };
```

Example:

```json
{
  "captures": [
    {
      "keypointIndex": 0,
      "sourceLabel": "OpenAI @OpenAI · X",
      "sourceUrl": "https://x.com/OpenAI/status/1234567890",
      "caption": "官方帖同步公布 GPT-5 发布信息",
      "showFromSentence": 1,
      "showThroughSentence": 2
    }
  ]
}
```

---

## 3. `script.json` (from step 4)

The narration broken into sentences, each tied to a slide. Each sentence becomes one TTS clip; the slide's display duration is the sum of its sentences' audio durations.

```typescript
type ScriptSentence = {
  slideId: 'cover' | `kp-${number}`;  // "cover" 或 "kp-0", "kp-1"...
  text: string;                       // 单句，以 。?! 结尾。每个 kp-N 的第一句
                                      // 以 "<#0.3#>" 开头作为切换停顿（MiniMax
                                      // TTS 识别为 0.3 秒静音）；cover 首句用
                                      // "<#0.5#>" 做 0.5 秒开场留白。
};

type Script = {
  sentences: ScriptSentence[];
};
```

### Why split into sentences?

口播稿按句拆分让我们能精确把每句音频时长对应到某张幻灯片，避免画面在还没讲到时切走。每句独立 TTS 也让单句失败不会废掉整段。

### Example

```json
{
  "sentences": [
    { "slideId": "cover", "text": "<#0.5#>今天是 2026 年 5 月 10 日，以下是今日最重要的 AI 资讯。" },
    { "slideId": "cover", "text": "本期共六条重点，涵盖大模型、芯片与监管三大领域。" },
    { "slideId": "kp-0",  "text": "<#0.3#>首先是 GPT-5 的正式发布。" },
    { "slideId": "kp-0",  "text": "在多模态能力方面，它支持图片、音频和视频的联合理解。" },
    { "slideId": "kp-0",  "text": "推理速度提升三倍，API 价格相较 GPT-4 Turbo 下调六成。" },
    { "slideId": "kp-1",  "text": "<#0.3#>下一条，Meta 开源了新一代基础模型。" }
  ]
}
```

---

## 4. `timeline.json` generated chapters

`timeline.json` is generated mechanically from TTS durations. During the merge step, the pipeline also adds `chapters` so chapter labels are available before any B 站 upload/publishing step.

```typescript
type Chapter = {
  slideId: 'cover' | `kp-${number}`;
  title: string;     // cover 固定为 "本期概要"，kp-N 使用 overview[N]
  startSec: number;  // seconds from video start
  durSec: number;    // chapter duration in seconds
};

type Timeline = {
  theme: string;
  totalSec: number;
  slides: SlideTiming[];
  cues: Cue[];
  chapters?: Chapter[];
};
```

`chapters` is derived from `timeline.slides` plus `keypoints.json`; do not hand-write it in Step 3/4.

---

## 5. Lucide Icon Whitelist

只允许从下列名称里选，**区分大小写**（lucide-react 用 PascalCase）。挑能呼应 element 主题的图标，不必死板对应——例如金融类用 `TrendingUp`/`DollarSign`/`Coins`，研究类用 `Microscope`/`FlaskConical`/`Brain`。

```
Rocket  Sparkles  Brain  FlaskConical  Cpu  Database
Code  Terminal  Bot  CircuitBoard  Network  Globe
Building2  TrendingUp  DollarSign  Coins  BarChart3
Zap  Lightbulb  Scale  Shield  ShieldAlert  Lock
KeyRound  Mic  Volume2  Eye  ScanText  BookOpen
GraduationCap  Microscope  Wrench  Hammer  Box
Package  Layers  GitBranch  Workflow  Megaphone
Newspaper  AlertTriangle  Gavel  Users  Briefcase
Factory  Car  Plane  Stethoscope  HeartPulse  Trophy
Target  Calendar  Clock  Flag  Star  Crown  Gem
```

不在白名单里的名字会被 `KeyPoint.tsx` 回退到 `Sparkles`，所以**不要发挥**——挑不到合适的就选最近义的，比如"安全监管"用 `Shield` 或 `Gavel`，不要写 `Police`。

---

## 6. 校验自检清单

写完两个 JSON 后过一遍：

- [ ] `title` 是“情绪判词 + 硬事实 + 戏剧化解读/悬念”的战报式标题；可写单点爆发，也可串联 2–3 条强新闻做连爆叙事，不写成平铺资讯摘要
- [ ] `title` 至少含一个可核验的模型、公司、版本、数字、额度或明确状态；情绪和黑话可以夸张，但不得篡改发布、取消、下架、价格、参数等事实，传闻须标明不确定性
- [ ] `title` 以当天月.日形式收尾，如 `｜7.10 AI 日报`，不写成字面 `M.D`；最好不超过 40 汉字
- [ ] `coverTitle` 等于固定字符串 "今日 AI 资讯概览"
- [ ] `keypoints.length` 在 2–8 之间
- [ ] 每个 `keypoint.elements.length` 在 3–8 之间
- [ ] 每个 `subtitle` 是 2–6 个汉字（不是英文短语）
- [ ] 每个 `brief` 是 20–60 个中文汉字量级（按中文阅读密度估算；英文/数字/代码不逐字母计数，可为保留关键事实略超）
- [ ] `brief` 含具体事实、数字、对象或机制，避免只写"引发关注/影响深远/值得警惕"这类空泛判断
- [ ] `brief` 没有把分析当事实：避免"这说明/这意味着/将会影响/相互连接/成为趋势"等主观连接句；这类内容应放入口播或洞察
- [ ] `brief` 优先来自日报"关键细节"，而不是"为什么重要"或"今日关键洞察"
- [ ] 所有 `icon` 都在白名单里
- [ ] 每个 `sourceTitle` 在 14–24 字，含主语+动词+关键数字/对象（不是关键词标签）
- [ ] 每条 `overview` 在 10–18 字，含主体+1 个关键数字或动作词（不是名词堆叠）
- [ ] `overview.length === keypoints.length`，且按顺序对齐
- [ ] `evidenceOverlays` 只用于原始帖子、官方公告、论文页、GitHub Release 或模型卡；每个 keypoint 最多 2 张，截图不包含浏览器隐私信息或无关评论；X 原帖必须显示发布者原始语言，不得使用平台自动翻译
- [ ] 每张截图路径相对 `keypoints.json`，文件存在且扩展名为 `.jpg`、`.jpeg`、`.png` 或 `.webp`；`sourceUrl` 指向该截图的一手页面
- [ ] `showFromSentence` / `showThroughSentence` 是对应 keypoint 内从 1 起算的有效句号，且同一 keypoint 的截图时间范围不重叠
- [ ] `evidence-manifest.json` 只指向公开的一手页面；每项绑定已有 keypoint，不新建“社区资讯”keypoint、章节或口播段
- [ ] `script.sentences` 里每句 ≤50 字、以 。?! 结尾（停顿标记 `<#x#>` 不计入字数）
- [ ] `script.json` 是最终逐句口播稿，而非编辑批注或观众指导；不得含“解读时要看”“团队应”“不能只看”等指导性话术
- [ ] `cover` 段 ≤3 句；每个 `kp-N` 段 2–5 句
- [ ] `cover` 段的**第一句**以 `<#0.5#>` 开头作为开场留白
- [ ] 每个 `kp-N` 段的**第一句**以 `<#0.3#>` 开头作为切换停顿；cover 其它句、以及 kp 同段后续句**不要**重复加
- [ ] 总字数 ≤ 750（≈ 3 分 45 秒）
- [ ] `cover` 段 ≤ 50 字；每个 `kp-N` 段 50–100 字左右
- [ ] 所有 `slideId` 都形如 `cover` 或 `kp-N`，N 与 `keypoints` 下标对齐
- [ ] 中英文混排时，中文与英文/数字之间有空格（如「GPT 模型」，不要写成「GPT模型」）
