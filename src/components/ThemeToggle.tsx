import { useLayoutEffect, useState } from 'react';
import { Icon } from './Icon';

export const THEME_KEY = '2048-ai-hint:theme:v1';
type Theme = 'light' | 'dark';

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

// Theme state belongs to this control, so switching never rerenders the game
// or restarts an in-flight Hint request. The preference has its own storage key.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const dark = theme === 'dark';
  const currentLabel = dark ? 'Dark Mode' : 'Light Mode';
  const nextLabel = dark ? 'Light Mode' : 'Dark Mode';

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1b2233' : '#f5f6fc');
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* Switching still works when storage is blocked. */ }
  }, [theme]);

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`ธีมปัจจุบัน ${currentLabel} — เปลี่ยนเป็น ${nextLabel}`}
      aria-pressed={dark}
      title={`เปลี่ยนเป็น ${nextLabel}`}
      onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
    >
      <Icon name={dark ? 'moon' : 'sun'} size={17} />
      <span>{dark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
