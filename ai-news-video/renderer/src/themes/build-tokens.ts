/**
 * Reads each themes/<id>/design.md, parses YAML frontmatter,
 * and writes themes/<id>/{tokens.ts, theme.css}.
 *
 * Run: pnpm build:tokens
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type TypographyStyle = {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
};

type Frontmatter = {
  name: string;
  id: string;
  description: string;
  colors: Record<string, string>;
  typography: Record<string, TypographyStyle>;
  rounded: Record<string, string>;
  spacing: Record<string, string>;
  shadows: Record<string, string>;
  animation: {
    enter: string;
    duration: number;
    easing: string;
    stagger: number;
    exit: string;
    exitDuration: number;
  };
  fonts: Array<{ family: string; source: string; weights: string }>;
};

function colorVar(name: string): string {
  return `--color-${name}`;
}

function buildCss(fm: Frontmatter): string {
  const lines: string[] = [];
  lines.push(`/* AUTO-GENERATED from design.md — do not edit directly. */`);

  const fontImports = fm.fonts
    .filter((f) => f.source === 'google')
    .map((f) => {
      const family = f.family.replace(/ /g, '+');
      return `@import url('https://fonts.googleapis.com/css2?family=${family}:wght@${f.weights}&display=swap');`;
    });
  lines.push(...fontImports, '');

  lines.push(`:root[data-theme="${fm.id}"] {`);

  for (const [k, v] of Object.entries(fm.colors)) {
    lines.push(`  ${colorVar(k)}: ${v};`);
  }

  for (const [name, style] of Object.entries(fm.typography)) {
    lines.push(`  --font-${name}-family: ${style.fontFamily};`);
    lines.push(`  --font-${name}-size: ${style.fontSize};`);
    lines.push(`  --font-${name}-weight: ${style.fontWeight};`);
    lines.push(`  --font-${name}-line-height: ${style.lineHeight};`);
    lines.push(`  --font-${name}-letter-spacing: ${style.letterSpacing};`);
  }

  for (const [k, v] of Object.entries(fm.rounded)) {
    const keyOut = k === 'DEFAULT' ? '' : `-${k}`;
    lines.push(`  --radius${keyOut}: ${v};`);
  }

  for (const [k, v] of Object.entries(fm.spacing)) {
    lines.push(`  --space-${k}: ${v};`);
  }

  for (const [k, v] of Object.entries(fm.shadows)) {
    lines.push(`  --shadow-${k}: ${v};`);
  }

  lines.push(`  --anim-enter: ${fm.animation.enter};`);
  lines.push(`  --anim-duration: ${fm.animation.duration}ms;`);
  lines.push(`  --anim-easing: ${fm.animation.easing};`);
  lines.push(`  --anim-stagger: ${fm.animation.stagger}ms;`);
  lines.push(`  --anim-exit: ${fm.animation.exit};`);
  lines.push(`  --anim-exit-duration: ${fm.animation.exitDuration}ms;`);

  lines.push(`}`);
  lines.push('');

  lines.push(`:root[data-theme="${fm.id}"] body,`);
  lines.push(`:root[data-theme="${fm.id}"] {`);
  lines.push(`  background: var(--color-background);`);
  lines.push(`  color: var(--color-on-background);`);
  lines.push(`  font-family: var(--font-body-md-family), 'PingFang SC', 'Source Han Sans SC', sans-serif;`);
  lines.push(`}`);

  return lines.join('\n') + '\n';
}

function buildTs(fm: Frontmatter): string {
  return `// AUTO-GENERATED from design.md — do not edit directly.
export const themeId = ${JSON.stringify(fm.id)} as const;
export const themeMeta = ${JSON.stringify(
    { name: fm.name, id: fm.id, description: fm.description, animation: fm.animation, fonts: fm.fonts },
    null,
    2,
  )};
`;
}

function main(): void {
  const themesDir = __dirname;
  const themeIds = fs
    .readdirSync(themesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => fs.existsSync(path.join(themesDir, name, 'design.md')));

  if (themeIds.length === 0) {
    throw new Error(`No themes found under ${themesDir}`);
  }

  for (const id of themeIds) {
    const dir = path.join(themesDir, id);
    const md = fs.readFileSync(path.join(dir, 'design.md'), 'utf8');
    const { data } = matter(md);
    const fm = data as Frontmatter;
    if (fm.id !== id) {
      throw new Error(`Theme dir "${id}" does not match frontmatter id "${fm.id}"`);
    }
    fs.writeFileSync(path.join(dir, 'theme.css'), buildCss(fm));
    fs.writeFileSync(path.join(dir, 'tokens.ts'), buildTs(fm));
    console.log(`✓ ${id}: tokens.ts + theme.css`);
  }

  const indexTs = `// AUTO-GENERATED — registers all themes for the player.
${themeIds.map((id) => `import './${id}/theme.css';`).join('\n')}
${themeIds.map((id) => `export * as ${id.replace(/-/g, '_')} from './${id}/tokens';`).join('\n')}

export const ALL_THEME_IDS = ${JSON.stringify(themeIds)} as const;
export type ThemeId = typeof ALL_THEME_IDS[number];
`;
  fs.writeFileSync(path.join(themesDir, 'index.ts'), indexTs);
  console.log(`✓ themes/index.ts (${themeIds.length} themes)`);
}

main();
