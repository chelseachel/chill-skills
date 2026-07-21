/**
 * Compose final.mp4 from silent.webm + voice mp3s + BGM.
 *
 * Usage:
 *   tsx scripts/compose.ts \
 *     --silent    <path-to-silent.webm> \
 *     --audio-dir <path-to-audio-dir> \
 *     --timeline  <path-to-timeline.json> \
 *     --bgm       <path-to-bgm.mp3>      (optional) \
 *     --out       <path-to-final.mp4>
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const BGM_VOLUME = 0.12;

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    proc.on('error', reject);
    proc.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
}

async function ensureFfmpeg(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
    proc.on('error', () =>
      reject(new Error('ffmpeg not found. Install: brew install ffmpeg')),
    );
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg probe exited ${code}`))));
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const get = (flag: string, def = '') => args[args.indexOf(flag) + 1] ?? def;

  const silentPath   = get('--silent');
  const audioDir     = get('--audio-dir');
  const timelinePath = get('--timeline');
  const bgmPath      = get('--bgm', '');
  const outPath      = get('--out');

  if (!silentPath || !audioDir || !timelinePath || !outPath) {
    console.error(
      'Usage: tsx scripts/compose.ts --silent <path> --audio-dir <dir> --timeline <path> --out <path> [--bgm <path>]',
    );
    process.exit(1);
  }

  await ensureFfmpeg();

  const timeline = JSON.parse(await fs.readFile(timelinePath, 'utf8'));
  const totalSec: number = timeline.totalSec ?? 60;

  // 1. Collect mp3 files
  const audioFiles = (await fs.readdir(audioDir))
    .filter((f) => f.endsWith('.mp3'))
    .sort();
  if (audioFiles.length === 0) throw new Error(`No mp3 files found in ${audioDir}`);

  // 2. Concat sentence mp3s → voice.mp3
  const outDir   = path.dirname(outPath);
  const listPath = path.join(outDir, 'audio-list.txt');
  await fs.writeFile(
    listPath,
    audioFiles.map((f) => `file '${path.resolve(audioDir, f).replace(/'/g, "'\\''")}'`).join('\n'),
    'utf8',
  );
  const voicePath = path.join(outDir, 'voice.mp3');
  console.log('  Concatenating voice segments…');
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', voicePath]);

  // 3. Mux silent webm + voice + (optional) BGM → final.mp4.
  // A 0-byte placeholder file counts as "no BGM" (ffmpeg errors `Invalid data`
  // on empty input). When --bgm was passed but the file is missing/empty, warn
  // and fall back to voice-only instead of failing the whole compose.
  const bgmExists = bgmPath
    ? await fs.stat(bgmPath).then((s) => s.isFile() && s.size > 0).catch(() => false)
    : false;
  if (bgmPath && !bgmExists) {
    console.warn(`  ⚠ BGM at ${bgmPath} is missing or empty — composing without background music`);
  }

  // record.ts writes a sidecar telling us how much pre-playback footage to
  // trim off the head of silent.webm so visuals align with voice at t=0.
  let leadMs = 0;
  try {
    const sidecar = JSON.parse(await fs.readFile(`${silentPath}.lead.json`, 'utf8'));
    leadMs = Math.max(0, Number(sidecar.leadMs) || 0);
  } catch { /* no sidecar — assume zero lead, e.g. legacy recordings */ }
  if (leadMs > 0) {
    console.log(`  Trimming ${leadMs}ms lead-in from silent.webm`);
  }

  const ffArgs: string[] = ['-y'];
  if (leadMs > 0) ffArgs.push('-ss', (leadMs / 1000).toFixed(3));
  ffArgs.push('-i', silentPath, '-i', voicePath);
  let filter: string;

  if (bgmExists) {
    ffArgs.push('-i', bgmPath);
    filter = [
      `[2:a]volume=${BGM_VOLUME},aloop=loop=-1:size=2e9,atrim=0:${totalSec.toFixed(3)}[bgm]`,
      `[1:a][bgm]amix=inputs=2:duration=first:dropout_transition=0[a]`,
    ].join(';');
  } else {
    filter = `[1:a]anull[a]`;
  }

  ffArgs.push(
    '-filter_complex', filter,
    '-map', '0:v',
    '-map', '[a]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
    '-crf', '18',
    '-preset', 'medium',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-movflags', '+faststart',
    outPath,
  );

  console.log('  Composing final.mp4…');
  await run('ffmpeg', ffArgs);
  console.log(`  ✓ final.mp4 → ${outPath}`);
}

main().catch((e) => { console.error('\n✗', e.message); process.exit(1); });
