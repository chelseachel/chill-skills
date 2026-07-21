/**
 * TTS — synthesize each script sentence to an mp3 and write timeline.json.
 *
 * Two providers, selected with --tts-provider (default: mmx):
 *
 *   mmx      MiniMax `mmx` CLI:  mmx speech synthesize --text <t> --voice <id> --out <p>
 *            Verify available flags with: mmx speech synthesize --help
 *            Model: pick via per-call `--model` flag, OR set the global default
 *            once with `mmx config set --key default_speech_model --value <id>`.
 *            Repo:  https://github.com/MiniMax-AI/cli
 *            Docs:  https://platform.minimaxi.com/docs/token-plan/minimax-cli
 *
 *   custom   Bring-your-own CLI, configured via env (see scripts/custom-tts.ts):
 *              TTS_CUSTOM_CMD   the binary to spawn
 *              TTS_CUSTOM_ARGS  args template with {text} {voice} {out} placeholders
 *
 * Usage:
 *   tsx scripts/tts.ts \
 *     --script   <path-to-script.json> \
 *     --audio-dir <path-to-audio-dir> \
 *     --timeline  <path-to-write-timeline.json> \
 *     --voice     <voice-id>           (default: Podcast_girl)
 *     --theme     <theme-id>           (default: linen)
 *     --tts-provider <mmx|custom>      (default: mmx)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parseBuffer } from 'music-metadata';
import type { Cue, Script, SlideTiming, Timeline } from './types.js';
import { validateCustomConfig, buildCustomArgs } from './custom-tts.js';

// ─── mmx provider CLI interface ───────────────────────────────────────────────
// Adjust these if your mmx CLI uses different subcommands / flag names.
const MMX_TTS_CMD = 'mmx';
const MMX_TTS_SUBCOMMANDS = ['speech', 'synthesize'];

/**
 * Default voice id baked into the skill. Maps to the MiniMax HTTP-API
 * `voice_setting.voice_id`. Overridable per-run via tts.ts's --voice flag.
 */
export const MMX_DEFAULT_VOICE = 'Podcast_girl';

/**
 * Extra flags appended to every `mmx speech synthesize` call.
 *
 * Documented CLI flags (mmx 1.0.15, `mmx speech synthesize --help`):
 *   --model --text --text-file --voice --speed --volume --pitch --format
 *   --sample-rate --bitrate --channels --language --subtitles --pronunciation
 *   --out --stream
 *
 * Model selection: `--model` is a real per-invocation flag, but the skill
 * relies on the global default set once via:
 *   mmx config set --key default_speech_model --value speech-2.8-hd
 */
const MMX_DEFAULT_FLAGS: string[] = [
  '--speed', '1.1',
  '--volume', '1',
  // '--emotion', 'happy'
];

function buildMmxArgs(text: string, voiceId: string, outPath: string): string[] {
  return [
    ...MMX_TTS_SUBCOMMANDS,
    '--text',  text,
    '--voice', voiceId,
    '--out',   outPath,
    ...MMX_DEFAULT_FLAGS,
  ];
}
// ──────────────────────────────────────────────────────────────────────────────

function spawnCli(cmd: string, args: string[], helpHint: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    proc.on('error', (e) =>
      reject(new Error(`${cmd} spawn error: ${e.message}\nTry: ${helpHint}`)),
    );
    proc.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`)),
    );
  });
}

type Provider = {
  name: string;
  synthesize(text: string, voiceId: string, outPath: string): Promise<void>;
};

const mmxProvider: Provider = {
  name: 'mmx',
  async synthesize(text, voiceId, outPath) {
    await spawnCli(MMX_TTS_CMD, buildMmxArgs(text, voiceId, outPath), 'mmx speech synthesize --help');
  },
};

const customProvider: Provider = {
  name: 'custom',
  async synthesize(text, voiceId, outPath) {
    const res = validateCustomConfig();
    if (!res.ok) {
      throw new Error(['custom TTS provider misconfigured:', '', ...res.lines].join('\n'));
    }
    const args = buildCustomArgs(res.config.argsTemplate, text, voiceId, outPath);
    await spawnCli(res.config.cmd, args, `${res.config.cmd} --help`);
  },
};

function selectProvider(name: string): Provider {
  if (name === 'mmx') return mmxProvider;
  if (name === 'custom') return customProvider;
  throw new Error(`Unknown --tts-provider: "${name}" (expected: mmx | custom)`);
}

async function synthesizeOne(
  provider: Provider,
  text: string,
  outPath: string,
  voiceId: string,
): Promise<void> {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await provider.synthesize(text, voiceId, outPath);
}

function aggregateSlides(cues: Cue[]): SlideTiming[] {
  const byId = new Map<string, number>();
  const order: string[] = [];
  for (const c of cues) {
    if (!byId.has(c.slideId)) { order.push(c.slideId); byId.set(c.slideId, 0); }
    byId.set(c.slideId, byId.get(c.slideId)! + c.durSec);
  }
  return order.map((id) => ({ id, durSec: byId.get(id)! }));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const get = (flag: string, def = '') => {
    const i = args.indexOf(flag);
    return i >= 0 ? (args[i + 1] ?? def) : def;
  };

  const scriptPath  = get('--script');
  const audioDir    = get('--audio-dir');
  const timelinePath = get('--timeline');
  const voiceId     = get('--voice',  MMX_DEFAULT_VOICE);
  const theme       = get('--theme',  'linen');
  const providerName = get('--tts-provider', 'mmx');

  if (!scriptPath || !audioDir || !timelinePath) {
    console.error('Usage: tsx scripts/tts.ts --script <path> --audio-dir <dir> --timeline <path> [--voice <id>] [--theme <id>] [--tts-provider <mmx|custom>]');
    process.exit(1);
  }

  const provider = selectProvider(providerName);

  const script: Script = JSON.parse(await fs.readFile(scriptPath, 'utf8'));
  await fs.mkdir(audioDir, { recursive: true });

  const cues: Cue[] = [];
  let cursor = 0;

  for (let i = 0; i < script.sentences.length; i++) {
    const sent = script.sentences[i];
    const audioPath = path.join(audioDir, `sent-${String(i).padStart(3, '0')}.mp3`);
    // 跳过已存在的音频文件
    let skipExisting = false;
    try {
      await fs.access(audioPath);
      const existingBuf = await fs.readFile(audioPath);
      const existingMeta = await parseBuffer(existingBuf, { mimeType: 'audio/mpeg', size: existingBuf.length });
      const existingDur = existingMeta.format.duration ?? 0;
      if (existingDur > 0) {
        console.log(`  ⏩ [${i + 1}/${script.sentences.length}] ${sent.slideId} 已存在 (${existingDur.toFixed(2)}s)`);
        cues.push({ slideId: sent.slideId, sentenceIndex: i, startSec: cursor, durSec: existingDur });
        cursor += existingDur;
        skipExisting = true;
      }
    } catch { /* 文件不存在，继续生成 */ }
    if (skipExisting) continue;

    process.stdout.write(
      `  TTS[${provider.name}] [${i + 1}/${script.sentences.length}] ${sent.slideId} ${sent.text.length}字 ...`,
    );
    await synthesizeOne(provider, sent.text, audioPath, voiceId);
    const buf = await fs.readFile(audioPath);
    const meta = await parseBuffer(buf, { mimeType: 'audio/mpeg', size: buf.length });
    const dur = meta.format.duration ?? 0;
    if (dur <= 0) throw new Error(`tts: 0-duration mp3 at ${audioPath}`);
    cues.push({ slideId: sent.slideId, sentenceIndex: i, startSec: cursor, durSec: dur });
    cursor += dur;
    console.log(` ${dur.toFixed(2)}s`);
  }

  const slides = aggregateSlides(cues);
  const timeline: Timeline = { theme, totalSec: cursor, slides, cues };
  await fs.writeFile(timelinePath, JSON.stringify(timeline, null, 2), 'utf8');
  console.log(`\n  ✓ timeline.json written (${cursor.toFixed(2)}s total, ${slides.length} slides)`);
}

main().catch((e) => { console.error('\n✗', e.message); process.exit(1); });
