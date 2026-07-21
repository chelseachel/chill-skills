/**
 * Merge keypoints.json + timeline.json → player.json
 *
 * Usage:
 *   tsx scripts/merge-player.ts \
 *     --extract  <path-to-keypoints.json> \
 *     --timeline <path-to-timeline.json> \
 *     --out      <path-to-player.json>
 */
import fs from 'node:fs/promises';
import type { Chapter, ExtractResult, Timeline, PlayerData } from './types.js';

function buildChapters(extract: ExtractResult, timeline: Timeline): Chapter[] {
  let cursor = 0;
  return timeline.slides.map((slide) => {
    const startSec = cursor;
    cursor += slide.durSec;

    if (slide.id === 'cover') {
      return { slideId: slide.id, title: '本期概要', startSec, durSec: slide.durSec };
    }

    const kpIdx = Number(slide.id.replace('kp-', ''));
    const title = extract.overview[kpIdx] || extract.keypoints[kpIdx]?.sourceTitle || slide.id;
    return { slideId: slide.id, title, startSec, durSec: slide.durSec };
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const get = (flag: string) => args[args.indexOf(flag) + 1] ?? '';

  const extractPath  = get('--extract');
  const timelinePath = get('--timeline');
  const outPath      = get('--out');

  if (!extractPath || !timelinePath || !outPath) {
    console.error('Usage: tsx scripts/merge-player.ts --extract <path> --timeline <path> --out <path>');
    process.exit(1);
  }

  const extract: ExtractResult = JSON.parse(await fs.readFile(extractPath, 'utf8'));
  const timeline: Timeline     = JSON.parse(await fs.readFile(timelinePath, 'utf8'));
  timeline.chapters = buildChapters(extract, timeline);
  const player: PlayerData     = { extract, timeline };

  await fs.writeFile(timelinePath, JSON.stringify(timeline, null, 2), 'utf8');
  await fs.writeFile(outPath, JSON.stringify(player, null, 2), 'utf8');
  console.log(`  ✓ timeline chapters written → ${timelinePath}`);
  console.log(`  ✓ player.json written → ${outPath}`);
}

main().catch((e) => { console.error('✗', e); process.exit(1); });
