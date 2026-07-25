import React, { useEffect, useState, useRef } from 'react';
import type { Chapter, PlayerData } from './types';
import { Cover } from './slides/Cover';
import { KeyPoint } from './slides/KeyPoint';

function buildFallbackChapters(data: PlayerData): Chapter[] {
  const { extract, timeline } = data;
  let cursor = 0;
  return timeline.slides.map((slide) => {
    const startSec = cursor;
    cursor += slide.durSec;

    if (slide.id === 'cover') {
      return { slideId: slide.id, title: '本期概要', startSec, durSec: slide.durSec };
    }

    const kpIdx = Number(slide.id.replace('kp-', ''));
    const title = extract.overview[kpIdx] || extract.keypoints[kpIdx]?.sourceTitle || slide.id;
    return { slideId: slide.id, title, startSec, durSec: slide.durSec };
  });
}

export function Player({ data }: { data: PlayerData }): JSX.Element {
  const { extract, timeline } = data;
  const [activeIndex, setActiveIndex] = useState(-1); // -1 = not started
  const [exitingIndex, setExitingIndex] = useState(-1);
  const [progressPct, setProgressPct] = useState(0);
  const [playheadSec, setPlayheadSec] = useState(0);
  const startedRef = useRef(false);
  const rafRef = useRef(0);

  // Boundary positions between slides (as % of totalSec). N slides → N-1 ticks
  // drawn over the progress bar; ticks at 0% and 100% are omitted.
  const tickPcts = (() => {
    const total = Math.max(1e-9, timeline.totalSec);
    let acc = 0;
    const out: number[] = [];
    for (let i = 0; i < timeline.slides.length - 1; i++) {
      acc += timeline.slides[i].durSec;
      out.push((acc / total) * 100);
    }
    return out;
  })();

  const chapters = timeline.chapters?.length ? timeline.chapters : buildFallbackChapters(data);
  const chapterBoundaryPcts = [0, ...tickPcts, 100];

  useEffect(() => {
    window.__playerReady = true;
    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      runTimeline();
    };
    window.__startPlayback = start;

    const url = new URL(window.location.href);
    if (url.searchParams.get('autoplay') === '1') {
      // Useful for manual browser preview
      setTimeout(start, 500);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function runTimeline(): void {
    let cursor = 0;
    setActiveIndex(0);

    // Smooth progress driver: tied to wall-clock vs. timeline.totalSec, so the
    // bar advances every frame instead of jumping at slide boundaries.
    const startMs = performance.now();
    const totalMs = Math.max(1, timeline.totalSec * 1000);
    const tick = () => {
      const elapsed = performance.now() - startMs;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setProgressPct(pct);
      setPlayheadSec(Math.min(timeline.totalSec, elapsed / 1000));
      if (pct < 100) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const advance = () => {
      const slide = timeline.slides[cursor];
      const ms = Math.max(0, slide.durSec * 1000);
      setTimeout(() => {
        if (cursor < timeline.slides.length - 1) {
          setExitingIndex(cursor);
          cursor += 1;
          setActiveIndex(cursor);
          setTimeout(() => setExitingIndex(-1), 800);
          advance();
        }
      }, ms);
    };
    advance();
  }

  return (
    <div className="slide-stage">
      {timeline.slides.map((slide, i) => {
        const isActive = i === activeIndex;
        const isExiting = i === exitingIndex;
        const cls = ['slide', isActive && 'active', isExiting && 'exiting']
          .filter(Boolean)
          .join(' ');
        if (slide.id === 'cover') {
          return (
            <div className={cls} key={slide.id} data-screen-label="01 cover">
              <Cover extract={extract} />
            </div>
          );
        }
        const kpIdx = Number(slide.id.replace('kp-', ''));
        const kp = extract.keypoints[kpIdx];
        if (!kp) return null;
        const cues = timeline.cues.filter((cue) => cue.slideId === slide.id);
        return (
          <div className={cls} key={slide.id} data-screen-label={`${String(i + 1).padStart(2, '0')} ${slide.id}`}>
            <KeyPoint kp={kp} index={kpIdx} total={extract.keypoints.length} cues={cues} playheadSec={playheadSec} />
          </div>
        );
      })}
      <div className="progress-wrap" style={{ '--progress-pct': `${progressPct}%` } as React.CSSProperties} aria-hidden="true">
        <div className="progress-chapters">
          {chapters.map((chapter, i) => (
            <div
              key={`${chapter.slideId}-${i}`}
              className={['progress-chapter', i === activeIndex && 'active'].filter(Boolean).join(' ')}
              style={{
                left: `${chapterBoundaryPcts[i] ?? 0}%`,
                width: `${(chapterBoundaryPcts[i + 1] ?? 100) - (chapterBoundaryPcts[i] ?? 0)}%`,
              }}
            >
              <span className="progress-chapter__title">{chapter.title}</span>
            </div>
          ))}
        </div>
        <div className="progress">
          <div className="progress__fill" style={{ width: `${progressPct}%` }} />
        </div>
        {tickPcts.map((pct, i) => (
          <div key={i} className="progress__tick" style={{ left: `${pct}%` }} />
        ))}
      </div>
    </div>
  );
}
