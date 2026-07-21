/**
 * Pre-flight checks for the ai-news-video skill.
 *
 * Which TTS provider to check is selected with --provider (default: mmx):
 *   --provider mmx      check the MiniMax `mmx` CLI (install + auth)
 *   --provider custom   check the bring-your-own CLI env config (see custom-tts.ts)
 *
 * Exit codes (distinct so SKILL.md can branch precisely):
 *   0   all checks passed
 *   2   TTS provider unavailable
 *         - mmx:    `mmx` CLI not installed
 *         - custom: env missing / template invalid / binary not on PATH
 *   3   mmx CLI installed but not authenticated  (mmx provider only)
 *   4   ffmpeg not installed
 *   5   playwright chromium not installed
 *   1   unknown/other error
 *
 * When multiple things are missing, the first failure encountered exits — fix
 * one at a time and re-run.
 *
 * MiniMax CLI references:
 *   - Repo:  https://github.com/MiniMax-AI/cli
 *   - Docs:  https://platform.minimaxi.com/docs/token-plan/minimax-cli
 *   - The installed binary is `mmx`, package is `mmx-cli` on npm.
 */
import { spawn } from 'node:child_process';
import { validateCustomConfig } from './custom-tts.js';

type ProbeResult = {
  exited: boolean;       // process actually ran (didn't ENOENT)
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

function probe(cmd: string, args: string[]): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (c) => { stdout += c.toString(); });
    proc.stderr.on('data', (c) => { stderr += c.toString(); });
    proc.on('error', () => resolve({ exited: false, exitCode: null, stdout: '', stderr: '' }));
    proc.on('exit', (code) => resolve({ exited: true, exitCode: code, stdout, stderr }));
  });
}

function fail(code: number, lines: string[]): never {
  console.error(lines.join('\n'));
  process.exit(code);
}

// ── mmx (MiniMax) CLI: install + auth ─────────────────────────────────────────

async function checkMmx(): Promise<void> {
  const present = await probe('mmx', ['--version']);
  if (!present.exited) {
    fail(2, [
      '',
      '❌  MISSING_MINIMAX  — mmx (MiniMax) CLI not found on PATH.',
      '',
      '   Install (npm, global):',
      '     npm install -g mmx-cli',
      '',
      '   After installing, log in (interactive OAuth):',
      '     mmx auth login',
      '   Or non-interactive with an API key:',
      '     mmx auth login --api-key sk-xxxxxxxxxxxx',
      '',
      '   Then re-run this doctor.',
      '',
    ]);
  }

  // The mmx CLI documents `mmx auth status` as the canonical non-interactive
  // probe for "am I logged in?". No `whoami` / `account` subcommands exist.
  const res = await probe('mmx', ['auth', 'status']);

  // If `auth status` itself isn't recognized (older/newer CLI), don't hard fail —
  // just warn and let downstream TTS surface the real auth error.
  const looksUnknown =
    res.exited &&
    (res.exitCode === 2 ||
      /unknown|unrecognized|no such (command|subcommand)/i.test(res.stderr + res.stdout));

  if (!res.exited || looksUnknown) {
    console.warn(
      '  ⚠ mmx CLI installed but `mmx auth status` did not run cleanly. ' +
      'Proceeding — if TTS fails with an auth error, run `mmx auth login`.',
    );
    return;
  }

  if (res.exitCode === 0) return; // authenticated

  fail(3, [
    '',
    '❌  UNAUTHENTICATED_MINIMAX  — mmx CLI is installed but not logged in.',
    '',
    `   mmx auth status exited ${res.exitCode}.`,
    res.stderr.trim() ? `   stderr: ${res.stderr.trim().split('\n')[0]}` : '',
    '',
    '   Log in (interactive — follow the CLI prompts):',
    '     mmx auth login',
    '   Or non-interactive with an API key:',
    '     mmx auth login --api-key sk-xxxxxxxxxxxx',
    '',
    '   Then re-run this doctor.',
    '',
  ].filter(Boolean));
}

// ── custom (bring-your-own) TTS CLI ───────────────────────────────────────────
// Only the shallowest sanity checks: env present, template has placeholders,
// binary resolves on PATH. Auth is the user's responsibility (TTS will surface
// the real error on the first sentence), so there is no exit-3 path here.

async function checkCustom(): Promise<void> {
  const res = validateCustomConfig();
  if (!res.ok) {
    fail(2, [
      '',
      '❌  MISSING_CUSTOM_TTS  — custom TTS provider is not configured.',
      '',
      ...res.lines,
      '',
      '   Then re-run this doctor.',
      '',
    ]);
  }

  // Verify the binary actually resolves (any exit code is fine — we only care
  // that it didn't ENOENT). Probe `--version`; most CLIs accept it.
  const present = await probe(res.config.cmd, ['--version']);
  if (!present.exited) {
    fail(2, [
      '',
      `❌  MISSING_CUSTOM_TTS  — TTS_CUSTOM_CMD "${res.config.cmd}" not found on PATH.`,
      '',
      '   Install that CLI (or fix TTS_CUSTOM_CMD to its absolute path), then',
      '   re-run this doctor.',
      '',
    ]);
  }
}

// ── ffmpeg ────────────────────────────────────────────────────────────────────

async function checkFfmpeg(): Promise<void> {
  const r = await probe('ffmpeg', ['-version']);
  if (r.exited && r.exitCode === 0) return;
  fail(4, [
    '',
    '❌  MISSING_FFMPEG  — ffmpeg not found.',
    '',
    '   Install:',
    '     macOS:  brew install ffmpeg',
    '     Ubuntu: sudo apt install ffmpeg',
    '',
    '   Then re-run this doctor.',
    '',
  ]);
}

// ── playwright chromium ───────────────────────────────────────────────────────

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

// ── orchestrate ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const pIdx = argv.indexOf('--provider');
  const provider = pIdx >= 0 ? (argv[pIdx + 1] ?? 'mmx') : 'mmx';
  if (provider !== 'mmx' && provider !== 'custom') {
    fail(1, [`Unknown --provider: "${provider}" (expected: mmx | custom)`]);
  }

  console.log(`🔍  Running pre-flight checks (TTS provider: ${provider})...\n`);

  if (provider === 'mmx') {
    await checkMmx();
    console.log('  ✓ mmx CLI (installed + authenticated)');
  } else {
    await checkCustom();
    console.log('  ✓ custom TTS CLI (env configured + binary on PATH)');
  }

  await checkFfmpeg();
  console.log('  ✓ ffmpeg');

  await checkPlaywright();
  console.log('  ✓ playwright chromium');

  console.log('\n✓  All checks passed.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
