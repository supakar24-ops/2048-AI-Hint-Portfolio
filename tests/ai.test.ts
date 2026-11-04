import { describe, expect, it } from 'vitest';
import { chanceOutcomes, evaluate, explain, findHint, immediateMetrics, WEIGHTS } from '../src/ai/expectimax';
import { legalMoves, moveBoard, type Board } from '../src/game/board';

const initial = [2, 2, 0, 0, ...Array<number>(12).fill(0)];
const locked = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];

describe('Expectimax', () => {
  it('enumerates every empty position and both tile values with total probability one', () => {
    const outcomes = chanceOutcomes(initial);
    expect(outcomes).toHaveLength(28);
    expect(outcomes.reduce((sum, outcome) => sum + outcome.probability, 0)).toBeCloseTo(1, 12);
    expect(outcomes.filter((outcome) => outcome.value === 2).reduce((sum, outcome) => sum + outcome.probability, 0)).toBeCloseTo(0.9);
    expect(outcomes.filter((outcome) => outcome.value === 4).reduce((sum, outcome) => sum + outcome.probability, 0)).toBeCloseTo(0.1);
    for (const outcome of outcomes) {
      expect(outcome.board[outcome.cell]).toBe(outcome.value);
      expect(outcome.board.filter(Boolean)).toHaveLength(3);
    }
  });
  it('computes the actual weighted chance expectation, rather than a one-move heuristic', () => {
    const hint = findHint(initial, { maxDepth: 1, maxNodes: 10000 });
    for (const candidate of hint.candidates) {
      const moved = moveBoard(initial, candidate.direction);
      const expected = Math.log2(1 + moved.scoreDelta) * WEIGHTS.mergeReward + chanceOutcomes(moved.board).reduce((sum, outcome) => sum + outcome.probability * evaluate(outcome.board).value, 0);
      expect(candidate.evaluation).toBeCloseTo(expected, 8);
    }
    expect(hint.search.completedDepth).toBe(1);
    expect(hint.search.algorithm).toBe('expectimax');
  });
  it('computes a second player maximization layer and chance layer', () => {
    const values = [2, 4, 8, 16, 4, 8, 16, 32, 8, 16, 32, 64, 0, 0, 2, 2];
    const hint = findHint(values, { maxDepth: 2, maxNodes: 200000 });
    const expected = (current: Board, turns: number): number => {
      if (turns === 0 || legalMoves(current).length === 0) return evaluate(current).value;
      return Math.max(...legalMoves(current).map((direction) => {
        const moved = moveBoard(current, direction);
        const outcomes = chanceOutcomes(moved.board);
        return Math.log2(1 + moved.scoreDelta) * WEIGHTS.mergeReward + outcomes.reduce((sum, outcome) => sum + outcome.probability * expected(outcome.board, turns - 1), 0);
      }));
    };
    expect(hint.search.completedDepth).toBe(2);
    expect(hint.evaluation).toBeCloseTo(expected(values, 2), 6);
  });
  it.each([initial, [2, 4, 8, 16, 4, 8, 16, 32, 8, 16, 32, 64, 0, 0, 2, 2], [2, ...Array<number>(15).fill(0)]])('returns only a legal move', (...args) => {
    const values = args as Board;
    expect(legalMoves(values)).toContain(findHint(values, { maxDepth: 2, maxNodes: 3000 }).direction);
  });
  it('does not mutate the live board', () => {
    const values = Object.freeze([...initial]) as unknown as Board;
    findHint(values, { maxDepth: 2, maxNodes: 1000 });
    expect(values).toEqual(initial);
  });
  it('returns no direction or explanation metrics when no move exists', () => {
    const hint = findHint(locked);
    expect(hint.direction).toBeNull(); expect(hint.immediate).toBeNull(); expect(hint.candidates).toEqual([]);
  });
  it('handles a single valid direction', () => {
    const values = [2, 4, 8, 0, 4, 8, 16, 0, 8, 16, 32, 0, 16, 32, 64, 0];
    expect(legalMoves(values)).toEqual(['right']);
    expect(findHint(values).direction).toBe('right');
  });
  it('is fully deterministic for a fixed board and settings', () => {
    const settings = { maxDepth: 3, maxNodes: 1000 };
    expect(findHint(initial, settings)).toEqual(findHint(initial, settings));
  });
  it('respects the node cap and returns the last fully completed search depth', () => {
    const hint = findHint(initial, { maxDepth: 5, maxNodes: 500 });
    expect(hint.search.nodes).toBeLessThanOrEqual(500);
    expect(hint.search.budgetExhausted).toBe(true);
    expect(hint.search.completedDepth).toBeGreaterThanOrEqual(1);
    expect(hint.search.completedDepth).toBeLessThan(5);
    expect(hint.candidates).toEqual(findHint(initial, { maxDepth: hint.search.completedDepth, maxNodes: 200000 }).candidates);
  });
  it('labels an insufficient-budget fallback honestly and keeps it legal', () => {
    const hint = findHint(initial, { maxDepth: 3, maxNodes: 0 });
    expect(hint.search.algorithm).toBe('legal-fallback'); expect(hint.search.completedDepth).toBe(0);
    expect(legalMoves(initial)).toContain(hint.direction);
  });
});

describe('heuristics and factual explanations', () => {
  it('reports actual feature values and penalizes game over', () => {
    const evaluation = evaluate(initial);
    expect(evaluation.features.empty).toBe(14);
    expect(evaluation.features.mergePairs).toBe(1);
    expect(evaluation.features.maxInCorner).toBe(true);
    expect(evaluate(locked).value).toBeLessThan(evaluation.value);
  });
  it('detects smoother and monotonic sequences', () => {
    const sorted = [2, 4, 8, 16, ...Array<number>(12).fill(0)];
    const mixed = [2, 16, 4, 8, ...Array<number>(12).fill(0)];
    expect(evaluate(sorted).features.monotonicity).toBeGreaterThan(evaluate(mixed).features.monotonicity);
    expect(evaluate(sorted).features.smoothness).toBeGreaterThan(evaluate(mixed).features.smoothness);
  });
  it('describes immediate metrics before the chance spawn', () => {
    const hint = findHint(initial, { maxDepth: 1 });
    const metrics = immediateMetrics(initial, hint.direction!);
    expect(hint.immediate).toEqual(metrics);
    if (metrics.mergeScore) expect(hint.explanation.join(' ')).toContain(`เพิ่มคะแนน ${metrics.mergeScore}`);
    if (metrics.emptyDelta) expect(hint.explanation.join(' ')).toContain(`ช่องว่างเพิ่ม ${metrics.emptyDelta}`);
    expect(hint.explanation.join(' ')).not.toMatch(/รับประกัน|100%/);
  });
  it('never claims a merge, empty increase or corner benefit without evidence', () => {
    const metrics = { emptyBefore: 5, emptyAfter: 5, emptyDelta: 0, mergeScore: 0, maxTile: 16, maxInCorner: false };
    expect(explain(metrics, true)).toHaveLength(1);
    expect(explain(metrics, true).join(' ')).not.toMatch(/ช่องว่างเพิ่ม|เพิ่มคะแนน|มุมกระดาน/);
  });
});
