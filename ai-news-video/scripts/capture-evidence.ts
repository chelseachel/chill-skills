/**
 * Capture public first-hand source pages for evidence overlays and attach them
 * to keypoints.json. Run after script.json is final so cue ranges are stable.
 *
 * Usage:
 *   tsx scripts/capture-evidence.ts \
 *     --keypoints <OUT_DIR>/keypoints.json \
 *     --manifest  <OUT_DIR>/evidence-manifest.json \
 *     --out-dir   <OUT_DIR>/evidence
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Page } from 'playwright';
import type { EvidenceOverlay, ExtractResult } from './types.js';

type Capture = {
  keypointIndex: number;
  sourceLabel: string;
  sourceUrl: string;
  caption: string;
  showFromSentence: number;
  showThroughSentence: number;
  selector?: string;
  settleMs?: number;
};

type Manifest = { captures: Capture[] };

function getArg(flag: string): string {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? (args[index + 1] ?? '') : '';
}

function assertPublicHttpUrl(value: string, label: string): void {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${label}: invalid URL`); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`${label}: only http(s) source URLs are supported`);
  }
}

function screenshotSelectors(selector?: string): string[] {
  if (selector) return [selector];
  // A page-level crop is safer than guessing which of several related posts is the source post.
  return ['main'];
}

async function capturePage(page: Page, capture: Capture, targetPath: string): Promise<void> {
  await page.goto(capture.sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(Math.min(Math.max(capture.settleMs ?? 1400, 0), 10000));

  for (const selector of screenshotSelectors(capture.selector)) {
    const locator = page.locator(selector);
    if (await locator.count() !== 1) continue;
    if (await locator.isVisible()) {
      await locator.screenshot({ path: targetPath });
      return;
    }
  }

  await page.screenshot({ path: targetPath });
}

function validateCapture(capture: Capture, extract: ExtractResult, index: number): void {
  const label = `capture ${index}`;
  if (!Number.isInteger(capture.keypointIndex) || capture.keypointIndex < 0 || capture.keypointIndex >= extract.keypoints.length) {
    throw new Error(`${label}: keypointIndex is outside keypoints.json`);
  }
  assertPublicHttpUrl(capture.sourceUrl, label);
  if (!capture.sourceLabel.trim() || !capture.caption.trim()) {
    throw new Error(`${label}: sourceLabel and caption are required`);
  }
  if (!Number.isInteger(capture.showFromSentence) || !Number.isInteger(capture.showThroughSentence)
    || capture.showFromSentence < 1 || capture.showThroughSentence < capture.showFromSentence) {
    throw new Error(`${label}: invalid sentence range`);
  }
}

async function main(): Promise<void> {
  const keypointsPath = getArg('--keypoints');
  const manifestPath = getArg('--manifest');
  const outDir = getArg('--out-dir');
  if (!keypointsPath || !manifestPath || !outDir) {
    throw new Error('Usage: tsx scripts/capture-evidence.ts --keypoints <path> --manifest <path> --out-dir <dir>');
  }

  const extract: ExtractResult = JSON.parse(await fs.readFile(keypointsPath, 'utf8'));
  const manifest: Manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.captures) || manifest.captures.length === 0) {
    throw new Error('evidence manifest requires a non-empty captures array');
  }

  const keypointsDir = path.resolve(path.dirname(keypointsPath));
  const resolvedOutDir = path.resolve(outDir);
  if (!resolvedOutDir.startsWith(`${keypointsDir}${path.sep}`)) {
    throw new Error('--out-dir must be inside the keypoints output directory');
  }
  await fs.mkdir(resolvedOutDir, { recursive: true });

  const overlaysByKeypoint = new Map<number, EvidenceOverlay[]>();
  const browser = await chromium.launch({ headless: true });
  try {
    // Keep source pages in their original-language presentation. X screenshots
    // must never use the platform's automatic translated-post UI.
    const page = await browser.newPage({
      viewport: { width: 1280, height: 960 },
      deviceScaleFactor: 1,
      locale: 'en-US',
    });
    for (const [index, capture] of manifest.captures.entries()) {
      validateCapture(capture, extract, index);
      const existing = overlaysByKeypoint.get(capture.keypointIndex) ?? [];
      if (existing.length >= 2) throw new Error(`keypoint ${capture.keypointIndex}: at most 2 evidence screenshots are allowed`);

      const filename = `kp-${capture.keypointIndex}-evidence-${String(existing.length + 1).padStart(2, '0')}.png`;
      const targetPath = path.join(resolvedOutDir, filename);
      await capturePage(page, capture, targetPath);

      const asset = path.relative(keypointsDir, targetPath).split(path.sep).join('/');
      existing.push({
        asset,
        sourceLabel: capture.sourceLabel,
        sourceUrl: capture.sourceUrl,
        caption: capture.caption,
        showFromSentence: capture.showFromSentence,
        showThroughSentence: capture.showThroughSentence,
      });
      overlaysByKeypoint.set(capture.keypointIndex, existing);
      console.log(`  ✓ kp-${capture.keypointIndex} evidence → ${asset}`);
    }
  } finally {
    await browser.close();
  }

  for (const [keypointIndex, overlays] of overlaysByKeypoint) {
    extract.keypoints[keypointIndex].evidenceOverlays = overlays;
  }
  await fs.writeFile(keypointsPath, JSON.stringify(extract, null, 2), 'utf8');
  console.log(`✓ evidence overlays written → ${keypointsPath}`);
}

main().catch((error) => { console.error('✗', error.message); process.exit(1); });
