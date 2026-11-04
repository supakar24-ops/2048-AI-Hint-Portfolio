import { describe, expect, it, vi } from 'vitest';
import { BEST_KEY, SAVE_KEY, deserializeGame, loadGame, saveGame, serializeGame, type StorageLike } from '../src/game/storage';
import { applyMove, continueGame, newGame, undoMove, type GameState } from '../src/game/state';

const storage = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } };
};
const fixture = (): GameState => ({ ...newGame(40, () => 0), board: [2, 2, ...Array<number>(14).fill(0)], score: 8 });

describe('save and restore', () => {
  it('round-trips the board, score, best and usable undo snapshot', () => {
    const game = applyMove(fixture(), 'left', () => 0).game;
    const store = storage();
    expect(saveGame(game, store)).toBe(true);
    const loaded = loadGame(store);
    expect(loaded.notice).toBe('restored'); expect(loaded.game).toEqual(game);
    expect(undoMove(loaded.game!).board).toEqual(fixture().board);
    expect(undoMove(loaded.game!).score).toBe(8);
  });
  it('restores the pending victory and continue-after-2048 states', () => {
    const before = { ...fixture(), board: [1024, 1024, ...Array<number>(14).fill(0)] };
    const victory = applyMove(before, 'left', () => 0).game;
    expect(deserializeGame(serializeGame(victory))).toEqual(victory);
    const continued = continueGame(victory);
    expect(deserializeGame(serializeGame(continued))).toEqual(continued);
  });
  it('reconstructs game over from the board rather than trusting a false saved flag', () => {
    const game = { ...fixture(), board: [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2], over: false };
    expect(deserializeGame(serializeGame(game))?.over).toBe(true);
  });
  it('restores game over and an undo that makes the game playable', () => {
    const before = { ...fixture(), board: [0, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2, 4, 8, 16, 32] };
    const game = applyMove(before, 'left', () => 0.95).game;
    expect(game.over).toBe(true);
    const loaded = deserializeGame(serializeGame(game))!;
    expect(loaded.over).toBe(true); expect(undoMove(loaded).over).toBe(false);
  });
  it('retains a higher independently saved best score', () => {
    const store = storage(); saveGame(fixture(), store); store.setItem(BEST_KEY, '120');
    expect(loadGame(store).game?.best).toBe(120);
  });
  it('does not discard a valid game if only the separate best entry is corrupt', () => {
    const store = storage(); saveGame(fixture(), store); store.setItem(BEST_KEY, 'broken');
    expect(loadGame(store).game).toEqual(fixture());
  });
  it('returns a new-game signal when there is no save', () => {
    expect(loadGame(storage())).toEqual({ game: null, best: 0, notice: 'new' });
  });
  it('reports invalid save while preserving a valid separate best', () => {
    const store = storage(); store.setItem(SAVE_KEY, '{bad json'); store.setItem(BEST_KEY, '80');
    expect(loadGame(store)).toEqual({ game: null, best: 80, notice: 'invalid' });
  });
  it.each(['null', '[]', '{}', '{"version":99}', '{"version":1,"game":{}}'])('rejects malformed/version-mismatched data %s', (raw) => {
    expect(deserializeGame(raw)).toBeNull();
  });
  it.each([
    { board: [2, 2] },
    { board: Array<number>(16).fill(0) },
    { board: [3, 2, ...Array<number>(14).fill(0)] },
    { board: ['2', 2, ...Array<number>(14).fill(0)] },
    { score: -1 }, { score: 1.5 }, { best: 1 }, { won: 'yes' }, { won: true }, { continued: true },
    { undo: { board: [2, 2] } },
  ])('rejects invalid fields %j', (changes) => {
    expect(deserializeGame(JSON.stringify({ version: 1, game: { ...fixture(), ...changes } }))).toBeNull();
  });
  it('handles disabled storage without crashing', () => {
    expect(loadGame(null).notice).toBe('unavailable'); expect(saveGame(fixture(), null)).toBe(false);
  });
  it('handles read failures', () => {
    const store = { getItem: () => { throw new Error('denied'); }, setItem: vi.fn() };
    expect(loadGame(store).notice).toBe('unavailable');
  });
  it('handles write failures and attempts each independent entry', () => {
    const setItem = vi.fn(() => { throw new Error('quota exceeded'); });
    expect(saveGame(fixture(), { getItem: () => null, setItem })).toBe(false);
    expect(setItem).toHaveBeenCalledTimes(2);
  });
  it('new game replaces the saved board and clears the old undo', () => {
    const store = storage(); const moved = applyMove(fixture(), 'left', () => 0).game;
    saveGame(moved, store); const fresh = newGame(moved.best, () => 0.95); saveGame(fresh, store);
    expect(loadGame(store).game).toEqual(fresh); expect(loadGame(store).game?.undo).toBeNull();
  });
});
