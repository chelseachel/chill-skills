import React from 'react';
import { createRoot } from 'react-dom/client';
import { Player } from './Player';
import { ALL_THEME_IDS, type ThemeId } from './themes';
import './themes/animations.css';
import './global.css';
import type { PlayerData } from './types';

async function loadData(): Promise<PlayerData | null> {
  const url = new URL(window.location.href);
  const dataParam = url.searchParams.get('data');
  if (dataParam) {
    const res = await fetch(dataParam);
    if (!res.ok) throw new Error(`Failed to load data from ${dataParam}: ${res.status}`);
    return (await res.json()) as PlayerData;
  }
  // Fallback demo for local dev without a real run
  const demo = await fetch('/demo.json').catch(() => null);
  if (demo?.ok) return (await demo.json()) as PlayerData;
  return null;
}

function resolveTheme(): ThemeId {
  const url = new URL(window.location.href);
  const t = url.searchParams.get('theme');
  if (t && (ALL_THEME_IDS as readonly string[]).includes(t)) return t as ThemeId;
  return ALL_THEME_IDS[1]
}

function applyScale(): void {
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  document.documentElement.style.setProperty('--scale', String(scale));
}

async function bootstrap(): Promise<void> {
  applyScale();
  window.addEventListener('resize', applyScale);

  const theme = resolveTheme();
  document.documentElement.setAttribute('data-theme', theme);

  const data = await loadData();
  const root = createRoot(document.getElementById('app')!);

  if (!data) {
    root.render(
      <div style={{ padding: 64, fontFamily: 'sans-serif', color: '#fff', background: '#111', width: '100%', height: '100%' }}>
        <h1>No player data</h1>
        <p>Pass <code>?data=&lt;url-to-player.json&gt;</code> or place <code>demo.json</code> in <code>renderer/public/</code>.</p>
      </div>,
    );
    return;
  }

  root.render(<Player data={data} />);
}

bootstrap().catch((err) => {
  console.error(err);
  document.body.innerText = String(err);
});
