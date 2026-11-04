import { DIRECTIONS, emptyCells, legalMoves, moveBoard, type Board, type Direction } from '../game/board';

export const WEIGHTS = {
  empty: 280,
  monotonicity: 30,
  smoothness: 12,
  mergePairs: 75,
  corner: 65,
  mobility: 35,
  mergeReward: 12,
  terminal: -100_000,
} as const;
export const DEFAULT_MAX_NODES = 24_000;
export interface Features {
  empty: number;
  monotonicity: number;
  smoothness: number;
  mergePairs: number;
  maxTile: number;
  maxInCorner: boolean;
  mobility: number;
}
export interface Evaluation { value: number; features: Features }

// log2 expresses differences in merge levels: 2→4 and 1024→2048 are one level.
export function evaluate(board: Board): Evaluation {
  const logs = board.map((value) => value ? Math.log2(value) : 0);
  let smoothness = 0; let mergePairs = 0; let monotonicity = 0;
  for (let i = 0; i < 16; i++) {
    for (const neighbor of [i % 4 < 3 ? i + 1 : -1, i < 12 ? i + 4 : -1]) {
      if (neighbor < 0 || !board[i] || !board[neighbor]) continue;
      smoothness -= Math.abs(logs[i] - logs[neighbor]);
      if (board[i] === board[neighbor]) mergePairs++;
    }
  }
  for (let lane = 0; lane < 4; lane++) {
    for (const cells of [[lane * 4, lane * 4 + 1, lane * 4 + 2, lane * 4 + 3], [lane, lane + 4, lane + 8, lane + 12]]) {
      const values = cells.filter((cell) => board[cell]).map((cell) => logs[cell]);
      let increasingPenalty = 0; let decreasingPenalty = 0;
      for (let i = 1; i < values.length; i++) {
        const difference = values[i] - values[i - 1];
        increasingPenalty += Math.max(0, -difference);
        decreasingPenalty += Math.max(0, difference);
      }
      monotonicity -= Math.min(increasingPenalty, decreasingPenalty);
    }
  }
  const empty = emptyCells(board).length;
  const mobility = legalMoves(board).length;
  const maxTile = Math.max(...board);
  const maxInCorner = maxTile > 0 && [0, 3, 12, 15].some((cell) => board[cell] === maxTile);
  const features = { empty, monotonicity, smoothness, mergePairs, maxTile, maxInCorner, mobility };
  const value = empty * WEIGHTS.empty + monotonicity * WEIGHTS.monotonicity + smoothness * WEIGHTS.smoothness + mergePairs * WEIGHTS.mergePairs
    + (maxInCorner ? Math.log2(maxTile) * WEIGHTS.corner : 0) + mobility * WEIGHTS.mobility + (mobility === 0 ? WEIGHTS.terminal : 0);
  return { value, features };
}

export interface ChanceOutcome { board: Board; cell: number; value: number; probability: number }
export function chanceOutcomes(board: Board): ChanceOutcome[] {
  const cells = emptyCells(board);
  return cells.flatMap((cell) => [2, 4].map((value) => {
    const next = [...board]; next[cell] = value;
    return { board: next, cell, value, probability: (value === 2 ? 0.9 : 0.1) / cells.length };
  }));
}
export interface ImmediateMetrics {
  emptyBefore: number;
  emptyAfter: number;
  emptyDelta: number;
  mergeScore: number;
  maxTile: number;
  maxInCorner: boolean;
}
export interface SearchSettings { maxDepth?: number; maxNodes?: number }
export interface SearchMetadata {
  algorithm: 'expectimax' | 'legal-fallback';
  requestedDepth: number;
  completedDepth: number;
  nodes: number;
  cacheHits: number;
  budgetExhausted: boolean;
}
export interface HintResult {
  direction: Direction | null;
  evaluation: number;
  immediate: ImmediateMetrics | null;
  explanation: string[];
  candidates: { direction: Direction; evaluation: number }[];
  search: SearchMetadata;
}

export function immediateMetrics(before: Board, direction: Direction): ImmediateMetrics {
  const result = moveBoard(before, direction);
  const emptyBefore = emptyCells(before).length; const emptyAfter = emptyCells(result.board).length;
  const maxTile = Math.max(...result.board);
  return { emptyBefore, emptyAfter, emptyDelta: emptyAfter - emptyBefore, mergeScore: result.scoreDelta, maxTile, maxInCorner: [0, 3, 12, 15].some((cell) => result.board[cell] === maxTile) };
}
export function explain(metrics: ImmediateMetrics, searched: boolean): string[] {
  const reasons: string[] = [];
  if (metrics.emptyDelta > 0) reasons.push(`หลังเลื่อนและรวม Tile จะมีช่องว่างเพิ่ม ${metrics.emptyDelta} ช่อง ก่อนสุ่ม Tile ใหม่`);
  if (metrics.mergeScore > 0) reasons.push(`รวม Tile ได้ทันที เพิ่มคะแนน ${metrics.mergeScore.toLocaleString('en-US')} แต้ม`);
  if (metrics.maxInCorner) reasons.push(`หลังเลื่อน Tile ค่าสูงสุด ${metrics.maxTile.toLocaleString('en-US')} อยู่ที่มุมกระดาน`);
  reasons.push(searched ? 'ทิศทางนี้ได้ค่าประเมินคาดหวังสูงสุดจากการค้นหาในความลึกที่ทำครบ' : 'ใช้งบค้นหาครบแล้ว จึงใช้ค่าประเมินกระดานหลังเลื่อนเพื่อเลือกทิศทางที่เล่นได้');
  return reasons;
}
const reward = (scoreDelta: number) => Math.log2(1 + scoreDelta) * WEIGHTS.mergeReward;

/** Depth counts player moves, including the root. Every completed layer includes
 *  the chance spawn (all empty cells × both values), including the final layer.
 *  A deterministic node budget, rather than a wall clock deadline, makes settings
 *  reproducible. Incomplete iterative-deepening results are discarded as a unit. */
export function findHint(board: Board, settings: SearchSettings = {}): HintResult {
  const requestedDepth = Math.max(1, Math.min(5, Math.floor(settings.maxDepth ?? (emptyCells(board).length >= 8 ? 2 : emptyCells(board).length >= 4 ? 3 : 4))));
  const maxNodes = Math.max(0, Math.min(200_000, Math.floor(settings.maxNodes ?? DEFAULT_MAX_NODES)));
  let nodes = 0; let cacheHits = 0; let completedDepth = 0; let budgetExhausted = false;
  const moves = DIRECTIONS.flatMap((direction) => {
    const result = moveBoard(board, direction);
    return result.changed ? [{ direction, result }] : [];
  });
  const cache = new Map<string, number>();
  const exhausted = Symbol('node budget');
  function tick() { if (nodes >= maxNodes) throw exhausted; nodes++; }
  function cached(type: string, current: Board, depth: number, calculate: () => number): number {
    tick();
    const key = `${type}:${depth}:${current.join(',')}`;
    const previous = cache.get(key);
    if (previous !== undefined) { cacheHits++; return previous; }
    const value = calculate(); cache.set(key, value); return value;
  }
  function player(current: Board, depth: number): number {
    return cached('p', current, depth, () => {
      if (depth === 0) return evaluate(current).value;
      let best = -Infinity;
      for (const direction of DIRECTIONS) {
        const result = moveBoard(current, direction);
        if (result.changed) best = Math.max(best, reward(result.scoreDelta) + chance(result.board, depth - 1));
      }
      return best === -Infinity ? evaluate(current).value : best;
    });
  }
  function chance(current: Board, depth: number): number {
    return cached('c', current, depth, () => {
      const outcomes = chanceOutcomes(current);
      if (!outcomes.length) return player(current, depth);
      let expected = 0;
      for (const outcome of outcomes) expected += outcome.probability * player(outcome.board, depth);
      return expected;
    });
  }
  // Safe legal fallback. It is explicitly labeled as heuristic-only if the
  // configured budget cannot complete even one full Expectimax layer.
  let candidates = moves.map(({ direction, result }) => ({ direction, evaluation: reward(result.scoreDelta) + evaluate(result.board).value }));
  if (moves.length) {
    for (let depth = 1; depth <= requestedDepth; depth++) {
      try {
        const iteration = moves.map(({ direction, result }) => ({ direction, evaluation: reward(result.scoreDelta) + chance(result.board, depth - 1) }));
        candidates = iteration; completedDepth = depth;
      } catch (error) {
        if (error !== exhausted) throw error;
        budgetExhausted = true; break;
      }
    }
  }
  // Stable direction order breaks exact ties without randomness.
  const best = candidates.reduce<(typeof candidates)[number] | null>((selected, candidate) => !selected || candidate.evaluation > selected.evaluation ? candidate : selected, null);
  const immediate = best ? immediateMetrics(board, best.direction) : null;
  return {
    direction: best?.direction ?? null,
    evaluation: best?.evaluation ?? evaluate(board).value,
    immediate,
    explanation: immediate ? explain(immediate, completedDepth > 0) : ['ไม่มีทิศทางที่ทำให้กระดานเปลี่ยนได้'],
    candidates,
    search: { algorithm: completedDepth > 0 ? 'expectimax' : 'legal-fallback', requestedDepth, completedDepth, nodes, cacheHits, budgetExhausted },
  };
}
