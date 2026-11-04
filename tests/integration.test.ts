import { expect, it } from 'vitest';
import { legalMoves, moveBoard } from '../src/game/board';
import { applyMove, continueGame, newGame, undoMove } from '../src/game/state';
import { deserializeGame, serializeGame } from '../src/game/storage';

it('preserves gameplay, undo and save invariants over 600 seeded moves', () => {
  let seed = 2048;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  let game = newGame(0, random);
  for (let turn = 0; turn < 600; turn++) {
    if (game.over) game = newGame(game.best, random);
    if (game.won && !game.continued) game = continueGame(game);
    const before = game;
    const moves = legalMoves(before.board);
    const direction = moves[Math.floor(random() * moves.length)];
    const pure = moveBoard(before.board, direction);
    game = applyMove(before, direction, random).game;
    const tileSum = (values: number[]) => values.reduce((a, b) => a + b, 0);
    expect([2, 4]).toContain(tileSum(game.board) - tileSum(before.board));
    expect(game.score).toBe(before.score + pure.scoreDelta);
    expect(game.best).toBeGreaterThanOrEqual(before.best);
    expect(deserializeGame(serializeGame(game))).toEqual(game);
    if (turn % 7 === 0) {
      game = undoMove(game);
      expect(game.board).toEqual(before.board);
      expect(game.score).toBe(before.score);
      expect(game.undo).toBeNull();
    }
  }
});
