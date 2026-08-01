import React from 'react';
import type { ExtractResult } from '../types';
import './Cover.css';

export function Cover({ extract }: { extract: ExtractResult }): JSX.Element {
  return (
    <section className="cover">
      <div className="cover__bg" aria-hidden="true" />
      <div className="cover__inner">
        <span className="cover__date label-caps" data-stagger="0" data-count={`${extract.overview.length} STORIES`}>
          {extract.date}
        </span>
        <h1 className="cover__title display" data-stagger="1">
          {extract.coverTitle || '今日 AI 资讯'}
        </h1>
        <ul className="cover__overview" data-stagger="2">
          {extract.overview.map((line, i) => (
            <li key={i} className="cover__chip">
              <span className="cover__chip-num label-caps">{String(i + 1).padStart(2, '0')}</span>
              <span className="cover__chip-text body-md">{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
