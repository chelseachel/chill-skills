import React from 'react';
import * as Icons from 'lucide-react';
import type { Keypoint } from '../types';
import './KeyPoint.css';

const FALLBACK_ICON = 'Sparkles';

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
}: {
  kp: Keypoint;
  index: number;
  total: number;
}): JSX.Element {
  const layout = gridLayoutFor(kp.elements.length);

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
    </section>
  );
}
