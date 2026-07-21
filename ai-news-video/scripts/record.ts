/**
 * Record silent video via Playwright.
 *
 * Usage:
 *   tsx scripts/record.ts \
 *     --player <path-to-player.json> \
 *     --out    <path-to-silent.webm> \
 *     --theme  <theme-id>
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium } from 'playwright';

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW_PORT = 5176;
const PREVIEW_URL  = `http://localhost:${PREVIEW_PORT}`;

type ServerHandle = { proc: ChildProcess; baseUrl: string };

/** Race a promise against a timeout; resolves to null (with a warn) on timeout. */
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T | null> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          console.warn(`  ⚠ ${label} timed out after ${ms}ms — moving on`);
          resolve(null);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function startVitePreview(): Promise<ServerHandle> {
  const viteBin = path.join(SKILL_ROOT, 'node_modules', '.bin', 'vite');
  const proc = spawn(viteBin, ['preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
    cwd: SKILL_ROOT,
    env: { ...process.env, FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
    // Own process group so SIGTERM cascades to vite. pnpm → node → vite is 3
    // levels deep; without detached, killing pnpm leaves vite orphaned and the
    // script's event loop stays alive waiting on the grandchild's piped stdio.
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
    // Fallback: probe the server
    setTimeout(() => {
      if (!settled) {
        fetch(baseUrl)
          .then(() => { if (!settled) { settled = true; resolve(); } })
          .catch(() => {});
      }
    }, 2500);
    setTimeout(() => {
      if (!settled) reject(new Error('vite preview did not start within 20s'));
    }, 20000);
  });

  // Extra settle time: wait until the server actually accepts connections
  await new Promise<void>((resolve) => {
    const probe = async (): Promise<void> => {
      try {
        await fetch(baseUrl);
        resolve();
      } catch {
        setTimeout(() => { probe().catch(() => {}); }, 300);
      }
    };
    probe().catch(() => {});
  });

  return { proc, baseUrl };
}

function stopServer(h: ServerHandle): void {
  if (h.proc.killed || !h.proc.pid) return;
  try {
    // Negative pid = kill the whole process group (pnpm + node + vite).
    process.kill(-h.proc.pid, 'SIGTERM');
  } catch {
    try { h.proc.kill('SIGTERM'); } catch { /* already gone */ }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const get = (flag: string, def = '') => args[args.indexOf(flag) + 1] ?? def;

  const playerPath = get('--player');
  const outPath    = get('--out');
  const theme      = get('--theme', 'linen');

  if (!playerPath || !outPath) {
    console.error('Usage: tsx scripts/record.ts --player <path> --out <path> [--theme <id>]');
    process.exit(1);
  }

  // Read total duration from the embedded timeline
  const playerJson = JSON.parse(await fs.readFile(playerPath, 'utf8'));
  const totalSec: number = playerJson.timeline?.totalSec ?? 60;

  // Stage player.json where both vite dev and vite preview can serve it.
  // `vite preview` serves dist-renderer, so copying only to renderer/public
  // leaves preview runs using a stale player.json from the previous build.
  const publicDir      = path.join(SKILL_ROOT, 'renderer', 'public');
  const stagedPath     = path.join(publicDir, 'player.json');
  const distStagedPath = path.join(SKILL_ROOT, 'dist-renderer', 'player.json');
  await fs.mkdir(publicDir, { recursive: true });
  await fs.copyFile(playerPath, stagedPath);
  await fs.copyFile(playerPath, distStagedPath).catch(() => {});

  const server = await startVitePreview();
  console.log(`  vite preview ready at ${server.baseUrl}`);

  const videoDir = path.join(path.dirname(outPath), '.recordings');
  await fs.mkdir(videoDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    // Recording starts the moment recordVideo'd context exists. tStartRecord
    // anchors that t=0 so we can later measure how much "pre-playback" footage
    // we accumulate (page.goto + waitForReady + 400ms lead-in) and trim it
    // off in compose so visuals line up with voice at t=0 of the final mp4.
    const tStartRecord = performance.now();
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } },
    });
    const page = await ctx.newPage();
    const url = `${server.baseUrl}/?theme=${theme}&data=/player.json`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => (window as any).__playerReady === true, null, { timeout: 15000 });

    // Small lead-in so the first frame isn't a partial render
    await page.waitForTimeout(400);
    const leadMs = Math.max(0, Math.round(performance.now() - tStartRecord));
    await page.evaluate(() => (window as any).__startPlayback?.());
    await page.waitForTimeout(Math.ceil(totalSec * 1000) + 600);

    const video = page.video();
    await page.close();
    await ctx.close();
    if (!video) throw new Error('record: no video handle from Playwright');

    const recordedPath = await video.path();
    await fs.copyFile(recordedPath, outPath);
    // Sidecar: tells compose.ts how much to trim from silent.webm head.
    await fs.writeFile(`${outPath}.lead.json`, JSON.stringify({ leadMs }), 'utf8');
    console.log(`  ✓ silent.webm → ${outPath}  (lead ${leadMs}ms)`);
  } finally {
    // browser.close() has been observed to hang in headless Chromium; bound
    // it so the pipeline can always progress (silent.webm is already on disk).
    await withTimeout(browser.close(), 8000, 'browser.close()');
    stopServer(server);
    await fs.rm(stagedPath, { force: true });
    await fs.rm(distStagedPath, { force: true });
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('\n✗', e.message); process.exit(1); });
