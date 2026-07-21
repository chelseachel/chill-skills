/**
 * Shared helpers for the "custom" TTS provider — the bring-your-own-CLI escape
 * hatch for users who don't want to use mmx (MiniMax).
 *
 * Config comes from two env vars (NOT CLI flags — the args template contains
 * spaces and braces that are painful to quote on a command line):
 *
 *   TTS_CUSTOM_CMD   the binary to spawn, e.g. `edge-tts`, `say`, `/usr/local/bin/my-tts`
 *   TTS_CUSTOM_ARGS  a single string template containing the placeholders
 *                    {text} {voice} {out}, e.g.
 *                      --text {text} --voice {voice} --write-media {out}
 *
 * At runtime the template is split on whitespace into argv tokens, THEN each
 * placeholder is substituted (so a value containing spaces still lands in one
 * argv element). Values are passed as argv — no shell — so there is no
 * injection surface, mirroring the mmx provider.
 *
 * Auth (API keys, login state) is entirely the user's responsibility; the
 * doctor deliberately does not probe it for custom providers.
 */

export const PLACEHOLDERS = ['{text}', '{voice}', '{out}'] as const;

export type CustomConfig = { cmd: string; argsTemplate: string };

/** Human-readable setup hint, shared by doctor errors and tts errors. */
export function customConfigHint(): string[] {
  return [
    '   Set both env vars, for example:',
    "     export TTS_CUSTOM_CMD='edge-tts'",
    "     export TTS_CUSTOM_ARGS='--text {text} --voice {voice} --write-media {out}'",
    '',
    '   TTS_CUSTOM_ARGS must contain the placeholders {text} {voice} {out}.',
    '   Each is substituted as a single argv element — no shell quoting needed.',
    '   Your CLI must write an .mp3 to the {out} path.',
  ];
}

/**
 * Validate the custom-provider env config.
 * Returns the parsed config on success, or a list of error lines on failure.
 */
export function validateCustomConfig():
  | { ok: true; config: CustomConfig }
  | { ok: false; lines: string[] } {
  const cmd = process.env.TTS_CUSTOM_CMD?.trim();
  const argsTemplate = process.env.TTS_CUSTOM_ARGS;

  const missing: string[] = [];
  if (!cmd) missing.push('TTS_CUSTOM_CMD');
  if (argsTemplate === undefined || argsTemplate.trim() === '') missing.push('TTS_CUSTOM_ARGS');
  if (missing.length) {
    return { ok: false, lines: [`   Missing env: ${missing.join(', ')}`, '', ...customConfigHint()] };
  }

  const missingPh = PLACEHOLDERS.filter((p) => !argsTemplate!.includes(p));
  if (missingPh.length) {
    return {
      ok: false,
      lines: [
        `   TTS_CUSTOM_ARGS is missing placeholder(s): ${missingPh.join(' ')}`,
        '',
        ...customConfigHint(),
      ],
    };
  }

  return { ok: true, config: { cmd: cmd!, argsTemplate: argsTemplate! } };
}

/**
 * Turn the args template into a concrete argv, substituting placeholders.
 * Split-then-substitute so spaces inside a value don't fan out into extra args.
 */
export function buildCustomArgs(
  template: string,
  text: string,
  voiceId: string,
  outPath: string,
): string[] {
  const subst = (tok: string) =>
    tok
      .replaceAll('{text}', text)
      .replaceAll('{voice}', voiceId)
      .replaceAll('{out}', outPath);
  return template.trim().split(/\s+/).map(subst);
}
