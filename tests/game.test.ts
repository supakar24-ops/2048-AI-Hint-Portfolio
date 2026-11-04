import { describe, expect, it, vi } from 'vitest';
import { createBoard, emptyCells, isGameOver, legalMoves, moveBoard, spawnTile, type Board, type Direction } from '../src/game/board';
import { applyMove, continueGame, newGame, undoMove, type GameState } from '../src/game/state';
import { directionForKey, swipeDirection } from '../src/game/input';

export const board = (row: number[] = []): Board => [...row, ...Array<number>(16 - row.length).fill(0)];
const state = (values: Board, options: Partial<GameState> = {}): GameState => ({ board: values, score: 0, best: 0, won: false, continued: false, over: false, undo: null, ...options });
const stuck = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];

describe('board initialization and spawn', () => {
  it('creates a 4×4 board with exactly two tiles in different cells', () => {
    const initial = createBoard(() => 0);
    expect(initial).toHaveLength(16);
    expect(initial.filter(Boolean)).toEqual([2, 2]);
    expect(emptyCells(initial)).toHaveLength(14);
  });
  it.each([[0, 2], [0.899999, 2], [0.9, 4], [0.999999, 4]])('value boundary %s spawns %s', (valueRng, value) => {
    const rng = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(valueRng);
    expect(spawnTile(board(), rng).board[0]).toBe(value);
  });
  it('maps equal RNG intervals to each available cell', () => {
    const values = Array<number>(16).fill(2); values[3] = 0; values[9] = 0; values[15] = 0;
    for (const [rngValue, expected] of [[0, 3], [0.333334, 9], [0.666667, 15], [0.999999, 15]]) {
      const rng = vi.fn().mockReturnValueOnce(rngValue).mockReturnValueOnce(0);
      expect(spawnTile(values, rng).cell).toBe(expected);
    }
  });
  it('does not overwrite a full board or use the RNG', () => {
    const rng = vi.fn();
    expect(spawnTile(stuck, rng)).toEqual({ board: stuck, cell: null });
    expect(rng).not.toHaveBeenCalled();
  });
});

describe('pure moves', () => {
  it.each([
    [[2, 2, 0, 0], [4, 0, 0, 0], 4],
    [[2, 2, 2, 0], [4, 2, 0, 0], 4],
    [[2, 2, 2, 2], [4, 4, 0, 0], 8],
    [[2, 2, 4, 0], [4, 4, 0, 0], 4],
    [[4, 0, 4, 4], [8, 4, 0, 0], 8],
    [[4, 4, 8, 8], [8, 16, 0, 0], 24],
  ])('merges %j once per destination', (input, expected, delta) => {
    const result = moveBoard(board(input), 'left');
    expect(result.board.slice(0, 4)).toEqual(expected);
    expect(result.scoreDelta).toBe(delta);
    expect(result.changed).toBe(true);
  });
  it.each<Direction>(['up', 'right', 'down', 'left'])('moves and merges in direction %s', (direction) => {
    const input = board(); input[5] = 2; input[6] = 2; input[9] = 2;
    const result = moveBoard(input, direction);
    const destinations: Record<Direction, number> = { up: 1, right: 7, down: 13, left: 4 };
    expect(result.board[destinations[direction]]).toBe(4);
    expect(result.scoreDelta).toBe(4);
  });
  it('never mutates the input board and preserves tile sum', () => {
    const input = Object.freeze(board([2, 2, 4, 8])) as unknown as Board;
    for (const direction of ['up', 'right', 'down', 'left'] as const) {
      expect(moveBoard(input, direction).board.reduce((a, b) => a + b, 0)).toBe(16);
    }
    expect(input.slice(0, 4)).toEqual([2, 2, 4, 8]);
  });
  it('detects a non-changing move', () => {
    expect(moveBoard(board([2]), 'left').changed).toBe(false);
  });
  it('detects all directions on a locked board', () => {
    expect(legalMoves(stuck)).toEqual([]);
    expect(isGameOver(stuck)).toBe(true);
  });
  it('allows merges on a full board', () => {
    const input = [...stuck]; input[0] = 4;
    expect(isGameOver(input)).toBe(false);
    expect(legalMoves(input)).toContain('left');
  });
});

describe('game transitions and undo', () => {
  it('spawns exactly once only after a valid move and saves the pre-move snapshot', () => {
    const initial = state(board([2, 2])); const rng = vi.fn(() => 0);
    const { game } = applyMove(initial, 'left', rng);
    expect(game.board.filter(Boolean)).toEqual([4, 2]);
    expect(game.score).toBe(4); expect(game.best).toBe(4);
    expect(game.undo?.board).toEqual(initial.board);
    expect(rng).toHaveBeenCalledTimes(2);
  });
  it('invalid move does not spawn, score or create an undo', () => {
    const initial = state(board([2])); const rng = vi.fn();
    expect(applyMove(initial, 'left', rng).game).toBe(initial);
    expect(initial.undo).toBeNull(); expect(rng).not.toHaveBeenCalled();
  });
  it('invalid move preserves an existing undo snapshot', () => {
    const previous = state(board([2, 2]));
    const game = applyMove(previous, 'left', () => 0).game;
    expect(applyMove(game, 'left').game).toBe(game);
    expect(game.undo?.board).toEqual(previous.board);
  });
  it('restores board and score exactly, retains best and consumes the undo', () => {
    const initial = state(board([4, 4]), { score: 12, best: 12 });
    const played = applyMove(initial, 'left', () => 0).game;
    const undone = undoMove(played);
    expect(undone.board).toEqual(initial.board); expect(undone.score).toBe(12);
    expect(undone.best).toBe(20); expect(undone.undo).toBeNull();
    expect(undoMove(undone)).toBe(undone);
  });
  it('creates a fresh snapshot for a valid move after undo', () => {
    const initial = state(board([2, 2]));
    const undone = undoMove(applyMove(initial, 'left', () => 0).game);
    expect(applyMove(undone, 'right', () => 0).game.undo?.board).toEqual(initial.board);
  });
  it('shows victory on the first 2048 and blocks moves pending Continue', () => {
    const won = applyMove(state(board([1024, 1024])), 'left', () => 0).game;
    expect(won.won).toBe(true); expect(won.score).toBe(2048);
    expect(applyMove(won, 'right').game).toBe(won);
    const continued = continueGame(won);
    expect(continued.continued).toBe(true);
    expect(applyMove(continued, 'right', () => 0).game).not.toBe(continued);
  });
  it('continues above 2048 without requiring another victory acknowledgement', () => {
    const initial = state(board([2048, 2048]), { won: true, continued: true });
    const game = applyMove(initial, 'left', () => 0).game;
    expect(game.board).toContain(4096); expect(game.continued).toBe(true);
  });
  it('can undo the winning move including victory status', () => {
    const initial = state(board([1024, 1024]));
    const game = undoMove(applyMove(initial, 'left', () => 0).game);
    expect(game.board).toEqual(initial.board); expect(game.won).toBe(false);
  });
  it('detects game over after a final spawn and permits undo', () => {
    const initial = state([0, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2, 4, 8, 16, 32]);
    const game = applyMove(initial, 'left', () => 0.95).game;
    expect(game.over).toBe(true); expect(applyMove(game, 'up').game).toBe(game);
    expect(undoMove(game).over).toBe(false); expect(undoMove(game).board).toEqual(initial.board);
  });
  it('new game resets score, flags and undo while retaining best', () => {
    const game = newGame(120, () => 0);
    expect(game.score).toBe(0); expect(game.best).toBe(120);
    expect(game.undo).toBeNull(); expect(game.won || game.continued || game.over).toBe(false);
  });
});

describe('input', () => {
  it.each([['ArrowLeft', 'left'], ['ArrowUp', 'up'], ['ArrowRight', 'right'], ['ArrowDown', 'down'], ['w', 'up'], ['a', 'left'], ['s', 'down'], ['d', 'right'], ['Tab', null]])('maps %s to %s', (key, expected) => {
    expect(directionForKey(key)).toBe(expected);
  });
  it.each([[100, 0, 'right'], [-100, 0, 'left'], [0, 100, 'down'], [0, -100, 'up'], [12, 10, null]])('swipe delta (%s,%s) maps to %s', (x, y, expected) => {
    expect(swipeDirection(0, 0, x as number, y as number)).toBe(expected);
  });
});
