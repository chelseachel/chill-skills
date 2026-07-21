/**
 * One-shot orchestrator for the mechanical half of the pipeline.
 * After Claude has written keypoints.json and script.json, this runs:
 *   build:tokens → tts → merge-player → (vite build) → record → compose
 * The `vite build` before record refreshes dist-renderer so renderer/src edits
 * take effect (record.ts serves the built dist via `vite preview`).
 *
 * Usage:
 *   tsx scripts/run-pipeline.ts \
 *     --out          <OUT_DIR>          (required, contains keypoints.json + script.json)
 *     --theme        <linen|glass-dark> (default: linen)
 *     --voice        <voice-id>         (default: Podcast_girl)
 *     --bgm          <path-to-bgm.mp3>  (default: <skill>/assets/bgm/default.mp3)
 *     --tts-provider <mmx|custom>       (default: mmx)
 *     --start-from   <step>             (optional: tokens|tts|merge|record|compose. Default: tokens)
 *
 * Notes:
 *   - mmx CLI has no per-invocation `--model` flag. To pick a TTS model, set it
 *     once via `mmx config`; it applies to all `mmx speech synthesize` calls.
 *   - For `--tts-provider custom`, export TTS_CUSTOM_CMD and TTS_CUSTOM_ARGS
 *     first (see scripts/custom-tts.ts). They are inherited by the tts step.
 *
 * Each step is also exposed as its own script — when something fails, you can
 * re-run just that step rather than redoing TTS (which is the slow + costly bit).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

type Args = {
  out: string;
  theme: string;
  voice: string;
  bgm: string;
  ttsProvider: 'mmx' | 'custom';
  startFrom: 'tokens' | 'tts' | 'merge' | 'record' | 'compose';
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string, def = '') => {
    const i = argv.indexOf(flag);
    return i >= 0 ? (argv[i + 1] ?? def) : def;
  };
  const out = get('--out');
  if (!out) {
    console.error(
      'Usage: tsx scripts/run-pipeline.ts --out <OUT_DIR> [--theme <id>] [--voice <id>] [--bgm <path>] [--tts-provider <mmx|custom>] [--start-from <step>]',
    );
    process.exit(1);
  }
  const ttsProvider = get('--tts-provider', 'mmx');
  if (ttsProvider !== 'mmx' && ttsProvider !== 'custom') {
    console.error(`Unknown --tts-provider: "${ttsProvider}" (expected: mmx | custom)`);
    process.exit(1);
  }
  return {
    out:         path.resolve(out),
    theme:       get('--theme', 'linen'),
    voice:       get('--voice', 'Podcast_girl'),
    bgm:         get('--bgm', path.join(SKILL_ROOT, 'assets/bgm/default.mp3')),
    ttsProvider,
    startFrom:   (get('--start-from', 'tokens') as Args['startFrom']),
  };
}

function run(cmd: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: cwd ?? process.cwd(),
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    proc.on('error', reject);
    proc.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`)),
    );
  });
}

const STEPS = ['tokens', 'tts', 'merge', 'record', 'compose'] as const;
type Step = typeof STEPS[number];

async function main(): Promise<void> {
  const args = parseArgs();
  await fs.mkdir(path.join(args.out, 'audio'), { recursive: true });

  // Sanity check: keypoints + script must exist before TTS.
  const keypointsPath = path.join(args.out, 'keypoints.json');
  const scriptPath    = path.join(args.out, 'script.json');
  for (const p of [keypointsPath, scriptPath]) {
    if (!(await fs.stat(p).then(() => true).catch(() => false))) {
      throw new Error(
        `Missing ${path.basename(p)} in ${args.out}. ` +
          `Write keypoints.json and script.json first (skill steps 3 and 4).`,
      );
    }
  }

  const startIdx = STEPS.indexOf(args.startFrom);
  if (startIdx < 0) throw new Error(`Unknown --start-from: ${args.startFrom}`);

  const wantsStep = (s: Step) => STEPS.indexOf(s) >= startIdx;

  if (wantsStep('tokens')) {
    console.log('\n▸ [1/5] Build theme tokens');
    await run('pnpm', ['run', 'build:tokens'], SKILL_ROOT);
  }

  const timelinePath = path.join(args.out, 'timeline.json');
  if (wantsStep('tts')) {
    console.log(`\n▸ [2/5] TTS via ${args.ttsProvider} provider`);
    await run('tsx', [
      path.join(SKILL_ROOT, 'scripts/tts.ts'),
      '--script', scriptPath,
      '--audio-dir', path.join(args.out, 'audio'),
      '--timeline', timelinePath,
      '--voice', args.voice,
      '--theme', args.theme,
      '--tts-provider', args.ttsProvider,
    ]);
  }

  const playerPath = path.join(args.out, 'player.json');
  if (wantsStep('merge')) {
    console.log('\n▸ [3/5] Merge keypoints + timeline → player.json');
    await run('tsx', [
      path.join(SKILL_ROOT, 'scripts/merge-player.ts'),
      '--extract',  keypointsPath,
      '--timeline', timelinePath,
      '--out',      playerPath,
    ]);
  }

  const silentPath = path.join(args.out, 'silent.webm');
  if (wantsStep('record')) {
    // record.ts serves `dist-renderer` via `vite preview`, so the renderer must
    // be (re)built first — otherwise edits to renderer/src (CSS, components) are
    // silently ignored and the recording uses a stale build. `pnpm run build`
    // also refreshes theme tokens, so this is safe even with --start-from record.
    console.log('\n▸ [4/5] Build renderer (dist-renderer) + record silent.webm');
    await run('pnpm', ['run', 'build'], SKILL_ROOT);
    await run('tsx', [
      path.join(SKILL_ROOT, 'scripts/record.ts'),
      '--player', playerPath,
      '--out',    silentPath,
      '--theme',  args.theme,
    ]);
  }

  const finalPath = path.join(args.out, 'final.mp4');
  if (wantsStep('compose')) {
    console.log('\n▸ [5/5] Compose final.mp4 via ffmpeg');
    await run('tsx', [
      path.join(SKILL_ROOT, 'scripts/compose.ts'),
      '--silent',    silentPath,
      '--audio-dir', path.join(args.out, 'audio'),
      '--timeline',  timelinePath,
      '--bgm',       args.bgm,
      '--out',       finalPath,
    ]);
  }

  // Final stats
  const timeline = JSON.parse(await fs.readFile(timelinePath, 'utf8'));
  console.log(`\n✓ Done: ${finalPath}`);
  console.log(`  duration: ${timeline.totalSec.toFixed(1)}s, slides: ${timeline.slides.length}`);
}

main().catch((e) => { console.error('\n✗', e.message); process.exit(1); });
