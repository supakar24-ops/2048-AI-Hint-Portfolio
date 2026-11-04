import { createBoard, isGameOver, moveBoard, spawnTile, type Board, type Direction, type MoveResult, type RNG } from './board';

export interface Snapshot {
  board: Board;
  score: number;
  won: boolean;
  continued: boolean;
  over: boolean;
}
export interface GameState extends Snapshot {
  best: number;
  undo: Snapshot | null;
}
export interface Transition {
  game: GameState;
  move: MoveResult | null;
  spawned: number | null;
}
export interface BoardAnimation { id: number; move: MoveResult; spawned: number | null }
export function newGame(best = 0, random: RNG = Math.random): GameState {
  return { board: createBoard(random), score: 0, best, won: false, continued: false, over: false, undo: null };
}
export function snapshot(game: GameState): Snapshot {
  return { board: [...game.board], score: game.score, won: game.won, continued: game.continued, over: game.over };
}
export function applyMove(game: GameState, direction: Direction, random: RNG = Math.random): Transition {
  if (game.over || (game.won && !game.continued)) return { game, move: null, spawned: null };
  const move = moveBoard(game.board, direction);
  if (!move.changed) return { game, move: null, spawned: null };
  const spawned = spawnTile(move.board, random);
  const score = game.score + move.scoreDelta;
  return {
    game: {
      board: spawned.board, score, best: Math.max(game.best, score),
      won: game.won || move.board.some((value) => value >= 2048),
      continued: game.continued, over: isGameOver(spawned.board), undo: snapshot(game),
    },
    move, spawned: spawned.cell,
  };
}
export function undoMove(game: GameState): GameState {
  return game.undo ? { ...game.undo, board: [...game.undo.board], best: game.best, undo: null } : game;
}
export function continueGame(game: GameState): GameState {
  return game.won ? { ...game, continued: true } : game;
}
