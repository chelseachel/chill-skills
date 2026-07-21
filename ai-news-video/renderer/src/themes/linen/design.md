---
name: Linen
id: linen
description: 温润亚麻底配单色靛墨重点，无卡片描边，仅靠发际线、留白与节奏推进阅读；克制中保留一丝灵动呼吸。
colors:
  surface: '#f7f2e8'
  surface-dim: '#e5dfd0'
  surface-bright: '#fbf8f1'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3eddd'
  surface-container: '#ede7d3'
  surface-container-high: '#e7e1cc'
  surface-container-highest: '#e1dbc4'
  surface-variant: '#ede7d3'
  surface-tint: '#3f38b0'
  on-surface: '#1a1b26'
  on-surface-variant: '#5b5d6e'
  outline: '#b8ae9a'
  outline-variant: '#e0d7c4'
  primary: '#3f38b0'
  on-primary: '#ffffff'
  primary-container: '#dedaf5'
  on-primary-container: '#0e0763'
  primary-fixed: '#dedaf5'
  primary-fixed-dim: '#a8a2d8'
  on-primary-fixed: '#0a0445'
  on-primary-fixed-variant: '#241d7e'
  inverse-primary: '#bcb5e5'
  secondary: '#5b5d6e'
  on-secondary: '#ffffff'
  secondary-container: '#e1e0e5'
  on-secondary-container: '#191a23'
  secondary-fixed: '#e1e0e5'
  secondary-fixed-dim: '#b8b7c0'
  on-secondary-fixed: '#0f101a'
  on-secondary-fixed-variant: '#404252'
  tertiary: '#7b6f58'
  on-tertiary: '#ffffff'
  tertiary-container: '#e8e0ce'
  on-tertiary-container: '#221a09'
  tertiary-fixed: '#e8e0ce'
  tertiary-fixed-dim: '#c7bca0'
  on-tertiary-fixed: '#1a1305'
  on-tertiary-fixed-variant: '#574b36'
  error: '#b3261e'
  on-error: '#ffffff'
  error-container: '#f9dedc'
  on-error-container: '#601410'
  background: '#f7f2e8'
  on-background: '#1a1b26'
  inverse-surface: '#27241c'
  inverse-on-surface: '#f3eee2'
typography:
  display:
    fontFamily: 'Schibsted Grotesk'
    fontSize: 112px
    fontWeight: '700'
    lineHeight: 116px
    letterSpacing: '-0.035em'
  h1:
    fontFamily: 'Schibsted Grotesk'
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 76px
    letterSpacing: '-0.02em'
  h2:
    fontFamily: 'Schibsted Grotesk'
    fontSize: 42px
    fontWeight: '500'
    lineHeight: 58px
    letterSpacing: '-0.005em'
  body-lg:
    fontFamily: 'Schibsted Grotesk'
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 50px
    letterSpacing: '0.005em'
  body-md:
    fontFamily: 'Schibsted Grotesk'
    fontSize: 26px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: '0.01em'
  label-caps:
    fontFamily: 'Schibsted Grotesk'
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: '0.18em'
  button:
    fontFamily: 'Schibsted Grotesk'
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: '0.02em'
rounded:
  sm: '2px'
  DEFAULT: '4px'
  md: '6px'
  lg: '12px'
  xl: '20px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '18px'
  lg: '32px'
  xl: '52px'
  xxl: '86px'
  gutter: '24px'
  page: '144px'
shadows:
  card: 'none'
  elevated: '0 1px 0 0 var(--color-outline-variant)'
animation:
  enter: liftIn
  duration: 720
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
  stagger: 90
  exit: liftOut
  exitDuration: 360
fonts:
  - family: 'Schibsted Grotesk'
    source: google
    weights: '400;500;700;900'
---

# Design System: Linen

## 1. Overview

**Creative North Star: "A Linen Press Daily"**

Linen 是一份**铺在亚麻纸上的晨间新闻简报**——不喧哗，不堆砌，每一条要点都有自己呼吸的余地。它借用了独立出版（Stripe Press、Are.na 编辑页、Schibsted 报章前页）的克制气质：温润纸面打底，深靛重墨落字，分隔靠一根 1px 发际线而非一只描边盒子。整版只有一个声音——靛墨——它出现的次数越少，每一次就越有分量。

观众的物理场景是清晨通勤者的屏幕：眼睛刚醒，注意力是浅的，希望第一眼就读得出"今天是什么"。Linen 的密度被刻意压低，标题、要点、副标之间用 `xxl`（88px）级留白拉开节奏，而不是用阴影或彩色卡片来制造层次。它拒绝任何"AI 资讯应有"的反射式视觉——不要 sage green 编辑色、不要紫青渐变、不要玻璃拟态。

**Key Characteristics:**
- 温暖亚麻底（`#f7f2e8`）+ 冷调深墨字（`#1a1b26`），制造纸笔的温度差。
- 单色 accent（深靛 `#3f38b0`），全屏用量 ≤10%；它只出现在编号、图标、进度填充上。
- 无卡片、无阴影；分组靠 1px 发际线 + 大片留白完成。
- 单一字族 Schibsted Grotesk，靠字重 (400 / 500 / 700 / 900) 与字号差建立层级；display 字号 112px / 字重 900，与 body 22px / 400 形成 ≥5× 跨度。
- 入场动画 `liftIn`（28px 上浮 + 渐显，720ms / quintic ease-out），90ms 错峰，节奏像翻开下一页报纸。

## 2. Colors: The Linen & Ink Palette

整套色系只有两位主角——温润亚麻与深靛重墨——其余都是配角，负责让两者的对比保持读得舒服。

### Primary
- **Deep Linen Ink** (`#3f38b0`, oklch ≈ 0.43 / 0.155 / 275)：唯一的 accent。仅出现在 ① 封面与 KP 的编号数字、② lucide 描边图标、③ 进度条填充、④ 顶部 / 底部的细横线主笔。其它任何彩色冲动都属违规。

### Neutral
- **Warm Linen** (`#f7f2e8`)：背景与画布。带 ≈0.012 chroma 的暖偏移，避免出现"廉价灰白"。所有页面的 `background` 都使用此色。
- **Cool Slate Ink** (`#1a1b26`)：主文字。微微偏冷，与暖底形成对位温差，符合"纸 vs 墨水"的物理感。**禁止使用 `#000`**。
- **Quiet Slate** (`#5b5d6e`)：副文字、KP meta、日期。
- **Linen Hairline** (`#e0d7c4`)：1px 分隔线（`outline-variant`）。所有视觉分组都靠它来完成。
- **Sand Border** (`#b8ae9a`)：少量结构性边界（如进度条轨道）使用的稍深线。

### Auxiliary（仅为 schema 完备保留，不在画面中独立出现）
- `secondary` `#5b5d6e` 与 `tertiary` `#7b6f58` 仅作 token 占位；CSS 覆盖会把所有图标 / 编号统一回 Primary，**禁止打开三色轮转**。

### Named Rules

**The One Voice Rule.** Primary 是这套设计中**唯一**被允许的彩色发声。它在任何一屏里的覆盖面积都必须 ≤10%——通常只覆盖编号字符、图标描边和 4px 进度条这三类元素。多出来的任何彩色都会让"克制"立刻塌方为"普通 SaaS"。

**The Warm-Cool Tension Rule.** 底色暖（亚麻 `#f7f2e8`），墨水冷（`#1a1b26`），accent 深冷（靛 `#3f38b0`）——这一对温差是 Linen 的指纹。任何把背景拉冷或把文字拉暖的修改都会让画面变成无差别米色，必须拒绝。

## 3. Typography

**Display & Body Font:** Schibsted Grotesk（CJK fallback：`PingFang SC` → `Source Han Sans SC` → `sans-serif`）

**Character:** 单一字族策略，**不混用第二款字体**。Schibsted Grotesk 出自挪威新闻集团 Schibsted 的内部设计部门，骨架属于现代 grotesque，但 lowercase a / g 保留单层结构与微妙的笔意尾巴——它带着报章字体特有的"被人手编排过"的体温，配合大字号（≥64px）会自然显出灵动感。CJK 回退到苹方 / 思源黑，形成清晰的字面韵律。

### Hierarchy
- **Display** (900, 112px / 116px, letter-spacing -0.035em)：仅用于封面主标题。极重字重 + 强压缩字距 = 一击定调，剩下交给留白。
- **H1** (700, 64px / 76px, -0.02em)：KP 卡的小节大标题（`sourceTitle`）。
- **H2** (500, 44px / 58px, -0.005em)：KP 元素的 subtitle；字重满足 1920×1080 视频可读性，与 H1 的 700/64px 仍有明确对比。
- **Body Large** (400, 30px / 46px, 0.005em)：封面 overview 列表正文。行高 1.53×，给 body 充足呼吸。
- **Body Medium** (400, 26px / 42px, 0.01em)：KP 元素 brief。适合视频画面的阅读字号，行高 1.54×。
- **Label Caps** (700, 14px / 20px, 0.18em tracking, uppercase)：日期、KP 编号、metadata。大字距 + 大写在小字号下提供"标签感"而不增加视觉重量。

### Named Rules

**The Single-Family Rule.** 整套设计只存在 Schibsted Grotesk 一个字族。任何"display 用 serif、body 用 sans"的本能反应都必须拒绝——双字族会立刻把 Linen 推向 magazine reflex，破坏它的当代独立出版气质。

**The Weight-Over-Color Rule.** 强调要用字重而非颜色。需要更突出，用 700/900；不能用 primary 来"标黄"。Primary 永远只属于 The One Voice Rule 列出的几个位置。

**The Breathing Body Rule.** 正文行高 ≥1.5×（28px / 42px）；CJK 字体行高再低就会贴在一起，破坏"呼吸感"这一个核心目标。

## 4. Elevation

**The Flat-By-Default Rule.** Linen 主题全程**零阴影**。所有层级关系都靠 ① 1px 发际线（`--color-outline-variant`）与 ② 留白尺度差（`xxl=88px` / `xl=56px` / `lg=32px`）来表达。

`--shadow-card` 显式被设为 `none`；`--shadow-elevated` 仅是一根 1px 底线（`0 1px 0 0 var(--color-outline-variant)`），用于**绝不会出现于本视频流**的悬浮态——把它留在 token 里只是为了 schema 兼容。

**The No-Card Rule.** 不允许使用矩形描边或填色卡片来给元素分组。Cover 的 chip、KP 的 element 都被强制改成"裸排"——没有背景、没有边框、没有阴影。它们的"是一组"完全靠对齐与间距读出。

## 5. Components

### Cover
- **Layout：** 顶部一条 label 行（左：`DAILY BRIEFING · 日期`，右：`N STORIES`）→ 1px 满宽发际线 → 大段留白（`xxl`）→ Display 主标题（左对齐，max-width 1500px）→ 1px 发际线 → 单列 overview 列表（每行：靛墨编号 + 标题文字）→ 底部空白。
- **Chip：** 不是 chip，而是**编号行**。`background / border / shadow` 全部清零；`padding-block: var(--space-md)`；行间用 1px 发际线分隔。`chip-num` 用 H2 字号 + Primary 色 + tabular-nums（保证 01 / 02 / 10 等宽）；`chip-text` 用 body-lg。
- **三色轮转禁用：** 全局 `nth-child(3n+2/3)` 的 tertiary / secondary 覆盖被 Linen 主题级强制改回 Primary。

### KeyPoint
- **Header：** 顶部一行：左侧 `KP 02 / 03` label-caps + 中点分隔 + 右侧 `TODAY` label-caps。其下一根 1px 满宽发际线，再下方 H1 标题。标题再下一根更细的发际线（带 `ruleDraw` 入场动画）作为内容起点。
- **Element grid：** 同样 2-3 列布局，但**每个 element 是裸排块**——无背景、无边框、无阴影。结构变成：图标（左上）→ subtitle（H2）→ brief（body-md）。
- **Element icon：** 56px lucide 描边图标，`strokeWidth: 1.5`，颜色 = `--color-primary`。**禁用方块底色**——盒子被取消，让线条在亚麻底上独立发声。
- **Progress：** 4px 高，背景 `--color-outline-variant`，填充 `--color-primary`，圆角 `--radius-full`。位于卡片底部，是全屏唯一的"水平推进笔触"。

### Chips & Cards & Inputs
- 不存在。本主题刻意没有 card 与 input 组件——视频流不需要交互形态。

### Named Rules

**The Hairline-Not-Box Rule.** 任何分组冲动都必须先用 1px 发际线尝试解决，盒子是最后手段且本主题永远不开启。

**The Bare-Stroke Icon Rule.** 图标只出现描边（1.5pt），永远不允许背景方块/圆形底色。它的"重量"靠 56px 的尺寸而非饱和填充。

## 6. Do's and Don'ts

### Do:
- **Do** 把 accent (`#3f38b0`) 仅用于编号、图标描边、进度填充——三处加起来 ≤10% 屏幕面积。
- **Do** 用 1px 发际线（`--color-outline-variant`）做所有分组；横线长度等于内容宽度，不要带圆角。
- **Do** 在大留白（`xxl=88px`）中安置内容，让 1920×1080 显得"半空"而非"半满"。
- **Do** 标题用 Display 900 / 112px、body 用 400 / 22px——拉满字重对比让层级一目了然。
- **Do** 进场动画统一用 `liftIn`（28px 上浮，720ms quintic ease-out，90ms 错峰），节奏像翻报纸。
- **Do** 数字用 `font-variant-numeric: tabular-nums`，让 01–10 编号纵向对齐。

### Don't:
- **Don't** 给 element 或 chip 加任何 background / border / box-shadow——本主题刻意取消卡片。
- **Don't** 重启 `nth-child(3n+2/3)` 的 tertiary / secondary 三色轮转；图标统一只用 Primary。
- **Don't** 使用渐变文字（`background-clip: text`）；标题永远是单一 Cool Slate Ink。
- **Don't** 引入第二款字体——尤其禁止把 Display 改回 serif（Fraunces / Newsreader / Crimson 等都属反射默认，刻意拒绝）。
- **Don't** 在背景上加任何 `radial-gradient` 色块或玻璃模糊——温暖亚麻底必须保持平整，深度由发际线和字重提供。
- **Don't** 使用 `#000` 或 `#fff`；中性色必须保留亚麻或墨水的微弱 chroma。
- **Don't** 添加 em dash (`—`) 进入正文 token；用逗号、句号、冒号或括号代替。
