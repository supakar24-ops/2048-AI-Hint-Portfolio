// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterAll, expect, it } from 'vitest';

const element = document.createElement('style');
element.textContent = readFileSync('src/theme.css', 'utf8');
document.head.append(element);
const rules = Array.from(element.sheet!.cssRules) as CSSStyleRule[];
const palette = rules.find((rule) => rule.selectorText === ':root[data-theme="dark"]')!.style;
afterAll(() => element.remove());

function token(name: string): string {
  return palette.getPropertyValue(name).trim().replace(/var\((--[\w-]+)\)/g, (_, nested: string) => token(nested));
}
function luminance(hex: string): number {
  const values = hex.replace('#', '');
  const full = values.length === 3 ? values.split('').map((part) => part + part).join('') : values;
  const rgb = [0, 2, 4].map((offset) => {
    const channel = parseInt(full.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(foreground: string, background: string): number {
  const a = luminance(token(foreground)); const b = luminance(token(background));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

it('Dark text and interactive labels meet 4.5:1 on their palette surfaces', () => {
  for (const foreground of ['--ink', '--muted', '--text-label', '--text-accent', '--text-success', '--text-warning']) {
    for (const background of ['--canvas', '--surface', '--surface-raised', '--surface-tint', '--recommendation-start', '--recommendation-end']) {
      expect(contrast(foreground, background), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
  }
  expect(contrast('--button-ink', '--accent')).toBeGreaterThanOrEqual(4.5);
  expect(contrast('--button-ink', '--button-hover')).toBeGreaterThanOrEqual(4.5);
  expect(contrast('--ink', '--button-new')).toBeGreaterThanOrEqual(4.5);
  expect(contrast('--ink', '--button-new-hover')).toBeGreaterThanOrEqual(4.5);
});

it('every Dark tile palette, including both 2048+ gradient ends, meets 4.5:1', () => {
  for (let level = 1; level <= 10; level++) {
    expect(contrast(level <= 7 ? `--tile-${level}-text` : '--tile-high-text', `--tile-${level}-bg`), `Tile level ${level}`).toBeGreaterThanOrEqual(4.5);
  }
  for (const endpoint of ['--tile-11-start', '--tile-11-end']) {
    expect(contrast('--tile-high-text', endpoint)).toBeGreaterThanOrEqual(4.5);
  }
});

it('focus outlines and the Auto Hint switch thumb meet 3:1 against their surroundings', () => {
  for (const background of ['--canvas', '--surface', '--surface-raised', '--surface-tint']) {
    expect(contrast('--theme-focus', background)).toBeGreaterThanOrEqual(3);
  }
  expect(contrast('--switch-thumb', '--switch-off')).toBeGreaterThanOrEqual(3);
  expect(contrast('--switch-thumb', '--switch-on')).toBeGreaterThanOrEqual(3);
});

it('Dark overrides only alter paint, not game board, D-pad geometry or animations', () => {
  const paint = new Set(['color', 'background', 'border-color', 'box-shadow', 'outline-color', 'opacity']);
  for (const rule of rules.filter((rule) => rule.selectorText?.startsWith('[data-theme="dark"]'))) {
    for (let i = 0; i < rule.style.length; i++) {
      expect(paint.has(rule.style[i]), `${rule.selectorText}: ${rule.style[i]}`).toBe(true);
    }
  }
});
