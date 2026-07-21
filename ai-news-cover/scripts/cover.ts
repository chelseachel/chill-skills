/**
 * Render the cover thumbnail to PNGs (+ compressed JPGs) via Playwright.
 *
 * Usage:
 *   tsx scripts/cover.ts \
 *     --input <path-to-keypoints.json> \
 *     --out   <output-dir>
 *
 * Writes one cover per aspect ratio, every run:
 *   cover.png      / cover.jpg      — 1920×1080 (16:9, video-platform default)
 *   cover-4x3.png  / cover-4x3.jpg  — 1440×1080 (4:3,  4x3-thumbnail platforms)
 *
 * No TTS, no video — just static screenshots.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium } from 'playwright';

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW_PORT = 5178;
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;

type ServerHandle = { proc: ChildProcess; baseUrl: string };

async function startVitePreview(): Promise<ServerHandle> {
  const viteBin = path.join(SKILL_ROOT, 'node_modules', '.bin', 'vite');
  const proc = spawn(viteBin, ['preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
    cwd: SKILL_ROOT,
    env: { ...process.env, FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  const baseUrl = PREVIEW_URL;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const onLine = (chunk: Buffer): void => {
      const line = chunk.toString();
      if (line.includes('Local:') || line.includes('localhost') || line.includes(baseUrl)) {
        if (!settled) { settled = true; resolve(); }
      }
    };
    proc.stdout?.on('data', onLine);
    proc.stderr?.on('data', onLine);
    proc.on('exit', (code) => {
      if (!settled) reject(new Error(`vite preview exited early with code ${code}`));
    });
    setTimeout(() => {
      if (!settled) {
        fetch(baseUrl).then(() => { if (!settled) { settled = true; resolve(); } }).catch(() => {});
      }
    }, 2500);
    setTimeout(() => {
      if (!settled) reject(new Error('vite preview did not start within 20s'));
    }, 20000);
  });

  // Wait until the server actually accepts connections
  await new Promise<void>((resolve) => {
    const probe = async (): Promise<void> => {
      try { await fetch(baseUrl); resolve(); }
      catch { setTimeout(() => { probe().catch(() => {}); }, 300); }
    };
    probe().catch(() => {});
  });

  return { proc, baseUrl };
}

function stopServer(h: ServerHandle): void {
  if (h.proc.killed || !h.proc.pid) return;
  try { process.kill(-h.proc.pid, 'SIGTERM'); }
  catch { try { h.proc.kill('SIGTERM'); } catch { /* gone */ } }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const get = (flag: string, def = '') => args[args.indexOf(flag) + 1] ?? def;

  const inputPath = get('--input');
  const outDir = get('--out');
  if (!inputPath || !outDir) {
    console.error('Usage: tsx scripts/cover.ts --input <keypoints.json> --out <dir>');
    process.exit(1);
  }

  await fs.mkdir(outDir, { recursive: true });

  // Stage the input into renderer/public so vite preview can serve it.
  const publicDir = path.join(SKILL_ROOT, 'renderer', 'public');
  const stagedPath = path.join(publicDir, 'cover-data.json');
  const distStagedPath = path.join(SKILL_ROOT, 'dist-renderer', 'cover-data.json');
  await fs.mkdir(publicDir, { recursive: true });
  await fs.copyFile(inputPath, stagedPath);
  await fs.copyFile(inputPath, distStagedPath).catch(() => {});

  const server = await startVitePreview();
  console.log(`  vite preview ready at ${server.baseUrl}`);

  // Two aspect ratios per run: 16:9 for video platforms, 4:3 for thumbnails
  // on sites that crop 16:9 covers awkwardly.
  const variants = [
    { label: '16:9', width: 1920, height: 1080, pngName: 'cover.png',     jpgName: 'cover.jpg' },
    { label: '4:3',  width: 1440, height: 1080, pngName: 'cover-4x3.png', jpgName: 'cover-4x3.jpg' },
  ] as const;

  const outputs: { pngPath: string; jpgPath: string; label: string }[] = [];

  const browser = await chromium.launch({ headless: true });
  try {
    for (const v of variants) {
      const pngPath = path.join(outDir, v.pngName);
      const jpgPath = path.join(outDir, v.jpgName);
      outputs.push({ pngPath, jpgPath, label: v.label });

      const ctx = await browser.newContext({
        viewport: { width: v.width, height: v.height },
        deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();
      const url = `${server.baseUrl}/?data=/cover-data.json&w=${v.width}&h=${v.height}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => (window as any).__coverReady === true, null, { timeout: 15000 });
      // Let webfonts settle so the headline isn't captured mid-swap.
      await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
      await page.waitForTimeout(300);

      await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: v.width, height: v.height } });
      await page.close();
      await ctx.close();
      console.log(`  ✓ ${v.pngName} (${v.width}×${v.height}, ${v.label}) → ${pngPath}`);
    }
  } finally {
    await browser.close().catch(() => {});
    stopServer(server);
    await fs.rm(stagedPath, { force: true });
    await fs.rm(distStagedPath, { force: true });
  }

  // Compress a JPG per variant for upload forms that cap size (B站 ≤ 2MB, jpg/png).
  for (const o of outputs) {
    const jpg = spawnSync('ffmpeg', ['-y', '-i', o.pngPath, '-q:v', '3', o.jpgPath], { stdio: 'ignore' });
    if (jpg.status === 0) {
      console.log(`  ✓ ${path.basename(o.jpgPath)} (${o.label}) → ${o.jpgPath}`);
    } else {
      console.warn(`  ⚠ ffmpeg JPG compression failed for ${o.label} — PNG is still available.`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('\n✗', e.message); process.exit(1); });
