import { isGameOver, type Board } from './board';
import type { GameState, Snapshot } from './state';

export const SAVE_KEY = '2048-ai-hint:game:v1';
export const BEST_KEY = '2048-ai-hint:best:v1';
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export type LoadNotice = 'new' | 'restored' | 'invalid' | 'unavailable';

export function browserStorage(): StorageLike | null {
  try { return window.localStorage; } catch { return null; }
}
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isScore = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
function validBoard(value: unknown): value is Board {
  return Array.isArray(value) && value.length === 16 && value.every((tile: unknown) => typeof tile === 'number' && Number.isSafeInteger(tile) && (tile === 0 || (tile >= 2 && Number.isInteger(Math.log2(tile))))) && value.filter(Boolean).length >= 2;
}
function parseSnapshot(value: unknown): Snapshot | null {
  if (!isRecord(value) || !validBoard(value.board) || !isScore(value.score) || typeof value.won !== 'boolean' || typeof value.continued !== 'boolean' || typeof value.over !== 'boolean') return null;
  if (value.won !== value.board.some((tile) => tile >= 2048) || (value.continued && !value.won)) return null;
  // Recompute derived loss status rather than trusting a stale serialized flag.
  return { board: [...value.board], score: value.score, won: value.won, continued: value.continued, over: isGameOver(value.board) };
}
export function deserializeGame(raw: string): GameState | null {
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.version !== 1 || !isRecord(data.game)) return null;
    const saved = data.game;
    const current = parseSnapshot(saved);
    if (!current || !isScore(saved.best) || saved.best < current.score) return null;
    const undo = saved.undo === null ? null : parseSnapshot(saved.undo);
    if (saved.undo !== null && (!undo || undo.score > current.score || undo.over || (undo.won && !undo.continued))) return null;
    return { ...current, best: saved.best, undo };
  } catch { return null; }
}
export function serializeGame(game: GameState): string {
  return JSON.stringify({ version: 1, game });
}
export function loadGame(storage: StorageLike | null = browserStorage()): { game: GameState | null; best: number; notice: LoadNotice } {
  if (!storage) return { game: null, best: 0, notice: 'unavailable' };
  let best = 0;
  try {
    const rawBest = storage.getItem(BEST_KEY);
    if (rawBest !== null) { const value: unknown = JSON.parse(rawBest); if (isScore(value)) best = value; }
  } catch { /* Best score corruption must not discard a valid game. */ }
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw === null) return { game: null, best, notice: 'new' };
    const game = deserializeGame(raw);
    if (!game) return { game: null, best, notice: 'invalid' };
    game.best = Math.max(game.best, best);
    return { game, best: game.best, notice: 'restored' };
  } catch { return { game: null, best, notice: 'unavailable' }; }
}
export function saveGame(game: GameState, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  let success = true;
  // Separate attempts preserve the high score even when only one write succeeds.
  try { storage.setItem(BEST_KEY, JSON.stringify(game.best)); } catch { success = false; }
  try { storage.setItem(SAVE_KEY, serializeGame(game)); } catch { success = false; }
  return success;
}
