# chill-skills

Reusable AI news production skills for creating videos and covers.

## Included skills

- `ai-news-video`: Convert Chinese AI news Markdown into a 1920x1080 video briefing.
- `ai-news-cover`: Generate 16:9 and 4:3 cover images for an AI news video.

Each skill is self-contained and documented in its own `SKILL.md`.

## Local development

Both skills require Node.js 20 or newer and use `pnpm`.

```bash
cd ai-news-video
pnpm install
pnpm build
```

```bash
cd ai-news-cover
pnpm install
pnpm build
```
