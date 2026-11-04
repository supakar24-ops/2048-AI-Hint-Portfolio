// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { ThemeToggle, THEME_KEY } from '../src/components/ThemeToggle';
import { BEST_KEY, SAVE_KEY, serializeGame } from '../src/game/storage';
import { applyMove, newGame } from '../src/game/state';
import { findHint } from '../src/ai/expectimax';
import type { Board } from '../src/game/board';

const darkButton = () => screen.getByRole('button', { name: /เปลี่ยนเป็น Dark Mode/ });
const lightButton = () => screen.getByRole('button', { name: /เปลี่ยนเป็น Light Mode/ });

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.removeProperty('color-scheme');
  const meta = document.createElement('meta');
  meta.name = 'theme-color'; meta.content = '#f5f6fc'; document.head.append(meta);
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.removeProperty('color-scheme');
  document.querySelector('meta[name="theme-color"]')?.remove();
});

describe('theme preference and accessible toggle', () => {
  it('defaults to Light even if the system prefers Dark', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    render(<ThemeToggle />);
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(darkButton()).toHaveAttribute('aria-pressed', 'false');
    expect(darkButton()).toHaveTextContent('Light');
  });

  it('switches both ways and updates current state, browser color and separate preference', () => {
    render(<ThemeToggle />);
    fireEvent.click(darkButton());
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#1b2233');
    expect(lightButton()).toHaveAttribute('aria-pressed', 'true');
    expect(lightButton()).toHaveTextContent('Dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    fireEvent.click(lightButton());
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('can be reached with Tab and activated with Enter and Space', async () => {
    const user = userEvent.setup(); render(<ThemeToggle />);
    await user.tab(); expect(darkButton()).toHaveFocus();
    await user.keyboard('{Enter}'); expect(lightButton()).toHaveFocus();
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    await user.keyboard(' '); expect(darkButton()).toHaveFocus();
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('restores Dark after unmount/remount without using game storage', () => {
    const view = render(<ThemeToggle />); fireEvent.click(darkButton()); view.unmount();
    delete document.documentElement.dataset.theme;
    render(<ThemeToggle />);
    expect(lightButton()).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem(SAVE_KEY)).toBeNull(); expect(localStorage.getItem(BEST_KEY)).toBeNull();
  });

  it.each(['invalid', 'DARK', 'null', ''])('ignores invalid theme value %j', (value) => {
    localStorage.setItem(THEME_KEY, value); render(<ThemeToggle />);
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('still switches if storage reads fail', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    render(<ThemeToggle />); fireEvent.click(darkButton());
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('still switches if storage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    render(<ThemeToggle />); fireEvent.click(darkButton());
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});

describe('theme leaves gameplay and hint state intact', () => {
  it('does not reset board, score, best, undo or saved game, or call the RNG', () => {
    render(<App />); fireEvent.keyDown(window, { key: 'ArrowLeft' });
    const before = screen.getAllByRole('cell').map((cell) => cell.textContent);
    const saved = localStorage.getItem(SAVE_KEY); const best = localStorage.getItem(BEST_KEY);
    const write = vi.spyOn(Storage.prototype, 'setItem'); vi.mocked(Math.random).mockClear();
    fireEvent.click(darkButton());
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(before);
    expect(screen.getByTestId('score')).toHaveTextContent('4');
    expect(screen.getByTestId('best')).toHaveTextContent('4');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
    expect(localStorage.getItem(SAVE_KEY)).toBe(saved); expect(localStorage.getItem(BEST_KEY)).toBe(best);
    expect(Math.random).not.toHaveBeenCalled();
    expect(write.mock.calls.map(([key]) => key)).toEqual([THEME_KEY]);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('score')).toHaveTextContent('0');
    expect(screen.getByTestId('best')).toHaveTextContent('4');
  });

  it('restores both the saved game/undo and theme after a reload-equivalent remount', () => {
    const view = render(<App />);
    fireEvent.keyDown(window, { key: 'ArrowLeft' }); fireEvent.click(darkButton());
    const board = screen.getAllByRole('cell').map((cell) => cell.textContent);
    view.unmount(); render(<App />);
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(board);
    expect(screen.getByTestId('score')).toHaveTextContent('4');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
  });

  it('keeps an available manual hint and its explanation during theme changes', async () => {
    render(<App />); fireEvent.click(screen.getByRole('button', { name: 'AI Hint' }));
    await screen.findByText('AI RECOMMENDS');
    const panel = screen.getByRole('region', { name: 'A fresh perspective.' });
    const before = panel.textContent;
    fireEvent.click(darkButton());
    expect(panel.textContent).toBe(before);
    expect(screen.getByTestId('score')).toHaveTextContent('0');
  });

  it('does not cancel or duplicate pending Auto Hint work and keeps Auto Hint enabled', async () => {
    class WorkerMock {
      static instances: WorkerMock[] = [];
      onmessage: ((event: MessageEvent) => void) | null = null;
      posted: { id: number; board: Board } | null = null;
      terminate = vi.fn();
      constructor() { WorkerMock.instances.push(this); }
      postMessage(data: { id: number; board: Board }) { this.posted = data; }
    }
    vi.stubGlobal('Worker', WorkerMock); render(<App />);
    const auto = screen.getByRole('switch', { name: 'Auto Hint' }); fireEvent.click(auto);
    await waitFor(() => expect(WorkerMock.instances).toHaveLength(1));
    const worker = WorkerMock.instances[0];
    fireEvent.click(darkButton());
    expect(auto).toBeChecked(); expect(worker.terminate).not.toHaveBeenCalled();
    expect(WorkerMock.instances).toHaveLength(1);
    act(() => worker.onmessage?.({ data: { id: worker.posted!.id, result: findHint(worker.posted!.board, { maxDepth: 1 }) } } as MessageEvent));
    expect(screen.getByText('AI RECOMMENDS')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(WorkerMock.instances).toHaveLength(2));
    expect(auto).toBeChecked();
  });

  it.each(['victory', 'over'] as const)('preserves the restored %s dialog in Dark Mode', (status) => {
    localStorage.setItem(THEME_KEY, 'dark');
    const base = newGame(0, () => 0);
    const game = status === 'victory'
      ? applyMove({ ...base, board: [1024, 1024, ...Array<number>(14).fill(0)] }, 'left', () => 0).game
      : { ...base, board: [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2], over: true };
    localStorage.setItem(SAVE_KEY, serializeGame(game)); render(<App />);
    const dialog = screen.getByRole('dialog', { name: status === 'victory' ? 'Congratulations!' : 'Game Over' });
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(within(dialog).getByRole('button', { name: 'New Game' })).toBeEnabled();
    if (status === 'victory') expect(within(dialog).getByRole('button', { name: 'Continue Playing' })).toBeEnabled();
  });
});

describe('theme initialization before React', () => {
  const html = readFileSync('index.html', 'utf8');
  const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)![1];
  const initialize = new Function('document', 'localStorage', bootstrap) as (doc: Document, storage: Pick<Storage, 'getItem'>) => void;

  it.each([['dark', 'dark'], ['light', 'light'], ['invalid', 'light'], [null, 'light']])('initializes saved %j as %s before rendering', (saved, expected) => {
    if (saved !== null) localStorage.setItem(THEME_KEY, saved);
    initialize(document, localStorage);
    expect(document.documentElement.dataset.theme).toBe(expected);
    expect(document.documentElement.style.colorScheme).toBe(expected);
  });

  it('falls back to Light when storage access is blocked during early initialization', () => {
    initialize(document, { getItem() { throw new Error('denied'); } });
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
