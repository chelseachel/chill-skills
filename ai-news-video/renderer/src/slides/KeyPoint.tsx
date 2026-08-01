import React from 'react';
import * as Icons from 'lucide-react';
import type { Cue, EvidenceOverlay, Keypoint } from '../types';
import './KeyPoint.css';

const FALLBACK_ICON = 'Sparkles';
const EVIDENCE_ENTRY_DELAY_SEC = 1.7;
const EVIDENCE_EXIT_SEC = 0.26;

function pickIcon(name: string): React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }> {
  const lib = Icons as unknown as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>>;
  return lib[name] ?? lib[FALLBACK_ICON];
}

function gridLayoutFor(count: number): { cols: number; rows: number } {
  if (count <= 3) return { cols: count, rows: 1 };
  if (count === 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 }; // 5 or 6
  return { cols: 4, rows: 2 }; // 7 or 8
}

export function KeyPoint({
  kp,
  index,
  total,
  cues,
  playheadSec,
}: {
  kp: Keypoint;
  index: number;
  total: number;
  cues: Cue[];
  playheadSec: number;
}): JSX.Element {
  const layout = gridLayoutFor(kp.elements.length);
  const evidenceOverlays = kp.evidenceOverlays ?? [];

  return (
    <section className="kp" data-cols={layout.cols} data-rows={layout.rows}>
      <div className="kp__bg" aria-hidden="true" />
      <div className="kp__inner">
        <div className="kp__header" data-stagger="0">
          <span className="kp__meta label-caps">
            KP {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
          <h2 className="kp__title h2" data-stagger="1">
            {kp.sourceTitle}
          </h2>
        </div>

        <ul className="kp__elements" data-cols={layout.cols} data-rows={layout.rows}>
          {kp.elements.map((el, i) => {
            const Icon = pickIcon(el.icon);
            return (
              <li className="kp__element" key={i} data-stagger={String(2 + i)}>
                <div className="kp__element-icon" aria-hidden="true">
                  <Icon size={48} strokeWidth={2} />
                </div>
                <div className="kp__element-body">
                  <div className="kp__element-subtitle">{el.subtitle}</div>
                  <div className="kp__element-brief">{el.brief}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {evidenceOverlays.map((evidence) => {
        const start = cues[evidence.showFromSentence - 1];
        const end = cues[evidence.showThroughSentence - 1];
        const visibleStartSec = (start?.startSec ?? 0) + EVIDENCE_ENTRY_DELAY_SEC;
        const endSec = end ? end.startSec + end.durSec : 0;
        // Start the fade before the cue ends so it remains visible even when
        // the evidence and its parent slide finish at the same boundary.
        const exitStartSec = Math.max(visibleStartSec, endSec - EVIDENCE_EXIT_SEC);
        const state = !start || !end || playheadSec < visibleStartSec
          ? 'waiting'
          : playheadSec < exitStartSec
            ? 'visible'
            : 'exiting';
        return <EvidenceOverlayCard key={evidence.asset} evidence={evidence} state={state} />;
      })}
    </section>
  );
}

function EvidenceOverlayCard({
  evidence,
  state,
}: {
  evidence: EvidenceOverlay;
  state: 'waiting' | 'visible' | 'exiting';
}): JSX.Element {
  return (
    <aside
      className={`evidence-overlay is-${state}`}
      aria-label={evidence.sourceLabel}
      aria-hidden={state !== 'visible'}
    >
      <img className="evidence-overlay__image" src={`/${evidence.asset}`} alt="" />
      <div className="evidence-overlay__meta">
        <div className="evidence-overlay__source">{evidence.sourceLabel}</div>
      </div>
    </aside>
  );
}
