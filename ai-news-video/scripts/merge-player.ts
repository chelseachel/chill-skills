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
import path from 'node:path';
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

function isSafeRelativeAsset(asset: string): boolean {
  return Boolean(asset) && !path.isAbsolute(asset) && !asset.split(/[\\/]+/).includes('..');
}

async function validateEvidence(extract: ExtractResult, timeline: Timeline, extractPath: string): Promise<void> {
  const evidenceRoot = path.dirname(extractPath);
  const imageExt = new Set(['.jpg', '.jpeg', '.png', '.webp']);

  for (let kpIndex = 0; kpIndex < extract.keypoints.length; kpIndex++) {
    const kp = extract.keypoints[kpIndex];
    const overlays = kp.evidenceOverlays ?? [];
    if (overlays.length > 2) {
      throw new Error(`keypoint ${kpIndex}: evidenceOverlays supports at most 2 screenshots`);
    }

    const slideId = `kp-${kpIndex}`;
    const slideCues = timeline.cues.filter((cue) => cue.slideId === slideId);
    let previousEnd = 0;
    for (const [overlayIndex, overlay] of overlays.entries()) {
      const label = `keypoint ${kpIndex}, evidence ${overlayIndex}`;
      if (!isSafeRelativeAsset(overlay.asset) || !imageExt.has(path.extname(overlay.asset).toLowerCase())) {
        throw new Error(`${label}: asset must be a relative .jpg, .jpeg, .png, or .webp path`);
      }
      if (!overlay.sourceLabel.trim() || !overlay.sourceUrl.trim() || !overlay.caption.trim()) {
        throw new Error(`${label}: sourceLabel, sourceUrl, and caption are required`);
      }
      if (!Number.isInteger(overlay.showFromSentence) || !Number.isInteger(overlay.showThroughSentence)
        || overlay.showFromSentence < 1 || overlay.showThroughSentence < overlay.showFromSentence
        || overlay.showThroughSentence > slideCues.length) {
        throw new Error(`${label}: sentence range must be within kp-${kpIndex}'s ${slideCues.length} script sentences`);
      }
      if (overlay.showFromSentence <= previousEnd) {
        throw new Error(`${label}: evidence screenshot ranges cannot overlap`);
      }
      previousEnd = overlay.showThroughSentence;

      const assetPath = path.resolve(evidenceRoot, overlay.asset);
      const isInsideRoot = assetPath === evidenceRoot || assetPath.startsWith(`${evidenceRoot}${path.sep}`);
      if (!isInsideRoot) throw new Error(`${label}: asset escapes the output directory`);
      await fs.access(assetPath).catch(() => {
        throw new Error(`${label}: screenshot not found at ${assetPath}`);
      });
    }
  }
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
  await validateEvidence(extract, timeline, extractPath);
  timeline.chapters = buildChapters(extract, timeline);
  const player: PlayerData     = { extract, timeline };

  await fs.writeFile(timelinePath, JSON.stringify(timeline, null, 2), 'utf8');
  await fs.writeFile(outPath, JSON.stringify(player, null, 2), 'utf8');
  console.log(`  ✓ timeline chapters written → ${timelinePath}`);
  console.log(`  ✓ player.json written → ${outPath}`);
}

main().catch((e) => { console.error('✗', e); process.exit(1); });
