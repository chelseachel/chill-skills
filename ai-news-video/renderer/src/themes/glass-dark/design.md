---
name: Glass Dark
id: glass-dark
description: 深空背景 + 玻璃拟态 + 紫青渐变点睛 + 顶部光晕脉冲。未来感、夜场科技播报。
colors:
  surface: '#0b0f1a'
  surface-dim: '#070a13'
  surface-bright: '#11172a'
  surface-container-lowest: '#070a13'
  surface-container-low: '#0e1424'
  surface-container: 'rgba(255,255,255,0.04)'
  surface-container-high: 'rgba(255,255,255,0.06)'
  surface-container-highest: 'rgba(255,255,255,0.10)'
  on-surface: '#f5f7ff'
  on-surface-variant: '#c7cce0'
  on-surface-muted: '#8b91a8'
  outline: 'rgba(255,255,255,0.16)'
  outline-variant: 'rgba(255,255,255,0.10)'
  primary: '#7c3aed'
  on-primary: '#ffffff'
  primary-container: 'rgba(124,58,237,0.18)'
  on-primary-container: '#d8caff'
  secondary: '#06b6d4'
  on-secondary: '#001019'
  secondary-container: 'rgba(6,182,212,0.16)'
  on-secondary-container: '#a8efff'
  tertiary: '#d47a8c'
  on-tertiary: '#1c060f'
  tertiary-container: 'rgba(212,122,140,0.18)'
  on-tertiary-container: '#ffc2cc'
  tertiary-fixed: '#ffc2cc'
  tertiary-fixed-dim: '#e0a0b0'
  on-tertiary-fixed: '#3a000f'
  on-tertiary-fixed-variant: '#7a3040'
  accent: '#06b6d4'
  on-accent: '#001019'
  accent-gradient: 'linear-gradient(135deg,#7c3aed 0%,#06b6d4 100%)'
  error: '#f87171'
  on-error: '#1a0707'
  background: '#0b0f1a'
  on-background: '#f5f7ff'
  inverse-surface: '#f5f7ff'
  inverse-on-surface: '#0b0f1a'
typography:
  display:
    fontFamily: Inter
    fontSize: 116px
    fontWeight: '700'
    lineHeight: 124px
    letterSpacing: '-0.035em'
  h1:
    fontFamily: Inter
    fontSize: 80px
    fontWeight: '600'
    lineHeight: 92px
    letterSpacing: '-0.02em'
  h2:
    fontFamily: Inter
    fontSize: 52px
    fontWeight: '600'
    lineHeight: 64px
    letterSpacing: '-0.015em'
  body-lg:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '400'
    lineHeight: 50px
    letterSpacing: '0.005em'
  body-md:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 42px
    letterSpacing: '0.005em'
  label-caps:
    fontFamily: 'Geist Mono'
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: '0.16em'
  button:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: '0.02em'
rounded:
  sm: '8px'
  DEFAULT: '14px'
  md: '20px'
  lg: '28px'
  xl: '36px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '40px'
  xxl: '64px'
  gutter: '20px'
  page: '112px'
shadows:
  card: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 24px 48px -12px rgba(0,0,0,0.6)'
  elevated: '0 1px 0 0 rgba(255,255,255,0.10) inset, 0 32px 64px -16px rgba(0,0,0,0.7)'
  glow: '0 0 80px 0 rgba(124,58,237,0.35)'
animation:
  enter: scaleIn
  duration: 700
  easing: 'cubic-bezier(.16,1,.3,1)'
  stagger: 120
  exit: scaleOut
  exitDuration: 500
fonts:
  - family: Inter
    source: google
    weights: '400;500;600;700'
  - family: 'Geist Mono'
    source: google
    weights: '500'
---

## Brand & Style

Glass Dark 是一种夜场播报风格——观众的注意力在屏幕这一束光上。它结合 visionOS / Linear / Vercel 的当代深色拟态语言：深空底色、半透明玻璃面板、紫青双色渐变点睛、顶部柔和光晕。它强调的是"科技产品发布会"的氛围，而非快讯。

## Colors

Full palette 策略：三个具名色角，每个角色有明确分工，不混用。

- 主底色 `#0b0f1a`（near-black 带蓝紫倾向），不使用纯黑——避免 OLED 上过于"死"的观感。
- 玻璃容器 = 半透明白 `rgba(255,255,255,0.04~0.10)` + `backdrop-filter: blur(24px)`。
- **Primary (紫 `#7c3aed`)** — 主视觉重心：标题渐变、图标徽章第一色、主光晕。
- **Secondary (青 `#06b6d4`)** — 动态/流动：图标徽章第二色、进度条渐变。
- **Tertiary (暖玫瑰 `#d47a8c`)** — 温暖对位：图标徽章第三色、chip 编号第三色、背景隐约暖光。三者构成冷冷暖的三角色盘，互相对比而不对抗。
- 渐变 `accent-gradient` (紫 → 青) 用于：标题文字 clip、KP 进度条。
- 文字主色 `#f5f7ff`（带 1° 的冷蓝调），次级 `#c7cce0`，禁止使用纯白 `#ffffff` 做大段正文。

## Typography

- Inter 为基础，CJK 字符回落到苹方 / 思源黑体。
- Geist Mono 用于元数据（日期、KP 编号、来源）。
- 标题 600，body 400——比 Neo-Brutal 更轻，配合大量留白。
- 字距：display 强压缩 (-0.035em) 让大标题更"凝聚"。

## Layout & Spacing

- 页面外边距 `--space-page` (112px)。
- 玻璃面板之间用 `xxl` (64px) 留白；面板内部 `lg` (24px)。
- 顶部 / 左侧背景层使用径向渐变 + 颗粒噪声纹理 (CSS `radial-gradient` + `mask-image: url(noise.svg)`)。

## Elevation & Depth

- 玻璃面板 = 边框 `1px outline-variant` + 内描边高光 `inset 0 1px 0 rgba(255,255,255,0.06)` + 外阴影 `0 24px 48px -12px rgba(0,0,0,0.6)` + `backdrop-filter: blur(24px)`。
- 关键元素（封面主标题、激活的图标徽章）追加 `glow` 阴影 `0 0 80px rgba(124,58,237,0.35)`。

## Shapes

- 卡片 `md` (20px) — 比 Serene 更圆润。
- 图标徽章 `xl` (36px) 圆角方框。
- 标签 chip `full`。

## Components

- **封面 (Cover)**：居中 display 主标题，文字应用 `accent-gradient` clip。下方一个玻璃面板横向排列 6 个 chip 列出今日小标题预览。顶部 30vh 处放置紫色光晕 `glowPulse` 2s 缓慢呼吸。
- **要点卡 (KeyPoint)**：左侧 144×144 玻璃徽章，圆角 36px，内部 lucide 图标用渐变描边 (`stroke: url(#accentGradient)`)。右侧 h1 + body-lg。底部 KP 进度条 (4px 高，渐变填充，使用 `scale-x` 动画)。
- **背景**：固定层，三个虚化色块（紫、青、深紫）做径向渐变叠加 + SVG 噪声纹理 8% opacity。

## Motion

观感目标：像 visionOS 窗口打开——丝滑、轻盈、有"光"的进入感。

- 背景光晕：`glowPulse` 2s `ease-in-out` infinite alternate（opacity 0.6↔1，scale 1↔1.06）——常驻动画。
- 容器：`scaleIn` 700ms `cubic-bezier(.16,1,.3,1)`（opacity 0→1，scale 0.96→1）。
- 标题：delay 120ms，相同动画。
- 简述：delay 240ms。
- 图标徽章：delay 360ms，外加 `glowFlare` 800ms（描边渐变扫过一次）。
- 出场：`scaleOut` 500ms（scale 1→1.02 + opacity 1→0），制造"溶解"感。
