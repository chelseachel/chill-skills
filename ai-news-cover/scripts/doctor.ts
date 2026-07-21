/**
 * Pre-flight checks for the ai-news-cover skill.
 *
 * Far lighter than the video skill's doctor: no TTS, no audio. We only need a
 * browser to screenshot and (optionally) ffmpeg to compress a JPG.
 *
 * Exit codes:
 *   0   all checks passed
 *   4   ffmpeg not installed (JPG compression — warn-level, but flagged here)
 *   5   playwright chromium not installed
 *   1   unknown/other error
 */
import { spawn } from 'node:child_process';

function probe(cmd: string, args: string[]): Promise<{ exited: boolean; exitCode: number | null }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'ignore'] });
    proc.on('error', () => resolve({ exited: false, exitCode: null }));
    proc.on('exit', (code) => resolve({ exited: true, exitCode: code }));
  });
}

function fail(code: number, lines: string[]): never {
  console.error(lines.join('\n'));
  process.exit(code);
}

async function checkPlaywright(): Promise<void> {
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    await browser.close();
  } catch (e) {
    fail(5, [
      '',
      '❌  MISSING_PLAYWRIGHT  — Playwright chromium not installed.',
      '',
      '   From the skill directory, run:',
      '     npx playwright install chromium',
      '',
      `   (underlying error: ${(e as Error).message.split('\n')[0]})`,
      '',
    ]);
  }
}

async function checkFfmpeg(): Promise<void> {
  const r = await probe('ffmpeg', ['-version']);
  if (r.exited && r.exitCode === 0) return;
  fail(4, [
    '',
    '❌  MISSING_FFMPEG  — ffmpeg not found (needed only for cover.jpg compression).',
    '',
    '   Install:',
    '     macOS:  brew install ffmpeg',
    '     Ubuntu: sudo apt install ffmpeg',
    '',
    '   PNG output works without it; install to also get cover.jpg.',
    '',
  ]);
}

async function main(): Promise<void> {
  console.log('🔍  Running cover pre-flight checks...\n');

  await checkPlaywright();
  console.log('  ✓ playwright chromium');

  await checkFfmpeg();
  console.log('  ✓ ffmpeg');

  console.log('\n✓  All checks passed.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
