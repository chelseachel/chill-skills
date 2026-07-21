import React, { useLayoutEffect, useRef, useState } from 'react';
import type { CoverExtract } from './types';
import './Thumbnail.css';

const HOOK_MAX_PX = 240;  // the headline is the hero — it fills the canvas
const HOOK_MIN_PX = 120;  // never smaller than this; small text dies in the feed
const HOOK_LINE_HEIGHT = 1.1;
const HOOK_MAX_LINES = 2; // headlines read best on ≤2 lines; shrink to fit

async function waitForHookFont(): Promise<void> {
  if (!document.fonts) return;
  await document.fonts.ready;
  // Measure with the final webfont metrics, not fallback sans-serif widths.
  await document.fonts.load(`900 ${HOOK_MAX_PX}px "Schibsted Grotesk"`).catch(() => {});
}

function measureHookFontSize(el: HTMLSpanElement): number {
  let size = HOOK_MAX_PX;
  el.style.fontSize = `${size}px`;
  const maxHeight = () => size * HOOK_LINE_HEIGHT * HOOK_MAX_LINES + 2;
  while (size > HOOK_MIN_PX && el.scrollHeight > maxHeight()) {
    size -= 4;
    el.style.fontSize = `${size}px`;
  }
  return size;
}

function formatDate(raw: string): string {
  // Accepts "2026-06-14" / "2026-6-14" / "2026/06/14"; falls back to raw.
  const m = raw.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return raw;
  const [, y, mo, d] = m;
  return `${y}.${mo.padStart(2, '0')}.${d.padStart(2, '0')}`;
}

export function Thumbnail({ extract }: { extract: CoverExtract }): JSX.Element {
  // A thumbnail is viewed tiny in the app feed, so it carries ONE message: the
  // day's biggest hook, big enough to read at fingernail size. Supporting detail
  // is expressed graphically (a category flag, a story-count motif) rather than
  // as small text that would turn to noise when shrunk.
  const hook = (extract.coverHook && extract.coverHook.trim()) || extract.overview[0] || '';
  const date = formatDate(extract.date);
  const count = extract.overview.length;

  // Optionally tint one keyword inside the hook with the accent colour, drawing
  // the eye to the single most important word. The highlight must be an exact
  // substring of the rendered hook; if it isn't found, the hook renders plain.
  const hl = extract.coverHookHighlight?.trim();
  const hlAt = hl ? hook.indexOf(hl) : -1;
  const hookNodes =
    hl && hlAt >= 0 ? (
      <>
        {hook.slice(0, hlAt)}
        <span className="cover__hook-hl">{hook.slice(hlAt, hlAt + hl.length)}</span>
        {hook.slice(hlAt + hl.length)}
      </>
    ) : (
      hook
    );

  // Auto-fit the headline: start big and shrink until the text wraps to at most
  // HOOK_MAX_LINES, so short hooks stay huge while long fallbacks never clip.
  const hookRef = useRef<HTMLSpanElement>(null);
  const [hookPx, setHookPx] = useState(HOOK_MAX_PX);
  useLayoutEffect(() => {
    const el = hookRef.current;
    if (!el) return;

    let cancelled = false;
    window.__coverReady = false;

    void (async () => {
      await waitForHookFont();
      if (cancelled || !hookRef.current) return;
      const size = measureHookFontSize(hookRef.current);
      if (cancelled) return;
      setHookPx(size);
      window.__coverReady = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [hook]);

  return (
    <section className="cover">
      <div className="cover__spine" aria-hidden="true" />

      <header className="cover__top">
        <span className="cover__brand">
          <span className="cover__brand-name"><span className="cover__brand-mark">AI </span>日报</span>
          <span className="cover__brand-en">DAILY AI BRIEFING</span>
        </span>
        <span className="cover__date">{date}</span>
      </header>

      <div className="cover__body">
        <h1 className="cover__hook">
          <span className="cover__hook-text" ref={hookRef} style={{ fontSize: `${hookPx}px` }}>
            {hookNodes}
          </span>
          {/* No keyword to highlight → fall back to the accent stroke under the hook */}
          {hlAt < 0 && <span className="cover__hook-rule" aria-hidden="true" />}
        </h1>
      </div>

      <footer className="cover__bottom">
        <span className="cover__dots" aria-hidden="true">
          {Array.from({ length: count }).map((_, i) => (
            <span key={i} className="cover__dot" />
          ))}
        </span>
        <span className="cover__count">今日 {count} 条</span>
      </footer>
    </section>
  );
}
