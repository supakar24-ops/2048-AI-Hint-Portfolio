export const SIZE = 4;
export const DIRECTIONS = ['up', 'right', 'down', 'left'] as const;
export type Direction = (typeof DIRECTIONS)[number];
// A flat row-major board keeps copying, serialization and search inexpensive.
export type Board = number[];
export type RNG = () => number;
export interface TileMotion {
  from: number;
  to: number;
  value: number;
  merged: boolean;
}
export interface MoveResult {
  board: Board;
  scoreDelta: number;
  changed: boolean;
  motions: TileMotion[];
  mergedCells: number[];
}

export function emptyCells(board: Board): number[] {
  return board.flatMap((value, index) => (value === 0 ? [index] : []));
}

export function moveBoard(board: Board, direction: Direction): MoveResult {
  const next = Array<number>(16).fill(0);
  const motions: TileMotion[] = [];
  const mergedCells: number[] = [];
  let scoreDelta = 0;
  for (let lane = 0; lane < SIZE; lane++) {
    const cells = Array.from({ length: SIZE }, (_, offset) => {
      if (direction === 'left') return lane * SIZE + offset;
      if (direction === 'right') return lane * SIZE + (SIZE - 1 - offset);
      if (direction === 'up') return offset * SIZE + lane;
      return (SIZE - 1 - offset) * SIZE + lane;
    });
    const occupied = cells.filter((cell) => board[cell] !== 0);
    let destination = 0;
    for (let source = 0; source < occupied.length; source++) {
      const from = occupied[source];
      const to = cells[destination++];
      const value = board[from];
      const partner = occupied[source + 1];
      if (partner !== undefined && board[partner] === value) {
        next[to] = value * 2;
        scoreDelta += value * 2;
        motions.push({ from, to, value, merged: true }, { from: partner, to, value, merged: true });
        mergedCells.push(to);
        source++;
      } else {
        next[to] = value;
        motions.push({ from, to, value, merged: false });
      }
    }
  }
  return { board: next, scoreDelta, changed: next.some((value, i) => value !== board[i]), motions, mergedCells };
}

export function legalMoves(board: Board): Direction[] {
  return DIRECTIONS.filter((direction) => moveBoard(board, direction).changed);
}

export function isGameOver(board: Board): boolean {
  return legalMoves(board).length === 0;
}

export function spawnTile(board: Board, random: RNG = Math.random): { board: Board; cell: number | null } {
  const cells = emptyCells(board);
  if (!cells.length) return { board: [...board], cell: null };
  const cell = cells[Math.min(cells.length - 1, Math.max(0, Math.floor(random() * cells.length)))];
  const next = [...board];
  next[cell] = random() < 0.9 ? 2 : 4;
  return { board: next, cell };
}

export function createBoard(random: RNG = Math.random): Board {
  return spawnTile(spawnTile(Array<number>(16).fill(0), random).board, random).board;
}
