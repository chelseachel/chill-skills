import React from 'react';
import { createRoot } from 'react-dom/client';
import { Thumbnail } from './Thumbnail';
import './theme/cover.css';
import './global.css';
import type { CoverExtract } from './types';

async function loadData(): Promise<CoverExtract | null> {
  const url = new URL(window.location.href);
  const dataParam = url.searchParams.get('data');
  if (dataParam) {
    const res = await fetch(dataParam);
    if (!res.ok) throw new Error(`Failed to load data from ${dataParam}: ${res.status}`);
    return (await res.json()) as CoverExtract;
  }
  // Fallback demo for local dev without a real run
  const demo = await fetch('/demo.json').catch(() => null);
  if (demo?.ok) return (await demo.json()) as CoverExtract;
  return null;
}

function readCanvasSize(): { w: number; h: number } {
  const url = new URL(window.location.href);
  const w = Number(url.searchParams.get('w') ?? '1920') || 1920;
  const h = Number(url.searchParams.get('h') ?? '1080') || 1080;
  document.documentElement.style.setProperty('--cover-w', `${w}px`);
  document.documentElement.style.setProperty('--cover-h', `${h}px`);
  return { w, h };
}

function applyScale(w: number, h: number): void {
  const scale = Math.min(window.innerWidth / w, window.innerHeight / h);
  document.documentElement.style.setProperty('--scale', String(scale));
}

async function bootstrap(): Promise<void> {
  const { w, h } = readCanvasSize();
  applyScale(w, h);
  window.addEventListener('resize', () => applyScale(w, h));

  const data = await loadData();
  const root = createRoot(document.getElementById('app')!);

  if (!data) {
    root.render(
      <div style={{ padding: 64, fontFamily: 'sans-serif', color: '#fff', background: '#111', width: '100%', height: '100%' }}>
        <h1>No cover data</h1>
        <p>Pass <code>?data=&lt;url-to-keypoints.json&gt;</code> or place <code>demo.json</code> in <code>renderer/public/</code>.</p>
      </div>,
    );
    return;
  }

  // Thumbnail sets window.__coverReady after webfonts load and headline auto-fit.
  root.render(<Thumbnail extract={data} />);
}

bootstrap().catch((err) => {
  console.error(err);
  document.body.innerText = String(err);
});
